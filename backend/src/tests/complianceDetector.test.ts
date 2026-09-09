import { detectCompliance } from '../services/complianceDetector';

interface TestCase {
  input: string;
  expectedStatus: 'SAFE' | 'FLAGGED';
  expectedCategory?: string;
  description: string;
}

const testCases: TestCase[] = [
  // ─── SHOULD FLAG (PHONE NUMBERS) ───
  {
    input: 'Call me at 9876543210',
    expectedStatus: 'FLAGGED',
    expectedCategory: 'PHONE_NUMBER',
    description: 'Standard 10-digit Indian phone number without spaces',
  },
  {
    input: 'My number is 98765 43210',
    expectedStatus: 'FLAGGED',
    expectedCategory: 'PHONE_NUMBER',
    description: '10-digit Indian phone number with space separator (5-5)',
  },
  {
    input: 'WhatsApp me at +91 9876543210',
    expectedStatus: 'FLAGGED',
    expectedCategory: 'PHONE_NUMBER',
    description: '+91 prefix with 10 digits',
  },
  {
    input: 'Contact: 98765-43210',
    expectedStatus: 'FLAGGED',
    expectedCategory: 'PHONE_NUMBER',
    description: 'Hyphenated phone number',
  },
  {
    input: 'Please call +91-9876543210',
    expectedStatus: 'FLAGGED',
    expectedCategory: 'PHONE_NUMBER',
    description: '+91 hyphenated mobile number',
  },
  {
    input: 'nine eight seven six five four three two one zero',
    expectedStatus: 'FLAGGED',
    expectedCategory: 'PHONE_NUMBER',
    description: 'Fully spelled-out English word digits',
  },
  {
    input: '98765.43210',
    expectedStatus: 'FLAGGED',
    expectedCategory: 'PHONE_NUMBER',
    description: 'Dot separated phone number',
  },
  {
    input: '98765 dot 43210',
    expectedStatus: 'FLAGGED',
    expectedCategory: 'PHONE_NUMBER',
    description: 'Obfuscated with "dot" word',
  },
  {
    input: '98 765 43210',
    expectedStatus: 'FLAGGED',
    expectedCategory: 'PHONE_NUMBER',
    description: 'Arbitrarily spaced 2-3-5 segmentation',
  },
  {
    input: '987 six five 43210',
    expectedStatus: 'FLAGGED',
    expectedCategory: 'PHONE_NUMBER',
    description: 'Mixed digits and spelled-out words',
  },
  {
    input: 'Call me at +1 202 555 0147',
    expectedStatus: 'FLAGGED',
    expectedCategory: 'PHONE_NUMBER',
    description: 'International US phone number',
  },
  {
    input: 'WhatsApp +44 20 7946 0958',
    expectedStatus: 'FLAGGED',
    expectedCategory: 'PHONE_NUMBER',
    description: 'International UK phone number',
  },
  {
    input: 'Email me at contact.test@example.com for details',
    expectedStatus: 'FLAGGED',
    expectedCategory: 'EMAIL',
    description: 'Standard email address',
  },
  {
    input: 'Check my profile at instagram.com/wonderful_jodi_test',
    expectedStatus: 'FLAGGED',
    expectedCategory: 'SOCIAL_MEDIA',
    description: 'Instagram social link',
  },

  // ─── SHOULD NOT FLAG (SAFE CONVERSATION & FALSE POSITIVES) ───
  {
    input: 'Hello, how are you?',
    expectedStatus: 'SAFE',
    description: 'Standard polite greeting',
  },
  {
    input: 'I have 5 years of experience.',
    expectedStatus: 'SAFE',
    description: 'Experience count (single digit)',
  },
  {
    input: 'My salary is 50000.',
    expectedStatus: 'SAFE',
    description: 'Salary amount (5 digits)',
  },
  {
    input: 'I was born in 1998.',
    expectedStatus: 'SAFE',
    description: 'Birth year (4 digits)',
  },
  {
    input: 'There are 10 people.',
    expectedStatus: 'SAFE',
    description: 'Small count of people',
  },
  {
    input: 'My profile ID is 123456.',
    expectedStatus: 'SAFE',
    description: '6-digit profile ID',
  },
  {
    input: 'The meeting is at 10:30.',
    expectedStatus: 'SAFE',
    description: 'Clock time format',
  },
  {
    input: 'OTP: 123456.',
    expectedStatus: 'SAFE',
    description: '6-digit OTP verification code',
  },
  {
    input: 'I am staying in Room 302.',
    expectedStatus: 'SAFE',
    description: 'Room number (3 digits)',
  },
  {
    input: 'My office PIN code 411001 near FC Road.',
    expectedStatus: 'SAFE',
    description: 'Postal PIN code (6 digits)',
  },
];

export function runComplianceTests(): { total: number; passed: number; failed: number; results: any[] } {
  let passed = 0;
  let failed = 0;
  const results: any[] = [];

  console.log('\n======================================================');
  console.log(' RUNNING CHAT COMPLIANCE & PHONE DETECTION TEST SUITE');
  console.log('======================================================\n');

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    const res = detectCompliance(tc.input);

    const statusMatch = res.status === tc.expectedStatus;
    const categoryMatch = !tc.expectedCategory || res.category === tc.expectedCategory;
    const success = statusMatch && categoryMatch;

    if (success) {
      passed++;
      console.log(`[PASS] Test ${i + 1}: ${tc.description}`);
      console.log(`       Input: "${tc.input}"`);
      console.log(`       Result: status=${res.status}, category=${res.category}, confidence=${res.confidence}, score=${res.score}\n`);
    } else {
      failed++;
      console.error(`[FAIL] Test ${i + 1}: ${tc.description}`);
      console.error(`       Input: "${tc.input}"`);
      console.error(`       Expected: status=${tc.expectedStatus}${tc.expectedCategory ? `, category=${tc.expectedCategory}` : ''}`);
      console.error(`       Actual: status=${res.status}, category=${res.category}, reason=${res.reason}\n`);
    }

    results.push({
      testNumber: i + 1,
      description: tc.description,
      input: tc.input,
      expected: { status: tc.expectedStatus, category: tc.expectedCategory },
      actual: res,
      passed: success,
    });
  }

  console.log('------------------------------------------------------');
  console.log(`SUMMARY: Total: ${testCases.length} | Passed: ${passed} | Failed: ${failed}`);
  console.log('======================================================\n');

  return {
    total: testCases.length,
    passed,
    failed,
    results,
  };
}

runComplianceTests();

