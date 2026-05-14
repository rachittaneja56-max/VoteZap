import pollModel from "./poll.model";
import responseModel from "../responses/response.model";
import resultModel from "./result.model";
import { BadRequestError, NotFoundError, ForbiddenError } from "../../utils/AppError";
import mongoose from "mongoose";
interface CreatePollPayload {
    title: string,
    description?: string,
    expiresAt: string | Date,
    responseMode: 'ANONYMOUS' | 'AUTHENTICATED',
    questions: any[],
}

export const createPollDb = async (pollData: CreatePollPayload, creatorId: string) => {
    if (!pollData.questions || pollData.questions.length === 0) {
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

export const getPollByIdDb = async (pollId: string) => {
    const poll = await pollModel.findById(pollId)

    if (!poll) {
        throw new NotFoundError('Poll not found or has been deleted', 'POLL_NOT_FOUND');
    }

    return poll;
}

export interface PollListRow {
    id: string;
    title: string;
    expiresAt: Date;
    responseMode: 'ANONYMOUS' | 'AUTHENTICATED';
    isPublished: boolean;
    createdAt: Date;
    responseCount: number;
    leadingOption: string;
    questionCount: number;
}

export const listPollsByCreator = async (creatorId: string): Promise<PollListRow[]> => {
    const creatorOid = new mongoose.Types.ObjectId(creatorId);
    const polls = await pollModel.find({ creatorId: creatorOid }).sort({ createdAt: -1 }).lean();

    if (polls.length === 0) {
        return [];
    }

    const pollIds = polls.map((p) => p._id);
    const countAgg = await responseModel.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
        { $match: { pollId: { $in: pollIds } } },
        { $group: { _id: '$pollId', count: { $sum: 1 } } }
    ]);
    const countMap = new Map(countAgg.map((row) => [String(row._id), row.count]));

    const rows: PollListRow[] = [];
    for (const p of polls) {
        const id = String(p._id);
        const responseCount = countMap.get(id) || 0;
        let leadingOption = '—';
        if (responseCount > 0) {
            try {
                const analytics = await getPollAnalytics(id, creatorId);
                const first = analytics.results[0];
                if (first?.options?.length) {
                    const top = [...first.options].sort((a, b) => b.voteCount - a.voteCount)[0];
                    if (top) {
                        leadingOption = `${top.optionText} (${top.percentage}%)`;
                    }
                }
            } catch {
                leadingOption = '—';
            }
        }
        rows.push({
            id,
            title: p.title,
            expiresAt: p.expiresAt as Date,
            responseMode: p.responseMode,
            isPublished: p.isPublished,
            createdAt: (p as { createdAt?: Date }).createdAt || new Date(),
            responseCount,
            leadingOption,
            questionCount: Array.isArray(p.questions) ? p.questions.length : 0
        });
    }
    return rows;
};

export const getPollAnalytics = async (pollId: string, userId: string) => {
    const poll = await pollModel.findById(pollId);
    if (!poll) {
        throw new NotFoundError('Poll not found');
    }
    if (poll.creatorId.toString() !== userId) {
        throw new ForbiddenError('You are not authorized to view analytics for this poll');
    }

    const totalResponses = await responseModel.countDocuments({ pollId });

    const [analytics, participationAgg, timeline] = await Promise.all([
        responseModel.aggregate([
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
        ]),
        responseModel.aggregate([
            { $match: { pollId: new mongoose.Types.ObjectId(pollId) } },
            {
                $group: {
                    _id: null,
                    anonymous: { $sum: { $cond: [{ $eq: ["$userId", null] }, 1, 0] } },
                    authenticated: { $sum: { $cond: [{ $ne: ["$userId", null] }, 1, 0] } }
                }
            }
        ]),
        responseModel.aggregate([
            { $match: { pollId: new mongoose.Types.ObjectId(pollId) } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$submittedAt" } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } },
            { $project: { date: "$_id", count: 1, _id: 0 } }
        ])
    ]);

    const participation = participationAgg[0] || { anonymous: 0, authenticated: 0 };

    const results = poll.questions.map(question => {
        const qId = (question as any)._id?.toString() as string;
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

    return { totalResponses, results, participation, timeline };
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
        return resultModel.findOne({ pollId });
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