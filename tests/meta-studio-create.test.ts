// SIMULATED: a fake in-memory "Meta" proves HQN's logic (idempotency, partial failure, gating, validation).
// It does NOT prove Meta accepts these payloads - that needs the live paused-test step in docs/meta-ads-setup.md.
import { describe, expect, it } from 'vitest';
import { executeDraft, type CreatedObjects } from '@/lib/meta/studio/create-ad';
import { buildPlan, draftConfigSchema, draftTag, eligibleGoals, toMinorUnits, validateDraft, type DraftConfig, type DraftContext } from '@/lib/meta/studio/draft';
import { checkAutomationGate, checkWriteGate } from '@/lib/meta/studio/gate';
import { probeImage, probeMedia } from '@/lib/meta/studio/media-probe';
import { cleanTags, validateCreative } from '@/lib/meta/studio/creative-specs';
import { buildDestination } from '@/lib/meta/studio/url-params';
import type { MetaWriter, WriteResult } from '@/lib/meta/studio/write-api';
import type { GraphFailure } from '@/lib/meta/marketing-api';

const failure = (kind: GraphFailure['kind'], message = 'x'): GraphFailure => ({ kind, retryable: kind === 'transient', httpStatus: null, code: null, subcode: null, message, fbtraceId: null });

class FakeMeta implements MetaWriter {
  objects: { type: string; id: string; name: string; body: Record<string, unknown> }[] = [];
  posts: string[] = [];
  /** type -> behaviour for the next POST of that type */
  next: Record<string, 'timeout_created' | 'timeout_lost' | 'reject'> = {};
  n = 1000;
  async post<T>(path: string, body: Record<string, unknown>): Promise<WriteResult<T>> {
    const type = path.split('/').pop()!;
    this.posts.push(type);
    const mode = this.next[type];
    delete this.next[type];
    if (mode === 'reject') return { ok: false, ambiguous: false, failure: failure('invalid', 'rejected by Meta') };
    if (mode === 'timeout_lost') return { ok: false, ambiguous: true, failure: failure('transient', 'timeout') };
    const id = String(this.n++);
    if (type === 'adimages') return { ok: true, data: { images: { a: { hash: `hash${id}` } } } as T };
    this.objects.push({ type, id, name: String(body.name ?? body.title ?? ''), body });
    if (mode === 'timeout_created') return { ok: false, ambiguous: true, failure: failure('transient', 'timeout') };
    return { ok: true, data: { id } as T };
  }
  async get<T>(path: string, params: Record<string, string>) {
    const type = path.split('/').pop()!;
    if (/^\d+$/.test(path)) return { ok: true as const, data: { status: 'PAUSED', effective_status: 'PAUSED' } as T };
    const tag = params.filtering ? (JSON.parse(params.filtering)[0].value as string) : null;
    const data = this.objects.filter((o) => o.type === type && (!tag || o.name.includes(tag))).map((o) => ({ id: o.id, name: o.name, title: o.name }));
    return { ok: true as const, data: { data } as T };
  }
  count(type: string) { return this.objects.filter((o) => o.type === type).length; }
}

const cfg = (over: Partial<DraftConfig> = {}): DraftConfig => draftConfigSchema.parse({
  structure: { mode: 'new' }, objective: 'OUTCOME_LEADS', conversion_location: 'instant_form', optimization_goal: 'LEAD_GENERATION',
  page_id: '1234567890', budget: { type: 'daily', amount: 25 }, bid: {}, schedule: { start: '2030-01-01T09:00:00-08:00' },
  targeting: { countries: ['US'] }, placements: { mode: 'automatic' },
  ad: { primary_text: 'Free pool quote', headline: 'Get a quote', cta: 'GET_QUOTE', lead_form_id: '555000111' },
  ...over,
});

const run = (meta: FakeMeta, key = 'draft-key-1', existing: CreatedObjects = {}, c = cfg(), saved: CreatedObjects[] = []) => executeDraft({
  accountId: 'act_1', name: 'Pool spring', idempotencyKey: key, config: c, currency: 'USD', destination: null, existing,
  media: { kind: 'image', bytesBase64: async () => 'AAAA' }, writer: meta, store: { saveObjects: async (p) => { saved.push(p); } },
});

describe('paused creation executor', () => {
  it('creates campaign, ad set, creative and ad - all PAUSED - and reports Meta\'s own status', async () => {
    const meta = new FakeMeta();
    const r = await run(meta);
    expect(r.status).toBe('created_paused');
    for (const type of ['campaigns', 'adsets', 'ads']) expect(meta.objects.filter((o) => o.type === type).every((o) => o.body.status === 'PAUSED')).toBe(true);
    expect(meta.count('campaigns')).toBe(1);
    expect(r.status === 'created_paused' && r.adStatus?.effective_status).toBe('PAUSED'); // not "approved", not "delivering"
  });

  it('does not duplicate when a request times out AFTER Meta created the object', async () => {
    const meta = new FakeMeta();
    meta.next.campaigns = 'timeout_created';
    const r = await run(meta);
    expect(r.status).toBe('created_paused');
    expect(meta.count('campaigns')).toBe(1);
  });

  it('reports a failure (and creates nothing extra) when a timeout lost the request', async () => {
    const meta = new FakeMeta();
    meta.next.campaigns = 'timeout_lost';
    const r = await run(meta);
    expect(r.status).toBe('partial'); // the uploaded image already exists in Meta, so it is reported
    expect(r.objects.campaign_id).toBeUndefined();
    expect(meta.count('campaigns')).toBe(0);
  });

  it('stops as partial on a hard failure, then a retry resumes without recreating earlier objects', async () => {
    const meta = new FakeMeta();
    meta.next.adsets = 'reject';
    const saved: CreatedObjects[] = [];
    const first = await run(meta, 'k2', {}, cfg(), saved);
    expect(first.status).toBe('partial');
    expect(first.status === 'partial' && first.failedStep).toBe('adset');
    expect(first.objects.campaign_id).toBeTruthy();
    expect(saved.some((s) => s.campaign_id)).toBe(true); // persisted immediately, not only at the end
    const second = await run(meta, 'k2', first.objects);
    expect(second.status).toBe('created_paused');
    expect(meta.count('campaigns')).toBe(1);
    expect(meta.count('adsets')).toBe(1);
  });

  it('is a no-op to run the same completed draft again', async () => {
    const meta = new FakeMeta();
    const first = await run(meta, 'k3');
    const before = meta.objects.length;
    await run(meta, 'k3', first.objects);
    expect(meta.objects.length).toBe(before);
  });

  it('adopts objects found by their tagged name even if the saved ids were lost', async () => {
    const meta = new FakeMeta();
    await run(meta, 'k4');
    const before = meta.objects.length;
    const again = await run(meta, 'k4', {}); // nothing remembered locally
    expect(again.status).toBe('created_paused');
    expect(meta.objects.length).toBe(before);
  });

  it('with an existing ad set, creates only the creative and ad', async () => {
    const meta = new FakeMeta();
    await run(meta, 'k5', {}, cfg({ structure: { mode: 'existing_adset', campaign_id: '111111', adset_id: '222222' } }));
    expect(meta.count('campaigns')).toBe(0);
    expect(meta.count('adsets')).toBe(0);
    expect(meta.count('ads')).toBe(1);
    expect((meta.objects.find((o) => o.type === 'ads')!.body as { adset_id: string }).adset_id).toBe('222222');
  });
});

describe('plan / payloads', () => {
  it('sends budgets in minor units and honours zero-decimal currencies', () => {
    expect(toMinorUnits(25, 'USD')).toBe(2500);
    expect(toMinorUnits(2500, 'JPY')).toBe(2500);
  });
  it('puts the budget on the campaign only when the campaign owns it', () => {
    const plan = (level: 'adset' | 'campaign') => buildPlan({ name: 'n', tag: 'T', config: cfg({ budget: { level, type: 'daily', amount: 10 } }), currency: 'USD', have: {}, creativeKind: 'image', destination: null });
    const adsetOwned = plan('adset');
    expect(adsetOwned.find((s) => s.step === 'adset')!.body.daily_budget).toBe(1000);
    expect(adsetOwned.find((s) => s.step === 'campaign')!.body.daily_budget).toBeUndefined();
    const campOwned = plan('campaign');
    expect(campOwned.find((s) => s.step === 'campaign')!.body.daily_budget).toBe(1000);
    expect(campOwned.find((s) => s.step === 'adset')!.body.daily_budget).toBeUndefined();
  });
  it('tags every created object name with the draft tag', () => {
    const tag = draftTag('abc-123-def');
    const plan = buildPlan({ name: 'n', tag, config: cfg(), currency: 'USD', have: {}, creativeKind: 'image', destination: null });
    expect(plan.filter((s) => s.findByName).every((s) => s.findByName!.includes(`[${tag}]`))).toBe(true);
  });
  it('only offers eligible optimization goals', () => {
    expect(eligibleGoals('OUTCOME_LEADS', 'instant_form')).toEqual(['LEAD_GENERATION', 'QUALITY_LEAD']);
    expect(eligibleGoals('OUTCOME_TRAFFIC', 'instant_form')).toEqual([]);
  });
});

const ctx = (over: Partial<DraftContext> = {}): DraftContext => ({
  currency: 'USD', accountSyncedCampaignIds: new Set(['111111']), accountSyncedAdsetIds: new Map([['222222', '111111']]), creativeReady: true, creativeKind: 'image',
  allowedPageIds: new Set(['1234567890']), allowedInstagramIds: new Set(), allowedDatasetIds: new Set(), allowedLeadFormIds: new Set(['555000111']),
  now: new Date('2029-12-01T00:00:00Z'), ...over,
});

describe('draft validation', () => {
  it('accepts a complete instant-form draft', () => expect(validateDraft(cfg(), ctx()).errors).toEqual([]));
  it('blocks assets not mapped to the contractor (tenant isolation)', () => {
    const r = validateDraft(cfg(), ctx({ allowedPageIds: new Set(['999999']), allowedLeadFormIds: new Set() }));
    expect(r.errors.map((e) => e.code)).toEqual(expect.arrayContaining(['page_not_mapped', 'lead_form_not_mapped']));
  });
  it('refuses special ad categories and ineligible goals', () => {
    expect(validateDraft(cfg({ special_ad_categories: ['HOUSING'] }), ctx()).errors.map((e) => e.code)).toContain('special_category');
    expect(validateDraft(cfg({ optimization_goal: 'LINK_CLICKS' }), ctx()).errors.map((e) => e.code)).toContain('goal_not_eligible');
  });
  it('requires an end date for lifetime budgets and a valid bid amount', () => {
    expect(validateDraft(cfg({ budget: { level: 'adset', type: 'lifetime', amount: 100 } }), ctx()).errors.map((e) => e.code)).toContain('lifetime_needs_end');
    expect(validateDraft(cfg({ bid: { strategy: 'COST_CAP', amount: null } }), ctx()).errors.map((e) => e.code)).toContain('bid_amount');
  });
  it('rejects an unknown existing campaign/ad set', () => {
    const r = validateDraft(cfg({ structure: { mode: 'existing_adset', campaign_id: '999999', adset_id: '222222' } }), ctx());
    expect(r.errors.map((e) => e.code)).toEqual(expect.arrayContaining(['campaign_unknown', 'adset_unknown']));
  });
  it('requires a ready creative and a safe https destination for website ads', () => {
    expect(validateDraft(cfg(), ctx({ creativeReady: false })).errors.map((e) => e.code)).toContain('creative_missing');
    const web = cfg({ conversion_location: 'website', optimization_goal: 'OFFSITE_CONVERSIONS', dataset_id: '777777', ad: { primary_text: 'x', cta: 'GET_QUOTE', destination_url: 'http://insecure.example.com', headline: '', description: '', lead_form_id: null } });
    expect(validateDraft(web, ctx({ allowedDatasetIds: new Set(['777777']) })).errors.map((e) => e.code)).toContain('destination_invalid');
  });
});

describe('write + automation gates', () => {
  const base = { writeTokenPresent: true, liveWritesEnabled: true, accountWritesEnabled: true, accountKnown: true };
  it('blocks by default and says why', () => {
    const r = checkWriteGate({ writeTokenPresent: false, liveWritesEnabled: false, accountWritesEnabled: false, accountKnown: true });
    expect(r.allowed).toBe(false);
    expect(r.reasons.join(' ')).toMatch(/META_ADS_WRITE_TOKEN/);
  });
  it('allows only when all switches are on', () => {
    expect(checkWriteGate(base).allowed).toBe(true);
    expect(checkWriteGate({ ...base, accountWritesEnabled: false }).allowed).toBe(false);
  });
  it('automation additionally needs the global stop released', () => {
    expect(checkAutomationGate({ ...base, globalAutomationEnabled: false, accountAutomationEnabled: true }).allowed).toBe(false);
    expect(checkAutomationGate({ ...base, globalAutomationEnabled: true, accountAutomationEnabled: true }).allowed).toBe(true);
  });
});

// ---- media probing --------------------------------------------------------------------------------------------
const u32 = (n: number) => { const b = Buffer.alloc(4); b.writeUInt32BE(n); return b; };
const box = (type: string, ...payload: Buffer[]) => { const body = Buffer.concat(payload); return Buffer.concat([u32(8 + body.length), Buffer.from(type, 'latin1'), body]); };
function mp4(opts: { brand?: string; seconds: number; w: number; h: number; timescale?: number }) {
  const ts = opts.timescale ?? 1000;
  const mvhd = box('mvhd', Buffer.concat([u32(0), u32(0), u32(0), u32(ts), u32(opts.seconds * ts), Buffer.alloc(80)]));
  const tkhdBody = Buffer.concat([u32(0), u32(0), u32(0), u32(1), u32(0), u32(opts.seconds * ts), Buffer.alloc(8), Buffer.alloc(8), Buffer.alloc(36), u32(opts.w * 65536), u32(opts.h * 65536)]);
  const trak = box('trak', box('tkhd', tkhdBody));
  return Buffer.concat([box('ftyp', Buffer.from(opts.brand ?? 'isom', 'latin1'), u32(0)), box('moov', mvhd, trak)]);
}
function png(w: number, h: number) {
  const ihdr = Buffer.concat([u32(w), u32(h), Buffer.from([8, 2, 0, 0, 0])]);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), u32(13), Buffer.from('IHDR'), ihdr, u32(0)]);
}
function jpeg(w: number, h: number) {
  const sof = Buffer.concat([Buffer.from([0xff, 0xc0, 0x00, 0x11, 0x08]), Buffer.from([h >> 8, h & 255, w >> 8, w & 255]), Buffer.alloc(10)]);
  return Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00]), sof]);
}

describe('media probing + creative validation', () => {
  it('reads real PNG/JPEG dimensions from the bytes', () => {
    expect(probeImage(png(1080, 1350))).toEqual({ mime: 'image/png', width: 1080, height: 1350 });
    expect(probeImage(jpeg(1200, 628))).toEqual({ mime: 'image/jpeg', width: 1200, height: 628 });
  });
  it('reads MP4/MOV duration and size from the container header', () => {
    expect(probeMedia(mp4({ seconds: 15, w: 1080, h: 1920 }))).toMatchObject({ kind: 'video', mime: 'video/mp4', durationSeconds: 15, width: 1080, height: 1920 });
    expect(probeMedia(mp4({ brand: 'qt  ', seconds: 3, w: 720, h: 720 }))).toMatchObject({ mime: 'video/quicktime' });
  });
  it('does not trust a file just because of its name: unknown bytes are unrecognized', () => {
    expect(probeMedia(Buffer.from('<?php echo 1; ?>' + ' '.repeat(40)))).toEqual({ kind: 'unknown', mime: null });
  });
  it('errors on unsupported/oversized files and only warns about recommendations', () => {
    const okImg = validateCreative({ kind: 'image', mime: 'image/png', bytes: 2_000_000, width: 1080, height: 1080, durationSeconds: null });
    expect(okImg).toMatchObject({ ok: true, warnings: [] });
    expect(validateCreative({ kind: 'image', mime: 'image/gif', bytes: 10, width: 10, height: 10, durationSeconds: null }).errors[0].code).toBe('image_type');
    expect(validateCreative({ kind: 'image', mime: 'image/png', bytes: 31 * 1024 * 1024, width: 1080, height: 1080, durationSeconds: null }).ok).toBe(false);
    const small = validateCreative({ kind: 'image', mime: 'image/jpeg', bytes: 1000, width: 400, height: 300, durationSeconds: null });
    expect(small.ok).toBe(true);
    expect(small.warnings.map((w) => w.code)).toEqual(expect.arrayContaining(['low_resolution']));
    expect(validateCreative({ kind: 'video', mime: 'video/mp4', bytes: 1000, width: 1080, height: 1920, durationSeconds: null }).errors[0].code).toBe('video_duration_unknown');
    expect(validateCreative({ kind: 'video', mime: 'video/mp4', bytes: 1000, width: 1080, height: 1920, durationSeconds: 0.2 }).errors[0].code).toBe('video_too_short');
  });
  it('normalizes tags and strips markup characters', () => expect(cleanTags(['Spring Sale!', 'spring sale', '<b>x</b>'])).toEqual(['spring-sale', 'bxb']));
});

describe('destination URLs + attribution parameters', () => {
  it('adds HQN parameters without overwriting ones already on the URL', () => {
    const r = buildDestination('https://pool.example.com/quote?utm_source=newsletter&ref=abc');
    expect(r.ok && r.keptExisting).toContain('utm_source');
    expect(r.ok && r.urlTags).not.toMatch(/utm_source=/);
    expect(r.ok && r.urlTags).toMatch(/ad_id=\{\{ad\.id\}\}/);
    expect(r.ok && r.url).toContain('ref=abc');
  });
  it('rejects unsafe destinations', () => {
    for (const bad of ['http://x.com', 'javascript:alert(1)', 'https://user:pw@x.com', 'https://localhost/x', 'https://10.0.0.1/', 'not a url']) {
      expect(buildDestination(bad).ok).toBe(false);
    }
  });
});
