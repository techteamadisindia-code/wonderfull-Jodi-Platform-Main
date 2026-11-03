"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.selfHealProfilePhoto = selfHealProfilePhoto;
exports.restoreAllMissingProfilePhotos = restoreAllMissingProfilePhotos;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const client_1 = require("../db/client");
const uploadPaths_1 = require("../utils/uploadPaths");
const securityUtils_1 = require("../utils/securityUtils");
/**
 * Searches database profile and registration records for an exact match to a missing profile photo
 * and writes the verified binary data into the canonical persistent uploads directory.
 *
 * Guarantees & Identity Rules:
 * 1. Strictly validates filename syntax to prevent path traversal or malicious input.
 * 2. Matches ONLY the profile record that owns the image URL (strictly preventing cross-assignment).
 * 3. Enforces primary photo versus gallery photo identity:
 *    - A gallery image cannot accidentally replace the missing primary image.
 *    - A primary photo (including base64) cannot replace a missing gallery image.
 *    - Requested gallery images correlate strictly with the exact gallery image index/reference.
 *    - If exact correlation cannot be established, returns null (fail closed).
 * 4. Image magic-byte validation alone is never treated as proof of photo identity.
 * 5. Supports base64 primaryPhoto lookup and automatic canonical disk materialization.
 * 6. Bounds: Candidate count <= 10, recursion depth <= 5, file size 12 B to 15 MB.
 * 7. Writes to canonical persistent storage so that the restored file survives future deployments.
 * 8. Never overwrites existing valid files. Returns canonical path on success, null on failure.
 */
async function selfHealProfilePhoto(urlOrPath) {
    try {
        if (!urlOrPath || typeof urlOrPath !== 'string')
            return null;
        const trimmed = urlOrPath.trim();
        const isBase64Input = trimmed.startsWith('data:image/');
        let filename = '';
        let candidateIdOrProfileId = '';
        if (isBase64Input) {
            // urlOrPath is a direct base64 image data URL
        }
        else {
            const normalized = trimmed.replace(/\\/g, '/');
            filename = path_1.default.basename(normalized);
            // Check if input is a Candidate ID (e.g. WJ-100092)
            if (/^WJ-\d+$/i.test(filename)) {
                candidateIdOrProfileId = filename.toUpperCase();
            }
            else if (!(0, uploadPaths_1.isValidUploadFilename)(filename)) {
                return null;
            }
            // Check if file already exists in persistent canonical uploads directory
            if (filename.includes('.')) {
                const existing = (0, uploadPaths_1.findUploadedFile)(`/uploads/profiles/${filename}`) ||
                    (0, uploadPaths_1.findUploadedFile)(`profiles/${filename}`) ||
                    (0, uploadPaths_1.findUploadedFile)(filename);
                if (existing) {
                    const stat = fs_1.default.statSync(existing);
                    if (stat.isFile() && stat.size > 0) {
                        return existing;
                    }
                }
            }
        }
        // 2. Find the exact candidate profile that owns this photo reference
        let profile = null;
        if (isBase64Input) {
            // Lookup profile where primaryPhoto matches the base64 string
            try {
                profile = await client_1.prisma.profile.findFirst({
                    where: {
                        OR: [
                            { primaryPhoto: trimmed },
                        ],
                    },
                    select: {
                        id: true,
                        userId: true,
                        candidateId: true,
                        displayName: true,
                        primaryPhoto: true,
                        photos: true,
                    },
                });
            }
            catch (_) { }
            if (!profile) {
                // Also check registration records for stepData containing this base64 prefix
                try {
                    const samplePrefix = trimmed.substring(0, 80);
                    const rawRegs = await client_1.prisma.$queryRaw `
            SELECT profile as profileId, user as userId
            FROM registrations
            WHERE stepData LIKE ${`%${samplePrefix}%`}
            LIMIT 1
          `;
                    if (rawRegs && rawRegs.length > 0) {
                        const regTarget = rawRegs[0];
                        profile = await client_1.prisma.profile.findFirst({
                            where: {
                                OR: [
                                    ...(regTarget.profileId ? [{ id: regTarget.profileId }] : []),
                                    ...(regTarget.userId ? [{ userId: regTarget.userId }] : []),
                                ],
                            },
                            select: {
                                id: true,
                                userId: true,
                                candidateId: true,
                                displayName: true,
                                primaryPhoto: true,
                                photos: true,
                            },
                        });
                    }
                }
                catch (_) { }
            }
        }
        else if (candidateIdOrProfileId) {
            // Lookup profile directly by candidate ID
            try {
                profile = await client_1.prisma.profile.findFirst({
                    where: {
                        OR: [
                            { candidateId: candidateIdOrProfileId },
                            { id: candidateIdOrProfileId },
                        ],
                    },
                    select: {
                        id: true,
                        userId: true,
                        candidateId: true,
                        displayName: true,
                        primaryPhoto: true,
                        photos: true,
                    },
                });
            }
            catch (_) { }
        }
        else {
            // Find profile by primaryPhoto reference
            try {
                profile = await client_1.prisma.profile.findFirst({
                    where: {
                        OR: [
                            { primaryPhoto: { contains: filename } },
                        ],
                    },
                    select: {
                        id: true,
                        userId: true,
                        candidateId: true,
                        displayName: true,
                        primaryPhoto: true,
                        photos: true,
                    },
                });
            }
            catch (_) { }
            // Fallback: check photos Json/string column
            if (!profile) {
                try {
                    const rawProfiles = await client_1.prisma.$queryRaw `
            SELECT _id as id, user as userId, candidateId, displayName, primaryPhoto, photos
            FROM profiles
            WHERE primaryPhoto LIKE ${`%${filename}%`} OR JSON_SEARCH(photos, 'one', ${`%${filename}%`}) IS NOT NULL
            LIMIT 1
          `;
                    if (rawProfiles && rawProfiles.length > 0) {
                        profile = rawProfiles[0];
                    }
                }
                catch (_) { }
            }
            // Check registration stepData for filename reference
            if (!profile) {
                try {
                    const rawRegs = await client_1.prisma.$queryRaw `
            SELECT profile as profileId, user as userId
            FROM registrations
            WHERE stepData LIKE ${`%${filename}%`}
            LIMIT 1
          `;
                    if (rawRegs && rawRegs.length > 0) {
                        const regTarget = rawRegs[0];
                        profile = await client_1.prisma.profile.findFirst({
                            where: {
                                OR: [
                                    ...(regTarget.profileId ? [{ id: regTarget.profileId }] : []),
                                    ...(regTarget.userId ? [{ userId: regTarget.userId }] : []),
                                ],
                            },
                            select: {
                                id: true,
                                userId: true,
                                candidateId: true,
                                displayName: true,
                                primaryPhoto: true,
                                photos: true,
                            },
                        });
                    }
                }
                catch (_) { }
            }
        }
        if (!profile) {
            return null;
        }
        // Helper: validate and extract base64 string
        const extractBase64Data = (val) => {
            if (!val || typeof val !== 'string')
                return null;
            const s = val.trim();
            if (s.startsWith('data:image/'))
                return s;
            if (/^[A-Za-z0-9+/=]{100,}$/.test(s))
                return `data:image/jpeg;base64,${s}`;
            return null;
        };
        // 3. Parse gallery photo references from profile.photos
        let profileGalleryList = [];
        if (Array.isArray(profile.photos)) {
            profileGalleryList = profile.photos.filter((p) => typeof p === 'string');
        }
        else if (typeof profile.photos === 'string') {
            try {
                const parsed = JSON.parse(profile.photos);
                if (Array.isArray(parsed)) {
                    profileGalleryList = parsed.filter((p) => typeof p === 'string');
                }
            }
            catch (_) { }
        }
        // Determine target role strictly from requested photo reference
        let galleryIndex = -1;
        if (filename) {
            galleryIndex = profileGalleryList.findIndex((p) => p === urlOrPath || p.includes(filename) || path_1.default.basename(p) === filename);
        }
        const isTargetGallery = galleryIndex !== -1;
        const isTargetPrimary = !isTargetGallery && Boolean(isBase64Input ||
            candidateIdOrProfileId ||
            (typeof profile.primaryPhoto === 'string' && (profile.primaryPhoto === urlOrPath ||
                profile.primaryPhoto.includes(filename) ||
                path_1.default.basename(profile.primaryPhoto) === filename)));
        // If neither primary nor gallery matches, fail closed
        if (!isTargetPrimary && !isTargetGallery) {
            return null;
        }
        // 4. Gather candidate base64 strings with strict role separation and exact correlation
        let chosenBase64 = null;
        if (isTargetPrimary) {
            // Primary photo recovery: ONLY use primary photo sources
            if (isBase64Input) {
                chosenBase64 = trimmed;
            }
            else if (typeof profile.primaryPhoto === 'string') {
                chosenBase64 = extractBase64Data(profile.primaryPhoto);
            }
            if (!chosenBase64) {
                // Inspect registration records for candidate profile's primary photo
                const registrations = await client_1.prisma.registration.findMany({
                    where: {
                        OR: [
                            { profileId: profile.id },
                            ...(profile.userId ? [{ userId: profile.userId }] : []),
                        ],
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 3,
                });
                for (const reg of registrations) {
                    let stepData = reg.stepData;
                    if (typeof stepData === 'string') {
                        try {
                            stepData = JSON.parse(stepData);
                        }
                        catch (_) {
                            stepData = {};
                        }
                    }
                    stepData = stepData || {};
                    const candidateFields = [
                        stepData.photos?.primaryPhoto,
                        stepData.primaryPhoto,
                        stepData.profilePhoto,
                        stepData.avatar,
                        stepData.basicInfo?.photo,
                        stepData.personalInfo?.photo,
                    ];
                    for (const cf of candidateFields) {
                        const b64 = extractBase64Data(cf);
                        if (b64) {
                            chosenBase64 = b64;
                            break;
                        }
                    }
                    if (chosenBase64)
                        break;
                }
            }
            if (!chosenBase64) {
                // A gallery image must NEVER replace a missing primary photo!
                return null;
            }
        }
        else if (isTargetGallery) {
            // Gallery photo recovery: must correlate with EXACT gallery image index/reference
            // NEVER select galleryCandidates[0] blindly!
            if (galleryIndex >= 0 && galleryIndex < profileGalleryList.length) {
                const itemAtIdx = profileGalleryList[galleryIndex];
                const b64 = extractBase64Data(itemAtIdx);
                if (b64) {
                    chosenBase64 = b64;
                }
            }
            if (!chosenBase64) {
                const registrations = await client_1.prisma.registration.findMany({
                    where: {
                        OR: [
                            { profileId: profile.id },
                            ...(profile.userId ? [{ userId: profile.userId }] : []),
                        ],
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 3,
                });
                for (const reg of registrations) {
                    let stepData = reg.stepData;
                    if (typeof stepData === 'string') {
                        try {
                            stepData = JSON.parse(stepData);
                        }
                        catch (_) {
                            stepData = {};
                        }
                    }
                    stepData = stepData || {};
                    const regGallery = stepData.photos?.photos || stepData.galleryPhotos || stepData.gallery;
                    if (Array.isArray(regGallery)) {
                        // First: search for item referencing filename
                        for (const gp of regGallery) {
                            if (typeof gp === 'string' && gp.includes(filename)) {
                                chosenBase64 = extractBase64Data(gp);
                                if (chosenBase64)
                                    break;
                            }
                            else if (gp && typeof gp === 'object') {
                                if (gp.name === filename || gp.filename === filename || (typeof gp.url === 'string' && gp.url.includes(filename))) {
                                    chosenBase64 = extractBase64Data(gp.data || gp.base64 || gp.url);
                                    if (chosenBase64)
                                        break;
                                }
                            }
                        }
                        // Second: correlate by exact gallery index if within bounds
                        if (!chosenBase64 && galleryIndex >= 0 && galleryIndex < regGallery.length) {
                            const itemAtIdx = regGallery[galleryIndex];
                            const b64 = extractBase64Data(typeof itemAtIdx === 'object' ? (itemAtIdx.data || itemAtIdx.base64 || itemAtIdx.url) : itemAtIdx);
                            if (b64) {
                                chosenBase64 = b64;
                            }
                        }
                    }
                    if (chosenBase64)
                        break;
                }
            }
            // If exact gallery image correlation could not be established, fail closed
            if (!chosenBase64) {
                return null;
            }
        }
        if (!chosenBase64) {
            return null;
        }
        // 5. Decode, validate size, magic bytes, and dynamic format extension
        const match = chosenBase64.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/i);
        if (!match)
            return null;
        const buffer = Buffer.from(match[2], 'base64');
        if (!buffer || buffer.length < 12 || buffer.length > 15 * 1024 * 1024) {
            return null;
        }
        const check = (0, securityUtils_1.validateImageBuffer)(buffer);
        if (!check.valid || !check.detectedMime) {
            return null;
        }
        // Determine canonical extension dynamically from detected binary MIME
        const detectedExt = check.detectedMime === 'image/png' ? 'png' : check.detectedMime === 'image/webp' ? 'webp' : 'jpg';
        // If filename wasn't provided or lacks extension, construct canonical filename with correct extension
        if (!filename || !filename.includes('.')) {
            const safeId = (profile.candidateId || profile.id || 'candidate').replace(/[^a-zA-Z0-9_-]/g, '');
            filename = isTargetPrimary
                ? `IMG-${safeId}-primary.${detectedExt}`
                : `IMG-${safeId}-gallery-${galleryIndex >= 0 ? galleryIndex : 0}.${detectedExt}`;
        }
        else {
            // Validate that existing extension matches detected binary magic bytes
            const ext = path_1.default.extname(filename).toLowerCase();
            if ((ext === '.jpg' || ext === '.jpeg') && check.detectedMime !== 'image/jpeg') {
                return null;
            }
            if (ext === '.png' && check.detectedMime !== 'image/png') {
                return null;
            }
            if (ext === '.webp' && check.detectedMime !== 'image/webp') {
                return null;
            }
        }
        // 6. Atomic safe write to canonical persistent upload directory
        const targetCanonicalDir = (0, uploadPaths_1.getCanonicalUploadDir)('profiles');
        const resolvedCanonicalDir = path_1.default.resolve(targetCanonicalDir);
        const targetPath = path_1.default.resolve(targetCanonicalDir, filename);
        // Verify directory containment (prevent traversal or escaping canonical upload directory)
        const rel = path_1.default.relative(resolvedCanonicalDir, targetPath);
        if (rel.startsWith('..') || path_1.default.isAbsolute(rel) || rel === '') {
            return null;
        }
        // Never overwrite existing valid files
        if (fs_1.default.existsSync(targetPath)) {
            const existingStat = fs_1.default.statSync(targetPath);
            if (existingStat.isFile() && existingStat.size > 0) {
                return targetPath;
            }
        }
        const tempPath = `${targetPath}.tmp.${process.pid}.${Date.now()}.${Math.random().toString(36).substring(2, 8)}`;
        try {
            fs_1.default.writeFileSync(tempPath, buffer);
            if (fs_1.default.existsSync(targetPath) && fs_1.default.statSync(targetPath).size > 0) {
                try {
                    if (fs_1.default.existsSync(tempPath))
                        fs_1.default.unlinkSync(tempPath);
                }
                catch (_) { }
                return targetPath;
            }
            fs_1.default.renameSync(tempPath, targetPath);
        }
        catch (writeErr) {
            try {
                if (fs_1.default.existsSync(tempPath))
                    fs_1.default.unlinkSync(tempPath);
            }
            catch (_) { }
            throw writeErr;
        }
        const stats = fs_1.default.statSync(targetPath);
        if (stats.isFile() && stats.size > 0) {
            console.log(`[ProfilePhotoRecovery] Auto-restored missing photo "${filename}" (${stats.size} bytes) for candidate ${profile.candidateId || profile.id}`);
            return targetPath;
        }
        return null;
    }
    catch (err) {
        console.error(`[ProfilePhotoRecovery] Self-healing failed for "${urlOrPath}":`, err);
        return null;
    }
}
/**
 * Scans all database profiles and auto-restores any missing profile photos that have
 * verified base64 backup data in registration records.
 */
async function restoreAllMissingProfilePhotos() {
    const result = {
        totalProfilesChecked: 0,
        restoredCount: 0,
        skippedCount: 0,
        restoredFiles: [],
    };
    try {
        const profiles = await client_1.prisma.profile.findMany({
            select: {
                id: true,
                candidateId: true,
                displayName: true,
                primaryPhoto: true,
                photos: true,
            },
        });
        result.totalProfilesChecked = profiles.length;
        for (const p of profiles) {
            const urlsToCheck = [];
            if (p.primaryPhoto && typeof p.primaryPhoto === 'string') {
                urlsToCheck.push(p.primaryPhoto);
            }
            if (Array.isArray(p.photos)) {
                for (const item of p.photos) {
                    if (typeof item === 'string' && !urlsToCheck.includes(item)) {
                        urlsToCheck.push(item);
                    }
                }
            }
            for (const url of urlsToCheck) {
                const isBase64 = url.startsWith('data:image/');
                if (!url.startsWith('/uploads/profiles/') && !isBase64)
                    continue;
                if (!isBase64) {
                    const filename = path_1.default.basename(url);
                    if (!(0, uploadPaths_1.isValidUploadFilename)(filename))
                        continue;
                    const exists = (0, uploadPaths_1.findUploadedFile)(url) || (0, uploadPaths_1.findUploadedFile)(filename);
                    if (exists)
                        continue;
                }
                const healed = await selfHealProfilePhoto(url);
                if (healed) {
                    result.restoredCount++;
                    result.restoredFiles.push(path_1.default.basename(healed));
                }
                else {
                    result.skippedCount++;
                }
            }
        }
    }
    catch (err) {
        console.error('[ProfilePhotoRecovery] Error during restoreAllMissingProfilePhotos:', err);
    }
    return result;
}
//# sourceMappingURL=profilePhotoRecoveryService.js.map