import { randomUUID } from 'node:crypto';
import { requireRole } from '@/lib/auth';
import { getCallingOverview, listAssignedLeads } from '@/lib/data/ai-calling';
import { PageHeader } from '@/components/ui/page-header';
import { NewCallForm } from '@/components/ai-calls/new-call-form';

export const metadata = { title: 'New AI Call · HomeQuote Network' };

export default async function NewAiCallPage() {
  await requireRole(['admin']);
  const [overview, leads] = await Promise.all([getCallingOverview(), listAssignedLeads()]);
  // Only contractors that may place calls: not off, and with both Fish ids.
  const contractors = overview.contractors.filter((c) => c.config.status === 'ready').map((c) => ({ id: c.id, name: c.name }));
  return (
    <div className="space-y-6">
      <PageHeader title="New AI Call" description="Start a call with a contractor's configured AI agent. You will review everything before it is placed." backHref="/app/ai-calls" backLabel="AI Agent Calls" />
      <NewCallForm contractors={contractors} leads={leads} token={randomUUID()} />
    </div>
  );
}
