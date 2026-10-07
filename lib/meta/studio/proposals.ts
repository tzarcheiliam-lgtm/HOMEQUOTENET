import type { MetaWriter } from './write-api';
import { redactSecrets } from '@/lib/meta/marketing-api';
import { toMinorUnits } from './draft';

/**
 * Change proposals: a recorded, reviewable intent to change one live Meta object. Applying one:
 *   1. passes the write gate (caller) and atomically claims the proposal (approved -> applying) so two clicks or
 *      two workers cannot apply it twice;
 *   2. RE-READS the object from Meta and compares it with the `current_value` the human reviewed. If anything
 *      differs - someone edited it in Ads Manager, or a previous run already changed it - the proposal becomes
 *      `stale` and NOTHING is written: HQN never silently overwrites a change it did not know about;
 *   3. refuses budget increases that no human approved;
 *   4. sends exactly the proposed change, stores the previous live state (for a possible manual reversal) and the
 *      provider's actual response. It does not claim the change can be undone (spent money and delivery effects
 *      cannot), and a reversal is just another proposal that needs approval.
 */

export type ProposalChange = 'pause' | 'resume' | 'budget' | 'schedule' | 'targeting' | 'notify';
export type ProposalRow = {
  id: string; account_id: string; target_type: 'campaign' | 'adset' | 'ad'; target_id: string;
  change_type: ProposalChange; current_value: Record<string, unknown>; proposed_value: Record<string, unknown>;
  status: string; approved_by: string | null; auto_approved_by_rule: string | null; expires_at: string;
};

export interface ProposalStore {
  /** Atomic approved -> applying. Returns false if someone else already claimed/changed it. */
  claim(id: string): Promise<boolean>;
  finish(id: string, patch: {
    status: 'applied' | 'failed' | 'stale';
    previous_state?: unknown; provider_result?: unknown; error_message?: string | null;
  }): Promise<void>;
  /** Remember what HQN just wrote so later drift can be told apart from our own change. */
  recordExpected(target: { type: string; id: string }, fields: Record<string, unknown>): Promise<void>;
  log(entry: { action: string; target_type: string; target_id: string; account_id: string; before?: unknown; after?: unknown; provider_result?: unknown; detail?: unknown }): Promise<void>;
}

/** Fields read back from Meta per change type (also what `current_value` must contain). */
export const LIVE_FIELDS: Record<ProposalChange, string> = {
  pause: 'status,effective_status',
  resume: 'status,effective_status',
  budget: 'status,daily_budget,lifetime_budget',
  schedule: 'start_time,end_time',
  targeting: 'targeting',
  notify: 'status',
};

const norm = (v: unknown): string => (v == null ? '' : typeof v === 'object' ? JSON.stringify(v, Object.keys(v as object).sort()) : String(v));

/** Differences between what the reviewer saw and what Meta says right now (only the keys in `expected`). */
export function driftBetween(expected: Record<string, unknown>, live: Record<string, unknown>): { field: string; expected: unknown; live: unknown }[] {
  const out: { field: string; expected: unknown; live: unknown }[] = [];
  for (const [k, v] of Object.entries(expected)) if (norm(v) !== norm(live[k])) out.push({ field: k, expected: v, live: live[k] });
  return out;
}

/** The exact write for a proposal. Targeting is a full replacement, so proposed_value must hold the whole object. */
export function writeBody(p: Pick<ProposalRow, 'change_type' | 'proposed_value'>): Record<string, unknown> | null {
  switch (p.change_type) {
    case 'pause': return { status: 'PAUSED' };
    case 'resume': return { status: 'ACTIVE' };
    case 'budget': return p.proposed_value.daily_budget != null ? { daily_budget: p.proposed_value.daily_budget } : p.proposed_value.lifetime_budget != null ? { lifetime_budget: p.proposed_value.lifetime_budget } : null;
    case 'schedule': return { ...(p.proposed_value.start_time ? { start_time: p.proposed_value.start_time } : {}), ...(p.proposed_value.end_time ? { end_time: p.proposed_value.end_time } : {}) };
    case 'targeting': return p.proposed_value.targeting ? { targeting: p.proposed_value.targeting } : null;
    case 'notify': return null;
  }
}

export type ApplyResult =
  | { outcome: 'applied'; previous: Record<string, unknown>; provider: unknown }
  | { outcome: 'stale'; drift: ReturnType<typeof driftBetween> }
  | { outcome: 'failed'; message: string }
  | { outcome: 'not_claimable' | 'not_approved' | 'expired' | 'nothing_to_write' };

export async function applyProposal(p: ProposalRow, deps: { writer: MetaWriter; store: ProposalStore; now?: Date }): Promise<ApplyResult> {
  const now = deps.now ?? new Date();
  if (!p.approved_by && !p.auto_approved_by_rule) return { outcome: 'not_approved' };
  if (new Date(p.expires_at) <= now) return { outcome: 'expired' };
  const body = writeBody(p);
  if (!body) return { outcome: 'nothing_to_write' };

  // Budget increases must have a person behind them, whatever the rule mode says.
  if (p.change_type === 'budget') {
    const cur = Number(p.current_value.daily_budget ?? p.current_value.lifetime_budget ?? NaN);
    const next = Number(p.proposed_value.daily_budget ?? p.proposed_value.lifetime_budget ?? NaN);
    if (!Number.isFinite(cur) || !Number.isFinite(next)) return { outcome: 'failed', message: 'Budget values are missing from the proposal.' };
    if (next > cur && !p.approved_by) return { outcome: 'not_approved' };
  }

  if (!(await deps.store.claim(p.id))) return { outcome: 'not_claimable' };

  const live = await deps.writer.get<Record<string, unknown>>(p.target_id, { fields: LIVE_FIELDS[p.change_type] });
  if (!live.ok) {
    const message = redactSecrets(live.failure.message);
    await deps.store.finish(p.id, { status: 'failed', error_message: `Could not re-check the current state in Meta: ${message}` });
    await deps.store.log({ action: 'proposal.failed', target_type: p.target_type, target_id: p.target_id, account_id: p.account_id, detail: { stage: 'recheck', class: live.failure.kind } });
    return { outcome: 'failed', message };
  }
  const drift = driftBetween(p.current_value, live.data);
  if (drift.length) {
    await deps.store.finish(p.id, { status: 'stale', previous_state: live.data, error_message: 'The object changed in Meta since this proposal was made; nothing was applied.' });
    await deps.store.log({ action: 'proposal.stale', target_type: p.target_type, target_id: p.target_id, account_id: p.account_id, before: p.current_value, after: live.data, detail: { drift } });
    return { outcome: 'stale', drift };
  }

  const res = await deps.writer.post<{ success?: boolean }>(p.target_id, body);
  if (!res.ok) {
    const message = redactSecrets(res.failure.message);
    // An ambiguous failure (timeout/5xx) may have applied; the next recheck will reveal that as drift, so we fail closed.
    await deps.store.finish(p.id, { status: 'failed', previous_state: live.data, error_message: res.ambiguous ? `Meta did not confirm the change (${message}). Check the object in Ads Manager before retrying.` : message });
    await deps.store.log({ action: 'proposal.failed', target_type: p.target_type, target_id: p.target_id, account_id: p.account_id, before: live.data, detail: { stage: 'write', class: res.failure.kind, ambiguous: res.ambiguous } });
    return { outcome: 'failed', message };
  }
  await deps.store.finish(p.id, { status: 'applied', previous_state: live.data, provider_result: { success: res.data.success ?? true } });
  await deps.store.recordExpected({ type: p.target_type, id: p.target_id }, body);
  await deps.store.log({ action: 'proposal.applied', target_type: p.target_type, target_id: p.target_id, account_id: p.account_id, before: live.data, after: body, provider_result: { success: res.data.success ?? true }, detail: { change_type: p.change_type } });
  return { outcome: 'applied', previous: live.data, provider: res.data };
}

// ---- building proposals --------------------------------------------------------------------------------------
export function budgetProposalValues(currentMinor: number, nextMinor: number, currency: string, kind: 'daily' | 'lifetime' = 'daily') {
  const key = kind === 'daily' ? 'daily_budget' : 'lifetime_budget';
  const delta = nextMinor - currentMinor;
  const factor = toMinorUnits(1, currency);
  return {
    current_value: { [key]: String(currentMinor) },
    proposed_value: { [key]: String(nextMinor) },
    budget_impact: { currency, per: kind, delta_major: delta / factor, current_major: currentMinor / factor, proposed_major: nextMinor / factor, note: 'Change in budget cap, not a prediction of spend or results.' },
  };
}

export const proposalKey = (parts: (string | number)[]) => parts.join(':');
