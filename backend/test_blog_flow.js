const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function runBlogTests() {
  console.log('\n==================================================');
  console.log('       RUNNING BLOG MANAGEMENT SYSTEM TESTS       ');
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 1. PUBLIC: GET /api/blogs
    console.log('--- 1. Testing Public Blog Listings ---');
    const blogsRes = await axios.get(`${BASE_URL}/blogs`);
    assert(blogsRes.status === 200, 'GET /api/blogs returns 200');
    assert(blogsRes.data.success === true, 'Public blogs response has success: true');
    assert(Array.isArray(blogsRes.data.data), 'Public blogs data is an array');
    assert(blogsRes.data.data.length >= 6, `Found ${blogsRes.data.data.length} published blogs (>= 6)`);
    assert(Array.isArray(blogsRes.data.categories), 'Categories returned in response');

    // 2. PUBLIC: Category Filtering
    console.log('\n--- 2. Testing Category Filtering ---');
    const catRes = await axios.get(`${BASE_URL}/blogs?category=Doctor%20Matrimony`);
    assert(catRes.status === 200, 'GET /api/blogs?category=Doctor Matrimony returns 200');
    const allDocMatrimony = catRes.data.data.every((b) => b.category === 'Doctor Matrimony');
    assert(allDocMatrimony, 'All returned articles belong to Doctor Matrimony');

    // 3. PUBLIC: Search by Keyword
    console.log('\n--- 3. Testing Keyword Search ---');
    const searchRes = await axios.get(`${BASE_URL}/blogs?search=residency`);
    assert(searchRes.status === 200, 'GET /api/blogs?search=residency returns 200');
    assert(searchRes.data.data.length > 0, `Search for "residency" returned ${searchRes.data.data.length} articles`);

    // 4. PUBLIC: Categories List
    console.log('\n--- 4. Testing Blog Categories Endpoint ---');
    const categoriesRes = await axios.get(`${BASE_URL}/blogs/categories`);
    assert(categoriesRes.status === 200, 'GET /api/blogs/categories returns 200');
    assert(categoriesRes.data.data.length > 0, `Categories count: ${categoriesRes.data.data.length}`);

    // 5. PUBLIC: Featured Blogs
    console.log('\n--- 5. Testing Featured Blogs ---');
    const featuredRes = await axios.get(`${BASE_URL}/blogs/featured`);
    assert(featuredRes.status === 200, 'GET /api/blogs/featured returns 200');
    assert(featuredRes.data.data.every((b) => b.isFeatured === true), 'All featured blogs have isFeatured === true');

    // 6. PUBLIC: Single Blog by Slug
    console.log('\n--- 6. Testing Single Blog by Slug ---');
    const testSlug = blogsRes.data.data[0].slug;
    const singleRes = await axios.get(`${BASE_URL}/blogs/${testSlug}`);
    assert(singleRes.status === 200, `GET /api/blogs/${testSlug} returns 200`);
    assert(singleRes.data.data.slug === testSlug, 'Slug matches requested slug');
    assert(typeof singleRes.data.data.content === 'string', 'Article content is present');

    // 7. PUBLIC: Non-existent Slug -> 404
    console.log('\n--- 7. Testing 404 for Invalid Slug ---');
    try {
      await axios.get(`${BASE_URL}/blogs/non-existent-random-slug-404`);
      assert(false, 'Should have thrown 404');
    } catch (err) {
      assert(err.response?.status === 404, 'Invalid slug returned 404 Not Found');
    }

    // 8. SECURITY: Unauthenticated Admin Request -> 401
    console.log('\n--- 8. Testing Security: Unauthenticated Admin Access ---');
    try {
      await axios.get(`${BASE_URL}/admin/blogs`);
      assert(false, 'Should have thrown 401');
    } catch (err) {
      assert(err.response?.status === 401, 'Accessing /api/admin/blogs without token returns 401');
    }

    // 9. ADMIN: Login to Get Admin Token
    console.log('\n--- 9. Admin Authentication ---');
    const loginRes = await axios.post(`${BASE_URL}/admin/auth/login`, {
      email: 'admin@wonderfuljodi.com',
      password: 'Password123!',
    });
    assert(loginRes.status === 200, 'Admin login succeeded');
    const adminToken = loginRes.data.token;
    assert(!!adminToken, 'Received valid admin JWT token');

    const adminHeaders = { Authorization: `Bearer ${adminToken}` };

    // 10. ADMIN: GET /api/admin/blogs
    console.log('\n--- 10. Admin Blog List & Stats ---');
    const adminBlogsRes = await axios.get(`${BASE_URL}/admin/blogs`, { headers: adminHeaders });
    assert(adminBlogsRes.status === 200, 'GET /api/admin/blogs with token returns 200');
    assert(adminBlogsRes.data.stats !== undefined, 'Summary stats returned for admin');
    assert(adminBlogsRes.data.stats.total >= 6, `Stats total articles: ${adminBlogsRes.data.stats.total}`);

    // 11. ADMIN: Create a Draft Blog Post
    console.log('\n--- 11. Admin Create Draft Article ---');
    const draftPayload = {
      title: 'Test Doctor Career Transition Guide 2026',
      category: 'Medical Professionals',
      excerpt: 'A comprehensive guide for physicians transitioning from residency to private clinical practice.',
      content: '<h2>Transitioning to Private Practice</h2><p>Here are clinical insights and advice.</p>',
      authorName: 'Dr. Test Specialist',
      authorRole: 'Consultant Physician',
      status: 'DRAFT',
      isFeatured: false,
      tags: ['Test', 'Residency', 'Practice'],
    };

    const createRes = await axios.post(`${BASE_URL}/admin/blogs`, draftPayload, { headers: adminHeaders });
    assert(createRes.status === 201, 'POST /api/admin/blogs returns 201 Created');
    const createdId = createRes.data.data._id;
    const createdSlug = createRes.data.data.slug;
    assert(createRes.data.data.status === 'DRAFT', 'Created article has status: DRAFT');
    assert(!!createdSlug, `Generated unique slug: ${createdSlug}`);

    // 12. VERIFY DRAFT IS NOT VISIBLE PUBLICLY
    console.log('\n--- 12. Verifying Draft is Hidden from Public ---');
    try {
      await axios.get(`${BASE_URL}/blogs/${createdSlug}`);
      assert(false, 'Draft post should not be accessible via public slug endpoint');
    } catch (err) {
      assert(err.response?.status === 404, 'Draft post returns 404 on public route');
    }

    // 13. ADMIN: Publish the Draft Article
    console.log('\n--- 13. Publishing the Article ---');
    const publishRes = await axios.patch(
      `${BASE_URL}/admin/blogs/${createdId}/status`,
      { status: 'PUBLISHED' },
      { headers: adminHeaders }
    );
    assert(publishRes.status === 200, 'PATCH status to PUBLISHED returns 200');
    assert(publishRes.data.data.status === 'PUBLISHED', 'Article status is now PUBLISHED');

    // 14. VERIFY PUBLISHED ARTICLE IS NOW VISIBLE PUBLICLY
    console.log('\n--- 14. Verifying Published Article is Publicly Visible ---');
    const verifyPublicRes = await axios.get(`${BASE_URL}/blogs/${createdSlug}`);
    assert(verifyPublicRes.status === 200, 'Published post is now accessible via public slug endpoint');
    assert(verifyPublicRes.data.data.title === draftPayload.title, 'Title matches published article');

    // 15. ADMIN: Toggle Featured Status
    console.log('\n--- 15. Toggling Featured Status ---');
    const toggleRes = await axios.patch(
      `${BASE_URL}/admin/blogs/${createdId}/featured`,
      { isFeatured: true },
      { headers: adminHeaders }
    );
    assert(toggleRes.status === 200, 'PATCH featured returns 200');
    assert(toggleRes.data.data.isFeatured === true, 'Article is now marked as Featured');

    // 16. ADMIN: Unpublish / Archive the Article
    console.log('\n--- 16. Archiving the Article ---');
    const archiveRes = await axios.patch(
      `${BASE_URL}/admin/blogs/${createdId}/status`,
      { status: 'ARCHIVED' },
      { headers: adminHeaders }
    );
    assert(archiveRes.status === 200, 'PATCH status to ARCHIVED returns 200');

    // Verify archived post is not visible publicly
    try {
      await axios.get(`${BASE_URL}/blogs/${createdSlug}`);
      assert(false, 'Archived post should not be accessible publicly');
    } catch (err) {
      assert(err.response?.status === 404, 'Archived post returns 404 publicly');
    }

    // 17. ADMIN: Soft Delete
    console.log('\n--- 17. Soft Deleting the Article ---');
    const deleteRes = await axios.delete(`${BASE_URL}/admin/blogs/${createdId}`, { headers: adminHeaders });
    assert(deleteRes.status === 200, 'DELETE /api/admin/blogs/:id returns 200');

    // 18. VERIFY AUDIT LOG ENTRIES
    console.log('\n--- 18. Verifying Admin Audit Log Entries ---');
    const auditRes = await axios.get(`${BASE_URL}/admin/audit-logs`, { headers: adminHeaders });
    assert(auditRes.status === 200, 'GET /api/admin/audit-logs returns 200');
    const blogLogs = (auditRes.data.data || []).filter((log) => log.targetModel === 'BlogPost');
    assert(blogLogs.length >= 4, `Found ${blogLogs.length} audit logs for BlogPost actions`);
    console.log(`Recent Blog Audit Actions: ${blogLogs.slice(0, 4).map((l) => l.action).join(', ')}`);

    console.log('\n==================================================');
    console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
    console.log('==================================================\n');
  } catch (err) {
    console.error('Fatal test error:', err.response?.data || err.message);
  }
}

runBlogTests();
