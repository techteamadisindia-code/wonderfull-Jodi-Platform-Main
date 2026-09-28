"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminBlogRouter = exports.publicBlogRouter = void 0;
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const blogController_1 = require("../controllers/blogController");
// ─── PUBLIC BLOG ROUTER ───
exports.publicBlogRouter = (0, express_1.Router)();
// GET /api/blogs - List published posts with pagination, search, category filter
exports.publicBlogRouter.get('/', blogController_1.getPublicBlogs);
// GET /api/blogs/categories - List available published categories with counts
exports.publicBlogRouter.get('/categories', blogController_1.getBlogCategories);
// GET /api/blogs/featured - List top featured published posts
exports.publicBlogRouter.get('/featured', blogController_1.getFeaturedBlogs);
// GET /api/blogs/:slug - Get single published post by slug
exports.publicBlogRouter.get('/:slug', blogController_1.getPublicBlogBySlug);
// ─── ADMIN BLOG ROUTER (Super Admin & Admin Only) ───
exports.adminBlogRouter = (0, express_1.Router)();
// Require admin authentication on all admin blog routes
exports.adminBlogRouter.use(authMiddleware_1.requireAdminAuth);
// GET /api/admin/blogs - List all blogs with stats, filters
exports.adminBlogRouter.get('/', blogController_1.getAdminBlogs);
// POST /api/admin/blogs - Create new blog post
exports.adminBlogRouter.post('/', blogController_1.createBlog);
// POST /api/admin/blogs/upload-cover - Upload blog cover image
exports.adminBlogRouter.post('/upload-cover', blogController_1.uploadBlogCoverImage);
// GET /api/admin/blogs/:id - Get single blog post by ID
exports.adminBlogRouter.get('/:id', blogController_1.getAdminBlogById);
// PUT & PATCH /api/admin/blogs/:id - Update blog post
exports.adminBlogRouter.put('/:id', blogController_1.updateBlog);
exports.adminBlogRouter.patch('/:id', blogController_1.updateBlog);
// PATCH /api/admin/blogs/:id/status - Update blog status (DRAFT, PUBLISHED, ARCHIVED)
exports.adminBlogRouter.patch('/:id/status', blogController_1.updateBlogStatus);
// PATCH /api/admin/blogs/:id/featured - Toggle isFeatured
exports.adminBlogRouter.patch('/:id/featured', blogController_1.toggleBlogFeatured);
// DELETE /api/admin/blogs/:id - Soft delete blog post
exports.adminBlogRouter.delete('/:id', blogController_1.deleteBlog);
// PATCH /api/admin/blogs/:id/restore - Restore soft-deleted blog post
exports.adminBlogRouter.patch('/:id/restore', blogController_1.restoreBlog);
exports.default = {
    publicBlogRouter: exports.publicBlogRouter,
    adminBlogRouter: exports.adminBlogRouter,
};
//# sourceMappingURL=blogRoutes.js.map