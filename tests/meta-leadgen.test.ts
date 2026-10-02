import { afterEach, describe, expect, it, vi } from 'vitest';
import { extractLeadgenValues, fetchMetaLead, normalizeMetaValue, verifyMetaChallenge } from '@/lib/integrations/meta';

const fd = (name: string, ...values: string[]) => ({ name, values });

const instantForm = {
  leadgen_id: '444444444444444', page_id: 'page-1', form_id: 'form-9', form_name: 'Pool quote',
  created_time: '2026-10-01T10:00:00+0000', platform: 'ig',
  campaign_id: 'c1', campaign_name: 'Pool Masters LA', adset_id: 's1', adset_name: 'LA 35+', ad_id: 'a1', ad_name: 'Concept C',
  field_data: [
    fd('full_name', 'Jordan Rivera'), fd('phone_number', '+18185550142'), fd('email', 'jordan@example.com'),
    fd('city', 'Woodland Hills'), fd('zip_code', '91364'),
    fd('what_type_of_pool_project_do_you_need', 'New pool', 'Spa'),
    fd('when_do_you_want_to_start', 'Within 3 months'),
    fd('estimated_budget', '$80k-$120k'),
  ],
};

describe('Meta Instant Form field mapping', () => {
  it('maps contact fields, location, attribution and source identifiers', () => {
    expect(normalizeMetaValue(instantForm)).toMatchObject({
      full_name: 'Jordan Rivera', phone: '+18185550142', email: 'jordan@example.com', city: 'Woodland Hills', zip: '91364',
      campaign: 'Pool Masters LA', campaign_id: 'c1', ad_set: 'LA 35+', ad_set_id: 's1', ad: 'Concept C', ad_id: 'a1',
      form_id: 'form-9', page_id: 'page-1', external_lead_id: '444444444444444', source: 'meta', platform: 'instagram',
    });
  });
  it('maps custom pool-project, timeline and budget answers and keeps every answer verbatim', () => {
    const n = normalizeMetaValue(instantForm);
    expect(n.timeline).toBe('Within 3 months');
    expect(n.budget_range).toBe('$80k-$120k');
    expect(n.project_description).toBe('New pool, Spa');
    expect(n.answers).toEqual({
      what_type_of_pool_project_do_you_need: 'New pool, Spa',
      when_do_you_want_to_start: 'Within 3 months',
      estimated_budget: '$80k-$120k',
    });
  });
  it('builds a name from first/last, defaults the platform and tolerates a missing field_data', () => {
    const n = normalizeMetaValue({ leadgen_id: '1', field_data: [fd('first_name', 'Ana'), fd('last_name', 'Lee')] });
    expect(n.full_name).toBe('Ana Lee');
    expect(n.platform).toBe('facebook');
    expect(normalizeMetaValue({ leadgen_id: '2' }).answers).toBeNull();
  });
  it('uses the Graph lead id when no leadgen_id is present', () => {
    expect(normalizeMetaValue({ id: '555', field_data: [] }).external_lead_id).toBe('555');
  });
});

describe('Meta webhook envelope', () => {
  it('extracts only leadgen changes and tags them with the Page id', () => {
    const body = { object: 'page', entry: [{ id: 'page-1', changes: [
      { field: 'leadgen', value: { leadgen_id: 'L1' } }, { field: 'feed', value: { post_id: 'x' } },
    ] }] };
    expect(extractLeadgenValues(body)).toEqual([{ page_id: 'page-1', leadgen_id: 'L1' }]);
  });
  it('verifies the subscription handshake only with the right token', () => {
    const q = (t: string) => new URLSearchParams({ 'hub.mode': 'subscribe', 'hub.verify_token': t, 'hub.challenge': '123' });
    expect(verifyMetaChallenge(q('secret'), 'secret')).toBe('123');
    expect(verifyMetaChallenge(q('nope'), 'secret')).toBeNull();
    expect(verifyMetaChallenge(q('secret'), null)).toBeNull();
  });
});

describe('failed lead retrieval', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('sends the token in the Authorization header, never in the URL', async () => {
    const send = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'L1' }), { status: 200 }));
    vi.stubGlobal('fetch', send);
    expect(await fetchMetaLead('L1', 'tok_abc')).toEqual({ ok: true, lead: { id: 'L1' } });
    const [url, init] = send.mock.calls[0];
    expect(String(url)).not.toContain('tok_abc');
    expect(init.headers.Authorization).toBe('Bearer tok_abc');
  });
  it.each([
    [400, 'auth'], [401, 'auth'], [404, 'not_found'], [429, 'rate_limited'], [500, 'http'],
  ])('reports HTTP %i as %s instead of returning an empty lead', async (status, reason) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status })));
    expect(await fetchMetaLead('L1', 'tok')).toMatchObject({ ok: false, reason });
  });
  it('reports network errors and a missing token', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')));
    expect(await fetchMetaLead('L1', 'tok')).toEqual({ ok: false, reason: 'network' });
    expect(await fetchMetaLead('L1', null)).toEqual({ ok: false, reason: 'missing_token' });
  });
});
