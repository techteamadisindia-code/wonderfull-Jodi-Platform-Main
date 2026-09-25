import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Country, State, District, SubDistrict, City, Village } from '../models/Location';
import { escapeRegex } from '../utils/securityUtils';

/**
 * GET /api/locations/countries
 */
export async function getCountries(req: Request, res: Response, next: NextFunction) {
  try {
    const { search } = req.query;
    const filter: any = { isActive: true };

    if (search && typeof search === 'string' && search.trim()) {
      filter.name = { $regex: new RegExp(escapeRegex(search.trim()), 'i') };
    }

    const countries = await Country.find(filter)
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    return res.json({ success: true, count: countries.length, data: countries });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/locations/states
 */
export async function getStates(req: Request, res: Response, next: NextFunction) {
  try {
    const { countryId, countryCode, search } = req.query;
    let targetCountryId = countryId;

    if (!targetCountryId) {
      const countryQuery = countryCode ? { code: String(countryCode).toUpperCase() } : { code: 'IN' };
      const countryDoc = await Country.findOne(countryQuery);
      if (countryDoc) {
        targetCountryId = countryDoc._id.toString();
      }
    }

    const filter: any = { isActive: true };
    if (targetCountryId && mongoose.isValidObjectId(targetCountryId)) {
      filter.countryId = targetCountryId;
    }

    if (search && typeof search === 'string' && search.trim()) {
      filter.name = { $regex: new RegExp(escapeRegex(search.trim()), 'i') };
    }

    const states = await State.find(filter)
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    return res.json({ success: true, count: states.length, data: states });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/locations/districts?stateId=...
 */
export async function getDistricts(req: Request, res: Response, next: NextFunction) {
  try {
    const { stateId, search } = req.query;

    if (!stateId || !mongoose.isValidObjectId(stateId)) {
      return res.status(400).json({ success: false, message: 'Valid stateId query parameter is required.' });
    }

    // Verify state exists
    const stateExists = await State.exists({ _id: stateId });
    if (!stateExists) {
      return res.status(404).json({ success: false, message: 'Specified state not found.' });
    }

    const filter: any = { stateId, isActive: true };
    if (search && typeof search === 'string' && search.trim()) {
      filter.name = { $regex: new RegExp(escapeRegex(search.trim()), 'i') };
    }

    const districts = await District.find(filter)
      .sort({ name: 1 })
      .lean();

    return res.json({ success: true, count: districts.length, data: districts });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/locations/sub-districts?districtId=...
 */
export async function getSubDistricts(req: Request, res: Response, next: NextFunction) {
  try {
    const { districtId, search } = req.query;

    if (!districtId || !mongoose.isValidObjectId(districtId)) {
      return res.status(400).json({ success: false, message: 'Valid districtId query parameter is required.' });
    }

    const districtExists = await District.exists({ _id: districtId });
    if (!districtExists) {
      return res.status(404).json({ success: false, message: 'Specified district not found.' });
    }

    const filter: any = { districtId, isActive: true };
    if (search && typeof search === 'string' && search.trim()) {
      filter.name = { $regex: new RegExp(escapeRegex(search.trim()), 'i') };
    }

    const subDistricts = await SubDistrict.find(filter)
      .sort({ name: 1 })
      .lean();

    return res.json({ success: true, count: subDistricts.length, data: subDistricts });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/locations/cities?districtId=...&subDistrictId=...&search=...&page=1&limit=20
 */
export async function getCities(req: Request, res: Response, next: NextFunction) {
  try {
    const { districtId, subDistrictId, stateId, search, page = '1', limit = '30' } = req.query;

    const filter: any = { isActive: true };

    if (districtId && mongoose.isValidObjectId(districtId)) {
      filter.districtId = districtId;
    }
    if (subDistrictId && mongoose.isValidObjectId(subDistrictId)) {
      filter.subDistrictId = subDistrictId;
    }
    const targetState = stateId || req.query.state;
    if (targetState) {
      if (mongoose.isValidObjectId(targetState)) {
        filter.stateId = targetState;
      } else {
        const stateDoc = await State.findOne({
          name: { $regex: new RegExp(`^${escapeRegex(String(targetState).trim())}$`, 'i') },
        });
        if (stateDoc) {
          filter.stateId = stateDoc._id;
        } else {
          return res.json({
            success: true,
            data: [],
            pagination: { total: 0, page: 1, limit: 30, pages: 0 },
          });
        }
      }
    }

    if (search && typeof search === 'string' && search.trim()) {
      filter.name = { $regex: new RegExp(escapeRegex(search.trim()), 'i') };
    }

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 30));
    const skip = (pageNum - 1) * limitNum;

    const [total, cities] = await Promise.all([
      City.countDocuments(filter),
      City.find(filter)
        .populate('districtId', 'name')
        .populate('stateId', 'name code')
        .sort({ sortOrder: 1, name: 1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
    ]);

    return res.json({
      success: true,
      data: cities,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/locations/villages?subDistrictId=...&search=...&page=1&limit=20
 */
export async function getVillages(req: Request, res: Response, next: NextFunction) {
  try {
    const { subDistrictId, districtId, search, page = '1', limit = '30' } = req.query;

    if (!subDistrictId || !mongoose.isValidObjectId(subDistrictId)) {
      return res.status(400).json({ success: false, message: 'Valid subDistrictId is required to search villages.' });
    }

    // Verify sub-district existence and parent consistency
    if (districtId && mongoose.isValidObjectId(districtId)) {
      const validSub = await SubDistrict.findOne({ _id: subDistrictId, districtId });
      if (!validSub) {
        return res.status(400).json({ success: false, message: 'Sub-district does not belong to the provided district.' });
      }
    }

    const filter: any = { subDistrictId, isActive: true };

    if (search && typeof search === 'string' && search.trim()) {
      filter.name = { $regex: new RegExp(escapeRegex(search.trim()), 'i') };
    }

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 30));
    const skip = (pageNum - 1) * limitNum;

    const [total, villages] = await Promise.all([
      Village.countDocuments(filter),
      Village.find(filter)
        .sort({ name: 1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
    ]);

    return res.json({
      success: true,
      data: villages,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Validates full location hierarchy to prevent invalid combinations
 */
export async function validateLocationHierarchy(data: {
  countryId?: string;
  stateId?: string;
  districtId?: string;
  subDistrictId?: string;
  cityId?: string;
  villageId?: string;
}): Promise<{ isValid: boolean; error?: string; resolved?: any }> {
  try {
    const resolved: any = {};

    if (data.countryId) {
      if (!mongoose.isValidObjectId(data.countryId)) return { isValid: false, error: 'Invalid countryId' };
      const country = await Country.findById(data.countryId);
      if (!country) return { isValid: false, error: 'Country not found' };
      resolved.country = country.name;
    }

    if (data.stateId) {
      if (!mongoose.isValidObjectId(data.stateId)) return { isValid: false, error: 'Invalid stateId' };
      const state = await State.findById(data.stateId);
      if (!state) return { isValid: false, error: 'State not found' };
      if (data.countryId && state.countryId.toString() !== data.countryId) {
        return { isValid: false, error: 'Selected State does not belong to the selected Country.' };
      }
      resolved.state = state.name;
    }

    if (data.districtId) {
      if (!mongoose.isValidObjectId(data.districtId)) return { isValid: false, error: 'Invalid districtId' };
      const district = await District.findById(data.districtId);
      if (!district) return { isValid: false, error: 'District not found' };
      if (data.stateId && district.stateId.toString() !== data.stateId) {
        return { isValid: false, error: 'Selected District does not belong to the selected State.' };
      }
      resolved.district = district.name;
    }

    if (data.subDistrictId) {
      if (!mongoose.isValidObjectId(data.subDistrictId)) return { isValid: false, error: 'Invalid subDistrictId' };
      const subDistrict = await SubDistrict.findById(data.subDistrictId);
      if (!subDistrict) return { isValid: false, error: 'Sub-District not found' };
      if (data.districtId && subDistrict.districtId.toString() !== data.districtId) {
        return { isValid: false, error: 'Selected Sub-District does not belong to the selected District.' };
      }
      resolved.subDistrict = subDistrict.name;
      resolved.subDistrictType = subDistrict.type;
    }

    if (data.cityId) {
      if (!mongoose.isValidObjectId(data.cityId)) return { isValid: false, error: 'Invalid cityId' };
      const city = await City.findById(data.cityId);
      if (!city) return { isValid: false, error: 'City not found' };
      if (data.districtId && city.districtId.toString() !== data.districtId) {
        return { isValid: false, error: 'Selected City does not belong to the selected District.' };
      }
      resolved.city = city.name;
    }

    if (data.villageId) {
      if (!mongoose.isValidObjectId(data.villageId)) return { isValid: false, error: 'Invalid villageId' };
      const village = await Village.findById(data.villageId);
      if (!village) return { isValid: false, error: 'Village not found' };
      if (data.subDistrictId && village.subDistrictId.toString() !== data.subDistrictId) {
        return { isValid: false, error: 'Selected Village does not belong to the selected Sub-District.' };
      }
      resolved.village = village.name;
    }

    return { isValid: true, resolved };
  } catch (err: any) {
    return { isValid: false, error: err.message || 'Hierarchy validation failed' };
  }
}

/**
 * GET /api/locations/search?q=
 * Public Autocomplete search for Country, State, District, Taluka/Tehsil, City, and Village
 */
export async function searchLocationsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { q } = req.query;
    const { searchStructuredLocations } = await import('../services/locationService');
    const results = await searchStructuredLocations(typeof q === 'string' ? q : '');
    return res.json({ success: true, count: results.length, data: results });
  } catch (error) {
    next(error);
  }
}

