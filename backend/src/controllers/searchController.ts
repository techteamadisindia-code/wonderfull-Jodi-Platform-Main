import { Request, Response, NextFunction } from 'express';
<<<<<<< HEAD
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { Profile } from '../models/Profile';
import { User } from '../models/User';
import { Block } from '../models/Block';
import { escapeRegex, serializePublicProfile } from '../utils/securityUtils';
=======
import { Profile } from '../models/Profile';
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1

export async function searchProfiles(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      gender,
<<<<<<< HEAD
      lookingFor,
      religion,
      religionId,
      caste,
      casteId,
      city,
      cityId,
      location,
      state,
      stateId,
      districtId,
      country,
      countryId,
      education,
      profession,
      specialization,
      maritalStatus,
      motherTongue,
      motherTongueId,
      ageFrom,
      ageTo,
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

    // Check optional authenticated user to exclude self and blocked profiles
    let currentUserId: string | null = null;
    let blockedUserIds: string[] = [];

    const authHeader = req.headers.authorization;
    const cookieToken = req.cookies?.access_token;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : cookieToken;

    if (token) {
      try {
        const decoded: any = jwt.verify(
          token,
          process.env.JWT_SECRET ?? 'supersecret_wonderfuljodi_dev_key_2026'
        );
        if (decoded?.userId || decoded?.id) {
          currentUserId = decoded.userId || decoded.id;

          // Find users blocked by or who blocked current user
          const blocks = await Block.find({
            $or: [{ blocker: currentUserId }, { blockedUser: currentUserId }],
          });
          blockedUserIds = blocks.map((b) =>
            b.blocker.toString() === currentUserId ? b.blockedUser.toString() : b.blocker.toString()
          );
        }
      } catch {
        // Continue unauthenticated
      }
    }

    // Get active user IDs to ensure suspended/inactive users are not returned
    const excludedIds = new Set<string>();
    if (currentUserId) excludedIds.add(currentUserId);
    blockedUserIds.forEach((id) => excludedIds.add(id));

    const activeUsers = await User.find({
      isActive: true,
      ...(excludedIds.size > 0 ? { _id: { $nin: Array.from(excludedIds) } } : {}),
    }).select('_id');

    const activeUserIds = activeUsers.map((u) => u._id);

    const filters: any = {
      user: { $in: activeUserIds },
    };

    // Gender filter (safely match without arbitrary regex)
    const rawGender = (gender || lookingFor || '').trim();
    if (rawGender) {
      const gLower = rawGender.toLowerCase();
      if (gLower === 'female' || gLower === 'bride' || gLower === 'brides') {
        filters.gender = 'Female';
      } else if (gLower === 'male' || gLower === 'groom' || gLower === 'grooms') {
        filters.gender = 'Male';
      } else if (gLower !== 'all' && gLower !== 'any' && gLower !== '') {
        filters.gender = rawGender === 'Other' ? 'Other' : rawGender;
      }
    }

    // Religion filter
    if (religionId && mongoose.isValidObjectId(religionId)) {
      filters['communityDetails.religionId'] = religionId;
    } else if (religion) {
      const cleanRel = religion.trim();
      const relLower = cleanRel.toLowerCase();
      if (relLower !== 'all' && relLower !== 'any' && relLower !== 'any religion' && cleanRel !== '') {
        filters.religion = { $regex: new RegExp(`^${escapeRegex(cleanRel)}$`, 'i') };
      }
    }

    // Caste filter
    if (casteId && mongoose.isValidObjectId(casteId)) {
      filters['communityDetails.casteId'] = casteId;
    } else if (caste && caste !== 'All' && caste !== 'Any' && caste.trim() !== '') {
      filters.caste = { $regex: new RegExp(escapeRegex(caste.trim()), 'i') };
    }

    // Structured Location IDs
    if (cityId && mongoose.isValidObjectId(cityId)) {
      filters['currentLocation.cityId'] = cityId;
    }
    if (districtId && mongoose.isValidObjectId(districtId)) {
      filters['currentLocation.districtId'] = districtId;
    }
    if (stateId && mongoose.isValidObjectId(stateId)) {
      filters['currentLocation.stateId'] = stateId;
    }
    if (countryId && mongoose.isValidObjectId(countryId)) {
      filters['currentLocation.countryId'] = countryId;
    }

    // Location / City filter fallback (escaped regex)
    const rawLocation = (location || city || '').trim();
    if (!cityId && rawLocation) {
      const locLower = rawLocation.toLowerCase();
      if (locLower !== 'all' && locLower !== 'any' && locLower !== 'any location' && rawLocation !== '') {
        const safeLoc = escapeRegex(rawLocation);
        filters.$or = [
          { city: { $regex: new RegExp(safeLoc, 'i') } },
          { state: { $regex: new RegExp(safeLoc, 'i') } },
          { country: { $regex: new RegExp(safeLoc, 'i') } },
        ];
      }
    }

    if (!stateId && state && state !== 'All' && state !== 'Any' && state.trim() !== '') {
      filters.state = { $regex: new RegExp(escapeRegex(state.trim()), 'i') };
    }
    if (!countryId && country && country !== 'All' && country !== 'Any' && country.trim() !== '') {
      filters.country = country.trim();
    }
    if (maritalStatus && maritalStatus !== 'All' && maritalStatus !== 'Any' && maritalStatus.trim() !== '') {
      filters.maritalStatus = maritalStatus.trim();
    }
    if (motherTongueId && mongoose.isValidObjectId(motherTongueId)) {
      filters['languageDetails.motherTongueId'] = motherTongueId;
    } else if (motherTongue && motherTongue !== 'All' && motherTongue !== 'Any' && motherTongue.trim() !== '') {
      filters.motherTongue = motherTongue.trim();
    }

    // Diet filter
    const selectedDiet = (diet || foodPreference || '').trim();
    if (selectedDiet && selectedDiet !== 'All' && selectedDiet !== 'Any') {
      filters.foodPreference = selectedDiet;
    }
    if (smoking && smoking !== 'All' && smoking !== 'Any' && smoking.trim() !== '') {
      filters.smoking = smoking.trim();
    }
    if (drinking && drinking !== 'All' && drinking !== 'Any' && drinking.trim() !== '') {
      filters.drinking = drinking.trim();
    }

    if (verified === 'true') {
      filters.verificationStatus = 'VERIFIED';
    }

    if (hasPhoto === 'true') {
      filters.primaryPhoto = { $exists: true, $ne: '' };
    }

    // Specialization / Profession (escaped regex)
    const spec = (specialization || '').trim();
    const prof = (profession || '').trim();
    if (spec && spec !== 'All' && spec !== 'Any') {
      const safeSpec = escapeRegex(spec);
      const specRegex = new RegExp(safeSpec, 'i');
      filters.$and = filters.$and || [];
      filters.$and.push({
        $or: [
          { profession: { $regex: specRegex } },
          { degree: { $regex: specRegex } },
          { education: { $regex: specRegex } },
        ],
      });
    } else if (prof && prof !== 'All' && prof !== 'Any') {
      filters.profession = { $regex: new RegExp(escapeRegex(prof), 'i') };
    }

    // Education (escaped regex)
    const edu = (education || '').trim();
    if (edu && edu !== 'All' && edu !== 'Any') {
      const safeEdu = escapeRegex(edu);
      const eduRegex = new RegExp(safeEdu, 'i');
      filters.$and = filters.$and || [];
      filters.$and.push({
        $or: [{ education: { $regex: eduRegex } }, { degree: { $regex: eduRegex } }],
      });
    }

    // Age Calculation
    const effectiveMinAge = Number(ageFrom || minAge || ageMin);
    const effectiveMaxAge = Number(ageTo || maxAge || ageMax);
    const ageFilters: any = {};
    const now = new Date();

    if (effectiveMaxAge > 0 && effectiveMaxAge <= 100) {
      const maxDate = new Date(now.getFullYear() - effectiveMaxAge - 1, now.getMonth(), now.getDate());
      ageFilters.$gte = maxDate;
    }
    if (effectiveMinAge > 0 && effectiveMinAge <= 100) {
      const minDate = new Date(now.getFullYear() - effectiveMinAge, now.getMonth(), now.getDate());
=======
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
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1
      ageFilters.$lte = minDate;
    }
    if (Object.keys(ageFilters).length) {
      filters.dob = ageFilters;
    }

<<<<<<< HEAD
    const pageNumber = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(limit, 10) || 12));

    // Dynamic sort handling with safe allowlist
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
    }

    const [total, rawProfiles] = await Promise.all([
      Profile.countDocuments(filters),
      Profile.find(filters)
        .sort(sortQuery)
        .skip((pageNumber - 1) * pageSize)
        .limit(pageSize)
        .populate('user', 'fullName role verificationStatus verified'),
    ]);

    // Serialize profiles securely (strips all private user fields: email, mobile)
    const sanitizedProfiles = rawProfiles.map(serializePublicProfile);

    res.json({
      success: true,
      data: {
        total,
        page: pageNumber,
        limit: pageSize,
        profiles: sanitizedProfiles,
      },
    });
=======
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
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1
  } catch (error) {
    next(error);
  }
}
