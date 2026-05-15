import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../middleware/authMiddleware';
import * as responseService from './response.service';
import { sendSuccess } from '../../utils/ResponseHandler';

export const submit = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const pollId = req.params.pollId as string;
    const answers = req.body.answers as Array<{ questionId: string, selectedOptionId: string }> || [];
    const anonymousId = req.body.anonymousId as string;
    const userId = req.user?.userId as string;

    const response = await responseService.submitResponse(pollId, userId, answers, anonymousId);

    sendSuccess(res, 'Response submitted successfully', { response }, 201);
  } catch (error) {
    throw error;
  }
};
