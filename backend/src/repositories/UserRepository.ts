import { prisma, toClient, toClientArray, generateObjectId } from '../db/client';

export class UserRepository {
  static async findById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id: String(id) },
      include: { profile: true, adminRecord: true },
    });
    return toClient(user);
  }

  static async findByEmail(email: string) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { profile: true },
    });
    return toClient(user);
  }

  static async findByMobile(mobile: string) {
    const user = await prisma.user.findUnique({
      where: { mobile: mobile.trim() },
      include: { profile: true },
    });
    return toClient(user);
  }

  static async findByEmailOrMobile(identifier: string) {
    const cleaned = identifier.trim();
    const isEmail = cleaned.includes('@');
    if (isEmail) {
      return this.findByEmail(cleaned);
    }
    return this.findByMobile(cleaned.replace(/\D/g, ''));
  }

  static async create(data: {
    fullName: string;
    email: string;
    mobile: string;
    password: string;
    role?: string;
    termsAccepted?: boolean;
    termsVersion?: string;
  }) {
    const id = generateObjectId();
    const user = await prisma.user.create({
      data: {
        id,
        fullName: data.fullName.trim(),
        email: data.email.toLowerCase().trim(),
        mobile: data.mobile.trim(),
        password: data.password,
        role: data.role || 'user',
        termsAccepted: data.termsAccepted ?? true,
        termsVersion: data.termsVersion || '2026-09-V1',
        termsAcceptedAt: new Date(),
        isActive: true,
        status: 'Active',
      },
    });
    return toClient(user);
  }

  static async updateStatus(id: string, status: string, _reason?: string, _byAdminId?: string) {
    const user = await prisma.user.update({
      where: { id: String(id) },
      data: {
        status,
        isActive: status === 'Active',
      },
    });
    return toClient(user);
  }

  static async softDelete(id: string, _reason?: string, _byAdminId?: string) {
    const user = await prisma.user.update({
      where: { id: String(id) },
      data: {
        isDeleted: true,
        status: 'Deleted',
        isActive: false,
      },
    });
    return toClient(user);
  }

  static async list(params: {
    skip?: number;
    limit?: number;
    role?: string;
    status?: string;
    search?: string;
  }) {
    const where: any = { isDeleted: false };
    if (params.role) where.role = params.role;
    if (params.status) where.status = params.status;
    if (params.search) {
      where.OR = [
        { fullName: { contains: params.search } },
        { email: { contains: params.search } },
        { mobile: { contains: params.search } },
      ];
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip: params.skip || 0,
        take: params.limit || 20,
        orderBy: { createdAt: 'desc' },
        include: { profile: true },
      }),
    ]);

    return { total, users: toClientArray(users) };
  }
}
