/**
 * First-party HomeQuote Network outcome metrics, kept strictly separate from Meta-reported numbers.
 *
 * Two bases are always computed and labelled differently:
 *  - COHORT ("acquired in period"): leads created in the period, and what has happened to THEM so far
 *    (to date, whenever it happened). This is the right basis for cost-per-outcome: the spend bought these leads.
 *  - ACTIVITY ("occurred in period"): outcomes whose real timestamp falls in the period, regardless of when the
 *    lead arrived. This is the right basis for "what did the team close this month".
 * A cohort count will therefore usually differ from the activity count for the same dates.
 */
import { costPer } from './metrics';

export type LeadFact = {
  id: string; created_at: string;
  qualification_status: string | null;
  campaign_id: string | null; ad_set_id: string | null; ad_id: string | null;
};
export type OutcomeFact = {
  id: string; lead_id: string; outcome: string; occurred_at: string;
  amount: number | null; currency: string | null; corrects_id: string | null;
};

export type HqnCounts = {
  leads: number;
  qualified: number;
  appointments: number;   // distinct leads with a recorded booking
  won: number;            // distinct leads with a won sale not since refunded/cancelled
  wonValue: Record<string, number>; // by currency; never summed across currencies
  wonWithoutValue: number;
};
const empty = (): HqnCounts => ({ leads: 0, qualified: 0, appointments: 0, won: 0, wonValue: {}, wonWithoutValue: 0 });

/** Won events that were later corrected (refund / cancellation) no longer count. */
function netWon(events: OutcomeFact[]): OutcomeFact[] {
  const corrected = new Set(events.filter((e) => e.outcome === 'correction' && e.corrects_id).map((e) => e.corrects_id as string));
  return events.filter((e) => e.outcome === 'won' && !corrected.has(e.id));
}

function addWon(c: HqnCounts, wons: OutcomeFact[]) {
  const leadsWon = new Set<string>();
  for (const w of wons) {
    leadsWon.add(w.lead_id);
    if (w.amount !== null && w.currency) c.wonValue[w.currency] = (c.wonValue[w.currency] ?? 0) + w.amount;
    else c.wonWithoutValue += 1;
  }
  c.won += leadsWon.size;
}

export type GroupKey = 'campaign_id' | 'ad_set_id' | 'ad_id';

/** COHORT basis, grouped. `leads` must already be limited to those created in the period. */
export function cohortCounts(leads: LeadFact[], events: OutcomeFact[], groupBy: GroupKey): Map<string, HqnCounts> {
  const byLead = new Map<string, OutcomeFact[]>();
  for (const e of events) (byLead.get(e.lead_id) ?? byLead.set(e.lead_id, []).get(e.lead_id)!).push(e);
  const out = new Map<string, HqnCounts>();
  for (const l of leads) {
    const key = l[groupBy] ?? '__unattributed__';
    const c = out.get(key) ?? out.set(key, empty()).get(key)!;
    const ev = byLead.get(l.id) ?? [];
    c.leads += 1;
    if (l.qualification_status === 'qualified') c.qualified += 1;
    if (ev.some((e) => e.outcome === 'appointment_booked')) c.appointments += 1;
    addWon(c, netWon(ev));
  }
  return out;
}

/** ACTIVITY basis for the whole selection: outcomes that occurred in [startIso, endIso). */
export function activityCounts(
  leads: LeadFact[], events: OutcomeFact[], startIso: string, endIso: string,
): Omit<HqnCounts, 'leads'> & { leadsReceived: number } {
  const inRange = (iso: string) => iso >= startIso && iso < endIso;
  const stillQualified = new Set(leads.filter((l) => l.qualification_status === 'qualified').map((l) => l.id));
  const c = empty();
  const q = new Set<string>(), a = new Set<string>();
  for (const e of events) {
    if (!inRange(e.occurred_at)) continue;
    if (e.outcome === 'qualified' && stillQualified.has(e.lead_id)) q.add(e.lead_id);
    if (e.outcome === 'appointment_booked') a.add(e.lead_id);
  }
  addWon(c, netWon(events).filter((w) => inRange(w.occurred_at)));
  return {
    leadsReceived: leads.filter((l) => inRange(l.created_at)).length,
    qualified: q.size, appointments: a.size, won: c.won, wonValue: c.wonValue, wonWithoutValue: c.wonWithoutValue,
  };
}

export type CostPer = { perLead: number | null; perQualified: number | null; perAppointment: number | null; perWon: number | null };
/**
 * Cost per outcome from Meta spend (one currency) over the COHORT counts. A cost is only produced when Meta
 * spend can be attributed to the same set of leads: callers pass the HQN-attributed counts for the same ads.
 * "Cost per acquired contractor/customer" is deliberately absent: HQN does not link an ad click to a signed
 * contractor account, so that figure is not supportable from the underlying data.
 */
export function costsFromCohort(spend: number, c: HqnCounts): CostPer {
  return { perLead: costPer(spend, c.leads), perQualified: costPer(spend, c.qualified), perAppointment: costPer(spend, c.appointments), perWon: costPer(spend, c.won) };
}

export function sumCounts(list: Iterable<HqnCounts>): HqnCounts {
  const t = empty();
  for (const c of list) {
    t.leads += c.leads; t.qualified += c.qualified; t.appointments += c.appointments; t.won += c.won; t.wonWithoutValue += c.wonWithoutValue;
    for (const [cur, v] of Object.entries(c.wonValue)) t.wonValue[cur] = (t.wonValue[cur] ?? 0) + v;
  }
  return t;
}

// --------------------------------------------------------------------------------------------------
// Reconciliation: why Meta-reported leads and HQN leads differ
// --------------------------------------------------------------------------------------------------
export type Reconciliation = {
  metaReported: number;
  hqnAttributed: number;
  hqnUnattributed: number;   // HQN leads in the period with no ad id (direct, organic, or tracking lost)
  difference: number;        // metaReported - hqnAttributed
  notes: string[];
};

export function reconcile(metaReported: number, hqnAttributed: number, hqnUnattributed: number): Reconciliation {
  const notes = [
    'Meta counts a lead on the day of the ad interaction or conversion, in the ad account\'s timezone; HQN counts it when the lead record was created.',
    'Meta can report view-through and modeled conversions; HQN only counts leads that actually arrived with attribution.',
    'Meta de-duplicates browser and server events per event_id; HQN merges repeat submissions by contact details. Neither is "wrong".',
    'Leads missing ad parameters (the URL-parameter string was not set on an ad, a link was shared, or cookies were blocked) appear as unattributed in HQN.',
  ];
  if (hqnUnattributed > 0) notes.unshift(`${hqnUnattributed} HQN lead(s) in this period carry no ad id, so they cannot be matched to any ad.`);
  return { metaReported, hqnAttributed, hqnUnattributed, difference: metaReported - hqnAttributed, notes };
}
