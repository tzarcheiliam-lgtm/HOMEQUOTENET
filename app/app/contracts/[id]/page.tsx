import { notFound, redirect } from 'next/navigation';
import { CheckCircle2, Circle, Clock, Eye, FileX2 } from 'lucide-react';
import { requireProfile } from '@/lib/auth';
import { canManageContracts, canViewOwnContracts } from '@/lib/permissions';
import { ContractError } from '@/lib/contracts/errors';
import { getContractDetail } from '@/lib/contracts/contracts';
import { contractNumber } from '@/lib/contracts/numbers';
import { isOpen } from '@/lib/contracts/status';
import { ClientMark } from '@/components/contracts/client-mark';
import { ContractActions, DownloadButtons, SignerButtons } from '@/components/contracts/detail-actions';
import { ContractPdfViewer } from '@/components/contracts/pdf-url-viewer';
import { ContractStatusBadge } from '@/components/contracts/status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';

export const metadata = { title: 'Agreement · HomeQuote Network' };

const when = (v: string | null) => (v ? new Date(v).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—');
const RS: Record<string, { label: string; icon: typeof Circle }> = {
  pending: { label: 'Not yet invited', icon: Circle }, sent: { label: 'Invited', icon: Clock }, viewed: { label: 'Viewed', icon: Eye }, signed: { label: 'Signed', icon: CheckCircle2 }, declined: { label: 'Declined', icon: FileX2 },
};

export default async function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireProfile();
  const admin = canManageContracts(profile);
  if (!admin && !canViewOwnContracts(profile)) redirect('/app');
  const { id } = await params;
  const d = await getContractDetail(profile, id).catch((e) => { if (e instanceof ContractError) return null; throw e; });
  if (!d) notFound();
  if (d.status === 'draft') redirect(admin ? `/app/contracts/${id}/edit` : '/app/contracts');
  const c = d.contract;
  const open = isOpen(d.status);
  const client = c.client as { company?: string };
  const completed = d.status === 'completed';
  return (
    <div className="space-y-6">
      <PageHeader title={c.title} description={`${contractNumber(c.contract_no)} · ${c.template_name ?? 'Agreement'}`} backHref="/app/contracts" backLabel="Contracts"><ContractStatusBadge status={d.status} /></PageHeader>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <ClientMark name={client.company || 'Client'} url={d.clientLogoUrl} size={52} />
              <div className="min-w-0"><p className="truncate text-lg font-semibold">{client.company || '—'}</p><p className="text-sm text-muted-foreground">{d.valueLabel !== '—' ? `Value ${d.valueLabel}` : 'Variable pricing'}</p></div>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
              <div><dt className="text-xs text-muted-foreground">Created</dt><dd>{when(c.created_at)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Sent</dt><dd>{when(d.version?.sentAt ?? c.sent_at)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">{completed ? 'Completed' : 'Expires'}</dt><dd>{when(completed ? d.version?.completedAt ?? null : d.version?.expiresAt ?? null)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Document fingerprint</dt><dd className="font-mono text-xs" title={c.document_sha256 ?? ''}>{c.document_sha256 ? `${c.document_sha256.slice(0, 12)}…` : '—'}</dd></div>
            </dl>
            <DownloadButtons contractId={c.id} completed={completed} finalReady={!!d.version?.finalReady} admin={admin} />
            {admin && <ContractActions contractId={c.id} versionId={d.version?.id ?? null} open={open} canVoid={open} />}
          </CardContent>
        </Card>
        <Card id="signers">
          <CardHeader><CardTitle className="text-base">Signers · {d.recipients.filter((r) => r.status === 'signed').length}/{d.recipients.length} signed</CardTitle></CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {d.recipients.map((r, i) => {
                const S = RS[r.status] ?? RS.pending;
                return (
                  <li key={r.id} className="space-y-1.5 rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0"><p className="truncate font-medium">{i + 1}. {r.name}</p>{admin && <p className="truncate text-xs text-muted-foreground">{r.email}</p>}</div>
                      <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-muted-foreground"><S.icon className="size-3.5" aria-hidden="true" />{S.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{r.signed_at ? `Signed ${when(r.signed_at)}` : r.declined_at ? `Declined ${when(r.declined_at)}${r.decline_reason ? `: ${r.decline_reason}` : ''}` : r.first_viewed_at ? `Opened ${when(r.first_viewed_at)}` : r.last_sent_at ? `Invited ${when(r.last_sent_at)}` : 'Waiting for their turn'}</p>
                    {r.last_email_status === 'failed' && admin && <p className="text-xs text-destructive">Email failed: {r.last_email_error}</p>}
                    {admin && open && r.status !== 'signed' && r.status !== 'declined' && <SignerButtons contractId={c.id} recipientId={r.id} name={r.name} canRemind={!!r.invited_at} />}
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <section aria-label="Document" className="min-w-0"><ContractPdfViewer contractId={c.id} kind={completed && d.version?.finalReady ? 'final' : 'original'} /></section>
        {admin && (
          <aside className="space-y-4">
            <Card id="audit">
              <CardHeader><CardTitle className="text-base">Audit history</CardTitle></CardHeader>
              <CardContent>
                <ol className="space-y-3 border-l pl-4">
                  {d.timeline.map((t, i) => (
                    <li key={i} className="relative text-sm">
                      <span className="absolute -left-[1.3rem] top-1.5 size-2 rounded-full bg-primary" aria-hidden="true" />
                      <p>{t.label}{t.who && <span className="text-muted-foreground"> · {t.who}</span>}</p>
                      <p className="text-xs text-muted-foreground">{when(t.at)}</p>
                    </li>
                  ))}
                </ol>
                <p className="mt-4 text-xs text-muted-foreground">Signing events are hash-chained and cannot be edited. The signing record has IP addresses and the certificate.</p>
              </CardContent>
            </Card>
            {d.attachments.length > 0 && (
              <Card><CardHeader><CardTitle className="text-base">Exhibits</CardTitle></CardHeader><CardContent><ul className="space-y-1 text-sm">{d.attachments.map((a: { id: string; filename: string; page_count: number | null }, i: number) => <li key={a.id}>Exhibit {String.fromCharCode(65 + i)} - {a.filename} <span className="text-muted-foreground">({a.page_count ?? '?'} pp)</span></li>)}</ul></CardContent></Card>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
