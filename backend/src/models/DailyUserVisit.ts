import mongoose, { Document, Schema } from 'mongoose';

export interface IDailyUserVisit extends Document {
  user: mongoose.Types.ObjectId;
  visitDate: string; // Formatted YYYY-MM-DD in app timezone (Asia/Kolkata)
  firstVisitedAt: Date;
  lastVisitedAt: Date;
  visitCount: number;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const dailyUserVisitSchema = new Schema<IDailyUserVisit>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    visitDate: {
      type: String,
      required: [true, 'Visit date (YYYY-MM-DD) is required'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Visit date must follow YYYY-MM-DD format'],
      index: true,
    },
    firstVisitedAt: {
      type: Date,
      default: Date.now,
    },
    lastVisitedAt: {
      type: Date,
      default: Date.now,
    },
    visitCount: {
      type: Number,
      default: 1,
      min: 1,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound Unique Constraint: One user + One calendar day = Exactly One Visit Record
dailyUserVisitSchema.index({ user: 1, visitDate: 1 }, { unique: true });

// Compound index for date range aggregations
dailyUserVisitSchema.index({ visitDate: 1, user: 1 });

export const DailyUserVisit = mongoose.model<IDailyUserVisit>(
  'DailyUserVisit',
  dailyUserVisitSchema
);
