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
  DOCTOR_QUALIFICATIONS,
  DOCTOR_SPECIALIZATIONS,
  validateDateOfBirth,
  validateMedicalQualification,
} from '../../lib/doctorConstants';
import { DobInput } from '../../components/DobInput';
import { DoctorAvatar } from '../../components/DoctorAvatar';
import { BasicDetailsEditSection } from '../../components/BasicDetailsEditSection';

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

function getAge(dob?: string | Date): number {
  if (!dob) return 26;
  const date = new Date(dob);
  if (isNaN(date.getTime())) return 26;
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

/**
 * Weighted Profile Completion scoring prioritizing medical matrimonial criteria.
 */
function calculateWeightedCompletion(profile: any, user?: any) {
  if (!profile) return { score: 0, categories: [] };

  const checks = [
    {
      id: 'basic-details',
      label: 'Basic Information',
      weight: 10,
      completed: Boolean(
        profile.displayName &&
        profile.gender &&
        profile.dob &&
        profile.height &&
        (profile.city || profile.state) &&
        profile.maritalStatus &&
        profile.religion
      ),
    },
    {
      id: 'about-me',
      label: 'About Me',
      weight: 10,
      completed: Boolean(profile.about && profile.about.trim().length >= 20),
    },
    {
      id: 'medical-education',
      label: 'Medical Education',
      weight: 15,
      completed: Boolean(
        profile.education &&
        (profile.degree || profile.medicalCollege || profile.medicalUniversity)
      ),
    },
    {
      id: 'medical-career',
      label: 'Medical Career & Practice',
      weight: 10,
      completed: Boolean(
        profile.profession &&
        (profile.currentHospital || profile.company || profile.workLocation || profile.currentRole)
      ),
    },
    {
      id: 'medical-registration',
      label: 'Medical Registration',
      weight: 15,
      completed: Boolean(profile.medicalRegistrationNumber || profile.medicalCouncil),
    },
    {
      id: 'family',
      label: 'Family Details',
      weight: 10,
      completed: Boolean(
        profile.familyType &&
        (profile.fatherOccupation || profile.motherOccupation || profile.nativePlace || profile.siblings)
      ),
    },
    {
      id: 'preferences',
      label: 'Partner Preferences',
      weight: 10,
      completed: Boolean(
        profile.partnerPreferences &&
        (profile.partnerPreferences.preferredLocation ||
          profile.partnerPreferences.preferredQualification ||
          profile.partnerPreferences.preferredSpecialization ||
          profile.partnerPreferences.preferredAgeMin)
      ),
    },
    {
      id: 'horoscope',
      label: 'Horoscope / Kundali',
      weight: 5,
      completed: Boolean(profile.horoscope?.rashi || profile.horoscope?.timeOfBirth),
    },
    {
      id: 'lifestyle',
      label: 'Lifestyle & Interests',
      weight: 5,
      completed: Boolean(
        profile.lifestyleInterests?.diet ||
        profile.foodPreference ||
        (profile.lifestyleInterests?.hobbies && profile.lifestyleInterests.hobbies.length > 0)
      ),
    },
    {
      id: 'photos',
      label: 'Photos',
      weight: 5,
      completed: Boolean(
        (profile.primaryPhoto && profile.primaryPhoto.trim() !== '') ||
        (Array.isArray(profile.photos) && profile.photos.length > 0)
      ),
    },
    {
      id: 'verification',
      label: 'Medical Verification',
      weight: 5,
      completed: Boolean(
        profile.verificationStatus === 'VERIFIED' ||
        profile.verificationStatus === 'DOCTOR_VERIFIED' ||
        user?.verified === true ||
        user?.verificationStatus === 'VERIFIED'
      ),
    },
  ];

  let totalScore = 0;
  for (const c of checks) {
    if (c.completed) totalScore += c.weight;
  }

  return {
    score: Math.min(100, Math.max(0, totalScore)),
    categories: checks,
  };
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modals
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

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

    Promise.all([getMyProfile(), getMyMembershipStatus()])
      .then(([profData, memberData]) => {
        if (!isMounted) return;
        if (profData) {
          setProfile(profData);
        } else {
          setError('You have not created your matrimonial profile yet.');
        }
        if (memberData) {
          setMembership(memberData);
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
      displayName: profile.displayName || '',
      gender: profile.gender || 'Male',
      dob: formattedDob,
      height: profile.height || `5' 10"`,
      maritalStatus: profile.maritalStatus || 'Never Married',
      motherTongue: profile.motherTongue || 'Marathi',
      religion: profile.religion || 'Hindu',
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
            religionName: profile.communityDetails.religionId?.name || profile.religion || 'Hindu',
            casteId: profile.communityDetails.casteId?._id || profile.communityDetails.casteId,
            casteName: profile.communityDetails.casteId?.name || profile.caste || '',
            casteCategory: profile.communityDetails.casteCategory || profile.communityDetails.casteId?.category || '',
            subCasteId: profile.communityDetails.subCasteId?._id || profile.communityDetails.subCasteId,
            subCasteName: profile.communityDetails.subCasteId?.name || profile.subCaste || '',
          }
        : {
            religionName: profile.religion || 'Hindu',
            casteName: profile.caste || '',
            subCasteName: profile.subCaste || '',
          },
      languageDetails: profile.languageDetails
        ? {
            motherTongueId: profile.languageDetails.motherTongueId?._id || profile.languageDetails.motherTongueId,
            motherTongueName: profile.languageDetails.motherTongueId?.name || profile.motherTongue || 'Marathi',
          }
        : {
            motherTongueName: profile.motherTongue || 'Marathi',
          },
      about: profile.about || '',
      // Medical Education
      education: profile.education || 'MBBS',
      degree: profile.degree || 'MBBS',
      medicalCollege: profile.medicalCollege || '',
      medicalUniversity: profile.medicalUniversity || '',
      graduationYear: profile.graduationYear || '',
      additionalQualification: profile.additionalQualification || '',
      // Medical Career
      profession: profile.profession || 'Medical Specialist',
      currentRole: profile.currentRole || '',
      currentHospital: profile.currentHospital || '',
      company: profile.company || '',
      workLocation: profile.workLocation || '',
      medicalExperience: profile.medicalExperience || '',
      workType: profile.workType || 'Hospital Consultant',
      currentlyPracticing: profile.currentlyPracticing ?? true,
      // Medical Registration
      medicalRegistrationNumber: profile.medicalRegistrationNumber || '',
      medicalCouncil: profile.medicalCouncil || '',
      registrationState: profile.registrationState || '',
      registrationYear: profile.registrationYear || '',
      // Family
      familyType: profile.familyType || 'Nuclear Family',
      familyStatus: profile.familyStatus || 'Upper Middle Class',
      familyValues: profile.familyValues || 'Moderate',
      fatherOccupation: profile.fatherOccupation || '',
      motherOccupation: profile.motherOccupation || '',
      siblings: profile.siblings || '',
      familyLocation: profile.familyLocation || '',
      // Partner Preferences
      preferredAgeMin: profile.partnerPreferences?.preferredAgeMin || 22,
      preferredAgeMax: profile.partnerPreferences?.preferredAgeMax || 32,
      preferredLocation: profile.partnerPreferences?.preferredLocation || 'Pune / Mumbai / Maharashtra',
      preferredQualification: profile.partnerPreferences?.preferredQualification || 'MBBS / MD / MS / DNB',
      preferredSpecialization: profile.partnerPreferences?.preferredSpecialization || 'Open to all specialties',
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
      diet: profile.lifestyleInterests?.diet || profile.foodPreference || 'Vegetarian',
      smoking: profile.lifestyleInterests?.smoking || profile.smoking || 'Non-Smoker',
      alcohol: profile.lifestyleInterests?.alcohol || profile.drinking || 'Non-Drinker',
      exercise: profile.lifestyleInterests?.exercise || 'Regular Fitness',
      hobbies: (profile.lifestyleInterests?.hobbies || profile.hobbies || []).join(', '),
      travel: (profile.lifestyleInterests?.travel || []).join(', '),
      languages: (profile.lifestyleInterests?.languages || [profile.motherTongue || 'Marathi', 'English']).join(', '),
      pets: profile.lifestyleInterests?.pets || 'None',
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
  const heightDisplay = profile.height ? `${profile.height}${heightMeters}` : `5' 10" (1.78 m)`;

  const { score: completionScore, categories: completionCategories } = calculateWeightedCompletion(
    profile,
    profile.user
  );

  // Verification states
  const rawStatus = (profile.verificationStatus || profile.user?.verificationStatus || 'UNVERIFIED').toUpperCase();
  const isDoctorVerified = rawStatus === 'VERIFIED' || rawStatus === 'DOCTOR_VERIFIED';
  const isPending = rawStatus === 'PENDING';
  const isFullyVerified = Boolean(profile.user?.verified && isDoctorVerified);

  const profileIdDisplay = `WJ${String(profile._id || '000000').slice(-6).toUpperCase()}`;

  // Membership states
  const planName = (membership.plan || 'FREE').toUpperCase();
  const isMembershipExpired = membership.status === 'EXPIRED';
  const isPremiumActive = membership.isPremium && !isMembershipExpired;

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
            1. TWO-LAYER PROFILE HEADER (Subtle Top Banner + White Info Area)
           ════════════════════════════════════════════════════ */}
        <section
          id="profile-header"
          className="bg-white rounded-2xl border border-[#E8E1DB] shadow-2xs overflow-hidden"
        >
          {/* Top Layer: Premium subtle maroon/rose banner */}
          <div className="h-24 sm:h-32 bg-gradient-to-r from-[#6B0D1E] via-[#85132A] to-[#A31835] relative overflow-hidden px-6 py-3 flex items-center justify-between">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
            <div className="relative z-10">
              <span className="text-white/80 text-[11px] font-bold tracking-wider uppercase">
                Wonderful Jodi Matrimony
              </span>
            </div>
            <div className="relative z-10 flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-black/25 backdrop-blur-md text-white text-[11px] font-bold border border-white/20 tracking-wide">
                Profile ID: {profileIdDisplay}
              </span>
              <span
                className={`px-3 py-1 rounded-full text-[11px] font-bold shadow-xs ${
                  isMembershipExpired
                    ? 'bg-rose-100 text-rose-900'
                    : isPremiumActive
                    ? 'bg-amber-400 text-amber-950'
                    : 'bg-white/20 text-white backdrop-blur-md'
                }`}
              >
                {isMembershipExpired
                  ? 'MEMBERSHIP EXPIRED'
                  : isPremiumActive
                  ? `${planName} MEMBER`
                  : 'FREE MEMBER'}
              </span>
            </div>
          </div>

          {/* Bottom Layer: Pure White Profile Information Area */}
          <div className="px-6 sm:px-8 pb-6 pt-0 bg-white">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 -mt-12 sm:-mt-16">
              {/* Left: Profile Photo + Doctor Information */}
              <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 text-center sm:text-left">
                {/* Photo container (large professional portrait with DoctorAvatar fallback) */}
                <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-[20px] overflow-hidden bg-white p-1 shadow-md border-2 border-white ring-1 ring-slate-200/80 shrink-0 group">
                  <DoctorAvatar
                    photoUrl={profile.primaryPhoto}
                    name={profile.displayName || profile.user?.fullName || 'Rushikesh Kulkarni'}
                    gender={profile.gender}
                    size="xl"
                    className="w-full h-full rounded-[16px] cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => setIsPhotoModalOpen(true)}
                    className="absolute inset-1 rounded-[16px] bg-slate-900/60 backdrop-blur-2xs opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity duration-200 cursor-pointer"
                  >
                    <Camera className="w-5 h-5 mb-1" />
                    <span className="text-[10.5px] font-bold">Manage Photos</span>
                  </button>
                </div>

                {/* Primary Metadata */}
                <div className="space-y-1 pb-1 pt-3 sm:pt-14 relative z-10">
                  <div className="flex items-center justify-center sm:justify-start gap-2.5 flex-wrap">
                    <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#0F172A]">
                      {profile.displayName || profile.user?.fullName || 'Rushikesh Kulkarni'}
                    </h1>
                  </div>

                  <p className="text-xs sm:text-sm font-semibold text-slate-600 flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                    <span>{age} Years</span>
                    <span className="text-slate-300">•</span>
                    <span>{profile.gender}</span>
                    <span className="text-slate-300">•</span>
                    <span>{profile.height || `5' 10"`}</span>
                    <span className="text-slate-300">•</span>
                    <span className="inline-flex items-center gap-1 text-slate-700">
                      <MapPin className="w-3.5 h-3.5 text-[#E51F3E]" />
                      <span>{profile.currentLocation?.formattedAddress || [profile.city, profile.state, profile.country].filter(Boolean).join(', ') || 'Pune, Maharashtra'}</span>
                    </span>
                  </p>

                  <p className="text-xs font-bold text-[#800020] flex items-center justify-center sm:justify-start gap-1.5 pt-0.5">
                    <Stethoscope className="w-3.5 h-3.5 text-[#E51F3E]" />
                    <span>{profile.education || 'MBBS'}</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-700 font-semibold">{profile.profession || 'Medical Specialist'}</span>
                  </p>

                  {/* Verification Status Pill */}
                  <div className="pt-1.5 flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                    {isFullyVerified ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700 shadow-2xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>✓ Fully Verified</span>
                      </span>
                    ) : isDoctorVerified ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700 shadow-2xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>✓ Medical Registration Verified</span>
                      </span>
                    ) : isPending ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs font-bold text-amber-800 shadow-2xs">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>○ Medical Verification Pending</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 shadow-2xs">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                        <span>! Medical Verification Pending</span>
                      </span>
                    )}

                    {profile.photos && profile.photos.length > 0 && isDoctorVerified && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-700">
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>✓ Photo Verified</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Action Buttons (Own Profile) */}
              <div className="flex items-center justify-center sm:justify-end gap-2.5 shrink-0 flex-wrap">
                <button
                  type="button"
                  onClick={() => openSectionModal('basic')}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#E51F3E] to-[#CC1432] text-white text-xs font-bold shadow-xs hover:shadow-md transition cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Profile</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPhotoModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition cursor-pointer shadow-2xs"
                >
                  <Camera className="w-3.5 h-3.5 text-[#E51F3E]" />
                  <span>Add Photos</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrivacyModalOpen(true)}
                  className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                  title="Photo & Contact Privacy"
                >
                  <Lock className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
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
              className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-7 space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h2 className="font-serif text-base sm:text-lg font-bold text-[#0F172A] flex items-center gap-2">
                    <Sparkles className="w-4.5 h-4.5 text-[#E51F3E]" />
                    <span>Profile Strength & Visibility</span>
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Complete your profile to receive better doctor matches.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-[#800020]">{completionScore}%</span>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Complete</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden p-0.5 border border-slate-200/70">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#800020] via-[#A81C39] to-[#E51F3E] transition-all duration-700"
                    style={{ width: `${completionScore}%` }}
                  />
                </div>
              </div>

              {/* Category Status Badges */}
              <div className="flex flex-wrap gap-2 pt-1">
                {completionCategories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => scrollToSection(c.id)}
                    className={`px-3 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                      c.completed
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                        : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-rose-50 hover:text-[#E51F3E]'
                    }`}
                  >
                    <span>{c.completed ? '✓' : '○'}</span>
                    <span>{c.label}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* 3. VERIFICATION CARD */}
            <section
              id="verification"
              className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-7 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#E51F3E]" />
                  <h3 className="font-serif text-lg font-bold text-[#0F172A]">Medical Profile Verification</h3>
                </div>
                <Link
                  href="/profile/verification"
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#E51F3E] hover:underline"
                >
                  <span>Check Verification Status</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-emerald-800 block">Mobile Number</span>
                    <span className="text-xs font-semibold text-slate-700 mt-0.5 block">
                      {profile.user?.mobile ? `+91 •••••••${profile.user.mobile.slice(-4)}` : 'Verified on Login'}
                    </span>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-emerald-800 block">Email Address</span>
                    <span className="text-xs font-semibold text-slate-700 mt-0.5 block truncate max-w-[130px]">
                      {profile.user?.email || 'Verified on signup'}
                    </span>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                </div>

                <div
                  className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                    isDoctorVerified
                      ? 'bg-emerald-50/60 border-emerald-100 text-emerald-800'
                      : isPending
                      ? 'bg-amber-50/60 border-amber-100 text-amber-800'
                      : 'bg-rose-50/60 border-rose-100 text-[#E51F3E]'
                  }`}
                >
                  <div>
                    <span className="text-[11px] font-bold block">Medical Credentials</span>
                    <span className="text-xs font-semibold text-slate-700 mt-0.5 block">
                      {isDoctorVerified
                        ? '✓ Council Verified'
                        : isPending
                        ? '○ Under Review'
                        : '! Verification Pending'}
                    </span>
                  </div>
                  <Link
                    href="/profile/verification"
                    className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[10.5px] font-bold text-slate-800 shadow-2xs hover:bg-slate-50"
                  >
                    {isDoctorVerified ? 'View' : 'Submit'}
                  </Link>
                </div>
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
                  <span className="font-semibold text-slate-800 mt-0.5 block">{formattedDob}</span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl">
                  <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block">Age</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">{age} Years</span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl">
                  <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block">Gender</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">{profile.gender}</span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl">
                  <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block">Marital Status</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">{profile.maritalStatus || 'Never Married'}</span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl">
                  <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block">Mother Tongue</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">{profile.motherTongue || 'Marathi'}</span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl">
                  <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block">Religion</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">{profile.religion || 'Hindu'}</span>
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
                      <button onClick={() => openSectionModal('basic')} className="text-[#E51F3E] font-bold">+ Add Community</button>
                    )}
                  </span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl">
                  <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block">Current Location</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {profile.currentLocation?.formattedAddress || [profile.city, profile.state, profile.country].filter(Boolean).join(', ') || 'Pune, Maharashtra'}
                  </span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl">
                  <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block">Income Range</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {profile.annualIncome || '₹ 35 - 50 Lakhs'}
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
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-xs font-bold text-slate-700 hover:text-[#E51F3E] transition"
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
                    Diet: <strong className="text-slate-900">{profile.foodPreference || 'Vegetarian'}</strong>
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 font-semibold">
                    Smoking / Drinking: <strong className="text-slate-900">{profile.smoking || 'Non-Smoker'} • {profile.drinking || 'Non-Drinker'}</strong>
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
                    {profile.education || 'MBBS'}
                  </span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl">
                  <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block">
                    Medical College
                  </span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {profile.medicalCollege || (
                      <button onClick={() => openSectionModal('medical_edu')} className="text-[#E51F3E] font-bold">+ Add Medical College</button>
                    )}
                  </span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl">
                  <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block">
                    University
                  </span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {profile.medicalUniversity || (
                      <button onClick={() => openSectionModal('medical_edu')} className="text-[#E51F3E] font-bold">+ Add University</button>
                    )}
                  </span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl">
                  <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block">
                    Graduation Year
                  </span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {profile.graduationYear || (
                      <button onClick={() => openSectionModal('medical_edu')} className="text-[#E51F3E] font-bold">+ Add Year</button>
                    )}
                  </span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl sm:col-span-2">
                  <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block">
                    Additional Qualification / Fellowship
                  </span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {profile.additionalQualification || (
                      <button onClick={() => openSectionModal('medical_edu')} className="text-[#E51F3E] font-bold">+ Add Additional Qualification</button>
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
                  <span className="font-bold text-slate-900 mt-0.5 block">{profile.profession || 'Medical Specialist'}</span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl">
                  <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block">Current Designation</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {profile.currentRole || profile.profession || 'Resident Medical Specialist'}
                  </span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl">
                  <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block">Hospital / Clinic</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {profile.currentHospital || profile.company || 'Sassoon General Hospital'}
                  </span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl">
                  <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block">Work Location</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">{profile.workLocation || profile.city || 'Pune'}</span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl">
                  <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block">Years of Experience</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">{profile.medicalExperience || '3+ Years Clinical Practice'}</span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl">
                  <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block">Practice Type</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">{profile.workType || 'Hospital Consultant'}</span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl sm:col-span-2">
                  <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block">Income Range</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">{profile.annualIncome || '₹ 35 - 50 Lakhs'}</span>
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
                    {profile.medicalCouncil || 'Maharashtra Medical Council / MCI'}
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
                    {profile.registrationYear || profile.graduationYear || '2022'}
                  </span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl">
                  <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block">
                    Registration Number (Protected)
                  </span>
                  <span className="font-mono text-slate-800 mt-0.5 block">
                    {profile.medicalRegistrationNumber ? `••••-${profile.medicalRegistrationNumber.slice(-4)}` : (
                      <button onClick={() => openSectionModal('medical_reg')} className="text-[#E51F3E] font-bold font-sans">+ Add Number</button>
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
                  <span className="font-semibold text-slate-800 mt-0.5 block">{profile.familyType || 'Nuclear Family'}</span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl">
                  <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block">Family Status</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">{profile.familyStatus || 'Upper Middle Class'}</span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl">
                  <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block">Native Place</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">{profile.nativePlace || profile.city || 'Pune, Maharashtra'}</span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl">
                  <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block">Father's Occupation</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {profile.fatherOccupation || (
                      <button onClick={() => openSectionModal('family')} className="text-[#E51F3E] font-bold">+ Add Father's Occupation</button>
                    )}
                  </span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl">
                  <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block">Mother's Occupation</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {profile.motherOccupation || (
                      <button onClick={() => openSectionModal('family')} className="text-[#E51F3E] font-bold">+ Add Mother's Occupation</button>
                    )}
                  </span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl">
                  <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block">Siblings</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {profile.siblings || (
                      <button onClick={() => openSectionModal('family')} className="text-[#E51F3E] font-bold">+ Add Siblings</button>
                    )}
                  </span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl sm:col-span-2">
                  <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block">Family Values</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">{profile.familyValues || 'Moderate'}</span>
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
                    {profile.partnerPreferences?.preferredAgeMin || 22} - {profile.partnerPreferences?.preferredAgeMax || 32} Years
                  </span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl">
                  <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block">Preferred Qualification</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {profile.partnerPreferences?.preferredQualification || 'MBBS / MD / MS / DNB'}
                  </span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl">
                  <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block">Preferred Specialization</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {profile.partnerPreferences?.preferredSpecialization || 'Open to all specialties'}
                  </span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl">
                  <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block">Preferred Location</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {profile.partnerPreferences?.preferredLocation || 'Pune / Mumbai / Maharashtra'}
                  </span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl sm:col-span-2">
                  <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block">Other Preferences</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {profile.partnerPreferences?.otherPreferences || (
                      <button onClick={() => openSectionModal('preferences')} className="text-[#E51F3E] font-bold">+ Add Preferences</button>
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
                      <span className="font-semibold text-slate-800 mt-0.5 block">{formattedDob}</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-2xl">
                      <span className="text-slate-400 text-[10px] font-bold uppercase block">Time of Birth</span>
                      <span className="font-semibold text-slate-800 mt-0.5 block">{profile.horoscope.timeOfBirth || 'Not specified'}</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-2xl">
                      <span className="text-slate-400 text-[10px] font-bold uppercase block">Place of Birth</span>
                      <span className="font-semibold text-slate-800 mt-0.5 block truncate">{profile.horoscope.placeOfBirth || profile.city || 'Pune'}</span>
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
                      <span className="font-bold text-slate-800 mt-0.5 block">{profile.horoscope.manglik || 'Non-Manglik'}</span>
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
                      <span>{profile.lifestyleInterests?.diet || profile.foodPreference || 'Vegetarian'}</span>
                    </span>
                    <span className="px-3.5 py-1.5 rounded-full bg-slate-100 text-slate-800 font-semibold">
                      Smoking: {profile.lifestyleInterests?.smoking || profile.smoking || 'Non-Smoker'}
                    </span>
                    <span className="px-3.5 py-1.5 rounded-full bg-slate-100 text-slate-800 font-semibold">
                      Alcohol: {profile.lifestyleInterests?.alcohol || profile.drinking || 'Non-Drinker'}
                    </span>
                    <span className="px-3.5 py-1.5 rounded-full bg-slate-100 text-slate-800 font-semibold flex items-center gap-1.5">
                      <Dumbbell className="w-3.5 h-3.5 text-slate-500" />
                      <span>{profile.lifestyleInterests?.exercise || 'Regular Fitness'}</span>
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
                      : ['Reading', 'Traveling', 'Photography', 'Music']
                    ).map((hobby: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-3 py-1 rounded-full bg-rose-50 text-[#800020] border border-rose-200/80 text-xs font-semibold"
                      >
                        {hobby}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="bg-slate-50 p-3 rounded-2xl">
                    <span className="text-slate-400 text-[10px] font-bold uppercase block">Languages Spoken</span>
                    <span className="font-semibold text-slate-800 mt-0.5 block">
                      {(profile.lifestyleInterests?.languages || [profile.motherTongue || 'Marathi', 'English']).join(', ')}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-2xl">
                    <span className="text-slate-400 text-[10px] font-bold uppercase block">Pets / Other</span>
                    <span className="font-semibold text-slate-800 mt-0.5 block">
                      {profile.lifestyleInterests?.pets || 'None'}
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
    </main>
  );
}
