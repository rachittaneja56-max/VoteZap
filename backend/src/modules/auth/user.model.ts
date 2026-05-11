import mongoose, { Schema, type HydratedDocument } from 'mongoose';

export interface IUser {
  email: string;
  googleId?: string;
  customIdpId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = HydratedDocument<IUser>;

const UserSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  googleId: { type: String, required: false },
  customIdpId: { type: String, required: false }
}, {
  timestamps: true
});

export default mongoose.model<IUser>('User', UserSchema);
