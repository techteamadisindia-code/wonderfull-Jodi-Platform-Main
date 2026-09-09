import { Country, State, District, SubDistrict, City, Village } from '../models/Location';
import { Language, Religion, Caste, SubCaste } from '../models/CommunityMaster';
import {
  SEED_COUNTRIES,
  SEED_STATES,
  SEED_DISTRICTS,
  SEED_SUB_DISTRICTS,
  SEED_CITIES,
  SEED_VILLAGES,
  SEED_LANGUAGES,
  SEED_RELIGIONS,
  SEED_CASTES,
} from '../data/masterDataSeed';

export interface ImportReport {
  total: number;
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
}

/**
 * Initializes and seeds master data if collections are empty
 */
export async function seedMasterDataIfEmpty(): Promise<void> {
  try {
    const countryCount = await Country.countDocuments();
    if (countryCount === 0) {
      console.log('Seeding Master Data: Countries...');
      await Country.insertMany(
        SEED_COUNTRIES.map((c) => ({
          name: c.name,
          code: c.code,
          isoCode: c.isoCode,
          phoneCode: c.phoneCode,
          sortOrder: c.sortOrder,
          sourceType: 'GOVERNMENT',
          source: 'ISO-3166 / Census India',
          isActive: true,
        }))
      );
    }

    const india = await Country.findOne({ code: 'IN' });
    if (!india) {
      console.warn('Country India not found for state seeding.');
      return;
    }

    // 2. States / UTs
    const stateCount = await State.countDocuments();
    if (stateCount === 0) {
      console.log('Seeding Master Data: 28 States & 8 UTs...');
      for (const s of SEED_STATES) {
        await State.findOneAndUpdate(
          { countryId: india._id, name: s.name },
          {
            $set: {
              countryId: india._id,
              name: s.name,
              code: s.code,
              type: s.type,
              lgdCode: s.lgdCode,
              censusCode: s.censusCode,
              sortOrder: s.sortOrder,
              sourceType: 'GOVERNMENT',
              source: 'Local Government Directory (LGD)',
              isActive: true,
            },
          },
          { upsert: true, new: true }
        );
      }
    }

    // 3. Districts
    const districtCount = await District.countDocuments();
    if (districtCount === 0) {
      console.log('Seeding Master Data: Districts...');
      const states = await State.find({ countryId: india._id });
      const stateMap = new Map(states.map((s) => [s.code, s._id]));

      for (const d of SEED_DISTRICTS) {
        const stateId = stateMap.get(d.stateCode);
        if (stateId) {
          await District.findOneAndUpdate(
            { stateId, name: d.name },
            {
              $set: {
                stateId,
                countryId: india._id,
                name: d.name,
                code: d.code,
                lgdCode: d.lgdCode,
                headquarters: d.headquarters,
                sourceType: 'GOVERNMENT',
                source: 'Local Government Directory (LGD)',
                isActive: true,
              },
            },
            { upsert: true }
          );
        }
      }
    }

    // 4. Sub-Districts / Talukas
    const subDistrictCount = await SubDistrict.countDocuments();
    if (subDistrictCount === 0) {
      console.log('Seeding Master Data: Sub-Districts / Talukas...');
      const districts = await District.find().populate('stateId');
      for (const sd of SEED_SUB_DISTRICTS) {
        const district = districts.find((d: any) => d.name.toLowerCase().includes(sd.districtName.toLowerCase()));
        if (district) {
          await SubDistrict.findOneAndUpdate(
            { districtId: district._id, name: sd.name },
            {
              $set: {
                districtId: district._id,
                stateId: district.stateId,
                name: sd.name,
                type: sd.type,
                lgdCode: sd.lgdCode,
                sourceType: 'GOVERNMENT',
                source: 'Local Government Directory (LGD)',
                isActive: true,
              },
            },
            { upsert: true }
          );
        }
      }
    }

    // 5. Cities / Towns
    const cityCount = await City.countDocuments();
    if (cityCount === 0) {
      console.log('Seeding Master Data: Cities & Towns...');
      const districts = await District.find().populate('stateId');
      const subDistricts = await SubDistrict.find();

      for (const c of SEED_CITIES) {
        const district = districts.find((d: any) => d.name.toLowerCase().includes(c.districtName.toLowerCase()));
        if (district) {
          let subDistrictId;
          if (c.subDistrictName) {
            const sub = subDistricts.find(
              (s: any) =>
                s.districtId.toString() === district._id.toString() &&
                s.name.toLowerCase().includes(c.subDistrictName!.toLowerCase())
            );
            if (sub) subDistrictId = sub._id;
          }

          await City.findOneAndUpdate(
            { districtId: district._id, name: c.name },
            {
              $set: {
                districtId: district._id,
                stateId: district.stateId,
                subDistrictId,
                name: c.name,
                type: c.type,
                pincode: c.pincode,
                sortOrder: c.sortOrder ?? 999,
                sourceType: 'GOVERNMENT',
                source: 'Local Government Directory (LGD) / ULB Master',
                isActive: true,
              },
            },
            { upsert: true }
          );
        }
      }
    }

    // 6. Sample Villages
    const villageCount = await Village.countDocuments();
    if (villageCount === 0) {
      console.log('Seeding Master Data: Authentic Villages (LGD)...');
      const subDistricts = await SubDistrict.find().populate('districtId stateId');
      for (const v of SEED_VILLAGES) {
        const sub = subDistricts.find(
          (s: any) => s.name.toLowerCase().includes(v.subDistrictName.toLowerCase())
        );
        if (sub) {
          await Village.findOneAndUpdate(
            { subDistrictId: sub._id, name: v.name },
            {
              $set: {
                subDistrictId: sub._id,
                districtId: sub.districtId,
                stateId: sub.stateId,
                name: v.name,
                lgdCode: v.lgdCode,
                pincode: v.pincode,
                sourceType: 'GOVERNMENT',
                source: 'Local Government Directory (LGD)',
                isActive: true,
              },
            },
            { upsert: true }
          );
        }
      }
    }

    // 7. Languages
    const languageCount = await Language.countDocuments();
    if (languageCount === 0) {
      console.log('Seeding Master Data: 22 Eighth Schedule & Regional Languages...');
      await Language.insertMany(
        SEED_LANGUAGES.map((l) => ({
          name: l.name,
          code: l.code,
          nativeNames: l.nativeNames,
          isScheduled: l.isScheduled,
          sortOrder: l.sortOrder,
          sourceType: 'GOVERNMENT',
          source: 'Eighth Schedule to the Constitution of India',
          isActive: true,
        }))
      );
    }

    // 8. Religions
    const religionCount = await Religion.countDocuments();
    if (religionCount === 0) {
      console.log('Seeding Master Data: Religions...');
      await Religion.insertMany(
        SEED_RELIGIONS.map((r) => ({
          name: r.name,
          code: r.code,
          sortOrder: r.sortOrder,
          isActive: true,
        }))
      );
    }

    // 9. Castes & Sub-Castes
    const casteCount = await Caste.countDocuments();
    if (casteCount === 0) {
      console.log('Seeding Master Data: Castes & Sub-Castes (Multi-Religion & Provenance)...');
      const religions = await Religion.find();
      const relMap = new Map(religions.map((r) => [r.name.toLowerCase(), r._id]));

      for (const c of SEED_CASTES) {
        const religionId = relMap.get(c.religionName.toLowerCase());
        if (religionId) {
          const casteDoc = await Caste.findOneAndUpdate(
            { religionId, name: c.name },
            {
              $set: {
                religionId,
                name: c.name,
                category: c.category,
                aliases: c.aliases,
                source: c.source,
                sourceType: c.sourceType,
                sourceReference: c.sourceReference,
                lastVerifiedAt: new Date(),
                version: 1,
                isActive: true,
              },
            },
            { upsert: true, new: true }
          );

          if (casteDoc && c.subCastes.length > 0) {
            for (const scName of c.subCastes) {
              await SubCaste.findOneAndUpdate(
                { casteId: casteDoc._id, name: scName },
                {
                  $set: {
                    casteId: casteDoc._id,
                    name: scName,
                    source: c.source,
                    sourceType: c.sourceType,
                    isActive: true,
                  },
                },
                { upsert: true }
              );
            }
          }
        }
      }
    }

    console.log('Master data verification & seeding completed successfully.');
  } catch (err) {
    console.error('Master data seeding error:', err);
  }
}

/**
 * Bulk Importer for Locations (CSV / JSON)
 */
export async function bulkImportLocations(items: any[]): Promise<ImportReport> {
  const report: ImportReport = { total: items.length, imported: 0, updated: 0, skipped: 0, errors: [] };

  const india = await Country.findOne({ code: 'IN' });
  if (!india) {
    report.errors.push('Base country India not found.');
    return report;
  }

  for (let i = 0; i < items.length; i++) {
    const row = items[i];
    try {
      const stateName = (row.state_name || row.stateName || row.state || '').trim();
      const districtName = (row.district_name || row.districtName || row.district || '').trim();
      const subDistrictName = (row.subdistrict_name || row.subDistrictName || row.taluka || row.tehsil || '').trim();
      const cityName = (row.city_name || row.cityName || row.city || '').trim();
      const villageName = (row.village_name || row.villageName || row.village || '').trim();
      const lgdCode = (row.lgd_code || row.lgdCode || '').toString().trim();
      const pincode = (row.pincode || row.pin_code || '').toString().trim();

      if (!stateName && !districtName && !cityName) {
        report.skipped++;
        continue;
      }

      // 1. Match or Create State
      let state = await State.findOne({
        countryId: india._id,
        name: { $regex: new RegExp(`^${stateName}$`, 'i') },
      });
      if (!state && stateName) {
        state = await State.create({
          countryId: india._id,
          name: stateName,
          code: stateName.substring(0, 2).toUpperCase(),
          type: 'State',
          lgdCode: lgdCode || undefined,
          sourceType: 'GOVERNMENT',
          source: 'Bulk Import',
          isActive: true,
        });
        report.imported++;
      }

      if (!state) {
        report.errors.push(`Row ${i + 1}: State "${stateName}" could not be resolved.`);
        continue;
      }

      // 2. District
      let district;
      if (districtName) {
        district = await District.findOne({
          stateId: state._id,
          name: { $regex: new RegExp(`^${districtName}$`, 'i') },
        });
        if (!district) {
          district = await District.create({
            stateId: state._id,
            countryId: india._id,
            name: districtName,
            lgdCode: lgdCode || undefined,
            sourceType: 'GOVERNMENT',
            source: 'Bulk Import',
            isActive: true,
          });
          report.imported++;
        }
      }

      // 3. SubDistrict / Taluka
      let subDistrict;
      if (district && subDistrictName) {
        subDistrict = await SubDistrict.findOne({
          districtId: district._id,
          name: { $regex: new RegExp(`^${subDistrictName}$`, 'i') },
        });
        if (!subDistrict) {
          subDistrict = await SubDistrict.create({
            districtId: district._id,
            stateId: state._id,
            name: subDistrictName,
            type: 'Taluka',
            lgdCode: lgdCode || undefined,
            sourceType: 'GOVERNMENT',
            source: 'Bulk Import',
            isActive: true,
          });
          report.imported++;
        }
      }

      // 4. City
      if (district && cityName) {
        const existingCity = await City.findOne({
          districtId: district._id,
          name: { $regex: new RegExp(`^${cityName}$`, 'i') },
        });
        if (!existingCity) {
          await City.create({
            districtId: district._id,
            stateId: state._id,
            subDistrictId: subDistrict?._id,
            name: cityName,
            type: 'City',
            pincode: pincode || undefined,
            lgdCode: lgdCode || undefined,
            sourceType: 'GOVERNMENT',
            source: 'Bulk Import',
            isActive: true,
          });
          report.imported++;
        } else {
          report.updated++;
        }
      }

      // 5. Village
      if (subDistrict && district && villageName) {
        const existingVillage = await Village.findOne({
          subDistrictId: subDistrict._id,
          name: { $regex: new RegExp(`^${villageName}$`, 'i') },
        });
        if (!existingVillage) {
          await Village.create({
            subDistrictId: subDistrict._id,
            districtId: district._id,
            stateId: state._id,
            name: villageName,
            lgdCode: lgdCode || undefined,
            pincode: pincode || undefined,
            sourceType: 'GOVERNMENT',
            source: 'Bulk Import',
            isActive: true,
          });
          report.imported++;
        } else {
          report.updated++;
        }
      }
    } catch (rowErr: any) {
      report.errors.push(`Row ${i + 1} Error: ${rowErr.message || String(rowErr)}`);
    }
  }

  return report;
}

/**
 * Bulk Importer for Castes & Sub-Castes
 */
export async function bulkImportCastes(items: any[]): Promise<ImportReport> {
  const report: ImportReport = { total: items.length, imported: 0, updated: 0, skipped: 0, errors: [] };

  const religions = await Religion.find();
  const relMap = new Map(religions.map((r) => [r.name.toLowerCase(), r._id]));

  for (let i = 0; i < items.length; i++) {
    const row = items[i];
    try {
      const religionName = (row.religion || row.religion_name || 'Hindu').trim();
      const casteName = (row.caste || row.caste_name || row.name || '').trim();
      const subCasteName = (row.subcaste || row.sub_caste || row.subCasteName || '').trim();
      const category = (row.category || 'General').trim();
      const source = (row.source || 'Bulk Import').trim();
      const sourceType = (row.source_type || row.sourceType || 'COMMUNITY_MASTER').trim();
      const sourceReference = (row.source_reference || row.sourceReference || '').trim();

      if (!casteName) {
        report.skipped++;
        continue;
      }

      const religionId = relMap.get(religionName.toLowerCase());
      if (!religionId) {
        report.errors.push(`Row ${i + 1}: Religion "${religionName}" not found.`);
        continue;
      }

      let caste = await Caste.findOne({
        religionId,
        name: { $regex: new RegExp(`^${casteName}$`, 'i') },
      });

      if (!caste) {
        caste = await Caste.create({
          religionId,
          name: casteName,
          category: ['General', 'OBC', 'SC', 'ST', 'Other'].includes(category) ? category : 'Not Specified',
          aliases: row.aliases ? (Array.isArray(row.aliases) ? row.aliases : [row.aliases]) : [],
          source,
          sourceType: ['GOVERNMENT', 'LGD', 'DEPARTMENT_OF_SOCIAL_JUSTICE', 'HISTORICAL_REFERENCE', 'COMMUNITY_MASTER'].includes(sourceType)
            ? sourceType
            : 'COMMUNITY_MASTER',
          sourceReference: sourceReference || undefined,
          lastVerifiedAt: new Date(),
          version: 1,
          isActive: true,
        });
        report.imported++;
      } else {
        report.updated++;
      }

      if (caste && subCasteName) {
        const existingSub = await SubCaste.findOne({
          casteId: caste._id,
          name: { $regex: new RegExp(`^${subCasteName}$`, 'i') },
        });
        if (!existingSub) {
          await SubCaste.create({
            casteId: caste._id,
            name: subCasteName,
            source,
            sourceType,
            isActive: true,
          });
          report.imported++;
        }
      }
    } catch (err: any) {
      report.errors.push(`Row ${i + 1} Error: ${err.message || String(err)}`);
    }
  }

  return report;
}
