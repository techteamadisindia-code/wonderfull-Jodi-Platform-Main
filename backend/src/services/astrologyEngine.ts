/**
 * Genuine Vedic Astrology & 36 Guna Milan (Ashta-Koota) Calculation Engine
 *
 * Implements:
 * 1. Astronomical Ephemeris: Julian Day, Chitra Paksha (Lahiri) Ayanamsha,
 *    Nirayana Moon Longitude, Nakshatra, Pada, Moon Rashi, Ascendant (Lagna),
 *    and Mars Longitude for Manglik Analysis.
 * 2. Canonical 36 Guna Milan (Ashta-Koota) matching:
 *    - Varna (1 pt)
 *    - Vashya (2 pts)
 *    - Tara (3 pts)
 *    - Yoni (4 pts)
 *    - Graha Maitri (5 pts)
 *    - Gana (6 pts)
 *    - Bhakoot (7 pts)
 *    - Nadi (8 pts)
 *    Total: 36 points
 * 3. Manglik / Mangal Dosha Analysis with reliable birth-time validation.
 */

import {
  calculate36GunaMilan as _gm_calculate36GunaMilan,
  AshtakootaReport,
  KootaResult,
} from './gunaMilanService';

// ─── CANONICAL VEDIC DATA DEFINITIONS ───

export interface RashiInfo {
  index: number; // 0 to 11
  name: string; // e.g. "Mesh (Aries)"
  sanskritName: string; // e.g. "Mesh"
  englishName: string; // e.g. "Aries"
  lord: string; // Planetary ruler: Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn
  element: 'Fire' | 'Earth' | 'Air' | 'Water';
  varna: 'Brahmin' | 'Kshatriya' | 'Vaishya' | 'Shudra';
  varnaRank: number; // Brahmin=4, Kshatriya=3, Vaishya=2, Shudra=1
  vashyaType: 'Chatushpada' | 'Manava' | 'Jalachara' | 'Vanachara' | 'Keeta';
}

export const RASHIS: RashiInfo[] = [
  { index: 0, name: 'Mesh (Aries)', sanskritName: 'Mesh', englishName: 'Aries', lord: 'Mars', element: 'Fire', varna: 'Kshatriya', varnaRank: 3, vashyaType: 'Chatushpada' },
  { index: 1, name: 'Vrishabha (Taurus)', sanskritName: 'Vrishabha', englishName: 'Taurus', lord: 'Venus', element: 'Earth', varna: 'Vaishya', varnaRank: 2, vashyaType: 'Chatushpada' },
  { index: 2, name: 'Mithun (Gemini)', sanskritName: 'Mithun', englishName: 'Gemini', lord: 'Mercury', element: 'Air', varna: 'Shudra', varnaRank: 1, vashyaType: 'Manava' },
  { index: 3, name: 'Kark (Cancer)', sanskritName: 'Kark', englishName: 'Cancer', lord: 'Moon', element: 'Water', varna: 'Brahmin', varnaRank: 4, vashyaType: 'Jalachara' },
  { index: 4, name: 'Singh (Leo)', sanskritName: 'Singh', englishName: 'Leo', lord: 'Sun', element: 'Fire', varna: 'Kshatriya', varnaRank: 3, vashyaType: 'Vanachara' },
  { index: 5, name: 'Kanya (Virgo)', sanskritName: 'Kanya', englishName: 'Virgo', lord: 'Mercury', element: 'Earth', varna: 'Vaishya', varnaRank: 2, vashyaType: 'Manava' },
  { index: 6, name: 'Tula (Libra)', sanskritName: 'Tula', englishName: 'Libra', lord: 'Venus', element: 'Air', varna: 'Shudra', varnaRank: 1, vashyaType: 'Manava' },
  { index: 7, name: 'Vrishchik (Scorpio)', sanskritName: 'Vrishchik', englishName: 'Scorpio', lord: 'Mars', element: 'Water', varna: 'Brahmin', varnaRank: 4, vashyaType: 'Keeta' },
  { index: 8, name: 'Dhanu (Sagittarius)', sanskritName: 'Dhanu', englishName: 'Sagittarius', lord: 'Jupiter', element: 'Fire', varna: 'Kshatriya', varnaRank: 3, vashyaType: 'Manava' },
  { index: 9, name: 'Makar (Capricorn)', sanskritName: 'Makar', englishName: 'Capricorn', lord: 'Saturn', element: 'Earth', varna: 'Vaishya', varnaRank: 2, vashyaType: 'Jalachara' },
  { index: 10, name: 'Kumbh (Aquarius)', sanskritName: 'Kumbh', englishName: 'Aquarius', lord: 'Saturn', element: 'Air', varna: 'Shudra', varnaRank: 1, vashyaType: 'Manava' },
  { index: 11, name: 'Meen (Pisces)', sanskritName: 'Meen', englishName: 'Pisces', lord: 'Jupiter', element: 'Water', varna: 'Brahmin', varnaRank: 4, vashyaType: 'Jalachara' },
];

export interface NakshatraInfo {
  index: number; // 0 to 26
  name: string;
  ruler: string;
  gana: 'Deva' | 'Manushya' | 'Rakshasa';
  yoni: string; // Animal archetype
  nadi: 'Aadi' | 'Madhya' | 'Antya';
  varna: 'Brahmin' | 'Kshatriya' | 'Vaishya' | 'Shudra';
}

export const NAKSHATRAS: NakshatraInfo[] = [
  { index: 0, name: 'Ashwini', ruler: 'Ketu', gana: 'Deva', yoni: 'Horse', nadi: 'Aadi', varna: 'Vaishya' },
  { index: 1, name: 'Bharani', ruler: 'Venus', gana: 'Manushya', yoni: 'Elephant', nadi: 'Madhya', varna: 'Shudra' },
  { index: 2, name: 'Krittika', ruler: 'Sun', gana: 'Rakshasa', yoni: 'Sheep', nadi: 'Antya', varna: 'Brahmin' },
  { index: 3, name: 'Rohini', ruler: 'Moon', gana: 'Manushya', yoni: 'Serpent', nadi: 'Antya', varna: 'Shudra' },
  { index: 4, name: 'Mrigashira', ruler: 'Mars', gana: 'Deva', yoni: 'Serpent', nadi: 'Madhya', varna: 'Kshatriya' },
  { index: 5, name: 'Ardra', ruler: 'Rahu', gana: 'Manushya', yoni: 'Dog', nadi: 'Aadi', varna: 'Shudra' },
  { index: 6, name: 'Punarvasu', ruler: 'Jupiter', gana: 'Deva', yoni: 'Cat', nadi: 'Aadi', varna: 'Brahmin' },
  { index: 7, name: 'Pushya', ruler: 'Saturn', gana: 'Deva', yoni: 'Sheep', nadi: 'Madhya', varna: 'Kshatriya' },
  { index: 8, name: 'Ashlesha', ruler: 'Mercury', gana: 'Rakshasa', yoni: 'Cat', nadi: 'Antya', varna: 'Shudra' },
  { index: 9, name: 'Magha', ruler: 'Ketu', gana: 'Rakshasa', yoni: 'Rat', nadi: 'Antya', varna: 'Kshatriya' },
  { index: 10, name: 'Purva Phalguni', ruler: 'Venus', gana: 'Manushya', yoni: 'Rat', nadi: 'Madhya', varna: 'Brahmin' },
  { index: 11, name: 'Uttara Phalguni', ruler: 'Sun', gana: 'Manushya', yoni: 'Cow', nadi: 'Aadi', varna: 'Kshatriya' },
  { index: 12, name: 'Hasta', ruler: 'Moon', gana: 'Deva', yoni: 'Buffalo', nadi: 'Aadi', varna: 'Vaishya' },
  { index: 13, name: 'Chitra', ruler: 'Mars', gana: 'Rakshasa', yoni: 'Tiger', nadi: 'Madhya', varna: 'Kshatriya' },
  { index: 14, name: 'Swati', ruler: 'Rahu', gana: 'Deva', yoni: 'Buffalo', nadi: 'Antya', varna: 'Shudra' },
  { index: 15, name: 'Vishakha', ruler: 'Jupiter', gana: 'Rakshasa', yoni: 'Tiger', nadi: 'Antya', varna: 'Brahmin' },
  { index: 16, name: 'Anuradha', ruler: 'Saturn', gana: 'Deva', yoni: 'Deer', nadi: 'Madhya', varna: 'Shudra' },
  { index: 17, name: 'Jyeshtha', ruler: 'Mercury', gana: 'Rakshasa', yoni: 'Deer', nadi: 'Aadi', varna: 'Kshatriya' },
  { index: 18, name: 'Mula', ruler: 'Ketu', gana: 'Rakshasa', yoni: 'Dog', nadi: 'Aadi', varna: 'Shudra' },
  { index: 19, name: 'Purva Ashadha', ruler: 'Venus', gana: 'Manushya', yoni: 'Monkey', nadi: 'Madhya', varna: 'Brahmin' },
  { index: 20, name: 'Uttara Ashadha', ruler: 'Sun', gana: 'Manushya', yoni: 'Mongoose', nadi: 'Antya', varna: 'Kshatriya' },
  { index: 21, name: 'Shravana', ruler: 'Moon', gana: 'Deva', yoni: 'Monkey', nadi: 'Antya', varna: 'Vaishya' },
  { index: 22, name: 'Dhanishta', ruler: 'Mars', gana: 'Rakshasa', yoni: 'Lion', nadi: 'Madhya', varna: 'Kshatriya' },
  { index: 23, name: 'Shatabhisha', ruler: 'Rahu', gana: 'Rakshasa', yoni: 'Horse', nadi: 'Aadi', varna: 'Shudra' },
  { index: 24, name: 'Purva Bhadrapada', ruler: 'Jupiter', gana: 'Manushya', yoni: 'Lion', nadi: 'Aadi', varna: 'Brahmin' },
  { index: 25, name: 'Uttara Bhadrapada', ruler: 'Saturn', gana: 'Manushya', yoni: 'Cow', nadi: 'Madhya', varna: 'Kshatriya' },
  { index: 26, name: 'Revati', ruler: 'Mercury', gana: 'Deva', yoni: 'Elephant', nadi: 'Antya', varna: 'Shudra' },
];

// ─── ASTRONOMICAL EPHEMERIS CALCULATIONS ───

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

function normalizeDeg(deg: number): number {
  let d = deg % 360;
  if (d < 0) d += 360;
  return d;
}

/**
 * Calculates Julian Day Number from UTC date and time
 */
export function calculateJulianDay(year: number, month: number, day: number, hour: number = 12, minute: number = 0): number {
  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  const dayFraction = day + (hour + minute / 60) / 24;
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + dayFraction + B - 1524.5;
}

/**
 * Chitra Paksha (Lahiri) Ayanamsha
 * Returns degrees to subtract from tropical/Sayana longitude to get Nirayana longitude
 */
export function calculateLahiriAyanamsha(jd: number): number {
  const T = (jd - 2451545.0) / 36525.0; // Julian centuries from J2000.0
  // Standard IAU/Indian Astronomical Ephemeris formula for Lahiri Ayanamsha
  const ayanamsha = 23.858072 + 1.396042 * T + 0.000308 * T * T;
  return ayanamsha;
}

/**
 * Calculates accurate geocentric Moon longitude using Jean Meeus / Brown Lunar Theory terms
 */
export function calculateMoonLongitude(jd: number): number {
  const T = (jd - 2451545.0) / 36525.0;

  // Moon's mean orbital parameters (degrees)
  const L_prime = normalizeDeg(218.3164477 + 481267.88123421 * T - 0.0015786 * T * T); // Mean longitude
  const D = normalizeDeg(297.8501921 + 445267.1114034 * T - 0.0018819 * T * T); // Mean elongation
  const M = normalizeDeg(357.5291092 + 35999.0502909 * T - 0.0001536 * T * T); // Sun's mean anomaly
  const M_prime = normalizeDeg(134.9633964 + 477198.8675055 * T + 0.0087414 * T * T); // Moon's mean anomaly
  const F = normalizeDeg(93.272095 + 483202.0175233 * T - 0.0036539 * T * T); // Moon's argument of latitude

  // Periodic perturbation terms for Moon's longitude (degrees)
  const l_rad = degToRad(L_prime);
  const d_rad = degToRad(D);
  const m_rad = degToRad(M);
  const mp_rad = degToRad(M_prime);
  const f_rad = degToRad(F);

  let deltaL =
    6.288774 * Math.sin(mp_rad) +
    1.274027 * Math.sin(2 * d_rad - mp_rad) +
    0.658314 * Math.sin(2 * d_rad) +
    0.213618 * Math.sin(2 * mp_rad) -
    0.185116 * Math.sin(m_rad) -
    0.114332 * Math.sin(2 * f_rad) +
    0.058793 * Math.sin(2 * d_rad - 2 * mp_rad) +
    0.057066 * Math.sin(2 * d_rad - m_rad - mp_rad) +
    0.05332 * Math.sin(2 * d_rad + mp_rad) +
    0.046058 * Math.sin(2 * d_rad - m_rad);

  return normalizeDeg(L_prime + deltaL);
}

/**
 * Calculates Ascendant (Lagna) in degrees given Julian Day, Latitude, Longitude
 */
export function calculateAscendant(jd: number, lat: number, lng: number): number {
  const T = (jd - 2451545.0) / 36525.0;

  // Greenwich Mean Sidereal Time (GMST) in degrees
  let gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T - (T * T * T) / 38710000;
  gmst = normalizeDeg(gmst);

  // Local Sidereal Time (RAMC) in degrees
  const ramc = normalizeDeg(gmst + lng);
  const ramc_rad = degToRad(ramc);

  // True obliquity of the ecliptic
  const eps = 23.4392911 - 0.0130042 * T;
  const eps_rad = degToRad(eps);
  const phi_rad = degToRad(lat);

  // Ascendant formula
  const y = -Math.cos(ramc_rad);
  const x = Math.sin(ramc_rad) * Math.cos(eps_rad) + Math.tan(phi_rad) * Math.sin(eps_rad);
  let ascendant = radToDeg(Math.atan2(y, x));
  return normalizeDeg(ascendant);
}

/**
 * Calculates Mars heliocentric/geocentric longitude for Manglik analysis
 */
export function calculateMarsLongitude(jd: number): number {
  const T = (jd - 2451545.0) / 36525.0;
  // Mean longitude of Mars
  const L = normalizeDeg(355.433 + 19140.299 * T);
  // Mars mean anomaly
  const M = normalizeDeg(19.373 + 19139.858 * T);
  // Equation of the center
  const delta = 10.691 * Math.sin(degToRad(M)) + 0.623 * Math.sin(degToRad(2 * M));
  return normalizeDeg(L + delta);
}

export interface PlanetaryBirthDetails {
  nirayanaMoonLong: number;
  rashiIndex: number;
  rashiName: string;
  nakshatraIndex: number;
  nakshatraName: string;
  pada: number;
  lagnaRashiIndex?: number;
  lagnaName?: string;
  isBirthTimeProvided: boolean;
  manglikStatus: 'Manglik' | 'Non-Manglik' | 'Partial / Mild' | 'Unable to determine';
  manglikNote?: string;
}

/**
 * Parse time string (e.g. "04:25 AM" or "16:25") into hours and minutes
 */
export function parseTimeString(timeStr?: string): { hour: number; minute: number } | null {
  if (!timeStr || typeof timeStr !== 'string' || timeStr.trim().length === 0) return null;
  const t = timeStr.trim().toUpperCase();
  const match = t.match(/(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/);
  if (!match) return null;

  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const meridiem = match[3];

  if (meridiem === 'PM' && hour < 12) hour += 12;
  if (meridiem === 'AM' && hour === 12) hour = 0;

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

/**
 * Compute Planetary Birth Details from Date of Birth, Time of Birth, and Coordinates
 */
export function computePlanetaryBirthDetails(
  dob: Date | string,
  timeOfBirth?: string,
  latitude: number = 18.5204, // Default Pune
  longitude: number = 73.8567, // Default Pune
  timezoneOffsetHours: number = 5.5 // Default IST
): PlanetaryBirthDetails {
  const d = new Date(dob);
  if (isNaN(d.getTime())) {
    throw new Error('Invalid Date of Birth provided');
  }

  const parsedTime = parseTimeString(timeOfBirth);
  const isBirthTimeProvided = parsedTime !== null;
  const hour = parsedTime ? parsedTime.hour : 12;
  const minute = parsedTime ? parsedTime.minute : 0;

  // Convert local time to UTC
  const utcHour = hour - timezoneOffsetHours + minute / 60;
  const jd = calculateJulianDay(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), utcHour, 0);

  // Compute Ayanamsha and Nirayana Moon
  const ayanamsha = calculateLahiriAyanamsha(jd);
  const sayanaMoon = calculateMoonLongitude(jd);
  const nirayanaMoon = normalizeDeg(sayanaMoon - ayanamsha);

  // Rashi (each sign is 30 degrees)
  const rashiIndex = Math.floor(nirayanaMoon / 30);
  const rashi = RASHIS[rashiIndex] || RASHIS[0];

  // Nakshatra (each nakshatra is 13°20' = 13.333333 degrees)
  const nakshatraDeg = 360 / 27; // 13.3333333
  const nakshatraIndex = Math.floor(nirayanaMoon / nakshatraDeg);
  const nakshatra = NAKSHATRAS[nakshatraIndex] || NAKSHATRAS[0];

  // Pada (each nakshatra has 4 padas of 3°20' = 3.333333 degrees)
  const padaDeg = nakshatraDeg / 4; // 3.3333333
  const nakshatraOffset = nirayanaMoon - nakshatraIndex * nakshatraDeg;
  const pada = Math.min(4, Math.max(1, Math.floor(nakshatraOffset / padaDeg) + 1));

  // Compute Lagna and Manglik if birth time is provided
  let lagnaRashiIndex: number | undefined;
  let lagnaName: string | undefined;
  let manglikStatus: 'Manglik' | 'Non-Manglik' | 'Partial / Mild' | 'Unable to determine' = 'Unable to determine';
  let manglikNote = 'Accurate Manglik analysis requires a reliable birth time.';

  if (isBirthTimeProvided) {
    const sayanaAsc = calculateAscendant(jd, latitude, longitude);
    const nirayanaAsc = normalizeDeg(sayanaAsc - ayanamsha);
    lagnaRashiIndex = Math.floor(nirayanaAsc / 30);
    lagnaName = RASHIS[lagnaRashiIndex]?.name || 'Unknown Lagna';

    // Calculate Mars position
    const sayanaMars = calculateMarsLongitude(jd);
    const nirayanaMars = normalizeDeg(sayanaMars - ayanamsha);
    const marsRashiIndex = Math.floor(nirayanaMars / 30);

    // Houses from Lagna and Moon (1-indexed: 1 to 12)
    const marsHouseFromLagna = ((marsRashiIndex - lagnaRashiIndex + 12) % 12) + 1;
    const marsHouseFromMoon = ((marsRashiIndex - rashiIndex + 12) % 12) + 1;

    // Traditional Manglik houses: 1, 2, 4, 7, 8, 12
    const manglikHouses = [1, 2, 4, 7, 8, 12];
    const isFromLagna = manglikHouses.includes(marsHouseFromLagna);
    const isFromMoon = manglikHouses.includes(marsHouseFromMoon);

    if (isFromLagna && isFromMoon) {
      manglikStatus = 'Manglik';
      manglikNote = `Mars is placed in house ${marsHouseFromLagna} from Lagna and house ${marsHouseFromMoon} from Moon sign.`;
    } else if (isFromLagna || isFromMoon) {
      manglikStatus = 'Partial / Mild';
      manglikNote = isFromLagna
        ? `Mild Manglik: Mars is placed in house ${marsHouseFromLagna} from Lagna.`
        : `Mild Manglik: Mars is placed in house ${marsHouseFromMoon} from Moon sign.`;
    } else {
      manglikStatus = 'Non-Manglik';
      manglikNote = `Mars is well-positioned in house ${marsHouseFromLagna} from Lagna (outside sensitive Manglik houses).`;
    }
  }

  return {
    nirayanaMoonLong: nirayanaMoon,
    rashiIndex,
    rashiName: rashi.name,
    nakshatraIndex,
    nakshatraName: nakshatra.name,
    pada,
    lagnaRashiIndex,
    lagnaName,
    isBirthTimeProvided,
    manglikStatus,
    manglikNote,
  };
}

// ─── 36 GUNA MILAN ─── delegated to gunaMilanService (single source of truth)

/** Re-export KootaResult under the legacy KootaScore name for backwards compatibility */
export type { KootaResult as KootaScore };

export interface AshtaKootaResult {
  varna: KootaResult;
  vashya: KootaResult;
  tara: KootaResult;
  yoni: KootaResult;
  grahaMaitri: KootaResult;
  gana: KootaResult;
  bhakoot: KootaResult;
  nadi: KootaResult;
  totalScore: number;
  maxScore: 36;
  compatibilityIndicator: string;
  summary: string;
  doshas: string[];
}

/**
 * Complete 36 Guna Milan Calculation
 *
 * Adapter: delegates to gunaMilanService (single source of truth) and maps
 * the result into the AshtaKootaResult shape expected by kundaliController.
 */
export function calculate36GunaMilan(
  groomRashiIndex: number,
  groomNakIndex: number,
  brideRashiIndex: number,
  brideNakIndex: number
): AshtaKootaResult {
  const shared: AshtakootaReport = _gm_calculate36GunaMilan(
    groomRashiIndex,
    groomNakIndex,
    brideRashiIndex,
    brideNakIndex
  );

  const totalScore = shared.totalObtained;

  // Derive compatibilityIndicator wording (mirrors original astrologyEngine thresholds)
  let compatibilityIndicator: string;
  if (totalScore >= 28) {
    compatibilityIndicator = 'Strong traditional compatibility indicator';
  } else if (totalScore >= 21) {
    compatibilityIndicator = 'Favorable traditional compatibility';
  } else if (totalScore >= 18) {
    compatibilityIndicator = 'Acceptable traditional compatibility';
  } else {
    compatibilityIndicator = 'Below average traditional compatibility';
  }

  // Derive doshas from the shared Koota scores
  const doshas: string[] = [];
  if (shared.bhakoot.obtained === 0) doshas.push('Bhakoot Dosha');
  if (shared.nadi.obtained === 0) doshas.push('Nadi Dosha');
  if (shared.gana.obtained === 0) doshas.push('Gana Dosha');

  return {
    varna: shared.varna,
    vashya: shared.vashya,
    tara: shared.tara,
    yoni: shared.yoni,
    grahaMaitri: shared.grahaMaitri,
    gana: shared.gana,
    bhakoot: shared.bhakoot,
    nadi: shared.nadi,
    totalScore,
    maxScore: 36,
    compatibilityIndicator,
    summary: shared.summary,
    doshas,
  };
}
