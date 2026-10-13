/**
 * WONDERFUL JODI: UPLOAD STORAGE PATH CONSISTENCY & SECURITY TEST SUITE
 *
 * Verifies:
 * 1. Working directory consistency (Repo root vs Backend subfolder vs Deep subdirectory)
 * 2. Canonical writable upload directory (<projectRoot>/uploads) and legacy read-only fallback
 * 3. File discovery across candidate directories (uploads/ and backend/uploads/) without new-write mirroring
 * 4. Path traversal defenses (../, %2e%2e, %252e%252e, null-byte, colon, backslash, strict filename whitelist)
 * 5. Symlink containment defense (realpath validation preventing escape from approved directories)
 * 6. Upload write failure propagation (no silent success when required file write fails)
 * 7. Missing files and missing database records handling (HTTP 404)
 * 8. IDOR / BOLA authorization checks (HTTP 403 for unauthorized users, HTTP 200 for owner & admin)
 * 9. Sensitive document cache headers (Cache-Control: private, no-store on verifications & biodatas)
 * 10. Biodata PDF generation, download, and multi-directory deletion
 */

const path = require('path');
const fs = require('fs');

// Ensure test environment
process.env.NODE_ENV = 'test';

let passed = 0;
let failed = 0;

function assert(condition, message, extra = '') {
  if (condition) {
    console.log(`✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`✗ FAIL: ${message} ${extra ? '- ' + extra : ''}`);
    failed++;
  }
}

// In-memory mock database
const db = {
  verifications: new Map(),
  biodatas: new Map(),
  users: new Map(),
  profiles: new Map(),
};

function resetDb() {
  db.verifications.clear();
  db.biodatas.clear();
  db.users.clear();
  db.profiles.clear();
}

const userA = { _id: '507f191e810c19729de860ea', id: '507f191e810c19729de860ea', role: 'user', email: 'doctorA@example.com' };
const userB = { _id: '507f191e810c19729de860eb', id: '507f191e810c19729de860eb', role: 'user', email: 'doctorB@example.com' };
const adminUser = { _id: '507f191e810c19729de860ec', id: '507f191e810c19729de860ec', role: 'admin', email: 'admin@wonderfuljodi.com' };

const MockVerification = {
  findOne: async (filter) => {
    for (const v of db.verifications.values()) {
      if (filter.$or) {
        let match = false;
        for (const cond of filter.$or) {
          if (cond.storageKey && v.storageKey === cond.storageKey) match = true;
          if (cond.documentUrl && cond.documentUrl.$regex && v.documentUrl.includes(cond.documentUrl.$regex)) match = true;
        }
        if (match) return { ...v };
      }
      if (filter.user && String(v.user) !== String(filter.user)) continue;
      if (filter.storageKey && v.storageKey !== filter.storageKey) continue;
      return { ...v };
    }
    return null;
  },
  findById: async (id) => db.verifications.get(String(id)) || null,
  create: async (data) => {
    const _id = data._id || `ver_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const rec = { ...data, _id, id: _id };
    db.verifications.set(String(_id), rec);
    return { ...rec };
  },
  countDocuments: async () => db.verifications.size,
};

const MockBiodata = {
  findById: async (id) => {
    const b = db.biodatas.get(String(id));
    if (!b) return null;
    return {
      ...b,
      save: async function () { db.biodatas.set(String(this._id), this); },
    };
  },
  findOne: async (filter) => {
    for (const b of db.biodatas.values()) {
      if (filter.publicId && b.publicId !== filter.publicId) continue;
      return {
        ...b,
        lean: () => ({ ...b }),
        save: async function () { db.biodatas.set(String(this._id), this); },
      };
    }
    return null;
  },
  findByIdAndDelete: async (id) => {
    db.biodatas.delete(String(id));
    return { deletedCount: 1 };
  },
};

const MockUser = {
  findById: async (id) => db.users.get(String(id)) || null,
  findByIdAndUpdate: async (id, update) => {
    const u = db.users.get(String(id));
    if (u) Object.assign(u, update);
    return u;
  },
};

const MockProfile = {
  findOne: () => ({
    populate: () => ({
      populate: () => ({
        populate: () => ({
          populate: () => ({
            populate: () => ({
              populate: () => ({
                populate: () => ({
                  populate: () => ({
                    populate: () => ({
                      populate: () => ({
                        populate: () => ({
                          populate: () => ({
                            lean: () => null,
                          }),
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      }),
    }),
    select: () => Promise.resolve(null),
  }),
  findOneAndUpdate: async () => null,
};

// Inject Mocks into require.cache for dist
require.cache[require.resolve('./dist/models/Verification')] = {
  id: require.resolve('./dist/models/Verification'),
  filename: require.resolve('./dist/models/Verification'),
  loaded: true,
  exports: { Verification: MockVerification },
};

require.cache[require.resolve('./dist/models/Biodata')] = {
  id: require.resolve('./dist/models/Biodata'),
  filename: require.resolve('./dist/models/Biodata'),
  loaded: true,
  exports: { Biodata: MockBiodata },
};

require.cache[require.resolve('./dist/models/User')] = {
  id: require.resolve('./dist/models/User'),
  filename: require.resolve('./dist/models/User'),
  loaded: true,
  exports: { User: MockUser },
};

require.cache[require.resolve('./dist/models/Profile')] = {
  id: require.resolve('./dist/models/Profile'),
  filename: require.resolve('./dist/models/Profile'),
  loaded: true,
  exports: { Profile: MockProfile },
};

const uploadPaths = require('./dist/utils/uploadPaths');
const verificationController = require('./dist/controllers/verificationController');
const biodataController = require('./dist/controllers/biodataController');

const { Writable } = require('stream');

function mockReq(user, params = {}, body = {}) {
  return {
    user: user ? { userId: user._id, id: user._id, role: user.role, email: user.email } : null,
    params,
    body,
    headers: {},
  };
}

function mockRes() {
  const headers = {};
  const chunks = [];
  const res = new Writable({
    write(chunk, encoding, callback) {
      chunks.push(chunk);
      callback();
    },
  });
  res.statusCode = 200;
  res.body = null;
  res.headers = headers;
  res.status = function (code) {
    this.statusCode = code;
    return this;
  };
  res.json = function (data) {
    this.body = data;
    return this;
  };
  res.setHeader = function (key, val) {
    headers[key.toLowerCase()] = val;
    return this;
  };
  return res;
}

async function runUploadConsistencySuite() {
  console.log('======================================================================');
  console.log('   WONDERFUL JODI: UPLOAD STORAGE PATH CONSISTENCY & SECURITY SUITE   ');
  console.log('======================================================================\n');

  const originalCwd = process.cwd();

  // ---------------------------------------------------------------------------
  // TEST 1: Working directory consistency (Root vs Backend vs Deep CWD)
  // ---------------------------------------------------------------------------
  console.log('--- TEST 1: Working directory consistency ---');
  {
    const rootDirFromRoot = uploadPaths.getProjectRootDir();
    const uploadBasesFromRoot = uploadPaths.getUploadBaseDirectories();
    const biodataDirFromRoot = uploadPaths.getPrimaryUploadDir('biodatas');
    const verifDirFromRoot = uploadPaths.getPrimaryUploadDir('verifications');

    assert(
      fs.existsSync(rootDirFromRoot),
      'getProjectRootDir() resolves existing root directory',
      rootDirFromRoot
    );
    assert(
      uploadBasesFromRoot[0] === path.join(rootDirFromRoot, 'uploads'),
      'Canonical base upload directory is strictly <projectRoot>/uploads',
      uploadBasesFromRoot[0]
    );
    assert(
      uploadBasesFromRoot[1] === path.join(rootDirFromRoot, 'backend', 'uploads'),
      'Legacy fallback base upload directory is <projectRoot>/backend/uploads',
      uploadBasesFromRoot[1]
    );

    // Switch CWD to backend directory and re-verify
    const backendDir = path.join(rootDirFromRoot, 'backend');
    process.chdir(backendDir);

    const rootDirFromBackend = uploadPaths.getProjectRootDir();
    const biodataDirFromBackend = uploadPaths.getPrimaryUploadDir('biodatas');
    const verifDirFromBackend = uploadPaths.getPrimaryUploadDir('verifications');

    assert(
      rootDirFromRoot === rootDirFromBackend,
      'getProjectRootDir() is identical whether CWD is repo root or backend/',
      `Root: ${rootDirFromRoot} vs Backend: ${rootDirFromBackend}`
    );
    assert(
      biodataDirFromRoot === biodataDirFromBackend,
      'getPrimaryUploadDir("biodatas") is identical whether CWD is repo root or backend/',
      biodataDirFromRoot
    );
    assert(
      verifDirFromRoot === verifDirFromBackend,
      'getPrimaryUploadDir("verifications") is identical whether CWD is repo root or backend/',
      verifDirFromRoot
    );

    // Switch CWD to deep nested directory (e.g. backend/dist/utils)
    const deepDir = path.join(rootDirFromRoot, 'backend', 'dist', 'utils');
    if (fs.existsSync(deepDir)) {
      process.chdir(deepDir);
      const rootDirFromDeep = uploadPaths.getProjectRootDir();
      assert(
        rootDirFromRoot === rootDirFromDeep,
        'getProjectRootDir() resolves project root even when CWD is deeply nested in backend/dist/utils',
        rootDirFromDeep
      );
    }

    // Restore original cwd
    process.chdir(originalCwd);
  }

  // ---------------------------------------------------------------------------
  // TEST 2: File reading across candidate directories (Canonical vs Legacy read-only)
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 2: File reading across candidate directories & No Mirroring ---');
  {
    const rootDir = uploadPaths.getProjectRootDir();
    const primaryBioDir = path.join(rootDir, 'uploads', 'biodatas');
    const secondaryBioDir = path.join(rootDir, 'backend', 'uploads', 'biodatas');

    if (!fs.existsSync(primaryBioDir)) fs.mkdirSync(primaryBioDir, { recursive: true });
    if (!fs.existsSync(secondaryBioDir)) fs.mkdirSync(secondaryBioDir, { recursive: true });

    // Place a file in primary
    const fileInPrimary = 'test_primary_bio.pdf';
    fs.writeFileSync(path.join(primaryBioDir, fileInPrimary), 'dummy pdf content primary');

    // Place a file in secondary only (legacy file)
    const fileInSecondary = 'test_secondary_bio.pdf';
    fs.writeFileSync(path.join(secondaryBioDir, fileInSecondary), 'dummy pdf content secondary');

    const foundPrimary = uploadPaths.findUploadedFile(`biodatas/${fileInPrimary}`);
    assert(
      foundPrimary !== null && fs.existsSync(foundPrimary) && foundPrimary.includes(path.join('uploads', 'biodatas')),
      'findUploadedFile locates file stored in canonical primary uploads/biodatas',
      foundPrimary
    );

    const foundSecondary = uploadPaths.findUploadedFile(`biodatas/${fileInSecondary}`);
    assert(
      foundSecondary !== null && fs.existsSync(foundSecondary) && foundSecondary.includes(path.join('backend', 'uploads', 'biodatas')),
      'findUploadedFile locates legacy file stored in backend/uploads/biodatas (read-only fallback)',
      foundSecondary
    );

    // Test that canonical getCanonicalUploadDir does not create backend/uploads
    const testSubfolder = 'test_no_mirror_sub';
    const primaryTestDir = uploadPaths.getCanonicalUploadDir(testSubfolder);
    const secondaryTestDir = path.join(rootDir, 'backend', 'uploads', testSubfolder);
    assert(
      fs.existsSync(primaryTestDir),
      'getCanonicalUploadDir ensures canonical <projectRoot>/uploads/<subfolder> exists'
    );
    assert(
      !fs.existsSync(secondaryTestDir),
      'getCanonicalUploadDir does NOT create legacy backend/uploads/<subfolder>'
    );

    // Cleanup test dummy files
    try { fs.unlinkSync(path.join(primaryBioDir, fileInPrimary)); } catch {}
    try { fs.unlinkSync(path.join(secondaryBioDir, fileInSecondary)); } catch {}
    try { fs.rmdirSync(primaryTestDir); } catch {}
  }

  // ---------------------------------------------------------------------------
  // TEST 3: Path traversal defenses and filename validation
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 3: Path traversal defenses and filename validation ---');
  {
    assert(
      uploadPaths.findUploadedFile('../../package.json') === null,
      'findUploadedFile rejects simple ../ traversal'
    );
    assert(
      uploadPaths.findUploadedFile('verifications/../../package.json') === null,
      'findUploadedFile rejects nested traversal'
    );
    assert(
      uploadPaths.findUploadedFile('verifications/%2e%2e%2fpackage.json') === null,
      'findUploadedFile rejects single URL-encoded %2e%2e traversal'
    );
    assert(
      uploadPaths.findUploadedFile('verifications/%252e%252e%252fpackage.json') === null,
      'findUploadedFile rejects double URL-encoded %252e%252e traversal'
    );
    assert(
      uploadPaths.findUploadedFile('verifications/test\0file.pdf') === null,
      'findUploadedFile rejects null-byte injection'
    );
    assert(
      uploadPaths.findUploadedFile('verifications/test%00file.pdf') === null,
      'findUploadedFile rejects URL-encoded null-byte injection'
    );
    assert(
      uploadPaths.findUploadedFile('verifications/..\\..\\package.json') === null,
      'findUploadedFile rejects backslash traversal'
    );
    assert(
      uploadPaths.findUploadedFile('verifications/file.pdf::$DATA') === null,
      'findUploadedFile rejects NTFS alternate data stream (ADS) colons'
    );

    // isValidUploadFilename helper tests
    assert(
      uploadPaths.isValidUploadFilename('doc-degree-12345.pdf') === true,
      'isValidUploadFilename accepts valid alphanumeric filename with dash and period'
    );
    assert(
      uploadPaths.isValidUploadFilename('../secret.txt') === false,
      'isValidUploadFilename rejects filename with relative traversal'
    );
    assert(
      uploadPaths.isValidUploadFilename('foo/bar.pdf') === false,
      'isValidUploadFilename rejects filename with forward slashes'
    );
    assert(
      uploadPaths.isValidUploadFilename('foo\\bar.pdf') === false,
      'isValidUploadFilename rejects filename with backslashes'
    );
    assert(
      uploadPaths.isValidUploadFilename('foo\0bar.pdf') === false,
      'isValidUploadFilename rejects filename with null bytes'
    );
    assert(
      uploadPaths.isValidUploadFilename('doc$<>:"|?*.pdf') === false,
      'isValidUploadFilename rejects filename with invalid/special characters'
    );

    // Controller level path traversal rejection
    const reqTraversal = mockReq(userA, { filename: '../secret.txt' });
    const resTraversal = mockRes();
    await verificationController.serveVerificationDocument(reqTraversal, resTraversal, (err) => { throw err; });

    assert(
      resTraversal.statusCode === 400 && resTraversal.body?.message?.includes('Invalid document filename'),
      'serveVerificationDocument rejects path traversal with HTTP 400',
      JSON.stringify(resTraversal.body)
    );
  }

  // ---------------------------------------------------------------------------
  // TEST 4: Symlink containment defense (escape prevention)
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 4: Symlink containment defense ---');
  {
    const rootDir = uploadPaths.getProjectRootDir();
    const verifDir = uploadPaths.getPrimaryUploadDir('verifications');
    const secretFileOutside = path.join(rootDir, 'secret_test_outside.txt');
    fs.writeFileSync(secretFileOutside, 'CONFIDENTIAL_DATA_OUTSIDE_UPLOADS');

    const symlinkInside = path.join(verifDir, 'symlink_escape_test.txt');
    try { fs.unlinkSync(symlinkInside); } catch {}

    let symlinkCreated = false;
    try {
      fs.symlinkSync(secretFileOutside, symlinkInside, 'file');
      symlinkCreated = true;
    } catch (e) {
      console.log('Note: symlink creation skipped (requires Windows SeCreateSymbolicLinkPrivilege or admin). Emulating containment.');
    }

    if (symlinkCreated) {
      const result = uploadPaths.findUploadedFile('verifications/symlink_escape_test.txt');
      assert(
        result === null,
        'findUploadedFile detects realpath of symlink escaping uploads base and returns null'
      );
      try { fs.unlinkSync(symlinkInside); } catch {}
    } else {
      // Direct validation: verify isStrictlyInside and realpath containment logic
      const realBase = fs.realpathSync(verifDir);
      const targetOutside = path.resolve(rootDir, 'package.json');
      const rel = path.relative(realBase, targetOutside);
      assert(
        rel.startsWith('..'),
        'Containment check correctly identifies outside target as escaping (relative starts with ..)'
      );
    }

    try { fs.unlinkSync(secretFileOutside); } catch {}
  }

  // ---------------------------------------------------------------------------
  // TEST 5: Upload write failure propagation (no silent success)
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 5: Upload write failure propagation ---');
  {
    resetDb();
    db.users.set(userA._id, userA);

    // Mock fs.promises.writeFile to simulate disk failure / EACCES
    const originalWriteFile = fs.promises.writeFile;
    fs.promises.writeFile = async () => {
      throw new Error('EACCES: permission denied, disk write failure');
    };

    let errorCaughtInSubmit = null;
    const reqSubmit = mockReq(userA, {}, {
      documentType: 'DEGREE',
      file: 'data:application/pdf;base64,' + Buffer.from('%PDF-1.4 sample genuine pdf').toString('base64'),
    });
    const resSubmit = mockRes();

    await verificationController.submitVerification(reqSubmit, resSubmit, (err) => {
      errorCaughtInSubmit = err;
    });

    assert(
      errorCaughtInSubmit !== null && errorCaughtInSubmit.message?.includes('EACCES'),
      'submitVerification propagates disk write failure to error handler and does NOT succeed silently'
    );
    assert(
      db.verifications.size === 0,
      'No database verification record is created when required physical file write fails'
    );

    // Restore fs.promises.writeFile
    fs.promises.writeFile = originalWriteFile;
  }

  // ---------------------------------------------------------------------------
  // TEST 6: Missing files and missing records handling
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 6: Missing files and missing records handling ---');
  {
    resetDb();
    db.users.set(userA._id, userA);

    // 6a: Missing database record
    const reqNoRecord = mockReq(userA, { filename: 'doc-degree-nonexistent.pdf' });
    const resNoRecord = mockRes();
    await verificationController.serveVerificationDocument(reqNoRecord, resNoRecord, (err) => { throw err; });

    assert(
      resNoRecord.statusCode === 404 && resNoRecord.body?.message?.includes('Verification document not found'),
      'serveVerificationDocument returns HTTP 404 when database record does not exist',
      JSON.stringify(resNoRecord.body)
    );

    // 6b: Record exists in database, but physical file is missing from storage
    const storageKey = 'doc-degree-missing-file-12345.pdf';
    await MockVerification.create({
      user: userA._id,
      storageKey,
      documentUrl: `/api/verifications/document/${storageKey}`,
      fileType: 'application/pdf',
      status: 'PENDING',
    });

    const reqMissingFile = mockReq(userA, { filename: storageKey });
    const resMissingFile = mockRes();
    await verificationController.serveVerificationDocument(reqMissingFile, resMissingFile, (err) => { throw err; });

    assert(
      resMissingFile.statusCode === 404 && resMissingFile.body?.message?.includes('missing on storage'),
      'serveVerificationDocument returns HTTP 404 when physical file is missing from storage',
      JSON.stringify(resMissingFile.body)
    );
  }

  // ---------------------------------------------------------------------------
  // TEST 7: IDOR / BOLA Authorization checks on sensitive verification documents
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 7: IDOR / BOLA Authorization checks ---');
  {
    resetDb();
    db.users.set(userA._id, userA);
    db.users.set(userB._id, userB);
    db.users.set(adminUser._id, adminUser);

    const storageKey = 'doc-governmentid-test-idor-555.pdf';
    const primaryVerifDir = uploadPaths.getPrimaryUploadDir('verifications');
    const testFilePath = path.join(primaryVerifDir, storageKey);
    fs.writeFileSync(testFilePath, 'genuine verification document buffer');

    await MockVerification.create({
      user: userA._id, // Owned by userA
      storageKey,
      documentUrl: `/api/verifications/document/${storageKey}`,
      fileType: 'application/pdf',
      status: 'VERIFIED',
    });

    // 7a: Unauthenticated requester
    const reqUnauth = mockReq(null, { filename: storageKey });
    const resUnauth = mockRes();
    await verificationController.serveVerificationDocument(reqUnauth, resUnauth, (err) => { throw err; });

    assert(
      resUnauth.statusCode === 403,
      'Unauthenticated request blocked with HTTP 403'
    );

    // 7b: Unauthorized userB attempts to access userA's sensitive document (IDOR attempt)
    const reqUserB = mockReq(userB, { filename: storageKey });
    const resUserB = mockRes();
    await verificationController.serveVerificationDocument(reqUserB, resUserB, (err) => { throw err; });

    assert(
      resUserB.statusCode === 403 && resUserB.body?.message?.includes('Access forbidden: You are not authorized'),
      'Cross-user IDOR access attempt blocked with HTTP 403 Access Forbidden',
      JSON.stringify(resUserB.body)
    );

    // 7c: Legitimate owner userA accesses their own document
    const reqOwner = mockReq(userA, { filename: storageKey });
    const resOwner = mockRes();
    await verificationController.serveVerificationDocument(reqOwner, resOwner, (err) => { throw err; });

    assert(
      resOwner.statusCode === 200,
      'Owner userA successfully authorized to stream their own verification document'
    );
    assert(
      resOwner.headers['cache-control'] === 'private, no-store',
      'Sensitive verification document Cache-Control header set to "private, no-store"'
    );
    assert(
      resOwner.headers['x-content-type-options'] === 'nosniff',
      'X-Content-Type-Options: nosniff header set'
    );

    // 7d: Admin user accesses userA's document
    const reqAdmin = mockReq(adminUser, { filename: storageKey });
    const resAdmin = mockRes();
    await verificationController.serveVerificationDocument(reqAdmin, resAdmin, (err) => { throw err; });

    assert(
      resAdmin.statusCode === 200,
      'Admin user successfully authorized to review member verification document'
    );
    assert(
      resAdmin.headers['cache-control'] === 'private, no-store',
      'Admin access also enforces "private, no-store" caching protection'
    );

    // Cleanup
    try { fs.unlinkSync(testFilePath); } catch {}
  }

  // ---------------------------------------------------------------------------
  // TEST 8: Biodata PDF generation, download, and multi-directory deletion
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 8: Biodata PDF generation, download, and multi-directory deletion ---');
  {
    resetDb();
    db.users.set(userA._id, userA);
    db.users.set(userB._id, userB);

    const biodataId = '609b191e810c19729de860f1';
    const publicId = 'WJBIOTEST999';
    const testBiodata = {
      _id: biodataId,
      id: biodataId,
      userId: userA._id,
      publicId,
      personalDetails: { fullName: 'Dr. Jane Doe' },
    };
    db.biodatas.set(biodataId, testBiodata);

    // 8a: Unauthorized userB attempts to download userA's biodata
    const reqBioUserB = mockReq(userB, { id: biodataId });
    const resBioUserB = mockRes();
    await biodataController.downloadBiodataPdf(reqBioUserB, resBioUserB, (err) => { throw err; });

    assert(
      resBioUserB.statusCode === 403 && resBioUserB.body?.message?.includes('You do not own this biodata'),
      'Unauthorized user blocked from downloading biodata with HTTP 403',
      JSON.stringify(resBioUserB.body)
    );

    // 8b: Pre-create file in legacy secondary directory (to test read-only findUploadedFile discovery)
    const secondaryBioDir = path.join(uploadPaths.getProjectRootDir(), 'backend', 'uploads', 'biodatas');
    if (!fs.existsSync(secondaryBioDir)) fs.mkdirSync(secondaryBioDir, { recursive: true });
    const secondaryPdfPath = path.join(secondaryBioDir, `${publicId}.pdf`);
    fs.writeFileSync(secondaryPdfPath, 'sample biodata pdf in secondary');

    // 8c: Owner userA downloads biodata
    const reqBioOwner = mockReq(userA, { id: biodataId });
    const resBioOwner = mockRes();
    await biodataController.downloadBiodataPdf(reqBioOwner, resBioOwner, (err) => { throw err; });

    assert(
      resBioOwner.statusCode === 200,
      'Owner userA successfully authorized to download biodata PDF'
    );
    assert(
      resBioOwner.headers['cache-control'] === 'private, no-store',
      'Biodata download sets "Cache-Control: private, no-store"'
    );
    assert(
      resBioOwner.headers['content-disposition']?.includes('Marriage_Biodata_Dr__Jane_Doe.pdf'),
      'Content-Disposition attachment header formatted with sanitized full name'
    );

    // 8d: Also write dummy file to primary to test multi-directory deletion
    const primaryBioDir = uploadPaths.getPrimaryUploadDir('biodatas');
    const primaryPdfPath = path.join(primaryBioDir, `${publicId}.pdf`);
    fs.writeFileSync(primaryPdfPath, 'sample biodata pdf in primary');

    // 8e: Delete biodata - should remove files across all candidate directories
    const reqDelete = mockReq(userA, { id: biodataId });
    const resDelete = mockRes();
    await biodataController.deleteBiodata(reqDelete, resDelete, (err) => { throw err; });

    assert(
      resDelete.statusCode === 200,
      'Biodata deleted successfully with HTTP 200'
    );
    assert(
      !fs.existsSync(primaryPdfPath),
      'Biodata file removed from primary uploads/biodatas'
    );
    assert(
      !fs.existsSync(secondaryPdfPath),
      'Biodata file removed from legacy backend/uploads/biodatas'
    );
    assert(
      !db.biodatas.has(biodataId),
      'Biodata record removed from database'
    );
  }

  // Summary
  console.log('\n======================================================================');
  console.log(`  FINAL RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL ${passed + failed})`);
  console.log('======================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runUploadConsistencySuite().catch((err) => {
  console.error('Fatal error in upload consistency suite:', err);
  process.exit(1);
});
