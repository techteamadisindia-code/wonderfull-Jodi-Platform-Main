'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Share2,
  Check,
  Stethoscope,
  ShieldCheck,
  Sparkles,
  BookOpen,
  ArrowRight,
  AlertCircle,
  Eye,
  User,
  Heart,
  Search,
} from 'lucide-react';
import { fetchPublicBlogBySlug, BlogPost } from '../../../services/blogApi';

export default function BlogDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [post, setPost] = useState<BlogPost | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [notFoundError, setNotFoundError] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!slug) return;
    let isMounted = true;
    setLoading(true);
    setNotFoundError(false);

    fetchPublicBlogBySlug(slug)
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.data) {
          setPost(res.data);
          setRelatedPosts(res.relatedPosts || []);
        } else {
          setNotFoundError(true);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Error fetching blog detail:', err);
        setNotFoundError(true);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [slug]);

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleShareWhatsApp = () => {
    if (typeof window !== 'undefined' && post) {
      const text = encodeURIComponent(`Read this article on Wonderful Jodi Matrimony: ${post.title}\n\n${window.location.href}`);
      window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
    }
  };

  const handleShareTwitter = () => {
    if (typeof window !== 'undefined' && post) {
      const text = encodeURIComponent(`${post.title} via @WonderfulJodi`);
      const url = encodeURIComponent(window.location.href);
      window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
    }
  };

  const handleShareLinkedIn = () => {
    if (typeof window !== 'undefined') {
      const url = encodeURIComponent(window.location.href);
      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank');
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Recently Published';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // ─── NOT FOUND 404 STATE ───
  if (!loading && notFoundError) {
    return (
      <main className="min-h-[75vh] flex items-center justify-center bg-[#FFFDFB] px-4 py-16">
        <div className="max-w-md w-full text-center bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-sm space-y-5">
          <div className="w-16 h-16 rounded-3xl bg-rose-50 text-[#E51F3E] flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900">Article Unavailable</h1>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
            The article you are looking for does not exist, has been archived, or is currently in draft review.
          </p>
          <div className="pt-2">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-[#E51F3E] transition shadow-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Blog Articles</span>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FFFDFB] text-slate-900 pb-20">
      {/* ─── HEADER BREADCRUMBS & HERO ─── */}
      <section className="bg-gradient-to-b from-[#0B1120] to-[#111827] text-white pt-10 pb-16 px-4 sm:px-6 lg:px-8 border-b border-slate-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(229,31,62,0.12),transparent_50%)] pointer-events-none" />

        <div className="max-w-4xl mx-auto space-y-6 relative z-10">
          {/* Top Navigation Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
            <Link
              href="/blog"
              className="inline-flex items-center gap-1.5 font-bold text-slate-300 hover:text-[#E51F3E] transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>All Articles</span>
            </Link>

            {/* Breadcrumb path */}
            <div className="hidden sm:flex items-center gap-2 text-slate-500 text-[11px]">
              <Link href="/" className="hover:text-slate-300">Home</Link>
              <span>/</span>
              <Link href="/blog" className="hover:text-slate-300">Blog</Link>
              {post?.category && (
                <>
                  <span>/</span>
                  <span className="text-slate-300 truncate max-w-[150px]">{post.category}</span>
                </>
              )}
            </div>
          </div>

          {loading ? (
            <div className="space-y-4 animate-pulse pt-4">
              <div className="w-32 h-6 bg-slate-800 rounded-full" />
              <div className="w-full h-12 bg-slate-800 rounded-xl" />
              <div className="w-2/3 h-8 bg-slate-800 rounded-xl" />
              <div className="flex gap-4 pt-2">
                <div className="w-24 h-4 bg-slate-800 rounded-md" />
                <div className="w-24 h-4 bg-slate-800 rounded-md" />
              </div>
            </div>
          ) : (
            post && (
              <div className="space-y-4 pt-2">
                {/* Category & Featured Tag */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold uppercase tracking-wider">
                    {post.category}
                  </span>
                  {post.isFeatured && (
                    <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold">
                      ★ Featured Insight
                    </span>
                  )}
                </div>

                {/* Main Article Title */}
                <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight">
                  {post.title}
                </h1>

                {/* Excerpt subtitle */}
                <p className="text-slate-300 text-sm sm:text-base leading-relaxed font-light max-w-3xl">
                  {post.excerpt}
                </p>

                {/* Author & Meta Bar */}
                <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#E51F3E] to-rose-400 text-white font-bold flex items-center justify-center text-sm shadow-md">
                      {post.authorName.charAt(0)}
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-bold text-white">{post.authorName}</div>
                      <div className="text-[11px] text-slate-400">{post.authorRole}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span className="inline-flex items-center gap-1.5 text-rose-400 font-semibold">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(post.publishedAt)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {post.readingTime}
                    </span>
                    {post.viewCount > 0 && (
                      <span className="hidden sm:inline-flex items-center gap-1 text-slate-400">
                        <Eye className="w-3.5 h-3.5" />
                        {post.viewCount} views
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      </section>

      {/* ─── ARTICLE BODY CONTAINER ─── */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-20 space-y-10">
        {loading ? (
          <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm animate-pulse space-y-6">
            <div className="w-full h-80 bg-slate-200 rounded-2xl" />
            <div className="space-y-3">
              <div className="w-full h-4 bg-slate-200 rounded-md" />
              <div className="w-full h-4 bg-slate-200 rounded-md" />
              <div className="w-3/4 h-4 bg-slate-200 rounded-md" />
            </div>
          </div>
        ) : (
          post && (
            <>
              <article className="bg-white rounded-3xl p-6 sm:p-10 lg:p-12 border border-rose-100 shadow-xl shadow-slate-900/5 space-y-8">
                {/* Featured Cover Image */}
                <div className="relative w-full h-[280px] sm:h-[400px] lg:h-[460px] rounded-2xl overflow-hidden bg-slate-900 shadow-md">
                  <img
                    src={post.featuredImageUrl || 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1200&q=80'}
                    alt={post.title}
                    className="w-full h-full object-cover object-center"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1200&q=80';
                    }}
                  />
                  <div className="absolute bottom-3 right-3 px-3 py-1 rounded-lg bg-black/60 backdrop-blur-md text-white text-[11px] font-medium flex items-center gap-1.5">
                    <Stethoscope className="w-3.5 h-3.5 text-rose-400" />
                    <span>Wonderful Jodi Editorial</span>
                  </div>
                </div>

                {/* Social Share & Floating Actions Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 py-3 border-y border-slate-100 text-xs">
                  <span className="font-semibold text-slate-500 uppercase tracking-wider text-[11px]">
                    Share this article
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyLink}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition"
                      title="Copy Article URL"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Link Copied!' : 'Copy Link'}</span>
                    </button>
                    <button
                      onClick={handleShareWhatsApp}
                      className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold transition"
                      title="Share to WhatsApp"
                    >
                      WhatsApp
                    </button>
                    <button
                      onClick={handleShareTwitter}
                      className="px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold transition"
                      title="Share to X / Twitter"
                    >
                      X (Twitter)
                    </button>
                    <button
                      onClick={handleShareLinkedIn}
                      className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold transition"
                      title="Share to LinkedIn"
                    >
                      LinkedIn
                    </button>
                  </div>
                </div>

                {/* Safe Sanitized Article Content */}
                <div
                  className="prose prose-slate max-w-none prose-headings:font-serif prose-headings:font-bold prose-headings:text-slate-900 prose-h2:text-2xl sm:prose-h2:text-3xl prose-h2:mt-8 prose-h2:mb-4 prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3 prose-p:text-slate-700 prose-p:text-base sm:prose-p:text-[16.5px] prose-p:leading-relaxed prose-p:mb-5 prose-blockquote:border-l-4 prose-blockquote:border-[#E51F3E] prose-blockquote:bg-rose-50/60 prose-blockquote:p-4 prose-blockquote:rounded-r-xl prose-blockquote:italic prose-blockquote:text-slate-800 prose-li:text-slate-700 prose-li:my-1.5"
                  dangerouslySetInnerHTML={{ __html: post.content }}
                />

                {/* Tags */}
                {post.tags && post.tags.length > 0 && (
                  <div className="pt-6 border-t border-slate-100 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-slate-400">Tags:</span>
                    {post.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Author Bio Box */}
                <div className="mt-8 p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-rose-50/80 to-amber-50/40 border border-rose-100 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#E51F3E] to-rose-400 text-white font-bold flex items-center justify-center text-xl shadow-md shrink-0">
                    {post.authorName.charAt(0)}
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 text-sm sm:text-base">{post.authorName}</h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-200 text-rose-800 font-bold">
                        Author
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium">{post.authorRole}</p>
                    <p className="text-xs text-slate-500 leading-relaxed pt-1">
                      Contributing matrimonial insights, clinical relationship guidance, and advice for doctors and medical families across India on Wonderful Jodi.
                    </p>
                  </div>
                </div>
              </article>

              {/* ─── RELATED ARTICLES SECTION ─── */}
              {relatedPosts && relatedPosts.length > 0 && (
                <div className="space-y-6 pt-6">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <h3 className="font-serif text-xl sm:text-2xl font-bold text-slate-900">
                      Related Matrimony Articles
                    </h3>
                    <Link
                      href="/blog"
                      className="text-xs font-bold text-[#E51F3E] hover:underline flex items-center gap-1"
                    >
                      <span>View All Articles</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {relatedPosts.map((rPost) => (
                      <article
                        key={rPost._id}
                        className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-lg transition-all duration-200 flex flex-col justify-between group"
                      >
                        <div>
                          <div className="relative h-36 w-full bg-slate-100 overflow-hidden">
                            <img
                              src={rPost.featuredImageUrl || 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=600&q=80'}
                              alt={rPost.title}
                              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=600&q=80';
                              }}
                            />
                            <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-[#0B1120]/80 text-white text-[10px] font-bold">
                              {rPost.category}
                            </span>
                          </div>
                          <div className="p-4 space-y-2">
                            <div className="text-[10.5px] text-rose-600 font-semibold flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>{formatDate(rPost.publishedAt)}</span>
                            </div>
                            <Link href={`/blog/${rPost.slug}`}>
                              <h4 className="font-serif text-sm font-bold text-slate-900 group-hover:text-[#E51F3E] transition line-clamp-2 leading-snug">
                                {rPost.title}
                              </h4>
                            </Link>
                            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                              {rPost.excerpt}
                            </p>
                          </div>
                        </div>
                        <div className="p-4 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                          <span className="text-[11px] text-slate-400">{rPost.readingTime}</span>
                          <Link
                            href={`/blog/${rPost.slug}`}
                            className="font-bold text-[#E51F3E] hover:underline flex items-center gap-0.5 text-xs"
                          >
                            <span>Read</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              )}

              {/* ─── BOTTOM CTA CARD ─── */}
              <section className="rounded-3xl bg-gradient-to-br from-[#0B1120] via-[#1E293B] to-[#0B1120] text-white p-8 sm:p-10 border border-slate-800 shadow-xl relative overflow-hidden">
                <div className="max-w-2xl space-y-4 relative z-10">
                  <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-bold border border-rose-500/30">
                    Trusted by 10,000+ Doctors & Medical Families
                  </span>
                  <h3 className="font-serif text-2xl sm:text-3xl font-bold leading-snug">
                    Looking for a Compatible Doctor Match?
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Create your profile on Wonderful Jodi to connect with verified physicians, surgeons, specialists, and prestigious medical families. Complete confidentiality guaranteed.
                  </p>
                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    <Link
                      href="/register"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#E51F3E] to-[#F03554] text-white font-bold text-xs hover:shadow-lg transition"
                    >
                      <span>Create Free Profile</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                    <Link
                      href="/blog"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-slate-300" />
                      <span>More Articles</span>
                    </Link>
                  </div>
                </div>
              </section>
            </>
          )
        )}
      </div>
    </main>
  );
}
