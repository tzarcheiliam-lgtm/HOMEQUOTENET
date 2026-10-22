/** Production fallback so a missing env var can never send a customer to localhost. */
export const PRODUCTION_SITE_URL = 'https://homequotenet.com';

const isLocal = (url: string) => /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|\/|$)/i.test(url);

/**
 * The public origin used in links we email or hand to external services.
 * `NEXT_PUBLIC_SITE_URL` wins, but in production a localhost (or unset) value is
 * ignored: it falls back to Vercel's production domain, then homequotenet.com.
 */
export function publicSiteUrl(env: Record<string, string | undefined> = process.env): string {
  const configured = env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, '');
  const production = env.NODE_ENV === 'production';
  if (configured && !(production && isLocal(configured))) return configured;
  if (!production) return 'http://localhost:3000';
  const vercel = env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, '').replace(/\/+$/, '')}`;
  return PRODUCTION_SITE_URL;
}
