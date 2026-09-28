import { prisma, toClient, toClientArray, generateObjectId } from '../db/client';

export class VerificationRepository {
  static async submitDocument(data: {
    userId: string;
    documentType: string;
    documentName?: string;
    documentUrl: string;
    fileType?: string;
    fileSize?: number;
  }) {
    const id = generateObjectId();
    const verification = await prisma.verification.create({
      data: {
        id,
        userId: String(data.userId),
        documentType: data.documentType,
        documentName: data.documentName || 'Verification Document',
        documentUrl: data.documentUrl,
        fileType: data.fileType || 'application/pdf',
        fileSize: data.fileSize || 0,
        status: 'PENDING',
      },
    });

    // Update user verification status to PENDING
    await prisma.user.update({
      where: { id: String(data.userId) },
      data: { verificationStatus: 'PENDING' },
    });

    return toClient(verification);
  }

  static async reviewDocument(
    id: string,
    status: 'APPROVED' | 'REJECTED',
    reviewerId: string,
    notes?: string,
    rejectionReason?: string
  ) {
    const verification = await prisma.verification.update({
      where: { id: String(id) },
      data: {
        status,
        reviewedAt: new Date(),
        reviewedById: String(reviewerId),
        adminNotes: notes,
        rejectionReason: status === 'REJECTED' ? rejectionReason : null,
      },
    });

    // Update user and profile verification status
    const newStatus = status === 'APPROVED' ? 'VERIFIED' : 'REJECTED';
    await Promise.all([
      prisma.user.update({
        where: { id: verification.userId },
        data: {
          verificationStatus: newStatus,
          verified: status === 'APPROVED',
        },
      }),
      prisma.profile.updateMany({
        where: { userId: verification.userId },
        data: { verificationStatus: newStatus },
      }),
    ]);

    return toClient(verification);
  }

  static async getUserVerifications(userId: string) {
    const records = await prisma.verification.findMany({
      where: { userId: String(userId) },
      orderBy: { createdAt: 'desc' },
    });
    return toClientArray(records);
  }

  static async getPendingVerifications(limit = 50) {
    const pending = await prisma.verification.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      take: limit,
      include: {
        user: { select: { id: true, fullName: true, email: true, mobile: true } },
      },
    });
    return toClientArray(pending);
  }
}
