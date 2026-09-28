import { prisma, toClient, toClientArray, generateObjectId } from '../db/client';

export class ContentRepository {
  static async getAwards() {
    const awards = await prisma.award.findMany({
      where: { isActive: true, isDeleted: false },
      orderBy: { displayOrder: 'asc' },
    });
    return toClientArray(awards);
  }

  static async getAwardBySlug(slug: string) {
    const award = await prisma.award.findUnique({
      where: { slug },
    });
    return toClient(award);
  }

  static async getPublishedBlogs(params: { category?: string; skip?: number; limit?: number }) {
    const where: any = { status: 'PUBLISHED', isDeleted: false };
    if (params.category) where.category = params.category;

    const [total, posts] = await Promise.all([
      prisma.blogPost.count({ where }),
      prisma.blogPost.findMany({
        where,
        skip: params.skip || 0,
        take: params.limit || 10,
        orderBy: { publishedAt: 'desc' },
      }),
    ]);

    return { total, posts: toClientArray(posts) };
  }

  static async getBlogBySlug(slug: string) {
    const post = await prisma.blogPost.findUnique({
      where: { slug },
    });
    return toClient(post);
  }

  static async getJobOpenings() {
    const jobs = await prisma.jobOpening.findMany({
      where: { isPublished: true, isDeleted: false, status: 'OPEN' },
      orderBy: { displayOrder: 'asc' },
    });
    return toClientArray(jobs);
  }

  static async getJobBySlug(slug: string) {
    const job = await prisma.jobOpening.findUnique({
      where: { slug },
    });
    return toClient(job);
  }

  static async createContactInquiry(data: {
    inquiryId: string;
    name: string;
    mobileNumber: string;
    email: string;
    message: string;
    userId?: string;
  }) {
    const id = generateObjectId();
    const inquiry = await prisma.contactInquiry.create({
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
    return toClient(inquiry);
  }

  static async getSettings() {
    const setting = await prisma.setting.findFirst();
    return toClient(setting);
  }
}
