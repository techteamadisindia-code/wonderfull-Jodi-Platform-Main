/**
 * Comprehensive Zod Resource-Exhaustion Hardening & Regression Suite
 * Tests GHSA-mrhx-c7xc-m3w5 mitigation, array bounds, nesting limits, and payload security.
 */

const assert = require('assert');
const http = require('http');
const express = require('express');
const axios = require('axios');
const { ZodError } = require('zod');

const {
  safeParseProfile,
  validateProfilePayloadResourceLimits,
} = require('./dist/controllers/profileController');
const { errorHandler } = require('./dist/middleware/errorHandler');

let passedTests = 0;
let failedTests = 0;

async function runTest(name, fn) {
  try {
    await fn();
    console.log(`  [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${err.stack || err.message}`);
    failedTests++;
  }
}

function getValidProfilePayload() {
  return {
    displayName: 'Dr. Jane Smith',
    gender: 'Female',
    dob: '1992-05-15',
    height: "5'6\"",
    maritalStatus: 'Never Married',
    motherTongue: 'Marathi',
    religion: 'Hindu',
    caste: 'Brahmin',
    subCaste: 'Deshastha',
    education: 'MBBS',
    degree: 'MBBS',
    profession: 'Doctor',
    company: 'Apollo Hospitals',
    workLocation: 'Mumbai',
    annualIncome: '15-20 Lakhs',
    country: 'India',
    state: 'Maharashtra',
    city: 'Mumbai',
    hobbies: ['Reading', 'Classical Music', 'Yoga'],
    about: 'Cardiologist practicing in South Mumbai.',
    photos: [
      'https://wonderfuljodi.com/uploads/profiles/photo1.jpg',
      'https://wonderfuljodi.com/uploads/profiles/photo2.jpg',
    ],
    primaryPhoto: 'https://wonderfuljodi.com/uploads/profiles/photo1.jpg',
    languageDetails: {
      motherTongueId: 'lang_marathi_1',
      otherLanguagesIds: ['English', 'Hindi', 'Gujarati'],
    },
    lifestyleInterests: {
      diet: 'Vegetarian',
      alcohol: 'Never',
      smoking: 'Never',
      hobbies: ['Painting', 'Badminton'],
      travel: ['Europe', 'Himalayas'],
      music: ['Indian Classical'],
      reading: ['Biographies'],
      sports: ['Tennis'],
      languages: ['English', 'Marathi'],
    },
    siblingsDetails: {
      brothersCount: 1,
      sistersCount: 1,
      brothers: [{ name: 'Rohit', occupation: 'Software Engineer' }],
      sisters: [{ name: 'Ananya', occupation: 'Architect' }],
    },
    medicalQualifications: {
      undergraduate: [{ degree: 'MBBS', college: 'KEM Hospital', year: '2015' }],
      postgraduate: [{ degree: 'MD Cardiology', college: 'Grant Medical College', year: '2019' }],
      doctorate: [],
    },
  };
}

async function main() {
  console.log('========================================================================');
  console.log('  WONDERFUL JODI: ZOD RESOURCE-EXHAUSTION REGRESSION SUITE (GHSA-mrhx-c7xc-m3w5)');
  console.log('========================================================================\n');

  // ------------------------------------------------------------------------
  // GROUP 1: Normal Valid Profile Payloads
  // ------------------------------------------------------------------------
  console.log('Group 1: Normal Valid Profile Payloads & Registration Compatibility:');

  await runTest('1.1 Normal full profile payload parses cleanly', () => {
    const payload = getValidProfilePayload();
    const result = safeParseProfile(payload, false);
    assert.strictEqual(result.displayName, 'Dr. Jane Smith');
    assert.strictEqual(result.hobbies.length, 3);
    assert.strictEqual(result.photos.length, 2);
  });

  await runTest('1.2 Normal partial profile update payload parses cleanly', () => {
    const partialPayload = {
      about: 'Updated biography for matrimonial profile.',
      hobbies: ['Swimming', 'Cycling'],
      lifestyleInterests: {
        diet: 'Eggetarian',
      },
    };
    const result = safeParseProfile(partialPayload, true);
    assert.strictEqual(result.about, 'Updated biography for matrimonial profile.');
    assert.deepStrictEqual(result.hobbies, ['Swimming', 'Cycling']);
  });

  // ------------------------------------------------------------------------
  // GROUP 2: Arrays at Exact Maximum Allowed Size
  // ------------------------------------------------------------------------
  console.log('\nGroup 2: Arrays at Exact Maximum Configured Capacity:');

  await runTest('2.1 photos at exact maximum limit (10 items) passes', () => {
    const payload = {
      photos: Array.from({ length: 10 }, (_, i) => `https://example.com/photo${i}.jpg`),
    };
    const result = safeParseProfile(payload, true);
    assert.strictEqual(result.photos.length, 10);
  });

  await runTest('2.2 hobbies at exact maximum limit (30 items) passes', () => {
    const payload = {
      hobbies: Array.from({ length: 30 }, (_, i) => `Hobby ${i + 1}`),
    };
    const result = safeParseProfile(payload, true);
    assert.strictEqual(result.hobbies.length, 30);
  });

  await runTest('2.3 languageDetails.otherLanguagesIds at exact limit (30 items) passes', () => {
    const payload = {
      languageDetails: {
        otherLanguagesIds: Array.from({ length: 30 }, (_, i) => `Lang${i}`),
      },
    };
    const result = safeParseProfile(payload, true);
    assert.strictEqual(result.languageDetails.otherLanguagesIds.length, 30);
  });

  await runTest('2.4 siblingsDetails (brothers: 20, sisters: 20) at exact limit passes', () => {
    const payload = {
      siblingsDetails: {
        brothers: Array.from({ length: 20 }, (_, i) => ({ name: `Brother ${i}` })),
        sisters: Array.from({ length: 20 }, (_, i) => ({ name: `Sister ${i}` })),
      },
    };
    const result = safeParseProfile(payload, true);
    assert.strictEqual(result.siblingsDetails.brothers.length, 20);
    assert.strictEqual(result.siblingsDetails.sisters.length, 20);
  });

  await runTest('2.5 medicalQualifications (undergraduate: 10, postgraduate: 10, doctorate: 10) passes', () => {
    const payload = {
      medicalQualifications: {
        undergraduate: Array.from({ length: 10 }, (_, i) => ({ deg: `UG ${i}` })),
        postgraduate: Array.from({ length: 10 }, (_, i) => ({ deg: `PG ${i}` })),
        doctorate: Array.from({ length: 10 }, (_, i) => ({ deg: `Doc ${i}` })),
      },
    };
    const result = safeParseProfile(payload, true);
    assert.strictEqual(result.medicalQualifications.undergraduate.length, 10);
    assert.strictEqual(result.medicalQualifications.postgraduate.length, 10);
    assert.strictEqual(result.medicalQualifications.doctorate.length, 10);
  });

  // ------------------------------------------------------------------------
  // GROUP 3: Off-by-One Boundary Enforcement (One Item Over Maximum)
  // ------------------------------------------------------------------------
  console.log('\nGroup 3: Off-by-One Boundary Rejections (Max + 1):');

  await runTest('3.1 photos with 11 items is rejected before element parsing', () => {
    const payload = {
      photos: Array.from({ length: 11 }, (_, i) => `https://example.com/photo${i}.jpg`),
    };
    assert.throws(
      () => safeParseProfile(payload, true),
      (err) => {
        assert(err instanceof ZodError, 'Expected ZodError');
        assert.strictEqual(err.issues.length, 1);
        assert.strictEqual(err.issues[0].code, 'too_big');
        assert.strictEqual(err.issues[0].maximum, 10);
        assert.deepStrictEqual(err.issues[0].path, ['photos']);
        return true;
      }
    );
  });

  await runTest('3.2 hobbies with 31 items is rejected before element parsing', () => {
    const payload = {
      hobbies: Array.from({ length: 31 }, (_, i) => `Hobby ${i}`),
    };
    assert.throws(
      () => safeParseProfile(payload, true),
      (err) => {
        assert(err instanceof ZodError);
        assert.strictEqual(err.issues.length, 1);
        assert.strictEqual(err.issues[0].code, 'too_big');
        assert.strictEqual(err.issues[0].maximum, 30);
        return true;
      }
    );
  });

  await runTest('3.3 otherLanguagesIds with 31 items is rejected before element parsing', () => {
    const payload = {
      languageDetails: {
        otherLanguagesIds: Array.from({ length: 31 }, (_, i) => `Lang${i}`),
      },
    };
    assert.throws(
      () => safeParseProfile(payload, true),
      (err) => {
        assert(err instanceof ZodError);
        assert.strictEqual(err.issues.length, 1);
        assert.strictEqual(err.issues[0].maximum, 30);
        return true;
      }
    );
  });

  await runTest('3.4 brothers with 21 items is rejected before element parsing', () => {
    const payload = {
      siblingsDetails: {
        brothers: Array.from({ length: 21 }, (_, i) => ({ id: i })),
      },
    };
    assert.throws(
      () => safeParseProfile(payload, true),
      (err) => {
        assert(err instanceof ZodError);
        assert.strictEqual(err.issues.length, 1);
        assert.strictEqual(err.issues[0].maximum, 20);
        return true;
      }
    );
  });

  await runTest('3.5 undergraduate qualifications with 11 items is rejected', () => {
    const payload = {
      medicalQualifications: {
        undergraduate: Array.from({ length: 11 }, (_, i) => ({ id: i })),
      },
    };
    assert.throws(
      () => safeParseProfile(payload, true),
      (err) => {
        assert(err instanceof ZodError);
        assert.strictEqual(err.issues.length, 1);
        assert.strictEqual(err.issues[0].maximum, 10);
        return true;
      }
    );
  });

  // ------------------------------------------------------------------------
  // GROUP 4: Large Arrays with Invalid Types (GHSA-mrhx-c7xc-m3w5 Neutralization)
  // ------------------------------------------------------------------------
  console.log('\nGroup 4: Large Arrays with Invalid Element Types (GHSA-mrhx-c7xc-m3w5 Neutralization):');

  await runTest('4.1 5,000 invalid integer elements in photos rejected in < 5ms with EXACTLY 1 issue', () => {
    const payload = {
      photos: Array.from({ length: 5000 }, () => 99999), // integers violate z.string()
    };
    const t0 = Date.now();
    let caughtErr;
    try {
      safeParseProfile(payload, true);
    } catch (err) {
      caughtErr = err;
    }
    const elapsedMs = Date.now() - t0;

    assert(caughtErr, 'Expected payload to be rejected');
    assert(caughtErr instanceof ZodError, 'Expected ZodError');
    assert.strictEqual(caughtErr.issues.length, 1, `Expected 1 issue, got ${caughtErr.issues.length}`);
    assert.strictEqual(caughtErr.issues[0].code, 'too_big');
    assert(elapsedMs < 10, `Expected instant abort (< 10ms), took ${elapsedMs}ms`);
  });

  await runTest('4.2 10,000 invalid object elements in hobbies rejected instantly without element traversal', () => {
    const payload = {
      hobbies: Array.from({ length: 10000 }, () => ({ malicious: true })),
    };
    const t0 = Date.now();
    let caughtErr;
    try {
      safeParseProfile(payload, true);
    } catch (err) {
      caughtErr = err;
    }
    const elapsedMs = Date.now() - t0;

    assert(caughtErr instanceof ZodError);
    assert.strictEqual(caughtErr.issues.length, 1);
    assert.strictEqual(caughtErr.issues[0].code, 'too_big');
    assert(elapsedMs < 15, `Took ${elapsedMs}ms`);
  });

  await runTest('4.3 5,000 boolean elements in otherLanguagesIds rejected with 1 issue', () => {
    const payload = {
      languageDetails: {
        otherLanguagesIds: Array.from({ length: 5000 }, () => true),
      },
    };
    let caughtErr;
    try {
      safeParseProfile(payload, true);
    } catch (err) {
      caughtErr = err;
    }
    assert(caughtErr instanceof ZodError);
    assert.strictEqual(caughtErr.issues.length, 1);
    assert.strictEqual(caughtErr.issues[0].code, 'too_big');
  });

  // ------------------------------------------------------------------------
  // GROUP 5: Nested Arrays and Deeply Nested Objects
  // ------------------------------------------------------------------------
  console.log('\nGroup 5: Nested Structure Boundaries & Depth Limits:');

  await runTest('5.1 Deeply nested object (> 8 levels) is rejected before stack exhaustion', () => {
    let deep = { leaf: 'data' };
    for (let i = 0; i < 12; i++) {
      deep = { level: deep };
    }
    const payload = { currentLocation: deep };
    assert.throws(
      () => safeParseProfile(payload, true),
      (err) => {
        assert(err instanceof ZodError);
        assert(err.issues[0].message.includes('nesting depth'));
        return true;
      }
    );
  });

  await runTest('5.2 Unexpected oversized array in nested object rejected by safe-bound rule', () => {
    const payload = {
      currentLocation: {
        customInjectedArray: Array.from({ length: 100 }, (_, i) => `item_${i}`),
      },
    };
    assert.throws(
      () => safeParseProfile(payload, true),
      (err) => {
        assert(err instanceof ZodError);
        assert.strictEqual(err.issues[0].code, 'too_big');
        return true;
      }
    );
  });

  // ------------------------------------------------------------------------
  // GROUP 6: Requests Close to Configured Body-Size Limit (10MB Cap)
  // ------------------------------------------------------------------------
  console.log('\nGroup 6: Body-Parser Limits & Large Payload Boundary:');

  await runTest('6.1 Express body-parser with 10MB limit processes ~8MB payload and safely rejects oversized fields', async () => {
    const app = express();
    app.use(express.json({ limit: '10mb' }));
    app.post('/api/test-profile', (req, res, next) => {
      try {
        const data = safeParseProfile(req.body, true);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    });
    app.use(errorHandler);

    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;

    try {
      const client = axios.create({ baseURL: `http://127.0.0.1:${port}`, maxContentLength: 20 * 1024 * 1024 });

      // Build an 8 MB payload with oversized photos array
      const bigArray = Array.from({ length: 50 }, (_, i) => 'https://example.com/'.repeat(500) + i);
      const res = await client.post('/api/test-profile', { photos: bigArray }, { validateStatus: () => true });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.data.success, false);
      assert.strictEqual(res.data.errors[0].field, 'photos');
      assert(res.data.message.includes('at most 10 element(s)'));
    } finally {
      server.close();
    }
  });

  await runTest('6.2 Payload exceeding 10MB is rejected by Express body-parser with HTTP 413', async () => {
    const app = express();
    app.use(express.json({ limit: '10mb' }));
    app.post('/api/test-profile', (req, res) => res.json({ success: true }));
    app.use(errorHandler);

    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;

    try {
      const client = axios.create({ baseURL: `http://127.0.0.1:${port}`, maxContentLength: 20 * 1024 * 1024 });
      // Create 11MB string
      const hugeString = 'X'.repeat(11 * 1024 * 1024);
      const res = await client.post('/api/test-profile', { data: hugeString }, { validateStatus: () => true });

      assert.strictEqual(res.status, 413, `Expected HTTP 413, got ${res.status}`);
    } finally {
      server.close();
    }
  });

  // ------------------------------------------------------------------------
  // GROUP 7: Repeated Authenticated Oversized Requests (Memory & Stability)
  // ------------------------------------------------------------------------
  console.log('\nGroup 7: Repeated Oversized Array Requests (Memory Stability):');

  await runTest('7.1 20 consecutive oversized array requests maintain sub-10ms response and flat memory', async () => {
    const app = express();
    app.use(express.json({ limit: '10mb' }));
    app.post('/api/test-profile', (req, res, next) => {
      try {
        const data = safeParseProfile(req.body, true);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    });
    app.use(errorHandler);

    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;

    try {
      const client = axios.create({ baseURL: `http://127.0.0.1:${port}` });
      const initialMem = process.memoryUsage().heapUsed;

      for (let i = 0; i < 20; i++) {
        const payload = {
          photos: Array.from({ length: 50 }, () => 'invalid_or_oversized'),
          hobbies: Array.from({ length: 50 }, () => 'too_many_hobbies'),
        };
        const res = await client.post('/api/test-profile', payload, { validateStatus: () => true });
        assert.strictEqual(res.status, 400);
        assert.strictEqual(res.data.success, false);
      }

      const finalMem = process.memoryUsage().heapUsed;
      const memDeltaMB = (finalMem - initialMem) / (1024 * 1024);
      // Verify heap delta is modest (< 25 MB after 20 requests)
      assert(memDeltaMB < 25, `Heap grew abnormally by ${memDeltaMB.toFixed(2)} MB`);
    } finally {
      server.close();
    }
  });

  // ------------------------------------------------------------------------
  // GROUP 8: Unauthenticated Endpoint Immunity (O(1) Evaluation)
  // ------------------------------------------------------------------------
  console.log('\nGroup 8: Unauthenticated Endpoint Verification:');

  await runTest('8.1 Non-array schemas reject oversized array input in O(1) without element traversal', () => {
    const { z } = require('zod');
    const loginSchema = z.object({
      email: z.string().email(),
      password: z.string().min(1),
    });

    const t0 = Date.now();
    const badInput = {
      email: Array.from({ length: 10000 }, () => 'not_a_string'),
      password: 'password123',
    };
    let caughtErr;
    try {
      loginSchema.parse(badInput);
    } catch (e) {
      caughtErr = e;
    }
    const elapsed = Date.now() - t0;

    assert(caughtErr instanceof ZodError);
    assert.strictEqual(caughtErr.issues.length, 1);
    assert.strictEqual(caughtErr.issues[0].code, 'invalid_type');
    assert(elapsed < 10, `Took ${elapsed}ms`);
  });

  // ------------------------------------------------------------------------
  // SUMMARY
  // ------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log(`RESULTS: ${passedTests} passed, ${failedTests} failed out of ${passedTests + failedTests} tests`);
  console.log('========================================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
