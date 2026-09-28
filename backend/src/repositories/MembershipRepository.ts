import { prisma, toClient, toClientArray, generateObjectId } from '../db/client';

export class MembershipRepository {
  static async getActivePlans() {
    const plans = await prisma.membershipPlan.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });
    return toClientArray(plans);
  }

  static async getPlanById(id: string) {
    const plan = await prisma.membershipPlan.findUnique({
      where: { id: String(id) },
    });
    return toClient(plan);
  }

  static async getPlanBySlug(slug: string) {
    const plan = await prisma.membershipPlan.findUnique({
      where: { slug },
    });
    return toClient(plan);
  }

  static async getUserActiveSubscription(userId: string) {
    const now = new Date();
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: String(userId),
        status: 'ACTIVE',
        expiryDate: { gte: now },
      },
      orderBy: { expiryDate: 'desc' },
    });
    return toClient(subscription);
  }

  static async createSubscription(data: {
    userId: string;
    plan: string;
    durationDays: number;
    paymentReference?: string;
  }) {
    const now = new Date();
    const expiryDate = new Date(now.getTime() + (data.durationDays || 30) * 86400000);
    const id = generateObjectId();

    const sub = await prisma.subscription.create({
      data: {
        id,
        userId: String(data.userId),
        plan: data.plan,
        startDate: now,
        expiryDate,
        status: 'ACTIVE',
        paymentReference: data.paymentReference,
      },
    });
    return toClient(sub);
  }
}
