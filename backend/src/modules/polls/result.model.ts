import mongoose, { Schema, Document } from 'mongoose';

interface IQuestionSummary {
    questionId: mongoose.Types.ObjectId;
    questionText: string;
    options: {
        optionId: mongoose.Types.ObjectId;
        optionText: string;
        voteCount: number;
        percentage: number;
    }[];
}

export interface IPublishedResult extends Document {
    pollId: mongoose.Types.ObjectId;
    title: string;
    totalResponses: number;
    results: IQuestionSummary[];
    publishedAt: Date;
}

const PublishedResultSchema = new Schema<IPublishedResult>({
    pollId: { type: Schema.Types.ObjectId, ref: 'Poll', required: true, unique: true },
    title: { type: String, required: true },
    totalResponses: { type: Number, default: 0 },
    results: [{
        questionId: { type: Schema.Types.ObjectId, required: true },
        questionText: { type: String, required: true },
        options: [{
            optionId: { type: Schema.Types.ObjectId, required: true },
            optionText: { type: String, required: true },
            voteCount: { type: Number, default: 0 },
            percentage: { type: Number, default: 0 }
        }]
    }],
    publishedAt: { type: Date, default: Date.now }
});

export default mongoose.model<IPublishedResult>('PublishedResult', PublishedResultSchema);