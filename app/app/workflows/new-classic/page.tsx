import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { WORKFLOW_TEMPLATES } from '@/lib/workflows';
import { PageHeader } from '@/components/ui/page-header';
import { CreateWorkflowForm } from '@/components/workflows/create-workflow-form';

export const metadata = { title: 'Create classic workflow · HomeQuote Network' };
// The original list-style builder, kept for admins so existing journeys can still be cloned and edited.
export default async function NewClassicWorkflowPage() {
  await requireRole(['admin']);
  const db = await createClient();
  const { data } = await db.from('contractors').select('id,name').neq('status', 'inactive').order('name');
  return <div className="space-y-6"><PageHeader title="Create classic workflow" description="The original list-style builder. New automations should use the visual builder." backHref="/app/workflows/new" backLabel="New automation" /><CreateWorkflowForm templates={WORKFLOW_TEMPLATES} contractors={data ?? []} /></div>;
}
