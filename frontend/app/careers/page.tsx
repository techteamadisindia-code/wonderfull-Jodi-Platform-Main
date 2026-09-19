'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Briefcase,
  ArrowLeft,
  MapPin,
  Clock,
  Building2,
  Calendar,
  Search,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Send,
  X,
  FileText,
  User,
  Mail,
  Phone,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import {
  JobOpening,
  fetchPublicCareers,
  submitApplication,
} from '../../services/careerApi';

export default function CareersPage() {
  const [jobs, setJobs] = useState<JobOpening[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [selectedWorkMode, setSelectedWorkMode] = useState('All');

  // Application Modal state
  const [applyingJob, setApplyingJob] = useState<JobOpening | null>(null);
  const [candidateName, setCandidateName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [resumeUrl, setResumeUrl] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  const loadCareers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchPublicCareers({
        department: selectedDepartment !== 'All' ? selectedDepartment : undefined,
        workMode: selectedWorkMode !== 'All' ? selectedWorkMode : undefined,
        search: searchQuery.trim() || undefined,
      });
      if (res.success) {
        setJobs(res.data);
        if (res.departments && res.departments.length > 0) {
          setDepartments(res.departments);
        }
      } else {
        setError('Unable to load career openings. Please try again.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to connect to the career server. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCareers();
  }, [selectedDepartment, selectedWorkMode]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadCareers();
  };

  const handleOpenApplyModal = (job: JobOpening) => {
    setApplyingJob(job);
    setCandidateName('');
    setEmail('');
    setMobile('');
    setExperienceYears('');
    setResumeUrl('');
    setCoverLetter('');
    setApplySuccess(false);
    setApplyError(null);
  };

  const handleCloseApplyModal = () => {
    setApplyingJob(null);
    setApplySuccess(false);
    setApplyError(null);
  };

  const handleApplicationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyingJob) return;

    if (!candidateName.trim()) {
      setApplyError('Please enter your full name.');
      return;
    }
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setApplyError('Please enter a valid email address.');
      return;
    }
    if (!mobile.trim() || mobile.trim().length < 8) {
      setApplyError('Please provide a valid contact number.');
      return;
    }

    try {
      setSubmitting(true);
      setApplyError(null);
      const res = await submitApplication(applyingJob.slug, {
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
        {/* Back to Home Link */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-[#E51F3E] transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1 text-[#E51F3E]" />
            <span>Back to Home</span>
          </Link>
        </div>

        {/* Main Careers Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-rose-100/80 shadow-sm space-y-6">
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-[#E51F3E] flex items-center justify-center shrink-0 shadow-xs ring-1 ring-rose-100">
                <Briefcase className="w-6 h-6" />
              </div>
              <div>
                <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  Careers at Wonderful Jodi
                </h1>
                <p className="text-xs sm:text-sm font-medium text-[#E51F3E] mt-0.5">
                  Build the future of doctor-focused matrimonial matchmaking
                </p>
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200/80 text-xs font-medium text-slate-600 self-start sm:self-auto">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>We're Hiring Doctors & Tech Leaders</span>
            </div>
          </div>

          {/* Introduction Text */}
          <div className="prose prose-slate max-w-none">
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
              We are looking for passionate, responsible, and talented individuals to help us build a secure and
              meaningful matrimonial platform for medical professionals and families. Join our mission of creating
              lifelong unions for educated healthcare practitioners across India and worldwide.
            </p>
          </div>

          {/* Filter & Search Bar */}
          <div className="pt-2 space-y-3">
            <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by role, skill, or keyword..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-[#E51F3E] transition bg-slate-50/50"
                />
              </div>

              <div className="flex gap-2">
                <select
                  value={selectedWorkMode}
                  onChange={(e) => setSelectedWorkMode(e.target.value)}
                  className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium text-slate-700 bg-white focus:outline-hidden focus:border-[#E51F3E]"
                >
                  <option value="All">All Work Modes</option>
                  <option value="Remote">Remote</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="On-site">On-site</option>
                </select>

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#0B1B3D] text-white text-xs sm:text-sm font-semibold hover:bg-slate-800 transition"
                >
                  Search
                </button>
              </div>
            </form>

            {/* Department Pills */}
            {departments.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-xs font-semibold text-slate-500 mr-1">Department:</span>
                <button
                  onClick={() => setSelectedDepartment('All')}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                    selectedDepartment === 'All'
                      ? 'bg-[#E51F3E] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All Roles
                </button>
                {departments.map((dept) => (
                  <button
                    key={dept}
                    onClick={() => setSelectedDepartment(dept)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                      selectedDepartment === dept
                        ? 'bg-[#E51F3E] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {dept}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Section Heading */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-lg sm:text-xl font-bold text-slate-900">
                Open Opportunities
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-[#E51F3E] text-xs font-bold border border-rose-100">
                {jobs.length} Active
              </span>
            </div>

            <button
              onClick={loadCareers}
              title="Refresh openings"
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#E51F3E]' : ''}`} />
            </button>
          </div>

          {/* Loading Skeleton */}
          {loading && (
            <div className="space-y-4">
              {[1, 2, 3].map((n) => (
                <div key={n} className="p-5 rounded-2xl border border-slate-200/60 bg-white animate-pulse space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2 w-2/3">
                      <div className="h-5 bg-slate-200 rounded-md w-1/2"></div>
                      <div className="h-3 bg-slate-100 rounded-md w-1/3"></div>
                    </div>
                    <div className="h-8 bg-slate-200 rounded-full w-24"></div>
                  </div>
                  <div className="h-4 bg-slate-100 rounded-md w-full"></div>
                </div>
              ))}
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="p-6 rounded-2xl bg-rose-50/70 border border-rose-200 text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
              <p className="text-sm font-semibold text-rose-900">{error}</p>
              <button
                onClick={loadCareers}
                className="px-4 py-2 rounded-xl bg-[#E51F3E] text-white text-xs font-bold hover:bg-[#CE102F] transition"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Job Openings List */}
          {!loading && !error && jobs.length > 0 && (
            <div className="space-y-4">
              {jobs.map((job) => {
                const deadlineFormatted = formatDate(job.applicationDeadline);
                const postedFormatted = formatDate(job.createdAt);

                return (
                  <div
                    key={job._id || job.slug}
                    className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/80 hover:border-rose-200 hover:shadow-md transition-all group relative overflow-hidden"
                  >
                    {/* Left vertical accent highlight */}
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#E51F3E] to-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      {/* Left: Job Meta & Info */}
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-serif text-base sm:text-lg font-bold text-slate-900 group-hover:text-[#E51F3E] transition-colors">
                            {job.title}
                          </h3>
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold">
                            {job.department}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-200/60">
                            {job.status === 'OPEN' ? 'Open' : job.status}
                          </span>
                        </div>

                        {/* Badges: Location, Work mode, Employment type */}
                        <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1 font-medium text-slate-600">
                            <MapPin className="w-3.5 h-3.5 text-rose-500" />
                            {job.location}
                          </span>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1 font-medium text-slate-600">
                            <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                            {job.workMode}
                          </span>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1 font-medium text-slate-600">
                            <Clock className="w-3.5 h-3.5 text-amber-500" />
                            {job.employmentType}
                          </span>
                          {job.experience && (
                            <>
                              <span>•</span>
                              <span className="font-medium text-slate-600">Exp: {job.experience}</span>
                            </>
                          )}
                        </div>

                        {/* Short Description */}
                        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed line-clamp-2 pt-1">
                          {job.shortDescription}
                        </p>

                        {/* Dates Footer */}
                        <div className="flex flex-wrap items-center gap-3 pt-2 text-[11px] text-slate-400">
                          {postedFormatted && (
                            <span>Posted {postedFormatted}</span>
                          )}
                          {deadlineFormatted && (
                            <>
                              <span>•</span>
                              <span className="text-rose-600 font-medium">
                                Apply by {deadlineFormatted}
                              </span>
                            </>
                          )}
                          {job.salaryRange && (
                            <>
                              <span>•</span>
                              <span className="font-medium text-slate-700">{job.salaryRange}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Right: Action Buttons */}
                      <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0 pt-2 sm:pt-0">
                        <button
                          onClick={() => handleOpenApplyModal(job)}
                          className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#E51F3E] text-white text-xs font-bold hover:bg-[#CE102F] transition shadow-xs flex items-center justify-center gap-1.5"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Apply Now</span>
                        </button>

                        <Link
                          href={`/careers/${job.slug}`}
                          className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition text-center flex items-center justify-center gap-1"
                        >
                          <span>View Details</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Professional Empty State */}
          {!loading && !error && jobs.length === 0 && (
            <div className="p-8 sm:p-12 rounded-3xl bg-slate-50/60 border border-slate-200/80 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Briefcase className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-lg font-bold text-slate-800">
                No current openings are available. Please check again later.
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                We regularly post new opportunities across Engineering, VIP Matchmaking, Compliance, and Customer
                Support. Feel free to send your resume to{' '}
                <a
                  href="mailto:careers@wonderfuljodi.com"
                  className="font-semibold text-[#E51F3E] hover:underline"
                >
                  careers@wonderfuljodi.com
                </a>
                .
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ─── MODAL: APPLY NOW ─── */}
      {applyingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto">
            {/* Close Button */}
            <button
              onClick={handleCloseApplyModal}
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
                  Thank you for applying for the <strong>{applyingJob.title}</strong> role at Wonderful Jodi. Our
                  talent acquisition team will review your credentials and contact you shortly.
                </p>
                <button
                  onClick={handleCloseApplyModal}
                  className="mt-2 px-6 py-2.5 rounded-full bg-[#0B1B3D] text-white text-xs font-bold hover:bg-slate-800 transition"
                >
                  Close Window
                </button>
              </div>
            ) : (
              <form onSubmit={handleApplicationSubmit} className="space-y-4">
                <div>
                  <span className="text-[11px] font-bold text-[#E51F3E] tracking-wider uppercase">
                    Wonderful Jodi Careers
                  </span>
                  <h3 className="font-serif text-xl font-bold text-slate-900 mt-0.5">
                    Apply: {applyingJob.title}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {applyingJob.department} • {applyingJob.location} • {applyingJob.workMode}
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
                        placeholder="e.g. Dr. Aryan Deshmukh / Sarah Khan"
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
                        Relevant Experience
                      </label>
                      <input
                        type="text"
                        value={experienceYears}
                        onChange={(e) => setExperienceYears(e.target.value)}
                        placeholder="e.g. 3 years in healthcare IT"
                        className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#E51F3E]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Resume URL / Drive Link
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
                      Cover Note / Why Wonderful Jodi?
                    </label>
                    <textarea
                      rows={3}
                      value={coverLetter}
                      onChange={(e) => setCoverLetter(e.target.value)}
                      placeholder="Briefly describe your background, strengths, and interest in this role..."
                      className="w-full p-3 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#E51F3E]"
                    ></textarea>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleCloseApplyModal}
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
