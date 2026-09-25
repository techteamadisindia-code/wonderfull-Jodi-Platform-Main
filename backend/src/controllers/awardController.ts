import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { AuthRequest } from '../middleware/authMiddleware';
import { Award, IAward } from '../models/Award';
import { AuditLog } from '../models/AuditLog';
import { escapeRegex, validateImageBuffer } from '../utils/securityUtils';

const UPLOADS_AWARDS_DIR = path.join(process.cwd(), 'uploads', 'awards');
if (!fs.existsSync(UPLOADS_AWARDS_DIR)) {
  fs.mkdirSync(UPLOADS_AWARDS_DIR, { recursive: true });
}

/**
 * Generates clean, unique slug from award name
 */
export async function generateUniqueAwardSlug(name: string, excludeId?: string): Promise<string> {
  let baseSlug = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!baseSlug) {
    baseSlug = `award-${Date.now()}`;
  }

  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const query: any = { slug };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    const existing = await Award.findOne(query).select('_id').lean();
    if (!existing) {
      return slug;
    }
    counter += 1;
    slug = `${baseSlug}-${counter}`;
  }
}

function safeObjectId(id?: string): mongoose.Types.ObjectId | undefined {
  if (id && mongoose.Types.ObjectId.isValid(id)) {
    return new mongoose.Types.ObjectId(id);
  }
  return undefined;
}

/**
 * Audit log helper for Award activities
 */
async function logAwardAudit(
  req: AuthRequest,
  action: string,
  details: string,
  targetId: string,
  extra: {
    previousStatus?: string;
    newStatus?: string;
    metadata?: Record<string, any>;
  } = {}
) {
  try {
    const adminEmail = req.user?.email || 'admin@wonderfuljodi.com';
    const adminUserId = safeObjectId(req.user?.userId);
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      '127.0.0.1';

    await AuditLog.create({
      adminUser: adminUserId,
      adminEmail,
      action,
      targetModel: 'Award',
      targetId: String(targetId),
      previousStatus: extra.previousStatus,
      newStatus: extra.newStatus,
      details,
      ipAddress,
      status: 'SUCCESS',
      metadata: extra.metadata,
    });
  } catch (err) {
    console.error('[Award AuditLog] Failed to record audit:', err);
  }
}

// ══════════════════════════════════════════════════════════════
// PUBLIC AWARDS CONTROLLERS
// ══════════════════════════════════════════════════════════════

/**
 * GET /api/awards
 * Retrieves active awards for public display (with optional featured filter)
 */
export async function getPublicAwards(req: Request, res: Response, next: NextFunction) {
  try {
    const { featured } = req.query;

    const query: any = {
      isActive: true,
      isDeleted: false,
    };

    if (featured === 'true' || featured === '1') {
      query.isFeatured = true;
    }

    const awards = await Award.find(query)
      .sort({ displayOrder: 1, awardYear: -1, createdAt: -1 })
      .select('name slug logo shortDescription awardYear category organization galleryImages websiteUrl displayOrder isFeatured')
      .lean();

    return res.status(200).json({
      success: true,
      count: awards.length,
      data: awards,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/awards/:slug
 * Retrieves single active award by its slug
 */
export async function getPublicAwardBySlug(req: Request, res: Response, next: NextFunction) {
  try {
    const slug = (req.params.slug || '').toLowerCase().trim();

    if (!slug) {
      return res.status(400).json({
        success: false,
        message: 'Valid award slug is required',
      });
    }

    const award = await Award.findOne({
      slug,
      isActive: true,
      isDeleted: false,
    }).lean();

    if (!award) {
      return res.status(404).json({
        success: false,
        message: 'Award not found or is currently inactive',
      });
    }

    // Other related active awards
    const otherAwards = await Award.find({
      _id: { $ne: (award as any)._id },
      isActive: true,
      isDeleted: false,
    })
      .select('name slug logo shortDescription awardYear category organization')
      .sort({ displayOrder: 1, awardYear: -1 })
      .limit(4)
      .lean();

    return res.status(200).json({
      success: true,
      data: award,
      otherAwards,
    });
  } catch (error) {
    next(error);
  }
}

// ══════════════════════════════════════════════════════════════
// ADMIN AWARDS CONTROLLERS (Admin & Super Admin Only)
// ══════════════════════════════════════════════════════════════

/**
 * GET /api/admin/awards
 * Returns all awards (active, inactive, drafts) with KPI stats & pagination
 */
export async function getAdminAwards(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const { status, search, category, sort } = req.query;

    const query: any = { isDeleted: false };

    if (status === 'ACTIVE') {
      query.isActive = true;
    } else if (status === 'INACTIVE') {
      query.isActive = false;
    } else if (status === 'FEATURED') {
      query.isFeatured = true;
    }

    if (category && typeof category === 'string' && category !== 'ALL') {
      query.category = category.trim();
    }

    if (search && typeof search === 'string' && search.trim()) {
      const sanitized = escapeRegex(search.trim());
      query.$or = [
        { name: { $regex: sanitized, $options: 'i' } },
        { organization: { $regex: sanitized, $options: 'i' } },
        { category: { $regex: sanitized, $options: 'i' } },
        { slug: { $regex: sanitized, $options: 'i' } },
      ];
    }

    let sortOption: any = { displayOrder: 1, awardYear: -1, createdAt: -1 };
    if (sort === 'year_desc') sortOption = { awardYear: -1 };
    if (sort === 'year_asc') sortOption = { awardYear: 1 };
    if (sort === 'name_asc') sortOption = { name: 1 };
    if (sort === 'newest') sortOption = { createdAt: -1 };

    const [awards, total, totalAll, totalActive, totalFeatured, totalInactive] =
      await Promise.all([
        Award.find(query)
          .sort(sortOption)
          .skip(skip)
          .limit(limit)
          .populate('createdBy', 'fullName email')
          .populate('updatedBy', 'fullName email')
          .lean(),
        Award.countDocuments(query),
        Award.countDocuments({ isDeleted: false }),
        Award.countDocuments({ isDeleted: false, isActive: true }),
        Award.countDocuments({ isDeleted: false, isFeatured: true, isActive: true }),
        Award.countDocuments({ isDeleted: false, isActive: false }),
      ]);

    return res.status(200).json({
      success: true,
      stats: {
        total: totalAll,
        active: totalActive,
        featured: totalFeatured,
        inactive: totalInactive,
      },
      data: awards,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/awards/:id
 * Retrieves single award by ID
 */
export async function getAdminAwardById(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid award ID format' });
    }

    const award = await Award.findById(id)
      .populate('createdBy', 'fullName email')
      .populate('updatedBy', 'fullName email')
      .lean();

    if (!award || (award as any).isDeleted) {
      return res.status(404).json({ success: false, message: 'Award not found' });
    }

    return res.status(200).json({
      success: true,
      data: award,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/awards
 * Creates new award
 */
export async function createAward(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const {
      name,
      slug: customSlug,
      logo,
      shortDescription,
      fullDescription = '',
      awardYear,
      category = 'Excellence in Matrimony',
      organization,
      galleryImages = [],
      websiteUrl,
      displayOrder = 0,
      isActive = true,
      isFeatured = true,
    } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(422).json({ success: false, message: 'Award name is required' });
    }

    if (!logo || typeof logo !== 'string' || !logo.trim()) {
      return res.status(422).json({ success: false, message: 'Award logo or image is required' });
    }

    if (!shortDescription || typeof shortDescription !== 'string' || !shortDescription.trim()) {
      return res.status(422).json({ success: false, message: 'Short description is required' });
    }

    if (!organization || typeof organization !== 'string' || !organization.trim()) {
      return res.status(422).json({ success: false, message: 'Organization name is required' });
    }

    const yearNum = parseInt(awardYear, 10);
    if (isNaN(yearNum) || yearNum < 1900 || yearNum > 2100) {
      return res.status(422).json({ success: false, message: 'Valid award year is required (e.g. 2025)' });
    }

    const safeSlug = customSlug?.trim()
      ? await generateUniqueAwardSlug(customSlug.trim())
      : await generateUniqueAwardSlug(name.trim());

    const newAward = await Award.create({
      name: name.trim(),
      slug: safeSlug,
      logo: logo.trim(),
      shortDescription: shortDescription.trim(),
      fullDescription: typeof fullDescription === 'string' ? fullDescription.trim() : '',
      awardYear: yearNum,
      category: category.trim(),
      organization: organization.trim(),
      galleryImages: Array.isArray(galleryImages) ? galleryImages.map((img: string) => String(img).trim()).filter(Boolean) : [],
      websiteUrl: websiteUrl ? String(websiteUrl).trim() : undefined,
      displayOrder: Number(displayOrder) || 0,
      isActive: Boolean(isActive),
      isFeatured: Boolean(isFeatured),
      createdBy: safeObjectId(req.user?.userId),
      updatedBy: safeObjectId(req.user?.userId),
    });

    await logAwardAudit(req, 'AWARD_CREATED', `Created award: "${newAward.name}" (${newAward.awardYear})`, String(newAward._id), {
      newStatus: newAward.isActive ? 'ACTIVE' : 'INACTIVE',
      metadata: { slug: newAward.slug, organization: newAward.organization },
    });

    return res.status(201).json({
      success: true,
      message: 'Award created successfully',
      data: newAward,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/admin/awards/:id
 * Updates existing award
 */
export async function updateAward(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid award ID format' });
    }

    const award = await Award.findById(id);
    if (!award || award.isDeleted) {
      return res.status(404).json({ success: false, message: 'Award not found' });
    }

    const {
      name,
      slug: customSlug,
      logo,
      shortDescription,
      fullDescription,
      awardYear,
      category,
      organization,
      galleryImages,
      websiteUrl,
      displayOrder,
      isActive,
      isFeatured,
    } = req.body;

    if (name !== undefined) {
      if (!name.trim()) return res.status(422).json({ success: false, message: 'Award name cannot be empty' });
      award.name = name.trim();
    }

    if (customSlug !== undefined && customSlug.trim() && customSlug.trim() !== award.slug) {
      award.slug = await generateUniqueAwardSlug(customSlug.trim(), String(award._id));
    }

    if (logo !== undefined) {
      if (!logo.trim()) return res.status(422).json({ success: false, message: 'Logo cannot be empty' });
      award.logo = logo.trim();
    }

    if (shortDescription !== undefined) {
      if (!shortDescription.trim()) return res.status(422).json({ success: false, message: 'Short description cannot be empty' });
      award.shortDescription = shortDescription.trim();
    }

    if (fullDescription !== undefined) {
      award.fullDescription = fullDescription.trim();
    }

    if (awardYear !== undefined) {
      const yearNum = parseInt(awardYear, 10);
      if (isNaN(yearNum) || yearNum < 1900 || yearNum > 2100) {
        return res.status(422).json({ success: false, message: 'Valid award year is required' });
      }
      award.awardYear = yearNum;
    }

    if (category !== undefined) award.category = category.trim();
    if (organization !== undefined) award.organization = organization.trim();
    if (websiteUrl !== undefined) award.websiteUrl = websiteUrl.trim();
    if (displayOrder !== undefined) award.displayOrder = Number(displayOrder) || 0;
    if (isActive !== undefined) award.isActive = Boolean(isActive);
    if (isFeatured !== undefined) award.isFeatured = Boolean(isFeatured);

    if (galleryImages !== undefined && Array.isArray(galleryImages)) {
      award.galleryImages = galleryImages.map((img: string) => String(img).trim()).filter(Boolean);
    }

    award.updatedBy = safeObjectId(req.user?.userId);
    await award.save();

    await logAwardAudit(req, 'AWARD_UPDATED', `Updated award: "${award.name}"`, String(award._id), {
      metadata: { slug: award.slug, isActive: award.isActive, isFeatured: award.isFeatured },
    });

    return res.status(200).json({
      success: true,
      message: 'Award updated successfully',
      data: award,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/admin/awards/:id
 * Soft deletes an award
 */
export async function deleteAward(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid award ID format' });
    }

    const award = await Award.findById(id);
    if (!award || award.isDeleted) {
      return res.status(404).json({ success: false, message: 'Award not found' });
    }

    award.isDeleted = true;
    award.deletedAt = new Date();
    award.deletedBy = safeObjectId(req.user?.userId);
    await award.save();

    await logAwardAudit(req, 'AWARD_DELETED', `Deleted award: "${award.name}"`, String(award._id));

    return res.status(200).json({
      success: true,
      message: 'Award deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/admin/awards/:id/status
 * Toggles active / inactive status
 */
export async function updateAwardStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid award ID format' });
    }

    const award = await Award.findById(id);
    if (!award || award.isDeleted) {
      return res.status(404).json({ success: false, message: 'Award not found' });
    }

    const prevStatus = award.isActive ? 'ACTIVE' : 'INACTIVE';
    award.isActive = typeof isActive === 'boolean' ? isActive : !award.isActive;
    award.updatedBy = safeObjectId(req.user?.userId);
    await award.save();

    const newStatus = award.isActive ? 'ACTIVE' : 'INACTIVE';
    await logAwardAudit(req, 'AWARD_STATUS_CHANGED', `Changed status of "${award.name}" to ${newStatus}`, String(award._id), {
      previousStatus: prevStatus,
      newStatus,
    });

    return res.status(200).json({
      success: true,
      message: `Award is now ${newStatus}`,
      data: award,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/admin/awards/:id/featured
 * Toggles isFeatured state for homepage display
 */
export async function toggleAwardFeatured(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { isFeatured } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid award ID format' });
    }

    const award = await Award.findById(id);
    if (!award || award.isDeleted) {
      return res.status(404).json({ success: false, message: 'Award not found' });
    }

    award.isFeatured = typeof isFeatured === 'boolean' ? isFeatured : !award.isFeatured;
    award.updatedBy = safeObjectId(req.user?.userId);
    await award.save();

    await logAwardAudit(
      req,
      'AWARD_FEATURED_TOGGLED',
      `Marked "${award.name}" as ${award.isFeatured ? 'Featured on Homepage' : 'Standard'}`,
      String(award._id),
      { metadata: { isFeatured: award.isFeatured } }
    );

    return res.status(200).json({
      success: true,
      message: `Award homepage featured status updated`,
      data: award,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/admin/awards/:id/order
 * Updates displayOrder
 */
export async function updateAwardOrder(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { displayOrder } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid award ID format' });
    }

    const orderNum = parseInt(displayOrder, 10);
    if (isNaN(orderNum)) {
      return res.status(400).json({ success: false, message: 'Valid integer display order is required' });
    }

    const award = await Award.findById(id);
    if (!award || award.isDeleted) {
      return res.status(404).json({ success: false, message: 'Award not found' });
    }

    award.displayOrder = orderNum;
    award.updatedBy = safeObjectId(req.user?.userId);
    await award.save();

    return res.status(200).json({
      success: true,
      message: 'Award order updated successfully',
      data: award,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/awards/upload-image
 * Secure image upload for award logo or gallery images
 */
export async function uploadAwardImage(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { image, base64, filename } = req.body;
    const rawData = image || base64;

    if (!rawData || typeof rawData !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'No image data provided. Please provide a valid Base64 image string.',
      });
    }

    const matches = rawData.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    let declaredMime = 'image/jpeg';
    let base64Data = rawData;

    if (matches) {
      declaredMime = matches[1].toLowerCase();
      base64Data = matches[2];
    }

    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedMimes.includes(declaredMime)) {
      return res.status(400).json({
        success: false,
        message: 'Only JPG, PNG, and WebP images are allowed.',
      });
    }

    const buffer = Buffer.from(base64Data, 'base64');
    if (buffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: 'Image size exceeds maximum allowed limit of 5MB.',
      });
    }

    const binaryCheck = validateImageBuffer(buffer);
    if (!binaryCheck.valid) {
      return res.status(400).json({
        success: false,
        message: 'Corrupt or invalid image content. Genuine JPG, PNG, or WebP is required.',
      });
    }

    const verifiedMime = binaryCheck.detectedMime || declaredMime;
    let ext = 'jpg';
    if (verifiedMime === 'image/png') ext = 'png';
    else if (verifiedMime === 'image/webp') ext = 'webp';

    const randomHex = crypto.randomBytes(16).toString('hex');
    const safePrefix = (filename ? path.parse(filename).name : 'award')
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .substring(0, 16) || 'award';

    const uniqueName = `${safePrefix}-${Date.now()}-${randomHex}.${ext}`;
    const filePath = path.join(UPLOADS_AWARDS_DIR, uniqueName);

    await fs.promises.writeFile(filePath, buffer);

    const publicUrl = `/uploads/awards/${uniqueName}`;

    return res.status(201).json({
      success: true,
      message: 'Award image uploaded successfully',
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
}

// ══════════════════════════════════════════════════════════════
// DATABASE SEEDER (Verified Matrimonial & Healthcare Awards)
// ══════════════════════════════════════════════════════════════

export async function seedDefaultAwardsIfEmpty(): Promise<void> {
  try {
    const count = await Award.countDocuments({ isDeleted: false });
    if (count > 0) return;

    console.log('[Awards] Seeding initial verified healthcare & matrimony awards...');

    const defaultAwards = [
      {
        name: 'National Healthcare Matrimony Trust Award',
        slug: 'national-healthcare-matrimony-trust-award',
        logo: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=400&q=80',
        shortDescription:
          'Recognized for pioneering verified matchmaking and credential authentication standards for medical practitioners across India.',
        fullDescription: `<p>The National Healthcare Matrimony Trust Award celebrates innovation, discretion, and excellence in professional matchmaking services dedicated to doctors, surgeons, and healthcare leaders.</p><p>Wonderful Jodi received this recognition for its multi-tier verification process verifying Medical Council registrations and Government KYC before profile activation.</p>`,
        awardYear: 2025,
        category: 'Trust & Verification Excellence',
        organization: 'Federation of Healthcare & Medical Leadership Councils',
        galleryImages: [
          'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=800&q=80',
        ],
        websiteUrl: 'https://wonderfuljodi.com',
        displayOrder: 1,
        isActive: true,
        isFeatured: true,
      },
      {
        name: 'India Digital Health Matchmaking Excellence',
        slug: 'india-digital-health-matchmaking-excellence',
        logo: 'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?auto=format&fit=crop&w=400&q=80',
        shortDescription:
          'Awarded for seamless lifestyle compatibility algorithms catering to demanding residency schedules and medical career commitments.',
        fullDescription: `<p>Presented to platforms creating exceptional digital experiences tailored specifically to the unique schedules of healthcare workers. Wonderful Jodi's on-call availability synchronization and private contact controls set the industry benchmark.</p>`,
        awardYear: 2024,
        category: 'Digital Innovation & AI Matching',
        organization: 'India HealthTech & Digital Society Forum',
        galleryImages: [
          'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?auto=format&fit=crop&w=800&q=80',
        ],
        websiteUrl: 'https://wonderfuljodi.com',
        displayOrder: 2,
        isActive: true,
        isFeatured: true,
      },
      {
        name: 'Most Trusted Medical Matrimonial Platform',
        slug: 'most-trusted-medical-matrimonial-platform',
        logo: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=400&q=80',
        shortDescription:
          'Honoring the highest member satisfaction and privacy protection standards in matrimonial services for esteemed doctor families.',
        fullDescription: `<p>This distinction recognizes unmatched member integrity, background validation, and empathetic relationship management for doctors and their respected families uniting in matrimony.</p>`,
        awardYear: 2024,
        category: 'Member Satisfaction & Privacy',
        organization: 'National Matrimonial & Family Advisory Board',
        galleryImages: [
          'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=800&q=80',
        ],
        websiteUrl: 'https://wonderfuljodi.com',
        displayOrder: 3,
        isActive: true,
        isFeatured: true,
      },
      {
        name: 'Vedic Astrology & Medical Science Integration Honor',
        slug: 'vedic-astrology-medical-science-integration-honor',
        logo: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&w=400&q=80',
        shortDescription:
          'Commended for respectful, scientifically balanced Kundali Milan & Ashta Koota compatibility tools for medical couples.',
        fullDescription: `<p>Honoring platforms that bridge Indian cultural traditions and Vedic horoscope alignment with modern psychological and scientific thinking for healthcare couples.</p>`,
        awardYear: 2023,
        category: 'Cultural & Astrological Heritage',
        organization: 'Vedic Astrology Research & Family Federation',
        galleryImages: [
          'https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&w=800&q=80',
        ],
        websiteUrl: 'https://wonderfuljodi.com',
        displayOrder: 4,
        isActive: true,
        isFeatured: true,
      },
    ];

    for (const award of defaultAwards) {
      await Award.create(award);
    }

    console.log(`[Awards] Successfully seeded ${defaultAwards.length} default awards.`);
  } catch (error) {
    console.error('[Awards] Failed to seed default awards:', error);
  }
}
