/**
 * Manglik Dosha Analysis & Compatibility Service
 *
 * Implements Vedic Kuja / Mangal Dosha assessment:
 * - Mars in 1st, 2nd, 4th, 7th, 8th, or 12th houses from Ascendant (Lagna) or Moon
 * - Evaluation of cancellation conditions (e.g. Mars in Aries, Scorpio, Capricorn, etc.)
 * - Mutual compatibility determination between two individuals
 */

import { PlanetaryBirthDetails } from './astrologyCalculationService';

export type ManglikStatus = 'Manglik' | 'Non-Manglik' | 'Partial Manglik' | 'Unable to determine';

export interface ManglikEvaluation {
  status: ManglikStatus;
  isDoshaPresent: boolean;
  isPartial: boolean;
  marsHouseFromLagna?: number;
  marsHouseFromMoon?: number;
  analysisText: string;
}

export interface MutualManglikReport {
  person1Status: ManglikStatus;
  person2Status: ManglikStatus;
  isCompatible: boolean;
  compatibilityBadge: string;
  compatibilityNote: string;
  disclaimer: string;
}

const MANGLIK_HOUSES = [1, 2, 4, 7, 8, 12];

/**
 * Evaluate Manglik status for a single individual based on planetary positions
 */
export function evaluateIndividualManglik(planetary: PlanetaryBirthDetails): ManglikEvaluation {
  const moonHouse = planetary.marsHouseFromMoon ?? 1;

  if (!planetary.isBirthTimeProvided) {
    // Without birth time, Lagna cannot be precisely determined
    const isMoonManglik = MANGLIK_HOUSES.includes(moonHouse);
    if (isMoonManglik) {
      return {
        status: 'Partial Manglik',
        isDoshaPresent: true,
        isPartial: true,
        marsHouseFromMoon: moonHouse,
        analysisText: 'Lunar chart indicates mild Mangal influence (Chandra Manglik). Exact birth time will clarify Lagna impact.',
      };
    }
    return {
      status: 'Non-Manglik',
      isDoshaPresent: false,
      isPartial: false,
      marsHouseFromMoon: moonHouse,
      analysisText: 'Lunar chart indicates absence of primary Mangal Dosha.',
    };
  }

  const lagnaHouse = planetary.marsHouseFromLagna;
  const isLagnaManglik = lagnaHouse !== undefined && MANGLIK_HOUSES.includes(lagnaHouse);
  const isMoonManglik = MANGLIK_HOUSES.includes(moonHouse);

  // Check classical cancellation rules (e.g. Mars in own/exalted signs)
  const isMarsExaltedOrOwn =
    planetary.marsRashiIndex === 0 || // Aries (Mesh)
    planetary.marsRashiIndex === 7 || // Scorpio (Vrishchik)
    planetary.marsRashiIndex === 9; // Capricorn (Makar - Exaltation)

  if (isLagnaManglik && isMoonManglik) {
    if (isMarsExaltedOrOwn) {
      return {
        status: 'Partial Manglik',
        isDoshaPresent: true,
        isPartial: true,
        marsHouseFromLagna: lagnaHouse,
        marsHouseFromMoon: moonHouse,
        analysisText: 'Mangal placed in auspicious sign mitigates primary intensity into mild Anshik Manglik.',
      };
    }
    return {
      status: 'Manglik',
      isDoshaPresent: true,
      isPartial: false,
      marsHouseFromLagna: lagnaHouse,
      marsHouseFromMoon: moonHouse,
      analysisText: `Full Mangal Dosha observed with Mars positioned in House ${lagnaHouse} from Lagna and House ${moonHouse} from Moon.`,
    };
  } else if (isLagnaManglik || isMoonManglik) {
    return {
      status: 'Partial Manglik',
      isDoshaPresent: true,
      isPartial: true,
      marsHouseFromLagna: lagnaHouse,
      marsHouseFromMoon: moonHouse,
      analysisText: `Anshik (Mild) Mangal influence identified through ${isLagnaManglik ? 'Lagna' : 'Chandra'} placement.`,
    };
  }

  return {
    status: 'Non-Manglik',
    isDoshaPresent: false,
    isPartial: false,
    marsHouseFromLagna: lagnaHouse,
    marsHouseFromMoon: moonHouse,
    analysisText: 'No Mangal Dosha identified. Planetary placements are peaceful and well-aligned.',
  };
}

/**
 * Determine mutual Manglik compatibility between Person 1 and Person 2
 */
export function analyzeMutualManglik(
  p1: PlanetaryBirthDetails,
  p2: PlanetaryBirthDetails
): MutualManglikReport {
  const eval1 = evaluateIndividualManglik(p1);
  const eval2 = evaluateIndividualManglik(p2);

  const status1 = eval1.status;
  const status2 = eval2.status;

  let isCompatible = true;
  let compatibilityBadge = 'Harmonious Compatibility';
  let compatibilityNote = '';

  if (status1 === 'Non-Manglik' && status2 === 'Non-Manglik') {
    isCompatible = true;
    compatibilityBadge = 'Full Harmony (Non-Manglik)';
    compatibilityNote =
      'Both individuals are Non-Manglik. There is complete astrological harmony regarding Mars positions.';
  } else if (status1 === 'Manglik' && status2 === 'Manglik') {
    isCompatible = true;
    compatibilityBadge = 'Dosha Balanced & Cancelled';
    compatibilityNote =
      'Both partners are Manglik. In classical Vedic astrology, mutual Manglik status naturally cancels and balances the dosha.';
  } else if (
    (status1 === 'Partial Manglik' && status2 === 'Partial Manglik') ||
    (status1 === 'Partial Manglik' && status2 === 'Non-Manglik') ||
    (status1 === 'Non-Manglik' && status2 === 'Partial Manglik')
  ) {
    isCompatible = true;
    compatibilityBadge = 'Mild / Anshik Compatibility';
    compatibilityNote =
      'Mild or Anshik Manglik influence detected. Considered normal and easily managed in contemporary matrimony.';
  } else if (
    (status1 === 'Manglik' && status2 === 'Non-Manglik') ||
    (status1 === 'Non-Manglik' && status2 === 'Manglik')
  ) {
    isCompatible = false;
    compatibilityBadge = 'Remedial Guidance Suggested';
    compatibilityNote =
      'One individual has Mangal Dosha while the other is Non-Manglik. Traditional families may consult an experienced astrologer for simple standard Vedic remedies.';
  } else {
    isCompatible = true;
    compatibilityBadge = 'Compatible';
    compatibilityNote =
      'Manglik balance is generally favorable with no strong conflicting astrological afflictions.';
  }

  return {
    person1Status: status1,
    person2Status: status2,
    isCompatible,
    compatibilityBadge,
    compatibilityNote,
    disclaimer:
      'Astrological calculations and Manglik analyses are traditional cultural assessments intended for informational purposes and should not be considered an absolute obstacle to a happy marriage.',
  };
}
