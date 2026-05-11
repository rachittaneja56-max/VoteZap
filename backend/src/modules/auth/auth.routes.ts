import { Router } from 'express';
import { customIdpLogin, googleLogin, logout } from './auth.controller';

const router = Router();

router.post('/google', googleLogin);
router.post('/custom-idp', customIdpLogin);
router.post('/logout', logout);

export default router;
