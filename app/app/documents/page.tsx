import Link from 'next/link';
import { BookmarkPlus, FileSignature, Plus } from 'lucide-react';
import { requireProfile } from '@/lib/auth';
import { canManageSigning } from '@/lib/permissions';
import { redirect } from 'next/navigation';
import { listSigningDocuments } from '@/lib/data/signing';
import { STATUS_LABELS } from '@/lib/signing/constants';
import { DocumentsList } from '@/components/signing/documents-table';
import { Button, buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export const metadata = { title: 'Documents & Signing · HomeQuote Network' };

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const profile = await requireProfile();
  if (!canManageSigning(profile)) redirect('/app');
  const sp = await searchParams;
  const rows = await listSigningDocuments({ q: sp.q, status: sp.status });
  const open = rows.filter((r) => r.status === 'awaiting_signature' || r.status === 'partially_signed').length;
  return (
    <div className="space-y-6">
      <PageHeader title="Documents & Signing" description="Upload a PDF, review suggested signature fields, and send it for electronic signature.">
        <Link href="/app/documents/templates" className={cn(buttonVariants({ size: 'lg', variant: 'outline' }), 'max-lg:w-full')}><BookmarkPlus className="size-4" /> Templates</Link>
        <Link href="/app/documents/new" className={cn(buttonVariants({ size: 'lg' }), 'max-lg:w-full')}><Plus className="size-4" /> New document</Link>
      </PageHeader>
      <form method="get" className="flex flex-wrap gap-2">
        <Input name="q" defaultValue={sp.q ?? ''} placeholder="Search title" className="max-w-xs" />
        <Select name="status" defaultValue={sp.status ?? ''} className="w-auto"><option value="">All statuses</option>{Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
        <Button type="submit" variant="outline">Filter</Button>
        {open > 0 && <span className="self-center text-sm text-muted-foreground">{open} awaiting signature</span>}
      </form>
      {rows.length ? <DocumentsList rows={rows} showCompany={profile.role === 'admin'} /> : (
        <EmptyState icon={FileSignature} title="No documents yet" description="Upload a contract, agreement or form to get it signed electronically." action={<Link href="/app/documents/new" className={buttonVariants()}>Upload a PDF</Link>} />
      )}
    </div>
  );
}
