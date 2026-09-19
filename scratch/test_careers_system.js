const path = require('path');
const jwt = require(path.join(__dirname, '../backend/node_modules/jsonwebtoken'));

const API_BASE = 'http://localhost:5000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_wonderfuljodi_dev_key_2026';

const adminToken = jwt.sign(
  {
    userId: '65f000000000000000000001',
    role: 'admin',
    email: 'superadmin@wonderfuljodi.com',
  },
  JWT_SECRET,
  { expiresIn: '1h' }
);

const userToken = jwt.sign(
  {
    userId: '65f000000000000000000002',
    role: 'user',
    email: 'doctor.user@example.com',
  },
  JWT_SECRET,
  { expiresIn: '1h' }
);

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  let data = null;
  try {
    data = await res.json();
  } catch (e) {}
  return { status: res.status, ok: res.ok, data };
}

async function runAllTests() {
  console.log('====================================================');
  console.log('🚀 RUNNING CAREERS MANAGEMENT SYSTEM END-TO-END TESTS');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, extra = '') {
    if (condition) {
      console.log(`✅ [PASS] ${testName} ${extra}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} ${extra}`);
      failed++;
    }
  }

  // ─── 1. PUBLIC TESTS ───
  console.log('--- 1. Testing Public Careers API (/api/careers) ---');
  const pubRes = await request('/careers');
  assert(pubRes.status === 200, 'Public GET /api/careers returns 200');
  assert(pubRes.data && pubRes.data.success === true, 'Response format has success: true');
  assert(Array.isArray(pubRes.data.data), 'Returns data array of job openings');
  assert(pubRes.data.data.length >= 5, `Returns at least 5 seeded jobs (found ${pubRes.data.data.length})`);
  assert(Array.isArray(pubRes.data.departments), 'Returns list of departments');

  // Verify fields on job cards
  const firstJob = pubRes.data.data[0];
  assert(firstJob.title && firstJob.slug && firstJob.department, 'First job has title, slug, department');
  assert(firstJob.workMode && firstJob.employmentType, 'First job has workMode and employmentType');
  assert(firstJob.shortDescription, 'First job has shortDescription');
  assert(firstJob.status === 'OPEN', 'First job has status OPEN');

  // Test filter by department
  const clientServicesRes = await request('/careers?department=Client%20Services');
  assert(clientServicesRes.status === 200, 'Department filter returns 200');
  assert(clientServicesRes.data.data.every(j => j.department === 'Client Services'), 'Department filter matches only Client Services');

  // Test filter by workMode
  const remoteRes = await request('/careers?workMode=Remote');
  assert(remoteRes.status === 200, 'WorkMode filter returns 200');
  assert(remoteRes.data.data.every(j => j.workMode === 'Remote'), 'WorkMode filter matches only Remote');

  // Test search query
  const searchRes = await request('/careers?search=Engineer');
  assert(searchRes.status === 200, 'Search query returns 200');
  assert(searchRes.data.data.some(j => j.title.includes('Engineer')), 'Search finds Senior Full Stack Engineer');

  // ─── 2. SINGLE CAREER BY SLUG ───
  console.log('\n--- 2. Testing Public Single Career API (/api/careers/:slug) ---');
  const slugRes = await request(`/careers/${firstJob.slug}`);
  assert(slugRes.status === 200, `GET /api/careers/${firstJob.slug} returns 200`);
  assert(slugRes.data.data.title === firstJob.title, 'Returns matching job title');
  assert(Array.isArray(slugRes.data.data.responsibilities), 'Returns responsibilities array');
  assert(Array.isArray(slugRes.data.data.requirements), 'Returns requirements array');

  // 404 for invalid slug
  const notFoundRes = await request('/careers/non-existent-role-xyz-999');
  assert(notFoundRes.status === 404, 'GET invalid slug returns 404');

  // ─── 3. JOB APPLICATION FLOW ───
  console.log('\n--- 3. Testing Candidate Job Application (/api/careers/:slug/apply) ---');
  const applyPayload = {
    candidateName: 'Dr. Sameer Joshi',
    email: 'dr.sameer.joshi@example.com',
    mobile: '+91 9876543299',
    experienceYears: '4 years',
    resumeUrl: 'https://drive.google.com/file/d/test-doc-123/view',
    coverLetter: 'Passionate about medical matchmaking and client relations.',
  };

  const applyRes = await request(`/careers/${firstJob.slug}/apply`, {
    method: 'POST',
    body: JSON.stringify(applyPayload),
  });
  assert(applyRes.status === 201, 'POST /api/careers/:slug/apply creates application (201)');
  assert(applyRes.data.success === true, 'Application submission returns success: true');

  // Test duplicate prevention
  const dupApplyRes = await request(`/careers/${firstJob.slug}/apply`, {
    method: 'POST',
    body: JSON.stringify(applyPayload),
  });
  assert(dupApplyRes.status === 400, 'Submitting duplicate application within 7 days returns 400');

  // ─── 4. PERMISSIONS & ROLE-BASED ACCESS CONTROL ───
  console.log('\n--- 4. Testing Security & Admin Authorization ---');
  const unauthRes = await request('/admin/careers');
  assert(unauthRes.status === 401, 'Unauthenticated GET /api/admin/careers rejected with 401');

  const memberRes = await request('/admin/careers', {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  assert(memberRes.status === 403, 'Regular member token rejected with 403 (insufficient permissions)');

  // ─── 5. ADMIN MANAGEMENT FLOW (CRUD, DRAFT, PUBLISH, CLOSE, SOFT-DELETE) ───
  console.log('\n--- 5. Testing Admin Careers Management CRUD Flow ---');
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };

  // 5.1 List All Careers & Stats
  const adminListRes = await request('/admin/careers', { headers: adminHeaders });
  assert(adminListRes.status === 200, 'Admin GET /api/admin/careers returns 200');
  assert(adminListRes.data.stats && adminListRes.data.stats.total >= 5, 'Returns summary statistics');
  assert(typeof adminListRes.data.stats.published === 'number', 'Stats includes published count');
  assert(typeof adminListRes.data.stats.draft === 'number', 'Stats includes draft count');
  assert(typeof adminListRes.data.stats.closed === 'number', 'Stats includes closed count');
  assert(typeof adminListRes.data.stats.archived === 'number', 'Stats includes archived count');

  // 5.2 Create a New Job Opening as DRAFT
  const newJobPayload = {
    title: 'Lead Pediatric Matrimony Consultant',
    department: 'Speciality Matchmaking',
    location: 'Mumbai / Remote',
    workMode: 'Remote',
    employmentType: 'Full-time',
    experience: '3-6 years',
    salaryRange: '₹8,00,000 - ₹12,00,000 P.A.',
    shortDescription: 'Lead dedicated matching portfolios for pediatricians and child health specialists.',
    fullDescription: 'Comprehensive consulting role helping pediatricians find life partners with shared schedules and values.',
    responsibilities: ['Profile matching for pediatric doctors', 'Family consultations'],
    requirements: ['Consulting experience', 'Doctor communication fluency'],
    qualifications: ["Master's degree"],
    skills: ['Pediatrics Knowledge', 'Empathy', 'Consulting'],
    benefits: ['Remote setup', 'Bonus'],
    status: 'DRAFT',
    isPublished: false,
    displayOrder: 10,
  };

  const createRes = await request('/admin/careers', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify(newJobPayload),
  });
  assert(createRes.status === 201, 'Admin POST /api/admin/careers creates opening (201)');
  const createdJob = createRes.data.data;
  assert(createdJob && createdJob._id, 'Created opening has valid _id');
  assert(createdJob.status === 'DRAFT', 'Created opening status is DRAFT');
  assert(createdJob.isPublished === false, 'Created opening isPublished is false');

  // 5.3 Confirm DRAFT opening does NOT appear on public Careers page
  const pubCheck1 = await request('/careers');
  assert(!pubCheck1.data.data.some(j => j._id === createdJob._id), 'DRAFT opening is hidden from public /api/careers');

  // 5.4 Publish the opening
  const publishRes = await request(`/admin/careers/${createdJob._id}/publish`, {
    method: 'PATCH',
    headers: adminHeaders,
    body: JSON.stringify({ isPublished: true }),
  });
  assert(publishRes.status === 200, 'Admin PATCH /publish toggles isPublished to true');

  // Status also needs to be OPEN to appear publicly
  await request(`/admin/careers/${createdJob._id}/status`, {
    method: 'PATCH',
    headers: adminHeaders,
    body: JSON.stringify({ status: 'OPEN' }),
  });

  // 5.5 Confirm it now appears on public Careers page
  const pubCheck2 = await request('/careers');
  assert(pubCheck2.data.data.some(j => j._id === createdJob._id), 'Published opening now appears on public /api/careers');

  // 5.6 Edit the opening
  const updateRes = await request(`/admin/careers/${createdJob._id}`, {
    method: 'PATCH',
    headers: adminHeaders,
    body: JSON.stringify({
      title: 'Senior Pediatric Matrimony Consultant',
      salaryRange: '₹10,00,000 - ₹14,00,000 P.A.',
    }),
  });
  assert(updateRes.status === 200, 'Admin PATCH /:id updates opening details');
  assert(updateRes.data.data.title === 'Senior Pediatric Matrimony Consultant', 'Updated title saved');

  // Verify updated title in public page
  const pubCheck3 = await request(`/careers/${createdJob.slug}`);
  assert(pubCheck3.data.data.title === 'Senior Pediatric Matrimony Consultant', 'Updated title appears on public slug detail');

  // 5.7 Close the opening
  const closeRes = await request(`/admin/careers/${createdJob._id}/status`, {
    method: 'PATCH',
    headers: adminHeaders,
    body: JSON.stringify({ status: 'CLOSED' }),
  });
  assert(closeRes.status === 200, 'Admin PATCH /status changes status to CLOSED');

  // Confirm closed opening is removed from active public list
  const pubCheck4 = await request('/careers');
  assert(!pubCheck4.data.data.some(j => j._id === createdJob._id), 'CLOSED opening is removed from public active list');

  // 5.8 Soft-Delete the opening
  const deleteRes = await request(`/admin/careers/${createdJob._id}`, {
    method: 'DELETE',
    headers: adminHeaders,
  });
  assert(deleteRes.status === 200, 'Admin DELETE /:id executes soft deletion');

  // Verify it is not in public
  const pubCheck5 = await request(`/careers/${createdJob.slug}`);
  assert(pubCheck5.status === 404, 'Soft-deleted opening returns 404 publicly');

  // 5.9 Check Audit Log
  const auditRes = await request('/admin/audit-logs?targetModel=JobOpening', { headers: adminHeaders });
  if (auditRes.status === 200) {
    const logs = auditRes.data.data || auditRes.data.logs || auditRes.data;
    const hasCareerLogs = Array.isArray(logs) && logs.some(l => l.targetModel === 'JobOpening');
    assert(hasCareerLogs, 'AuditLog collection contains recorded JobOpening administrative actions');
  } else {
    console.log('ℹ️ AuditLog query endpoint status:', auditRes.status);
  }

  console.log('\n====================================================');
  console.log(`🏁 TEST SUITE COMPLETED: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
