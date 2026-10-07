import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { when } from '@/components/meta/format';
import { ProposeButton } from '@/components/meta/studio/audit-forms';

export const metadata = { title: 'Audit report · HomeQuote Network' };
export const dynamic = 'force-dynamic';

type Finding = { id: string; control_id: string; status: string; severity: string; kind: 'fact' | 'hypothesis'; title: string; observation: string; data: Record<string, unknown>; why_it_matters: string | null; proposed_action: string | null; confidence: string | null; limitations: string | null; evaluation: string | null };
const STATUS: Record<string, [Parameters<typeof Badge>[0]['variant'], string]> = {
  fail: ['danger', 'Fail'], attention: ['warning', 'Needs attention'], pass: ['success', 'OK'], info: ['info', 'Info'], not_assessed: ['muted', 'Not assessed'], not_applicable: ['muted', 'Not applicable'],
};

export default async function AuditReportPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(['admin']);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = await createClient();
  const { data: audit } = await db.from('meta_audits').select('*').eq('id', id).maybeSingle();
  if (!audit) notFound();
  const { data: fs } = await db.from('meta_audit_findings').select('*').eq('audit_id', id).order('rank');
  const findings = (fs ?? []) as Finding[];
  const s = audit.summary as { headline: string; counts: Record<string, number>; next_actions: { control_id: string; title: string; action: string; confidence: string | null }[]; thresholds_missing: string[] };
  const group = (pred: (f: Finding) => boolean) => findings.filter(pred);
  const attention = group((f) => f.status === 'fail' || f.status === 'attention');
  const ok = group((f) => f.status === 'pass' || f.status === 'info');
  const na = group((f) => f.status === 'not_assessed' || f.status === 'not_applicable');

  const Card1 = ({ f }: { f: Finding }) => {
    const [variant, label] = STATUS[f.status] ?? ['muted', f.status];
    const hasProposal = !!(f.data as { proposal?: unknown }).proposal;
    return (
      <div className="space-y-2 rounded-lg border p-4">
        <div className="flex flex-wrap items-center gap-2"><Badge variant={variant}>{label}</Badge><Badge variant="outline">{f.kind === 'fact' ? 'Fact' : 'Hypothesis'}</Badge><span className="font-medium">{f.title}</span><span className="text-xs text-muted-foreground">{f.control_id}</span></div>
        <p className="text-sm"><span className="font-medium">Observation. </span>{f.observation}</p>
        <p className="text-xs text-muted-foreground">Period: {audit.range_start} to {audit.range_end}{f.confidence ? ` · Confidence: ${f.confidence}` : ''}</p>
        {f.why_it_matters && <p className="text-sm"><span className="font-medium">Why it matters. </span>{f.why_it_matters}</p>}
        {f.proposed_action && <p className="text-sm"><span className="font-medium">Proposed action. </span>{f.proposed_action}</p>}
        {f.evaluation && <p className="text-sm"><span className="font-medium">How to evaluate it. </span>{f.evaluation}</p>}
        {f.limitations && <p className="text-xs text-muted-foreground"><span className="font-medium">Limitations. </span>{f.limitations}</p>}
        <details><summary className="cursor-pointer text-xs text-muted-foreground">Supporting data</summary><pre className="mt-2 overflow-x-auto rounded bg-muted p-2 text-xs">{JSON.stringify(f.data, null, 2)}</pre></details>
        {hasProposal && <ProposeButton findingId={f.id} />}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader title={`Audit · ${audit.account_id}`} description={`${audit.range_start} to ${audit.range_end} · ${audit.audit_version} · ${when(audit.created_at)}`} backHref="/app/meta-ads/audits" backLabel="Audits" />
      <Card>
        <CardHeader><CardTitle>Summary</CardTitle><CardDescription>{s.headline}</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium">Most useful next actions</p>
            {s.next_actions.length === 0 ? <p className="text-sm text-muted-foreground">No assessed check produced an action. Set thresholds in Activity &amp; settings so more checks can be graded.</p> : (
              <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm">{s.next_actions.map((a) => <li key={a.control_id + a.title}><b>{a.title}:</b> {a.action}{a.confidence ? ` (confidence: ${a.confidence})` : ''}</li>)}</ol>
            )}
          </div>
          {s.thresholds_missing.length > 0 && <p className="text-xs text-muted-foreground">Not graded because you have not set: {s.thresholds_missing.join('; ')}.</p>}
        </CardContent>
      </Card>
      <section className="space-y-3"><h2 className="text-lg font-semibold">Findings needing attention <Badge variant="muted">{attention.length}</Badge></h2>{attention.length ? attention.map((f) => <Card1 key={f.id} f={f} />) : <p className="text-sm text-muted-foreground">None among the checks that could be assessed.</p>}</section>
      <section className="space-y-3"><h2 className="text-lg font-semibold">Assessed, no action <Badge variant="muted">{ok.length}</Badge></h2>{ok.map((f) => <Card1 key={f.id} f={f} />)}</section>
      <section className="space-y-3"><h2 className="text-lg font-semibold">Not assessed <Badge variant="muted">{na.length}</Badge></h2>{na.map((f) => <Card1 key={f.id} f={f} />)}</section>
    </div>
  );
}
