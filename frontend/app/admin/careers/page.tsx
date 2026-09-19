'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Briefcase,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Edit,
  Trash2,
  Eye,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
  Building2,
  MapPin,
  Users,
  ExternalLink,
  ChevronDown,
  X,
  FileText,
  Mail,
  Phone,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  ShieldAlert,
  Archive,
  Check,
  MoreVertical,
} from 'lucide-react';
import {
  JobOpening,
  JobApplication,
  CareerSummaryStats,
  JobStatus,
  ApplicationStatus,
  fetchAdminCareers,
  createAdminCareer,
  updateAdminCareer,
  updateAdminCareerStatus,
  toggleAdminCareerPublish,
  deleteAdminCareer,
  fetchJobApplications,
  updateApplicationStatus,
} from '../../../services/careerApi';

const WORK_MODES = ['On-site', 'Hybrid', 'Remote'] as const;
const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Internship', 'Contract'] as const;
const STATUS_OPTIONS: JobStatus[] = ['OPEN', 'DRAFT', 'CLOSED', 'ARCHIVED'];

const INITIAL_FORM_STATE = {
  title: '',
  slug: '',
  department: '',
  location: '',
  workMode: 'On-site' as (typeof WORK_MODES)[number],
  employmentType: 'Full-time' as (typeof EMPLOYMENT_TYPES)[number],
  experience: '',
  salaryRange: '',
  shortDescription: '',
  fullDescription: '',
  responsibilities: [''],
  requirements: [''],
  qualifications: [''],
  skills: [''],
  benefits: [''],
  applicationEmail: 'careers@wonderfuljodi.com',
  applicationUrl: '',
  applicationDeadline: '',
  status: 'OPEN' as JobStatus,
  isPublished: true,
  displayOrder: 0,
};

export default function AdminCareersPage() {
  const [jobs, setJobs] = useState<JobOpening[]>([]);
  const [stats, setStats] = useState<CareerSummaryStats>({
    total: 0,
    published: 0,
    draft: 0,
    open: 0,
    closed: 0,
    archived: 0,
  });
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [workModeFilter, setWorkModeFilter] = useState('ALL');

  // Add / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Delete Confirmation Dialog
  const [deletingJob, setDeletingJob] = useState<JobOpening | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Applications Drawer
  const [viewingApplicantsJob, setViewingApplicantsJob] = useState<JobOpening | null>(null);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ type, message });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const res = await fetchAdminCareers({
        status: statusFilter,
        department: departmentFilter,
        workMode: workModeFilter,
        search: search.trim() || undefined,
      });

      if (res.success) {
        setJobs(res.data || []);
        if (res.stats) setStats(res.stats);
        if (res.departments) setDepartments(res.departments);
      }
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to load job openings.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, departmentFilter, workModeFilter, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingJobId(null);
    setFormData(INITIAL_FORM_STATE);
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (job: JobOpening) => {
    setEditingJobId(job._id);
    setFormData({
      title: job.title || '',
      slug: job.slug || '',
      department: job.department || '',
      location: job.location || '',
      workMode: job.workMode || 'On-site',
      employmentType: job.employmentType || 'Full-time',
      experience: job.experience || '',
      salaryRange: job.salaryRange || '',
      shortDescription: job.shortDescription || '',
      fullDescription: job.fullDescription || '',
      responsibilities: job.responsibilities && job.responsibilities.length > 0 ? job.responsibilities : [''],
      requirements: job.requirements && job.requirements.length > 0 ? job.requirements : [''],
      qualifications: job.qualifications && job.qualifications.length > 0 ? job.qualifications : [''],
      skills: job.skills && job.skills.length > 0 ? job.skills : [''],
      benefits: job.benefits && job.benefits.length > 0 ? job.benefits : [''],
      applicationEmail: job.applicationEmail || 'careers@wonderfuljodi.com',
      applicationUrl: job.applicationUrl || '',
      applicationDeadline: job.applicationDeadline ? job.applicationDeadline.split('T')[0] : '',
      status: job.status || 'OPEN',
      isPublished: job.isPublished ?? true,
      displayOrder: job.displayOrder || 0,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Form Field Validation
  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.title.trim()) errors.title = 'Job title is required';
    if (!formData.department.trim()) errors.department = 'Department is required';
    if (!formData.location.trim()) errors.location = 'Location is required';
    if (!formData.shortDescription.trim()) errors.shortDescription = 'Short description is required';
    if (!formData.fullDescription.trim()) errors.fullDescription = 'Full description is required';

    if (formData.applicationEmail && !/^\S+@\S+\.\S+$/.test(formData.applicationEmail.trim())) {
      errors.applicationEmail = 'Invalid email address';
    }
    if (formData.applicationUrl && !/^https?:\/\/.+/.test(formData.applicationUrl.trim())) {
      errors.applicationUrl = 'URL must begin with http:// or https://';
    }
    if (formData.applicationDeadline) {
      const deadlineDate = new Date(formData.applicationDeadline);
      if (isNaN(deadlineDate.getTime())) {
        errors.applicationDeadline = 'Invalid deadline date';
      } else if (formData.isPublished && deadlineDate.getTime() < Date.now() - 24 * 60 * 60 * 1000) {
        errors.applicationDeadline = 'Deadline cannot be in the past for published openings';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save Form
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setSaving(true);
      const cleanArray = (arr: string[]) => arr.map((item) => item.trim()).filter(Boolean);

      const payload = {
        ...formData,
        responsibilities: cleanArray(formData.responsibilities),
        requirements: cleanArray(formData.requirements),
        qualifications: cleanArray(formData.qualifications),
        skills: cleanArray(formData.skills),
        benefits: cleanArray(formData.benefits),
        applicationDeadline: formData.applicationDeadline || null,
      };

      if (editingJobId) {
        await updateAdminCareer(editingJobId, payload);
        showToast('Job opening updated successfully');
      } else {
        await createAdminCareer(payload);
        showToast('Job opening created successfully');
      }

      setIsModalOpen(false);
      loadData(true);
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to save job opening.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Quick Action: Publish Toggle
  const handleTogglePublish = async (job: JobOpening) => {
    try {
      const updated = await toggleAdminCareerPublish(job._id, !job.isPublished);
      if (updated.success) {
        showToast(`Job opening ${!job.isPublished ? 'published' : 'unpublished'} successfully`);
        setJobs((prev) =>
          prev.map((item) => (item._id === job._id ? { ...item, isPublished: !item.isPublished } : item))
        );
        loadData(true);
      }
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to update publishing state.', 'error');
    }
  };

  // Quick Action: Status Change
  const handleStatusChange = async (job: JobOpening, newStatus: JobStatus) => {
    try {
      const res = await updateAdminCareerStatus(job._id, newStatus);
      if (res.success) {
        showToast(`Status updated to ${newStatus}`);
        setJobs((prev) =>
          prev.map((item) => (item._id === job._id ? { ...item, status: newStatus } : item))
        );
        loadData(true);
      }
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to change status.', 'error');
    }
  };

  // Soft Delete Action
  const handleConfirmDelete = async () => {
    if (!deletingJob) return;
    try {
      setDeleteLoading(true);
      await deleteAdminCareer(deletingJob._id);
      showToast(`Job opening "${deletingJob.title}" removed successfully.`);
      setDeletingJob(null);
      loadData(true);
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to delete job opening.', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  // View Applications
  const handleViewApplications = async (job: JobOpening) => {
    setViewingApplicantsJob(job);
    setApplications([]);
    try {
      setLoadingApps(true);
      const res = await fetchJobApplications(job._id);
      if (res.success) {
        setApplications(res.data || []);
      }
    } catch (err: any) {
      showToast('Failed to load applications for this position.', 'error');
    } finally {
      setLoadingApps(false);
    }
  };

  const handleUpdateApplicantStatus = async (appId: string, newStatus: ApplicationStatus) => {
    try {
      const res = await updateApplicationStatus(appId, newStatus);
      if (res.success) {
        showToast(`Applicant status changed to ${newStatus}`);
        setApplications((prev) =>
          prev.map((a) => (a._id === appId ? { ...a, status: newStatus } : a))
        );
      }
    } catch (err: any) {
      showToast('Failed to update candidate status.', 'error');
    }
  };

  // Array Field Handlers for Form
  const handleArrayChange = (
    field: 'responsibilities' | 'requirements' | 'qualifications' | 'skills' | 'benefits',
    index: number,
    value: string
  ) => {
    setFormData((prev) => {
      const updated = [...prev[field]];
      updated[index] = value;
      return { ...prev, [field]: updated };
    });
  };

  const handleAddArrayItem = (
    field: 'responsibilities' | 'requirements' | 'qualifications' | 'skills' | 'benefits'
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: [...prev[field], ''],
    }));
  };

  const handleRemoveArrayItem = (
    field: 'responsibilities' | 'requirements' | 'qualifications' | 'skills' | 'benefits',
    index: number
  ) => {
    setFormData((prev) => {
      const updated = prev[field].filter((_, i) => i !== index);
      return { ...prev, [field]: updated.length > 0 ? updated : [''] };
    });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toastMsg && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border text-xs font-semibold animate-slideDown ${
            toastMsg.type === 'success'
              ? 'bg-emerald-950 text-emerald-100 border-emerald-800'
              : 'bg-rose-950 text-rose-100 border-rose-800'
          }`}
        >
          {toastMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{toastMsg.message}</span>
          <button onClick={() => setToastMsg(null)} className="ml-2 text-slate-400 hover:text-white">
            ×
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-[#E51F3E] flex items-center justify-center font-bold ring-1 ring-rose-100 shadow-2xs">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Careers & Job Openings
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Manage doctor platform positions, publishing states, requirements, and candidate applications.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs shadow-2xs transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#E51F3E]' : 'text-slate-500'}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <Link
            href="/careers"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs shadow-2xs transition"
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
            <span>View Public Page</span>
          </Link>

          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#E51F3E] hover:bg-[#CE102F] text-white font-bold text-xs shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Job Opening</span>
          </button>
        </div>
      </div>

      {/* Summary Cards (5 Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Total Openings</span>
            <Briefcase className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-black text-slate-900">{stats.total}</p>
          <p className="text-[11px] text-slate-400">All registered job roles</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-700">
            <span>Published</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
          <p className="text-2xl font-black text-emerald-700">{stats.published}</p>
          <p className="text-[11px] text-emerald-600">Live on public portal</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-amber-700">
            <span>Draft Openings</span>
            <FileText className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-700">{stats.draft}</p>
          <p className="text-[11px] text-amber-600">Hidden from public</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>Closed Openings</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-black text-slate-700">{stats.closed}</p>
          <p className="text-[11px] text-slate-400">Filled or closed positions</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-purple-200/80 shadow-2xs space-y-1 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-xs font-semibold text-purple-700">
            <span>Archived</span>
            <Archive className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-black text-purple-700">{stats.archived}</p>
          <p className="text-[11px] text-purple-600">Stored records</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by title, department, location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#E51F3E]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#E51F3E]"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open Only</option>
            <option value="DRAFT">Draft Only</option>
            <option value="CLOSED">Closed Only</option>
            <option value="ARCHIVED">Archived Only</option>
          </select>

          {/* Department filter */}
          {departments.length > 0 && (
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#E51F3E]"
            >
              <option value="ALL">All Departments</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          )}

          {/* Work mode filter */}
          <select
            value={workModeFilter}
            onChange={(e) => setWorkModeFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#E51F3E]"
          >
            <option value="ALL">All Modes</option>
            <option value="On-site">On-site</option>
            <option value="Hybrid">Hybrid</option>
            <option value="Remote">Remote</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs font-semibold text-slate-500 animate-pulse">
            Loading job openings...
          </div>
        ) : jobs.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Briefcase className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">No job openings found</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No positions match your selected filters. Create a new opening or reset the filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Job Title & Department</th>
                  <th className="py-3 px-4">Location & Mode</th>
                  <th className="py-3 px-4">Type & Exp</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Published</th>
                  <th className="py-3 px-4">Applicants</th>
                  <th className="py-3 px-4">Created / Updated</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal">
                {jobs.map((job) => {
                  const statusColors: Record<JobStatus, string> = {
                    OPEN: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    DRAFT: 'bg-amber-50 text-amber-700 border-amber-200',
                    CLOSED: 'bg-slate-100 text-slate-700 border-slate-200',
                    ARCHIVED: 'bg-purple-50 text-purple-700 border-purple-200',
                  };

                  return (
                    <tr key={job._id} className="hover:bg-slate-50/70 transition">
                      {/* Title & Department */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-xs sm:text-sm">{job.title}</div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                          <span className="text-rose-600 font-semibold">{job.department}</span>
                          <span>•</span>
                          <span className="font-mono text-[10px]">/{job.slug}</span>
                        </div>
                      </td>

                      {/* Location & Mode */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1 text-slate-700 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span>{job.location}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{job.workMode}</div>
                      </td>

                      {/* Type & Exp */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{job.employmentType}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {job.experience || 'Not specified'}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <select
                          value={job.status}
                          onChange={(e) => handleStatusChange(job, e.target.value as JobStatus)}
                          className={`text-[11px] font-bold px-2 py-1 rounded-lg border focus:outline-hidden cursor-pointer ${
                            statusColors[job.status] || 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {STATUS_OPTIONS.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Published State Toggle */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleTogglePublish(job)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition ${
                            job.isPublished
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              job.isPublished ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          ></span>
                          <span>{job.isPublished ? 'Live' : 'Hidden'}</span>
                        </button>
                      </td>

                      {/* Applicants */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleViewApplications(job)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] transition shadow-2xs"
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>{job.applicationsCount ?? 0}</span>
                        </button>
                      </td>

                      {/* Dates */}
                      <td className="py-3.5 px-4 text-[11px] text-slate-500">
                        <div>Created {new Date(job.createdAt).toLocaleDateString('en-IN')}</div>
                        <div className="text-slate-400 text-[10px]">
                          By {job.createdBy || 'Admin'}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/careers/${job.slug}`}
                            target="_blank"
                            title="Preview Public Page"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>

                          <button
                            onClick={() => handleOpenEditModal(job)}
                            title="Edit Opening"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setDeletingJob(job)}
                            title="Delete Opening (Soft Delete)"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── MODAL: ADD / EDIT OPENING ─── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto">
            {/* Close Button */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <form onSubmit={handleSaveForm} className="space-y-6">
              <div>
                <span className="text-[11px] font-bold text-[#E51F3E] tracking-wider uppercase">
                  {editingJobId ? 'Edit Opening' : 'New Career Opening'}
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">
                  {editingJobId ? `Edit: ${formData.title}` : 'Create Job Opening'}
                </h2>
                <p className="text-xs text-slate-500">
                  Fill in the details below. This will populate the public `/careers` and `/careers/:slug` pages.
                </p>
              </div>

              {/* Core Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Job Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. VIP Relationship Manager"
                    className={`w-full px-3 py-2 text-xs sm:text-sm rounded-xl border ${
                      formErrors.title ? 'border-rose-400' : 'border-slate-200'
                    } focus:outline-hidden focus:border-[#E51F3E]`}
                  />
                  {formErrors.title && (
                    <p className="text-[11px] text-rose-500 mt-1">{formErrors.title}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Slug (Auto-generated if empty)
                  </label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="e.g. vip-relationship-manager"
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#E51F3E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Department <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="e.g. Client Services / Engineering"
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#E51F3E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Location <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g. Pune / Mumbai / Bengaluru"
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#E51F3E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Work Mode <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.workMode}
                    onChange={(e) => setFormData({ ...formData, workMode: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:border-[#E51F3E]"
                  >
                    {WORK_MODES.map((mode) => (
                      <option key={mode} value={mode}>
                        {mode}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Employment Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.employmentType}
                    onChange={(e) => setFormData({ ...formData, employmentType: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:border-[#E51F3E]"
                  >
                    {EMPLOYMENT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Experience Requirement
                  </label>
                  <input
                    type="text"
                    value={formData.experience}
                    onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                    placeholder="e.g. 2-5 years"
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#E51F3E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Salary Range (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.salaryRange}
                    onChange={(e) => setFormData({ ...formData, salaryRange: e.target.value })}
                    placeholder="e.g. ₹6,00,000 - ₹9,50,000 P.A."
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#E51F3E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Application Deadline (Optional)
                  </label>
                  <input
                    type="date"
                    value={formData.applicationDeadline}
                    onChange={(e) => setFormData({ ...formData, applicationDeadline: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#E51F3E]"
                  />
                  {formErrors.applicationDeadline && (
                    <p className="text-[11px] text-rose-500 mt-1">{formErrors.applicationDeadline}</p>
                  )}
                </div>
              </div>

              {/* Descriptions */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Short Description (Displayed on card list) <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={formData.shortDescription}
                    onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                    placeholder="Brief 1-2 sentence overview of the role..."
                    className="w-full p-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#E51F3E]"
                  ></textarea>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Description (Displayed on detail page) <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={formData.fullDescription}
                    onChange={(e) => setFormData({ ...formData, fullDescription: e.target.value })}
                    placeholder="Comprehensive description of the position, team, and day-to-day impact..."
                    className="w-full p-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#E51F3E]"
                  ></textarea>
                </div>
              </div>

              {/* Dynamic Arrays: Responsibilities & Requirements */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Responsibilities */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">Key Responsibilities</label>
                    <button
                      type="button"
                      onClick={() => handleAddArrayItem('responsibilities')}
                      className="text-[11px] font-bold text-[#E51F3E] hover:underline"
                    >
                      + Add Item
                    </button>
                  </div>
                  {formData.responsibilities.map((resp, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={resp}
                        onChange={(e) => handleArrayChange('responsibilities', i, e.target.value)}
                        placeholder={`Responsibility ${i + 1}`}
                        className="flex-1 px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#E51F3E]"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveArrayItem('responsibilities', i)}
                        className="text-slate-400 hover:text-rose-500 p-1"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>

                {/* Requirements */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">Requirements</label>
                    <button
                      type="button"
                      onClick={() => handleAddArrayItem('requirements')}
                      className="text-[11px] font-bold text-[#E51F3E] hover:underline"
                    >
                      + Add Item
                    </button>
                  </div>
                  {formData.requirements.map((req, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={req}
                        onChange={(e) => handleArrayChange('requirements', i, e.target.value)}
                        placeholder={`Requirement ${i + 1}`}
                        className="flex-1 px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#E51F3E]"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveArrayItem('requirements', i)}
                        className="text-slate-400 hover:text-rose-500 p-1"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Skills & Benefits */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Skills */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">Skills Tags</label>
                    <button
                      type="button"
                      onClick={() => handleAddArrayItem('skills')}
                      className="text-[11px] font-bold text-[#E51F3E] hover:underline"
                    >
                      + Add Skill
                    </button>
                  </div>
                  {formData.skills.map((skill, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={skill}
                        onChange={(e) => handleArrayChange('skills', i, e.target.value)}
                        placeholder="e.g. Next.js / CRM / Empathy"
                        className="flex-1 px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#E51F3E]"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveArrayItem('skills', i)}
                        className="text-slate-400 hover:text-rose-500 p-1"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>

                {/* Benefits */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">Benefits & Perks</label>
                    <button
                      type="button"
                      onClick={() => handleAddArrayItem('benefits')}
                      className="text-[11px] font-bold text-[#E51F3E] hover:underline"
                    >
                      + Add Perk
                    </button>
                  </div>
                  {formData.benefits.map((benefit, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={benefit}
                        onChange={(e) => handleArrayChange('benefits', i, e.target.value)}
                        placeholder="e.g. Health Insurance / Remote Culture"
                        className="flex-1 px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#E51F3E]"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveArrayItem('benefits', i)}
                        className="text-slate-400 hover:text-rose-500 p-1"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status & Publishing */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as JobStatus })}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-hidden"
                    >
                      {STATUS_OPTIONS.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Display Order</label>
                    <input
                      type="number"
                      value={formData.displayOrder}
                      onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value, 10) || 0 })}
                      className="w-20 px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isPublished}
                      onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                      className="w-4 h-4 rounded text-[#E51F3E] focus:ring-rose-500 border-slate-300"
                    />
                    <span>Publish on Website</span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 rounded-xl bg-[#E51F3E] hover:bg-[#CE102F] text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{editingJobId ? 'Update Opening' : 'Create Opening'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: DELETE CONFIRMATION ─── */}
      {deletingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-slate-900">Soft-Delete Job Opening</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Are you sure you want to remove <strong>"{deletingJob.title}"</strong>? This will soft-delete the
                record, removing it from the public careers page while preserving historical applications and audit
                logs.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingJob(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteLoading}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition disabled:opacity-50"
              >
                {deleteLoading ? 'Removing...' : 'Confirm Soft Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: CANDIDATE APPLICATIONS ─── */}
      {viewingApplicantsJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto space-y-4">
            <button
              onClick={() => setViewingApplicantsJob(null)}
              className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-[11px] font-bold text-[#E51F3E] uppercase tracking-wider">
                Candidate Pipeline
              </span>
              <h3 className="text-xl font-bold text-slate-900 mt-0.5">
                Applicants: {viewingApplicantsJob.title}
              </h3>
              <p className="text-xs text-slate-500">
                {viewingApplicantsJob.department} • Total Candidates: {applications.length}
              </p>
            </div>

            {loadingApps ? (
              <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
                Loading applicant records...
              </div>
            ) : applications.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No candidates have applied for this position yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Candidate</th>
                      <th className="py-2.5 px-3">Contact</th>
                      <th className="py-2.5 px-3">Experience</th>
                      <th className="py-2.5 px-3">Resume</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Applied Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {applications.map((app) => (
                      <tr key={app._id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">{app.candidateName}</div>
                          {app.coverLetter && (
                            <div className="text-[11px] text-slate-500 line-clamp-1 max-w-xs mt-0.5">
                              "{app.coverLetter}"
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1 text-slate-700 font-medium">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <a href={`mailto:${app.email}`} className="hover:text-[#E51F3E]">
                              {app.email}
                            </a>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{app.mobile}</span>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-slate-700">
                          {app.experienceYears || 'Not provided'}
                        </td>

                        <td className="py-3 px-3">
                          {app.resumeUrl ? (
                            <a
                              href={app.resumeUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-semibold"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>View Resume</span>
                            </a>
                          ) : (
                            <span className="text-slate-400">None attached</span>
                          )}
                        </td>

                        <td className="py-3 px-3">
                          <select
                            value={app.status}
                            onChange={(e) =>
                              handleUpdateApplicantStatus(app._id, e.target.value as ApplicationStatus)
                            }
                            className="px-2 py-1 text-[11px] font-bold rounded-lg border border-slate-200 bg-white focus:outline-hidden"
                          >
                            <option value="RECEIVED">RECEIVED</option>
                            <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                            <option value="SHORTLISTED">SHORTLISTED</option>
                            <option value="REJECTED">REJECTED</option>
                            <option value="HIRED">HIRED</option>
                          </select>
                        </td>

                        <td className="py-3 px-3 text-[11px] text-slate-500">
                          {new Date(app.createdAt).toLocaleDateString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
