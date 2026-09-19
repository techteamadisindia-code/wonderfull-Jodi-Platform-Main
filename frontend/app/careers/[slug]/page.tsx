'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Briefcase,
  ArrowLeft,
  MapPin,
  Clock,
  Building2,
  Calendar,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Send,
  X,
  FileText,
  User,
  Mail,
  Phone,
  Share2,
  Check,
  Award,
  BookOpen,
  Heart,
  RefreshCw,
} from 'lucide-react';
import {
  JobOpening,
  fetchPublicCareerBySlug,
  submitApplication,
} from '../../../services/careerApi';

export default function CareerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [job, setJob] = useState<JobOpening | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Application Modal state
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [candidateName, setCandidateName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [resumeUrl, setResumeUrl] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    const loadJob = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetchPublicCareerBySlug(slug);
        if (res.success && res.data) {
          setJob(res.data);
        } else {
          setError('Job opening not found or has been closed.');
        }
      } catch (err: any) {
        setError(err?.response?.data?.message || 'This job opening is unavailable.');
      } finally {
        setLoading(false);
      }
    };
    loadJob();
  }, [slug]);

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleApplicationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!job) return;

    if (!candidateName.trim()) {
      setApplyError('Please enter your full name.');
      return;
    }
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setApplyError('Please enter a valid email address.');
      return;
    }
    if (!mobile.trim() || mobile.trim().length < 8) {
      setApplyError('Please provide a valid phone number.');
      return;
    }

    try {
      setSubmitting(true);
      setApplyError(null);
      const res = await submitApplication(job.slug, {
        candidateName: candidateName.trim(),
        email: email.trim(),
        mobile: mobile.trim(),
        experienceYears: experienceYears.trim(),
        resumeUrl: resumeUrl.trim(),
        coverLetter: coverLetter.trim(),
      });

      if (res.success) {
        setApplySuccess(true);
      } else {
        setApplyError(res.message || 'Submission failed. Please try again.');
      }
    } catch (err: any) {
      setApplyError(err?.response?.data?.message || 'Failed to submit your application. Please check your connection.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return null;
    }
  };

  return (
    <main className="min-h-screen bg-[#FAF8F5] py-10 sm:py-14 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
        {/* Back Link */}
        <div className="flex items-center justify-between">
          <Link
            href="/careers"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-[#E51F3E] transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1 text-[#E51F3E]" />
            <span>Back to All Openings</span>
          </Link>

          {job && (
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600">Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Share Role</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-100 shadow-sm animate-pulse space-y-6">
            <div className="h-8 bg-slate-200 rounded-md w-1/2"></div>
            <div className="h-4 bg-slate-100 rounded-md w-1/4"></div>
            <div className="h-24 bg-slate-100 rounded-xl w-full"></div>
            <div className="h-40 bg-slate-100 rounded-xl w-full"></div>
          </div>
        )}

        {/* Error State */}
        {!loading && (error || !job) && (
          <div className="bg-white rounded-3xl p-8 sm:p-12 border border-rose-100 shadow-sm text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900">
              {error || 'Opening Not Found'}
            </h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              This job position might have been filled or unpublished. You can view all currently active openings on
              our Careers portal.
            </p>
            <Link
              href="/careers"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#E51F3E] text-white text-xs font-bold hover:bg-[#CE102F] transition shadow-xs"
            >
              <span>Explore Openings</span>
            </Link>
          </div>
        )}

        {/* Job Details Card */}
        {!loading && job && (
          <div className="space-y-6">
            {/* Top Overview Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-10 border border-rose-100/80 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-6">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-[#E51F3E] text-xs font-bold border border-rose-100">
                      {job.department}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
                      {job.workMode}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
                      {job.employmentType}
                    </span>
                  </div>

                  <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                    {job.title}
                  </h1>

                  <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs sm:text-sm text-slate-500 pt-1">
                    <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                      <MapPin className="w-4 h-4 text-rose-500" />
                      {job.location}
                    </span>
                    {job.experience && (
                      <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                        <Award className="w-4 h-4 text-amber-500" />
                        {job.experience}
                      </span>
                    )}
                    {job.salaryRange && (
                      <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                        <DollarSign className="w-4 h-4 text-emerald-600" />
                        {job.salaryRange}
                      </span>
                    )}
                  </div>
                </div>

                <div className="shrink-0 flex flex-col sm:items-end gap-2 pt-2 sm:pt-0">
                  <button
                    onClick={() => {
                      setIsApplyModalOpen(true);
                      setApplySuccess(false);
                      setApplyError(null);
                    }}
                    className="px-6 py-3 rounded-2xl bg-[#E51F3E] text-white text-xs sm:text-sm font-bold hover:bg-[#CE102F] transition shadow-sm flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>Apply for this Role</span>
                  </button>

                  {job.applicationDeadline && (
                    <span className="text-[11px] text-slate-500 font-medium">
                      Deadline: {formatDate(job.applicationDeadline)}
                    </span>
                  )}
                </div>
              </div>

              {/* Short Summary */}
              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 text-xs sm:text-sm text-slate-700 leading-relaxed">
                {job.shortDescription}
              </div>

              {/* Full Description */}
              <div className="space-y-3 pt-2">
                <h2 className="font-serif text-lg font-bold text-slate-900">About the Position</h2>
                <div className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                  {job.fullDescription}
                </div>
              </div>

              {/* Responsibilities */}
              {job.responsibilities && job.responsibilities.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h2 className="font-serif text-lg font-bold text-slate-900">Key Responsibilities</h2>
                  <ul className="space-y-2 text-xs sm:text-sm text-slate-600">
                    {job.responsibilities.map((resp, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#E51F3E] mt-2 shrink-0"></div>
                        <span>{resp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Requirements */}
              {job.requirements && job.requirements.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h2 className="font-serif text-lg font-bold text-slate-900">Requirements & Qualifications</h2>
                  <ul className="space-y-2 text-xs sm:text-sm text-slate-600">
                    {job.requirements.map((req, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Skills Tags */}
              {job.skills && job.skills.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h2 className="font-serif text-lg font-bold text-slate-900">Required Skills</h2>
                  <div className="flex flex-wrap gap-1.5">
                    {job.skills.map((skill, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 rounded-full bg-rose-50/80 text-slate-800 text-xs font-semibold border border-rose-100"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Benefits */}
              {job.benefits && job.benefits.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <h2 className="font-serif text-lg font-bold text-slate-900">Benefits & Perks</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {job.benefits.map((benefit, i) => (
                      <div
                        key={i}
                        className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5 text-xs sm:text-sm text-slate-700"
                      >
                        <Sparkles className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                        <span>{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bottom Apply CTA Card */}
              <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#0B1B3D] to-[#16274E] text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md mt-6">
                <div className="space-y-1 text-center sm:text-left">
                  <h3 className="font-serif text-lg sm:text-xl font-bold">Ready to make an impact?</h3>
                  <p className="text-xs sm:text-sm text-slate-300">
                    Apply today and join Wonderful Jodi in building trusted matrimonial bonds for doctors.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full sm:w-auto">
                  <button
                    onClick={() => {
                      setIsApplyModalOpen(true);
                      setApplySuccess(false);
                      setApplyError(null);
                    }}
                    className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#E51F3E] text-white text-xs sm:text-sm font-bold hover:bg-[#CE102F] transition shadow-xs flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>Apply Now</span>
                  </button>

                  {job.applicationEmail && (
                    <a
                      href={`mailto:${job.applicationEmail}?subject=Application for ${encodeURIComponent(
                        job.title
                      )}`}
                      className="w-full sm:w-auto px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition text-center border border-white/20"
                    >
                      Email Resume
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── MODAL: APPLY NOW ─── */}
      {isApplyModalOpen && job && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsApplyModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            {applySuccess ? (
              <div className="py-8 text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="font-serif text-xl font-bold text-slate-900">Application Received!</h3>
                <p className="text-sm text-slate-600 max-w-sm mx-auto leading-relaxed">
                  Thank you for applying for the <strong>{job.title}</strong> position. Our recruiting team will
                  review your application and get in touch with you shortly.
                </p>
                <button
                  onClick={() => setIsApplyModalOpen(false)}
                  className="mt-2 px-6 py-2.5 rounded-full bg-[#0B1B3D] text-white text-xs font-bold hover:bg-slate-800 transition"
                >
                  Close Window
                </button>
              </div>
            ) : (
              <form onSubmit={handleApplicationSubmit} className="space-y-4">
                <div>
                  <span className="text-[11px] font-bold text-[#E51F3E] tracking-wider uppercase">
                    Submit Application
                  </span>
                  <h3 className="font-serif text-xl font-bold text-slate-900 mt-0.5">
                    {job.title}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {job.department} • {job.location} • {job.workMode}
                  </p>
                </div>

                {applyError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                    <span>{applyError}</span>
                  </div>
                )}

                <div className="space-y-3 pt-1 text-left">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={candidateName}
                        onChange={(e) => setCandidateName(e.target.value)}
                        placeholder="e.g. Dr. Aryan Deshmukh"
                        className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#E51F3E]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Email Address <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="doctor@example.com"
                          className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#E51F3E]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Mobile Number <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="tel"
                          required
                          value={mobile}
                          onChange={(e) => setMobile(e.target.value)}
                          placeholder="+91 98765 43210"
                          className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#E51F3E]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Experience (Years)
                      </label>
                      <input
                        type="text"
                        value={experienceYears}
                        onChange={(e) => setExperienceYears(e.target.value)}
                        placeholder="e.g. 3 years"
                        className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#E51F3E]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Resume Link / Drive URL
                      </label>
                      <div className="relative">
                        <FileText className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="url"
                          value={resumeUrl}
                          onChange={(e) => setResumeUrl(e.target.value)}
                          placeholder="https://drive.google.com/..."
                          className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#E51F3E]"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Cover Note
                    </label>
                    <textarea
                      rows={3}
                      value={coverLetter}
                      onChange={(e) => setCoverLetter(e.target.value)}
                      placeholder="Why are you a good fit for Wonderful Jodi?"
                      className="w-full p-3 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#E51F3E]"
                    ></textarea>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsApplyModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2 rounded-xl bg-[#E51F3E] text-white text-xs font-bold hover:bg-[#CE102F] transition shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Submit Application</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
