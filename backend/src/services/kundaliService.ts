/**
 * Kundali Matching Orchestration Service
 *
 * Coordinates:
 * - Planetary Ephemeris calculation
 * - Ashtakoota 36 Guna Milan
 * - Mangal Dosha analysis
 * - Dimension compatibility scores (Emotional, Communication, Family, Overall)
 */

import {
  computePlanetaryBirthDetails,
  PlanetaryBirthDetails,
} from './astrologyCalculationService';
import {
  calculate36GunaMilan,
  AshtakootaReport,
} from './gunaMilanService';
import {
  analyzeMutualManglik,
  MutualManglikReport,
} from './manglikService';

export interface StructuredBirthPlace {
  name: string;
  village?: string;
  city?: string;
  taluka?: string;
  district?: string;
  state?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string | number;
}

export interface PersonBirthInput {
  name?: string;
  gender?: string;
  dateOfBirth: string | Date;
  timeOfBirth?: string;
  birthPlace: StructuredBirthPlace;
}

export interface CompatibilityDimension {
  title: string;
  score: number; // 0 - 100
  rating: 'Excellent' | 'Very Good' | 'Good' | 'Moderate' | 'Fair';
  description: string;
  highlight: string;
}

export interface PublicKundaliMatchOutput {
  person1: {
    name: string;
    gender: string;
    dateOfBirth: string;
    timeOfBirth: string;
    birthPlace: StructuredBirthPlace;
    rashi: string;
    nakshatra: string;
    pada: number;
    lagna?: string;
    manglikStatus: string;
  };
  person2: {
    name: string;
    gender: string;
    dateOfBirth: string;
    timeOfBirth: string;
    birthPlace: StructuredBirthPlace;
    rashi: string;
    nakshatra: string;
    pada: number;
    lagna?: string;
    manglikStatus: string;
  };
  gunaScore: number;
  maxScore: 36;
  percentage: number;
  compatibilityBand: string;
  summary: string;
  ashtakoota: AshtakootaReport;
  manglik: MutualManglikReport;
  dimensions: {
    emotional: CompatibilityDimension;
    communication: CompatibilityDimension;
    family: CompatibilityDimension;
    overall: CompatibilityDimension;
  };
  culturalDisclaimer: string;
}

/**
 * Main public Kundali match computation function
 */
export function computeKundaliMatch(
  p1Input: PersonBirthInput,
  p2Input: PersonBirthInput
): PublicKundaliMatchOutput {
  // Validate DOB
  const dob1 = new Date(p1Input.dateOfBirth);
  const dob2 = new Date(p2Input.dateOfBirth);

  if (isNaN(dob1.getTime())) throw new Error('Person 1 Date of Birth is invalid.');
  if (isNaN(dob2.getTime())) throw new Error('Person 2 Date of Birth is invalid.');

  const lat1 = Number(p1Input.birthPlace?.latitude) || 18.5204;
  const lon1 = Number(p1Input.birthPlace?.longitude) || 73.8567;
  const lat2 = Number(p2Input.birthPlace?.latitude) || 18.5204;
  const lon2 = Number(p2Input.birthPlace?.longitude) || 73.8567;

  // 1. Calculate Planetary Details
  const p1Planetary = computePlanetaryBirthDetails(
    dob1,
    p1Input.timeOfBirth,
    lat1,
    lon1,
    5.5
  );

  const p2Planetary = computePlanetaryBirthDetails(
    dob2,
    p2Input.timeOfBirth,
    lat2,
    lon2,
    5.5
  );

  // 2. Identify Groom and Bride for canonical counting
  const p1IsMale = (p1Input.gender || 'Male').toLowerCase() === 'male';
  const groomPlanetary = p1IsMale ? p1Planetary : p2Planetary;
  const bridePlanetary = p1IsMale ? p2Planetary : p1Planetary;

  // 3. 36 Guna Milan Ashtakoota Calculation
  const ashtakoota = calculate36GunaMilan(
    groomPlanetary.rashiIndex,
    groomPlanetary.nakshatraIndex,
    bridePlanetary.rashiIndex,
    bridePlanetary.nakshatraIndex
  );

  // 4. Manglik Analysis
  const manglik = analyzeMutualManglik(p1Planetary, p2Planetary);

  // 5. Dimension Compatibility Calculations
  // Emotional: Bhakoot (7) + Graha Maitri (5) + Vashya (2) -> max 14
  const emotionalPoints = ashtakoota.bhakoot.obtained + ashtakoota.grahaMaitri.obtained + ashtakoota.vashya.obtained;
  const emotionalScore = Math.min(100, Math.round((emotionalPoints / 14.0) * 100));

  // Communication: Gana (6) + Graha Maitri (5) -> max 11
  const commPoints = ashtakoota.gana.obtained + ashtakoota.grahaMaitri.obtained;
  const commScore = Math.min(100, Math.round((commPoints / 11.0) * 100));

  // Family: Nadi (8) + Varna (1) + Tara (3) -> max 12
  const familyPoints = ashtakoota.nadi.obtained + ashtakoota.varna.obtained + ashtakoota.tara.obtained;
  const familyScore = Math.min(100, Math.round((familyPoints / 12.0) * 100));

  const overallScore = ashtakoota.percentage;

  function getRating(score: number): 'Excellent' | 'Very Good' | 'Good' | 'Moderate' | 'Fair' {
    if (score >= 85) return 'Excellent';
    if (score >= 70) return 'Very Good';
    if (score >= 55) return 'Good';
    if (score >= 40) return 'Moderate';
    return 'Fair';
  }

  const dimensions = {
    emotional: {
      title: 'Emotional Compatibility',
      score: emotionalScore,
      rating: getRating(emotionalScore),
      highlight:
        emotionalScore >= 70
          ? 'Deep instinctive empathy & mutual comfort'
          : 'Grows steadily through shared understanding & active listening',
      description:
        'Derived from Bhakoot and Graha Maitri, reflecting how naturally both minds connect, express empathy, and offer emotional security.',
    },
    communication: {
      title: 'Communication & Intellectual Alignment',
      score: commScore,
      rating: getRating(commScore),
      highlight:
        commScore >= 70
          ? 'Clear conversational rhythm & aligned life priorities'
          : 'Complementary viewpoints that bring healthy balance',
      description:
        'Reflected in Gana and planetary ruler affinities, measuring daily conversational ease, collaborative decision-making, and problem solving.',
    },
    family: {
      title: 'Family & Hereditary Harmony',
      score: familyScore,
      rating: getRating(familyScore),
      highlight:
        familyScore >= 70
          ? 'Strong foundational synergy for family lineage & well-being'
          : 'Balanced household dynamics through mutual cooperation',
      description:
        'Evaluated from Nadi and Tara Kootas, signifying health, mutual physical vitality, long-term stability, and hereditary harmony.',
    },
    overall: {
      title: 'Overall Ashtakoota Match',
      score: overallScore,
      rating: getRating(overallScore),
      highlight: ashtakoota.compatibilityBand,
      description: ashtakoota.summary,
    },
  };

  return {
    person1: {
      name: p1Input.name || 'Person 1',
      gender: p1Input.gender || 'Male',
      dateOfBirth: dob1.toISOString().split('T')[0],
      timeOfBirth: p1Input.timeOfBirth || '12:00 PM',
      birthPlace: p1Input.birthPlace,
      rashi: p1Planetary.rashiName,
      nakshatra: p1Planetary.nakshatraName,
      pada: p1Planetary.pada,
      lagna: p1Planetary.lagnaName,
      manglikStatus: manglik.person1Status,
    },
    person2: {
      name: p2Input.name || 'Person 2',
      gender: p2Input.gender || 'Female',
      dateOfBirth: dob2.toISOString().split('T')[0],
      timeOfBirth: p2Input.timeOfBirth || '12:00 PM',
      birthPlace: p2Input.birthPlace,
      rashi: p2Planetary.rashiName,
      nakshatra: p2Planetary.nakshatraName,
      pada: p2Planetary.pada,
      lagna: p2Planetary.lagnaName,
      manglikStatus: manglik.person2Status,
    },
    gunaScore: ashtakoota.totalObtained,
    maxScore: 36,
    percentage: ashtakoota.percentage,
    compatibilityBand: ashtakoota.compatibilityBand,
    summary: ashtakoota.summary,
    ashtakoota,
    manglik,
    dimensions,
    culturalDisclaimer:
      'Kundali matching and 36 Guna Milan are traditional Vedic astrology calculations provided for cultural, matrimonial, and informational purposes. Real-world relationship success flourishes with mutual respect, shared vision, open communication, and personal commitment.',
  };
}
