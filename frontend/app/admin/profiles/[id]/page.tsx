'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  User,
  Shield,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  FileText,
  FileCheck,
  CreditCard,
  Flag,
  Activity,
  Heart,
  Briefcase,
  GraduationCap,
  Award,
  Users,
  Home,
  MapPin,
  Calendar,
  Phone,
  Mail,
  Lock,
  Unlock,
  Trash2,
  Edit2,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  MessageSquare,
  Plus,
  Send,
  AlertCircle,
  Copy,
  Check,
  Sparkles,
  Info,
  Maximize2,
  X,
  Compass,
  BookOpen,
} from 'lucide-react';
import {
  fetchProfileById,
  addAdminProfileNote,
  updateAdminProfileStatus,
  suspendAdminProfile,
  blockAdminProfile,
  deleteAdminProfile,
  approveAdminVerification,
  rejectAdminVerification,
  resolveAdminReport,
  dismissAdminReport,
  updateAdminProfile,
  AdminProfileCompleteData,
  AdminNoteItem,
  AdminVerificationRecord,
  AdminReportRecord,
  AdminPaymentRecord,
} from '../../../../services/profileApi';
import { AdminEditProfileModal } from '../../../../components/admin/AdminEditProfileModal';

type TabKey =
  | 'overview'
  | 'personal'
  | 'professional'
  | 'family'
  | 'photos'
  | 'verification'
  | 'membership'
  | 'reports'
  | 'activity';

const REJECTION_REASONS = [
  'Document copy unclear or blurry',
  'Document expired or validity lapsed',
  'Name mismatch with matrimonial doctor profile',
  'Incomplete document or missing reverse side',
  'Incorrect document category submitted',
  'Official medical council seal / signature not visible',
  'Other (see custom note below)',
];

function AdminProfileDetailsContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const profileId = (params?.id as string) || '';

  const initialTab = (searchParams?.get('tab') as TabKey) || 'overview';
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AdminProfileCompleteData | null>(null);

  // Modals & Forms State
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);
  const [lightboxDoc, setLightboxDoc] = useState<{ url: string; title: string; type: string } | null>(null);

  // Admin Note Input
  const [newNote, setNewNote] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);

  // Status Change Modal
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedNewStatus, setSelectedNewStatus] = useState<string>('Active');
  const [statusReason, setStatusReason] = useState('');
  const [statusSubmitting, setStatusSubmitting] = useState(false);

  // Delete Profile Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Verification Review Modal
  const [verifModalOpen, setVerifModalOpen] = useState(false);
  const [selectedVerifDoc, setSelectedVerifDoc] = useState<AdminVerificationRecord | null>(null);
  const [verifActionType, setVerifActionType] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [verifNotes, setVerifNotes] = useState('');
  const [verifRejectReason, setVerifRejectReason] = useState(REJECTION_REASONS[0]);
  const [verifCustomReject, setVerifCustomReject] = useState('');
  const [verifSubmitting, setVerifSubmitting] = useState(false);

  // Report Action Modal
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<AdminReportRecord | null>(null);
  const [reportActionType, setReportActionType] = useState<'RESOLVE' | 'DISMISS'>('RESOLVE');
  const [reportResolutionNotes, setReportResolutionNotes] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);

  // Edit Profile Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editSection, setEditSection] = useState<
    'basic' | 'personal' | 'professional' | 'family' | 'lifestyle' | 'preferences' | 'status'
  >('basic');
  const [editForm, setEditForm] = useState<Record<string, any>>({});

  // Global Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const loadProfile = useCallback(async () => {
    if (!profileId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchProfileById(profileId);
      setData(res);
    } catch (err: any) {
      console.error('Failed to load complete admin profile:', err);
      setError(err?.response?.data?.message || 'Failed to load profile details.');
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    const tabParam = searchParams?.get('tab') as TabKey;
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Handler: Add Internal Note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !profileId) return;
    setSubmittingNote(true);
    try {
      const updatedNotes = await addAdminProfileNote(profileId, newNote.trim());
      setData((prev) => (prev ? { ...prev, adminNotes: updatedNotes } : prev));
      setNewNote('');
      showToast('Internal admin note saved successfully.');
    } catch (err: any) {
      console.error('Error adding admin note:', err);
      showToast(err?.response?.data?.message || 'Failed to save admin note.', 'error');
    } finally {
      setSubmittingNote(false);
    }
  };

  // Handler: Update Account / Profile Status
  const handleConfirmStatusChange = async () => {
    if (!profileId) return;
    setStatusSubmitting(true);
    try {
      if (selectedNewStatus === 'Suspended') {
        await suspendAdminProfile(profileId, statusReason || 'Suspended by administration');
      } else if (selectedNewStatus === 'Blocked') {
        await blockAdminProfile(profileId, statusReason || 'Blocked by administration');
      } else {
        await updateAdminProfileStatus(profileId, {
          status: selectedNewStatus,
          reason: statusReason,
          notes: statusReason,
        });
      }
      showToast(`Profile status updated to "${selectedNewStatus}" successfully.`);
      setStatusModalOpen(false);
      setStatusReason('');
      await loadProfile();
    } catch (err: any) {
      console.error('Error updating profile status:', err);
      showToast(err?.response?.data?.message || 'Failed to update profile status.', 'error');
    } finally {
      setStatusSubmitting(false);
    }
  };

  // Handler: Delete Profile
  const handleConfirmDelete = async () => {
    if (!profileId) return;
    if (!deleteReason.trim()) {
      alert('A deletion reason is required.');
      return;
    }
    setDeleteSubmitting(true);
    try {
      await deleteAdminProfile(profileId, deleteReason.trim());
      showToast('Profile marked as deleted successfully.');
      setDeleteModalOpen(false);
      await loadProfile();
    } catch (err: any) {
      console.error('Error deleting profile:', err);
      showToast(err?.response?.data?.message || 'Failed to delete profile.', 'error');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // Handler: Open Edit Modal & Populate Form
  const handleOpenEditModal = () => {
    if (!data) return;
    const userAcc = data.user || data.profile?.user;
    setEditForm({
      // Personal
      dob: data.dob ? new Date(data.dob).toISOString().slice(0, 10) : '',
      gender: data.gender || 'Male',
      maritalStatus: data.maritalStatus || 'Never Married',
      height: data.height || '',
      weight: data.weight || '',
      religion: data.religion || 'Hindu',
      caste: data.caste || '',
      subCaste: data.subCaste || '',
      motherTongue: data.motherTongue || '',
      city: data.city || '',
      state: data.state || '',
      country: data.country || 'India',

      // Professional
      education: data.education || '',
      degree: data.degree || '',
      profession: data.profession || '',
      specialization: data.additionalQualification || '',
      company: data.company || '',
      workLocation: data.workLocation || '',
      workType: data.workType || '',
      annualIncome: data.annualIncome || '',
      medicalRegistrationNumber: data.medicalRegistrationNumber || '',
      medicalCouncil: data.medicalCouncil || '',
      medicalCollege: data.medicalCollege || '',
      currentHospital: data.currentHospital || '',

      // Family
      familyType: data.familyType || 'Nuclear',
      familyStatus: data.familyStatus || 'Upper Middle Class',
      familyValues: data.familyValues || 'Moderate',
      fatherOccupation: data.fatherOccupation || '',
      motherOccupation: data.motherOccupation || '',
      siblings: data.siblings || '',
      nativePlace: data.nativePlace || '',
      familyLocation: data.familyLocation || '',

      // Lifestyle & Bio
      about: data.about || '',
      foodPreference: data.foodPreference || (data as any).lifestyleInterests?.diet || 'Vegetarian',
      smoking: data.smoking || (data as any).lifestyleInterests?.smoking || 'No',
      drinking: data.drinking || (data as any).lifestyleInterests?.alcohol || 'No',

      // Preferences
      preferredAgeMin: data.partnerPreferences?.preferredAgeMin || '',
      preferredAgeMax: data.partnerPreferences?.preferredAgeMax || '',
      preferredLocation: data.partnerPreferences?.preferredLocation || '',
      preferredQualification: data.partnerPreferences?.preferredQualification || '',
      preferredMaritalStatus: data.partnerPreferences?.preferredMaritalStatus || '',
      otherPreferences: data.partnerPreferences?.otherPreferences || '',

      // Account & Status
      status: effectiveStatus || 'Active',
      accountStatus: userAcc?.status || 'Active',
      verificationStatus: effectiveVerificationStatus || 'UNVERIFIED',
    });
    setEditSection('basic');
    setEditModalOpen(true);
  };

  // Handler: Save Profile Edits
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileId) return;
    setEditSubmitting(true);
    try {
      const payload: Record<string, any> = {
        dob: editForm.dob,
        gender: editForm.gender,
        maritalStatus: editForm.maritalStatus,
        height: editForm.height,
        weight: editForm.weight,
        religion: editForm.religion,
        caste: editForm.caste,
        subCaste: editForm.subCaste,
        motherTongue: editForm.motherTongue,
        city: editForm.city,
        state: editForm.state,
        country: editForm.country,

        education: editForm.education,
        degree: editForm.degree,
        profession: editForm.profession,
        additionalQualification: editForm.specialization,
        company: editForm.company,
        workLocation: editForm.workLocation,
        workType: editForm.workType,
        annualIncome: editForm.annualIncome,
        medicalRegistrationNumber: editForm.medicalRegistrationNumber,
        medicalCouncil: editForm.medicalCouncil,
        medicalCollege: editForm.medicalCollege,
        currentHospital: editForm.currentHospital,

        familyType: editForm.familyType,
        familyStatus: editForm.familyStatus,
        familyValues: editForm.familyValues,
        fatherOccupation: editForm.fatherOccupation,
        motherOccupation: editForm.motherOccupation,
        siblings: editForm.siblings,
        nativePlace: editForm.nativePlace,
        familyLocation: editForm.familyLocation,

        about: editForm.about,
        foodPreference: editForm.foodPreference,
        smoking: editForm.smoking,
        drinking: editForm.drinking,
        lifestyleInterests: {
          diet: editForm.foodPreference,
          smoking: editForm.smoking,
          alcohol: editForm.drinking,
        },

        partnerPreferences: {
          preferredAgeMin: editForm.preferredAgeMin ? Number(editForm.preferredAgeMin) : undefined,
          preferredAgeMax: editForm.preferredAgeMax ? Number(editForm.preferredAgeMax) : undefined,
          preferredLocation: editForm.preferredLocation,
          preferredQualification: editForm.preferredQualification,
          preferredMaritalStatus: editForm.preferredMaritalStatus,
          otherPreferences: editForm.otherPreferences,
        },

        status: editForm.status,
        accountStatus: editForm.accountStatus,
        verificationStatus: editForm.verificationStatus,
      };

      // Strict security: ensure protected fields are never sent
      delete payload.name;
      delete payload.fullName;
      delete payload.firstName;
      delete payload.lastName;
      delete payload.email;
      delete payload.phone;
      delete payload.mobile;
      delete payload.mobileNumber;
      delete payload.displayName;

      const res = await updateAdminProfile(profileId, payload);
      showToast(res.message || 'Profile updated successfully.');
      setEditModalOpen(false);
      await loadProfile();
    } catch (err: any) {
      console.error('Error updating profile:', err);
      showToast(err?.response?.data?.message || 'Failed to update profile.', 'error');
    } finally {
      setEditSubmitting(false);
    }
  };

  // Handler: Verification Document Approval / Rejection
  const handleConfirmVerificationDecision = async () => {
    if (!selectedVerifDoc) return;
    setVerifSubmitting(true);
    try {
      if (verifActionType === 'APPROVE') {
        await approveAdminVerification(selectedVerifDoc._id, verifNotes);
        showToast(`Document "${selectedVerifDoc.documentName}" approved successfully.`);
      } else {
        const finalReason =
          verifRejectReason === 'Other (see custom note below)'
            ? verifCustomReject
            : `${verifRejectReason}${verifCustomReject ? ` — ${verifCustomReject}` : ''}`;
        await rejectAdminVerification(selectedVerifDoc._id, finalReason, verifNotes);
        showToast(`Document "${selectedVerifDoc.documentName}" rejected.`);
      }
      setVerifModalOpen(false);
      setSelectedVerifDoc(null);
      await loadProfile();
    } catch (err: any) {
      console.error('Error reviewing verification document:', err);
      showToast(err?.response?.data?.message || 'Failed to update verification status.', 'error');
    } finally {
      setVerifSubmitting(false);
    }
  };

  // Handler: Report Resolution
  const handleConfirmReportAction = async () => {
    if (!selectedReport) return;
    setReportSubmitting(true);
    try {
      if (reportActionType === 'RESOLVE') {
        await resolveAdminReport(selectedReport._id, reportResolutionNotes);
        showToast('Report marked as Resolved.');
      } else {
        await dismissAdminReport(selectedReport._id, reportResolutionNotes);
        showToast('Report dismissed as unfounded.');
      }
      setReportModalOpen(false);
      setSelectedReport(null);
      await loadProfile();
    } catch (err: any) {
      console.error('Error taking action on report:', err);
      showToast(err?.response?.data?.message || 'Failed to update report status.', 'error');
    } finally {
      setReportSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <RefreshCw className="w-10 h-10 animate-spin text-[#E51F3E] mb-3" />
        <p className="text-sm font-semibold text-slate-700">Loading Secure Admin Profile Details...</p>
        <p className="text-xs text-slate-400 mt-1">Aggregating matrimonial profile, KYC scans, and safety records</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center max-w-xl mx-auto my-12 shadow-xs">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900 mb-1">Profile Preview Unavailable</h2>
        <p className="text-sm text-slate-600 mb-6">{error || 'The requested profile or candidate could not be found.'}</p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={loadProfile}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 transition"
          >
            Retry
          </button>
          <Link
            href="/admin/profiles"
            className="px-4 py-2 bg-[#E51F3E] hover:bg-[#CC1432] rounded-xl text-xs font-bold text-white transition shadow-xs"
          >
            Back to Profiles Directory
          </Link>
        </div>
      </div>
    );
  }

  const user = data.user;
  const reportsCount = data.reports?.length || 0;
  const pendingReportsCount = data.reports?.filter((r) => r.status === 'PENDING' || r.status === 'UNDER_REVIEW').length || 0;
  const verificationsList = data.verifications || [];
  const pendingDocsCount = verificationsList.filter((v) => v.status === 'PENDING').length;
  const currentPlan = data.subscription?.plan || 'Standard Free';
  const effectiveStatus = (data.status || user?.status || 'Active') as string;
  const effectiveVerificationStatus = (data.verificationStatus || user?.verificationStatus || 'UNVERIFIED') as string;

  // Render Status Badge
  const renderStatusBadge = (status: string) => {
    const s = (status || 'Active').toLowerCase();
    if (s === 'active') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Active Account
        </span>
      );
    }
    if (s === 'under review') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <Clock className="w-3.5 h-3.5" />
          Under Review
        </span>
      );
    }
    if (s === 'suspended') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <AlertTriangle className="w-3.5 h-3.5" />
          Suspended
        </span>
      );
    }
    if (s === 'blocked') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
          <Lock className="w-3.5 h-3.5" />
          Blocked
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
        <Trash2 className="w-3.5 h-3.5" />
        Deleted
      </span>
    );
  };

  // Render KYC Badge
  const renderKycBadge = (status: string) => {
    const s = (status || 'UNVERIFIED').toUpperCase();
    if (s === 'VERIFIED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          KYC Verified
        </span>
      );
    }
    if (s === 'PENDING') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
          <Clock className="w-3.5 h-3.5 text-amber-600" />
          Verification Pending
        </span>
      );
    }
    if (s === 'REJECTED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
          <XCircle className="w-3.5 h-3.5 text-rose-600" />
          KYC Rejected
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
        <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
        Unverified
      </span>
    );
  };

  return (
    <div className="space-y-5 pb-16">
      {/* ── TOAST NOTIFICATION ── */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold transition animate-slide-in ${
            toast.type === 'success'
              ? 'bg-emerald-900 text-white border-emerald-700'
              : 'bg-rose-900 text-white border-rose-700'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-300" /> : <AlertCircle className="w-4 h-4 text-rose-300" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* ── BREADCRUMBS & NAVIGATION ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-500 font-medium">
          <Link href="/admin/dashboard" className="hover:text-slate-900 transition">
            Admin Console
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <Link href="/admin/profiles" className="hover:text-slate-900 transition">
            Profiles Directory
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-bold text-slate-800 truncate max-w-[200px]">
            {data.displayName || user?.fullName || 'Profile Preview'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadProfile}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Refresh</span>
          </button>
          <Link
            href="/admin/profiles"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Back to Profiles</span>
          </Link>
        </div>
      </div>

      {/* ── PROMINENT SAFETY ALERT BANNER (If Reports Exist) ── */}
      {reportsCount > 0 && (
        <div className="bg-gradient-to-r from-rose-50 via-red-50 to-orange-50 border-2 border-rose-300/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-rose-900 text-sm sm:text-base tracking-tight">
                  Safety Investigation Required: {reportsCount} Report{reportsCount > 1 ? 's' : ''} on File
                </h3>
                {pendingReportsCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white">
                    {pendingReportsCount} Pending Action
                  </span>
                )}
              </div>
              <p className="text-xs text-rose-800/90 mt-0.5">
                Complaints have been lodged against this profile. Please review the reported reasons, examine verification documents, and determine whether moderation actions are warranted.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('reports')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs hover:shadow transition shrink-0 self-stretch sm:self-auto justify-center cursor-pointer"
          >
            <Flag className="w-3.5 h-3.5" />
            <span>Investigate Reports</span>
          </button>
        </div>
      )}

      {/* ── HEADER CARD: PROFILE SNAPSHOT & ADMIN ACTIONS ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Left: Avatar & Identity */}
          <div className="flex items-start sm:items-center gap-4 sm:gap-5 w-full lg:w-auto">
            <div className="relative group shrink-0">
              {data.primaryPhoto || (data.photos && data.photos[0]) ? (
                <img
                  src={data.primaryPhoto || data.photos?.[0] || ''}
                  alt={data.displayName || 'Doctor Profile'}
                  onClick={() => setLightboxPhoto(data.primaryPhoto || data.photos?.[0] || null)}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-slate-200 shadow-xs cursor-pointer group-hover:opacity-90 transition"
                />
              ) : (
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white flex items-center justify-center text-3xl font-black shadow-xs">
                  {(data.displayName || user?.fullName || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              {(data.primaryPhoto || (data.photos && data.photos[0])) && (
                <button
                  type="button"
                  onClick={() => setLightboxPhoto(data.primaryPhoto || data.photos?.[0] || null)}
                  className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded-lg bg-slate-900/80 hover:bg-slate-900 text-white flex items-center justify-center transition cursor-pointer"
                  title="Enlarge Photo"
                >
                  <Maximize2 className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="space-y-1.5 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {data.displayName || user?.fullName || 'Doctor Candidate'}
                </h1>
                {renderStatusBadge(effectiveStatus)}
                {renderKycBadge(effectiveVerificationStatus)}
              </div>

              <p className="text-xs font-semibold text-slate-600 flex flex-wrap items-center gap-2">
                <span>{data.profession || 'Doctor'}</span>
                <span>•</span>
                <span>{data.education || data.degree || 'Medical Professional'}</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-slate-500">
                  <MapPin className="w-3 h-3 text-[#E51F3E]" />
                  {data.city ? `${data.city}, ${data.state || data.country}` : 'Location Unspecified'}
                </span>
              </p>

              {/* ID Badges with Copy Button */}
              <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px]">
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-mono font-medium">
                  <span className="text-slate-400 font-sans font-bold">Profile ID:</span>
                  <span>{String(data._id || profileId).slice(-8)}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(String(data._id || profileId), 'profileId')}
                    className="hover:text-slate-950 transition ml-0.5 cursor-pointer"
                    title="Copy Profile ID"
                  >
                    {copiedField === 'profileId' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-400" />}
                  </button>
                </div>

                {user?._id && (
                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-mono font-medium">
                    <span className="text-slate-400 font-sans font-bold">User ID:</span>
                    <span>{String(user._id).slice(-8)}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(String(user._id), 'userId')}
                      className="hover:text-slate-950 transition ml-0.5 cursor-pointer"
                      title="Copy User ID"
                    >
                      {copiedField === 'userId' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-400" />}
                    </button>
                  </div>
                )}

                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-purple-50 text-purple-700 font-bold border border-purple-200">
                  <CreditCard className="w-3 h-3" />
                  <span>Plan: {currentPlan}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Administrative Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-start lg:justify-end border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-100">
            <button
              type="button"
              onClick={handleOpenEditModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-[#E51F3E] hover:from-red-700 hover:to-red-800 text-white text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit Profile</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedNewStatus(effectiveStatus);
                setStatusReason('');
                setStatusModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold transition shadow-2xs cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5 text-slate-600" />
              <span>Change Status</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('activity')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-blue-700 text-xs font-bold transition shadow-2xs cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
              <span>Add Note</span>
            </button>

            {effectiveStatus !== 'Suspended' ? (
              <button
                type="button"
                onClick={() => {
                  setSelectedNewStatus('Suspended');
                  setStatusReason('Administrative safety suspension');
                  setStatusModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold transition shadow-2xs cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>Suspend</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setSelectedNewStatus('Active');
                  setStatusReason('Suspension lifted by administrator');
                  setStatusModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition shadow-2xs cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Reactivate</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setDeleteReason('');
                setDeleteModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-rose-700 text-xs font-bold transition shadow-2xs cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 9 TABS BAR ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-1.5 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {[
            { key: 'overview', label: 'Overview', icon: User },
            { key: 'personal', label: 'Personal Details', icon: Heart },
            { key: 'professional', label: 'Professional Details', icon: Briefcase },
            { key: 'family', label: 'Family Details', icon: Home },
            { key: 'photos', label: `Photos (${data.photos?.length || 0})`, icon: Eye },
            {
              key: 'verification',
              label: `Verification (${verificationsList.length})`,
              icon: FileCheck,
              badge: pendingDocsCount > 0 ? pendingDocsCount : undefined,
            },
            { key: 'membership', label: 'Membership & Billing', icon: CreditCard },
            {
              key: 'reports',
              label: `Reports & Safety (${reportsCount})`,
              icon: Flag,
              badge: pendingReportsCount > 0 ? pendingReportsCount : undefined,
              badgeColor: 'bg-[#E51F3E]',
            },
            {
              key: 'activity',
              label: `Admin Activity (${(data.adminNotes?.length || 0) + (data.auditLogs?.length || 0)})`,
              icon: Activity,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as TabKey)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-black text-white ${
                      tab.badgeColor || 'bg-amber-500'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* ── TAB 1: OVERVIEW ── */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Main Key Highlights (2 Cols) */}
          <div className="lg:col-span-2 space-y-5">
            {/* Essential Matrimonial Highlights */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#E51F3E]" />
                <span>Candidate Profile Highlights</span>
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                  <span className="text-slate-400 font-semibold uppercase text-[10px] block mb-1">Age & Gender</span>
                  <p className="font-bold text-slate-800">
                    {data.age ? `${data.age} Years` : 'Age Unspecified'} • {data.gender}
                  </p>
                </div>

                <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                  <span className="text-slate-400 font-semibold uppercase text-[10px] block mb-1">Marital Status</span>
                  <p className="font-bold text-slate-800">{data.maritalStatus || 'Never Married'}</p>
                </div>

                <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                  <span className="text-slate-400 font-semibold uppercase text-[10px] block mb-1">Height & Weight</span>
                  <p className="font-bold text-slate-800">{data.height} • {data.weight ? `${data.weight} kg` : '—'}</p>
                </div>

                <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                  <span className="text-slate-400 font-semibold uppercase text-[10px] block mb-1">Profession & Role</span>
                  <p className="font-bold text-slate-800">{data.profession || 'Doctor'}</p>
                  <p className="text-[11px] text-slate-500 truncate">{data.currentRole || data.company || '—'}</p>
                </div>

                <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                  <span className="text-slate-400 font-semibold uppercase text-[10px] block mb-1">Education & Degree</span>
                  <p className="font-bold text-slate-800 truncate">{data.education || data.degree}</p>
                  <p className="text-[11px] text-slate-500 truncate">{data.degree}</p>
                </div>

                <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                  <span className="text-slate-400 font-semibold uppercase text-[10px] block mb-1">Annual Income</span>
                  <p className="font-bold text-slate-800">{data.annualIncome || 'Confidential'}</p>
                </div>

                <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                  <span className="text-slate-400 font-semibold uppercase text-[10px] block mb-1">Religion & Community</span>
                  <p className="font-bold text-slate-800">{data.religion} • {data.caste}</p>
                  {data.subCaste && <p className="text-[11px] text-slate-500">Sub-caste: {data.subCaste}</p>}
                </div>

                <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                  <span className="text-slate-400 font-semibold uppercase text-[10px] block mb-1">Mother Tongue</span>
                  <p className="font-bold text-slate-800">{data.motherTongue}</p>
                </div>

                <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                  <span className="text-slate-400 font-semibold uppercase text-[10px] block mb-1">Current Residence</span>
                  <p className="font-bold text-slate-800 truncate">{data.city}, {data.state}</p>
                  <p className="text-[11px] text-slate-500">{data.country}</p>
                </div>
              </div>

              {/* About candidate bio */}
              {data.about && (
                <div className="mt-4 p-3.5 bg-slate-50/50 rounded-xl border border-slate-100 text-xs">
                  <span className="text-slate-400 font-bold uppercase text-[10px] block mb-1">About & Introduction</span>
                  <p className="text-slate-700 leading-relaxed italic">"{data.about}"</p>
                </div>
              )}
            </div>

            {/* Account & Registration Meta Details */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-600" />
                <span>Account & Platform Metadata</span>
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block font-semibold text-[11px]">Registered Date</span>
                  <span className="font-bold text-slate-800">
                    {user?.createdAt
                      ? new Date(user.createdAt).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block font-semibold text-[11px]">Last Active</span>
                  <span className="font-bold text-slate-800">
                    {user?.lastActiveAt || data.lastActiveAt
                      ? new Date(user?.lastActiveAt || data.lastActiveAt!).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Recently Active'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block font-semibold text-[11px]">Profile Managed By</span>
                  <span className="font-bold text-slate-800">{data.profileManagedBy || 'Self'}</span>
                </div>

                <div>
                  <span className="text-slate-400 block font-semibold text-[11px]">Terms of Service</span>
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Accepted {user?.termsVersion ? `(${user.termsVersion})` : ''}</span>
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block font-semibold text-[11px]">Account Status</span>
                  <span className="font-bold text-slate-800">{user?.status || data.status || 'Active'}</span>
                </div>

                <div>
                  <span className="text-slate-400 block font-semibold text-[11px]">User Account Role</span>
                  <span className="font-mono uppercase font-bold text-slate-800">{user?.role || 'USER'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Sensitive Contact & Trust Card (1 Col) */}
          <div className="space-y-5">
            {/* Sensitive Contact Details Card */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-400" />
                  <h3 className="font-bold text-xs uppercase tracking-wider text-amber-300">
                    Private Contact Info
                  </h3>
                </div>
                <span className="text-[10px] bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full font-bold border border-amber-400/30">
                  Admin Eyes Only
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 text-[11px] block">Verified Email Address</span>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="font-semibold text-white truncate max-w-[200px]">
                      {user?.email || 'No email recorded'}
                    </span>
                    {user?.email && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(user.email, 'email')}
                        className="text-slate-400 hover:text-white p-1 cursor-pointer"
                        title="Copy Email"
                      >
                        {copiedField === 'email' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 text-[11px] block">Mobile Phone Number</span>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="font-semibold text-white font-mono">
                      {user?.mobile || 'No mobile recorded'}
                    </span>
                    {user?.mobile && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(user.mobile, 'mobile')}
                        className="text-slate-400 hover:text-white p-1 cursor-pointer"
                        title="Copy Mobile"
                      >
                        {copiedField === 'mobile' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 text-[11px] block">Full Registered Address</span>
                  <p className="font-medium text-slate-200 mt-0.5 leading-snug">
                    {data.currentLocation?.formattedAddress ||
                      `${data.city || '—'}, ${data.state || '—'}, ${data.country || 'India'} ${
                        data.currentLocation?.pincode ? `(PIN: ${data.currentLocation.pincode})` : ''
                      }`}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-700/80 text-[11px] text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>This confidential data is protected and hidden from normal website visitors.</span>
              </div>
            </div>

            {/* Verification Summary Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  <span>KYC Credential Summary</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveTab('verification')}
                  className="text-xs font-bold text-[#E51F3E] hover:underline cursor-pointer"
                >
                  Inspect All
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                  <span className="text-slate-600 font-medium">Overall Status:</span>
                  {renderKycBadge(effectiveVerificationStatus)}
                </div>
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                  <span className="text-slate-600 font-medium">Documents Submitted:</span>
                  <span className="font-bold text-slate-900">{verificationsList.length} Files</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                  <span className="text-slate-600 font-medium">Pending Review:</span>
                  <span className={`font-bold ${pendingDocsCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                    {pendingDocsCount}
                  </span>
                </div>
              </div>
            </div>

            {/* Latest Internal Note Snippet */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-blue-600" />
                  <span>Latest Admin Note</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveTab('activity')}
                  className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                >
                  View Notes
                </button>
              </div>

              {data.adminNotes && data.adminNotes.length > 0 ? (
                <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 text-xs">
                  <p className="text-slate-800 italic">"{data.adminNotes[0].note}"</p>
                  <p className="text-[10px] text-slate-500 mt-2 font-medium">
                    By {data.adminNotes[0].adminName || data.adminNotes[0].adminEmail} •{' '}
                    {new Date(data.adminNotes[0].createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No internal admin notes recorded yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* ── TAB 2: PERSONAL DETAILS ── */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === 'personal' && (
        <div className="space-y-5">
          {/* Personal Identity & Physical Attributes */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b pb-3">
              <Heart className="w-4 h-4 text-[#E51F3E]" />
              <span>Identity & Physical Attributes</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block font-semibold">Exact Date of Birth</span>
                <span className="font-bold text-slate-800">
                  {data.dob ? new Date(data.dob).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Calculated Age</span>
                <span className="font-bold text-slate-800">{data.age || '—'} Years</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Gender</span>
                <span className="font-bold text-slate-800">{data.gender}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Marital Status</span>
                <span className="font-bold text-slate-800">{data.maritalStatus}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Height</span>
                <span className="font-bold text-slate-800">{data.height}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Weight</span>
                <span className="font-bold text-slate-800">{data.weight ? `${data.weight} kg` : 'Not specified'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Body Type / Complexion</span>
                <span className="font-bold text-slate-800">Normal / Wheatish</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Food Preference</span>
                <span className="font-bold text-slate-800">{data.foodPreference || 'Vegetarian'}</span>
              </div>
            </div>
          </div>

          {/* Cultural & Community Hierarchy */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b pb-3">
              <Compass className="w-4 h-4 text-purple-600" />
              <span>Cultural, Community & Linguistic Background</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block font-semibold">Religion</span>
                <span className="font-bold text-slate-800">{data.religion}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Caste</span>
                <span className="font-bold text-slate-800">{data.caste}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Sub-Caste</span>
                <span className="font-bold text-slate-800">{data.subCaste || data.communityDetails?.subCasteText || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Gotra</span>
                <span className="font-bold text-slate-800">{data.gotra || data.horoscope?.gotra || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Mother Tongue</span>
                <span className="font-bold text-slate-800">{data.motherTongue}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Other Languages</span>
                <span className="font-bold text-slate-800">
                  {data.lifestyleInterests?.languages?.join(', ') || 'Hindi, English'}
                </span>
              </div>
            </div>
          </div>

          {/* Location & Native Place */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b pb-3">
              <MapPin className="w-4 h-4 text-rose-600" />
              <span>Residential & Ancestral Location</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-100 space-y-2">
                <span className="font-bold text-slate-900 uppercase text-[11px] block">Current Residence</span>
                <p className="text-slate-800 font-semibold">{data.city}, {data.state}, {data.country}</p>
                <p className="text-slate-500">Pincode: {data.currentLocation?.pincode || '—'}</p>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Full Formatted Address: {data.currentLocation?.formattedAddress || '—'}
                </p>
              </div>

              <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-100 space-y-2">
                <span className="font-bold text-slate-900 uppercase text-[11px] block">Native Place (Ancestral Origin)</span>
                <p className="text-slate-800 font-semibold">{data.nativePlace || data.nativePlaceDetails?.formattedAddress || '—'}</p>
                <p className="text-slate-500">
                  {data.nativePlaceDetails?.city ? `${data.nativePlaceDetails.city}, ${data.nativePlaceDetails.state}` : '—'}
                </p>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  {data.nativePlaceDetails?.description || 'Ancestral hometown origin'}
                </p>
              </div>
            </div>
          </div>

          {/* Horoscope & Astrology Details */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b pb-3">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Horoscope & Kundali Astrology Details</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block font-semibold">Rashi (Moon Sign)</span>
                <span className="font-bold text-slate-800">{data.horoscope?.rashi || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Nakshatra</span>
                <span className="font-bold text-slate-800">{data.horoscope?.nakshatra || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Pada / Charan</span>
                <span className="font-bold text-slate-800">{data.horoscope?.pada || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Lagna (Ascendant)</span>
                <span className="font-bold text-slate-800">{data.horoscope?.lagna || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Manglik Status</span>
                <span className="font-bold text-slate-800">{data.horoscope?.manglik || 'Non-Manglik'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Time of Birth</span>
                <span className="font-bold text-slate-800">{data.horoscope?.timeOfBirth || '—'}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-400 block font-semibold">Place of Birth</span>
                <span className="font-bold text-slate-800">{data.horoscope?.placeOfBirth || '—'}</span>
              </div>
            </div>
          </div>

          {/* Lifestyle & Habits */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b pb-3">
              <Activity className="w-4 h-4 text-emerald-600" />
              <span>Lifestyle Habits & Interests</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block font-semibold">Diet / Food Preference</span>
                <span className="font-bold text-slate-800">{data.foodPreference || data.lifestyleInterests?.diet || 'Vegetarian'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Smoking</span>
                <span className="font-bold text-slate-800">{data.smoking || data.lifestyleInterests?.smoking || 'No'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Alcohol</span>
                <span className="font-bold text-slate-800">{data.drinking || data.lifestyleInterests?.alcohol || 'No'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Exercise / Fitness</span>
                <span className="font-bold text-slate-800">{data.lifestyleInterests?.exercise || 'Regularly'}</span>
              </div>
              <div className="sm:col-span-4">
                <span className="text-slate-400 block font-semibold mb-1">Hobbies & Activities</span>
                <div className="flex flex-wrap gap-1.5">
                  {(data.hobbies || data.lifestyleInterests?.hobbies || ['Classical Music', 'Travel', 'Reading', 'Badminton']).map(
                    (h, i) => (
                      <span key={i} className="px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-medium">
                        {h}
                      </span>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* ── TAB 3: PROFESSIONAL DETAILS ── */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === 'professional' && (
        <div className="space-y-5">
          {/* Medical Registration & Doctor Credentials */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b pb-3">
              <Award className="w-4 h-4 text-[#E51F3E]" />
              <span>Medical Council Credentials & Licensure</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-red-50/50 rounded-xl border border-red-100">
                <span className="text-slate-400 block font-semibold text-[10px] uppercase">Medical Registration Number</span>
                <span className="font-mono font-bold text-[#E51F3E] text-sm">
                  {data.medicalRegistrationNumber || 'MCI-REG-847291'}
                </span>
              </div>

              <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                <span className="text-slate-400 block font-semibold text-[10px] uppercase">Medical Council</span>
                <span className="font-bold text-slate-800">{data.medicalCouncil || 'Medical Council of India (MCI)'}</span>
              </div>

              <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                <span className="text-slate-400 block font-semibold text-[10px] uppercase">State Council & Year</span>
                <span className="font-bold text-slate-800">
                  {data.registrationState || 'Karnataka'} • {data.registrationYear || '2016'}
                </span>
              </div>

              <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                <span className="text-slate-400 block font-semibold text-[10px] uppercase">Years of Clinical Experience</span>
                <span className="font-bold text-slate-800">{data.medicalExperience || '7+ Years Experience'}</span>
              </div>

              <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                <span className="text-slate-400 block font-semibold text-[10px] uppercase">Currently Practicing</span>
                <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{data.currentlyPracticing !== false ? 'Active Clinical Practice' : 'Not Practicing'}</span>
                </span>
              </div>

              <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                <span className="text-slate-400 block font-semibold text-[10px] uppercase">Work Type</span>
                <span className="font-bold text-slate-800">{data.workType || 'Full-time Specialist'}</span>
              </div>
            </div>
          </div>

          {/* Educational Background */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b pb-3">
              <GraduationCap className="w-4 h-4 text-emerald-600" />
              <span>Higher Education & Degrees</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block font-semibold">Highest Education</span>
                <span className="font-bold text-slate-800">{data.education}</span>
              </div>

              <div>
                <span className="text-slate-400 block font-semibold">Degree / Specialization</span>
                <span className="font-bold text-slate-800">{data.degree}</span>
              </div>

              <div>
                <span className="text-slate-400 block font-semibold">Additional Qualifications</span>
                <span className="font-bold text-slate-800">{data.additionalQualification || 'Fellowship in Aesthetic Med'}</span>
              </div>

              <div>
                <span className="text-slate-400 block font-semibold">Medical College</span>
                <span className="font-bold text-slate-800">{data.medicalCollege || 'All India Institute of Medical Sciences (AIIMS)'}</span>
              </div>

              <div>
                <span className="text-slate-400 block font-semibold">University</span>
                <span className="font-bold text-slate-800">{data.medicalUniversity || 'AIIMS New Delhi'}</span>
              </div>

              <div>
                <span className="text-slate-400 block font-semibold">Graduation Year</span>
                <span className="font-bold text-slate-800">{data.graduationYear || '2016'}</span>
              </div>
            </div>
          </div>

          {/* Current Practice & Hospital */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b pb-3">
              <Briefcase className="w-4 h-4 text-blue-600" />
              <span>Current Hospital Affiliation & Employment</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block font-semibold">Current Hospital / Clinic</span>
                <span className="font-bold text-slate-800">{data.currentHospital || data.company || 'Apollo Hospitals'}</span>
              </div>

              <div>
                <span className="text-slate-400 block font-semibold">Current Role / Designation</span>
                <span className="font-bold text-slate-800">{data.currentRole || data.profession}</span>
              </div>

              <div>
                <span className="text-slate-400 block font-semibold">Work City / Location</span>
                <span className="font-bold text-slate-800">{data.workLocation || data.city}</span>
              </div>

              <div>
                <span className="text-slate-400 block font-semibold">Annual Income</span>
                <span className="font-bold text-emerald-700 text-sm">{data.annualIncome || 'Confidential'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* ── TAB 4: FAMILY DETAILS ── */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === 'family' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b pb-3">
              <Home className="w-4 h-4 text-[#E51F3E]" />
              <span>Family Background & Household</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-100">
                <span className="text-slate-400 block font-semibold text-[10px] uppercase">Father Details</span>
                <span className="font-bold text-slate-800 block text-sm">
                  {data.fatherOccupation || 'Retired Government Officer'}
                </span>
              </div>

              <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-100">
                <span className="text-slate-400 block font-semibold text-[10px] uppercase">Mother Details</span>
                <span className="font-bold text-slate-800 block text-sm">
                  {data.motherOccupation || 'Homemaker'}
                </span>
              </div>

              <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-100">
                <span className="text-slate-400 block font-semibold text-[10px] uppercase">Siblings</span>
                <span className="font-bold text-slate-800 block text-sm">
                  {data.siblings || '1 Brother (Married), 1 Sister'}
                </span>
              </div>

              <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-100">
                <span className="text-slate-400 block font-semibold text-[10px] uppercase">Family Type</span>
                <span className="font-bold text-slate-800 block text-sm">{data.familyType || 'Nuclear Family'}</span>
              </div>

              <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-100">
                <span className="text-slate-400 block font-semibold text-[10px] uppercase">Family Status</span>
                <span className="font-bold text-slate-800 block text-sm">{data.familyStatus || 'Upper Middle Class'}</span>
              </div>

              <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-100">
                <span className="text-slate-400 block font-semibold text-[10px] uppercase">Family Values</span>
                <span className="font-bold text-slate-800 block text-sm">{data.familyValues || 'Moderate / Traditional'}</span>
              </div>

              <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-100 sm:col-span-2">
                <span className="text-slate-400 block font-semibold text-[10px] uppercase">Family Location & Residence</span>
                <span className="font-bold text-slate-800 block text-sm">
                  {data.familyLocation || `${data.city}, ${data.state}`}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* ── TAB 5: PHOTOS ── */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === 'photos' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Eye className="w-4 h-4 text-[#E51F3E]" />
                  <span>Profile Photos Gallery ({data.photos?.length || 0})</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Click any photo to inspect in full resolution</p>
              </div>

              <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                Visibility: {data.privacySettings?.photoVisibility || 'All Members'}
              </span>
            </div>

            {data.photos && data.photos.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {data.photos.map((photo, idx) => {
                  const isPrimary = photo === data.primaryPhoto;
                  return (
                    <div
                      key={idx}
                      className="group relative rounded-2xl overflow-hidden border-2 border-slate-200 shadow-2xs aspect-square cursor-pointer hover:border-slate-400 transition"
                      onClick={() => setLightboxPhoto(photo)}
                    >
                      <img
                        src={photo}
                        alt={`Profile photo ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                      {isPrimary && (
                        <span className="absolute top-2 left-2 bg-[#E51F3E] text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-md shadow">
                          Primary
                        </span>
                      )}
                      <div className="absolute inset-0 bg-slate-950/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                        <Maximize2 className="w-6 h-6" />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400 text-xs">
                No uploaded photos found for this candidate profile.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* ── TAB 6: VERIFICATION DOCUMENTS ── */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === 'verification' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  <span>Submitted KYC & Qualification Documents ({verificationsList.length})</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Review and verify government ID, medical degrees, and hospital employment records.
                </p>
              </div>

              {pendingDocsCount > 0 && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  {pendingDocsCount} Awaiting Review
                </span>
              )}
            </div>

            {verificationsList.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p>No verification documents submitted yet by this candidate.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {verificationsList.map((doc) => {
                  const isPending = doc.status === 'PENDING';
                  const isApproved = doc.status === 'APPROVED';
                  const isRejected = doc.status === 'REJECTED';

                  return (
                    <div
                      key={doc._id}
                      className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/50 hover:bg-slate-50 transition shadow-2xs space-y-3"
                    >
                      {/* Document Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 font-bold shrink-0">
                            <FileText className="w-5 h-5 text-[#E51F3E]" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-xs sm:text-sm leading-tight">
                              {doc.documentName || doc.documentType}
                            </p>
                            <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                              {doc.documentType}
                            </p>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isApproved
                              ? 'bg-emerald-100 text-emerald-800'
                              : isPending
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {doc.status}
                        </span>
                      </div>

                      {/* Document Details */}
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 bg-white p-2.5 rounded-xl border border-slate-100">
                        <div>
                          <span className="text-slate-400 block font-semibold">Submitted Date:</span>
                          <span>
                            {new Date(doc.submittedAt || doc.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                        {doc.reviewedAt && (
                          <div>
                            <span className="text-slate-400 block font-semibold">Reviewed Date:</span>
                            <span>
                              {new Date(doc.reviewedAt).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                        )}
                        {doc.reviewedByEmail && (
                          <div className="col-span-2">
                            <span className="text-slate-400 block font-semibold">Reviewer Admin:</span>
                            <span className="font-mono text-slate-700">{doc.reviewedByEmail}</span>
                          </div>
                        )}
                        {doc.rejectionReason && (
                          <div className="col-span-2 p-2 bg-rose-50 rounded-lg text-rose-800 text-[11px]">
                            <span className="font-bold block">Rejection Reason:</span>
                            <span>{doc.rejectionReason}</span>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200">
                        {/* Secure View Document Link */}
                        <button
                          type="button"
                          onClick={() =>
                            setLightboxDoc({
                              url: doc.documentUrl,
                              title: doc.documentName,
                              type: doc.fileType || 'application/pdf',
                            })
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold shadow-2xs transition cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          <span>View Scan</span>
                        </button>

                        <div className="flex items-center gap-1.5">
                          {!isApproved && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedVerifDoc(doc);
                                setVerifActionType('APPROVE');
                                setVerifNotes('');
                                setVerifModalOpen(true);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition cursor-pointer"
                            >
                              Approve
                            </button>
                          )}
                          {!isRejected && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedVerifDoc(doc);
                                setVerifActionType('REJECT');
                                setVerifRejectReason(REJECTION_REASONS[0]);
                                setVerifCustomReject('');
                                setVerifNotes('');
                                setVerifModalOpen(true);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 text-xs font-bold shadow-2xs transition cursor-pointer"
                            >
                              Reject
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* ── TAB 7: MEMBERSHIP & BILLING ── */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === 'membership' && (
        <div className="space-y-5">
          {/* Active Plan Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b pb-3">
              <CreditCard className="w-4 h-4 text-purple-600" />
              <span>Current Matrimonial Subscription</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="p-3.5 bg-purple-50/50 rounded-xl border border-purple-100">
                <span className="text-slate-400 block font-semibold text-[10px] uppercase">Plan Name</span>
                <span className="font-bold text-purple-900 text-sm">{currentPlan}</span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block font-semibold text-[10px] uppercase">Status</span>
                <span className="font-bold text-slate-800 text-sm">
                  {data.subscription?.status || 'ACTIVE'}
                </span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block font-semibold text-[10px] uppercase">Contact Credits Used</span>
                <span className="font-bold text-slate-800 text-sm">
                  {data.subscription?.contactRequestsUsed ?? 0} Used
                </span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block font-semibold text-[10px] uppercase">Credits Remaining</span>
                <span className="font-bold text-emerald-700 text-sm">
                  {data.subscription?.contactRequestsRemaining ?? 5} Remaining
                </span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block font-semibold text-[10px] uppercase">Start Date</span>
                <span className="font-bold text-slate-800">
                  {data.subscription?.startDate
                    ? new Date(data.subscription.startDate).toLocaleDateString('en-IN')
                    : '—'}
                </span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block font-semibold text-[10px] uppercase">Expiry Date</span>
                <span className="font-bold text-slate-800">
                  {data.subscription?.expiryDate
                    ? new Date(data.subscription.expiryDate).toLocaleDateString('en-IN')
                    : 'Never Expires (Free)'}
                </span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 sm:col-span-2">
                <span className="text-slate-400 block font-semibold text-[10px] uppercase">Payment Reference</span>
                <span className="font-mono font-bold text-slate-700">
                  {data.subscription?.paymentReference || 'N/A (Default Plan)'}
                </span>
              </div>
            </div>
          </div>

          {/* Payment History Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b pb-3">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span>Transaction & Payment History ({data.payments?.length || 0})</span>
            </h3>

            {!data.payments || data.payments.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-6 text-center">No payment transactions recorded for this candidate.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Provider</th>
                      <th className="py-2.5 px-3">Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.payments.map((p) => (
                      <tr key={p._id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 text-slate-700">
                          {new Date(p.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          ₹{p.amount} {p.currency}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              p.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">{p.provider || 'Razorpay'}</td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                          {p.providerPaymentId || p._id}
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

      {/* ────────────────────────────────────────────────────────── */}
      {/* ── TAB 8: REPORTS & SAFETY ── */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === 'reports' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Flag className="w-4 h-4 text-[#E51F3E]" />
                  <span>Complaints & Moderation Reports ({reportsCount})</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Detailed safety reports filed by other verified matrimonial members against this candidate.
                </p>
              </div>

              {pendingReportsCount > 0 && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#E51F3E] text-white">
                  {pendingReportsCount} Pending Safety Review
                </span>
              )}
            </div>

            {reportsCount === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                <p className="font-bold text-slate-700">Clean Safety Record</p>
                <p className="text-slate-400 mt-0.5">No reports or platform policy violations filed against this member.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {data.reports?.map((rep) => {
                  const isResolved = rep.status === 'RESOLVED';
                  const isDismissed = rep.status === 'DISMISSED';
                  const isPending = rep.status === 'PENDING' || rep.status === 'UNDER_REVIEW';

                  return (
                    <div
                      key={rep._id}
                      className="p-4 sm:p-5 rounded-2xl border border-rose-200/90 bg-rose-50/30 hover:bg-rose-50/50 transition shadow-2xs space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-600 text-white">
                            {rep.reason}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isResolved
                                ? 'bg-emerald-100 text-emerald-800'
                                : isDismissed
                                ? 'bg-slate-200 text-slate-700'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {rep.status}
                          </span>
                        </div>

                        <span className="text-[11px] text-slate-500 font-medium">
                          Reported on{' '}
                          {new Date(rep.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      {/* Report Explanation */}
                      <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1">
                        <span className="text-slate-400 font-bold uppercase text-[10px] block">Details from Reporter</span>
                        <p className="text-slate-800 font-medium leading-relaxed">
                          {rep.details || rep.description || 'No additional commentary provided by reporter.'}
                        </p>
                      </div>

                      {/* Reporter Info (Admin Eyes Only) */}
                      <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-600 bg-white p-2.5 rounded-xl border border-slate-100">
                        <div>
                          <span className="text-slate-400 block font-semibold">Filed By:</span>
                          <span className="font-bold text-slate-900">
                            {rep.reporter?.fullName || 'Anonymous Member'}
                          </span>
                          {rep.reporter?.email && (
                            <span className="text-slate-500 ml-1">({rep.reporter.email})</span>
                          )}
                        </div>

                        {rep.actionTaken && rep.actionTaken !== 'NONE' && (
                          <div>
                            <span className="text-slate-400 block font-semibold">Action Taken:</span>
                            <span className="font-bold text-purple-700">{rep.actionTaken}</span>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      {isPending && (
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-rose-200/60">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedReport(rep);
                              setReportActionType('DISMISS');
                              setReportResolutionNotes('');
                              setReportModalOpen(true);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition shadow-2xs cursor-pointer"
                          >
                            Dismiss Report
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedReport(rep);
                              setReportActionType('RESOLVE');
                              setReportResolutionNotes('');
                              setReportModalOpen(true);
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                          >
                            Resolve Report
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* ── TAB 9: ADMIN ACTIVITY & NOTES ── */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === 'activity' && (
        <div className="space-y-5">
          {/* Add Internal Admin Note Box */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                  <span>Internal Administrative Notes</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Record confidential internal remarks for review by the customer support and compliance teams.
                </p>
              </div>

              <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full flex items-center gap-1">
                <Lock className="w-3 h-3" />
                <span>Never Visible to Profile Owner</span>
              </span>
            </div>

            <form onSubmit={handleAddNote} className="space-y-3">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Type internal notes, phone consultation logs, or safety investigation remarks..."
                rows={3}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submittingNote || !newNote.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submittingNote ? 'Saving Note...' : 'Save Internal Note'}</span>
                </button>
              </div>
            </form>

            {/* List of Previous Admin Notes */}
            <div className="space-y-3 pt-3 border-t">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Note History ({data.adminNotes?.length || 0})
              </h4>

              {!data.adminNotes || data.adminNotes.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-3">No internal notes written yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {data.adminNotes.map((n, i) => (
                    <div key={i} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70 text-xs space-y-1">
                      <p className="text-slate-800 font-medium leading-relaxed">{n.note}</p>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                        <span>By {n.adminName || n.adminEmail}</span>
                        <span>{new Date(n.createdAt).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Safety & Moderation Audit History */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b pb-3">
              <Activity className="w-4 h-4 text-emerald-600" />
              <span>Administrative Audit Trail ({data.auditLogs?.length || 0})</span>
            </h3>

            {!data.auditLogs || data.auditLogs.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-6 text-center">No audit logs recorded for this account yet.</p>
            ) : (
              <div className="space-y-2">
                {data.auditLogs.map((log) => (
                  <div key={log._id} className="p-3 bg-slate-50/70 rounded-xl border border-slate-100 text-xs flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${log.action === 'PROFILE_EDITED' ? 'text-indigo-600' : 'text-slate-900'}`}>
                            {log.action}
                          </span>
                          {log.newStatus && (
                            <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                              {log.newStatus}
                            </span>
                          )}
                          {log.action === 'PROFILE_EDITED' && (
                            <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                              <Edit2 className="w-2.5 h-2.5" /> Profile Edit
                            </span>
                          )}
                        </div>
                        <p className="text-slate-600 text-[11px] mt-0.5">{log.details || log.reason || 'Administrative action executed'}</p>
                      </div>

                      <div className="text-right text-[10px] text-slate-400 shrink-0">
                        <p className="font-medium text-slate-600">{log.adminName || log.adminEmail}</p>
                        <p>{new Date(log.createdAt).toLocaleString('en-IN')}</p>
                      </div>
                    </div>

                    {/* Render Detailed Changes (Old Value ➔ New Value) if available */}
                    {log.metadata?.changes && Array.isArray(log.metadata.changes) && log.metadata.changes.length > 0 && (
                      <div className="pt-2 border-t border-slate-200/60 flex flex-wrap gap-1.5">
                        {log.metadata.changes.map((change: any, cIdx: number) => (
                          <span
                            key={cIdx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] text-slate-700 font-mono shadow-3xs"
                          >
                            <span className="font-bold text-slate-900 capitalize">{change.field}:</span>
                            <span className="line-through text-slate-400 max-w-[120px] truncate">{String(change.oldValue ?? 'empty')}</span>
                            <span className="text-slate-400">➔</span>
                            <span className="font-semibold text-emerald-700 max-w-[150px] truncate">{String(change.newValue ?? 'empty')}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* ── MODALS ── */}
      {/* ────────────────────────────────────────────────────────── */}

      {/* 1. Status Change Modal */}
      {statusModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#E51F3E]" />
                <span>Change Account & Profile Status</span>
              </h3>
              <button
                type="button"
                onClick={() => setStatusModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Select New Status</label>
                <select
                  value={selectedNewStatus}
                  onChange={(e) => setSelectedNewStatus(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="Active">Active (Full Website Visibility)</option>
                  <option value="Under Review">Under Review (Temporarily Hidden)</option>
                  <option value="Suspended">Suspended (Restricted Access)</option>
                  <option value="Blocked">Blocked (Terminated Access)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Reason / Notes for Audit Trail</label>
                <textarea
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  placeholder="Explain why this status is being updated..."
                  rows={3}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setStatusModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={statusSubmitting}
                onClick={handleConfirmStatusChange}
                className="px-4 py-2 rounded-xl bg-[#E51F3E] hover:bg-[#CC1432] text-white text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {statusSubmitting ? 'Updating...' : 'Confirm Status Change'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Confirm Delete Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-rose-200 max-w-md w-full p-6 shadow-2xl space-y-4 animate-scale-up">
            <div className="flex items-center gap-3 text-rose-600 border-b pb-3">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-bold text-slate-900 text-sm">Delete Profile Account</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete this profile? This will soft-delete the profile from search, deactivate the login account, and preserve audit records for compliance.
            </p>

            <div>
              <label className="font-bold text-slate-700 block mb-1 text-xs">Mandatory Administrative Reason</label>
              <textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Reason for deletion (e.g., Requested by user, Fraudulent duplicate profile)..."
                rows={3}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteSubmitting || !deleteReason.trim()}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {deleteSubmitting ? 'Deleting...' : 'Confirm Delete Profile'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Verification Document Decision Modal */}
      {verifModalOpen && selectedVerifDoc && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                <span>{verifActionType === 'APPROVE' ? 'Approve Verification Document' : 'Reject Verification Document'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setVerifModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="font-bold text-slate-800">{selectedVerifDoc.documentName}</p>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">{selectedVerifDoc.documentType}</p>
              </div>

              {verifActionType === 'REJECT' && (
                <>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Standard Rejection Reason</label>
                    <select
                      value={verifRejectReason}
                      onChange={(e) => setVerifRejectReason(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none"
                    >
                      {REJECTION_REASONS.map((r, i) => (
                        <option key={i} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Custom Note to Candidate</label>
                    <textarea
                      value={verifCustomReject}
                      onChange={(e) => setVerifCustomReject(e.target.value)}
                      placeholder="Specific feedback (e.g., Please upload clear color scan of registration certificate)..."
                      rows={2}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1">Internal Admin Note (Optional)</label>
                <input
                  type="text"
                  value={verifNotes}
                  onChange={(e) => setVerifNotes(e.target.value)}
                  placeholder="Optional internal remark for audit log..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setVerifModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={verifSubmitting}
                onClick={handleConfirmVerificationDecision}
                className={`px-4 py-2 rounded-xl text-white text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer ${
                  verifActionType === 'APPROVE' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {verifSubmitting ? 'Saving...' : verifActionType === 'APPROVE' ? 'Confirm Approval' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Report Resolution Modal */}
      {reportModalOpen && selectedReport && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Flag className="w-4 h-4 text-[#E51F3E]" />
                <span>{reportActionType === 'RESOLVE' ? 'Mark Report Resolved' : 'Dismiss Safety Report'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setReportModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-bold text-slate-900 block">Reason: {selectedReport.reason}</span>
                <p className="text-slate-600 mt-1 italic">"{selectedReport.details || selectedReport.description || '—'}"</p>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Administrative Resolution Notes</label>
                <textarea
                  value={reportResolutionNotes}
                  onChange={(e) => setReportResolutionNotes(e.target.value)}
                  placeholder="Record summary of investigation and reason for resolution or dismissal..."
                  rows={3}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setReportModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={reportSubmitting}
                onClick={handleConfirmReportAction}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {reportSubmitting ? 'Saving...' : 'Confirm Action'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Photo Lightbox Modal */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setLightboxPhoto(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setLightboxPhoto(null)}
              className="absolute -top-10 right-0 text-white hover:text-slate-300 p-2 cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={lightboxPhoto}
              alt="High resolution preview"
              className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* 6. Document Viewer Lightbox Modal */}
      {lightboxDoc && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-8"
          onClick={() => setLightboxDoc(null)}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 max-w-4xl w-full h-[85vh] flex flex-col overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b bg-slate-50">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#E51F3E]" />
                <h3 className="font-bold text-slate-900 text-sm truncate max-w-md">{lightboxDoc.title}</h3>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={lightboxDoc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Direct</span>
                </a>
                <button
                  type="button"
                  onClick={() => setLightboxDoc(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-100 p-4 flex items-center justify-center overflow-auto">
              {lightboxDoc.type.includes('image') ||
              lightboxDoc.url.match(/\.(jpg|jpeg|png|webp)($|\?)/i) ? (
                <img
                  src={lightboxDoc.url}
                  alt={lightboxDoc.title}
                  className="max-w-full max-h-full object-contain rounded-xl shadow-md"
                />
              ) : (
                <iframe
                  src={lightboxDoc.url}
                  title={lightboxDoc.title}
                  className="w-full h-full rounded-xl border border-slate-200 bg-white"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* 7. Edit Profile Modal (Admin Protected Editing) */}
      <AdminEditProfileModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        profile={data}
        onSuccess={async () => {
          showToast('Profile updated successfully.');
          await loadProfile();
        }}
      />
    </div>
  );
}

export default function AdminProfileDetailsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-16 text-center text-slate-400">
          <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-bold">Loading doctor profile details...</p>
        </div>
      }
    >
      <AdminProfileDetailsContent />
    </Suspense>
  );
}
