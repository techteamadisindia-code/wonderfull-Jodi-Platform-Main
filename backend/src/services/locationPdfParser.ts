import pdfParse from 'pdf-parse';
import { Country, State, District, SubDistrict, City } from '../models/Location';
import { ILocationExtractedRow, ILocationImportError } from '../models/LocationImport';

export interface LocationPdfParseResult {
  metrics: {
    totalExtracted: number;
    validRecords: number;
    duplicateRecords: number;
    invalidRecords: number;
    missingStateRecords: number;
    missingDistrictRecords: number;
    missingCityRecords: number;
  };
  previewRows: ILocationExtractedRow[];
  fullRows: ILocationExtractedRow[];
  errors: ILocationImportError[];
}

/**
 * 28 States & 8 Union Territories Canonical Reference
 */
export const CANONICAL_STATES: Record<string, { code: string; type: 'State' | 'Union Territory'; lgdCode: string }> = {
  'Andaman and Nicobar Islands': { code: 'AN', type: 'Union Territory', lgdCode: '35' },
  'Andhra Pradesh': { code: 'AP', type: 'State', lgdCode: '28' },
  'Arunachal Pradesh': { code: 'AR', type: 'State', lgdCode: '12' },
  'Assam': { code: 'AS', type: 'State', lgdCode: '18' },
  'Bihar': { code: 'BR', type: 'State', lgdCode: '10' },
  'Chandigarh': { code: 'CH', type: 'Union Territory', lgdCode: '04' },
  'Chhattisgarh': { code: 'CG', type: 'State', lgdCode: '22' },
  'Dadra and Nagar Haveli and Daman and Diu': { code: 'DH', type: 'Union Territory', lgdCode: '38' },
  'Delhi': { code: 'DL', type: 'Union Territory', lgdCode: '07' },
  'Delhi (NCT of Delhi)': { code: 'DL', type: 'Union Territory', lgdCode: '07' },
  'Goa': { code: 'GA', type: 'State', lgdCode: '30' },
  'Gujarat': { code: 'GJ', type: 'State', lgdCode: '24' },
  'Haryana': { code: 'HR', type: 'State', lgdCode: '06' },
  'Himachal Pradesh': { code: 'HP', type: 'State', lgdCode: '02' },
  'Jammu and Kashmir': { code: 'JK', type: 'Union Territory', lgdCode: '01' },
  'Jharkhand': { code: 'JH', type: 'State', lgdCode: '20' },
  'Karnataka': { code: 'KA', type: 'State', lgdCode: '29' },
  'Kerala': { code: 'KL', type: 'State', lgdCode: '32' },
  'Ladakh': { code: 'LA', type: 'Union Territory', lgdCode: '37' },
  'Lakshadweep': { code: 'LD', type: 'Union Territory', lgdCode: '31' },
  'Madhya Pradesh': { code: 'MP', type: 'State', lgdCode: '23' },
  'Maharashtra': { code: 'MH', type: 'State', lgdCode: '27' },
  'Manipur': { code: 'MN', type: 'State', lgdCode: '14' },
  'Meghalaya': { code: 'ML', type: 'State', lgdCode: '17' },
  'Mizoram': { code: 'MZ', type: 'State', lgdCode: '15' },
  'Nagaland': { code: 'NL', type: 'State', lgdCode: '13' },
  'Odisha': { code: 'OD', type: 'State', lgdCode: '21' },
  'Puducherry': { code: 'PY', type: 'Union Territory', lgdCode: '34' },
  'Punjab': { code: 'PB', type: 'State', lgdCode: '03' },
  'Rajasthan': { code: 'RJ', type: 'State', lgdCode: '08' },
  'Sikkim': { code: 'SK', type: 'State', lgdCode: '11' },
  'Tamil Nadu': { code: 'TN', type: 'State', lgdCode: '33' },
  'Telangana': { code: 'TS', type: 'State', lgdCode: '36' },
  'Tripura': { code: 'TR', type: 'State', lgdCode: '16' },
  'Uttar Pradesh': { code: 'UP', type: 'State', lgdCode: '09' },
  'Uttarakhand': { code: 'UK', type: 'State', lgdCode: '05' },
  'West Bengal': { code: 'WB', type: 'State', lgdCode: '19' },
};

/**
 * Validates PDF buffer magic header and size
 */
export function validatePdfBuffer(buffer: Buffer, maxSizeBytes: number = 15 * 1024 * 1024): { valid: boolean; error?: string } {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    return { valid: false, error: 'Invalid file buffer provided.' };
  }
  if (buffer.length < 100) {
    return { valid: false, error: 'File size is too small to be a valid PDF document.' };
  }
  if (buffer.length > maxSizeBytes) {
    return { valid: false, error: `File size (${Math.round(buffer.length / (1024 * 1024))}MB) exceeds maximum allowed limit of ${Math.round(maxSizeBytes / (1024 * 1024))}MB.` };
  }
  // Check PDF Magic Header
  const header = buffer.subarray(0, 5).toString('ascii');
  if (!header.startsWith('%PDF-')) {
    return { valid: false, error: 'Invalid file signature. File is not an authentic PDF document (missing %PDF- header).' };
  }
  return { valid: true };
}

/**
 * Normalizes string whitespace while preserving capitalization and spelling
 */
function clean(str?: string): string {
  if (!str) return '';
  return str.replace(/\s+/g, ' ').trim();
}

/**
 * Finds matching state name from canonical mapping (case-insensitive)
 */
export function matchCanonicalState(name: string): { name: string; code: string; type: 'State' | 'Union Territory'; lgdCode: string } | null {
  const norm = clean(name).toLowerCase();
  for (const [canonicalName, meta] of Object.entries(CANONICAL_STATES)) {
    if (canonicalName.toLowerCase() === norm) {
      return { name: canonicalName, ...meta };
    }
    // Also check without (NCT of Delhi) or without (UT)
    const baseCanonical = canonicalName.toLowerCase().replace(/\s*\([^)]*\)/g, '').trim();
    const baseInput = norm.replace(/\s*\([^)]*\)/g, '').trim();
    if (baseCanonical === baseInput) {
      return { name: canonicalName, ...meta };
    }
  }
  return null;
}

/**
 * Main PDF Location Parser
 */
export async function parseLocationPdf(buffer: Buffer): Promise<LocationPdfParseResult> {
  // 1. Validate PDF binary
  const val = validatePdfBuffer(buffer);
  if (!val.valid) {
    throw new Error(val.error);
  }

  // 2. Extract selectable text via pdf-parse
  let parsedPdf: { text: string; numpages: number; info?: any };
  try {
    parsedPdf = await pdfParse(buffer);
  } catch (err: any) {
    throw new Error(`Failed to extract text from PDF document: ${err.message || 'Corrupt or unreadable PDF structure.'}`);
  }

  const rawText = parsedPdf.text || '';
  if (rawText.trim().length < 50) {
    throw new Error(
      'Scanned image PDF detected. This document does not contain selectable digital text. Text extraction is not possible without an external OCR service. Please upload a PDF containing selectable text or digital tabular records.'
    );
  }

  const extractedRows: ILocationExtractedRow[] = [];
  const errors: ILocationImportError[] = [];

  // 3. Attempt parsing via LGD Master Registry structure
  const lines = rawText.split(/\r?\n/).map((l) => clean(l)).filter((l) => l.length > 0);

  // Parse State / UT Table (Pages 1 & 2)
  parseStateUtTable(lines, extractedRows);

  // Parse District Inventories (Pages 3, 4, 5, 6)
  parseDistrictInventories(rawText, extractedRows);

  // Parse Tabular / Line-by-Line Rows (State | District | Taluka | City | PIN | LGD)
  parseTabularRows(lines, extractedRows);

  // If no structured records found, attempt general row regex
  if (extractedRows.length === 0) {
    throw new Error(
      'No geographical records could be identified. The PDF structure does not match the Local Government Directory (LGD) or standard tabular location format.'
    );
  }

  // 4. Duplicate and Cross-Database Validation
  // Load existing states, districts, and cities from database for duplicate identification
  const [existingStates, existingDistricts, existingCities] = await Promise.all([
    State.find().lean(),
    District.find().lean(),
    City.find().lean(),
  ]);

  const stateMap = new Map<string, any>();
  existingStates.forEach((s) => stateMap.set(s.name.toLowerCase(), s));

  const districtMap = new Map<string, any>();
  existingDistricts.forEach((d) => districtMap.set(`${String(d.stateId)}_${d.name.toLowerCase()}`, d));

  const cityMap = new Map<string, any>();
  existingCities.forEach((c) => cityMap.set(`${String(c.districtId)}_${c.name.toLowerCase()}`, c));

  // In-batch deduplication tracking
  const seenBatchKeys = new Set<string>();

  const metrics = {
    totalExtracted: extractedRows.length,
    validRecords: 0,
    duplicateRecords: 0,
    invalidRecords: 0,
    missingStateRecords: 0,
    missingDistrictRecords: 0,
    missingCityRecords: 0,
  };

  const finalRows: ILocationExtractedRow[] = [];

  for (let i = 0; i < extractedRows.length; i++) {
    const row = extractedRows[i];
    const rowNum = i + 1;

    // Check mandatory state
    if (!row.state) {
      row.status = 'INVALID';
      row.reason = 'Missing State / Union Territory';
      metrics.invalidRecords++;
      metrics.missingStateRecords++;
      errors.push({ row: rowNum, item: row.city || row.district || 'Row', error: 'Missing State name' });
      finalRows.push(row);
      continue;
    }

    const stateLower = row.state.toLowerCase();
    const dbState = stateMap.get(stateLower);

    // If row represents a State/UT only
    if (!row.district && !row.city && !row.village) {
      const batchKey = `state_${stateLower}`;
      if (seenBatchKeys.has(batchKey)) {
        row.status = 'DUPLICATE';
        row.reason = 'Duplicate state in upload batch';
        metrics.duplicateRecords++;
      } else if (dbState) {
        row.status = 'DUPLICATE';
        row.reason = `State "${row.state}" already exists in database (LGD: ${dbState.lgdCode || 'N/A'})`;
        metrics.duplicateRecords++;
        seenBatchKeys.add(batchKey);
      } else {
        row.status = 'VALID';
        metrics.validRecords++;
        seenBatchKeys.add(batchKey);
      }
      finalRows.push(row);
      continue;
    }

    // If row has a District
    if (row.district && !row.city && !row.village) {
      const districtLower = row.district.toLowerCase();
      const batchKey = `dist_${stateLower}_${districtLower}`;

      if (seenBatchKeys.has(batchKey)) {
        row.status = 'DUPLICATE';
        row.reason = 'Duplicate district in upload batch';
        metrics.duplicateRecords++;
      } else if (dbState && districtMap.has(`${String(dbState._id)}_${districtLower}`)) {
        row.status = 'DUPLICATE';
        row.reason = `District "${row.district}" already exists under ${row.state}`;
        metrics.duplicateRecords++;
        seenBatchKeys.add(batchKey);
      } else {
        row.status = 'VALID';
        metrics.validRecords++;
        seenBatchKeys.add(batchKey);
      }
      finalRows.push(row);
      continue;
    }

    // If row has a City / Town / Village
    const placeName = row.city || row.village;
    if (placeName) {
      const placeLower = placeName.toLowerCase();
      const distKey = row.district ? row.district.toLowerCase() : 'any';
      const batchKey = `city_${stateLower}_${distKey}_${placeLower}`;

      if (seenBatchKeys.has(batchKey)) {
        row.status = 'DUPLICATE';
        row.reason = 'Duplicate city/village in upload batch';
        metrics.duplicateRecords++;
      } else {
        row.status = 'VALID';
        metrics.validRecords++;
        seenBatchKeys.add(batchKey);
      }
      finalRows.push(row);
      continue;
    }

    // Fallback valid
    row.status = 'VALID';
    metrics.validRecords++;
    finalRows.push(row);
  }

  // Preview up to 500 rows
  const previewRows = finalRows.slice(0, 500);

  return {
    metrics,
    previewRows,
    fullRows: finalRows,
    errors,
  };
}

/**
 * 1. Parses State / UT Master Registry table from lines
 */
function parseStateUtTable(lines: string[], results: ILocationExtractedRow[]) {
  // Regex matches S.N., LGD CODE (2 digits), STATE / UT NAME, ENTITY TYPE (State or Union Territory), Administrative Capital, District count
  // Example: "1 35 Andaman and Nicobar Islands Union Territory Port Blair 3"
  // Example: "21 27 Maharashtra State Mumbai 36"
  const tableRowRegex = /^(\d{1,2})\s+(\d{2})\s+([A-Za-z\s()–-]+?)\s+(State|Union\s+Territory)\s+([A-Za-z\s/–-]+?)\s+(\d{1,3})$/i;

  for (const line of lines) {
    const match = line.match(tableRowRegex);
    if (match) {
      const lgdCode = match[2]; // e.g. "27" or "09"
      const rawName = match[3];
      const entityType = match[4].toLowerCase().includes('union') ? 'Union Territory' : 'State';
      const capital = match[5];

      const canonical = matchCanonicalState(rawName) || {
        name: clean(rawName),
        code: clean(rawName).substring(0, 2).toUpperCase(),
        type: entityType,
        lgdCode,
      };

      results.push({
        state: canonical.name,
        stateCode: canonical.code,
        stateType: canonical.type,
        stateLgdCode: lgdCode,
        officialCode: lgdCode,
        status: 'VALID',
        reason: `Administrative Capital: ${capital}`,
      });
    }
  }
}

/**
 * 2. Parses District Inventories (groupings by state and district lists)
 */
function parseDistrictInventories(rawText: string, results: ILocationExtractedRow[]) {
  // Look for sections like:
  // "Jammu and Kashmir (UT) 01 20 Districts" followed by district tokens
  // "Himachal Pradesh 02 12 Districts"
  // "Maharashtra 27 36 Administrative Districts"
  // "Goa (LGD 30):"
  // "Kerala (LGD 32 - 14 Districts):"

  const stateHeaders = [
    { regex: /Jammu and Kashmir(?:\s*\(UT\))?\s*01\s*(\d+)?\s*Districts?/i, state: 'Jammu and Kashmir', lgd: '01' },
    { regex: /Ladakh\s*\(LGD\s*37\):?/i, state: 'Ladakh', lgd: '37' },
    { regex: /Chandigarh\s*\(LGD\s*04\):?/i, state: 'Chandigarh', lgd: '04' },
    { regex: /Himachal Pradesh\s*02\s*(\d+)?\s*Districts?/i, state: 'Himachal Pradesh', lgd: '02' },
    { regex: /Delhi\s*\(NCT\)\s*07\s*(\d+)?\s*(?:Revenue\s*)?Districts?/i, state: 'Delhi (NCT of Delhi)', lgd: '07' },
    { regex: /Punjab\s*03\s*(\d+)?\s*Districts?/i, state: 'Punjab', lgd: '03' },
    { regex: /Haryana\s*06\s*(\d+)?\s*Districts?/i, state: 'Haryana', lgd: '06' },
    { regex: /Rajasthan\s*08\s*(\d+)?\s*(?:Administrative\s*)?Districts?/i, state: 'Rajasthan', lgd: '08' },
    { regex: /Uttar Pradesh\s*09\s*(\d+)?\s*(?:Administrative\s*)?Districts?/i, state: 'Uttar Pradesh', lgd: '09' },
    { regex: /Uttarakhand\s*05\s*(\d+)?\s*Districts?/i, state: 'Uttarakhand', lgd: '05' },
    { regex: /Chhattisgarh\s*22\s*(\d+)?\s*Districts?/i, state: 'Chhattisgarh', lgd: '22' },
    { regex: /Madhya Pradesh\s*23\s*(\d+)?\s*(?:Administrative\s*)?Districts?/i, state: 'Madhya Pradesh', lgd: '23' },
    { regex: /Bihar\s*10\s*(\d+)?\s*Districts?/i, state: 'Bihar', lgd: '10' },
    { regex: /Jharkhand\s*20\s*(\d+)?\s*Districts?/i, state: 'Jharkhand', lgd: '20' },
    { regex: /Gujarat\s*24\s*(\d+)?\s*Districts?/i, state: 'Gujarat', lgd: '24' },
    { regex: /Goa\s*\(LGD\s*30\):?/i, state: 'Goa', lgd: '30' },
    { regex: /Dadra.*?Daman.*?\(LGD\s*38\):?/i, state: 'Dadra and Nagar Haveli and Daman and Diu', lgd: '38' },
    { regex: /Lakshadweep\s*\(LGD\s*31\):?/i, state: 'Lakshadweep', lgd: '31' },
    { regex: /Maharashtra\s*27\s*(\d+)?\s*(?:Administrative\s*)?Districts?/i, state: 'Maharashtra', lgd: '27' },
    { regex: /Karnataka\s*29\s*(\d+)?\s*Districts?/i, state: 'Karnataka', lgd: '29' },
    { regex: /Kerala\s*\(LGD\s*32[^\)]*\):?/i, state: 'Kerala', lgd: '32' },
    { regex: /Puducherry\s*\(LGD\s*34[^\)]*\):?/i, state: 'Puducherry', lgd: '34' },
    { regex: /Tamil Nadu\s*33\s*(\d+)?\s*Districts?/i, state: 'Tamil Nadu', lgd: '33' },
    { regex: /Andhra Pradesh\s*\(LGD\s*28[^\)]*\):?/i, state: 'Andhra Pradesh', lgd: '28' },
    { regex: /Telangana\s*\(LGD\s*36[^\)]*\):?/i, state: 'Telangana', lgd: '36' },
    { regex: /Odisha\s*21\s*(\d+)?\s*Districts?/i, state: 'Odisha', lgd: '21' },
    { regex: /West Bengal\s*19\s*(\d+)?\s*Districts?/i, state: 'West Bengal', lgd: '19' },
    { regex: /Assam\s*18\s*(\d+)?\s*(?:Administrative\s*)?Districts?/i, state: 'Assam', lgd: '18' },
    { regex: /Arunachal Pradesh\s*\(LGD\s*12[^\)]*\):?/i, state: 'Arunachal Pradesh', lgd: '12' },
    { regex: /Sikkim\s*\(LGD\s*11[^\)]*\):?/i, state: 'Sikkim', lgd: '11' },
    { regex: /Manipur\s*\(LGD\s*14[^\)]*\):?/i, state: 'Manipur', lgd: '14' },
    { regex: /Meghalaya\s*\(LGD\s*17[^\)]*\):?/i, state: 'Meghalaya', lgd: '17' },
    { regex: /Mizoram\s*\(LGD\s*15[^\)]*\):?/i, state: 'Mizoram', lgd: '15' },
    { regex: /Nagaland\s*\(LGD\s*13[^\)]*\):?/i, state: 'Nagaland', lgd: '13' },
    { regex: /Tripura\s*\(LGD\s*16[^\)]*\):?/i, state: 'Tripura', lgd: '16' },
  ];

  // Find occurrences of state headers in the text and extract the text block up to the next header
  const headerMatches: Array<{ index: number; state: string; lgd: string; matchLen: number }> = [];

  for (const sh of stateHeaders) {
    const match = rawText.match(sh.regex);
    if (match && typeof match.index === 'number') {
      headerMatches.push({
        index: match.index,
        state: sh.state,
        lgd: sh.lgd,
        matchLen: match[0].length,
      });
    }
  }

  // Sort by appearance in document
  headerMatches.sort((a, b) => a.index - b.index);

  for (let i = 0; i < headerMatches.length; i++) {
    const current = headerMatches[i];
    const startIndex = current.index + current.matchLen;
    const endIndex = i + 1 < headerMatches.length ? headerMatches[i + 1].index : rawText.length;

    const block = rawText.slice(startIndex, endIndex);

    // Stop at zone headers or page footers
    const cleanBlock = block
      .replace(/Local Government Directory[^\n]*/gi, '')
      .replace(/Page\s+\d+\s+of\s+\d+/gi, '')
      .replace(/ADMINISTRATIVE ZONES:[^\n]*/gi, '')
      .replace(/DISTRICT INVENTORIES[^\n]*/gi, '')
      .replace(/Directory Validation Note:[^\n]*/gi, '');

    // Extract district names
    // District names are capitalized tokens or multi-word capitalized names like "Chhatrapati Sambhajinagar" or "Mumbai City"
    const districtTokens = extractDistrictNamesFromBlock(cleanBlock);

    for (const distName of districtTokens) {
      if (!distName || distName.length < 2) continue;
      results.push({
        state: current.state,
        stateLgdCode: current.lgd,
        district: distName,
        status: 'VALID',
      });
    }
  }
}

/**
 * Helper to parse multi-word and single-word district tokens from text blocks
 */
function extractDistrictNamesFromBlock(block: string): string[] {
  // Known compound multi-word district names in India to preserve correctly
  const knownCompounds = [
    'Ahmednagar (Ahilyanagar)',
    'Chhatrapati Sambhajinagar',
    'Mumbai Suburban',
    'Mumbai City',
    'Lahaul and Spiti',
    'Shahdara',
    'New Delhi',
    'North East',
    'North West',
    'South East',
    'South West',
    'Fatehgarh Sahib',
    'SAS Nagar',
    'SBS Nagar',
    'Tarn Taran',
    'Charkhi Dadri',
    'Sri Ganganagar',
    'Sawai Madhopur',
    'Gangapur City',
    'Didwana-Kuchaman',
    'Kotputli-Behror',
    'Neem Ka Thana',
    'Ambedkar Nagar',
    'Gautam Buddha Nagar',
    'Kanpur Dehat',
    'Kanpur Nagar',
    'Sant Kabir Nagar',
    'Udham Singh Nagar',
    'Pauri Garhwal',
    'Tehri Garhwal',
    'Baloda Bazar',
    'Gaurela-Pendra-Marwahi',
    'Janjgir-Champa',
    'Mohla-Manpur',
    'Sarangarh-Bilaigarh',
    'Agar Malwa',
    'Hoshangabad (Narmadapuram)',
    'East Champaran',
    'West Champaran',
    'East Singhbhum',
    'West Singhbhum',
    'Seraikela Kharsawan',
    'Chhota Udaipur',
    'Devbhumi Dwarka',
    'Gir Somnath',
    'Dadra and Nagar Haveli',
    'North Goa',
    'South Goa',
    'Bengaluru Rural',
    'Bengaluru Urban',
    'Dakshina Kannada',
    'Uttara Kannada',
    'Dr. B.R. Ambedkar Konaseema',
    'East Godavari',
    'West Godavari',
    'SPSR Nellore',
    'Sri Sathya Sai',
    'YSR Kadapa',
    'Bhadradri Kothagudem',
    'Jayashankar Bhupalpally',
    'Jogulamba Gadwal',
    'Komaram Bheem',
    'Medchal-Malkajgiri',
    'Rajanna Sircilla',
    'Ranga Reddy',
    'Yadadri Bhuvanagiri',
    'Cooch Behar',
    'Dakshin Dinajpur',
    'Uttar Dinajpur',
    'North 24 Parganas',
    'South 24 Parganas',
    'Paschim Bardhaman',
    'Paschim Medinipur',
    'Purba Bardhaman',
    'Purba Medinipur',
    'Dima Hasao',
    'Kamrup Metropolitan',
    'Karbi Anglong',
    'South Salmara-Mankachar',
    'West Karbi Anglong',
    'Dibang Valley',
    'East Kameng',
    'West Kameng',
    'East Siang',
    'West Siang',
    'Keyi Panyor',
    'Kra Daadi',
    'Kurung Kumey',
    'Lower Dibang Valley',
    'Lower Siang',
    'Lower Subansiri',
    'Upper Siang',
    'Upper Subansiri',
    'Pakke Kessang',
    'Papum Pare',
    'Shi Yomi',
    'Imphal East',
    'Imphal West',
    'East Garo Hills',
    'North Garo Hills',
    'South Garo Hills',
    'South West Garo Hills',
    'West Garo Hills',
    'East Jaintia Hills',
    'West Jaintia Hills',
    'East Khasi Hills',
    'Eastern West Khasi Hills',
    'South West Khasi Hills',
    'West Khasi Hills',
    'Ri Bhoi',
    'North Tripura',
    'South Tripura',
  ];

  let text = block
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([)\]])([A-Z])/g, '$1 $2')
    .replace(/([A-Za-z])(\d)/g, '$1 $2')
    .replace(/(\d)([A-Za-z])/g, '$1 $2');
  const extracted: string[] = [];

  // Match known compounds first
  for (const compound of knownCompounds) {
    const escaped = compound.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const compRegex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (compRegex.test(text)) {
      extracted.push(compound);
      text = text.replace(compRegex, ' ');
    }
  }

  // Tokenize remaining words: sequences of capitalized alphanumeric words
  // E.g. "Pune", "Nashik", "Satara", "Solapur"
  const tokens = text.match(/[A-Z][a-zA-Z\-'()]{2,}/g) || [];
  for (const token of tokens) {
    const cleanToken = clean(token);
    // Exclude administrative keywords
    if (
      /^(District|Districts|State|Union|Territory|LGD|Revenue|Total|Standard|National|Government|Zone|Western|Northern|Southern|Eastern|Administrative)$/i.test(
        cleanToken
      )
    ) {
      continue;
    }
    if (!extracted.includes(cleanToken)) {
      extracted.push(cleanToken);
    }
  }

  return extracted;
}

/**
 * 3. Parses Tabular / Line-by-Line Formats
 * (e.g., CSV-like or Pipe-separated or column-spaced tables: State, District, Taluka, City, PIN, LGD)
 */
function parseTabularRows(lines: string[], results: ILocationExtractedRow[]) {
  // Regex pattern for pipe or tab or comma separated table rows
  // Example: "Maharashtra | Pune | Haveli | Pune | 411001 | 275001"
  for (const line of lines) {
    if (line.includes('|') || line.includes('\t') || (line.includes(',') && line.split(',').length >= 3)) {
      const parts = line.split(/[|\t,]/).map((p) => clean(p)).filter(Boolean);
      if (parts.length >= 2) {
        const [p1, p2, p3, p4, p5, p6] = parts;
        // Check if p1 or p2 matches a state
        const matchedState = matchCanonicalState(p1) || matchCanonicalState(p2);
        if (matchedState) {
          const isP1State = matchCanonicalState(p1) !== null;
          const state = matchedState.name;
          const district = isP1State ? p2 : p1;
          const taluka = parts[2] !== district ? parts[2] : undefined;
          const cityOrVillage = parts[3];
          const pinCode = parts.find((p) => /^\d{6}$/.test(p));
          const lgdCode = parts.find((p) => /^\d{2,6}$/.test(p) && p !== pinCode);

          results.push({
            state,
            stateCode: matchedState.code,
            stateType: matchedState.type,
            stateLgdCode: matchedState.lgdCode,
            district,
            subDistrict: taluka,
            city: cityOrVillage,
            pinCode,
            officialCode: lgdCode,
            status: 'VALID',
          });
        }
      }
    }
  }
}
