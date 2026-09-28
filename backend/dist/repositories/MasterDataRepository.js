"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MasterDataRepository = void 0;
const client_1 = require("../db/client");
class MasterDataRepository {
    static async getCountries() {
        const countries = await client_1.prisma.country.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' },
        });
        return (0, client_1.toClientArray)(countries);
    }
    static async getStates(countryId) {
        const where = { isActive: true };
        if (countryId)
            where.countryId = countryId;
        const states = await client_1.prisma.state.findMany({
            where,
            orderBy: { name: 'asc' },
        });
        return (0, client_1.toClientArray)(states);
    }
    static async getReligions() {
        const religions = await client_1.prisma.religion.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' },
        });
        return (0, client_1.toClientArray)(religions);
    }
    static async getCastes(religionId) {
        const where = { isActive: true };
        if (religionId)
            where.religionId = religionId;
        const castes = await client_1.prisma.caste.findMany({
            where,
            orderBy: { name: 'asc' },
        });
        return (0, client_1.toClientArray)(castes);
    }
    static async searchInstitutions(query, limit = 20) {
        const institutions = await client_1.prisma.institution.findMany({
            where: {
                OR: [
                    { name: { contains: query } },
                    { city: { contains: query } },
                    { state: { contains: query } },
                ],
            },
            take: limit,
            orderBy: { name: 'asc' },
        });
        return (0, client_1.toClientArray)(institutions);
    }
}
exports.MasterDataRepository = MasterDataRepository;
//# sourceMappingURL=MasterDataRepository.js.map