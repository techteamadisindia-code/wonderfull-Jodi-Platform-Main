"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InteractionRepository = void 0;
const client_1 = require("../db/client");
class InteractionRepository {
    static async sendInterest(senderId, receiverId) {
        if (senderId === receiverId) {
            throw new Error('Self-interest is not allowed.');
        }
        const existing = await client_1.prisma.interest.findFirst({
            where: {
                senderId: String(senderId),
                receiverId: String(receiverId),
            },
        });
        if (existing) {
            return { duplicate: true, interest: (0, client_1.toClient)(existing) };
        }
        const id = (0, client_1.generateObjectId)();
        const interest = await client_1.prisma.interest.create({
            data: {
                id,
                senderId: String(senderId),
                receiverId: String(receiverId),
                status: 'PENDING',
            },
        });
        return { duplicate: false, interest: (0, client_1.toClient)(interest) };
    }
    static async respondInterest(interestId, recipientUserId, status) {
        const interest = await client_1.prisma.interest.findUnique({
            where: { id: String(interestId) },
        });
        if (!interest)
            throw new Error('Interest request not found.');
        if (interest.receiverId !== String(recipientUserId)) {
            throw new Error('Unauthorized: only recipient can respond.');
        }
        const updated = await client_1.prisma.interest.update({
            where: { id: String(interestId) },
            data: { status, updatedAt: new Date() },
        });
        return (0, client_1.toClient)(updated);
    }
    static async toggleShortlist(userId, targetProfileId) {
        const existing = await client_1.prisma.shortlist.findFirst({
            where: {
                userId: String(userId),
                profileId: String(targetProfileId),
            },
        });
        if (existing) {
            await client_1.prisma.shortlist.delete({ where: { id: existing.id } });
            return { shortlisted: false };
        }
        await client_1.prisma.shortlist.create({
            data: {
                id: (0, client_1.generateObjectId)(),
                userId: String(userId),
                profileId: String(targetProfileId),
            },
        });
        return { shortlisted: true };
    }
    static async blockUser(blockerId, blockedUserId, reason) {
        const id = (0, client_1.generateObjectId)();
        const block = await client_1.prisma.block.create({
            data: {
                id,
                blockerId: String(blockerId),
                blockedUserId: String(blockedUserId),
                reason,
            },
        });
        return (0, client_1.toClient)(block);
    }
    static async isBlocked(userAId, userBId) {
        const block = await client_1.prisma.block.findFirst({
            where: {
                OR: [
                    { blockerId: String(userAId), blockedUserId: String(userBId) },
                    { blockerId: String(userBId), blockedUserId: String(userAId) },
                ],
            },
        });
        return !!block;
    }
}
exports.InteractionRepository = InteractionRepository;
//# sourceMappingURL=InteractionRepository.js.map