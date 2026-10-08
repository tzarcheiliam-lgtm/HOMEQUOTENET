import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AlertTriangle, CheckCircle2, CircleDashed, FileSignature, Plus, Send } from 'lucide-react';
import { requireProfile } from '@/lib/auth';
import { canManageContracts, canViewOwnContracts } from '@/lib/permissions';
import { listContracts } from '@/lib/contracts/contracts';
import { CONTRACT_STATUSES, CONTRACT_STATUS_LABELS } from '@/lib/contracts/status';
import { listTemplates } from '@/lib/contracts/templates';
import { ContractsList } from '@/components/contracts/contracts-list';
import { Button, buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Select } from '@/components/ui/select';
import { SummaryStrip } from '@/components/ui/summary-strip';
import { cn } from '@/lib/utils';

export const metadata = { title: 'Contracts · HomeQuote Network' };

export default async function ContractsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; template?: string; sort?: string }> }) {
  const profile = await requireProfile();
  const admin = canManageContracts(profile);
  if (!admin && !canViewOwnContracts(profile)) redirect('/app');
  const sp = await searchParams;
  const [all, templates] = await Promise.all([listContracts(profile, { sort: sp.sort }), admin ? listTemplates(profile) : Promise.resolve([])]);
  const rows = (await listContracts(profile, { q: sp.q, status: sp.status, templateId: sp.template, sort: sp.sort }));
  const count = (...s: string[]) => all.filter((c) => s.includes(c.status)).length;
  return (
    <div className="space-y-6">
      <PageHeader title="Contracts" description={admin ? 'Send reusable agreements for e-signature and track them to completion.' : 'Agreements between your company and HomeQuote Network.'}>
        {admin && <Link href="/app/contracts/templates" className={cn(buttonVariants({ size: 'lg', variant: 'outline' }), 'max-lg:w-full')}>Templates</Link>}
        {admin && <Link href="/app/contracts/new" className={cn(buttonVariants({ size: 'lg' }), 'max-lg:w-full')}><Plus className="size-4" /> New agreement</Link>}
      </PageHeader>
      <SummaryStrip items={[
        ...(admin ? [{ label: 'Drafts', value: count('draft'), meaning: 'not sent yet', icon: CircleDashed }] : []),
        { label: 'Awaiting signature', value: count('sent', 'viewed', 'partially_signed'), meaning: 'out with signers', icon: Send },
        { label: 'Completed', value: count('completed'), meaning: 'fully signed', icon: CheckCircle2 },
        { label: 'Needs attention', value: count('declined', 'expired'), meaning: 'declined or expired', icon: AlertTriangle, attention: true },
        ...(!admin ? [{ label: 'All agreements', value: all.length, meaning: 'sent to your company', icon: FileSignature }] : []),
      ]} />
      <form method="get" className="flex flex-wrap gap-2" role="search" aria-label="Filter contracts">
        <Input name="q" defaultValue={sp.q ?? ''} placeholder="Search client, title or signer" aria-label="Search contracts" className="max-w-xs" />
        <Select name="status" defaultValue={sp.status ?? ''} aria-label="Status" className="w-auto"><option value="">All statuses</option>{CONTRACT_STATUSES.filter((s) => admin || s !== 'draft').map((s) => <option key={s} value={s}>{CONTRACT_STATUS_LABELS[s]}</option>)}</Select>
        {admin && <Select name="template" defaultValue={sp.template ?? ''} aria-label="Template" className="w-auto max-w-56"><option value="">All templates</option>{templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select>}
        <Select name="sort" defaultValue={sp.sort ?? 'activity_desc'} aria-label="Sort by" className="w-auto">
          <option value="activity_desc">Latest activity</option><option value="created_desc">Newest</option><option value="created_asc">Oldest</option><option value="value_desc">Highest value</option><option value="client_asc">Client A–Z</option>
        </Select>
        <Button type="submit" variant="outline">Apply</Button>
        {(sp.q || sp.status || sp.template) && <Link href="/app/contracts" className={cn(buttonVariants({ variant: 'ghost' }))}>Clear</Link>}
      </form>
      {rows.length ? <ContractsList rows={rows} admin={admin} /> : (
        all.length ? <EmptyState icon={FileSignature} title="No agreements match" description="Try a different search or clear the filters." />
          : <EmptyState icon={FileSignature} title={admin ? 'No agreements yet' : 'No agreements yet'} description={admin ? 'Pick a template, choose a contractor, and send your first agreement in a couple of minutes.' : 'Agreements sent to your company will appear here.'} action={admin ? <Link href="/app/contracts/new" className={buttonVariants()}>New agreement</Link> : undefined} />
      )}
    </div>
  );
}
