/**
 * Validates whether an image source URL is safe and well-formed.
 * Prevents truncated or corrupted data URLs from being passed to <img> or Next/Image,
 * which causes browser net::ERR_INVALID_URL errors.
 */
export function isValidImageUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;

  // Root-relative or standard HTTP/HTTPS URLs
  if (trimmed.startsWith('/') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return true;
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

    // Quick decode test of the initial segment
    try {
      if (typeof window !== 'undefined' && typeof window.atob === 'function') {
        window.atob(data.slice(0, 32));
      }
      return true;
    } catch {
      return false;
    }
  }

  return false;
}
