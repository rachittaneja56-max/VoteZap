import type { NextFunction, Request, Response } from 'express';
import { UnauthorizedError } from '../../utils/AppError';
import {
  ACCESS_TOKEN_COOKIE_NAME,
  type AccessTokenPayload,
  verifyAccessToken
} from './auth.utils';

export interface AuthenticatedRequest extends Request {
  user?: AccessTokenPayload;
}

export const requireAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const token = req.cookies?.[ACCESS_TOKEN_COOKIE_NAME];

    if (!token) {
      throw new UnauthorizedError('Authentication failed');
    }

    req.user = verifyAccessToken(token);
    next();
  } catch (error: unknown) {
    if (error instanceof UnauthorizedError) {
      next(error);
      return;
    }

    next(new UnauthorizedError('Authentication failed'));
  }
};

export const optionalAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const token = req.cookies?.[ACCESS_TOKEN_COOKIE_NAME];

    if (token) {
      req.user = verifyAccessToken(token);
    }
  } catch {
    req.user = undefined;
  }

  next();
};
