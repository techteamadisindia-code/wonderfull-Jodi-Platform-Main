'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  MapPin,
  Briefcase,
  GraduationCap,
  Edit3,
  User,
  Heart,
  Calendar,
  Sparkles,
  Phone,
  Mail,
  Home,
  Utensils,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Camera,
  Upload,
  Trash2,
  Star,
  Lock,
  Eye,
  Check,
  Stethoscope,
  ChevronDown,
  Compass,
  FileText,
  Award,
  Crown,
  X,
  Plus,
  Dumbbell,
  ChevronRight,
  Layers,
  CheckSquare,
  Ban,
  FileCheck,
} from 'lucide-react';
import {
  getMyProfile,
  updateMyProfile,
  getMyMembershipStatus,
  uploadProfileImage,
  getAuthToken,
  logoutUser,
} from '../../lib/api';
import {
  fetchUserVerifications,
  submitUserVerification,
  UserVerificationSummaryResponse,
} from '../../services/verificationApi';
import {
  DOCTOR_QUALIFICATIONS,
  DOCTOR_SPECIALIZATIONS,
  validateDateOfBirth,
  validateMedicalQualification,
} from '../../lib/doctorConstants';
import { DobInput } from '../../components/DobInput';
import { DoctorAvatar } from '../../components/DoctorAvatar';
import { BasicDetailsEditSection } from '../../components/BasicDetailsEditSection';
import { ProfileBanner } from '../../components/profile/ProfileBanner';
import { ProfileSummaryCard } from '../../components/profile/ProfileSummaryCard';

const HEIGHTS = [
  `5' 0"`, `5' 1"`, `5' 2"`, `5' 3"`, `5' 4"`, `5' 5"`, `5' 6"`, `5' 7"`, `5' 8"`, `5' 9"`, `5' 10"`, `5' 11"`, `6' 0"`, `6' 1"`, `6' 2"`, `6' 3"`, `6' 4"`
];

const HEIGHT_METERS: Record<string, string> = {
  '5\' 0"': '1.52 m',
  '5\' 1"': '1.55 m',
  '5\' 2"': '1.57 m',
  '5\' 3"': '1.60 m',
  '5\' 4"': '1.63 m',
  '5\' 5"': '1.65 m',
  '5\' 6"': '1.68 m',
  '5\' 7"': '1.70 m',
  '5\' 8"': '1.73 m',
  '5\' 9"': '1.75 m',
  '5\' 10"': '1.78 m',
  '5\' 11"': '1.80 m',
  '6\' 0"': '1.83 m',
  '6\' 1"': '1.85 m',
  '6\' 2"': '1.88 m',
  '6\' 3"': '1.91 m',
  '6\' 4"': '1.93 m',
};

const RELIGIONS = ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Jain', 'Parsi', 'Buddhist', 'Jewish', 'Other'];
const MARITAL_STATUSES = ['Never Married', 'Divorced', 'Widowed', 'Separated', 'Awaiting Divorce'];
const MOTHER_TONGUES = [
  'Marathi', 'Hindi', 'Gujarati', 'Tamil', 'Telugu', 'Malayalam', 'Bengali', 'Punjabi', 'Kannada', 'Odia', 'Marwari', 'English', 'Urdu'
];
const DIETS = ['Vegetarian', 'Non-Vegetarian', 'Eggetarian', 'Vegan', 'Jain Vegetarian'];
const FAMILY_TYPES = ['Nuclear Family', 'Joint Family'];
const FAMILY_STATUSES = ['Middle Class', 'Upper Middle Class', 'Affluent', 'High Net Worth'];
const FAMILY_VALUES = ['Traditional', 'Moderate', 'Liberal'];
const MANGLIK_OPTIONS = ['Non-Manglik', 'Manglik', 'Anshik Manglik', "Don't Know"];
const RASHIS = [
  'Mesh (Aries)', 'Vrishabha (Taurus)', 'Mithun (Gemini)', 'Kark (Cancer)',
  'Singh (Leo)', 'Kanya (Virgo)', 'Tula (Libra)', 'Vrishchik (Scorpio)',
  'Dhanu (Sagittarius)', 'Makar (Capricorn)', 'Kumbh (Aquarius)', 'Meen (Pisces)'
];

function getAge(dob?: string | Date): number | null {
  if (!dob) return null;
  const date = new Date(dob);
  if (isNaN(date.getTime())) return null;
  const diff = Date.now() - date.getTime();
  const ageDate = new Date(diff);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
}

function formatDateLong(dob?: string | Date): string {
  if (!dob) return 'Not specified';
  const date = new Date(dob);
  if (isNaN(date.getTime())) return 'Not specified';
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export interface ProfileCategoryItem {
  id: string;
  label: string;
  weight: number;
  completed: boolean;
  status: 'completed' | 'pending' | 'incomplete';
}

const VERIFICATION_DOC_CONFIG = [
  {
    key: 'MEDICAL_REGISTRATION',
    title: 'Medical Council Registration Certificate',
    badge: 'MCI / State Council • Mandatory',
    description: 'Registration certificate with State Medical Council (e.g. MMC, DMC, KMC, TNMC) or National Medical Commission (NMC/MCI).',
    examples: 'Permanent Registration Certificate or valid Council Renewal Certificate',
  },
  {
    key: 'DEGREE',
    title: 'Medical Degree / Convocation Certificate',
    badge: 'Medical Qualification',
    description: 'Passing certificate or university convocation certificate for MBBS, MD, MS, DNB, or Super-Specialty.',
    examples: 'MBBS Convocation Certificate, MD/MS Degree, DNB Passing Certificate',
  },
  {
    key: 'GOVERNMENT_ID',
    title: 'Government Identity / KYC Proof',
    badge: 'Identity Verification',
    description: 'Government-issued photo identification verifying candidate legal name, age, and identity.',
    examples: 'Aadhaar Card (first 8 digits masked), Passport, Voter ID, Driving License',
  },
  {
    key: 'EMPLOYMENT',
    title: 'Hospital / Clinical Practice Affiliation',
    badge: 'Practice Authenticity',
    description: 'Proof of clinical practice, current hospital consultant appointment, or clinic setup.',
    examples: 'Hospital Consultant ID Card, Clinic Registration Certificate, Official Appointment Letter',
  },
];

/**
 * Weighted Profile Completion scoring prioritizing medical matrimonial criteria (Total: 100%).
 */
function calculateWeightedCompletion(profile: any, user?: any) {
  if (!profile) return { score: 0, categories: [] as ProfileCategoryItem[] };

  // 1. Basic Details (10%)
  const hasBasic = Boolean(
    profile.displayName &&
    profile.gender &&
    profile.dob &&
    profile.height &&
    profile.maritalStatus &&
    profile.religion &&
    (profile.city || profile.state)
  );

  // 2. About Me (10%)
  const hasAbout = Boolean(profile.about && profile.about.trim().length >= 20);

  // 3. Medical Education (10%)
  const hasEducation = Boolean(
    profile.education &&
    (profile.degree || profile.medicalCollege || profile.medicalUniversity)
  );

  // 4. Medical Career & Practice (10%)
  const hasCareer = Boolean(
    profile.profession &&
    (profile.currentHospital || profile.company || profile.workLocation || profile.currentRole || profile.medicalExperience)
  );

  // 5. Medical Registration (15%)
  const hasRegistration = Boolean(
    profile.medicalRegistrationNumber &&
    (profile.medicalCouncil || profile.registrationState)
  );

  // 6. Family Details (10%)
  const hasFamily = Boolean(
    profile.familyType &&
    (profile.fatherOccupation || profile.motherOccupation || profile.nativePlace || profile.siblings || profile.familyValues || profile.familyStatus)
  );

  // 7. Partner Preferences (10%)
  const hasPreferences = Boolean(
    profile.partnerPreferences &&
    (profile.partnerPreferences.preferredLocation ||
      profile.partnerPreferences.preferredQualification ||
      profile.partnerPreferences.preferredSpecialization ||
      profile.partnerPreferences.preferredAgeMin ||
      profile.partnerPreferences.preferredAgeMax)
  );

  // 8. Horoscope & Kundali (5%)
  const hasHoroscope = Boolean(
    profile.horoscope?.rashi ||
    profile.horoscope?.nakshatra ||
    profile.horoscope?.lagna ||
    profile.horoscope?.timeOfBirth ||
    profile.horoscope?.placeOfBirth
  );

  // 9. Lifestyle & Interests (5%)
  const hasLifestyle = Boolean(
    profile.lifestyleInterests?.diet ||
    profile.foodPreference ||
    (Array.isArray(profile.lifestyleInterests?.hobbies) && profile.lifestyleInterests.hobbies.length > 0) ||
    (Array.isArray(profile.hobbies) && profile.hobbies.length > 0)
  );

  // 10. Photos (5%)
  const hasPhotos = Boolean(
    (profile.primaryPhoto && profile.primaryPhoto.trim() !== '') ||
    (Array.isArray(profile.photos) && profile.photos.length > 0)
  );

  // 11. Medical Verification (10%)
  const rawStatus = (profile.verificationStatus || user?.verificationStatus || 'UNVERIFIED').toUpperCase();
  const isApproved =
    rawStatus === 'VERIFIED' ||
    rawStatus === 'DOCTOR_VERIFIED' ||
    user?.verified === true;
  const isPending = !isApproved && rawStatus === 'PENDING';

  let verStatus: 'completed' | 'pending' | 'incomplete' = 'incomplete';
  if (isApproved) {
    verStatus = 'completed';
  } else if (isPending) {
    verStatus = 'pending';
  }

  const categories: ProfileCategoryItem[] = [
    { id: 'basic-details', label: 'Basic Details', weight: 10, completed: hasBasic, status: hasBasic ? 'completed' : 'incomplete' },
    { id: 'about-me', label: 'About Me', weight: 10, completed: hasAbout, status: hasAbout ? 'completed' : 'incomplete' },
    { id: 'medical-education', label: 'Medical Education', weight: 10, completed: hasEducation, status: hasEducation ? 'completed' : 'incomplete' },
    { id: 'medical-career', label: 'Medical Career & Practice', weight: 10, completed: hasCareer, status: hasCareer ? 'completed' : 'incomplete' },
    { id: 'medical-registration', label: 'Medical Registration', weight: 15, completed: hasRegistration, status: hasRegistration ? 'completed' : 'incomplete' },
    { id: 'family', label: 'Family Details', weight: 10, completed: hasFamily, status: hasFamily ? 'completed' : 'incomplete' },
    { id: 'preferences', label: 'Partner Preferences', weight: 10, completed: hasPreferences, status: hasPreferences ? 'completed' : 'incomplete' },
    { id: 'horoscope', label: 'Horoscope / Kundali', weight: 5, completed: hasHoroscope, status: hasHoroscope ? 'completed' : 'incomplete' },
    { id: 'lifestyle', label: 'Lifestyle & Interests', weight: 5, completed: hasLifestyle, status: hasLifestyle ? 'completed' : 'incomplete' },
    { id: 'photos', label: 'Photos', weight: 5, completed: hasPhotos, status: hasPhotos ? 'completed' : 'incomplete' },
    { id: 'medical-verification', label: 'Medical Verification', weight: 10, completed: isApproved, status: verStatus },
  ];

  let totalScore = 0;
  for (const c of categories) {
    if (c.completed) {
      totalScore += c.weight;
    }
  }

  const score = Math.min(100, Math.max(0, totalScore));
  return { score, categories };
}

type ModalType =
  | 'basic'
  | 'about'
  | 'medical_edu'
  | 'medical_career'
  | 'medical_reg'
  | 'family'
  | 'preferences'
  | 'horoscope'
  | 'lifestyle'
  | null;

export default function MyProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<any>(null);
  const [membership, setMembership] = useState<any>({ plan: 'FREE', isPremium: false, status: 'ACTIVE' });
  const [verifications, setVerifications] = useState<UserVerificationSummaryResponse | null>(null);
  const [completionFilter, setCompletionFilter] = useState<'all' | 'completed' | 'pending' | 'incomplete'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modals
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Document Upload Modal
  const [isDocUploadOpen, setIsDocUploadOpen] = useState(false);
  const [uploadCategory, setUploadCategory] = useState('MEDICAL_REGISTRATION');
  const [uploadDocName, setUploadDocName] = useState('');
  const [uploadFileBase64, setUploadFileBase64] = useState<string | null>(null);
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadFileSize, setUploadFileSize] = useState(0);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const docFileInputRef = useRef<HTMLInputElement>(null);

  // Form data
  const [modalFormData, setModalFormData] = useState<any>({});
  const [submitting, setSubmitting] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [activeNavSection, setActiveNavSection] = useState('basic-details');

  useEffect(() => {
    let isMounted = true;
    const token = getAuthToken();
    if (!token) {
      router.push('/login?redirect=/profile');
      return;
    }

    Promise.all([getMyProfile(), getMyMembershipStatus(), fetchUserVerifications()])
      .then(([profData, memberData, verifData]) => {
        if (!isMounted) return;
        if (profData) {
          setProfile(profData);
        } else {
          setError('You have not created your matrimonial profile yet.');
        }
        if (memberData) {
          setMembership(memberData);
        }
        if (verifData) {
          setVerifications(verifData);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Failed to load profile:', err);
        if (err?.response?.status === 401) {
          router.push('/login?redirect=/profile');
        } else {
          setError('Unable to load your profile. Please sign in again.');
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [router]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const scrollToSection = (id: string) => {
    setActiveNavSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleOpenDocUploadModal = (categoryKey: string = 'MEDICAL_REGISTRATION') => {
    setUploadCategory(categoryKey);
    const conf = VERIFICATION_DOC_CONFIG.find((c) => c.key === categoryKey);
    setUploadDocName(conf ? conf.title : '');
    setUploadFileBase64(null);
    setUploadFileName('');
    setUploadFileSize(0);
    setUploadError('');
    setIsDocUploadOpen(true);
  };

  const handleDocFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Document file size exceeds the 10MB limit.');
      return;
    }

    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type.toLowerCase())) {
      setUploadError('Invalid format. Please upload a genuine PDF document or JPG/PNG/WebP image.');
      return;
    }

    setUploadError('');
    setUploadFileName(file.name);
    setUploadFileSize(file.size);

    const reader = new FileReader();
    reader.onload = () => {
      setUploadFileBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitVerificationDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFileBase64) {
      setUploadError('Please choose a valid document file to upload.');
      return;
    }

    setUploadingDoc(true);
    setUploadError('');
    try {
      const res = await submitUserVerification({
        documentType: uploadCategory,
        documentName: uploadDocName.trim() || undefined,
        file: uploadFileBase64,
        filename: uploadFileName,
      });

      if (res && res.success !== false) {
        showToast('Document uploaded successfully! It is now queued for administrator review.');
        setIsDocUploadOpen(false);
        setUploadFileBase64(null);
        setUploadFileName('');

        // Reload verification data and profile
        const [verifRes, profRes] = await Promise.all([
          fetchUserVerifications(),
          getMyProfile(),
        ]);
        if (verifRes) setVerifications(verifRes);
        if (profRes) setProfile(profRes);
      } else {
        setUploadError(res?.message || 'Failed to submit document. Please try again.');
      }
    } catch (err: any) {
      console.error('Failed to submit verification document:', err);
      setUploadError(err?.response?.data?.message || 'Error uploading document. Please check file format and size.');
    } finally {
      setUploadingDoc(false);
    }
  };

  const openModalForSection = (sectionId: string) => {
    if (sectionId === 'basic-details') {
      openSectionModal('basic');
    } else if (sectionId === 'about-me') {
      openSectionModal('about');
    } else if (sectionId === 'medical-education') {
      openSectionModal('medical_edu');
    } else if (sectionId === 'medical-career') {
      openSectionModal('medical_career');
    } else if (sectionId === 'medical-registration') {
      openSectionModal('medical_reg');
    } else if (sectionId === 'family') {
      openSectionModal('family');
    } else if (sectionId === 'preferences') {
      openSectionModal('preferences');
    } else if (sectionId === 'horoscope') {
      openSectionModal('horoscope');
    } else if (sectionId === 'lifestyle') {
      openSectionModal('lifestyle');
    } else if (sectionId === 'photos') {
      setIsPhotoModalOpen(true);
    } else if (sectionId === 'medical-verification') {
      scrollToSection('medical-verification');
      handleOpenDocUploadModal('MEDICAL_REGISTRATION');
    }
  };

  const openSectionModal = (type: ModalType) => {
    if (!profile) return;
    setActiveModal(type);

    let formattedDob = '';
    if (profile.dob) {
      const d = new Date(profile.dob);
      if (!isNaN(d.getTime())) {
        formattedDob = d.toISOString().split('T')[0];
      }
    }

    setModalFormData({
      displayName: profile.displayName || profile.user?.fullName || '',
      gender: profile.gender || 'Male',
      dob: formattedDob,
      height: profile.height || '',
      maritalStatus: profile.maritalStatus || '',
      motherTongue: profile.motherTongue || '',
      religion: profile.religion || '',
      caste: profile.caste || '',
      subCaste: profile.subCaste || '',
      city: profile.city || '',
      state: profile.state || '',
      country: profile.country || 'India',
      nativePlace: profile.nativePlace || '',
      annualIncome: profile.annualIncome || '',
      profileManagedBy: profile.profileManagedBy || 'Self',
      currentLocation: profile.currentLocation
        ? {
            countryId: profile.currentLocation.countryId?._id || profile.currentLocation.countryId,
            countryName: profile.currentLocation.countryId?.name || profile.country || 'India',
            stateId: profile.currentLocation.stateId?._id || profile.currentLocation.stateId,
            stateName: profile.currentLocation.stateId?.name || profile.state || '',
            districtId: profile.currentLocation.districtId?._id || profile.currentLocation.districtId,
            districtName: profile.currentLocation.districtId?.name || '',
            subDistrictId: profile.currentLocation.subDistrictId?._id || profile.currentLocation.subDistrictId,
            subDistrictName: profile.currentLocation.subDistrictId?.name || '',
            cityId: profile.currentLocation.cityId?._id || profile.currentLocation.cityId,
            cityName: profile.currentLocation.cityId?.name || profile.city || '',
            villageId: profile.currentLocation.villageId?._id || profile.currentLocation.villageId,
            villageName: profile.currentLocation.villageId?.name || '',
            pincode: profile.currentLocation.pincode || '',
          }
        : {
            countryName: profile.country || 'India',
            stateName: profile.state || '',
            cityName: profile.city || '',
          },
      nativePlaceDetails: profile.nativePlaceDetails
        ? {
            countryId: profile.nativePlaceDetails.countryId?._id || profile.nativePlaceDetails.countryId,
            countryName: profile.nativePlaceDetails.countryId?.name || 'India',
            stateId: profile.nativePlaceDetails.stateId?._id || profile.nativePlaceDetails.stateId,
            stateName: profile.nativePlaceDetails.stateId?.name || '',
            districtId: profile.nativePlaceDetails.districtId?._id || profile.nativePlaceDetails.districtId,
            districtName: profile.nativePlaceDetails.districtId?.name || '',
            subDistrictId: profile.nativePlaceDetails.subDistrictId?._id || profile.nativePlaceDetails.subDistrictId,
            subDistrictName: profile.nativePlaceDetails.subDistrictId?.name || '',
            cityId: profile.nativePlaceDetails.cityId?._id || profile.nativePlaceDetails.cityId,
            cityName: profile.nativePlaceDetails.cityId?.name || '',
            villageId: profile.nativePlaceDetails.villageId?._id || profile.nativePlaceDetails.villageId,
            villageName: profile.nativePlaceDetails.villageId?.name || '',
            description: profile.nativePlaceDetails.description || profile.nativePlace || '',
          }
        : {
            description: profile.nativePlace || '',
          },
      communityDetails: profile.communityDetails
        ? {
            religionId: profile.communityDetails.religionId?._id || profile.communityDetails.religionId,
            religionName: profile.communityDetails.religionId?.name || profile.religion || '',
            casteId: profile.communityDetails.casteId?._id || profile.communityDetails.casteId,
            casteName: profile.communityDetails.casteId?.name || profile.caste || '',
            casteCategory: profile.communityDetails.casteCategory || profile.communityDetails.casteId?.category || '',
            subCasteId: profile.communityDetails.subCasteId?._id || profile.communityDetails.subCasteId,
            subCasteName: profile.communityDetails.subCasteId?.name || profile.subCaste || '',
          }
        : {
            religionName: profile.religion || '',
            casteName: profile.caste || '',
            subCasteName: profile.subCaste || '',
          },
      languageDetails: profile.languageDetails
        ? {
            motherTongueId: profile.languageDetails.motherTongueId?._id || profile.languageDetails.motherTongueId,
            motherTongueName: profile.languageDetails.motherTongueId?.name || profile.motherTongue || '',
          }
        : {
            motherTongueName: profile.motherTongue || '',
          },
      about: profile.about || '',
      // Medical Education
      education: profile.education || '',
      degree: profile.degree || '',
      medicalCollege: profile.medicalCollege || '',
      medicalUniversity: profile.medicalUniversity || '',
      graduationYear: profile.graduationYear || '',
      additionalQualification: profile.additionalQualification || '',
      // Medical Career
      profession: profile.profession || '',
      currentRole: profile.currentRole || '',
      currentHospital: profile.currentHospital || '',
      company: profile.company || '',
      workLocation: profile.workLocation || '',
      medicalExperience: profile.medicalExperience || '',
      workType: profile.workType || '',
      currentlyPracticing: profile.currentlyPracticing ?? true,
      // Medical Registration
      medicalRegistrationNumber: profile.medicalRegistrationNumber || '',
      medicalCouncil: profile.medicalCouncil || '',
      registrationState: profile.registrationState || '',
      registrationYear: profile.registrationYear || '',
      // Family
      familyType: profile.familyType || '',
      familyStatus: profile.familyStatus || '',
      familyValues: profile.familyValues || '',
      fatherOccupation: profile.fatherOccupation || '',
      motherOccupation: profile.motherOccupation || '',
      siblings: profile.siblings || '',
      familyLocation: profile.familyLocation || '',
      // Partner Preferences
      preferredAgeMin: profile.partnerPreferences?.preferredAgeMin || 24,
      preferredAgeMax: profile.partnerPreferences?.preferredAgeMax || 36,
      preferredLocation: profile.partnerPreferences?.preferredLocation || '',
      preferredQualification: profile.partnerPreferences?.preferredQualification || '',
      preferredSpecialization: profile.partnerPreferences?.preferredSpecialization || '',
      preferredMaritalStatus: profile.partnerPreferences?.preferredMaritalStatus || 'Never Married',
      otherPreferences: profile.partnerPreferences?.otherPreferences || '',
      // Horoscope
      timeOfBirth: profile.horoscope?.timeOfBirth || '',
      placeOfBirth: profile.horoscope?.placeOfBirth || '',
      rashi: profile.horoscope?.rashi || '',
      nakshatra: profile.horoscope?.nakshatra || '',
      lagna: profile.horoscope?.lagna || '',
      manglik: profile.horoscope?.manglik || 'Non-Manglik',
      gotra: profile.horoscope?.gotra || '',
      horoscopeDocument: profile.horoscope?.horoscopeDocument || '',
      // Lifestyle
      diet: profile.lifestyleInterests?.diet || profile.foodPreference || '',
      smoking: profile.lifestyleInterests?.smoking || profile.smoking || '',
      alcohol: profile.lifestyleInterests?.alcohol || profile.drinking || '',
      exercise: profile.lifestyleInterests?.exercise || '',
      hobbies: (profile.lifestyleInterests?.hobbies || profile.hobbies || []).join(', '),
      travel: (profile.lifestyleInterests?.travel || []).join(', '),
      languages: (profile.lifestyleInterests?.languages || (profile.motherTongue ? [profile.motherTongue] : [])).join(', '),
      pets: profile.lifestyleInterests?.pets || '',
      otherInterests: profile.lifestyleInterests?.otherInterests || '',
    });
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setModalFormData((prev: any) => ({ ...prev, [name]: checked }));
    } else {
      setModalFormData((prev: any) => ({ ...prev, [name]: value }));
    }
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      let payload: any = {};

      if (activeModal === 'basic') {
        if (!modalFormData.displayName?.trim()) {
          showToast('Full Name is required.', 'error');
          setSubmitting(false);
          return;
        }
        if (modalFormData.dob) {
          const checkDob = validateDateOfBirth(modalFormData.dob);
          if (!checkDob.isValid) {
            showToast(checkDob.error || 'Date of birth year must be exactly 4 digits.', 'error');
            setSubmitting(false);
            return;
          }
        }
        payload = {
          displayName: modalFormData.displayName.trim(),
          gender: modalFormData.gender,
          dob: modalFormData.dob,
          height: modalFormData.height,
          maritalStatus: modalFormData.maritalStatus,
          religion: modalFormData.religion,
          caste: modalFormData.caste,
          subCaste: modalFormData.subCaste,
          motherTongue: modalFormData.motherTongue,
          city: modalFormData.city,
          state: modalFormData.state,
          country: modalFormData.country,
          nativePlace: modalFormData.nativePlace,
          annualIncome: modalFormData.annualIncome,
          profileManagedBy: modalFormData.profileManagedBy,
          currentLocation: modalFormData.currentLocation,
          nativePlaceDetails: modalFormData.nativePlaceDetails,
          communityDetails: modalFormData.communityDetails,
          languageDetails: modalFormData.languageDetails,
        };
      } else if (activeModal === 'about') {
        payload = {
          about: modalFormData.about,
          profileManagedBy: modalFormData.profileManagedBy,
        };
      } else if (activeModal === 'medical_edu') {
        const checkQual = validateMedicalQualification(modalFormData.education);
        if (!checkQual.isValid) {
          showToast(checkQual.error || 'Please select a valid medical qualification.', 'error');
          setSubmitting(false);
          return;
        }
        payload = {
          education: modalFormData.education,
          degree: modalFormData.degree,
          medicalCollege: modalFormData.medicalCollege,
          medicalUniversity: modalFormData.medicalUniversity,
          graduationYear: modalFormData.graduationYear,
          additionalQualification: modalFormData.additionalQualification,
        };
      } else if (activeModal === 'medical_career') {
        payload = {
          profession: modalFormData.profession,
          currentRole: modalFormData.currentRole,
          currentHospital: modalFormData.currentHospital,
          company: modalFormData.company || modalFormData.currentHospital,
          workLocation: modalFormData.workLocation,
          medicalExperience: modalFormData.medicalExperience,
          annualIncome: modalFormData.annualIncome,
          workType: modalFormData.workType,
          currentlyPracticing: modalFormData.currentlyPracticing,
        };
      } else if (activeModal === 'medical_reg') {
        payload = {
          medicalRegistrationNumber: modalFormData.medicalRegistrationNumber,
          medicalCouncil: modalFormData.medicalCouncil,
          registrationState: modalFormData.registrationState,
          registrationYear: modalFormData.registrationYear,
        };
      } else if (activeModal === 'family') {
        payload = {
          familyType: modalFormData.familyType,
          familyStatus: modalFormData.familyStatus,
          familyValues: modalFormData.familyValues,
          fatherOccupation: modalFormData.fatherOccupation,
          motherOccupation: modalFormData.motherOccupation,
          siblings: modalFormData.siblings,
          familyLocation: modalFormData.familyLocation,
          nativePlace: modalFormData.nativePlace,
        };
      } else if (activeModal === 'preferences') {
        payload = {
          partnerPreferences: {
            preferredAgeMin: Number(modalFormData.preferredAgeMin) || 22,
            preferredAgeMax: Number(modalFormData.preferredAgeMax) || 32,
            preferredLocation: modalFormData.preferredLocation,
            preferredQualification: modalFormData.preferredQualification,
            preferredSpecialization: modalFormData.preferredSpecialization,
            preferredMaritalStatus: modalFormData.preferredMaritalStatus,
            otherPreferences: modalFormData.otherPreferences,
          },
        };
      } else if (activeModal === 'horoscope') {
        payload = {
          horoscope: {
            timeOfBirth: modalFormData.timeOfBirth,
            placeOfBirth: modalFormData.placeOfBirth,
            rashi: modalFormData.rashi,
            nakshatra: modalFormData.nakshatra,
            lagna: modalFormData.lagna,
            manglik: modalFormData.manglik,
            gotra: modalFormData.gotra,
            horoscopeDocument: modalFormData.horoscopeDocument,
          },
        };
      } else if (activeModal === 'lifestyle') {
        const splitComma = (val: string) =>
          val ? val.split(',').map((s) => s.trim()).filter(Boolean) : [];
        payload = {
          foodPreference: modalFormData.diet,
          smoking: modalFormData.smoking,
          drinking: modalFormData.alcohol,
          lifestyleInterests: {
            diet: modalFormData.diet,
            smoking: modalFormData.smoking,
            alcohol: modalFormData.alcohol,
            exercise: modalFormData.exercise,
            hobbies: splitComma(modalFormData.hobbies),
            travel: splitComma(modalFormData.travel),
            languages: splitComma(modalFormData.languages),
            pets: modalFormData.pets,
            otherInterests: modalFormData.otherInterests,
          },
        };
      }

      const res = await updateMyProfile(payload);
      if (res && res.success !== false) {
        setProfile(res.data);
        setActiveModal(null);
        showToast('Profile section updated successfully!');
      } else {
        showToast(res?.message || 'Failed to update section.', 'error');
      }
    } catch (err: any) {
      console.error('Failed to save modal:', err);
      showToast(err?.response?.data?.message || 'Failed to save changes.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Photo handlers
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('Image file size must be under 5MB.', 'error');
      return;
    }

    setPhotoUploading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      try {
        const uploadRes = await uploadProfileImage(base64, file.name);
        const newUrl = uploadRes?.data?.url || uploadRes?.url;
        if (!newUrl) throw new Error('Upload URL not returned');

        const currentPhotos = Array.isArray(profile.photos) ? [...profile.photos] : [];
        if (currentPhotos.length >= 6) {
          showToast('Maximum 6 photos allowed. Please delete an older photo first.', 'error');
          setPhotoUploading(false);
          return;
        }

        const updatedPhotos = [...currentPhotos, newUrl];
        const updatedPrimary = profile.primaryPhoto || newUrl;

        const updateRes = await updateMyProfile({
          photos: updatedPhotos,
          primaryPhoto: updatedPrimary,
        });

        if (updateRes?.success !== false) {
          setProfile(updateRes.data);
          showToast('Photo uploaded successfully!');
        }
      } catch (uploadErr: any) {
        showToast(uploadErr?.response?.data?.message || 'Failed to upload photo.', 'error');
      } finally {
        setPhotoUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSetPrimary = async (photoUrl: string) => {
    try {
      const res = await updateMyProfile({ primaryPhoto: photoUrl });
      if (res?.success !== false) {
        setProfile(res.data);
        showToast('Primary profile photo updated!');
      }
    } catch (err) {
      showToast('Failed to set primary photo.', 'error');
    }
  };

  const handleDeletePhoto = async (photoUrl: string) => {
    try {
      const currentPhotos = Array.isArray(profile.photos) ? profile.photos : [];
      const updatedPhotos = currentPhotos.filter((p: string) => p !== photoUrl);
      let updatedPrimary = profile.primaryPhoto;
      if (profile.primaryPhoto === photoUrl) {
        updatedPrimary = updatedPhotos[0] || '';
      }

      const res = await updateMyProfile({
        photos: updatedPhotos,
        primaryPhoto: updatedPrimary,
      });

      if (res?.success !== false) {
        setProfile(res.data);
        showToast('Photo removed successfully.');
      }
    } catch (err) {
      showToast('Failed to delete photo.', 'error');
    }
  };

  const handleSavePrivacy = async (settings: any) => {
    try {
      const res = await updateMyProfile({ privacySettings: settings });
      if (res?.success !== false) {
        setProfile(res.data);
        setIsPrivacyModalOpen(false);
        showToast('Privacy & contact settings saved.');
      }
    } catch (err) {
      showToast('Failed to save privacy settings.', 'error');
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FAF7F4] flex items-center justify-center py-20">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-3 border-rose-200 border-t-[#E51F3E] rounded-full animate-spin mx-auto shadow-xs" />
          <p className="text-sm font-bold text-slate-700 tracking-wide">Loading your matrimonial profile...</p>
        </div>
      </main>
    );
  }

  if (error || !profile) {
    return (
      <main className="min-h-screen bg-[#FAF7F4] py-16 px-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl p-7 border border-[#E8E1DB] shadow-2xs text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-[#E51F3E] flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="font-serif text-2xl font-bold text-slate-900">Profile Not Found</h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {error || 'You have not completed your profile registration yet.'}
          </p>
          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E51F3E] to-[#CC1432] px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm hover:shadow-md transition"
            >
              <Sparkles className="w-4 h-4" />
              <span>Create Profile</span>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const age = getAge(profile.dob);
  const formattedDob = formatDateLong(profile.dob);
  const heightMeters = HEIGHT_METERS[profile.height] ? ` (${HEIGHT_METERS[profile.height]})` : '';
  const heightDisplay = profile.height ? `${profile.height}${heightMeters}` : 'Height Not Specified';
  const candidateNameDisplay = profile.displayName || profile.user?.fullName || 'Doctor Candidate';
  const candidateLocationDisplay =
    profile.currentLocation?.formattedAddress ||
    [profile.city, profile.state, profile.country].filter(Boolean).join(', ') ||
    'Location Not Specified';
  const qualificationDisplay = profile.education || profile.degree || 'Medical Qualification Not Specified';
  const professionDisplay = profile.profession || 'Medical Profession Not Specified';

  const completionData = calculateWeightedCompletion(profile, profile.user);
  const completionScore = profile.completionScore ?? profile.completionPercentage ?? completionData.score;
  const completionCategories: ProfileCategoryItem[] = profile.completionBreakdown || completionData.categories;

  // Filter categories
  const filteredCategories = completionCategories.filter((c) => {
    if (completionFilter === 'completed') return c.completed;
    if (completionFilter === 'pending') return c.status === 'pending';
    if (completionFilter === 'incomplete') return c.status === 'incomplete';
    return true;
  });

  // Verification states
  const rawStatus = (
    verifications?.overallStatus ||
    profile.verificationStatus ||
    profile.user?.verificationStatus ||
    'UNVERIFIED'
  ).toUpperCase();
  const isDoctorVerified =
    rawStatus === 'VERIFIED' ||
    rawStatus === 'DOCTOR_VERIFIED' ||
    Boolean(verifications?.isVerified) ||
    Boolean(profile.user?.verified);
  const isPending = !isDoctorVerified && rawStatus === 'PENDING';
  const isRejected = !isDoctorVerified && rawStatus === 'REJECTED';
  const isFullyVerified = Boolean(
    (profile.user?.verified || verifications?.isVerified) && isDoctorVerified
  );

  const profileIdDisplay = profile.candidateId || `WJ${String(profile._id || '000000').slice(-6).toUpperCase()}`;

  // Membership states
  const planName = (membership.plan || profile.membership || 'FREE').toUpperCase();
  const isMembershipExpired = membership.status === 'EXPIRED';
  const isPremiumActive = (membership.isPremium || planName !== 'FREE') && !isMembershipExpired;

  return (
    <main className="min-h-screen bg-[#FAF7F4] text-[#0F172A] pb-16 sm:pb-20">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 transition-all duration-300 animate-slide-in ${
            toastMessage.type === 'success'
              ? 'bg-emerald-800 text-white border border-emerald-700'
              : 'bg-rose-800 text-white border border-rose-700'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4.5 h-4.5 text-emerald-300 shrink-0" />
          ) : (
            <AlertCircle className="w-4.5 h-4.5 text-rose-300 shrink-0" />
          )}
          <span className="text-xs sm:text-sm font-semibold">{toastMessage.text}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-2 text-white/70 hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 space-y-4 sm:space-y-6">
        {/* ════════════════════════════════════════════════════
            1. SEPARATE PROFILE BANNER & PROFILE SUMMARY CARD
           ════════════════════════════════════════════════════ */}
        <section id="profile-header" className="space-y-6 sm:space-y-7">
          {/* Top Banner (Standalone Premium Burgundy/Rose Container) */}
          <ProfileBanner
            profileId={profileIdDisplay}
            isMembershipExpired={isMembershipExpired}
            isPremiumActive={isPremiumActive}
            planName={planName}
          />

          {/* Profile Summary Card (Distinct Pure White Card with 24px-32px Vertical Gap) */}
          <ProfileSummaryCard
            primaryPhoto={profile.primaryPhoto}
            candidateName={candidateNameDisplay}
            age={age}
            gender={profile.gender}
            height={heightDisplay}
            location={candidateLocationDisplay}
            qualification={qualificationDisplay}
            profession={professionDisplay}
            isFullyVerified={isFullyVerified}
            isDoctorVerified={isDoctorVerified}
            isPending={isPending}
            isRejected={isRejected}
            hasPhotos={Boolean(profile.photos && profile.photos.length > 0)}
            onEditProfile={() => openSectionModal('basic')}
            onManagePhotos={() => setIsPhotoModalOpen(true)}
            onOpenPrivacy={() => setIsPrivacyModalOpen(true)}
          />
        </section>

        {/* ════════════════════════════════════════════════════
            MOBILE JUMP TO SECTION ACCORDION / MENU
           ════════════════════════════════════════════════════ */}
        <div className="lg:hidden bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Jump to Section
          </label>
          <select
            value={activeNavSection}
            onChange={(e) => scrollToSection(e.target.value)}
            className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800"
          >
            <option value="profile-strength">Profile Strength</option>
            <option value="medical-verification">Medical Verification</option>
            <option value="basic-details">Basic Details</option>
            <option value="about-me">About Me</option>
            <option value="medical-education">Medical Education & Qualifications</option>
            <option value="medical-career">Medical Career & Practice</option>
            <option value="medical-registration">Medical Registration</option>
            <option value="family">Family Details</option>
            <option value="preferences">Partner Preferences</option>
            <option value="horoscope">Horoscope</option>
            <option value="lifestyle">Lifestyle & Interests</option>
            <option value="photos">Photos</option>
          </select>
        </div>

        {/* ════════════════════════════════════════════════════
            TWO-COLUMN DESKTOP LAYOUT (Main 8 Cols + Rail 4 Cols)
           ════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* ══════════════════════════════════════════════════
              LEFT: MAIN PROFILE SECTIONS (8 Cols)
             ══════════════════════════════════════════════════ */}
          <div className="lg:col-span-8 space-y-6 sm:space-y-8">
            {/* 2. PROFILE COMPLETION (Profile Strength & Visibility) */}
            <section
              id="profile-strength"
              className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-7 space-y-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="font-serif text-base sm:text-lg font-bold text-[#0F172A] flex items-center gap-2">
                    <Sparkles className="w-4.5 h-4.5 text-[#E51F3E]" />
                    <span>Profile Strength & Completion</span>
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Calculated accurately across all 11 doctor matrimonial criteria. Complete missing fields to maximize doctor match visibility.
                  </p>
                </div>
                <div className="text-left sm:text-right shrink-0">
                  <span className="text-3xl font-bold text-[#800020]">{completionScore}%</span>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Completed</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="w-full h-3.5 rounded-full bg-slate-100 overflow-hidden p-0.5 border border-slate-200/70">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#800020] via-[#A81C39] to-[#E51F3E] transition-all duration-700"
                    style={{ width: `${Math.max(4, completionScore)}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[11px] text-slate-500 font-semibold px-1">
                  <span>{completionCategories.filter(c => c.completed).length} of {completionCategories.length} sections complete</span>
                  <span>{100 - completionScore}% remaining to 100%</span>
                </div>
              </div>

              {/* Category Status Filters */}
              <div className="flex items-center gap-1.5 border-b border-slate-100 pb-3 overflow-x-auto text-xs">
                <button
                  type="button"
                  onClick={() => setCompletionFilter('all')}
                  className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                    completionFilter === 'all'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All ({completionCategories.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCompletionFilter('completed')}
                  className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                    completionFilter === 'completed'
                      ? 'bg-emerald-700 text-white shadow-2xs'
                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  }`}
                >
                  ✓ Completed ({completionCategories.filter(c => c.completed).length})
                </button>
                <button
                  type="button"
                  onClick={() => setCompletionFilter('pending')}
                  className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                    completionFilter === 'pending'
                      ? 'bg-amber-700 text-white shadow-2xs'
                      : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                  }`}
                >
                  ⏳ Pending ({completionCategories.filter(c => c.status === 'pending').length})
                </button>
                <button
                  type="button"
                  onClick={() => setCompletionFilter('incomplete')}
                  className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                    completionFilter === 'incomplete'
                      ? 'bg-rose-700 text-white shadow-2xs'
                      : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
                  }`}
                >
                  ○ Incomplete ({completionCategories.filter(c => c.status === 'incomplete').length})
                </button>
              </div>

              {/* Category Status Badges Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {filteredCategories.map((c) => (
                  <div
                    key={c.id}
                    className={`p-2.5 px-3 rounded-2xl text-xs flex items-center justify-between border transition ${
                      c.status === 'completed'
                        ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                        : c.status === 'pending'
                        ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-rose-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                        c.status === 'completed'
                          ? 'bg-emerald-600 text-white'
                          : c.status === 'pending'
                          ? 'bg-amber-500 text-white animate-pulse'
                          : 'bg-slate-200 text-slate-600'
                      }`}>
                        {c.status === 'completed' ? '✓' : c.status === 'pending' ? '⏳' : '○'}
                      </span>
                      <span className="font-semibold text-slate-800">{c.label}</span>
                      <span className="text-[10px] text-slate-400 font-bold">({c.weight}%)</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {c.status === 'completed' ? (
                        <button
                          type="button"
                          onClick={() => scrollToSection(c.id)}
                          className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
                        >
                          View
                        </button>
                      ) : c.status === 'pending' ? (
                        <button
                          type="button"
                          onClick={() => scrollToSection('medical-verification')}
                          className="text-[11px] font-bold text-amber-800 hover:underline cursor-pointer"
                        >
                          Reviewing
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openModalForSection(c.id)}
                          className="px-2.5 py-1 rounded-lg bg-[#E51F3E] text-white text-[10.5px] font-bold shadow-2xs hover:bg-[#c91834] transition cursor-pointer"
                        >
                          + Complete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 3. MEDICAL VERIFICATION SECTION */}
            <section
              id="medical-verification"
              className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-7 space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-50 text-[#E51F3E] flex items-center justify-center shrink-0 border border-rose-100">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg font-bold text-[#0F172A] flex items-center gap-2 flex-wrap">
                      <span>Medical Profile Verification</span>
                      {isFullyVerified ? (
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          ✓ Verified Doctor
                        </span>
                      ) : isPending ? (
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 animate-pulse">
                          ⏳ Verification Under Review
                        </span>
                      ) : isRejected ? (
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-900 border border-rose-200">
                          ⚠️ Action Required
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          Not Submitted
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Statutory doctor credentials and KYC verification ensuring authentic healthcare professional matrimony.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenDocUploadModal('MEDICAL_REGISTRATION')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#E51F3E] to-[#CC1432] text-white text-xs font-bold shadow-xs hover:shadow-md transition cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Document</span>
                  </button>
                  <Link
                    href="/profile/verification"
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                  >
                    <span>Verification Center</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Overall Verification Status Alert */}
              {isFullyVerified ? (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-start gap-3 text-xs text-emerald-950">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm text-emerald-950">Verified Doctor Matrimonial Profile</h4>
                    <p className="mt-0.5 text-emerald-800 leading-relaxed">
                      Your Medical Council Registration and Degree certificates have been verified by Wonderful Jodi medical compliance. Your profile displays the authentic Doctor Trust Badge.
                    </p>
                  </div>
                </div>
              ) : isPending ? (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-start gap-3 text-xs text-amber-950">
                  <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-spin" />
                  <div>
                    <h4 className="font-bold text-sm text-amber-950">Documents Queued For Administrator Review</h4>
                    <p className="mt-0.5 text-amber-800 leading-relaxed">
                      Your submitted documents have been received and are undergoing review by our administration team. Verification typically completes within 24 to 48 business hours.
                    </p>
                  </div>
                </div>
              ) : isRejected ? (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200/80 flex items-start gap-3 text-xs text-rose-950">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm text-rose-950">Verification Requires Correction</h4>
                    <p className="mt-0.5 text-rose-800 leading-relaxed">
                      One or more of your submitted documents was not approved by the administrator. Please inspect the rejection reason below and upload a clear, legible copy.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3 text-xs text-slate-800">
                  <Lock className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">Medical Verification Pending</h4>
                    <p className="mt-0.5 text-slate-600 leading-relaxed">
                      Upload your Medical Council Registration Certificate and Degree to unlock the Verified Doctor Trust Badge and expand matching trust.
                    </p>
                  </div>
                </div>
              )}

              {/* 4 Document Category Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {VERIFICATION_DOC_CONFIG.map((cat) => {
                  const catSummary = verifications?.summary?.[cat.key];
                  const docStatus = (catSummary?.status || 'NOT_SUBMITTED').toUpperCase();
                  const isCatApproved = docStatus === 'APPROVED';
                  const isCatPending = docStatus === 'PENDING';
                  const isCatRejected = docStatus === 'REJECTED';

                  return (
                    <div
                      key={cat.key}
                      className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 transition ${
                        isCatApproved
                          ? 'bg-emerald-50/40 border-emerald-200'
                          : isCatPending
                          ? 'bg-amber-50/40 border-amber-200'
                          : isCatRejected
                          ? 'bg-rose-50/50 border-rose-200'
                          : 'bg-slate-50/60 border-slate-200'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 shadow-2xs">
                            {cat.badge}
                          </span>
                          {isCatApproved ? (
                            <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Approved</span>
                            </span>
                          ) : isCatPending ? (
                            <span className="text-[11px] font-bold text-amber-700 flex items-center gap-1 animate-pulse">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              <span>Under Review</span>
                            </span>
                          ) : isCatRejected ? (
                            <span className="text-[11px] font-bold text-rose-700 flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                              <span>Rejected</span>
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold text-slate-500">
                              Not Submitted
                            </span>
                          )}
                        </div>

                        <h4 className="font-serif text-sm font-bold text-slate-900">{cat.title}</h4>
                        <p className="text-xs text-slate-500 leading-relaxed">{cat.description}</p>
                        <p className="text-[11px] text-slate-400 italic">e.g. {cat.examples}</p>
                      </div>

                      {/* Status / Actions Area */}
                      <div className="pt-2 border-t border-slate-200/60">
                        {isCatApproved ? (
                          <div className="flex items-center justify-between text-xs text-emerald-800 font-semibold">
                            <span>✓ Verified on {formatDateLong(catSummary?.reviewedAt || catSummary?.submittedAt)}</span>
                            <span className="text-[10.5px] px-2 py-0.5 bg-emerald-100 rounded-full font-bold">Attempt #{catSummary?.attemptNumber || 1}</span>
                          </div>
                        ) : isCatPending ? (
                          <div className="flex items-center justify-between text-xs text-amber-800">
                            <span className="flex items-center gap-1 font-medium">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              <span>Submitted on {formatDateLong(catSummary?.submittedAt)}</span>
                            </span>
                            <span className="text-[10.5px] px-2 py-0.5 bg-amber-100 rounded-full font-bold">Attempt #{catSummary?.attemptNumber || 1}</span>
                          </div>
                        ) : isCatRejected ? (
                          <div className="space-y-2">
                            <div className="p-2.5 bg-rose-100/70 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-0.5">
                              <span className="font-bold flex items-center gap-1 text-[11px] text-rose-950">
                                <AlertCircle className="w-3 h-3 text-rose-600" />
                                Rejection Reason:
                              </span>
                              <p className="text-rose-800 font-medium">{catSummary?.rejectionReason || 'Document unreadable or invalid.'}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleOpenDocUploadModal(cat.key)}
                              className="w-full py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              <span>Resubmit Corrected Document (Attempt #{(catSummary?.attemptNumber || 1) + 1})</span>
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenDocUploadModal(cat.key)}
                            className="w-full py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <Upload className="w-3.5 h-3.5 text-[#E51F3E]" />
                            <span>Upload Document</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* IDOR Privacy Security Assurance */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#E51F3E] shrink-0" />
                  <span>
                    <strong>Strict Privacy Protection:</strong> Verification documents are encrypted and accessible exclusively to authorized Wonderful Jodi administrators. Documents are never shared with public visitors or prospective matches.
                  </span>
                </div>
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">
                  IDOR Protected
                </span>
              </div>
            </section>

            {/* Privacy & Safety Controls */}
            <section
              id="safety-settings"
              className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-7 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#E51F3E]" />
                  <h3 className="font-serif text-lg font-bold text-[#0F172A]">Privacy & Safety Controls</h3>
                </div>
                <Link
                  href="/profile/blocked"
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#E51F3E] hover:underline"
                >
                  <span>Manage Blocked Profiles</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-rose-50/40 border border-rose-100">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Ban className="w-4 h-4 text-[#E51F3E]" />
                    <span>Blocked Profiles & Unwanted Contact Protection</span>
                  </span>
                  <p className="text-xs text-slate-500">
                    Review or unblock doctor profiles you have blocked. Blocked members cannot view your details, search for you, or send you messages.
                  </p>
                </div>
                <Link
                  href="/profile/blocked"
                  className="px-4 py-2 rounded-full bg-white border border-rose-200 text-xs font-bold text-rose-700 hover:bg-rose-50 transition shadow-2xs whitespace-nowrap"
                >
                  View Blocked Profiles
                </Link>
              </div>
            </section>

            {/* 4. BASIC DETAILS CARD */}
            <section
              id="basic-details"
              className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-7 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-[#E51F3E]" />
                  <div>
                    <h3 className="font-serif text-lg font-bold text-[#0F172A]">Basic Details</h3>
                    <p className="text-[11px] text-slate-500">Brief overview of personal information</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openSectionModal('basic')}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#E51F3E] hover:underline cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs sm:text-sm">
                <div className="bg-slate-50 p-3.5 rounded-2xl">
                  <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block">Height</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">{heightDisplay}</span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl">
                  <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block">Date of Birth</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">{formattedDob || 'Not Specified'}</span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl">
                  <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block">Age</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">{age !== null ? `${age} Years` : 'Not Specified'}</span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl">
                  <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block">Gender</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">{profile.gender || 'Not Specified'}</span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl">
                  <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block">Marital Status</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">{profile.maritalStatus || 'Not Specified'}</span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl">
                  <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block">Mother Tongue</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">{profile.motherTongue || 'Not Specified'}</span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl">
                  <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block">Religion</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">{profile.religion || 'Not Specified'}</span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl">
                  <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block">Community</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {profile.caste ? (
                      <>
                        {profile.caste}
                        {profile.subCaste && profile.subCaste !== 'No specific sub-caste' && (
                          <span className="text-slate-500 font-medium"> ({profile.subCaste})</span>
                        )}
                      </>
                    ) : (
                      <button onClick={() => openSectionModal('basic')} className="text-[#E51F3E] font-bold cursor-pointer">+ Add Community</button>
                    )}
                  </span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl">
                  <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block">Current Location</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {candidateLocationDisplay}
                  </span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl">
                  <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block">Income Range</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {profile.annualIncome || (
                      <button onClick={() => openSectionModal('basic')} className="text-[#E51F3E] font-bold cursor-pointer">+ Add Income Range</button>
                    )}
                  </span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl sm:col-span-2">
                  <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block">Profile Managed By</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">{profile.profileManagedBy || 'Self'}</span>
                </div>
              </div>
            </section>

            {/* 5. ABOUT ME CARD */}
            <section
              id="about-me"
              className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-7 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#E51F3E]" />
                  <div>
                    <h3 className="font-serif text-lg font-bold text-[#0F172A]">About Me</h3>
                    <p className="text-[11px] text-slate-500">Personal background, values, and profile managed by</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openSectionModal('about')}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#E51F3E] hover:underline cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-2xl">
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                    {profile.about ? (
                      profile.about
                    ) : (
                      <span className="text-slate-400 italic">
                        Add a short introduction about yourself, your clinical practice, and your expectations from a partner.
                      </span>
                    )}
                  </p>
                </div>

                {!profile.about && (
                  <button
                    type="button"
                    onClick={() => openSectionModal('about')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-xs font-bold text-slate-700 hover:text-[#E51F3E] transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add About Me</span>
                  </button>
                )}

                <div className="flex flex-wrap items-center gap-2.5 text-xs pt-1">
                  <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 font-semibold">
                    Profile Managed By: <strong className="text-slate-900">{profile.profileManagedBy || 'Self'}</strong>
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 font-semibold">
                    Diet: <strong className="text-slate-900">{profile.lifestyleInterests?.diet || profile.foodPreference || 'Not Specified'}</strong>
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 font-semibold">
                    Smoking / Drinking: <strong className="text-slate-900">
                      {profile.lifestyleInterests?.smoking || profile.smoking || 'Not Specified'} • {profile.lifestyleInterests?.alcohol || profile.drinking || 'Not Specified'}
                    </strong>
                  </span>
                </div>
              </div>
            </section>

            {/* 6. MEDICAL EDUCATION & QUALIFICATIONS */}
            <section
              id="medical-education"
              className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-7 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-[#E51F3E]" />
                  <div>
                    <h3 className="font-serif text-lg font-bold text-[#0F172A]">Medical Education & Qualifications</h3>
                    <p className="text-[11px] text-slate-500">Authorized medical degrees, institutions, and graduation</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openSectionModal('medical_edu')}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#E51F3E] hover:underline cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs sm:text-sm">
                <div className="bg-rose-50/50 border border-rose-100 p-3.5 rounded-2xl">
                  <span className="text-rose-800 text-[10.5px] font-bold uppercase tracking-wider block">
                    Highest Qualification
                  </span>
                  <span className="font-bold text-slate-900 mt-0.5 block text-sm sm:text-base">
                    {profile.education || (
                      <button onClick={() => openSectionModal('medical_edu')} className="text-[#E51F3E] font-bold text-xs cursor-pointer">+ Add Qualification</button>
                    )}
                  </span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl">
                  <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block">
                    Medical College
                  </span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {profile.medicalCollege || (
                      <button onClick={() => openSectionModal('medical_edu')} className="text-[#E51F3E] font-bold cursor-pointer">+ Add Medical College</button>
                    )}
                  </span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl">
                  <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block">
                    University
                  </span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {profile.medicalUniversity || (
                      <button onClick={() => openSectionModal('medical_edu')} className="text-[#E51F3E] font-bold cursor-pointer">+ Add University</button>
                    )}
                  </span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl">
                  <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block">
                    Graduation Year
                  </span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {profile.graduationYear || (
                      <button onClick={() => openSectionModal('medical_edu')} className="text-[#E51F3E] font-bold cursor-pointer">+ Add Year</button>
                    )}
                  </span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl sm:col-span-2">
                  <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block">
                    Additional Qualification / Fellowship
                  </span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {profile.additionalQualification || (
                      <button onClick={() => openSectionModal('medical_edu')} className="text-[#E51F3E] font-bold cursor-pointer">+ Add Additional Qualification</button>
                    )}
                  </span>
                </div>
              </div>
            </section>

            {/* 7. MEDICAL CAREER & PRACTICE */}
            <section
              id="medical-career"
              className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-7 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-[#E51F3E]" />
                  <div>
                    <h3 className="font-serif text-lg font-bold text-[#0F172A]">Medical Career & Practice</h3>
                    <p className="text-[11px] text-slate-500">Clinical practice, designation, hospital, and experience</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openSectionModal('medical_career')}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#E51F3E] hover:underline cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs sm:text-sm">
                <div className="bg-slate-50 p-3.5 rounded-2xl">
                  <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block">Profession</span>
                  <span className="font-bold text-slate-900 mt-0.5 block">
                    {profile.profession || (
                      <button onClick={() => openSectionModal('medical_career')} className="text-[#E51F3E] font-bold cursor-pointer">+ Add Profession</button>
                    )}
                  </span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl">
                  <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block">Current Designation</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {profile.currentRole || profile.profession || (
                      <button onClick={() => openSectionModal('medical_career')} className="text-[#E51F3E] font-bold cursor-pointer">+ Add Designation</button>
                    )}
                  </span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl">
                  <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block">Hospital / Clinic</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {profile.currentHospital || profile.company || (
                      <button onClick={() => openSectionModal('medical_career')} className="text-[#E51F3E] font-bold cursor-pointer">+ Add Hospital / Clinic</button>
                    )}
                  </span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl">
                  <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block">Work Location</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {profile.workLocation || profile.city || (
                      <button onClick={() => openSectionModal('medical_career')} className="text-[#E51F3E] font-bold cursor-pointer">+ Add Work Location</button>
                    )}
                  </span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl">
                  <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block">Years of Experience</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {profile.medicalExperience || profile.experience || (
                      <button onClick={() => openSectionModal('medical_career')} className="text-[#E51F3E] font-bold cursor-pointer">+ Add Experience</button>
                    )}
                  </span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl">
                  <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block">Practice Type</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {profile.workType || (
                      <button onClick={() => openSectionModal('medical_career')} className="text-[#E51F3E] font-bold cursor-pointer">+ Add Practice Type</button>
                    )}
                  </span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl sm:col-span-2">
                  <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block">Income Range</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {profile.annualIncome || (
                      <button onClick={() => openSectionModal('medical_career')} className="text-[#E51F3E] font-bold cursor-pointer">+ Add Income Range</button>
                    )}
                  </span>
                </div>
              </div>
            </section>

            {/* 8. MEDICAL REGISTRATION */}
            <section
              id="medical-registration"
              className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-7 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-[#E51F3E]" />
                  <div>
                    <h3 className="font-serif text-lg font-bold text-[#0F172A]">Medical Registration</h3>
                    <p className="text-[11px] text-slate-500">MCI / State Medical Council compliance details</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openSectionModal('medical_reg')}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#E51F3E] hover:underline cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs sm:text-sm">
                <div className="bg-slate-50 p-3.5 rounded-2xl">
                  <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block">
                    Medical Council
                  </span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {profile.medicalCouncil || (
                      <button onClick={() => openSectionModal('medical_reg')} className="text-[#E51F3E] font-bold cursor-pointer">+ Add Medical Council</button>
                    )}
                  </span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl">
                  <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block">
                    Registration Status
                  </span>
                  <span className="font-semibold mt-0.5 block">
                    {isDoctorVerified ? (
                      <span className="text-emerald-700 font-bold">✓ Medical Registration Verified</span>
                    ) : (
                      <span className="text-amber-700 font-semibold flex items-center justify-between">
                        <span>Medical Registration Pending</span>
                        <Link href="/profile/verification" className="text-[#E51F3E] hover:underline text-[11px] font-bold">
                          Submit Documents
                        </Link>
                      </span>
                    )}
                  </span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl">
                  <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block">
                    Registration Year
                  </span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {profile.registrationYear || profile.graduationYear || (
                      <button onClick={() => openSectionModal('medical_reg')} className="text-[#E51F3E] font-bold cursor-pointer">+ Add Registration Year</button>
                    )}
                  </span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl">
                  <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block">
                    Registration Number (Protected)
                  </span>
                  <span className="font-mono text-slate-800 mt-0.5 block">
                    {profile.medicalRegistrationNumber ? `••••-${profile.medicalRegistrationNumber.slice(-4)}` : (
                      <button onClick={() => openSectionModal('medical_reg')} className="text-[#E51F3E] font-bold font-sans cursor-pointer">+ Add Number</button>
                    )}
                  </span>
                </div>
              </div>
            </section>

            {/* 9. FAMILY DETAILS */}
            <section
              id="family"
              className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-7 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Home className="w-5 h-5 text-[#E51F3E]" />
                  <div>
                    <h3 className="font-serif text-lg font-bold text-[#0F172A]">Family Details</h3>
                    <p className="text-[11px] text-slate-500">Family values, parent background, and siblings</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openSectionModal('family')}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#E51F3E] hover:underline cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs sm:text-sm">
                <div className="bg-slate-50 p-3.5 rounded-2xl">
                  <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block">Family Type</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {profile.familyType || (
                      <button onClick={() => openSectionModal('family')} className="text-[#E51F3E] font-bold cursor-pointer">+ Add Family Type</button>
                    )}
                  </span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl">
                  <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block">Family Status</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {profile.familyStatus || (
                      <button onClick={() => openSectionModal('family')} className="text-[#E51F3E] font-bold cursor-pointer">+ Add Family Status</button>
                    )}
                  </span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl">
                  <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block">Native Place</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {profile.nativePlace || profile.city || (
                      <button onClick={() => openSectionModal('family')} className="text-[#E51F3E] font-bold cursor-pointer">+ Add Native Place</button>
                    )}
                  </span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl">
                  <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block">Father's Occupation</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {profile.fatherOccupation || (
                      <button onClick={() => openSectionModal('family')} className="text-[#E51F3E] font-bold cursor-pointer">+ Add Father's Occupation</button>
                    )}
                  </span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl">
                  <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block">Mother's Occupation</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {profile.motherOccupation || (
                      <button onClick={() => openSectionModal('family')} className="text-[#E51F3E] font-bold cursor-pointer">+ Add Mother's Occupation</button>
                    )}
                  </span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl">
                  <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block">Siblings</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {profile.siblings || (
                      <button onClick={() => openSectionModal('family')} className="text-[#E51F3E] font-bold cursor-pointer">+ Add Siblings</button>
                    )}
                  </span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl sm:col-span-2">
                  <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block">Family Values</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {profile.familyValues || (
                      <button onClick={() => openSectionModal('family')} className="text-[#E51F3E] font-bold cursor-pointer">+ Add Family Values</button>
                    )}
                  </span>
                </div>
              </div>
            </section>

            {/* 10. PARTNER PREFERENCES */}
            <section
              id="preferences"
              className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-7 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-[#E51F3E]" />
                  <div>
                    <h3 className="font-serif text-lg font-bold text-[#0F172A]">Partner Preferences</h3>
                    <p className="text-[11px] text-slate-500">Doctor-specific matchmaking criteria and expectations</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openSectionModal('preferences')}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#E51F3E] hover:underline cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs sm:text-sm">
                <div className="bg-slate-50 p-3.5 rounded-2xl">
                  <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block">Preferred Age</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {profile.partnerPreferences?.preferredAgeMin && profile.partnerPreferences?.preferredAgeMax
                      ? `${profile.partnerPreferences.preferredAgeMin} - ${profile.partnerPreferences.preferredAgeMax} Years`
                      : (
                        <button onClick={() => openSectionModal('preferences')} className="text-[#E51F3E] font-bold cursor-pointer">+ Set Preferred Age</button>
                      )}
                  </span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl">
                  <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block">Preferred Qualification</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {profile.partnerPreferences?.preferredQualification || (
                      <button onClick={() => openSectionModal('preferences')} className="text-[#E51F3E] font-bold cursor-pointer">+ Add Qualification</button>
                    )}
                  </span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl">
                  <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block">Preferred Specialization</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {profile.partnerPreferences?.preferredSpecialization || (
                      <button onClick={() => openSectionModal('preferences')} className="text-[#E51F3E] font-bold cursor-pointer">+ Add Specialization</button>
                    )}
                  </span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl">
                  <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block">Preferred Location</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {profile.partnerPreferences?.preferredLocation || (
                      <button onClick={() => openSectionModal('preferences')} className="text-[#E51F3E] font-bold cursor-pointer">+ Add Preferred Location</button>
                    )}
                  </span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl sm:col-span-2">
                  <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block">Other Preferences</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {profile.partnerPreferences?.otherPreferences || (
                      <button onClick={() => openSectionModal('preferences')} className="text-[#E51F3E] font-bold cursor-pointer">+ Add Preferences</button>
                    )}
                  </span>
                </div>
              </div>
            </section>

            {/* 11. HOROSCOPE CARD */}
            <section
              id="horoscope"
              className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-7 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Compass className="w-5 h-5 text-[#E51F3E]" />
                  <div>
                    <h3 className="font-serif text-lg font-bold text-[#0F172A]">Horoscope & Kundali</h3>
                    <p className="text-[11px] text-slate-500">Vedic horoscope, Rashi, Nakshatra, and Kundali matching</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href="/kundali-match"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-[#800020] text-xs font-bold hover:bg-amber-100 transition border border-amber-200/70"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Match Kundali Now →</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => openSectionModal('horoscope')}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#E51F3E] hover:underline cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{profile.horoscope?.rashi ? 'Edit' : '+ Add Horoscope'}</span>
                  </button>
                </div>
              </div>

              {profile.horoscope?.rashi || profile.horoscope?.timeOfBirth ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="bg-slate-50 p-3 rounded-2xl">
                      <span className="text-slate-400 text-[10px] font-bold uppercase block">Date of Birth</span>
                      <span className="font-semibold text-slate-800 mt-0.5 block">{formattedDob || 'Not specified'}</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-2xl">
                      <span className="text-slate-400 text-[10px] font-bold uppercase block">Time of Birth</span>
                      <span className="font-semibold text-slate-800 mt-0.5 block">{profile.horoscope.timeOfBirth || 'Not specified'}</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-2xl">
                      <span className="text-slate-400 text-[10px] font-bold uppercase block">Place of Birth</span>
                      <span className="font-semibold text-slate-800 mt-0.5 block truncate">{profile.horoscope.placeOfBirth || profile.city || 'Not specified'}</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-2xl">
                      <span className="text-slate-400 text-[10px] font-bold uppercase block">Rashi</span>
                      <span className="font-semibold text-slate-800 mt-0.5 block truncate">{profile.horoscope.rashi || 'Not specified'}</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-2xl">
                      <span className="text-slate-400 text-[10px] font-bold uppercase block">Nakshatra</span>
                      <span className="font-semibold text-slate-800 mt-0.5 block truncate">{profile.horoscope.nakshatra || 'Not specified'}</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-2xl">
                      <span className="text-slate-400 text-[10px] font-bold uppercase block">Lagna</span>
                      <span className="font-semibold text-slate-800 mt-0.5 block">{profile.horoscope.lagna || 'Not specified'}</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-2xl">
                      <span className="text-slate-400 text-[10px] font-bold uppercase block">Manglik Status</span>
                      <span className="font-bold text-slate-800 mt-0.5 block">{profile.horoscope.manglik || 'Not specified'}</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-2xl">
                      <span className="text-slate-400 text-[10px] font-bold uppercase block">Gotra</span>
                      <span className="font-semibold text-slate-800 mt-0.5 block">{profile.horoscope.gotra || 'Not specified'}</span>
                    </div>
                  </div>

                  {(!profile.horoscope?.timeOfBirth || !profile.horoscope?.placeOfBirth) && (
                    <div className="p-3 bg-amber-50/80 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-center justify-between gap-3">
                      <span>Complete your birth details to enable Kundali matching.</span>
                      <button
                        type="button"
                        onClick={() => openSectionModal('horoscope')}
                        className="px-3 py-1 bg-white rounded-xl border border-amber-300 font-bold text-amber-900 shrink-0 hover:bg-amber-100 transition cursor-pointer"
                      >
                        Complete Horoscope
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-slate-50 text-center space-y-3">
                  <Compass className="w-7 h-7 text-slate-400 mx-auto" />
                  <p className="text-xs text-slate-600 font-semibold">
                    Complete your birth details to enable Kundali matching.
                  </p>
                  <button
                    type="button"
                    onClick={() => openSectionModal('horoscope')}
                    className="px-4 py-2 rounded-xl bg-[#E51F3E] text-white text-xs font-bold hover:bg-[#c91834] transition shadow-xs cursor-pointer"
                  >
                    Complete Horoscope
                  </button>
                </div>
              )}
            </section>

            {/* 12. LIFESTYLE & INTERESTS */}
            <section
              id="lifestyle"
              className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-7 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Utensils className="w-5 h-5 text-[#E51F3E]" />
                  <div>
                    <h3 className="font-serif text-lg font-bold text-[#0F172A]">Lifestyle & Interests</h3>
                    <p className="text-[11px] text-slate-500">Diet, habits, fitness, hobbies, and leisure</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openSectionModal('lifestyle')}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#E51F3E] hover:underline cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
              </div>

              <div className="space-y-4 text-xs sm:text-sm">
                <div>
                  <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block mb-2">
                    Dietary & Living Habits
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3.5 py-1.5 rounded-full bg-slate-100 text-slate-800 font-semibold flex items-center gap-1.5">
                      <Utensils className="w-3.5 h-3.5 text-slate-500" />
                      <span>{profile.lifestyleInterests?.diet || profile.foodPreference || 'Not Specified'}</span>
                    </span>
                    <span className="px-3.5 py-1.5 rounded-full bg-slate-100 text-slate-800 font-semibold">
                      Smoking: {profile.lifestyleInterests?.smoking || profile.smoking || 'Not Specified'}
                    </span>
                    <span className="px-3.5 py-1.5 rounded-full bg-slate-100 text-slate-800 font-semibold">
                      Alcohol: {profile.lifestyleInterests?.alcohol || profile.drinking || 'Not Specified'}
                    </span>
                    <span className="px-3.5 py-1.5 rounded-full bg-slate-100 text-slate-800 font-semibold flex items-center gap-1.5">
                      <Dumbbell className="w-3.5 h-3.5 text-slate-500" />
                      <span>{profile.lifestyleInterests?.exercise || 'Not Specified'}</span>
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block mb-2">
                    Hobbies & Interests
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {(profile.lifestyleInterests?.hobbies?.length
                      ? profile.lifestyleInterests.hobbies
                      : profile.hobbies?.length
                      ? profile.hobbies
                      : []
                    ).map((hobby: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-3 py-1 rounded-full bg-rose-50 text-[#800020] border border-rose-200/80 text-xs font-semibold"
                      >
                        {hobby}
                      </span>
                    ))}
                    {!(profile.lifestyleInterests?.hobbies?.length || profile.hobbies?.length) && (
                      <button
                        type="button"
                        onClick={() => openSectionModal('lifestyle')}
                        className="text-xs font-bold text-[#E51F3E] hover:underline cursor-pointer"
                      >
                        + Add Hobbies & Interests
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="bg-slate-50 p-3 rounded-2xl">
                    <span className="text-slate-400 text-[10px] font-bold uppercase block">Languages Spoken</span>
                    <span className="font-semibold text-slate-800 mt-0.5 block">
                      {profile.lifestyleInterests?.languages?.length
                        ? profile.lifestyleInterests.languages.join(', ')
                        : profile.motherTongue || (
                          <button onClick={() => openSectionModal('lifestyle')} className="text-[#E51F3E] font-bold cursor-pointer">+ Add Languages</button>
                        )}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-2xl">
                    <span className="text-slate-400 text-[10px] font-bold uppercase block">Pets / Other</span>
                    <span className="font-semibold text-slate-800 mt-0.5 block">
                      {profile.lifestyleInterests?.pets || 'Not Specified'}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* 13. PHOTOS GALLERY */}
            <section
              id="photos"
              className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-7 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-[#E51F3E]" />
                  <div>
                    <h3 className="font-serif text-lg font-bold text-[#0F172A]">Photos</h3>
                    <p className="text-[11px] text-slate-500">
                      {(profile.photos?.length || 0)} of 6 photos uploaded
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPhotoModalOpen(true)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#E51F3E] hover:underline cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Manage Photos</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                {(profile.photos || []).map((photo: string, index: number) => {
                  const isPrimary = profile.primaryPhoto === photo;
                  return (
                    <div
                      key={index}
                      className={`relative group rounded-2xl overflow-hidden border bg-slate-100 aspect-square shadow-2xs cursor-pointer ${
                        isPrimary ? 'border-[#E51F3E] ring-2 ring-[#E51F3E]/20' : 'border-slate-200'
                      }`}
                      onClick={() => setLightboxImage(photo)}
                    >
                      <img src={photo} alt="Gallery" className="w-full h-full object-cover" />
                      {isPrimary && (
                        <span className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E51F3E] text-white text-[9.5px] font-bold shadow-xs">
                          <Star className="w-2.5 h-2.5 fill-white" />
                          <span>Primary</span>
                        </span>
                      )}
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                        <Eye className="w-5 h-5" />
                      </div>
                    </div>
                  );
                })}

                {(profile.photos?.length || 0) < 6 && (
                  <button
                    type="button"
                    onClick={() => setIsPhotoModalOpen(true)}
                    className="border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center p-4 text-center hover:bg-rose-50/50 hover:border-[#E51F3E] transition aspect-square cursor-pointer"
                  >
                    <Plus className="w-6 h-6 text-slate-400 mb-1" />
                    <span className="text-xs font-bold text-slate-700">Add Photos</span>
                    <span className="text-[10px] text-slate-400">Up to 6 photos</span>
                  </button>
                )}
              </div>
            </section>
          </div>

          {/* ══════════════════════════════════════════════════
              RIGHT: QUICK JUMP, MEMBERSHIP & PRIVACY (4 Cols)
             ══════════════════════════════════════════════════ */}
          <aside className="hidden lg:block lg:col-span-4 space-y-6 sticky top-6">
            {/* Quick Navigation Card */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-3">
              <h4 className="font-serif text-sm font-bold text-[#0F172A] flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#E51F3E]" />
                <span>Jump to Section</span>
              </h4>
              <nav className="space-y-1 text-xs font-semibold text-slate-600">
                {[
                  { id: 'basic-details', label: 'Basic Details' },
                  { id: 'about-me', label: 'About Me' },
                  { id: 'medical-education', label: 'Medical Education' },
                  { id: 'medical-career', label: 'Medical Career' },
                  { id: 'medical-registration', label: 'Medical Registration' },
                  { id: 'family', label: 'Family Details' },
                  { id: 'preferences', label: 'Partner Preferences' },
                  { id: 'horoscope', label: 'Horoscope' },
                  { id: 'lifestyle', label: 'Lifestyle & Interests' },
                  { id: 'photos', label: 'Photos' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => scrollToSection(item.id)}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-rose-50 hover:text-[#800020] transition flex items-center justify-between cursor-pointer"
                  >
                    <span>{item.label}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                ))}
              </nav>
            </div>

            {/* Membership & Contact Credits Display Card */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-4 text-left">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Current Plan
                  </span>
                  <h4 className="font-serif text-base font-extrabold text-[#111827] flex items-center gap-1.5">
                    <Crown className="w-4 h-4 text-[#E51F3E]" />
                    <span>{(membership.plan || 'Free').toUpperCase()}</span>
                  </h4>
                  {membership.price && (
                    <span className="text-xs font-semibold text-slate-600 block">
                      {membership.price} {membership.duration ? `/ ${membership.duration}` : ''}
                    </span>
                  )}
                </div>

                <span
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                    isMembershipExpired
                      ? 'bg-rose-100 text-rose-800'
                      : isPremiumActive
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {isMembershipExpired ? 'EXPIRED' : isPremiumActive ? 'ACTIVE' : 'FREE PLAN'}
                </span>
              </div>

              {/* Plan Expiry Date */}
              {membership.expiryDate && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Plan Expiry Date:</span>
                  <span className="font-semibold text-slate-800">
                    {new Date(membership.expiryDate).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              )}

              {/* Contact Requests Remaining & Progress */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-medium">Contact Requests Remaining:</span>
                  <span className="font-bold text-[#E51F3E]">
                    {membership.isUnlimitedContact
                      ? 'Unlimited (Fair Use)'
                      : `${membership.contactRequestsRemaining ?? 0} / ${
                          membership.contactRequestLimit ||
                          ((membership.contactRequestsRemaining ?? 0) + (membership.contactRequestsUsed ?? 0)) ||
                          0
                        }`}
                  </span>
                </div>

                {/* Progress Bar for Contact Requests Used */}
                {!membership.isUnlimitedContact && (
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-[#E51F3E] to-rose-500 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${
                          (membership.contactRequestLimit || 1) > 0
                            ? Math.min(
                                100,
                                Math.max(
                                  5,
                                  Math.round(
                                    ((membership.contactRequestsRemaining ?? 0) /
                                      (membership.contactRequestLimit || 1)) *
                                      100
                                  )
                                )
                              )
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Upgrade Plan CTA */}
              <Link
                href="/membership"
                className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-bold bg-[#E51F3E] hover:bg-[#CC1432] text-white shadow-xs transition hover:shadow-md cursor-pointer"
              >
                <span>Upgrade Plan</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Contact & Privacy Card */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-3">
              <h4 className="font-serif text-sm font-bold text-[#0F172A] flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#E51F3E]" />
                <span>Contact & Privacy</span>
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50">
                  <span className="text-slate-600">Mobile Visibility:</span>
                  <span className="font-bold text-slate-800">
                    {profile.privacySettings?.contactVisibility === 'members_only'
                      ? 'Paid Members'
                      : 'Accepted Interests Only'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50">
                  <span className="text-slate-600">Photo Visibility:</span>
                  <span className="font-bold text-slate-800">
                    {profile.privacySettings?.photoVisibility || 'All Registered'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50">
                  <span className="text-slate-600">Who Can Send Interest:</span>
                  <span className="font-bold text-slate-800">
                    {profile.privacySettings?.whoCanSendInterest === 'verified_only'
                      ? 'Verified Doctors'
                      : 'All Doctors'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPrivacyModalOpen(true)}
                className="w-full py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Adjust Privacy Rules
              </button>
            </div>

            {/* Profile Activity & Security */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-2 text-xs text-slate-500">
              <div className="flex items-center justify-between">
                <span>Account Created:</span>
                <span className="font-semibold text-slate-700">
                  {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-GB') : 'Active'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Last Active:</span>
                <span className="font-semibold text-slate-700">Online Recently</span>
              </div>
              <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                <Link href="/contact" className="text-[11px] font-bold text-slate-600 hover:text-[#E51F3E]">
                  Help & Support
                </Link>
                <button
                  type="button"
                  onClick={async () => {
                    await logoutUser();
                    router.push('/login');
                  }}
                  className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════
          IMAGE LIGHTBOX MODAL
         ════════════════════════════════════════════════════ */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-2xl max-h-[85vh] p-2 bg-white rounded-3xl overflow-hidden shadow-2xl">
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-900/60 text-white hover:bg-slate-900 transition z-10 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={lightboxImage}
              alt="Enlarged view"
              className="max-h-[80vh] w-auto rounded-2xl object-contain mx-auto"
            />
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          PHOTO MANAGEMENT MODAL
         ════════════════════════════════════════════════════ */}
      {isPhotoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-[#E51F3E]" />
                <h3 className="font-serif text-xl font-bold text-[#0F172A]">Manage Profile Photos</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPhotoModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-rose-50/60 border border-rose-100">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Photo Privacy & Visibility</h4>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Control who can view your photo gallery across Wonderful Jodi.
                  </p>
                </div>
                <select
                  value={profile.privacySettings?.photoVisibility || 'all'}
                  onChange={(e) =>
                    handleSavePrivacy({
                      ...profile.privacySettings,
                      photoVisibility: e.target.value,
                    })
                  }
                  className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:border-[#E51F3E]"
                >
                  <option value="all">Visible to All Registered</option>
                  <option value="members_only">Visible to Paid Members Only</option>
                  <option value="on_request">Visible on Request / Accepted Match</option>
                  <option value="hidden">Hidden</option>
                </select>
              </div>

              {/* Photo Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {(profile.photos || []).map((photo: string, index: number) => {
                  const isPrimary = profile.primaryPhoto === photo;
                  return (
                    <div
                      key={index}
                      className={`relative group rounded-2xl overflow-hidden border-2 bg-slate-100 aspect-square shadow-2xs ${
                        isPrimary ? 'border-[#E51F3E] ring-2 ring-[#E51F3E]/20' : 'border-slate-200'
                      }`}
                    >
                      <img src={photo} alt="Gallery" className="w-full h-full object-cover" />

                      {isPrimary && (
                        <span className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E51F3E] text-white text-[10px] font-bold shadow-xs">
                          <Star className="w-3 h-3 fill-white" />
                          <span>Primary</span>
                        </span>
                      )}

                      <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleDeletePhoto(photo)}
                            title="Delete photo"
                            className="p-1.5 rounded-full bg-rose-600 text-white hover:bg-rose-700 shadow-xs cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between gap-1">
                          {!isPrimary && (
                            <button
                              type="button"
                              onClick={() => handleSetPrimary(photo)}
                              className="px-2.5 py-1 rounded-full bg-[#E51F3E] text-white text-[10px] font-bold hover:bg-[#CC1432] cursor-pointer"
                            >
                              Make Primary
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {(profile.photos?.length || 0) < 6 && (
                  <label className="border-2 border-dashed border-rose-200 rounded-2xl flex flex-col items-center justify-center p-4 text-center cursor-pointer hover:bg-rose-50/50 transition aspect-square">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handlePhotoUpload}
                      accept="image/jpeg,image/png,image/webp,image/jpg"
                      className="hidden"
                      disabled={photoUploading}
                    />
                    {photoUploading ? (
                      <div className="w-8 h-8 border-3 border-rose-300 border-t-[#E51F3E] rounded-full animate-spin mb-2" />
                    ) : (
                      <Upload className="w-8 h-8 text-[#E51F3E] mb-2" />
                    )}
                    <span className="text-xs font-bold text-slate-800">
                      {photoUploading ? 'Uploading...' : 'Add Photo'}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1">Up to 5MB (JPG/PNG)</span>
                  </label>
                )}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsPhotoModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          PRIVACY & SAFETY MODAL
         ════════════════════════════════════════════════════ */}
      {isPrivacyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-[#E51F3E]" />
                <h3 className="font-serif text-xl font-bold text-[#0F172A]">Privacy & Contact Settings</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPrivacyModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleSavePrivacy({
                  profileVisibility: formData.get('profileVisibility'),
                  photoVisibility: formData.get('photoVisibility'),
                  contactVisibility: formData.get('contactVisibility'),
                  whoCanSendInterest: formData.get('whoCanSendInterest'),
                  whoCanMessage: formData.get('whoCanMessage'),
                  horoscopeVisibility: formData.get('horoscopeVisibility'),
                  birthTimeVisibility: formData.get('birthTimeVisibility'),
                  birthPlaceVisibility: formData.get('birthPlaceVisibility'),
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Profile Visibility</label>
                <select
                  name="profileVisibility"
                  defaultValue={profile.privacySettings?.profileVisibility || 'all'}
                  className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#E51F3E]"
                >
                  <option value="all">Visible to All Registered Doctors</option>
                  <option value="verified_only">Visible to Verified Doctors Only</option>
                  <option value="members_only">Visible to Active Paid Members Only</option>
                  <option value="hidden">Hidden / Private</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Photo Visibility</label>
                <select
                  name="photoVisibility"
                  defaultValue={profile.privacySettings?.photoVisibility || 'all'}
                  className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#E51F3E]"
                >
                  <option value="all">Visible to All Members</option>
                  <option value="members_only">Visible to Paid Members Only</option>
                  <option value="on_request">Visible Only On Accepted Interest</option>
                  <option value="hidden">Hidden</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Contact Details Visibility</label>
                <select
                  name="contactVisibility"
                  defaultValue={profile.privacySettings?.contactVisibility || 'accepted_interests_only'}
                  className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#E51F3E]"
                >
                  <option value="accepted_interests_only">Only to Accepted Matches (Recommended)</option>
                  <option value="members_only">All Verified Paid Doctors</option>
                  <option value="hidden">Strictly Confidential</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Who Can Send Me Interest?</label>
                <select
                  name="whoCanSendInterest"
                  defaultValue={profile.privacySettings?.whoCanSendInterest || 'all'}
                  className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#E51F3E]"
                >
                  <option value="all">All Doctors</option>
                  <option value="verified_only">Only 100% Verified Doctors</option>
                  <option value="premium_only">Only Premium Subscribed Members</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Who Can Message Me?</label>
                <select
                  name="whoCanMessage"
                  defaultValue={profile.privacySettings?.whoCanMessage || 'accepted_interests_only'}
                  className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#E51F3E]"
                >
                  <option value="accepted_interests_only">Only after I Accept their Interest request</option>
                  <option value="all_members">Any Verified Paid Member</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Horoscope & Kundali Visibility</label>
                <select
                  name="horoscopeVisibility"
                  defaultValue={profile.privacySettings?.horoscopeVisibility || 'all'}
                  className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#E51F3E]"
                >
                  <option value="all">Visible to All Registered Doctors</option>
                  <option value="verified_only">Visible to Verified Doctors Only</option>
                  <option value="members_only">Visible to Paid Members Only</option>
                  <option value="hidden">Hidden / Private (Protected)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Birth Time Visibility</label>
                  <select
                    name="birthTimeVisibility"
                    defaultValue={profile.privacySettings?.birthTimeVisibility || 'all'}
                    className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#E51F3E]"
                  >
                    <option value="all">Visible</option>
                    <option value="members_only">Members Only</option>
                    <option value="hidden">Hidden</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Birth Place Visibility</label>
                  <select
                    name="birthPlaceVisibility"
                    defaultValue={profile.privacySettings?.birthPlaceVisibility || 'all'}
                    className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#E51F3E]"
                  >
                    <option value="all">Visible</option>
                    <option value="members_only">Members Only</option>
                    <option value="hidden">Hidden</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPrivacyModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#E51F3E] text-white text-xs font-bold hover:bg-[#CC1432] shadow-xs cursor-pointer"
                >
                  Save Privacy Rules
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          INLINE SECTION QUICK EDIT MODAL
         ════════════════════════════════════════════════════ */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-[#E51F3E]" />
                <h3 className="font-serif text-xl font-bold text-[#0F172A]">
                  {activeModal === 'basic' && 'Edit Basic Information'}
                  {activeModal === 'about' && 'Edit About Me & Profile Meta'}
                  {activeModal === 'medical_edu' && 'Edit Medical Education & Qualifications'}
                  {activeModal === 'medical_career' && 'Edit Medical Career & Practice'}
                  {activeModal === 'medical_reg' && 'Edit Medical Registration'}
                  {activeModal === 'family' && 'Edit Family Details'}
                  {activeModal === 'preferences' && 'Edit Partner Preferences'}
                  {activeModal === 'horoscope' && 'Edit Horoscope'}
                  {activeModal === 'lifestyle' && 'Edit Lifestyle & Interests'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-4">
              {/* BASIC DETAILS */}
              {activeModal === 'basic' && (
                <BasicDetailsEditSection
                  formData={modalFormData}
                  onChange={(updatedFields) => {
                    setModalFormData((prev: any) => ({ ...prev, ...updatedFields }));
                  }}
                />
              )}

              {/* ABOUT ME */}
              {activeModal === 'about' && (
                <>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      About Me (Minimum 20 characters) *
                    </label>
                    <textarea
                      name="about"
                      rows={5}
                      required
                      value={modalFormData.about || ''}
                      onChange={handleInputChange}
                      placeholder="Write a clear introduction about your personality, clinical practice, personal values, and partner expectations..."
                      className="w-full p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#E51F3E] leading-relaxed"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Profile Managed By</label>
                    <select
                      name="profileManagedBy"
                      value={modalFormData.profileManagedBy || 'Self'}
                      onChange={handleInputChange}
                      className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                    >
                      <option value="Self">Self</option>
                      <option value="Parents">Parents</option>
                      <option value="Sibling">Sibling</option>
                    </select>
                  </div>
                </>
              )}

              {/* MEDICAL EDUCATION */}
              {activeModal === 'medical_edu' && (
                <>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Highest Medical Qualification *
                    </label>
                    <select
                      name="education"
                      value={modalFormData.education || 'MBBS'}
                      onChange={handleInputChange}
                      className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                    >
                      {DOCTOR_QUALIFICATIONS.map((q) => (
                        <option key={q} value={q}>{q}</option>
                      ))}
                    </select>
                    <span className="text-[10.5px] text-slate-500 mt-1 block">
                      Doctor qualifications only (MBBS, MD, MS, DNB, BDS, MDS, DM, MCh). Non-medical degrees are prohibited.
                    </span>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Degree & Institution Details *
                    </label>
                    <input
                      type="text"
                      name="degree"
                      required
                      value={modalFormData.degree || ''}
                      onChange={handleInputChange}
                      placeholder="e.g. MBBS, MD General Medicine"
                      className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Medical College</label>
                      <input
                        type="text"
                        name="medicalCollege"
                        value={modalFormData.medicalCollege || ''}
                        onChange={handleInputChange}
                        placeholder="e.g. BJ Medical College, Pune"
                        className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Graduation Year</label>
                      <input
                        type="text"
                        name="graduationYear"
                        value={modalFormData.graduationYear || ''}
                        onChange={handleInputChange}
                        placeholder="e.g. 2022"
                        className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">University</label>
                    <input
                      type="text"
                      name="medicalUniversity"
                      value={modalFormData.medicalUniversity || ''}
                      onChange={handleInputChange}
                      placeholder="e.g. Savitribai Phule Pune University / MUHS"
                      className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Additional Qualification / Fellowship
                    </label>
                    <input
                      type="text"
                      name="additionalQualification"
                      value={modalFormData.additionalQualification || ''}
                      onChange={handleInputChange}
                      placeholder="e.g. MD – General Medicine (Pursuing) / DNB"
                      className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                    />
                  </div>
                </>
              )}

              {/* MEDICAL CAREER */}
              {activeModal === 'medical_career' && (
                <>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Specialization / Profession *</label>
                    <select
                      name="profession"
                      value={modalFormData.profession || 'Medical Specialist'}
                      onChange={handleInputChange}
                      className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                    >
                      {DOCTOR_SPECIALIZATIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Current Designation</label>
                      <input
                        type="text"
                        name="currentRole"
                        value={modalFormData.currentRole || ''}
                        onChange={handleInputChange}
                        placeholder="e.g. Resident Medical Specialist"
                        className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Hospital / Clinic</label>
                      <input
                        type="text"
                        name="currentHospital"
                        value={modalFormData.currentHospital || ''}
                        onChange={handleInputChange}
                        placeholder="e.g. Sassoon General Hospital"
                        className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Experience</label>
                      <input
                        type="text"
                        name="medicalExperience"
                        value={modalFormData.medicalExperience || ''}
                        onChange={handleInputChange}
                        placeholder="e.g. 3+ Years"
                        className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Annual Income Range</label>
                      <input
                        type="text"
                        name="annualIncome"
                        value={modalFormData.annualIncome || ''}
                        onChange={handleInputChange}
                        placeholder="e.g. ₹ 35 - 50 Lakhs"
                        className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Practice Type</label>
                      <select
                        name="workType"
                        value={modalFormData.workType || 'Hospital Consultant'}
                        onChange={handleInputChange}
                        className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                      >
                        <option value="Hospital Consultant">Hospital Consultant</option>
                        <option value="Private Practice / Clinic">Private Practice / Clinic</option>
                        <option value="Government / PSU Hospital">Government / PSU Hospital</option>
                        <option value="Medical Academic / Resident">Medical Academic / Resident</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Work Location</label>
                      <input
                        type="text"
                        name="workLocation"
                        value={modalFormData.workLocation || ''}
                        onChange={handleInputChange}
                        placeholder="e.g. Pune"
                        className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* MEDICAL REGISTRATION */}
              {activeModal === 'medical_reg' && (
                <>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Registration Number (MCI / State Council) *
                    </label>
                    <input
                      type="text"
                      name="medicalRegistrationNumber"
                      required
                      value={modalFormData.medicalRegistrationNumber || ''}
                      onChange={handleInputChange}
                      placeholder="e.g. MMC-2022-09-8472"
                      className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Medical Council Name</label>
                    <input
                      type="text"
                      name="medicalCouncil"
                      value={modalFormData.medicalCouncil || ''}
                      onChange={handleInputChange}
                      placeholder="e.g. Maharashtra Medical Council / Karnataka Medical Council"
                      className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Registration State</label>
                      <input
                        type="text"
                        name="registrationState"
                        value={modalFormData.registrationState || ''}
                        onChange={handleInputChange}
                        placeholder="e.g. Maharashtra"
                        className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Registration Year</label>
                      <input
                        type="text"
                        name="registrationYear"
                        value={modalFormData.registrationYear || ''}
                        onChange={handleInputChange}
                        placeholder="e.g. 2022"
                        className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* FAMILY DETAILS */}
              {activeModal === 'family' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Family Type</label>
                      <select
                        name="familyType"
                        value={modalFormData.familyType || 'Nuclear Family'}
                        onChange={handleInputChange}
                        className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                      >
                        {FAMILY_TYPES.map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Family Status</label>
                      <select
                        name="familyStatus"
                        value={modalFormData.familyStatus || 'Upper Middle Class'}
                        onChange={handleInputChange}
                        className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                      >
                        {FAMILY_STATUSES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Father's Occupation</label>
                      <input
                        type="text"
                        name="fatherOccupation"
                        value={modalFormData.fatherOccupation || ''}
                        onChange={handleInputChange}
                        placeholder="e.g. Business Professional / Doctor"
                        className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Mother's Occupation</label>
                      <input
                        type="text"
                        name="motherOccupation"
                        value={modalFormData.motherOccupation || ''}
                        onChange={handleInputChange}
                        placeholder="e.g. Homemaker / Doctor / Teacher"
                        className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Siblings</label>
                      <input
                        type="text"
                        name="siblings"
                        value={modalFormData.siblings || ''}
                        onChange={handleInputChange}
                        placeholder="e.g. 1 Brother (Married)"
                        className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Family Values</label>
                      <select
                        name="familyValues"
                        value={modalFormData.familyValues || 'Moderate'}
                        onChange={handleInputChange}
                        className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                      >
                        {FAMILY_VALUES.map((v) => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Native Place</label>
                    <input
                      type="text"
                      name="nativePlace"
                      value={modalFormData.nativePlace || ''}
                      onChange={handleInputChange}
                      placeholder="e.g. Pune, Maharashtra"
                      className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                    />
                  </div>
                </>
              )}

              {/* PARTNER PREFERENCES */}
              {activeModal === 'preferences' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Min Age</label>
                      <input
                        type="number"
                        name="preferredAgeMin"
                        value={modalFormData.preferredAgeMin || 22}
                        onChange={handleInputChange}
                        className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Max Age</label>
                      <input
                        type="number"
                        name="preferredAgeMax"
                        value={modalFormData.preferredAgeMax || 32}
                        onChange={handleInputChange}
                        className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Preferred Qualification</label>
                    <input
                      type="text"
                      name="preferredQualification"
                      value={modalFormData.preferredQualification || ''}
                      onChange={handleInputChange}
                      placeholder="e.g. MBBS / MD / MS / DNB"
                      className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Preferred Specialization</label>
                    <input
                      type="text"
                      name="preferredSpecialization"
                      value={modalFormData.preferredSpecialization || ''}
                      onChange={handleInputChange}
                      placeholder="e.g. Open to all specialties"
                      className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Preferred Location</label>
                    <input
                      type="text"
                      name="preferredLocation"
                      value={modalFormData.preferredLocation || ''}
                      onChange={handleInputChange}
                      placeholder="e.g. Pune / Mumbai / Maharashtra"
                      className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Other Expectations</label>
                    <textarea
                      name="otherPreferences"
                      rows={3}
                      value={modalFormData.otherPreferences || ''}
                      onChange={handleInputChange}
                      placeholder="e.g. Family-oriented, supportive of clinical career growth..."
                      className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                    />
                  </div>
                </>
              )}

              {/* HOROSCOPE */}
              {activeModal === 'horoscope' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Time of Birth</label>
                      <input
                        type="text"
                        name="timeOfBirth"
                        value={modalFormData.timeOfBirth || ''}
                        onChange={handleInputChange}
                        placeholder="e.g. 08:30 AM"
                        className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Place of Birth</label>
                      <input
                        type="text"
                        name="placeOfBirth"
                        value={modalFormData.placeOfBirth || ''}
                        onChange={handleInputChange}
                        placeholder="e.g. Pune, Maharashtra"
                        className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Rashi (Moon Sign)</label>
                      <select
                        name="rashi"
                        value={modalFormData.rashi || ''}
                        onChange={handleInputChange}
                        className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                      >
                        <option value="">Select Rashi</option>
                        {RASHIS.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Manglik Status</label>
                      <select
                        name="manglik"
                        value={modalFormData.manglik || 'Non-Manglik'}
                        onChange={handleInputChange}
                        className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                      >
                        {MANGLIK_OPTIONS.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Nakshatra</label>
                      <input
                        type="text"
                        name="nakshatra"
                        value={modalFormData.nakshatra || ''}
                        onChange={handleInputChange}
                        placeholder="e.g. Magha / Rohini"
                        className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Gotra</label>
                      <input
                        type="text"
                        name="gotra"
                        value={modalFormData.gotra || ''}
                        onChange={handleInputChange}
                        placeholder="e.g. Kashyap"
                        className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* LIFESTYLE */}
              {activeModal === 'lifestyle' && (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Diet</label>
                      <select
                        name="diet"
                        value={modalFormData.diet || 'Vegetarian'}
                        onChange={handleInputChange}
                        className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                      >
                        {DIETS.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Smoking</label>
                      <select
                        name="smoking"
                        value={modalFormData.smoking || 'Non-Smoker'}
                        onChange={handleInputChange}
                        className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                      >
                        <option value="Non-Smoker">Non-Smoker</option>
                        <option value="Occasional">Occasional</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Alcohol</label>
                      <select
                        name="alcohol"
                        value={modalFormData.alcohol || 'Non-Drinker'}
                        onChange={handleInputChange}
                        className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                      >
                        <option value="Non-Drinker">Non-Drinker</option>
                        <option value="Social Drinker">Social Drinker</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Hobbies (comma separated)</label>
                    <input
                      type="text"
                      name="hobbies"
                      value={modalFormData.hobbies || ''}
                      onChange={handleInputChange}
                      placeholder="e.g. Reading, Traveling, Photography, Music"
                      className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Languages Spoken</label>
                    <input
                      type="text"
                      name="languages"
                      value={modalFormData.languages || ''}
                      onChange={handleInputChange}
                      placeholder="e.g. Marathi, Hindi, English"
                      className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                    />
                  </div>
                </>
              )}

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-[#E51F3E] text-white text-xs font-bold hover:bg-[#CC1432] shadow-xs cursor-pointer disabled:opacity-60"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          DOCUMENT UPLOAD MODAL (MEDICAL VERIFICATION)
         ════════════════════════════════════════════════════ */}
      {isDocUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-5 max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#E51F3E]" />
                <h3 className="font-serif text-lg font-bold text-[#0F172A]">
                  Upload Verification Document
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDocUploadOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitVerificationDoc} className="space-y-4">
              {uploadError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Document Category *
                </label>
                <select
                  value={uploadCategory}
                  onChange={(e) => {
                    const newCat = e.target.value;
                    setUploadCategory(newCat);
                    const conf = VERIFICATION_DOC_CONFIG.find((c) => c.key === newCat);
                    if (conf) setUploadDocName(conf.title);
                  }}
                  className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                >
                  {VERIFICATION_DOC_CONFIG.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.title} ({c.badge})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Document Label / Title (Optional)
                </label>
                <input
                  type="text"
                  value={uploadDocName}
                  onChange={(e) => setUploadDocName(e.target.value)}
                  placeholder="e.g. Maharashtra Medical Council Certificate"
                  className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Select Document File *
                </label>
                <div className="relative border-2 border-dashed border-slate-300 hover:border-[#E51F3E] rounded-2xl p-5 text-center transition bg-slate-50/50 cursor-pointer">
                  <input
                    type="file"
                    onChange={handleDocFileChange}
                    accept=".pdf,image/jpeg,image/png,image/webp,image/jpg"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {uploadFileName ? (
                    <div className="space-y-1">
                      <FileCheck className="w-8 h-8 text-emerald-600 mx-auto" />
                      <p className="text-xs font-bold text-slate-800 break-all">{uploadFileName}</p>
                      <p className="text-[11px] text-slate-400 font-semibold">
                        {(uploadFileSize / (1024 * 1024)).toFixed(2)} MB • Click or drag to replace
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                      <p className="text-xs font-bold text-slate-700">
                        Click to select document or drag & drop here
                      </p>
                      <p className="text-[11px] text-slate-400">
                        PDF, JPG, PNG, or WebP (Max 10 MB)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Instructions Box */}
              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-900 space-y-1.5">
                <div className="font-bold flex items-center gap-1 text-amber-950">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                  <span>Document Guidelines:</span>
                </div>
                <ul className="list-disc pl-4 space-y-0.5 text-amber-800">
                  <li>Ensure the certificate registration number, holder name, seal, and date are clear and legible.</li>
                  <li>Do not upload blurred scans, cropped sections, or password-protected files.</li>
                  <li>Medical documents are strictly IDOR protected and only accessed by authorized compliance officers.</li>
                </ul>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDocUploadOpen(false)}
                  disabled={uploadingDoc}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingDoc || !uploadFileBase64}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#E51F3E] to-[#CC1432] text-white text-xs font-bold hover:shadow-md transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {uploadingDoc ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload & Submit for Review</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
