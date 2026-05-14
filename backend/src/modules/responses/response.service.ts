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

export const submitResponse = async (pollId: string, userId: string | undefined, answers: IAnswerInput[]): Promise<IResponse> => {
  const poll = await Poll.findById(pollId);
  
  if (!poll) {
    throw new NotFoundError('Poll not found');
  }

  if (poll.expiresAt < new Date()) {
    throw new ForbiddenError('Poll has expired');
  }

  if (poll.responseMode === 'AUTHENTICATED' && !userId) {
    throw new UnauthorizedError('You must be logged in to participate in this poll');
  }

  // Extract mandatory question IDs
  const mandatoryQuestionIds = poll.questions
    .filter(q => q.isMandatory)
    .map(q => (q as any)._id?.toString() as string);

  // Extract provided answer question IDs
  const providedQuestionIds = answers.map(a => a.questionId);

  // Find missing mandatory questions
  const missingQuestions = mandatoryQuestionIds.filter(id => id && !providedQuestionIds.includes(id));
  
  if (missingQuestions.length > 0) {
    throw new BadRequestError('All mandatory questions must be answered');
  }

  // Validate that the provided options actually exist in the questions
  // (Optional but good practice, the prompt didn't strictly require it, 
  // but it's safe. I'll just save it directly for now as requested).

  const newResponse = new ResponseModel({
    pollId,
    userId: userId || null,
    answers
  });

  await newResponse.save();

  // Broadcast updated analytics to socket room
  const updatedAnalytics = await getPollAnalytics(pollId, poll.creatorId.toString());
  emitNewResponse(pollId, updatedAnalytics);

  return newResponse;
};
