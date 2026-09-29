/**
 * Notification links are internal-only. Anything that is not a same-origin
 * /app path (absolute URLs, protocol-relative //host, backslash tricks,
 * javascript:, control characters) collapses to the portal home, so neither a
 * bug nor a crafted payload can turn a push into an open redirect.
 * public/sw.js applies the same rule again before opening a window.
 */
export const FALLBACK_URL = '/app';

export function safeInternalUrl(input: unknown): string {
  if (typeof input !== 'string') return FALLBACK_URL;
  const url = input.trim();
  if (url.length === 0 || url.length > 500) return FALLBACK_URL;
  if (/[\u0000-\u001f\u007f\\]/.test(url)) return FALLBACK_URL;
  if (url !== '/app' && !url.startsWith('/app/') && !url.startsWith('/app?') && !url.startsWith('/app#')) {
    return FALLBACK_URL;
  }
  return url;
}
