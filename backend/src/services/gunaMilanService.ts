/**
 * Ashtakoota 36 Guna Milan Calculation Service
 *
 * Implements canonical Vedic matchmaking:
 * 1. Varna (1 pt) - Spiritual compatibility and natural temperament
 * 2. Vashya (2 pts) - Mutual attraction, affection, and power dynamics
 * 3. Tara (3 pts) - Health, longevity, and destiny alignment
 * 4. Yoni (4 pts) - Biological, intimate, and physical compatibility
 * 5. Graha Maitri (5 pts) - Mental affinity, friendship, and worldview
 * 6. Gana (6 pts) - Temperament, behavioral harmony, and social outlook
 * 7. Bhakoot (7 pts) - Emotional prosperity, family welfare, and financial stability
 * 8. Nadi (8 pts) - Genetic, physiological, and progeny compatibility
 */

import { RASHIS, NAKSHATRAS } from './astrologyCalculationService';

export interface KootaResult {
  name: string;
  obtained: number;
  max: number;
  status: 'Excellent' | 'Good' | 'Average' | 'Low';
  description: string;
}

export interface AshtakootaReport {
  varna: KootaResult;
  vashya: KootaResult;
  tara: KootaResult;
  yoni: KootaResult;
  grahaMaitri: KootaResult;
  gana: KootaResult;
  bhakoot: KootaResult;
  nadi: KootaResult;
  totalObtained: number;
  totalMax: 36;
  percentage: number;
  compatibilityBand: string;
  summary: string;
}

// ─── 1. VARNA KOOTA (Max 1) ───
export function calculateVarna(groomRashiIndex: number, brideRashiIndex: number): KootaResult {
  const gVarna = RASHIS[groomRashiIndex].varnaRank;
  const bVarna = RASHIS[brideRashiIndex].varnaRank;

  // Traditional rule: Groom varna should be equal or higher for 1 point, else 0
  const obtained = gVarna >= bVarna ? 1 : 0;
  return {
    name: 'Varna',
    obtained,
    max: 1,
    status: obtained === 1 ? 'Excellent' : 'Average',
    description:
      obtained === 1
        ? 'Mutual spiritual and intellectual inclinations are harmonious and well-balanced.'
        : 'Different natural temperament styles; easily harmonized through mutual respect and shared priorities.',
  };
}

// ─── 2. VASHYA KOOTA (Max 2) ───
export function calculateVashya(groomRashiIndex: number, brideRashiIndex: number): KootaResult {
  const gType = RASHIS[groomRashiIndex].vashyaType;
  const bType = RASHIS[brideRashiIndex].vashyaType;

  let obtained = 0;
  if (gType === bType) {
    obtained = 2;
  } else if (
    (gType === 'Manava' && (bType === 'Chatushpada' || bType === 'Jalachara')) ||
    (bType === 'Manava' && (gType === 'Chatushpada' || gType === 'Jalachara'))
  ) {
    obtained = 1;
  } else if (gType === 'Vanachara' || bType === 'Vanachara') {
    obtained = gType === bType ? 2 : 0;
  } else {
    obtained = 1;
  }

  return {
    name: 'Vashya',
    obtained,
    max: 2,
    status: obtained === 2 ? 'Excellent' : obtained === 1 ? 'Good' : 'Low',
    description:
      obtained === 2
        ? 'Strong mutual attraction, natural magnetism, and intuitive mutual understanding.'
        : obtained === 1
        ? 'Healthy, balanced relationship dynamics with steady mutual respect.'
        : 'Complementary independent personalities; regular open communication strengthens alignment.',
  };
}

// ─── 3. TARA KOOTA (Max 3) ───
export function calculateTara(groomNakIndex: number, brideNakIndex: number): KootaResult {
  const count1 = ((groomNakIndex - brideNakIndex + 27) % 9) + 1;
  const count2 = ((brideNakIndex - groomNakIndex + 27) % 9) + 1;

  const isAuspicious1 = ![3, 5, 7].includes(count1);
  const isAuspicious2 = ![3, 5, 7].includes(count2);

  let obtained = 0;
  if (isAuspicious1 && isAuspicious2) obtained = 3;
  else if (isAuspicious1 || isAuspicious2) obtained = 1.5;
  else obtained = 0;

  return {
    name: 'Tara',
    obtained,
    max: 3,
    status: obtained === 3 ? 'Excellent' : obtained === 1.5 ? 'Good' : 'Low',
    description:
      obtained === 3
        ? 'Both birth stars reflect strong life vitality, mutual health, and positive life luck.'
        : obtained === 1.5
        ? 'Satisfactory destiny harmony between birth constellations with constructive life growth.'
        : 'Indicates mindful care for each other\'s physical well-being and proactive health consciousness.',
  };
}

// ─── 4. YONI KOOTA (Max 4) ───
const YONI_ENEMIES: Record<string, string> = {
  Horse: 'Buffalo',
  Buffalo: 'Horse',
  Elephant: 'Lion',
  Lion: 'Elephant',
  Sheep: 'Monkey',
  Monkey: 'Sheep',
  Serpent: 'Mongoose',
  Mongoose: 'Serpent',
  Dog: 'Deer',
  Deer: 'Dog',
  Cat: 'Rat',
  Rat: 'Cat',
  Cow: 'Tiger',
  Tiger: 'Cow',
};

export function calculateYoni(groomNakIndex: number, brideNakIndex: number): KootaResult {
  const gYoni = NAKSHATRAS[groomNakIndex].yoni;
  const bYoni = NAKSHATRAS[brideNakIndex].yoni;

  let obtained = 0;
  if (gYoni === bYoni) {
    obtained = 4;
  } else if (YONI_ENEMIES[gYoni] === bYoni) {
    obtained = 0;
  } else {
    obtained = 2; // Neutral / friendly pairing
  }

  return {
    name: 'Yoni',
    obtained,
    max: 4,
    status: obtained === 4 ? 'Excellent' : obtained >= 2 ? 'Good' : 'Low',
    description:
      obtained === 4
        ? 'Exceptional biological compatibility, natural warmth, and enduring physical attraction.'
        : obtained === 2
        ? 'Comfortable mutual affection with balanced lifestyle compatibility.'
        : 'Complementary instincts; cultivating patience and open communication fosters deep intimacy.',
  };
}

// ─── 5. GRAHA MAITRI KOOTA (Max 5) ───
const PLANET_RELATIONS: Record<string, { friends: string[]; neutrals: string[]; enemies: string[] }> = {
  Sun: { friends: ['Moon', 'Mars', 'Jupiter'], neutrals: ['Mercury'], enemies: ['Venus', 'Saturn'] },
  Moon: { friends: ['Sun', 'Mercury'], neutrals: ['Mars', 'Jupiter', 'Venus', 'Saturn'], enemies: [] },
  Mars: { friends: ['Sun', 'Moon', 'Jupiter'], neutrals: ['Venus', 'Saturn'], enemies: ['Mercury'] },
  Mercury: { friends: ['Sun', 'Venus'], neutrals: ['Mars', 'Jupiter', 'Saturn'], enemies: ['Moon'] },
  Jupiter: { friends: ['Sun', 'Moon', 'Mars'], neutrals: ['Saturn'], enemies: ['Mercury', 'Venus'] },
  Venus: { friends: ['Mercury', 'Saturn'], neutrals: ['Mars', 'Jupiter'], enemies: ['Sun', 'Moon'] },
  Saturn: { friends: ['Mercury', 'Venus'], neutrals: ['Jupiter'], enemies: ['Sun', 'Moon', 'Mars'] },
};

export function calculateGrahaMaitri(groomRashiIndex: number, brideRashiIndex: number): KootaResult {
  const gLord = RASHIS[groomRashiIndex].lord;
  const bLord = RASHIS[brideRashiIndex].lord;

  let obtained = 0;
  if (gLord === bLord) {
    obtained = 5;
  } else {
    const gRel = PLANET_RELATIONS[gLord] || { friends: [], neutrals: [], enemies: [] };
    const bRel = PLANET_RELATIONS[bLord] || { friends: [], neutrals: [], enemies: [] };

    const gFriend = gRel.friends.includes(bLord);
    const bFriend = bRel.friends.includes(gLord);
    const gEnemy = gRel.enemies.includes(bLord);
    const bEnemy = bRel.enemies.includes(gLord);

    if (gFriend && bFriend) obtained = 5;
    else if ((gFriend && !bEnemy) || (bFriend && !gEnemy)) obtained = 4;
    else if (!gEnemy && !bEnemy) obtained = 3;
    else if ((gEnemy && !bEnemy) || (bEnemy && !gEnemy)) obtained = 1;
    else obtained = 0;
  }

  return {
    name: 'Graha Maitri',
    obtained,
    max: 5,
    status: obtained >= 4 ? 'Excellent' : obtained >= 3 ? 'Good' : 'Low',
    description:
      obtained >= 4
        ? 'Exceptional intellectual friendship, shared sense of humor, and aligned life philosophies.'
        : obtained === 3
        ? 'Good mutual rapport; intellectual respect and understanding grow naturally over time.'
        : 'Different thinking patterns; embracing diverse perspectives enriches conversations.',
  };
}

// ─── 6. GANA KOOTA (Max 6) ───
export function calculateGana(groomNakIndex: number, brideNakIndex: number): KootaResult {
  const gGana = NAKSHATRAS[groomNakIndex].gana;
  const bGana = NAKSHATRAS[brideNakIndex].gana;

  let obtained = 0;
  if (gGana === bGana) {
    obtained = 6;
  } else if ((gGana === 'Deva' && bGana === 'Manushya') || (gGana === 'Manushya' && bGana === 'Deva')) {
    obtained = 5;
  } else if (gGana === 'Rakshasa' && bGana === 'Manushya') {
    obtained = 0;
  } else if (gGana === 'Manushya' && bGana === 'Rakshasa') {
    obtained = 0;
  } else {
    obtained = 1;
  }

  return {
    name: 'Gana',
    obtained,
    max: 6,
    status: obtained >= 5 ? 'Excellent' : obtained >= 3 ? 'Good' : 'Low',
    description:
      obtained >= 5
        ? 'Strong temperamental harmony, shared social nature, and easy consensus in daily decisions.'
        : obtained >= 3
        ? 'Balanced temperamental synergy with healthy individual identities.'
        : 'Contrasting temperaments; conscious patience and mutual space create constructive balance.',
  };
}

// ─── 7. BHAKOOT KOOTA (Max 7) ───
export function calculateBhakoot(groomRashiIndex: number, brideRashiIndex: number): KootaResult {
  const diff = ((groomRashiIndex - brideRashiIndex + 12) % 12) + 1;
  const inauspicious = [2, 12, 6, 8, 5, 9]; // Dwi-Dwadash, Shadashtak, Navam-Pancham

  let obtained = 7;
  if (inauspicious.includes(diff)) {
    // Check traditional cancellation if lords are identical or mutual friends
    const gLord = RASHIS[groomRashiIndex].lord;
    const bLord = RASHIS[brideRashiIndex].lord;
    const isLordFriend =
      gLord === bLord ||
      (PLANET_RELATIONS[gLord]?.friends.includes(bLord) &&
        PLANET_RELATIONS[bLord]?.friends.includes(gLord));

    obtained = isLordFriend ? 7 : 0;
  }

  return {
    name: 'Bhakoot',
    obtained,
    max: 7,
    status: obtained === 7 ? 'Excellent' : 'Low',
    description:
      obtained === 7
        ? 'Auspicious emotional resonance, shared prosperity, family happiness, and joint financial growth.'
        : 'Bhakoot difference noted. Constructive emotional alignment and shared financial planning overcome this factor.',
  };
}

// ─── 8. NADI KOOTA (Max 8) ───
export function calculateNadi(groomNakIndex: number, brideNakIndex: number): KootaResult {
  const gNadi = NAKSHATRAS[groomNakIndex].nadi;
  const bNadi = NAKSHATRAS[brideNakIndex].nadi;

  const obtained = gNadi !== bNadi ? 8 : 0;
  return {
    name: 'Nadi',
    obtained,
    max: 8,
    status: obtained === 8 ? 'Excellent' : 'Low',
    description:
      obtained === 8
        ? 'Different Nadis indicate sound genetic diversity, vigorous hereditary health, and optimal progeny vitality.'
        : 'Same Nadi (Nadi Dosha) identified. In modern matrimony, medical genetic screening and lifestyle balance resolve this factor.',
  };
}

/**
 * Calculate complete 36 Guna Milan report from Groom and Bride planetary positions
 */
export function calculate36GunaMilan(
  groomRashiIndex: number,
  groomNakIndex: number,
  brideRashiIndex: number,
  brideNakIndex: number
): AshtakootaReport {
  const varna = calculateVarna(groomRashiIndex, brideRashiIndex);
  const vashya = calculateVashya(groomRashiIndex, brideRashiIndex);
  const tara = calculateTara(groomNakIndex, brideNakIndex);
  const yoni = calculateYoni(groomNakIndex, brideNakIndex);
  const grahaMaitri = calculateGrahaMaitri(groomRashiIndex, brideRashiIndex);
  const gana = calculateGana(groomNakIndex, brideNakIndex);
  const bhakoot = calculateBhakoot(groomRashiIndex, brideRashiIndex);
  const nadi = calculateNadi(groomNakIndex, brideNakIndex);

  const totalObtained =
    varna.obtained +
    vashya.obtained +
    tara.obtained +
    yoni.obtained +
    grahaMaitri.obtained +
    gana.obtained +
    bhakoot.obtained +
    nadi.obtained;

  const percentage = Math.round((totalObtained / 36.0) * 100);

  let compatibilityBand = '';
  let summary = '';

  if (totalObtained >= 33) {
    compatibilityBand = 'Excellent Compatibility';
    summary = 'Exceptional astrological harmony across virtually all 8 dimensions. Highly auspicious match.';
  } else if (totalObtained >= 28) {
    compatibilityBand = 'Very Good Compatibility';
    summary = 'Superb mutual alignment. Strongly recommended in traditional Vedic matchmaking.';
  } else if (totalObtained >= 24) {
    compatibilityBand = 'Good Compatibility';
    summary = 'Solid foundation with above-average compatibility. Well-suited for a harmonious marital life.';
  } else if (totalObtained >= 18) {
    compatibilityBand = 'Moderate Compatibility';
    summary = 'Acceptable baseline match. Shared life goals, empathy, and mutual communication ensure success.';
  } else {
    compatibilityBand = 'Needs Careful Consideration';
    summary = 'Score indicates significant differences in traditional astrological alignments. Further mutual understanding and consultation recommended.';
  }

  return {
    varna,
    vashya,
    tara,
    yoni,
    grahaMaitri,
    gana,
    bhakoot,
    nadi,
    totalObtained,
    totalMax: 36,
    percentage,
    compatibilityBand,
    summary,
  };
}
