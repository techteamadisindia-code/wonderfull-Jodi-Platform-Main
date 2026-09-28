"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileRepository = void 0;
const client_1 = require("../db/client");
class ProfileRepository {
    static async findByUserId(userId) {
        const profile = await client_1.prisma.profile.findUnique({
            where: { userId: String(userId) },
            include: { user: true },
        });
        return (0, client_1.toClient)(profile);
    }
    static async findById(id) {
        const profile = await client_1.prisma.profile.findUnique({
            where: { id: String(id) },
            include: { user: true },
        });
        return (0, client_1.toClient)(profile);
    }
    static async findByCandidateId(candidateId) {
        const profile = await client_1.prisma.profile.findUnique({
            where: { candidateId: candidateId.trim() },
            include: { user: true },
        });
        return (0, client_1.toClient)(profile);
    }
    static async create(data) {
        const id = data.id || data._id || (0, client_1.generateObjectId)();
        const profile = await client_1.prisma.profile.create({
            data: {
                id,
                userId: String(data.userId || data.user),
                candidateId: data.candidateId,
                displayName: data.displayName,
                gender: data.gender || 'Male',
                dob: new Date(data.dob || '1995-01-01'),
                height: data.height || `5' 10"`,
                maritalStatus: data.maritalStatus || 'Never Married',
                motherTongue: data.motherTongue || '',
                religion: data.religion || '',
                caste: data.caste || '',
                education: data.education || 'MBBS',
                degree: data.degree || 'MBBS',
                profession: data.profession || 'Doctor',
                country: data.country || 'India',
                state: data.state || '',
                city: data.city || '',
                about: data.about || '',
                partnerPreferences: data.partnerPreferences || {},
                verificationStatus: data.verificationStatus || 'UNVERIFIED',
                status: data.status || 'Active',
            },
        });
        return (0, client_1.toClient)(profile);
    }
    static async update(userId, data) {
        const cleanData = { ...data };
        delete cleanData.id;
        delete cleanData._id;
        delete cleanData.userId;
        delete cleanData.user;
        const profile = await client_1.prisma.profile.update({
            where: { userId: String(userId) },
            data: cleanData,
        });
        return (0, client_1.toClient)(profile);
    }
    static async search(params) {
        const where = { isDeleted: false, status: 'Active' };
        if (params.gender)
            where.gender = params.gender;
        if (params.city)
            where.city = { contains: params.city };
        if (params.religion)
            where.religion = params.religion;
        if (params.caste)
            where.caste = params.caste;
        if (params.education)
            where.education = { contains: params.education };
        const [total, profiles] = await Promise.all([
            client_1.prisma.profile.count({ where }),
            client_1.prisma.profile.findMany({
                where,
                skip: params.skip || 0,
                take: params.limit || 20,
                orderBy: { createdAt: 'desc' },
                include: { user: { select: { id: true, fullName: true, verified: true } } },
            }),
        ]);
        return { total, profiles: (0, client_1.toClientArray)(profiles) };
    }
}
exports.ProfileRepository = ProfileRepository;
//# sourceMappingURL=ProfileRepository.js.map