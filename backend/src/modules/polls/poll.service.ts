import pollModel from "./poll.model";
import { BadRequestError, NotFoundError } from "../../utils/AppError";
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