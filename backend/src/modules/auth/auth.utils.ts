import { createHash, timingSafeEqual } from 'crypto';
import type { CookieOptions, Response } from 'express';
import jwt, { type JwtPayload, type VerifyOptions } from 'jsonwebtoken';
import type { StringValue } from 'ms';
import { env } from '../../config/env';
import { UnauthorizedError } from '../../utils/AppError';
import type { UserDocument } from './user.model';

export const ACCESS_TOKEN_COOKIE_NAME = 'accessToken';
export const REFRESH_TOKEN_COOKIE_NAME = 'refreshToken';

export const ACCESS_TOKEN_EXPIRES_IN: StringValue = '15m';
export const REFRESH_TOKEN_EXPIRES_IN: StringValue = '7d';
export const ACCESS_TOKEN_MAX_AGE_MS = 15 * 60 * 1000;
export const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export interface AccessTokenPayload extends JwtPayload {
  type: 'access';
  userId: string;
  email: string;
}

export interface RefreshTokenPayload extends JwtPayload {
  type: 'refresh';
  userId: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

const cookieOptions = (maxAge: number): CookieOptions => ({
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/',
  maxAge
});

const clearCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/'
};

const verifyJwt = (token: string, secret: string, options?: VerifyOptions): JwtPayload => {
  try {
    const decoded = jwt.verify(token, secret, options);

    if (typeof decoded === 'string') {
      throw new UnauthorizedError('Authentication failed');
    }

    return decoded;
  } catch (error: unknown) {
    if (error instanceof UnauthorizedError) {
      throw error;
    }

    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Authentication failed');
    }

    throw error;
  }
};

export const signAccessToken = (user: UserDocument): string => {
  return jwt.sign(
    {
      type: 'access',
      userId: user._id.toString(),
      email: user.email
    },
    env.JWT_ACCESS_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
  );
};

export const signRefreshToken = (user: UserDocument): string => {
  return jwt.sign(
    {
      type: 'refresh',
      userId: user._id.toString()
    },
    env.JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
  );
};

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  const payload = verifyJwt(token, env.JWT_ACCESS_SECRET);

  if (
    payload.type !== 'access' ||
    typeof payload.userId !== 'string' ||
    typeof payload.email !== 'string'
  ) {
    throw new UnauthorizedError('Authentication failed');
  }

  return payload as AccessTokenPayload;
};

export const verifyRefreshToken = (token: string, options?: VerifyOptions): RefreshTokenPayload => {
  const payload = verifyJwt(token, env.JWT_REFRESH_SECRET, options);

  if (payload.type !== 'refresh' || typeof payload.userId !== 'string') {
    throw new UnauthorizedError('Authentication failed');
  }

  return payload as RefreshTokenPayload;
};

export const hashRefreshToken = (token: string): string => {
  return createHash('sha256').update(token).digest('hex');
};

export const refreshTokenMatchesHash = (token: string, storedHash: string): boolean => {
  const tokenHash = hashRefreshToken(token);
  const tokenBuffer = Buffer.from(tokenHash, 'hex');
  const storedBuffer = Buffer.from(storedHash, 'hex');

  if (tokenBuffer.length !== storedBuffer.length) {
    return false;
  }

  return timingSafeEqual(tokenBuffer, storedBuffer);
};

export const setAuthCookies = (res: Response, tokens: AuthTokens): void => {
  res.cookie(ACCESS_TOKEN_COOKIE_NAME, tokens.accessToken, cookieOptions(ACCESS_TOKEN_MAX_AGE_MS));
  res.cookie(REFRESH_TOKEN_COOKIE_NAME, tokens.refreshToken, cookieOptions(REFRESH_TOKEN_MAX_AGE_MS));
};

export const clearAuthCookies = (res: Response): void => {
  res.clearCookie(ACCESS_TOKEN_COOKIE_NAME, clearCookieOptions);
  res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, clearCookieOptions);
};
