/**
 * Guards the `next` parameter that carries a visitor back to the page they
 * asked for after signing in. Only same-origin paths inside the app are
 * honoured; anything that could send someone off-site — a full URL, a
 * protocol-relative `//host`, a backslash trick, a non-app path — falls back
 * to the role's home. Pure, so it is unit-tested directly.
 */
export function safeNextPath(raw: string | null | undefined, fallback: string): string {
  if (!raw) return fallback;
  let value: string;
  try {
    value = decodeURIComponent(raw).trim();
  } catch {
    return fallback;
  }
  if (value === '') return fallback;
  // Must be an absolute path, and not protocol-relative or scheme-bearing.
  if (!value.startsWith('/')) return fallback;
  if (value.startsWith('//') || value.startsWith('/\\')) return fallback;
  if (/[\r\n]/.test(value)) return fallback;
  if (value.includes('://')) return fallback;
  // Only the authenticated app is a sensible destination after sign-in.
  if (!(value === '/app' || value.startsWith('/app/'))) return fallback;
  return value;
}
