import { prisma, toClient, toClientArray, generateObjectId } from '../db/client';

export class MasterDataRepository {
  static async getCountries() {
    const countries = await prisma.country.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    return toClientArray(countries);
  }

  static async getStates(countryId?: string) {
    const where: any = { isActive: true };
    if (countryId) where.countryId = countryId;

    const states = await prisma.state.findMany({
      where,
      orderBy: { name: 'asc' },
    });
    return toClientArray(states);
  }

  static async getReligions() {
    const religions = await prisma.religion.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    return toClientArray(religions);
  }

  static async getCastes(religionId?: string) {
    const where: any = { isActive: true };
    if (religionId) where.religionId = religionId;

    const castes = await prisma.caste.findMany({
      where,
      orderBy: { name: 'asc' },
    });
    return toClientArray(castes);
  }

  static async searchInstitutions(query: string, limit = 20) {
    const institutions = await prisma.institution.findMany({
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
    return toClientArray(institutions);
  }
}
