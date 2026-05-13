import { type Response } from "express";
import { type AuthenticatedRequest } from "../auth/auth.middleware";
import * as pollService from "./poll.service"
import { UnauthorizedError } from "../../utils/AppError";

export const createPoll = async (req: AuthenticatedRequest, res: Response) => {
    const creatorId = req.user?.id || req.user?.customIdpId
    if (!creatorId) {
        throw new UnauthorizedError('User ID missing from token', 'UNAUTHORIZED');
    }

    const poll = pollService.createPollDb(req.body, creatorId)
    res.status(201).json({
        status: 'success',
        message: 'Poll created successfully',
        data: {
            pollId: (await poll).id
        }
    })
}

export const getPollById = async (req: AuthenticatedRequest, res: Response) => {
    const id = req.params.id as string;
    const poll = await pollService.getPollByIdDb(id);
    if (poll.responseMode === 'AUTHENTICATED' && !req.user) {
        throw new UnauthorizedError('You must be logged in to view and participate in this poll', 'LOGIN_REQUIRED');
    }
    res.status(200).json({
        status: 'success',
        data: {
            poll
        }
    });
}