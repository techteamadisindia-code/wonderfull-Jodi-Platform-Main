import mongoose, { Document, Schema } from 'mongoose';

export interface ICounter extends Document {
  _id: string;
  seq: number;
}

const counterSchema = new Schema<ICounter>(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 100000 },
  },
  { timestamps: true }
);

export const Counter = mongoose.models.Counter || mongoose.model<ICounter>('Counter', counterSchema);

/**
 * Get next atomic sequence number formatted as WJ-XXXXXX
 */
export async function getNextCandidateId(): Promise<string> {
  const result = await Counter.findByIdAndUpdate(
    'candidateId',
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return `WJ-${result.seq}`;
}
