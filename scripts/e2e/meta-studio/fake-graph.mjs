// A fake of the parts of the Meta Graph / Marketing API that HQN calls. TEST HARNESS ONLY - it proves HQN's behaviour
// against a server that is STRICT about documented fields, never that real Meta accepts the same requests.
//
// Strictness (so HQN bugs surface): unknown fields on create are rejected with a Meta-style error 100; objects must be
// created PAUSED; ad sets/ads must reference existing parents; every request records which bearer token it used so tests
// can assert reporting calls used the read token and writes used the write token. Failure injection via POST /__control.
import http from 'node:http';
import { URLSearchParams } from 'node:url';

export const READ_TOKEN = 'EAAreadtokenE2E000000000000000000000';
export const WRITE_TOKEN = 'EAAwritetokenE2E00000000000000000000';

const FIELDS = {
  campaigns: ['name', 'objective', 'status', 'special_ad_categories', 'buying_type', 'is_adset_budget_sharing_enabled', 'daily_budget', 'lifetime_budget', 'bid_strategy', 'spend_cap'],
  adsets: ['name', 'campaign_id', 'status', 'billing_event', 'optimization_goal', 'destination_type', 'promoted_object', 'targeting', 'start_time', 'end_time', 'daily_budget', 'lifetime_budget', 'bid_strategy', 'bid_amount'],
  adcreatives: ['name', 'object_story_spec', 'url_tags'],
  ads: ['name', 'status', 'adset_id', 'creative'],
};
const OBJECTIVES = ['OUTCOME_APP_PROMOTION', 'OUTCOME_AWARENESS', 'OUTCOME_ENGAGEMENT', 'OUTCOME_LEADS', 'OUTCOME_SALES', 'OUTCOME_TRAFFIC'];
const ACCOUNT = '100000000000001';

export async function startFakeGraph({ port = 54400 } = {}) {
  let n = 500000000000000;
  const state = {
    objects: [], // {type,id,name,body,created}
    requests: [], // {method, path, token:'read'|'write'|'other'|'none', body?}
    control: { fail: [], videoStatus: 'ready', rejectAllTokens: false },
    images: 0,
  };
  const seed = () => {
    state.objects.push(
      { type: 'campaigns', id: '900000000000001', name: 'Existing Spring Campaign', body: { status: 'ACTIVE', objective: 'OUTCOME_LEADS', account_id: ACCOUNT, daily_budget: '5000' } },
      { type: 'adsets', id: '900000000000002', name: 'Existing Ad Set', body: { status: 'ACTIVE', campaign_id: '900000000000001', optimization_goal: 'LEAD_GENERATION', account_id: ACCOUNT, learning_stage_info: { status: 'SUCCESS' } } },
      { type: 'ads', id: '900000000000003', name: 'Existing Ad', body: { status: 'ACTIVE', adset_id: '900000000000002', campaign_id: '900000000000001', account_id: ACCOUNT } },
      { type: 'campaigns', id: '910000000000001', name: 'Costly Campaign', body: { status: 'ACTIVE', objective: 'OUTCOME_LEADS', account_id: ACCOUNT, daily_budget: '20000' } },
      { type: 'adsets', id: '910000000000002', name: 'Costly Ad Set', body: { status: 'ACTIVE', campaign_id: '910000000000001', optimization_goal: 'LEAD_GENERATION', account_id: ACCOUNT, learning_stage_info: { status: 'FAIL' } } },
      { type: 'ads', id: '910000000000003', name: 'Costly Ad', body: { status: 'ACTIVE', adset_id: '910000000000002', campaign_id: '910000000000001', account_id: ACCOUNT } },
    );
  };
  seed();

  function safe(v) { try { return JSON.parse(v); } catch { return v; } }
  const find = (id) => state.objects.find((o) => o.id === id);
  const metaErr = (res, status, code, message) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify({ error: { message, type: 'OAuthException', code, fbtrace_id: 'FAKE' } })); };
  const json = (res, body, status = 200) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
  const withStatus = (o) => ({ ...o.body, id: o.id, name: o.name, effective_status: o.body.status, account_id: o.body.account_id ?? ACCOUNT });

  const insights = () => {
    const rows = [];
    const today = new Date();
    for (let d = 1; d <= 20; d++) {
      const date = new Date(today.getTime() - d * 86400000).toISOString().slice(0, 10);
      // The costly ad spends a lot and reports few leads; the healthy one spends little and reports more.
      rows.push({ ad_id: '900000000000003', campaign_id: '900000000000001', adset_id: '900000000000002', date_start: date, spend: '12.50', impressions: '4000', reach: '3100', inline_link_clicks: '60', actions: [{ action_type: 'lead', value: '1' }] });
      rows.push({ ad_id: '910000000000003', campaign_id: '910000000000001', adset_id: '910000000000002', date_start: date, spend: '48.00', impressions: '9000', reach: '7000', inline_link_clicks: '90', actions: d % 6 === 0 ? [{ action_type: 'lead', value: '1' }] : [] });
    }
    return rows;
  };

  const server = http.createServer((req, res) => { handle(req, res).catch((e) => { try { res.writeHead(500, { 'content-type': 'application/json' }); res.end(JSON.stringify({ error: { message: `fake-graph crashed: ${e.message}`, code: 2 } })); } catch { /* socket gone */ } }); });
  async function handle(req, res) {
    const chunks = []; for await (const c of req) chunks.push(c);
    const raw = Buffer.concat(chunks).toString('utf8');
    const url = new URL(req.url, `http://localhost:${port}`);

    if (url.pathname === '/__state') return json(res, { objects: state.objects, requests: state.requests, control: state.control });
    if (url.pathname === '/__control' && req.method === 'POST') {
      const c = JSON.parse(raw || '{}');
      if (c.reset) { state.objects = []; state.requests = []; state.control = { fail: [], videoStatus: 'ready', rejectAllTokens: false }; seed(); }
      if (c.fail) state.control.fail.push(c.fail); // {type:'adsets', mode:'reject'|'timeout_created'|'timeout_lost'|'http500'}
      if (c.videoStatus) state.control.videoStatus = c.videoStatus;
      if (c.rejectAllTokens !== undefined) state.control.rejectAllTokens = c.rejectAllTokens;
      if (c.externalEdit) { const o = find(c.externalEdit.id); if (o) Object.assign(o.body, c.externalEdit.fields); }
      if (c.clearRequests) state.requests = [];
      return json(res, { ok: true });
    }

    const auth = String(req.headers.authorization ?? '').replace(/^Bearer /i, '');
    const tokenKind = auth === READ_TOKEN ? 'read' : auth === WRITE_TOKEN ? 'write' : auth ? 'other' : 'none';
    const path = url.pathname.replace(/^\/v\d+\.\d+\//, '').replace(/^\//, '');
    const params = req.method === 'POST' ? Object.fromEntries(new URLSearchParams(raw)) : Object.fromEntries(url.searchParams);
    const queryToken = url.searchParams.get('access_token') || params.access_token;
    state.requests.push({ method: req.method, path, token: tokenKind, tokenInUrlOrBody: !!queryToken, fields: params.fields ?? null, bodyKeys: req.method === 'POST' ? Object.keys(params) : undefined });

    if (state.control.rejectAllTokens || tokenKind === 'other' || tokenKind === 'none') return metaErr(res, 400, 190, 'Invalid OAuth access token.');

    // ---- failure injection -----------------------------------------------------------------------------------------
    const m = /^act_(\d+)\/(campaigns|adsets|adcreatives|ads|advideos|adimages)$/.exec(path);
    if (req.method === 'POST' && m) {
      const idx = state.control.fail.findIndex((f) => f.type === m[2]);
      if (idx >= 0) {
        const [f] = state.control.fail.splice(idx, 1);
        if (f.mode === 'reject') return metaErr(res, 400, 100, `Invalid parameter (injected rejection for ${m[2]})`);
        if (f.mode === 'http500') return metaErr(res, 500, 2, 'An unexpected error has occurred (injected)');
        if (f.mode === 'timeout_lost') { req.socket.destroy(); return; }
        if (f.mode === 'timeout_created') { create(m[2], params, null); req.socket.destroy(); return; }
      }
    }

    function create(type, p, resForErr) {
      if (type === 'adimages') { state.images++; return { images: { 'upload.png': { hash: `IMGHASH${state.images}` } } }; }
      if (type === 'advideos') { const o = { type, id: String(n++), name: p.title ?? p.name ?? 'video', body: { status: { video_status: 'processing' }, account_id: ACCOUNT } }; state.objects.push(o); return { id: o.id }; }
      const o = { type, id: String(n++), name: p.name ?? '', body: { ...Object.fromEntries(Object.entries(p).map(([k, v]) => [k, safe(v)])), account_id: ACCOUNT } };
      state.objects.push(o); return { id: o.id };
    }

    // ---- writes ------------------------------------------------------------------------------------------------------------
    if (req.method === 'POST' && m) {
      if (tokenKind !== 'write') return metaErr(res, 403, 200, 'Permissions error: this token cannot create objects (the read-only token was used for a write).');
      const type = m[2];
      if (type === 'adimages') return json(res, create(type, params));
      if (type === 'advideos') {
        if (!params.file_url && !params.source) return metaErr(res, 400, 100, 'advideos needs file_url or source');
        return json(res, create(type, params));
      }
      const allowed = FIELDS[type];
      const unknown = Object.keys(params).filter((k) => !allowed.includes(k));
      if (unknown.length) return metaErr(res, 400, 100, `Unknown parameter(s) for ${type}: ${unknown.join(', ')}`);
      if (type !== 'adcreatives' && params.status !== 'PAUSED') return metaErr(res, 400, 100, `HQN test fake: ${type} must be created PAUSED (got ${params.status})`);
      if (type === 'campaigns') {
        if (!OBJECTIVES.includes(params.objective)) return metaErr(res, 400, 100, 'Invalid objective');
        if (params.special_ad_categories === undefined) return metaErr(res, 400, 100, 'special_ad_categories is required');
        if (params.daily_budget && !/^\d+$/.test(params.daily_budget)) return metaErr(res, 400, 100, 'daily_budget must be an integer');
      }
      if (type === 'adsets') {
        const camp = find(params.campaign_id); if (!camp || camp.type !== 'campaigns') return metaErr(res, 400, 100, 'campaign_id does not exist');
        if (!params.optimization_goal || !params.billing_event || !params.targeting) return metaErr(res, 400, 100, 'optimization_goal, billing_event and targeting are required');
        const t = safe(params.targeting); if (!t.geo_locations?.countries?.length) return metaErr(res, 400, 100, 'targeting.geo_locations.countries required');
        const hasAdsetBudget = params.daily_budget || params.lifetime_budget; const campBudget = camp.body.daily_budget || camp.body.lifetime_budget;
        if (hasAdsetBudget && campBudget) return metaErr(res, 400, 100, 'Budget can be set on the campaign or the ad set, not both');
        if (!hasAdsetBudget && !campBudget) return metaErr(res, 400, 100, 'A budget is required on the campaign or the ad set');
      }
      if (type === 'adcreatives') {
        const spec = safe(params.object_story_spec); if (!spec?.page_id) return metaErr(res, 400, 100, 'object_story_spec.page_id required');
        const media = spec.link_data ?? spec.video_data; if (!media) return metaErr(res, 400, 100, 'link_data or video_data required');
        const cta = media.call_to_action; if (cta?.value?.lead_gen_form_id && spec.link_data && spec.link_data.link !== 'https://fb.me/') return metaErr(res, 400, 100, 'Lead ad link must be https://fb.me/');
        if (spec.video_data) { const v = find(spec.video_data.video_id); if (!v) return metaErr(res, 400, 100, 'video_id does not exist'); if (state.control.videoStatus !== 'ready') return metaErr(res, 400, 100, 'video is still processing'); if (!spec.video_data.image_hash) return metaErr(res, 400, 100, 'video_data needs a thumbnail (image_hash or image_url)'); }
        if (spec.link_data && !spec.link_data.image_hash && !spec.link_data.picture) return metaErr(res, 400, 100, 'link_data needs image_hash or picture');
      }
      if (type === 'ads') {
        const s = find(params.adset_id); if (!s || s.type !== 'adsets') return metaErr(res, 400, 100, 'adset_id does not exist');
        const cr = safe(params.creative); if (!find(cr?.creative_id)) return metaErr(res, 400, 100, 'creative_id does not exist');
      }
      return json(res, create(type, params));
    }

    // update of an existing object
    const um = /^(\d+)$/.exec(path);
    if (req.method === 'POST' && um) {
      if (tokenKind !== 'write') return metaErr(res, 403, 200, 'Permissions error (read token used for a write)');
      const o = find(um[1]); if (!o) return metaErr(res, 400, 100, 'Unsupported post request. Object does not exist');
      for (const [k, v] of Object.entries(params)) o.body[k] = safe(v);
      return json(res, { success: true });
    }

    // ---- reads --------------------------------------------------------------------------------------------------------------
    if (req.method === 'GET') {
      if (path === 'me/adaccounts') return json(res, { data: [{ id: `act_${ACCOUNT}`, name: 'E2E Pool Masters', currency: 'USD', timezone_name: 'America/Los_Angeles', account_status: 1 }] });
      if (path === 'me/accounts') return json(res, { data: [{ id: '110000000000001', name: 'E2E Pool Masters Page', instagram_business_account: { id: '120000000000001', username: 'e2e_pools' } }] });
      if (/^110000000000001\/leadgen_forms$/.test(path)) return json(res, { data: [{ id: '130000000000001', name: 'Free quote form', status: 'ACTIVE' }] });
      if (new RegExp(`^act_${ACCOUNT}/adspixels$`).test(path)) return json(res, { data: [{ id: '140000000000001', name: 'E2E Pixel' }] });
      const lm = new RegExp(`^act_${ACCOUNT}/(campaigns|adsets|ads|advideos)$`).exec(path);
      if (lm) {
        let list = state.objects.filter((o) => o.type === lm[1]);
        if (params.filtering) { try { const f = JSON.parse(params.filtering)[0]; if (f?.field === 'name' && f.operator === 'CONTAIN') list = list.filter((o) => o.name.includes(f.value)); } catch { /* ignore */ } }
        const data = list.map((o) => lm[1] === 'advideos' ? { id: o.id, title: o.name } : { ...withStatus(o), campaign_id: o.body.campaign_id ?? (o.type === 'campaigns' ? o.id : undefined), adset_id: o.body.adset_id, updated_time: new Date().toISOString() });
        return json(res, { data });
      }
      if (path === `act_${ACCOUNT}/insights`) return json(res, { data: insights() });
      const om = /^(\d+)$/.exec(path);
      if (om) {
        const o = find(om[1]); if (!o) return metaErr(res, 400, 100, 'Unsupported get request. Object does not exist');
        if (params.fields === 'status' && o.type === 'advideos') return json(res, { status: { video_status: state.control.videoStatus }, id: o.id });
        const want = String(params.fields ?? '').split(',').filter(Boolean);
        const full = withStatus(o); const out = { id: o.id };
        for (const f of want) if (f in full) out[f] = full[f];
        if (o.type === 'advideos') out.status = { video_status: state.control.videoStatus };
        return json(res, want.length ? out : full);
      }
    }
    return metaErr(res, 404, 803, `fake-graph: unsupported ${req.method} ${path}`);
  }

  // advance a video to the controlled status the moment it is read; also keep stored video objects in sync
  const origListen = server.listen.bind(server);
  await new Promise((r) => origListen(port, '127.0.0.1', r));
  return {
    url: `http://127.0.0.1:${port}`,
    state,
    snapshot: async () => (await fetch(`http://127.0.0.1:${port}/__state`)).json(),
    control: async (c) => (await fetch(`http://127.0.0.1:${port}/__control`, { method: 'POST', body: JSON.stringify(c) })).json(),
    close: () => new Promise((r) => { server.closeAllConnections?.(); server.close(r); }),
  };
}

if (process.argv[1]?.endsWith('fake-graph.mjs')) { const g = await startFakeGraph(); console.log('fake graph at', g.url); }
