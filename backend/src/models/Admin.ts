import mongoose, { createPrismaModelAdapter, Document, Schema, Types } from '../db/prismaBridge';

export interface IAdmin extends Document {
  user: mongoose.Types.ObjectId;
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
}

const adminSchema = new Schema<IAdmin>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    permissions: [{ type: String, trim: true }],
  },
  { timestamps: true }
);

export const Admin = createPrismaModelAdapter<IAdmin>('admin', {"user":"userId"});
