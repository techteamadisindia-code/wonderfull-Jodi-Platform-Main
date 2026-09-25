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
];

export const UG_MEDICAL_QUALIFICATIONS = [
  'MBBS',
  'BDS',
  'BAMS',
  'BHMS',
  'BUMS',
  'BSMS',
  'Other Medical UG',
];

export const PG_MEDICAL_QUALIFICATIONS = [
  'MD',
  'MS',
  'DNB',
  'MDS',
  'Other Medical PG',
];

export const DOCTORATE_MEDICAL_QUALIFICATIONS = [
  'DM',
  'MCh',
  'PhD in Medical/Clinical Field',
  'Other Doctorate / Super-Specialization',
];

export const DEGREE_COMPLETION_STATUSES = ['Completed', 'Pursuing'] as const;

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
];

export const PARTNER_QUALIFICATIONS = [
  'Any Medical Qualification',
  'MBBS',
  'BDS',
  'BAMS',
  'BHMS',
  'BUMS',
  'MD',
  'MS',
  'DNB',
  'MDS',
  'DM',
  'MCh',
  'Other Medical Qualification',
];

export const PARTNER_SPECIALIZATIONS = [
  'Any Specialization',
  'General Physician',
  'Surgeon',
  'Cardiologist',
  'Dermatologist',
  'Gynecologist',
  'Pediatrician',
  'Orthopedic',
  'Psychiatrist',
  'Radiologist',
  'Dentist',
  'Other',
];

export const PARTNER_MARITAL_STATUSES = [
  'Never Married',
  'Divorced',
  'Widowed',
  'Other',
];

export const PARTNER_DIET_PREFERENCES = [
  'Any Diet Preference',
  'Vegetarian',
  'Non-Vegetarian',
  'Eggetarian',
  'Jain Vegetarian',
  'Vegan',
];

export const PARTNER_SMOKING_PREFERENCES = [
  'Does Not Matter',
  'Non-Smoker',
  'Occasional Smoker',
];

export const PARTNER_DRINKING_PREFERENCES = [
  'Does Not Matter',
  'Non-Drinker',
  'Social Drinker',
];

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

  for (const nonMed of NON_MEDICAL_KEYWORDS) {
    if (clean === nonMed || clean.startsWith(nonMed + ' ') || clean.includes(`(${nonMed}`) || clean.includes(`/${nonMed}`)) {
      return { isValid: false, error: 'Please select a valid medical/doctor qualification.' };
    }
  }

  const isDirectMatch = DOCTOR_QUALIFICATIONS.some(
    (q) => q.toLowerCase() === clean || clean.includes(q.toLowerCase())
  );

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

  // Reject alphabetic or unexpected symbols
  if (/[a-zA-Z]/.test(dateStr)) {
    return { isValid: false, error: 'Date of birth must contain only numbers.' };
  }

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
    // Check if user submitted year that is not 4 digits
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
  // Calculate exact age in years
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
