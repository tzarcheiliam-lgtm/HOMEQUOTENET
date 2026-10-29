import { requireRole } from '@/lib/auth';
import { automationStatuses } from '@/lib/automations/status.server';
import { AutomationMap } from '@/components/automations/automation-map';
import { PageHeader } from '@/components/ui/page-header';

export const metadata = { title: 'Automation Map · HomeQuote Network' };
export const dynamic = 'force-dynamic';

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

export default async function AutomationsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireRole(['admin']);
  const sp = await searchParams;
  const { statuses, workflows } = await automationStatuses();
  return (
    <div className="space-y-6">
      <PageHeader title="Automation Map" description="Everything HomeQuote does on its own: what starts it, what it does, whether it’s on, and when it last ran." />
      <AutomationMap statuses={statuses} workflows={workflows} filters={{ area: one(sp.area), state: one(sp.state), q: one(sp.q)?.slice(0, 80) }} />
    </div>
  );
}
