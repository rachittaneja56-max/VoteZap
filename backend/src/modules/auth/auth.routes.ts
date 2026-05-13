import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { customIdpLogin, getMe, googleLogin, logout, refresh } from './auth.controller';
import { requireAuth } from './auth.middleware';

const router = Router();

const createAuthLimiter = (max: number, message: string) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      status: 'error',
      code: 'RATE_LIMIT_EXCEEDED',
      message
    }
  });

const loginLimiter = createAuthLimiter(10, 'Too many authentication attempts. Try again later.');
const refreshLimiter = createAuthLimiter(60, 'Too many refresh attempts. Try again later.');
const logoutLimiter = createAuthLimiter(30, 'Too many logout attempts. Try again later.');

router.post('/google', loginLimiter, googleLogin);
router.post('/custom-idp', loginLimiter, customIdpLogin);
router.post('/refresh', refreshLimiter, refresh);
router.post('/logout', logoutLimiter, logout);
router.get('/me', requireAuth, getMe);

export default router;
