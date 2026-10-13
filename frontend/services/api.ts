import axios from 'axios';

const ADMIN_TOKEN_KEY = 'wonderfuljodi_admin_token';
const USER_TOKEN_KEY = 'wonderfuljodi_token';

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

apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    config.baseURL = getApiBaseUrl();

    // Check for admin token first if inside admin context, or standard token
    const adminToken = localStorage.getItem(ADMIN_TOKEN_KEY);
    const userToken = localStorage.getItem(USER_TOKEN_KEY);
    const token = adminToken || userToken;

    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
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

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== 'undefined' && error.response?.status === 401) {
      if (window.location.pathname.startsWith('/admin') && window.location.pathname !== '/admin/login') {
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        window.location.href = '/admin/login?session_expired=1';
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
