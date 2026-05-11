import mongoose, { Schema, Document } from 'mongoose'

export interface IUser extends Document {
    email: string;
    googleId?: string;
    customIdpId?: string;
    createdAt: Date;
}

const UserSchema = new Schema<IUser>({
    email: { type: String, required: true, unique: true },
    googleId: { type: String, required: false },
    customIdpId: { type: String, required: false }
    },
    { timestamps: true }
)

export default mongoose.model<IUser>('User', UserSchema)