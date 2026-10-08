import Link from 'next/link';
import { redirect } from 'next/navigation';
import { FileStack, Star } from 'lucide-react';
import { requireProfile } from '@/lib/auth';
import { canManageContracts } from '@/lib/permissions';
import { createAdminClient } from '@/lib/supabase/admin';
import { ensureStarterTemplates, listTemplates } from '@/lib/contracts/templates';
import { UseTemplateButton } from '@/components/contracts/template-actions';
import { WizardSteps } from '@/components/contracts/wizard-steps';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { cn } from '@/lib/utils';

export const metadata = { title: 'New agreement · HomeQuote Network' };
export const maxDuration = 60;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function NewContractPage({ searchParams }: { searchParams: Promise<{ contractor?: string; category?: string }> }) {
  const profile = await requireProfile();
  if (!canManageContracts(profile)) redirect('/app/contracts');
  const sp = await searchParams;
  await ensureStarterTemplates(profile).catch(() => 0);
  const all = (await listTemplates(profile, { status: 'published', category: sp.category })).filter((t) => t.status === 'published');
  const contractorId = sp.contractor && UUID.test(sp.contractor) ? sp.contractor : null;
  const preset = contractorId ? (await createAdminClient().from('contractors').select('name').eq('id', contractorId).maybeSingle()).data : null;
  const cats = Array.from(new Set(all.map((t) => t.category))).sort();
  const sorted = [...all].sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.name.localeCompare(b.name));
  return (
    <div className="space-y-6">
      <PageHeader title="New agreement" description={preset ? `Choose a template for ${preset.name}.` : 'Step 1 of 6: choose a template.'} backHref="/app/contracts" backLabel="Contracts">
        <Link href="/app/contracts/templates" className={cn(buttonVariants({ size: 'lg', variant: 'outline' }), 'max-lg:w-full')}>Manage templates</Link>
      </PageHeader>
      <WizardSteps current={0} />
      {cats.length > 1 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
          <Link href={contractorId ? `?contractor=${contractorId}` : '?'} className={cn(buttonVariants({ size: 'sm', variant: sp.category ? 'outline' : 'default' }))}>All</Link>
          {cats.map((c) => <Link key={c} href={`?${new URLSearchParams({ category: c, ...(contractorId ? { contractor: contractorId } : {}) })}`} className={cn(buttonVariants({ size: 'sm', variant: sp.category === c ? 'default' : 'outline' }))}>{c}</Link>)}
        </div>
      )}
      {sorted.length === 0 ? <EmptyState icon={FileStack} title="No published templates" description="Publish a template first, then you can create agreements from it." action={<Link href="/app/contracts/templates" className={buttonVariants()}>Open templates</Link>} /> : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sorted.map((t) => (
            <li key={t.id}>
              <Card className="h-full gap-3 p-4 lg:gap-3 lg:p-5">
                <div className="flex items-start justify-between gap-2">
                  <div><p className="font-semibold leading-snug">{t.name}</p><p className="mt-0.5 text-xs text-muted-foreground">{t.category}</p></div>
                  {t.isDefault && <Badge variant="info"><Star aria-hidden="true" /> Default</Badge>}
                </div>
                <p className="flex-1 text-sm text-muted-foreground">{t.description}</p>
                {t.variables.length > 0 && <p className="text-xs text-muted-foreground">You will fill in: {t.variables.slice(0, 6).map((v) => v.replace(/_/g, ' ')).join(', ')}{t.variables.length > 6 ? '…' : ''}</p>}
                <div><UseTemplateButton templateId={t.id} contractorId={contractorId} label="Use this template" size="default" /></div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
