export type ConfigStatus = 'off' | 'ready' | 'incomplete';

/** A contractor is ready only with a mode other than off AND both Fish identifiers present. */
export function configStatus(s: { mode: string; agent_id: string | null; phone_number_id: string | null } | null): { status: ConfigStatus; missing: string[] } {
  if (!s || s.mode === 'off') return { status: 'off', missing: [] };
  const missing = [!s.agent_id?.trim() && 'Fish agent id', !s.phone_number_id?.trim() && 'Fish phone number id'].filter(Boolean) as string[];
  return { status: missing.length ? 'incomplete' : 'ready', missing };
}

/** Identifiers pasted from the Fish console: plain tokens only. */
export const FISH_ID = /^[A-Za-z0-9_-]{6,80}$/;
