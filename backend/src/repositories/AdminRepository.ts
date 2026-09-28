import { prisma, toClient, toClientArray, generateObjectId } from '../db/client';

export class AdminRepository {
  static async findByUserId(userId: string) {
    const admin = await prisma.admin.findUnique({
      where: { userId: String(userId) },
      include: { user: true },
    });
    return toClient(admin);
  }

  static async createAdmin(userId: string, permissions: string[] = []) {
    const id = generateObjectId();
    const admin = await prisma.admin.create({
      data: {
        id,
        userId: String(userId),
        permissions: permissions || [],
      },
      include: { user: true },
    });
    return toClient(admin);
  }

  static async logAction(data: {
    adminEmail: string;
    action: string;
    adminId?: string;
    adminName?: string;
    targetModel?: string;
    targetId?: string;
    details?: string;
    ipAddress?: string;
    status?: string;
  }) {
    const id = generateObjectId();
    const log = await prisma.auditLog.create({
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
    return toClient(log);
  }

  static async getDashboardCounts() {
    const [
      totalUsers,
      activeUsers,
      verifiedProfiles,
      pendingVerifications,
      activeSubscriptions,
      pendingReports,
      newInquiries,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'user', isDeleted: false } }),
      prisma.user.count({ where: { role: 'user', isActive: true, isDeleted: false } }),
      prisma.profile.count({ where: { verificationStatus: 'VERIFIED', isDeleted: false } }),
      prisma.verification.count({ where: { status: 'PENDING' } }),
      prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      prisma.report.count({ where: { status: 'PENDING' } }),
      prisma.contactInquiry.count({ where: { status: 'NEW' } }),
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
