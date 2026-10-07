import Link from 'next/link';
import { SigningStatusBadge } from '@/components/signing/status-badge';
import { Card } from '@/components/ui/card';
import type { SigningListRow } from '@/lib/data/signing';

const fmt = (v: string | null) => (v ? new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—');

/** Card list that works on phones and desktops (used on the Documents page and on lead/contractor records). */
export function DocumentsList({ rows, showCompany = true, showLead = true }: { rows: SigningListRow[]; showCompany?: boolean; showLead?: boolean }) {
  return (
    <Card className="divide-y p-0">
      {rows.map((r) => {
        const signed = r.signers.filter((s) => s.status === 'signed').length;
        return (
          <Link key={r.documentId} href={`/app/documents/${r.versionId}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-muted/50">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{r.title} {r.versionNo > 1 && <span className="text-xs font-normal text-muted-foreground">v{r.versionNo}</span>}</p>
              <p className="truncate text-xs text-muted-foreground">
                {[showCompany && r.contractorName, showLead && r.leadName && `Lead: ${r.leadName}`, r.signers.length ? `${signed}/${r.signers.length} signed · ${r.signers.map((s) => s.name).join(', ')}` : 'No signers yet'].filter(Boolean).join(' · ')}
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{r.status === 'completed' ? `Completed ${fmt(r.completedAt)}` : r.sentAt ? `Sent ${fmt(r.sentAt)}` : `Created ${fmt(r.createdAt)}`}</span>
              <SigningStatusBadge status={r.status} />
            </div>
          </Link>
        );
      })}
    </Card>
  );
}
