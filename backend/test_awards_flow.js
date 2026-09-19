const axios = require('axios');
const jwt = require('jsonwebtoken');

const BASE_URL = 'http://localhost:5000';
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_wonderfuljodi_dev_key_2026';

// Mock super admin payload matching requireAdminAuth
const adminToken = jwt.sign(
  {
    userId: 'admin_test_123',
    email: 'admin@wonderfuljodi.com',
    role: 'admin',
    fullName: 'Test Super Admin',
  },
  JWT_SECRET,
  { expiresIn: '1h' }
);

async function runTests() {
  console.log('=== STARTING AWARDS ENDPOINT VERIFICATION ===\n');

  try {
    // 1. GET /api/awards (Public active awards)
    console.log('1. Testing GET /api/awards (Public)...');
    const res1 = await axios.get(`${BASE_URL}/api/awards`);
    console.log(`   Status: ${res1.status}, Count: ${res1.data.count}`);
    if (!res1.data.success || res1.data.count < 1) {
      throw new Error('Failed to retrieve seeded awards');
    }
    const sampleAward = res1.data.data[0];
    console.log(`   Sample Award: "${sampleAward.name}" (slug: ${sampleAward.slug})\n`);

    // 2. GET /api/awards?featured=true
    console.log('2. Testing GET /api/awards?featured=true...');
    const res2 = await axios.get(`${BASE_URL}/api/awards?featured=true`);
    console.log(`   Status: ${res2.status}, Featured count: ${res2.data.count}\n`);

    // 3. GET /api/awards/:slug (Single Public Award)
    console.log(`3. Testing GET /api/awards/${sampleAward.slug}...`);
    const res3 = await axios.get(`${BASE_URL}/api/awards/${sampleAward.slug}`);
    console.log(`   Status: ${res3.status}, Name: ${res3.data.data.name}\n`);

    // 4. GET /api/awards/non-existent-slug (Should return 404)
    console.log('4. Testing GET /api/awards/non-existent-slug (Expect 404)...');
    try {
      await axios.get(`${BASE_URL}/api/awards/non-existent-slug`);
      throw new Error('Expected 404 but got 200');
    } catch (err) {
      if (err.response && err.response.status === 404) {
        console.log('   Correctly returned 404 Not Found.\n');
      } else {
        throw err;
      }
    }

    // 5. Admin endpoints without token (Expect 401 Unauthorized)
    console.log('5. Testing GET /api/admin/awards without token (Expect 401)...');
    try {
      await axios.get(`${BASE_URL}/api/admin/awards`);
      throw new Error('Expected 401 but got 200');
    } catch (err) {
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        console.log('   Correctly protected by requireAdminAuth (401/403).\n');
      } else {
        throw err;
      }
    }

    // 6. Admin GET /api/admin/awards with token
    console.log('6. Testing GET /api/admin/awards with admin token...');
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };
    const res6 = await axios.get(`${BASE_URL}/api/admin/awards`, { headers: adminHeaders });
    console.log(`   Status: ${res6.status}, Total in DB: ${res6.data.stats.total}\n`);

    // 7. Admin POST /api/admin/awards/upload-image (Base64 upload)
    console.log('7. Testing Base64 Image Upload /api/admin/awards/upload-image...');
    // Minimal 1x1 transparent PNG Base64
    const tinyPngBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const res7 = await axios.post(
      `${BASE_URL}/api/admin/awards/upload-image`,
      { base64: tinyPngBase64, filename: 'test_badge.png' },
      { headers: adminHeaders }
    );
    console.log(`   Status: ${res7.status}, Uploaded URL: ${res7.data.url}\n`);

    // 8. Admin POST /api/admin/awards (Create New Award)
    console.log('8. Testing POST /api/admin/awards (Create Award)...');
    const newAwardPayload = {
      name: 'Asia Pacific Healthcare Trust Icon 2026',
      awardYear: 2026,
      category: 'Healthcare Excellence',
      organization: 'Asia Pacific Medical Association',
      logo: res7.data.url,
      shortDescription: 'Conferred for pioneering verified matchmaking and data safety protocols.',
      fullDescription: 'Full citation: The committee unanimously awarded Wonderful Jodi for stellar trust and credibility.',
      galleryImages: [res7.data.url],
      websiteUrl: 'https://asiapacific-medical.org',
      displayOrder: 1,
      isActive: true,
      isFeatured: true,
    };
    const res8 = await axios.post(`${BASE_URL}/api/admin/awards`, newAwardPayload, { headers: adminHeaders });
    const createdAward = res8.data.data;
    console.log(`   Created: "${createdAward.name}" (ID: ${createdAward._id}, slug: ${createdAward.slug})\n`);

    // 9. Admin PATCH /api/admin/awards/:id/status (Toggle Inactive)
    console.log(`9. Testing PATCH /api/admin/awards/${createdAward._id}/status (Deactivate)...`);
    const res9 = await axios.patch(
      `${BASE_URL}/api/admin/awards/${createdAward._id}/status`,
      { isActive: false },
      { headers: adminHeaders }
    );
    console.log(`   Status: ${res9.status}, isActive: ${res9.data.data.isActive}\n`);

    // Verify it is NOT returned in public listing now
    const res9b = await axios.get(`${BASE_URL}/api/awards`);
    const foundInPublic = res9b.data.data.some(a => a._id === createdAward._id);
    console.log(`   Present in public awards list while inactive? ${foundInPublic} (Expected false)\n`);

    // 10. Admin PATCH /api/admin/awards/:id/featured (Toggle Featured)
    console.log(`10. Testing PATCH /api/admin/awards/${createdAward._id}/featured...`);
    const res10 = await axios.patch(
      `${BASE_URL}/api/admin/awards/${createdAward._id}/featured`,
      { isFeatured: false },
      { headers: adminHeaders }
    );
    console.log(`   Status: ${res10.status}, isFeatured: ${res10.data.data.isFeatured}\n`);

    // 11. Admin PUT /api/admin/awards/:id (Update Award)
    console.log(`11. Testing PUT /api/admin/awards/${createdAward._id}...`);
    const res11 = await axios.put(
      `${BASE_URL}/api/admin/awards/${createdAward._id}`,
      { name: 'Asia Pacific Healthcare Trust Icon 2026 - Updated', isActive: true, isFeatured: true },
      { headers: adminHeaders }
    );
    console.log(`   Status: ${res11.status}, Updated name: ${res11.data.data.name}\n`);

    // 12. Admin DELETE /api/admin/awards/:id (Soft Delete)
    console.log(`12. Testing DELETE /api/admin/awards/${createdAward._id}...`);
    const res12 = await axios.delete(
      `${BASE_URL}/api/admin/awards/${createdAward._id}`,
      { headers: adminHeaders }
    );
    console.log(`   Status: ${res12.status}, Message: ${res12.data.message}\n`);

    console.log('=== ALL AWARDS TESTS COMPLETED SUCCESSFULLY! ===');
  } catch (error) {
    console.error('Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

runTests();
