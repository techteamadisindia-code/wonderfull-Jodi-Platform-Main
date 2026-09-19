'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Trophy,
  Plus,
  Search,
  X,
  Edit,
  Trash2,
  Eye,
  Star,
  CheckCircle,
  RefreshCw,
  Calendar,
  Building2,
  Upload,
  AlertTriangle,
  FileText,
  Check,
  ExternalLink,
  Sparkles,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Images,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import {
  fetchAdminAwards,
  createAdminAward,
  updateAdminAward,
  deleteAdminAward,
  updateAdminAwardStatus,
  toggleAdminAwardFeatured,
  updateAdminAwardOrder,
  uploadAwardImage,
  Award,
  AwardSummaryStats,
} from '../../../services/awardApi';

const CATEGORY_PRESETS = [
  'Healthcare Excellence',
  'Matrimonial Trust',
  'Digital Innovation',
  'Consumer Trust & Safety',
  'Doctor Community Leadership',
  'Astrology & Compatibility',
  'National Matchmaking Conclave',
];

const LOGO_PRESETS = [
  {
    label: 'Medical Golden Seal',
    url: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=400&q=80',
  },
  {
    label: 'Healthcare Leadership',
    url: 'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?auto=format&fit=crop&w=400&q=80',
  },
  {
    label: 'Trust & Verification Ribbon',
    url: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=400&q=80',
  },
  {
    label: 'Prestige Conclave Medal',
    url: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=400&q=80',
  },
];

interface ToastState {
  show: boolean;
  message: string;
  type: 'success' | 'error' | 'info';
}

export default function AdminAwardsPage() {
  const [awards, setAwards] = useState<Award[]>([]);
  const [stats, setStats] = useState<AwardSummaryStats>({
    total: 0,
    active: 0,
    featured: 0,
    inactive: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [featuredFilter, setFeaturedFilter] = useState<'ALL' | 'FEATURED' | 'NOT_FEATURED'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Drawer / Form State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingAward, setEditingAward] = useState<Award | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    awardYear: new Date().getFullYear(),
    category: 'Healthcare Excellence',
    organization: '',
    logo: '',
    shortDescription: '',
    fullDescription: '',
    galleryImages: [] as string[],
    websiteUrl: '',
    displayOrder: 0,
    isActive: true,
    isFeatured: true,
  });
  const [galleryUrlInput, setGalleryUrlInput] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Confirm Delete Modal
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    award: Award | null;
  }>({ open: false, award: null });
  const [deleting, setDeleting] = useState(false);

  // Toast
  const [toast, setToast] = useState<ToastState>({ show: false, message: '', type: 'success' });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 3500);
  };

  // Load Awards
  const loadAwards = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAdminAwards();
      setAwards(res.data || []);
      if (res.stats) {
        setStats(res.stats);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to load awards from server.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAwards();
  }, []);

  // Filtered List
  const filteredAwards = useMemo(() => {
    return awards.filter((award) => {
      // Search
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        award.name.toLowerCase().includes(q) ||
        award.organization.toLowerCase().includes(q) ||
        award.category.toLowerCase().includes(q) ||
        String(award.awardYear).includes(q);

      // Status
      const matchStatus =
        statusFilter === 'ALL'
          ? true
          : statusFilter === 'ACTIVE'
          ? award.isActive
          : !award.isActive;

      // Featured
      const matchFeatured =
        featuredFilter === 'ALL'
          ? true
          : featuredFilter === 'FEATURED'
          ? award.isFeatured
          : !award.isFeatured;

      // Category
      const matchCategory =
        categoryFilter === 'ALL' ? true : award.category === categoryFilter;

      return matchSearch && matchStatus && matchFeatured && matchCategory;
    });
  }, [awards, searchQuery, statusFilter, featuredFilter, categoryFilter]);

  // Open Create Drawer
  const handleOpenCreate = () => {
    setEditingAward(null);
    setFormData({
      name: '',
      slug: '',
      awardYear: new Date().getFullYear(),
      category: 'Healthcare Excellence',
      organization: '',
      logo: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=400&q=80',
      shortDescription: '',
      fullDescription: '',
      galleryImages: [],
      websiteUrl: '',
      displayOrder: (awards.length + 1) * 10,
      isActive: true,
      isFeatured: true,
    });
    setFormErrors({});
    setDrawerOpen(true);
  };

  // Open Edit Drawer
  const handleOpenEdit = (award: Award) => {
    setEditingAward(award);
    setFormData({
      name: award.name,
      slug: award.slug,
      awardYear: award.awardYear,
      category: award.category,
      organization: award.organization,
      logo: award.logo,
      shortDescription: award.shortDescription,
      fullDescription: award.fullDescription,
      galleryImages: Array.isArray(award.galleryImages) ? [...award.galleryImages] : [],
      websiteUrl: award.websiteUrl || '',
      displayOrder: award.displayOrder ?? 0,
      isActive: award.isActive,
      isFeatured: award.isFeatured,
    });
    setFormErrors({});
    setDrawerOpen(true);
  };

  // Auto-slug generation from name
  const handleNameChange = (name: string) => {
    setFormData((prev) => {
      const generatedSlug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      // If user hasn't manually altered slug or slug matches previous auto-slug
      return {
        ...prev,
        name,
        slug: !editingAward ? generatedSlug : prev.slug,
      };
    });
  };

  // Handle Logo Upload via Base64 endpoint
  const handleLogoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (JPEG, PNG, WebP, SVG).', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('Image size exceeds 5MB limit.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setUploadingLogo(true);
      try {
        const res = await uploadAwardImage({ base64, filename: file.name });
        const uploadedUrl = res.url || res.data?.url;
        setFormData((prev) => ({ ...prev, logo: uploadedUrl }));
        showToast('Award logo uploaded successfully!');
      } catch (err: any) {
        showToast(err?.response?.data?.message || 'Failed to upload logo image.', 'error');
      } finally {
        setUploadingLogo(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle Gallery Upload via Base64 endpoint
  const handleGalleryFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingGallery(true);
    try {
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;
        if (file.size > 5 * 1024 * 1024) continue;

        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const res = await uploadAwardImage({ base64, filename: file.name });
        const uploadedUrl = res.url || res.data?.url;
        if (uploadedUrl) newUrls.push(uploadedUrl);
      }

      setFormData((prev) => ({
        ...prev,
        galleryImages: [...prev.galleryImages, ...newUrls],
      }));
      showToast(`${newUrls.length} gallery image(s) uploaded successfully!`);
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to upload gallery images.', 'error');
    } finally {
      setUploadingGallery(false);
    }
  };

  // Add Gallery Image from manual URL
  const handleAddGalleryUrl = () => {
    if (!galleryUrlInput.trim()) return;
    setFormData((prev) => ({
      ...prev,
      galleryImages: [...prev.galleryImages, galleryUrlInput.trim()],
    }));
    setGalleryUrlInput('');
  };

  // Remove Gallery Image
  const handleRemoveGalleryImage = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      galleryImages: prev.galleryImages.filter((_, i) => i !== idx),
    }));
  };

  // Save Award
  const handleSaveAward = async () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'Award name is required';
    if (!formData.organization.trim()) errors.organization = 'Conferring organization is required';
    if (!formData.category.trim()) errors.category = 'Category is required';
    if (!formData.awardYear || formData.awardYear < 1990) errors.awardYear = 'Valid award year is required';
    if (!formData.logo.trim()) errors.logo = 'Award logo is required';
    if (!formData.shortDescription.trim()) errors.shortDescription = 'Short summary description is required';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      showToast('Please fix the highlighted form errors before saving.', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<Award> = {
        name: formData.name.trim(),
        slug: formData.slug.trim() || undefined,
        awardYear: Number(formData.awardYear),
        category: formData.category.trim(),
        organization: formData.organization.trim(),
        logo: formData.logo.trim(),
        shortDescription: formData.shortDescription.trim(),
        fullDescription: formData.fullDescription.trim() || formData.shortDescription.trim(),
        galleryImages: formData.galleryImages,
        websiteUrl: formData.websiteUrl.trim() || undefined,
        displayOrder: Number(formData.displayOrder) || 0,
        isActive: formData.isActive,
        isFeatured: formData.isFeatured,
      };

      if (editingAward) {
        const res = await updateAdminAward(editingAward._id, payload);
        showToast(`Award "${res.data.name}" updated successfully!`);
      } else {
        const res = await createAdminAward(payload);
        showToast(`Award "${res.data.name}" created successfully!`);
      }

      setDrawerOpen(false);
      loadAwards();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to save award.';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Quick Toggle Active
  const handleToggleActive = async (award: Award) => {
    try {
      const newActive = !award.isActive;
      const res = await updateAdminAwardStatus(award._id, newActive);
      setAwards((prev) =>
        prev.map((a) => (a._id === award._id ? { ...a, isActive: res.data.isActive } : a))
      );
      setStats((prev) => ({
        ...prev,
        active: prev.active + (newActive ? 1 : -1),
        inactive: prev.inactive + (newActive ? -1 : 1),
      }));
      showToast(`Status updated: "${award.name}" is now ${newActive ? 'Active' : 'Inactive'}.`);
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to toggle status.', 'error');
    }
  };

  // Quick Toggle Featured on Homepage
  const handleToggleFeatured = async (award: Award) => {
    try {
      const newFeatured = !award.isFeatured;
      const res = await toggleAdminAwardFeatured(award._id, newFeatured);
      setAwards((prev) =>
        prev.map((a) => (a._id === award._id ? { ...a, isFeatured: res.data.isFeatured } : a))
      );
      setStats((prev) => ({
        ...prev,
        featured: prev.featured + (newFeatured ? 1 : -1),
      }));
      showToast(
        newFeatured
          ? `"${award.name}" is now FEATURED on the homepage!`
          : `"${award.name}" removed from homepage featured.`
      );
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to toggle featured state.', 'error');
    }
  };

  // Display Order change
  const handleOrderChange = async (award: Award, delta: number) => {
    const nextOrder = Math.max(0, (award.displayOrder ?? 0) + delta);
    try {
      await updateAdminAwardOrder(award._id, nextOrder);
      setAwards((prev) =>
        prev.map((a) => (a._id === award._id ? { ...a, displayOrder: nextOrder } : a))
      );
      showToast(`Display order of "${award.name}" updated to ${nextOrder}.`);
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to update display order.', 'error');
    }
  };

  // Execute Soft Delete
  const handleExecuteDelete = async () => {
    if (!deleteModal.award) return;
    setDeleting(true);
    try {
      await deleteAdminAward(deleteModal.award._id);
      showToast(`Award "${deleteModal.award.name}" deleted successfully.`);
      setDeleteModal({ open: false, award: null });
      loadAwards();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to delete award.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ─── FLOATING TOAST ─── */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce-short">
          <div
            className={`px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-white ${
              toast.type === 'error'
                ? 'bg-rose-600 border-rose-700'
                : toast.type === 'info'
                ? 'bg-blue-600 border-blue-700'
                : 'bg-emerald-600 border-emerald-700'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            ) : (
              <CheckCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* ─── HEADER & ACTIONS ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>Honors & Accreditations</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Awards & Recognition Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Manage industry awards, verified credentials, homepage logo showcases, and public citations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/awards"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
            title="Preview public awards directory in new tab"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Public Awards</span>
          </Link>

          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#E51F3E] via-[#E82645] to-[#F03554] text-white text-xs font-bold shadow-sm shadow-red-600/20 hover:shadow-md hover:shadow-red-600/30 transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Award</span>
          </button>
        </div>
      </div>

      {/* ─── STATS SUMMARY CARDS ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Awards
            </span>
            <Trophy className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
              Active Public
            </span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">{stats.active}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">
              Homepage Featured
            </span>
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600">{stats.featured}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Inactive / Hidden
            </span>
            <X className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-400">{stats.inactive}</div>
        </div>
      </div>

      {/* ─── FILTERS & SEARCH BAR ─── */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search Box */}
          <div className="relative sm:col-span-5">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by award name, organization, category, year..."
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E] transition"
            />
          </div>

          {/* Status Filter */}
          <div className="sm:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E]"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>
          </div>

          {/* Featured Filter */}
          <div className="sm:col-span-2">
            <select
              value={featuredFilter}
              onChange={(e) => setFeaturedFilter(e.target.value as any)}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E]"
            >
              <option value="ALL">All Displays</option>
              <option value="FEATURED">Homepage Only</option>
              <option value="NOT_FEATURED">Standard</option>
            </select>
          </div>

          {/* Refresh Button */}
          <div className="sm:col-span-2 flex justify-end">
            <button
              onClick={loadAwards}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
              title="Reload awards list"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── AWARDS TABLE ─── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-[#E51F3E] animate-spin mx-auto" />
            <p className="text-xs sm:text-sm font-semibold text-slate-500">
              Loading awards catalog from database...
            </p>
          </div>
        ) : filteredAwards.length === 0 ? (
          <div className="p-12 text-center max-w-sm mx-auto space-y-3">
            <Trophy className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="font-serif text-lg font-bold text-slate-800">No Awards Found</h3>
            <p className="text-xs text-slate-500">
              {awards.length === 0
                ? 'No awards have been created yet. Click "Add New Award" to add your first verified recognition.'
                : 'No awards matched your search or filter settings.'}
            </p>
            {awards.length === 0 && (
              <button
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0F172A] text-white text-xs font-bold hover:bg-slate-800 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Award</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-slate-700 border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10.5px]">
                  <th className="py-3.5 px-4">Award & Logo</th>
                  <th className="py-3.5 px-3">Organization & Year</th>
                  <th className="py-3.5 px-3">Category</th>
                  <th className="py-3.5 px-3 text-center">Order</th>
                  <th className="py-3.5 px-3 text-center">Homepage Featured</th>
                  <th className="py-3.5 px-3 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAwards.map((award) => (
                  <tr key={award._id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Award Logo & Name */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                          <img
                            src={award.logo}
                            alt={award.name}
                            className="w-full h-full object-contain filter contrast-105"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=200&q=80';
                            }}
                          />
                        </div>
                        <div className="space-y-0.5 max-w-xs">
                          <div className="font-serif font-bold text-slate-900 leading-snug">
                            {award.name}
                          </div>
                          <div className="text-[11px] font-mono text-slate-400 truncate">
                            /awards/{award.slug}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Organization & Year */}
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-800 leading-tight">
                        {award.organization}
                      </div>
                      <div className="text-[11px] text-amber-600 font-mono font-bold mt-0.5">
                        Year {award.awardYear}
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-3">
                      <span className="inline-block px-2.5 py-1 rounded-full text-[10.5px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                        {award.category || 'General'}
                      </span>
                    </td>

                    {/* Display Order with Up/Down buttons */}
                    <td className="py-3 px-3 text-center">
                      <div className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5">
                        <span className="font-mono font-bold text-slate-700 text-xs w-6 text-center">
                          {award.displayOrder ?? 0}
                        </span>
                        <div className="flex flex-col">
                          <button
                            onClick={() => handleOrderChange(award, 1)}
                            className="p-0.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded"
                            title="Increase display priority"
                          >
                            <ChevronUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleOrderChange(award, -1)}
                            className="p-0.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded"
                            title="Decrease display priority"
                          >
                            <ChevronDown className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Homepage Featured Star Toggle */}
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => handleToggleFeatured(award)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition shadow-2xs ${
                          award.isFeatured
                            ? 'bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200'
                            : 'bg-slate-100 text-slate-400 border border-slate-200 hover:bg-slate-200 hover:text-slate-600'
                        }`}
                        title={
                          award.isFeatured
                            ? 'Click to remove from homepage'
                            : 'Click to feature on homepage'
                        }
                      >
                        <Star
                          className={`w-3.5 h-3.5 ${
                            award.isFeatured ? 'fill-amber-500 text-amber-500' : 'text-slate-400'
                          }`}
                        />
                        <span>{award.isFeatured ? 'Featured' : 'Standard'}</span>
                      </button>
                    </td>

                    {/* Active/Inactive Status Toggle */}
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => handleToggleActive(award)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition shadow-2xs ${
                          award.isActive
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                            : 'bg-rose-100 text-rose-800 border border-rose-300 hover:bg-rose-200'
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            award.isActive ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                        />
                        <span>{award.isActive ? 'Active' : 'Inactive'}</span>
                      </button>
                    </td>

                    {/* Action Buttons */}
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <Link
                          href={`/awards/${award.slug}`}
                          target="_blank"
                          className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
                          title="Preview public details page"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleOpenEdit(award)}
                          className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                          title="Edit award"
                        >
                          <Edit className="w-4 h-4 text-blue-600" />
                        </button>
                        <button
                          onClick={() => setDeleteModal({ open: true, award })}
                          className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition"
                          title="Delete award"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── CREATE / EDIT DRAWER MODAL ─── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-slate-950/60 backdrop-blur-xs animate-fade-in">
          <div
            className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="space-y-0.5">
                <div className="text-[11px] font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5" />
                  <span>{editingAward ? 'Edit Recognition' : 'New Recognition'}</span>
                </div>
                <h2 className="font-serif text-xl font-bold text-slate-900">
                  {editingAward ? `Edit: ${editingAward.name}` : 'Create Award Recognition'}
                </h2>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body */}
            <div className="p-6 space-y-5 flex-1">
              {/* Award Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                  <span>Award Name *</span>
                  <span className="text-[11px] text-slate-400 font-normal">Official Title</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Best Trusted Healthcare Matrimonial Platform 2025"
                  className={`w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-50 border transition ${
                    formErrors.name
                      ? 'border-rose-500 focus:ring-rose-200'
                      : 'border-slate-200 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E]'
                  }`}
                />
                {formErrors.name && (
                  <p className="text-[11px] text-rose-500 font-semibold">{formErrors.name}</p>
                )}
              </div>

              {/* Slug (URL key) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                  <span>URL Slug *</span>
                  <span className="text-[11px] text-slate-400 font-mono">/awards/[slug]</span>
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                  placeholder="e.g. best-trusted-healthcare-matrimonial-platform-2025"
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-700 focus:border-[#E51F3E] focus:outline-none"
                />
              </div>

              {/* Two columns: Organization & Year */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Conferring Organization *
                  </label>
                  <input
                    type="text"
                    value={formData.organization}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, organization: e.target.value }))
                    }
                    placeholder="e.g. Indian Medical & Consumer Federation"
                    className={`w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-50 border ${
                      formErrors.organization ? 'border-rose-500' : 'border-slate-200'
                    }`}
                  />
                  {formErrors.organization && (
                    <p className="text-[11px] text-rose-500">{formErrors.organization}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Award Year *
                  </label>
                  <input
                    type="number"
                    value={formData.awardYear}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, awardYear: Number(e.target.value) }))
                    }
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-50 border border-slate-200 font-mono"
                    min="1990"
                    max="2035"
                  />
                </div>
              </div>

              {/* Two columns: Category & Display Order */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Category *
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, category: e.target.value }))
                    }
                    list="category-suggestions"
                    placeholder="e.g. Healthcare Excellence"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-50 border border-slate-200"
                  />
                  <datalist id="category-suggestions">
                    {CATEGORY_PRESETS.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={formData.displayOrder}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, displayOrder: Number(e.target.value) }))
                    }
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-50 border border-slate-200 font-mono"
                    placeholder="0"
                  />
                  <p className="text-[10.5px] text-slate-400">Lower numbers appear first.</p>
                </div>
              </div>

              {/* Award Logo Upload Section */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                  <span>Award Logo / Insignia *</span>
                  <span className="text-[11px] text-slate-400">Square or transparent PNG</span>
                </label>

                {/* Current Logo Preview */}
                <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="w-16 h-16 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                    {formData.logo ? (
                      <img
                        src={formData.logo}
                        alt="Logo Preview"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <Trophy className="w-8 h-8 text-slate-300" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1 min-w-0">
                    <input
                      type="text"
                      value={formData.logo}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, logo: e.target.value }))
                      }
                      placeholder="Paste image URL..."
                      className="w-full px-3 py-1.5 text-xs rounded-lg bg-white border border-slate-200 text-slate-700 focus:border-[#E51F3E]"
                    />
                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-[11px] font-semibold transition">
                        <Upload className="w-3 h-3" />
                        <span>{uploadingLogo ? 'Uploading...' : 'Upload File'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleLogoFileUpload}
                          disabled={uploadingLogo}
                        />
                      </label>
                      <span className="text-[10px] text-slate-400">Max 5MB (PNG, JPG, WebP)</span>
                    </div>
                  </div>
                </div>

                {/* Preset suggestions */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10.5px] text-slate-400 font-semibold">Presets:</span>
                  {LOGO_PRESETS.map((p, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, logo: p.url }))}
                      className="text-[10.5px] px-2 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Short Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                  <span>Short Summary Citation *</span>
                  <span className="text-[11px] text-slate-400">1-2 sentences for card previews</span>
                </label>
                <textarea
                  rows={2}
                  value={formData.shortDescription}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, shortDescription: e.target.value }))
                  }
                  placeholder="Conferred for exemplary standards in multi-tier doctor verification and trusted matchmaking."
                  className={`w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-50 border ${
                    formErrors.shortDescription ? 'border-rose-500' : 'border-slate-200'
                  }`}
                />
              </div>

              {/* Full Description / Citation */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                  <span>Full Citation & Background Details</span>
                  <span className="text-[11px] text-slate-400">Displayed on dedicated details page</span>
                </label>
                <textarea
                  rows={4}
                  value={formData.fullDescription}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, fullDescription: e.target.value }))
                  }
                  placeholder="Detailed explanation of the award criteria, committee review findings, ceremony details, and impact."
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-50 border border-slate-200"
                />
              </div>

              {/* Official Website URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Official Organization Website URL
                </label>
                <input
                  type="url"
                  value={formData.websiteUrl}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, websiteUrl: e.target.value }))
                  }
                  placeholder="https://example-conclave.org/awards/2025"
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-50 border border-slate-200"
                />
              </div>

              {/* Gallery Images */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                  <span>Ceremony / Trophy Gallery Images</span>
                  <span className="text-[11px] text-slate-400">
                    {formData.galleryImages.length} images added
                  </span>
                </label>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={galleryUrlInput}
                    onChange={(e) => setGalleryUrlInput(e.target.value)}
                    placeholder="Paste image URL to add to gallery..."
                    className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddGalleryUrl();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddGalleryUrl}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                  >
                    Add URL
                  </button>
                  <label className="cursor-pointer px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold inline-flex items-center gap-1">
                    <Upload className="w-3 h-3" />
                    <span>{uploadingGallery ? 'Uploading...' : 'Upload'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleGalleryFileUpload}
                      disabled={uploadingGallery}
                    />
                  </label>
                </div>

                {/* Gallery Preview Thumbnails */}
                {formData.galleryImages.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 pt-2">
                    {formData.galleryImages.map((imgUrl, idx) => (
                      <div
                        key={idx}
                        className="relative aspect-video rounded-xl bg-slate-100 border border-slate-200 overflow-hidden group"
                      >
                        <img
                          src={imgUrl}
                          alt="Gallery item"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveGalleryImage(idx)}
                          className="absolute top-1 right-1 p-1 rounded-full bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition shadow"
                          title="Remove image"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Toggles: Active & Featured */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, isActive: e.target.checked }))
                    }
                    className="w-4 h-4 rounded text-[#E51F3E] focus:ring-[#E51F3E]"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-800">Publicly Active</div>
                    <div className="text-[10.5px] text-slate-400">
                      Visible on public awards directory
                    </div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-xl bg-amber-50/60 border border-amber-200 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.isFeatured}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, isFeatured: e.target.checked }))
                    }
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-amber-900 flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                      <span>Feature on Homepage</span>
                    </div>
                    <div className="text-[10.5px] text-amber-700">
                      Showcase in Homepage Awards section
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 sm:p-6 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3 sticky bottom-0">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAward}
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-2 rounded-xl bg-gradient-to-r from-[#E51F3E] to-[#F03554] text-white text-xs font-bold hover:shadow-md hover:shadow-red-950/20 transition disabled:opacity-50 active:scale-95"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>{editingAward ? 'Update Award' : 'Create Award'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── DELETE CONFIRMATION MODAL ─── */}
      {deleteModal.open && deleteModal.award && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
          <div
            className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-serif text-lg font-bold text-slate-900">
                Delete Award Recognition?
              </h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to delete{' '}
                <strong className="text-slate-800">"{deleteModal.award.name}"</strong>? This will
                safely archive the award and remove it from the homepage and public awards page.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModal({ open: false, award: null })}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {deleting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
