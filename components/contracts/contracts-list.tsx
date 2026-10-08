import Link from 'next/link';
import { ClientMark } from '@/components/contracts/client-mark';
import { ContractRowActions } from '@/components/contracts/row-actions';
import { ContractStatusBadge } from '@/components/contracts/status-badge';
import { Card } from '@/components/ui/card';
import type { ContractListItem } from '@/lib/contracts/contracts';
import { contractNumber } from '@/lib/contracts/numbers';

const fmt = (v: string | null) => (v ? new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');
const rel = (v: string) => {
  const d = Date.now() - new Date(v).getTime();
  const m = Math.floor(d / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  const days = Math.floor(h / 24);
  return days < 30 ? `${days} d ago` : fmt(v);
};

/** Responsive list: a dense table row on desktop, a card on phones. Same data and actions in both. */
export function ContractsList({ rows, admin, compact = false }: { rows: ContractListItem[]; admin: boolean; compact?: boolean }) {
  return (
    <Card className="divide-y overflow-hidden p-0 lg:p-0 lg:gap-0 gap-0 py-0">
      {!compact && (
        <div className="hidden grid-cols-[minmax(0,2.4fr)_minmax(0,1.3fr)_7rem_6.5rem_8.5rem_minmax(0,1.6fr)_2.5rem] items-center gap-3 bg-muted/40 px-4 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground lg:grid" role="row">
          <span>Client / agreement</span><span>Template</span><span className="text-right">Value</span><span>Sent</span><span>Status</span><span>Signers · last activity</span><span className="sr-only">Actions</span>
        </div>
      )}
      <ul>
        {rows.map((r) => {
          const href = r.status === 'draft' && admin ? `/app/contracts/${r.id}/edit` : `/app/contracts/${r.id}`;
          const signed = r.signers.filter((s) => s.status === 'signed').length;
          return (
            <li key={r.id} className="grid gap-x-3 gap-y-2 px-4 py-3 hover:bg-muted/30 lg:grid-cols-[minmax(0,2.4fr)_minmax(0,1.3fr)_7rem_6.5rem_8.5rem_minmax(0,1.6fr)_2.5rem] lg:items-center">
              <div className="flex min-w-0 items-center gap-3">
                <ClientMark name={r.clientName} url={r.clientLogoUrl} size={40} />
                <div className="min-w-0">
                  <Link href={href} className="block truncate font-medium hover:underline">{r.clientName}</Link>
                  <p className="truncate text-xs text-muted-foreground">{r.title} · {contractNumber(r.contractNo)}</p>
                </div>
                <div className="ml-auto lg:hidden"><ContractRowActions id={r.id} status={r.status} title={r.title} admin={admin} /></div>
              </div>
              {!compact && <p className="truncate text-sm text-muted-foreground"><span className="lg:hidden text-xs uppercase tracking-wider">Template · </span>{r.templateName ?? '—'}</p>}
              {!compact && <p className="text-sm tabular-nums lg:text-right"><span className="lg:hidden text-xs uppercase tracking-wider text-muted-foreground">Value · </span>{r.valueLabel}</p>}
              {!compact && <p className="text-sm text-muted-foreground"><span className="lg:hidden text-xs uppercase tracking-wider">{r.sentAt ? 'Sent · ' : 'Created · '}</span>{fmt(r.sentAt ?? r.createdAt)}</p>}
              <div className="flex flex-wrap items-center gap-2"><ContractStatusBadge status={r.status} />{compact && <span className="text-xs text-muted-foreground">{fmt(r.sentAt ?? r.createdAt)}</span>}</div>
              {!compact && (
                <div className="min-w-0 text-xs text-muted-foreground">
                  <p className="truncate">{r.signers.length ? `${signed}/${r.signers.length} signed · ${r.signers.map((s) => s.name.split(' ')[0]).join(', ')}` : 'No signers yet'}</p>
                  <p>{r.status === 'draft' ? 'Edited' : 'Last activity'} {rel(r.lastActivityAt)}</p>
                </div>
              )}
              <div className="hidden justify-end lg:flex"><ContractRowActions id={r.id} status={r.status} title={r.title} admin={admin} /></div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
