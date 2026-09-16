import apiClient from './api';

export interface StepData {
  basicInfo?: {
    fullName?: string;
    email?: string;
    mobile?: string;
    gender?: string;
    dob?: string;
    lookingFor?: string;
    agreeTerms?: boolean;
    password?: string;
  };
  personalInfo?: {
    maritalStatus?: string;
    motherTongue?: string;
    religion?: string;
    caste?: string;
    subCaste?: string;
    height?: string;
    city?: string;
    state?: string;
    country?: string;
    about?: string;
    foodPreference?: string;
    smoking?: string;
    drinking?: string;
  };
  educationProfession?: {
    education?: string;
    degree?: string;
    profession?: string;
    company?: string;
    workLocation?: string;
    annualIncome?: string;
  };
  familyDetails?: {
    fatherOccupation?: string;
    motherOccupation?: string;
    siblings?: string;
    familyType?: string;
  };
  preferences?: {
    prefAgeMin?: string;
    prefAgeMax?: string;
    prefCity?: string;
    prefDiet?: string;
    lookingFor?: string;
  };
  photos?: {
    primaryPhoto?: string;
    photos?: string[];
  };
  rawFormData?: Record<string, any>;
}

export interface RegistrationSessionData {
  registrationId: string;
  resumeToken?: string;
  currentStep: number;
  totalSteps: number;
  completionPercentage: number;
  status: 'STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
  stepData: StepData;
  candidateName?: string;
  email?: string;
  mobile?: string;
  gender?: string;
  startedAt?: string;
  lastActiveAt?: string;
  completedAt?: string;
}

/**
 * 1. Start a new registration and save Page 1 immediately to database
 */
export async function startRegistration(payload: {
  fullName: string;
  email: string;
  mobile: string;
  password?: string;
  gender?: string;
  dob?: string;
  lookingFor?: string;
  agreeTerms?: boolean;
  referralCode?: string;
  rawFormData?: Record<string, any>;
}): Promise<RegistrationSessionData> {
  const response = await apiClient.post<{
    success: boolean;
    data: RegistrationSessionData;
    message: string;
  }>('/registration/start', payload);

  return response.data.data;
}

/**
 * 2. Save a specific registration step to backend database
 */
export async function saveRegistrationStep(payload: {
  registrationId: string;
  stepNumber: number;
  section: string;
  data: Record<string, any>;
  rawFormData?: Record<string, any>;
}): Promise<RegistrationSessionData> {
  const response = await apiClient.post<{
    success: boolean;
    data: RegistrationSessionData;
    message: string;
  }>('/registration/step', payload);

  return response.data.data;
}

/**
 * 3. Lightweight background auto-save
 */
export async function autoSaveRegistration(payload: {
  registrationId: string;
  section?: string;
  data?: Record<string, any>;
  rawFormData?: Record<string, any>;
}): Promise<{ success: boolean; savedAt: string; completionPercentage: number }> {
  const response = await apiClient.post<{
    success: boolean;
    savedAt: string;
    completionPercentage: number;
  }>('/registration/auto-save', payload);

  return response.data;
}

/**
 * 4. Retrieve saved registration session to resume from last step
 */
export async function getRegistrationSession(
  registrationId: string
): Promise<RegistrationSessionData> {
  const response = await apiClient.get<{
    success: boolean;
    data: RegistrationSessionData;
  }>(`/registration/${encodeURIComponent(registrationId)}`);

  return response.data.data;
}

/**
 * 5. Complete registration, create User/Profile, issue auth token
 */
export async function completeRegistration(payload: {
  registrationId: string;
  referralCode?: string;
  finalData?: Record<string, any>;
}): Promise<{
  success: boolean;
  token: string;
  user: any;
  profile: any;
  message: string;
}> {
  const response = await apiClient.post<{
    success: boolean;
    token: string;
    data: {
      token: string;
      user: any;
      profile: any;
      registrationId: string;
      status: string;
    };
    message: string;
  }>('/registration/complete', payload);

  return {
    success: response.data.success,
    token: response.data.token || response.data.data?.token,
    user: response.data.data?.user,
    profile: response.data.data?.profile,
    message: response.data.message,
  };
}

/**
 * 6. Real-time availability check for email or mobile
 */
export async function checkRegistrationAvailability(params: {
  email?: string;
  mobile?: string;
}): Promise<{ available: boolean; message: string }> {
  const query = new URLSearchParams();
  if (params.email) query.set('email', params.email);
  if (params.mobile) query.set('mobile', params.mobile);

  const response = await apiClient.get<{
    success: boolean;
    available: boolean;
    message: string;
  }>(`/registration/check-availability?${query.toString()}`);

  return response.data;
}
