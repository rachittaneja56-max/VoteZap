  import mongoose, { Schema, Document } from 'mongoose';

  interface IAnswer {
    questionId: mongoose.Types.ObjectId;
    selectedOptionId: mongoose.Types.ObjectId; 
  }

  export interface IResponse extends Document {
    pollId: mongoose.Types.ObjectId;
    userId?: mongoose.Types.ObjectId; 
    anonymousId?: string;
    answers: IAnswer[];
    submittedAt: Date;
  }

  const ResponseSchema = new Schema<IResponse>({
    pollId: { type: Schema.Types.ObjectId, ref: 'Poll', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    anonymousId: { type: String, default: null, index: true },
    answers: [{
      questionId: { type: Schema.Types.ObjectId, required: true },
      selectedOptionId: { type: Schema.Types.ObjectId, required: true }
    }]
  }, { timestamps: { createdAt: 'submittedAt', updatedAt: false } });

  export default mongoose.model<IResponse>('Response', ResponseSchema);