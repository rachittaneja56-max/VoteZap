import { Router } from "express";
import { createPoll,getPollById } from "./poll.controller";
import { requireAuth,optionalAuth } from "../auth/auth.middleware";

const router = Router()

router.post('/', requireAuth, createPoll)
router.post('/', requireAuth, createPoll);
router.get('/:id', optionalAuth, getPollById);

export default router

