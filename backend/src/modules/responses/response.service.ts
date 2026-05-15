import mongoose from 'mongoose';
import Poll from '../polls/poll.model';
import ResponseModel, { type IResponse } from './response.model';
import { NotFoundError, ForbiddenError, UnauthorizedError, BadRequestError } from '../../utils/AppError';
import { emitNewResponse } from '../../sockets/socket.setup';
import { getPollAnalytics } from '../polls/poll.service';

interface IAnswerInput {
  questionId: string;
  selectedOptionId: string;
}

export const submitResponse = async (pollId: string, userId: string | undefined, answers: IAnswerInput[], anonymousId?: string): Promise<IResponse> => {
  const poll = await Poll.findById(pollId);

  if (!poll) {
    throw new NotFoundError('Poll not found');
  }

  if (poll.expiresAt < new Date()) {
    throw new ForbiddenError('Poll has expired');
  }
  if (poll.isPublished) {
    throw new ForbiddenError('Voting is closed as the results have already been published');
  }

  if (poll.responseMode === 'AUTHENTICATED' && !userId) {
    throw new UnauthorizedError('You must be logged in to participate in this poll');
  }

  const duplicateQuery: any = { pollId };
  if (userId) {
    duplicateQuery.userId = userId;
  } else if (anonymousId) {
    duplicateQuery.anonymousId = anonymousId;
  }

  if (userId || anonymousId) {
    const existing = await ResponseModel.findOne(duplicateQuery);
    if (existing) {
      throw new ForbiddenError('You have already voted in this poll');
    }
  }

  const mandatoryQuestionIds = poll.questions
    .filter(q => q.isMandatory)
    .map(q => (q as any)._id?.toString() as string);
  const providedQuestionIds = answers.map(a => a.questionId);

  const missingQuestions = mandatoryQuestionIds.filter(id => id && !providedQuestionIds.includes(id));

  if (missingQuestions.length > 0) {
    throw new BadRequestError('All mandatory questions must be answered');
  }

  const newResponse = new ResponseModel({
    pollId,
    userId: userId || null,
    anonymousId: anonymousId || null,
    answers
  });

  await newResponse.save();
  const updatedAnalytics = await getPollAnalytics(pollId, poll.creatorId.toString());
  emitNewResponse(pollId, updatedAnalytics);

  return newResponse;
};
