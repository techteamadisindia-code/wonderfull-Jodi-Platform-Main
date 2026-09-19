import apiClient from './api';

export type WorkMode = 'On-site' | 'Hybrid' | 'Remote';
export type EmploymentType = 'Full-time' | 'Part-time' | 'Internship' | 'Contract';
export type JobStatus = 'OPEN' | 'CLOSED' | 'DRAFT' | 'ARCHIVED';
export type ApplicationStatus = 'RECEIVED' | 'UNDER_REVIEW' | 'SHORTLISTED' | 'REJECTED' | 'HIRED';

export interface JobOpening {
  _id: string;
  id?: string;
  title: string;
  slug: string;
  department: string;
  location: string;
  workMode: WorkMode;
  employmentType: EmploymentType;
  experience?: string;
  salaryRange?: string;
  shortDescription: string;
  fullDescription: string;
  responsibilities: string[];
  requirements: string[];
  qualifications: string[];
  skills: string[];
  benefits: string[];
  applicationEmail?: string;
  applicationUrl?: string;
  applicationDeadline?: string | null;
  status: JobStatus;
  isPublished: boolean;
  displayOrder: number;
  applicationsCount?: number;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JobApplication {
  _id: string;
  jobId: string;
  jobTitle: string;
  candidateName: string;
  email: string;
  mobile: string;
  experienceYears?: string;
  resumeUrl?: string;
  coverLetter?: string;
  status: ApplicationStatus;
  adminNotes?: string;
  createdAt: string;
}

export interface CareerSummaryStats {
  total: number;
  published: number;
  draft: number;
  open: number;
  closed: number;
  archived: number;
}

export interface PublicCareersResponse {
  success: boolean;
  data: JobOpening[];
  departments: string[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface AdminCareersResponse {
  success: boolean;
  stats: CareerSummaryStats;
  departments: string[];
  data: JobOpening[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ─── PUBLIC CAREER METHODS ───

export async function fetchPublicCareers(params?: {
  department?: string;
  workMode?: string;
  employmentType?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<PublicCareersResponse> {
  const response = await apiClient.get<PublicCareersResponse>('/careers', { params });
  return response.data;
}

export async function fetchPublicCareerBySlug(slug: string): Promise<{ success: boolean; data: JobOpening }> {
  const response = await apiClient.get<{ success: boolean; data: JobOpening }>(`/careers/${slug}`);
  return response.data;
}

export async function submitApplication(
  slug: string,
  payload: {
    candidateName: string;
    email: string;
    mobile: string;
    experienceYears?: string;
    resumeUrl?: string;
    coverLetter?: string;
  }
): Promise<{ success: boolean; message: string; data: any }> {
  const response = await apiClient.post<{ success: boolean; message: string; data: any }>(
    `/careers/${slug}/apply`,
    payload
  );
  return response.data;
}

// ─── ADMIN CAREER METHODS ───

export async function fetchAdminCareers(params?: {
  status?: string;
  department?: string;
  workMode?: string;
  isPublished?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<AdminCareersResponse> {
  const response = await apiClient.get<AdminCareersResponse>('/admin/careers', { params });
  return response.data;
}

export async function fetchAdminCareerById(id: string): Promise<{ success: boolean; data: JobOpening }> {
  const response = await apiClient.get<{ success: boolean; data: JobOpening }>(`/admin/careers/${id}`);
  return response.data;
}

export async function createAdminCareer(payload: Partial<JobOpening>): Promise<{
  success: boolean;
  message: string;
  data: JobOpening;
}> {
  const response = await apiClient.post<{ success: boolean; message: string; data: JobOpening }>(
    '/admin/careers',
    payload
  );
  return response.data;
}

export async function updateAdminCareer(
  id: string,
  payload: Partial<JobOpening>
): Promise<{ success: boolean; message: string; data: JobOpening }> {
  const response = await apiClient.patch<{ success: boolean; message: string; data: JobOpening }>(
    `/admin/careers/${id}`,
    payload
  );
  return response.data;
}

export async function updateAdminCareerStatus(
  id: string,
  status: JobStatus
): Promise<{ success: boolean; message: string; data: JobOpening }> {
  const response = await apiClient.patch<{ success: boolean; message: string; data: JobOpening }>(
    `/admin/careers/${id}/status`,
    { status }
  );
  return response.data;
}

export async function toggleAdminCareerPublish(
  id: string,
  isPublished: boolean
): Promise<{ success: boolean; message: string; data: JobOpening }> {
  const response = await apiClient.patch<{ success: boolean; message: string; data: JobOpening }>(
    `/admin/careers/${id}/publish`,
    { isPublished }
  );
  return response.data;
}

export async function deleteAdminCareer(id: string): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.delete<{ success: boolean; message: string }>(`/admin/careers/${id}`);
  return response.data;
}

export async function fetchJobApplications(
  jobId: string,
  status?: string
): Promise<{ success: boolean; count: number; data: JobApplication[] }> {
  const response = await apiClient.get<{ success: boolean; count: number; data: JobApplication[] }>(
    `/admin/careers/${jobId}/applications`,
    { params: { status } }
  );
  return response.data;
}

export async function updateApplicationStatus(
  applicationId: string,
  status: ApplicationStatus,
  adminNotes?: string
): Promise<{ success: boolean; message: string; data: JobApplication }> {
  const response = await apiClient.patch<{ success: boolean; message: string; data: JobApplication }>(
    `/admin/careers/applications/${applicationId}/status`,
    { status, adminNotes }
  );
  return response.data;
}
