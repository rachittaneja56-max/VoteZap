import { type Request, type Response } from "express";
import { type AuthenticatedRequest } from "../auth/auth.middleware";
import * as pollService from "./poll.service"
import { UnauthorizedError } from "../../utils/AppError";
import { sendSuccess } from "../../utils/ResponseHandler";

export const listPolls = async (req: AuthenticatedRequest, res: Response) => {
    const creatorId = req.user?.userId;
    if (!creatorId) {
        throw new UnauthorizedError('User ID missing from token', 'UNAUTHORIZED');
    }

    const polls = await pollService.listPollsByCreator(creatorId);
    sendSuccess(res, 'Polls fetched successfully', { polls });
};

export const createPoll = async (req: AuthenticatedRequest, res: Response) => {
    const creatorId = req.user?.userId;
    if (!creatorId) {
        throw new UnauthorizedError('User ID missing from token', 'UNAUTHORIZED');
    }

    const poll = await pollService.createPollDb(req.body, creatorId);
    res.status(201).json({
        status: 'success',
        message: 'Poll created successfully',
        data: {
            pollId: poll.id
        }
    })
}

export const getPollById = async (req: AuthenticatedRequest, res: Response) => {
    const id = req.params.id as string;
    const poll = await pollService.getPollByIdDb(id);
    if (poll.responseMode === 'AUTHENTICATED' && !poll.isPublished && !req.user) {
        throw new UnauthorizedError('You must be logged in to view and participate in this poll', 'LOGIN_REQUIRED');
    }
    res.status(200).json({
        status: 'success',
        data: {
            poll
        }
    });
}

export const getAnalytics = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const userId = req.user?.userId || (req.user as any)?.id;
        if (!userId) {
            throw new UnauthorizedError('User ID missing from token');
        }

        const analytics = await pollService.getPollAnalytics(id, userId);

        res.status(200).json({
            status: 'success',
            data: analytics
        });
    } catch (error) {
        throw error;
    }
}

export const publish = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const userId = req.user?.userId || (req.user as any)?.id;
        if (!userId) {
            throw new UnauthorizedError('User ID missing from token');
        }

        const publishedResult = await pollService.publishPoll(id, userId);

        res.status(200).json({
            status: 'success',
            message: 'Poll published successfully',
            data: publishedResult
        });
    } catch (error) {
        console.error(`[Publish Error] Poll ID: ${req.params.id}, User ID: ${req.user?.userId}`, error);
        throw error;
    }
}

export const getResults = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const results = await pollService.getPublishedResults(id);

        res.status(200).json({
            status: 'success',
            data: results
        });
    } catch (error) {
        throw error;
    }
}
