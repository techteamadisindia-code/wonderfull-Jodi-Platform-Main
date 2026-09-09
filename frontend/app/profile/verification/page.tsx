'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  ShieldAlert,
  FileText,
  UploadCloud,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  Lock,
  Sparkles,
  AlertCircle,
  FileCheck,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Info,
  X,
} from 'lucide-react';
import {
  fetchUserVerifications,
  submitUserVerification,
  VerificationItem,
  UserVerificationSummaryResponse,
} from '../../../services/verificationApi';

interface DocumentCategoryConfig {
  key: string;
  title: string;
  badge: string;
  description: string;
  examples: string;
  iconBg: string;
}

const DOCUMENT_CATEGORIES: DocumentCategoryConfig[] = [
  {
    key: 'GOVERNMENT_ID',
    title: 'Government ID / KYC',
    badge: 'Mandatory for Verified Badge',
    description: 'Verify your legal identity and age through government-issued identification.',
    examples: 'Aadhaar Card (Masked), Passport, Voter ID, Driving License',
    iconBg: 'bg-blue-500/10 text-blue-600',
  },
  {
    key: 'DEGREE',
    title: 'Degree & Education Certificate',
    badge: 'Education Credential',
    description: 'Verify your highest completed university degree and professional qualification.',
    examples: 'MBBS Degree, MD/MS Certificate, B.Tech, MBA, Master Degree Convocation',
    iconBg: 'bg-emerald-500/10 text-emerald-600',
  },
  {
    key: 'PROFESSIONAL',
    title: 'Professional Council Registration',
    badge: 'Doctor / Professional Trust',
    description: 'Verify your license to practice with statutory professional regulatory boards.',
    examples: 'State Medical Council Registration, Bar Council, ICAI Certificate',
    iconBg: 'bg-purple-500/10 text-purple-600',
  },
  {
    key: 'EMPLOYMENT',
    title: 'Employment & Career Proof',
    badge: 'Career Authenticity',
    description: 'Verify your current employment affiliation or practicing clinic/hospital.',
    examples: 'Corporate Employee ID, Official Offer Letter, Recent Salary Slip',
    iconBg: 'bg-amber-500/10 text-amber-600',
  },
];

export default function UserVerificationCenterPage() {
  const [data, setData] = useState<UserVerificationSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  // Upload Modal State
  const [uploadCategory, setUploadCategory] = useState<string | null>(null);
  const [documentName, setDocumentName] = useState('');
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState<number>(0);
  const [fileType, setFileType] = useState('');
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadVerificationData = async () => {
    setLoading(true);
    try {
      const res = await fetchUserVerifications();
      setData(res);
    } catch (err: any) {
      console.error('Failed to load user verifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVerificationData();
  }, []);

  const handleOpenUpload = (categoryKey: string) => {
    setUploadCategory(categoryKey);
    const cat = DOCUMENT_CATEGORIES.find((c) => c.key === categoryKey);
    setDocumentName(cat ? `${cat.title}` : '');
    setFileBase64(null);
    setFileName('');
    setFileSize(0);
    setFileType('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setFeedback({ type: 'error', message: 'File size exceeds maximum allowed 10MB limit.' });
      return;
    }

    // Validate extension / MIME
    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type.toLowerCase())) {
      setFeedback({
        type: 'error',
        message: 'Invalid file format. Please upload PDF, JPG, PNG, or WebP files only.',
      });
      return;
    }

    setFileName(file.name);
    setFileSize(file.size);
    setFileType(file.type);

    const reader = new FileReader();
    reader.onload = () => {
      setFileBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadCategory || !fileBase64) {
      setFeedback({ type: 'error', message: 'Please select a document file to upload.' });
      return;
    }

    setUploading(true);
    try {
      const res = await submitUserVerification({
        documentType: uploadCategory,
        documentName: documentName.trim() || undefined,
        file: fileBase64,
        filename: fileName,
      });

      setFeedback({
        type: 'success',
        message: res.message || 'Document uploaded successfully! It is now pending administrator review.',
      });
      setUploadCategory(null);
      setFileBase64(null);
      loadVerificationData();
    } catch (err: any) {
      console.error('Submission failed:', err);
      setFeedback({
        type: 'error',
        message: err?.response?.data?.message || 'Failed to upload verification document.',
      });
    } finally {
      setUploading(false);
    }
  };

  const getCategoryStatus = (catKey: string) => {
    return data?.summary?.[catKey]?.status || 'NOT_SUBMITTED';
  };

  return (
    <main className="min-h-screen bg-[#FAFAF9] py-8 sm:py-12 px-4 sm:px-6 lg:px-8 text-[#101828]">
      <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/profile"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-[#E51F3E] transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to My Profile</span>
          </Link>
          <button
            onClick={loadVerificationData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#E51F3E]' : ''}`} />
            <span>Refresh Status</span>
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-4 rounded-2xl border text-sm font-semibold flex items-center justify-between shadow-xs animate-fade-in ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-rose-50 border-rose-300 text-rose-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="text-slate-500 hover:text-slate-900 ml-4 font-bold">
              ×
            </button>
          </div>
        )}

        {/* ── Top Status Banner ── */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-xs font-bold text-[#E51F3E]">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Matrimonial Trust & Safety Center</span>
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900">
                KYC & Credential Verification
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 max-w-xl leading-relaxed">
                Wonderful Jodi is an exclusive matrimonial community. Verified profiles enjoy <strong>3x more partner inquiries</strong>, higher profile rank, and trusted matrimonial credibility.
              </p>
            </div>

            {/* Status Indicator Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 text-center shrink-0 min-w-[200px] w-full sm:w-auto">
              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">
                Overall Verification
              </span>
              <div className="mt-2 flex items-center justify-center gap-2">
                {data?.isVerified || data?.overallStatus === 'VERIFIED' ? (
                  <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Verified Profile</span>
                  </div>
                ) : data?.overallStatus === 'PENDING' ? (
                  <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-xs">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>Review in Progress</span>
                  </div>
                ) : data?.overallStatus === 'REJECTED' ? (
                  <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-rose-100 text-rose-800 font-bold text-xs">
                    <XCircle className="w-4 h-4 text-rose-600" />
                    <span>Action Required</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-slate-200 text-slate-700 font-bold text-xs">
                    <ShieldAlert className="w-4 h-4 text-slate-500" />
                    <span>Not Verified</span>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-2">
                {data?.isVerified
                  ? 'All credentials verified by administration'
                  : 'Submit documents below to complete audit'}
              </p>
            </div>
          </div>
        </div>

        {/* ── Document Categories Grid ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg font-bold text-slate-900">
              Verification Documents
            </h2>
            <span className="text-xs text-slate-500">
              Supported Formats: <strong>PDF, JPG, PNG</strong> (Max 10MB)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {DOCUMENT_CATEGORIES.map((cat) => {
              const status = getCategoryStatus(cat.key);
              const summaryItem = data?.summary?.[cat.key];

              return (
                <div
                  key={cat.key}
                  className={`bg-white p-6 rounded-3xl border shadow-xs space-y-4 flex flex-col justify-between transition ${
                    status === 'APPROVED'
                      ? 'border-emerald-200/90 bg-gradient-to-b from-emerald-50/20 to-white'
                      : status === 'PENDING'
                      ? 'border-amber-200/90 bg-gradient-to-b from-amber-50/20 to-white'
                      : status === 'REJECTED'
                      ? 'border-rose-200/90 bg-gradient-to-b from-rose-50/20 to-white'
                      : 'border-slate-200/90 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className={`w-10 h-10 rounded-2xl ${cat.iconBg} flex items-center justify-center font-bold`}>
                        <FileText className="w-5 h-5" />
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : status === 'PENDING'
                            ? 'bg-amber-100 text-amber-800'
                            : status === 'REJECTED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {status === 'NOT_SUBMITTED' ? 'Not Uploaded' : status}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-900 text-base">{cat.title}</h3>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{cat.description}</p>
                    </div>

                    <div className="p-3 bg-slate-50/80 rounded-2xl text-[11px] space-y-1">
                      <span className="text-slate-400 font-bold block uppercase text-[9px]">Accepted Documents:</span>
                      <span className="text-slate-700 font-medium block">{cat.examples}</span>
                    </div>

                    {/* Status Specific Explanations */}
                    {status === 'PENDING' && (
                      <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200/80 text-amber-900 text-xs flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Your document has been submitted and is awaiting administrator verification.</span>
                      </div>
                    )}

                    {status === 'APPROVED' && (
                      <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200/80 text-emerald-900 text-xs flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Verified & Approved by Wonderful Jodi administration.</span>
                      </div>
                    )}

                    {status === 'REJECTED' && (
                      <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200/80 text-rose-900 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-rose-700">
                          <AlertCircle className="w-4 h-4" />
                          <span>Verification Requires Attention</span>
                        </div>
                        <p className="text-[11px] text-rose-800">
                          <strong>Reason:</strong> {summaryItem?.rejectionReason || 'Document copy was unclear or missing details.'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-2">
                    {status === 'APPROVED' ? (
                      <div className="w-full py-2.5 rounded-2xl bg-emerald-50 text-emerald-700 font-bold text-xs text-center border border-emerald-200 flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Credentials Verified</span>
                      </div>
                    ) : status === 'PENDING' ? (
                      <div className="w-full py-2.5 rounded-2xl bg-amber-50 text-amber-700 font-bold text-xs text-center border border-amber-200 flex items-center justify-center gap-1.5">
                        <Clock className="w-4 h-4 text-amber-600" />
                        <span>Under Verification Review</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleOpenUpload(cat.key)}
                        className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs inline-flex items-center justify-center gap-2 shadow-xs transition"
                      >
                        <UploadCloud className="w-4 h-4" />
                        <span>{status === 'REJECTED' ? 'Upload New Document' : 'Submit for Verification'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Verification History Table ── */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-8 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif text-lg font-bold text-slate-900">
                Submission & Verification Audit Log
              </h3>
              <p className="text-xs text-slate-500">
                Permanent ledger of all submitted documents and verification outcomes
              </p>
            </div>
            <span className="text-xs font-bold text-slate-600">
              {data?.data?.length || 0} Submissions
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-200 text-[10px]">
                <tr>
                  <th className="py-3 px-4">Document Title</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Attempt</th>
                  <th className="py-3 px-4">Submitted Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Audit Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!data?.data || data.data.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No documents submitted yet. Select a category above to submit your credentials.
                    </td>
                  </tr>
                ) : (
                  data.data.map((item) => (
                    <tr key={item._id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-[#E51F3E]" />
                        <span>{item.documentName || 'Verification Document'}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {DOCUMENT_CATEGORIES.find((c) => c.key === item.documentType)?.title || item.documentType}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-700">
                        Attempt #{item.attemptNumber || 1}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {new Date(item.submittedAt || item.createdAt).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                            item.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.status === 'REJECTED'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                        {item.rejectionReason ? (
                          <span className="text-rose-600 font-semibold">{item.rejectionReason}</span>
                        ) : item.status === 'APPROVED' ? (
                          <span className="text-emerald-700 font-semibold">Verified by Administrator</span>
                        ) : (
                          'Awaiting Review'
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Privacy Note */}
        <div className="p-4 rounded-2xl bg-slate-100/70 border border-slate-200 text-slate-600 text-xs flex items-start gap-3">
          <Lock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Privacy & Security Assurance:</strong> Uploaded verification documents are stored securely in encrypted, private storage and accessible exclusively by authorized verification compliance administrators. They are never published publicly or shared with other members.
          </p>
        </div>
      </div>

      {/* ── Document Upload Modal ── */}
      {uploadCategory && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmitDocument}
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-6 animate-fade-in"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-[#E51F3E] flex items-center justify-center font-bold">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Upload Verification Document
                  </h3>
                  <p className="text-xs text-slate-500">
                    {DOCUMENT_CATEGORIES.find((c) => c.key === uploadCategory)?.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUploadCategory(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-800 block mb-1.5">
                  Document Title / Description
                </label>
                <input
                  type="text"
                  value={documentName}
                  onChange={(e) => setDocumentName(e.target.value)}
                  placeholder="e.g. Government Aadhaar Card or MBBS Certificate"
                  className="w-full p-3 border border-slate-200 rounded-2xl bg-slate-50 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>

              {/* File Dropzone */}
              <div>
                <label className="font-bold text-slate-800 block mb-1.5">
                  Attach File (PDF, JPG, PNG, WebP • Max 10MB)
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-3xl p-6 text-center cursor-pointer transition ${
                    fileBase64
                      ? 'border-emerald-300 bg-emerald-50/30'
                      : 'border-slate-200 hover:border-slate-400 bg-slate-50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {fileBase64 ? (
                    <div className="space-y-2">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <p className="font-bold text-slate-900 text-sm truncate max-w-xs mx-auto">
                        {fileName}
                      </p>
                      <p className="text-slate-500 text-[11px]">
                        {(fileSize / 1024 / 1024).toFixed(2)} MB • {fileType}
                      </p>
                      <span className="text-[11px] font-bold text-[#E51F3E] hover:underline block pt-1">
                        Click to choose a different file
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <UploadCloud className="w-8 h-8 text-slate-400 mx-auto" />
                      <p className="font-bold text-slate-800 text-sm">
                        Click or Drag file to attach
                      </p>
                      <p className="text-slate-400 text-[11px]">
                        PDF or clear photos of original government / university credentials
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setUploadCategory(null)}
                className="px-4 py-2.5 rounded-2xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploading || !fileBase64}
                className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-[#E51F3E] to-[#F03554] hover:from-[#d11735] hover:to-[#e0203f] text-white font-bold text-xs shadow-md shadow-red-600/20 transition disabled:opacity-50 inline-flex items-center gap-2"
              >
                {uploading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Uploading Document...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Submit for Verification</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
