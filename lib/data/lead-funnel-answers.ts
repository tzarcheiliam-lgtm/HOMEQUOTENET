import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { humanizeToken } from '@/lib/leads/display';

export interface FunnelAnswerItem { question: string; answer: string }
export interface FunnelAnswerSet {
  id: string;
  funnelName: string | null;
  submittedAt: string | null;
  items: FunnelAnswerItem[];
}

interface SnapshotQuestion {
  id?: string;
  headline?: string;
  type?: string;
  options?: { value?: string; label?: string }[];
}

function formatValue(v: unknown, q: SnapshotQuestion | undefined): string {
  if (v === null || v === undefined || v === '') return '';
  if (Array.isArray(v)) return v.map((x) => formatValue(x, q)).filter(Boolean).join(', ');
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'object') return JSON.stringify(v);
  const s = String(v);
  const opt = q?.options?.find((o) => o.value === s);
  if (opt?.label) return opt.label;
  // Typed answers (text, address, number…) are shown exactly as entered.
  if (q && q.type && q.type !== 'choice') return s;
  return humanizeToken(s);
}

/**
 * Every answer the homeowner gave in the website funnel(s) that produced this
 * lead, with the question wording and option labels from the config as it was
 * when they answered. funnel_sessions is admin-only under RLS, so this reads
 * with the service role scoped to one lead — call it only after the caller has
 * already loaded the lead through the RLS client.
 */
export async function getLeadFunnelAnswers(leadId: string): Promise<FunnelAnswerSet[]> {
  const { data } = await createAdminClient()
    .from('funnel_sessions')
    .select('id, answers, config_snapshot, contact_submitted_at, created_at')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false });

  return (data ?? []).map((row) => {
    const answers = (row.answers ?? {}) as Record<string, unknown>;
    const snapshot = (row.config_snapshot ?? {}) as { clientName?: string; questions?: SnapshotQuestion[] };
    const questions = Array.isArray(snapshot.questions) ? snapshot.questions : [];
    const seen = new Set<string>();
    const items: FunnelAnswerItem[] = [];
    for (const q of questions) {
      if (!q.id || !(q.id in answers)) continue;
      seen.add(q.id);
      const answer = formatValue(answers[q.id], q);
      if (answer) items.push({ question: q.headline || humanizeToken(q.id.replace(/[-_]/g, ' ')), answer });
    }
    // Answers with no matching question in the snapshot are still shown, never dropped.
    for (const [k, v] of Object.entries(answers)) {
      if (seen.has(k)) continue;
      const answer = formatValue(v, undefined);
      if (answer) items.push({ question: humanizeToken(k.replace(/[-_]/g, ' ')), answer });
    }
    return { id: row.id as string, funnelName: snapshot.clientName ?? null, submittedAt: (row.contact_submitted_at as string | null) ?? null, items };
  }).filter((s) => s.items.length > 0);
}
