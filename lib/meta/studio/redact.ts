import { redactSecrets } from '@/lib/meta/marketing-api';

/**
 * Every message HQN stores, logs or returns to a browser goes through `redact`.
 *
 * Two layers: (1) pattern redaction (access_token=..., EAA... tokens, Bearer ...) from the analytics layer, and
 * (2) an exact-value scrub of the credentials this process actually holds, so a token is removed even if Meta (or a
 * proxy, or a bug) echoes it in an unexpected shape. The list of secret env vars is explicit and tested.
 */
export const SECRET_ENV_VARS = ['META_ADS_WRITE_TOKEN', 'META_MARKETING_ACCESS_TOKEN', 'META_CONVERSIONS_API_TOKEN', 'META_PAGE_ACCESS_TOKEN', 'META_APP_SECRET', 'META_TICK_SECRET', 'SUPABASE_SERVICE_ROLE_KEY'] as const;

const MIN_SECRET_LENGTH = 8; // never "scrub" a short value: it would shred ordinary text

export function redact(text: string | null | undefined): string {
  let out = redactSecrets(text);
  for (const name of SECRET_ENV_VARS) {
    const v = process.env[name];
    if (v && v.length >= MIN_SECRET_LENGTH) out = out.split(v).join('[redacted]');
  }
  return out;
}
