import { Router } from "express";
import { createPoll, getPollById, getAnalytics, publish, getResults, listPolls } from "./poll.controller";
import { requireAuth,optionalAuth } from "../auth/auth.middleware";

const router = Router()

router.get('/', requireAuth, listPolls);
router.post('/', requireAuth, createPoll);
router.get('/:id', optionalAuth, getPollById);
router.get('/:id/analytics', requireAuth, getAnalytics);
router.post('/:id/publish', requireAuth, publish);
router.patch('/:id/publish', requireAuth, publish);

router.get('/:id/results', getResults);

export default router
