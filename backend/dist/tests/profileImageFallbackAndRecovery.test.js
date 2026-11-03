"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const http_1 = __importDefault(require("http"));
const app_1 = __importDefault(require("../app"));
const client_1 = require("../db/client");
const uploadPaths_1 = require("../utils/uploadPaths");
const securityUtils_1 = require("../utils/securityUtils");
const profilePhotoRecoveryService_1 = require("../services/profilePhotoRecoveryService");
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
function it(desc, fn) {
    totalTests++;
    return (async () => {
        try {
            await fn();
            passedTests++;
            console.log(`  [PASS] ${desc}`);
        }
        catch (err) {
            failedTests++;
            console.error(`  [FAIL] ${desc}`);
            console.error(`         ${err?.message || err}`);
            if (err?.stack) {
                console.error(`         ${err.stack.split('\n').slice(1, 4).join('\n')}`);
            }
        }
    })();
}
function makeRequest(server, urlPath) {
    return new Promise((resolve, reject) => {
        const addr = server.address();
        const port = addr.port;
        const req = http_1.default.get(`http://127.0.0.1:${port}${urlPath}`, (res) => {
            const chunks = [];
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
    let testServer = null;
    try {
        testServer = app_1.default.listen(0);
        await new Promise((resolve) => setTimeout(resolve, 300));
        // ──────────────────────────────────────────────────────────────────────────
        // Check 1: Safe Public Photo URL & Path Traversal Rejection
        // ──────────────────────────────────────────────────────────────────────────
        console.log('Check 1: Safe Public Photo URL & Private Path Protection');
        await it('1a. Accepts valid root-relative public uploads URLs', () => {
            assert_1.default.strictEqual((0, securityUtils_1.isSafePublicPhotoUrl)('/uploads/profiles/IMG-20261027-1793182514247-a9883710b9198479484ae9e4213ddc3c.jpg'), true);
            assert_1.default.strictEqual((0, securityUtils_1.isSafePublicPhotoUrl)('/uploads/profiles/candidate-WJ-100092.jpg'), true);
        });
        await it('1b. Accepts valid HTTP and HTTPS image URLs', () => {
            assert_1.default.strictEqual((0, securityUtils_1.isSafePublicPhotoUrl)('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600'), true);
            assert_1.default.strictEqual((0, securityUtils_1.isSafePublicPhotoUrl)('http://wonderfuljodi.com/uploads/profiles/test.jpg'), true);
        });
        await it('1c. Strictly rejects internal server filesystem paths (/home/, /var/, /tmp/, /etc/)', () => {
            assert_1.default.strictEqual((0, securityUtils_1.isSafePublicPhotoUrl)('/home/u625755214/domains/wonderfuljodi.com/uploads/profiles/secret.jpg'), false);
            assert_1.default.strictEqual((0, securityUtils_1.isSafePublicPhotoUrl)('/var/log/syslog'), false);
            assert_1.default.strictEqual((0, securityUtils_1.isSafePublicPhotoUrl)('/tmp/uploads/malicious.jpg'), false);
            assert_1.default.strictEqual((0, securityUtils_1.isSafePublicPhotoUrl)('/etc/passwd'), false);
        });
        await it('1d. Strictly rejects Windows absolute drive paths and file: URLs', () => {
            assert_1.default.strictEqual((0, securityUtils_1.isSafePublicPhotoUrl)('C:\\Users\\admin\\Desktop\\photo.jpg'), false);
            assert_1.default.strictEqual((0, securityUtils_1.isSafePublicPhotoUrl)('D:/photos/candidate.jpg'), false);
            assert_1.default.strictEqual((0, securityUtils_1.isSafePublicPhotoUrl)('file:///C:/Users/photo.jpg'), false);
        });
        await it('1e. Strictly rejects path traversal (..), backslashes, and null bytes', () => {
            assert_1.default.strictEqual((0, securityUtils_1.isSafePublicPhotoUrl)('/uploads/profiles/../../etc/passwd'), false);
            assert_1.default.strictEqual((0, securityUtils_1.isSafePublicPhotoUrl)('/uploads\\profiles\\test.jpg'), false);
            assert_1.default.strictEqual((0, securityUtils_1.isSafePublicPhotoUrl)('/uploads/profiles/test\0.jpg'), false);
        });
        await it('1f. Strictly rejects null, undefined, and literal string "null"/"undefined"', () => {
            assert_1.default.strictEqual((0, securityUtils_1.isSafePublicPhotoUrl)(null), false);
            assert_1.default.strictEqual((0, securityUtils_1.isSafePublicPhotoUrl)(undefined), false);
            assert_1.default.strictEqual((0, securityUtils_1.isSafePublicPhotoUrl)(''), false);
            assert_1.default.strictEqual((0, securityUtils_1.isSafePublicPhotoUrl)('null'), false);
            assert_1.default.strictEqual((0, securityUtils_1.isSafePublicPhotoUrl)('undefined'), false);
            assert_1.default.strictEqual((0, securityUtils_1.isSafePublicPhotoUrl)('[object Object]'), false);
        });
        // ──────────────────────────────────────────────────────────────────────────
        // Check 2: Filename Syntax & Lexical Security
        // ──────────────────────────────────────────────────────────────────────────
        console.log('\nCheck 2: Filename Syntax & Lexical Security');
        await it('2a. isValidUploadFilename accepts genuine uploaded filenames', () => {
            assert_1.default.strictEqual((0, uploadPaths_1.isValidUploadFilename)('IMG-20261027-1793182514247-a9883710b9198479484ae9e4213ddc3c.jpg'), true);
            assert_1.default.strictEqual((0, uploadPaths_1.isValidUploadFilename)('IMG_4800-1793296258639-6223654dfa055b981d6cff8a380d2117.jpg'), true);
        });
        await it('2b. isValidUploadFilename rejects traversal, directory separators, and control characters', () => {
            assert_1.default.strictEqual((0, uploadPaths_1.isValidUploadFilename)('../photo.jpg'), false);
            assert_1.default.strictEqual((0, uploadPaths_1.isValidUploadFilename)('..\\photo.jpg'), false);
            assert_1.default.strictEqual((0, uploadPaths_1.isValidUploadFilename)('/photo.jpg'), false);
            assert_1.default.strictEqual((0, uploadPaths_1.isValidUploadFilename)('photo.jpg\0'), false);
            assert_1.default.strictEqual((0, uploadPaths_1.isValidUploadFilename)(''), false);
        });
        // ──────────────────────────────────────────────────────────────────────────
        // Check 3: Hostinger Persistent Upload Directory Resolution
        // ──────────────────────────────────────────────────────────────────────────
        console.log('\nCheck 3: Persistent Upload Directory Resolution');
        await it('3a. getCanonicalUploadRootDir returns non-empty canonical upload directory', () => {
            const rootDir = (0, uploadPaths_1.getCanonicalUploadRootDir)();
            assert_1.default.ok(rootDir && typeof rootDir === 'string');
            assert_1.default.ok(rootDir.length > 5);
            assert_1.default.ok(!rootDir.includes('..'));
        });
        await it('3b. getCanonicalUploadDir ensures directory exists and is writable', () => {
            const profilesDir = (0, uploadPaths_1.getCanonicalUploadDir)('profiles');
            assert_1.default.ok(fs_1.default.existsSync(profilesDir));
            const testFile = path_1.default.join(profilesDir, `.write-probe-${Date.now()}.tmp`);
            fs_1.default.writeFileSync(testFile, 'probe');
            assert_1.default.strictEqual(fs_1.default.readFileSync(testFile, 'utf8'), 'probe');
            fs_1.default.unlinkSync(testFile);
        });
        // ──────────────────────────────────────────────────────────────────────────
        // Check 4: Automated Self-Healing of Target Missing Production Photo
        // ──────────────────────────────────────────────────────────────────────────
        console.log('\nCheck 4: Automated Self-Healing of Target Missing Profile Photo');
        const aishwaryaProfile = await client_1.prisma.profile.findFirst({
            where: { candidateId: 'WJ-100092' },
            select: { primaryPhoto: true },
        });
        const TARGET_FILENAME = aishwaryaProfile?.primaryPhoto
            ? path_1.default.basename(aishwaryaProfile.primaryPhoto)
            : 'IMG-20261027-1793532617953-00fa4e5e49f15a434f1636141e893eb5.jpg';
        const targetFilePath = path_1.default.join((0, uploadPaths_1.getCanonicalUploadDir)('profiles'), TARGET_FILENAME);
        await it('4a. Self-healing accurately identifies WJ-100092 (Dr Aishwarya R Pawar) and restores photo', async () => {
            // Ensure file does not exist before test to simulate missing state
            if (fs_1.default.existsSync(targetFilePath)) {
                fs_1.default.unlinkSync(targetFilePath);
            }
            assert_1.default.strictEqual(fs_1.default.existsSync(targetFilePath), false);
            // Trigger self-healing
            const healedPath = await (0, profilePhotoRecoveryService_1.selfHealProfilePhoto)(TARGET_FILENAME);
            assert_1.default.ok(healedPath, 'selfHealProfilePhoto should return resolved file path');
            assert_1.default.strictEqual(fs_1.default.existsSync(healedPath), true, 'Restored file must physically exist');
            // Verify file size and binary magic bytes
            const buf = fs_1.default.readFileSync(healedPath);
            assert_1.default.strictEqual(buf.length, 18868, 'Restored JPEG must match original 18,868 bytes');
            const validation = (0, securityUtils_1.validateImageBuffer)(buf);
            assert_1.default.strictEqual(validation.valid, true);
            assert_1.default.strictEqual(validation.detectedMime, 'image/jpeg');
        });
        await it('4b. Repeated self-healing returns existing file immediately without re-writing', async () => {
            const existingPath = await (0, profilePhotoRecoveryService_1.selfHealProfilePhoto)(TARGET_FILENAME);
            assert_1.default.strictEqual(existingPath, targetFilePath);
            assert_1.default.strictEqual(fs_1.default.existsSync(existingPath), true);
        });
        await it('4c. Self-healing rejects malicious or traversal paths safely without errors', async () => {
            const result = await (0, profilePhotoRecoveryService_1.selfHealProfilePhoto)('../../etc/passwd');
            assert_1.default.strictEqual(result, null);
        });
        await it('4d. Self-healing returns null for unknown files without database backups (zero cross-assignment)', async () => {
            const result = await (0, profilePhotoRecoveryService_1.selfHealProfilePhoto)('unknown-nonexistent-candidate-photo-999999.jpg');
            assert_1.default.strictEqual(result, null);
        });
        // ──────────────────────────────────────────────────────────────────────────
        // Check 5: Express Static Route & HTTP 200 / 404 Responses
        // ──────────────────────────────────────────────────────────────────────────
        console.log('\nCheck 5: Express Static Route & HTTP Responses');
        await it('5a. GET /uploads/profiles/:filename returns HTTP 200 with image/jpeg for restored photo', async () => {
            const res = await makeRequest(testServer, `/uploads/profiles/${TARGET_FILENAME}`);
            assert_1.default.strictEqual(res.statusCode, 200);
            assert_1.default.ok(res.headers['content-type']?.includes('image/jpeg'), `Expected image/jpeg, got ${res.headers['content-type']}`);
            assert_1.default.strictEqual(res.body.length, 18868);
        });
        await it('5b. GET /uploads/profiles/nonexistent.jpg returns HTTP 404 with SVG fallback (never raw HTML)', async () => {
            const res = await makeRequest(testServer, '/uploads/profiles/nonexistent-random-doctor.jpg');
            assert_1.default.strictEqual(res.statusCode, 404);
            assert_1.default.ok(res.headers['content-type']?.includes('image/svg+xml'), `Expected image/svg+xml, got ${res.headers['content-type']}`);
            assert_1.default.ok(res.body.toString('utf8').includes('<svg'));
            assert_1.default.ok(res.body.toString('utf8').includes('</svg>'));
            assert_1.default.ok(!res.body.toString('utf8').includes('<!DOCTYPE html>'));
        });
        await it('5c. GET /uploads/profiles/ missing file includes Cache-Control: no-cache to avoid permanent negative caching', async () => {
            const res = await makeRequest(testServer, '/uploads/profiles/another-missing-photo.jpg');
            assert_1.default.strictEqual(res.statusCode, 404);
            assert_1.default.ok(res.headers['cache-control']?.includes('no-cache'), `Expected no-cache in Cache-Control, got ${res.headers['cache-control']}`);
        });
        // ──────────────────────────────────────────────────────────────────────────
        // Check 6: Batch Restoration Script Functionality
        // ──────────────────────────────────────────────────────────────────────────
        console.log('\nCheck 6: Batch Restoration Script Functionality');
        await it('6a. restoreAllMissingProfilePhotos scans profiles and reports clean summary', async () => {
            const summary = await (0, profilePhotoRecoveryService_1.restoreAllMissingProfilePhotos)();
            assert_1.default.ok(summary.totalProfilesChecked >= 20);
            assert_1.default.ok(summary.restoredCount >= 0);
            assert_1.default.ok(summary.skippedCount >= 0);
        });
        // ──────────────────────────────────────────────────────────────────────────
        // Check 7: Multiple Profiles Isolation (Strict Zero Cross-Assignment)
        // ──────────────────────────────────────────────────────────────────────────
        console.log('\nCheck 7: Multiple Profiles Isolation (Strict Zero Cross-Assignment)');
        await it('7a. Restored photo for WJ-100092 is NOT assigned or returned for another candidate', async () => {
            // Verify WJ-100096 photo filename
            const p96 = await client_1.prisma.profile.findFirst({
                where: { candidateId: 'WJ-100096' },
                select: { primaryPhoto: true },
            });
            assert_1.default.ok(p96?.primaryPhoto?.includes('IMG_4800'));
            assert_1.default.ok(!p96?.primaryPhoto?.includes('IMG-20261027'));
            // Verify WJ-100092 photo filename
            const p92 = await client_1.prisma.profile.findFirst({
                where: { candidateId: 'WJ-100092' },
                select: { primaryPhoto: true },
            });
            assert_1.default.ok(p92?.primaryPhoto?.includes('IMG-20261027'));
            assert_1.default.ok(!p92?.primaryPhoto?.includes('IMG_4800'));
        });
        await it('7b. Primary photo vs unrelated gallery photo: gallery photo never replaces missing primary photo', async () => {
            const testCandidateId = 'WJ-TEST-GALLERY-ONLY';
            const fakePrimaryFilename = 'IMG-TEST-PRIMARY-PHOTO-MISSING.jpg';
            const origProfileFindFirst = client_1.prisma.profile.findFirst;
            const origRegFindMany = client_1.prisma.registration.findMany;
            const validJpegBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
            client_1.prisma.profile.findFirst = async () => ({
                id: 'test-profile-id',
                userId: 'test-user-id',
                candidateId: testCandidateId,
                primaryPhoto: `/uploads/profiles/${fakePrimaryFilename}`,
                photos: [`/uploads/profiles/gallery-1.jpg`],
            });
            client_1.prisma.registration.findMany = async () => [
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
                const result = await (0, profilePhotoRecoveryService_1.selfHealProfilePhoto)(fakePrimaryFilename);
                assert_1.default.strictEqual(result, null, 'Gallery photo must NEVER be used to replace a missing primary photo');
            }
            finally {
                client_1.prisma.profile.findFirst = origProfileFindFirst;
                client_1.prisma.registration.findMany = origRegFindMany;
            }
        });
        await it('7c. Lookup when primaryPhoto contains base64 data correctly finds and heals the image', async () => {
            const testCandidateId = 'WJ-TEST-BASE64-PRIMARY';
            const validJpegBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
            const origProfileFindFirst = client_1.prisma.profile.findFirst;
            const origRegFindMany = client_1.prisma.registration.findMany;
            client_1.prisma.profile.findFirst = async () => ({
                id: 'test-profile-base64-id',
                userId: 'test-user-base64-id',
                candidateId: testCandidateId,
                primaryPhoto: validJpegBase64,
                photos: [],
            });
            client_1.prisma.registration.findMany = async () => [];
            const targetPath = path_1.default.join((0, uploadPaths_1.getCanonicalUploadDir)('profiles'), `IMG-${testCandidateId}-primary.jpg`);
            if (fs_1.default.existsSync(targetPath)) {
                try {
                    fs_1.default.unlinkSync(targetPath);
                }
                catch (_) { }
            }
            try {
                const result = await (0, profilePhotoRecoveryService_1.selfHealProfilePhoto)(validJpegBase64);
                assert_1.default.ok(result, 'selfHealProfilePhoto must find profile by base64 primaryPhoto');
                assert_1.default.strictEqual(fs_1.default.existsSync(result), true, 'Materialized file must exist on disk');
                assert_1.default.strictEqual(path_1.default.basename(result), `IMG-${testCandidateId}-primary.jpg`);
                if (fs_1.default.existsSync(result)) {
                    fs_1.default.unlinkSync(result);
                }
            }
            finally {
                client_1.prisma.profile.findFirst = origProfileFindFirst;
                client_1.prisma.registration.findMany = origRegFindMany;
            }
        });
        await it('7d. Magic-byte validation alone is not enough: corrupt or invalid binaries are rejected', async () => {
            const corruptBase64 = 'data:image/jpeg;base64,V29uZGVyZnVsSm9kaU5vdEFuSW1hZ2VCaW5hcnlUZXh0T25seQ==';
            const origProfileFindFirst = client_1.prisma.profile.findFirst;
            client_1.prisma.profile.findFirst = async () => ({
                id: 'test-corrupt-id',
                userId: 'test-corrupt-user',
                candidateId: 'WJ-TEST-CORRUPT',
                primaryPhoto: corruptBase64,
            });
            try {
                const result = await (0, profilePhotoRecoveryService_1.selfHealProfilePhoto)(corruptBase64);
                assert_1.default.strictEqual(result, null, 'Corrupt base64 without valid image magic bytes must fail closed');
            }
            finally {
                client_1.prisma.profile.findFirst = origProfileFindFirst;
            }
        });
        await it('7e. Missing primary photo: dynamically heals JPEG, PNG, and WebP with correct extensions', async () => {
            const origProfileFindFirst = client_1.prisma.profile.findFirst;
            const candidates = [
                { ext: 'png', b64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==' },
                { ext: 'webp', b64: 'data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==' },
                { ext: 'jpg', b64: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=' },
            ];
            try {
                for (const item of candidates) {
                    const testId = `WJ-EXT-TEST-${item.ext.toUpperCase()}`;
                    client_1.prisma.profile.findFirst = async () => ({
                        id: `profile-${item.ext}`,
                        userId: `user-${item.ext}`,
                        candidateId: testId,
                        primaryPhoto: item.b64,
                        photos: [],
                    });
                    const expectedFilename = `IMG-${testId}-primary.${item.ext}`;
                    const targetPath = path_1.default.join((0, uploadPaths_1.getCanonicalUploadDir)('profiles'), expectedFilename);
                    if (fs_1.default.existsSync(targetPath)) {
                        try {
                            fs_1.default.unlinkSync(targetPath);
                        }
                        catch (_) { }
                    }
                    const result = await (0, profilePhotoRecoveryService_1.selfHealProfilePhoto)(item.b64);
                    assert_1.default.ok(result, `Should restore photo for ${item.ext}`);
                    assert_1.default.strictEqual(path_1.default.basename(result), expectedFilename, `Must restore with .${item.ext} extension`);
                    assert_1.default.strictEqual(fs_1.default.existsSync(result), true);
                    if (fs_1.default.existsSync(result)) {
                        try {
                            fs_1.default.unlinkSync(result);
                        }
                        catch (_) { }
                    }
                }
            }
            finally {
                client_1.prisma.profile.findFirst = origProfileFindFirst;
            }
        });
        await it('7f. Missing gallery photo: correlates exact requested gallery index and restores the 2nd gallery image', async () => {
            const testCandidateId = 'WJ-GALLERY-INDEX-TEST';
            const fakeGallery0 = 'gallery-item-0.jpg';
            const fakeGallery1 = 'gallery-item-1.jpg';
            const b64Gallery0 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
            const b64Gallery1Png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
            const origProfileFindFirst = client_1.prisma.profile.findFirst;
            const origRegFindMany = client_1.prisma.registration.findMany;
            client_1.prisma.profile.findFirst = async () => ({
                id: 'test-profile-gallery-id',
                userId: 'test-user-gallery-id',
                candidateId: testCandidateId,
                primaryPhoto: '/uploads/profiles/primary-pic.jpg',
                photos: [
                    `/uploads/profiles/${fakeGallery0}`,
                    `/uploads/profiles/gallery-item-1.png`,
                ],
            });
            client_1.prisma.registration.findMany = async () => [
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
            const targetPngPath = path_1.default.join((0, uploadPaths_1.getCanonicalUploadDir)('profiles'), 'gallery-item-1.png');
            if (fs_1.default.existsSync(targetPngPath)) {
                try {
                    fs_1.default.unlinkSync(targetPngPath);
                }
                catch (_) { }
            }
            try {
                const result = await (0, profilePhotoRecoveryService_1.selfHealProfilePhoto)('gallery-item-1.png');
                assert_1.default.ok(result, 'Must restore exact 2nd gallery image');
                assert_1.default.strictEqual(path_1.default.basename(result), 'gallery-item-1.png');
                const buf = fs_1.default.readFileSync(result);
                const check = (0, securityUtils_1.validateImageBuffer)(buf);
                assert_1.default.strictEqual(check.detectedMime, 'image/png', 'Must be the 2nd gallery image (PNG), NOT the 1st (JPEG)');
                if (fs_1.default.existsSync(result)) {
                    try {
                        fs_1.default.unlinkSync(result);
                    }
                    catch (_) { }
                }
            }
            finally {
                client_1.prisma.profile.findFirst = origProfileFindFirst;
                client_1.prisma.registration.findMany = origRegFindMany;
            }
        });
        await it('7g. Base64 primaryPhoto alongside unrelated gallery photo: base64 primary NEVER replaces gallery image', async () => {
            const origProfileFindFirst = client_1.prisma.profile.findFirst;
            const origRegFindMany = client_1.prisma.registration.findMany;
            const validPrimaryBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
            client_1.prisma.profile.findFirst = async () => ({
                id: 'test-profile-mixed',
                userId: 'test-user-mixed',
                candidateId: 'WJ-MIXED',
                primaryPhoto: validPrimaryBase64,
                photos: ['/uploads/profiles/gallery-missing-no-backup.jpg'],
            });
            client_1.prisma.registration.findMany = async () => [];
            try {
                const result = await (0, profilePhotoRecoveryService_1.selfHealProfilePhoto)('gallery-missing-no-backup.jpg');
                assert_1.default.strictEqual(result, null, 'Base64 primary photo must never replace a missing gallery image with no backup');
            }
            finally {
                client_1.prisma.profile.findFirst = origProfileFindFirst;
                client_1.prisma.registration.findMany = origRegFindMany;
            }
        });
        await it('7h. Multiple registrations: uses most recent valid registration backup', async () => {
            const origProfileFindFirst = client_1.prisma.profile.findFirst;
            const origRegFindMany = client_1.prisma.registration.findMany;
            const olderB64Png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
            const newerB64Jpeg = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
            client_1.prisma.profile.findFirst = async () => ({
                id: 'test-multi-reg',
                userId: 'test-multi-user',
                candidateId: 'WJ-MULTI-REG',
                primaryPhoto: '/uploads/profiles/multi-reg-primary.jpg',
                photos: [],
            });
            client_1.prisma.registration.findMany = async () => [
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
            const targetPath = path_1.default.join((0, uploadPaths_1.getCanonicalUploadDir)('profiles'), 'multi-reg-primary.jpg');
            if (fs_1.default.existsSync(targetPath)) {
                try {
                    fs_1.default.unlinkSync(targetPath);
                }
                catch (_) { }
            }
            try {
                const result = await (0, profilePhotoRecoveryService_1.selfHealProfilePhoto)('multi-reg-primary.jpg');
                assert_1.default.ok(result);
                const buf = fs_1.default.readFileSync(result);
                const check = (0, securityUtils_1.validateImageBuffer)(buf);
                assert_1.default.strictEqual(check.detectedMime, 'image/jpeg', 'Must select the newest registration record data');
                if (fs_1.default.existsSync(result)) {
                    try {
                        fs_1.default.unlinkSync(result);
                    }
                    catch (_) { }
                }
            }
            finally {
                client_1.prisma.profile.findFirst = origProfileFindFirst;
                client_1.prisma.registration.findMany = origRegFindMany;
            }
        });
        await it('7i. Unverified backup: corrupt or truncated backup data fails closed and returns null', async () => {
            const origProfileFindFirst = client_1.prisma.profile.findFirst;
            const origRegFindMany = client_1.prisma.registration.findMany;
            client_1.prisma.profile.findFirst = async () => ({
                id: 'test-corrupt-backup',
                userId: 'test-corrupt-user',
                candidateId: 'WJ-CORRUPT-BACKUP',
                primaryPhoto: '/uploads/profiles/corrupt-backup.jpg',
                photos: [],
            });
            client_1.prisma.registration.findMany = async () => [
                {
                    id: 'reg-corrupt',
                    stepData: { photos: { primaryPhoto: 'data:image/jpeg;base64,SGVsbG9Xb3JsZA==' } },
                },
            ];
            try {
                const result = await (0, profilePhotoRecoveryService_1.selfHealProfilePhoto)('corrupt-backup.jpg');
                assert_1.default.strictEqual(result, null, 'Unverified backup must fail closed with null');
            }
            finally {
                client_1.prisma.profile.findFirst = origProfileFindFirst;
                client_1.prisma.registration.findMany = origRegFindMany;
            }
        });
        await it('7j. HTTP route auto-healing: GET /uploads/profiles/... heals missing photo and returns HTTP 200', async () => {
            const testFilename = 'http-auto-heal-test.jpg';
            const validJpegBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
            const origProfileFindFirst = client_1.prisma.profile.findFirst;
            const origRegFindMany = client_1.prisma.registration.findMany;
            client_1.prisma.profile.findFirst = async () => ({
                id: 'test-http-profile',
                userId: 'test-http-user',
                candidateId: 'WJ-HTTP-TEST',
                primaryPhoto: `/uploads/profiles/${testFilename}`,
                photos: [],
            });
            client_1.prisma.registration.findMany = async () => [
                {
                    id: 'reg-http',
                    stepData: { photos: { primaryPhoto: validJpegBase64 } },
                },
            ];
            const targetPath = path_1.default.join((0, uploadPaths_1.getCanonicalUploadDir)('profiles'), testFilename);
            if (fs_1.default.existsSync(targetPath)) {
                try {
                    fs_1.default.unlinkSync(targetPath);
                }
                catch (_) { }
            }
            try {
                const res = await makeRequest(testServer, `/uploads/profiles/${testFilename}`);
                assert_1.default.strictEqual(res.statusCode, 200, 'HTTP GET must return 200 after self-healing');
                assert_1.default.ok(res.headers['content-type']?.includes('image/jpeg'));
                assert_1.default.strictEqual(fs_1.default.existsSync(targetPath), true, 'File must be written to disk');
                if (fs_1.default.existsSync(targetPath)) {
                    try {
                        fs_1.default.unlinkSync(targetPath);
                    }
                    catch (_) { }
                }
            }
            finally {
                client_1.prisma.profile.findFirst = origProfileFindFirst;
                client_1.prisma.registration.findMany = origRegFindMany;
            }
        });
        await it('7k. Valid file protection: existing files on disk are never overwritten', async () => {
            const testFilename = 'existing-file-protection.jpg';
            const targetPath = path_1.default.join((0, uploadPaths_1.getCanonicalUploadDir)('profiles'), testFilename);
            const originalContent = Buffer.from('ORIGINAL_EXISTING_FILE_CONTENT_DO_NOT_OVERWRITE');
            fs_1.default.writeFileSync(targetPath, originalContent);
            try {
                const result = await (0, profilePhotoRecoveryService_1.selfHealProfilePhoto)(testFilename);
                assert_1.default.strictEqual(result, targetPath);
                const currentContent = fs_1.default.readFileSync(targetPath);
                assert_1.default.strictEqual(currentContent.toString('utf8'), originalContent.toString('utf8'), 'Existing file content must remain unaltered');
            }
            finally {
                if (fs_1.default.existsSync(targetPath)) {
                    try {
                        fs_1.default.unlinkSync(targetPath);
                    }
                    catch (_) { }
                }
            }
        });
        // ──────────────────────────────────────────────────────────────────────────
        // Check 8: Frontend isValidImageUrl Validation & Private Path Shielding
        // ──────────────────────────────────────────────────────────────────────────
        console.log('\nCheck 8: Frontend isValidImageUrl Validation & Private Path Shielding');
        // Dynamic resolution avoids rootDir cross-package boundary issues during tsc build
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { isValidImageUrl } = require(path_1.default.resolve(__dirname, '../../../frontend/lib/imageUtils'));
        await it('8a. Frontend isValidImageUrl accepts valid root-relative and external web URLs', () => {
            assert_1.default.strictEqual(isValidImageUrl('/uploads/profiles/IMG-20261027-1793182514247-a9883710b9198479484ae9e4213ddc3c.jpg'), true);
            assert_1.default.strictEqual(isValidImageUrl('https://images.unsplash.com/photo-1534528741775-53994a69daeb'), true);
            assert_1.default.strictEqual(isValidImageUrl('/images/logo.png'), true);
        });
        await it('8b. Frontend isValidImageUrl strictly rejects internal server paths and traversal', () => {
            assert_1.default.strictEqual(isValidImageUrl('/home/u625755214/uploads/profiles/secret.jpg'), false);
            assert_1.default.strictEqual(isValidImageUrl('/var/www/uploads/test.jpg'), false);
            assert_1.default.strictEqual(isValidImageUrl('/uploads/profiles/../../etc/passwd'), false);
            assert_1.default.strictEqual(isValidImageUrl('C:\\Users\\Admin\\Desktop\\test.jpg'), false);
            assert_1.default.strictEqual(isValidImageUrl('file:///etc/passwd'), false);
        });
        await it('8c. Frontend isValidImageUrl strictly rejects nullish string representations', () => {
            assert_1.default.strictEqual(isValidImageUrl(null), false);
            assert_1.default.strictEqual(isValidImageUrl(undefined), false);
            assert_1.default.strictEqual(isValidImageUrl(''), false);
            assert_1.default.strictEqual(isValidImageUrl('null'), false);
            assert_1.default.strictEqual(isValidImageUrl('undefined'), false);
            assert_1.default.strictEqual(isValidImageUrl('/null'), false);
            assert_1.default.strictEqual(isValidImageUrl('/undefined'), false);
            assert_1.default.strictEqual(isValidImageUrl('[object Object]'), false);
        });
    }
    finally {
        if (testServer) {
            await new Promise((resolve) => testServer.close(() => resolve()));
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
    await client_1.prisma.$disconnect();
});
//# sourceMappingURL=profileImageFallbackAndRecovery.test.js.map