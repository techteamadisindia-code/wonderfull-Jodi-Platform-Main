"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatRepository = void 0;
const client_1 = require("../db/client");
class ChatRepository {
    static async getOrCreateConversation(participantIds) {
        const sorted = [...participantIds].sort();
        const existing = await client_1.prisma.conversation.findFirst({
            where: {
                AND: sorted.map((pId) => ({
                    participants: { some: { userId: pId } },
                })),
            },
            include: {
                participants: { include: { user: { select: { id: true, fullName: true } } } },
            },
        });
        if (existing) {
            return (0, client_1.toClient)(existing);
        }
        const conversationId = (0, client_1.generateObjectId)();
        const created = await client_1.prisma.conversation.create({
            data: {
                id: conversationId,
                status: 'ACTIVE',
                participants: {
                    create: sorted.map((pId) => ({
                        userId: pId,
                    })),
                },
            },
            include: {
                participants: { include: { user: { select: { id: true, fullName: true } } } },
            },
        });
        return (0, client_1.toClient)(created);
    }
    static async sendMessage(data) {
        const id = (0, client_1.generateObjectId)();
        const message = await client_1.prisma.message.create({
            data: {
                id,
                conversationId: data.conversationId,
                senderId: data.senderId,
                receiverId: data.receiverId,
                content: data.content,
                read: false,
            },
        });
        // Update conversation lastActivityAt and lastMessage
        await client_1.prisma.conversation.update({
            where: { id: data.conversationId },
            data: {
                lastMessage: data.content.slice(0, 200),
                lastActivityAt: new Date(),
            },
        });
        return (0, client_1.toClient)(message);
    }
    static async getMessages(conversationId, limit = 50, before) {
        const where = { conversationId };
        if (before)
            where.createdAt = { lt: before };
        const messages = await client_1.prisma.message.findMany({
            where,
            orderBy: { createdAt: 'asc' },
            take: limit,
            include: {
                sender: { select: { id: true, fullName: true } },
            },
        });
        return (0, client_1.toClientArray)(messages);
    }
}
exports.ChatRepository = ChatRepository;
//# sourceMappingURL=ChatRepository.js.map