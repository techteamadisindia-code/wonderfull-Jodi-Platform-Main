"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlogPost = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const blogPostSchema = new mongoose_1.Schema({
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
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    deletedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
}, {
    timestamps: true,
});
// Compound index for public listings: Published, non-deleted posts ordered by published date
blogPostSchema.index({ status: 1, isDeleted: 1, publishedAt: -1 });
blogPostSchema.index({ category: 1, status: 1, isDeleted: 1 });
blogPostSchema.index({ isFeatured: 1, status: 1, isDeleted: 1 });
exports.BlogPost = mongoose_1.default.models.BlogPost || mongoose_1.default.model('BlogPost', blogPostSchema);
//# sourceMappingURL=BlogPost.js.map