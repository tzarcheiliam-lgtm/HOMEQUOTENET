import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { loadCapabilities } from '@/lib/data/workflow-graph';
import { PageHeader } from '@/components/ui/page-header';
import { AccessList } from '@/components/workflows/access-list';
import { WorkflowsSubNav } from '@/components/workflows/sub-nav';

export const metadata = { title: 'Automation access · HomeQuote Network' };
export const dynamic = 'force-dynamic';

export default async function WorkflowAccessPage() {
  const profile = await requireRole(['admin']);
  const caps = await loadCapabilities(profile);
  if (!caps.manageAccess) redirect('/app/workflows');
  const db = await createClient();
  const [{ data: contractors }, { data: access }, { data: calling }] = await Promise.all([
    db.from('contractors').select('id,name').neq('status', 'inactive').order('name'),
    db.from('workflow_builder_access').select('contractor_id,enabled'),
    db.from('ai_calling_contractor_settings').select('contractor_id,mode'),
  ]);
  const on = new Map(((access ?? []) as { contractor_id: string; enabled: boolean }[]).map((a) => [a.contractor_id, a.enabled]));
  const mode = new Map(((calling ?? []) as { contractor_id: string; mode: string }[]).map((c) => [c.contractor_id, c.mode]));
  return (
    <div className="space-y-6">
      <PageHeader title="Contractor access" description="Choose which contractor companies may build and publish automations for their own business. Owners only; staff can view. HomeQuote admins can always manage every account." />
      <WorkflowsSubNav showAccess />
      <AccessList rows={((contractors ?? []) as { id: string; name: string }[]).map((c) => ({ id: c.id, name: c.name, enabled: on.get(c.id) === true, mode: mode.get(c.id) ?? null }))} />
      <p className="text-sm text-muted-foreground">AI calls from automations are also governed by each contractor’s mode in <Link className="underline" href="/app/ai-calls">AI Agent Calls</Link> — set it to “Workflow only” or “Automatic”.</p>
    </div>
  );
}
