import mongoose, { createPrismaModelAdapter, Document, Schema, Types } from '../db/prismaBridge';

export interface IPasswordResetToken extends Document {
  user: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  isUsed: boolean;
  usedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const passwordResetTokenSchema = new Schema<IPasswordResetToken>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true, index: true },
    isUsed: { type: Boolean, default: false, index: true },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Auto-clean tokens after 7 days
passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

export const PasswordResetToken = createPrismaModelAdapter<IPasswordResetToken>('passwordResetToken', {"user":"userId"});
