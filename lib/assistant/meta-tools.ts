import 'server-only';
import { isUuid } from './context';
import { createAction, type ToolContext, type ToolDef } from './tools';
import { canSetUpMeta, getConnection } from '@/lib/meta/setup/connections';
import { metaAppConfig, metaConnectReady, missingSetup } from '@/lib/meta/setup/config';
import { AD_ACCOUNT_ID, DATASET_ID } from '@/lib/meta/setup/graph';
import { accountsFor, datasetsFor, listFunnelsForActor, loadFunnelForActor, trackingStatus, verifyFunnelTracking, type Deps } from '@/lib/meta/setup/funnel';
import { adSetGuidance } from '@/lib/meta/setup/guidance';
import { LEVEL_LABEL } from '@/lib/meta/setup/verify';

const depsOf = (ctx: ToolContext): Deps => ({ admin: ctx.admin, profile: ctx.profile, fetchImpl: ctx.fetchImpl });
export const canUseMetaSetup = (ctx: Pick<ToolContext, 'profile'>) => canSetUpMeta(ctx.profile);

const setupLink = (level: 'read' | 'manage' = 'read') => `/api/integrations/meta/connect/start?level=${level}&return=${encodeURIComponent('/app')}`;

/** Why a Meta read failed, in words that say whether it is something the user can fix or a platform restriction. */
function failure(res: { error: string; message?: string }) {
  if (res.error === 'not_connected') return { status: 'not_connected', connect_link: setupLink(), note: 'Tell the user to connect Meta with the link. They log in on Facebook; HomeQuote never sees their password.' };
  if (res.error === 'needs_reconnect') return { status: 'needs_reconnect', connect_link: setupLink(), note: 'The Meta authorization expired or was revoked.' };
  if (res.error === 'permission') return { status: 'blocked_by_meta', message: res.message, note: 'This is a Meta permission / app-review limit, not something the assistant can work around.' };
  return { status: 'error', message: res.message };
}

async function setupStatus(ctx: ToolContext) {
  const app = metaAppConfig();
  const conn = await getConnection(ctx.admin, ctx.profile);
  return {
    meta_app_configured: !!app && metaConnectReady(),
    missing_server_setup: metaConnectReady() ? [] : missingSetup(),
    connection: conn ? { status: conn.status, meta_user: conn.metaUserName, can_create_datasets: conn.canCreateDataset, expires: conn.expiresAt } : null,
    connect_link: setupLink(),
    note: !metaConnectReady() ? 'An admin must create a Meta app and set META_APP_ID, META_APP_SECRET and a token encryption key on the server before anyone can connect.' : undefined,
  };
}

async function listFunnelsTool(ctx: ToolContext) {
  const funnels = await listFunnelsForActor(ctx.admin, ctx.profile);
  ctx.onBlock?.({
    type: 'cards', kind: 'funnel', title: 'Which funnel?',
    items: funnels.map(f => ({ id: f.id, label: f.name, detail: `/estimate/${f.slug} · ${f.status}${f.isDemo ? ' · demo' : ''}`, badge: f.pixelId ? (f.connected ? 'Pixel connected' : 'Pixel set') : 'No pixel' })),
    note: funnels.length ? undefined : 'No funnels available to you.',
  });
  return { count: funnels.length, funnels: funnels.map(f => ({ funnel_id: f.id, name: f.name, status: f.status, has_pixel: !!f.pixelId })), note: 'The user sees clickable cards. Do not repeat the list; ask them to pick one.' };
}

async function listAssets(ctx: ToolContext, input: Record<string, unknown>) {
  const d = depsOf(ctx);
  if (input.ad_account_id === undefined) {
    const res = await accountsFor(d);
    if (!res.ok) return failure(res);
    ctx.onBlock?.({
      type: 'cards', kind: 'ad_account', title: 'Which ad account?',
      items: res.items.map(a => ({ id: a.id, label: a.name, detail: [a.business?.name, a.currency].filter(Boolean).join(' · ') || a.id, badge: a.status === 1 ? undefined : 'Not active', disabled: a.status !== null && a.status !== 1, reason: 'This ad account is not active in Meta.' })),
      note: res.items.length ? 'Only ad accounts your connected Meta login can access are shown.' : 'Your Meta login has no ad accounts.',
    });
    return { count: res.items.length, ad_accounts: res.items.map(a => ({ ad_account_id: a.id, name: a.name, business: a.business?.name ?? null })), note: 'The user sees clickable cards.' };
  }
  const id = String(input.ad_account_id);
  if (!AD_ACCOUNT_ID.test(id)) return { error: 'invalid_ad_account_id' };
  const res = await datasetsFor(d, id);
  if (!res.ok) return failure(res);
  const conn = await getConnection(ctx.admin, ctx.profile);
  ctx.onBlock?.({
    type: 'cards', kind: 'dataset', title: 'Which pixel / dataset?',
    items: res.items.map(p => ({ id: p.id, label: p.name, detail: `ID ${p.id}${p.lastFiredAt ? ` · last fired ${p.lastFiredAt.slice(0, 10)}` : ' · no activity yet'}`, badge: p.unavailable ? 'Unavailable' : undefined, disabled: p.unavailable, reason: 'Meta reports this dataset as unavailable.' })),
    note: res.items.length
      ? 'Existing datasets are reused by default. Meta allows one pixel per ad account.'
      : conn?.canCreateDataset ? 'This ad account has no dataset yet. I can propose creating one.' : 'This ad account has no dataset yet. Creating one needs an extra Meta permission (ads_management) that has not been granted.',
  });
  return { ad_account_id: id, count: res.items.length, datasets: res.items.map(p => ({ dataset_id: p.id, name: p.name, last_fired: p.lastFiredAt })), can_create_dataset: !!conn?.canCreateDataset };
}

async function proposeConnect(ctx: ToolContext, input: Record<string, unknown>) {
  if (!isUuid(input.funnel_id) || typeof input.ad_account_id !== 'string' || !AD_ACCOUNT_ID.test(input.ad_account_id) || typeof input.dataset_id !== 'string' || !DATASET_ID.test(input.dataset_id)) return { error: 'invalid_ids' };
  const d = depsOf(ctx);
  const funnel = await loadFunnelForActor(ctx.admin, ctx.profile, input.funnel_id);
  if (!funnel) return { error: 'not_found' };
  // Both ids must appear in the connected user's OWN authorized listing before a proposal exists.
  const sets = await datasetsFor(d, input.ad_account_id);
  if (!sets.ok) return failure(sets);
  const pixel = sets.items.find(p => p.id === input.dataset_id);
  if (!pixel) return { error: 'dataset_not_available_to_you' };
  const accounts = await accountsFor(d);
  const account = accounts.ok ? accounts.items.find(a => a.id === input.ad_account_id) : null;
  if (!account) return { error: 'ad_account_not_available_to_you' };

  const prev = funnel.config.trackingPixels.metaPixelId ?? null;
  // Funnels are few, so compare in code rather than relying on a JSON-path filter.
  const { data: all } = await ctx.admin.from('funnels').select('slug, contractor_id, config').neq('id', funnel.id).limit(500);
  const shared = ((all ?? []) as { slug: string; contractor_id: string | null; config: { trackingPixels?: { metaPixelId?: string } } | null }[]).filter(f => f.config?.trackingPixels?.metaPixelId === pixel.id).slice(0, 5);
  const crossTenant = shared.filter(f => f.contractor_id !== funnel.contractorId);
  const warnings = [
    prev && prev !== pixel.id ? `This replaces the funnel’s current pixel ${prev}.` : null,
    shared.length ? `The same dataset is also used by: ${shared.map(f => f.slug).join(', ')}. Their events will be pooled in one dataset.` : null,
    crossTenant.length ? 'Some of those funnels belong to a different company.' : null,
    funnel.status !== 'published' ? 'The funnel is not published yet, so nothing will fire until it is.' : null,
    funnel.config.trackingPixels.consentMode === 'opt_in' ? 'Consent mode is opt-in: the pixel only runs for visitors who tick the footer box. (Not changed.)' : null,
  ].filter(Boolean) as string[];
  const serverOn = !!process.env.META_CONVERSIONS_API_TOKEN?.trim();
  return createAction(ctx, {
    kind: 'configure_meta_tracking', documentId: null, keySeed: funnel.id,
    payload: { funnel_id: funnel.id, ad_account_id: account.id, dataset_id: pixel.id },
    preview: {
      title: `Connect pixel to ${funnel.clientName}`,
      target: { label: funnel.clientName, href: `/app/funnels/${funnel.id}/builder` },
      lines: [
        `Ad account: ${account.name}${account.business ? ` (${account.business.name})` : ''}`,
        `Dataset (pixel): ${pixel.name} · ${pixel.id}`,
        `Funnel setting changed: tracking pixel ${prev ?? '(none)'} → ${pixel.id}`,
        'Events: PageView and ViewContent on page load, Lead after a valid submission, Schedule after a booking — all de-duplicated by event id.',
        serverOn ? 'Server (Conversions API) events: on, using the same event ids.' : 'Server (Conversions API) events: off — no server token is configured, browser tracking only.',
        'No ads, campaigns or budgets are touched.',
      ],
      warning: warnings.length ? warnings.join(' ') : undefined,
      confirmLabel: 'Connect pixel',
    },
  });
}

async function proposeCreateDataset(ctx: ToolContext, input: Record<string, unknown>) {
  if (typeof input.ad_account_id !== 'string' || !AD_ACCOUNT_ID.test(input.ad_account_id)) return { error: 'invalid_ad_account_id' };
  const conn = await getConnection(ctx.admin, ctx.profile);
  if (!conn) return { status: 'not_connected', connect_link: setupLink('manage') };
  if (!conn.canCreateDataset) return { status: 'permission_needed', connect_link: setupLink('manage'), note: 'Creating a dataset needs the ads_management permission. The user can grant it with the link; Meta may require the app to have Advanced access first.' };
  const sets = await datasetsFor(depsOf(ctx), input.ad_account_id);
  if (!sets.ok) return failure(sets);
  if (sets.items.length) return { status: 'already_exists', note: 'This ad account already has a dataset. Reuse it instead of creating another (Meta allows one pixel per ad account).', datasets: sets.items.map(p => ({ dataset_id: p.id, name: p.name })) };
  const name = (typeof input.name === 'string' && input.name.trim() ? input.name.trim() : 'HomeQuote Pixel').slice(0, 80);
  return createAction(ctx, {
    kind: 'create_meta_dataset', keySeed: input.ad_account_id, payload: { ad_account_id: input.ad_account_id, name },
    preview: {
      title: 'Create a new Meta dataset (pixel)', target: { label: input.ad_account_id, href: '/app' },
      lines: [`Ad account: ${input.ad_account_id}`, `Name: ${name}`, 'Created only if the account still has no dataset when you confirm.'], confirmLabel: 'Create dataset',
    },
  });
}

async function statusTool(ctx: ToolContext, input: Record<string, unknown>) {
  if (!isUuid(input.funnel_id)) return setupStatus(ctx);
  const s = await trackingStatus(depsOf(ctx), input.funnel_id);
  if (!s) return { error: 'not_found' };
  const row = (label: string, value: string, state: 'ok' | 'warn' | 'bad' | 'unknown', detail?: string) => ({ label, value, state, detail });
  ctx.onBlock?.({
    type: 'status', title: `Tracking · ${s.funnel.name}`,
    rows: [
      row('Meta connection', s.connection.connected ? `${s.connection.user ?? 'Connected'}${s.connection.status && s.connection.status !== 'active' ? ` (${s.connection.status.replace('_', ' ')})` : ''}` : 'Not connected', s.connection.connected && s.connection.status === 'active' ? 'ok' : 'bad'),
      row('Business / ad account', s.tracking ? `${s.tracking.businessName ?? '—'} / ${s.tracking.adAccountName ?? s.tracking.adAccountId}` : '—', s.tracking ? 'ok' : 'unknown'),
      row('Dataset (pixel)', s.tracking ? `${s.tracking.datasetName ?? ''} ${s.tracking.datasetId}`.trim() : 'None selected', s.tracking ? 'ok' : 'bad'),
      row('Funnel', `${s.funnel.url} · ${s.funnel.published ? 'published' : s.funnel.status}`, s.funnel.published ? 'ok' : 'warn'),
      row('Events configured', s.tracking ? s.tracking.events.join(', ') : '—', s.tracking ? 'ok' : 'unknown'),
      row('Browser tracking', s.browser === 'on' ? `Installed (consent: ${s.consentMode === 'opt_in' ? 'opt-in' : 'opt-out'})` : 'Needs a dataset', s.browser === 'on' ? 'ok' : 'bad'),
      row('Server tracking', s.server === 'on' ? 'Configured (Conversions API)' : s.server === 'off_no_token' ? 'Off — no server token' : 'Needs a dataset', s.server === 'on' ? 'ok' : 'warn'),
      row('Verified by Meta data', LEVEL_LABEL[s.level], s.level === 'verified' ? 'ok' : s.level === 'receiving' ? 'warn' : 'unknown', s.verifiedAt ? `Verified ${s.verifiedAt}` : s.lastCheckedAt ? `Last checked ${s.lastCheckedAt}` : 'Never checked'),
      ...s.checks.map(c => row(c.label, c.detail, c.state === 'na' ? 'unknown' : c.state)),
    ],
    note: 'Installed or accepted is not the same as verified. Only events Meta itself reports count.',
  });
  return { status: s, note: 'The user sees a status panel. Summarize in two or three sentences and say what is verified versus not.' };
}

async function checkTool(ctx: ToolContext, input: Record<string, unknown>) {
  if (!isUuid(input.funnel_id)) return { error: 'invalid_funnel_id' };
  const r = await verifyFunnelTracking(depsOf(ctx), input.funnel_id);
  if (!r) return { error: 'not_found' };
  if (r.level === 'not_configured') return { level: r.level, reason: 'reason' in r ? r.reason : undefined };
  return statusTool(ctx, { funnel_id: input.funnel_id });
}

async function nextSteps(ctx: ToolContext, input: Record<string, unknown>) {
  if (!isUuid(input.funnel_id)) return { error: 'invalid_funnel_id' };
  const funnel = await loadFunnelForActor(ctx.admin, ctx.profile, input.funnel_id);
  if (!funnel) return { error: 'not_found' };
  const pixel = funnel.config.trackingPixels.metaPixelId;
  if (!pixel) return { error: 'no_dataset_connected', note: 'Connect a dataset to this funnel first.' };
  return { guidance: adSetGuidance({ pixelId: pixel, funnelUrl: funnel.status === 'published' ? funnel.url : null }), note: 'Nothing here has been applied. The assistant cannot publish ads, change budgets or edit active campaigns.' };
}

function guidedTest() {
  return {
    steps: [
      'Open Meta Events Manager → your dataset → Test events. Choose “Test browser events”, enter the funnel URL, and open it. Browser events from your own visit appear live.',
      'Walk through the funnel as a visitor (tick the consent box if the funnel is opt-in). PageView should appear when the page loads.',
      'Only submit the contact form if you are happy for it to be a real lead. A real submission creates a real lead and a real Lead conversion; there is no sandbox. The assistant never submits forms or sends events for you.',
      'Come back and ask me to “check tracking”. I read what Meta itself reports (last fired time, event counts) and what the app recorded.',
    ],
    warning: 'Meta documents that test events are NOT sandboxed: they still flow into Events Manager and are used for targeting and measurement. For fully separate testing use a separate test dataset, not the one your ads use.',
  };
}

export const META_TOOLS: ToolDef[] = [
  {
    name: 'meta_setup_status',
    description: 'Is Meta connected for this user, and is the server set up for Meta login? With funnel_id, shows that funnel’s tracking status panel (connection, ad account, dataset, funnel URL, events, browser/server tracking, and what has actually been verified and when). Use for "is tracking working / set up?".',
    input_schema: { type: 'object', properties: { funnel_id: { type: 'string' } }, additionalProperties: false },
    run: statusTool,
  },
  {
    name: 'meta_list_funnels',
    description: 'Shows funnel selection cards the user can click. Use at the start of tracking setup when the funnel is not clear.',
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
    run: (ctx) => listFunnelsTool(ctx),
  },
  {
    name: 'meta_list_assets',
    description: 'Shows selection cards for Meta assets the connected user is authorized to use. Without ad_account_id: ad accounts (grouped by business). With ad_account_id: that account’s datasets (pixels). Never ask the user to paste IDs; use this.',
    input_schema: { type: 'object', properties: { ad_account_id: { type: 'string', description: 'act_… id from a previous meta_list_assets call' } }, additionalProperties: false },
    run: listAssets,
  },
  {
    name: 'propose_meta_funnel_tracking',
    description: 'PROPOSE attaching an existing dataset (pixel) to a funnel so its browser and server events use it. Shows the exact change and warnings; nothing changes until the user presses Connect. ids must come from the cards the user chose.',
    input_schema: { type: 'object', properties: { funnel_id: { type: 'string' }, ad_account_id: { type: 'string' }, dataset_id: { type: 'string' } }, required: ['funnel_id', 'ad_account_id', 'dataset_id'], additionalProperties: false },
    run: proposeConnect,
  },
  {
    name: 'propose_create_meta_dataset',
    description: 'PROPOSE creating a new dataset (pixel) ONLY when the ad account has none. Reuse existing datasets by default. Needs the ads_management permission. Nothing is created until the user confirms.',
    input_schema: { type: 'object', properties: { ad_account_id: { type: 'string' }, name: { type: 'string' } }, required: ['ad_account_id'], additionalProperties: false },
    run: proposeCreateDataset,
  },
  {
    name: 'meta_check_tracking',
    description: 'Read-only check of a funnel’s tracking against what Meta reports (pixel last fired, Lead event counts, server events) and what the app recorded, with reasons a Lead event may not be firing. Sends no events. Use for "why isn’t my Lead event firing?".',
    input_schema: { type: 'object', properties: { funnel_id: { type: 'string' } }, required: ['funnel_id'], additionalProperties: false },
    run: checkTool,
  },
  {
    name: 'meta_guided_test',
    description: 'Step-by-step test using Meta’s own Test Events tool, with the honest caveats (test events are not sandboxed; a form submission creates a real lead). The assistant never submits forms or sends test conversions.',
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
    run: async () => guidedTest(),
  },
  {
    name: 'meta_adset_next_steps',
    description: 'After tracking is set up: the exact dataset/event/URL settings to use for the ad set, how the pixel, ad and ad set relate, and delivery implications of changing existing campaigns. Applies nothing.',
    input_schema: { type: 'object', properties: { funnel_id: { type: 'string' } }, required: ['funnel_id'], additionalProperties: false },
    run: nextSteps,
  },
];
