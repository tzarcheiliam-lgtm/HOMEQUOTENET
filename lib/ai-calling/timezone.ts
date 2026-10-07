import { usZipState } from '@/lib/location/us-zip';

/**
 * Timezone + calling-window logic for AI calls. Pure: no I/O, `now` is injected.
 *
 * A contact's timezone is inferred from their STATE (lead.state, or the ZIP when
 * it resolves). States that span zones list every zone, and a call is allowed
 * only when it is inside the window in ALL of them (the strictest reading), so
 * an ambiguous state can never be called outside hours. Anything we cannot
 * resolve returns null and the job is held for review: it is never guessed.
 */
const ET = 'America/New_York';
const CT = 'America/Chicago';
const MT = 'America/Denver';
const PT = 'America/Los_Angeles';

export const STATE_ZONES: Record<string, string[]> = {
  AL: [CT], AK: ['America/Anchorage', 'America/Adak'], AZ: ['America/Phoenix', MT], AR: [CT], CA: [PT], CO: [MT],
  CT: [ET], DE: [ET], DC: [ET], FL: [ET, CT], GA: [ET], HI: ['Pacific/Honolulu'], ID: [MT, PT], IL: [CT],
  IN: [ET, CT], IA: [CT], KS: [CT, MT], KY: [ET, CT], LA: [CT], ME: [ET], MD: [ET], MA: [ET], MI: [ET, CT],
  MN: [CT], MS: [CT], MO: [CT], MT: [MT], NE: [CT, MT], NV: [PT, MT], NH: [ET], NJ: [ET], NM: [MT], NY: [ET],
  NC: [ET], ND: [CT, MT], OH: [ET], OK: [CT], OR: [PT, MT], PA: [ET], RI: [ET], SC: [ET], SD: [CT, MT],
  TN: [ET, CT], TX: [CT, MT], UT: [MT], VT: [ET], VA: [ET], WA: [PT], WV: [ET], WI: [CT], WY: [MT],
  PR: ['America/Puerto_Rico'],
};

/** IANA zones for a contact, or null when the timezone cannot be determined. */
export function resolveZones(input: { state?: string | null; zip?: string | null }): string[] | null {
  const state = (input.state ?? '').trim().toUpperCase();
  if (STATE_ZONES[state]) return STATE_ZONES[state];
  if (input.zip && usZipState(input.zip) === 'CA') return STATE_ZONES.CA;
  return null;
}

const formatters = new Map<string, Intl.DateTimeFormat>();
function hourIn(zone: string, at: Date): number {
  let f = formatters.get(zone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', { timeZone: zone, hour: 'numeric', hourCycle: 'h23' });
    formatters.set(zone, f);
  }
  return Number(f.formatToParts(at).find((p) => p.type === 'hour')?.value ?? NaN);
}

export interface CallWindow { startHour: number; endHour: number }

/** True when `at` is inside [startHour, endHour) local time in every zone. */
export function inWindow(at: Date, zones: string[], w: CallWindow): boolean {
  return zones.every((z) => {
    const h = hourIn(z, at);
    return h >= w.startHour && h < w.endHour;
  });
}

/** The earliest minute at or after `from` that is inside the window, or null within 4 days. */
export function nextEligible(from: Date, zones: string[], w: CallWindow): Date | null {
  if (inWindow(from, zones, w)) return from;
  // Whole-minute steps, starting at the next minute boundary.
  const start = Math.floor(from.getTime() / 60_000) * 60_000 + 60_000;
  for (let i = 0; i < 4 * 24 * 60; i++) {
    const t = new Date(start + i * 60_000);
    if (inWindow(t, zones, w)) return t;
  }
  return null;
}
