import { inWindow as inCallWindow } from '@/lib/ai-calling/timezone';

/**
 * "Wait until the next business-hours window". Pure: `now` is injected.
 * A window is: allowed weekdays x [startHour, endHour) in local time. The local
 * time is the homeowner's (strictest of their zones, like the AI-call window) or a
 * fixed zone. Never sleeps; the engine stores the returned instant in resume_at.
 */
export interface BusinessHoursConfig {
  days: number[];
  startHour: number;
  endHour: number;
  zone: 'lead' | 'fixed';
  timezone: string;
  minimumDelayMinutes: number;
}

const dowFormatters = new Map<string, Intl.DateTimeFormat>();
function weekdayIn(zone: string, at: Date): number {
  let f = dowFormatters.get(zone);
  if (!f) { f = new Intl.DateTimeFormat('en-US', { timeZone: zone, weekday: 'short' }); dowFormatters.set(zone, f); }
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(f.format(at));
}

export function inBusinessHours(at: Date, zones: string[], cfg: Pick<BusinessHoursConfig, 'days' | 'startHour' | 'endHour'>): boolean {
  return zones.every((z) => cfg.days.includes(weekdayIn(z, at))) && inCallWindow(at, zones, { startHour: cfg.startHour, endHour: cfg.endHour });
}

export interface BusinessWindowResult {
  resumeAt: Date;
  zones: string[];
  /** The homeowner's time zone was unknown, so the node's fixed zone was used. */
  usedFallbackZone: boolean;
}

/** Earliest quarter-hour at/after now + minimum delay that is inside the window, within 15 days. */
export function nextBusinessWindow(now: Date, cfg: BusinessHoursConfig, leadZones: string[] | null): BusinessWindowResult | null {
  const usedFallbackZone = cfg.zone === 'lead' && !leadZones;
  const zones = cfg.zone === 'lead' && leadZones ? leadZones : [cfg.timezone];
  const from = new Date(now.getTime() + cfg.minimumDelayMinutes * 60_000);
  if (cfg.minimumDelayMinutes === 0 && inBusinessHours(from, zones, cfg)) return { resumeAt: from, zones, usedFallbackZone };
  const step = 15 * 60_000;
  const start = Math.ceil(from.getTime() / step) * step;
  for (let i = 0; i < 15 * 96; i += 1) {
    const t = new Date(start + i * step);
    if (inBusinessHours(t, zones, cfg)) return { resumeAt: t, zones, usedFallbackZone };
  }
  return null;
}
