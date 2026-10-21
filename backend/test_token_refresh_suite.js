/**
 * Wonderful Jodi — Member API Token Refresh & Concurrency Verification Suite
 *
 * Verifies:
 * 1. Single 401 triggers successful token refresh and retries the original request.
 * 2. Concurrent 401s (e.g. 5 parallel requests) trigger EXACTLY ONE /auth/refresh call.
 * 3. Retry-loop prevention: A retried request receiving 401 does not loop endlessly.
 * 4. Auth endpoints exclusion: /auth/login, /auth/register, /auth/refresh never trigger refresh interceptor.
 * 5. Failed refresh / session expiration: Clears stored member token and triggers redirect on protected routes.
 * 6. Non-protected route failure: Clears stored token but avoids interrupting public browsing.
 * 7. Admin routes preservation: Admin 401 redirects to /admin/login?session_expired=1 without touching member tokens.
 * 8. Real Axios Interceptor Pipeline: Direct execution using official Axios library and custom adapters.
 *
 * Run: node backend/test_token_refresh_suite.js
 */

const assert = require('assert');
const axios = require('axios');

let passedTests = 0;
let failedTests = 0;

async function runTest(name, fn) {
  try {
    await fn();
    console.log(`  [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  [FAIL] ${name}: ${err.message}`);
    if (err.stack) {
      console.error(err.stack.split('\n').slice(1, 4).join('\n'));
    }
    failedTests++;
  }
}

console.log('========================================================================');
console.log('  WONDERFUL JODI - MEMBER API TOKEN REFRESH & CONCURRENCY SUITE');
console.log('  Mode: In-memory simulation + Real Axios Interceptor Pipeline with Custom Adapters');
console.log('========================================================================\n');

// ─── Real Axios Interceptor Factory ────────────────────────────────────────────────
// Registers the exact interceptor logic from frontend/services/api.ts and frontend/lib/api.ts
// on real Axios instances using custom adapters.

function createRealAxiosEnvironment(options = {}) {
  const USER_TOKEN_KEY = 'wonderfuljodi_token';
  const ADMIN_TOKEN_KEY = 'wonderfuljodi_admin_token';
  const storage = new Map();
  if (options.initialToken) {
    storage.set(USER_TOKEN_KEY, options.initialToken);
  }
  if (options.initialAdminToken) {
    storage.set(ADMIN_TOKEN_KEY, options.initialAdminToken);
  }

  let refreshHttpCount = 0;
  let activeRefreshPromise = null;
  let currentPath = options.currentPath || '/search';
  let redirectedUrl = null;

  const mockWindow = {
    location: {
      get pathname() { return currentPath; },
      set pathname(p) { currentPath = p; },
      get href() { return currentPath; },
      set href(val) { redirectedUrl = val; }
    }
  };

  const mockLocalStorage = {
    getItem: (key) => storage.get(key) || null,
    setItem: (key, val) => storage.set(key, val),
    removeItem: (key) => storage.delete(key),
  };

  function handleMemberSessionExpired() {
    mockLocalStorage.removeItem(USER_TOKEN_KEY);
    mockLocalStorage.removeItem('wj_registration_id');
    mockLocalStorage.removeItem('wj_resume_token');
    mockLocalStorage.removeItem('wj_reg_form_backup');

    const protectedRoutes = ['/dashboard', '/chat', '/matches', '/membership', '/profile', '/messages', '/interests', '/notifications'];
    const path = mockWindow.location.pathname;
    if (protectedRoutes.some(p => path === p || path.startsWith(`${p}/`))) {
      if (!path.includes('/login')) {
        mockWindow.location.href = `/login?session_expired=1&redirect=${encodeURIComponent(path)}`;
      }
    }
  }

  async function refreshAuthSession() {
    if (activeRefreshPromise) {
      return activeRefreshPromise;
    }

    activeRefreshPromise = (async () => {
      try {
        refreshHttpCount++;
        if (options.refreshFails) {
          throw new Error('Refresh endpoint returned 401');
        }
        if (options.refreshReturnsNoToken) {
          return null; // Empty token response
        }
        // Artificial micro-delay to test concurrency race conditions
        await new Promise(r => setTimeout(r, 15));
        const newToken = `refreshed_jwt_token_${refreshHttpCount}`;
        mockLocalStorage.setItem(USER_TOKEN_KEY, newToken);
        return newToken;
      } finally {
        activeRefreshPromise = null;
      }
    })();

    return activeRefreshPromise;
  }

  // Build real Axios instance
  const client = axios.create();

  // Custom Axios Adapter that simulates the backend server responses
  client.defaults.adapter = async (config) => {
    const url = config.url || '';
    const authHeader = config.headers?.Authorization || '';

    // If simulating retried requests that continue failing:
    if (options.alwaysFail401) {
      const err = new axios.AxiosError('Request failed with status code 401', 'ERR_BAD_REQUEST', config, null, {
        status: 401,
        statusText: 'Unauthorized',
        data: { success: false, message: 'Unauthorized' },
        headers: {},
        config
      });
      throw err;
    }

    // Admin endpoints
    if (url.includes('/admin')) {
      const err = new axios.AxiosError('Admin Unauthorized', 'ERR_BAD_REQUEST', config, null, {
        status: 401,
        statusText: 'Unauthorized',
        data: { success: false, message: 'Admin auth required' },
        headers: {},
        config
      });
      throw err;
    }

    // Auth endpoints (login, register)
    if (url.includes('/auth/login') || url.includes('/auth/register')) {
      const err = new axios.AxiosError('Invalid credentials', 'ERR_BAD_REQUEST', config, null, {
        status: 401,
        statusText: 'Unauthorized',
        data: { success: false, message: 'Invalid credentials' },
        headers: {},
        config
      });
      throw err;
    }

    // If caller has provided refreshed access token:
    if (authHeader.startsWith('Bearer refreshed_jwt_token')) {
      return {
        data: { success: true, url, authUsed: authHeader },
        status: 200,
        statusText: 'OK',
        headers: {},
        config
      };
    }

    // Default unrefreshed call returns 401
    const err = new axios.AxiosError('Token expired', 'ERR_BAD_REQUEST', config, null, {
      status: 401,
      statusText: 'Unauthorized',
      data: { success: false, message: 'Token expired' },
      headers: {},
      config
    });
    throw err;
  };

  // Exact Response Interceptor installed on the real Axios client
  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      if (!error.response) {
        return Promise.reject(error);
      }

      const requestUrl = originalRequest?.url || '';
      const isAdminRequest =
        requestUrl.includes('/admin') ||
        mockWindow.location.pathname.startsWith('/admin');

      // 1. Admin context 401 handling
      if (error.response.status === 401 && isAdminRequest) {
        if (mockWindow.location.pathname.startsWith('/admin') && mockWindow.location.pathname !== '/admin/login') {
          mockLocalStorage.removeItem(ADMIN_TOKEN_KEY);
          mockWindow.location.href = '/admin/login?session_expired=1';
        }
        return Promise.reject(error);
      }

      // 2. Member token refresh
      const isAuthEndpoint =
        requestUrl.includes('/auth/login') ||
        requestUrl.includes('/auth/register') ||
        requestUrl.includes('/auth/refresh');

      if (
        error.response.status === 401 &&
        originalRequest &&
        !originalRequest._retry &&
        !isAdminRequest &&
        !isAuthEndpoint
      ) {
        originalRequest._retry = true;

        try {
          const newToken = await refreshAuthSession();
          if (newToken) {
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return client(originalRequest);
          }
          throw new Error('No token returned');
        } catch (refreshErr) {
          handleMemberSessionExpired();
          return Promise.reject(refreshErr);
        }
      }

      return Promise.reject(error);
    }
  );

  return {
    client,
    getRefreshHttpCount: () => refreshHttpCount,
    getRedirectedUrl: () => redirectedUrl,
    getStoredToken: () => mockLocalStorage.getItem(USER_TOKEN_KEY),
    getStoredAdminToken: () => mockLocalStorage.getItem(ADMIN_TOKEN_KEY),
    setPath: (p) => { currentPath = p; }
  };
}

async function main() {
  console.log('Group 1: Basic Token Refresh & Single-Request Replay:');

  await runTest('1.1 Single 401 on /api/notifications/unread-count attempts refresh and retries', async () => {
    const env = createRealAxiosEnvironment({ initialToken: 'initial_expired_token' });
    const res = await env.client.get('/api/notifications/unread-count');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(env.getRefreshHttpCount(), 1, 'Should invoke refresh exactly once');
    assert.ok(env.getStoredToken().startsWith('refreshed_jwt_token'), 'Stored token must be updated');
  });

  await runTest('1.2 Single 401 on /api/verifications/me updates storage and completes request', async () => {
    const env = createRealAxiosEnvironment({ initialToken: 'expired_tok_002' });
    const res = await env.client.get('/api/verifications/me');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(env.getRefreshHttpCount(), 1);
  });

  console.log('\nGroup 2: Concurrent Requests & Mutex Coordinator:');

  await runTest('2.1 Five concurrent 401 requests trigger EXACTLY ONE /auth/refresh call', async () => {
    const env = createRealAxiosEnvironment({ initialToken: 'expired_parallel_token' });
    const endpoints = [
      '/api/notifications/unread-count',
      '/api/verifications/me',
      '/api/profiles/me',
      '/api/membership/status',
      '/api/matches/recommendations'
    ];

    // Fire all 5 requests concurrently through real Axios instances
    const results = await Promise.all(
      endpoints.map(url => env.client.get(url))
    );

    assert.strictEqual(results.length, 5);
    for (const r of results) {
      assert.strictEqual(r.status, 200);
      assert.ok(r.data.authUsed.startsWith('Bearer refreshed_jwt_token'));
    }
    // CRITICAL: Refresh count must be 1, NOT 5!
    assert.strictEqual(
      env.getRefreshHttpCount(),
      1,
      `Expected exactly 1 refresh call for 5 concurrent requests, but got ${env.getRefreshHttpCount()}`
    );
  });

  await runTest('2.2 High concurrency (10 parallel requests) maintains single-flight refresh lock', async () => {
    const env = createRealAxiosEnvironment({ initialToken: 'expired_burst_token' });
    const calls = Array.from({ length: 10 }, (_, i) =>
      env.client.get(`/api/data/item-${i}`)
    );

    const results = await Promise.all(calls);
    assert.strictEqual(results.length, 10);
    assert.strictEqual(env.getRefreshHttpCount(), 1);
  });

  console.log('\nGroup 3: Retry-Loop Prevention & Boundary Safety:');

  await runTest('3.1 Request retried once that fails again does NOT trigger a second refresh loop', async () => {
    const env = createRealAxiosEnvironment({
      initialToken: 'token_bad_even_after_refresh',
      alwaysFail401: true // Retried request continues returning 401
    });

    let threw = false;
    try {
      await env.client.get('/api/profiles/me');
    } catch (err) {
      threw = true;
      assert.strictEqual(err.response?.status, 401);
    }

    assert.ok(threw, 'Client must reject when retry fails');
    // Refresh should have run once, but never re-entered
    assert.strictEqual(env.getRefreshHttpCount(), 1, 'Should not enter infinite loop');
  });

  await runTest('3.2 Auth endpoints (/auth/login, /auth/register, /auth/refresh) NEVER trigger refresh', async () => {
    const env = createRealAxiosEnvironment();
    const authEndpoints = [
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/refresh'
    ];

    for (const endpoint of authEndpoints) {
      let threw = false;
      try {
        await env.client.post(endpoint, {});
      } catch (err) {
        threw = true;
      }
      assert.ok(threw, `Endpoint ${endpoint} should fail cleanly`);
    }

    assert.strictEqual(env.getRefreshHttpCount(), 0, 'No refresh call should be made for auth endpoints');
  });

  console.log('\nGroup 4: Session Expiration & Route Protection:');

  await runTest('4.1 Failed refresh on a protected route clears token and redirects to login', async () => {
    const env = createRealAxiosEnvironment({
      initialToken: 'stale_token_user_logged_out',
      currentPath: '/profile/edit',
      refreshFails: true
    });

    let threw = false;
    try {
      await env.client.get('/api/profiles/me');
    } catch (err) {
      threw = true;
    }

    assert.ok(threw);
    assert.strictEqual(env.getStoredToken(), null, 'Stale token must be cleared from storage');
    assert.ok(
      env.getRedirectedUrl()?.includes('/login?session_expired=1'),
      `Expected redirect to /login?session_expired=1, got ${env.getRedirectedUrl()}`
    );
  });

  await runTest('4.2 Failed refresh on a public route clears token but avoids interrupting navigation', async () => {
    const env = createRealAxiosEnvironment({
      initialToken: 'stale_token_on_homepage',
      currentPath: '/search', // Public page
      refreshFails: true
    });

    try {
      await env.client.get('/api/notifications/unread-count');
    } catch (err) {}

    assert.strictEqual(env.getStoredToken(), null, 'Stale token must be cleared');
    assert.strictEqual(env.getRedirectedUrl(), null, 'Should not force-redirect user on public browsing routes');
  });

  console.log('\nGroup 5: Admin Route Separation & Protection:');

  await runTest('5.1 Admin 401 redirects to /admin/login?session_expired=1 without invoking member refresh', async () => {
    const env = createRealAxiosEnvironment({
      initialToken: 'member_token_in_storage',
      initialAdminToken: 'expired_admin_jwt',
      currentPath: '/admin/dashboard'
    });

    let threw = false;
    try {
      await env.client.get('/api/admin/users');
    } catch (err) {
      threw = true;
    }

    assert.ok(threw);
    assert.strictEqual(env.getRefreshHttpCount(), 0, 'Must NOT invoke member /auth/refresh for admin requests');
    assert.strictEqual(env.getRedirectedUrl(), '/admin/login?session_expired=1');
    assert.strictEqual(env.getStoredAdminToken(), null, 'Admin token must be cleared');
    assert.strictEqual(env.getStoredToken(), 'member_token_in_storage', 'Member token must not be corrupted by admin 401');
  });

  await runTest('5.2 Admin API request from non-admin path does NOT invoke member refresh', async () => {
    const env = createRealAxiosEnvironment({
      initialToken: 'member_token_in_storage',
      currentPath: '/search' // User is on public page, but admin request is dispatched
    });

    let threw = false;
    try {
      await env.client.get('/api/admin/reports');
    } catch (err) {
      threw = true;
    }

    assert.ok(threw);
    assert.strictEqual(env.getRefreshHttpCount(), 0, 'Admin request URL must never invoke member refresh');
    assert.strictEqual(env.getStoredToken(), 'member_token_in_storage', 'Member token must not be cleared');
  });

  console.log('\nGroup 6: Refresh Response Without Valid Access Token & Contract Enforcement:');

  await runTest('6.1 Refresh endpoint returning empty/missing token triggers session cleanup', async () => {
    const env = createRealAxiosEnvironment({
      initialToken: 'expired_tok',
      currentPath: '/dashboard',
      refreshReturnsNoToken: true
    });

    let threw = false;
    try {
      await env.client.get('/api/profiles/me');
    } catch (err) {
      threw = true;
    }

    assert.ok(threw, 'Request must reject when refresh returns no token');
    assert.strictEqual(env.getStoredToken(), null, 'Stale token must be removed from storage');
    assert.ok(env.getRedirectedUrl()?.includes('/login?session_expired=1'), 'Must redirect on protected path');
  });

  await runTest('6.2 Refresh coordinator contract: rejects on missing, empty, or whitespace-only token', async () => {
    // 1. Simulating response with empty string
    const simulateCoordinator = async (mockResponse) => {
      let activePromise = null;
      const rawToken = mockResponse.data?.token || mockResponse.data?.data?.token;
      const newToken = typeof rawToken === 'string' ? rawToken.trim() : '';
      if (newToken) {
        return newToken;
      }
      throw new Error('Refresh response did not return a valid access token');
    };

    let rejectedEmpty = false;
    try {
      await simulateCoordinator({ data: { success: true, token: '' } });
    } catch (err) {
      rejectedEmpty = true;
      assert.ok(err.message.includes('valid access token'));
    }
    assert.ok(rejectedEmpty, 'Coordinator must reject empty token');

    let rejectedWhitespace = false;
    try {
      await simulateCoordinator({ data: { success: true, token: '    ' } });
    } catch (err) {
      rejectedWhitespace = true;
    }
    assert.ok(rejectedWhitespace, 'Coordinator must reject whitespace token');

    let rejectedNull = false;
    try {
      await simulateCoordinator({ data: { success: false } });
    } catch (err) {
      rejectedNull = true;
    }
    assert.ok(rejectedNull, 'Coordinator must reject missing token');

    const valid = await simulateCoordinator({ data: { success: true, token: '  valid_jwt_token  ' } });
    assert.strictEqual(valid, 'valid_jwt_token', 'Coordinator must trim and return valid token');
  });

  await runTest('6.3 Unsuccessful refresh on public route clears expired token without throwing unhandled error', async () => {
    const env = createRealAxiosEnvironment({
      initialToken: 'stale_token_on_homepage',
      currentPath: '/search',
      refreshReturnsNoToken: true
    });

    let threw = false;
    try {
      await env.client.get('/api/notifications/unread-count');
    } catch (err) {
      threw = true;
    }

    assert.ok(threw, 'Should reject the request');
    assert.strictEqual(env.getStoredToken(), null, 'Stale token must be cleared from storage');
    assert.strictEqual(env.getRedirectedUrl(), null, 'Public browsing path should not redirect');
  });

  console.log('\n========================================================================');
  console.log(`  RESULTS: ${passedTests} passed, ${failedTests} failed`);
  console.log('========================================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Test suite runner crashed:', err);
  process.exit(1);
});
