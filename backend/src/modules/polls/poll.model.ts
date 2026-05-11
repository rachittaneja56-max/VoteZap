import mongoose, { Schema, Document } from 'mongoose';

interface IOption {
    text: string
}

interface IQuestion {
    text: string,
    isMandatory: Boolean,
    options: IOption[]
}

export interface IPoll extends Document {
    creatorId: mongoose.Types.ObjectId,
    title: string,
    description?: string,
    expiresAt: Date,
    responseMode: 'ANONYMOUS' | 'AUTHENTICATED',
    isPublished: boolean,
    questions: IQuestion[]
}

const QuestionSchema = new Schema<IQuestion>({
    text: { type: String, required: true },
    isMandatory: { type: Boolean, default: true, required: true },
    options: {
        type: [{ text: String }],
        validate: [(arr: any[]) => arr.length >= 2, 'A question must have at least two options']
    }
})

const PollSchema = new Schema<IPoll>({
  creatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String },
  expiresAt: { type: Date, required: true },
  responseMode: { type: String, enum: ['ANONYMOUS', 'AUTHENTICATED'], required: true },
  isPublished: { type: Boolean, default: false }, 
  questions: [QuestionSchema]
}, { timestamps: true });

export default mongoose.model<IPoll>('Poll', PollSchema);