import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
import { customFieldValues, deliverToGhl, ghlConfigSchema, GhlError, ghlToken, submissionNote, toE164, type GhlSubmission } from '@/lib/funnels/ghl';
import { funnelSchema } from '@/lib/funnels/schema';

const ghl = ghlConfigSchema.parse(JSON.parse(readFileSync('content/integrations/ghl-pool-masters.json', 'utf8')));
const config = funnelSchema.parse(JSON.parse(readFileSync('content/funnels/pool-remodeling.json', 'utf8')));
const submission: GhlSubmission = {
  sessionId: 'session-1', leadId: 'lead-1', config, qualified: true,
  contact: { firstName: 'Ana', lastName: 'Diaz', email: 'Ana@Example.test', phone: '(818) 555-0123' },
  answers: { service: 'resurfacing', surface: 'worn', timeline: '1_3_months', budget: 'budget_25_50k', homeowner: 'yes', zip: '91362' },
  attribution: { utm_source: 'facebook', utm_campaign: 'pool-fall', fbclid: 'fb-1', landing_page_url: 'https://homequotenet.com/estimate/pool-remodeling' },
};
type Call = { method: string; path: string; body?: Record<string, unknown>; headers: Record<string, string> };
function fakeGhl(opportunities: { id: string; status: string }[] = [], fail?: string) {
  const calls: Call[] = [];
  const fetcher = vi.fn(async (url: string, init: RequestInit) => {
    const path = url.replace('https://services.leadconnectorhq.com', '');
    const call = { method: init.method!, path, body: init.body ? JSON.parse(init.body as string) : undefined, headers: init.headers as Record<string, string> };
    calls.push(call);
    if (fail && path.startsWith(fail)) return new Response('{"message":"secret provider detail about Ana"}', { status: 422 });
    if (path === '/contacts/upsert') return Response.json({ new: false, contact: { id: 'contact-1' } });
    if (path.startsWith('/opportunities/search')) return Response.json({ opportunities });
    if (path === '/opportunities/') return Response.json({ opportunity: { id: 'opp-new' } });
    return Response.json({});
  });
  return { calls, fetcher: fetcher as unknown as typeof fetch };
}

describe('GoHighLevel API delivery', () => {
  it('upserts the contact with E.164 phone, ZIP and mapped custom fields, then tags, opportunity and note', async () => {
    const { calls, fetcher } = fakeGhl();
    expect(await deliverToGhl(ghl, 'pit-token', submission, fetcher)).toEqual({ status: 'sent', contactId: 'contact-1', opportunityId: 'opp-new' });
    expect(calls.map(c => `${c.method} ${c.path.split('?')[0]}`)).toEqual(['POST /contacts/upsert', 'POST /contacts/contact-1/tags', 'GET /opportunities/search', 'POST /opportunities/', 'POST /contacts/contact-1/notes']);
    expect(calls[0].headers).toMatchObject({ Authorization: 'Bearer pit-token', Version: '2021-07-28' });
    expect(calls[0].body).toMatchObject({ locationId: 'U7nIQhoF8ERhusX9sgD0', firstName: 'Ana', email: 'ana@example.test', phone: '+18185550123', postalCode: '91362' });
    expect(calls[0].body!.customFields).toEqual([
      { id: 'hMJxVq8uSY28MthxfPLO', field_value: ['Pool Resurfacing / Replaster'] },
      { id: 'G4MUGErTOLZgSzqe9qXS', field_value: 'Within 1–3 months' },
      { id: 'gauIxdPt5NUVuMFVfYrU', field_value: ['Yes'] },
    ]);
    expect(calls[1].body).toEqual({ tags: ['pool-funnel'] });
    expect(calls[3].body).toMatchObject({ pipelineId: 'Vy3H74kDvRTGThFPUKNd', pipelineStageId: '829de9dc-500e-445d-91d5-5ed35e3972c3', contactId: 'contact-1', status: 'open' });
    const note = calls[4].body!.body as string;
    for (const text of ['$25,000–$50,000', 'utm_campaign: pool-fall', 'fbclid: fb-1', 'Yes, I own the home', 'HomeQuote lead ID: lead-1']) expect(note).toContain(text);
  });
  it('never duplicates opportunities: keeps open/won ones and reopens lost ones', async () => {
    const open = fakeGhl([{ id: 'opp-1', status: 'open' }]);
    expect(await deliverToGhl(ghl, 't', submission, open.fetcher)).toMatchObject({ opportunityId: 'opp-1' });
    expect(open.calls.some(c => c.path === '/opportunities/')).toBe(false);
    const lost = fakeGhl([{ id: 'opp-2', status: 'lost' }]);
    await deliverToGhl(ghl, 't', submission, lost.fetcher);
    expect(lost.calls.find(c => c.method === 'PUT')).toMatchObject({ path: '/opportunities/opp-2', body: { status: 'open', pipelineStageId: ghl.pipelineStageId } });
  });
  it('skips unqualified leads when onlyQualified is on, without calling GHL', async () => {
    const { calls, fetcher } = fakeGhl();
    expect(await deliverToGhl(ghl, 't', { ...submission, qualified: false }, fetcher)).toEqual({ status: 'skipped' });
    expect(calls).toHaveLength(0);
    expect((await deliverToGhl({ ...ghl, onlyQualified: false }, 't', { ...submission, qualified: false }, fetcher)).status).toBe('sent');
  });
  it('reports only the failing step and HTTP status, never provider bodies or PII', async () => {
    const { fetcher } = fakeGhl([], '/opportunities/search');
    const error = await deliverToGhl(ghl, 't', submission, fetcher).catch(e => e);
    expect(error).toBeInstanceOf(GhlError);
    expect(error.message).toBe('GHL opportunity search failed (HTTP 422)');
    expect(new GhlError('contact upsert', 401).message).toContain('Check the Private Integration token');
  });
  it('reads the token only from the named server env var', () => {
    vi.stubEnv('GHL_POOL_MASTERS_TOKEN', 'pit-env');
    expect(ghlToken(ghl, 'db-secret')).toBe('pit-env');
    vi.stubEnv('GHL_POOL_MASTERS_TOKEN', '');
    expect(() => ghlToken(ghl, null)).toThrow('GHL_POOL_MASTERS_TOKEN is not set');
    vi.unstubAllEnvs();
  });
  it('normalizes phones and omits unanswered custom fields', () => {
    expect(toE164('818-555-0123')).toBe('+18185550123');
    expect(toE164('1 (818) 555 0123')).toBe('+18185550123');
    expect(customFieldValues(ghl, { ...submission, answers: { service: 'equipment' } })).toEqual([{ id: 'hMJxVq8uSY28MthxfPLO', field_value: ['Other'] }]);
    expect(submissionNote({ ...submission, qualified: false })).toContain('Qualified: needs review');
  });
});
