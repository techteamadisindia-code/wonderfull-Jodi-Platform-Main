/**
 * Safe profile display helpers enforcing public vs authenticated member privacy.
 */

export interface MinimalProfile {
  _id?: string;
  id?: string;
  candidateId?: string;
  profileId?: string;
  displayName?: string | null;
  name?: string | null;
  publicName?: string | null;
  isAuthenticatedViewer?: boolean;
}

/**
 * Get candidate's public identification (e.g. WJ-100001)
 */
export function getCandidateId(profile?: MinimalProfile | null): string {
  if (!profile) return 'WJ-Candidate';
  if (profile.candidateId) return profile.candidateId;
  if (profile.profileId) return profile.profileId;
  if (profile._id && typeof profile._id === 'string' && profile._id.length >= 6) {
    return `WJ-${profile._id.slice(-6).toUpperCase()}`;
  }
  return 'WJ-Candidate';
}

/**
 * Centralized display name resolver:
 * - When viewer is authenticated and name is permitted: returns candidate's real name (e.g. "Dr. Priya Sharma")
 * - When viewer is unauthenticated: returns "Candidate ID: WJ-100245"
 */
export function getProfileDisplayName(
  profile?: MinimalProfile | null,
  isAuthenticated?: boolean
): string {
  if (!profile) return 'Doctor Candidate';

  const candidateId = getCandidateId(profile);

  // If backend marked profile as not authenticated viewer, always use Candidate ID
  if (profile.isAuthenticatedViewer === false) {
    return `Candidate ID: ${candidateId}`;
  }

  // If explicit isAuthenticated flag is passed and false, force Candidate ID
  if (isAuthenticated === false) {
    return `Candidate ID: ${candidateId}`;
  }

  // If permitted displayName or name exists, show it
  if (profile.displayName && profile.displayName.trim() !== '') {
    return profile.displayName;
  }
  if (profile.name && profile.name.trim() !== '') {
    return profile.name;
  }

  // Fallback to Candidate ID
  return `Candidate ID: ${candidateId}`;
}
