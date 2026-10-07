// SIMULATED / pure-logic tests.
import { describe, expect, it } from 'vitest';
import { zonedLocalToIso } from '@/lib/meta/studio/time';
import { trackingHealth } from '@/lib/meta/studio/health';
import { probeVideoParts } from '@/lib/meta/studio/media-probe';

describe('zonedLocalToIso', () => {
  it('uses the account timezone offset, including across DST', () => {
    expect(zonedLocalToIso('2026-07-01T09:00', 'America/Los_Angeles')).toBe('2026-07-01T09:00:00-07:00'); // PDT
    expect(zonedLocalToIso('2026-12-01T09:00', 'America/Los_Angeles')).toBe('2026-12-01T09:00:00-08:00'); // PST
    expect(zonedLocalToIso('2026-10-07T12:30', 'UTC')).toBe('2026-10-07T12:30:00+00:00');
    expect(zonedLocalToIso('2026-03-01T08:00', 'Asia/Kolkata')).toBe('2026-03-01T08:00:00+05:30');
  });
  it('rejects malformed input', () => expect(zonedLocalToIso('tomorrow', 'UTC')).toBeNull());
});

describe('trackingHealth', () => {
  const now = new Date('2026-10-10T00:00:00Z');
  const ev = (status: 'accepted' | 'failed', test_mode = false) => ({ status, test_mode });
  it('is unknown (not healthy) with no verification and no failures', () => expect(trackingHealth({ now, verifiedAt: null, recentEvents: [] }).healthy).toBeNull());
  it('is healthy only after a recent manual verification', () => {
    expect(trackingHealth({ now, verifiedAt: '2026-10-01T00:00:00Z', recentEvents: [] }).healthy).toBe(true);
    expect(trackingHealth({ now, verifiedAt: '2026-08-01T00:00:00Z', recentEvents: [] }).healthy).toBeNull(); // expired
  });
  it('is unhealthy when most recent real deliveries fail, regardless of verification', () => {
    const events = [ev('failed'), ev('failed'), ev('failed'), ev('accepted')];
    expect(trackingHealth({ now, verifiedAt: '2026-10-09T00:00:00Z', recentEvents: events }).healthy).toBe(false);
  });
  it('ignores test-mode events', () => {
    expect(trackingHealth({ now, verifiedAt: '2026-10-09T00:00:00Z', recentEvents: [ev('failed', true), ev('failed', true), ev('failed', true), ev('failed', true)] }).healthy).toBe(true);
  });
});

describe('probeVideoParts', () => {
  const u32 = (n: number) => { const b = Buffer.alloc(4); b.writeUInt32BE(n); return b; };
  const box = (type: string, ...p: Buffer[]) => { const body = Buffer.concat(p); return Buffer.concat([u32(8 + body.length), Buffer.from(type, 'latin1'), body]); };
  it('finds the moov box at the END of a large file and combines it with the ftyp header', () => {
    const ftyp = box('ftyp', Buffer.from('isom', 'latin1'), u32(0));
    const mvhd = box('mvhd', Buffer.concat([u32(0), u32(0), u32(0), u32(1000), u32(42_000), Buffer.alloc(80)]));
    const head = Buffer.concat([ftyp, box('mdat', Buffer.alloc(5000))]); // moov not in the head
    const tail = Buffer.concat([Buffer.alloc(300), box('moov', mvhd)]);
    expect(probeVideoParts(head, tail)?.durationSeconds).toBe(42);
  });
  it('returns nothing useful for non-video bytes', () => expect(probeVideoParts(Buffer.from('not a video at all, just text'), null)).toBeNull());
});
