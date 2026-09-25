import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resetUpsellTracking, trackUpsell, type UpsellEventDetail } from '@/lib/growth/track';

const g = globalThis as unknown as { window?: EventTarget };
let events: UpsellEventDetail[] = [];

beforeEach(() => {
  g.window = new EventTarget();
  events = [];
  g.window.addEventListener('hqn:upsell', (e) => events.push((e as CustomEvent<UpsellEventDetail>).detail));
  resetUpsellTracking();
});
afterEach(() => {
  delete g.window;
});

describe('upsell tracking events', () => {
  it('emits viewed, clicked and requested with contractor, type and timestamp', () => {
    trackUpsell('upsell_viewed', 'c1', 'ai_receptionist');
    trackUpsell('upsell_clicked', 'c1', 'ai_receptionist');
    trackUpsell('upsell_requested', 'c1', 'ai_receptionist');
    expect(events.map((e) => e.event)).toEqual(['upsell_viewed', 'upsell_clicked', 'upsell_requested']);
    for (const e of events) {
      expect(e).toMatchObject({ contractor_id: 'c1', upsell_type: 'ai_receptionist' });
      expect(Number.isNaN(Date.parse(e.timestamp))).toBe(false);
      expect(Object.keys(e).sort()).toEqual(['contractor_id', 'event', 'timestamp', 'upsell_type']);
    }
  });

  it('counts a view once per upsell per page load', () => {
    trackUpsell('upsell_viewed', 'c1', 'website');
    trackUpsell('upsell_viewed', 'c1', 'website');
    trackUpsell('upsell_viewed', 'c1', 'crm_setup');
    trackUpsell('upsell_clicked', 'c1', 'website');
    trackUpsell('upsell_clicked', 'c1', 'website');
    expect(events.map((e) => `${e.event}:${e.upsell_type}`)).toEqual([
      'upsell_viewed:website',
      'upsell_viewed:crm_setup',
      'upsell_clicked:website',
      'upsell_clicked:website',
    ]);
  });

  it('does nothing on the server', () => {
    delete g.window;
    expect(() => trackUpsell('upsell_viewed', 'c1', 'website')).not.toThrow();
  });
});
