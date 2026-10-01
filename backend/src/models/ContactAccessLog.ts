import mongoose, { createPrismaModelAdapter, Document, Schema, Types } from '../db/prismaBridge';

export interface IContactAccessLog extends Document {
  user: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  profileOwner: mongoose.Types.ObjectId;
  profileOwnerId?: mongoose.Types.ObjectId;
  contactRequest?: mongoose.Types.ObjectId;
  contactRequestId?: mongoose.Types.ObjectId;
  action: 'REQUEST_CREATED' | 'REQUEST_ACCEPTED' | 'REQUEST_DECLINED' | 'CONTACT_VIEWED' | 'CREDIT_DEDUCTED';
  creditsUsed: number;
  ipAddress?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

const contactAccessLogSchema = new Schema<IContactAccessLog>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    profileOwner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    contactRequest: { type: Schema.Types.ObjectId, ref: 'ContactRequest', index: true },
    action: {
      type: String,
      enum: ['REQUEST_CREATED', 'REQUEST_ACCEPTED', 'REQUEST_DECLINED', 'CONTACT_VIEWED', 'CREDIT_DEDUCTED'],
      required: true,
      index: true,
    },
    creditsUsed: { type: Number, default: 0 },
    ipAddress: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);



export const ContactAccessLog = createPrismaModelAdapter<IContactAccessLog>('contactAccessLog', {"user":"userId","profileOwner":"profileOwnerId","contactRequest":"contactRequestId"});
