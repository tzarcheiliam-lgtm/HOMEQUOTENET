// Shared secret check for generic intake endpoints (Website Forms, Zapier, API).
// Returns a precise outcome so the route can pick the right HTTP status.
export type IntakeAuthResult =
  | { ok: true }
  | { ok: false; status: 401 | 403; message: string };

/**
 * A configured secret is REQUIRED for generic providers. If none is set the
 * integration is considered misconfigured (403). A present secret must match the
 * Bearer token exactly (else 401).
 */
export function checkIntakeAuth(
  configuredSecret: string | null | undefined,
  authorizationHeader: string | null | undefined
): IntakeAuthResult {
  if (!configuredSecret) {
    return {
      ok: false,
      status: 403,
      message: 'Integration has no API key configured',
    };
  }
  const provided = (authorizationHeader ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!provided || provided !== configuredSecret) {
    return { ok: false, status: 401, message: 'Invalid API key' };
  }
  return { ok: true };
}
