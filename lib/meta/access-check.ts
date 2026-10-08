/**
 * Read-only Meta access diagnostic: "can THIS token reach THIS ad account and these datasets, and if not, who has to do what?"
 *
 * Why it exists: a person having full permissions in Meta does not make an app token authorized. Access exists in three
 * separate places that must all line up:
 *   1. the TOKEN's identity (a personal user, or a System User in a Business Portfolio) must have the ad account / dataset ASSIGNED;
 *   2. the APP must hold the permission (`ads_read`) at an access level that covers that account - Meta: Standard access is
 *      enough for your OWN ad accounts, other people's need Advanced access (App Review); and
 *   3. the token must have been issued with that permission.
 * Every call here is a GET (reads only). It never sends an event, never edits anything, and never returns a token.
 *
 * Dependency-free on purpose (no imports) so the Setup page, the CLI (`scripts/meta-access-check.mjs`) and unit tests share it.
 */

export type GraphGet = (path: string, params?: Record<string, string>, tokenOverride?: string) => Promise<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
export type GraphGetAll = (path: string, params?: Record<string, string>) => Promise<any[]>; // eslint-disable-line @typescript-eslint/no-explicit-any
type Failure = { kind?: string; code?: number | null; message?: string; httpStatus?: number | null };

export type Who = 'you' | 'Ethan (owner of the ad account)' | 'a Business admin of the account owner' | 'Meta (App Review)' | 'nobody';
export type Check = {
  id: string; title: string; status: 'pass' | 'fail' | 'warn' | 'skip'; detail: string;
  /** Who must act and exactly what, when status is fail/warn. */
  action?: { who: Who; what: string };
};
export type AccessResult = {
  checks: Check[];
  /** Ad accounts this token can see (id, name, owner business, status). */
  accounts: { id: string; name: string; business: string | null; isPersonal: boolean; status: number | null }[];
  targetVisible: boolean | null;
  tokenKind: 'user-or-system' | 'unknown';
  grantedScopes: string[] | null;
};

export type AccessInput = {
  appId?: string | null; appSecret?: string | null;
  /** The ad account to verify (act_123 or 123). */
  targetAccountId?: string | null;
  /** The Business Portfolio id of HQN, to tell "HQN's portfolio" from "someone else's". Optional. */
  hqnBusinessId?: string | null;
  /** Datasets (pixels) that should be reachable, with what each is for. */
  datasets?: { id: string; role: string }[];
  /** A second token that is only used to READ dataset configuration (e.g. the Conversions API token). Sending is not tested. */
  readDatasetWithToken?: string | null;
  /** The permissions HQN requests. */
  requiredScopes?: string[];
};

const norm = (id: string) => (id.startsWith('act_') ? id : `act_${id}`);
const fail = (e: unknown): Failure => ((e as { failure?: Failure })?.failure ?? { message: e instanceof Error ? e.message : 'error' });

const permissionAction = (acct: string): { who: Who; what: string } => ({
  who: 'Meta (App Review)',
  what: `The token's person/System User can see ${acct}, but the APP is refused. For an ad account owned by someone else Meta requires ADVANCED access to ads_read (App Review, which needs Business Verification). Until it is approved, only people holding a role on the app AND admin on the ad account can call through it, and only with their own (expiring) user token.`,
});

function pixelIdsFromSpecs(specs: unknown): string[] {
  const out = new Set<string>();
  for (const spec of Array.isArray(specs) ? specs : []) {
    const px = (spec as { fb_pixel?: unknown })?.fb_pixel;
    for (const id of Array.isArray(px) ? px : []) if (typeof id === 'string' && /^\d{5,30}$/.test(id)) out.add(id);
  }
  return [...out];
}

export async function runAccessCheck(get: GraphGet, getAll: GraphGetAll, input: AccessInput): Promise<AccessResult> {
  const checks: Check[] = [];
  const required = input.requiredScopes ?? ['ads_read'];
  const res: AccessResult = { checks, accounts: [], targetVisible: null, tokenKind: 'unknown', grantedScopes: null };
  const target = input.targetAccountId ? norm(input.targetAccountId.trim()) : null;

  // 1. Is the token alive, and who is it?
  let identity: { id?: string; name?: string } | null = null;
  try {
    identity = await get('me', { fields: 'id,name' });
    res.tokenKind = 'user-or-system';
    checks.push({ id: 'token', title: 'Token accepted by Meta', status: 'pass', detail: `Acts as "${identity?.name ?? 'unknown'}" (id ${identity?.id ?? '?'}). A System User shows its system-user name; a personal token shows a person.` });
  } catch (e) {
    const f = fail(e);
    checks.push({ id: 'token', title: 'Token accepted by Meta', status: 'fail', detail: `${f.kind ?? 'error'}${f.code != null ? ` (${f.code})` : ''}: ${f.message ?? ''}`,
      action: { who: 'you', what: f.kind === 'auth' ? 'The token is expired, revoked or malformed. Generate a new one (System User: Business Settings -> System users -> Generate token, scope ads_read only).' : 'Meta could not be reached or refused the call; retry, then check the Graph API status.' } });
    return res; // nothing else can be checked without a working token
  }

  // 2. What the token says about itself (needs the app id + secret; reads only).
  if (input.appId && input.appSecret) {
    try {
      const dbg = (await get('debug_token', { input_token: '__SELF__' }, `${input.appId}|${input.appSecret}`))?.data ?? {};
      res.grantedScopes = Array.isArray(dbg.scopes) ? dbg.scopes : null;
      const wrongApp = dbg.app_id && String(dbg.app_id) !== String(input.appId);
      const missing = res.grantedScopes ? required.filter((s) => !res.grantedScopes!.includes(s)) : [];
      const excess = (res.grantedScopes ?? []).filter((s) => ['ads_management', 'business_management'].includes(s));
      const exp = typeof dbg.expires_at === 'number' && dbg.expires_at > 0 ? new Date(dbg.expires_at * 1000) : null;
      const days = exp ? Math.floor((exp.getTime() - Date.now()) / 86_400_000) : null;
      checks.push({
        id: 'token_details', title: 'Token details (app, permissions, expiry)',
        status: dbg.is_valid === false || wrongApp || missing.length ? 'fail' : excess.length || (days != null && days < 14) ? 'warn' : 'pass',
        detail: `valid=${dbg.is_valid ?? '?'}, type=${dbg.type ?? '?'}, app=${dbg.app_id ?? '?'} (${dbg.application ?? '?'}), permissions=[${(res.grantedScopes ?? ['unknown']).join(', ')}], ` +
          `${exp ? `expires in ${days} days (${exp.toISOString().slice(0, 10)})` : 'no expiry reported (typical of a System User token)'}.` +
          (wrongApp ? ` This token belongs to a DIFFERENT app than META_APP_ID.` : '') + (excess.length ? ` It holds more than needed: ${excess.join(', ')}; HQN only reads.` : ''),
        action: missing.length ? { who: 'you', what: `Generate the token again with ${missing.join(', ')} selected.` } : wrongApp ? { who: 'you', what: 'Generate the token from the same app as META_APP_ID (the app whose secret HQN holds).' } : days != null && days < 14 ? { who: 'you', what: 'Replace the token before it expires; prefer a System User token (no expiry).' } : undefined,
      });
    } catch (e) {
      const f = fail(e);
      checks.push({ id: 'token_details', title: 'Token details (app, permissions, expiry)', status: 'warn', detail: `Could not inspect the token: ${f.message ?? 'error'}. The other checks still ran.` });
    }
  } else checks.push({ id: 'token_details', title: 'Token details (app, permissions, expiry)', status: 'skip', detail: 'META_APP_ID and META_APP_SECRET (same app as the token) are needed to read the permission list and expiry.' });

  // 3. Which ad accounts can this identity see?
  try {
    const list = await getAll('me/adaccounts', { fields: 'id,name,account_status,owner,is_personal,business{id,name},currency,timezone_name' });
    res.accounts = list.map((a) => ({ id: String(a.id), name: String(a.name ?? ''), business: a.business?.id ? String(a.business.id) : a.owner ? String(a.owner) : null, isPersonal: !!a.is_personal, status: typeof a.account_status === 'number' ? a.account_status : null }));
    checks.push({ id: 'accounts', title: 'Ad accounts visible to this token', status: res.accounts.length ? 'pass' : 'fail',
      detail: res.accounts.length ? `${res.accounts.length} account(s): ${res.accounts.slice(0, 12).map((a) => `${a.name || a.id} (${a.id})`).join('; ')}` : 'None. The identity behind this token has no ad account assigned.',
      action: res.accounts.length ? undefined : { who: 'you', what: 'Assign the ad account to this token\'s identity. For a System User: Business Settings -> System users -> select it -> Add assets -> Ad accounts -> choose the account with view/analyze access. The Business Portfolio must itself have the account (owned or partner-shared) - see the "ownership" row.' } });
  } catch (e) {
    const f = fail(e);
    checks.push({ id: 'accounts', title: 'Ad accounts visible to this token', status: 'fail', detail: `${f.kind ?? 'error'}${f.code != null ? ` (${f.code})` : ''}: ${f.message ?? ''}`,
      action: f.kind === 'permission' ? permissionAction('any ad account') : { who: 'you', what: 'Retry; if it persists the token lacks ads_read.' } });
  }

  if (!target) {
    checks.push({ id: 'target', title: 'Target ad account', status: 'skip', detail: 'No ad account id given. Pass the Pool Masters ad account id (act_...) to check it directly.' });
  } else {
    const seen = res.accounts.find((a) => norm(a.id) === target);
    res.targetVisible = !!seen;
    if (!seen) {
      checks.push({ id: 'target', title: `${target} is assigned to this token's identity`, status: 'fail',
        detail: `Not in the list of ad accounts this token can see. This is an ASSET-ASSIGNMENT gap, not an app problem: the identity behind the token does not hold the account (your personal permissions do not carry over to a System User or to the app).`,
        action: { who: 'you', what: `In HQN's Business Settings -> Accounts -> Ad accounts, look for the Pool Masters account. If it is listed: assign it to the System User (Users -> System users -> Add assets). If it is NOT listed, your access is on your personal profile only, and the account's owner (Ethan's Business) must share it once with HQN's Business Portfolio as a partner (Business Settings -> Users -> Partners), after which you assign it to the System User.` } });
    } else {
      const ownerNote = input.hqnBusinessId && seen.business
        ? (seen.business === input.hqnBusinessId ? 'owned by HQN\'s Business Portfolio' : `owned by another Business (${seen.business}) - a client account from HQN's side, which is what makes Advanced access to ads_read necessary`)
        : seen.business ? `owned by Business ${seen.business}` : 'no owning Business reported (a personal ad account)';
      checks.push({ id: 'target', title: `${target} is assigned to this token's identity`, status: 'pass', detail: `Visible as "${seen.name}" (status ${seen.status ?? '?'}), ${ownerNote}${seen.isPersonal ? '; flagged is_personal' : ''}.` });
      if (seen.status != null && seen.status !== 1) checks.push({ id: 'status', title: 'Ad account status', status: 'warn', detail: `account_status=${seen.status} (1 = active). Delivery or reporting may be limited.`, action: { who: 'a Business admin of the account owner', what: 'Resolve the account status in Ads Manager (billing / policy).' } });

      // 4. Can the APP read insights for it? (This is where "Standard vs Advanced access" shows up.)
      try {
        const rows = await getAll(`${target}/insights`, { fields: 'spend,impressions', date_preset: 'last_7d', limit: '1' });
        checks.push({ id: 'insights', title: 'Insights can be read for this account', status: 'pass', detail: `Read succeeded (${rows.length} aggregate row${rows.length === 1 ? '' : 's'} for the last 7 days).` });
      } catch (e) {
        const f = fail(e);
        checks.push({ id: 'insights', title: 'Insights can be read for this account', status: 'fail', detail: `${f.kind ?? 'error'}${f.code != null ? ` (${f.code})` : ''}: ${f.message ?? ''}`,
          action: f.kind === 'permission' ? permissionAction(target) : f.kind === 'rate_limit' ? { who: 'nobody', what: 'Rate limited; wait and rerun. The default (Limited) access tier has low limits.' } : { who: 'you', what: 'Rerun; if it persists, check the token permissions row above.' } });
      }
    }
  }

  // 5. Dataset configuration: which dataset do the ad sets/ads use, and can we read each dataset?
  const wanted = new Map<string, string>((input.datasets ?? []).map((d) => [d.id, d.role]));
  if (target && res.targetVisible) {
    try {
      const sets = await getAll(`${target}/adsets`, { fields: 'id,name,effective_status,promoted_object', limit: '200' });
      for (const s of sets) { const px = s.promoted_object?.pixel_id; if (typeof px === 'string' && /^\d{5,30}$/.test(px) && !wanted.has(px)) wanted.set(px, `ad set optimizes on it (${s.effective_status ?? '?'})`); }
      const ads = await getAll(`${target}/ads`, { fields: 'id,name,effective_status,tracking_specs', limit: '200' });
      for (const a of ads) for (const px of pixelIdsFromSpecs(a.tracking_specs)) if (!wanted.has(px)) wanted.set(px, 'an ad tracks it');
      checks.push({ id: 'adconfig', title: 'Ad set / ad dataset configuration read', status: 'pass', detail: `${sets.length} ad set(s), ${ads.length} ad(s) read. Datasets referenced: ${[...wanted.keys()].join(', ') || 'none'}.` });
    } catch (e) {
      checks.push({ id: 'adconfig', title: 'Ad set / ad dataset configuration read', status: 'warn', detail: `Could not read: ${fail(e).message ?? 'error'}` });
    }
  }
  for (const [id, role] of wanted) {
    try {
      const px = await get(id, { fields: 'id,name,owner_business,last_fired_time,is_unavailable' });
      const last = px.last_fired_time ? new Date(px.last_fired_time) : null;
      const ageDays = last ? Math.floor((Date.now() - last.getTime()) / 86_400_000) : null;
      const owner = px.owner_business?.id ? String(px.owner_business.id) : null;
      checks.push({ id: `dataset:${id}`, title: `Dataset ${id} readable (${role})`,
        status: px.is_unavailable ? 'fail' : ageDays == null || ageDays > 7 ? 'warn' : 'pass',
        detail: `"${px.name ?? '?'}", ${owner ? (input.hqnBusinessId ? (owner === input.hqnBusinessId ? "owned by HQN's portfolio" : `owned by Business ${owner}`) : `owned by Business ${owner}`) : 'no owning Business'}; last event ${last ? `${ageDays} day(s) ago` : 'never'}${px.is_unavailable ? '; Meta marks it UNAVAILABLE' : ''}.`,
        action: ageDays == null || ageDays > 7 ? { who: 'you', what: 'No event in over 7 days: this dataset is not receiving events (the "Pixel is not active" symptom). Decide whether ads should point at the dataset the funnel actually sends to - see Setup -> Dataset check. Change ONE side only.' } : undefined });
    } catch (e) {
      const f = fail(e);
      checks.push({ id: `dataset:${id}`, title: `Dataset ${id} readable (${role})`, status: 'fail', detail: `${f.kind ?? 'error'}${f.code != null ? ` (${f.code})` : ''}: ${f.message ?? ''}`,
        action: { who: 'you', what: `Assign dataset ${id} to this token's identity (System User -> Add assets -> Datasets/Pixels, at least "use events dataset"). If the dataset belongs to another Business, its owner must share it with HQN's Business Portfolio first.` } });
    }
    if (input.readDatasetWithToken) {
      try {
        await get(id, { fields: 'id,name' }, input.readDatasetWithToken);
        checks.push({ id: `capi:${id}`, title: `Conversions API token can read dataset ${id}`, status: 'pass', detail: 'Read access confirmed. SENDING is not tested here (it would write an event); verify it with Test mode on a separate test dataset.' });
      } catch (e) {
        checks.push({ id: `capi:${id}`, title: `Conversions API token can read dataset ${id}`, status: 'fail', detail: `${fail(e).message ?? 'error'}`, action: { who: 'you', what: `Generate the Conversions API token for a System User/user that has dataset ${id} assigned (Events Manager -> dataset -> Settings -> Conversions API).` } });
      }
    }
  }
  return res;
}

/** Compares two runs of the same target (e.g. your personal token vs the System User) to say where the access actually lives. */
export function whereDoesAccessLive(personal: AccessResult | null, system: AccessResult | null): { verdict: 'both' | 'personal_only' | 'system_user_only' | 'neither' | 'unknown'; explanation: string } {
  const p = personal?.targetVisible, s = system?.targetVisible;
  if (p == null || s == null) return { verdict: 'unknown', explanation: 'Needs both a personal-token run and a System User run with a target ad account.' };
  if (p && s) return { verdict: 'both', explanation: "Your profile AND the System User (HQN's portfolio route) can see the account. Nothing to assign for reporting." };
  if (p && !s) return { verdict: 'personal_only', explanation: "Only your personal profile holds the account. HQN's System User does not: either the account is not in HQN's Business Portfolio yet (the owner must share it) or it is there but not assigned to the System User." };
  if (!p && s) return { verdict: 'system_user_only', explanation: "Only the System User sees it; your personal profile does not. That is fine for the integration." };
  return { verdict: 'neither', explanation: 'Neither identity sees the account. Check the account id.' };
}
