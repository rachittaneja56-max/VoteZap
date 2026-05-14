import { Router } from "express";
import { createPoll, getPollById, getAnalytics, publish, getResults } from "./poll.controller";
import { requireAuth,optionalAuth } from "../auth/auth.middleware";

const router = Router()

router.post('/', requireAuth, createPoll);
router.get('/:id', optionalAuth, getPollById);
router.get('/:id/analytics', requireAuth, getAnalytics);
router.patch('/:id/publish', requireAuth, publish);

router.get('/:id/results', getResults);

export default router
