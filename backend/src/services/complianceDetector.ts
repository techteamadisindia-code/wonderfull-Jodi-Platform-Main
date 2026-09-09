export type ModerationStatus = 'SAFE' | 'FLAGGED' | 'UNDER_REVIEW' | 'BLOCKED';
export type ModerationCategory = 'PHONE_NUMBER' | 'EMAIL' | 'SOCIAL_MEDIA' | 'OTHER_CONTACT' | 'NONE';
export type ModerationConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';

export interface DetectionResult {
  status: ModerationStatus;
  category: ModerationCategory;
  confidence: ModerationConfidence;
  score: number; // 0.0 to 1.0
  reason: string;
  matchedRule?: string;
  detectedSnippet?: string;
}

// Map English word digits to numbers
const WORD_DIGIT_MAP: Record<string, string> = {
  zero: '0',
  one: '1',
  two: '2',
  three: '3',
  four: '4',
  five: '5',
  six: '6',
  seven: '7',
  eight: '8',
  nine: '9',
  null: '0',
  nil: '0',
  o: '0',
  oh: '0',
};

// Word separators to replace with spaces
const SEPARATOR_WORDS: Record<string, string> = {
  dot: ' ',
  point: ' ',
  dash: ' ',
  hyphen: ' ',
  space: ' ',
  at: ' ',
  plus: '+',
};

/**
 * Normalizes input text by converting spelled-out numbers and separator words.
 */
export function normalizeTextForDetection(text: string): {
  normalized: string;
  digitized: string;
  compactDigits: string;
} {
  if (!text) {
    return { normalized: '', digitized: '', compactDigits: '' };
  }

  const rawLower = text.toLowerCase();

  // 1. Tokenize words / symbols
  const words = rawLower.split(/[\s\-_\/,\.]+/);
  const digitizedTokens: string[] = [];

  for (const w of words) {
    const cleanWord = w.trim();
    if (!cleanWord) continue;

    if (WORD_DIGIT_MAP[cleanWord] !== undefined) {
      digitizedTokens.push(WORD_DIGIT_MAP[cleanWord]);
    } else if (SEPARATOR_WORDS[cleanWord] !== undefined) {
      digitizedTokens.push(SEPARATOR_WORDS[cleanWord]);
    } else {
      digitizedTokens.push(cleanWord);
    }
  }

  const normalized = digitizedTokens.join(' ');
  
  // Digitized text where written numbers are replaced
  let digitized = rawLower;
  for (const [word, digit] of Object.entries(WORD_DIGIT_MAP)) {
    // Word boundary replace
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    digitized = digitized.replace(regex, digit);
  }
  for (const [sepWord, rep] of Object.entries(SEPARATOR_WORDS)) {
    const regex = new RegExp(`\\b${sepWord}\\b`, 'gi');
    digitized = digitized.replace(regex, rep);
  }

  // Extract all digit characters
  const compactDigits = digitized.replace(/\D/g, '');

  return {
    normalized,
    digitized,
    compactDigits,
  };
}

/**
 * Check if a 10-digit number sequence is a valid Indian mobile number.
 * Valid Indian mobile numbers start with 6, 7, 8, or 9.
 */
function isValidIndianMobile(digits: string): boolean {
  if (digits.length === 10) {
    return /^[6-9]\d{9}$/.test(digits);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return /^0[6-9]\d{9}$/.test(digits);
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return /^91[6-9]\d{9}$/.test(digits);
  }
  if (digits.length === 14 && digits.startsWith('0091')) {
    return /^0091[6-9]\d{9}$/.test(digits);
  }
  return false;
}

/**
 * Main Compliance & Contact Information Detector.
 * Deterministic and fast.
 */
export function detectCompliance(text: string): DetectionResult {
  if (!text || typeof text !== 'string' || !text.trim()) {
    return {
      status: 'SAFE',
      category: 'NONE',
      confidence: 'NONE',
      score: 0.0,
      reason: 'Message content is compliant and safe',
    };
  }

  const rawText = text.trim();
  const lowerText = rawText.toLowerCase();

  // Normalize text (handling spelled out digits and separator words)
  const { normalized, digitized } = normalizeTextForDetection(rawText);

  // ─── 1. PHONE NUMBER DETECTION ───

  // A. Contact intent keywords that boost confidence
  const contactKeywords = [
    'call me',
    'call on',
    'call at',
    'reach me',
    'whatsapp',
    'contact me',
    'contact:',
    'contact :',
    'my number',
    'phone',
    'mobile',
    'cell',
    'ping me at',
    'text me at',
    'dial',
    'watsapp',
    'whatsap',
  ];
  const hasContactIntent = contactKeywords.some((k) => lowerText.includes(k) || normalized.includes(k));

  // B. Match Indian Standard and Formatted Mobile Numbers in Raw Text
  // e.g.:
  // 9876543210
  // 98765 43210
  // 98765-43210
  // 98765.43210
  // +91 9876543210
  // +91-9876543210
  // +91 98765 43210
  // 91 9876543210
  // 0091 9876543210
  // (+)91 9876543210
  // (0) 9876543210
  // 09876543210
  const indianPhoneRegex = /(?:\+?\s*(?:\(?\+?\s*91\)?|0091|0)\s*[\-\.]?\s*)?([6-9]\d{4})[\s\-\.]*(\d{5})\b/g;
  
  let match;
  while ((match = indianPhoneRegex.exec(rawText)) !== null) {
    const fullMatch = match[0];
    const cleanDigits = fullMatch.replace(/\D/g, '');
    
    // Check if it's a valid 10-14 digit Indian sequence
    if (isValidIndianMobile(cleanDigits) || (cleanDigits.length === 10 && /^[6-9]/.test(cleanDigits))) {
      return {
        status: 'FLAGGED',
        category: 'PHONE_NUMBER',
        confidence: 'HIGH',
        score: hasContactIntent ? 0.99 : 0.96,
        reason: 'Phone number detected (Indian Mobile Format)',
        matchedRule: 'INDIAN_MOBILE_REGEX',
        detectedSnippet: fullMatch.slice(0, 3) + '***' + fullMatch.slice(-2),
      };
    }
  }

  // C. Match Standard 10-digit Indian Number with various arbitrary segmentations
  // e.g. "98 765 43210", "987 654 3210", "9876 543 210", "9876543210"
  const segmentedIndianRegex = /(?:\+?91[\s\-\.]?)?\b([6-9])([\s\-\.]*\d){9}\b/g;
  while ((match = segmentedIndianRegex.exec(rawText)) !== null) {
    const fullMatch = match[0];
    const cleanDigits = fullMatch.replace(/\D/g, '');
    const stripped = cleanDigits.startsWith('91') && cleanDigits.length === 12 ? cleanDigits.slice(2) : cleanDigits;

    if (stripped.length === 10 && /^[6-9]\d{9}$/.test(stripped)) {
      return {
        status: 'FLAGGED',
        category: 'PHONE_NUMBER',
        confidence: 'HIGH',
        score: hasContactIntent ? 0.98 : 0.94,
        reason: 'Phone number detected (Segmented Mobile Pattern)',
        matchedRule: 'SEGMENTED_INDIAN_MOBILE',
        detectedSnippet: fullMatch.slice(0, 3) + '***' + fullMatch.slice(-2),
      };
    }
  }

  // D. Match Normalized & Digitized Text (handles "nine eight seven six five four three two one zero", "98765 dot 43210", "987 six five 43210", "98 seven 654 3210")
  const digitizedMatch = /(?:\+?91[\s\-\.]?)?\b([6-9])([\s\-\.]*\d){9}\b/g.exec(digitized);
  if (digitizedMatch) {
    const fullMatch = digitizedMatch[0];
    const cleanDigits = fullMatch.replace(/\D/g, '');
    const stripped = cleanDigits.startsWith('91') && cleanDigits.length === 12 ? cleanDigits.slice(2) : cleanDigits;

    if (stripped.length === 10 && /^[6-9]\d{9}$/.test(stripped)) {
      return {
        status: 'FLAGGED',
        category: 'PHONE_NUMBER',
        confidence: 'HIGH',
        score: hasContactIntent ? 0.95 : 0.90,
        reason: 'Phone number detected (Obfuscated/Spelled-out digits)',
        matchedRule: 'OBFUSCATED_DIGIT_EXPANSION',
        detectedSnippet: '***-***-****',
      };
    }
  }

  // E. International Phone Number Detection
  // e.g. +1 202 555 0147, +44 20 7946 0958, +61 412 345 678, +1-800-555-0199
  const internationalRegex = /\+(?:1|44|61|971|65|60|81|49|33|39|86)[\s\-\.]?(?:\(?\d{1,4}\)?[\s\-\.]?)?\d{3,4}[\s\-\.]?\d{3,4}\b/g;
  while ((match = internationalRegex.exec(rawText)) !== null) {
    const fullMatch = match[0];
    const cleanDigits = fullMatch.replace(/\D/g, '');
    if (cleanDigits.length >= 10 && cleanDigits.length <= 15) {
      return {
        status: 'FLAGGED',
        category: 'PHONE_NUMBER',
        confidence: 'HIGH',
        score: 0.94,
        reason: 'Phone number detected (International Format)',
        matchedRule: 'INTERNATIONAL_PHONE_REGEX',
        detectedSnippet: fullMatch.slice(0, 3) + '***' + fullMatch.slice(-2),
      };
    }
  }

  // F. Word sequence matching for consecutive digit words (e.g. "nine eight seven six five four three two one zero")
  const digitWords = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  const tokens = lowerText.split(/[\s\-_,\.]+/).filter(Boolean);
  let consecutiveDigitCount = 0;
  let hasValidStartingDigitWord = false;

  for (const token of tokens) {
    if (digitWords.includes(token)) {
      if (consecutiveDigitCount === 0 && ['six', 'seven', 'eight', 'nine'].includes(token)) {
        hasValidStartingDigitWord = true;
      }
      consecutiveDigitCount++;
      if (consecutiveDigitCount >= 10 && hasValidStartingDigitWord) {
        return {
          status: 'FLAGGED',
          category: 'PHONE_NUMBER',
          confidence: 'HIGH',
          score: 0.92,
          reason: 'Phone number detected (Consecutive Spelled-out Words)',
          matchedRule: 'CONSECUTIVE_DIGIT_WORDS',
          detectedSnippet: 'Spelled-out 10-digit number',
        };
      }
    } else {
      consecutiveDigitCount = 0;
      hasValidStartingDigitWord = false;
    }
  }

  // ─── 2. EMAIL ADDRESS DETECTION ───
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  const emailMatch = emailRegex.exec(rawText);
  if (emailMatch) {
    return {
      status: 'FLAGGED',
      category: 'EMAIL',
      confidence: 'HIGH',
      score: 0.98,
      reason: 'Email address detected in message',
      matchedRule: 'STANDARD_EMAIL_REGEX',
      detectedSnippet: emailMatch[0].slice(0, 2) + '***@***.' + emailMatch[0].split('.').pop(),
    };
  }

  // Obfuscated email detection: "name at gmail dot com"
  const obfuscatedEmailRegex = /\b[A-Za-z0-9._%+-]+\s+(?:at|@)\s+[A-Za-z0-9.-]+\s+(?:dot|\.)\s+(?:com|in|org|net|co|io|edu)\b/i;
  const obfEmailMatch = obfuscatedEmailRegex.exec(rawText);
  if (obfEmailMatch) {
    return {
      status: 'FLAGGED',
      category: 'EMAIL',
      confidence: 'HIGH',
      score: 0.92,
      reason: 'Email address detected (Obfuscated email)',
      matchedRule: 'OBFUSCATED_EMAIL_REGEX',
      detectedSnippet: 'Obfuscated Email',
    };
  }

  // ─── 3. SOCIAL MEDIA & EXTERNAL CONTACT DETECTION ───
  const socialPatterns: Array<{ regex: RegExp; name: string }> = [
    { regex: /(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|instagr\.am)\/[a-zA-Z0-9_\.]{3,}/i, name: 'Instagram profile' },
    { regex: /(?:https?:\/\/)?(?:www\.)?(?:t\.me|telegram\.me)\/[a-zA-Z0-9_]{4,}/i, name: 'Telegram handle' },
    { regex: /(?:https?:\/\/)?(?:www\.)?(?:wa\.me|api\.whatsapp\.com\/send\?phone=)\d+/i, name: 'WhatsApp direct link' },
    { regex: /\b(?:insta|ig|snapchat|telegram|fb|facebook)\s*(?:id|handle|username)?\s*[:\-]?\s*@[a-zA-Z0-9_\.]{3,}\b/i, name: 'Social media handle' },
  ];

  for (const { regex, name } of socialPatterns) {
    if (regex.test(rawText)) {
      return {
        status: 'FLAGGED',
        category: 'SOCIAL_MEDIA',
        confidence: 'HIGH',
        score: 0.95,
        reason: `Direct contact sharing detected (${name})`,
        matchedRule: 'SOCIAL_MEDIA_REGEX',
        detectedSnippet: name,
      };
    }
  }

  // ─── 4. DEFAULT SAFE ───
  return {
    status: 'SAFE',
    category: 'NONE',
    confidence: 'NONE',
    score: 0.0,
    reason: 'Message content is compliant and safe',
  };
}
