import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Religion, Caste, SubCaste, Language } from '../models/CommunityMaster';
import { escapeRegex } from '../utils/securityUtils';

/**
 * GET /api/community/religions
 */
export async function getReligions(req: Request, res: Response, next: NextFunction) {
  try {
    const religions = await Religion.find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .lean();
    return res.json({ success: true, count: religions.length, data: religions });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/community/castes?religionId=...&category=...&search=...
 */
export async function getCastes(req: Request, res: Response, next: NextFunction) {
  try {
    const { religionId, religionName, category, search } = req.query;

    const filter: any = { isActive: true };

    let targetReligionId = religionId;
    if (!targetReligionId && religionName && typeof religionName === 'string') {
      const relDoc = await Religion.findOne({
        name: { $regex: new RegExp(`^${escapeRegex(religionName.trim())}$`, 'i') },
      });
      if (relDoc) {
        targetReligionId = relDoc._id.toString();
      }
    }

    if (targetReligionId && mongoose.isValidObjectId(targetReligionId)) {
      filter.religionId = targetReligionId;
    }

    if (category && typeof category === 'string' && category !== 'All' && category.trim()) {
      filter.category = category.trim();
    }

    if (search && typeof search === 'string' && search.trim()) {
      const safe = escapeRegex(search.trim());
      filter.$or = [
        { name: { $regex: new RegExp(safe, 'i') } },
        { aliases: { $regex: new RegExp(safe, 'i') } },
      ];
    }

    const castes = await Caste.find(filter)
      .populate('religionId', 'name')
      .sort({ name: 1 })
      .lean();

    return res.json({ success: true, count: castes.length, data: castes });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/community/sub-castes?casteId=...&search=...
 */
export async function getSubCastes(req: Request, res: Response, next: NextFunction) {
  try {
    const { casteId, search } = req.query;

    if (!casteId || !mongoose.isValidObjectId(casteId)) {
      return res.status(400).json({ success: false, message: 'Valid casteId is required to fetch sub-castes.' });
    }

    const filter: any = { casteId, isActive: true };

    if (search && typeof search === 'string' && search.trim()) {
      const safe = escapeRegex(search.trim());
      filter.$or = [
        { name: { $regex: new RegExp(safe, 'i') } },
        { aliases: { $regex: new RegExp(safe, 'i') } },
      ];
    }

    const subCastes = await SubCaste.find(filter)
      .sort({ name: 1 })
      .lean();

    return res.json({ success: true, count: subCastes.length, data: subCastes });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/community/languages?search=...
 */
export async function getLanguages(req: Request, res: Response, next: NextFunction) {
  try {
    const { search } = req.query;
    const filter: any = { isActive: true };

    if (search && typeof search === 'string' && search.trim()) {
      const safe = escapeRegex(search.trim());
      filter.$or = [
        { name: { $regex: new RegExp(safe, 'i') } },
        { nativeNames: { $regex: new RegExp(safe, 'i') } },
      ];
    }

    const languages = await Language.find(filter)
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    return res.json({ success: true, count: languages.length, data: languages });
  } catch (error) {
    next(error);
  }
}

/**
 * Validates Community / Caste hierarchy
 */
export async function validateCommunityHierarchy(data: {
  religionId?: string;
  casteId?: string;
  subCasteId?: string;
}): Promise<{ isValid: boolean; error?: string; resolved?: any }> {
  try {
    const resolved: any = {};

    if (data.religionId) {
      if (!mongoose.isValidObjectId(data.religionId)) return { isValid: false, error: 'Invalid religionId' };
      const rel = await Religion.findById(data.religionId);
      if (!rel) return { isValid: false, error: 'Religion not found' };
      resolved.religion = rel.name;
    }

    if (data.casteId) {
      if (!mongoose.isValidObjectId(data.casteId)) return { isValid: false, error: 'Invalid casteId' };
      const caste = await Caste.findById(data.casteId);
      if (!caste) return { isValid: false, error: 'Caste not found' };
      if (data.religionId && caste.religionId.toString() !== data.religionId) {
        return { isValid: false, error: 'Selected Caste does not belong to the selected Religion.' };
      }
      resolved.caste = caste.name;
      resolved.category = caste.category;
    }

    if (data.subCasteId) {
      if (!mongoose.isValidObjectId(data.subCasteId)) return { isValid: false, error: 'Invalid subCasteId' };
      const sub = await SubCaste.findById(data.subCasteId);
      if (!sub) return { isValid: false, error: 'Sub-caste not found' };
      if (data.casteId && sub.casteId.toString() !== data.casteId) {
        return { isValid: false, error: 'Selected Sub-Caste does not belong to the selected Caste.' };
      }
      resolved.subCaste = sub.name;
    }

    return { isValid: true, resolved };
  } catch (err: any) {
    return { isValid: false, error: err.message || 'Community validation failed' };
  }
}
