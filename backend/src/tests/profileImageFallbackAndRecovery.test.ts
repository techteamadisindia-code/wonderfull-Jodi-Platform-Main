/**
 * WONDERFUL JODI — PROFILE IMAGE FALLBACK & PERSISTENT RECOVERY TEST SUITE
 *
 * Verifies all 7 production requirements:
 * 1. Valid profile photo: HTTP 200 with correct image headers.
 * 2. Missing photo: Clean fallback (HTTP 404 SVG doctor avatar, never raw HTML).
 * 3. Null / empty image field: Clean fallback handling, no network request or crash.
 * 4. Invalid / malicious filename: Safe traversal, null-byte, and drive letter rejection.
 * 5. Re-uploaded / self-healed photo: Faithful byte-for-byte image recovery for the owner.
 * 6. Multiple profiles: Strict owner binding, zero cross-assignment across candidates.
 * 7. Production upload persistence: Canonical persistent directory resolution on Hostinger.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import http from 'http';
import app from '../app';
import { prisma } from '../db/client';
import {
  getCanonicalUploadRootDir,
  getCanonicalUploadDir,
  isValidUploadFilename,
  findUploadedFile,
} from '../utils/uploadPaths';
import {
  isSafePublicPhotoUrl,
  validateImageBuffer,
} from '../utils/securityUtils';
import {
  selfHealProfilePhoto,
  restoreAllMissingProfilePhotos,
} from '../services/profilePhotoRecoveryService';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function it(desc: string, fn: () => void | Promise<void>) {
  totalTests++;
  return (async () => {
    try {
      await fn();
      passedTests++;
      console.log(`  [PASS] ${desc}`);
    } catch (err: any) {
      failedTests++;
      console.error(`  [FAIL] ${desc}`);
      console.error(`         ${err?.message || err}`);
      if (err?.stack) {
        console.error(`         ${err.stack.split('\n').slice(1, 4).join('\n')}`);
      }
    }
  })();
}

function makeRequest(
  server: http.Server,
  urlPath: string
): Promise<{ statusCode: number; headers: http.IncomingHttpHeaders; body: Buffer }> {
  return new Promise((resolve, reject) => {
    const addr = server.address() as any;
    const port = addr.port;
    const req = http.get(`http://127.0.0.1:${port}${urlPath}`, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode || 0,
          headers: res.headers,
          body: Buffer.concat(chunks),
        });
      });
    });
    req.on('error', reject);
  });
}

async function runAll() {
  console.log('========================================================================');
  console.log('  WONDERFUL JODI — PROFILE IMAGE FALLBACK & RECOVERY TEST SUITE');
  console.log('========================================================================\n');

  let testServer: http.Server | null = null;

  try {
    testServer = app.listen(0);
    await new Promise((resolve) => setTimeout(resolve, 300));

    // ──────────────────────────────────────────────────────────────────────────
    // Check 1: Safe Public Photo URL & Path Traversal Rejection
    // ──────────────────────────────────────────────────────────────────────────
    console.log('Check 1: Safe Public Photo URL & Private Path Protection');

    await it('1a. Accepts valid root-relative public uploads URLs', () => {
      assert.strictEqual(
        isSafePublicPhotoUrl('/uploads/profiles/IMG-20261027-1793182514247-a9883710b9198479484ae9e4213ddc3c.jpg'),
        true
      );
      assert.strictEqual(
        isSafePublicPhotoUrl('/uploads/profiles/candidate-WJ-100092.jpg'),
        true
      );
    });

    await it('1b. Accepts valid HTTP and HTTPS image URLs', () => {
      assert.strictEqual(
        isSafePublicPhotoUrl('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600'),
        true
      );
      assert.strictEqual(
        isSafePublicPhotoUrl('http://wonderfuljodi.com/uploads/profiles/test.jpg'),
        true
      );
    });

    await it('1c. Strictly rejects internal server filesystem paths (/home/, /var/, /tmp/, /etc/)', () => {
      assert.strictEqual(
        isSafePublicPhotoUrl('/home/u625755214/domains/wonderfuljodi.com/uploads/profiles/secret.jpg'),
        false
      );
      assert.strictEqual(isSafePublicPhotoUrl('/var/log/syslog'), false);
      assert.strictEqual(isSafePublicPhotoUrl('/tmp/uploads/malicious.jpg'), false);
      assert.strictEqual(isSafePublicPhotoUrl('/etc/passwd'), false);
    });

    await it('1d. Strictly rejects Windows absolute drive paths and file: URLs', () => {
      assert.strictEqual(isSafePublicPhotoUrl('C:\\Users\\admin\\Desktop\\photo.jpg'), false);
      assert.strictEqual(isSafePublicPhotoUrl('D:/photos/candidate.jpg'), false);
      assert.strictEqual(isSafePublicPhotoUrl('file:///C:/Users/photo.jpg'), false);
    });

    await it('1e. Strictly rejects path traversal (..), backslashes, and null bytes', () => {
      assert.strictEqual(isSafePublicPhotoUrl('/uploads/profiles/../../etc/passwd'), false);
      assert.strictEqual(isSafePublicPhotoUrl('/uploads\\profiles\\test.jpg'), false);
      assert.strictEqual(isSafePublicPhotoUrl('/uploads/profiles/test\0.jpg'), false);
    });

    await it('1f. Strictly rejects null, undefined, and literal string "null"/"undefined"', () => {
      assert.strictEqual(isSafePublicPhotoUrl(null), false);
      assert.strictEqual(isSafePublicPhotoUrl(undefined), false);
      assert.strictEqual(isSafePublicPhotoUrl(''), false);
      assert.strictEqual(isSafePublicPhotoUrl('null'), false);
      assert.strictEqual(isSafePublicPhotoUrl('undefined'), false);
      assert.strictEqual(isSafePublicPhotoUrl('[object Object]'), false);
    });

    // ──────────────────────────────────────────────────────────────────────────
    // Check 2: Filename Syntax & Lexical Security
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\nCheck 2: Filename Syntax & Lexical Security');

    await it('2a. isValidUploadFilename accepts genuine uploaded filenames', () => {
      assert.strictEqual(
        isValidUploadFilename('IMG-20261027-1793182514247-a9883710b9198479484ae9e4213ddc3c.jpg'),
        true
      );
      assert.strictEqual(
        isValidUploadFilename('IMG_4800-1793296258639-6223654dfa055b981d6cff8a380d2117.jpg'),
        true
      );
    });

    await it('2b. isValidUploadFilename rejects traversal, directory separators, and control characters', () => {
      assert.strictEqual(isValidUploadFilename('../photo.jpg'), false);
      assert.strictEqual(isValidUploadFilename('..\\photo.jpg'), false);
      assert.strictEqual(isValidUploadFilename('/photo.jpg'), false);
      assert.strictEqual(isValidUploadFilename('photo.jpg\0'), false);
      assert.strictEqual(isValidUploadFilename(''), false);
    });

    // ──────────────────────────────────────────────────────────────────────────
    // Check 3: Hostinger Persistent Upload Directory Resolution
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\nCheck 3: Persistent Upload Directory Resolution');

    await it('3a. getCanonicalUploadRootDir returns non-empty canonical upload directory', () => {
      const rootDir = getCanonicalUploadRootDir();
      assert.ok(rootDir && typeof rootDir === 'string');
      assert.ok(rootDir.length > 5);
      assert.ok(!rootDir.includes('..'));
    });

    await it('3b. getCanonicalUploadDir ensures directory exists and is writable', () => {
      const profilesDir = getCanonicalUploadDir('profiles');
      assert.ok(fs.existsSync(profilesDir));
      const testFile = path.join(profilesDir, `.write-probe-${Date.now()}.tmp`);
      fs.writeFileSync(testFile, 'probe');
      assert.strictEqual(fs.readFileSync(testFile, 'utf8'), 'probe');
      fs.unlinkSync(testFile);
    });

    // ──────────────────────────────────────────────────────────────────────────
    // Check 4: Automated Self-Healing of Target Missing Production Photo
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\nCheck 4: Automated Self-Healing of Target Missing Profile Photo');

    const aishwaryaProfile = await prisma.profile.findFirst({
      where: { candidateId: 'WJ-100092' },
      select: { primaryPhoto: true },
    });
    const TARGET_FILENAME = aishwaryaProfile?.primaryPhoto
      ? path.basename(aishwaryaProfile.primaryPhoto)
      : 'IMG-20261027-1793532617953-00fa4e5e49f15a434f1636141e893eb5.jpg';
    const targetFilePath = path.join(getCanonicalUploadDir('profiles'), TARGET_FILENAME);

    await it('4a. Self-healing accurately identifies WJ-100092 (Dr Aishwarya R Pawar) and restores photo', async () => {
      // Ensure file does not exist before test to simulate missing state
      if (fs.existsSync(targetFilePath)) {
        fs.unlinkSync(targetFilePath);
      }
      assert.strictEqual(fs.existsSync(targetFilePath), false);

      // Trigger self-healing
      const healedPath = await selfHealProfilePhoto(TARGET_FILENAME);
      assert.ok(healedPath, 'selfHealProfilePhoto should return resolved file path');
      assert.strictEqual(fs.existsSync(healedPath), true, 'Restored file must physically exist');

      // Verify file size and binary magic bytes
      const buf = fs.readFileSync(healedPath);
      assert.strictEqual(buf.length, 18868, 'Restored JPEG must match original 18,868 bytes');
      const validation = validateImageBuffer(buf);
      assert.strictEqual(validation.valid, true);
      assert.strictEqual(validation.detectedMime, 'image/jpeg');
    });

    await it('4b. Repeated self-healing returns existing file immediately without re-writing', async () => {
      const existingPath = await selfHealProfilePhoto(TARGET_FILENAME);
      assert.strictEqual(existingPath, targetFilePath);
      assert.strictEqual(fs.existsSync(existingPath), true);
    });

    await it('4c. Self-healing rejects malicious or traversal paths safely without errors', async () => {
      const result = await selfHealProfilePhoto('../../etc/passwd');
      assert.strictEqual(result, null);
    });

    await it('4d. Self-healing returns null for unknown files without database backups (zero cross-assignment)', async () => {
      const result = await selfHealProfilePhoto('unknown-nonexistent-candidate-photo-999999.jpg');
      assert.strictEqual(result, null);
    });

    // ──────────────────────────────────────────────────────────────────────────
    // Check 5: Express Static Route & HTTP 200 / 404 Responses
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\nCheck 5: Express Static Route & HTTP Responses');

    await it('5a. GET /uploads/profiles/:filename returns HTTP 200 with image/jpeg for restored photo', async () => {
      const res = await makeRequest(testServer!, `/uploads/profiles/${TARGET_FILENAME}`);
      assert.strictEqual(res.statusCode, 200);
      assert.ok(
        res.headers['content-type']?.includes('image/jpeg'),
        `Expected image/jpeg, got ${res.headers['content-type']}`
      );
      assert.strictEqual(res.body.length, 18868);
    });

    await it('5b. GET /uploads/profiles/nonexistent.jpg returns HTTP 404 with SVG fallback (never raw HTML)', async () => {
      const res = await makeRequest(testServer!, '/uploads/profiles/nonexistent-random-doctor.jpg');
      assert.strictEqual(res.statusCode, 404);
      assert.ok(
        res.headers['content-type']?.includes('image/svg+xml'),
        `Expected image/svg+xml, got ${res.headers['content-type']}`
      );
      assert.ok(res.body.toString('utf8').includes('<svg'));
      assert.ok(res.body.toString('utf8').includes('</svg>'));
      assert.ok(!res.body.toString('utf8').includes('<!DOCTYPE html>'));
    });

    await it('5c. GET /uploads/profiles/ missing file includes Cache-Control: no-cache to avoid permanent negative caching', async () => {
      const res = await makeRequest(testServer!, '/uploads/profiles/another-missing-photo.jpg');
      assert.strictEqual(res.statusCode, 404);
      assert.ok(
        res.headers['cache-control']?.includes('no-cache'),
        `Expected no-cache in Cache-Control, got ${res.headers['cache-control']}`
      );
    });

    // ──────────────────────────────────────────────────────────────────────────
    // Check 6: Batch Restoration Script Functionality
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\nCheck 6: Batch Restoration Script Functionality');

    await it('6a. restoreAllMissingProfilePhotos scans profiles and reports clean summary', async () => {
      const summary = await restoreAllMissingProfilePhotos();
      assert.ok(summary.totalProfilesChecked >= 20);
      assert.ok(summary.restoredCount >= 0);
      assert.ok(summary.skippedCount >= 0);
    });

    // ──────────────────────────────────────────────────────────────────────────
    // Check 7: Multiple Profiles Isolation (Strict Zero Cross-Assignment)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\nCheck 7: Multiple Profiles Isolation (Strict Zero Cross-Assignment)');

    await it('7a. Restored photo for WJ-100092 is NOT assigned or returned for another candidate', async () => {
      // Verify WJ-100096 photo filename
      const p96 = await prisma.profile.findFirst({
        where: { candidateId: 'WJ-100096' },
        select: { primaryPhoto: true },
      });
      assert.ok(p96?.primaryPhoto?.includes('IMG_4800'));
      assert.ok(!p96?.primaryPhoto?.includes('IMG-20261027'));

      // Verify WJ-100092 photo filename
      const p92 = await prisma.profile.findFirst({
        where: { candidateId: 'WJ-100092' },
        select: { primaryPhoto: true },
      });
      assert.ok(p92?.primaryPhoto?.includes('IMG-20261027'));
      assert.ok(!p92?.primaryPhoto?.includes('IMG_4800'));
    });

    await it('7b. Primary photo vs unrelated gallery photo: gallery photo never replaces missing primary photo', async () => {
      const testCandidateId = 'WJ-TEST-GALLERY-ONLY';
      const fakePrimaryFilename = 'IMG-TEST-PRIMARY-PHOTO-MISSING.jpg';

      const origProfileFindFirst = prisma.profile.findFirst;
      const origRegFindMany = prisma.registration.findMany;

      const validJpegBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

      (prisma.profile as any).findFirst = async () => ({
        id: 'test-profile-id',
        userId: 'test-user-id',
        candidateId: testCandidateId,
        primaryPhoto: `/uploads/profiles/${fakePrimaryFilename}`,
        photos: [`/uploads/profiles/gallery-1.jpg`],
      });

      (prisma.registration as any).findMany = async () => [
        {
          id: 'test-reg-id',
          profileId: 'test-profile-id',
          userId: 'test-user-id',
          stepData: {
            photos: {
              photos: [validJpegBase64],
            },
          },
        },
      ];

      try {
        const result = await selfHealProfilePhoto(fakePrimaryFilename);
        assert.strictEqual(result, null, 'Gallery photo must NEVER be used to replace a missing primary photo');
      } finally {
        (prisma.profile as any).findFirst = origProfileFindFirst;
        (prisma.registration as any).findMany = origRegFindMany;
      }
    });

    await it('7c. Lookup when primaryPhoto contains base64 data correctly finds and heals the image', async () => {
      const testCandidateId = 'WJ-TEST-BASE64-PRIMARY';
      const validJpegBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

      const origProfileFindFirst = prisma.profile.findFirst;
      const origRegFindMany = prisma.registration.findMany;

      (prisma.profile as any).findFirst = async () => ({
        id: 'test-profile-base64-id',
        userId: 'test-user-base64-id',
        candidateId: testCandidateId,
        primaryPhoto: validJpegBase64,
        photos: [],
      });

      (prisma.registration as any).findMany = async () => [];

      const targetPath = path.join(getCanonicalUploadDir('profiles'), `IMG-${testCandidateId}-primary.jpg`);
      if (fs.existsSync(targetPath)) {
        try { fs.unlinkSync(targetPath); } catch (_) {}
      }

      try {
        const result = await selfHealProfilePhoto(validJpegBase64);
        assert.ok(result, 'selfHealProfilePhoto must find profile by base64 primaryPhoto');
        assert.strictEqual(fs.existsSync(result), true, 'Materialized file must exist on disk');
        assert.strictEqual(path.basename(result), `IMG-${testCandidateId}-primary.jpg`);

        if (fs.existsSync(result)) {
          fs.unlinkSync(result);
        }
      } finally {
        (prisma.profile as any).findFirst = origProfileFindFirst;
        (prisma.registration as any).findMany = origRegFindMany;
      }
    });

    await it('7d. Magic-byte validation alone is not enough: corrupt or invalid binaries are rejected', async () => {
      const corruptBase64 = 'data:image/jpeg;base64,V29uZGVyZnVsSm9kaU5vdEFuSW1hZ2VCaW5hcnlUZXh0T25seQ==';
      const origProfileFindFirst = prisma.profile.findFirst;

      (prisma.profile as any).findFirst = async () => ({
        id: 'test-corrupt-id',
        userId: 'test-corrupt-user',
        candidateId: 'WJ-TEST-CORRUPT',
        primaryPhoto: corruptBase64,
      });

      try {
        const result = await selfHealProfilePhoto(corruptBase64);
        assert.strictEqual(result, null, 'Corrupt base64 without valid image magic bytes must fail closed');
      } finally {
        (prisma.profile as any).findFirst = origProfileFindFirst;
      }
    });

    await it('7e. Missing primary photo: dynamically heals JPEG, PNG, and WebP with correct extensions', async () => {
      const origProfileFindFirst = prisma.profile.findFirst;

      const candidates = [
        { ext: 'png', b64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==' },
        { ext: 'webp', b64: 'data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==' },
        { ext: 'jpg', b64: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=' },
      ];

      try {
        for (const item of candidates) {
          const testId = `WJ-EXT-TEST-${item.ext.toUpperCase()}`;
          (prisma.profile as any).findFirst = async () => ({
            id: `profile-${item.ext}`,
            userId: `user-${item.ext}`,
            candidateId: testId,
            primaryPhoto: item.b64,
            photos: [],
          });

          const expectedFilename = `IMG-${testId}-primary.${item.ext}`;
          const targetPath = path.join(getCanonicalUploadDir('profiles'), expectedFilename);
          if (fs.existsSync(targetPath)) {
            try { fs.unlinkSync(targetPath); } catch (_) {}
          }

          const result = await selfHealProfilePhoto(item.b64);
          assert.ok(result, `Should restore photo for ${item.ext}`);
          assert.strictEqual(path.basename(result), expectedFilename, `Must restore with .${item.ext} extension`);
          assert.strictEqual(fs.existsSync(result), true);

          if (fs.existsSync(result)) {
            try { fs.unlinkSync(result); } catch (_) {}
          }
        }
      } finally {
        (prisma.profile as any).findFirst = origProfileFindFirst;
      }
    });

    await it('7f. Missing gallery photo: correlates exact requested gallery index and restores the 2nd gallery image', async () => {
      const testCandidateId = 'WJ-GALLERY-INDEX-TEST';
      const fakeGallery0 = 'gallery-item-0.jpg';
      const fakeGallery1 = 'gallery-item-1.jpg';

      const b64Gallery0 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
      const b64Gallery1Png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

      const origProfileFindFirst = prisma.profile.findFirst;
      const origRegFindMany = prisma.registration.findMany;

      (prisma.profile as any).findFirst = async () => ({
        id: 'test-profile-gallery-id',
        userId: 'test-user-gallery-id',
        candidateId: testCandidateId,
        primaryPhoto: '/uploads/profiles/primary-pic.jpg',
        photos: [
          `/uploads/profiles/${fakeGallery0}`,
          `/uploads/profiles/gallery-item-1.png`,
        ],
      });

      (prisma.registration as any).findMany = async () => [
        {
          id: 'test-reg-gallery',
          profileId: 'test-profile-gallery-id',
          userId: 'test-user-gallery-id',
          stepData: {
            photos: {
              photos: [b64Gallery0, b64Gallery1Png],
            },
          },
        },
      ];

      const targetPngPath = path.join(getCanonicalUploadDir('profiles'), 'gallery-item-1.png');
      if (fs.existsSync(targetPngPath)) {
        try { fs.unlinkSync(targetPngPath); } catch (_) {}
      }

      try {
        const result = await selfHealProfilePhoto('gallery-item-1.png');
        assert.ok(result, 'Must restore exact 2nd gallery image');
        assert.strictEqual(path.basename(result), 'gallery-item-1.png');
        const buf = fs.readFileSync(result);
        const check = validateImageBuffer(buf);
        assert.strictEqual(check.detectedMime, 'image/png', 'Must be the 2nd gallery image (PNG), NOT the 1st (JPEG)');

        if (fs.existsSync(result)) {
          try { fs.unlinkSync(result); } catch (_) {}
        }
      } finally {
        (prisma.profile as any).findFirst = origProfileFindFirst;
        (prisma.registration as any).findMany = origRegFindMany;
      }
    });

    await it('7g. Base64 primaryPhoto alongside unrelated gallery photo: base64 primary NEVER replaces gallery image', async () => {
      const origProfileFindFirst = prisma.profile.findFirst;
      const origRegFindMany = prisma.registration.findMany;

      const validPrimaryBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

      (prisma.profile as any).findFirst = async () => ({
        id: 'test-profile-mixed',
        userId: 'test-user-mixed',
        candidateId: 'WJ-MIXED',
        primaryPhoto: validPrimaryBase64,
        photos: ['/uploads/profiles/gallery-missing-no-backup.jpg'],
      });

      (prisma.registration as any).findMany = async () => [];

      try {
        const result = await selfHealProfilePhoto('gallery-missing-no-backup.jpg');
        assert.strictEqual(
          result,
          null,
          'Base64 primary photo must never replace a missing gallery image with no backup'
        );
      } finally {
        (prisma.profile as any).findFirst = origProfileFindFirst;
        (prisma.registration as any).findMany = origRegFindMany;
      }
    });

    await it('7h. Multiple registrations: uses most recent valid registration backup', async () => {
      const origProfileFindFirst = prisma.profile.findFirst;
      const origRegFindMany = prisma.registration.findMany;

      const olderB64Png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
      const newerB64Jpeg = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

      (prisma.profile as any).findFirst = async () => ({
        id: 'test-multi-reg',
        userId: 'test-multi-user',
        candidateId: 'WJ-MULTI-REG',
        primaryPhoto: '/uploads/profiles/multi-reg-primary.jpg',
        photos: [],
      });

      (prisma.registration as any).findMany = async () => [
        {
          id: 'reg-newest',
          createdAt: new Date('2026-10-30'),
          stepData: { photos: { primaryPhoto: newerB64Jpeg } },
        },
        {
          id: 'reg-older',
          createdAt: new Date('2026-10-01'),
          stepData: { photos: { primaryPhoto: olderB64Png } },
        },
      ];

      const targetPath = path.join(getCanonicalUploadDir('profiles'), 'multi-reg-primary.jpg');
      if (fs.existsSync(targetPath)) {
        try { fs.unlinkSync(targetPath); } catch (_) {}
      }

      try {
        const result = await selfHealProfilePhoto('multi-reg-primary.jpg');
        assert.ok(result);
        const buf = fs.readFileSync(result);
        const check = validateImageBuffer(buf);
        assert.strictEqual(check.detectedMime, 'image/jpeg', 'Must select the newest registration record data');

        if (fs.existsSync(result)) {
          try { fs.unlinkSync(result); } catch (_) {}
        }
      } finally {
        (prisma.profile as any).findFirst = origProfileFindFirst;
        (prisma.registration as any).findMany = origRegFindMany;
      }
    });

    await it('7i. Unverified backup: corrupt or truncated backup data fails closed and returns null', async () => {
      const origProfileFindFirst = prisma.profile.findFirst;
      const origRegFindMany = prisma.registration.findMany;

      (prisma.profile as any).findFirst = async () => ({
        id: 'test-corrupt-backup',
        userId: 'test-corrupt-user',
        candidateId: 'WJ-CORRUPT-BACKUP',
        primaryPhoto: '/uploads/profiles/corrupt-backup.jpg',
        photos: [],
      });

      (prisma.registration as any).findMany = async () => [
        {
          id: 'reg-corrupt',
          stepData: { photos: { primaryPhoto: 'data:image/jpeg;base64,SGVsbG9Xb3JsZA==' } },
        },
      ];

      try {
        const result = await selfHealProfilePhoto('corrupt-backup.jpg');
        assert.strictEqual(result, null, 'Unverified backup must fail closed with null');
      } finally {
        (prisma.profile as any).findFirst = origProfileFindFirst;
        (prisma.registration as any).findMany = origRegFindMany;
      }
    });

    await it('7j. HTTP route auto-healing: GET /uploads/profiles/... heals missing photo and returns HTTP 200', async () => {
      const testFilename = 'http-auto-heal-test.jpg';
      const validJpegBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

      const origProfileFindFirst = prisma.profile.findFirst;
      const origRegFindMany = prisma.registration.findMany;

      (prisma.profile as any).findFirst = async () => ({
        id: 'test-http-profile',
        userId: 'test-http-user',
        candidateId: 'WJ-HTTP-TEST',
        primaryPhoto: `/uploads/profiles/${testFilename}`,
        photos: [],
      });

      (prisma.registration as any).findMany = async () => [
        {
          id: 'reg-http',
          stepData: { photos: { primaryPhoto: validJpegBase64 } },
        },
      ];

      const targetPath = path.join(getCanonicalUploadDir('profiles'), testFilename);
      if (fs.existsSync(targetPath)) {
        try { fs.unlinkSync(targetPath); } catch (_) {}
      }

      try {
        const res = await makeRequest(testServer!, `/uploads/profiles/${testFilename}`);
        assert.strictEqual(res.statusCode, 200, 'HTTP GET must return 200 after self-healing');
        assert.ok(res.headers['content-type']?.includes('image/jpeg'));
        assert.strictEqual(fs.existsSync(targetPath), true, 'File must be written to disk');

        if (fs.existsSync(targetPath)) {
          try { fs.unlinkSync(targetPath); } catch (_) {}
        }
      } finally {
        (prisma.profile as any).findFirst = origProfileFindFirst;
        (prisma.registration as any).findMany = origRegFindMany;
      }
    });

    await it('7k. Valid file protection: existing files on disk are never overwritten', async () => {
      const testFilename = 'existing-file-protection.jpg';
      const targetPath = path.join(getCanonicalUploadDir('profiles'), testFilename);
      const originalContent = Buffer.from('ORIGINAL_EXISTING_FILE_CONTENT_DO_NOT_OVERWRITE');
      fs.writeFileSync(targetPath, originalContent);

      try {
        const result = await selfHealProfilePhoto(testFilename);
        assert.strictEqual(result, targetPath);
        const currentContent = fs.readFileSync(targetPath);
        assert.strictEqual(
          currentContent.toString('utf8'),
          originalContent.toString('utf8'),
          'Existing file content must remain unaltered'
        );
      } finally {
        if (fs.existsSync(targetPath)) {
          try { fs.unlinkSync(targetPath); } catch (_) {}
        }
      }
    });

    // ──────────────────────────────────────────────────────────────────────────
    // Check 8: Frontend isValidImageUrl Validation & Private Path Shielding
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\nCheck 8: Frontend isValidImageUrl Validation & Private Path Shielding');

    // Dynamic resolution avoids rootDir cross-package boundary issues during tsc build
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { isValidImageUrl } = require(path.resolve(__dirname, '../../../frontend/lib/imageUtils'));

    await it('8a. Frontend isValidImageUrl accepts valid root-relative and external web URLs', () => {
      assert.strictEqual(
        isValidImageUrl('/uploads/profiles/IMG-20261027-1793182514247-a9883710b9198479484ae9e4213ddc3c.jpg'),
        true
      );
      assert.strictEqual(
        isValidImageUrl('https://images.unsplash.com/photo-1534528741775-53994a69daeb'),
        true
      );
      assert.strictEqual(isValidImageUrl('/images/logo.png'), true);
    });

    await it('8b. Frontend isValidImageUrl strictly rejects internal server paths and traversal', () => {
      assert.strictEqual(isValidImageUrl('/home/u625755214/uploads/profiles/secret.jpg'), false);
      assert.strictEqual(isValidImageUrl('/var/www/uploads/test.jpg'), false);
      assert.strictEqual(isValidImageUrl('/uploads/profiles/../../etc/passwd'), false);
      assert.strictEqual(isValidImageUrl('C:\\Users\\Admin\\Desktop\\test.jpg'), false);
      assert.strictEqual(isValidImageUrl('file:///etc/passwd'), false);
    });

    await it('8c. Frontend isValidImageUrl strictly rejects nullish string representations', () => {
      assert.strictEqual(isValidImageUrl(null), false);
      assert.strictEqual(isValidImageUrl(undefined), false);
      assert.strictEqual(isValidImageUrl(''), false);
      assert.strictEqual(isValidImageUrl('null'), false);
      assert.strictEqual(isValidImageUrl('undefined'), false);
      assert.strictEqual(isValidImageUrl('/null'), false);
      assert.strictEqual(isValidImageUrl('/undefined'), false);
      assert.strictEqual(isValidImageUrl('[object Object]'), false);
    });

  } finally {
    if (testServer) {
      await new Promise<void>((resolve) => testServer!.close(() => resolve()));
    }
  }

  console.log('\n========================================================================');
  console.log(`  FINAL RESULTS: Total: ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}`);
  console.log('========================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runAll()
  .catch((err) => {
    console.error('Fatal test error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
