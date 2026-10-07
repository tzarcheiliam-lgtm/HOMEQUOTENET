import Link from 'next/link';
import { FileSignature, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DocumentsList } from '@/components/signing/documents-table';
import { buttonVariants } from '@/components/ui/button';
import { listSigningDocuments } from '@/lib/data/signing';
import { cn } from '@/lib/utils';

/** Documents & signing status for one lead or contractor record (RLS-scoped to what the viewer may see). */
export async function DocumentsPanel({ leadId, contractorId, className }: { leadId?: string; contractorId?: string; className?: string }) {
  const rows = await listSigningDocuments({ leadId, contractorId, limit: 20 }).catch(() => []);
  const href = `/app/documents/new?${new URLSearchParams({ ...(leadId ? { lead: leadId } : {}), ...(contractorId ? { contractor: contractorId } : {}) })}`;
  return (
    <Card className={className}>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2"><FileSignature className="size-4" /> Documents &amp; signing</CardTitle>
        <Link href={href} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}><Plus className="size-4" /> New</Link>
      </CardHeader>
      <CardContent>
        {rows.length ? <DocumentsList rows={rows} showCompany={false} showLead={!leadId} /> : <p className="text-sm text-muted-foreground">No documents yet. Upload a PDF to send it for electronic signature.</p>}
      </CardContent>
    </Card>
  );
}
