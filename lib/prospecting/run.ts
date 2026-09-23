import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Profile } from '@/lib/types';
import { findCallerByName, type CallerOption } from '@/lib/calls/callers';
import {
  distribute,
  isDuplicate,
  keyNameCity,
  planQueries,
  qualify,
  resolveNiche,
  TARGET_COUNTIES,
  type Disqualification,
  type ExistingKeys,
  type Niche,
  type QualifiedProspect,
} from './catalog';
import * as places from './google-places';

/**
 * Orchestrates one "Find New Prospects" run end to end, reporting progress as
 * it goes. Everything durable is written through the caller's own Supabase
 * client (admin RLS), and the run itself is recorded in prospect_refresh_runs
 * whatever the outcome.
 */

export interface RefreshRequest {
  nicheSlug: string;
  customNiche?: string | null;
  callers: 'liam' | 'nadav' | 'both';
  perCaller: number;
}

export type ProgressEvent =
  | { type: 'progress'; message: string }
  | { type: 'done'; added: number; duplicates: number; unqualified: number; runId: string }
  | { type: 'not_configured'; envVar: string; provider: string; runId: string }
  | { type: 'error'; message: string; runId?: string };

export const MAX_PER_CALLER = 250;

/** Active accounts that can hold prospects: callers, and the admins who run them. */
export async function listAssignees(supabase: SupabaseClient): Promise<CallerOption[]> {
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, account_status, deleted_at')
    .in('role', ['caller', 'admin'])
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

export async function runRefresh(
  supabase: SupabaseClient,
  me: Profile,
  req: RefreshRequest,
  emit: (e: ProgressEvent) => Promise<void> | void
): Promise<void> {
  const niche = resolveNiche(req.nicheSlug, req.customNiche);
  if (!niche) {
    await emit({ type: 'error', message: 'Choose a niche, or type a custom one (3+ characters).' });
    return;
  }
  const perCaller = Math.max(1, Math.min(MAX_PER_CALLER, Math.floor(req.perCaller || 100)));

  // Resolve the caller names to real, active accounts.
  const assignees = await listAssignees(supabase);
  const wanted = req.callers === 'both' ? ['liam', 'nadav'] : [req.callers];
  const callerIds: string[] = [];
  for (const name of wanted) {
    const c = findCallerByName(assignees, name);
    if (!c) {
      await emit({
        type: 'error',
        message: `No active account named "${name[0].toUpperCase()}${name.slice(1)}" to assign prospects to. Create it under Team first.`,
      });
      return;
    }
    callerIds.push(c.id);
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
      provider: places.PROVIDER_ID,
      status: 'running',
    })
    .select('id')
    .single();
  if (runErr || !run) {
    await emit({ type: 'error', message: runErr?.message ?? 'Could not start the run' });
    return;
  }
  const runId = run.id as string;
  const log: { at: string; message: string }[] = [];
  const progress = async (message: string) => {
    log.push({ at: new Date().toISOString(), message });
    await emit({ type: 'progress', message });
  };
  const finish = async (patch: Record<string, unknown>) => {
    await supabase
      .from('prospect_refresh_runs')
      .update({ ...patch, log, finished_at: new Date().toISOString() })
      .eq('id', runId);
  };

  if (!places.isConfigured()) {
    await progress(`Searching for ${niche.label}...`);
    await progress(`No business-data source is connected (${places.PROVIDER_ENV} is not set).`);
    await finish({ status: 'not_configured', error: `${places.PROVIDER_ENV} not set` });
    await emit({ type: 'not_configured', envVar: places.PROVIDER_ENV, provider: 'Google Places API (New)', runId });
    return;
  }

  try {
    await progress(`Searching for ${niche.label}...`);
    const target = perCaller * callerIds.length;
    const existing = await loadExistingKeys(supabase);

    const accepted: QualifiedProspect[] = [];
    const seenThisRun = new Set<string>();
    let fetched = 0;
    let duplicates = 0;
    let unqualified = 0;
    const reasons: Record<Disqualification, number> = {
      closed: 0, no_phone: 0, invalid_phone: 0, outside_target_counties: 0, niche_mismatch: 0,
    };

    let lastCounty = '';
    for (const q of planQueries(niche)) {
      if (accepted.length >= target) break;
      if (q.county !== lastCounty) {
        lastCounty = q.county;
        await progress(`Searching ${q.county} County...`);
      }
      await places.searchText(q.text, async (page) => {
        for (const b of page) {
          if (seenThisRun.has(b.externalId)) continue; // same listing from an overlapping query
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
        return accepted.length >= target; // stop paging once we have enough
      });
    }

    await progress('Checking business information...');
    await progress(
      `Removing duplicates... (${duplicates} already in your prospect history, ${unqualified} unqualified)`
    );
    await progress('Adding new prospects...');

    const buckets = distribute(accepted, callerIds, perCaller);
    let added = 0;
    const batch = `refresh-${niche.slug}-${new Date().toISOString().slice(0, 10)}`;
    for (const [callerId, items] of buckets) {
      for (let i = 0; i < items.length; i += 100) {
        const chunk = items.slice(i, i + 100).map((p) => ({
          ...p,
          assigned_to: callerId,
          assigned_at: new Date().toISOString(),
          assigned_by: me.id,
          source: 'refresh',
          import_batch: batch,
          created_by: me.id,
          updated_by: me.id,
        }));
        // Insert one at a time only if the batch trips a unique index, so a
        // single late duplicate cannot sink the other 99.
        const { error } = await supabase.from('contractor_prospects').insert(chunk);
        if (!error) {
          added += chunk.length;
          continue;
        }
        for (const row of chunk) {
          const { error: one } = await supabase.from('contractor_prospects').insert(row);
          if (one) duplicates += 1;
          else added += 1;
        }
      }
    }

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
      metadata: { run_id: runId, niche: niche.label, callers: callerIds, added, duplicates, unqualified, reasons },
    });
    await emit({ type: 'done', added, duplicates, unqualified, runId });
  } catch (e) {
    const message = (e as Error).message;
    await finish({ status: 'failed', error: message });
    await emit({ type: 'error', message, runId });
  }
}

export type { Niche };
