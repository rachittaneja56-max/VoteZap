import mongoose, { Schema, type HydratedDocument } from 'mongoose';

export interface IUser {
  email: string;
  name?: string;
  googleId?: string;
  customIdpId?: string;
  refreshTokenHash?: string;
  refreshTokenExpiresAt?: Date;
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
  name: { type: String, required: false },
  googleId: { type: String, required: false },
  customIdpId: { type: String, required: false },
  refreshTokenHash: { type: String, required: false, select: false },
  refreshTokenExpiresAt: { type: Date, required: false, select: false }
}, {
  timestamps: true
});

export default mongoose.model<IUser>('User', UserSchema);
