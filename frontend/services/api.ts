import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

export const ADMIN_TOKEN_KEY = 'wonderfuljodi_admin_token';
export const USER_TOKEN_KEY = 'wonderfuljodi_token';

let refreshPromise: Promise<string> | null = null;

/**
 * Shared in-flight authentication session refresh coordinator.
 * Prevents multiple concurrent requests from firing separate /auth/refresh operations,
 * avoiding race conditions and false-positive refresh token reuse detection.
 * Unambiguous contract: resolves with a valid, non-empty access token, or rejects on any failure.
 */
export async function refreshAuthSession(): Promise<string> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const response = await axios.post<{
        success: boolean;
        token?: string;
        data?: { token?: string };
      }>(
        `${getApiBaseUrl()}/auth/refresh`,
        {},
        { withCredentials: true }
      );

      const rawToken = response.data?.token || response.data?.data?.token;
      const newToken = typeof rawToken === 'string' ? rawToken.trim() : '';

      if (newToken) {
        if (typeof window !== 'undefined') {
          localStorage.setItem(USER_TOKEN_KEY, newToken);
        }
        return newToken;
      }
      throw new Error('Refresh response did not return a valid access token');
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Normalizes an API URL to ensure no trailing slashes and avoids duplicate /api suffixes.
 */
export function normalizeApiUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim().replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

/**
 * Dynamically resolves the API base URL:
 * 1. In browser (production): always returns same-origin '/api' to avoid CORS, cookie, and proxy loops
 * 2. In browser (LAN/dev mode): connects directly to host PC on port 5000 (e.g. http://192.168.1.102:5000/api)
 * 3. In SSR (Server-Side Rendering): connects to local Express backend on 127.0.0.1
 */
export function getApiBaseUrl(): string {
  // 1. Browser runtime context
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;

    // Local / LAN network testing in non-production
    if (
      process.env.NODE_ENV !== 'production' &&
      /^(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)$/.test(
        hostname
      )
    ) {
      if (process.env.NEXT_PUBLIC_API_URL) {
        return normalizeApiUrl(process.env.NEXT_PUBLIC_API_URL);
      }
      return `${protocol}//${hostname}:5000/api`;
    }

    // In production browser, always use same-origin relative '/api'.
    // This ensures cookies are automatically attached, eliminates CORS preflights,
    // and prevents recursive proxy loops.
    return '/api';
  }

  // 2. Server-Side Rendering (SSR) context
  // Connect directly to the internal Express backend on 127.0.0.1
  if (process.env.INTERNAL_BACKEND_URL) {
    return normalizeApiUrl(process.env.INTERNAL_BACKEND_URL);
  }

  if (process.env.NODE_ENV === 'production') {
    return '/api';
  }

  const devPort = process.env.BACKEND_PORT || process.env.PORT || '5000';
  return `http://127.0.0.1:${devPort}/api`;
}

export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

/**
 * Determines whether a given request URL targets a valid, intended registration draft endpoint
 * on the configured API origin, preventing token leakage to external or misleading origins.
 */
export function isSafeRegistrationEndpoint(rawUrl: string | undefined, configuredBaseUrl?: string): boolean {
  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return false;
  }

  const trimmedUrl = rawUrl.trim();

  // 1. Reject protocol-relative and backslash-prefixed URLs (e.g. "//attacker.com", "\\attacker.com")
  if (/^[/\\]{2}/.test(trimmedUrl)) {
    return false;
  }

  // 2. Extract original request path component before URL parsing normalizes it
  let rawPath: string;
  const schemeMatch = trimmedUrl.match(/^https?:\/\/[^/?#]+/i);
  if (schemeMatch) {
    rawPath = trimmedUrl.slice(schemeMatch[0].length);
    if (!rawPath.startsWith('/')) {
      rawPath = `/${rawPath}`;
    }
  } else {
    // Relative URL (or invalid scheme like javascript:)
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmedUrl)) {
      return false;
    }
    rawPath = trimmedUrl;
  }

  // Strip query string and fragment for path validation
  const queryOrHashIndex = rawPath.search(/[?#]/);
  if (queryOrHashIndex !== -1) {
    rawPath = rawPath.slice(0, queryOrHashIndex);
  }

  // 3. Reject backslash-based path manipulation anywhere in the path
  if (rawPath.includes('\\')) {
    return false;
  }

  // 4. Reject literal dot segments (/../, /./, ^../, ^./, etc.)
  if (/(^|\/)\.+(\/|$)/.test(rawPath)) {
    return false;
  }

  // 5. Reject malformed percent-encoding
  if (/%(?![0-9a-fA-F]{2})/.test(rawPath)) {
    return false;
  }

  // 6. Reject encoded dot segments (%2e), encoded slashes (%2f), and backslashes (%5c)
  // Supports mixed-case (%2E, %2F, %5C) and double encoding (%252e, etc.)
  if (/%(?:2[eE]|2[fF]|5[cC])/i.test(rawPath)) {
    return false;
  }
  if (/%25(?:2[eE]|2[fF]|5[cC])/i.test(rawPath)) {
    return false;
  }

  // 7. Multi-pass decoding check to detect double encoding or evasion
  let decoded = rawPath;
  for (let i = 0; i < 3; i++) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
      return false; // Malformed percent encoding
    }
  }

  if (decoded.includes('\\') || /(^|\/)\.+(\/|$)/.test(decoded)) {
    return false;
  }

  const apiBase = configuredBaseUrl || getApiBaseUrl();

  // 8. Determine reference base URL with origin
  let parsedBase: URL;
  try {
    if (/^https?:\/\//i.test(apiBase)) {
      parsedBase = new URL(apiBase);
    } else if (typeof window !== 'undefined' && window.location?.origin) {
      parsedBase = new URL(apiBase, window.location.origin);
    } else {
      parsedBase = new URL(apiBase, 'http://127.0.0.1:5000');
    }
  } catch {
    return false;
  }

  // 9. Parse and resolve target URL against parsedBase (ensuring trailing slash on base for relative paths)
  let parsedTarget: URL;
  try {
    const baseHrefWithSlash = parsedBase.href.endsWith('/') ? parsedBase.href : `${parsedBase.href}/`;
    parsedTarget = new URL(trimmedUrl, baseHrefWithSlash);
  } catch {
    return false;
  }

  // 10. Validate origins strictly (protocol, hostname, and port must match)
  if (parsedTarget.origin !== parsedBase.origin) {
    return false;
  }

  // Normalize pathname: collapse consecutive slashes and remove trailing slash
  const targetPath = parsedTarget.pathname.replace(/\/+/g, '/').replace(/\/+$/, '') || '/';
  const basePath = parsedBase.pathname.replace(/\/+/g, '/').replace(/\/+$/, '');

  // Extract relative sub-path relative to the API base or /api
  let subPath = targetPath;
  if (basePath && (targetPath === basePath || targetPath.startsWith(`${basePath}/`))) {
    subPath = targetPath.slice(basePath.length) || '/';
  } else if (targetPath.startsWith('/api/') || targetPath === '/api') {
    subPath = targetPath.slice('/api'.length) || '/';
  }

  // Ensure subPath begins with single '/'
  if (!subPath.startsWith('/')) {
    subPath = `/${subPath}`;
  }

  // Must strictly target registration draft endpoints (/registration or /registrations)
  return subPath === '/registration' ||
         subPath.startsWith('/registration/') ||
         subPath === '/registrations' ||
         subPath.startsWith('/registrations/');
}

/**
 * Verifies that a target request URL is directed to the same origin or configured API base,
 * preventing credentials from leaking to external or untrusted third-party origins.
 */
export function isSafeApiOrigin(rawUrl: string | undefined, baseUrl?: string): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return true;
  const trimmed = rawUrl.trim();
  if (/^[\/\\]{2}/.test(trimmed)) return false;
  // Relative paths are always safe same-origin
  if (trimmed.startsWith('/') || !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    return true;
  }
  try {
    const targetUrl = new URL(trimmed);
    const apiBase = baseUrl || getApiBaseUrl();
    const resolvedBase = new URL(apiBase, typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:5000');
    return targetUrl.origin === resolvedBase.origin;
  } catch {
    return false;
  }
}

apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    config.baseURL = getApiBaseUrl();

    const requestUrl = config.url || '';
    if (isSafeApiOrigin(requestUrl, config.baseURL || getApiBaseUrl())) {
      const isAdminRequest =
        requestUrl.includes('/admin') ||
        window.location.pathname.startsWith('/admin');

      // Administrative requests must exclusively use the intended admin token,
      // preventing a stale or mismatched general-user token from overriding or corrupting admin auth.
      // General user requests must exclusively use the user token.
      const adminToken = localStorage.getItem(ADMIN_TOKEN_KEY);
      const userToken = localStorage.getItem(USER_TOKEN_KEY);
      const token = isAdminRequest ? adminToken : userToken;

      if (token) {
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

        // Attach x-resume-token only for verified registration draft endpoints on the configured API origin
    if (isSafeRegistrationEndpoint(config.url, config.baseURL || getApiBaseUrl())) {
      config.headers = config.headers ?? {};
      const headers = config.headers as any;
      const hasExplicitResumeToken = Boolean(
        headers['x-resume-token'] ||
        headers['X-Resume-Token'] ||
        headers['resume-token'] ||
        headers['Resume-Token'] ||
        (typeof headers.get === 'function' &&
          (headers.get('x-resume-token') || headers.get('resume-token')))
      );

      if (!hasExplicitResumeToken) {
        const storedResumeToken = localStorage.getItem('wj_resume_token');
        if (storedResumeToken && storedResumeToken.trim()) {
          config.headers['x-resume-token'] = storedResumeToken.trim();
        }
      }
    }
  }
  return config;
});

/**
 * Non-sensitive UI hint indicating whether an authentication session might be active.
 * Checks for:
 * 1. Bearer token in localStorage (user or admin)
 * 2. Non-sensitive session hint cookie (wj_session=1) set by backend upon login/refresh
 *
 * NOTE: This is purely a client-side UI optimization hint to prevent unauthenticated
 * background polling by guests. It is NEVER treated as authentication.
 * The backend strictly validates credentials on every request via requireAuth.
 */
export function hasAuthSession(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const hasToken = Boolean(
      localStorage.getItem(USER_TOKEN_KEY) ||
      localStorage.getItem(ADMIN_TOKEN_KEY)
    );
    if (hasToken) return true;

    // Check for client-readable non-sensitive session hint cookie
    return /(?:^|;\s*)wj_session=1/.test(document.cookie);
  } catch {
    return false;
  }
}

/**
 * Handles expiration of member authentication session:
 * Clears stored member token and registration drafts.
 * If currently navigating a protected member page, redirects to login with session_expired query.
 */
export function handleMemberSessionExpired() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(USER_TOKEN_KEY);
  localStorage.removeItem('wj_registration_id');
  localStorage.removeItem('wj_resume_token');
  localStorage.removeItem('wj_reg_form_backup');
  try {
    document.cookie = 'wj_session=; path=/; max-age=0; SameSite=Lax';
  } catch {}

  const protectedRoutes = ['/dashboard', '/chat', '/matches', '/membership', '/profile', '/messages', '/interests', '/notifications'];
  const currentPath = window.location.pathname;
  if (protectedRoutes.some((p) => currentPath === p || currentPath.startsWith(`${p}/`))) {
    if (!currentPath.includes('/login')) {
      window.location.href = `/login?session_expired=1&redirect=${encodeURIComponent(currentPath)}`;
    }
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (!error.response || typeof window === 'undefined') {
      return Promise.reject(error);
    }

    const requestUrl = originalRequest?.url || '';
    const isAdminRequest =
      requestUrl.includes('/admin') ||
      window.location.pathname.startsWith('/admin');

    // 1. Admin context 401 handling: clear admin token and redirect to admin login
    if (error.response.status === 401 && isAdminRequest) {
      if (window.location.pathname.startsWith('/admin') && window.location.pathname !== '/admin/login') {
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        window.location.href = '/admin/login?session_expired=1';
      }
      return Promise.reject(error);
    }

    // 2. Prevent background notification polling or explicit non-refresh requests from cascading refresh / logout loops
    const skipAuthRefresh = Boolean(
      originalRequest?.headers?.['X-Skip-Auth-Refresh'] ||
      originalRequest?.headers?.['x-skip-auth-refresh'] ||
      (originalRequest as any)?.skipAuthRefresh ||
      requestUrl.includes('/notifications/unread-count')
    );

    if (error.response.status === 401 && skipAuthRefresh) {
      return Promise.reject(error);
    }

    // 3. Member token refresh for authentication-related 401s
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
        if (!newToken || typeof newToken !== 'string' || !newToken.trim()) {
          throw new Error('Refresh response did not return a valid access token');
        }
        originalRequest.headers = originalRequest.headers ?? {};
        (originalRequest.headers as Record<string, string>).Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch (refreshErr) {
        handleMemberSessionExpired();
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

export function setAdminToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
  }
}

export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function clearAdminToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
  }
}

export default apiClient;
