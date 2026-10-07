import { Badge } from '@/components/ui/badge';
import { when } from '@/components/meta/format';
import { ProposalActions } from './audit-forms';

export type ProposalView = {
  id: string; account_id: string; target_type: string; target_id: string; targetName: string | null; change_type: string; current_value: Record<string, unknown>; proposed_value: Record<string, unknown>;
  evidence: Record<string, unknown>; rationale: string; budget_impact: { currency?: string; delta_major?: number; current_major?: number; proposed_major?: number; note?: string } | null;
  learning_note: string | null; source_kind: string; source_version: string | null; status: string; approved_at: string | null; applied_at: string | null; expires_at: string; error_message: string | null;
  previous_state: unknown; provider_result: unknown; created_at: string; proposed_kind: string;
};

const VARIANT: Record<string, Parameters<typeof Badge>[0]['variant']> = { proposed: 'info', approved: 'warning', applied: 'success', failed: 'danger', stale: 'danger', rejected: 'muted', expired: 'muted', applying: 'warning', reverted: 'muted' };
const fmt = (v: Record<string, unknown>) => Object.entries(v).map(([k, x]) => `${k}: ${typeof x === 'object' ? JSON.stringify(x) : String(x)}`).join(', ');

/** One proposed live change, shown as exact current vs proposed values with evidence, budget impact and caveats. */
export function ProposalCard({ p, canApply, gateReasons }: { p: ProposalView; canApply: boolean; gateReasons: string[] }) {
  const bi = p.budget_impact;
  const increase = p.change_type === 'budget' && (bi?.delta_major ?? 0) > 0;
  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={VARIANT[p.status] ?? 'muted'}>{p.status}</Badge>
        <span className="font-medium">{p.change_type} · {p.target_type} {p.targetName ?? p.target_id}</span>
        <span className="text-xs text-muted-foreground">{p.account_id} · from {p.source_kind}{p.source_version ? ` (${p.source_version})` : ''} · {when(p.created_at)}</span>
      </div>
      <p className="text-sm">{p.rationale}</p>
      <div className="grid gap-2 text-sm sm:grid-cols-2">
        <div className="rounded bg-muted/50 p-2"><p className="text-xs text-muted-foreground">Current (when proposed)</p><p className="break-words font-mono text-xs">{fmt(p.current_value)}</p></div>
        <div className="rounded bg-muted/50 p-2"><p className="text-xs text-muted-foreground">Proposed</p><p className="break-words font-mono text-xs">{fmt(p.proposed_value)}</p></div>
      </div>
      {bi && <p className="text-sm">Budget impact: <b>{bi.current_major?.toFixed(2)} → {bi.proposed_major?.toFixed(2)} {bi.currency}</b> ({(bi.delta_major ?? 0) >= 0 ? '+' : ''}{bi.delta_major?.toFixed(2)}). {bi.note}</p>}
      {increase && <p className="text-sm font-medium text-amber-800">This raises spend capacity. A person must approve it; it is never applied automatically.</p>}
      {p.learning_note && <p className="text-xs text-muted-foreground">{p.learning_note}</p>}
      <details><summary className="cursor-pointer text-xs text-muted-foreground">Supporting evidence</summary><pre className="mt-2 overflow-x-auto rounded bg-muted p-2 text-xs">{JSON.stringify(p.evidence, null, 2)}</pre></details>
      <p className="text-xs text-muted-foreground">This is a change to a live Meta object, not a promise of results. Spend already incurred and delivery already affected cannot be undone; a reversal is a new proposal.</p>
      {p.error_message && <p role="alert" className="text-sm text-destructive">{p.error_message}</p>}
      {p.status === 'applied' && (
        <details><summary className="cursor-pointer text-xs text-muted-foreground">Applied {when(p.applied_at)} · previous state and Meta&rsquo;s response</summary>
          <pre className="mt-2 overflow-x-auto rounded bg-muted p-2 text-xs">{JSON.stringify({ previous_state: p.previous_state, provider_result: p.provider_result }, null, 2)}</pre></details>
      )}
      <ProposalActions id={p.id} status={p.status} canApply={canApply} gateReasons={gateReasons} needsApproval={false} />
    </div>
  );
}
