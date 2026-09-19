'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  BookOpen,
  Search,
  X,
  Calendar,
  Clock,
  ArrowRight,
  ShieldCheck,
  Heart,
  Users,
  Sparkles,
  Share2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { fetchPublicBlogs, BlogPost, BlogCategoryItem } from '../../services/blogApi';

const DEFAULT_CATEGORIES = [
  'All',
  'Doctor Matrimony',
  'Marriage Advice',
  'Relationship Guidance',
  'Family & Compatibility',
  'Medical Professionals',
  'Verification & Safety',
  'Kundali & Astrology',
  'Wedding Planning',
];

export default function BlogHubPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<BlogCategoryItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [sortOption, setSortOption] = useState<'newest' | 'oldest' | 'popular' | 'readingTime'>('newest');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch blogs on filter/page change
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    fetchPublicBlogs({
      category: selectedCategory === 'All' ? undefined : selectedCategory,
      search: debouncedSearch.trim() || undefined,
      sort: sortOption,
      page,
      limit: 9,
    })
      .then((res) => {
        if (!isMounted) return;
        setPosts(res?.data || []);
        if (res?.categories) {
          setCategories(res.categories);
        }
        setTotalPages(res?.pagination?.totalPages || 1);
        setTotalCount(res?.pagination?.total || 0);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Error fetching blogs:', err);
        setError('Unable to load articles right now. Please check your connection and try again.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCategory, debouncedSearch, sortOption, page]);

  // Find top featured post for hero highlight (only on page 1 and without active search)
  const featuredPost = useMemo(() => {
    if (page === 1 && !debouncedSearch && selectedCategory === 'All') {
      return posts.find((p) => p.isFeatured) || posts[0];
    }
    return null;
  }, [posts, page, debouncedSearch, selectedCategory]);

  const gridPosts = useMemo(() => {
    if (featuredPost && page === 1 && !debouncedSearch && selectedCategory === 'All') {
      return posts.filter((p) => p._id !== featuredPost._id);
    }
    return posts;
  }, [posts, featuredPost, page, debouncedSearch, selectedCategory]);

  const handleClearFilters = () => {
    setSelectedCategory('All');
    setSearchQuery('');
    setSortOption('newest');
    setPage(1);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Recently Published';
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
    <main className="min-h-screen bg-[#FFFDFB] text-slate-900 pb-20">
      {/* ─── DOCTOR MATRIMONY HERO SECTION ─── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#0B1120] via-[#0F172A] to-[#0B1120] text-white pt-14 pb-20 sm:pt-20 sm:pb-28 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        {/* Decorative Background Elements */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(229,31,62,0.15),transparent_50%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(217,119,6,0.10),transparent_50%)] pointer-events-none" />

        <div className="max-w-6xl mx-auto relative z-10 text-center space-y-6">

          {/* Main Title */}
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight">
            Wonderful Jodi <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E51F3E] via-rose-400 to-amber-300">Matrimony Blog</span>
          </h1>

          {/* Subtitle */}
          <p className="max-w-3xl mx-auto text-base sm:text-lg md:text-xl text-slate-300 font-light leading-relaxed">
            Relationship advice, wedding wisdom, and guidance for medical professionals and esteemed families.
          </p>

          {/* Doctor Focus Highlights Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-6 max-w-5xl mx-auto text-left">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-xs flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <Heart className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-slate-200 leading-tight">Doctor Matrimony</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-xs flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-slate-200 leading-tight">Family Alignment</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-xs flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-slate-200 leading-tight">Residency Life</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-xs flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-slate-200 leading-tight">Safety & KYC</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-xs flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-slate-200 leading-tight">Kundali & Gunas</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-xs flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-[#E51F3E] flex items-center justify-center shrink-0">
                <BookOpen className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-slate-200 leading-tight">Wedding Wisdom</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SEARCH & CATEGORY FILTER BAR ─── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20">
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-900/5 border border-rose-100/80 p-4 sm:p-5 space-y-4">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4.5 h-4.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search articles on residency, marriage advice, kundali, verification..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E] transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  title="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Sort Dropdown & Total Count */}
            <div className="flex items-center gap-2.5 shrink-0 justify-between md:justify-end">
              <span className="text-xs font-semibold text-slate-500 hidden sm:inline">
                {totalCount} {totalCount === 1 ? 'Article' : 'Articles'}
              </span>
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="font-medium text-slate-400">Sort:</span>
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as any)}
                  aria-label="Sort articles"
                  className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-lg px-2.5 py-2 focus:outline-hidden focus:border-[#E51F3E]"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="popular">Most Popular</option>
                  <option value="readingTime">Quick Read</option>
                </select>
              </div>
            </div>
          </div>

          {/* Category Pills Navigation */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-1 scrollbar-none">
            {DEFAULT_CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat;
              const catItem = categories.find((c) => c.name === cat);
              const count = cat === 'All' ? totalCount : catItem?.count;

              return (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setPage(1);
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-150 flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-[#E51F3E] text-white shadow-md shadow-red-950/20 font-semibold'
                      : 'bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-[#E51F3E]'
                  }`}
                >
                  <span>{cat}</span>
                  {count !== undefined && count > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isActive ? 'bg-white/25 text-white' : 'bg-slate-200/80 text-slate-600'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── MAIN CONTENT CONTAINER ─── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 space-y-12">
        {/* Active Filter Notification */}
        {(selectedCategory !== 'All' || debouncedSearch) && (
          <div className="flex items-center justify-between bg-rose-50/70 border border-rose-200/70 rounded-xl px-4 py-2.5 text-xs text-slate-700">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-rose-900">Filtered by:</span>
              {selectedCategory !== 'All' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-rose-200 text-rose-700 font-bold">
                  {selectedCategory}
                </span>
              )}
              {debouncedSearch && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-800 font-bold">
                  &ldquo;{debouncedSearch}&rdquo;
                </span>
              )}
            </div>
            <button
              onClick={handleClearFilters}
              className="text-[#E51F3E] hover:underline font-bold text-xs"
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs animate-pulse space-y-4">
                  <div className="w-full h-48 bg-slate-200 rounded-xl" />
                  <div className="w-1/3 h-4 bg-slate-200 rounded-md" />
                  <div className="w-3/4 h-5 bg-slate-200 rounded-md" />
                  <div className="w-full h-12 bg-slate-100 rounded-md" />
                  <div className="flex justify-between items-center pt-2">
                    <div className="w-20 h-4 bg-slate-200 rounded-md" />
                    <div className="w-16 h-4 bg-slate-200 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="text-center py-16 bg-white rounded-3xl border border-rose-100 shadow-sm p-8 space-y-4 max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-[#E51F3E] flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-lg font-bold text-slate-900">Unable to Load Articles</h3>
            <p className="text-xs text-slate-500 leading-relaxed">{error}</p>
            <button
              onClick={() => {
                setLoading(true);
                setError(null);
                setPage(1);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#E51F3E] text-white text-xs font-semibold hover:bg-rose-700 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && posts.length === 0 && (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/80 shadow-xs p-8 space-y-4 max-w-lg mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Search className="w-7 h-7" />
            </div>
            <h3 className="font-serif text-xl font-bold text-slate-900">No Articles Found</h3>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-sm mx-auto">
              No articles found. Please try another search or category.
            </p>
            <button
              onClick={handleClearFilters}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-[#E51F3E] transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>View All Articles</span>
            </button>
          </div>
        )}

        {/* ─── FEATURED STORY BANNER (Only on page 1 with all categories) ─── */}
        {!loading && !error && featuredPost && (
          <div className="bg-white rounded-3xl border border-rose-100/90 shadow-lg shadow-rose-950/5 overflow-hidden hover:shadow-xl transition-all duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-12">
              {/* Featured Image */}
              <div className="lg:col-span-7 relative min-h-[280px] sm:min-h-[340px] lg:min-h-[400px] bg-slate-900">
                <img
                  src={featuredPost.featuredImageUrl || 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1200&q=80'}
                  alt={featuredPost.title}
                  className="w-full h-full object-cover object-center"
                  loading="lazy"
                  onError={(e) => {
                    // Fallback to placeholder if link breaks
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1200&q=80';
                  }}
                />
                <div className="absolute top-4 left-4 flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-[#E51F3E] text-white text-[11px] font-bold tracking-wide uppercase shadow-md">
                    Featured Story
                  </span>
                  <span className="px-3 py-1 rounded-full bg-[#0B1120]/80 backdrop-blur-md text-amber-300 text-[11px] font-bold border border-amber-500/30">
                    {featuredPost.category}
                  </span>
                </div>
              </div>

              {/* Featured Content */}
              <div className="lg:col-span-5 p-6 sm:p-8 lg:p-10 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                    <span className="inline-flex items-center gap-1.5 text-[#E51F3E] font-bold">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(featuredPost.publishedAt)}
                    </span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1.5 text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      {featuredPost.readingTime}
                    </span>
                  </div>

                  <Link href={`/blog/${featuredPost.slug}`}>
                    <h2 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900 hover:text-[#E51F3E] transition leading-snug">
                      {featuredPost.title}
                    </h2>
                  </Link>

                  <p className="text-sm text-slate-600 leading-relaxed line-clamp-4">
                    {featuredPost.excerpt}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-rose-50 text-[#E51F3E] font-bold flex items-center justify-center text-xs border border-rose-200">
                      {featuredPost.authorName.charAt(0)}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">{featuredPost.authorName}</div>
                      <div className="text-[11px] text-slate-400">{featuredPost.authorRole}</div>
                    </div>
                  </div>

                  <Link
                    href={`/blog/${featuredPost.slug}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-[#E51F3E] transition shadow-xs"
                  >
                    <span>Read Article</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── BLOG CARDS GRID ─── */}
        {!loading && !error && gridPosts.length > 0 && (
          <div className="space-y-6">
            {featuredPost && (
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                <h3 className="font-serif text-xl font-bold text-slate-900 flex items-center gap-2">
                  <span>Latest Doctor Matrimony Articles</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-rose-50 text-[#E51F3E] font-sans font-bold">
                    {gridPosts.length}
                  </span>
                </h3>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {gridPosts.map((post) => (
                <article
                  key={post._id}
                  className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs hover:shadow-xl hover:border-rose-200 hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between group"
                >
                  <div>
                    {/* Card Thumbnail */}
                    <div className="relative h-48 w-full bg-slate-100 overflow-hidden">
                      <img
                        src={post.featuredImageUrl || 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=800&q=80'}
                        alt={post.title}
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=800&q=80';
                        }}
                      />
                      <div className="absolute top-3 left-3 flex items-center gap-1.5">
                        <span className="px-2.5 py-1 rounded-md bg-[#0B1120]/85 backdrop-blur-md text-white text-[10.5px] font-bold">
                          {post.category}
                        </span>
                        {post.isFeatured && (
                          <span className="px-2 py-1 rounded-md bg-[#E51F3E] text-white text-[10.5px] font-bold">
                            ★ Featured
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-5 space-y-3">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="flex items-center gap-1 font-semibold text-rose-600">
                          <Calendar className="w-3 h-3" />
                          {formatDate(post.publishedAt)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {post.readingTime}
                        </span>
                      </div>

                      <Link href={`/blog/${post.slug}`}>
                        <h4 className="font-serif text-base sm:text-lg font-bold text-slate-900 group-hover:text-[#E51F3E] transition-colors leading-snug line-clamp-2">
                          {post.title}
                        </h4>
                      </Link>

                      <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                        {post.excerpt}
                      </p>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="p-5 pt-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="truncate max-w-[170px]">
                      <div className="text-xs font-bold text-slate-900 truncate">{post.authorName}</div>
                      <div className="text-[10px] text-slate-400 truncate">{post.authorRole}</div>
                    </div>

                    <Link
                      href={`/blog/${post.slug}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#E51F3E] hover:text-rose-700 transition"
                    >
                      <span>Read</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        {/* ─── PAGINATION CONTROLS ─── */}
        {!loading && !error && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-6">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 disabled:opacity-40 disabled:pointer-events-none hover:bg-slate-50 transition"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                <button
                  key={num}
                  onClick={() => setPage(num)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition ${
                    page === num
                      ? 'bg-[#E51F3E] text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-rose-50 hover:text-[#E51F3E]'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 disabled:opacity-40 disabled:pointer-events-none hover:bg-slate-50 transition"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ─── DOCTOR MATRIMONY PLATFORM CTA ─── */}
        <section className="mt-16 rounded-3xl bg-gradient-to-br from-[#0B1120] via-[#1E293B] to-[#0B1120] text-white p-8 sm:p-12 border border-slate-800 shadow-xl relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="max-w-3xl space-y-4 relative z-10">
            <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-bold border border-rose-500/30">
              India’s Premier Medical Matrimonial Community
            </span>
            <h3 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold leading-snug">
              Are You a Healthcare Professional Looking for Your Life Partner?
            </h3>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Connect with thousands of verified MBBS, MD, MS, BDS, and super-specialist doctors and their families on Wonderful Jodi. 100% verified credentials, personalized privacy controls, and discreet matchmaking.
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#E51F3E] to-[#F03554] text-white font-bold text-sm hover:shadow-lg hover:shadow-red-950/40 transition"
              >
                <span>Register Free Profile</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/search"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white font-semibold text-sm border border-slate-700 transition"
              >
                <Search className="w-4 h-4 text-slate-300" />
                <span>Search Doctor Matches</span>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
