"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitVerification = submitVerification;
exports.getUserVerifications = getUserVerifications;
exports.getUserVerificationById = getUserVerificationById;
exports.serveVerificationDocument = serveVerificationDocument;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const Verification_1 = require("../models/Verification");
const User_1 = require("../models/User");
const Profile_1 = require("../models/Profile");
const securityUtils_1 = require("../utils/securityUtils");
const VERIFICATIONS_DIR = path_1.default.join(process.cwd(), 'uploads', 'verifications');
if (!fs_1.default.existsSync(VERIFICATIONS_DIR)) {
    fs_1.default.mkdirSync(VERIFICATIONS_DIR, { recursive: true });
}
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_DOCUMENT_TYPES = [
    'GOVERNMENT_ID',
    'DEGREE',
    'PROFESSIONAL',
    'MEDICAL_REGISTRATION',
    'EMPLOYMENT',
    'OTHER',
];
/**
 * Submit a verification document for review
 */
async function submitVerification(req, res, next) {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        const { documentType, documentName, file, base64, filename } = req.body;
        const rawData = file || base64;
        if (!documentType || !ALLOWED_DOCUMENT_TYPES.includes(documentType.toUpperCase())) {
            return res.status(400).json({
                success: false,
                message: `Invalid document type. Allowed types: ${ALLOWED_DOCUMENT_TYPES.join(', ')}`,
            });
        }
        if (!rawData || typeof rawData !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'No document file data provided. Please provide a valid Base64 file.',
            });
        }
        const normalizedDocType = documentType.toUpperCase();
        // Check for duplicate pending requests for this document type
        const existingPending = await Verification_1.Verification.findOne({
            user: userId,
            documentType: normalizedDocType,
            status: 'PENDING',
        });
        if (existingPending) {
            return res.status(400).json({
                success: false,
                message: 'You already have a pending verification submission for this document type. Please await administrator review.',
            });
        }
        // Extract mime type and base64 payload
        let declaredMime = 'application/pdf';
        let base64Data = rawData;
        const matches = rawData.match(/^data:([a-zA-Z0-9/+-]+);base64,(.+)$/);
        if (matches) {
            declaredMime = matches[1].toLowerCase();
            base64Data = matches[2];
        }
        const buffer = Buffer.from(base64Data, 'base64');
        if (buffer.length > MAX_DOCUMENT_SIZE) {
            return res.status(413).json({
                success: false,
                message: 'Document file size exceeds the maximum allowed limit of 10MB.',
            });
        }
        // Inspect binary magic bytes to verify genuine PDF or image
        const validation = (0, securityUtils_1.validateDocumentBuffer)(buffer);
        if (!validation.valid) {
            return res.status(415).json({
                success: false,
                message: 'Invalid file format. Only genuine PDF documents and JPG/PNG/WebP images are supported.',
            });
        }
        const verifiedMime = validation.detectedMime || declaredMime;
        const ext = validation.extension || 'pdf';
        // Count previous attempts for this user & doc type to increment attempt number
        const previousAttemptsCount = await Verification_1.Verification.countDocuments({
            user: userId,
            documentType: normalizedDocType,
        });
        const attemptNumber = previousAttemptsCount + 1;
        // Generate non-guessable, cryptographically safe filename
        const randomHex = crypto_1.default.randomBytes(16).toString('hex');
        const safeType = normalizedDocType.toLowerCase().replace(/[^a-z0-9]/g, '');
        const storageKey = `doc-${safeType}-${Date.now()}-${randomHex}.${ext}`;
        const filePath = path_1.default.join(VERIFICATIONS_DIR, storageKey);
        await fs_1.default.promises.writeFile(filePath, buffer);
        const documentUrl = `/api/verifications/document/${storageKey}`;
        const verification = await Verification_1.Verification.create({
            user: userId,
            documentType: normalizedDocType,
            documentName: documentName?.trim() || `${normalizedDocType} Document (Attempt #${attemptNumber})`,
            documentUrl,
            storageKey,
            fileType: verifiedMime,
            fileSize: buffer.length,
            status: 'PENDING',
            submittedAt: new Date(),
            attemptNumber,
        });
        // Update user & profile status to PENDING if not already fully VERIFIED
        const currentUser = await User_1.User.findById(userId);
        if (currentUser && currentUser.verificationStatus !== 'VERIFIED') {
            await User_1.User.findByIdAndUpdate(userId, { verificationStatus: 'PENDING' });
            await Profile_1.Profile.findOneAndUpdate({ user: userId }, { verificationStatus: 'PENDING' });
        }
        return res.status(201).json({
            success: true,
            message: 'Your document has been submitted and is awaiting administrator verification.',
            data: {
                _id: verification._id,
                documentType: verification.documentType,
                documentName: verification.documentName,
                documentUrl: verification.documentUrl,
                storageKey: verification.storageKey,
                fileType: verification.fileType,
                fileSize: verification.fileSize,
                status: verification.status,
                submittedAt: verification.submittedAt,
                attemptNumber: verification.attemptNumber,
            },
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Get all verification submissions and status for current authenticated user
 */
async function getUserVerifications(req, res, next) {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        const verifications = await Verification_1.Verification.find({ user: userId }).sort({ createdAt: -1 });
        const user = await User_1.User.findById(userId).select('verificationStatus verified');
        const profile = await Profile_1.Profile.findOne({ user: userId }).select('verificationStatus');
        // Summary breakdown by document category
        const categories = ['MEDICAL_REGISTRATION', 'DEGREE', 'GOVERNMENT_ID', 'EMPLOYMENT', 'PROFESSIONAL'];
        const summary = {};
        for (const cat of categories) {
            const latest = verifications.find((v) => v.documentType === cat || (cat === 'MEDICAL_REGISTRATION' && v.documentType === 'PROFESSIONAL'));
            summary[cat] = latest
                ? {
                    id: latest._id,
                    status: latest.status,
                    documentName: latest.documentName,
                    submittedAt: latest.submittedAt,
                    reviewedAt: latest.reviewedAt,
                    rejectionReason: latest.rejectionReason,
                    adminNotes: latest.adminNotes,
                    attemptNumber: latest.attemptNumber,
                    documentUrl: latest.documentUrl,
                }
                : { status: 'NOT_SUBMITTED' };
        }
        return res.json({
            success: true,
            data: verifications,
            summary,
            overallStatus: user?.verificationStatus || 'UNVERIFIED',
            isVerified: Boolean(user?.verified),
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Get a single verification record for the user (with IDOR check)
 */
async function getUserVerificationById(req, res, next) {
    try {
        const { id } = req.params;
        if (!(0, securityUtils_1.isValidObjectId)(id)) {
            return res.status(400).json({ success: false, message: 'Invalid verification ID' });
        }
        const verification = await Verification_1.Verification.findById(id);
        if (!verification) {
            return res.status(404).json({ success: false, message: 'Verification record not found' });
        }
        // IDOR check: only owner or admin
        if (req.user?.role !== 'admin' && verification.user.toString() !== req.user?.userId) {
            return res.status(403).json({ success: false, message: 'Access forbidden: You do not own this document.' });
        }
        return res.json({ success: true, data: verification });
    }
    catch (error) {
        next(error);
    }
}
/**
 * IDOR / BOLA Protected Verification Document Streaming
 */
async function serveVerificationDocument(req, res, next) {
    try {
        const { filename } = req.params;
        if (!filename || typeof filename !== 'string') {
            return res.status(400).json({ success: false, message: 'Invalid document filename' });
        }
        // Prevent path traversal
        const safeFilename = path_1.default.basename(filename);
        const filePath = path_1.default.join(VERIFICATIONS_DIR, safeFilename);
        // Look up verification record
        const verification = await Verification_1.Verification.findOne({
            $or: [
                { storageKey: safeFilename },
                { documentUrl: { $regex: safeFilename } },
            ],
        });
        if (!verification) {
            return res.status(404).json({ success: false, message: 'Verification document not found' });
        }
        // IDOR / BOLA Authorization check:
        // Requester must be either the owner or an authenticated admin
        const isOwner = req.user && verification.user.toString() === req.user.userId;
        const isAdmin = req.user && req.user.role === 'admin';
        if (!isOwner && !isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Access forbidden: You are not authorized to access this verification document.',
            });
        }
        if (!fs_1.default.existsSync(filePath)) {
            return res.status(404).json({ success: false, message: 'Document file is missing on storage.' });
        }
        // Set secure response headers
        res.setHeader('Content-Type', verification.fileType || 'application/pdf');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'");
        res.setHeader('Cache-Control', 'private, max-age=3600');
        // Stream file
        const fileStream = fs_1.default.createReadStream(filePath);
        fileStream.pipe(res);
    }
    catch (error) {
        next(error);
    }
}
//# sourceMappingURL=verificationController.js.map