"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlogPost = void 0;
const prismaBridge_1 = require("../db/prismaBridge");
const blogPostSchema = new prismaBridge_1.Schema({
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
    createdBy: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    deletedBy: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'User' },
}, {
    timestamps: true,
});
// Compound index for public listings: Published, non-deleted posts ordered by published date
blogPostSchema.index({ status: 1, isDeleted: 1, publishedAt: -1 });
blogPostSchema.index({ category: 1, status: 1, isDeleted: 1 });
blogPostSchema.index({ isFeatured: 1, status: 1, isDeleted: 1 });
exports.BlogPost = (0, prismaBridge_1.createPrismaModelAdapter)('blogPost', { "createdBy": "createdById", "updatedBy": "updatedById", "deletedBy": "deletedById" });
//# sourceMappingURL=BlogPost.js.map