"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminRepository = void 0;
const client_1 = require("../db/client");
class AdminRepository {
    static async findByUserId(userId) {
        const admin = await client_1.prisma.admin.findUnique({
            where: { userId: String(userId) },
            include: { user: true },
        });
        return (0, client_1.toClient)(admin);
    }
    static async createAdmin(userId, permissions = []) {
        const id = (0, client_1.generateObjectId)();
        const admin = await client_1.prisma.admin.create({
            data: {
                id,
                userId: String(userId),
                permissions: permissions || [],
            },
            include: { user: true },
        });
        return (0, client_1.toClient)(admin);
    }
    static async logAction(data) {
        const id = (0, client_1.generateObjectId)();
        const log = await client_1.prisma.auditLog.create({
            data: {
                id,
                adminEmail: data.adminEmail,
                action: data.action,
                adminId: data.adminId,
                adminName: data.adminName,
                targetModel: data.targetModel,
                targetId: data.targetId,
                details: data.details,
                ipAddress: data.ipAddress || '127.0.0.1',
                status: data.status || 'SUCCESS',
            },
        });
        return (0, client_1.toClient)(log);
    }
    static async getDashboardCounts() {
        const [totalUsers, activeUsers, verifiedProfiles, pendingVerifications, activeSubscriptions, pendingReports, newInquiries,] = await Promise.all([
            client_1.prisma.user.count({ where: { role: 'user', isDeleted: false } }),
            client_1.prisma.user.count({ where: { role: 'user', isActive: true, isDeleted: false } }),
            client_1.prisma.profile.count({ where: { verificationStatus: 'VERIFIED', isDeleted: false } }),
            client_1.prisma.verification.count({ where: { status: 'PENDING' } }),
            client_1.prisma.subscription.count({ where: { status: 'ACTIVE' } }),
            client_1.prisma.report.count({ where: { status: 'PENDING' } }),
            client_1.prisma.contactInquiry.count({ where: { status: 'NEW' } }),
        ]);
        return {
            totalUsers,
            activeUsers,
            verifiedProfiles,
            pendingVerifications,
            activeSubscriptions,
            pendingReports,
            newInquiries,
        };
    }
}
exports.AdminRepository = AdminRepository;
//# sourceMappingURL=AdminRepository.js.map