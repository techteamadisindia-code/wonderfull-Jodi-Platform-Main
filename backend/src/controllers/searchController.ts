import { Request, Response, NextFunction } from 'express';
import { Profile } from '../models/Profile';

export async function searchProfiles(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      gender,
      religion,
      caste,
      city,
      state,
      country,
      education,
      profession,
      maritalStatus,
      motherTongue,
      ageMin,
      ageMax,
      page = '1',
      limit = '10',
      sort = 'createdAt',
      order = 'desc',
    } = req.query as Record<string, string>;

    const filters: any = {};
    if (gender) filters.gender = gender;
    if (religion) filters.religion = religion;
    if (caste) filters.caste = caste;
    if (city) filters.city = city;
    if (state) filters.state = state;
    if (country) filters.country = country;
    if (education) filters.education = education;
    if (profession) filters.profession = profession;
    if (maritalStatus) filters.maritalStatus = maritalStatus;
    if (motherTongue) filters.motherTongue = motherTongue;

    const ageFilters: any = {};
    const now = new Date();
    if (ageMax) {
      const maxDate = new Date(now.getFullYear() - Number(ageMax), now.getMonth(), now.getDate());
      ageFilters.$gte = maxDate;
    }
    if (ageMin) {
      const minDate = new Date(now.getFullYear() - Number(ageMin), now.getMonth(), now.getDate());
      ageFilters.$lte = minDate;
    }
    if (Object.keys(ageFilters).length) {
      filters.dob = ageFilters;
    }

    const pageNumber = Math.max(1, Number(page));
    const pageSize = Math.min(50, Number(limit));
    const sortDirection = order === 'asc' ? 1 : -1;

    const total = await Profile.countDocuments(filters);
    const profiles = await Profile.find(filters)
      .sort({ [sort]: sortDirection })
      .skip((pageNumber - 1) * pageSize)
      .limit(pageSize)
      .populate('user', 'fullName');

    res.json({ success: true, data: { total, page: pageNumber, limit: pageSize, profiles } });
  } catch (error) {
    next(error);
  }
}
