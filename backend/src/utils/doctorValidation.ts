export const DOCTOR_QUALIFICATIONS = [
  'MBBS',
  'BDS',
  'BAMS',
  'BHMS',
  'BUMS',
  'BSMS',
  'MD',
  'MS',
  'DNB',
  'DM',
  'MCh',
  'MDS',
  'MD/MS',
  'MBBS + MD',
  'MBBS + MS',
  'MBBS + DNB',
  'MBBS + Diploma',
  'Fellowship',
  'PhD (Medical/Clinical)',
  'Other Medical Qualification',
] as const;

export const DOCTOR_SPECIALIZATIONS = [
  'General Physician',
  'Cardiologist',
  'Dermatologist',
  'Neurologist',
  'Psychiatrist',
  'Pediatrician',
  'Gynecologist',
  'Obstetrician',
  'Orthopedic Surgeon',
  'General Surgeon',
  'ENT Specialist',
  'Ophthalmologist',
  'Radiologist',
  'Anesthesiologist',
  'Pathologist',
  'Dentist',
  'Ayurvedic Doctor',
  'Homeopathic Doctor',
  'Other Medical Specialist',
] as const;

const NON_MEDICAL_KEYWORDS = [
  'b.tech',
  'm.tech',
  'btech',
  'mtech',
  'bca',
  'mca',
  'bba',
  'mba',
  'b.com',
  'm.com',
  'bcom',
  'mcom',
  'b.sc',
  'm.sc',
  'bsc',
  'msc',
  'b.a',
  'm.a',
  'ba',
  'ma',
  'b.e',
  'm.e',
  'be',
  'me',
  'diploma',
  'engineering',
  'generic graduate',
  'generic postgraduate',
  'working professional',
];

/**
 * Validates whether a given qualification string is a valid medical/doctor qualification
 */
export function validateMedicalQualification(qualification?: string): { isValid: boolean; error?: string } {
  if (!qualification || typeof qualification !== 'string' || !qualification.trim()) {
    return { isValid: false, error: 'Please select a valid medical/doctor qualification.' };
  }

  const clean = qualification.trim().toLowerCase();

  // 1. Check for non-medical keywords
  for (const nonMed of NON_MEDICAL_KEYWORDS) {
    if (clean === nonMed || clean.startsWith(nonMed + ' ') || clean.includes(`(${nonMed}`) || clean.includes(`/${nonMed}`)) {
      return { isValid: false, error: 'Please select a valid medical/doctor qualification.' };
    }
  }

  // 2. Check against allowed doctor qualifications
  const isDirectMatch = DOCTOR_QUALIFICATIONS.some(
    (q) => q.toLowerCase() === clean || clean.includes(q.toLowerCase())
  );

  // Common medical variations: MBBS, MD, MS, BDS, MDS, BAMS, BHMS, DNB, DM, MCH, FRCS, MRCP
  const hasMedicalTerms =
    /\b(mbbs|bds|bams|bhms|bums|bsms|md|ms|dnb|dm|mch|mds|fellowship|medical|clinical|surgery|physician|surgeon|doctorate)\b/i.test(
      clean
    );

  if (isDirectMatch || hasMedicalTerms) {
    return { isValid: true };
  }

  return { isValid: false, error: 'Please select a valid medical/doctor qualification.' };
}

/**
 * Validates passing year: exactly 4 digits, between 1950 and current calendar year
 */
export function validatePassingYear(yearInput?: string | number): { isValid: boolean; error?: string; year?: number } {
  if (yearInput === undefined || yearInput === null || yearInput === '') {
    return { isValid: true }; // optional
  }

  const str = String(yearInput).trim();
  if (!/^\d{4}$/.test(str)) {
    return { isValid: false, error: 'Passing year must be exactly 4 digits (e.g. 2020).' };
  }

  const yr = parseInt(str, 10);
  const currentYear = new Date().getFullYear();

  if (yr < 1950) {
    return { isValid: false, error: 'Passing year must be 1950 or later.' };
  }
  if (yr > currentYear) {
    return { isValid: false, error: 'Passing year cannot be in the future.' };
  }

  return { isValid: true, year: yr };
}

/**
 * Validates a single qualification block (e.g. UG, PG, Doctorate)
 */
export function validateMedicalQualificationEntry(
  entry: any,
  required: boolean = true
): { isValid: boolean; error?: string } {
  if (!entry || typeof entry !== 'object') {
    if (required) return { isValid: false, error: 'Medical qualification entry is required.' };
    return { isValid: true };
  }

  const qual = (entry.qualification || '').trim();
  if (!qual) {
    if (required) return { isValid: false, error: 'Please select a medical qualification.' };
    return { isValid: true };
  }

  const qualValidation = validateMedicalQualification(qual);
  if (!qualValidation.isValid) {
    return { isValid: false, error: qualValidation.error || 'Invalid medical qualification.' };
  }

  if (entry.passingYear) {
    const yearValidation = validatePassingYear(entry.passingYear);
    if (!yearValidation.isValid) {
      return { isValid: false, error: yearValidation.error };
    }
  }

  return { isValid: true };
}

/**
 * Validates whether a given Date of Birth (DOB) is valid, exactly 4-digit year, not future, and real calendar date
 */
export function validateDateOfBirth(
  dobInput?: string | Date,
  gender?: string
): { isValid: boolean; error?: string; formattedDate?: string; parsedDate?: Date } {
  if (!dobInput || (typeof dobInput === 'string' && !dobInput.trim())) {
    return { isValid: false, error: 'Date of birth is required.' };
  }

  let dateStr = '';
  if (dobInput instanceof Date) {
    if (isNaN(dobInput.getTime())) {
      return { isValid: false, error: 'Invalid date of birth provided.' };
    }
    dateStr = dobInput.toISOString().split('T')[0];
  } else if (typeof dobInput === 'string') {
    dateStr = dobInput.trim();
  } else {
    return { isValid: false, error: 'Invalid date of birth format.' };
  }

  // Reject alphabetic or unexpected characters
  if (/[a-zA-Z]/.test(dateStr)) {
    return { isValid: false, error: 'Date of birth must contain only numbers.' };
  }

  // Support ISO YYYY-MM-DD or DD/MM/YYYY or DD-MM-YYYY
  let year: number;
  let month: number;
  let day: number;

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const parts = dateStr.split('-');
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
    day = parseInt(parts[2], 10);
  } else if (/^\d{2}[\/-]\d{2}[\/-]\d{4}$/.test(dateStr)) {
    const parts = dateStr.split(/[\/-]/);
    day = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
    year = parseInt(parts[2], 10);
  } else {
    // Check if user submitted year that is not 4 digits (e.g. 3-digit or 5-digit)
    const matchYear = dateStr.match(/^(\d+)[-/]/) || dateStr.match(/[-/](\d+)$/);
    if (matchYear && matchYear[1].length !== 4) {
      return { isValid: false, error: 'Date of birth year must be exactly 4 digits.' };
    }
    return { isValid: false, error: 'Date of birth must be in DD / MM / YYYY format with a 4-digit year.' };
  }

  // 1. Year must be exactly 4 digits and reasonable
  const currentYear = new Date().getFullYear();
  if (isNaN(year) || String(year).length !== 4) {
    return { isValid: false, error: 'Date of birth year must be exactly 4 digits.' };
  }
  if (year < 1920) {
    return { isValid: false, error: 'Please enter a valid birth year (1920 or later).' };
  }
  if (year > currentYear) {
    return { isValid: false, error: 'Date of birth cannot be in the future.' };
  }

  // 2. Month validation (1-12)
  if (isNaN(month) || month < 1 || month > 12) {
    return { isValid: false, error: 'Please enter a valid month between 01 and 12.' };
  }

  // 3. Day range check (01 to 31 basic bounds)
  if (isNaN(day) || day < 1 || day > 31) {
    return { isValid: false, error: 'Please enter a valid day between 01 and 31.' };
  }

  // 4. Days in month validation (handles leap years precisely)
  const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  const monthNames = [
    '', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const daysInMonth = new Date(year, month, 0).getDate();

  if (day > daysInMonth) {
    if (month === 2) {
      if (!isLeapYear) {
        return { isValid: false, error: `February ${year} has only 28 days (not a leap year).` };
      }
      return { isValid: false, error: `February ${year} has only 29 days.` };
    }
    return { isValid: false, error: `${monthNames[month]} has only ${daysInMonth} days.` };
  }

  // 5. Construct real Date object using UTC to avoid timezone shift roll-over
  const parsedDate = new Date(Date.UTC(year, month - 1, day));
  if (
    parsedDate.getUTCFullYear() !== year ||
    parsedDate.getUTCMonth() !== month - 1 ||
    parsedDate.getUTCDate() !== day
  ) {
    return { isValid: false, error: 'Please enter a valid calendar date.' };
  }

  const now = new Date();
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  // 6. Future date check
  if (parsedDate > todayUtc) {
    return { isValid: false, error: 'Date of birth cannot be in the future.' };
  }

  // 7. Minimum and Maximum age checks
  let age = now.getFullYear() - year;
  const monthDiff = now.getMonth() - (month - 1);
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < day)) {
    age--;
  }

  if (gender === 'Male' && age < 21) {
    return { isValid: false, error: 'Groom candidate must be at least 21 years old.' };
  }
  if (age < 18) {
    return { isValid: false, error: 'Candidate must be at least 18 years old.' };
  }
  if (age > 100) {
    return { isValid: false, error: 'Candidate age cannot exceed 100 years.' };
  }

  const pad = (n: number) => String(n).padStart(2, '0');
  const formattedDate = `${year}-${pad(month)}-${pad(day)}`;

  return { isValid: true, formattedDate, parsedDate };
}

export interface ProfileCompletionCategory {
  id: string;
  label: string;
  weight: number;
  completed: boolean;
  status: 'completed' | 'pending' | 'incomplete';
}

export interface ProfileCompletionResult {
  score: number;
  percentage: number;
  categories: ProfileCompletionCategory[];
}

/**
 * Calculates detailed profile completion breakdown across 11 distinct sections totaling exactly 100%.
 */
export function calculateProfileCompletionDetails(profile: any, user?: any): ProfileCompletionResult {
  if (!profile) {
    return { score: 0, percentage: 0, categories: [] };
  }

  const p = typeof profile.toObject === 'function' ? profile.toObject() : profile;

  // 1. Basic Details (10 pts)
  const hasBasic = Boolean(
    p.displayName &&
    p.gender &&
    p.dob &&
    p.height &&
    p.maritalStatus &&
    p.religion &&
    (p.city || p.state)
  );

  // 2. About Me (10 pts)
  const hasAbout = Boolean(
    (p.about && p.about.trim().length >= 20) ||
    (p.aboutMe && p.aboutMe.trim().length >= 10)
  );

  // 3. Medical Education (10 pts)
  const hasEducation = Boolean(
    (p.education && (p.degree || p.medicalCollege || p.medicalUniversity)) ||
    (p.medicalQualifications?.undergraduate && p.medicalQualifications.undergraduate.length > 0)
  );

  // 4. Medical Career & Practice (10 pts)
  const hasCareer = Boolean(
    p.profession &&
    (p.currentHospital || p.company || p.workLocation || p.currentRole || p.medicalExperience)
  );

  // 5. Medical Registration (15 pts)
  const hasRegistration = Boolean(
    p.medicalRegistrationNumber &&
    (p.medicalCouncil || p.registrationState)
  );

  // 6. Family Details (10 pts)
  const hasFamily = Boolean(
    (p.familyType &&
      (p.fatherOccupation || p.motherOccupation || p.nativePlace || p.siblings || p.familyValues || p.familyStatus)) ||
    (p.familyBackground &&
      (p.familyBackground.fatherName || p.familyBackground.motherName || p.familyBackground.familyType))
  );

  // 7. Partner Preferences (10 pts)
  const hasPreferences = Boolean(
    (p.partnerPreferences &&
      (p.partnerPreferences.preferredLocation ||
        p.partnerPreferences.preferredQualification ||
        p.partnerPreferences.preferredSpecialization ||
        p.partnerPreferences.preferredAgeMin ||
        p.partnerPreferences.preferredAgeMax)) ||
    (p.partnerExpectations &&
      (p.partnerExpectations.qualification ||
        p.partnerExpectations.specialization ||
        p.partnerExpectations.ageMin ||
        p.partnerExpectations.familyExpectations ||
        p.partnerExpectations.additionalExpectations))
  );

  // 8. Horoscope & Kundali (5 pts)
  const hasHoroscope = Boolean(
    p.horoscope?.rashi ||
    p.horoscope?.nakshatra ||
    p.horoscope?.lagna ||
    p.horoscope?.timeOfBirth ||
    p.horoscope?.placeOfBirth
  );

  // 9. Lifestyle & Interests (5 pts)
  const hasLifestyle = Boolean(
    p.lifestyleInterests?.diet ||
    p.foodPreference ||
    (Array.isArray(p.lifestyleInterests?.hobbies) && p.lifestyleInterests.hobbies.length > 0) ||
    (Array.isArray(p.hobbies) && p.hobbies.length > 0)
  );

  // 10. Photos (5 pts)
  const hasPhotos = Boolean(
    (p.primaryPhoto && p.primaryPhoto.trim() !== '') ||
    (Array.isArray(p.photos) && p.photos.length > 0)
  );

  // 11. Medical Verification (10 pts)
  const rawStatus = (p.verificationStatus || user?.verificationStatus || 'UNVERIFIED').toUpperCase();
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

  const categories: ProfileCompletionCategory[] = [
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
  return { score, percentage: score, categories };
}

/**
 * Calculates profile completion percentage based on the 11 verified criteria (totaling 100%)
 */
export function calculateProfileCompletion(profile: any, user?: any): number {
  return calculateProfileCompletionDetails(profile, user).score;
}

