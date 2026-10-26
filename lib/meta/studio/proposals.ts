import type { MetaWriter } from './write-api';
import { redact } from './redact';
import { fromMinor } from './money';

/**
 * Change proposals: a recorded, reviewable intent to change one live Meta object. Applying one:
 *   1. atomically claims it (approved -> applying) so two clicks or two workers cannot apply it twice;
 *   2. RE-READS the object from Meta, proves it belongs to the proposal's ad account, and compares it with the
 *      `current_value` the human reviewed. If anything differs - someone edited it in Ads Manager, or a previous run
 *      already changed it - the proposal becomes `stale` and NOTHING is written;
 *   3. re-evaluates the gate (write switches, automation stop, budget-unit check) IMMEDIATELY before the write, so a
 *      switch turned off while the action was queued is honoured; a blocked proposal is released back to `approved`;
 *   4. limits unattended execution to pausing and LOWERING a budget: increases, resumes, schedule and targeting changes
 *      always need a person, whatever created the proposal;
 *   5. sends exactly the proposed change, stores the previous live state (for a possible manual reversal) and the
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
  /** applying -> approved again: used when a switch is found OFF at execution time, so the action stays queued. */
  release(id: string): Promise<void>;
  finish(id: string, patch: {
    status: 'applied' | 'failed' | 'stale';
    previous_state?: unknown; provider_result?: unknown; error_message?: string | null;
  }): Promise<void>;
  /** Remember what HQN just wrote so later drift can be told apart from our own change. */
  recordExpected(target: { type: string; id: string }, fields: Record<string, unknown>): Promise<void>;
  log(entry: { action: string; target_type: string; target_id: string; account_id: string; before?: unknown; after?: unknown; provider_result?: unknown; detail?: unknown }): Promise<void>;
}

const OWNERSHIP_FIELD = 'account_id'; // every live read also fetches this, to prove the object belongs to the proposal's account
/** Fields read back from Meta per change type (also what `current_value` must contain). */
export const LIVE_FIELDS: Record<ProposalChange, string> = {
  pause: `status,effective_status,${OWNERSHIP_FIELD}`,
  resume: `status,effective_status,${OWNERSHIP_FIELD}`,
  budget: `status,daily_budget,lifetime_budget,${OWNERSHIP_FIELD}`,
  schedule: `start_time,end_time,${OWNERSHIP_FIELD}`,
  targeting: `targeting,${OWNERSHIP_FIELD}`,
  notify: `status,${OWNERSHIP_FIELD}`,
};
const digits = (id: string) => id.replace(/^act_/, '');

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
  | { outcome: 'blocked'; reasons: string[] }
  | { outcome: 'not_claimable' | 'not_approved' | 'expired' | 'nothing_to_write' };

export type ApplyDeps = {
  writer: MetaWriter;
  store: ProposalStore;
  /**
   * Evaluated AFTER the claim and the live re-read, immediately before the write - so a switch turned off (or the global
   * stop pressed) while the action was queued is honoured. Callers include the budget-unit gate for budget changes.
   */
  gate: () => Promise<{ allowed: boolean; reasons: string[] }>;
  now?: Date;
};

export async function applyProposal(p: ProposalRow, deps: ApplyDeps): Promise<ApplyResult> {
  const now = deps.now ?? new Date();
  if (!p.approved_by && !p.auto_approved_by_rule) return { outcome: 'not_approved' };
  if (new Date(p.expires_at) <= now) return { outcome: 'expired' };
  const body = writeBody(p);
  if (!body) return { outcome: 'nothing_to_write' };

  // Unattended changes (no person approved) are limited to pausing and LOWERING a daily budget, whatever created them.
  const unattended = !p.approved_by;
  if (unattended && p.change_type !== 'pause' && p.change_type !== 'budget') return { outcome: 'not_approved' };
  if (p.change_type === 'budget') {
    const cur = Number(p.current_value.daily_budget ?? p.current_value.lifetime_budget ?? NaN);
    const next = Number(p.proposed_value.daily_budget ?? p.proposed_value.lifetime_budget ?? NaN);
    if (!Number.isFinite(cur) || !Number.isFinite(next)) return { outcome: 'failed', message: 'Budget values are missing from the proposal.' };
    if (unattended && !(next < cur)) return { outcome: 'not_approved' }; // increases (and no-ops) always need a person
    if (unattended && p.proposed_value.lifetime_budget != null) return { outcome: 'not_approved' }; // lifetime budgets are never auto-adjusted
  }

  if (!(await deps.store.claim(p.id))) return { outcome: 'not_claimable' };

  const live = await deps.writer.get<Record<string, unknown>>(p.target_id, { fields: LIVE_FIELDS[p.change_type] });
  if (!live.ok) {
    const message = redact(live.failure.message);
    await deps.store.finish(p.id, { status: 'failed', error_message: `Could not re-check the current state in Meta: ${message}` });
    await deps.store.log({ action: 'proposal.failed', target_type: p.target_type, target_id: p.target_id, account_id: p.account_id, detail: { stage: 'recheck', class: live.failure.kind } });
    return { outcome: 'failed', message };
  }
  // Scope: the object Meta returns must belong to the ad account this proposal (and its approver) named.
  if (String(live.data[OWNERSHIP_FIELD] ?? '') !== digits(p.account_id)) {
    const message = 'The object does not belong to the ad account named in the proposal (or Meta did not say which account it belongs to); nothing was applied.';
    await deps.store.finish(p.id, { status: 'failed', previous_state: live.data, error_message: message });
    await deps.store.log({ action: 'proposal.failed', target_type: p.target_type, target_id: p.target_id, account_id: p.account_id, detail: { stage: 'ownership' } });
    return { outcome: 'failed', message };
  }
  const liveComparable: Record<string, unknown> = { ...live.data };
  delete liveComparable[OWNERSHIP_FIELD];
  const drift = driftBetween(p.current_value, liveComparable);
  if (drift.length) {
    await deps.store.finish(p.id, { status: 'stale', previous_state: live.data, error_message: 'The object changed in Meta since this proposal was made; nothing was applied.' });
    await deps.store.log({ action: 'proposal.stale', target_type: p.target_type, target_id: p.target_id, account_id: p.account_id, before: p.current_value, after: live.data, detail: { drift } });
    return { outcome: 'stale', drift };
  }

  const gate = await deps.gate();
  if (!gate.allowed) {
    await deps.store.release(p.id);
    await deps.store.log({ action: 'proposal.blocked', target_type: p.target_type, target_id: p.target_id, account_id: p.account_id, detail: { reasons: gate.reasons } });
    return { outcome: 'blocked', reasons: gate.reasons };
  }

  const res = await deps.writer.post<{ success?: boolean }>(p.target_id, body);
  if (!res.ok) {
    const message = redact(res.failure.message);
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
  const cur = fromMinor(currentMinor, currency);
  const next = fromMinor(nextMinor, currency);
  if (cur == null || next == null) throw new Error(`Cannot express a ${currency} budget: currency not in Meta’s documented table`);
  return {
    current_value: { [key]: String(currentMinor) },
    proposed_value: { [key]: String(nextMinor) },
    budget_impact: { currency, per: kind, delta_major: Number(next) - Number(cur), current_major: Number(cur), proposed_major: Number(next), note: 'Change in budget cap, not a prediction of spend or results. Units assume the account’s budget-unit check was passed.' },
  };
}

export const proposalKey = (parts: (string | number)[]) => parts.join(':');
