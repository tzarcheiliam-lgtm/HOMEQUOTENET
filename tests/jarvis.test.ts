import { describe, expect, it } from 'vitest';
// Plain ESM helpers of the separate Jarvis app (jarvis/), typed through their JSDoc.
import { briefingDue, localMidnight, localParts, parseClock, todayRange, withinActiveHours } from '../jarvis/lib/schedule.mjs';
import { HANDOFF_PINGS_MIN, planHandoffAlerts, planHealthAlerts, seedHandoffs } from '../jarvis/lib/alerts.mjs';
import { clip, formatStatus, formatToday, formatWaiting, shortName, splitMessage, templateBriefing } from '../jarvis/lib/format.mjs';
import { parseEnv } from '../jarvis/lib/config.mjs';

const LA = 'America/Los_Angeles';
const at = (iso: string) => new Date(iso);

describe('jarvis schedule (Los Angeles time, DST-safe)', () => {
  it('reads wall-clock time in LA', () => {
    expect(localParts(at('2026-11-04T15:05:00Z'), LA)).toMatchObject({ date: '2026-11-04', hour: 7, minute: 5 });
    expect(localParts(at('2026-07-04T15:05:00Z'), LA)).toMatchObject({ date: '2026-07-04', hour: 8 }); // PDT
  });

  it('finds local midnight, including on the DST change day', () => {
    expect(localMidnight('2026-11-04', LA).toISOString()).toBe('2026-11-04T08:00:00.000Z');
    expect(localMidnight('2026-07-04', LA).toISOString()).toBe('2026-07-04T07:00:00.000Z');
    expect(localMidnight('2026-11-01', LA).toISOString()).toBe('2026-11-01T07:00:00.000Z'); // fall back day starts in PDT
    const r = todayRange(at('2026-11-01T20:00:00Z'), LA); // 25-hour day
    expect([r.from.toISOString(), r.to.toISOString()]).toEqual(['2026-11-01T07:00:00.000Z', '2026-11-02T08:00:00.000Z']);
  });

  it('sends the briefing once, inside the grace window only', () => {
    const sevenOhFive = at('2026-11-04T15:05:00Z');
    expect(briefingDue(sevenOhFive, LA, '07:00', null)).toBe(true);
    expect(briefingDue(sevenOhFive, LA, '07:00', '2026-11-04')).toBe(false);
    expect(briefingDue(at('2026-11-04T14:59:00Z'), LA, '07:00', null)).toBe(false); // 6:59
    expect(briefingDue(at('2026-11-04T18:01:00Z'), LA, '07:00', null)).toBe(false); // 10:01, too late
    expect(() => parseClock('7am')).toThrow();
  });

  it('knows active hours', () => {
    expect(withinActiveHours(at('2026-11-04T14:59:00Z'), LA)).toBe(false); // 6:59
    expect(withinActiveHours(at('2026-11-04T15:00:00Z'), LA)).toBe(true);
    expect(withinActiveHours(at('2026-11-05T05:00:00Z'), LA)).toBe(false); // 21:00
  });
});

describe('jarvis handoff alerts', () => {
  const item = (link: string, lead = 'Sergio Martinez Sandoval') => ({ lead, link, summary: 'Wants a quote', since: '2026-11-04T19:00:00Z' });
  const t0 = at('2026-11-04T19:00:00Z');
  const plus = (min: number) => new Date(t0.getTime() + min * 60000);

  it('alerts right away, then after 1 h and 4 h, then stops', () => {
    expect(HANDOFF_PINGS_MIN).toEqual([0, 60, 240]);
    let state: Record<string, { firstSeen: string; pings: number }> = {};
    const sent: number[] = [];
    for (const m of [0, 5, 59, 60, 65, 240, 300, 600]) {
      const r = planHandoffAlerts(state, [item('a')], plus(m), true);
      for (const s of r.send) sent.push(s.nth);
      state = r.next;
    }
    expect(sent).toEqual([0, 1, 2]);
  });

  it('holds alerts outside active hours and sends only the latest one due after', () => {
    let r = planHandoffAlerts({}, [item('a')], t0, false);
    expect(r.send).toEqual([]);
    r = planHandoffAlerts(r.next, [item('a')], plus(300), true); // 5 h later: one reminder, not three
    expect(r.send.map((s: { nth: number }) => s.nth)).toEqual([2]);
  });

  it('forgets handled conversations and seeds the first run without a burst', () => {
    const seeded = seedHandoffs([item('a'), item('b')], t0);
    expect(planHandoffAlerts(seeded, [item('a'), item('b')], plus(1), true).send).toEqual([]);
    expect(Object.keys(planHandoffAlerts(seeded, [item('b')], plus(1), true).next)).toEqual(['b']);
  });
});

describe('jarvis health alerts', () => {
  it('alerts once when something breaks and once when it recovers', () => {
    const texting = { texting_on: true, mac_bridge: { connected: false } };
    let r = planHealthAlerts({}, [{ name: 'Main scheduler', note: 'Hasn’t run since 3 h ago.' }], texting);
    expect(r.bad.map((b: { key: string }) => b.key)).toEqual(['Main scheduler', 'mac_bridge']);
    r = planHealthAlerts(r.next, [{ name: 'Main scheduler', note: 'Hasn’t run since 4 h ago.' }], texting);
    expect(r.bad).toEqual([]);
    r = planHealthAlerts(r.next, [], { texting_on: true, mac_bridge: { connected: true } });
    expect(r.recovered).toEqual(['Main scheduler', 'mac_bridge']);
  });
});

describe('jarvis messages', () => {
  const now = at('2026-11-04T21:00:00Z');
  it('keeps names short and text clipped', () => {
    expect(shortName('Sergio Martinez Sandoval')).toBe('Sergio S.');
    expect(shortName('Cher')).toBe('Cher');
    expect(shortName('')).toBe('Someone');
    expect(clip('one two three four five', 12)).toBe('one two…');
  });

  it('formats the waiting list oldest first, with links and no phone numbers', () => {
    const out = formatWaiting([
      { lead: 'Amber Maldonado', link: 'https://x/app/leads/2', summary: 'Tile and coping', since: '2026-11-02T23:17:00Z' },
      { lead: 'Mehrzad Dalaei', link: 'https://x/app/leads/1', summary: 'Full backyard', since: '2026-11-01T21:21:00Z' },
    ], now);
    expect(out.indexOf('Mehrzad D.')).toBeLessThan(out.indexOf('Amber M.'));
    expect(out).toContain('https://x/app/leads/1');
    expect(formatWaiting([], now)).toMatch(/Nobody/);
  });

  it('formats status, today and the template briefing', () => {
    expect(formatStatus({ texting_on: true, mac_bridge: { connected: true, last_check_in: '2026-11-04T20:58:00Z' }, need_a_person: [] }, [], now)).toMatch(/healthy/);
    const appts = [{ scheduled_at: '2026-11-04T19:30:00Z', status: 'scheduled', lead: { name: 'Jayant Kumar', city: 'Irvine' }, contractor: 'Pool Masters' }, { scheduled_at: '2026-11-04T20:00:00Z', status: 'cancelled', lead: { name: 'X Y' } }];
    expect(formatToday(appts, LA)).toBe('Today (1):\n• 11:30 AM Jayant K., Irvine · Pool Masters (scheduled)');
    const b = templateBriefing({ summary: { newLeads: 3, bySource: { meta: 3 }, appointmentsBooked: 1, texts: { received: 4 } }, texting: { texting_on: true, mac_bridge: { connected: false }, need_a_person: [] }, appointments: appts, attention: [], tz: LA, now });
    expect(b).toContain('3 new leads (meta 3)');
    expect(b).toContain('Mac texting bridge is not connected');
  });

  it('splits long messages under the Telegram limit', () => {
    const parts = splitMessage(`${'a'.repeat(3000)}\n\n${'b'.repeat(3000)}`);
    expect(parts).toHaveLength(2);
    expect(parts.every((p: string) => p.length <= 3900)).toBe(true);
  });
});

describe('jarvis settings file', () => {
  it('parses KEY=value lines, comments and quotes', () => {
    expect(parseEnv('# c\nHQ_URL=https://a.com\nX="q v"\n\nBAD\nT=1:2=3')).toEqual({ HQ_URL: 'https://a.com', X: 'q v', T: '1:2=3' });
  });
});
