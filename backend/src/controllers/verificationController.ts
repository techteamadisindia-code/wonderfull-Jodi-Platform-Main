import { Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { AuthRequest } from '../middleware/authMiddleware';
import { Verification } from '../models/Verification';
import { User } from '../models/User';
import { Profile } from '../models/Profile';
import { validateDocumentBuffer, isValidObjectId, sanitizeUser } from '../utils/securityUtils';

const VERIFICATIONS_DIR = path.join(process.cwd(), 'uploads', 'verifications');
if (!fs.existsSync(VERIFICATIONS_DIR)) {
  fs.mkdirSync(VERIFICATIONS_DIR, { recursive: true });
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
export async function submitVerification(req: AuthRequest, res: Response, next: NextFunction) {
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
    const existingPending = await Verification.findOne({
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
    const validation = validateDocumentBuffer(buffer);
    if (!validation.valid) {
      return res.status(415).json({
        success: false,
        message: 'Invalid file format. Only genuine PDF documents and JPG/PNG/WebP images are supported.',
      });
    }

    const verifiedMime = validation.detectedMime || declaredMime;
    const ext = validation.extension || 'pdf';

    // Count previous attempts for this user & doc type to increment attempt number
    const previousAttemptsCount = await Verification.countDocuments({
      user: userId,
      documentType: normalizedDocType,
    });
    const attemptNumber = previousAttemptsCount + 1;

    // Generate non-guessable, cryptographically safe filename
    const randomHex = crypto.randomBytes(16).toString('hex');
    const safeType = normalizedDocType.toLowerCase().replace(/[^a-z0-9]/g, '');
    const storageKey = `doc-${safeType}-${Date.now()}-${randomHex}.${ext}`;
    const filePath = path.join(VERIFICATIONS_DIR, storageKey);

    await fs.promises.writeFile(filePath, buffer);

    const documentUrl = `/api/verifications/document/${storageKey}`;

    const verification = await Verification.create({
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
    const currentUser = await User.findById(userId);
    if (currentUser && currentUser.verificationStatus !== 'VERIFIED') {
      await User.findByIdAndUpdate(userId, { verificationStatus: 'PENDING' });
      await Profile.findOneAndUpdate({ user: userId }, { verificationStatus: 'PENDING' });
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
  } catch (error) {
    next(error);
  }
}

/**
 * Get all verification submissions and status for current authenticated user
 */
export async function getUserVerifications(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const verifications = await Verification.find({ user: userId }).sort({ createdAt: -1 });

    const user = await User.findById(userId).select('verificationStatus verified');
    const profile = await Profile.findOne({ user: userId }).select('verificationStatus');

    // Summary breakdown by document category
    const categories = ['MEDICAL_REGISTRATION', 'DEGREE', 'GOVERNMENT_ID', 'EMPLOYMENT', 'PROFESSIONAL'];
    const summary: Record<string, any> = {};

    for (const cat of categories) {
      const latest = verifications.find(
        (v) => v.documentType === cat || (cat === 'MEDICAL_REGISTRATION' && v.documentType === 'PROFESSIONAL')
      );
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
  } catch (error) {
    next(error);
  }
}

/**
 * Get a single verification record for the user (with IDOR check)
 */
export async function getUserVerificationById(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid verification ID' });
    }

    const verification = await Verification.findById(id);
    if (!verification) {
      return res.status(404).json({ success: false, message: 'Verification record not found' });
    }

    // IDOR check: only owner or admin
    if (req.user?.role !== 'admin' && verification.user.toString() !== req.user?.userId) {
      return res.status(403).json({ success: false, message: 'Access forbidden: You do not own this document.' });
    }

    return res.json({ success: true, data: verification });
  } catch (error) {
    next(error);
  }
}

/**
 * IDOR / BOLA Protected Verification Document Streaming
 */
export async function serveVerificationDocument(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { filename } = req.params;
    if (!filename || typeof filename !== 'string') {
      return res.status(400).json({ success: false, message: 'Invalid document filename' });
    }

    // Prevent path traversal
    const safeFilename = path.basename(filename);
    const filePath = path.join(VERIFICATIONS_DIR, safeFilename);

    // Look up verification record
    const verification = await Verification.findOne({
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

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Document file is missing on storage.' });
    }

    // Set secure response headers
    res.setHeader('Content-Type', verification.fileType || 'application/pdf');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'");
    res.setHeader('Cache-Control', 'private, max-age=3600');

    // Stream file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    next(error);
  }
}
