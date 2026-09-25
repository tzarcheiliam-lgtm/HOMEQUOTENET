import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { WORKFLOW_TEMPLATES } from '@/lib/workflows';
import { PageHeader } from '@/components/ui/page-header';
import { CreateWorkflowForm } from '@/components/workflows/create-workflow-form';

export const metadata = { title: 'Create Workflow · HomeQuote Network' };
export default async function NewWorkflowPage() {
  await requireRole(['admin']);
  const db = await createClient();
  const { data } = await db.from('contractors').select('id,name').neq('status', 'inactive').order('name');
  return <div className="space-y-6"><PageHeader title="Create workflow" description="Start blank or customize a proven HomeQuote journey." backHref="/app/workflows" backLabel="Automations" /><CreateWorkflowForm templates={WORKFLOW_TEMPLATES} contractors={data ?? []} /></div>;
}
