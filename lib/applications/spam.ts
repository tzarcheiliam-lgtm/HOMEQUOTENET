/**
 * Spam heuristics for the public contractor application.
 *
 * Pure functions with no server dependencies, so they are unit-testable and
 * can be reused by any future public form (fencing, roofing, ADU niches).
 *
 * Both checks are deliberately silent: when one trips, the caller returns a
 * generic success so an automated submitter learns nothing from the response.
 */

/** Minimum seconds a genuine person takes to complete the form. */
export const MIN_FILL_SECONDS = 3;

export type SpamCheck =
  | { spam: false }
  | { spam: true; reason: 'honeypot' | 'too_fast' };

export function checkHoneypot(value: unknown): SpamCheck {
  const filled = String(value ?? '').trim() !== '';
  return filled ? { spam: true, reason: 'honeypot' } : { spam: false };
}

/**
 * Rejects submissions that arrive faster than a person could fill the form.
 * A missing, zero, non-numeric, or future timestamp is treated as NOT spam —
 * the honeypot is the primary defence, and we must never reject a real
 * contractor because JavaScript failed to set the field.
 */
export function checkFillTime(
  startedAtRaw: unknown,
  now: number = Date.now()
): SpamCheck {
  const startedAt = Number(startedAtRaw ?? 0);
  if (!Number.isFinite(startedAt) || startedAt <= 0) return { spam: false };

  const elapsedSeconds = (now - startedAt) / 1000;
  if (elapsedSeconds < 0) return { spam: false };

  return elapsedSeconds < MIN_FILL_SECONDS
    ? { spam: true, reason: 'too_fast' }
    : { spam: false };
}

/** Runs every check; returns the first one that trips. */
export function screenSubmission(input: {
  honeypot: unknown;
  startedAt: unknown;
  now?: number;
}): SpamCheck {
  const honeypot = checkHoneypot(input.honeypot);
  if (honeypot.spam) return honeypot;

  return checkFillTime(input.startedAt, input.now ?? Date.now());
}
