/**
 * Isolated Regression Test Suite: Registration 401 & Resume Token Verification
 *
 * SAFETY GUARANTEE:
 * This test suite uses 100% in-memory mocked models and fixtures.
 * It NEVER connects to or executes any SQL/write queries against MariaDB or production.
 */

const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const backendDist = path.resolve(__dirname, 'dist');
const registrationController = require(path.join(backendDist, 'controllers/registrationController.js'));

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

async function test(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${err.message}`);
    failedTests++;
  }
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
      }
    },
    toEqual(expected) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
      }
    },
    toBeDefined() {
      if (actual === undefined) throw new Error('Expected defined value but got undefined');
    },
    toBeUndefined() {
      if (actual !== undefined) throw new Error(`Expected undefined but got ${JSON.stringify(actual)}`);
    },
    toBeNull() {
      if (actual !== null) throw new Error(`Expected null but got ${JSON.stringify(actual)}`);
    },
    toBeTruthy() {
      if (!actual) throw new Error(`Expected truthy value but got ${JSON.stringify(actual)}`);
    },
    toBeFalsy() {
      if (actual) throw new Error(`Expected falsy value but got ${JSON.stringify(actual)}`);
    },
    toContain(item) {
      if (!actual || !actual.includes(item)) throw new Error(`Expected to contain ${JSON.stringify(item)}`);
    },
  };
}

function mockReqRes(options = {}) {
  let statusCode = 200;
  let jsonData = null;
  const req = {
    params: options.params || {},
    query: options.query || {},
    headers: options.headers || {},
    body: options.body || {},
    socket: {},
    cookies: options.cookies || {},
  };
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      jsonData = data;
      return this;
    },
  };
  return {
    req,
    res,
    getStatus: () => statusCode,
    getJson: () => jsonData,
  };
}

// In-Memory Registration Mock Store
const inMemoryStore = new Map();

function setupMockDatabase() {
  const { Registration } = require(path.join(backendDist, 'models/Registration.js'));

  // Save originals to restore if needed
  const origFindOne = Registration.findOne;
  const origCreate = Registration.create;

  Registration.findOne = async function (filter) {
    if (filter.registrationId) {
      const reg = inMemoryStore.get(filter.registrationId.toUpperCase());
      if (reg && !reg.isDeleted) {
        return {
          ...reg,
          save: async function () {
            inMemoryStore.set(reg.registrationId, this);
            return this;
          },
        };
      }
    }
    return null;
  };

  Registration.create = async function (data) {
    const reg = {
      ...data,
      isDeleted: false,
      save: async function () {
        inMemoryStore.set(this.registrationId, this);
        return this;
      },
    };
    inMemoryStore.set(data.registrationId, reg);
    return reg;
  };

  return () => {
    Registration.findOne = origFindOne;
    Registration.create = origCreate;
  };
}

async function runAll() {
  console.log('========================================================================');
  console.log('  WONDERFUL JODI - REGISTRATION 401 & RESUME TOKEN REGRESSION SUITE     ');
  console.log('  Mode: Isolated in-memory tests (Zero database writes / Zero network)  ');
  console.log('========================================================================\n');

  const restoreDb = setupMockDatabase();

  try {
    // ------------------------------------------------------------------------
    // Group 1: Token Extraction & Verification Rules
    // ------------------------------------------------------------------------
    console.log('Group 1: Token Extraction & Timing-Safe Verification:');

    await test('1.1 extractResumeToken extracts from x-resume-token header', () => {
      const req = { headers: { 'x-resume-token': 'token-alpha-123' }, body: {} };
      expect(registrationController.extractResumeToken(req)).toBe('token-alpha-123');
    });

    await test('1.2 extractResumeToken extracts from legacy resume-token header', () => {
      const req = { headers: { 'resume-token': 'token-beta-456' }, body: {} };
      expect(registrationController.extractResumeToken(req)).toBe('token-beta-456');
    });

    await test('1.3 extractResumeToken extracts from req.body.resumeToken', () => {
      const req = { headers: {}, body: { resumeToken: 'token-gamma-789' } };
      expect(registrationController.extractResumeToken(req)).toBe('token-gamma-789');
    });

    await test('1.4 extractResumeToken extracts from req.body.draftToken alias', () => {
      const req = { headers: {}, body: { draftToken: 'token-delta-012' } };
      expect(registrationController.extractResumeToken(req)).toBe('token-delta-012');
    });

    await test('1.5 extractResumeToken rejects tokens in URL query string (security hardening)', () => {
      const req = { headers: {}, query: { token: 'secret-token', resumeToken: 'secret-token' }, body: {} };
      expect(registrationController.extractResumeToken(req)).toBeNull();
    });

    await test('1.6 extractResumeToken returns null when token is missing', () => {
      const req = { headers: {}, query: {}, body: {} };
      expect(registrationController.extractResumeToken(req)).toBeNull();
    });

    await test('1.7 verifyResumeToken validates identical tokens and rejects mismatched or empty tokens', () => {
      const valid = 'a'.repeat(64);
      const wrong = 'b'.repeat(64);
      expect(registrationController.verifyResumeToken(valid, valid)).toBe(true);
      expect(registrationController.verifyResumeToken(valid, wrong)).toBe(false);
      expect(registrationController.verifyResumeToken(valid, null)).toBe(false);
      expect(registrationController.verifyResumeToken(valid, '')).toBe(false);
      expect(registrationController.verifyResumeToken(null, valid)).toBe(false);
      expect(registrationController.verifyResumeToken(undefined, undefined)).toBe(false);
    });

    // ------------------------------------------------------------------------
    // Group 2: End-to-End Draft Authorization via Controller
    // ------------------------------------------------------------------------
    console.log('\nGroup 2: Draft Controller Authorization & Status Codes:');

    const draftAId = 'WJ-2026-TEST-A';
    const draftAToken = crypto.randomBytes(32).toString('hex');

    const draftBId = 'WJ-2026-TEST-B';
    const draftBToken = crypto.randomBytes(32).toString('hex');

    inMemoryStore.set(draftAId, {
      registrationId: draftAId,
      resumeToken: draftAToken,
      candidateName: 'Dr. Test Alpha',
      email: 'alpha@test.local',
      mobile: '9800000001',
      gender: 'Male',
      status: 'IN_PROGRESS',
      currentStep: 2,
      totalSteps: 4,
      completionPercentage: 25,
      stepData: { basicInfo: { fullName: 'Dr. Test Alpha' } },
      isDeleted: false,
      startedAt: new Date(),
      lastActiveAt: new Date(),
    });

    inMemoryStore.set(draftBId, {
      registrationId: draftBId,
      resumeToken: draftBToken,
      candidateName: 'Dr. Test Beta',
      email: 'beta@test.local',
      mobile: '9800000002',
      gender: 'Female',
      status: 'IN_PROGRESS',
      currentStep: 3,
      totalSteps: 4,
      completionPercentage: 50,
      stepData: { basicInfo: { fullName: 'Dr. Test Beta' } },
      isDeleted: false,
      startedAt: new Date(),
      lastActiveAt: new Date(),
    });

    // 2.1 GET /api/registration/:registrationId (session restore)
    await test('2.1 getRegistrationById: Valid token returns draft without exposing resumeToken', async () => {
      const m = mockReqRes({
        params: { registrationId: draftAId },
        headers: { 'x-resume-token': draftAToken },
      });
      await registrationController.getRegistrationById(m.req, m.res, (e) => { if (e) throw e; });
      expect(m.getStatus()).toBe(200);
      expect(m.getJson().success).toBe(true);
      expect(m.getJson().data.registrationId).toBe(draftAId);
      expect(m.getJson().data.resumeToken).toBeUndefined();
    });

    await test('2.2 getRegistrationById: Missing token returns HTTP 401 RESUME_TOKEN_REQUIRED', async () => {
      const m = mockReqRes({ params: { registrationId: draftAId } });
      await registrationController.getRegistrationById(m.req, m.res, (e) => { if (e) throw e; });
      expect(m.getStatus()).toBe(401);
      expect(m.getJson().code).toBe('RESUME_TOKEN_REQUIRED');
    });

    await test('2.3 getRegistrationById: Invalid token returns HTTP 403 INVALID_RESUME_TOKEN', async () => {
      const m = mockReqRes({
        params: { registrationId: draftAId },
        headers: { 'x-resume-token': 'wrong-token-12345' },
      });
      await registrationController.getRegistrationById(m.req, m.res, (e) => { if (e) throw e; });
      expect(m.getStatus()).toBe(403);
      expect(m.getJson().code).toBe('INVALID_RESUME_TOKEN');
    });

    await test('2.4 getRegistrationById: Cross-tenant token (Draft B token on Draft A) is rejected with HTTP 403', async () => {
      const m = mockReqRes({
        params: { registrationId: draftAId },
        headers: { 'x-resume-token': draftBToken },
      });
      await registrationController.getRegistrationById(m.req, m.res, (e) => { if (e) throw e; });
      expect(m.getStatus()).toBe(403);
      expect(m.getJson().code).toBe('INVALID_RESUME_TOKEN');
    });

    // 2.5 POST /api/registration/auto-save
    await test('2.5 autoSave: Valid token succeeds with HTTP 200', async () => {
      const m = mockReqRes({
        headers: { 'x-resume-token': draftAToken },
        body: { registrationId: draftAId, section: 'personalInfo', data: { religion: 'Hindu' } },
      });
      await registrationController.autoSave(m.req, m.res, (e) => { if (e) throw e; });
      expect(m.getStatus()).toBe(200);
      expect(m.getJson().success).toBe(true);
    });

    await test('2.6 autoSave: Missing token returns HTTP 401 RESUME_TOKEN_REQUIRED', async () => {
      const m = mockReqRes({
        body: { registrationId: draftAId, section: 'personalInfo', data: { religion: 'Hindu' } },
      });
      await registrationController.autoSave(m.req, m.res, (e) => { if (e) throw e; });
      expect(m.getStatus()).toBe(401);
      expect(m.getJson().code).toBe('RESUME_TOKEN_REQUIRED');
    });

    await test('2.7 autoSave: Invalid token returns HTTP 403 INVALID_RESUME_TOKEN', async () => {
      const m = mockReqRes({
        headers: { 'x-resume-token': 'invalid-token' },
        body: { registrationId: draftAId, section: 'personalInfo', data: { religion: 'Hindu' } },
      });
      await registrationController.autoSave(m.req, m.res, (e) => { if (e) throw e; });
      expect(m.getStatus()).toBe(403);
      expect(m.getJson().code).toBe('INVALID_RESUME_TOKEN');
    });

    // 2.8 POST /api/registration/step
    await test('2.8 saveStep: Valid token updates progress with HTTP 200', async () => {
      const m = mockReqRes({
        headers: { 'x-resume-token': draftAToken },
        body: {
          registrationId: draftAId,
          stepNumber: 3,
          section: 'personalInfo',
          data: { maritalStatus: 'Never Married', religion: 'Hindu' },
        },
      });
      await registrationController.saveStep(m.req, m.res, (e) => { if (e) throw e; });
      expect(m.getStatus()).toBe(200);
      expect(m.getJson().success).toBe(true);
    });

    await test('2.9 saveStep: Missing token returns HTTP 401 RESUME_TOKEN_REQUIRED', async () => {
      const m = mockReqRes({
        body: {
          registrationId: draftAId,
          stepNumber: 3,
          section: 'personalInfo',
          data: { maritalStatus: 'Never Married' },
        },
      });
      await registrationController.saveStep(m.req, m.res, (e) => { if (e) throw e; });
      expect(m.getStatus()).toBe(401);
      expect(m.getJson().code).toBe('RESUME_TOKEN_REQUIRED');
    });

    await test('2.10 saveStep: Token belonging to another draft is rejected with HTTP 403', async () => {
      const m = mockReqRes({
        headers: { 'x-resume-token': draftBToken },
        body: {
          registrationId: draftAId,
          stepNumber: 3,
          section: 'personalInfo',
          data: { maritalStatus: 'Never Married' },
        },
      });
      await registrationController.saveStep(m.req, m.res, (e) => { if (e) throw e; });
      expect(m.getStatus()).toBe(403);
      expect(m.getJson().code).toBe('INVALID_RESUME_TOKEN');
    });

    // ------------------------------------------------------------------------
    // Group 3: Frontend Safety & Interceptor Source Verification
    // ------------------------------------------------------------------------
    console.log('\nGroup 3: Frontend Security & Interceptor Verification:');

    await test('3.1 api.ts exports and uses isSafeRegistrationEndpoint for interceptor', () => {
      const apiCode = fs.readFileSync(path.resolve(__dirname, '../frontend/services/api.ts'), 'utf8');
      expect(apiCode.includes('export function isSafeRegistrationEndpoint')).toBe(true);
      expect(apiCode.includes('isSafeRegistrationEndpoint(config.url')).toBe(true);
      expect(apiCode.includes('hasExplicitResumeToken')).toBe(true);
    });

    await test('3.2 api.ts forbids string prefix matching and uses strict URL origin comparison', () => {
      const apiCode = fs.readFileSync(path.resolve(__dirname, '../frontend/services/api.ts'), 'utf8');
      expect(apiCode.includes('parsedTarget.origin !== parsedBase.origin')).toBe(true);
      expect(apiCode.includes('.test(trimmedUrl)') || apiCode.includes("trimmedUrl.startsWith('//')")).toBe(true);
      expect(apiCode.includes('url.startsWith(getApiBaseUrl())')).toBe(false);
    });

    await test('3.3 clearAuthToken clears wj_resume_token on logout', () => {
      const libApiCode = fs.readFileSync(path.resolve(__dirname, '../frontend/lib/api.ts'), 'utf8');
      expect(libApiCode.includes("localStorage.removeItem('wj_resume_token')")).toBe(true);
    });

    await test('3.4 Registration page restores ID and token together, safely clearing orphaned drafts', () => {
      const pageCode = fs.readFileSync(path.resolve(__dirname, '../frontend/app/register/page.tsx'), 'utf8');
      expect(pageCode.includes('savedRegId && !savedToken')).toBe(true);
      expect(pageCode.includes('savedRegId && savedToken')).toBe(true);
      expect(pageCode.includes('handleStartFresh()')).toBe(true);
    });

    await test('3.5 handleStartFresh cancels pending autoSave timers to avoid draft overwrite', () => {
      const pageCode = fs.readFileSync(path.resolve(__dirname, '../frontend/app/register/page.tsx'), 'utf8');
      expect(pageCode.includes('clearTimeout(autoSaveTimerRef.current)')).toBe(true);
      expect(pageCode.includes('autoSaveTimerRef.current = null')).toBe(true);
    });

    await test('3.6 CORS allowedHeaders in backend/src/app.ts permits x-resume-token and resume-token', () => {
      const appCode = fs.readFileSync(path.resolve(__dirname, 'src/app.ts'), 'utf8');
      expect(appCode.includes("'x-resume-token'")).toBe(true);
      expect(appCode.includes("'resume-token'")).toBe(true);
    });

    await test('3.7 Compiled backend/dist/app.js reflects x-resume-token in CORS configuration', () => {
      const distAppCode = fs.readFileSync(path.resolve(__dirname, 'dist/app.js'), 'utf8');
      expect(distAppCode.includes("'x-resume-token'")).toBe(true);
      expect(distAppCode.includes("'resume-token'")).toBe(true);
    });

    // ------------------------------------------------------------------------
    // ------------------------------------------------------------------------
    // Group 4: Final Focused Review of isSafeRegistrationEndpoint & Interceptor
    // (Executed directly against the ACTUAL compiled frontend/services/api.ts)
    // ------------------------------------------------------------------------
    console.log('\nGroup 4: Final Focused Verification of ACTUAL isSafeRegistrationEndpoint & Interceptor:');

    // Helper: Dynamically transpile and load the ACTUAL frontend/services/api.ts module in a controlled VM context
    const ts = require('typescript');
    const vm = require('vm');
    const apiTsPath = path.resolve(__dirname, '../frontend/services/api.ts');
    const apiTsCode = fs.readFileSync(apiTsPath, 'utf8');
    const transpiledApi = ts.transpileModule(apiTsCode, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    });

    function createFrontendApiInstance(options = {}) {
      let registeredRequestInterceptor = null;
      let registeredResponseInterceptor = null;

      const mockAxiosInstance = {
        interceptors: {
          request: {
            use: (fn) => { registeredRequestInterceptor = fn; },
          },
          response: {
            use: (fn) => { registeredResponseInterceptor = fn; },
          },
        },
      };

      const mockAxios = {
        default: { create: () => mockAxiosInstance },
        create: () => mockAxiosInstance,
      };

      const mockStorage = options.localStorage || {};

      const moduleObj = { exports: {} };

      const sandbox = {
        require: (mod) => (mod === 'axios' ? mockAxios : require(mod)),
        module: moduleObj,
        exports: moduleObj.exports,
        process: {
          env: {
            NODE_ENV: options.nodeEnv || 'production',
            ...(options.env || {}),
          },
        },
        console,
        URL,
        URLSearchParams,
        localStorage: {
          getItem: (key) => (key in mockStorage ? mockStorage[key] : null),
          setItem: (key, val) => { mockStorage[key] = String(val); },
          removeItem: (key) => { delete mockStorage[key]; },
          clear: () => { Object.keys(mockStorage).forEach((k) => delete mockStorage[k]); },
        },
      };

      if (options.hasWindow !== false) {
        sandbox.window = {
          location: {
            origin: options.origin || 'https://wonderfuljodi.com',
            hostname: options.hostname || 'wonderfuljodi.com',
            protocol: options.protocol || 'https:',
            pathname: options.pathname || '/',
          },
        };
      }

      const context = vm.createContext(sandbox);
      vm.runInContext(transpiledApi.outputText, context);

      return {
        exports: moduleObj.exports,
        isSafeRegistrationEndpoint: moduleObj.exports.isSafeRegistrationEndpoint,
        requestInterceptor: registeredRequestInterceptor,
        mockStorage,
      };
    }

    // Default instance simulating production browser on https://wonderfuljodi.com
    const prodInstance = createFrontendApiInstance({ origin: 'https://wonderfuljodi.com' });
    const isSafeProd = prodInstance.isSafeRegistrationEndpoint;

    // SSR / Node instance where window is undefined
    const ssrInstance = createFrontendApiInstance({ hasWindow: false });
    const isSafeSSR = ssrInstance.isSafeRegistrationEndpoint;

    // Local dev instance
    const devInstance = createFrontendApiInstance({
      origin: 'http://localhost:3000',
      hostname: 'localhost',
      protocol: 'http:',
      nodeEnv: 'development',
    });
    const isSafeDev = devInstance.isSafeRegistrationEndpoint;

    // 4.1 Base URL /api with relative and prefixed request paths
    await test('4.1 Base URL /api allows /registration/step, registration/step, and /api/registration/step', () => {
      expect(isSafeProd('/registration/step', '/api')).toBe(true);
      expect(isSafeProd('registration/step', '/api')).toBe(true);
      expect(isSafeProd('/api/registration/step', '/api')).toBe(true);
      expect(isSafeProd('/registration/start', '/api')).toBe(true);
      expect(isSafeProd('/api/registration/auto-save', '/api')).toBe(true);
      expect(isSafeProd('/registration/WJ-2026-TEST', '/api')).toBe(true);
      expect(isSafeProd('/registration/check-availability?email=test%40wj.local', '/api')).toBe(true);
    });

    // 4.2 Base URL https://wonderfuljodi.com/api with relative and absolute registration paths
    await test('4.2 Base URL https://wonderfuljodi.com/api allows relative and absolute registration paths', () => {
      const prodBase = 'https://wonderfuljodi.com/api';
      // Relative paths
      expect(isSafeProd('/registration/step', prodBase)).toBe(true);
      expect(isSafeProd('registration/step', prodBase)).toBe(true);
      expect(isSafeProd('/api/registration/step', prodBase)).toBe(true);
      // Absolute paths on production origin
      expect(isSafeProd('https://wonderfuljodi.com/api/registration/step', prodBase)).toBe(true);
      expect(isSafeProd('https://wonderfuljodi.com/registration/step', prodBase)).toBe(true);
      expect(isSafeProd('https://wonderfuljodi.com/api/registration/auto-save', prodBase)).toBe(true);
      expect(isSafeProd('https://wonderfuljodi.com/api/registration/WJ-2026-TEST', prodBase)).toBe(true);
      expect(isSafeProd('https://wonderfuljodi.com/api/registration/WJ-2026-TEST/validate', prodBase)).toBe(true);
    });

    // 4.3 Base URL http://localhost:5000/api with local registration paths
    await test('4.3 Base URL http://localhost:5000/api allows local relative and absolute registration paths', () => {
      const devBase = 'http://localhost:5000/api';
      // Relative paths
      expect(isSafeDev('/registration/step', devBase)).toBe(true);
      expect(isSafeDev('registration/step', devBase)).toBe(true);
      expect(isSafeDev('/api/registration/step', devBase)).toBe(true);
      // Absolute paths on local port 5000
      expect(isSafeDev('http://localhost:5000/api/registration/step', devBase)).toBe(true);
      expect(isSafeDev('http://localhost:5000/registration/step', devBase)).toBe(true);
      expect(isSafeDev('http://localhost:5000/api/registration/auto-save', devBase)).toBe(true);
      expect(isSafeDev('http://localhost:5000/api/registration/start', devBase)).toBe(true);
    });

    // 4.4 Reject unrelated endpoints (/api/profiles, /api/messages, /api/auth/login)
    await test('4.4 Rejects unrelated endpoints (/api/profiles, /api/messages, /api/auth/login)', () => {
      const prodBase = 'https://wonderfuljodi.com/api';
      expect(isSafeProd('/api/profiles', prodBase)).toBe(false);
      expect(isSafeProd('/api/profiles/me', prodBase)).toBe(false);
      expect(isSafeProd('/api/messages', prodBase)).toBe(false);
      expect(isSafeProd('/api/messages/thread/123', prodBase)).toBe(false);
      expect(isSafeProd('/api/auth/login', prodBase)).toBe(false);
      expect(isSafeProd('/api/auth/register-user', prodBase)).toBe(false);
      expect(isSafeProd('/api/memberships', prodBase)).toBe(false);
      expect(isSafeProd('/api/admin/dashboard', prodBase)).toBe(false);
      expect(isSafeProd('/api/payments/order', prodBase)).toBe(false);
    });

    // 4.5 Reject external URLs
    await test('4.5 Rejects external URLs targeting other domains', () => {
      const prodBase = 'https://wonderfuljodi.com/api';
      expect(isSafeProd('https://attacker.com/api/registration/step', prodBase)).toBe(false);
      expect(isSafeProd('https://evil.org/registration/auto-save', prodBase)).toBe(false);
      expect(isSafeProd('http://malicious-site.net/registration/start', prodBase)).toBe(false);
      expect(isSafeProd('https://example.com/api/registration/step', prodBase)).toBe(false);
    });

    // 4.6 Reject misleading hostnames (subdomains, spoofing, @-syntax, port/protocol mismatch)
    await test('4.6 Rejects misleading hostnames, domain spoofing, @-syntax, and port/protocol mismatches', () => {
      const prodBase = 'https://wonderfuljodi.com/api';
      expect(isSafeProd('https://wonderfuljodi.com.attacker.com/api/registration/step', prodBase)).toBe(false);
      expect(isSafeProd('https://wonderfuljodi.com-fake.net/api/registration/step', prodBase)).toBe(false);
      expect(isSafeProd('https://notwonderfuljodi.com/api/registration/step', prodBase)).toBe(false);
      expect(isSafeProd('http://localhost:5000.attacker.com/api/registration/step', 'http://localhost:5000/api')).toBe(false);
      expect(isSafeProd('https://wonderfuljodi.com@attacker.com/api/registration/step', prodBase)).toBe(false);
      expect(isSafeProd('https://wonderfuljodi.com:8443/api/registration/step', prodBase)).toBe(false);
      expect(isSafeProd('http://wonderfuljodi.com/api/registration/step', prodBase)).toBe(false);
    });

    // 4.7 Reject protocol-relative and backslash-prefixed URLs
    await test('4.7 Rejects protocol-relative (//) and backslash (\\\\) URLs', () => {
      expect(isSafeProd('//attacker.com/api/registration/step', '/api')).toBe(false);
      expect(isSafeProd('//wonderfuljodi.com/api/registration/step', '/api')).toBe(false);
      expect(isSafeProd('//wonderfuljodi.com.attacker.com/api/registration', '/api')).toBe(false);
      expect(isSafeProd('\\\\attacker.com/api/registration/step', '/api')).toBe(false);
      expect(isSafeProd('\\/attacker.com/api/registration/step', '/api')).toBe(false);
      expect(isSafeProd('/\\attacker.com/api/registration/step', '/api')).toBe(false);
    });

    // 4.8 Reject paths that merely contain "registration" as a substring
    await test('4.8 Rejects paths that merely contain "registration" as a substring', () => {
      const prodBase = 'https://wonderfuljodi.com/api';
      expect(isSafeProd('/api/user-registration/step', prodBase)).toBe(false);
      expect(isSafeProd('/api/registration-status', prodBase)).toBe(false);
      expect(isSafeProd('/api/registration-verification', prodBase)).toBe(false);
      expect(isSafeProd('/api/pre-registration', prodBase)).toBe(false);
      expect(isSafeProd('/api/not-registration/step', prodBase)).toBe(false);
      expect(isSafeProd('/api/profiles/registration', prodBase)).toBe(false);
      expect(isSafeProd('/api/registration_fake', prodBase)).toBe(false);
      expect(isSafeProd('/api/registration.json', prodBase)).toBe(false);
      expect(isSafeProd('/registration-confirm', prodBase)).toBe(false);
      expect(isSafeProd('/api/registrations_all', prodBase)).toBe(false);
    });

    // 4.9 Reject literal dot segments and traversal that normalizes into a registration path
    await test('4.9 Rejects literal dot segments and traversal that normalizes into a registration path', () => {
      const prodBase = 'https://wonderfuljodi.com/api';
      // Traversal into registration MUST BE REJECTED before URL parsing
      expect(isSafeProd('/api/profiles/../registration/step', prodBase)).toBe(false);
      expect(isSafeProd('/api/registration/../registration/step', prodBase)).toBe(false);
      expect(isSafeProd('/registration/../registration/step', prodBase)).toBe(false);
      expect(isSafeProd('/api/registration/./step', prodBase)).toBe(false);
      expect(isSafeProd('/api/registration/.', prodBase)).toBe(false);
      expect(isSafeProd('/api/registration/..', prodBase)).toBe(false);
      expect(isSafeProd('../registration/step', prodBase)).toBe(false);
      expect(isSafeProd('./registration/step', prodBase)).toBe(false);
      // Traversal out of registration to profiles or login MUST be rejected
      expect(isSafeProd('/api/registration/../profiles', prodBase)).toBe(false);
      expect(isSafeProd('/api/registration/../../auth/login', prodBase)).toBe(false);
      expect(isSafeProd('/api/registration/step/../../admin', prodBase)).toBe(false);
      // Query parameters or hash containing registration MUST NOT trick validator into approving profiles
      expect(isSafeProd('/api/profiles?ref=/registration/step', prodBase)).toBe(false);
      expect(isSafeProd('/api/profiles#/registration', prodBase)).toBe(false);
      expect(isSafeProd('/api/messages?path=/registration', prodBase)).toBe(false);
    });

    // 4.10 Reject mixed-case and double-encoded traversal, slashes, and backslashes
    await test('4.10 Rejects mixed-case and double-encoded traversal, slashes, and backslashes', () => {
      const prodBase = 'https://wonderfuljodi.com/api';
      // Mixed-case percent-encoded dots
      expect(isSafeProd('/api/registration/%2e%2e/step', prodBase)).toBe(false);
      expect(isSafeProd('/api/registration/%2E%2E/step', prodBase)).toBe(false);
      expect(isSafeProd('/api/registration/%2e%2E/step', prodBase)).toBe(false);
      expect(isSafeProd('/api/profiles/%2E%2e/registration/step', prodBase)).toBe(false);
      // Encoded slashes and backslashes
      expect(isSafeProd('/api/registration/%2fstep', prodBase)).toBe(false);
      expect(isSafeProd('/api/registration/%2Fstep', prodBase)).toBe(false);
      expect(isSafeProd('/api/registration/%5cstep', prodBase)).toBe(false);
      expect(isSafeProd('/api/registration/%5Cstep', prodBase)).toBe(false);
      // Double-encoded dots, slashes, and backslashes
      expect(isSafeProd('/api/registration/%252e%252e/step', prodBase)).toBe(false);
      expect(isSafeProd('/api/registration/%252E%252E/step', prodBase)).toBe(false);
      expect(isSafeProd('/api/registration/%252fstep', prodBase)).toBe(false);
      expect(isSafeProd('/api/registration/%252Fstep', prodBase)).toBe(false);
      expect(isSafeProd('/api/registration/%255cstep', prodBase)).toBe(false);
      expect(isSafeProd('/api/registration/%255Cstep', prodBase)).toBe(false);
    });

    // 4.11 Reject malformed percent-encoding and backslash path manipulation
    await test('4.11 Rejects malformed percent-encoding and backslash path manipulation', () => {
      const prodBase = 'https://wonderfuljodi.com/api';
      // Malformed percent signs
      expect(isSafeProd('/api/registration/step%', prodBase)).toBe(false);
      expect(isSafeProd('/api/registration/step%2', prodBase)).toBe(false);
      expect(isSafeProd('/api/registration/step%G1', prodBase)).toBe(false);
      expect(isSafeProd('/api/registration/step%ZZ', prodBase)).toBe(false);
      // Backslash-based path manipulation
      expect(isSafeProd('/api/registration\\step', prodBase)).toBe(false);
      expect(isSafeProd('registration\\step', prodBase)).toBe(false);
      expect(isSafeProd('/api\\registration\\step', prodBase)).toBe(false);
    });

    // 4.12 Repeated slashes: allows internal consecutive slashes while rejecting leading protocol-relative slashes
    await test('4.12 Collapses internal repeated slashes while strictly rejecting leading protocol-relative slashes', () => {
      const prodBase = 'https://wonderfuljodi.com/api';
      // Internal repeated slashes within legitimate paths are collapsed
      expect(isSafeProd('/api//registration//step', prodBase)).toBe(true);
      expect(isSafeProd('/registration//step', prodBase)).toBe(true);
      expect(isSafeProd('/api///registration///step', prodBase)).toBe(true);
      // Leading repeated slashes (2 or more) are protocol-relative and MUST be rejected
      expect(isSafeProd('//attacker.com/api/registration', prodBase)).toBe(false);
      expect(isSafeProd('///registration///step', prodBase)).toBe(false);
      expect(isSafeProd('\\\\attacker.com/api/registration', prodBase)).toBe(false);
    });

    // 4.13 SSR / Node environment fallback
    await test('4.13 SSR / Node environment (window undefined) safely evaluates relative endpoints', () => {
      expect(isSafeSSR('/registration/step', '/api')).toBe(true);
      expect(isSafeSSR('registration/step', '/api')).toBe(true);
      expect(isSafeSSR('/api/registration/step', '/api')).toBe(true);
      expect(isSafeSSR('/api/profiles', '/api')).toBe(false);
      expect(isSafeSSR('https://attacker.com/api/registration/step', '/api')).toBe(false);
      expect(isSafeSSR('/api/profiles/../registration/step', '/api')).toBe(false);
    });

    // 4.14 Empty, null, and malformed inputs safely return false
    await test('4.14 Empty, null, undefined, and malformed inputs safely return false without throwing', () => {
      expect(isSafeProd('', '/api')).toBe(false);
      expect(isSafeProd('   ', '/api')).toBe(false);
      expect(isSafeProd(null, '/api')).toBe(false);
      expect(isSafeProd(undefined, '/api')).toBe(false);
      expect(isSafeProd('javascript:alert(1)', '/api')).toBe(false);
      expect(isSafeProd('data:text/html,<script>alert(1)</script>', '/api')).toBe(false);
      expect(isSafeProd('not a valid url ^%$#', '/api')).toBe(false);
    });

    // 4.15 Actual Axios Request Interceptor preserves explicit headers and blocks unsafe requests
    await test('4.15 ACTUAL Axios interceptor attaches token when safe, preserves explicit headers, and blocks unsafe', () => {
      const activeInstance = createFrontendApiInstance({
        origin: 'https://wonderfuljodi.com',
        localStorage: {
          'wj_resume_token': 'secret-resume-token-xyz-789',
        },
      });

      const interceptor = activeInstance.requestInterceptor;
      expect(typeof interceptor).toBe('function');

      // 1. Safe registration request without header -> attaches stored token
      const reqSafe = interceptor({ url: '/registration/step', headers: {} });
      expect(reqSafe.headers['x-resume-token']).toBe('secret-resume-token-xyz-789');

      // 2. Safe registration request with explicit x-resume-token -> PRESERVES explicit token
      const reqExplicitX = interceptor({
        url: '/registration/step',
        headers: { 'x-resume-token': 'caller-explicit-token-111' },
      });
      expect(reqExplicitX.headers['x-resume-token']).toBe('caller-explicit-token-111');

      // 3. Safe registration request with explicit legacy resume-token -> PRESERVES legacy token
      const reqExplicitLegacy = interceptor({
        url: '/registration/step',
        headers: { 'resume-token': 'caller-legacy-token-222' },
      });
      expect(reqExplicitLegacy.headers['resume-token']).toBe('caller-legacy-token-222');
      expect(reqExplicitLegacy.headers['x-resume-token']).toBeUndefined();

      // 4. Safe registration request with explicit uppercase X-Resume-Token -> PRESERVES uppercase token
      const reqExplicitUpper = interceptor({
        url: '/registration/step',
        headers: { 'X-Resume-Token': 'caller-upper-token-333' },
      });
      expect(reqExplicitUpper.headers['X-Resume-Token']).toBe('caller-upper-token-333');
      expect(reqExplicitUpper.headers['x-resume-token']).toBeUndefined();

      // 5. Unrelated endpoint (/api/profiles) -> DOES NOT attach token
      const reqProfiles = interceptor({ url: '/api/profiles/me', headers: {} });
      expect(reqProfiles.headers?.['x-resume-token']).toBeUndefined();

      // 6. External origin -> DOES NOT attach token
      const reqExternal = interceptor({ url: 'https://attacker.com/api/registration/step', headers: {} });
      expect(reqExternal.headers?.['x-resume-token']).toBeUndefined();

      // 7. Misleading hostname -> DOES NOT attach token
      const reqSpoofed = interceptor({
        url: 'https://wonderfuljodi.com.attacker.com/api/registration/step',
        baseURL: 'https://wonderfuljodi.com/api',
        headers: {},
      });
      expect(reqSpoofed.headers?.['x-resume-token']).toBeUndefined();

      // 8. Protocol-relative URL -> DOES NOT attach token
      const reqProtoRel = interceptor({ url: '//attacker.com/api/registration/step', headers: {} });
      expect(reqProtoRel.headers?.['x-resume-token']).toBeUndefined();

      // 9. Substring endpoint -> DOES NOT attach token
      const reqSubstring = interceptor({ url: '/api/registration-status', headers: {} });
      expect(reqSubstring.headers?.['x-resume-token']).toBeUndefined();

      // 10. Path traversal out of registration -> DOES NOT attach token
      const reqTraversal = interceptor({ url: '/api/registration/../profiles', headers: {} });
      expect(reqTraversal.headers?.['x-resume-token']).toBeUndefined();
    });
  } finally {
    restoreDb();
  }

  console.log('\n========================================================================');
  console.log(`Results: ${passedTests}/${totalTests} Passed | ${failedTests} Failed`);
  console.log('========================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAll().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
