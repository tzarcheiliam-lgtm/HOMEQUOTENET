import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Profile } from '@/lib/types';
import { CALL_ASSIGNEE_ROLES, type CallerOption } from '@/lib/calls/callers';
import {
  CUSTOM_NICHE_SLUG,
  distribute,
  isDuplicate,
  keyNameCity,
  qualify,
  resolveNiche,
  TARGET_COUNTIES,
  type Disqualification,
  type ExistingKeys,
  type Niche,
  type QualifiedProspect,
} from './catalog';
import { CSLB_SOURCE, qualifyCslb, rankLicenses, type CslbLicense } from './cslb';
import { childCells, frontier, outcomeFor, toRectangle, type CellState, type GridCell } from './grid';
import * as places from './google-places';

/**
 * Orchestrates one "Find New Prospects" run end to end, reporting progress as
 * it goes. Two sources share everything after sourcing (dedupe against the
 * whole history, the split between callers, the insert, the run record):
 *
 * - runRefresh: Google Places, searched square by square over the map grid
 *   (grid.ts) with progress remembered in prospect_search_cells.
 * - runCslbImport: a CSLB license list the admin downloaded and the dialog
 *   read in the browser.
 *
 * Everything durable is written through the caller's own Supabase client
 * (admin RLS), and the run itself is recorded in prospect_refresh_runs
 * whatever the outcome.
 */

export interface RefreshRequest {
  nicheSlug: string;
  customNiche?: string | null;
  callerIds: string[];
  perCaller: number;
}

export interface CslbImportRequest extends RefreshRequest {
  fileName?: string | null;
  licenses: CslbLicense[];
}

export type ProgressEvent =
  | { type: 'progress'; message: string }
  | {
      type: 'done';
      added: number;
      duplicates: number;
      unqualified: number;
      runId: string;
      /** CSLB: new, qualified licenses left in the file after this run's share. */
      remaining?: number;
      /** Google: true when every map square for this niche has been searched recently. */
      exhausted?: boolean;
    }
  | { type: 'not_configured'; envVar: string; provider: string; runId: string }
  | { type: 'error'; message: string; runId?: string };

type Emit = (e: ProgressEvent) => Promise<void> | void;

export const MAX_PER_CALLER = 250;
/** Google requests one run may spend (each page of up to 20 results is one). */
export const MAX_REQUESTS_PER_RUN = 400;
/** Stop starting new searches after this long, so the response ends inside maxDuration. */
const TIME_BUDGET_MS = 90_000;
/** Map squares searched at once. */
const CONCURRENCY = 4;

/** Active accounts that can hold prospects: callers, and the admins who run them. */
export async function listAssignees(supabase: SupabaseClient): Promise<CallerOption[]> {
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, account_status, deleted_at')
    .in('role', [...CALL_ASSIGNEE_ROLES])
    .eq('account_status', 'active')
    .is('deleted_at', null);
  return ((data ?? []) as { id: string; full_name: string | null; email: string | null }[]).map(
    (p) => ({ id: p.id, name: p.full_name || p.email || 'Caller', email: p.email })
  );
}

/** The whole history: every prospect ever, archived or not, any status. */
async function loadExistingKeys(supabase: SupabaseClient): Promise<ExistingKeys> {
  const keys: ExistingKeys = {
    phones: new Set(),
    domains: new Set(),
    nameCity: new Set(),
    external: new Set(),
  };
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from('contractor_prospects')
      .select('company_name, city, phone_e164, website_domain, external_source, external_id')
      .order('id')
      .range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    for (const r of data ?? []) {
      if (r.phone_e164) keys.phones.add(r.phone_e164);
      if (r.website_domain) keys.domains.add(r.website_domain);
      if (r.city) keys.nameCity.add(keyNameCity(r.company_name, r.city));
      if (r.external_id) keys.external.add(`${r.external_source}:${r.external_id}`);
    }
    if (!data || data.length < pageSize) break;
  }
  return keys;
}

const emptyReasons = (): Record<Disqualification, number> => ({
  closed: 0,
  license_inactive: 0,
  no_phone: 0,
  invalid_phone: 0,
  outside_target_counties: 0,
  niche_mismatch: 0,
});

/* ---- Shared run plumbing ----------------------------------------------------- */

interface StartedRun {
  niche: Niche;
  callerIds: string[];
  perCaller: number;
  runId: string;
  progress: (message: string) => Promise<void>;
  finish: (patch: Record<string, unknown>) => Promise<void>;
}

async function startRun(
  supabase: SupabaseClient,
  me: Profile,
  req: RefreshRequest,
  provider: string,
  emit: Emit
): Promise<StartedRun | null> {
  const niche = resolveNiche(req.nicheSlug, req.customNiche);
  if (!niche) {
    await emit({ type: 'error', message: 'Choose a niche, or type a custom one (3+ characters).' });
    return null;
  }
  const perCaller = Math.max(1, Math.min(MAX_PER_CALLER, Math.floor(req.perCaller || 100)));

  // Revalidate the exact ids selected in the dialog against active assignees.
  const assignees = await listAssignees(supabase);
  const activeIds = new Set(assignees.map((assignee) => assignee.id));
  const callerIds = [...new Set(req.callerIds)];
  for (const callerId of callerIds) {
    if (!activeIds.has(callerId)) {
      await emit({
        type: 'error',
        message: 'A selected caller is no longer active. Refresh the page and choose again.',
      });
      return null;
    }
  }

  // The run row exists from the first moment so a crash still leaves a record.
  const { data: run, error: runErr } = await supabase
    .from('prospect_refresh_runs')
    .insert({
      requested_by: me.id,
      niche: niche.label,
      callers: callerIds,
      requested_per_caller: perCaller,
      counties: TARGET_COUNTIES.map((c) => c.name),
      provider,
      status: 'running',
    })
    .select('id')
    .single();
  if (runErr || !run) {
    await emit({ type: 'error', message: runErr?.message ?? 'Could not start the run' });
    return null;
  }
  const runId = run.id as string;
  const log: { at: string; message: string }[] = [];
  return {
    niche,
    callerIds,
    perCaller,
    runId,
    progress: async (message: string) => {
      log.push({ at: new Date().toISOString(), message });
      await emit({ type: 'progress', message });
    },
    finish: async (patch: Record<string, unknown>) => {
      await supabase
        .from('prospect_refresh_runs')
        .update({ ...patch, log, finished_at: new Date().toISOString() })
        .eq('id', runId);
    },
  };
}

/** Splits between callers and inserts; a late duplicate (unique index) only costs its own row. */
async function insertAssigned(
  supabase: SupabaseClient,
  me: Profile,
  run: StartedRun,
  accepted: QualifiedProspect[],
  source: string
): Promise<{ added: number; lateDuplicates: number }> {
  const buckets = distribute(accepted, run.callerIds, run.perCaller);
  let added = 0;
  let lateDuplicates = 0;
  const batch = `${source}-${run.niche.slug}-${new Date().toISOString().slice(0, 10)}`;
  for (const [callerId, items] of buckets) {
    for (let i = 0; i < items.length; i += 100) {
      const chunk = items.slice(i, i + 100).map((p) => ({
        ...p,
        assigned_to: callerId,
        assigned_at: new Date().toISOString(),
        assigned_by: me.id,
        source,
        import_batch: batch,
        created_by: me.id,
        updated_by: me.id,
      }));
      const { error } = await supabase.from('contractor_prospects').insert(chunk);
      if (!error) {
        added += chunk.length;
        continue;
      }
      for (const row of chunk) {
        const { error: one } = await supabase.from('contractor_prospects').insert(row);
        if (one) lateDuplicates += 1;
        else added += 1;
      }
    }
  }
  return { added, lateDuplicates };
}

/* ---- Search memory (prospect_search_cells) ----------------------------------- */

interface SearchMemory {
  available: boolean;
  byQuery: Map<string, Map<string, CellState>>;
}

interface CellRow {
  niche_key: string;
  query: string;
  cell: string;
  status: CellState['status'];
  result_count: number;
  searched_at: string;
}

export function nicheKey(niche: Niche): string {
  return niche.slug === CUSTOM_NICHE_SLUG ? `custom:${niche.label.toLowerCase()}` : niche.slug;
}

async function loadSearchMemory(supabase: SupabaseClient, key: string): Promise<SearchMemory> {
  const byQuery = new Map<string, Map<string, CellState>>();
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from('prospect_search_cells')
      .select('query, cell, status, searched_at')
      .eq('niche_key', key)
      .order('cell')
      .range(from, from + pageSize - 1);
    // Before migration 0074 the table does not exist: search without memory.
    if (error) return { available: false, byQuery: new Map() };
    for (const r of data ?? []) {
      if (!byQuery.has(r.query)) byQuery.set(r.query, new Map());
      byQuery.get(r.query)!.set(r.cell, { status: r.status, searchedAt: r.searched_at });
    }
    if (!data || data.length < pageSize) break;
  }
  return { available: true, byQuery };
}

async function saveSearchMemory(supabase: SupabaseClient, rows: CellRow[]): Promise<void> {
  for (let i = 0; i < rows.length; i += 500) {
    await supabase
      .from('prospect_search_cells')
      .upsert(rows.slice(i, i + 500), { onConflict: 'niche_key,query,cell' });
  }
}

/* ---- Google Places over the map grid ------------------------------------------ */

export async function runRefresh(
  supabase: SupabaseClient,
  me: Profile,
  req: RefreshRequest,
  emit: Emit
): Promise<void> {
  const run = await startRun(supabase, me, req, places.PROVIDER_ID, emit);
  if (!run) return;
  const { niche, runId, progress, finish } = run;

  if (!places.isConfigured()) {
    await progress(`Searching for ${niche.label}...`);
    await progress(`No business-data source is connected (${places.PROVIDER_ENV} is not set).`);
    await finish({ status: 'not_configured', error: `${places.PROVIDER_ENV} not set` });
    await emit({ type: 'not_configured', envVar: places.PROVIDER_ENV, provider: 'Google Places API (New)', runId });
    return;
  }

  const key = nicheKey(niche);
  const searched: CellRow[] = [];
  let memory: SearchMemory = { available: false, byQuery: new Map() };

  try {
    await progress(`Searching for ${niche.label}...`);
    const target = run.perCaller * run.callerIds.length;
    const [existing, mem] = await Promise.all([loadExistingKeys(supabase), loadSearchMemory(supabase, key)]);
    memory = mem;

    // Phrase-major: the most specific phrase covers the whole map first.
    const work: { query: string; cell: GridCell }[] = [];
    for (const query of niche.queries) {
      for (const cell of frontier(memory.byQuery.get(query) ?? new Map())) work.push({ query, cell });
    }
    if (!memory.available) {
      await progress('Search memory is not set up yet (migration 0074), so this run starts from the top of the map.');
    } else if (work.length === 0) {
      await progress('Every map square has been searched for this niche recently. Try the CSLB license list for more.');
    } else {
      const done = [...memory.byQuery.values()].reduce((n, m) => n + m.size, 0);
      await progress(
        done > 0
          ? `Continuing where the last run stopped (${done} map squares already searched)...`
          : `Searching ${TARGET_COUNTIES.map((c) => `${c.name} County`).join(' and ')} square by square...`
      );
    }

    const accepted: QualifiedProspect[] = [];
    const seenThisRun = new Set<string>();
    let fetched = 0;
    let duplicates = 0;
    let unqualified = 0;
    let requests = 0;
    let squares = 0;
    const reasons = emptyReasons();
    const deadline = Date.now() + TIME_BUDGET_MS;
    const enough = () => accepted.length >= target;
    const outOfBudget = () => requests >= MAX_REQUESTS_PER_RUN || Date.now() > deadline;
    let aborted = false; // one failed search stops the other workers too

    const worker = async () => {
      while (work.length > 0 && !enough() && !outOfBudget() && !aborted) {
        const { query, cell } = work.shift()!;
        const outcome = await places.searchText(
          query,
          (page) => {
            requests += 1;
            for (const b of page) {
              if (seenThisRun.has(b.externalId)) continue; // same listing from an overlapping square
              seenThisRun.add(b.externalId);
              fetched += 1;
              const judged = qualify(b, niche);
              if (!judged.ok) {
                unqualified += 1;
                reasons[judged.reason] += 1;
                continue;
              }
              if (isDuplicate(judged.prospect, existing)) {
                duplicates += 1;
                continue;
              }
              accepted.push(judged.prospect);
            }
            return enough() || outOfBudget() || aborted;
          },
          { locationRestriction: toRectangle(cell.bounds) }
        );
        if (!outcome.complete) continue; // cut short: search this square again next time
        const status = outcomeFor(cell, outcome.results);
        searched.push({
          niche_key: key,
          query,
          cell: cell.key,
          status,
          result_count: outcome.results,
          searched_at: new Date().toISOString(),
        });
        // A full square hides more: dig into it next, while it is fresh.
        if (status === 'split') work.unshift(...childCells(cell).map((c) => ({ query, cell: c })));
        squares += 1;
        if (squares % 15 === 0) {
          await progress(`Searched ${squares} map squares... ${accepted.length} new so far`);
        }
      }
    };
    await Promise.all(
      Array.from({ length: CONCURRENCY }, () =>
        worker().catch((e) => {
          aborted = true;
          throw e;
        })
      )
    );

    const exhausted = memory.available && work.length === 0 && !enough();
    await progress(`Checked ${fetched} businesses in ${squares} map squares (${requests} searches).`);
    await progress(
      `Removing duplicates... (${duplicates} already in your prospect history, ${unqualified} unqualified)`
    );
    if (!enough() && outOfBudget() && work.length > 0) {
      await progress('Stopped at this run\'s search limit. Run it again to keep going from here.');
    }
    await progress('Adding new prospects...');

    const { added, lateDuplicates } = await insertAssigned(supabase, me, run, accepted, 'refresh');
    duplicates += lateDuplicates;

    await finish({
      status: 'completed',
      added_count: added,
      duplicate_count: duplicates,
      unqualified_count: unqualified,
      fetched_count: fetched,
    });
    await supabase.from('audit_logs').insert({
      actor_id: me.id,
      action: 'prospect.refresh',
      target_user_id: null,
      metadata: {
        run_id: runId,
        niche: niche.label,
        callers: run.callerIds,
        added,
        duplicates,
        unqualified,
        reasons,
        requests,
        squares,
      },
    });
    await emit({ type: 'done', added, duplicates, unqualified, runId, exhausted });
  } catch (e) {
    const message = (e as Error).message;
    await finish({ status: 'failed', error: message });
    await emit({ type: 'error', message, runId });
  } finally {
    // Even a failed run keeps the squares it finished, so nothing is paid for twice.
    if (memory.available && searched.length > 0) await saveSearchMemory(supabase, searched).catch(() => {});
  }
}

/* ---- CSLB license list ------------------------------------------------------- */

export async function runCslbImport(
  supabase: SupabaseClient,
  me: Profile,
  req: CslbImportRequest,
  emit: Emit
): Promise<void> {
  const run = await startRun(supabase, me, req, CSLB_SOURCE, emit);
  if (!run) return;
  const { niche, runId, progress, finish } = run;

  try {
    const target = run.perCaller * run.callerIds.length;
    await progress(
      `Reading ${req.licenses.length} licenses${req.fileName ? ` from ${req.fileName}` : ''}...`
    );
    const existing = await loadExistingKeys(supabase);

    const accepted: QualifiedProspect[] = [];
    const seenLicenses = new Set<string>();
    let duplicates = 0;
    let unqualified = 0;
    let remaining = 0;
    const reasons = emptyReasons();
    for (const lic of rankLicenses(req.licenses)) {
      if (seenLicenses.has(lic.licenseNumber)) continue; // listed twice (several classes)
      seenLicenses.add(lic.licenseNumber);
      const judged = qualifyCslb(lic, niche);
      if (!judged.ok) {
        unqualified += 1;
        reasons[judged.reason] += 1;
        continue;
      }
      if (isDuplicate(judged.prospect, existing)) {
        duplicates += 1;
        continue;
      }
      if (accepted.length < target) accepted.push(judged.prospect);
      else remaining += 1;
    }

    await progress('Checking license status, phone numbers and counties...');
    await progress(
      `Removing duplicates... (${duplicates} already in your prospect history, ${unqualified} unqualified)`
    );
    await progress('Adding new prospects...');

    const { added, lateDuplicates } = await insertAssigned(supabase, me, run, accepted, CSLB_SOURCE);
    duplicates += lateDuplicates;

    await finish({
      status: 'completed',
      added_count: added,
      duplicate_count: duplicates,
      unqualified_count: unqualified,
      fetched_count: seenLicenses.size,
    });
    await supabase.from('audit_logs').insert({
      actor_id: me.id,
      action: 'prospect.import_cslb',
      target_user_id: null,
      metadata: {
        run_id: runId,
        niche: niche.label,
        callers: run.callerIds,
        file: req.fileName ?? null,
        licenses: seenLicenses.size,
        added,
        duplicates,
        unqualified,
        remaining,
        reasons,
      },
    });
    await emit({ type: 'done', added, duplicates, unqualified, runId, remaining });
  } catch (e) {
    const message = (e as Error).message;
    await finish({ status: 'failed', error: message });
    await emit({ type: 'error', message, runId });
  }
}

export type { Niche };
