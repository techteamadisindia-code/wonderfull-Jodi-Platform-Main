"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerificationRepository = void 0;
const client_1 = require("../db/client");
class VerificationRepository {
    static async submitDocument(data) {
        const id = (0, client_1.generateObjectId)();
        const verification = await client_1.prisma.verification.create({
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
        await client_1.prisma.user.update({
            where: { id: String(data.userId) },
            data: { verificationStatus: 'PENDING' },
        });
        return (0, client_1.toClient)(verification);
    }
    static async reviewDocument(id, status, reviewerId, notes, rejectionReason) {
        const verification = await client_1.prisma.verification.update({
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
            client_1.prisma.user.update({
                where: { id: verification.userId },
                data: {
                    verificationStatus: newStatus,
                    verified: status === 'APPROVED',
                },
            }),
            client_1.prisma.profile.updateMany({
                where: { userId: verification.userId },
                data: { verificationStatus: newStatus },
            }),
        ]);
        return (0, client_1.toClient)(verification);
    }
    static async getUserVerifications(userId) {
        const records = await client_1.prisma.verification.findMany({
            where: { userId: String(userId) },
            orderBy: { createdAt: 'desc' },
        });
        return (0, client_1.toClientArray)(records);
    }
    static async getPendingVerifications(limit = 50) {
        const pending = await client_1.prisma.verification.findMany({
            where: { status: 'PENDING' },
            orderBy: { createdAt: 'asc' },
            take: limit,
            include: {
                user: { select: { id: true, fullName: true, email: true, mobile: true } },
            },
        });
        return (0, client_1.toClientArray)(pending);
    }
}
exports.VerificationRepository = VerificationRepository;
//# sourceMappingURL=VerificationRepository.js.map