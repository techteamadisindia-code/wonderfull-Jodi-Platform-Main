import { prisma, toClient, toClientArray, generateObjectId } from '../db/client';

export class ChatRepository {
  static async getOrCreateConversation(participantIds: string[]) {
    const sorted = [...participantIds].sort();

    const existing = await prisma.conversation.findFirst({
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
      return toClient(existing);
    }

    const conversationId = generateObjectId();
    const created = await prisma.conversation.create({
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

    return toClient(created);
  }

  static async sendMessage(data: {
    conversationId: string;
    senderId: string;
    receiverId: string;
    content: string;
  }) {
    const id = generateObjectId();
    const message = await prisma.message.create({
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
    await prisma.conversation.update({
      where: { id: data.conversationId },
      data: {
        lastMessage: data.content.slice(0, 200),
        lastActivityAt: new Date(),
      },
    });

    return toClient(message);
  }

  static async getMessages(conversationId: string, limit = 50, before?: Date) {
    const where: any = { conversationId };
    if (before) where.createdAt = { lt: before };

    const messages = await prisma.message.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: limit,
      include: {
        sender: { select: { id: true, fullName: true } },
      },
    });

    return toClientArray(messages);
  }
}
