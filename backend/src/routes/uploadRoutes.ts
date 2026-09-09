import { Router, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { requireAuth, AuthRequest } from '../middleware/authMiddleware';
import { uploadLimiter } from '../middleware/rateLimiters';
import { validateImageBuffer } from '../utils/securityUtils';

const router = Router();

const UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'profiles');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

// Authenticated and Rate Limited Upload Endpoint
router.post('/upload', uploadLimiter, requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { image, base64, filename } = req.body;
    const rawData = image || base64;

    if (!rawData || typeof rawData !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'No image data provided. Please provide a valid Base64 image.',
      });
    }

    // Extract mime type and base64 payload
    const matches = rawData.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    let declaredMimeType = 'image/jpeg';
    let base64Data = rawData;

    if (matches) {
      declaredMimeType = matches[1].toLowerCase();
      base64Data = matches[2];
    }

    if (!ALLOWED_MIME_TYPES.includes(declaredMimeType) && !ALLOWED_MIME_TYPES.includes(`image/${declaredMimeType}`)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file type. Only JPG, JPEG, PNG, and WebP images are allowed.',
      });
    }

    const buffer = Buffer.from(base64Data, 'base64');
    if (buffer.length > MAX_FILE_SIZE) {
      return res.status(400).json({
        success: false,
        message: 'File size exceeds maximum allowed limit of 5MB.',
      });
    }

    // ─── BINARY MAGIC BYTES INSPECTION ───
    // Verify true binary header bytes rather than trusting client headers or Base64 prefix
    const binaryCheck = validateImageBuffer(buffer);
    if (!binaryCheck.valid) {
      return res.status(400).json({
        success: false,
        message: 'Corrupt or invalid image content. Genuine JPG, PNG, or WebP binary content is required.',
      });
    }

    const verifiedMime = binaryCheck.detectedMime || declaredMimeType;

    // Determine extension safely from verified binary MIME
    let ext = 'jpg';
    if (verifiedMime === 'image/png') ext = 'png';
    else if (verifiedMime === 'image/webp') ext = 'webp';
    else if (verifiedMime === 'image/jpeg' || verifiedMime === 'image/jpg') ext = 'jpg';

    // Generate non-guessable cryptographically random filename
    const randomHex = crypto.randomBytes(16).toString('hex');
    const safePrefix = (filename ? path.parse(filename).name : 'profile')
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .substring(0, 12) || 'photo';

    const uniqueName = `${safePrefix}-${Date.now()}-${randomHex}.${ext}`;
    const filePath = path.join(UPLOADS_DIR, uniqueName);

    await fs.promises.writeFile(filePath, buffer);

    const publicUrl = `/uploads/profiles/${uniqueName}`;

    return res.status(201).json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        url: publicUrl,
        filename: uniqueName,
        size: buffer.length,
        mimeType: verifiedMime,
      },
      url: publicUrl,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
