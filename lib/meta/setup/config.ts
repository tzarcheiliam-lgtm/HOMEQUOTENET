import 'server-only';
import { publicSiteUrl } from '@/lib/auth/site-url';
import { decryptToken, encryptToken } from '@/lib/emails/token-crypto';

const env = (n: string) => process.env[n]?.trim() || undefined;

/** Permissions requested. Reading pixels needs ads_read; creating one additionally needs ads_management (separate, optional step). */
export const SCOPES_READ = ['ads_read'] as const;
export const SCOPES_MANAGE = ['ads_read', 'ads_management'] as const;

export interface MetaAppConfig { appId: string; appSecret: string; redirectUri: string }

/** The Meta app that users authorize. Dormant (null) until an admin has created the app and set these. */
export function metaAppConfig(): MetaAppConfig | null {
  const appId = env('META_APP_ID');
  const appSecret = env('META_APP_SECRET');
  if (!appId || !appSecret) return null;
  return { appId, appSecret, redirectUri: env('META_OAUTH_REDIRECT_URI') ?? `${publicSiteUrl()}/api/integrations/meta/connect/callback` };
}

function encryptionKey(): Buffer | null {
  const raw = env('META_TOKEN_ENCRYPTION_KEY') ?? env('GMAIL_TOKEN_ENCRYPTION_KEY');
  if (!raw) return null;
  const key = Buffer.from(raw, 'base64');
  return key.length === 32 ? key : null;
}

export const metaConnectReady = () => metaAppConfig() !== null && encryptionKey() !== null;

export function sealToken(token: string): string {
  const key = encryptionKey();
  if (!key) throw new Error('Meta token encryption key is not configured');
  return encryptToken(token, key);
}
export function openToken(value: string): string {
  const key = encryptionKey();
  if (!key) throw new Error('Meta token encryption key is not configured');
  return decryptToken(value, key);
}

export function missingSetup(): string[] {
  const out: string[] = [];
  if (!env('META_APP_ID')) out.push('META_APP_ID');
  if (!env('META_APP_SECRET')) out.push('META_APP_SECRET');
  if (!encryptionKey()) out.push('META_TOKEN_ENCRYPTION_KEY (base64, 32 bytes)');
  return out;
}
