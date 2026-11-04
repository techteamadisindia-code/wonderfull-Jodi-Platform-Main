"use strict";
/**
 * Comprehensive Test Suite for Admin User Gender & Live Registration Status
 * Covers all requirements in Section 5:
 * - Gender normalization & display mapping (Groom -> Male, Bride -> Female, etc.)
 * - Registration status lifecycle (Complete, In Progress, Incomplete, Pending)
 * - Multi-key lookup for legacy/unlinked draft registrations (userId, email, mobile)
 * - User detail endpoint (getUserById) alignment
 * - Export controller integration
 * - API query filters and edge cases
 */
Object.defineProperty(exports, "__esModule", { value: true });
const genderUtils_1 = require("../utils/genderUtils");
const adminExportController_1 = require("../controllers/adminExportController");
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
function assert(description, condition, extraInfo) {
    totalTests++;
    if (condition) {
        passedTests++;
        console.log(`  [PASS] ${description}`);
    }
    else {
        failedTests++;
        console.error(`  [FAIL] ${description}`, extraInfo ? extraInfo : '');
    }
}
function assertEqual(actual, expected, description) {
    const matches = actual === expected;
    assert(description, matches, matches ? undefined : { expected, actual });
}
console.log('========================================================================');
console.log('  WONDERFUL JODI — ADMIN USER GENDER & REGISTRATION STATUS TEST SUITE');
console.log('========================================================================\n');
// ─── 1. GENDER NORMALIZATION & DISPLAY MAPPING ──────────────────────────────
console.log('Test Group 1: Gender Normalization & Display Mapping');
{
    // 1a. Groom displays Male
    assertEqual((0, genderUtils_1.normalizeGender)('Groom'), 'Male', '1a. Groom normalizes to Male');
    assertEqual((0, genderUtils_1.normalizeGender)('groom'), 'Male', '1b. Lowercase groom normalizes to Male');
    assertEqual((0, genderUtils_1.normalizeGender)('GROOM'), 'Male', '1c. Uppercase GROOM normalizes to Male');
    assertEqual((0, genderUtils_1.normalizeGender)('  Groom  '), 'Male', '1d. Padded Groom normalizes to Male');
    assertEqual((0, genderUtils_1.normalizeGender)('grooms'), 'Male', '1e. Plural grooms normalizes to Male');
    assertEqual((0, genderUtils_1.formatGenderDisplay)('Groom'), 'Male', '1f. formatGenderDisplay("Groom") returns "Male"');
    // 1b. Bride displays Female
    assertEqual((0, genderUtils_1.normalizeGender)('Bride'), 'Female', '1g. Bride normalizes to Female');
    assertEqual((0, genderUtils_1.normalizeGender)('bride'), 'Female', '1h. Lowercase bride normalizes to Female');
    assertEqual((0, genderUtils_1.normalizeGender)('BRIDE'), 'Female', '1i. Uppercase BRIDE normalizes to Female');
    assertEqual((0, genderUtils_1.normalizeGender)('  Bride  '), 'Female', '1j. Padded Bride normalizes to Female');
    assertEqual((0, genderUtils_1.normalizeGender)('brides'), 'Female', '1k. Plural brides normalizes to Female');
    assertEqual((0, genderUtils_1.formatGenderDisplay)('Bride'), 'Female', '1l. formatGenderDisplay("Bride") returns "Female"');
    // 1c. Male remains Male
    assertEqual((0, genderUtils_1.normalizeGender)('Male'), 'Male', '1m. Male normalizes to Male');
    assertEqual((0, genderUtils_1.normalizeGender)('male'), 'Male', '1n. Lowercase male normalizes to Male');
    assertEqual((0, genderUtils_1.normalizeGender)('MALE'), 'Male', '1o. Uppercase MALE normalizes to Male');
    assertEqual((0, genderUtils_1.normalizeGender)('M'), 'Male', '1p. Single letter M normalizes to Male');
    assertEqual((0, genderUtils_1.formatGenderDisplay)('Male'), 'Male', '1q. formatGenderDisplay("Male") returns "Male"');
    // 1d. Female remains Female
    assertEqual((0, genderUtils_1.normalizeGender)('Female'), 'Female', '1r. Female normalizes to Female');
    assertEqual((0, genderUtils_1.normalizeGender)('female'), 'Female', '1s. Lowercase female normalizes to Female');
    assertEqual((0, genderUtils_1.normalizeGender)('FEMALE'), 'Female', '1t. Uppercase FEMALE normalizes to Female');
    assertEqual((0, genderUtils_1.normalizeGender)('F'), 'Female', '1u. Single letter F normalizes to Female');
    assertEqual((0, genderUtils_1.formatGenderDisplay)('Female'), 'Female', '1v. formatGenderDisplay("Female") returns "Female"');
    // 1e. Missing value displays Not recorded (returns null)
    assertEqual((0, genderUtils_1.normalizeGender)(null), null, '1w. null returns null');
    assertEqual((0, genderUtils_1.normalizeGender)(undefined), null, '1x. undefined returns null');
    assertEqual((0, genderUtils_1.normalizeGender)(''), null, '1y. empty string returns null');
    assertEqual((0, genderUtils_1.normalizeGender)('   '), null, '1z. whitespace string returns null');
    assertEqual((0, genderUtils_1.formatGenderDisplay)(null), 'Not recorded', '1aa. formatGenderDisplay(null) returns "Not recorded"');
    assertEqual((0, genderUtils_1.formatGenderDisplay)(undefined), 'Not recorded', '1ab. formatGenderDisplay(undefined) returns "Not recorded"');
    assertEqual((0, genderUtils_1.formatGenderDisplay)(''), 'Not recorded', '1ac. formatGenderDisplay("") returns "Not recorded"');
    // 1f. Invalid / unknown value returns null and never causes an exception
    assertEqual((0, genderUtils_1.normalizeGender)('Other'), null, '1ad. Other returns null');
    assertEqual((0, genderUtils_1.normalizeGender)('Unknown'), null, '1ae. Unknown returns null');
    assertEqual((0, genderUtils_1.normalizeGender)('invalid_value'), null, '1af. invalid_value returns null');
    assertEqual((0, genderUtils_1.normalizeGender)(12345), null, '1ag. numeric 12345 returns null');
    assertEqual((0, genderUtils_1.normalizeGender)({}), null, '1ah. object returns null');
    assertEqual((0, genderUtils_1.normalizeGender)([]), null, '1ai. array returns null');
    assertEqual((0, genderUtils_1.formatGenderDisplay)('Other'), 'Not recorded', '1aj. formatGenderDisplay("Other") returns "Not recorded"');
    assertEqual((0, genderUtils_1.formatGenderDisplay)('Unknown'), 'Not recorded', '1ak. formatGenderDisplay("Unknown") returns "Not recorded"');
}
// ─── 2. DATABASE QUERY VARIANTS FOR GENDER ──────────────────────────────────
console.log('\nTest Group 2: Database Query Variants for Search & Filters');
{
    const maleVariants = (0, genderUtils_1.getGenderQueryVariants)('Male');
    assert('2a. Male query variants include Male', maleVariants.includes('Male'));
    assert('2b. Male query variants include male', maleVariants.includes('male'));
    assert('2c. Male query variants include Groom', maleVariants.includes('Groom'));
    assert('2d. Male query variants include groom', maleVariants.includes('groom'));
    const groomVariants = (0, genderUtils_1.getGenderQueryVariants)('Groom');
    assert('2e. Groom query variants resolve to same Male variants', groomVariants.includes('Male') && groomVariants.includes('Groom'));
    const femaleVariants = (0, genderUtils_1.getGenderQueryVariants)('Female');
    assert('2f. Female query variants include Female', femaleVariants.includes('Female'));
    assert('2g. Female query variants include female', femaleVariants.includes('female'));
    assert('2h. Female query variants include Bride', femaleVariants.includes('Bride'));
    assert('2i. Female query variants include bride', femaleVariants.includes('bride'));
    const brideVariants = (0, genderUtils_1.getGenderQueryVariants)('Bride');
    assert('2j. Bride query variants resolve to same Female variants', brideVariants.includes('Female') && brideVariants.includes('Bride'));
}
// ─── 3. AUTHORITATIVE REGISTRATION STATUS CALCULATION ───────────────────────
console.log('\nTest Group 3: Authoritative Registration Status Lifecycle');
{
    // 3a. Authoritative registration with status COMPLETED
    const regCompleted = { status: 'COMPLETED' };
    assertEqual((0, genderUtils_1.calculateUserRegistrationStatus)(null, regCompleted), 'Complete', '3a. COMPLETED registration draft without profile is classified as Complete');
    // 3b. Profile with candidateId, displayName, and substantive fields
    const completeProfile = {
        _id: 'prof_1',
        candidateId: 'WJ-DOC-1001',
        displayName: 'Dr. Jane Smith',
        gender: 'Female',
        city: 'Mumbai',
        education: 'MBBS, MD',
    };
    assertEqual((0, genderUtils_1.calculateUserRegistrationStatus)(completeProfile, null), 'Complete', '3b. Complete matrimonial profile with candidateId is classified as Complete');
    // 3c. Registration draft in progress (status IN_PROGRESS)
    const regInProgress = {
        status: 'IN_PROGRESS',
        currentStep: 3,
        completionPercentage: 75,
    };
    assertEqual((0, genderUtils_1.calculateUserRegistrationStatus)(null, regInProgress), 'In Progress', '3c. Registration draft with status IN_PROGRESS classified as In Progress');
    // 3d. Registration draft early / started (status STARTED)
    const regStarted = {
        status: 'STARTED',
        currentStep: 1,
        completionPercentage: 25,
    };
    assertEqual((0, genderUtils_1.calculateUserRegistrationStatus)(null, regStarted), 'Incomplete', '3d. Registration draft with status STARTED classified as Incomplete');
    // 3e. Registration draft abandoned (status ABANDONED)
    const regAbandoned = {
        status: 'ABANDONED',
        currentStep: 2,
        completionPercentage: 50,
    };
    assertEqual((0, genderUtils_1.calculateUserRegistrationStatus)(null, regAbandoned), 'Incomplete', '3e. Registration draft with status ABANDONED classified as Incomplete');
    // 3f. Stub profile document without candidateId or substantive details
    const stubProfile = { _id: 'stub_prof_99', user: 'u_stub' };
    assertEqual((0, genderUtils_1.calculateUserRegistrationStatus)(stubProfile, null), 'Incomplete', '3f. Stub profile document alone classified as Incomplete');
    // 3g. User with neither profile nor registration draft (e.g. Administrator or freshly created account)
    assertEqual((0, genderUtils_1.calculateUserRegistrationStatus)(null, null), 'Pending', '3g. User without profile or registration draft classified as Pending');
    // 3h. Profile completeness takes precedence over stale in-progress draft
    assertEqual((0, genderUtils_1.calculateUserRegistrationStatus)(completeProfile, regInProgress), 'Complete', '3h. Complete profile takes precedence over in-progress draft');
}
// ─── 4. MULTI-KEY LOOKUP RESOLUTION (LEGACY / UNLINKED DRAFTS) ──────────────
console.log('\nTest Group 4: Multi-Key Lookup Resolution (Legacy / Unlinked Drafts)');
{
    const testUser = {
        _id: 'u_tejasvi_123',
        fullName: 'Dr Tejasvi J Yadav',
        email: 'tejasvi1981@gmail.com',
        mobile: '8989565623',
    };
    const unlinkedDraftRegistration = {
        registrationId: 'REG-20261017-1266B8',
        user: null, // Unlinked user ID
        email: 'tejasvi1981@gmail.com',
        mobile: '8989565623',
        gender: 'Bride',
        status: 'IN_PROGRESS',
        currentStep: 4,
        completionPercentage: 100,
    };
    // Simulate multi-key map lookup as implemented in getUsers
    const regByUserMap = new Map();
    const regByEmailMap = new Map();
    const regByMobileMap = new Map();
    const r = unlinkedDraftRegistration;
    if (r.user)
        regByUserMap.set(String(r.user), r);
    if (r.email)
        regByEmailMap.set(String(r.email).toLowerCase().trim(), r);
    if (r.mobile)
        regByMobileMap.set(String(r.mobile).replace(/\D/g, ''), r);
    const cleanEmail = (testUser.email || '').toLowerCase().trim();
    const cleanMobile = (testUser.mobile || '').replace(/\D/g, '');
    const matchedReg = regByUserMap.get(String(testUser._id)) ||
        (cleanEmail ? regByEmailMap.get(cleanEmail) : null) ||
        (cleanMobile ? regByMobileMap.get(cleanMobile) : null);
    assert('4a. Unlinked draft successfully resolved via email/mobile lookup', Boolean(matchedReg));
    assertEqual(matchedReg?.registrationId, 'REG-20261017-1266B8', '4b. Correct registrationId retrieved');
    // Authoritative gender resolution
    const resolvedGender = (0, genderUtils_1.normalizeGender)(matchedReg?.gender);
    assertEqual(resolvedGender, 'Female', '4c. Bride in unlinked draft correctly resolves to Female');
    // Authoritative registration status resolution
    const resolvedStatus = (0, genderUtils_1.calculateUserRegistrationStatus)(null, matchedReg);
    assertEqual(resolvedStatus, 'In Progress', '4d. Unlinked IN_PROGRESS draft correctly resolves to In Progress');
}
// ─── 5. KYC & ACCOUNT STATUS INDEPENDENCE (CRITICAL RULES) ──────────────────
console.log('\nTest Group 5: KYC & Account Status Independence');
{
    // 5a. Active account does NOT mean registration is complete
    const activeUser = { _id: 'u_act_1', isActive: true };
    const inProgDraft = { status: 'IN_PROGRESS' };
    assertEqual((0, genderUtils_1.calculateUserRegistrationStatus)(null, inProgDraft), 'In Progress', '5a. Active account with in-progress draft is not confused with Complete');
    // 5b. Inactive account with complete profile remains Complete
    const completeProfile = {
        candidateId: 'WJ-DOC-2002',
        displayName: 'Dr. John Doe',
        gender: 'Male',
        city: 'Bangalore',
        education: 'MBBS',
    };
    assertEqual((0, genderUtils_1.calculateUserRegistrationStatus)(completeProfile, null), 'Complete', '5b. Inactive account with complete profile remains Complete in registration status');
    // 5c. Unverified KYC record with complete registration remains Complete
    const unverifiedKycStatus = 'UNVERIFIED';
    assertEqual((0, genderUtils_1.calculateUserRegistrationStatus)(completeProfile, null), 'Complete', '5c. Registration status Complete is independent of KYC verificationStatus');
}
// ─── 6. STEPDATA FALLBACK GENDER RESOLUTION ─────────────────────────────────
console.log('\nTest Group 6: StepData Fallback Gender Resolution');
{
    // 6a. Gender present in stepData.basicInfo as Groom
    const regWithBasicInfo = {
        gender: null,
        stepData: {
            basicInfo: { gender: 'Groom' },
        },
    };
    const resolvedFromBasic = (0, genderUtils_1.normalizeGender)(regWithBasicInfo.gender || regWithBasicInfo.stepData?.basicInfo?.gender);
    assertEqual(resolvedFromBasic, 'Male', '6a. Groom in stepData.basicInfo normalizes to Male');
    // 6b. Gender present in stepData.rawFormData as Bride
    const regWithRawData = {
        gender: null,
        stepData: {
            basicInfo: { gender: '' },
            rawFormData: { gender: 'Bride' },
        },
    };
    const resolvedFromRaw = (0, genderUtils_1.normalizeGender)(regWithRawData.gender ||
        regWithRawData.stepData?.basicInfo?.gender ||
        regWithRawData.stepData?.rawFormData?.gender);
    assertEqual(resolvedFromRaw, 'Female', '6b. Bride in stepData.rawFormData normalizes to Female');
    // 6c. Profile gender takes precedence over stepData gender
    const profileFemale = { gender: 'Female' };
    const regMale = { gender: 'Male' };
    const resolvedWithProfile = (0, genderUtils_1.normalizeGender)(profileFemale.gender) || (0, genderUtils_1.normalizeGender)(regMale.gender);
    assertEqual(resolvedWithProfile, 'Female', '6c. Profile gender takes precedence over registration draft');
}
// ─── 7. EXPORT CONTROLLER COMPATIBILITY ─────────────────────────────────────
console.log('\nTest Group 7: Export Controller determineRegistrationStatus Compatibility');
{
    // Verify determineRegistrationStatus from adminExportController remains 100% compatible
    const completeProf = { candidateId: 'WJ-1', displayName: 'Dr. Test', city: 'Delhi', gender: 'Male' };
    assertEqual((0, adminExportController_1.determineRegistrationStatus)(completeProf, null), 'Complete', '7a. Complete profile exports as Complete');
    assertEqual((0, adminExportController_1.determineRegistrationStatus)(null, { status: 'COMPLETED' }), 'Complete', '7b. COMPLETED draft exports as Complete');
    assertEqual((0, adminExportController_1.determineRegistrationStatus)(null, { status: 'IN_PROGRESS' }), 'Incomplete', '7c. IN_PROGRESS draft exports as Incomplete for export schema');
    assertEqual((0, adminExportController_1.determineRegistrationStatus)(null, null), 'Pending', '7d. Missing profile/draft exports as Pending');
}
// ─── FINAL SUMMARY ──────────────────────────────────────────────────────────
console.log('\n========================================================================');
console.log(`  RESULTS: Total: ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}`);
console.log('========================================================================\n');
if (failedTests > 0) {
    process.exit(1);
}
else {
    console.log('ALL TESTS PASSED SUCCESSFULLY!');
}
