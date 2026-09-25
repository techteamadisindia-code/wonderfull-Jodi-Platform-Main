import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { Country, State, District, SubDistrict, City, Village } from '../models/Location';
import { Language, Religion, Caste, SubCaste } from '../models/CommunityMaster';
import { LocationImport } from '../models/LocationImport';
import { parseLocationPdf, validatePdfBuffer } from '../services/locationPdfParser';
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

/**
 * POST /api/admin/master-data/upload-pdf
 * Uploads, parses, and stages a Location Directory PDF for admin review
 */
export async function uploadLocationPdf(req: Request, res: Response, next: NextFunction) {
  try {
    const { pdfBase64, filename, mimeType } = req.body;
    const rawData = pdfBase64 || req.body.base64 || req.body.file;

    if (!rawData || typeof rawData !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'No PDF file data provided. Please provide a valid base64 PDF payload.',
      });
    }

    // Strip data URL prefix if present
    let base64Data = rawData;
    const match = rawData.match(/^data:(application\/pdf);base64,(.+)$/i);
    if (match) {
      base64Data = match[2];
    } else if (rawData.includes(';base64,')) {
      base64Data = rawData.split(';base64,')[1];
    }

    const buffer = Buffer.from(base64Data, 'base64');

    // 1. Binary validation
    const validation = validatePdfBuffer(buffer, 15 * 1024 * 1024);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    // 2. Parse PDF via location parser
    const parseResult = await parseLocationPdf(buffer);

    // 3. Create Import Tracking Record
    const importId = `LGD-IMP-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const adminUser = (req as any).user;

    const importRecord = await LocationImport.create({
      importId,
      fileName: filename || 'LGD_Location_Directory.pdf',
      fileSize: buffer.length,
      fileMimeType: 'application/pdf',
      uploadedBy: adminUser?.userId || adminUser?._id,
      adminEmail: adminUser?.email || 'admin@wonderfuljodi.com',
      status: 'PREVIEW_READY',
      source: 'Local Government Directory (LGD) PDF',
      totalExtracted: parseResult.metrics.totalExtracted,
      validRecords: parseResult.metrics.validRecords,
      duplicateRecords: parseResult.metrics.duplicateRecords,
      invalidRecords: parseResult.metrics.invalidRecords,
      missingStateRecords: parseResult.metrics.missingStateRecords,
      missingDistrictRecords: parseResult.metrics.missingDistrictRecords,
      missingCityRecords: parseResult.metrics.missingCityRecords,
      extractedPreview: parseResult.previewRows,
      fullExtractedRecords: parseResult.fullRows,
      importErrors: parseResult.errors,
      startedAt: new Date(),
    });

    return res.status(200).json({
      success: true,
      message: 'PDF parsed successfully. Review extracted records before confirming import.',
      data: {
        importId: importRecord.importId,
        fileName: importRecord.fileName,
        fileSize: importRecord.fileSize,
        status: importRecord.status,
        metrics: parseResult.metrics,
        preview: parseResult.previewRows,
        errors: parseResult.errors,
      },
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to process and extract records from the uploaded PDF.',
    });
  }
}

/**
 * POST /api/admin/master-data/import/confirm
 * Confirms or cancels an active PDF import
 */
export async function confirmLocationImport(req: Request, res: Response, next: NextFunction) {
  try {
    const { importId, action } = req.body;

    if (!importId) {
      return res.status(400).json({ success: false, message: 'importId is required.' });
    }

    const importRecord = await LocationImport.findOne({ importId });
    if (!importRecord) {
      return res.status(404).json({ success: false, message: 'Import session not found.' });
    }

    if (action === 'CANCEL') {
      importRecord.status = 'CANCELLED';
      importRecord.completedAt = new Date();
      await importRecord.save();
      return res.json({
        success: true,
        message: `Import ${importId} has been cancelled.`,
        data: { importId, status: 'CANCELLED' },
      });
    }

    if (importRecord.status === 'IMPORTED') {
      return res.status(400).json({
        success: false,
        message: 'This import batch has already been processed and imported into the database.',
      });
    }

    importRecord.status = 'PROCESSING';
    await importRecord.save();

    // Ensure India country exists
    let india = await Country.findOne({ code: 'IN' });
    if (!india) {
      india = await Country.create({
        name: 'India',
        code: 'IN',
        isoCode: 'IND',
        phoneCode: '+91',
        isActive: true,
        sortOrder: 1,
        sourceType: 'GOVERNMENT',
        source: 'ISO-3166 / Census India',
      });
    }

    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    const records = importRecord.fullExtractedRecords || [];

    // Cache states & districts in memory during import to minimize round-trips
    const stateCache = new Map<string, any>();
    const districtCache = new Map<string, any>();

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      if (row.status === 'INVALID' || !row.state) {
        failedCount++;
        continue;
      }

      try {
        const stateClean = row.state.trim();
        const stateKey = stateClean.toLowerCase();

        // 1. Resolve State
        let state = stateCache.get(stateKey);
        if (!state) {
          state = await State.findOne({
            countryId: india._id,
            name: { $regex: new RegExp(`^${stateClean}$`, 'i') },
          });

          if (!state) {
            state = await State.create({
              countryId: india._id,
              name: stateClean,
              code: row.stateCode || stateClean.substring(0, 2).toUpperCase(),
              type: row.stateType || 'State',
              lgdCode: row.stateLgdCode || row.officialCode,
              isActive: true,
              sourceType: 'GOVERNMENT',
              source: 'LGD Directory PDF Upload',
            });
            insertedCount++;
          } else {
            let updated = false;
            if (row.stateLgdCode && !state.lgdCode) {
              state.lgdCode = row.stateLgdCode;
              updated = true;
            }
            if (updated) {
              await state.save();
              updatedCount++;
            } else if (!row.district && !row.city) {
              skippedCount++;
            }
          }
          stateCache.set(stateKey, state);
        }

        // 2. Resolve District
        if (row.district && state) {
          const districtClean = row.district.trim();
          const distKey = `${String(state._id)}_${districtClean.toLowerCase()}`;
          let district = districtCache.get(distKey);

          if (!district) {
            district = await District.findOne({
              stateId: state._id,
              name: { $regex: new RegExp(`^${districtClean}$`, 'i') },
            });

            if (!district) {
              district = await District.create({
                stateId: state._id,
                countryId: india._id,
                name: districtClean,
                lgdCode: row.districtLgdCode || row.officialCode,
                isActive: true,
                sourceType: 'GOVERNMENT',
                source: 'LGD Directory PDF Upload',
              });
              insertedCount++;
            } else {
              let updated = false;
              if (row.districtLgdCode && !district.lgdCode) {
                district.lgdCode = row.districtLgdCode;
                updated = true;
              }
              if (updated) {
                await district.save();
                updatedCount++;
              } else if (!row.city) {
                skippedCount++;
              }
            }
            districtCache.set(distKey, district);
          }

          // 3. Resolve City
          if (row.city && district && state) {
            const cityClean = row.city.trim();
            const existingCity = await City.findOne({
              districtId: district._id,
              name: { $regex: new RegExp(`^${cityClean}$`, 'i') },
            });

            if (!existingCity) {
              await City.create({
                stateId: state._id,
                districtId: district._id,
                name: cityClean,
                type: (row.cityType as any) || 'City',
                pincode: row.pinCode,
                lgdCode: row.officialCode,
                isActive: true,
                sourceType: 'GOVERNMENT',
                source: 'LGD Directory PDF Upload',
              });
              insertedCount++;
            } else {
              let updated = false;
              if (row.pinCode && !existingCity.pincode) {
                existingCity.pincode = row.pinCode;
                updated = true;
              }
              if (row.officialCode && !existingCity.lgdCode) {
                existingCity.lgdCode = row.officialCode;
                updated = true;
              }
              if (updated) {
                await existingCity.save();
                updatedCount++;
              } else {
                skippedCount++;
              }
            }
          }
        }
      } catch (rowErr: any) {
        failedCount++;
        importRecord.importErrors.push({
          row: i + 1,
          item: row.city || row.district || row.state,
          error: rowErr.message || 'Error inserting row',
        });
      }
    }

    importRecord.status = failedCount > 0 && insertedCount > 0 ? 'PARTIALLY_IMPORTED' : 'IMPORTED';
    importRecord.insertedCount = insertedCount;
    importRecord.updatedCount = updatedCount;
    importRecord.skippedCount = skippedCount;
    importRecord.failedCount = failedCount;
    importRecord.completedAt = new Date();
    await importRecord.save();

    return res.json({
      success: true,
      message: `Import completed: ${insertedCount} inserted, ${updatedCount} updated, ${skippedCount} skipped.`,
      data: {
        importId: importRecord.importId,
        status: importRecord.status,
        total: importRecord.totalExtracted,
        insertedCount,
        updatedCount,
        skippedCount,
        failedCount,
        completedAt: importRecord.completedAt,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/master-data/import-history
 * Retrieves chronological audit history of location data imports
 */
export async function getImportHistory(req: Request, res: Response, next: NextFunction) {
  try {
    const history = await LocationImport.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .select('-fullExtractedRecords')
      .lean();

    const historyWithMetrics = history.map((h: any) => ({
      ...h,
      metrics: {
        totalRecords: h.totalExtracted || 0,
        valid: h.validRecords || 0,
        duplicates: h.duplicateRecords || 0,
        invalid: h.invalidRecords || 0,
        inserted: h.insertedCount || 0,
        updated: h.updatedCount || 0,
        skipped: h.skippedCount || 0,
        failed: h.failedCount || 0,
      },
    }));

    return res.json({
      success: true,
      count: historyWithMetrics.length,
      data: historyWithMetrics,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/master-data/import-history/:id/error-report
 * Generates and downloads a CSV error report for a specific import
 */
export async function downloadImportErrorReport(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const record: any = await LocationImport.findOne({ importId: id }).lean();

    if (!record) {
      return res.status(404).json({ success: false, message: 'Import session not found.' });
    }

    let csvContent = 'Row Number,Item Name,Validation Error\n';
    const errList = record.importErrors || record.errors || [];
    if (errList.length > 0) {
      for (const err of errList) {
        const rowStr = err.row ? `"${err.row}"` : '""';
        const itemStr = `"${(err.item || '').replace(/"/g, '""')}"`;
        const errorStr = `"${(err.error || '').replace(/"/g, '""')}"`;
        csvContent += `${rowStr},${itemStr},${errorStr}\n`;
      }
    } else {
      csvContent += 'N/A,No Errors Recorded,Import completed with zero validation errors.\n';
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="import-errors-${id}.csv"`);
    return res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
}

