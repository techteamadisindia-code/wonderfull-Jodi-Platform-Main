"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MembershipRepository = void 0;
const client_1 = require("../db/client");
class MembershipRepository {
    static async getActivePlans() {
        const plans = await client_1.prisma.membershipPlan.findMany({
            where: { isActive: true },
            orderBy: { displayOrder: 'asc' },
        });
        return (0, client_1.toClientArray)(plans);
    }
    static async getPlanById(id) {
        const plan = await client_1.prisma.membershipPlan.findUnique({
            where: { id: String(id) },
        });
        return (0, client_1.toClient)(plan);
    }
    static async getPlanBySlug(slug) {
        const plan = await client_1.prisma.membershipPlan.findUnique({
            where: { slug },
        });
        return (0, client_1.toClient)(plan);
    }
    static async getUserActiveSubscription(userId) {
        const now = new Date();
        const subscription = await client_1.prisma.subscription.findFirst({
            where: {
                userId: String(userId),
                status: 'ACTIVE',
                expiryDate: { gte: now },
            },
            orderBy: { expiryDate: 'desc' },
        });
        return (0, client_1.toClient)(subscription);
    }
    static async createSubscription(data) {
        const now = new Date();
        const expiryDate = new Date(now.getTime() + (data.durationDays || 30) * 86400000);
        const id = (0, client_1.generateObjectId)();
        const sub = await client_1.prisma.subscription.create({
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
        return (0, client_1.toClient)(sub);
    }
}
exports.MembershipRepository = MembershipRepository;
//# sourceMappingURL=MembershipRepository.js.map