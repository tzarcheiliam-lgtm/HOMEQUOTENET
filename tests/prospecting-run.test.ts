import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
vi.mock('server-only', () => ({}));

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Profile } from '@/lib/types';
import { runCslbImport, runRefresh, type ProgressEvent } from '@/lib/prospecting/run';
import type { CslbLicense } from '@/lib/prospecting/cslb';

/* ---- A minimal in-memory Supabase: just the calls run.ts makes ---------------- */

type Row = Record<string, unknown>;

function fakeDb(opts: { withSearchMemory?: boolean; prospects?: Row[] } = {}) {
  const tables: Record<string, Row[]> = {
    profiles: [
      { id: 'caller-1', full_name: 'Liam', email: 'liam@example.test', role: 'caller', account_status: 'active', deleted_at: null },
    ],
    contractor_prospects: [...(opts.prospects ?? [])],
    prospect_refresh_runs: [],
    prospect_search_cells: [],
    audit_logs: [],
  };
  let seq = 0;

  class Query implements PromiseLike<{ data: unknown; error: unknown }> {
    private op: 'select' | 'insert' | 'update' | 'upsert' = 'select';
    private payload: Row | Row[] | null = null;
    private filters: ((r: Row) => boolean)[] = [];
    private window: [number, number] | null = null;
    private one = false;
    private returning = false;
    constructor(private table: string) {}
    select() {
      if (this.op === 'select') this.returning = true;
      else this.returning = true;
      return this;
    }
    insert(p: Row | Row[]) { this.op = 'insert'; this.payload = p; return this; }
    update(p: Row) { this.op = 'update'; this.payload = p; return this; }
    upsert(p: Row[]) { this.op = 'upsert'; this.payload = p; return this; }
    eq(c: string, v: unknown) { this.filters.push((r) => r[c] === v); return this; }
    in(c: string, vs: unknown[]) { this.filters.push((r) => vs.includes(r[c])); return this; }
    is(c: string, v: unknown) { this.filters.push((r) => (r[c] ?? null) === v); return this; }
    order() { return this; }
    range(a: number, b: number) { this.window = [a, b]; return this; }
    single() { this.one = true; return this; }

    private run(): { data: unknown; error: unknown } {
      if (this.table === 'prospect_search_cells' && !opts.withSearchMemory) {
        return { data: null, error: { code: 'PGRST205', message: 'relation does not exist' } };
      }
      const rows = tables[this.table];
      if (this.op === 'select') {
        let out = rows.filter((r) => this.filters.every((f) => f(r)));
        if (this.window) out = out.slice(this.window[0], this.window[1] + 1);
        return { data: out, error: null };
      }
      if (this.op === 'insert') {
        const list = Array.isArray(this.payload) ? this.payload : [this.payload!];
        if (this.table === 'contractor_prospects') {
          // uq_prospects_external: all-or-nothing per statement, like Postgres.
          const taken = new Set(rows.map((r) => `${r.external_source}:${r.external_id}`));
          for (const r of list) {
            const k = `${r.external_source}:${r.external_id}`;
            if (taken.has(k)) return { data: null, error: { code: '23505', message: 'duplicate' } };
            taken.add(k);
          }
        }
        const inserted = list.map((r) => ({ id: `${this.table}-${++seq}`, ...r }));
        rows.push(...inserted);
        return { data: this.one ? inserted[0] : inserted, error: null };
      }
      if (this.op === 'update') {
        for (const r of rows.filter((x) => this.filters.every((f) => f(x)))) Object.assign(r, this.payload);
        return { data: null, error: null };
      }
      for (const r of this.payload as Row[]) {
        const i = rows.findIndex((x) => x.niche_key === r.niche_key && x.query === r.query && x.cell === r.cell);
        if (i >= 0) rows[i] = r;
        else rows.push(r);
      }
      return { data: null, error: null };
    }
    then<A, B>(ok?: ((v: { data: unknown; error: unknown }) => A | PromiseLike<A>) | null, bad?: ((e: unknown) => B | PromiseLike<B>) | null) {
      return Promise.resolve(this.run()).then(ok, bad);
    }
  }

  return { tables, client: { from: (t: string) => new Query(t) } as unknown as SupabaseClient };
}

const me = { id: 'admin-1', role: 'admin', is_active: true } as unknown as Profile;

async function collect(fn: (emit: (e: ProgressEvent) => void) => Promise<void>) {
  const events: ProgressEvent[] = [];
  await fn((e) => {
    events.push(e);
  });
  const done = events.find((e) => e.type === 'done');
  return { events, done: done as Extract<ProgressEvent, { type: 'done' }> | undefined };
}

/* ---- A simulated Google: real 60-result cap, rectangle restriction ------------- */

interface FakePlace {
  id: string;
  lat: number;
  lng: number;
  phone: string;
}

// 260 pool contractors packed into one corner of Los Angeles (far more than 60),
// plus 20 spread over Ventura. Synthetic: names, ids and 555 numbers are invented.
const world: FakePlace[] = [
  ...Array.from({ length: 260 }, (_, i) => ({
    id: `la-${i}`,
    lat: 34.0 + (i % 20) * 0.006,
    lng: -118.45 + Math.floor(i / 20) * 0.007,
    phone: `(818) 555-${String(1000 + i)}`,
  })),
  ...Array.from({ length: 20 }, (_, i) => ({
    id: `ven-${i}`,
    lat: 34.1 + i * 0.03,
    lng: -119.2 + i * 0.02,
    phone: `(805) 555-${String(2000 + i)}`,
  })),
];

const firstPages: string[] = [];

function placesFetch() {
  return vi.fn(async (_url: string, init: { body: string }) => {
    const body = JSON.parse(init.body);
    const rect = body.locationRestriction.rectangle;
    const inside = world
      .filter(
        (p) =>
          p.lat >= rect.low.latitude && p.lat < rect.high.latitude && p.lng >= rect.low.longitude && p.lng < rect.high.longitude
      )
      .slice(0, 60); // Google never returns more than 60 for one search
    const start = body.pageToken ? Number(body.pageToken) : 0;
    if (!body.pageToken) firstPages.push(`${body.textQuery}|${JSON.stringify(rect)}`);
    const page = inside.slice(start, start + 20);
    const next = start + 20 < inside.length ? String(start + 20) : undefined;
    return new Response(
      JSON.stringify({
        places: page.map((p) => ({
          id: p.id,
          displayName: { text: `Test Pool Builders ${p.id}` },
          nationalPhoneNumber: p.phone,
          addressComponents: [
            { longText: p.id.startsWith('la') ? 'Encino' : 'Camarillo', types: ['locality'] },
            { longText: p.id.startsWith('la') ? 'Los Angeles County' : 'Ventura County', types: ['administrative_area_level_2'] },
          ],
          types: ['swimming_pool_contractor'],
          primaryType: 'swimming_pool_contractor',
          businessStatus: 'OPERATIONAL',
        })),
        ...(next ? { nextPageToken: next } : {}),
      }),
      { status: 200 }
    );
  });
}

beforeEach(() => {
  process.env.GOOGLE_PLACES_API_KEY = 'test-key';
  firstPages.length = 0;
  vi.stubGlobal('fetch', placesFetch());
});
afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.GOOGLE_PLACES_API_KEY;
});

const req = (perCaller: number) => ({ nicheSlug: 'pool', callerIds: ['caller-1'], perCaller });

describe('runRefresh over the map grid', () => {
  it('gets past the 60-result cap and continues where the last run stopped', async () => {
    const db = fakeDb({ withSearchMemory: true });

    const first = await collect((emit) => runRefresh(db.client, me, req(100), emit));
    expect(first.done?.added).toBe(100);
    expect(db.tables.prospect_search_cells.some((c) => c.status === 'split')).toBe(true);
    const searchedFirst = new Set(firstPages);

    firstPages.length = 0;
    const second = await collect((emit) => runRefresh(db.client, me, req(100), emit));
    expect(second.done?.added).toBe(100);
    // Squares the first run finished as 'done' are not searched again.
    const doneKeys = db.tables.prospect_search_cells.filter((c) => c.status === 'done');
    expect(doneKeys.length).toBeGreaterThan(0);
    expect(firstPages.filter((k) => searchedFirst.has(k)).length).toBeLessThan(searchedFirst.size);

    // Keep going until Google has nothing new: every one of the 280 is reached.
    let exhausted = false;
    for (let i = 0; i < 10 && !exhausted; i++) {
      const next = await collect((emit) => runRefresh(db.client, me, req(250), emit));
      exhausted = !!next.done?.exhausted;
    }
    expect(exhausted).toBe(true);
    expect(db.tables.contractor_prospects).toHaveLength(world.length);
    expect(new Set(db.tables.contractor_prospects.map((p) => p.external_id)).size).toBe(world.length);
    expect(db.tables.contractor_prospects.every((p) => p.assigned_to === 'caller-1' && p.source === 'refresh')).toBe(true);
  });

  it('still works before migration 0074, just without memory', async () => {
    const db = fakeDb({ withSearchMemory: false });
    const run = await collect((emit) => runRefresh(db.client, me, req(50), emit));
    expect(run.done?.added).toBe(50);
    expect(run.events.some((e) => e.type === 'progress' && /migration 0074/.test(e.message))).toBe(true);
  });

  it('records a failed search as a failed run', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: { message: 'API key not valid' } }), { status: 400 })));
    const db = fakeDb({ withSearchMemory: true });
    const run = await collect((emit) => runRefresh(db.client, me, req(10), emit));
    expect(run.events.at(-1)).toMatchObject({ type: 'error', message: 'API key not valid' });
    expect(db.tables.prospect_refresh_runs[0].status).toBe('failed');
  });
});

/* ---- CSLB import ------------------------------------------------------------- */

const lic = (n: string, over: Partial<CslbLicense> = {}): CslbLicense => ({
  licenseNumber: n,
  businessName: `TEST POOLS ${n}`,
  businessType: 'Corporation',
  address: null,
  city: 'OXNARD',
  zip: '93030',
  county: 'Ventura',
  phone: `(805) 555-${3000 + Number(n)}`,
  classes: ['C-53'],
  status: 'CLEAR',
  workersComp: 'insured',
  ...over,
});

describe('runCslbImport', () => {
  it('adds new licensees, skips history and inactive ones, and says how many are left', async () => {
    const db = fakeDb({
      prospects: [{ id: 'old', company_name: 'Old Co', city: 'Oxnard', phone_e164: '+18055553004', external_source: 'google_places', external_id: 'g1' }],
    });
    const licenses = [
      lic('1', { workersComp: 'exempt' }),
      lic('2'),
      lic('3'),
      lic('4'), // same phone as an existing prospect
      lic('5', { status: 'EXPIRED' }),
      lic('2'), // listed twice
    ];
    const r1 = { nicheSlug: 'pool', callerIds: ['caller-1'], perCaller: 2, fileName: 'list.xlsx', licenses };

    const first = await collect((emit) => runCslbImport(db.client, me, r1, emit));
    expect(first.done).toMatchObject({ added: 2, duplicates: 1, unqualified: 1, remaining: 1 });
    const added = db.tables.contractor_prospects.filter((p) => p.source === 'cslb');
    expect(added.map((p) => p.external_id).sort()).toEqual(['2', '3']); // workers' comp first
    expect(added[0]).toMatchObject({ assigned_to: 'caller-1', external_source: 'cslb', niche: 'Pool Contractors' });
    expect(db.tables.prospect_refresh_runs[0]).toMatchObject({ provider: 'cslb', status: 'completed', added_count: 2 });

    const second = await collect((emit) => runCslbImport(db.client, me, r1, emit));
    expect(second.done).toMatchObject({ added: 1, remaining: 0 });
    expect(db.tables.contractor_prospects.filter((p) => p.source === 'cslb')).toHaveLength(3);
  });
});
