import pollModel from "./poll.model";
import responseModel from "../responses/response.model";
import resultModel from "./result.model";
import { BadRequestError, NotFoundError, ForbiddenError, ConflictError } from "../../utils/AppError";
import mongoose from "mongoose";
interface CreatePollPayload {
    title: string,
    description?: string,
    expiresAt: string | Date,
    responseMode: 'ANONYMOUS' | 'AUTHENTICATED',
    questions: any[],
}

export const createPollDb =  async(pollData:CreatePollPayload, creatorId:string)=> {
    if(!pollData.questions || pollData.questions.length === 0){
         throw new BadRequestError('A poll must have at least one question.', 'MISSING_QUESTIONS');
    }
    const newPOll = new pollModel({
        ...pollData,
        creatorId: new mongoose.Types.ObjectId(creatorId),
        isPublished: false
    })
    const savedPoll = await newPOll.save()
    return savedPoll
}

export const getPollByIdDb = async(pollId:string) => {
    const poll = await pollModel.findById(pollId)

    if(!poll){
        throw new NotFoundError('Poll not found or has been deleted', 'POLL_NOT_FOUND');
    }
    
    return poll;
}

export const getPollAnalytics = async (pollId: string, userId: string) => {
    const poll = await pollModel.findById(pollId);
    if (!poll) {
        throw new NotFoundError('Poll not found');
    }
    if (poll.creatorId.toString() !== userId) {
        throw new ForbiddenError('You are not authorized to view analytics for this poll');
    }

    const totalResponses = await responseModel.countDocuments({ pollId });

    // Aggregate answers from responses to count options
    const analytics = await responseModel.aggregate([
        { $match: { pollId: new mongoose.Types.ObjectId(pollId) } },
        { $unwind: "$answers" },
        {
            $group: {
                _id: {
                    questionId: "$answers.questionId",
                    selectedOptionId: "$answers.selectedOptionId"
                },
                count: { $sum: 1 }
            }
        }
    ]);

    // Build the results object mapping from poll definition
    const results = poll.questions.map(question => {
        const qId = (question as any)._id?.toString() as string;
        
        // Find total votes for this specific question to calculate percentages
        const questionTotalVotes = analytics
            .filter(a => a._id.questionId.toString() === qId)
            .reduce((sum, a) => sum + a.count, 0);

        const options = question.options.map(option => {
            const oId = (option as any)._id?.toString() as string;
            const optionStat = analytics.find(
                a => a._id.questionId.toString() === qId && a._id.selectedOptionId.toString() === oId
            );
            
            const voteCount = optionStat ? optionStat.count : 0;
            const percentage = questionTotalVotes > 0 ? parseFloat(((voteCount / questionTotalVotes) * 100).toFixed(2)) : 0;

            return {
                optionId: oId,
                optionText: option.text,
                voteCount,
                percentage
            };
        });

        return {
            questionId: qId,
            questionText: question.text,
            options
        };
    });

    return { totalResponses, results };
};

export const publishPoll = async (pollId: string, userId: string) => {
    const poll = await pollModel.findById(pollId);
    if (!poll) {
        throw new NotFoundError('Poll not found');
    }
    if (poll.creatorId.toString() !== userId) {
        throw new ForbiddenError('You are not authorized to publish this poll');
    }
    if (poll.isPublished) {
        throw new ConflictError('Poll is already published');
    }

    const { totalResponses, results } = await getPollAnalytics(pollId, userId);

    const publishedResult = new resultModel({
        pollId,
        title: poll.title,
        totalResponses,
        results
    });

    await publishedResult.save();

    poll.isPublished = true;
    await poll.save();

    return publishedResult;
};

export const getPublishedResults = async (pollId: string) => {
    const poll = await pollModel.findById(pollId);
    if (!poll || !poll.isPublished) {
        throw new NotFoundError('Results not found or not yet published');
    }
    const result = await resultModel.findOne({ pollId });
    return result;
};