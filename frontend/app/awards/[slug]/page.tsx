'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Trophy,
  Calendar,
  Building2,
  Tag,
  ExternalLink,
  Share2,
  Check,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Images,
  Award as AwardIcon,
} from 'lucide-react';
import { fetchPublicAwardBySlug, Award } from '../../../services/awardApi';

export default function AwardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [award, setAward] = useState<Award | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let isMounted = true;
    setLoading(true);
    setNotFound(false);
    setError(null);

    fetchPublicAwardBySlug(slug)
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.data) {
          setAward(res.data);
          setSelectedImage(res.data.logo);
        } else {
          setNotFound(true);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Error fetching award details:', err);
        setNotFound(true);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [slug]);

  const handleShare = async () => {
    if (typeof window === 'undefined') return;
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: award ? `${award.name} - Wonderful Jodi` : 'Award - Wonderful Jodi',
          text: award?.shortDescription || 'Check out this prestigious recognition on Wonderful Jodi',
          url,
        });
        return;
      } catch {
        // User cancelled or failed
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  // Loading Skeleton State
  if (loading) {
    return (
      <main className="min-h-screen bg-[#FAF8F5] py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="w-32 h-6 bg-slate-200 rounded animate-pulse" />
          <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/60 shadow-xs space-y-8 animate-pulse">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="w-36 h-36 bg-slate-100 rounded-2xl" />
              <div className="flex-1 space-y-3 text-center sm:text-left">
                <div className="w-24 h-4 bg-slate-100 rounded" />
                <div className="w-3/4 h-8 bg-slate-100 rounded" />
                <div className="w-1/2 h-4 bg-slate-100 rounded" />
              </div>
            </div>
            <div className="space-y-3 pt-6 border-t border-slate-100">
              <div className="w-full h-4 bg-slate-100 rounded" />
              <div className="w-full h-4 bg-slate-100 rounded" />
              <div className="w-2/3 h-4 bg-slate-100 rounded" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Not Found or Error State
  if (notFound || !award) {
    return (
      <main className="min-h-screen bg-[#FAF8F5] py-16 px-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200/80 shadow-md text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-rose-50 text-[#E51F3E] flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h1 className="font-serif text-2xl font-bold text-slate-900">Award Not Found</h1>
            <p className="text-sm text-slate-500">
              The award recognition you are looking for is either inactive, moved, or does not exist.
            </p>
          </div>
          <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/awards"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 h-11 rounded-full bg-[#0F172A] text-white text-sm font-semibold hover:bg-slate-800 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>All Awards</span>
            </Link>
            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 h-11 rounded-full bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const allGalleryImages = [
    award.logo,
    ...(award.galleryImages && Array.isArray(award.galleryImages) ? award.galleryImages : []),
  ].filter(Boolean);

  return (
    <main className="min-h-screen bg-[#FAF8F5] py-8 sm:py-14 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation & Actions Bar */}
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/awards"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-[#E51F3E] transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Awards</span>
          </Link>

          <button
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:border-slate-300 hover:bg-slate-50 shadow-2xs transition active:scale-95"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-600">Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Share</span>
              </>
            )}
          </button>
        </div>

        {/* Main Award Showcase Card */}
        <article className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-[#1e293b] p-6 sm:p-10 text-white relative overflow-hidden">
            <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-[#E51F3E]/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-8 text-center md:text-left">
              {/* Large Award Logo Container */}
              <div className="relative shrink-0">
                <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl bg-white p-3.5 shadow-xl flex items-center justify-center border-2 border-white/20">
                  <img
                    src={selectedImage || award.logo}
                    alt={award.name}
                    className="w-full h-full object-contain filter contrast-105"
                  />
                </div>
                <div className="absolute -bottom-2 -right-2 bg-amber-500 text-white text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full shadow-md flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>{award.awardYear}</span>
                </div>
              </div>

              {/* Title, Organization, and Metadata */}
              <div className="flex-1 space-y-3">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                  <span className="px-3 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[11px] font-bold uppercase tracking-wider">
                    {award.category || 'Recognition'}
                  </span>
                  {award.isFeatured && (
                    <span className="px-3 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] font-bold">
                      Featured Award
                    </span>
                  )}
                </div>

                <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight">
                  {award.name}
                </h1>

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs sm:text-sm text-slate-300 font-medium">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-amber-400" />
                    <span>Conferred by: <strong className="text-white">{award.organization}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-amber-400" />
                    <span>Year: {award.awardYear}</span>
                  </div>
                </div>

                {award.websiteUrl && (
                  <div className="pt-2">
                    <a
                      href={award.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-xs border border-white/15 transition-colors"
                    >
                      <span>Visit Official Website</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Description & Details Content */}
          <div className="p-6 sm:p-10 space-y-8">
            {/* Short Summary Highlight */}
            {award.shortDescription && (
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/60 border border-amber-200/70">
                <p className="text-xs sm:text-sm font-medium text-amber-950 leading-relaxed">
                  "{award.shortDescription}"
                </p>
              </div>
            )}

            {/* Full Citation / Description */}
            <div className="space-y-3">
              <h2 className="font-serif text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                <span>Citation & Official Recognition Details</span>
              </h2>
              <div className="text-sm sm:text-[15px] text-slate-700 leading-relaxed whitespace-pre-line font-normal">
                {award.fullDescription || award.shortDescription}
              </div>
            </div>

            {/* Gallery Images (If available) */}
            {allGalleryImages.length > 1 && (
              <div className="space-y-4 pt-6 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Images className="w-4 h-4 text-slate-600" />
                    <span>Ceremony & Verification Gallery</span>
                  </h3>
                  <span className="text-xs text-slate-400">{allGalleryImages.length} photos</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {allGalleryImages.map((imgUrl, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImage(imgUrl)}
                      className={`relative aspect-video rounded-xl overflow-hidden border-2 transition-all p-1 bg-slate-50 ${
                        selectedImage === imgUrl
                          ? 'border-[#E51F3E] ring-2 ring-[#E51F3E]/20'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <img
                        src={imgUrl}
                        alt={`${award.name} gallery image ${idx + 1}`}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Authenticity & Verification Badge */}
            <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/80 p-5 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                    Verified Editorial & Organizational Honor
                  </h4>
                  <p className="text-[11px] sm:text-xs text-slate-500">
                    This honor is recorded in Wonderful Jodi's official archives and verified by executive administration.
                  </p>
                </div>
              </div>

              <Link
                href="/awards"
                className="inline-flex items-center gap-2 px-5 h-10 rounded-full bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition shrink-0 shadow-2xs"
              >
                <span>View All Awards</span>
              </Link>
            </div>
          </div>
        </article>
      </div>
    </main>
  );
}
