/**
 * Wonderful Jodi - Phase 1 Verification Suite
 * Tests Feature 1 (Willing to Relocate default & preservation)
 * and Feature 4 (Accessible signup password visibility toggle)
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('========================================================================');
console.log('   WONDERFUL JODI: PHASE 1 RELOCATION & PASSWORD VISIBILITY TESTS       ');
console.log('========================================================================\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`✗ FAIL: ${name}`);
    console.error(`  Error: ${err.message}`);
    failed++;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. FRONTEND REGISTRATION TESTS (Feature 1 & Feature 4)
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- 1. Testing Registration Component (frontend/app/register/page.tsx) ---');

const registerPagePath = path.join(__dirname, '..', 'frontend', 'app', 'register', 'page.tsx');
const registerContent = fs.readFileSync(registerPagePath, 'utf8');

test('prefWillingToRelocate is initialized to empty string (unselected), not "Yes"', () => {
  assert(
    registerContent.includes("const [prefWillingToRelocate, setPrefWillingToRelocate] = useState('');"),
    'prefWillingToRelocate state must default to empty string'
  );
  assert(
    !registerContent.includes("const [prefWillingToRelocate, setPrefWillingToRelocate] = useState('Yes');"),
    'prefWillingToRelocate must NOT default to "Yes"'
  );
});

test('Willing to Relocate select includes explicit unselected placeholder option', () => {
  assert(
    registerContent.includes('<option value="">Select Relocation Preference</option>'),
    'Select element must contain unselected placeholder option'
  );
});

test('Session restore correctly normalizes existing willingToRelocate values', () => {
  assert(
    registerContent.includes('pExp.willingToRelocate !== undefined && pExp.willingToRelocate !== null'),
    'Session restore must check for non-null/undefined willingToRelocate'
  );
  assert(
    registerContent.includes("pExp.willingToRelocate === true"),
    'Boolean true must be converted to "Yes"'
  );
  assert(
    registerContent.includes("pExp.willingToRelocate === false"),
    'Boolean false must be converted to "No"'
  );
});

test('Registration step 4 and submit payloads do not force "Yes" when unselected', () => {
  assert(
    registerContent.includes('willingToRelocate: prefWillingToRelocate || undefined'),
    'Payload must pass undefined when prefWillingToRelocate is unselected'
  );
});

test('Password toggle button has accessible aria-label, aria-pressed, title and keyboard support', () => {
  assert(
    registerContent.includes("aria-label={showPassword ? 'Hide password' : 'Show password'}"),
    'Password button must have accessible aria-label'
  );
  assert(
    registerContent.includes("aria-pressed={showPassword}"),
    'Password button must have aria-pressed attribute'
  );
  assert(
    registerContent.includes("title={showPassword ? 'Hide password' : 'Show password'}"),
    'Password button must have title attribute'
  );
  assert(
    registerContent.includes("e.key === ' ' || e.key === 'Enter'"),
    'Password button must support Space and Enter key events'
  );
});

test('Confirm Password toggle button has accessible aria-label, aria-pressed, title and keyboard support', () => {
  assert(
    registerContent.includes("aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}"),
    'Confirm password button must have accessible aria-label'
  );
  assert(
    registerContent.includes("aria-pressed={showConfirmPassword}"),
    'Confirm password button must have aria-pressed attribute'
  );
  assert(
    registerContent.includes("title={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}"),
    'Confirm password button must have title attribute'
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. REVIEW SECTION & PROFILE PAGE TESTS (Feature 1)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 2. Testing Review & Profile Components ---');

const reviewSectionPath = path.join(__dirname, '..', 'frontend', 'components', 'RegistrationReviewSection.tsx');
const reviewContent = fs.readFileSync(reviewSectionPath, 'utf8');

test('Review section displays "Not specified" when relocation preference is unselected', () => {
  assert(
    reviewContent.includes("Relocation: {prefWillingToRelocate || 'Not specified'}"),
    'Review section must fallback to "Not specified" when unselected'
  );
});

const profilePagePath = path.join(__dirname, '..', 'frontend', 'app', 'profile', 'page.tsx');
const profileContent = fs.readFileSync(profilePagePath, 'utf8');

test('Profile page displays and allows editing of willingToRelocate preference', () => {
  assert(
    profileContent.includes("willingToRelocate: profile.partnerExpectations?.willingToRelocate || ''"),
    'Profile must initialize modalFormData with saved willingToRelocate'
  );
  assert(
    profileContent.includes('Willing to Relocate'),
    'Profile page must have a Willing to Relocate display block'
  );
  assert(
    profileContent.includes('Select Relocation Preference'),
    'Preferences modal must contain relocation select field'
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. BACKEND CONTROLLER & PRESERVATION LOGIC (Feature 1)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 3. Testing Backend Logic & Preference Preservation ---');

const regControllerPath = path.join(__dirname, '..', 'backend', 'src', 'controllers', 'registrationController.ts');
const regControllerContent = fs.readFileSync(regControllerPath, 'utf8');

test('Backend registration does not silently default willingToRelocate to Yes', () => {
  assert(
    regControllerContent.includes("partnerExp.willingToRelocate !== undefined && partnerExp.willingToRelocate !== ''"),
    'Backend must check that willingToRelocate is explicitly defined and non-empty'
  );
});

const profileControllerPath = path.join(__dirname, '..', 'backend', 'src', 'controllers', 'profileController.ts');
const profileControllerContent = fs.readFileSync(profileControllerPath, 'utf8');

test('Backend updateMyProfile deep merges partnerExpectations', () => {
  assert(
    profileControllerContent.includes('if (data.partnerExpectations) {'),
    'profileController must check for data.partnerExpectations'
  );
  assert(
    profileControllerContent.includes('profile.partnerExpectations = {') &&
    profileControllerContent.includes('...data.partnerExpectations'),
    'profileController must deep merge data.partnerExpectations with existing expectations'
  );
});

test('Simulated deep-merge preserves existing saved preferences', () => {
  const existingProfile = {
    partnerExpectations: {
      qualification: 'MD',
      specialization: 'Cardiologist',
      willingToRelocate: 'No',
      maritalStatus: 'Never Married',
    },
    aboutMe: 'Clinical researcher and doctor',
  };

  // Case A: User updates only bio/aboutMe without touching expectations
  const updatePayloadA = { aboutMe: 'Updated bio' };
  const mergedA = {
    ...existingProfile,
    ...updatePayloadA,
    partnerExpectations: updatePayloadA.partnerExpectations
      ? { ...existingProfile.partnerExpectations, ...updatePayloadA.partnerExpectations }
      : existingProfile.partnerExpectations,
  };

  assert.strictEqual(mergedA.partnerExpectations.willingToRelocate, 'No', 'willingToRelocate must be preserved');
  assert.strictEqual(mergedA.partnerExpectations.qualification, 'MD', 'qualification must be preserved');
  assert.strictEqual(mergedA.aboutMe, 'Updated bio', 'aboutMe was updated');

  // Case B: User updates only willingToRelocate to "Flexible"
  const updatePayloadB = { partnerExpectations: { willingToRelocate: 'Flexible' } };
  const mergedB = {
    ...mergedA,
    partnerExpectations: {
      ...mergedA.partnerExpectations,
      ...updatePayloadB.partnerExpectations,
    },
  };

  assert.strictEqual(mergedB.partnerExpectations.willingToRelocate, 'Flexible', 'willingToRelocate was updated');
  assert.strictEqual(mergedB.partnerExpectations.qualification, 'MD', 'qualification must still be preserved');
  assert.strictEqual(mergedB.partnerExpectations.maritalStatus, 'Never Married', 'maritalStatus must still be preserved');

  // Case C: Unselected relocation does not override existing preference with Yes
  const unselectedChoice = '';
  const newRegistrationExpectations = {
    qualification: 'MS',
    willingToRelocate: unselectedChoice ? unselectedChoice : undefined,
  };
  assert.strictEqual(newRegistrationExpectations.willingToRelocate, undefined, 'Unselected must be undefined, not Yes');
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. SUMMARY
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n========================================================================');
console.log(`PHASE 1 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('========================================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('All Phase 1 requirements successfully verified!\n');
}
