import Link from 'next/link';
import { ClipboardCheck } from 'lucide-react';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { accountGate } from '@/lib/meta/studio/server';
import { HQN_TIMEZONE } from '@/lib/data/meta-ads';
import { addDays, zonedDate } from '@/lib/meta/metrics';
import { AUDIT_VERSION } from '@/lib/meta/studio/audit';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { when } from '@/components/meta/format';
import { RunAuditForm } from '@/components/meta/studio/audit-forms';
import { ProposalCard, type ProposalView } from '@/components/meta/studio/proposal-card';

export const metadata = { title: 'Audits & Recommendations · HomeQuote Network' };
export const dynamic = 'force-dynamic';

export default async function AuditsPage() {
  await requireRole(['admin']);
  const db = await createClient();
  const today = zonedDate(new Date(), HQN_TIMEZONE);
  const [{ data: accounts }, { data: audits }, { data: proposals }] = await Promise.all([
    db.from('meta_ad_accounts').select('id, name').order('name'),
    db.from('meta_audits').select('id, audit_version, account_id, range_start, range_end, summary, created_at').order('created_at', { ascending: false }).limit(20),
    db.from('meta_change_proposals').select('*').order('created_at', { ascending: false }).limit(50),
  ]);
  const props = (proposals ?? []) as (Omit<ProposalView, 'targetName'>)[];
  const names = new Map<string, string>();
  const ids = [...new Set(props.map((p) => p.target_id))];
  if (ids.length) { const { data } = await db.from('meta_object_state').select('object_id, name').in('object_id', ids); for (const r of (data ?? []) as { object_id: string; name: string | null }[]) if (r.name) names.set(r.object_id, r.name); }
  const svc = createAdminClient();
  const gates = new Map<string, Awaited<ReturnType<typeof accountGate>>>();
  for (const a of [...new Set(props.map((p) => p.account_id))]) gates.set(a, await accountGate(svc, a));
  const open = props.filter((p) => ['proposed', 'approved', 'applying'].includes(p.status));
  const done = props.filter((p) => !['proposed', 'approved', 'applying'].includes(p.status));

  return (
    <div className="space-y-6">
      <PageHeader title="Audits & Recommendations" description="Evidence-based checks of your Meta account, and the changes they suggest. Nothing changes in Meta until you approve it." />
      <Card>
        <CardHeader><CardTitle>Run an audit</CardTitle><CardDescription>Method: {AUDIT_VERSION}. Checks that lack data or one of your thresholds say &ldquo;Not assessed&rdquo; instead of guessing. There is no made-up score.</CardDescription></CardHeader>
        <CardContent><RunAuditForm accounts={(accounts ?? []) as { id: string; name: string | null }[]} defaults={{ since: addDays(today, -30), until: addDays(today, -1) }} /></CardContent>
      </Card>

      <section className="space-y-3" aria-labelledby="open-h">
        <h2 id="open-h" className="text-lg font-semibold">Proposed changes awaiting a decision</h2>
        {open.length === 0 ? <EmptyState icon={ClipboardCheck} title="Nothing waiting" description="Proposals appear here when an audit finding or an approval-mode rule suggests a change." /> : open.map((p) => <ProposalCard key={p.id} p={{ ...p, targetName: names.get(p.target_id) ?? null }} canApply={gates.get(p.account_id)?.allowed ?? false} gateReasons={gates.get(p.account_id)?.reasons ?? []} />)}
      </section>

      <section className="space-y-3" aria-labelledby="past-h">
        <h2 id="past-h" className="text-lg font-semibold">Past audits</h2>
        {(audits ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No audits yet.</p> : (
          <Card><CardContent className="divide-y p-0">
            {(audits ?? []).map((a: { id: string; audit_version: string; account_id: string; range_start: string; range_end: string; created_at: string; summary: { headline?: string } }) => (
              <Link key={a.id} href={`/app/meta-ads/audits/${a.id}`} className="block px-4 py-3 hover:bg-muted/50">
                <p className="font-medium">{a.account_id} · {a.range_start} to {a.range_end}</p>
                <p className="text-sm text-muted-foreground">{a.summary?.headline}</p>
                <p className="text-xs text-muted-foreground">{a.audit_version} · {when(a.created_at)}</p>
              </Link>
            ))}
          </CardContent></Card>
        )}
      </section>

      {done.length > 0 && (
        <section className="space-y-3" aria-labelledby="hist-h">
          <h2 id="hist-h" className="text-lg font-semibold">Decided changes <Badge variant="muted">{done.length}</Badge></h2>
          {done.map((p) => <ProposalCard key={p.id} p={{ ...p, targetName: names.get(p.target_id) ?? null }} canApply={false} gateReasons={[]} />)}
        </section>
      )}
    </div>
  );
}
