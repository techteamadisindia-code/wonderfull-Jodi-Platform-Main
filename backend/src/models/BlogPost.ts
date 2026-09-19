import mongoose, { Document, Schema } from 'mongoose';

export type BlogStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface IBlogPost extends Document {
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  content: string;
  featuredImageUrl?: string;
  authorName: string;
  authorRole: string;
  authorAvatarUrl?: string;
  readingTime: string;
  status: BlogStatus;
  isFeatured: boolean;
  tags: string[];
  viewCount: number;
  publishedAt?: Date;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const blogPostSchema = new Schema<IBlogPost>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    category: {
      type: String,
      required: true,
      trim: true,
      index: true,
      enum: [
        'Doctor Matrimony',
        'Marriage Advice',
        'Relationship Guidance',
        'Family & Compatibility',
        'Medical Professionals',
        'Verification & Safety',
        'Kundali & Astrology',
        'Wedding Planning',
        'Membership & Features',
      ],
    },
    excerpt: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    featuredImageUrl: { type: String, trim: true },
    authorName: { type: String, default: 'Wonderful Jodi Editorial Team', trim: true },
    authorRole: { type: String, default: 'Medical Matrimony Consultant', trim: true },
    authorAvatarUrl: { type: String, trim: true },
    readingTime: { type: String, default: '5 min read', trim: true },
    status: {
      type: String,
      enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'],
      default: 'DRAFT',
      index: true,
    },
    isFeatured: { type: Boolean, default: false, index: true },
    tags: [{ type: String, trim: true }],
    viewCount: { type: Number, default: 0, min: 0 },
    publishedAt: { type: Date, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
  }
);

// Compound index for public listings: Published, non-deleted posts ordered by published date
blogPostSchema.index({ status: 1, isDeleted: 1, publishedAt: -1 });
blogPostSchema.index({ category: 1, status: 1, isDeleted: 1 });
blogPostSchema.index({ isFeatured: 1, status: 1, isDeleted: 1 });

export const BlogPost =
  mongoose.models.BlogPost || mongoose.model<IBlogPost>('BlogPost', blogPostSchema);
