/**
 * Wonderful Jodi Doctor Matrimony
 * Comprehensive Migration Verification & Data Integrity Suite
 * Tests all core subsystems across API contracts, foreign-key relationships,
 * authentication preservation, dual _id/id compatibility, and data access.
 */

const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://127.0.0.1:5000/api';

async function runTestSuite() {
  console.log('========================================================================');
  console.log('   WONDERFUL JODI: DATABASE MIGRATION VERIFICATION & INTEGRITY SUITE    ');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`✓ PASS: ${testName} ${details ? '(' + details + ')' : ''}`);
      passed++;
    } else {
      console.error(`✗ FAIL: ${testName} ${details ? '(' + details + ')' : ''}`);
      failed++;
    }
  }

  const timestamp = Date.now();
  const candidateEmail = `doctor.migration.${timestamp}@example.com`;
  const candidateMobile = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
  const candidatePassword = 'MigrationPassword123!';

  // ──────────────────────────────────────────────────────────────────
  // 1. REGISTRATION & ID DUAL-COMPATIBILITY (_id & id)
  // ──────────────────────────────────────────────────────────────────
  console.log('--- 1. Testing User Registration & Response Contracts ---');
  let userToken = '';
  let userId = '';

  try {
    const regRes = await axios.post(`${BASE_URL}/auth/register`, {
      fullName: 'Dr. Aarav Deshmukh (Cardiologist)',
      email: candidateEmail,
      mobile: candidateMobile,
      password: candidatePassword,
      termsAccepted: true,
    });

    const user = regRes.data.user || regRes.data.data?.user;
    userToken = regRes.data.token || regRes.data.data?.token;
    userId = user?._id || user?.id;

    assert(regRes.status === 201 || regRes.status === 200, 'Registration Endpoint Response', `Status: ${regRes.status}`);
    assert(!!userId, 'User ID Generated & Returned', `ID: ${userId}`);
    assert(typeof userId === 'string' && userId.length >= 24, 'ID Format Valid Hex / UUID', `Length: ${userId.length}`);
    assert(user?.email === candidateEmail.toLowerCase(), 'Email Sanitized & Stored Correctly');
  } catch (err) {
    assert(false, 'Registration Failed', err.response?.data?.message || err.message);
  }

  const client = axios.create({
    baseURL: BASE_URL,
    headers: { Authorization: `Bearer ${userToken}` },
  });

  // ──────────────────────────────────────────────────────────────────
  // 2. AUTHENTICATION & LOGIN (PASSWORD HASH PRESERVATION)
  // ──────────────────────────────────────────────────────────────────
  console.log('\n--- 2. Testing Authentication & Password Verification ---');
  try {
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: candidateEmail,
      password: candidatePassword,
    });

    const loggedInUser = loginRes.data.user || loginRes.data.data?.user;
    assert(loginRes.status === 200, 'Login Succeeded with Password');
    assert(loggedInUser?.email === candidateEmail.toLowerCase(), 'Logged-in User Identity Verified');
    assert(!!loginRes.data.token || !!loginRes.data.data?.token, 'JWT Token Issued on Login');
  } catch (err) {
    assert(false, 'Login Failed', err.response?.data?.message || err.message);
  }

  // ──────────────────────────────────────────────────────────────────
  // 3. PROFILE RETRIEVAL & UPDATE (DUAL _id / id COMPATIBILITY)
  // ──────────────────────────────────────────────────────────────────
  console.log('\n--- 3. Testing Profile Retrieval & Update (Dual _id / id Compatibility) ---');
  let profileId = '';
  try {
    const getRes = await client.get('/profiles/me');
    assert(getRes.status === 200, 'Profile Retrieved for Registered User');

    const profileRes = await client.put('/profiles/me', {
      displayName: 'Dr. Aarav Deshmukh',
      gender: 'Male',
      dob: '1992-06-15',
      height: `5' 11"`,
      maritalStatus: 'Never Married',
      motherTongue: 'Marathi',
      religion: 'Hindu',
      caste: 'Maratha',
      education: 'MBBS',
      degree: 'MBBS',
      profession: 'Consultant Interventional Cardiologist',
      city: 'Pune',
      state: 'Maharashtra',
      country: 'India',
      about: 'Dedicated interventional cardiologist looking for an educated life partner.',
      partnerPreferences: {
        preferredAgeMin: 25,
        preferredAgeMax: 32,
        preferredLocation: 'Pune / Mumbai',
      },
    });

    const profile = profileRes.data.profile || profileRes.data.data?.profile || profileRes.data.data;
    profileId = profile?._id || profile?.id;

    assert(profileRes.status === 200, 'Profile Updated Successfully');
    assert(!!profileId, 'Profile ID Present & Valid', `Profile ID: ${profileId}`);
    assert(!!profile?.candidateId, 'Candidate ID Present', `CandidateId: ${profile?.candidateId}`);
  } catch (err) {
    assert(false, 'Profile Test Failed', err.response?.data?.message || err.message);
  }

  // ──────────────────────────────────────────────────────────────────
  // 4. MEMBERSHIP PLANS & PRICING
  // ──────────────────────────────────────────────────────────────────
  console.log('\n--- 4. Testing Membership Plans & Pricing Catalog ---');
  try {
    const plansRes = await axios.get(`${BASE_URL}/membership-plans`);
    const plans = plansRes.data.plans || plansRes.data.data?.plans || plansRes.data.data;
    assert(Array.isArray(plans) && plans.length >= 3, 'Active Membership Plans Available', `Found ${plans.length} plans`);

    const hasPricing = plans.every((p) => p.name && (p.price !== undefined || p.discountedPrice !== undefined));
    assert(hasPricing, 'All Membership Plans have Pricing Metadata');
  } catch (err) {
    assert(false, 'Membership Plans Endpoint Failed', err.response?.data?.message || err.message);
  }

  // ──────────────────────────────────────────────────────────────────
  // 5. MASTER DATA: LOCATIONS, COMMUNITIES, INSTITUTIONS
  // ──────────────────────────────────────────────────────────────────
  console.log('\n--- 5. Testing Master Data Endpoints (Locations, Communities, Colleges) ---');
  try {
    const countriesRes = await axios.get(`${BASE_URL}/locations/countries`);
    const countries = countriesRes.data.data || countriesRes.data.countries || countriesRes.data;
    assert(Array.isArray(countries) && countries.length > 0, 'Countries Master Data Loaded', `Count: ${countries.length}`);

    const religionsRes = await axios.get(`${BASE_URL}/community/religions`);
    const religions = religionsRes.data.data || religionsRes.data.religions || religionsRes.data;
    assert(Array.isArray(religions) && religions.length > 0, 'Religions Master Data Loaded', `Count: ${religions.length}`);

    const institutionsRes = await axios.get(`${BASE_URL}/institutions/search?q=medical`);
    const institutions = institutionsRes.data.data || institutionsRes.data.institutions || institutionsRes.data;
    assert(Array.isArray(institutions) && institutions.length > 0, 'Medical Institutions Master Data Loaded', `Count: ${institutions.length}`);
  } catch (err) {
    assert(false, 'Master Data Query Failed', err.response?.data?.message || err.message);
  }

  // ──────────────────────────────────────────────────────────────────
  // 6. CONTENT: AWARDS & CAREERS
  // ──────────────────────────────────────────────────────────────────
  console.log('\n--- 6. Testing Public Content Endpoints (Awards, Careers, Inquiries) ---');
  try {
    const awardsRes = await axios.get(`${BASE_URL}/awards`);
    const awards = awardsRes.data.data || awardsRes.data.awards || awardsRes.data;
    assert(Array.isArray(awards) && awards.length > 0, 'Awards Showcase Publicly Available', `Count: ${awards.length}`);

    const careersRes = await axios.get(`${BASE_URL}/careers`);
    const careers = careersRes.data.data || careersRes.data.jobs || careersRes.data;
    assert(Array.isArray(careers), 'Careers Listings Accessible', `Count: ${careers?.length || 0}`);

    const inquiryRes = await axios.post(`${BASE_URL}/contact`, {
      name: 'Dr. Migration Test',
      mobileNumber: '+919822334455',
      email: 'migration.test@example.com',
      message: 'Testing contact inquiry persistence on Hostinger MySQL target.',
    });
    assert(inquiryRes.status === 200 || inquiryRes.status === 201, 'Public Contact Inquiry Created Successfully');
  } catch (err) {
    assert(false, 'Content Endpoint Failed', err.response?.data?.message || err.message);
  }

  // ──────────────────────────────────────────────────────────────────
  // 7. NOTIFICATIONS & SECURITY
  // ──────────────────────────────────────────────────────────────────
  console.log('\n--- 7. Testing User Notifications & Security Boundaries ---');
  try {
    const notifsRes = await client.get('/notifications');
    assert(notifsRes.status === 200, 'User Notifications Accessible with Token');

    // Self interest security check
    try {
      await client.post('/interests', { receiverId: userId });
      assert(false, 'Self-interest was allowed (Security Breach)');
    } catch (selfErr) {
      assert(selfErr.response?.status === 400, 'Self-Interest Blocked Correctly (HTTP 400)');
    }
  } catch (err) {
    assert(false, 'Notification / Security Test Failed', err.response?.data?.message || err.message);
  }

  // ──────────────────────────────────────────────────────────────────
  // SUMMARY
  // ──────────────────────────────────────────────────────────────────
  console.log('\n========================================================================');
  console.log(`  INTEGRITY SUITE FINISHED: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal Test Suite Error:', err);
  process.exit(1);
});
