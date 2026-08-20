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
      specialization,
      maritalStatus,
      motherTongue,
      ageMin,
      ageMax,
      minAge,
      maxAge,
      verified,
      hasPhoto,
      foodPreference,
      diet,
      smoking,
      drinking,
      page = '1',
      limit = '12',
      sort = 'bestMatch',
      order = 'desc',
    } = req.query as Record<string, string>;

    const filters: any = {};
    if (gender && gender !== 'All' && gender !== 'Any') {
      filters.gender = gender;
    }
    if (religion && religion !== 'All') {
      filters.religion = religion;
    }
    if (caste && caste !== 'All') {
      filters.caste = caste;
    }
    if (city && city !== 'All') {
      filters.city = { $regex: new RegExp(city, 'i') };
    }
    if (state && state !== 'All') {
      filters.state = { $regex: new RegExp(state, 'i') };
    }
    if (country && country !== 'All') {
      filters.country = country;
    }
    if (maritalStatus && maritalStatus !== 'All') {
      filters.maritalStatus = maritalStatus;
    }
    if (motherTongue && motherTongue !== 'All') {
      filters.motherTongue = motherTongue;
    }

    if (diet || foodPreference) {
      const selectedDiet = diet || foodPreference;
      if (selectedDiet !== 'All') {
        filters.foodPreference = selectedDiet;
      }
    }
    if (smoking && smoking !== 'All') {
      filters.smoking = smoking;
    }
    if (drinking && drinking !== 'All') {
      filters.drinking = drinking;
    }

    if (verified === 'true') {
      filters.verificationStatus = 'VERIFIED';
    }

    if (hasPhoto === 'true') {
      filters.primaryPhoto = { $exists: true, $ne: '' };
    }

    // Specialization / Profession match
    if (specialization && specialization !== 'All') {
      const specRegex = new RegExp(specialization, 'i');
      filters.$or = [
        { profession: { $regex: specRegex } },
        { degree: { $regex: specRegex } },
        { education: { $regex: specRegex } },
      ];
    } else if (profession && profession !== 'All') {
      filters.profession = { $regex: new RegExp(profession, 'i') };
    }

    if (education && education !== 'All') {
      const eduRegex = new RegExp(education, 'i');
      if (filters.$or) {
        filters.$and = [
          { $or: filters.$or },
          { $or: [{ education: { $regex: eduRegex } }, { degree: { $regex: eduRegex } }] },
        ];
        delete filters.$or;
      } else {
        filters.$or = [{ education: { $regex: eduRegex } }, { degree: { $regex: eduRegex } }];
      }
    }

    const effectiveMinAge = minAge || ageMin;
    const effectiveMaxAge = maxAge || ageMax;
    const ageFilters: any = {};
    const now = new Date();

    if (effectiveMaxAge && Number(effectiveMaxAge) > 0) {
      const maxDate = new Date(now.getFullYear() - Number(effectiveMaxAge), now.getMonth(), now.getDate());
      ageFilters.$gte = maxDate;
    }
    if (effectiveMinAge && Number(effectiveMinAge) > 0) {
      const minDate = new Date(now.getFullYear() - Number(effectiveMinAge), now.getMonth(), now.getDate());
      ageFilters.$lte = minDate;
    }
    if (Object.keys(ageFilters).length) {
      filters.dob = ageFilters;
    }

    const pageNumber = Math.max(1, Number(page));
    const pageSize = Math.min(50, Number(limit));

    // Dynamic sort handling
    let sortQuery: any = { createdAt: -1 };
    if (sort === 'bestMatch') {
      sortQuery = { verificationStatus: 1, lastActiveAt: -1 };
    } else if (sort === 'recentlyActive' || sort === 'recent') {
      sortQuery = { lastActiveAt: -1 };
    } else if (sort === 'newest') {
      sortQuery = { createdAt: -1 };
    } else if (sort === 'ageAsc') {
      sortQuery = { dob: -1 }; // Younger first
    } else if (sort === 'ageDesc') {
      sortQuery = { dob: 1 }; // Older first
    } else if (sort) {
      const sortDirection = order === 'asc' ? 1 : -1;
      sortQuery = { [sort]: sortDirection };
    }

    const total = await Profile.countDocuments(filters);
    const profiles = await Profile.find(filters)
      .sort(sortQuery)
      .skip((pageNumber - 1) * pageSize)
      .limit(pageSize)
      .populate('user', 'fullName email mobile role verificationStatus');

    res.json({ success: true, data: { total, page: pageNumber, limit: pageSize, profiles } });
  } catch (error) {
    next(error);
  }
}
