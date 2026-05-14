import { Router } from 'express';
import { submit } from './response.controller';
import { optionalAuth } from '../../middleware/authMiddleware';

const router = Router();

router.post('/:pollId/submit', optionalAuth, submit);

export default router;
