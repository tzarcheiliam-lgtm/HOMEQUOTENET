import Link from 'next/link';
import { redirect } from 'next/navigation';
import { FileStack, Star } from 'lucide-react';
import { requireProfile } from '@/lib/auth';
import { canManageContracts } from '@/lib/permissions';
import { ensureStarterTemplates, listCategories, listTemplates } from '@/lib/contracts/templates';
import { NewTemplateForm, UseTemplateButton } from '@/components/contracts/template-actions';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export const metadata = { title: 'Contract templates · HomeQuote Network' };
export const maxDuration = 60;

export default async function TemplatesPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string; status?: string }> }) {
  const profile = await requireProfile();
  if (!canManageContracts(profile)) redirect('/app');
  const sp = await searchParams;
  await ensureStarterTemplates(profile).catch(() => 0);
  const [templates, categories] = await Promise.all([listTemplates(profile, sp), listCategories(profile)]);
  return (
    <div className="space-y-6">
      <PageHeader title="Contract templates" description="Reusable agreements. Edit once, then send to any client in minutes." backHref="/app/contracts" backLabel="Contracts">
        <Link href="/app/contracts/new" className={cn(buttonVariants({ size: 'lg', variant: 'outline' }), 'max-lg:w-full')}>New agreement</Link>
      </PageHeader>
      <NewTemplateForm />
      <form method="get" className="flex flex-wrap gap-2" role="search" aria-label="Filter templates">
        <Input name="q" defaultValue={sp.q ?? ''} placeholder="Search templates" aria-label="Search templates" className="max-w-xs" />
        <Select name="category" defaultValue={sp.category ?? ''} aria-label="Category" className="w-auto"><option value="">All categories</option>{categories.map((c) => <option key={c} value={c}>{c}</option>)}</Select>
        <Select name="status" defaultValue={sp.status ?? ''} aria-label="Status" className="w-auto"><option value="">Active</option><option value="published">Published</option><option value="draft">Drafts</option><option value="archived">Archived</option></Select>
        <Button type="submit" variant="outline">Filter</Button>
      </form>
      {templates.length === 0 ? <EmptyState icon={FileStack} title="No templates match" description="Create a template above, or clear the filters." /> : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((t) => (
            <li key={t.id}>
              <Card className="h-full gap-3 p-4 lg:gap-3 lg:p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link href={`/app/contracts/templates/${t.id}`} className="font-semibold leading-snug hover:underline">{t.name}</Link>
                    <p className="mt-0.5 text-xs text-muted-foreground">{t.category}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Badge variant={t.status === 'published' ? 'success' : t.status === 'archived' ? 'muted' : 'warning'}>{t.status === 'published' ? `v${t.latestVersionNo}` : t.status}</Badge>
                    {t.isDefault && <Badge variant="info"><Star aria-hidden="true" /> Default</Badge>}
                  </div>
                </div>
                <p className="line-clamp-3 flex-1 text-sm text-muted-foreground">{t.description || 'No description yet.'}</p>
                <p className="text-xs text-muted-foreground">{t.sectionCount} sections · {t.usageCount} agreement{t.usageCount === 1 ? '' : 's'}{t.requiresReview ? ' · needs legal review' : ''}{t.unpublishedChanges ? ' · unpublished edits' : ''}</p>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/app/contracts/templates/${t.id}`} className={cn(buttonVariants({ size: 'sm', variant: 'outline' }))}>Edit</Link>
                  <UseTemplateButton templateId={t.id} disabled={t.status !== 'published'} />
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
