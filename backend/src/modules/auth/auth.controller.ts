import axios, { AxiosError } from 'axios';
import type { NextFunction, Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { BadRequestError, UnauthorizedError } from '../../utils/AppError';
import { sendSuccess } from '../../utils/ResponseHandler';
import User, { type UserDocument } from './user.model';
import type{ StringValue } from 'ms';

const TOKEN_COOKIE_NAME = 'token';
const SEVEN_DAYS_IN_MS = 7 * 24 * 60 * 60 * 1000;

interface GoogleLoginBody {
  idToken?: unknown;
}

interface CustomIdpLoginBody {
  code?: unknown;
  code_verifier?: unknown;
}

interface CustomIdpTokenResponse {
  access_token: string;
  id_token: string;
  refresh_token: string;
}

interface DecodedIdToken {
  name?: unknown;
  email?: unknown;
  sub?: unknown;
}

interface AuthResponseData {
  user: {
    id: string;
    email: string;
    googleId?: string;
    customIdpId?: string;
  };
}

const googleClient = new OAuth2Client();

const assertString = (value: unknown, fieldName: string): string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new BadRequestError(`${fieldName} is required`);
  }

  return value.trim();
};

const getRequiredEnv = (key: string): string => {
  const value = process.env[key];

  if (!value) {
    throw new UnauthorizedError(`${key} is not configured`);
  }

  return value;
};

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const signAppToken = (user: UserDocument): string => {
  const jwtSecret = process.env.JWT_SECRET!;
  const expiresIn = (process.env.JWT_EXPIRES_IN ?? '7d') as StringValue ;

  return jwt.sign(
    {
      userId: user._id.toString(),
      email: user.email
    },
    jwtSecret,
    { expiresIn }
  );
};

const setAuthCookie = (res: Response, token: string): void => {
  res.cookie(TOKEN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: SEVEN_DAYS_IN_MS
  });
};

const clearAuthCookie = (res: Response): void => {
  res.clearCookie(TOKEN_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  });
};

const buildAuthResponse = (user: UserDocument): AuthResponseData => ({
  user: {
    id: user._id.toString(),
    email: user.email,
    googleId: user.googleId,
    customIdpId: user.customIdpId
  }
});

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
    throw new UnauthorizedError('Unable to authenticate user');
  }

  return user;
};

const decodeCustomIdToken = (idToken: string): { email: string; sub: string; name?: string } => {
  const decoded = jwt.decode(idToken);

  if (!decoded || typeof decoded === 'string') {
    throw new UnauthorizedError('Invalid custom IdP id_token');
  }

  const payload = decoded as DecodedIdToken;

  if (typeof payload.email !== 'string' || typeof payload.sub !== 'string') {
    throw new UnauthorizedError('Custom IdP id_token is missing required claims');
  }

  return {
    email: payload.email,
    sub: payload.sub,
    name: typeof payload.name === 'string' ? payload.name : undefined
  };
};

export const googleLogin = async (
  req: Request<Record<string, never>, unknown, GoogleLoginBody>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const idToken = assertString(req.body.idToken, 'idToken');
    const googleClientId = getRequiredEnv('GOOGLE_CLIENT_ID');

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: googleClientId
    });
    const payload = ticket.getPayload();

    if (!payload?.email || !payload.sub) {
      throw new UnauthorizedError('Google token is missing required claims');
    }

    const user = await linkOrCreateUser(payload.email, 'googleId', payload.sub);
    const appToken = signAppToken(user);

    setAuthCookie(res, appToken);
    sendSuccess(res, 'Google login successful', buildAuthResponse(user));
  } catch (error: unknown) {
    next(error);
  }
};

export const customIdpLogin = async (
  req: Request<Record<string, never>, unknown, CustomIdpLoginBody>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const code = assertString(req.body.code, 'code');
    const codeVerifier = assertString(req.body.code_verifier, 'code_verifier');
    const customIdpUrl = getRequiredEnv('CUSTOM_IDP_URL');
    const clientId = getRequiredEnv('CUSTOM_IDP_CLIENT_ID');
    const clientSecret = getRequiredEnv('CUSTOM_IDP_CLIENT_SECRET');
    const redirectUri = getRequiredEnv('CUSTOM_IDP_REDIRECT_URI');

    let tokenResponse: CustomIdpTokenResponse;

    try {
      const response = await axios.post<CustomIdpTokenResponse>(
        `${customIdpUrl}/api/auth/token`,
        {
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          code_verifier: codeVerifier
        },
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );

      tokenResponse = response.data;
    } catch (error: unknown) {
      if (error instanceof AxiosError) {
        throw new UnauthorizedError('Custom IdP token exchange failed');
      }

      throw error;
    }

    const { email, sub } = decodeCustomIdToken(tokenResponse.id_token);
    const user = await linkOrCreateUser(email, 'customIdpId', sub);
    const appToken = signAppToken(user);

    setAuthCookie(res, appToken);
    sendSuccess(res, 'Custom IdP login successful', buildAuthResponse(user));
  } catch (error: unknown) {
    next(error);
  }
};

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    clearAuthCookie(res);
    sendSuccess(res, 'Logout successful', null);
  } catch (error: unknown) {
    next(error);
  }
};
