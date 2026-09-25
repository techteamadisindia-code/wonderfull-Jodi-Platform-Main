import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { AuthRequest } from '../middleware/authMiddleware';
import { BlogPost, IBlogPost, BlogStatus } from '../models/BlogPost';
import { AuditLog } from '../models/AuditLog';
import { escapeRegex, validateImageBuffer } from '../utils/securityUtils';

const UPLOADS_BLOG_DIR = path.join(process.cwd(), 'uploads', 'blogs');
if (!fs.existsSync(UPLOADS_BLOG_DIR)) {
  fs.mkdirSync(UPLOADS_BLOG_DIR, { recursive: true });
}

/**
 * Strips dangerous HTML tags (scripts, iframes, object, embed) and inline event handlers
 */
export function sanitizeBlogContent(input: string): string {
  if (!input || typeof input !== 'string') return '';

  let clean = input;
  // Remove script tags and contents
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  // Remove iframe tags and contents
  clean = clean.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  // Remove object, embed, form, input, textarea tags
  clean = clean.replace(/<\/?(object|embed|applet|form|input|textarea|button|base|link|meta)\b[^>]*>/gi, '');
  // Remove inline javascript: URLs
  clean = clean.replace(/\bhref\s*=\s*(['"]?)\s*javascript:[^'"]*\1/gi, 'href="#"');
  clean = clean.replace(/\bsrc\s*=\s*(['"]?)\s*javascript:[^'"]*\1/gi, 'src=""');
  // Remove event handlers like onload, onerror, onclick, onmouseover
  clean = clean.replace(/\s*on\w+\s*=\s*(['"][^'"]*['"]|[^\s>]+)/gi, '');

  return clean.trim();
}

/**
 * Calculates estimated reading time (approx 200 words per minute)
 */
export function calculateReadingTime(content: string): string {
  const plainText = content.replace(/<[^>]+>/g, ' ');
  const words = plainText.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min read`;
}

/**
 * Generates clean, unique slug from title
 */
export async function generateUniqueBlogSlug(title: string, excludeId?: string): Promise<string> {
  let baseSlug = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!baseSlug) {
    baseSlug = `doctor-blog-${Date.now()}`;
  }

  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const query: any = { slug };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    const existing = await BlogPost.findOne(query).select('_id').lean();
    if (!existing) {
      return slug;
    }
    counter += 1;
    slug = `${baseSlug}-${counter}`;
  }
}

/**
 * Audit log helper
 */
async function logBlogAudit(
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
    const adminUserId = req.user?.userId;
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      '127.0.0.1';

    await AuditLog.create({
      adminUser: adminUserId,
      adminEmail,
      action,
      targetModel: 'BlogPost',
      targetId: String(targetId),
      previousStatus: extra.previousStatus,
      newStatus: extra.newStatus,
      details,
      ipAddress,
      status: 'SUCCESS',
      metadata: extra.metadata,
    });
  } catch (err) {
    console.error('[Blog AuditLog] Failed to record audit:', err);
  }
}

// ══════════════════════════════════════════════════════════════
// PUBLIC BLOG CONTROLLERS
// ══════════════════════════════════════════════════════════════

/**
 * GET /api/blogs
 * Lists all published, non-deleted blog posts with filtering, search, and pagination
 */
export async function getPublicBlogs(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 9));
    const skip = (page - 1) * limit;

    const { category, search, sort } = req.query;

    const query: any = {
      status: 'PUBLISHED',
      isDeleted: false,
    };

    if (category && typeof category === 'string' && category.trim() !== 'All') {
      query.category = category.trim();
    }

    if (search && typeof search === 'string' && search.trim()) {
      const sanitized = escapeRegex(search.trim());
      query.$or = [
        { title: { $regex: sanitized, $options: 'i' } },
        { excerpt: { $regex: sanitized, $options: 'i' } },
        { authorName: { $regex: sanitized, $options: 'i' } },
        { tags: { $in: [new RegExp(sanitized, 'i')] } },
      ];
    }

    let sortOption: any = { publishedAt: -1, createdAt: -1 };
    if (sort === 'oldest') {
      sortOption = { publishedAt: 1, createdAt: 1 };
    } else if (sort === 'popular') {
      sortOption = { viewCount: -1, publishedAt: -1 };
    } else if (sort === 'readingTime') {
      sortOption = { readingTime: 1 };
    }

    const [posts, total, categoriesAggregation] = await Promise.all([
      BlogPost.find(query)
        .select('title slug category excerpt featuredImageUrl authorName authorRole authorAvatarUrl readingTime publishedAt isFeatured tags viewCount')
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .lean(),
      BlogPost.countDocuments(query),
      BlogPost.aggregate([
        { $match: { status: 'PUBLISHED', isDeleted: false } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    const categories = categoriesAggregation.map((c) => ({
      name: c._id,
      count: c.count,
    }));

    return res.status(200).json({
      success: true,
      data: posts,
      categories,
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
 * GET /api/blogs/categories
 * Returns all published blog categories with counts
 */
export async function getBlogCategories(req: Request, res: Response, next: NextFunction) {
  try {
    const categoriesAggregation = await BlogPost.aggregate([
      { $match: { status: 'PUBLISHED', isDeleted: false } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const categories = categoriesAggregation.map((c) => ({
      name: c._id,
      count: c.count,
    }));

    return res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/blogs/featured
 * Returns top featured published posts
 */
export async function getFeaturedBlogs(req: Request, res: Response, next: NextFunction) {
  try {
    const posts = await BlogPost.find({
      status: 'PUBLISHED',
      isDeleted: false,
      isFeatured: true,
    })
      .select('title slug category excerpt featuredImageUrl authorName authorRole authorAvatarUrl readingTime publishedAt isFeatured tags viewCount')
      .sort({ publishedAt: -1 })
      .limit(4)
      .lean();

    return res.status(200).json({
      success: true,
      data: posts,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/blogs/:slug
 * Retrieves single published blog post by slug and increments view count
 */
export async function getPublicBlogBySlug(req: Request, res: Response, next: NextFunction) {
  try {
    const slug = (req.params.slug || '').toLowerCase().trim();

    if (!slug) {
      return res.status(400).json({
        success: false,
        message: 'Valid article slug is required',
      });
    }

    const post = await BlogPost.findOneAndUpdate(
      { slug, status: 'PUBLISHED', isDeleted: false },
      { $inc: { viewCount: 1 } },
      { new: true }
    )
      .select('title slug category excerpt content featuredImageUrl authorName authorRole authorAvatarUrl readingTime publishedAt updatedAt tags viewCount')
      .lean();

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Article not found or is currently not available',
      });
    }

    // Fetch related articles in same category or latest published
    const relatedPosts = await BlogPost.find({
      _id: { $ne: (post as any)._id },
      category: (post as any).category,
      status: 'PUBLISHED',
      isDeleted: false,
    })
      .select('title slug category excerpt featuredImageUrl authorName readingTime publishedAt')
      .sort({ publishedAt: -1 })
      .limit(3)
      .lean();

    return res.status(200).json({
      success: true,
      data: post,
      relatedPosts,
    });
  } catch (error) {
    next(error);
  }
}

// ══════════════════════════════════════════════════════════════
// ADMIN BLOG CONTROLLERS (Super Admin & Admin Only)
// ══════════════════════════════════════════════════════════════

/**
 * GET /api/admin/blogs
 * Returns all blog posts (Draft, Published, Archived) with stats
 */
export async function getAdminBlogs(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 15));
    const skip = (page - 1) * limit;

    const { status, category, search, sort } = req.query;

    const query: any = { isDeleted: false };

    if (status && typeof status === 'string' && status !== 'ALL') {
      query.status = status.toUpperCase();
    }

    if (category && typeof category === 'string' && category !== 'ALL') {
      query.category = category.trim();
    }

    if (search && typeof search === 'string' && search.trim()) {
      const sanitized = escapeRegex(search.trim());
      query.$or = [
        { title: { $regex: sanitized, $options: 'i' } },
        { excerpt: { $regex: sanitized, $options: 'i' } },
        { slug: { $regex: sanitized, $options: 'i' } },
        { authorName: { $regex: sanitized, $options: 'i' } },
      ];
    }

    let sortOption: any = { createdAt: -1 };
    if (sort === 'oldest') sortOption = { createdAt: 1 };
    if (sort === 'published_desc') sortOption = { publishedAt: -1 };
    if (sort === 'title_asc') sortOption = { title: 1 };

    const [posts, total, totalAll, totalPublished, totalDraft, totalArchived, totalFeatured] =
      await Promise.all([
        BlogPost.find(query)
          .sort(sortOption)
          .skip(skip)
          .limit(limit)
          .populate('createdBy', 'fullName email')
          .populate('updatedBy', 'fullName email')
          .lean(),
        BlogPost.countDocuments(query),
        BlogPost.countDocuments({ isDeleted: false }),
        BlogPost.countDocuments({ isDeleted: false, status: 'PUBLISHED' }),
        BlogPost.countDocuments({ isDeleted: false, status: 'DRAFT' }),
        BlogPost.countDocuments({ isDeleted: false, status: 'ARCHIVED' }),
        BlogPost.countDocuments({ isDeleted: false, isFeatured: true }),
      ]);

    return res.status(200).json({
      success: true,
      stats: {
        total: totalAll,
        published: totalPublished,
        draft: totalDraft,
        archived: totalArchived,
        featured: totalFeatured,
      },
      data: posts,
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
 * GET /api/admin/blogs/:id
 * Retrieves single blog post by ID
 */
export async function getAdminBlogById(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid blog post ID format' });
    }

    const post = await BlogPost.findById(id)
      .populate('createdBy', 'fullName email')
      .populate('updatedBy', 'fullName email')
      .lean();

    if (!post) {
      return res.status(404).json({ success: false, message: 'Blog post not found' });
    }

    return res.status(200).json({
      success: true,
      data: post,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/blogs
 * Creates a new blog post
 */
export async function createBlog(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const {
      title,
      slug: customSlug,
      category,
      excerpt,
      content,
      featuredImageUrl,
      authorName,
      authorRole,
      authorAvatarUrl,
      readingTime: customReadingTime,
      status = 'DRAFT',
      isFeatured = false,
      tags = [],
      publishedAt: customPublishedAt,
    } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(422).json({ success: false, message: 'Blog title is required' });
    }

    if (!category || typeof category !== 'string' || !category.trim()) {
      return res.status(422).json({ success: false, message: 'Category is required' });
    }

    if (!excerpt || typeof excerpt !== 'string' || !excerpt.trim()) {
      return res.status(422).json({ success: false, message: 'Excerpt is required' });
    }

    if (status === 'PUBLISHED' && (!content || typeof content !== 'string' || !content.trim())) {
      return res.status(422).json({
        success: false,
        message: 'Full article content is required before publishing',
      });
    }

    const safeSlug = customSlug?.trim()
      ? await generateUniqueBlogSlug(customSlug.trim())
      : await generateUniqueBlogSlug(title.trim());

    const sanitizedContent = sanitizeBlogContent(content || '');
    const calculatedReadingTime = customReadingTime?.trim() || calculateReadingTime(sanitizedContent || excerpt);

    let finalPublishedAt: Date | undefined = undefined;
    if (status === 'PUBLISHED') {
      finalPublishedAt = customPublishedAt ? new Date(customPublishedAt) : new Date();
    }

    const newBlog = await BlogPost.create({
      title: title.trim(),
      slug: safeSlug,
      category: category.trim(),
      excerpt: excerpt.trim(),
      content: sanitizedContent,
      featuredImageUrl: featuredImageUrl?.trim() || undefined,
      authorName: authorName?.trim() || 'Wonderful Jodi Editorial Team',
      authorRole: authorRole?.trim() || 'Medical Matrimony Consultant',
      authorAvatarUrl: authorAvatarUrl?.trim() || undefined,
      readingTime: calculatedReadingTime,
      status: (['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(status) ? status : 'DRAFT') as BlogStatus,
      isFeatured: Boolean(isFeatured),
      tags: Array.isArray(tags) ? tags.map((t: string) => String(t).trim()).filter(Boolean) : [],
      publishedAt: finalPublishedAt,
      createdBy: req.user?.userId ? new mongoose.Types.ObjectId(req.user.userId) : undefined,
      updatedBy: req.user?.userId ? new mongoose.Types.ObjectId(req.user.userId) : undefined,
    });

    await logBlogAudit(req, 'BLOG_CREATED', `Created article: "${newBlog.title}" (${newBlog.slug})`, String(newBlog._id), {
      newStatus: newBlog.status,
      metadata: { slug: newBlog.slug, category: newBlog.category },
    });

    return res.status(201).json({
      success: true,
      message: 'Blog post created successfully',
      data: newBlog,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/admin/blogs/:id
 * Updates an existing blog post
 */
export async function updateBlog(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid blog post ID format' });
    }

    const existing = await BlogPost.findById(id);
    if (!existing || existing.isDeleted) {
      return res.status(404).json({ success: false, message: 'Blog post not found' });
    }

    const {
      title,
      slug: customSlug,
      category,
      excerpt,
      content,
      featuredImageUrl,
      authorName,
      authorRole,
      authorAvatarUrl,
      readingTime: customReadingTime,
      status,
      isFeatured,
      tags,
      publishedAt: customPublishedAt,
    } = req.body;

    const previousStatus = existing.status;

    if (title !== undefined) {
      if (!title.trim()) return res.status(422).json({ success: false, message: 'Title cannot be empty' });
      existing.title = title.trim();
    }

    if (customSlug !== undefined && customSlug.trim() && customSlug.trim() !== existing.slug) {
      existing.slug = await generateUniqueBlogSlug(customSlug.trim(), String(existing._id));
    }

    if (category !== undefined) {
      if (!category.trim()) return res.status(422).json({ success: false, message: 'Category cannot be empty' });
      existing.category = category.trim();
    }

    if (excerpt !== undefined) {
      if (!excerpt.trim()) return res.status(422).json({ success: false, message: 'Excerpt cannot be empty' });
      existing.excerpt = excerpt.trim();
    }

    if (content !== undefined) {
      existing.content = sanitizeBlogContent(content);
    }

    if (status === 'PUBLISHED' && !existing.content.trim()) {
      return res.status(422).json({
        success: false,
        message: 'Full article content is required before publishing',
      });
    }

    if (featuredImageUrl !== undefined) {
      existing.featuredImageUrl = featuredImageUrl ? featuredImageUrl.trim() : '';
    }

    if (authorName !== undefined) existing.authorName = authorName.trim() || 'Wonderful Jodi Editorial Team';
    if (authorRole !== undefined) existing.authorRole = authorRole.trim() || 'Medical Matrimony Consultant';
    if (authorAvatarUrl !== undefined) existing.authorAvatarUrl = authorAvatarUrl.trim();

    if (customReadingTime !== undefined && customReadingTime.trim()) {
      existing.readingTime = customReadingTime.trim();
    } else if (content !== undefined) {
      existing.readingTime = calculateReadingTime(existing.content);
    }

    if (status !== undefined && ['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(status)) {
      existing.status = status as BlogStatus;
      if (status === 'PUBLISHED' && !existing.publishedAt) {
        existing.publishedAt = customPublishedAt ? new Date(customPublishedAt) : new Date();
      }
    }

    if (customPublishedAt !== undefined) {
      existing.publishedAt = customPublishedAt ? new Date(customPublishedAt) : undefined;
    }

    if (isFeatured !== undefined) {
      existing.isFeatured = Boolean(isFeatured);
    }

    if (tags !== undefined && Array.isArray(tags)) {
      existing.tags = tags.map((t: string) => String(t).trim()).filter(Boolean);
    }

    existing.updatedBy = req.user?.userId ? new mongoose.Types.ObjectId(req.user.userId) : undefined;

    await existing.save();

    await logBlogAudit(
      req,
      'BLOG_UPDATED',
      `Updated article: "${existing.title}" (${existing.slug})`,
      String(existing._id),
      {
        previousStatus,
        newStatus: existing.status,
        metadata: { slug: existing.slug },
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Blog post updated successfully',
      data: existing,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/admin/blogs/:id/status
 * Updates status (DRAFT, PUBLISHED, ARCHIVED)
 */
export async function updateBlogStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid blog post ID format' });
    }

    if (!['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Allowed: DRAFT, PUBLISHED, ARCHIVED',
      });
    }

    const blog = await BlogPost.findById(id);
    if (!blog || blog.isDeleted) {
      return res.status(404).json({ success: false, message: 'Blog post not found' });
    }

    if (status === 'PUBLISHED' && (!blog.content || !blog.content.trim())) {
      return res.status(422).json({
        success: false,
        message: 'Cannot publish article without content. Please edit and add content first.',
      });
    }

    const previousStatus = blog.status;
    blog.status = status as BlogStatus;

    if (status === 'PUBLISHED' && !blog.publishedAt) {
      blog.publishedAt = new Date();
    }

    blog.updatedBy = req.user?.userId ? new mongoose.Types.ObjectId(req.user.userId) : undefined;
    await blog.save();

    await logBlogAudit(
      req,
      'BLOG_STATUS_CHANGED',
      `Changed status of "${blog.title}" from ${previousStatus} to ${status}`,
      String(blog._id),
      { previousStatus, newStatus: status }
    );

    return res.status(200).json({
      success: true,
      message: `Blog post status updated to ${status}`,
      data: blog,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/admin/blogs/:id/featured
 * Toggles isFeatured state
 */
export async function toggleBlogFeatured(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { isFeatured } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid blog post ID format' });
    }

    const blog = await BlogPost.findById(id);
    if (!blog || blog.isDeleted) {
      return res.status(404).json({ success: false, message: 'Blog post not found' });
    }

    blog.isFeatured = typeof isFeatured === 'boolean' ? isFeatured : !blog.isFeatured;
    blog.updatedBy = req.user?.userId ? new mongoose.Types.ObjectId(req.user.userId) : undefined;
    await blog.save();

    await logBlogAudit(
      req,
      'BLOG_FEATURED_TOGGLED',
      `Marked "${blog.title}" as ${blog.isFeatured ? 'Featured' : 'Standard'}`,
      String(blog._id),
      { metadata: { isFeatured: blog.isFeatured } }
    );

    return res.status(200).json({
      success: true,
      message: `Blog featured status updated`,
      data: blog,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/admin/blogs/:id
 * Soft deletes a blog post
 */
export async function deleteBlog(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid blog post ID format' });
    }

    const blog = await BlogPost.findById(id);
    if (!blog || blog.isDeleted) {
      return res.status(404).json({ success: false, message: 'Blog post not found' });
    }

    blog.isDeleted = true;
    blog.deletedAt = new Date();
    blog.deletedBy = req.user?.userId ? new mongoose.Types.ObjectId(req.user.userId) : undefined;
    await blog.save();

    await logBlogAudit(req, 'BLOG_DELETED', `Deleted blog post: "${blog.title}"`, String(blog._id));

    return res.status(200).json({
      success: true,
      message: 'Blog post deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/admin/blogs/:id/restore
 * Restores a soft-deleted blog post
 */
export async function restoreBlog(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid blog post ID format' });
    }

    const blog = await BlogPost.findById(id);
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog post not found' });
    }

    blog.isDeleted = false;
    blog.deletedAt = undefined;
    blog.deletedBy = undefined;
    await blog.save();

    await logBlogAudit(req, 'BLOG_RESTORED', `Restored blog post: "${blog.title}"`, String(blog._id));

    return res.status(200).json({
      success: true,
      message: 'Blog post restored successfully',
      data: blog,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/blogs/upload-image
 * Secure image uploader for blog cover images
 */
export async function uploadBlogCoverImage(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { image, base64, filename } = req.body;
    const rawData = image || base64;

    if (!rawData || typeof rawData !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'No image data provided. Please provide a valid Base64 image.',
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
    const safePrefix = (filename ? path.parse(filename).name : 'blog-cover')
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .substring(0, 16) || 'blog';

    const uniqueName = `${safePrefix}-${Date.now()}-${randomHex}.${ext}`;
    const filePath = path.join(UPLOADS_BLOG_DIR, uniqueName);

    await fs.promises.writeFile(filePath, buffer);

    const publicUrl = `/uploads/blogs/${uniqueName}`;

    return res.status(201).json({
      success: true,
      message: 'Cover image uploaded successfully',
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
// DATABASE SEEDER (Doctor Matrimony Content)
// ══════════════════════════════════════════════════════════════

export async function seedDefaultBlogsIfEmpty(): Promise<void> {
  try {
    const count = await BlogPost.countDocuments({ isDeleted: false });
    if (count > 0) return;

    console.log('[Blogs] Seeding initial Wonderful Jodi doctor matrimony articles...');

    const defaultArticles = [
      {
        title: 'Balancing Hectic Residency & Matchmaking: A Practical Guide for Doctors',
        slug: 'balancing-hectic-residency-and-matchmaking-guide-for-doctors',
        category: 'Doctor Matrimony',
        excerpt:
          'Navigating 80-hour work weeks, emergency on-call duties, and the pursuit of a life partner: how modern doctors find marital happiness with mutual professional empathy.',
        content: `<h2>The Reality of Medical Residency and Relationship Timing</h2>
<p>Medical residency is notoriously demanding. Between 24-hour trauma rotations, ICUs, and board exam preparations, carving out time to meet potential matrimonial matches can feel impossible. However, postponing relationship decisions until post-fellowship often leaves physicians feeling socially isolated.</p>

<h3>1. Clear Communication About On-Call Realities</h3>
<p>When communicating with potential matrimonial matches, upfront transparency about rotation schedules, night shifts, and emergency hospital call-backs establishes mutual trust immediately. When your partner—especially another healthcare professional—understands the erratic nature of medicine, missed dinner dates don't turn into personal conflicts.</p>

<blockquote>"The greatest gift in doctor matrimony is not having to explain why a critical patient emergency delayed your arrival by three hours." — Dr. Rohan Mehta, Senior Resident (Cardiology)</blockquote>

<h3>2. Scheduling Intentional Interaction Windows</h3>
<p>Spontaneous four-hour dinners might not fit your current schedule, but regular 20-minute meaningful video calls between surgical rounds keep connection alive. Modern matrimonial platforms like Wonderful Jodi allow candidates to align their availability and communication preferences seamlessly.</p>

<h3>3. Look for Shared Values Over Superficial Checklist Items</h3>
<p>While matching clinical sub-specialties can be helpful, the true foundation of medical marriage longevity lies in shared life philosophy: financial attitudes, work-life boundaries, mutual respect for intense training periods, and family values.</p>

<div class="tip-box">
  <h4>Doctor Matrimony Tip</h4>
  <p>Share your next month's duty roster early during initial family and candidate discussions. It demonstrates organizational respect and sets honest expectations from Day 1.</p>
</div>`,
        featuredImageUrl: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1200&q=80',
        authorName: 'Dr. Priya Sharma',
        authorRole: 'MD Medicine & Matrimonial Columnist',
        readingTime: '5 min read',
        status: 'PUBLISHED',
        isFeatured: true,
        tags: ['Residency', 'Work-Life Balance', 'Doctor Matrimony', 'Communication'],
        publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        viewCount: 412,
      },
      {
        title: 'Top 7 Discussions Doctor Couples Must Have Before Marriage',
        slug: 'top-7-discussions-doctor-couples-must-have-before-marriage',
        category: 'Marriage Advice',
        excerpt:
          'From super-speciality fellowship relocations and private clinic investments to shared family time: the crucial discussions medical couples should align on before taking the plunge.',
        content: `<h2>Setting the Foundation for a Resilient Medical Marriage</h2>
<p>Doctor marriages possess unique strengths—deep shared intellectual synergy, understanding of occupational stress, and humanitarian values. Yet they also face specific vulnerabilities around career transitions and relocation. Here are the 7 non-negotiable conversations to have before tying the knot.</p>

<h3>1. Long-Term Career Trajectory & Fellowship Plans</h3>
<p>Are either of you planning super-speciality fellowships (DM/MCh) or pursuing observerships abroad? Discussing geographic flexibility and whether you will pursue matching city appointments avoids future cross-border strains.</p>

<h3>2. Private Practice Ambitions vs. Institutional Hospital Roles</h3>
<p>Launching an independent clinic or diagnostic center demands significant initial capital, extended evening hours, and business risks. Hospital-employed physicians often enjoy predictable shifts. Understand each other's financial and professional appetites.</p>

<h3>3. Financial Transparency and Educational Debt</h3>
<p>Discuss postgraduate education loans, clinic financing plans, and joint financial governance candidly. Transparency in financial management prevents undue pressure during early marriage years.</p>

<h3>4. Division of Household Responsibilities</h3>
<p>When both partners work intense 12-hour hospital shifts, traditional gender expectations break down. Agreeing on domestic help, meal prep outsourcing, and shared chores is essential.</p>

<h3>5. Family Support Systems & Proximity to Parents</h3>
<p>Having extended family living nearby can make all the difference during demanding clinical rotations and when raising young children.</p>

<h3>6. Handling Emotional Burnout and Clinical Decompression</h3>
<p>Caring for critical patients takes an emotional toll. Establishing a home atmosphere that serves as a quiet sanctuary rather than a second hospital is a vital habit for doctor couples.</p>

<h3>7. Sacred Non-Clinical Time</h3>
<p>Protecting one full day a week or designated annual vacations where hospital pagers are on designated backup fosters enduring romantic intimacy.</p>`,
        featuredImageUrl: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=1200&q=80',
        authorName: 'Wonderful Jodi Editorial Team',
        authorRole: 'Senior Relationship & Marriage Advisory',
        readingTime: '7 min read',
        status: 'PUBLISHED',
        isFeatured: true,
        tags: ['Marriage Advice', 'Career Planning', 'Finances', 'Fellowship'],
        publishedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        viewCount: 688,
      },
      {
        title: 'Doctor Verification & Safety: Why Credential Checks Matter in Matrimony',
        slug: 'doctor-verification-and-safety-why-credential-checks-matter',
        category: 'Verification & Safety',
        excerpt:
          'How Wonderful Jodi validates Medical Council registrations, government identity proof, and educational degrees to create India’s safest matrimonial environment for doctors.',
        content: `<h2>Protecting Esteemed Medical Families from Matrimonial Fraud</h2>
<p>In online matchmaking, professional credibility is paramount. With doctors commanding immense social respect, dishonest individuals have occasionally impersonated medical practitioners on generic matrimony portals. Wonderful Jodi was built to eliminate this risk entirely.</p>

<h3>Multi-Tier Verification Protocol</h3>
<p>Unlike generic dating apps or open social platforms, our platform enforces comprehensive multi-stage verification before granting verified doctor badges:</p>

<ul>
  <li><strong>State Medical Council & NMC Registration Verification:</strong> Every candidate must submit their official registration number, which is cross-referenced with official National Medical Commission records.</li>
  <li><strong>Government Identity Verification:</strong> Aadhaar / Passport / Voter ID KYC ensuring zero pseudonyms or deceptive profiles.</li>
  <li><strong>Degree & Hospital Affiliation Authentication:</strong> Scanned MBBS/MD/MS/BAMS/BHMS degree certificates and current institutional affiliations are manually reviewed.</li>
</ul>

<h3>Confidential Privacy Controls for Doctors</h3>
<p>We recognize that physicians need privacy from patients and colleagues. Doctors on Wonderful Jodi can choose who views their direct phone numbers, blur their photos until mutual interest is accepted, and report suspicious conduct with one tap.</p>`,
        featuredImageUrl: 'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?auto=format&fit=crop&w=1200&q=80',
        authorName: 'Rajesh Kulkarni',
        authorRole: 'Head of Trust & Verification, Wonderful Jodi',
        readingTime: '4 min read',
        status: 'PUBLISHED',
        isFeatured: false,
        tags: ['Safety', 'KYC', 'Medical Council', 'Verification'],
        publishedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        viewCount: 320,
      },
      {
        title: 'Family Compatibility in Doctor Matrimony: Bridging Traditions with Modern Medicine',
        slug: 'family-compatibility-in-doctor-matrimony-tradition-meets-medicine',
        category: 'Family & Compatibility',
        excerpt:
          'How esteemed doctor dynasties and self-made first-generation physicians find respectful, culturally rich matrimonial alignment.',
        content: `<h2>When Two Medical Dynasties Unite</h2>
<p>In Indian culture, marriage is not merely the union of two individuals—it is the harmonious blending of two families. In doctor matrimony, family alignment takes on an added dimension. Families with multiple generations of doctors understand the hospital pulse, while families welcoming their first physician in-law celebrate their hard-won dedication.</p>

<h3>Understanding Institutional Legacy vs. Independent Endeavor</h3>
<p>Many doctor families operate established nursing homes, diagnostic networks, or trust hospitals built over four decades. Finding a partner whose family values align with preserving and expanding that compassionate legacy brings unparalleled collective strength.</p>

<h3>Respecting Cultural & Spiritual Heritage</h3>
<p>Whether navigating vegetarian dietary practices, festive celebrations, or ancestral traditions, open respectful dialogue between families during early matchmaking stages creates lifelong goodwill.</p>`,
        featuredImageUrl: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1200&q=80',
        authorName: 'Sunita Joshi',
        authorRole: 'Senior Family Matchmaking Consultant',
        readingTime: '6 min read',
        status: 'PUBLISHED',
        isFeatured: false,
        tags: ['Family Values', 'Compatibility', 'Indian Tradition', 'Culture'],
        publishedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
        viewCount: 295,
      },
      {
        title: 'Understanding Kundali Milan for Medical Professionals: Science Meets Vedic Astrology',
        slug: 'understanding-kundali-milan-for-medical-professionals',
        category: 'Kundali & Astrology',
        excerpt:
          'How modern scientifically trained doctors navigate traditional Ashta Koota matchmaking, Manglik considerations, and psychological compatibility.',
        content: `<h2>Balancing Clinical Empiricism with Ancestral Heritage</h2>
<p>As doctors trained in evidence-based medicine, approaching Vedic astrology can sometimes provoke thoughtful questions. Yet thousands of happily married medical couples have embraced Kundali matching as a gentle cultural bridge that honors parental sentiment while evaluating core personality temperament.</p>

<h3>The 36 Gunas as a Psychological Framework</h3>
<p>Vedic Ashta Koota evaluates eight distinct dimensions of human compatibility:</p>
<ul>
  <li><strong>Nadi (8 Points):</strong> Physiological compatibility and genetic health factors.</li>
  <li><strong>Bhakoot (7 Points):</strong> Emotional connection and shared prosperity.</li>
  <li><strong>Gana (6 Points):</strong> Temperament and psychological alignment (Deva, Manushya, Rakshasa).</li>
  <li><strong>Maitri & Yoni:</strong> Intellectual camaraderie and behavioral sync.</li>
</ul>

<p>Approached with maturity, Kundali Milan serves as a constructive conversation starter rather than a superstition, providing families with reassurance while respecting candidate chemistry.</p>`,
        featuredImageUrl: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&w=1200&q=80',
        authorName: 'Pandit Vinayak Shastri & Dr. Anita Deshmukh',
        authorRole: 'Vedic Astrologer & Matrimonial Columnist',
        readingTime: '5 min read',
        status: 'PUBLISHED',
        isFeatured: false,
        tags: ['Kundali', 'Ashta Koota', 'Astrology', 'Doctor Matrimony'],
        publishedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
        viewCount: 512,
      },
      {
        title: 'Wedding Planning on Call: How Busy Physicians Plan Their Dream Wedding',
        slug: 'wedding-planning-on-call-guide-for-physicians',
        category: 'Wedding Planning',
        excerpt:
          'Mastering leave applications, vendor management, and stress-free wedding festivities when both the bride and groom are on active hospital duty.',
        content: `<h2>Surviving and Savoring Your Big Day Amidst Shift Rotations</h2>
<p>Wedding planning is known to be stressful for anyone, but for doctors who must negotiate leave rotations months in advance, it requires precision teamwork and expert delegation.</p>

<h3>1. Block Wedding Leaves 6 Months in Advance</h3>
<p>Hospital academic departments typically require long lead times for coverage scheduling. Submit your formal leave requests together as soon as the wedding muhurat is finalized.</p>

<h3>2. Leverage Full-Service Wedding Planners</h3>
<p>Between morning surgeries and evening OPDs, you won't have time to interview twenty decor vendors. Hiring trusted professionals who understand medical schedules keeps you rested and glowing for your ceremonies.</p>

<h3>3. Opt for Compact, High-Impact Celebrations</h3>
<p>Many doctor couples favor a 2-day intimate celebration over a drawn-out 5-day marathon, allowing them to thoroughly enjoy their loved ones without physical exhaustion before returning to patients.</p>`,
        featuredImageUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80',
        authorName: 'Wonderful Jodi Editorial Team',
        authorRole: 'Wedding Planning Concierge',
        readingTime: '4 min read',
        status: 'PUBLISHED',
        isFeatured: false,
        tags: ['Wedding Planning', 'On-Call', 'Leave Planning', 'Celebration'],
        publishedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        viewCount: 430,
      },
    ];

    for (const article of defaultArticles) {
      await BlogPost.create(article);
    }

    console.log(`[Blogs] Successfully seeded ${defaultArticles.length} doctor matrimony articles.`);
  } catch (error) {
    console.error('[Blogs] Failed to seed default articles:', error);
  }
}
