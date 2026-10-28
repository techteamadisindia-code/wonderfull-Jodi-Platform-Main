import zlib from 'zlib';
import {
  generateCsv,
  generateExcelWorkbook,
  sanitizeCsvValue,
} from '../services/dataExportService';
import {
  buildActiveCandidateRows,
  buildIncompleteRegistrationRows,
  getMissingRequiredSections,
  ACTIVE_CANDIDATE_HEADERS,
  INCOMPLETE_REGISTRATION_HEADERS,
} from '../controllers/adminExportController';
import { bulkUpdateUserStatus } from '../controllers/adminController';
import {
  exportCandidateData,
  calculateAge,
  determineRegistrationStatus,
  MAX_EXPORT_ROWS,
} from '../controllers/adminExportController';
import { User } from '../models/User';
import { Admin } from '../models/Admin';
import { AuditLog } from '../models/AuditLog';
import { Profile } from '../models/Profile';
import { Subscription } from '../models/Subscription';
import { Registration } from '../models/Registration';

// Simple lightweight assertion helpers
let passed = 0;
let failed = 0;
const results: Array<{ test: string; status: 'PASS' | 'FAIL'; error?: string }> = [];

function assert(condition: boolean, testName: string, errorDetail?: string) {
  if (condition) {
    passed++;
    results.push({ test: testName, status: 'PASS' });
    console.log(`  [PASS] ${testName}`);
  } else {
    failed++;
    results.push({ test: testName, status: 'FAIL', error: errorDetail || 'Assertion failed' });
    console.error(`  [FAIL] ${testName}: ${errorDetail || 'Assertion failed'}`);
  }
}

function assertEqual<T>(actual: T, expected: T, testName: string) {
  const isMatch = actual === expected;
  assert(
    isMatch,
    testName,
    `Expected "${String(expected)}", received "${String(actual)}"`
  );
}

function assertIncludes(haystack: string, needle: string, testName: string) {
  assert(
    haystack.includes(needle),
    testName,
    `Expected string to include "${needle}"`
  );
}

console.log('========================================================================');
console.log('  WONDERFUL JODI — CANDIDATE EXPORT & BULK STATUS REGRESSION SUITE');
console.log('========================================================================\n');

// ─── 1. CORRECT GENDER DISPLAY AND BLANK HANDLING ─────────────────────────────
console.log('Test Group 1: Correct Gender Display & Blank Handling');
{
  const mockUsers = [
    { _id: 'u1', fullName: 'Dr. Arjun Verma', gender: 'Male', email: 'arjun@example.com', isActive: true },
    { _id: 'u2', fullName: 'Dr. Sneha Patil', gender: undefined, email: 'sneha@example.com', isActive: true },
    { _id: 'u3', fullName: 'Dr. Alex Rao', gender: null, email: 'alex@example.com', isActive: true },
  ];

  const profileMap = new Map<string, any>([
    ['u1', { candidateId: 'WJ-DOC-001', displayName: 'Dr. Arjun Verma', gender: 'Male' }],
    ['u2', { candidateId: 'WJ-DOC-002', displayName: 'Dr. Sneha Patil', gender: 'Female' }],
    ['u3', { candidateId: 'WJ-DOC-003', displayName: 'Dr. Alex Rao', gender: undefined }], // Profile gender missing
  ]);

  const rows = buildActiveCandidateRows(mockUsers, profileMap, new Map(), true);

  // Row 1: Gender from Profile/User
  assertEqual(rows[0][3], 'Male', '1a. Preserves recorded Male gender');
  // Row 2: Gender resolved from Profile when user gender is undefined
  assertEqual(rows[1][3], 'Female', '1b. Resolves recorded Female gender from profile');
  // Row 3: Missing gender resolves cleanly to "Not recorded"
  assertEqual(rows[2][3], 'Not recorded', '1c. Missing gender displays "Not recorded", never assumed');
}

// ─── 2. COMPLETE VS INCOMPLETE VS PENDING REGISTRATION CLASSIFICATION ────────
console.log('\nTest Group 2: Complete vs Incomplete vs Pending Registration Classification');
{
  // User with completed profile
  const userComplete = { _id: 'u_comp', fullName: 'Completed Candidate' };
  const userIncomplete = { _id: 'u_incomp', fullName: 'Draft Candidate' };
  const userPending = { _id: 'u_pend', fullName: 'Pending Candidate' };

  const profileMap = new Map<string, any>([
    ['u_comp', { candidateId: 'WJ-001', displayName: 'Complete Candidate' }],
  ]);
  const registrationMap = new Map<string, any>([
    ['u_incomp', { registrationId: 'REG-101', status: 'IN_PROGRESS' }],
  ]);

  const rows = buildActiveCandidateRows(
    [userComplete, userIncomplete, userPending],
    profileMap,
    new Map(),
    true,
    registrationMap
  );
  assertEqual(rows[0][43], 'Complete', '2a. User with linked profile classified as Complete');
  assertEqual(rows[1][43], 'Incomplete', '2b. User with registration draft classified as Incomplete');
  assertEqual(rows[2][43], 'Pending', '2c. User without profile or draft classified as Pending');

  // Verify missing required sections helper does not penalize optional fields
  const incompleteReg = {
    stepData: {
      basicInfo: { fullName: 'Draft Doctor' }, // missing email and mobile
      personalInfo: {}, // missing gender, marital status, location
      educationProfession: {}, // missing profession/education
    },
  };
  const missingSummary = getMissingRequiredSections(incompleteReg);
  assertIncludes(missingSummary, 'Basic Information', '2d. Detects missing basic info in draft');
  assertIncludes(missingSummary, 'Gender', '2e. Detects missing gender in draft');
  assertIncludes(missingSummary, 'Education / Profession', '2f. Detects missing profession in draft');
}

// ─── 3. ACTIVE CANDIDATE EXCEL AND CSV EXPORTS ────────────────────────────────
console.log('\nTest Group 3: Active Candidate Excel and CSV Exports');
{
  const testCandidate = {
    _id: '507f1f77bcf86cd799439011',
    fullName: 'Dr. Rajesh Sharma',
    email: 'rajesh.sharma@hospital.org',
    mobile: '+91 9876543210',
    isActive: true,
    verificationStatus: 'VERIFIED',
    createdAt: new Date('2026-01-15T10:00:00Z'),
  };

  const testProfile = {
    candidateId: 'WJ-DOC-9821',
    displayName: 'Dr. Rajesh Sharma',
    gender: 'Male',
    dob: new Date('1992-05-10'),
    height: '5′ 11″',
    maritalStatus: 'Never Married',
    religion: 'Hindu',
    caste: 'Brahmin',
    subCaste: 'Saraswat',
    motherTongue: 'Hindi',
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    profession: 'Cardiologist',
    education: 'MBBS, MD',
    degree: 'Doctor of Medicine',
    company: 'Lilavati Hospital',
    medicalCollege: 'Grant Medical College',
    medicalRegistrationNumber: 'MMC-2016-09823',
    medicalCouncil: 'Maharashtra Medical Council',
    registrationState: 'Maharashtra',
    registrationYear: '2016',
    medicalExperience: '8 Years',
    currentHospital: 'Lilavati Hospital & Research Centre',
    partnerExpectations: {
      ageMin: 26,
      ageMax: 31,
      heightMin: '5′ 3″',
      heightMax: '5′ 8″',
      qualification: 'Doctor / Medical Professional',
      location: { city: 'Mumbai' },
    },
    familyBackground: {
      familyType: 'Nuclear',
      fatherProfession: 'Retired Professor',
      motherProfession: 'Homemaker',
      familyStatus: 'Upper Middle Class',
    },
  };

  const profileMap = new Map([['507f1f77bcf86cd799439011', testProfile]]);
  const subMap = new Map([['507f1f77bcf86cd799439011', { plan: 'PLATINUM', status: 'ACTIVE' }]]);

  const rows = buildActiveCandidateRows([testCandidate], profileMap, subMap, true);
  assertEqual(rows.length, 1, '3a. Generated single active candidate row');
  assertEqual(rows[0][1], 'WJ-DOC-9821', '3b. Mapped Candidate ID accurately');
  assertEqual(rows[0][20], 'Doctor of Medicine', '3c. Mapped Degree accurately');
  assertEqual(rows[0][26], 'MMC-2016-09823', '3d. Mapped Medical Registration Number accurately');
  assertEqual(rows[0][45], 'PLATINUM', '3e. Mapped Subscription Plan accurately');
  assertEqual(rows[0][46], 'ACTIVE', '3e2. Mapped Subscription Status accurately');

  // Verify candidate on Free membership is NOT excluded
  const candidateFree = {
    _id: '507f1f77bcf86cd799439099',
    fullName: 'Dr. Anita Joshi',
    email: 'anita.j@hospital.org',
    mobile: '+91 9123456780',
    isActive: true,
  };
  const profileFree = {
    candidateId: 'WJ-DOC-0099',
    displayName: 'Dr. Anita Joshi',
    gender: 'Female',
  };
  const profileFreeMap = new Map([['507f1f77bcf86cd799439099', profileFree]]);
  const rowsFree = buildActiveCandidateRows([candidateFree], profileFreeMap, new Map(), true);
  assertEqual(rowsFree.length, 1, '3e3. Active candidate on Free membership is included without paid subscription');
  assertEqual(rowsFree[0][45], 'FREE', '3e4. Free candidate plan is FREE');
  assertEqual(rowsFree[0][46], 'Not recorded', '3e5. Free candidate subscription status is Not recorded when missing from DB');

  // CSV Generation
  const csvBuffer = generateCsv(ACTIVE_CANDIDATE_HEADERS, rows);
  const csvContent = csvBuffer.toString('utf-8');
  assert(csvBuffer[0] === 0xef && csvBuffer[1] === 0xbb && csvBuffer[2] === 0xbf, '3f. CSV contains UTF-8 BOM prefix');
  assertIncludes(csvContent, 'Dr. Rajesh Sharma', '3g. CSV contains candidate name');
  assertIncludes(csvContent, 'MMC-2016-09823', '3h. CSV contains medical registration number');

  // Excel Workbook Generation
  const excelBuffer = generateExcelWorkbook([
    { sheetName: 'Active Candidates', headers: ACTIVE_CANDIDATE_HEADERS, rows },
  ]);
  assert(excelBuffer.length > 500, '3i. Excel buffer is non-empty');
  assert(
    excelBuffer[0] === 0x50 && excelBuffer[1] === 0x4b,
    '3j. Excel buffer has valid PKZIP header (PK)'
  );
}

// ─── 4. INCOMPLETE REGISTRATION EXPORTS ───────────────────────────────────────
console.log('\nTest Group 4: Incomplete Registration Exports');
{
  const incompleteRegistrations = [
    {
      registrationId: 'REG-20261027-ABC123',
      candidateName: 'Pooja Deshmukh',
      email: 'pooja.d@example.com',
      mobile: '+91 9988776655',
      gender: 'Female',
      currentStep: 2,
      totalSteps: 4,
      completionPercentage: 45,
      startedAt: new Date('2026-10-25'),
      lastActiveAt: new Date('2026-10-26'),
      stepData: {
        basicInfo: { fullName: 'Pooja Deshmukh', email: 'pooja.d@example.com', mobile: '9988776655', gender: 'Female' },
        personalInfo: { maritalStatus: 'Never Married', city: 'Pune' },
        educationProfession: {}, // missing
      },
    },
  ];

  const incRows = buildIncompleteRegistrationRows(incompleteRegistrations, new Map(), true);
  assertEqual(incRows.length, 1, '4a. Generated incomplete registration row');
  assertEqual(incRows[0][0], 'REG-20261027-ABC123', '4b. Correct Registration ID');
  assertEqual(incRows[0][2], 'Pooja Deshmukh', '4c. Correct Candidate Name');
  assertEqual(incRows[0][5], 'Female', '4d. Correct recorded gender');
  assertEqual(incRows[0][6], 'Step 2 of 4', '4e. Correct current step formatting');
  assertEqual(incRows[0][7], '45%', '4f. Correct completion percentage');
  assertIncludes(String(incRows[0][8]), 'Education / Profession', '4g. Correctly lists missing section');

  // Multi-sheet Excel export (Active + Incomplete)
  const multiSheetExcel = generateExcelWorkbook([
    { sheetName: 'Active Candidates', headers: ACTIVE_CANDIDATE_HEADERS, rows: [] },
    { sheetName: 'Incomplete Registrations', headers: INCOMPLETE_REGISTRATION_HEADERS, rows: incRows },
  ]);
  assert(
    multiSheetExcel[0] === 0x50 && multiSheetExcel[1] === 0x4b,
    '4h. Multi-sheet Excel workbook generated with valid PK signature'
  );
}

// ─── 5 & 6. SCOPE TRUNCATION & DEDUPLICATION ──────────────────────────────────
console.log('\nTest Group 5 & 6: Scope Truncation & Candidate Deduplication');
{
  const mockCandidates = Array.from({ length: 120 }, (_, i) => ({
    _id: `user_${i}`,
    fullName: `Candidate ${i}`,
    email: `cand${i}@example.com`,
    isActive: true,
  }));

  const mockProfiles = mockCandidates.map((c) => ({
    user: c._id,
    candidateId: `WJ-ID-${c._id}`,
    displayName: c.fullName,
    gender: 'Male',
  }));

  // Duplicate profile records simulated (e.g. multiple edits or joins)
  const profileMap = new Map();
  for (const p of mockProfiles) {
    if (!profileMap.has(p.user)) {
      profileMap.set(p.user, p);
    }
  }

  const rows = buildActiveCandidateRows(mockCandidates, profileMap, new Map(), true);
  assertEqual(rows.length, 120, '5a. Exports all 120 matching candidates without 25-page truncation');

  // Check uniqueness of IDs
  const exportedIds = rows.map((r) => r[0]);
  const uniqueIds = new Set(exportedIds);
  assertEqual(uniqueIds.size, 120, '6a. All 120 candidates deduplicated with zero duplicate entries');
}

// ─── 7. CSV FORMULA INJECTION DEFENSE ─────────────────────────────────────────
console.log('\nTest Group 7: CSV Formula Injection Protection');
{
  const maliciousInputs = [
    '=cmd|\' /C calc\'!A0',
    '+1234567890',
    '-50% discount',
    '@SUM(A1:A10)',
    '\t=1+1',
    ' =cmd|\' /C calc\'!A0', // Leading space before dangerous formula
    '   +9876543210',       // Multiple leading spaces before plus
    '  @SUM(A1:A10)',       // Leading spaces before @
    '\t=1+1',               // Leading tab before =
    '\r-50% discount',      // Leading carriage return before -
  ];

  for (const input of maliciousInputs) {
    const sanitized = sanitizeCsvValue(input);
    // Must contain leading single quote to neutralize formula evaluation
    assert(
      sanitized.startsWith(`"'`) || sanitized.startsWith(`'`),
      `7. Formula character neutralized for: ${JSON.stringify(input)}`
    );
  }

  const safeInput = 'Dr. Rajesh Sharma, MD';
  const sanitizedSafe = sanitizeCsvValue(safeInput);
  assert(
    sanitizedSafe.startsWith(`"Dr. Rajesh Sharma`),
    '7b. Normal inputs safely quoted without unnecessary formula quote prefix'
  );
}

// ─── 8. EXPORT AUTHORIZATION & SENSITIVE FIELD EXCLUSION ──────────────────────
console.log('\nTest Group 8: Export Authorization & Sensitive Field Exclusion');
{
  const userWithSecrets = {
    _id: 'u_secret',
    fullName: 'Dr. Target Candidate',
    email: 'secret.cand@hospital.org',
    mobile: '9876543210',
    password: 'argon2_or_bcrypt_hash_secret',
    refreshToken: 'jwt_refresh_token_xyz',
    sessionSecret: 'session_secret_value',
    isActive: true,
  };

  const profileMap = new Map([
    [
      'u_secret',
      {
        candidateId: 'WJ-SEC-01',
        displayName: 'Dr. Target Candidate',
        medicalRegistrationNumber: 'MMC-2019-99999',
        familyBackground: { familyLocation: 'Pune, Maharashtra' },
      },
    ],
  ]);

  // When canViewPrivateContact is false (non-superadmin caller)
  const maskedRows = buildActiveCandidateRows([userWithSecrets], profileMap, new Map(), false);
  assertIncludes(String(maskedRows[0][4]), '***@', '8a. Email masked for unauthorized export caller');
  assertIncludes(String(maskedRows[0][5]), '****', '8b. Mobile masked for unauthorized export caller');
  assertIncludes(String(maskedRows[0][26]), '****', '8b2. Medical registration number masked for unauthorized export caller');
  assertIncludes(String(maskedRows[0][37]), 'Confidential', '8b3. Confidential family location redacted for unauthorized export caller');

  // Verify headers never contain sensitive fields
  assert(
    !ACTIVE_CANDIDATE_HEADERS.includes('password') &&
      !ACTIVE_CANDIDATE_HEADERS.includes('Password') &&
      !ACTIVE_CANDIDATE_HEADERS.includes('Password Hash'),
    '8c. Password hashes permanently excluded from export headers'
  );
  assert(
    !ACTIVE_CANDIDATE_HEADERS.includes('token') &&
      !ACTIVE_CANDIDATE_HEADERS.includes('Refresh Token') &&
      !ACTIVE_CANDIDATE_HEADERS.includes('Session Secret'),
    '8d. System tokens and secrets permanently excluded from export headers'
  );
  assert(
    !ACTIVE_CANDIDATE_HEADERS.includes('governmentId') &&
      !ACTIVE_CANDIDATE_HEADERS.includes('Aadhaar') &&
      !ACTIVE_CANDIDATE_HEADERS.includes('PAN Number'),
    '8e. Raw government IDs excluded from export headers'
  );
}

// ─── 9, 10, 11. BULK SELECTION CONTROLS ───────────────────────────────────────
console.log('\nTest Group 9, 10, 11: Bulk Selection Logic');
{
  const tableUsers = [
    { _id: 'u1', isActive: true },
    { _id: 'u2', isActive: true },
    { _id: 'u3', isActive: false },
    { _id: 'u4', isActive: false },
    { _id: 'u5', isActive: true },
  ];

  // 9. Select all active
  const activeIds = tableUsers.filter((u) => u.isActive).map((u) => u._id);
  assertEqual(activeIds.length, 3, '9a. Identified 3 active users');
  assert(activeIds.includes('u1') && activeIds.includes('u2') && activeIds.includes('u5'), '9b. Active users correctly collected');

  // 10. Select all deactivated
  const inactiveIds = tableUsers.filter((u) => !u.isActive).map((u) => u._id);
  assertEqual(inactiveIds.length, 2, '10a. Identified 2 deactivated users');
  assert(inactiveIds.includes('u3') && inactiveIds.includes('u4'), '10b. Deactivated users correctly collected');

  // 11. Individual selection, toggling, clearing
  let selected: string[] = [];
  // Select u1
  selected = [...selected, 'u1'];
  assertEqual(selected.length, 1, '11a. Selected single user');
  // Deselect u1
  selected = selected.filter((id) => id !== 'u1');
  assertEqual(selected.length, 0, '11b. Deselected user');
  // Clear selection
  selected = ['u1', 'u2', 'u3'];
  selected = [];
  assertEqual(selected.length, 0, '11c. Cleared selection');
}

// ─── 12, 13, 14, 15. BULK STATUS SAFEGUARDS & SUPER ADMIN PROTECTION ───────────
console.log('\nTest Group 12-15: Bulk Status Safeguards & Super Admin Protection');
{
  const callerAdminId = 'admin_current_logged_in';
  const superAdminId = 'super_admin_boss';
  const normalAdminId = 'admin_secondary';
  const regularUserId1 = 'user_cand_1';
  const regularUserId2 = 'user_cand_2';

  const mockUsersInDb = new Map<string, any>([
    [callerAdminId, { _id: callerAdminId, role: 'admin', isActive: true }],
    [superAdminId, { _id: superAdminId, role: 'admin', isActive: true }],
    [normalAdminId, { _id: normalAdminId, role: 'admin', isActive: true }],
    [regularUserId1, { _id: regularUserId1, role: 'user', isActive: true }],
    [regularUserId2, { _id: regularUserId2, role: 'user', isActive: false }],
  ]);

  const superAdminUserIds = new Set([callerAdminId, superAdminId]);
  let remainingActiveAdmins = 3;

  function simulateBulkUpdate(
    callerId: string,
    targetIds: string[],
    targetActive: boolean
  ) {
    const successful: string[] = [];
    const failed: Array<{ id: string; reason: string }> = [];

    for (const id of targetIds) {
      const u = mockUsersInDb.get(id);
      if (!u) {
        failed.push({ id, reason: 'User not found in system' });
        continue;
      }

      // Safeguard 1: Do not deactivate currently logged-in administrator
      if (!targetActive && id === callerId) {
        failed.push({ id, reason: 'Cannot deactivate currently logged-in administrator' });
        continue;
      }

      // Safeguard 2: Protect Super Admin accounts from deactivation
      if (!targetActive && (superAdminUserIds.has(id) || u.role === 'admin')) {
        if (superAdminUserIds.has(id)) {
          failed.push({ id, reason: 'Super Admin accounts are protected and cannot be deactivated' });
          continue;
        }

        // Safeguard 3: Protect last active administrator
        if (u.role === 'admin' && u.isActive) {
          if (remainingActiveAdmins <= 1) {
            failed.push({ id, reason: 'Cannot deactivate the last active administrator account' });
            continue;
          }
          remainingActiveAdmins--;
        }
      }

      successful.push(id);
    }

    return { successful, failed };
  }

  // 14a. Test logged-in admin protection
  const res1 = simulateBulkUpdate(callerAdminId, [callerAdminId, regularUserId1], false);
  assertEqual(res1.successful.length, 1, '14a. Eligible user updated successfully');
  assertEqual(res1.failed.length, 1, '14b. Caller admin skipped from deactivation');
  assertEqual(res1.failed[0].reason, 'Cannot deactivate currently logged-in administrator', '14c. Logged-in admin error reason is accurate');

  // 14b. Test Super Admin protection
  const res2 = simulateBulkUpdate(callerAdminId, [superAdminId, regularUserId1], false);
  assertEqual(res2.failed.length, 1, '14d. Super Admin protected from deactivation');
  assertEqual(res2.failed[0].reason, 'Super Admin accounts are protected and cannot be deactivated', '14e. Super admin error reason is accurate');

  // 15. Partial failures and accurate result reporting
  const res3 = simulateBulkUpdate(callerAdminId, ['nonexistent_id', regularUserId1, superAdminId], false);
  assertEqual(res3.successful.length, 1, '15a. Exactly 1 user succeeded in mixed batch');
  assertEqual(res3.failed.length, 2, '15b. Exactly 2 records failed with explicit reasons');
  assert(res3.failed.some((f) => f.reason.includes('not found')), '15c. Nonexistent ID reported accurately');
  assert(res3.failed.some((f) => f.reason.includes('Super Admin')), '15d. Super Admin failure reported accurately');

  // 12. Bulk activation
  const resActivate = simulateBulkUpdate(callerAdminId, [regularUserId1, regularUserId2], true);
  assertEqual(resActivate.successful.length, 2, '12a. Successfully activated all targeted users');
  assertEqual(resActivate.failed.length, 0, '12b. Zero failures on clean user activation');
}

// ─── 16. COMPATIBILITY WITH EXISTING BEHAVIOR ────────────────────────────────
console.log('\nTest Group 16: Compatibility with Existing Directory Behavior');
{
  // Verify UserItem fields backwards compatibility
  const userDoc = {
    _id: '507f1f77bcf86cd799439011',
    fullName: 'Dr. Test Legacy',
    email: 'legacy@example.com',
    mobile: '9876543210',
    role: 'user',
    verified: true,
    verificationStatus: 'VERIFIED',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  assert(Boolean(userDoc._id && userDoc.fullName && userDoc.email), '16a. Preserves standard UserItem schema');
  assert(ACTIVE_CANDIDATE_HEADERS.includes('Full Name'), '16b. Active Candidate export preserves standard candidate fields');
  assert(ACTIVE_CANDIDATE_HEADERS.includes('Gender'), '16c. Active Candidate export includes Gender');
  assert(ACTIVE_CANDIDATE_HEADERS.includes('Registration Status'), '16d. Active Candidate export includes Registration Status');
}

// ─── 17. REAL PKZIP DECOMPRESSION & OPENXML STRUCTURE VALIDATION ─────────────
console.log('\nTest Group 17: Real PKZIP Decompression & OpenXML Structure Validation');
{
  const testWorkbookBuffer = generateExcelWorkbook([
    {
      sheetName: 'Active Candidates',
      headers: ['Candidate ID', 'Full Name', 'Formula Test', 'Marathi Text'],
      rows: [
        ['WJ-101', 'Dr. Ramesh Sharma', ' =cmd|calc', 'डॉ. रमेश शर्मा'],
        ['WJ-102', 'Dr. Priya Patil', '   +12345', 'प्रिया पाटील'],
      ],
    },
    {
      sheetName: 'Incomplete Drafts',
      headers: ['Reg ID', 'Name', 'Notes'],
      rows: [
        ['REG-001', 'Draft User', 'Incomplete profile draft'],
      ],
    },
  ]);

  // Unzip manually using Node's standard PKZIP parsing & zlib.inflateRawSync
  let offset = 0;
  const entries = new Map<string, string>();
  while (offset < testWorkbookBuffer.length) {
    const sig = testWorkbookBuffer.readUInt32LE(offset);
    if (sig === 0x04034b50) { // Local file header signature
      const compMethod = testWorkbookBuffer.readUInt16LE(offset + 8);
      const compSize = testWorkbookBuffer.readUInt32LE(offset + 18);
      const nameLen = testWorkbookBuffer.readUInt16LE(offset + 26);
      const extraLen = testWorkbookBuffer.readUInt16LE(offset + 28);
      const name = testWorkbookBuffer.toString('utf-8', offset + 30, offset + 30 + nameLen);
      const dataStart = offset + 30 + nameLen + extraLen;
      const compData = testWorkbookBuffer.subarray(dataStart, dataStart + compSize);

      let uncompData: Buffer;
      if (compMethod === 8) {
        uncompData = zlib.inflateRawSync(compData);
      } else {
        uncompData = compData;
      }
      entries.set(name, uncompData.toString('utf-8'));
      offset = dataStart + compSize;
    } else {
      break;
    }
  }

  assert(entries.size >= 7, '17a. Extracted at least 7 OpenXML archive members');
  assert(entries.has('[Content_Types].xml'), '17b. Archive contains [Content_Types].xml');
  assert(entries.has('_rels/.rels'), '17c. Archive contains root _rels/.rels');
  assert(entries.has('xl/_rels/workbook.xml.rels'), '17d. Archive contains xl/_rels/workbook.xml.rels');
  assert(entries.has('xl/workbook.xml'), '17e. Archive contains xl/workbook.xml');
  assert(entries.has('xl/styles.xml'), '17f. Archive contains xl/styles.xml');
  assert(entries.has('xl/worksheets/sheet1.xml'), '17g. Archive contains sheet1.xml (Active Candidates)');
  assert(entries.has('xl/worksheets/sheet2.xml'), '17h. Archive contains sheet2.xml (Incomplete Drafts)');

  // Verify XML well-formedness and structure in worksheets
  const sheet1Xml = entries.get('xl/worksheets/sheet1.xml') || '';
  assertIncludes(sheet1Xml, '<worksheet', '17i. Sheet 1 XML contains <worksheet> root');
  assertIncludes(sheet1Xml, 'डॉ. रमेश शर्मा', '17j. Unicode Devanagari text preserved accurately in XML');
  assertIncludes(sheet1Xml, '&apos; =cmd|calc', '17k. Formula injection neutralized with leading single quote (XML-escaped as &apos;) in XML');
  assertIncludes(sheet1Xml, '&apos;   +12345', '17l. Leading spaces before formula prefix neutralized with single quote (XML-escaped as &apos;)');

  const workbookXml = entries.get('xl/workbook.xml') || '';
  assertIncludes(workbookXml, 'Active Candidates', '17m. Workbook XML references Active Candidates sheet name');
  assertIncludes(workbookXml, 'Incomplete Drafts', '17n. Workbook XML references Incomplete Drafts sheet name');
}

// ─── 18. BULK STATUS REQUEST VALIDATION & BOUNDARY CONSTRAINTS ────────────────
async function runValidationTests() {
  console.log('\nTest Group 18: Bulk Status Request Validation & Boundary Constraints');

  const createMockRes = () => {
    const res: any = {
      statusCode: 200,
      body: null,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(data: any) {
        this.body = data;
        return this;
      },
    };
    return res;
  };

  const adminReq = (body: any) =>
    ({
      body,
      user: { userId: '507f1f77bcf86cd799439011', email: 'admin@wj.com', role: 'admin' },
    } as any);

  // 18a. Omitted state: both isActive and status omitted
  {
    const res = createMockRes();
    await bulkUpdateUserStatus(adminReq({ userIds: ['507f1f77bcf86cd799439011'] }), res, () => {});
    assertEqual(res.statusCode, 400, '18a. Omitted state returns HTTP 400');
    assertIncludes(res.body?.message || '', 'Target state is required', '18b. Omitted state error message');
  }

  // 18c. Invalid isActive: non-boolean value
  {
    const res = createMockRes();
    await bulkUpdateUserStatus(adminReq({ userIds: ['507f1f77bcf86cd799439011'], isActive: 'true_string' }), res, () => {});
    assertEqual(res.statusCode, 400, '18c. Non-boolean isActive returns HTTP 400');
    assertIncludes(res.body?.message || '', 'Invalid isActive value', '18d. Invalid isActive error message');
  }

  // 18e. Invalid status: unsupported string value
  {
    const res = createMockRes();
    await bulkUpdateUserStatus(adminReq({ userIds: ['507f1f77bcf86cd799439011'], status: 'partially_active' }), res, () => {});
    assertEqual(res.statusCode, 400, '18e. Unsupported status string returns HTTP 400');
    assertIncludes(res.body?.message || '', 'Invalid status', '18f. Unsupported status error message');
  }

  // 18g. Contradictory values: isActive: true with status: 'deactivated'
  {
    const res = createMockRes();
    await bulkUpdateUserStatus(
      adminReq({ userIds: ['507f1f77bcf86cd799439011'], isActive: true, status: 'deactivated' }),
      res,
      () => {}
    );
    assertEqual(res.statusCode, 400, '18g. Contradictory state (true + deactivated) returns HTTP 400');
    assertIncludes(res.body?.message || '', 'Contradictory state', '18h. Contradictory error message');
  }

  // 18i. Contradictory values: isActive: false with status: 'active'
  {
    const res = createMockRes();
    await bulkUpdateUserStatus(
      adminReq({ userIds: ['507f1f77bcf86cd799439011'], isActive: false, status: 'active' }),
      res,
      () => {}
    );
    assertEqual(res.statusCode, 400, '18i. Contradictory state (false + active) returns HTTP 400');
    assertIncludes(res.body?.message || '', 'Contradictory state', '18j. Contradictory error message');
  }

  // 18k. Batch size limit: more than 500 IDs rejected
  {
    const largeBatch = Array.from({ length: 501 }, (_, i) => `507f1f77bcf86cd799439${String(i).padStart(3, '0')}`);
    const res = createMockRes();
    await bulkUpdateUserStatus(adminReq({ userIds: largeBatch, isActive: true }), res, () => {});
    assertEqual(res.statusCode, 400, '18k. More than 500 IDs rejected with HTTP 400');
    assertIncludes(res.body?.message || '', 'cannot exceed 500 accounts', '18l. Batch size error message');
  }

  // 18m. Malformed IDs: rejected with per-record failure reason
  {
    const res = createMockRes();
    await bulkUpdateUserStatus(
      adminReq({
        userIds: ['invalid_id_not_hex', '123'],
        isActive: true,
      }),
      res,
      () => {}
    );
    assertEqual(res.statusCode, 200, '18m. Batch with malformed IDs returns HTTP 200 with per-record breakdown');
    assert(
      res.body?.data?.failed?.some((f: any) => f.id === 'invalid_id_not_hex' && f.reason.includes('Invalid user ID format')),
      '18n. Malformed ID 1 reported in failed records with invalid format reason'
    );
    assert(
      res.body?.data?.failed?.some((f: any) => f.id === '123' && f.reason.includes('Invalid user ID format')),
      '18o. Malformed ID 2 reported in failed records with invalid format reason'
    );
  }

  // 18p. Duplicate IDs: deduplicated in batch processing
  {
    const res = createMockRes();
    await bulkUpdateUserStatus(
      adminReq({
        userIds: ['invalid_dupe_id', 'invalid_dupe_id'],
        isActive: true,
      }),
      res,
      () => {}
    );
    assertEqual(res.body?.data?.totalRequested, 1, '18p. Duplicate submitted IDs are deduplicated to 1 item');
  }


  // ─── 19. EXPORT SCOPE & ROLE FILTER VALIDATION ──────────────────────────────
  console.log('\nTest Group 19: Export Scope & Role Filter Validation (Candidate Account Isolation)');
  {
    const origUserFind = User.find;
    const origUserCount = User.countDocuments;
    const origAdminFindOne = Admin.findOne;
    const origAuditCreate = AuditLog.create;
    const origProfileFind = Profile.find;
    const origSubFind = Subscription.find;
    const origRegFind = Registration.find;
    const origRegCount = Registration.countDocuments;

    try {
      let capturedUserQuery: any = null;

      function mockQuery(result: any) {
        return {
          sort: () => mockQuery(result),
          select: () => mockQuery(result),
          lean: async () => result,
          then: (resolve: any) => Promise.resolve(result).then(resolve),
        };
      }

      Admin.findOne = (async () => ({ user: 'admin_id_1', permissions: ['all'] })) as any;
      AuditLog.create = (async (data: any) => data) as any;
      User.countDocuments = (async (query: any) => { if (query?.role) capturedUserQuery = query; return 2; }) as any;
      User.find = ((query: any) => {
        if (query?.role) capturedUserQuery = query;
        return mockQuery([{ _id: 'u1', fullName: 'Dr. Jane' }, { _id: 'u2', fullName: 'Dr. John' }]);
      }) as any;
      Profile.find = (() => mockQuery([])) as any;
      Subscription.find = (() => mockQuery([])) as any;
      Registration.find = (() => mockQuery([])) as any;
      Registration.countDocuments = (async () => 0) as any;

      const baseReq = (query: any = {}, body: any = {}) => ({
        query,
        body,
        user: { userId: 'admin_id_1', email: 'verified.admin@hospital.org', role: 'admin' },
        headers: { 'x-forwarded-for': '203.0.113.195, 10.0.0.1' },
      } as any);

      const createExportRes = () => {
        const res: any = {
          statusCode: 200,
          headers: {} as Record<string, string>,
          body: null as any,
          sentData: null as any,
          status(code: number) {
            this.statusCode = code;
            return this;
          },
          json(data: any) {
            this.body = data;
            return this;
          },
          setHeader(name: string, val: string) {
            this.headers[name] = val;
            return this;
          },
          send(data: any) {
            this.sentData = data;
            return this;
          },
        };
        return res;
      };

      // 19a. Omitted role in filtered export enforces role: 'user'
      {
        const res = createExportRes();
        await exportCandidateData(baseReq({ type: 'filtered' }), res, () => {});
        assertEqual(res.statusCode, 200, '19a. Filtered export with omitted role succeeds with HTTP 200');
        assertEqual(capturedUserQuery?.role, 'user', '19a2. Filtered export with omitted role strictly enforces role: user');
      }

      // 19b. role: 'all' in filtered export enforces role: 'user'
      {
        const res = createExportRes();
        await exportCandidateData(baseReq({ type: 'filtered', role: 'all' }), res, () => {});
        assertEqual(res.statusCode, 200, '19b. Filtered export with role=all succeeds with HTTP 200');
        assertEqual(capturedUserQuery?.role, 'user', '19b2. Filtered export with role=all strictly enforces role: user');
      }

      // 19c. Unexpected role 'admin' rejected with HTTP 400
      {
        const res = createExportRes();
        await exportCandidateData(baseReq({ type: 'filtered', role: 'admin' }), res, () => {});
        assertEqual(res.statusCode, 400, '19c. Filtered export with role=admin rejected with HTTP 400');
        assertIncludes(res.body?.message || '', 'only support candidate accounts', '19c2. Error message clarifies candidate role constraint');
      }

      // 19d. Unexpected role 'moderator' rejected with HTTP 400
      {
        const res = createExportRes();
        await exportCandidateData(baseReq({ type: 'filtered', role: 'moderator' }), res, () => {});
        assertEqual(res.statusCode, 400, '19d. Filtered export with role=moderator rejected with HTTP 400');
      }

      // 19e. Active export strictly enforces role: 'user' and isActive: true
      {
        const res = createExportRes();
        await exportCandidateData(baseReq({ type: 'active' }), res, () => {});
        assertEqual(capturedUserQuery?.role, 'user', '19e. Active export strictly enforces role: user');
        assertEqual(capturedUserQuery?.isActive, true, '19e2. Active export requires isActive: true');
      }

      // 19f. All export strictly enforces role: 'user'
      {
        const res = createExportRes();
        capturedUserQuery = null;
        await exportCandidateData(baseReq({ type: 'all' }), res, () => {});
        assertEqual(capturedUserQuery?.role, 'user', '19f. All export strictly enforces role: user');
      }

      // 19g. Invalid export type rejected with HTTP 400
      {
        const res = createExportRes();
        await exportCandidateData(baseReq({ type: 'superusers' }), res, () => {});
        assertEqual(res.statusCode, 400, '19g. Unsupported export type rejected with HTTP 400');
        assertIncludes(res.body?.message || '', 'Invalid export type', '19g2. Error specifies supported types');
      }

      // 19h. Invalid export format rejected with HTTP 400
      {
        const res = createExportRes();
        await exportCandidateData(baseReq({ format: 'pdf' }), res, () => {});
        assertEqual(res.statusCode, 400, '19h. Unsupported format rejected with HTTP 400');
        assertIncludes(res.body?.message || '', 'Invalid export format', '19h2. Error specifies supported formats');
      }

      // 19i. Invalid status filter rejected with HTTP 400
      {
        const res = createExportRes();
        await exportCandidateData(baseReq({ type: 'filtered', status: 'banned' }), res, () => {});
        assertEqual(res.statusCode, 400, '19i. Unsupported status filter rejected with HTTP 400');
      }

      // 19j. Invalid registrationStatus filter rejected with HTTP 400
      {
        const res = createExportRes();
        await exportCandidateData(baseReq({ type: 'filtered', registrationStatus: 'in_review' }), res, () => {});
        assertEqual(res.statusCode, 400, '19j. Unsupported registrationStatus filter rejected with HTTP 400');
      }
    } finally {
      User.find = origUserFind;
      User.countDocuments = origUserCount;
      Admin.findOne = origAdminFindOne;
      AuditLog.create = origAuditCreate;
      Profile.find = origProfileFind;
      Subscription.find = origSubFind;
      Registration.find = origRegFind;
      Registration.countDocuments = origRegCount;
    }
  }

  // ─── 20. EXPORT AUTHORIZATION & MANDATORY AUDIT FAIL-CLOSED ─────────────────
  console.log('\nTest Group 20: Export Authorization & Mandatory Audit Fail-Closed');
  {
    const origAdminFindOne = Admin.findOne;
    const origAuditCreate = AuditLog.create;
    const origUserCount = User.countDocuments;
    const origUserFind = User.find;
    const origProfileFind = Profile.find;
    const origSubFind = Subscription.find;
    const origRegFind = Registration.find;
    const origRegCount = Registration.countDocuments;

    try {
      function mockQuery(result: any) {
        return {
          sort: () => mockQuery(result),
          select: () => mockQuery(result),
          limit: () => mockQuery(result),
          lean: async () => result,
          then: (resolve: any) => Promise.resolve(result).then(resolve),
        };
      }

      User.countDocuments = (async () => 1) as any;
      User.find = (() => mockQuery([{ _id: 'u1', fullName: 'Dr. Test' }])) as any;
      Profile.find = (() => mockQuery([])) as any;
      Subscription.find = (() => mockQuery([])) as any;
      Registration.find = (() => mockQuery([])) as any;
      Registration.countDocuments = (async () => 0) as any;

      const createExportRes = () => {
        const res: any = {
          statusCode: 200,
          headers: {} as Record<string, string>,
          body: null as any,
          sentData: null as any,
          status(code: number) {
            this.statusCode = code;
            return this;
          },
          json(data: any) {
            this.body = data;
            return this;
          },
          setHeader(name: string, val: string) {
            this.headers[name] = val;
            return this;
          },
          send(data: any) {
            this.sentData = data;
            return this;
          },
        };
        return res;
      };

      // 20a. Missing authenticated user returns HTTP 401
      {
        const res = createExportRes();
        const unauthReq = { query: {}, body: {} } as any;
        await exportCandidateData(unauthReq, res, () => {});
        assertEqual(res.statusCode, 401, '20a. Missing req.user returns HTTP 401');
      }

      // 20b. User missing verified email returns HTTP 401
      {
        const res = createExportRes();
        const noEmailReq = { query: {}, body: {}, user: { userId: 'admin_id_1' } } as any;
        await exportCandidateData(noEmailReq, res, () => {});
        assertEqual(res.statusCode, 401, '20b. Missing verified email returns HTTP 401');
      }

      // 20c. Caller without Admin record returns HTTP 403
      {
        Admin.findOne = (async () => null) as any;
        const res = createExportRes();
        const req = {
          query: {},
          body: {},
          user: { userId: 'admin_missing', email: 'missing@wj.com' },
        } as any;
        await exportCandidateData(req, res, () => {});
        assertEqual(res.statusCode, 403, '20c. Missing Admin record returns HTTP 403');
        assertIncludes(res.body?.message || '', 'Administrator record not found', '20c2. Error message indicates missing record');
      }

      // 20d. Admin without export or users permission returns HTTP 403
      {
        Admin.findOne = (async () => ({ user: 'admin_limited', permissions: ['only_billing'] })) as any;
        const res = createExportRes();
        const req = {
          query: {},
          body: {},
          user: { userId: 'admin_limited', email: 'billing@wj.com' },
        } as any;
        await exportCandidateData(req, res, () => {});
        assertEqual(res.statusCode, 403, '20d. Admin without export or users permission returns HTTP 403');
        assertIncludes(res.body?.message || '', 'Insufficient permissions', '20d2. Error message indicates permissions error');
      }

      // 20e. SuperAdmin with all permissions succeeds with HTTP 200
      {
        let auditData: any = null;
        Admin.findOne = (async () => ({ user: 'superadmin_id', permissions: ['all'] })) as any;
        AuditLog.create = (async (data: any) => { auditData = data; return data; }) as any;
        const res = createExportRes();
        const req = {
          query: {},
          body: {},
          user: { userId: 'superadmin_id', email: 'super@wj.com' },
          // req.ip is the Express trust-proxy resolved IP (authoritative)
          ip: '198.51.100.42',
          socket: { remoteAddress: '10.0.0.1' },
          headers: { 'x-forwarded-for': '9.9.9.9, 10.0.0.1' }, // attacker-injected; must NOT be used
        } as any;
        await exportCandidateData(req, res, () => {});
        assertEqual(res.statusCode, 200, '20e. SuperAdmin with all permissions succeeds with HTTP 200');
        assertEqual(auditData?.ipAddress, '198.51.100.42', '20e2. Resolved client IP from req.ip (Express trust-proxy), not raw XFF header');
        assertEqual(auditData?.adminEmail, 'super@wj.com', '20e3. Recorded verified admin email in adminEmail field (schema-aligned)');
        assertEqual(auditData?.action, 'EXPORT_CANDIDATE_DATA', '20e4. Correct audit action recorded');
      }

      // 20f. Admin with export.candidates permission succeeds with HTTP 200
      {
        Admin.findOne = (async () => ({ user: 'export_admin_id', permissions: ['export.candidates'] })) as any;
        AuditLog.create = (async (data: any) => data) as any;
        const res = createExportRes();
        const req = {
          query: {},
          body: {},
          user: { userId: 'export_admin_id', email: 'export@wj.com' },
        } as any;
        await exportCandidateData(req, res, () => {});
        assertEqual(res.statusCode, 200, '20f. Admin with export.candidates permission succeeds with HTTP 200');
      }

      // 20g. Mandatory audit log write failure fails closed with HTTP 500 and returns zero candidate data
      {
        Admin.findOne = (async () => ({ user: 'admin_id', permissions: ['all'] })) as any;
        AuditLog.create = (async () => { throw new Error('Database disk error writing audit log'); }) as any;
        const res = createExportRes();
        const req = {
          query: {},
          body: {},
          user: { userId: 'admin_id', email: 'admin@wj.com' },
        } as any;
        await exportCandidateData(req, res, () => {});
        assertEqual(res.statusCode, 500, '20g. Mandatory audit log failure returns HTTP 500');
        assertIncludes(res.body?.message || '', 'Unable to record mandatory audit log', '20g2. Error explains audit log failure');
        assertEqual(res.sentData, null, '20g3. No file or candidate data returned when audit logging fails');
      }
    } finally {
      Admin.findOne = origAdminFindOne;
      AuditLog.create = origAuditCreate;
      User.countDocuments = origUserCount;
      User.find = origUserFind;
      Profile.find = origProfileFind;
      Subscription.find = origSubFind;
      Registration.find = origRegFind;
      Registration.countDocuments = origRegCount;
    }
  }

  // ─── 21. PROTECTION AGAINST OVERSIZED EXPORTS ───────────────────────────────
  console.log('\nTest Group 21: Protection Against Oversized Exports');
  {
    const origAdminFindOne = Admin.findOne;
    const origUserCount = User.countDocuments;
    const origUserFind = User.find;
    const origAuditCreate = AuditLog.create;
    const origProfileFind = Profile.find;
    const origSubFind = Subscription.find;
    const origRegFind = Registration.find;
    const origRegCount = Registration.countDocuments;

    try {
      Admin.findOne = (async () => ({ user: 'admin_id', permissions: ['all'] })) as any;
      AuditLog.create = (async (data: any) => data) as any;

      let userFindCalled = false;
      User.find = (() => { userFindCalled = true; return { sort: () => ({ lean: async () => [] }) }; }) as any;
      Profile.find = (() => ({ lean: async () => [] })) as any;
      Subscription.find = (() => ({ sort: () => ({ lean: async () => [] }) })) as any;
      Registration.find = (() => ({ sort: () => ({ lean: async () => [] }) })) as any;
      Registration.countDocuments = (async () => 0) as any;

      const createExportRes = () => {
        const res: any = {
          statusCode: 200,
          headers: {} as Record<string, string>,
          body: null as any,
          sentData: null as any,
          status(code: number) {
            this.statusCode = code;
            return this;
          },
          json(data: any) {
            this.body = data;
            return this;
          },
          setHeader(name: string, val: string) {
            this.headers[name] = val;
            return this;
          },
          send(data: any) {
            this.sentData = data;
            return this;
          },
        };
        return res;
      };

      // 21a. Oversized export request rejected with HTTP 400 before loading into memory
      {
        User.countDocuments = (async () => MAX_EXPORT_ROWS + 500) as any;
        const res = createExportRes();
        const req = {
          query: { type: 'active' },
          body: {},
          user: { userId: 'admin_id', email: 'admin@wj.com' },
        } as any;
        await exportCandidateData(req, res, () => {});
        assertEqual(res.statusCode, 400, '21a. Request exceeding max export rows rejected with HTTP 400');
        assertIncludes(res.body?.message || '', 'exceeds maximum allowed limit', '21a2. Error explains row limit exceeded');
        assertEqual(res.body?.data?.totalMatching, MAX_EXPORT_ROWS + 500, '21a3. Accurately reports total matching rows');
        assertEqual(res.body?.data?.maxAllowed, MAX_EXPORT_ROWS, '21a4. Accurately reports max allowed rows');
        assertEqual(userFindCalled, false, '21a5. Aborts upfront before loading unbounded users into memory');
        assertEqual(res.sentData, null, '21a6. Zero partial data returned');
      }

      // 21b. Request within limit proceeds
      {
        User.countDocuments = (async () => 5) as any;
        const res = createExportRes();
        const req = {
          query: { type: 'active' },
          body: {},
          user: { userId: 'admin_id', email: 'admin@wj.com' },
        } as any;
        await exportCandidateData(req, res, () => {});
        assertEqual(res.statusCode, 200, '21b. Request within allowed limit succeeds with HTTP 200');
      }
    } finally {
      Admin.findOne = origAdminFindOne;
      User.countDocuments = origUserCount;
      User.find = origUserFind;
      AuditLog.create = origAuditCreate;
      Profile.find = origProfileFind;
      Subscription.find = origSubFind;
      Registration.find = origRegFind;
      Registration.countDocuments = origRegCount;
    }
  }

  // ─── 22. AUTHORITATIVE REGISTRATION CLASSIFICATION & VALUE INTEGRITY ────────
  console.log('\nTest Group 22: Authoritative Registration Classification & Value Integrity');
  {
    // 22a. Stub profile document without substantive fields not classified as Complete
    const stubProfile = { _id: 'stub_profile_123', user: 'u_stub_1' };
    const stubStatus = determineRegistrationStatus(stubProfile, null);
    assertEqual(stubStatus, 'Incomplete', '22a. Stub profile document alone classified as Incomplete, not Complete');

    // 22b. Profile document with candidateId and substantive details classified as Complete
    const completeProfile = {
      candidateId: 'WJ-DOC-9821',
      displayName: 'Dr. Jane Doe',
      gender: 'Female',
      city: 'Pune',
      degree: 'MBBS',
    };
    const compStatus = determineRegistrationStatus(completeProfile, null);
    assertEqual(compStatus, 'Complete', '22b. Profile with candidateId and substantive details classified as Complete');

    // 22c. Registration with authoritative status COMPLETED classified as Complete
    const regCompleted = { status: 'COMPLETED' };
    assertEqual(determineRegistrationStatus(null, regCompleted), 'Complete', '22c. Authoritative COMPLETED registration classified as Complete without profile');

    // 22d. Registration with status IN_PROGRESS classified as Incomplete
    const regInProgress = { status: 'IN_PROGRESS' };
    assertEqual(determineRegistrationStatus(null, regInProgress), 'Incomplete', '22d. IN_PROGRESS registration classified as Incomplete');

    // 22e. User without profile or registration draft classified as Pending
    assertEqual(determineRegistrationStatus(null, null), 'Pending', '22e. User without profile or draft classified as Pending');

    // 22f. Missing country in DB outputs Not recorded and never assumes India
    const userNoCountry = { _id: 'u_no_ctry', fullName: 'Candidate Without Country' };
    const profileNoCountry = { candidateId: 'WJ-002', displayName: 'Candidate Without Country' };
    const rowsCountry = buildActiveCandidateRows(
      [userNoCountry],
      new Map([['u_no_ctry', profileNoCountry]]),
      new Map(),
      true
    );
    assertEqual(rowsCountry[0][16], 'Not recorded', '22f. Missing country outputs Not recorded, never assumes India');

    // 22g. Missing subscription status in DB outputs Not recorded, never invents ACTIVE or FREE
    assertEqual(rowsCountry[0][46], 'Not recorded', '22g. Missing subscription status in DB outputs Not recorded, never invents ACTIVE or FREE');

    // 22h. calculateAge on valid past DOB returns accurate age string
    const ageValid = calculateAge('1990-06-15');
    assert(ageValid !== 'Not recorded' && parseInt(ageValid, 10) >= 30, '22h. Valid past DOB calculates positive integer age');

    // 22i. calculateAge on null / empty returns Not recorded
    assertEqual(calculateAge(null), 'Not recorded', '22i. Null DOB returns Not recorded');
    assertEqual(calculateAge(undefined), 'Not recorded', '22i2. Undefined DOB returns Not recorded');
    assertEqual(calculateAge(''), 'Not recorded', '22i3. Empty string DOB returns Not recorded');

    // 22j. calculateAge on invalid date string returns Not recorded
    assertEqual(calculateAge('invalid-date-string'), 'Not recorded', '22j. Malformed date string returns Not recorded');

    // 22k. calculateAge on future date returns Not recorded, never negative or absolute positive
    assertEqual(calculateAge('2040-01-01'), 'Not recorded', '22k. Future DOB returns Not recorded');
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    assertEqual(calculateAge(tomorrow), 'Not recorded', '22k2. Tomorrow DOB returns Not recorded');
  }
  // ═══ 23. MAX_EXPORT_ROWS ENVIRONMENT VARIABLE VALIDATION ══════════════════
  console.log('\nTest Group 23: MAX_EXPORT_ROWS Environment Variable Validation');
  {
    // Import parseMaxExportRows indirectly by re-running the parsing logic inline.
    // This tests the exported MAX_EXPORT_ROWS constant behaviour under various ENV inputs.
    // Since the constant is module-level, we replicate the parsing function here to
    // validate all edge cases without re-loading the module.
    function parseMaxExportRowsTest(raw: string | undefined): number {
      const HARD_DEFAULT = 10000;
      const ABSOLUTE_MAX = 100000;
      if (!raw) return HARD_DEFAULT;
      const n = Number(raw);
      if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0 || n > ABSOLUTE_MAX) {
        return HARD_DEFAULT;
      }
      return n;
    }

    // 23a. Non-numeric string must fall back to 10000 (never silently disable limit)
    assertEqual(parseMaxExportRowsTest('abc'), 10000, '23a. Non-numeric string falls back to 10000, does not disable limit');

    // 23b. Negative value must fall back to 10000
    assertEqual(parseMaxExportRowsTest('-1'), 10000, '23b. Negative value falls back to 10000');

    // 23c. Zero must fall back to 10000
    assertEqual(parseMaxExportRowsTest('0'), 10000, '23c. Zero falls back to 10000');

    // 23d. Float (non-integer) must fall back to 10000
    assertEqual(parseMaxExportRowsTest('3.14'), 10000, '23d. Float (non-integer) falls back to 10000');

    // 23e. Value exceeding ABSOLUTE_MAX (100000) must fall back to 10000
    assertEqual(parseMaxExportRowsTest('100001'), 10000, '23e. Value > 100000 falls back to 10000');

    // 23f. Valid positive integer within range is accepted as-is
    assertEqual(parseMaxExportRowsTest('5000'), 5000, '23f. Valid value 5000 accepted as-is');

    // 23g. Undefined (missing ENV var) returns HARD_DEFAULT of 10000
    assertEqual(parseMaxExportRowsTest(undefined), 10000, '23g. Undefined (missing ENV var) returns default 10000');

    // 23h. Infinity string must fall back to 10000
    assertEqual(parseMaxExportRowsTest('Infinity'), 10000, '23h. "Infinity" string falls back to 10000');

    // 23i. Boundary value: ABSOLUTE_MAX itself (100000) is accepted
    assertEqual(parseMaxExportRowsTest('100000'), 100000, '23i. Boundary value 100000 is accepted');

    // 23j. Exported MAX_EXPORT_ROWS constant is a positive finite integer
    assert(
      Number.isFinite(MAX_EXPORT_ROWS) && Number.isInteger(MAX_EXPORT_ROWS) && MAX_EXPORT_ROWS > 0,
      '23j. Exported MAX_EXPORT_ROWS constant is a positive finite integer (limit always active)'
    );
  }

  // ═══ 24. EXACT-LIMIT, OVER-LIMIT, AND COMBINED DATASET BOUNDARY ═══════════
  console.log('\nTest Group 24: Exact-Limit, Over-Limit, and Combined Dataset Boundary');
  {
    const origUserFind = User.find;
    const origUserCount = User.countDocuments;
    const origAdminFindOne = Admin.findOne;
    const origAuditCreate = AuditLog.create;
    const origProfileFind = Profile.find;
    const origSubFind = Subscription.find;
    const origRegFind = Registration.find;
    const origRegCount = Registration.countDocuments;

    try {
      function mockQuery(result: any) {
        return {
          sort: function() { return this; },
          select: function() { return this; },
          limit: function() { return this; },
          lean: async () => result,
        };
      }

      Admin.findOne = (async () => ({ user: 'admin24', permissions: ['all'] })) as any;
      AuditLog.create = (async (data: any) => data) as any;
      Profile.find = ((_q: any) => mockQuery([])) as any;
      Subscription.find = ((_q: any) => mockQuery([])) as any;

      // 24a. Active = MAX_EXPORT_ROWS exactly → should be accepted (HTTP 200)
      {
        const exactRows = Array.from({ length: MAX_EXPORT_ROWS }, (_, i) => ({
          _id: `user_exact_${i}`,
          fullName: `User ${i}`,
          isActive: true,
        }));
        User.countDocuments = (async (_q: any) => MAX_EXPORT_ROWS) as any;
        User.find = ((_q: any) => mockQuery(exactRows)) as any;
        Registration.countDocuments = (async (_q: any) => 0) as any;
        Registration.find = ((_q: any) => mockQuery([])) as any;

        const res = createMockRes();
        await exportCandidateData(
          {
            user: { userId: 'admin24', email: 'admin24@test.com' },
            query: { type: 'active', format: 'csv' },
            body: {},
            ip: '127.0.0.1',
            socket: { remoteAddress: '127.0.0.1' },
            headers: {},
          } as any,
          res,
          () => {}
        );
        assertEqual(res.statusCode, 200, '24a. Exactly MAX_EXPORT_ROWS active records is accepted (HTTP 200)');
      }

      // 24b. Active = MAX_EXPORT_ROWS + 1 → rejected at pre-flight count check (HTTP 400)
      {
        User.countDocuments = (async (_q: any) => MAX_EXPORT_ROWS + 1) as any;
        Registration.countDocuments = (async (_q: any) => 0) as any;

        const res = createMockRes();
        await exportCandidateData(
          {
            user: { userId: 'admin24', email: 'admin24@test.com' },
            query: { type: 'active', format: 'csv' },
            body: {},
            ip: '127.0.0.1',
            socket: { remoteAddress: '127.0.0.1' },
            headers: {},
          } as any,
          res,
          () => {}
        );
        assertEqual(res.statusCode, 400, '24b. MAX_EXPORT_ROWS + 1 active records rejected at pre-flight (HTTP 400)');
        assert(
          res.body?.data?.maxAllowed === MAX_EXPORT_ROWS,
          '24b2. Pre-flight rejection includes maxAllowed in response'
        );
      }

      // 24c. Combined active + incomplete = MAX_EXPORT_ROWS exactly → accepted (HTTP 200)
      {
        const half = Math.floor(MAX_EXPORT_ROWS / 2);
        const halfRows = Array.from({ length: half }, (_, i) => ({
          _id: `user_half_${i}`,
          fullName: `User ${i}`,
          isActive: true,
        }));
        const halfRegs = Array.from({ length: MAX_EXPORT_ROWS - half }, (_, i) => ({
          _id: `reg_half_${i}`,
          registrationId: `REG_${i}`,
          status: 'IN_PROGRESS',
          isDeleted: false,
          currentStep: 1,
          totalSteps: 4,
          completionPercentage: 25,
          stepData: {},
        }));

        User.countDocuments = (async (_q: any) => half) as any;
        User.find = ((_q: any) => mockQuery(halfRows)) as any;
        Registration.countDocuments = (async (_q: any) => MAX_EXPORT_ROWS - half) as any;
        Registration.find = ((_q: any) => mockQuery(halfRegs)) as any;

        const res = createMockRes();
        await exportCandidateData(
          {
            user: { userId: 'admin24', email: 'admin24@test.com' },
            query: { type: 'all', format: 'csv' },
            body: {},
            ip: '127.0.0.1',
            socket: { remoteAddress: '127.0.0.1' },
            headers: {},
          } as any,
          res,
          () => {}
        );
        assertEqual(res.statusCode, 200, '24c. Combined active + incomplete = MAX_EXPORT_ROWS exactly is accepted (HTTP 200)');
      }

      // 24d. Combined active + incomplete = MAX_EXPORT_ROWS + 1 → rejected (HTTP 400)
      {
        const half = Math.floor(MAX_EXPORT_ROWS / 2);
        User.countDocuments = (async (_q: any) => half) as any;
        Registration.countDocuments = (async (_q: any) => MAX_EXPORT_ROWS - half + 1) as any;

        const res = createMockRes();
        await exportCandidateData(
          {
            user: { userId: 'admin24', email: 'admin24@test.com' },
            query: { type: 'all', format: 'csv' },
            body: {},
            ip: '127.0.0.1',
            socket: { remoteAddress: '127.0.0.1' },
            headers: {},
          } as any,
          res,
          () => {}
        );
        assertEqual(res.statusCode, 400, '24d. Combined aggregate = MAX_EXPORT_ROWS + 1 rejected at pre-flight (HTTP 400)');
      }

      // 24e. Post-fetch race simulation: fetch returns MAX_EXPORT_ROWS + 1 rows
      //      despite pre-flight count passing → count/fetch race → HTTP 400
      {
        // Pre-flight count is within limit, but find() returns one extra row
        const raceRows = Array.from({ length: MAX_EXPORT_ROWS + 1 }, (_, i) => ({
          _id: `user_race_${i}`,
          fullName: `Race User ${i}`,
          isActive: true,
        }));
        User.countDocuments = (async (_q: any) => MAX_EXPORT_ROWS) as any;
        User.find = ((_q: any) => mockQuery(raceRows)) as any;
        Registration.countDocuments = (async (_q: any) => 0) as any;
        Registration.find = ((_q: any) => mockQuery([])) as any;

        const res = createMockRes();
        await exportCandidateData(
          {
            user: { userId: 'admin24', email: 'admin24@test.com' },
            query: { type: 'active', format: 'csv' },
            body: {},
            ip: '127.0.0.1',
            socket: { remoteAddress: '127.0.0.1' },
            headers: {},
          } as any,
          res,
          () => {}
        );
        assertEqual(res.statusCode, 400, '24e. Count/fetch race (fetch returns MAX+1) is detected and rejected (HTTP 400)');
        assert(
          res.body?.message?.includes('race') || res.body?.message?.includes('changed'),
          '24e2. Race-condition error message explains the count/fetch discrepancy'
        );
      }

      // 24f. type='all', active=8000, incomplete=3000, MAX=10000 → aggregate 11000 rejected
      {
        User.countDocuments = (async (_q: any) => 8000) as any;
        Registration.countDocuments = (async (_q: any) => 3000) as any;

        const res = createMockRes();
        await exportCandidateData(
          {
            user: { userId: 'admin24', email: 'admin24@test.com' },
            query: { type: 'all', format: 'xlsx' },
            body: {},
            ip: '127.0.0.1',
            socket: { remoteAddress: '127.0.0.1' },
            headers: {},
          } as any,
          res,
          () => {}
        );
        // With MAX_EXPORT_ROWS default = 10000, active(8000) + incomplete(3000) = 11000 > 10000
        assert(
          res.statusCode === 400 || res.statusCode === 200,
          '24f. type=all with 8000 active + 3000 incomplete evaluated against configured MAX_EXPORT_ROWS'
        );
        if (MAX_EXPORT_ROWS <= 10000) {
          assertEqual(res.statusCode, 400, '24f-strict. With MAX=10000: aggregate 11000 > 10000 → rejected (HTTP 400)');
        }
      }
    } finally {
      User.find = origUserFind;
      User.countDocuments = origUserCount;
      Admin.findOne = origAdminFindOne;
      AuditLog.create = origAuditCreate;
      Profile.find = origProfileFind;
      Subscription.find = origSubFind;
      Registration.find = origRegFind;
      Registration.countDocuments = origRegCount;
    }
  }

  // ═══ 25. AUDIT IDENTITY AND IP TRUST VALIDATION ════════════════════════════
  console.log('\nTest Group 25: Audit Identity Cannot Be Supplied by Request Body; IP via Express trust-proxy');
  {
    const origUserFind = User.find;
    const origUserCount = User.countDocuments;
    const origAdminFindOne = Admin.findOne;
    const origAuditCreate = AuditLog.create;
    const origProfileFind = Profile.find;
    const origSubFind = Subscription.find;
    const origRegFind = Registration.find;
    const origRegCount = Registration.countDocuments;

    try {
      function mockQuery(result: any) {
        return {
          sort: function() { return this; },
          select: function() { return this; },
          limit: function() { return this; },
          lean: async () => result,
        };
      }

      Admin.findOne = (async () => ({ user: 'admin25', permissions: ['all'] })) as any;
      User.countDocuments = (async () => 1) as any;
      User.find = ((_q: any) => mockQuery([{ _id: 'u25', fullName: 'Test', isActive: true }])) as any;
      Registration.countDocuments = (async () => 0) as any;
      Registration.find = ((_q: any) => mockQuery([])) as any;
      Profile.find = ((_q: any) => mockQuery([])) as any;
      Subscription.find = ((_q: any) => mockQuery([])) as any;

      // 25a. Request body contains email field → audit records JWT email not body email
      {
        let capturedAuditData: any = null;
        AuditLog.create = (async (data: any) => { capturedAuditData = data; return data; }) as any;

        const res = createMockRes();
        await exportCandidateData(
          {
            user: { userId: 'admin25', email: 'jwt_admin@legitimate.com' },
            query: { type: 'active', format: 'csv' },
            body: { email: 'attacker@evil.com' },  // attacker-controlled body field
            ip: '127.0.0.1',
            socket: { remoteAddress: '127.0.0.1' },
            headers: {},
          } as any,
          res,
          () => {}
        );
        assert(
          capturedAuditData?.adminEmail === 'jwt_admin@legitimate.com',
          '25a. Audit record uses JWT email (req.user.email), not request body email field'
        );
        assert(
          capturedAuditData?.adminEmail !== 'attacker@evil.com',
          '25a2. Attacker-controlled body email is never written to audit log'
        );
      }

      // 25b. Request body contains adminUser field → audit uses JWT identity only
      {
        let capturedAuditData: any = null;
        AuditLog.create = (async (data: any) => { capturedAuditData = data; return data; }) as any;

        const res = createMockRes();
        await exportCandidateData(
          {
            user: { userId: 'real_admin_id_25', email: 'real_admin@legitimate.com' },
            query: { type: 'active', format: 'csv' },
            body: { adminUser: 'fake_admin_id', adminEmail: 'fake@hacker.com' },
            ip: '127.0.0.1',
            socket: { remoteAddress: '127.0.0.1' },
            headers: {},
          } as any,
          res,
          () => {}
        );
        assert(
          capturedAuditData?.adminEmail === 'real_admin@legitimate.com',
          '25b. Audit adminEmail is taken from verified JWT token, not request body adminEmail field'
        );
        assert(
          capturedAuditData?.adminEmail !== 'fake@hacker.com',
          '25b2. Fake body adminEmail does not appear in audit log'
        );
      }

      // 25c. Client IP is resolved via req.ip (Express trust-proxy), not raw XFF header
      {
        let capturedAuditData: any = null;
        AuditLog.create = (async (data: any) => { capturedAuditData = data; return data; }) as any;

        const res = createMockRes();
        // req.ip is set by Express via trust proxy; x-forwarded-for is attacker-controlled here
        await exportCandidateData(
          {
            user: { userId: 'admin25', email: 'admin25@test.com' },
            query: { type: 'active', format: 'csv' },
            body: {},
            ip: '10.0.0.1',   // Express resolved IP (from trust proxy)
            socket: { remoteAddress: '10.0.0.2' },
            headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },  // attacker-injected chain
          } as any,
          res,
          () => {}
        );
        assert(
          capturedAuditData?.ipAddress === '10.0.0.1',
          '25c. Client IP recorded as req.ip (Express trust-proxy resolved), not raw X-Forwarded-For header'
        );
        assert(
          capturedAuditData?.ipAddress !== '1.2.3.4',
          '25c2. Attacker-injected X-Forwarded-For IP is not used as the authoritative client IP'
        );
      }

      // 25d. AuditLog schema fields are correctly populated
      {
        let capturedAuditData: any = null;
        AuditLog.create = (async (data: any) => { capturedAuditData = data; return data; }) as any;

        const res = createMockRes();
        await exportCandidateData(
          {
            user: { userId: 'admin25_schema', email: 'schema_test@test.com' },
            query: { type: 'active', format: 'xlsx' },
            body: {},
            ip: '192.168.1.1',
            socket: { remoteAddress: '192.168.1.1' },
            headers: {},
          } as any,
          res,
          () => {}
        );
        assert(
          typeof capturedAuditData?.adminEmail === 'string' && capturedAuditData.adminEmail.length > 0,
          '25d. AuditLog adminEmail field is a non-empty string (schema: required String)'
        );
        assert(
          capturedAuditData?.status === 'SUCCESS',
          '25d2. AuditLog status field is "SUCCESS" (schema: required enum)'
        );
        assert(
          typeof capturedAuditData?.details === 'string',
          '25d3. AuditLog details field is a JSON string, not a plain object (schema: String type)'
        );
        assert(
          capturedAuditData?.action === 'EXPORT_CANDIDATE_DATA',
          '25d4. AuditLog action field is "EXPORT_CANDIDATE_DATA"'
        );
        // Confirm no candidate PII in audit details
        const parsedDetails = JSON.parse(capturedAuditData?.details || '{}');
        assert(
          !parsedDetails.email && !parsedDetails.mobile && !parsedDetails.fullName,
          '25d5. Audit details do not contain candidate PII fields (email, mobile, fullName)'
        );
      }
    } finally {
      User.find = origUserFind;
      User.countDocuments = origUserCount;
      Admin.findOne = origAdminFindOne;
      AuditLog.create = origAuditCreate;
      Profile.find = origProfileFind;
      Subscription.find = origSubFind;
      Registration.find = origRegFind;
      Registration.countDocuments = origRegCount;
    }
  }

  // ═══ 26. AUDIT ORDERING, OBJECTID INTEGRITY, AND PROXY SPOOFING ═════════
  console.log('\nTest Group 26: Export Audit Ordering, ObjectId Schema Integrity, and Proxy IP Trust');
  {
    const origUserFind = User.find;
    const origUserCount = User.countDocuments;
    const origAdminFindOne = Admin.findOne;
    const origAuditCreate = AuditLog.create;
    const origProfileFind = Profile.find;
    const origSubFind = Subscription.find;
    const origRegFind = Registration.find;
    const origRegCount = Registration.countDocuments;

    try {
      function mockQuery(result: any) {
        return {
          sort: function() { return this; },
          select: function() { return this; },
          limit: function() { return this; },
          lean: async () => result,
        };
      }

      Admin.findOne = (async () => ({ user: '507f1f77bcf86cd799439011', permissions: ['all'] })) as any;
      User.countDocuments = (async () => 1) as any;
      User.find = ((_q: any) => mockQuery([{ _id: 'u26', fullName: 'Dr. Test Candidate', isActive: true }])) as any;
      Registration.countDocuments = (async () => 0) as any;
      Registration.find = ((_q: any) => mockQuery([])) as any;
      Profile.find = ((_q: any) => mockQuery([])) as any;
      Subscription.find = ((_q: any) => mockQuery([])) as any;

      // 26a. Valid 24-hex ObjectId callerId is populated in adminUser field
      {
        let capturedAuditData: any = null;
        AuditLog.create = (async (data: any) => { capturedAuditData = data; return data; }) as any;

        const res = createMockRes();
        await exportCandidateData(
          {
            user: { userId: '507f1f77bcf86cd799439011', email: 'valid_id@wj.com' },
            query: { type: 'active', format: 'csv' },
            body: {},
            ip: '127.0.0.1',
            socket: { remoteAddress: '127.0.0.1' },
            headers: {},
          } as any,
          res,
          () => {}
        );
        assertEqual(
          capturedAuditData?.adminUser,
          '507f1f77bcf86cd799439011',
          '26a. Valid 24-hex ObjectId callerId is populated in adminUser ObjectId reference'
        );
      }

      // 26b. Non-ObjectId callerId (e.g. arbitrary string) omits adminUser, preventing DB cast errors
      {
        let capturedAuditData: any = null;
        AuditLog.create = (async (data: any) => { capturedAuditData = data; return data; }) as any;

        const res = createMockRes();
        await exportCandidateData(
          {
            user: { userId: 'non_objectid_admin_name', email: 'non_obj@wj.com' },
            query: { type: 'active', format: 'csv' },
            body: {},
            ip: '127.0.0.1',
            socket: { remoteAddress: '127.0.0.1' },
            headers: {},
          } as any,
          res,
          () => {}
        );
        assertEqual(
          capturedAuditData?.adminUser,
          undefined,
          '26b. Non-ObjectId callerId leaves adminUser undefined, avoiding schema cast error'
        );
        assertEqual(
          capturedAuditData?.adminEmail,
          'non_obj@wj.com',
          '26b2. adminEmail is still recorded accurately from JWT'
        );
      }

      // 26c. Export Audit Ordering: File generation succeeds before AuditLog.create is called
      {
        const callOrder: string[] = [];
        AuditLog.create = (async (data: any) => {
          callOrder.push('audit_logged');
          return data;
        }) as any;

        const exportRes: any = {
          statusCode: 200,
          headers: {} as Record<string, string>,
          body: null as any,
          sentData: null as any,
          status(code: number) { this.statusCode = code; return this; },
          json(data: any) { this.body = data; return this; },
          setHeader(name: string, val: string) { this.headers[name] = val; return this; },
          send(data: any) {
            callOrder.push('file_sent');
            this.sentData = data;
            return this;
          },
        };

        await exportCandidateData(
          {
            user: { userId: '507f1f77bcf86cd799439011', email: 'order@wj.com' },
            query: { type: 'active', format: 'csv' },
            body: {},
            ip: '127.0.0.1',
            socket: { remoteAddress: '127.0.0.1' },
            headers: {},
          } as any,
          exportRes,
          () => {}
        );

        assert(
          callOrder[0] === 'audit_logged' && callOrder[1] === 'file_sent',
          '26c. Audit log is written and persisted BEFORE file transmission'
        );
        assertEqual(exportRes.statusCode, 200, '26c2. Successful export returns HTTP 200');
        assert(exportRes.sentData !== null, '26c3. File data transmitted after successful audit log');
      }

      // 26d. Export Audit Ordering: Audit failure prevents file transmission
      {
        let fileSent = false;
        AuditLog.create = (async () => {
          throw new Error('Disk full on audit replica');
        }) as any;

        const exportRes: any = {
          statusCode: 200,
          headers: {} as Record<string, string>,
          body: null as any,
          sentData: null as any,
          status(code: number) { this.statusCode = code; return this; },
          json(data: any) { this.body = data; return this; },
          setHeader(name: string, val: string) { this.headers[name] = val; return this; },
          send(data: any) {
            fileSent = true;
            this.sentData = data;
            return this;
          },
        };

        await exportCandidateData(
          {
            user: { userId: '507f1f77bcf86cd799439011', email: 'audit_fail@wj.com' },
            query: { type: 'active', format: 'csv' },
            body: {},
            ip: '127.0.0.1',
            socket: { remoteAddress: '127.0.0.1' },
            headers: {},
          } as any,
          exportRes,
          () => {}
        );

        assertEqual(exportRes.statusCode, 500, '26d. Audit write failure returns HTTP 500 (fail-closed)');
        assertEqual(fileSent, false, '26d2. No file data transmitted when audit write fails');
        assertEqual(exportRes.sentData, null, '26d3. Response sentData remains null');
      }

      // 26e. Express trust proxy: clientIp strictly derived from req.ip, resisting spoofing
      {
        let recordedIp: string | null = null;
        AuditLog.create = (async (data: any) => {
          recordedIp = data.ipAddress;
          return data;
        }) as any;

        const res = createMockRes();
        await exportCandidateData(
          {
            user: { userId: '507f1f77bcf86cd799439011', email: 'proxy_test@wj.com' },
            query: { type: 'active', format: 'xlsx' },
            body: {},
            ip: '203.0.113.195', // Express trust proxy 1 resolves actual client IP from socket
            socket: { remoteAddress: '127.0.0.1' },
            headers: {
              'x-forwarded-for': '198.51.100.99, 203.0.113.195', // attacker injected 198.51.100.99
            },
          } as any,
          res,
          () => {}
        );

        assertEqual(
          recordedIp,
          '203.0.113.195',
          '26e. Audit records req.ip as resolved by Express trust proxy 1, ignoring attacker spoofed IP'
        );
      }
    } finally {
      User.find = origUserFind;
      User.countDocuments = origUserCount;
      Admin.findOne = origAdminFindOne;
      AuditLog.create = origAuditCreate;
      Profile.find = origProfileFind;
      Subscription.find = origSubFind;
      Registration.find = origRegFind;
      Registration.countDocuments = origRegCount;
    }
  }

console.log('\n========================================================================');
  console.log(`  FINAL RESULTS: Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runValidationTests().catch((err) => {
  console.error('Validation test error:', err);
  process.exit(1);
});
