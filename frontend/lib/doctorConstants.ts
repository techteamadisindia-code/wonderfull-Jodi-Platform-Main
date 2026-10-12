export const DOCTOR_QUALIFICATIONS = [
  'MBBS',
  'BDS',
  'BAMS',
  'BHMS',
  'BUMS',
  'BSMS',
  'BNYS',
  'MD',
  'MS',
  'DNB',
  'DM',
  'MCh',
  'DrNB',
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

export const ANNUAL_INCOME_OPTIONS = [
  'Below ₹5 Lakh',
  '₹ 5 - 10 Lakhs',
  '₹ 10 - 15 Lakhs',
  '₹ 15 - 25 Lakhs',
  '₹ 25 - 35 Lakhs',
  '₹ 35 - 50 Lakhs',
  '₹ 50 Lakhs - 1 Crore',
  '₹ 1 Crore+',
] as const;

/**
 * Height values requested:
 * 2.1, 2.2, 2.4–2.9, 3.1–3.10, 4.1–4.10, 5.1–5.10, 6.1–6.10, 7.1–7.10, and 8+
 */
export const HEIGHT_RAW_VALUES = [
  '2.1', '2.2', '2.4', '2.5', '2.6', '2.7', '2.8', '2.9',
  '3.1', '3.2', '3.3', '3.4', '3.5', '3.6', '3.7', '3.8', '3.9', '3.10',
  '4.1', '4.2', '4.3', '4.4', '4.5', '4.6', '4.7', '4.8', '4.9', '4.10',
  '5.1', '5.2', '5.3', '5.4', '5.5', '5.6', '5.7', '5.8', '5.9', '5.10',
  '6.1', '6.2', '6.3', '6.4', '6.5', '6.6', '6.7', '6.8', '6.9', '6.10',
  '7.1', '7.2', '7.3', '7.4', '7.5', '7.6', '7.7', '7.8', '7.9', '7.10',
  '8+'
] as const;

export interface HeightOptionItem {
  value: string;
  label: string;
}

/**
 * Normalizes any height input (e.g. '3,2', '5.2', '5\' 6"', '5′ 6″', '8+')
 * into clean feet and inches format: e.g. 5′ 2″
 */
export function formatHeightDisplay(height?: string | null): string {
  if (!height || typeof height !== 'string') return '';
  const trimmed = height.trim();
  if (!trimmed) return '';

  if (trimmed === '8+' || trimmed === '8ft+' || trimmed === '8′+') {
    return '8′+';
  }

  // Handle format like "3,2" or "5.2" or "5.10"
  const decimalMatch = trimmed.match(/^(\d+)[\.,](\d+)$/);
  if (decimalMatch) {
    const feet = decimalMatch[1];
    const inches = decimalMatch[2];
    return `${feet}′ ${inches}″`;
  }

  // Handle format like "5' 2"" or "5'2"" or "5′ 2″"
  const feetInchMatch = trimmed.match(/^(\d+)['′]\s*(\d+)["″]?$/);
  if (feetInchMatch) {
    return `${feetInchMatch[1]}′ ${feetInchMatch[2]}″`;
  }

  // Handle format like "5ft 2in" or "5 ft 2 in"
  const ftInMatch = trimmed.match(/^(\d+)\s*ft\s*(\d+)\s*(?:in)?$/i);
  if (ftInMatch) {
    return `${ftInMatch[1]}′ ${ftInMatch[2]}″`;
  }

  // Return as-is if already formatted or single number
  return trimmed;
}

/**
 * Pre-formatted height options for dropdowns with clean feet & inches display
 */
export const HEIGHT_OPTIONS: HeightOptionItem[] = HEIGHT_RAW_VALUES.map((raw) => {
  return {
    value: formatHeightDisplay(raw),
    label: raw === '8+' ? '8′+ (8 ft and above)' : `${formatHeightDisplay(raw)} (${raw})`,
  };
});

export const UG_MEDICAL_QUALIFICATIONS = [
  'MBBS',
  'BDS',
  'BAMS',
  'BHMS',
  'BUMS',
  'BSMS',
  'BNYS',
  'Other Medical UG',
] as const;

export const PG_MEDICAL_QUALIFICATIONS = [
  'MD',
  'MS',
  'MDS',
  'DNB',
  'Other Medical PG',
] as const;

export const DOCTORATE_MEDICAL_QUALIFICATIONS = [
  'DM',
  'MCh',
  'DrNB',
  'Other Doctorate / Super-Speciality',
] as const;

export const DEGREE_COMPLETION_STATUSES = ['Completed', 'Pursuing'] as const;

export const MD_SPECIALIZATIONS = [
  'General Medicine',
  'Paediatrics',
  'Anaesthesiology',
  'Radiodiagnosis',
  'Dermatology',
  'Psychiatry',
  'Respiratory Medicine',
  'Emergency Medicine',
  'Pathology',
  'Microbiology',
  'Pharmacology',
  'Community Medicine',
  'Forensic Medicine',
  'Nuclear Medicine',
  'Radiation Oncology',
  'Physical Medicine and Rehabilitation',
  'Geriatrics',
  'Ayurvedic Medicine',
  'Homeopathic Medicine',
  'Unani Medicine',
  'Other MD Specialization',
] as const;

export const MS_SPECIALIZATIONS = [
  'General Surgery',
  'Orthopaedics',
  'Obstetrics and Gynaecology',
  'Ophthalmology',
  'ENT (Otorhinolaryngology)',
  'Other MS Specialization',
] as const;

export const MDS_SPECIALIZATIONS = [
  'Master of Dental Surgery (General MDS)',
  'Prosthodontics',
  'Periodontics',
  'Oral and Maxillofacial Surgery',
  'Conservative Dentistry and Endodontics',
  'Orthodontics and Dentofacial Orthopaedics',
  'Pedodontics and Preventive Dentistry',
  'Oral Pathology and Microbiology',
  'Public Health Dentistry',
  'Oral Medicine and Radiology',
  'Other MDS Specialization',
] as const;

export const DNB_SPECIALIZATIONS = [
  'General Medicine',
  'Paediatrics',
  'Anaesthesiology',
  'Radiodiagnosis',
  'Dermatology',
  'Psychiatry',
  'Respiratory Medicine',
  'Emergency Medicine',
  'Pathology',
  'General Surgery',
  'Orthopaedics',
  'Obstetrics and Gynaecology',
  'Ophthalmology',
  'ENT (Otorhinolaryngology)',
  'Other DNB Specialization',
] as const;

/**
 * Doctorate / Super-Speciality Pathways (from Doctorate or Super speciality.pdf)
 */
export const SUPER_SPECIALITY_PATHWAYS: Record<string, { degrees: string[]; specialities: string[] }> = {
  'General Medicine': {
    degrees: ['DM'],
    specialities: [
      'Cardiology',
      'Neurology',
      'Nephrology',
      'Medical Gastroenterology',
      'Endocrinology',
      'Medical Oncology',
      'Clinical Haematology',
      'Critical Care Medicine',
      'Infectious Diseases',
      'Hepatology',
    ],
  },
  'Paediatrics': {
    degrees: ['DM'],
    specialities: [
      'Neonatology',
      'Paediatric Neurology',
      'Paediatric Nephrology',
      'Paediatric Gastroenterology',
      'Paediatric Critical Care',
    ],
  },
  'Respiratory Medicine': {
    degrees: ['DM', 'DrNB'],
    specialities: ['Critical Care Medicine', 'Pulmonary Medicine'],
  },
  'Anaesthesiology': {
    degrees: ['DM', 'DrNB'],
    specialities: ['Critical Care Medicine'],
  },
  'Radiodiagnosis': {
    degrees: ['DM', 'DrNB'],
    specialities: ['Interventional Radiology'],
  },
  'General Surgery': {
    degrees: ['MCh', 'DrNB'],
    specialities: [
      'Cardiovascular and Thoracic Surgery',
      'Neurosurgery',
      'Urology',
      'Plastic and Reconstructive Surgery',
      'Surgical Gastroenterology',
      'Surgical Oncology',
      'Endocrine Surgery',
      'Vascular Surgery',
      'Paediatric Surgery',
    ],
  },
  'Orthopaedics': {
    degrees: ['MCh', 'DrNB'],
    specialities: [
      'Hand Surgery',
      'Paediatric Orthopaedics',
      'Surgical Oncology',
    ],
  },
  'Obstetrics and Gynaecology': {
    degrees: ['MCh', 'DrNB'],
    specialities: [
      'Gynaecological Oncology',
      'Reproductive Medicine and Surgery',
    ],
  },
  'ENT (Otorhinolaryngology)': {
    degrees: ['MCh', 'DrNB'],
    specialities: [
      'Head and Neck Surgery',
      'Neurosurgery',
      'Plastic and Reconstructive Surgery',
    ],
  },
};

export const ALL_SUPER_SPECIALIZATIONS = [
  'Cardiology',
  'Neurology',
  'Nephrology',
  'Medical Gastroenterology',
  'Endocrinology',
  'Medical Oncology',
  'Clinical Haematology',
  'Critical Care Medicine',
  'Infectious Diseases',
  'Hepatology',
  'Neonatology',
  'Paediatric Neurology',
  'Paediatric Nephrology',
  'Paediatric Gastroenterology',
  'Paediatric Critical Care',
  'Pulmonary Medicine',
  'Interventional Radiology',
  'Cardiovascular and Thoracic Surgery',
  'Neurosurgery',
  'Urology',
  'Plastic and Reconstructive Surgery',
  'Surgical Gastroenterology',
  'Surgical Oncology',
  'Endocrine Surgery',
  'Vascular Surgery',
  'Paediatric Surgery',
  'Hand Surgery',
  'Paediatric Orthopaedics',
  'Gynaecological Oncology',
  'Reproductive Medicine and Surgery',
  'Head and Neck Surgery',
  'Other Super-Speciality',
] as const;

export function getSpecializationsForPgDegree(qualification?: string): string[] {
  if (!qualification) return [];
  const q = qualification.trim().toUpperCase();
  if (q === 'MD') return [...MD_SPECIALIZATIONS];
  if (q === 'MS') return [...MS_SPECIALIZATIONS];
  if (q === 'MDS') return [...MDS_SPECIALIZATIONS];
  if (q === 'DNB') return [...DNB_SPECIALIZATIONS];
  return [...MD_SPECIALIZATIONS, ...MS_SPECIALIZATIONS];
}

export function getSuggestedSuperSpecialties(pgSpecialization?: string): string[] {
  if (!pgSpecialization) return [...ALL_SUPER_SPECIALIZATIONS];
  const pathway = SUPER_SPECIALITY_PATHWAYS[pgSpecialization];
  if (pathway && pathway.specialities.length > 0) {
    const pathwaySet = new Set(pathway.specialities);
    const others = ALL_SUPER_SPECIALIZATIONS.filter((s) => !pathwaySet.has(s));
    return [...pathway.specialities, ...others];
  }
  return [...ALL_SUPER_SPECIALIZATIONS];
}

/**
 * Suggests sensible completion year for subsequent degree (e.g. PG ~ UG + 3, Doctorate ~ PG + 3)
 */
export function getSuggestedCompletionYear(
  previousYearInput?: string | number | null,
  offset: number = 3
): string {
  if (!previousYearInput) return '';
  const prev = Number(previousYearInput);
  if (isNaN(prev) || prev < 1950) return '';
  const currentYear = new Date().getFullYear();
  const suggested = prev + offset;
  return String(Math.min(suggested, currentYear + 4));
}

/**
 * Validates chronological completion year sequence
 */
export function validateDegreeYearSequence(
  ugYear?: string | number | null,
  pgYear?: string | number | null,
  docYear?: string | number | null
): { isValid: boolean; error?: string } {
  const ug = ugYear ? Number(ugYear) : null;
  const pg = pgYear ? Number(pgYear) : null;
  const doc = docYear ? Number(docYear) : null;

  if (ug && pg && pg < ug) {
    return {
      isValid: false,
      error: `PG completion year (${pg}) cannot be earlier than UG completion year (${ug}).`,
    };
  }

  if (pg && doc && doc < pg) {
    return {
      isValid: false,
      error: `Doctorate/Super-speciality completion year (${doc}) cannot be earlier than PG completion year (${pg}).`,
    };
  }

  if (ug && doc && !pg && doc < ug) {
    return {
      isValid: false,
      error: `Doctorate completion year (${doc}) cannot be earlier than UG completion year (${ug}).`,
    };
  }

  return { isValid: true };
}

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
