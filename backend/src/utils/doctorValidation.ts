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
 * Validates whether a given Date of Birth (DOB) is valid, exactly 4-digit year, not future, and real calendar date
 */
export function validateDateOfBirth(dobInput?: string | Date): { isValid: boolean; error?: string; formattedDate?: string; parsedDate?: Date } {
  if (!dobInput) {
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
    // Check if user submitted 5 or 6 digit year like 123456-01-01 or 202600-01-01
    const matchYear = dateStr.match(/^(\d+)[-/]/);
    if (matchYear && matchYear[1].length !== 4) {
      return { isValid: false, error: 'Date of birth year must be exactly 4 digits.' };
    }
    return { isValid: false, error: 'Date of birth year must be exactly 4 digits.' };
  }

  // 1. Year must be exactly 4 digits
  if (isNaN(year) || year < 1920 || year > 2100 || String(year).length !== 4) {
    return { isValid: false, error: 'Date of birth year must be exactly 4 digits.' };
  }

  // 2. Month validation (1-12)
  if (isNaN(month) || month < 1 || month > 12) {
    return { isValid: false, error: 'Please enter a valid month (01-12).' };
  }

  // 3. Days in month validation (handles leap years)
  const daysInMonth = new Date(year, month, 0).getDate();
  if (isNaN(day) || day < 1 || day > daysInMonth) {
    return { isValid: false, error: `Invalid date: Day must be between 1 and ${daysInMonth} for the selected month and year.` };
  }

  // 4. Construct real Date object
  const parsedDate = new Date(year, month - 1, day);
  const now = new Date();

  // 5. Future date check
  if (parsedDate > now) {
    return { isValid: false, error: 'Date of birth cannot be in the future.' };
  }

  // 6. Minimum age check (18 years)
  const minAgeDate = new Date(now.getFullYear() - 18, now.getMonth(), now.getDate());
  if (parsedDate > minAgeDate) {
    return { isValid: false, error: 'Candidate must be at least 18 years old.' };
  }

  const pad = (n: number) => String(n).padStart(2, '0');
  const formattedDate = `${year}-${pad(month)}-${pad(day)}`;

  return { isValid: true, formattedDate, parsedDate };
}

/**
 * Calculates profile completion percentage based on 10 realistic criteria (10 pts each = 100%)
 */
export function calculateProfileCompletion(profile: any, user?: any): number {
  if (!profile) return 0;
  let score = 0;

  // 1. Basic Information (Full Name, Gender, DOB, Height, Location) -> 10 pts
  if (profile.displayName && profile.gender && profile.dob && profile.height && (profile.city || profile.state)) {
    score += 10;
  }

  // 2. Personal Details (Marital Status, Religion, Mother Tongue) -> 10 pts
  if (profile.maritalStatus && profile.religion && profile.motherTongue) {
    score += 10;
  }

  // 3. Medical Qualification (Education / Degree / College) -> 10 pts
  if (profile.education && (profile.degree || profile.medicalCollege)) {
    score += 10;
  }

  // 4. Medical Specialization (Profession / Specialization) -> 10 pts
  if (profile.profession) {
    score += 10;
  }

  // 5. Medical Registration (Registration Number / Council) -> 10 pts
  if (profile.medicalRegistrationNumber || profile.medicalCouncil) {
    score += 10;
  }

  // 6. Medical Career & Practice (Hospital / Experience / Role / Income) -> 10 pts
  if (profile.currentHospital || profile.company || profile.medicalExperience || profile.currentRole || profile.annualIncome) {
    score += 10;
  }

  // 7. Family Details (Family Type / Parents Occupation / Native Place / Siblings) -> 10 pts
  if (profile.familyType || profile.fatherOccupation || profile.motherOccupation || profile.nativePlace || profile.siblings) {
    score += 10;
  }

  // 8. Partner Preferences -> 10 pts
  if (
    profile.partnerPreferences &&
    (profile.partnerPreferences.preferredLocation ||
      profile.partnerPreferences.preferredQualification ||
      profile.partnerPreferences.preferredSpecialization ||
      profile.partnerPreferences.preferredAgeMin)
  ) {
    score += 10;
  }

  // 9. About Me (Personal bio >= 20 chars) -> 10 pts
  if (profile.about && profile.about.trim().length >= 20) {
    score += 10;
  }

  // 10. Photos (Primary photo or photos array > 0) -> 10 pts
  if (profile.primaryPhoto || (Array.isArray(profile.photos) && profile.photos.length > 0)) {
    score += 10;
  }

  // 11. Horoscope & Lifestyle (5 pts)
  if (
    profile.horoscope?.rashi ||
    profile.horoscope?.manglik ||
    profile.lifestyleInterests?.diet ||
    profile.foodPreference ||
    (profile.hobbies && profile.hobbies.length > 0)
  ) {
    score += 5;
  }

  // 12. Verification Status (5 pts)
  const isVer =
    profile.verificationStatus === 'VERIFIED' ||
    profile.verificationStatus === 'DOCTOR_VERIFIED' ||
    user?.verified === true ||
    user?.verificationStatus === 'VERIFIED';
  if (isVer) {
    score += 5;
  }

  return Math.min(100, Math.max(0, score));
}
