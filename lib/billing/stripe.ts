import 'server-only';
import Stripe from 'stripe';

let client: Stripe | null = null;

/**
 * Server-only Stripe client. STRIPE_SECRET_KEY (a restricted rk_ key is fine)
 * never reaches the browser. Throws a clear error when it isn't configured.
 */
export function stripe(): Stripe {
  if (client) return client;
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error('Stripe is not configured (STRIPE_SECRET_KEY is missing)');
  client = new Stripe(key, { appInfo: { name: 'HomeQuote Network' } });
  return client;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

/** Absolute URL on this site, for Checkout and portal redirects. */
export function siteUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  return new URL(path, base.endsWith('/') ? base : `${base}/`).toString();
}

/** The page a price email links to. Works for any signed-in contractor of the company. */
export function payPageUrl(requestId: string): string {
  return siteUrl(`/app/pay/${encodeURIComponent(requestId)}`);
}
