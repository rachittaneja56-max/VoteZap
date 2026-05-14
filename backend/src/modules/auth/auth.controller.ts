import type { Request, Response } from 'express';
import { env } from '../../config/env';
import { UnauthorizedError } from '../../utils/AppError';
import { sendSuccess } from '../../utils/ResponseHandler';
import type { AuthenticatedRequest } from './auth.middleware';
import {
  buildAuthResponse,
  getUserById,
  loginWithCustomIdp,
  loginWithGoogle,
  logoutSession,
  refreshAuthSession
} from './auth.service';
import { clearAuthCookies, REFRESH_TOKEN_COOKIE_NAME, setAuthCookies } from './auth.utils';
import {
  customIdpLoginBodySchema,
  googleLoginBodySchema,
  parseBody
} from './auth.validation';

export const googleLogin = async (req: Request, res: Response): Promise<void> => {
  const { idToken } = parseBody(googleLoginBodySchema, req.body);
  const session = await loginWithGoogle(idToken);

  setAuthCookies(res, session.tokens);
  sendSuccess(res, 'Google login successful', buildAuthResponse(session.user));
};

export const customIdpLogin = async (req: Request, res: Response): Promise<void> => {
  const { code, code_verifier } = parseBody(customIdpLoginBodySchema, req.body);
  const session = await loginWithCustomIdp(code, code_verifier);

  setAuthCookies(res, session.tokens);
  sendSuccess(res, 'Custom IdP login successful', buildAuthResponse(session.user));
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
  const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];

  if (!refreshToken) {
    throw new UnauthorizedError('Authentication failed');
  }

  const session = await refreshAuthSession(refreshToken);

  setAuthCookies(res, session.tokens);
  sendSuccess(res, 'Session refreshed successfully', buildAuthResponse(session.user));
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  await logoutSession(req.cookies?.[REFRESH_TOKEN_COOKIE_NAME]);
  clearAuthCookies(res);
  sendSuccess(res, 'Logout successful', null);
};

export const getMe = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user?.userId) {
    throw new UnauthorizedError('Authentication failed');
  }

  const user = await getUserById(req.user.userId);
  sendSuccess(res, 'Current user fetched successfully', buildAuthResponse(user));
};
