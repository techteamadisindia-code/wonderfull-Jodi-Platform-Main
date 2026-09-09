'use client';

import React, { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  FileSpreadsheet,
  ArrowLeft,
  Download,
  Sparkles,
  CheckCircle2,
  Share2,
  Save,
  Eye,
  Layers,
  Clock,
  RefreshCw,
  FolderOpen,
  MessageCircle,
  AlertCircle,
  Stethoscope,
  X,
} from 'lucide-react';
import { getAuthToken } from '../../lib/api';
import {
  fetchBiodataProfile,
  fetchMyBiodatas,
  createBiodata,
  updateBiodata,
  deleteBiodata,
  generateBiodataPdf,
  getBiodataPdfDownloadUrl,
  BiodataRecord,
} from '../../services/biodataApi';
import { TemplateSelector, BiodataTemplateId } from '../../components/biodata/TemplateSelector';
import { BiodataForm } from '../../components/biodata/BiodataForm';
import { BiodataPreview } from '../../components/biodata/BiodataPreview';
import { WhatsAppShareModal } from '../../components/biodata/WhatsAppShareModal';
import { MyBiodatasModal } from '../../components/biodata/MyBiodatasModal';

function BiodataMakerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Authentication & View States
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [inEditor, setInEditor] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Biodata Records & Active Draft
  const [biodatas, setBiodatas] = useState<BiodataRecord[]>([]);
  const [activeBiodata, setActiveBiodata] = useState<Partial<BiodataRecord> | null>(null);
  const [availablePhotos, setAvailablePhotos] = useState<string[]>([]);

  // Auto-Save & Actions State
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [generatingPdf, setGeneratingPdf] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modals
  const [showShareModal, setShowShareModal] = useState(false);
  const [showMyBiodatasModal, setShowMyBiodatasModal] = useState(false);
  const [showFullscreenPreview, setShowFullscreenPreview] = useState(false);

  // Debounce Ref
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Check auth and load profile on mount
  useEffect(() => {
    const token = getAuthToken();
    const loggedIn = Boolean(token);
    setIsAuthenticated(loggedIn);

    // If query string has ?start=true or ?id=... or user is already logged in, initialize editor
    const shouldStart = searchParams.get('start') === 'true';
    const targetId = searchParams.get('id');

    if (loggedIn) {
      loadUserData(targetId, shouldStart);
    } else {
      setLoading(false);
    }
  }, [searchParams]);

  const loadUserData = async (targetId?: string | null, forceStart: boolean = false) => {
    setLoading(true);
    try {
      // 1. Fetch user's existing biodatas
      const existing = await fetchMyBiodatas().catch(() => []);
      setBiodatas(existing);

      // 2. Fetch profile data for auto-population
      const profileData = await fetchBiodataProfile().catch(() => null);
      if (profileData?.additionalPhotos) {
        setAvailablePhotos(profileData.additionalPhotos);
      } else if (profileData?.photoUrl) {
        setAvailablePhotos([profileData.photoUrl]);
      }

      if (targetId) {
        const found = existing.find((b) => b._id === targetId);
        if (found) {
          setActiveBiodata(found);
          setInEditor(true);
          return;
        }
      }

      if (existing.length > 0) {
        // Load latest biodata
        setActiveBiodata(existing[0]);
        setInEditor(true);
      } else if (profileData) {
        // Initialize new biodata with profile data
        const initialDraft: Partial<BiodataRecord> = {
          ...profileData,
          templateId: 'doctor_professional',
          title: `${profileData.personalDetails?.fullName || 'Doctor'}'s Matrimonial Biodata`,
          status: 'DRAFT',
        };
        const created = await createBiodata(initialDraft);
        setActiveBiodata(created);
        setBiodatas([created]);
        setInEditor(true);
      } else if (forceStart) {
        setInEditor(true);
      }
    } catch (err) {
      console.error('Failed to load biodata user data:', err);
      showToast('Could not load profile data. Please verify your connection.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Start Creating Button Click
  const handleStartCreating = () => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/biodata-maker?start=true');
      return;
    }

    if (activeBiodata) {
      setInEditor(true);
    } else {
      loadUserData(null, true);
    }
  };

  // Auto-Save Function
  const saveBiodataChanges = useCallback(
    async (updated: Partial<BiodataRecord>) => {
      if (!updated._id) return;
      setSaveStatus('saving');
      try {
        const saved = await updateBiodata(updated._id, updated);
        setActiveBiodata(saved);
        setBiodatas((prev) => prev.map((b) => (b._id === saved._id ? saved : b)));
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2500);
      } catch (err) {
        console.error('Failed to auto-save biodata:', err);
        setSaveStatus('error');
      }
    },
    []
  );

  // Form Change Handler with Debounce
  const handleFormChange = (updates: Partial<BiodataRecord>) => {
    setActiveBiodata((prev: any) => {
      const merged = { ...prev, ...updates };

      // Clear previous timer
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Schedule auto-save after 700ms of inactivity
      saveTimeoutRef.current = setTimeout(() => {
        saveBiodataChanges(merged);
      }, 700);

      return merged;
    });
  };

  // Manual Save Draft Button
  const handleManualSave = async () => {
    if (!activeBiodata) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    setSaveStatus('saving');
    try {
      if (activeBiodata._id) {
        const saved = await updateBiodata(activeBiodata._id, activeBiodata);
        setActiveBiodata(saved);
        setBiodatas((prev) => prev.map((b) => (b._id === saved._id ? saved : b)));
      } else {
        const created = await createBiodata(activeBiodata);
        setActiveBiodata(created);
        setBiodatas((prev) => [created, ...prev]);
      }
      setSaveStatus('saved');
      showToast('Biodata saved successfully! ✓', 'success');
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch {
      setSaveStatus('error');
      showToast('Failed to save biodata draft.', 'error');
    }
  };

  // Create New Fresh Biodata
  const handleCreateNewBiodata = async () => {
    try {
      setLoading(true);
      const profileData = await fetchBiodataProfile().catch(() => null);
      const initialDraft: Partial<BiodataRecord> = {
        ...(profileData || {}),
        templateId: 'doctor_professional',
        title: `${profileData?.personalDetails?.fullName || 'Doctor'}'s Biodata (${biodatas.length + 1})`,
        status: 'DRAFT',
      };
      const created = await createBiodata(initialDraft);
      setActiveBiodata(created);
      setBiodatas((prev) => [created, ...prev]);
      setInEditor(true);
      showToast('New biodata draft initialized! ✓');
    } catch {
      showToast('Failed to initialize new biodata.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Delete Biodata
  const handleDeleteBiodata = async (id: string) => {
    await deleteBiodata(id);
    const updated = biodatas.filter((b) => b._id !== id);
    setBiodatas(updated);
    if (activeBiodata?._id === id) {
      if (updated.length > 0) {
        setActiveBiodata(updated[0]);
      } else {
        setActiveBiodata(null);
        setInEditor(false);
      }
    }
    showToast('Biodata deleted.');
  };

  // PDF Generation & Download
  const handleDownloadPdf = async (customBiodata?: BiodataRecord) => {
    const target = customBiodata || activeBiodata;
    if (!target?._id) return;

    setGeneratingPdf(true);
    try {
      await generateBiodataPdf(target._id, {
        templateId: target.templateId,
        sectionVisibility: target.sectionVisibility,
      });

      // Trigger native download
      const downloadUrl = getBiodataPdfDownloadUrl(target._id);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `Marriage_Biodata_${(target.personalDetails?.fullName || 'Doctor').replace(
        /\s+/g,
        '_'
      )}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      showToast('PDF downloaded successfully! ✓');
    } catch (err: any) {
      console.error('PDF Generation failed:', err);
      showToast('Failed to generate PDF. Please try again.', 'error');
    } finally {
      setGeneratingPdf(false);
    }
  };

  // ─── VIEW 1: INTRO / LANDING SCREEN (If not in editor mode) ───
  if (!inEditor) {
    return (
      <main className="min-h-screen bg-[#FAF7F4] py-7 sm:py-10 px-4 sm:px-6 lg:px-8 text-left">
        <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-600 hover:text-[#E51F3E] transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>

          <div className="bg-white rounded-2xl p-5 sm:p-8 border border-[#E8E1DB] shadow-2xs space-y-5 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-rose-50 text-[#E51F3E] flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="font-serif text-xl sm:text-2xl font-bold text-slate-900">
                    Marriage Biodata Maker
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500">
                    Create an exquisite matrimony biodata for easy WhatsApp sharing
                  </p>
                </div>
              </div>

              {isAuthenticated && biodatas.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowMyBiodatasModal(true)}
                  className="px-3.5 py-1.5 rounded-xl border border-[#E8E1DB] text-xs font-bold text-slate-700 hover:bg-slate-50 transition flex items-center gap-2 self-start sm:self-auto cursor-pointer"
                >
                  <FolderOpen className="w-4 h-4 text-[#E51F3E]" />
                  <span>My Saved Biodatas ({biodatas.length})</span>
                </button>
              )}
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Designed specifically for doctors, specialists, and verified families. Automatically pull your verified medical degrees, clinical practice affiliations, astrological coordinates, and family details into an elegant, shareable biodata.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
              <div className="p-3.5 bg-[#FAF7F4] rounded-xl border border-[#E8E1DB] space-y-1.5">
                <Sparkles className="w-4 h-4 text-[#E51F3E]" />
                <h3 className="font-bold text-xs sm:text-sm text-slate-900">4 Designer Templates</h3>
                <p className="text-[11px] text-slate-500">
                  Traditional Indian, Modern Minimalist, Royal Navy & Doctor Professional layouts.
                </p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5">
                <Download className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-xs sm:text-sm text-slate-900">Instant PDF Download</h3>
                <p className="text-[11px] text-slate-500">
                  Clean vector A4 printable PDF generator with profile photo embedding and page breaks.
                </p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5">
                <CheckCircle2 className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-xs sm:text-sm text-slate-900">100% Free & Private</h3>
                <p className="text-[11px] text-slate-500">
                  No hidden charges, no intrusive watermark, and complete privacy control over contact info.
                </p>
              </div>
            </div>

            <div className="pt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleStartCreating}
                disabled={loading}
                className="px-7 py-3.5 rounded-full bg-[#E51F3E] text-white text-xs sm:text-sm font-bold hover:bg-[#CE102F] transition shadow-md shadow-red-600/20 flex items-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Loading Profile...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Start Creating Biodata Free</span>
                  </>
                )}
              </button>

              {biodatas.length > 0 && (
                <button
                  type="button"
                  onClick={() => setInEditor(true)}
                  className="px-6 py-3 rounded-full border border-slate-300 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-100 transition"
                >
                  Continue Editing Draft
                </button>
              )}
            </div>
          </div>
        </div>

        {showMyBiodatasModal && (
          <MyBiodatasModal
            biodatas={biodatas}
            activeBiodataId={activeBiodata?._id}
            onClose={() => setShowMyBiodatasModal(false)}
            onSelect={(b) => {
              setActiveBiodata(b);
              setInEditor(true);
            }}
            onCreateNew={handleCreateNewBiodata}
            onDelete={handleDeleteBiodata}
            onDownloadPdf={handleDownloadPdf}
          />
        )}
      </main>
    );
  }

  // ─── VIEW 2: FULL-STACK BIODATA EDITOR & LIVE PREVIEW ───
  return (
    <main className="min-h-screen bg-[#FAF7F4] pb-14 text-left">
      {/* ── Top Editor Header & Action Bar ── */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E8E1DB] px-4 sm:px-8 py-2.5 shadow-2xs">
        <div className="max-w-[1500px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setInEditor(false)}
              className="p-1.5 rounded-xl border border-[#E8E1DB] text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              title="Back to Landing View"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-base sm:text-lg font-bold text-slate-900 leading-tight">
                  {activeBiodata?.title || 'Marriage Biodata Maker'}
                </h2>
                {saveStatus === 'saving' && (
                  <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Saving...</span>
                  </span>
                )}
                {saveStatus === 'saved' && (
                  <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Saved ✓</span>
                  </span>
                )}
                {saveStatus === 'error' && (
                  <span className="text-[10px] font-bold text-rose-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>Save failed</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Doctor Matrimonial Format • Real-time Auto-Save
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowMyBiodatasModal(true)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition flex items-center gap-1.5"
            >
              <FolderOpen className="w-3.5 h-3.5 text-slate-500" />
              <span>Drafts ({biodatas.length})</span>
            </button>

            <button
              type="button"
              onClick={handleManualSave}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5 text-slate-500" />
              <span>Save Draft</span>
            </button>

            <button
              type="button"
              onClick={() => setShowFullscreenPreview(true)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition flex items-center gap-1.5 md:hidden"
            >
              <Eye className="w-3.5 h-3.5 text-slate-500" />
              <span>Preview</span>
            </button>

            <button
              type="button"
              onClick={() => handleDownloadPdf()}
              disabled={generatingPdf}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              {generatingPdf ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowShareModal(true)}
              className="px-4 py-2 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Share WhatsApp</span>
            </button>
          </div>
        </div>
      </header>

      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed top-18 right-4 z-50 p-3 rounded-2xl border text-xs font-bold shadow-lg animate-fade-in flex items-center gap-2 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* ── Main Two-Column Layout ── */}
      <div className="max-w-[1500px] mx-auto pt-6 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: FORM & TEMPLATE SELECTOR (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Template Selector */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
              <TemplateSelector
                selectedTemplateId={(activeBiodata?.templateId as BiodataTemplateId) || 'doctor_professional'}
                onSelectTemplate={(tid) => handleFormChange({ templateId: tid })}
              />
            </div>

            {/* Editable Form */}
            {activeBiodata && (
              <BiodataForm
                biodata={activeBiodata}
                onChange={handleFormChange}
                availablePhotos={availablePhotos}
              />
            )}
          </div>

          {/* RIGHT COLUMN: STICKY LIVE PREVIEW (5 Cols) */}
          <div className="hidden lg:block lg:col-span-5 sticky top-22 space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Live Biodata Preview
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowFullscreenPreview(true)}
                className="text-xs font-semibold text-[#E51F3E] hover:underline flex items-center gap-1"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Fullscreen</span>
              </button>
            </div>

            {activeBiodata && <BiodataPreview biodata={activeBiodata} />}
          </div>
        </div>
      </div>

      {/* ── Fullscreen Preview Modal ── */}
      {showFullscreenPreview && activeBiodata && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 sticky top-0 bg-white/95 backdrop-blur-md z-10">
              <h3 className="font-serif text-lg font-bold text-slate-900">Biodata Preview</h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadPdf()}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowFullscreenPreview(false)}
                  className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <BiodataPreview biodata={activeBiodata} />
          </div>
        </div>
      )}

      {/* ── WhatsApp Share Modal ── */}
      {showShareModal && activeBiodata && (
        <WhatsAppShareModal
          biodata={activeBiodata}
          onClose={() => setShowShareModal(false)}
          onDownloadPdf={() => handleDownloadPdf()}
        />
      )}

      {/* ── My Biodatas Drawer / Modal ── */}
      {showMyBiodatasModal && (
        <MyBiodatasModal
          biodatas={biodatas}
          activeBiodataId={activeBiodata?._id}
          onClose={() => setShowMyBiodatasModal(false)}
          onSelect={(b) => setActiveBiodata(b)}
          onCreateNew={handleCreateNewBiodata}
          onDelete={handleDeleteBiodata}
          onDownloadPdf={handleDownloadPdf}
        />
      )}
    </main>
  );
}

export default function BiodataMakerPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#FAF7F4] flex items-center justify-center p-4">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-3 border-[#E51F3E] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-600">Loading marriage biodata maker...</p>
          </div>
        </main>
      }
    >
      <BiodataMakerContent />
    </Suspense>
  );
}
