import { parseUsPhone } from '@/lib/leads/normalize';

/**
 * Safe-by-default send mode. Real texts go out ONLY when MESSAGING_MODE=live
 * is set explicitly, so local development, previews and tests can never text
 * a homeowner by accident.
 *
 *   disabled   nothing is sent; sends are suppressed ('messaging_disabled')   [default everywhere]
 *   mock       the mock provider records sends in memory; nothing leaves the process
 *   allowlist  the real provider, but only to numbers in MESSAGING_TEST_ALLOWLIST
 *   live       the real provider, to anyone who passes consent/opt-out checks
 *
 * `live` is refused outside Vercel production so a copied .env cannot turn a
 * laptop or preview deploy into a sender.
 */
export const MESSAGING_MODES = ['disabled', 'mock', 'allowlist', 'live'] as const;
export type MessagingMode = (typeof MESSAGING_MODES)[number];

export interface MessagingModeConfig {
  mode: MessagingMode;
  allowlist: ReadonlySet<string>;
  /** Why the requested mode was downgraded, if it was. */
  warning: string | null;
}

export function resolveMessagingMode(env: Record<string, string | undefined>): MessagingModeConfig {
  const requested = (env.MESSAGING_MODE ?? '').trim().toLowerCase();
  // Comma/semicolon/newline separated; spaces are part of formatted numbers.
  const allowlist = new Set(
    (env.MESSAGING_TEST_ALLOWLIST ?? '')
      .split(/[,;\n]+/)
      .map((n) => parseUsPhone(n))
      .flatMap((r) => (r.ok ? [r.e164] : []))
  );
  if (!requested) return { mode: 'disabled', allowlist, warning: null };
  if (!(MESSAGING_MODES as readonly string[]).includes(requested)) {
    return { mode: 'disabled', allowlist, warning: `Unknown MESSAGING_MODE "${requested}"; messaging disabled` };
  }
  let mode = requested as MessagingMode;
  let warning: string | null = null;
  if (mode === 'live' && env.VERCEL_ENV !== 'production') {
    mode = 'allowlist';
    warning = 'MESSAGING_MODE=live is only honored in Vercel production; using allowlist';
  }
  if (mode === 'allowlist' && allowlist.size === 0) {
    return { mode: 'disabled', allowlist, warning: 'Allowlist mode with an empty MESSAGING_TEST_ALLOWLIST; messaging disabled' };
  }
  return { mode, allowlist, warning };
}

/** Whether this mode may send to `e164`. Opt-out/consent are checked separately. */
export function modeAllowsRecipient(config: MessagingModeConfig, e164: string): 'allowed' | 'messaging_disabled' | 'not_allowlisted' {
  switch (config.mode) {
    case 'disabled':
      return 'messaging_disabled';
    case 'mock':
    case 'live':
      return 'allowed';
    case 'allowlist':
      return config.allowlist.has(e164) ? 'allowed' : 'not_allowlisted';
  }
}
