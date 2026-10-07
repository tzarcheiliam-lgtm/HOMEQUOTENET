import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { BookmarkPlus, FileText } from 'lucide-react';
import { requireProfile } from '@/lib/auth';
import { canManageSigning } from '@/lib/permissions';
import { archiveTemplate, listTemplates } from '@/lib/signing/templates';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmAction } from '@/components/ui/confirm-action';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { cn } from '@/lib/utils';

export const metadata = { title: 'Signing templates · HomeQuote Network' };
export const dynamic = 'force-dynamic';

async function archive(fd: FormData) {
  'use server';
  const profile = await requireProfile();
  if (!canManageSigning(profile)) redirect('/app');
  const id = String(fd.get('id') ?? '');
  try { await archiveTemplate(profile, id); } catch { /* already gone or not yours: same outcome */ }
  revalidatePath('/app/documents/templates');
}

export default async function TemplatesPage() {
  const profile = await requireProfile();
  if (!canManageSigning(profile)) redirect('/app');
  const templates = await listTemplates(profile);
  return (
    <div className="space-y-6">
      <PageHeader title="Signing templates" description="Reusable documents: the PDF and where each signer signs, saved once and sent again and again." backHref="/app/documents" backLabel="Documents" />
      {templates.length === 0 ? (
        <EmptyState icon={BookmarkPlus} title="No templates yet" description="Open any document, then choose “Save as template”. Signer names are never saved, only roles like “Homeowner” and “Contractor”." action={<Link href="/app/documents" className={buttonVariants()}>Go to documents</Link>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((t) => (
            <Card key={t.id}><CardContent className="flex h-full flex-col gap-3 p-4">
              <div><p className="flex items-center gap-2 font-semibold"><FileText className="size-4 text-muted-foreground" /> <span className="truncate">{t.name}</span></p>
                {t.description && <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>}
                {profile.role === 'admin' && <p className="mt-1 text-xs text-muted-foreground">{t.companyName ?? 'HomeQuote Network (internal)'}</p>}</div>
              <div className="flex flex-wrap gap-1.5">{t.roles.map((r, i) => <Badge key={i} variant="secondary">{i + 1}. {r}</Badge>)}</div>
              <p className="text-xs text-muted-foreground">{t.page_count} page{t.page_count === 1 ? '' : 's'} · {t.fieldCount} field{t.fieldCount === 1 ? '' : 's'} · {t.signing_order === 'sequential' ? 'signed in sequence' : 'any order'}{t.require_access_code ? ' · access code' : ''}{t.auto_remind_days ? ` · reminders every ${t.auto_remind_days}d` : ''} · used {t.use_count}×</p>
              <div className="mt-auto flex items-center gap-2">
                <Link href={`/app/documents/templates/${t.id}`} className={cn(buttonVariants({ size: 'sm' }))}>Use template</Link>
                <ConfirmAction action={archive} fields={{ id: t.id }} triggerLabel="Archive" triggerVariant="ghost" destructive title="Archive this template?" description="It disappears from this list and can no longer be used. Documents already created from it are not affected." confirmLabel="Archive" />
              </div>
            </CardContent></Card>
          ))}
        </div>
      )}
    </div>
  );
}
