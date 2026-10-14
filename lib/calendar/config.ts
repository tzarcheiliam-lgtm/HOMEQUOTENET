import 'server-only';
import { decryptToken, encryptToken } from '@/lib/emails/token-crypto';

export const GOOGLE_CALENDAR_SCOPES = [
  'openid',
  'email',
  // Create/update/delete only the events HomeQuote itself writes (and read free/busy), nothing broader.
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.freebusy',
];
export const CALENDAR_EVENTS_SCOPE = 'https://www.googleapis.com/auth/calendar.events';
export const CALENDAR_FREEBUSY_SCOPE = 'https://www.googleapis.com/auth/calendar.freebusy';

function env(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}

export function googleCalendarConfig(): { clientId: string; clientSecret: string; redirectUri: string } | null {
  const clientId = env('GOOGLE_CALENDAR_CLIENT_ID');
  const clientSecret = env('GOOGLE_CALENDAR_CLIENT_SECRET');
  const redirectUri = env('GOOGLE_CALENDAR_REDIRECT_URI');
  if (!clientId || !clientSecret || !redirectUri) return null;
  return { clientId, clientSecret, redirectUri };
}

/** Dedicated key if set, otherwise the existing Gmail token key (same AES-256-GCM scheme). */
function encryptionKey(): Buffer | null {
  const raw = env('CALENDAR_TOKEN_ENCRYPTION_KEY') ?? env('GMAIL_TOKEN_ENCRYPTION_KEY');
  if (!raw) return null;
  const key = Buffer.from(raw, 'base64');
  return key.length === 32 ? key : null;
}

export function googleCalendarReady(): boolean {
  return googleCalendarConfig() !== null && encryptionKey() !== null;
}

export function encryptCalendarSecret(secret: string): string {
  const key = encryptionKey();
  if (!key) throw new Error('Calendar token encryption key is not configured');
  return encryptToken(secret, key);
}

export function decryptCalendarSecret(value: string): string {
  const key = encryptionKey();
  if (!key) throw new Error('Calendar token encryption key is not configured');
  return decryptToken(value, key);
}

export function siteUrl(): string {
  return (env('NEXT_PUBLIC_SITE_URL') ?? 'http://localhost:3000').replace(/\/$/, '');
}
