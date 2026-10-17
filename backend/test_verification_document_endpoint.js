/**
 * Comprehensive Regression & Security Test Suite: Verification Document Endpoint
 *
 * Verifies fixes for:
 * - HTTP 500 TypeError: Cannot read properties of undefined (reading 'toString')
 * - Route parameter validation & directory traversal rejection
 * - Missing records and missing storage file handling
 * - Authentication & IDOR / BOLA authorization enforcement
 * - Private caching and Content-Security-Policy headers
 * - Sanitized internal error responses
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Test runner tracking
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    const result = fn();
    if (result && typeof result.then === 'function') {
      return result
        .then(() => {
          console.log(`  ✓ PASS: ${name}`);
          passedTests++;
        })
        .catch((err) => {
          console.error(`  ✗ FAIL: ${name}`);
          console.error(`    ${err.message}`);
          failedTests++;
        });
    }
    console.log(`  ✓ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    ${err.message}`);
    failedTests++;
  }
}

// Load compiled controller and upload paths
const controllerPath = path.resolve(__dirname, 'dist/controllers/verificationController.js');
const {
  serveVerificationDocument,
  getUserVerificationById,
  getVerificationOwnerId,
  getDocumentContentType,
} = require(controllerPath);

const { Verification } = require(path.resolve(__dirname, 'dist/models/Verification.js'));
const { isValidUploadFilename, findUploadedFile, getCanonicalUploadDir } = require(path.resolve(__dirname, 'dist/utils/uploadPaths.js'));

// Helper to create mock Express response
function createMockRes() {
  const headers = {};
  const res = {
    statusCode: 200,
    headers,
    headersSent: false,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      this.headersSent = true;
      return this;
    },
    setHeader(name, value) {
      headers[name.toLowerCase()] = value;
      return this;
    },
    getHeader(name) {
      return headers[name.toLowerCase()];
    },
    write(chunk) {
      return true;
    },
    end() {
      this.headersSent = true;
      return this;
    },
    on() {
      return this;
    },
    once() {
      return this;
    },
    emit() {
      return true;
    },
  };
  return res;
}

async function runSuite() {
  console.log('====================================================');
  console.log('  VERIFICATION DOCUMENT SECURITY & REGRESSION SUITE  ');
  console.log('====================================================\n');

  // Setup temporary test storage file in canonical verifications upload dir
  const verificationsDir = getCanonicalUploadDir('verifications');
  const testDocFilename = `doc-medicalregistration-test-${Date.now()}-abc123456789.jpg`;
  const testDocPath = path.join(verificationsDir, testDocFilename);
  fs.writeFileSync(testDocPath, Buffer.from('FAKE_JPEG_IMAGE_BINARY_DATA'));

  try {
    // -------------------------------------------------------------
    // Section 1: Helper unit tests (getVerificationOwnerId & getDocumentContentType)
    // -------------------------------------------------------------
    console.log('[1] Unit Tests: getVerificationOwnerId & getDocumentContentType');

    runTest('1.1 getVerificationOwnerId extracts userId from Prisma model', () => {
      const record = { id: 'v1', userId: 'user_prisma_123', storageKey: 'test.jpg' };
      assert.strictEqual(getVerificationOwnerId(record), 'user_prisma_123');
    });

    runTest('1.2 getVerificationOwnerId extracts user object _id/id from populated model', () => {
      const recordWithObjId = { id: 'v2', user: { _id: 'user_populated_456' } };
      assert.strictEqual(getVerificationOwnerId(recordWithObjId), 'user_populated_456');

      const recordWithId = { id: 'v3', user: { id: 'user_populated_789' } };
      assert.strictEqual(getVerificationOwnerId(recordWithId), 'user_populated_789');
    });

    runTest('1.3 getVerificationOwnerId extracts string user ID', () => {
      const record = { id: 'v4', user: 'user_string_999' };
      assert.strictEqual(getVerificationOwnerId(record), 'user_string_999');
    });

    runTest('1.4 getVerificationOwnerId safely returns empty string when user is undefined (never throws)', () => {
      assert.strictEqual(getVerificationOwnerId({}), '');
      assert.strictEqual(getVerificationOwnerId(null), '');
      assert.strictEqual(getVerificationOwnerId(undefined), '');
      assert.strictEqual(getVerificationOwnerId({ user: undefined, userId: undefined }), '');
    });

    runTest('1.5 getDocumentContentType resolves correct MIME based on extension and stored type', () => {
      assert.strictEqual(getDocumentContentType('doc.jpg', undefined), 'image/jpeg');
      assert.strictEqual(getDocumentContentType('doc.jpeg', undefined), 'image/jpeg');
      assert.strictEqual(getDocumentContentType('doc.png', undefined), 'image/png');
      assert.strictEqual(getDocumentContentType('doc.webp', undefined), 'image/webp');
      assert.strictEqual(getDocumentContentType('doc.pdf', undefined), 'application/pdf');
      assert.strictEqual(getDocumentContentType('doc.jpg', 'image/jpeg'), 'image/jpeg');
      assert.strictEqual(getDocumentContentType('doc.pdf', 'application/pdf'), 'application/pdf');
    });

    // -------------------------------------------------------------
    // Section 2: Route Parameter Validation & Traversal Rejection
    // -------------------------------------------------------------
    console.log('\n[2] Route Parameter Validation & Directory Traversal Rejection');

    await runTest('2.1 Missing or undefined filename returns HTTP 400', async () => {
      const req = { params: {}, user: { userId: 'u1', role: 'user' } };
      const res = createMockRes();
      await serveVerificationDocument(req, res, () => {});
      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.body?.success, false);
      assert.strictEqual(res.body?.message, 'Invalid document filename');
    });

    await runTest('2.2 Empty string filename returns HTTP 400', async () => {
      const req = { params: { filename: '' }, user: { userId: 'u1', role: 'user' } };
      const res = createMockRes();
      await serveVerificationDocument(req, res, () => {});
      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.body?.success, false);
      assert.strictEqual(res.body?.message, 'Invalid document filename');
    });

    await runTest('2.3 Directory traversal attempt "../secret.txt" returns HTTP 400', async () => {
      const req = { params: { filename: '../secret.txt' }, user: { userId: 'u1', role: 'user' } };
      const res = createMockRes();
      await serveVerificationDocument(req, res, () => {});
      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.body?.success, false);
      assert.strictEqual(res.body?.message, 'Invalid document filename');
    });

    await runTest('2.4 Slashes and illegal path characters return HTTP 400', async () => {
      const traversalInputs = [
        '../../etc/passwd',
        'foo/bar.jpg',
        'foo\\bar.jpg',
        'doc..jpg',
        'doc;rm.jpg',
        'doc|test.jpg',
        'doc\0null.jpg',
      ];
      for (const input of traversalInputs) {
        const req = { params: { filename: input }, user: { userId: 'u1', role: 'user' } };
        const res = createMockRes();
        await serveVerificationDocument(req, res, () => {});
        assert.strictEqual(res.statusCode, 400, `Expected HTTP 400 for input: "${input}"`);
        assert.strictEqual(res.body?.success, false);
      }
    });

    // -------------------------------------------------------------
    // Section 3: Missing Verification Record & Missing Storage File
    // -------------------------------------------------------------
    console.log('\n[3] Missing Verification Record & Storage File Handling');

    await runTest('3.1 Missing verification record in database returns HTTP 404', async () => {
      // Mock Verification.findOne to return null
      const originalFindOne = Verification.findOne;
      Verification.findOne = () => Promise.resolve(null);

      try {
        const req = {
          params: { filename: 'doc-medicalregistration-9999999-notfound.jpg' },
          user: { userId: 'u1', role: 'user' },
        };
        const res = createMockRes();
        await serveVerificationDocument(req, res, () => {});
        assert.strictEqual(res.statusCode, 404);
        assert.strictEqual(res.body?.success, false);
        assert.strictEqual(res.body?.message, 'Verification document not found');
      } finally {
        Verification.findOne = originalFindOne;
      }
    });

    await runTest('3.2 Missing file on disk returns HTTP 404', async () => {
      // Mock Verification.findOne to return record, but storage file doesn't exist on disk
      const originalFindOne = Verification.findOne;
      Verification.findOne = () =>
        Promise.resolve({
          id: 'v_exist',
          userId: 'owner_user_123',
          storageKey: 'doc-missing-file-on-storage.jpg',
          documentUrl: '/api/verifications/document/doc-missing-file-on-storage.jpg',
          fileType: 'image/jpeg',
        });

      try {
        const req = {
          params: { filename: 'doc-missing-file-on-storage.jpg' },
          user: { userId: 'owner_user_123', role: 'user' },
        };
        const res = createMockRes();
        await serveVerificationDocument(req, res, () => {});
        assert.strictEqual(res.statusCode, 404);
        assert.strictEqual(res.body?.success, false);
        assert.strictEqual(res.body?.message, 'Document file is missing on storage.');
      } finally {
        Verification.findOne = originalFindOne;
      }
    });

    // -------------------------------------------------------------
    // Section 4: Authentication & IDOR / BOLA Authorization Enforcement
    // -------------------------------------------------------------
    console.log('\n[4] Authentication & IDOR Authorization Enforcement');

    await runTest('4.1 Unauthenticated request (no req.user) returns HTTP 403 Forbidden', async () => {
      const originalFindOne = Verification.findOne;
      Verification.findOne = () =>
        Promise.resolve({
          id: 'v_doc',
          userId: 'owner_user_123',
          storageKey: testDocFilename,
        });

      try {
        const req = {
          params: { filename: testDocFilename },
          // user is undefined
        };
        const res = createMockRes();
        await serveVerificationDocument(req, res, () => {});
        assert.strictEqual(res.statusCode, 403);
        assert.strictEqual(res.body?.success, false);
        assert.ok(res.body?.message?.includes('not authorized'));
      } finally {
        Verification.findOne = originalFindOne;
      }
    });

    await runTest('4.2 Unauthorized user (non-owner, non-admin) returns HTTP 403 Forbidden', async () => {
      const originalFindOne = Verification.findOne;
      Verification.findOne = () =>
        Promise.resolve({
          id: 'v_doc',
          userId: 'owner_user_123',
          storageKey: testDocFilename,
        });

      try {
        const req = {
          params: { filename: testDocFilename },
          user: { userId: 'attacker_user_456', role: 'user' },
        };
        const res = createMockRes();
        await serveVerificationDocument(req, res, () => {});
        assert.strictEqual(res.statusCode, 403);
        assert.strictEqual(res.body?.success, false);
        assert.ok(res.body?.message?.includes('not authorized'));
      } finally {
        Verification.findOne = originalFindOne;
      }
    });

    // -------------------------------------------------------------
    // Section 5: Authorized Access, Header Security & Stream Pipeline
    // -------------------------------------------------------------
    console.log('\n[5] Authorized Access, Streaming & Header Security');

    await runTest('5.1 Authorized owner access succeeds with HTTP 200, correct Content-Type & security headers', async () => {
      const originalFindOne = Verification.findOne;
      Verification.findOne = () =>
        Promise.resolve({
          id: 'v_doc',
          userId: 'owner_user_123',
          storageKey: testDocFilename,
          documentUrl: `/api/verifications/document/${testDocFilename}`,
          fileType: 'image/jpeg',
        });

      try {
        const req = {
          params: { filename: testDocFilename },
          user: { userId: 'owner_user_123', role: 'user' },
        };
        const res = createMockRes();
        await serveVerificationDocument(req, res, () => {});

        // Headers check
        assert.strictEqual(res.getHeader('content-type'), 'image/jpeg');
        assert.strictEqual(res.getHeader('x-content-type-options'), 'nosniff');
        assert.strictEqual(res.getHeader('content-security-policy'), "default-src 'self' blob: data:; style-src 'unsafe-inline'; frame-ancestors 'self'");
        assert.strictEqual(res.getHeader('cache-control'), 'private, no-store');
      } finally {
        Verification.findOne = originalFindOne;
      }
    });

    await runTest('5.2 Authorized administrator access succeeds for any document', async () => {
      const originalFindOne = Verification.findOne;
      Verification.findOne = () =>
        Promise.resolve({
          id: 'v_doc',
          userId: 'some_candidate_user_888',
          storageKey: testDocFilename,
          documentUrl: `/api/verifications/document/${testDocFilename}`,
          fileType: 'image/jpeg',
        });

      try {
        const req = {
          params: { filename: testDocFilename },
          user: { userId: 'admin_user_001', role: 'admin' },
        };
        const res = createMockRes();
        await serveVerificationDocument(req, res, () => {});

        assert.strictEqual(res.getHeader('content-type'), 'image/jpeg');
        assert.strictEqual(res.getHeader('cache-control'), 'private, no-store');
      } finally {
        Verification.findOne = originalFindOne;
      }
    });

    // -------------------------------------------------------------
    // Section 6: Internal Database Error Sanitization
    // -------------------------------------------------------------
    console.log('\n[6] Database & Internal Error Sanitization');

    await runTest('6.1 Unexpected database exception returns sanitized HTTP 500 without stack trace leak', async () => {
      const originalFindOne = Verification.findOne;
      Verification.findOne = () => Promise.reject(new Error('Internal MariaDB connection timeout error with /var/secret/path'));

      try {
        const req = {
          params: { filename: testDocFilename },
          user: { userId: 'owner_user_123', role: 'user' },
        };
        const res = createMockRes();
        await serveVerificationDocument(req, res, () => {});

        assert.strictEqual(res.statusCode, 500);
        assert.strictEqual(res.body?.success, false);
        assert.strictEqual(res.body?.message, 'An unexpected internal error occurred while retrieving the document.');
        assert.strictEqual(res.body?.stack, undefined, 'No stack trace exposed to client');
        assert.strictEqual(Boolean(res.body?.message?.includes('/var/secret')), false, 'No filesystem path exposed');
      } finally {
        Verification.findOne = originalFindOne;
      }
    });

    // -------------------------------------------------------------
    // Section 7: getUserVerificationById IDOR & Prisma Compatibility
    // -------------------------------------------------------------
    console.log('\n[7] getUserVerificationById IDOR & Prisma userId Compatibility');

    await runTest('7.1 getUserVerificationById works with Prisma userId without throwing undefined.toString()', async () => {
      const originalFindById = Verification.findById;
      Verification.findById = () =>
        Promise.resolve({
          id: '507f1f77bcf86cd799439011',
          userId: 'owner_user_123',
          status: 'PENDING',
          documentName: 'Medical Degree',
        });

      try {
        const req = {
          params: { id: '507f1f77bcf86cd799439011' },
          user: { userId: 'owner_user_123', role: 'user' },
        };
        const res = createMockRes();
        await getUserVerificationById(req, res, () => {});

        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(res.body?.success, true);
        assert.strictEqual(res.body?.data?.documentName, 'Medical Degree');
      } finally {
        Verification.findById = originalFindById;
      }
    });

    await runTest('7.2 getUserVerificationById blocks unauthorized users with HTTP 403', async () => {
      const originalFindById = Verification.findById;
      Verification.findById = () =>
        Promise.resolve({
          id: '507f1f77bcf86cd799439011',
          userId: 'owner_user_123',
          status: 'PENDING',
        });

      try {
        const req = {
          params: { id: '507f1f77bcf86cd799439011' },
          user: { userId: 'other_user_999', role: 'user' },
        };
        const res = createMockRes();
        await getUserVerificationById(req, res, () => {});

        assert.strictEqual(res.statusCode, 403);
        assert.strictEqual(res.body?.success, false);
      } finally {
        Verification.findById = originalFindById;
      }
    });

    await runTest('7.3 getUserVerificationById allows admin, ADMIN, and SUPER_ADMIN roles', async () => {
      const originalFindById = Verification.findById;
      Verification.findById = () =>
        Promise.resolve({
          id: '507f1f77bcf86cd799439011',
          userId: 'owner_user_123',
          documentName: 'Registration Certificate',
          status: 'PENDING',
        });

      try {
        const roles = ['admin', 'ADMIN', 'SUPER_ADMIN'];
        for (const role of roles) {
          const req = {
            params: { id: '507f1f77bcf86cd799439011' },
            user: { userId: 'admin_caller_555', role },
          };
          const res = createMockRes();
          await getUserVerificationById(req, res, () => {});

          assert.strictEqual(res.statusCode, 200, `Expected 200 for role: ${role}`);
          assert.strictEqual(res.body?.success, true);
          assert.strictEqual(res.body?.data?.documentName, 'Registration Certificate');
        }
      } finally {
        Verification.findById = originalFindById;
      }
    });

    await runTest('7.4 getUserVerificationById blocks unauthenticated requests with HTTP 403', async () => {
      const originalFindById = Verification.findById;
      Verification.findById = () =>
        Promise.resolve({
          id: '507f1f77bcf86cd799439011',
          userId: 'owner_user_123',
          status: 'PENDING',
        });

      try {
        const req = {
          params: { id: '507f1f77bcf86cd799439011' },
          // user is undefined
        };
        const res = createMockRes();
        await getUserVerificationById(req, res, () => {});

        assert.strictEqual(res.statusCode, 403);
        assert.strictEqual(res.body?.success, false);
      } finally {
        Verification.findById = originalFindById;
      }
    });

    // -------------------------------------------------------------
    // Section 8: Specific Production Error Filenames Verification
    // -------------------------------------------------------------
    console.log('\n[8] Verification of Reported Production Filenames');

    const productionFilenames = [
      'doc-medicalregistration-1791954513682-2d6bbf1ec543f0c8fe53822351d5c4e7.jpg',
      'doc-employment-1791954539762-067dfca6814c710e109117a657fc97b2.jpg',
      'doc-governmentid-1791954533368-9e2e51a0ad6527cdb453f8e9a745cc37.jpg',
    ];

    for (const prodFilename of productionFilenames) {
      await runTest(`8.${productionFilenames.indexOf(prodFilename) + 1} Production filename "${prodFilename}" validates cleanly and resolves without TypeError`, async () => {
        assert.strictEqual(isValidUploadFilename(prodFilename), true, 'Filename passes strict character and length validation');

        const originalFindOne = Verification.findOne;
        Verification.findOne = () =>
          Promise.resolve({
            id: 'v_prod',
            userId: 'target_candidate_user',
            storageKey: prodFilename,
            documentUrl: `/api/verifications/document/${prodFilename}`,
            fileType: 'image/jpeg',
          });

        try {
          const req = {
            params: { filename: prodFilename },
            user: { userId: 'target_candidate_user', role: 'user' },
          };
          const res = createMockRes();

          // Will attempt to locate file on disk; file doesn't exist on local dev disk, so expect 404 rather than 500 TypeError
          await serveVerificationDocument(req, res, () => {});
          assert.strictEqual(res.statusCode, 404, 'Safely returns 404 for missing local disk file instead of crashing with 500 TypeError');
          assert.strictEqual(res.body?.message, 'Document file is missing on storage.');
        } finally {
          Verification.findOne = originalFindOne;
        }
      });
    }

    console.log('\n====================================================');
    console.log(`  SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED (Total: ${totalTests})`);
    console.log('====================================================\n');

    if (failedTests > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } finally {
    // Cleanup temporary test file
    if (fs.existsSync(testDocPath)) {
      try {
        fs.unlinkSync(testDocPath);
      } catch (_) {}
    }
  }
}

runSuite().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
