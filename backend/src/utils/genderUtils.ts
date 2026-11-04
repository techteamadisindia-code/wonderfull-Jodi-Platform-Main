/**
 * Gender and Registration Status Utilities
 * Standardized mapping, normalization, and query helpers for Wonderful Jodi.
 */

/**
 * Normalizes input gender values according to the platform specification:
 * - Groom -> Male
 * - Bride -> Female
 * - Male -> Male
 * - Female -> Female
 * - Null / missing / whitespace -> null (displays as "Not recorded")
 * - Unknown / invalid -> null (displays as "Not recorded")
 */
export function normalizeGender(val: any): 'Male' | 'Female' | null {
  if (val === null || val === undefined) return null;
  const str = String(val).trim().toLowerCase();
  if (str === 'groom' || str === 'male' || str === 'grooms' || str === 'm') {
    return 'Male';
  }
  if (str === 'bride' || str === 'female' || str === 'brides' || str === 'f') {
    return 'Female';
  }
  return null;
}

/**
 * Returns database query variants for a target gender search/filter:
 * e.g. 'Male' -> ['Male', 'male', 'Groom', 'groom']
 * e.g. 'Female' -> ['Female', 'female', 'Bride', 'bride']
 */
export function getGenderQueryVariants(target: string): string[] {
  const normalized = normalizeGender(target);
  if (normalized === 'Male') {
    return ['Male', 'male', 'Groom', 'groom', 'GROOM', 'MALE'];
  }
  if (normalized === 'Female') {
    return ['Female', 'female', 'Bride', 'bride', 'BRIDE', 'FEMALE'];
  }
  return [target];
}

/**
 * Formats a gender value for display or export: returns 'Male', 'Female', or 'Not recorded'.
 */
export function formatGenderDisplay(val: any): string {
  const normalized = normalizeGender(val);
  return normalized || 'Not recorded';
}

/**
 * Safely extracts a string User ID from a document or populated relation field.
 */
export function extractDocUserId(val: any): string {
  if (!val) return '';
  if (typeof val === 'object') {
    return String(val.id || val._id || val.userId || '');
  }
  return String(val);
}

/**
 * Authoritatively calculates registration status from Profile and Registration records:
 * - 'Complete': Authoritative COMPLETED registration OR complete matrimonial profile
 * - 'In Progress': Active draft in progress (status IN_PROGRESS or positive progress, not deleted)
 * - 'Incomplete': Early/abandoned/deleted draft (status STARTED/ABANDONED/isDeleted or stub profile)
 * - 'Pending': Account created with no registration draft or profile started
 */
export function calculateUserRegistrationStatus(
  p: any,
  r: any
): 'Complete' | 'In Progress' | 'Incomplete' | 'Pending' {
  // 1. Authoritative registration status from Registration model
  if (r?.status === 'COMPLETED') {
    return 'Complete';
  }

  // 2. Verified profile completeness: requires candidateId, name, and substantive data
  const hasCandidateId = Boolean(p?.candidateId && String(p.candidateId).trim().length > 0);
  const hasName = Boolean(
    (p?.displayName || p?.fullName || p?.name) &&
      String(p.displayName || p.fullName || p.name).trim().length > 0
  );
  const hasSubstance = Boolean(
    p?.gender ||
      p?.dob ||
      p?.city ||
      p?.state ||
      p?.education ||
      p?.degree ||
      p?.profession ||
      p?.medicalRegistrationNumber
  );

  if (hasCandidateId && hasName && (hasSubstance || !p?._id)) {
    return 'Complete';
  }

  // 3. In Progress registration draft (active, not deleted)
  if (r?.status === 'IN_PROGRESS' && !r?.isDeleted) {
    return 'In Progress';
  }

  // 4. Incomplete draft or stub profile (or deleted/abandoned draft)
  if (
    r?.status === 'STARTED' ||
    r?.status === 'ABANDONED' ||
    r?.status === 'IN_PROGRESS' ||
    r?.isDeleted ||
    (p && (p._id || p.candidateId || Object.keys(p).length > 0))
  ) {
    return 'Incomplete';
  }

  // 5. Default: Pending (e.g. administrator or user with no matrimonial registration started)
  return 'Pending';
}
