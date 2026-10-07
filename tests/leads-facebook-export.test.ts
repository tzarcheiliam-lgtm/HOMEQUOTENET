/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
  getProfile: vi.fn(), listLeads: vi.fn(), sessions: [] as { id: string }[], audit: vi.fn(), sessionQueries: [] as string[][],
}));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/auth', () => ({ getProfile: m.getProfile }));
vi.mock('@/lib/data/leads', () => ({ listLeads: m.listLeads }));
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (t: string) => {
      if (t === 'audit_logs') return { insert: m.audit };
      const chain: any = { select: () => chain, in: (_c: string, ids: string[]) => { m.sessionQueries.push(ids); return chain; }, eq: () => chain,
        then: (res: any) => res({ data: m.sessions.filter((s) => m.sessionQueries.at(-1)!.includes(s.id)), error: null }) };
      return chain;
    },
  }),
}));

import { buildFacebookExport, csvCell, metaEmail, metaPhone, metaState, metaZip, toFacebookRow, FACEBOOK_COLUMNS, type ExportableLead } from '@/lib/leads/facebook-export';
import { filtersToQuery, parseLeadFilters } from '@/lib/leads/filters';
import { loadLeadsForExport, optedOutLeadIds, MAX_EXPORT_LEADS } from '@/lib/leads/facebook-export.server';
import { GET } from '@/app/api/leads/export/facebook/route';

const lead = (o: Partial<ExportableLead> = {}): ExportableLead => ({
  id: crypto.randomUUID(), first_name: 'Ada', last_name: 'Lovelace', email: 'Ada@Example.com ', email_normalized: 'ada@example.com', phone: '(310) 555-0123', phone_e164: '+13105550123',
  city: 'Los Angeles', state: 'CA', zip: '90210-1234', source: 'website', external_lead_id: null, ...o,
});

describe('Meta formatting', () => {
  it('normalises every column the way Meta asks', () => {
    expect(toFacebookRow(lead())).toEqual({ email: 'ada@example.com', phone: '13105550123', fn: 'ada', ln: 'lovelace', zip: '90210', ct: 'losangeles', st: 'ca', country: 'us' });
    expect(toFacebookRow(lead({ first_name: "  Mary-Ann O'Neil ", last_name: 'de la Cruz Jr.', city: "St. Mary's-by-the-Sea" }))).toMatchObject({ fn: 'maryannoneil', ln: 'delacruzjr', ct: 'stmarysbythesea' });
    expect(toFacebookRow(lead({ first_name: 'José', last_name: 'Müller' }))).toMatchObject({ fn: 'josé', ln: 'müller' });
  });
  it('phones: country code + digits only; trusts E.164, repairs 10/11-digit US numbers, drops junk', () => {
    expect(metaPhone({ phone: null, phone_e164: '+13105550123' })).toBe('13105550123');
    expect(metaPhone({ phone: '310.555.0123', phone_e164: null })).toBe('13105550123');
    expect(metaPhone({ phone: '1-310-555-0123', phone_e164: null })).toBe('13105550123');
    for (const bad of ['555-0123', '000-000-0000', '+442071838750', '12345', '']) expect(metaPhone({ phone: bad, phone_e164: null })).toBe('');
    expect(metaPhone({ phone: null, phone_e164: '+442071838750' })).toBe('');   // US/Canada only: country is always "us"
  });
  it('emails, ZIPs and states: valid ones pass, invalid ones become empty (never guessed)', () => {
    expect(metaEmail({ email: ' Foo@Bar.COM ', email_normalized: null })).toBe('foo@bar.com');
    expect(metaEmail({ email: 'not an email', email_normalized: null })).toBe('');
    expect(metaZip('90210')).toBe('90210'); expect(metaZip('90210-1234')).toBe('90210'); expect(metaZip('9021')).toBe(''); expect(metaZip('K1A 0B1')).toBe('');
    expect(metaState('CA')).toBe('ca'); expect(metaState('California')).toBe(''); expect(metaState(null)).toBe('');
  });
});

describe('CSV building', () => {
  it('writes the header, CRLF rows, and quotes cells that need it', () => {
    const { csv, counts } = buildFacebookExport([lead()]);
    expect(csv).toBe(`${FACEBOOK_COLUMNS.join(',')}\r\nada@example.com,13105550123,ada,lovelace,90210,losangeles,ca,us\r\n`);
    expect(counts).toMatchObject({ considered: 1, exported: 1 });
    expect(csvCell('a,b')).toBe('"a,b"'); expect(csvCell('say "hi"')).toBe('"say ""hi"""'); expect(csvCell('line\nbreak')).toBe('"line\nbreak"');
  });
  it('defuses spreadsheet formulas', () => {
    for (const evil of ['=1+1', '+SUM(A1)', '-2+3', '@cmd']) expect(csvCell(evil).startsWith("'")).toBe(true);
    expect(csvCell('plain')).toBe('plain');
  });
  it('skips people with no usable contact, lists each person once, and counts why', () => {
    const a = lead({ email: 'x@example.com', email_normalized: 'x@example.com', phone: null, phone_e164: null });
    const dupByEmail = lead({ email: 'X@example.com', email_normalized: 'x@example.com', phone: '(212) 555-0000', phone_e164: '+12125550000' });
    const dupByPhone = lead({ email: 'other@example.com', email_normalized: 'other@example.com', phone: '(212) 555-0000', phone_e164: '+12125550000' });
    const none = lead({ email: null, email_normalized: null, phone: 'abc', phone_e164: null });
    const { csv, counts } = buildFacebookExport([a, dupByEmail, dupByPhone, none]);
    expect(counts).toEqual({ considered: 4, exported: 1, noContact: 1, duplicates: 2, optedOut: 0 });
    expect(csv.trim().split('\r\n')).toHaveLength(2);
  });
  it('leaves out leads that declined advertising measurement, before anything else', () => {
    const keep = lead({ id: 'keep' }), drop = lead({ id: 'drop', email: 'drop@example.com', email_normalized: 'drop@example.com', phone: '(415) 555-0000', phone_e164: '+14155550000' });
    const { csv, counts } = buildFacebookExport([keep, drop], new Set(['drop']));
    expect(csv).not.toContain('drop@example.com');
    expect(counts).toMatchObject({ exported: 1, optedOut: 1, duplicates: 0 });
  });
  it('an empty selection still produces a valid header-only file', () => {
    expect(buildFacebookExport([]).csv).toBe(`${FACEBOOK_COLUMNS.join(',')}\r\n`);
  });
});

describe('filters', () => {
  it('parses the same filters as the Leads page and re-serialises only known ones', () => {
    const sp = { q: 'smith', status: 'new', date_from: '2026-10-01', review: 'needs_qualification', evil: 'x', archived: 'all', contractor_id: '' };
    expect(parseLeadFilters(sp)).toMatchObject({ q: 'smith', status: 'new', date_from: '2026-10-01', qualification_status: 'needs_qualification', archived: 'all', contractor_id: undefined });
    expect(parseLeadFilters({}).archived).toBe('active');
    expect(parseLeadFilters({ review: 'bogus' }).qualification_status).toBeUndefined();
    const q = new URLSearchParams(filtersToQuery(sp));
    expect(Object.fromEntries(q)).toEqual({ q: 'smith', status: 'new', date_from: '2026-10-01', review: 'needs_qualification', archived: 'all' });
  });
});

describe('server loading', () => {
  beforeEach(() => { m.listLeads.mockReset(); m.sessions = []; m.sessionQueries = []; });
  it('reads every page (not just the first 1000) until a short page', async () => {
    const full = Array.from({ length: 500 }, () => lead());
    m.listLeads.mockResolvedValueOnce(full).mockResolvedValueOnce(full).mockResolvedValueOnce(full.slice(0, 7));
    const r = await loadLeadsForExport({});
    expect(r.leads).toHaveLength(1007); expect(r.truncated).toBe(false);
    expect(m.listLeads.mock.calls.map((c) => c[1].range)).toEqual([[0, 499], [500, 999], [1000, 1499]]);
  });
  it('stops at the safety cap and says so', async () => {
    m.listLeads.mockResolvedValue(Array.from({ length: 500 }, () => lead()));
    const r = await loadLeadsForExport({});
    expect(r.truncated).toBe(true); expect(r.leads).toHaveLength(MAX_EXPORT_LEADS);
  });
  it('finds opt-outs by funnel session, only for website leads with a real session id', async () => {
    const sid = '11111111-1111-4111-8111-111111111111';
    const optedOut = lead({ id: 'L1', source: 'website', external_lead_id: sid });
    const other = lead({ id: 'L2', source: 'website', external_lead_id: '22222222-2222-4222-8222-222222222222' });
    const meta = lead({ id: 'L3', source: 'meta', external_lead_id: sid });                 // a Meta lead id is not a funnel session
    const junk = lead({ id: 'L4', source: 'website', external_lead_id: 'not-a-uuid' });
    m.sessions = [{ id: sid }];
    const out = await optedOutLeadIds([optedOut, other, meta, junk]);
    expect([...out]).toEqual(['L1']);
    expect(m.sessionQueries.flat().sort()).toEqual(['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222']);
  });
});

describe('GET /api/leads/export/facebook', () => {
  const req = (qs = '', headers: Record<string, string> = {}) => new Request(`https://crm.test/api/leads/export/facebook${qs}`, { headers });
  const admin = { id: 'admin-1', role: 'admin', is_active: true, contractor_id: null, can_export_company_data: false };
  beforeEach(() => { m.getProfile.mockReset(); m.listLeads.mockReset().mockResolvedValue([lead()]); m.audit.mockReset().mockResolvedValue({ error: null }); m.sessions = []; });

  it('requires sign-in and permission (setters and contractors without the export right are refused)', async () => {
    m.getProfile.mockResolvedValue(null);
    expect((await GET(req())).status).toBe(401);
    m.getProfile.mockResolvedValue({ ...admin, is_active: false });
    expect((await GET(req())).status).toBe(401);
    m.getProfile.mockResolvedValue({ id: 's', role: 'setter', is_active: true, contractor_id: null, can_export_company_data: false });
    expect((await GET(req())).status).toBe(403);
    m.getProfile.mockResolvedValue({ id: 'c', role: 'contractor', is_active: true, contractor_id: 'c1', can_export_company_data: false });
    expect((await GET(req())).status).toBe(403);
    expect(m.listLeads).not.toHaveBeenCalled();
    expect(m.audit).not.toHaveBeenCalled();
  });
  it('refuses requests a third-party page triggers (cross-site)', async () => {
    m.getProfile.mockResolvedValue(admin);
    expect((await GET(req('', { 'sec-fetch-site': 'cross-site' }))).status).toBe(403);
    expect(m.listLeads).not.toHaveBeenCalled();
  });
  it('gives an admin the CSV as a download, applies the page filters, and records the export', async () => {
    m.getProfile.mockResolvedValue(admin);
    const res = await GET(req('?status=new&q=ada', { 'sec-fetch-site': 'same-origin' }));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/csv');
    expect(res.headers.get('content-disposition')).toMatch(/^attachment; filename="leads-facebook-\d{4}-\d{2}-\d{2}\.csv"$/);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(await res.text()).toBe(`${FACEBOOK_COLUMNS.join(',')}\r\nada@example.com,13105550123,ada,lovelace,90210,losangeles,ca,us\r\n`);
    expect(m.listLeads.mock.calls[0][0]).toMatchObject({ status: 'new', q: 'ada', archived: 'active' });
    expect(m.audit).toHaveBeenCalledWith(expect.objectContaining({ actor_id: 'admin-1', action: 'leads.export_facebook', metadata: expect.objectContaining({ exported: 1, considered: 1 }) }));
    expect(JSON.stringify(m.audit.mock.calls)).not.toContain('ada@example.com');   // the log records counts, never the data
  });
  it('lets a contractor with the export right download (their own rows are limited by row-level access)', async () => {
    m.getProfile.mockResolvedValue({ id: 'c', role: 'contractor', is_active: true, contractor_id: 'c1', can_export_company_data: true });
    expect((await GET(req())).status).toBe(200);
  });
  it('reports a build failure without leaking details', async () => {
    m.getProfile.mockResolvedValue(admin);
    m.listLeads.mockRejectedValue(new Error('secret db detail'));
    const res = await GET(req());
    expect(res.status).toBe(500);
    expect(await res.text()).not.toContain('secret db detail');
  });
});
