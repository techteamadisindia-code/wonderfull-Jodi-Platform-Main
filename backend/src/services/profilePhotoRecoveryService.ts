import fs from 'fs';
import path from 'path';
import { prisma } from '../db/client';
import {
  findUploadedFile,
  getCanonicalUploadDir,
  isValidUploadFilename,
} from '../utils/uploadPaths';
import { validateImageBuffer } from '../utils/securityUtils';

/**
 * Searches database profile and registration records for an exact match to a missing profile photo
 * and writes the verified binary data into the canonical persistent uploads directory.
 *
 * Guarantees:
 * 1. Strictly validates filename syntax to prevent path traversal or malicious input.
 * 2. Matches ONLY the profile record that owns the image URL (strictly preventing cross-assignment).
 * 3. Inspects binary magic bytes (JPEG, PNG, WebP) before writing.
 * 4. Writes to canonical persistent storage so that the restored file survives future deployments.
 * 5. Returns canonical path on success or null on failure (never throws, fails safely).
 */
export async function selfHealProfilePhoto(urlOrPath: string): Promise<string | null> {
  try {
    if (!urlOrPath || typeof urlOrPath !== 'string') return null;

    // 1. Extract pure filename
    const trimmed = urlOrPath.trim().replace(/\\/g, '/');
    const filename = path.basename(trimmed);
    if (!isValidUploadFilename(filename)) {
      return null;
    }

    // 2. If file already exists anywhere in candidate directories, return it immediately
    const existing =
      findUploadedFile(`/uploads/profiles/${filename}`) ||
      findUploadedFile(`profiles/${filename}`) ||
      findUploadedFile(filename);
    if (existing) {
      return existing;
    }

    // 3. Find candidate profile that owns this photo
    let profile: any = null;
    try {
      profile = await prisma.profile.findFirst({
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
    } catch (_) {
      // In case contains filter is unsupported for specific column types, fallback safely
    }

    // If not found by primaryPhoto contains, check raw query for photos Json column or primaryPhoto
    if (!profile) {
      try {
        const rawProfiles: any[] = await prisma.$queryRaw`
          SELECT _id as id, user as userId, candidateId, displayName, primaryPhoto, photos
          FROM profiles
          WHERE primaryPhoto LIKE ${`%${filename}%`} OR JSON_SEARCH(photos, 'one', ${`%${filename}%`}) IS NOT NULL
          LIMIT 1
        `;
        if (rawProfiles && rawProfiles.length > 0) {
          profile = rawProfiles[0];
        }
      } catch (_) {}
    }

    if (!profile) {
      return null;
    }

    // 4. Gather candidate base64 strings from Profile and Registration records belonging to this profile/user
    const candidateBase64Strings: string[] = [];

    // Check profile.photos if any item is a base64 string
    if (Array.isArray(profile.photos)) {
      for (const p of profile.photos) {
        if (typeof p === 'string' && p.startsWith('data:image/')) {
          candidateBase64Strings.push(p);
        }
      }
    } else if (typeof profile.photos === 'string' && profile.photos.startsWith('data:image/')) {
      candidateBase64Strings.push(profile.photos);
    }

    // Find registration record for this profile/user
    const registrations = await prisma.registration.findMany({
      where: {
        OR: [
          { profileId: profile.id },
          ...(profile.userId ? [{ userId: profile.userId }] : []),
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    for (const reg of registrations) {
      const stepData: any = reg.stepData || {};

      // Check stepData.photos
      if (stepData.photos?.primaryPhoto && typeof stepData.photos.primaryPhoto === 'string') {
        if (stepData.photos.primaryPhoto.startsWith('data:image/')) {
          candidateBase64Strings.push(stepData.photos.primaryPhoto);
        }
      }
      if (Array.isArray(stepData.photos?.photos)) {
        for (const item of stepData.photos.photos) {
          if (typeof item === 'string' && item.startsWith('data:image/')) {
            candidateBase64Strings.push(item);
          }
        }
      }

      // Check stepData.preferences.photos
      if (stepData.preferences?.photos?.primaryPhoto && typeof stepData.preferences.photos.primaryPhoto === 'string') {
        if (stepData.preferences.photos.primaryPhoto.startsWith('data:image/')) {
          candidateBase64Strings.push(stepData.preferences.photos.primaryPhoto);
        }
      }

      // Check stepData.rawFormData.photos
      if (stepData.rawFormData?.photos?.primaryPhoto && typeof stepData.rawFormData.photos.primaryPhoto === 'string') {
        if (stepData.rawFormData.photos.primaryPhoto.startsWith('data:image/')) {
          candidateBase64Strings.push(stepData.rawFormData.photos.primaryPhoto);
        }
      }
    }

    if (candidateBase64Strings.length === 0) {
      return null;
    }

    // 5. Decode and validate candidate base64 image data
    for (const rawData of candidateBase64Strings) {
      const match = rawData.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
      if (!match) continue;

      try {
        const buffer = Buffer.from(match[2], 'base64');
        // Validate buffer size: must be at least 12 bytes and at most 15 MB
        if (!buffer || buffer.length < 12 || buffer.length > 15 * 1024 * 1024) {
          continue;
        }

        const check = validateImageBuffer(buffer);
        if (!check.valid || !check.detectedMime) continue;

        // Verify image signature matches the target file extension
        const ext = path.extname(filename).toLowerCase();
        if ((ext === '.jpg' || ext === '.jpeg') && check.detectedMime !== 'image/jpeg') {
          continue;
        }
        if (ext === '.png' && check.detectedMime !== 'image/png') {
          continue;
        }
        if (ext === '.webp' && check.detectedMime !== 'image/webp') {
          continue;
        }

        // Write to canonical persistent upload directory
        const canonicalDir = getCanonicalUploadDir('profiles');
        const resolvedCanonicalDir = path.resolve(canonicalDir);
        const targetPath = path.resolve(canonicalDir, filename);

        // Verify directory containment (prevent traversal or escape)
        const rel = path.relative(resolvedCanonicalDir, targetPath);
        if (rel.startsWith('..') || path.isAbsolute(rel) || rel === '') {
          continue;
        }

        // Avoid overwriting a valid existing photo
        if (fs.existsSync(targetPath)) {
          const existingStat = fs.statSync(targetPath);
          if (existingStat.isFile() && existingStat.size > 0) {
            return targetPath;
          }
        }

        // Atomically write to unique temporary file and rename to avoid partial writes or race conditions
        const tempPath = `${targetPath}.tmp.${process.pid}.${Date.now()}.${Math.random().toString(36).substring(2, 8)}`;
        try {
          fs.writeFileSync(tempPath, buffer);

          // Re-check destination in case a concurrent request already restored it
          if (fs.existsSync(targetPath) && fs.statSync(targetPath).size > 0) {
            try {
              if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
            } catch (_) {}
            return targetPath;
          }

          fs.renameSync(tempPath, targetPath);
        } catch (writeErr) {
          try {
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
          } catch (_) {}
          throw writeErr;
        }

        const stats = fs.statSync(targetPath);
        if (stats.isFile() && stats.size > 0) {
          console.log(
            `[ProfilePhotoRecovery] Auto-restored missing photo "${filename}" (${stats.size} bytes) for candidate ${profile.candidateId || profile.id}`
          );
          return targetPath;
        }
      } catch (err) {
        console.error(`[ProfilePhotoRecovery] Error writing restored file "${filename}":`, err);
      }
    }

    return null;
  } catch (err) {
    console.error(`[ProfilePhotoRecovery] Self-healing failed for "${urlOrPath}":`, err);
    return null;
  }
}

/**
 * Scans all database profiles and auto-restores any missing profile photos that have
 * verified base64 backup data in registration records.
 */
export async function restoreAllMissingProfilePhotos(): Promise<{
  totalProfilesChecked: number;
  restoredCount: number;
  skippedCount: number;
  restoredFiles: string[];
}> {
  const result = {
    totalProfilesChecked: 0,
    restoredCount: 0,
    skippedCount: 0,
    restoredFiles: [] as string[],
  };

  try {
    const profiles = await prisma.profile.findMany({
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
      const urlsToCheck: string[] = [];
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
        if (!url.startsWith('/uploads/profiles/')) continue;
        const filename = path.basename(url);
        if (!isValidUploadFilename(filename)) continue;

        const exists = findUploadedFile(url) || findUploadedFile(filename);
        if (!exists) {
          const healed = await selfHealProfilePhoto(filename);
          if (healed) {
            result.restoredCount++;
            result.restoredFiles.push(filename);
          } else {
            result.skippedCount++;
          }
        }
      }
    }
  } catch (err) {
    console.error('[ProfilePhotoRecovery] Error during restoreAllMissingProfilePhotos:', err);
  }

  return result;
}
