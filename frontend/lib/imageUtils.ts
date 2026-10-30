/**
 * Validates whether an image source URL is safe, valid, and well-formed for rendering in an <img> tag.
 *
 * Rules:
 * 1. Rejects null, undefined, empty, or literal string values like "null", "undefined", "[object Object]", "NaN".
 * 2. Rejects path traversal sequences ("..") or backslashes ("\\").
 * 3. Strictly blocks private/internal server storage paths (/home/, /var/, /tmp/, /etc/, C:\\, etc.)
 *    to prevent exposing internal infrastructure in the DOM.
 * 4. Root-relative URLs must begin with approved public assets prefixes:
 *    /uploads/, /images/, /assets/, /static/, or /_next/.
 * 5. Full web URLs must start with http:// or https://.
 * 6. Base64 Data URLs must adhere to data:image/(jpeg|png|webp|svg+xml);base64,... and be non-truncated.
 */
export function isValidImageUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;

  // Reject literal strings that represent nullish/error values
  const lower = trimmed.toLowerCase();
  if (
    lower === 'null' ||
    lower === 'undefined' ||
    lower === '[object object]' ||
    lower === 'nan' ||
    lower === '/null' ||
    lower === '/undefined'
  ) {
    return false;
  }

  // Reject path traversal, null bytes, backslashes, or alternate streams
  if (trimmed.includes('..') || trimmed.includes('\\') || trimmed.includes('\0')) {
    return false;
  }

  // Reject internal server storage paths or absolute Windows disk drive paths
  if (/^\/(home|var|tmp|etc|proc|sys|dev|root|usr|opt)\b/i.test(trimmed)) {
    return false;
  }
  if (/^[a-zA-Z]:/i.test(trimmed)) {
    return false;
  }
  if (/^(file|javascript|vbscript|data(?!:image\/)):/i.test(trimmed)) {
    return false;
  }

  // Safe root-relative public assets
  if (
    trimmed.startsWith('/uploads/') ||
    trimmed.startsWith('/images/') ||
    trimmed.startsWith('/assets/') ||
    trimmed.startsWith('/static/') ||
    trimmed.startsWith('/_next/')
  ) {
    return true;
  }

  // Safe standard HTTP/HTTPS URLs
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
    try {
      const parsed = new URL(trimmed);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  // Data URLs: must follow valid format and have valid non-truncated base64
  if (trimmed.startsWith('data:image/')) {
    const commaIndex = trimmed.indexOf(',');
    if (commaIndex === -1) return false;

    const header = trimmed.slice(0, commaIndex);
    const data = trimmed.slice(commaIndex + 1);

    if (!header.includes(';base64') || !data || data.length < 64) {
      return false;
    }

    // Check for valid base64 character set
    if (!/^[A-Za-z0-9+/=]+$/.test(data)) {
      return false;
    }

    // Base64 string length must be a multiple of 4
    if (data.length % 4 !== 0) {
      return false;
    }

    // Quick decode test of the initial segment (isomorphic for browser & Node.js SSR)
    try {
      const g = typeof globalThis !== 'undefined' ? (globalThis as any) : null;
      if (g && typeof g.atob === 'function') {
        g.atob(data.slice(0, 32));
      } else if (typeof Buffer !== 'undefined') {
        Buffer.from(data.slice(0, 32), 'base64');
      }
      return true;
    } catch {
      return false;
    }
  }

  return false;
}
