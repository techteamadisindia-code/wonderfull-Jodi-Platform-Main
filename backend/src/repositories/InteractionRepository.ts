import { prisma, toClient, toClientArray, generateObjectId } from '../db/client';

export class InteractionRepository {
  static async sendInterest(senderId: string, receiverId: string) {
    if (senderId === receiverId) {
      throw new Error('Self-interest is not allowed.');
    }

    const existing = await prisma.interest.findFirst({
      where: {
        senderId: String(senderId),
        receiverId: String(receiverId),
      },
    });

    if (existing) {
      return { duplicate: true, interest: toClient(existing) };
    }

    const id = generateObjectId();
    const interest = await prisma.interest.create({
      data: {
        id,
        senderId: String(senderId),
        receiverId: String(receiverId),
        status: 'PENDING',
      },
    });

    return { duplicate: false, interest: toClient(interest) };
  }

  static async respondInterest(interestId: string, recipientUserId: string, status: 'ACCEPTED' | 'REJECTED') {
    const interest = await prisma.interest.findUnique({
      where: { id: String(interestId) },
    });

    if (!interest) throw new Error('Interest request not found.');
    if (interest.receiverId !== String(recipientUserId)) {
      throw new Error('Unauthorized: only recipient can respond.');
    }

    const updated = await prisma.interest.update({
      where: { id: String(interestId) },
      data: { status, updatedAt: new Date() },
    });

    return toClient(updated);
  }

  static async toggleShortlist(userId: string, targetProfileId: string) {
    const existing = await prisma.shortlist.findFirst({
      where: {
        userId: String(userId),
        profileId: String(targetProfileId),
      },
    });

    if (existing) {
      await prisma.shortlist.delete({ where: { id: existing.id } });
      return { shortlisted: false };
    }

    await prisma.shortlist.create({
      data: {
        id: generateObjectId(),
        userId: String(userId),
        profileId: String(targetProfileId),
      },
    });

    return { shortlisted: true };
  }

  static async blockUser(blockerId: string, blockedUserId: string, reason?: string) {
    const id = generateObjectId();
    const block = await prisma.block.create({
      data: {
        id,
        blockerId: String(blockerId),
        blockedUserId: String(blockedUserId),
        reason,
      },
    });
    return toClient(block);
  }

  static async isBlocked(userAId: string, userBId: string) {
    const block = await prisma.block.findFirst({
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
