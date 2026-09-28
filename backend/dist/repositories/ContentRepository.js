"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentRepository = void 0;
const client_1 = require("../db/client");
class ContentRepository {
    static async getAwards() {
        const awards = await client_1.prisma.award.findMany({
            where: { isActive: true, isDeleted: false },
            orderBy: { displayOrder: 'asc' },
        });
        return (0, client_1.toClientArray)(awards);
    }
    static async getAwardBySlug(slug) {
        const award = await client_1.prisma.award.findUnique({
            where: { slug },
        });
        return (0, client_1.toClient)(award);
    }
    static async getPublishedBlogs(params) {
        const where = { status: 'PUBLISHED', isDeleted: false };
        if (params.category)
            where.category = params.category;
        const [total, posts] = await Promise.all([
            client_1.prisma.blogPost.count({ where }),
            client_1.prisma.blogPost.findMany({
                where,
                skip: params.skip || 0,
                take: params.limit || 10,
                orderBy: { publishedAt: 'desc' },
            }),
        ]);
        return { total, posts: (0, client_1.toClientArray)(posts) };
    }
    static async getBlogBySlug(slug) {
        const post = await client_1.prisma.blogPost.findUnique({
            where: { slug },
        });
        return (0, client_1.toClient)(post);
    }
    static async getJobOpenings() {
        const jobs = await client_1.prisma.jobOpening.findMany({
            where: { isPublished: true, isDeleted: false, status: 'OPEN' },
            orderBy: { displayOrder: 'asc' },
        });
        return (0, client_1.toClientArray)(jobs);
    }
    static async getJobBySlug(slug) {
        const job = await client_1.prisma.jobOpening.findUnique({
            where: { slug },
        });
        return (0, client_1.toClient)(job);
    }
    static async createContactInquiry(data) {
        const id = (0, client_1.generateObjectId)();
        const inquiry = await client_1.prisma.contactInquiry.create({
            data: {
                id,
                inquiryId: data.inquiryId,
                name: data.name,
                mobileNumber: data.mobileNumber,
                email: data.email,
                message: data.message,
                userId: data.userId,
                status: 'NEW',
            },
        });
        return (0, client_1.toClient)(inquiry);
    }
    static async getSettings() {
        const setting = await client_1.prisma.setting.findFirst();
        return (0, client_1.toClient)(setting);
    }
}
exports.ContentRepository = ContentRepository;
//# sourceMappingURL=ContentRepository.js.map