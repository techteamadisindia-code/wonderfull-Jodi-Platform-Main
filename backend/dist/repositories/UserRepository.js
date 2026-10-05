"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRepository = void 0;
const client_1 = require("../db/client");
class UserRepository {
    static async findById(id) {
        const user = await client_1.prisma.user.findUnique({
            where: { id: String(id) },
            include: { profile: true, adminRecord: true },
        });
        return (0, client_1.toClient)(user);
    }
    static async findByEmail(email) {
        const user = await client_1.prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() },
            include: { profile: true },
        });
        return (0, client_1.toClient)(user);
    }
    static async findByMobile(mobile) {
        const user = await client_1.prisma.user.findUnique({
            where: { mobile: mobile.trim() },
            include: { profile: true },
        });
        return (0, client_1.toClient)(user);
    }
    static async findByEmailOrMobile(identifier) {
        const cleaned = identifier.trim();
        const isEmail = cleaned.includes('@');
        if (isEmail) {
            return this.findByEmail(cleaned);
        }
        return this.findByMobile(cleaned.replace(/\D/g, ''));
    }
    static async create(data) {
        const id = (0, client_1.generateObjectId)();
        const user = await client_1.prisma.user.create({
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
        return (0, client_1.toClient)(user);
    }
    static async updateStatus(id, status, _reason, _byAdminId) {
        const user = await client_1.prisma.user.update({
            where: { id: String(id) },
            data: {
                status,
                isActive: status === 'Active',
            },
        });
        return (0, client_1.toClient)(user);
    }
    static async softDelete(id, _reason, _byAdminId) {
        const user = await client_1.prisma.user.update({
            where: { id: String(id) },
            data: {
                isDeleted: true,
                status: 'Deleted',
                isActive: false,
            },
        });
        return (0, client_1.toClient)(user);
    }
    static async list(params) {
        const where = { isDeleted: false };
        if (params.role)
            where.role = params.role;
        if (params.status)
            where.status = params.status;
        if (params.search) {
            where.OR = [
                { fullName: { contains: params.search } },
                { email: { contains: params.search } },
                { mobile: { contains: params.search } },
            ];
        }
        const [total, users] = await Promise.all([
            client_1.prisma.user.count({ where }),
            client_1.prisma.user.findMany({
                where,
                skip: params.skip || 0,
                take: params.limit || 20,
                orderBy: { createdAt: 'desc' },
                include: { profile: true },
            }),
        ]);
        return { total, users: (0, client_1.toClientArray)(users) };
    }
}
exports.UserRepository = UserRepository;
//# sourceMappingURL=UserRepository.js.map