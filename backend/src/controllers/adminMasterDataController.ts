import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Country, State, District, SubDistrict, City, Village } from '../models/Location';
import { Language, Religion, Caste, SubCaste } from '../models/CommunityMaster';
import { bulkImportLocations, bulkImportCastes } from '../services/masterDataImporter';
import { escapeRegex } from '../utils/securityUtils';

/**
 * GET /api/admin/master-data/summary
 */
export async function getMasterDataSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const [
      countries,
      states,
      districts,
      subDistricts,
      cities,
      villages,
      languages,
      religions,
      castes,
      subCastes,
    ] = await Promise.all([
      Country.countDocuments(),
      State.countDocuments(),
      District.countDocuments(),
      SubDistrict.countDocuments(),
      City.countDocuments(),
      Village.countDocuments(),
      Language.countDocuments(),
      Religion.countDocuments(),
      Caste.countDocuments(),
      SubCaste.countDocuments(),
    ]);

    return res.json({
      success: true,
      data: {
        countries,
        states,
        districts,
        subDistricts,
        cities,
        villages,
        languages,
        religions,
        castes,
        subCastes,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/master-data/items
 * Generic fetcher for admin management tables
 */
export async function getMasterDataItems(req: Request, res: Response, next: NextFunction) {
  try {
    const { entity, parentId, search, page = '1', limit = '50' } = req.query;

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(String(limit), 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    let model: any;
    let parentField: string = '';
    let populateFields: string = '';

    switch (entity) {
      case 'countries':
        model = Country;
        break;
      case 'states':
        model = State;
        parentField = 'countryId';
        populateFields = 'countryId';
        break;
      case 'districts':
        model = District;
        parentField = 'stateId';
        populateFields = 'stateId';
        break;
      case 'sub-districts':
        model = SubDistrict;
        parentField = 'districtId';
        populateFields = 'districtId stateId';
        break;
      case 'cities':
        model = City;
        parentField = 'districtId';
        populateFields = 'districtId stateId subDistrictId';
        break;
      case 'villages':
        model = Village;
        parentField = 'subDistrictId';
        populateFields = 'subDistrictId districtId';
        break;
      case 'languages':
        model = Language;
        break;
      case 'religions':
        model = Religion;
        break;
      case 'castes':
        model = Caste;
        parentField = 'religionId';
        populateFields = 'religionId';
        break;
      case 'sub-castes':
        model = SubCaste;
        parentField = 'casteId';
        populateFields = 'casteId';
        break;
      default:
        return res.status(400).json({ success: false, message: `Unknown master entity: ${entity}` });
    }

    const filter: any = {};
    if (parentId && parentField && mongoose.isValidObjectId(parentId)) {
      filter[parentField] = parentId;
    }

    if (search && typeof search === 'string' && search.trim()) {
      filter.name = { $regex: new RegExp(escapeRegex(search.trim()), 'i') };
    }

    let query = model.find(filter);
    if (populateFields) {
      query = query.populate(populateFields);
    }

    const [total, items] = await Promise.all([
      model.countDocuments(filter),
      query.sort({ name: 1 }).skip(skip).limit(limitNum).lean(),
    ]);

    return res.json({
      success: true,
      data: items,
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
 * POST /api/admin/master-data/items
 * Create a new master record
 */
export async function createMasterDataItem(req: Request, res: Response, next: NextFunction) {
  try {
    const { entity, data } = req.body;

    let model: any;
    switch (entity) {
      case 'countries': model = Country; break;
      case 'states': model = State; break;
      case 'districts': model = District; break;
      case 'sub-districts': model = SubDistrict; break;
      case 'cities': model = City; break;
      case 'villages': model = Village; break;
      case 'languages': model = Language; break;
      case 'religions': model = Religion; break;
      case 'castes': model = Caste; break;
      case 'sub-castes': model = SubCaste; break;
      default:
        return res.status(400).json({ success: false, message: 'Invalid entity specified' });
    }

    const created = await model.create(data);
    return res.status(201).json({ success: true, data: created });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'A record with this name/code already exists.' });
    }
    next(error);
  }
}

/**
 * PUT /api/admin/master-data/items/:id
 * Update an existing master record
 */
export async function updateMasterDataItem(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { entity, data } = req.body;

    if (!id || !mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid ID' });
    }

    let model: any;
    switch (entity) {
      case 'countries': model = Country; break;
      case 'states': model = State; break;
      case 'districts': model = District; break;
      case 'sub-districts': model = SubDistrict; break;
      case 'cities': model = City; break;
      case 'villages': model = Village; break;
      case 'languages': model = Language; break;
      case 'religions': model = Religion; break;
      case 'castes': model = Caste; break;
      case 'sub-castes': model = SubCaste; break;
      default:
        return res.status(400).json({ success: false, message: 'Invalid entity specified' });
    }

    const updated = await model.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    return res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/admin/master-data/items/:id (Toggles active or removes)
 */
export async function deleteMasterDataItem(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { entity, permanent } = req.query;

    if (!id || !mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid ID' });
    }

    let model: any;
    switch (entity) {
      case 'countries': model = Country; break;
      case 'states': model = State; break;
      case 'districts': model = District; break;
      case 'sub-districts': model = SubDistrict; break;
      case 'cities': model = City; break;
      case 'villages': model = Village; break;
      case 'languages': model = Language; break;
      case 'religions': model = Religion; break;
      case 'castes': model = Caste; break;
      case 'sub-castes': model = SubCaste; break;
      default:
        return res.status(400).json({ success: false, message: 'Invalid entity specified' });
    }

    if (permanent === 'true') {
      await model.findByIdAndDelete(id);
      return res.json({ success: true, message: 'Record deleted permanently' });
    }

    const toggled = await model.findByIdAndUpdate(
      id,
      [{ $set: { isActive: { $not: '$isActive' } } }],
      { new: true }
    );
    return res.json({ success: true, data: toggled, message: 'Status toggled successfully' });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/master-data/import
 * Handles CSV or JSON bulk import for locations or castes
 */
export async function handleBulkImport(req: Request, res: Response, next: NextFunction) {
  try {
    let { type, dataType, records, content, csv } = req.body;
    const importType = type || dataType;

    if (!records && (content || csv)) {
      const rawText: string = content || csv;
      const lines = rawText.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length > 1) {
        const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
        records = lines.slice(1).map((line) => {
          const vals = line.split(',').map((v) => v.trim());
          const obj: any = {};
          headers.forEach((h, idx) => {
            obj[h] = vals[idx] || '';
          });
          return obj;
        });
      }
    }

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success: false, message: 'records must be a non-empty array or valid CSV string.' });
    }

    if (importType === 'locations') {
      const report = await bulkImportLocations(records);
      return res.json({ success: true, report });
    } else if (importType === 'castes') {
      const report = await bulkImportCastes(records);
      return res.json({ success: true, report });
    } else {
      return res.status(400).json({ success: false, message: 'type must be "locations" or "castes".' });
    }
  } catch (error) {
    next(error);
  }
}
