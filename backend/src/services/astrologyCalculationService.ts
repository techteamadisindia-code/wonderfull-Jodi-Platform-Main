/**
 * Astronomical Ephemeris & Vedic Planetary Calculation Service
 *
 * Implements genuine Vedic calculations:
 * - Julian Day & Century from Gregorian date & UTC time
 * - Chitra Paksha (Lahiri) Ayanamsha
 * - Nirayana Moon Longitude, Moon Rashi, Nakshatra, Pada
 * - Ascendant (Lagna) from Local Sidereal Time and Geographic Latitude
 * - Mars Longitude and House Positions from Lagna and Moon for Manglik Analysis
 */

export interface PlanetaryBirthDetails {
  nirayanaMoonLong: number;
  rashiIndex: number;
  rashiName: string;
  sanskritRashiName: string;
  englishRashiName: string;
  nakshatraIndex: number;
  nakshatraName: string;
  nakshatraRuler: string;
  nakshatraGana: 'Deva' | 'Manushya' | 'Rakshasa';
  nakshatraNadi: 'Aadi' | 'Madhya' | 'Antya';
  nakshatraYoni: string;
  pada: number;
  lagnaRashiIndex?: number;
  lagnaName?: string;
  marsRashiIndex?: number;
  marsHouseFromLagna?: number;
  marsHouseFromMoon?: number;
  isBirthTimeProvided: boolean;
}

export interface RashiDefinition {
  index: number;
  name: string;
  sanskritName: string;
  englishName: string;
  lord: string;
  element: 'Fire' | 'Earth' | 'Air' | 'Water';
  varna: 'Brahmin' | 'Kshatriya' | 'Vaishya' | 'Shudra';
  varnaRank: number; // Brahmin=4, Kshatriya=3, Vaishya=2, Shudra=1
  vashyaType: 'Chatushpada' | 'Manava' | 'Jalachara' | 'Vanachara' | 'Keeta';
}

export const RASHIS: RashiDefinition[] = [
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

export interface NakshatraDefinition {
  index: number;
  name: string;
  ruler: string;
  gana: 'Deva' | 'Manushya' | 'Rakshasa';
  yoni: string;
  nadi: 'Aadi' | 'Madhya' | 'Antya';
  varna: 'Brahmin' | 'Kshatriya' | 'Vaishya' | 'Shudra';
}

export const NAKSHATRAS: NakshatraDefinition[] = [
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

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

export function normalizeDeg(deg: number): number {
  let d = deg % 360;
  if (d < 0) d += 360;
  return d;
}

/**
 * Calculate Julian Day Number from year, month, day, and fractional UT hour
 */
export function getJulianDay(year: number, month: number, day: number, utHour: number): number {
  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return (
    Math.floor(365.25 * (y + 4716)) +
    Math.floor(30.6001 * (m + 1)) +
    day +
    utHour / 24.0 +
    B -
    1524.5
  );
}

/**
 * Lahiri (Chitra Paksha) Ayanamsha for epoch T
 */
export function getLahiriAyanamsha(T: number): number {
  return 23.858 + 1.396 * T;
}

/**
 * Calculate Sayana (Tropical) Moon Longitude using standard astronomical perturbation series
 */
export function calculateSayanaMoonLongitude(T: number): number {
  const L0 = normalizeDeg(218.3164477 + 481267.88123421 * T);
  const l = normalizeDeg(134.9633964 + 477198.8675055 * T); // Moon mean anomaly
  const lPrime = normalizeDeg(357.5291092 + 35999.0502909 * T); // Sun mean anomaly
  const F = normalizeDeg(93.272095 + 483202.0175233 * T); // Moon mean distance from node
  const D = normalizeDeg(297.8501921 + 445267.1114034 * T); // Mean elongation

  const rad = degToRad;
  const sin = Math.sin;

  let deltaLong =
    6.288774 * sin(rad(l)) +
    1.274027 * sin(rad(2 * D - l)) +
    0.658314 * sin(rad(2 * D)) +
    0.213618 * sin(rad(2 * l)) -
    0.185116 * sin(rad(lPrime)) -
    0.114332 * sin(rad(2 * F)) +
    0.058793 * sin(rad(2 * D - 2 * l)) +
    0.057066 * sin(rad(2 * D - l - lPrime)) +
    0.05332 * sin(rad(2 * D + l)) +
    0.046153 * sin(rad(2 * D - lPrime)) -
    0.034722 * sin(rad(D)) -
    0.030383 * sin(rad(l + lPrime));

  return normalizeDeg(L0 + deltaLong);
}

/**
 * Approximate Sayana Mars Longitude
 */
export function calculateSayanaMarsLongitude(T: number): number {
  const L = normalizeDeg(355.433 + 19140.299 * T);
  const M = normalizeDeg(19.373 + 19139.858 * T);
  const delta = 10.691 * Math.sin(degToRad(M)) + 0.623 * Math.sin(degToRad(2 * M));
  return normalizeDeg(L + delta);
}

/**
 * Calculate Ascendant (Lagna) Longitude from Greenwich Mean Sidereal Time (GMST) and Latitude
 */
export function calculateLagnaLongitude(jd: number, T: number, utHour: number, lat: number, lon: number): number {
  const gmst0 = normalizeDeg(100.46061837 + 36000.770053608 * T + 0.000387933 * T * T);
  const gmst = normalizeDeg(gmst0 + utHour * 15.04107);
  const lmst = normalizeDeg(gmst + lon);

  const ramc = degToRad(lmst);
  const eps = degToRad(23.4392911 - 0.0130042 * T);
  const phi = degToRad(lat);

  const sinRAMC = Math.sin(ramc);
  const cosRAMC = Math.cos(ramc);
  const cosEps = Math.cos(eps);
  const sinEps = Math.sin(eps);
  const tanPhi = Math.tan(phi);

  const num = cosRAMC;
  const den = -(sinRAMC * cosEps + tanPhi * sinEps);

  let ascSayana = radToDeg(Math.atan2(num, den));
  return normalizeDeg(ascSayana);
}

/**
 * Parse standard human-readable time string (e.g. "06:30 AM", "18:45", "7:15 pm")
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
 * Compute Planetary Birth Details from Date, Time, and Geographic Coordinates
 */
export function computePlanetaryBirthDetails(
  dob: Date | string,
  timeOfBirth?: string,
  latitude: number = 18.5204, // Default Pune
  longitude: number = 73.8567,
  timezoneOffsetHours: number = 5.5 // Default IST
): PlanetaryBirthDetails {
  const d = new Date(dob);
  if (isNaN(d.getTime())) {
    throw new Error('Invalid Date of Birth provided');
  }

  const parsedTime = parseTimeString(timeOfBirth);
  const isBirthTimeProvided = parsedTime !== null;
  const localHour = parsedTime ? parsedTime.hour : 12;
  const localMinute = parsedTime ? parsedTime.minute : 0;

  // Convert to UT (Universal Time)
  const localFractionalHour = localHour + localMinute / 60.0;
  let utHour = localFractionalHour - timezoneOffsetHours;

  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();

  const jd = getJulianDay(year, month, day, utHour);
  const T = (jd - 2451545.0) / 36525.0;

  // 1. Lahiri Ayanamsha
  const ayanamsha = getLahiriAyanamsha(T);

  // 2. Nirayana Moon Longitude
  const sayanaMoon = calculateSayanaMoonLongitude(T);
  const nirayanaMoon = normalizeDeg(sayanaMoon - ayanamsha);

  // 3. Moon Rashi & Nakshatra
  const rashiIndex = Math.floor(nirayanaMoon / 30.0) % 12;
  const rashi = RASHIS[rashiIndex];

  const nakshatraSpan = 360.0 / 27.0; // 13.333 degrees
  const nakshatraIndex = Math.floor(nirayanaMoon / nakshatraSpan) % 27;
  const nakshatra = NAKSHATRAS[nakshatraIndex];

  const padaSpan = nakshatraSpan / 4.0; // 3.333 degrees
  const posInNakshatra = nirayanaMoon - nakshatraIndex * nakshatraSpan;
  const pada = Math.min(4, Math.floor(posInNakshatra / padaSpan) + 1);

  // 4. Lagna (Ascendant)
  let lagnaRashiIndex: number | undefined;
  let lagnaName: string | undefined;
  if (isBirthTimeProvided) {
    const sayanaLagna = calculateLagnaLongitude(jd, T, utHour, latitude, longitude);
    const nirayanaLagna = normalizeDeg(sayanaLagna - ayanamsha);
    lagnaRashiIndex = Math.floor(nirayanaLagna / 30.0) % 12;
    lagnaName = RASHIS[lagnaRashiIndex].name;
  }

  // 5. Mars Longitude
  const sayanaMars = calculateSayanaMarsLongitude(T);
  const nirayanaMars = normalizeDeg(sayanaMars - ayanamsha);
  const marsRashiIndex = Math.floor(nirayanaMars / 30.0) % 12;

  // Houses from Lagna and Moon
  const marsHouseFromMoon = ((marsRashiIndex - rashiIndex + 12) % 12) + 1;
  let marsHouseFromLagna: number | undefined;
  if (lagnaRashiIndex !== undefined) {
    marsHouseFromLagna = ((marsRashiIndex - lagnaRashiIndex + 12) % 12) + 1;
  }

  return {
    nirayanaMoonLong: nirayanaMoon,
    rashiIndex,
    rashiName: rashi.name,
    sanskritRashiName: rashi.sanskritName,
    englishRashiName: rashi.englishName,
    nakshatraIndex,
    nakshatraName: nakshatra.name,
    nakshatraRuler: nakshatra.ruler,
    nakshatraGana: nakshatra.gana,
    nakshatraNadi: nakshatra.nadi,
    nakshatraYoni: nakshatra.yoni,
    pada,
    lagnaRashiIndex,
    lagnaName,
    marsRashiIndex,
    marsHouseFromLagna,
    marsHouseFromMoon,
    isBirthTimeProvided,
  };
}
