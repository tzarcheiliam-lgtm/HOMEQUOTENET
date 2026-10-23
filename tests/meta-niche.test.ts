/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
import { NICHES, nicheCustomData, nicheDataFor, nicheOf } from '@/lib/meta/niche';
import { buildEventsPayload } from '@/lib/meta/capi';
import { buildPayload, type EventRow, type LeadForMeta } from '@/lib/meta/conversions';

describe('niche tagging for the one shared Pixel', () => {
  it.each([
    ['Bathroom remodeling', 'bathroom-remodel', 'bathroom'],
    ['Bathroom', 'avinash-b', 'bathroom'],
    ['Kitchen remodeling', 'kitchen-remodel', 'kitchen'],
    ['Kitchen & bath remodeling', 'remodel', 'kitchen_bath'],
    ['ADU', 'adu-ads', 'adu'],
    ['Accessory dwelling unit', 'x', 'adu'],
    ['Pool remodeling', 'pool-remodeling', 'pool'],
    ['Pool construction & remodeling', 'pool-masters', 'pool'],
    ['Roofing', 'roof', 'roofing'],
    ['HVAC installation', 'hvac', 'hvac'],
    ['Fencing and gates', 'fence', 'fencing'],
    ['General Construction', 'bathroom-remodeling-2', 'bathroom'], // the slug says bathroom: it wins over the vague industry text
    ['General Construction', 'quote', 'remodeling'],
    ['Remodeling', 'homequote-bk', 'remodeling'],
    ['Something else', 'misc', 'other'],
    [null, null, 'other'],
  ])('%s / %s -> %s', (industry, slug, key) => {
    expect(nicheOf(industry as any, slug as any).key).toBe(key);
  });

  it('every niche has a readable label and a stable key', () => {
    for (const [k, n] of Object.entries(NICHES)) { expect(n.key).toBe(k); expect(n.label.length).toBeGreaterThan(2); }
  });

  it('builds the same custom parameters for the browser Pixel and the server', () => {
    expect(nicheDataFor('Bathroom remodeling', 'bathroom-remodel')).toEqual({ content_category: 'Bathroom Remodeling', niche: 'bathroom', content_name: 'bathroom-remodel' });
    expect(nicheCustomData(NICHES.adu, 'adu_quiz')).toEqual({ content_category: 'ADU', niche: 'adu', content_name: 'adu_quiz' });
    expect(nicheCustomData(NICHES.pool)).toEqual({ content_category: 'Pool', niche: 'pool' });
    // Parameters only: never any contact data.
    expect(JSON.stringify(nicheDataFor('Kitchen', 'k'))).not.toMatch(/@|\d{7}/);
  });
});

describe('niche tags in Conversions API payloads', () => {
  const user = { email: 'a@b.test', phone: '8185550142' };
  it('adds custom_data to a server event, and omits it when there is none', () => {
    const tagged = buildEventsPayload({ pixelId: '123456', eventName: 'Lead', eventId: 's:Lead', eventSourceUrl: 'https://x.test/estimate/k', user, customData: nicheDataFor('Kitchen remodeling', 'kitchen-remodel') });
    expect((tagged.data[0] as any).custom_data).toEqual({ content_category: 'Kitchen Remodeling', niche: 'kitchen', content_name: 'kitchen-remodel' });
    const plain = buildEventsPayload({ pixelId: '123456', eventName: 'Lead', eventId: 's:Lead', eventSourceUrl: 'https://x.test/e', user });
    expect((plain.data[0] as any).custom_data).toBeUndefined();
  });

  const lead: LeadForMeta = { id: 'L1', source: 'website', external_lead_id: null, created_at: '2026-10-06T09:00:00Z', email: 'a@b.test', phone: '8185550142', first_name: 'A', last_name: 'B', zip: '90210', fbp: 'fb.1.1.2', fbc: null, fbclid: null, ad_id: null, landing_page_url: 'https://x.test/estimate/k' };
  const row = (over: Partial<EventRow> = {}): EventRow => ({ event_name: 'WonJob', event_id: 'e1', event_time: '2026-10-06T10:00:00Z', action_source: 'other', value: null, currency: null, source_kind: 'website_pixel', ...over });
  const niche = nicheDataFor('Bathroom remodeling', 'bathroom-remodel');

  it('tags queued website-pixel events with the niche, keeping value and currency', () => {
    const won = buildPayload(row({ value: 500, currency: 'USD' }), lead, { niche });
    expect((won.data[0] as any).custom_data).toEqual({ ...niche, value: 500, currency: 'USD' });
    const sched = buildPayload(row({ event_name: 'Schedule', action_source: 'website' }), lead, { niche, eventSourceUrl: 'https://x.test/e' });
    expect((sched.data[0] as any).custom_data).toEqual(niche);
    expect((buildPayload(row({ value: 500, currency: 'USD' }), lead, {}).data[0] as any).custom_data).toEqual({ value: 500, currency: 'USD' });
  });

  it('never adds the niche to Conversions API for CRM events, whose custom_data Meta defines', () => {
    for (const kind of ['website_crm', 'instant_form_crm'] as const) {
      const p = buildPayload(row({ event_name: 'qualified', action_source: 'system_generated', source_kind: kind }), { ...lead, external_lead_id: '123456789012345' }, { niche });
      expect((p.data[0] as any).custom_data).toEqual({ event_source: 'crm', lead_event_source: 'HomeQuote Network' });
    }
  });
});
