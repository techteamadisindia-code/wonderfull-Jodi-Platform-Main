"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const rateLimiters_1 = require("../middleware/rateLimiters");
const securityUtils_1 = require("../utils/securityUtils");
const router = (0, express_1.Router)();
const UPLOADS_DIR = path_1.default.join(process.cwd(), 'uploads', 'profiles');
if (!fs_1.default.existsSync(UPLOADS_DIR)) {
    fs_1.default.mkdirSync(UPLOADS_DIR, { recursive: true });
}
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
// Authenticated and Rate Limited Upload Endpoint
router.post('/upload', rateLimiters_1.uploadLimiter, authMiddleware_1.requireAuth, async (req, res, next) => {
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
        const binaryCheck = (0, securityUtils_1.validateImageBuffer)(buffer);
        if (!binaryCheck.valid) {
            return res.status(400).json({
                success: false,
                message: 'Corrupt or invalid image content. Genuine JPG, PNG, or WebP binary content is required.',
            });
        }
        const verifiedMime = binaryCheck.detectedMime || declaredMimeType;
        // Determine extension safely from verified binary MIME
        let ext = 'jpg';
        if (verifiedMime === 'image/png')
            ext = 'png';
        else if (verifiedMime === 'image/webp')
            ext = 'webp';
        else if (verifiedMime === 'image/jpeg' || verifiedMime === 'image/jpg')
            ext = 'jpg';
        // Generate non-guessable cryptographically random filename
        const randomHex = crypto_1.default.randomBytes(16).toString('hex');
        const safePrefix = (filename ? path_1.default.parse(filename).name : 'profile')
            .replace(/[^a-zA-Z0-9_-]/g, '')
            .substring(0, 12) || 'photo';
        const uniqueName = `${safePrefix}-${Date.now()}-${randomHex}.${ext}`;
        const filePath = path_1.default.join(UPLOADS_DIR, uniqueName);
        await fs_1.default.promises.writeFile(filePath, buffer);
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
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=uploadRoutes.js.map