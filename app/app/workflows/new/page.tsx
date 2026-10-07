import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { loadCapabilities } from '@/lib/data/workflow-graph';
import { GRAPH_TEMPLATES } from '@/lib/workflows/graph';
import { PageHeader } from '@/components/ui/page-header';
import { CreateGraphForm } from '@/components/workflows/create-graph-form';

export const metadata = { title: 'New automation · HomeQuote Network' };

export default async function NewWorkflowPage() {
  const profile = await requireRole(['admin', 'contractor']);
  const caps = await loadCapabilities(profile);
  const fixed = caps.scopeContractorId;
  if (!caps.createNetwork && !caps.edit(fixed)) redirect('/app/workflows');
  const db = await createClient();
  const { data } = caps.createNetwork ? await db.from('contractors').select('id,name').neq('status', 'inactive').order('name') : { data: [] };
  return (
    <div className="space-y-6">
      <PageHeader title="New automation" description="Start blank or from a proven journey. You’ll land in the visual builder with an unpublished draft." backHref="/app/workflows" backLabel="Automations">
        {caps.createNetwork && <Link href="/app/workflows/new-classic" className="text-sm text-muted-foreground underline">Classic list builder</Link>}
      </PageHeader>
      <CreateGraphForm
        templates={GRAPH_TEMPLATES.map(({ key, name, summary, description, requires }) => ({ key, name, summary, description, requires }))}
        contractors={(data ?? []) as { id: string; name: string }[]}
        fixedContractorId={fixed}
        canPickNetwork={caps.createNetwork}
      />
    </div>
  );
}
