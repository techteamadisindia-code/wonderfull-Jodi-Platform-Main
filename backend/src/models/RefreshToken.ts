import mongoose, { createPrismaModelAdapter, Document, Schema, Types } from '../db/prismaBridge';

export interface IRefreshToken extends Document {
  user: mongoose.Types.ObjectId;
  tokenHash: string;
  family: string;
  isUsed: boolean;
  isRevoked: boolean;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const refreshTokenSchema = new Schema<IRefreshToken>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, index: true },
    family: { type: String, required: true, index: true },
    isUsed: { type: Boolean, default: false, index: true },
    isRevoked: { type: Boolean, default: false, index: true },
    expiresAt: { type: Date, required: true, index: true },
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true }
);

// TTL index to automatically purge expired tokens from MongoDB after 30 days
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export const RefreshToken = createPrismaModelAdapter<IRefreshToken>('refreshToken', {"user":"userId"});
