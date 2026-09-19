'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Plus,
  Search,
  X,
  Edit,
  Trash2,
  Eye,
  Star,
  CheckCircle,
  Archive,
  RefreshCw,
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  Upload,
  AlertTriangle,
  FileText,
  Check,
  ExternalLink,
  Sparkles,
  Layers,
  SlidersHorizontal,
  HelpCircle,
} from 'lucide-react';
import {
  fetchAdminBlogs,
  createAdminBlog,
  updateAdminBlog,
  updateAdminBlogStatus,
  toggleAdminBlogFeatured,
  deleteAdminBlog,
  restoreAdminBlog,
  uploadBlogImage,
  BlogPost,
  BlogStatus,
  BlogSummaryStats,
} from '../../../services/blogApi';

const CATEGORY_PRESETS = [
  'Doctor Matrimony',
  'Marriage Advice',
  'Relationship Guidance',
  'Family & Compatibility',
  'Medical Professionals',
  'Verification & Safety',
  'Kundali & Astrology',
  'Wedding Planning',
  'Membership & Features',
];

const IMAGE_PRESETS = [
  {
    label: 'Medical Consultation',
    url: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1200&q=80',
  },
  {
    label: 'Doctor Couple',
    url: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=1200&q=80',
  },
  {
    label: 'Hospital Verification',
    url: 'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?auto=format&fit=crop&w=1200&q=80',
  },
  {
    label: 'Indian Family Heritage',
    url: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1200&q=80',
  },
  {
    label: 'Kundali & Astrology',
    url: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&w=1200&q=80',
  },
  {
    label: 'Wedding Celebration',
    url: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80',
  },
];

export default function AdminBlogsPage() {
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [stats, setStats] = useState<BlogSummaryStats>({
    total: 0,
    published: 0,
    draft: 0,
    archived: 0,
    featured: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Create / Edit Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingBlog, setEditingBlog] = useState<BlogPost | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    category: 'Doctor Matrimony',
    excerpt: '',
    content: '',
    featuredImageUrl: '',
    authorName: 'Wonderful Jodi Editorial Team',
    authorRole: 'Medical Matrimony Consultant',
    readingTime: '5 min read',
    status: 'DRAFT' as BlogStatus,
    isFeatured: false,
    tags: '' as string,
    publishedAt: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [editorTab, setEditorTab] = useState<'write' | 'preview'>('write');

  // Confirmation Modal
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    type: 'delete' | 'archive';
    blog: BlogPost | null;
  }>({ open: false, type: 'delete', blog: null });
  const [actionLoading, setActionLoading] = useState(false);

  // Toast alert
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch blogs
  const loadBlogs = () => {
    setLoading(true);
    setError(null);

    fetchAdminBlogs({
      status: selectedStatus,
      category: selectedCategory === 'ALL' ? undefined : selectedCategory,
      search: debouncedSearch.trim() || undefined,
      page,
      limit: 15,
    })
      .then((res) => {
        setBlogs(res.data || []);
        if (res.stats) setStats(res.stats);
        setTotalPages(res.pagination?.totalPages || 1);
        setTotalCount(res.pagination?.total || 0);
      })
      .catch((err) => {
        console.error('Failed to load admin blogs:', err);
        setError('Failed to fetch blog posts. Please verify administrator credentials.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadBlogs();
  }, [selectedStatus, selectedCategory, debouncedSearch, page]);

  // Open Create Drawer
  const handleOpenCreate = () => {
    setEditingBlog(null);
    setFormData({
      title: '',
      slug: '',
      category: 'Doctor Matrimony',
      excerpt: '',
      content: '',
      featuredImageUrl: IMAGE_PRESETS[0].url,
      authorName: 'Wonderful Jodi Editorial Team',
      authorRole: 'Medical Matrimony Consultant',
      readingTime: '5 min read',
      status: 'DRAFT',
      isFeatured: false,
      tags: 'Doctor Matrimony, Marriage Advice',
      publishedAt: '',
    });
    setFormErrors({});
    setEditorTab('write');
    setDrawerOpen(true);
  };

  // Open Edit Drawer
  const handleOpenEdit = (blog: BlogPost) => {
    setEditingBlog(blog);
    setFormData({
      title: blog.title || '',
      slug: blog.slug || '',
      category: blog.category || 'Doctor Matrimony',
      excerpt: blog.excerpt || '',
      content: blog.content || '',
      featuredImageUrl: blog.featuredImageUrl || '',
      authorName: blog.authorName || 'Wonderful Jodi Editorial Team',
      authorRole: blog.authorRole || 'Medical Matrimony Consultant',
      readingTime: blog.readingTime || '5 min read',
      status: blog.status || 'DRAFT',
      isFeatured: Boolean(blog.isFeatured),
      tags: (blog.tags || []).join(', '),
      publishedAt: blog.publishedAt ? new Date(blog.publishedAt).toISOString().split('T')[0] : '',
    });
    setFormErrors({});
    setEditorTab('write');
    setDrawerOpen(true);
  };

  // Auto-calculate reading time and auto-slug
  const handleTitleChange = (val: string) => {
    setFormData((prev) => {
      const updated = { ...prev, title: val };
      if (!editingBlog) {
        const autoSlug = val
          .toLowerCase()
          .trim()
          .replace(/[^\w\s-]/g, '')
          .replace(/[\s_-]+/g, '-')
          .replace(/^-+|-+$/g, '');
        updated.slug = autoSlug;
      }
      return updated;
    });
  };

  const handleContentChange = (val: string) => {
    setFormData((prev) => {
      const words = val.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
      const mins = Math.max(1, Math.ceil(words / 200));
      return {
        ...prev,
        content: val,
        readingTime: `${mins} min read`,
      };
    });
  };

  // Quick insert tags into content
  const insertContentSnippet = (before: string, after: string = '') => {
    const textarea = document.getElementById('blog-content-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = formData.content;
    const selected = current.substring(start, end) || 'Sample text';
    const updated = current.substring(0, start) + before + selected + after + current.substring(end);

    handleContentChange(updated);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
    }, 50);
  };

  // Image Upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showToast('Only JPG, PNG, and WebP images are allowed.', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('Image size must be under 5MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result as string;
        showToast('Uploading cover image...');
        const res = await uploadBlogImage({ base64, filename: file.name });
        if (res.success && res.url) {
          setFormData((prev) => ({ ...prev, featuredImageUrl: res.url }));
          showToast('Cover image uploaded successfully!');
        }
      } catch (err: any) {
        showToast(err?.response?.data?.message || 'Failed to upload cover image.', 'error');
      }
    };
    reader.readAsDataURL(file);
  };

  // Save Blog Post
  const handleSaveBlog = async (saveAsStatus?: BlogStatus) => {
    const errors: Record<string, string> = {};
    if (!formData.title.trim()) errors.title = 'Article title is required';
    if (!formData.category.trim()) errors.category = 'Category is required';
    if (!formData.excerpt.trim()) errors.excerpt = 'Summary excerpt is required';

    const targetStatus = saveAsStatus || formData.status;
    if (targetStatus === 'PUBLISHED' && !formData.content.trim()) {
      errors.content = 'Full article content is required before publishing';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      showToast('Please fix the validation errors before saving.', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<BlogPost> = {
        title: formData.title.trim(),
        slug: formData.slug.trim() || undefined,
        category: formData.category.trim(),
        excerpt: formData.excerpt.trim(),
        content: formData.content,
        featuredImageUrl: formData.featuredImageUrl.trim() || undefined,
        authorName: formData.authorName.trim() || 'Wonderful Jodi Editorial Team',
        authorRole: formData.authorRole.trim() || 'Medical Matrimony Consultant',
        readingTime: formData.readingTime.trim() || '5 min read',
        status: targetStatus,
        isFeatured: formData.isFeatured,
        tags: formData.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        publishedAt: formData.publishedAt ? new Date(formData.publishedAt).toISOString() : undefined,
      };

      if (editingBlog) {
        const res = await updateAdminBlog(editingBlog._id, payload);
        showToast(`Article "${res.data.title}" updated successfully!`);
      } else {
        const res = await createAdminBlog(payload);
        showToast(`Article "${res.data.title}" created successfully!`);
      }

      setDrawerOpen(false);
      loadBlogs();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to save blog post.';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Toggle Featured status
  const handleToggleFeatured = async (blog: BlogPost) => {
    try {
      const res = await toggleAdminBlogFeatured(blog._id, !blog.isFeatured);
      setBlogs((prev) =>
        prev.map((b) => (b._id === blog._id ? { ...b, isFeatured: res.data.isFeatured } : b))
      );
      setStats((prev) => ({
        ...prev,
        featured: prev.featured + (res.data.isFeatured ? 1 : -1),
      }));
      showToast(`Featured status updated for "${blog.title}".`);
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to update featured status.', 'error');
    }
  };

  // Fast Publish / Unpublish Status Toggle
  const handleQuickStatusChange = async (blog: BlogPost, nextStatus: BlogStatus) => {
    try {
      const res = await updateAdminBlogStatus(blog._id, nextStatus);
      setBlogs((prev) =>
        prev.map((b) => (b._id === blog._id ? { ...b, status: res.data.status, publishedAt: res.data.publishedAt } : b))
      );
      showToast(`Status of "${blog.title}" set to ${nextStatus}.`);
      loadBlogs();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to update status.', 'error');
    }
  };

  // Confirm Modal action (Delete / Archive)
  const handleExecuteModalAction = async () => {
    if (!confirmModal.blog) return;
    setActionLoading(true);
    try {
      if (confirmModal.type === 'delete') {
        await deleteAdminBlog(confirmModal.blog._id);
        showToast(`Article "${confirmModal.blog.title}" deleted.`);
      } else if (confirmModal.type === 'archive') {
        await updateAdminBlogStatus(confirmModal.blog._id, 'ARCHIVED');
        showToast(`Article "${confirmModal.blog.title}" archived.`);
      }
      setConfirmModal({ open: false, type: 'delete', blog: null });
      loadBlogs();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Action failed.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── TOAST NOTIFICATION ─── */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl text-xs font-semibold text-white animate-fade-in ${
            toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
          }`}
        >
          {toast.type === 'success' ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* ─── HEADER & SUMMARY STATS ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <BookOpen className="w-4 h-4 text-[#E51F3E]" />
            <span>Content & Publications</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Doctor Matrimony Blogs & Articles
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Publish, edit, and curate articles on residency dynamics, verification, and doctor matchmaking.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/blog"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs"
            title="Open live public blog in new tab"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Public Blog</span>
          </Link>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#E51F3E] to-[#F03554] text-white text-xs font-bold hover:shadow-md hover:shadow-red-950/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create Article</span>
          </button>
        </div>
      </div>

      {/* ─── STATS COUNTERS BAR ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Articles</span>
          <div className="text-xl sm:text-2xl font-bold text-slate-900">{stats.total}</div>
        </div>
        <div className="p-3.5 rounded-xl bg-white border border-emerald-100 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Published
          </span>
          <div className="text-xl sm:text-2xl font-bold text-emerald-700">{stats.published}</div>
        </div>
        <div className="p-3.5 rounded-xl bg-white border border-amber-100 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Drafts
          </span>
          <div className="text-xl sm:text-2xl font-bold text-amber-700">{stats.draft}</div>
        </div>
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Archive className="w-3 h-3 text-slate-400" />
            Archived
          </span>
          <div className="text-xl sm:text-2xl font-bold text-slate-700">{stats.archived}</div>
        </div>
        <div className="p-3.5 rounded-xl bg-white border border-rose-100 shadow-xs space-y-1 col-span-2 sm:col-span-1">
          <span className="text-[11px] font-semibold text-[#E51F3E] uppercase tracking-wider flex items-center gap-1">
            <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
            Featured
          </span>
          <div className="text-xl sm:text-2xl font-bold text-rose-700">{stats.featured}</div>
        </div>
      </div>

      {/* ─── FILTERS & SEARCH BAR ─── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by article title, excerpt, slug, author..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by category"
              className="bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 rounded-xl px-3 py-2 focus:outline-hidden focus:border-[#E51F3E]"
            >
              <option value="ALL">All Categories</option>
              {CATEGORY_PRESETS.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 border-t border-slate-100 pt-3 overflow-x-auto scrollbar-none">
          {['ALL', 'PUBLISHED', 'DRAFT', 'ARCHIVED'].map((st) => (
            <button
              key={st}
              onClick={() => {
                setSelectedStatus(st);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                selectedStatus === st
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'ALL' ? 'All Posts' : st}
            </button>
          ))}
          <span className="ml-auto text-xs text-slate-400 font-medium">
            Found {totalCount} {totalCount === 1 ? 'article' : 'articles'}
          </span>
        </div>
      </div>

      {/* ─── BLOGS TABLE ─── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4 animate-pulse">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 bg-slate-100 rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <div className="p-8 text-center space-y-3">
            <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
            <p className="text-xs text-slate-600 font-medium">{error}</p>
            <button
              onClick={loadBlogs}
              className="px-4 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-[#E51F3E] transition"
            >
              Retry
            </button>
          </div>
        ) : blogs.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="font-serif text-lg font-bold text-slate-800">No blog posts found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No articles match the current filter or search criteria. Click &ldquo;Create Article&rdquo; to publish your first post.
            </p>
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#E51F3E] text-white text-xs font-bold hover:bg-rose-700 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create New Article</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[10px]">
                <tr>
                  <th className="px-4 py-3">Article</th>
                  <th className="px-3 py-3">Category</th>
                  <th className="px-3 py-3">Author</th>
                  <th className="px-3 py-3 text-center">Featured</th>
                  <th className="px-3 py-3 text-center">Status</th>
                  <th className="px-3 py-3">Published Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {blogs.map((b) => (
                  <tr key={b._id} className="hover:bg-slate-50/70 transition group">
                    {/* Article Thumbnail & Title */}
                    <td className="px-4 py-3 max-w-xs sm:max-w-md">
                      <div className="flex items-center gap-3">
                        <img
                          src={b.featuredImageUrl || IMAGE_PRESETS[0].url}
                          alt=""
                          className="w-12 h-12 rounded-lg object-cover bg-slate-100 shrink-0 border border-slate-200"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = IMAGE_PRESETS[0].url;
                          }}
                        />
                        <div className="truncate">
                          <div className="font-bold text-slate-900 text-xs sm:text-[13px] truncate group-hover:text-[#E51F3E] transition">
                            {b.title}
                          </div>
                          <div className="text-[10.5px] text-slate-400 font-mono truncate">
                            /{b.slug}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-3 py-3">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold whitespace-nowrap">
                        {b.category}
                      </span>
                    </td>

                    {/* Author */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="font-semibold text-slate-800 text-xs">{b.authorName}</div>
                      <div className="text-[10px] text-slate-400">{b.readingTime}</div>
                    </td>

                    {/* Featured Star Toggle */}
                    <td className="px-3 py-3 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleToggleFeatured(b)}
                        title={b.isFeatured ? 'Remove featured' : 'Mark as featured'}
                        className={`p-1 rounded-lg transition ${
                          b.isFeatured
                            ? 'text-amber-500 hover:bg-amber-50'
                            : 'text-slate-300 hover:text-amber-400 hover:bg-slate-100'
                        }`}
                      >
                        <Star className={`w-4 h-4 ${b.isFeatured ? 'fill-amber-400' : ''}`} />
                      </button>
                    </td>

                    {/* Status Badge & Dropdown */}
                    <td className="px-3 py-3 text-center whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold ${
                            b.status === 'PUBLISHED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : b.status === 'DRAFT'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {b.status}
                        </span>
                      </div>
                    </td>

                    {/* Published Date */}
                    <td className="px-3 py-3 text-slate-600 whitespace-nowrap text-[11px]">
                      {formatDate(b.publishedAt)}
                    </td>

                    {/* Action Buttons */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        {/* Public Link / Preview */}
                        <Link
                          href={`/blog/${b.slug}`}
                          target="_blank"
                          title="View on public site"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Link>

                        {/* Edit */}
                        <button
                          onClick={() => handleOpenEdit(b)}
                          title="Edit article"
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        {/* Quick Toggle Status: Publish or Unpublish */}
                        {b.status === 'PUBLISHED' ? (
                          <button
                            onClick={() => handleQuickStatusChange(b, 'DRAFT')}
                            title="Unpublish (Save as draft)"
                            className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition"
                          >
                            <span className="text-[10px] font-bold px-1 py-0.5 rounded-sm bg-amber-50 border border-amber-200">
                              Draft
                            </span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleQuickStatusChange(b, 'PUBLISHED')}
                            title="Publish article now"
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition"
                          >
                            <span className="text-[10px] font-bold px-1 py-0.5 rounded-sm bg-emerald-50 border border-emerald-200">
                              Publish
                            </span>
                          </button>
                        )}

                        {/* Archive */}
                        {b.status !== 'ARCHIVED' && (
                          <button
                            onClick={() => setConfirmModal({ open: true, type: 'archive', blog: b })}
                            title="Archive article"
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Delete */}
                        <button
                          onClick={() => setConfirmModal({ open: true, type: 'delete', blog: b })}
                          title="Delete article"
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Pagination */}
        {!loading && totalPages > 1 && (
          <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-2.5 py-1 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-2.5 py-1 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── CREATE / EDIT SLIDE-OVER DRAWER ─── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-3xl bg-white h-full shadow-2xl flex flex-col justify-between animate-slide-left overflow-y-auto">
            {/* Drawer Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between sticky top-0 z-20 backdrop-blur-md">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-[#E51F3E] flex items-center justify-center font-bold">
                  {editingBlog ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                    {editingBlog ? `Edit: ${editingBlog.title}` : 'Create New Blog Post'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Doctor Matrimony Platform publication editor
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body Form */}
            <div className="p-4 sm:p-6 space-y-6 flex-1">
              {/* Title & Slug */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Article Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="e.g. Balancing Residency Duties & Matrimonial Meetings..."
                    className={`w-full px-3.5 py-2 rounded-xl border text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden ${
                      formErrors.title ? 'border-rose-400 bg-rose-50/40' : 'border-slate-200 focus:border-[#E51F3E]'
                    }`}
                  />
                  {formErrors.title && (
                    <span className="text-[11px] text-rose-600 font-semibold">{formErrors.title}</span>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    URL Slug <span className="text-slate-400 font-normal">(auto-generated, unique)</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono text-slate-400">/blog/</span>
                    <input
                      type="text"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      placeholder="balancing-residency-duties"
                      className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono text-slate-800 focus:outline-hidden focus:border-[#E51F3E]"
                    />
                  </div>
                </div>
              </div>

              {/* Category, Author & Reading Time */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-hidden focus:border-[#E51F3E]"
                  >
                    {CATEGORY_PRESETS.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Author Name</label>
                  <input
                    type="text"
                    value={formData.authorName}
                    onChange={(e) => setFormData({ ...formData, authorName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:border-[#E51F3E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Author Role</label>
                  <input
                    type="text"
                    value={formData.authorRole}
                    onChange={(e) => setFormData({ ...formData, authorRole: e.target.value })}
                    placeholder="e.g. MD & Matrimony Advisor"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:border-[#E51F3E]"
                  />
                </div>
              </div>

              {/* Excerpt / Summary */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Short Excerpt / SEO Meta Description <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400">
                    {formData.excerpt.length} / 250 chars
                  </span>
                </div>
                <textarea
                  rows={2}
                  value={formData.excerpt}
                  onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                  placeholder="A concise summary displayed on the blog card and search engine meta description..."
                  className={`w-full px-3.5 py-2 rounded-xl border text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden ${
                    formErrors.excerpt ? 'border-rose-400 bg-rose-50/40' : 'border-slate-200 focus:border-[#E51F3E]'
                  }`}
                />
                {formErrors.excerpt && (
                  <span className="text-[11px] text-rose-600 font-semibold">{formErrors.excerpt}</span>
                )}
              </div>

              {/* Cover Image Uploader & Presets */}
              <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <label className="block text-xs font-bold text-slate-800">
                  Featured Cover Image
                </label>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  {/* Image Preview Thumbnail */}
                  <div className="w-24 h-16 rounded-xl bg-slate-200 overflow-hidden shrink-0 border border-slate-300">
                    <img
                      src={formData.featuredImageUrl || IMAGE_PRESETS[0].url}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = IMAGE_PRESETS[0].url;
                      }}
                    />
                  </div>

                  {/* Input or File button */}
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      value={formData.featuredImageUrl}
                      onChange={(e) => setFormData({ ...formData, featuredImageUrl: e.target.value })}
                      placeholder="https://images.unsplash.com/... or upload local image"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:border-[#E51F3E]"
                    />

                    <div className="flex items-center gap-2">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-slate-300 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer transition">
                        <Upload className="w-3 h-3 text-slate-500" />
                        <span>Upload File (JPG/PNG/WebP)</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                      <span className="text-[10px] text-slate-400">Max 5MB</span>
                    </div>
                  </div>
                </div>

                {/* Preset suggestions */}
                <div className="pt-2 border-t border-slate-200/60 flex items-center gap-2 overflow-x-auto scrollbar-none">
                  <span className="text-[10.5px] font-semibold text-slate-500 shrink-0">Presets:</span>
                  {IMAGE_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setFormData({ ...formData, featuredImageUrl: p.url })}
                      className="text-[10.5px] px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 hover:border-[#E51F3E] hover:text-[#E51F3E] whitespace-nowrap"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status, Featured, Tags & Publication Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as BlogStatus })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-hidden focus:border-[#E51F3E]"
                  >
                    <option value="DRAFT">DRAFT (Hidden from Public)</option>
                    <option value="PUBLISHED">PUBLISHED (Live)</option>
                    <option value="ARCHIVED">ARCHIVED (Archived)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Publish Date</label>
                  <input
                    type="date"
                    value={formData.publishedAt}
                    onChange={(e) => setFormData({ ...formData, publishedAt: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:outline-hidden focus:border-[#E51F3E]"
                  />
                </div>

                <div className="flex flex-col justify-center">
                  <label className="text-xs font-bold text-slate-700 mb-1">Featured Badge</label>
                  <label className="flex items-center gap-2 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={formData.isFeatured}
                      onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                      className="w-4 h-4 rounded-sm text-[#E51F3E] focus:ring-[#E51F3E]"
                    />
                    <span className="text-xs font-semibold text-slate-800">Highlight as Featured</span>
                  </label>
                </div>
              </div>

              {/* Article Content & Formatting Toolbar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <label className="block text-xs font-bold text-slate-700">
                      Full Article Content <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">{formData.readingTime}</span>
                  </div>

                  {/* Tabs: Write vs Preview */}
                  <div className="flex items-center rounded-lg bg-slate-100 p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setEditorTab('write')}
                      className={`px-3 py-1 rounded-md font-semibold transition ${
                        editorTab === 'write' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Write
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorTab('preview')}
                      className={`px-3 py-1 rounded-md font-semibold transition ${
                        editorTab === 'preview' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Live Preview
                    </button>
                  </div>
                </div>

                {/* Toolbar */}
                {editorTab === 'write' && (
                  <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-slate-100 border border-slate-200 text-xs">
                    <button
                      type="button"
                      onClick={() => insertContentSnippet('<h2>', '</h2>')}
                      className="px-2 py-1 rounded-md bg-white text-slate-700 hover:bg-slate-200 font-bold"
                      title="Heading 2"
                    >
                      H2
                    </button>
                    <button
                      type="button"
                      onClick={() => insertContentSnippet('<h3>', '</h3>')}
                      className="px-2 py-1 rounded-md bg-white text-slate-700 hover:bg-slate-200 font-bold"
                      title="Heading 3"
                    >
                      H3
                    </button>
                    <button
                      type="button"
                      onClick={() => insertContentSnippet('<strong>', '</strong>')}
                      className="px-2 py-1 rounded-md bg-white text-slate-700 hover:bg-slate-200 font-bold"
                      title="Bold"
                    >
                      B
                    </button>
                    <button
                      type="button"
                      onClick={() => insertContentSnippet('<em>', '</em>')}
                      className="px-2 py-1 rounded-md bg-white text-slate-700 hover:bg-slate-200 italic font-serif"
                      title="Italic"
                    >
                      I
                    </button>
                    <button
                      type="button"
                      onClick={() => insertContentSnippet('<blockquote>', '</blockquote>')}
                      className="px-2 py-1 rounded-md bg-white text-slate-700 hover:bg-slate-200"
                      title="Doctor Quote"
                    >
                      &ldquo;Quote&rdquo;
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        insertContentSnippet(
                          '<div class="tip-box">\n  <h4>Doctor Matrimony Tip</h4>\n  <p>',
                          '</p>\n</div>'
                        )
                      }
                      className="px-2 py-1 rounded-md bg-white text-rose-700 hover:bg-rose-50 font-semibold"
                      title="Doctor Tip Box"
                    >
                      Tip Box
                    </button>
                    <button
                      type="button"
                      onClick={() => insertContentSnippet('<ul>\n  <li>', '</li>\n</ul>')}
                      className="px-2 py-1 rounded-md bg-white text-slate-700 hover:bg-slate-200"
                      title="Bullet List"
                    >
                      • List
                    </button>
                    <button
                      type="button"
                      onClick={() => insertContentSnippet('<p>', '</p>')}
                      className="px-2 py-1 rounded-md bg-white text-slate-700 hover:bg-slate-200"
                      title="Paragraph"
                    >
                      &para; Paragraph
                    </button>
                  </div>
                )}

                {/* Editor or Preview Pane */}
                {editorTab === 'write' ? (
                  <div>
                    <textarea
                      id="blog-content-textarea"
                      rows={14}
                      value={formData.content}
                      onChange={(e) => handleContentChange(e.target.value)}
                      placeholder="Write your article in HTML or formatted sections (<h2>, <p>, <blockquote>, <ul>)..."
                      className={`w-full p-4 rounded-xl border text-xs font-mono leading-relaxed text-slate-900 focus:outline-hidden ${
                        formErrors.content ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:border-[#E51F3E]'
                      }`}
                    />
                    {formErrors.content && (
                      <span className="text-[11px] text-rose-600 font-semibold">{formErrors.content}</span>
                    )}
                  </div>
                ) : (
                  <div className="p-6 rounded-xl border border-slate-200 min-h-[350px] bg-slate-50/50">
                    <div
                      className="prose prose-slate max-w-none text-xs sm:text-sm prose-h2:text-xl prose-h3:text-base prose-blockquote:border-l-4 prose-blockquote:border-[#E51F3E] prose-blockquote:bg-rose-50/60 prose-blockquote:p-3 prose-blockquote:rounded-r-lg"
                      dangerouslySetInnerHTML={{ __html: formData.content || '<p class="text-slate-400 italic">No content yet. Switch to "Write" tab to begin drafting.</p>' }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between sticky bottom-0 z-20 backdrop-blur-md">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSaveBlog('DRAFT')}
                  className="px-4 py-2 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold hover:bg-amber-100 disabled:opacity-50 transition"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSaveBlog('PUBLISHED')}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#E51F3E] to-[#F03554] text-white text-xs font-bold hover:shadow-md hover:shadow-red-950/30 disabled:opacity-50 transition flex items-center gap-1.5"
                >
                  {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>{editingBlog ? 'Update & Publish' : 'Publish Article'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── CONFIRMATION DIALOG (DELETE / ARCHIVE) ─── */}
      {confirmModal.open && confirmModal.blog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-[#E51F3E] flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-serif text-lg font-bold text-slate-900">
                {confirmModal.type === 'delete' ? 'Delete Article?' : 'Archive Article?'}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {confirmModal.type === 'delete'
                  ? `Are you sure you want to delete "${confirmModal.blog.title}"? The article will be soft-deleted and hidden from public view.`
                  : `Are you sure you want to archive "${confirmModal.blog.title}"? It will no longer be visible on the public blog.`}
              </p>
            </div>
            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal({ open: false, type: 'delete', blog: null })}
                className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleExecuteModalAction}
                className="flex-1 py-2 rounded-xl bg-[#E51F3E] text-white text-xs font-bold hover:bg-rose-700 disabled:opacity-50 transition"
              >
                {actionLoading ? 'Processing...' : confirmModal.type === 'delete' ? 'Delete' : 'Archive'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
