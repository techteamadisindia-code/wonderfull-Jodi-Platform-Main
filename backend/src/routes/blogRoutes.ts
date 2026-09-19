import { Router } from 'express';
import { requireAdminAuth } from '../middleware/authMiddleware';
import {
  getPublicBlogs,
  getPublicBlogBySlug,
  getBlogCategories,
  getFeaturedBlogs,
  getAdminBlogs,
  getAdminBlogById,
  createBlog,
  updateBlog,
  updateBlogStatus,
  toggleBlogFeatured,
  deleteBlog,
  restoreBlog,
  uploadBlogCoverImage,
} from '../controllers/blogController';

// ─── PUBLIC BLOG ROUTER ───
export const publicBlogRouter = Router();

// GET /api/blogs - List published posts with pagination, search, category filter
publicBlogRouter.get('/', getPublicBlogs);

// GET /api/blogs/categories - List available published categories with counts
publicBlogRouter.get('/categories', getBlogCategories);

// GET /api/blogs/featured - List top featured published posts
publicBlogRouter.get('/featured', getFeaturedBlogs);

// GET /api/blogs/:slug - Get single published post by slug
publicBlogRouter.get('/:slug', getPublicBlogBySlug);


// ─── ADMIN BLOG ROUTER (Super Admin & Admin Only) ───
export const adminBlogRouter = Router();

// Require admin authentication on all admin blog routes
adminBlogRouter.use(requireAdminAuth);

// GET /api/admin/blogs - List all blogs with stats, filters
adminBlogRouter.get('/', getAdminBlogs);

// POST /api/admin/blogs - Create new blog post
adminBlogRouter.post('/', createBlog);

// POST /api/admin/blogs/upload-cover - Upload blog cover image
adminBlogRouter.post('/upload-cover', uploadBlogCoverImage);

// GET /api/admin/blogs/:id - Get single blog post by ID
adminBlogRouter.get('/:id', getAdminBlogById);

// PUT & PATCH /api/admin/blogs/:id - Update blog post
adminBlogRouter.put('/:id', updateBlog);
adminBlogRouter.patch('/:id', updateBlog);

// PATCH /api/admin/blogs/:id/status - Update blog status (DRAFT, PUBLISHED, ARCHIVED)
adminBlogRouter.patch('/:id/status', updateBlogStatus);

// PATCH /api/admin/blogs/:id/featured - Toggle isFeatured
adminBlogRouter.patch('/:id/featured', toggleBlogFeatured);

// DELETE /api/admin/blogs/:id - Soft delete blog post
adminBlogRouter.delete('/:id', deleteBlog);

// PATCH /api/admin/blogs/:id/restore - Restore soft-deleted blog post
adminBlogRouter.patch('/:id/restore', restoreBlog);

export default {
  publicBlogRouter,
  adminBlogRouter,
};
