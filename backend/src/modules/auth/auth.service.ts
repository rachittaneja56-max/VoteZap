import axios from 'axios';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { UnauthorizedError } from '../../utils/AppError';
import {
  type AuthTokens,
  hashRefreshToken,
  refreshTokenMatchesHash,
  REFRESH_TOKEN_MAX_AGE_MS,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken
} from './auth.utils';
import User, { type UserDocument } from './user.model';

interface CustomIdpTokenResponse {
  access_token: string;
  id_token?: string;
  refresh_token?: string;
}

interface DecodedIdToken {
  email?: unknown;
  user?: unknown;
  sub?: unknown;
  id?: unknown;
}

interface AuthSession {
  user: UserDocument;
  tokens: AuthTokens;
}

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

const normalizeEmail = (email: string): string => email.trim().toLowerCase();
const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

const getStringClaim = (value: unknown, keys: string[]): string | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  for (const key of keys) {
    const claim = record[key];
    if (typeof claim === 'string' && claim.trim()) {
      return claim;
    }
  }

  return undefined;
};

const linkOrCreateUser = async (
  email: string,
  providerField: 'googleId' | 'customIdpId',
  providerId: string
): Promise<UserDocument> => {
  const user = await User.findOneAndUpdate(
    { email: normalizeEmail(email) },
    {
      $setOnInsert: { email: normalizeEmail(email) },
      $set: { [providerField]: providerId }
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true
    }
  );

  if (!user) {
    throw new UnauthorizedError('Authentication failed');
  }

  return user;
};



const issueAuthSession = async (user: UserDocument): Promise<AuthSession> => {
  const tokens = {
    accessToken: signAccessToken(user),
    refreshToken: signRefreshToken(user)
  };

  user.refreshTokenHash = hashRefreshToken(tokens.refreshToken);
  user.refreshTokenExpiresAt = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE_MS);
  await user.save();

  return { user, tokens };
};

export const buildAuthResponse = (user: UserDocument) => ({
  user: {
    id: user._id.toString(),
    email: user.email,
    googleId: user.googleId,
    customIdpId: user.customIdpId
  }
});

export const loginWithGoogle = async (idToken: string): Promise<AuthSession> => {
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();

    if (!payload?.email || !payload.sub || !payload.email_verified) {
      throw new UnauthorizedError('Authentication failed');
    }

    const user = await linkOrCreateUser(payload.email, 'googleId', payload.sub);
    return issueAuthSession(user);
  } catch (error: unknown) {
    if (error instanceof UnauthorizedError) {
      throw error;
    }

    throw new UnauthorizedError('Authentication failed');
  }
};

export const loginWithCustomIdp = async (
  code: string,
  codeVerifier: string
): Promise<AuthSession> => {
  let tokenResponse: CustomIdpTokenResponse;
  const idpBaseUrl = trimTrailingSlash(env.CUSTOM_IDP_URL);
  const tokenUrl = `${idpBaseUrl}/api/auth/token`;
  const userInfoUrl = `${idpBaseUrl}/api/auth/userinfo`;

  try {
    const tokenBody = {
      client_id: env.CUSTOM_IDP_CLIENT_ID,
      client_secret: env.CUSTOM_IDP_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: env.CUSTOM_IDP_REDIRECT_URI,
      code_verifier: codeVerifier
    };

    const response = await axios.post<CustomIdpTokenResponse>(tokenUrl, tokenBody, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    });

    tokenResponse = response.data;
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      const errData = error.response?.data || error.message;
      throw new UnauthorizedError(
        `Token exchange failed: ${typeof errData === 'string' ? errData : JSON.stringify(errData)}`
      );
    }

    throw error;
  }

  let email: string | undefined;
  let sub: string | undefined;

  try {
    const userInfoResponse = await axios.get(userInfoUrl, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${tokenResponse.access_token}`
      }
    });
    
    email = getStringClaim(userInfoResponse.data, ['email']);
    sub = getStringClaim(userInfoResponse.data, ['sub', 'id', 'userId', '_id']);
  } catch (err) {
    console.warn('Custom IdP UserInfo Error, falling back to id_token:', err);
  }

  if ((!email || !sub) && tokenResponse.id_token) {
    const decoded = jwt.decode(tokenResponse.id_token) as DecodedIdToken | null;
    if (decoded) {
      email = email ?? getStringClaim(decoded, ['email']);
      sub = sub ?? getStringClaim(decoded, ['sub', 'id']);

      if (!email || !sub) {
        email = email ?? getStringClaim(decoded.user, ['email']);
        sub = sub ?? getStringClaim(decoded.user, ['sub', 'id', 'userId', '_id']);
      }
    }
  }

  if (!email || !sub) {
    throw new UnauthorizedError('Authentication failed: Missing email or sub from IdP');
  }

  const user = await linkOrCreateUser(email, 'customIdpId', sub);
  return issueAuthSession(user);
};

export const refreshAuthSession = async (refreshToken: string): Promise<AuthSession> => {
  const payload = verifyRefreshToken(refreshToken);
  const user = await User.findById(payload.userId).select(
    '+refreshTokenHash +refreshTokenExpiresAt'
  );

  if (
    !user?.refreshTokenHash ||
    !user.refreshTokenExpiresAt ||
    user.refreshTokenExpiresAt.getTime() <= Date.now() ||
    !refreshTokenMatchesHash(refreshToken, user.refreshTokenHash)
  ) {
    throw new UnauthorizedError('Authentication failed');
  }

  return issueAuthSession(user);
};

export const invalidateRefreshSession = async (userId?: string): Promise<void> => {
  if (!userId) {
    return;
  }

  await User.findByIdAndUpdate(userId, {
    $unset: {
      refreshTokenHash: '',
      refreshTokenExpiresAt: ''
    }
  });
};

export const logoutSession = async (refreshToken?: string): Promise<void> => {
  if (!refreshToken) {
    return;
  }

  try {
    const payload = verifyRefreshToken(refreshToken, { ignoreExpiration: true });
    await invalidateRefreshSession(payload.userId);
  } catch {
    return;
  }
};

export const getUserById = async (userId: string): Promise<UserDocument> => {
  const user = await User.findById(userId);

  if (!user) {
    throw new UnauthorizedError('Authentication failed');
  }

  return user;
};
