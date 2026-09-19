import apiClient from './api';

export type BlogStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface BlogPost {
  _id: string;
  id?: string;
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  content: string;
  featuredImageUrl?: string;
  authorName: string;
  authorRole: string;
  authorAvatarUrl?: string;
  readingTime: string;
  status: BlogStatus;
  isFeatured: boolean;
  tags: string[];
  viewCount: number;
  publishedAt?: string;
  createdBy?: { _id: string; fullName?: string; email?: string } | string;
  updatedBy?: { _id: string; fullName?: string; email?: string } | string;
  createdAt: string;
  updatedAt: string;
}

export interface BlogCategoryItem {
  name: string;
  count: number;
}

export interface BlogSummaryStats {
  total: number;
  published: number;
  draft: number;
  archived: number;
  featured: number;
}

export interface PublicBlogsResponse {
  success: boolean;
  data: BlogPost[];
  categories: BlogCategoryItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface SingleBlogResponse {
  success: boolean;
  data: BlogPost;
  relatedPosts?: BlogPost[];
}

export interface AdminBlogsResponse {
  success: boolean;
  stats: BlogSummaryStats;
  data: BlogPost[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ─── PUBLIC BLOG API METHODS ───

export async function fetchPublicBlogs(params?: {
  category?: string;
  search?: string;
  sort?: 'newest' | 'oldest' | 'popular' | 'readingTime';
  page?: number;
  limit?: number;
}): Promise<PublicBlogsResponse> {
  const response = await apiClient.get<PublicBlogsResponse>('/blogs', { params });
  return response.data;
}

export async function fetchPublicBlogBySlug(slug: string): Promise<SingleBlogResponse> {
  const response = await apiClient.get<SingleBlogResponse>(`/blogs/${slug}`);
  return response.data;
}

export async function fetchBlogCategories(): Promise<{ success: boolean; data: BlogCategoryItem[] }> {
  const response = await apiClient.get<{ success: boolean; data: BlogCategoryItem[] }>('/blogs/categories');
  return response.data;
}

export async function fetchFeaturedBlogs(): Promise<{ success: boolean; data: BlogPost[] }> {
  const response = await apiClient.get<{ success: boolean; data: BlogPost[] }>('/blogs/featured');
  return response.data;
}

// ─── ADMIN BLOG API METHODS (Super Admin & Admin Only) ───

export async function fetchAdminBlogs(params?: {
  status?: string;
  category?: string;
  search?: string;
  sort?: string;
  page?: number;
  limit?: number;
}): Promise<AdminBlogsResponse> {
  const response = await apiClient.get<AdminBlogsResponse>('/admin/blogs', { params });
  return response.data;
}

export async function fetchAdminBlogById(id: string): Promise<{ success: boolean; data: BlogPost }> {
  const response = await apiClient.get<{ success: boolean; data: BlogPost }>(`/admin/blogs/${id}`);
  return response.data;
}

export async function createAdminBlog(payload: Partial<BlogPost>): Promise<{
  success: boolean;
  message: string;
  data: BlogPost;
}> {
  const response = await apiClient.post<{ success: boolean; message: string; data: BlogPost }>(
    '/admin/blogs',
    payload
  );
  return response.data;
}

export async function updateAdminBlog(
  id: string,
  payload: Partial<BlogPost>
): Promise<{ success: boolean; message: string; data: BlogPost }> {
  const response = await apiClient.patch<{ success: boolean; message: string; data: BlogPost }>(
    `/admin/blogs/${id}`,
    payload
  );
  return response.data;
}

export async function updateAdminBlogStatus(
  id: string,
  status: BlogStatus
): Promise<{ success: boolean; message: string; data: BlogPost }> {
  const response = await apiClient.patch<{ success: boolean; message: string; data: BlogPost }>(
    `/admin/blogs/${id}/status`,
    { status }
  );
  return response.data;
}

export async function toggleAdminBlogFeatured(
  id: string,
  isFeatured?: boolean
): Promise<{ success: boolean; message: string; data: BlogPost }> {
  const response = await apiClient.patch<{ success: boolean; message: string; data: BlogPost }>(
    `/admin/blogs/${id}/featured`,
    { isFeatured }
  );
  return response.data;
}

export async function deleteAdminBlog(id: string): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.delete<{ success: boolean; message: string }>(`/admin/blogs/${id}`);
  return response.data;
}

export async function restoreAdminBlog(
  id: string
): Promise<{ success: boolean; message: string; data: BlogPost }> {
  const response = await apiClient.patch<{ success: boolean; message: string; data: BlogPost }>(
    `/admin/blogs/${id}/restore`,
    {}
  );
  return response.data;
}

export async function uploadBlogImage(payload: {
  image?: string;
  base64?: string;
  filename?: string;
}): Promise<{
  success: boolean;
  message: string;
  data: { url: string; filename: string; size: number; mimeType: string };
  url: string;
}> {
  const response = await apiClient.post<{
    success: boolean;
    message: string;
    data: { url: string; filename: string; size: number; mimeType: string };
    url: string;
  }>('/admin/blogs/upload-cover', payload);
  return response.data;
}
