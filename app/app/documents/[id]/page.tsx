/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element */
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { AlertTriangle, CheckCircle2, Mail, ShieldCheck } from 'lucide-react';
import { requireProfile } from '@/lib/auth';
import { canManageSigning } from '@/lib/permissions';
import { SigningError } from '@/lib/signing/errors';
import { getEditorBundle, previewUrl } from '@/lib/signing/service';
import { RECIPIENT_STATUS_LABELS, SIGNING_EVENT_LABELS, IDENTITY_STATEMENT, SIGNATURE_STATEMENT, STATUS_LABELS, type SigningStatus } from '@/lib/signing/constants';
import { formatUtc } from '@/lib/signing/format';
import type { UiField } from '@/lib/signing/view';
import { SigningStatusBadge } from '@/components/signing/status-badge';
import { DraftWorkspace } from '@/components/signing/draft-workspace';
import { DownloadButtons, RequestActions, SignerActions } from '@/components/signing/detail-actions';
import { ReadOnlyViewer } from '@/components/signing/readonly-viewer';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';

export const metadata = { title: 'Document · HomeQuote Network' };
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const toUi = (f: any, recipientIndexById: Map<string, number>): UiField => ({
  key: f.id, recipient_index: f.recipient_id ? recipientIndexById.get(f.recipient_id) ?? null : null, type: f.type, page: f.page, x: f.x, y: f.y, w: f.w, h: f.h,
  required: f.required, label: f.label, group_key: f.group_key, prefill_value: f.prefill_value, date_format: f.date_format, source: f.source,
  confidence: f.confidence, needs_review: f.needs_review, reviewed: !!f.reviewed_at, role_hint: f.role_hint, detection_note: f.detection_note, source_ref: f.source_ref,
});

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireProfile();
  if (!canManageSigning(profile)) redirect('/app');
  const { id } = await params;
  let bundle;
  try { bundle = await getEditorBundle(profile, id); } catch (e) { if (e instanceof SigningError) notFound(); throw e; }
  const { document: doc, version, recipients, fields, events, values, versions, lead, contractorName } = bundle;
  const status = version.status as SigningStatus;
  const idx = new Map(recipients.map((r, i) => [r.id, i + 1]));
  const uiFields = fields.map((f) => toUi(f, idx));
  const pdfUrl = await previewUrl(profile, id);

  if (status === 'draft') {
    return (
      <div className="space-y-4">
        <PageHeader title={doc.title} description={`Draft${version.version_no > 1 ? ` · version ${version.version_no}` : ''}${contractorName ? ` · ${contractorName}` : ''}${lead ? ` · Lead: ${lead.name}` : ''}`} backHref="/app/documents" backLabel="Documents" />
        <DraftWorkspace init={{
          versionId: version.id, title: doc.title, pages: version.pages, pdfUrl, subject: version.subject ?? '', message: version.message ?? '', order: version.signing_order, expiryDays: version.expiry_days,
          recipients: recipients.map((r) => ({ name: r.name, email: r.email })), fields: uiFields, detection: version.detection as any,
        }} />
      </div>
    );
  }

  const open = status === 'awaiting_signature' || status === 'partially_signed';
  const name = new Map(recipients.map((r) => [r.id, r.name]));
  const done: Record<string, string> = {};
  for (const v of values) done[v.field_id] = '1';
  const signerNames = recipients.map((r) => r.name);
  const sequentialNext = version.signing_order === 'sequential' ? recipients.find((r) => r.status !== 'signed')?.id : null;
  const needsFinalize = status === 'completed' && !version.final_sha256;

  return (
    <div className="space-y-6">
      <PageHeader title={doc.title} description={`Version ${version.version_no}${contractorName ? ` · ${contractorName}` : ''}`} backHref="/app/documents" backLabel="Documents">
        <SigningStatusBadge status={status} />
      </PageHeader>

      {lead && <p className="text-sm text-muted-foreground">Attached to lead <Link className="font-medium text-foreground underline" href={`/app/leads/${lead.id}`}>{lead.name}</Link></p>}

      {status === 'expired' && <Card className="border-amber-300 bg-amber-50"><CardContent className="p-4 text-sm text-amber-900">This request expired on {formatUtc(version.expires_at)}. Its links no longer work. Create a new version to send it again.</CardContent></Card>}
      {status === 'voided' && <Card><CardContent className="p-4 text-sm">Voided {formatUtc(version.voided_at)}{version.void_reason ? `: ${version.void_reason}` : ''}. All links stopped working.</CardContent></Card>}
      {status === 'declined' && <Card className="border-amber-300 bg-amber-50"><CardContent className="p-4 text-sm text-amber-900">{recipients.find((r) => r.status === 'declined')?.name ?? 'A signer'} declined to sign{recipients.find((r) => r.status === 'declined')?.decline_reason ? `: “${recipients.find((r) => r.status === 'declined')!.decline_reason}”` : '.'}</CardContent></Card>}
      {needsFinalize && <Card className="border-amber-300 bg-amber-50"><CardContent className="flex gap-2 p-4 text-sm text-amber-900"><AlertTriangle className="mt-0.5 size-4" /><span>Everyone has signed, but the final PDF is still being prepared{version.finalize_error ? ' (the last attempt failed)' : ''}. Use “Retry creating signed PDF” if it does not appear within a minute.</span></CardContent></Card>}
      {status === 'completed' && version.final_sha256 && <Card className="border-emerald-300 bg-emerald-50"><CardContent className="flex gap-2 p-4 text-sm text-emerald-900"><CheckCircle2 className="mt-0.5 size-4" /> Completed {formatUtc(version.completed_at)}. The signed PDF and certificate are ready. Kept for at least {version.retention_until ? formatUtc(version.retention_until).slice(0, 10) : '7 years'} under the default retention policy.</CardContent></Card>}

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Files</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <DownloadButtons versionId={version.id} finalReady={!!version.final_sha256} status={status} />
          <dl className="grid gap-x-6 gap-y-1 text-xs text-muted-foreground sm:grid-cols-[auto_1fr]">
            <dt>Original SHA-256</dt><dd className="break-all font-mono">{version.original_sha256}</dd>
            {version.final_sha256 && <><dt>Signed PDF SHA-256</dt><dd className="break-all font-mono">{version.final_sha256}</dd></>}
            {version.certificate_sha256 && <><dt>Certificate SHA-256</dt><dd className="break-all font-mono">{version.certificate_sha256}</dd></>}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Signers · {version.signing_order === 'sequential' ? 'in sequence' : 'any order'}</CardTitle></CardHeader>
        <CardContent className="divide-y p-0">
          {recipients.map((r, i) => {
            const turn = !sequentialNext || sequentialNext === r.id;
            return (
              <div key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{version.signing_order === 'sequential' && <span className="mr-1 text-muted-foreground">{i + 1}.</span>}{r.name} <span className="font-normal text-muted-foreground">· {r.email}</span></p>
                  <p className="text-xs text-muted-foreground">
                    {r.signed_at ? `Signed ${formatUtc(r.signed_at)}` : r.declined_at ? `Declined ${formatUtc(r.declined_at)}` : r.first_viewed_at ? `Opened ${formatUtc(r.first_viewed_at)}` : r.invited_at ? `Invited ${formatUtc(r.last_sent_at ?? r.invited_at)}` : version.signing_order === 'sequential' ? 'Waiting for earlier signers' : 'Not yet invited'}
                    {r.send_count > 1 ? ` · sent ${r.send_count}×` : ''}
                  </p>
                  {r.last_email_status === 'failed' && <p className="mt-0.5 flex items-center gap-1 text-xs text-destructive"><Mail className="size-3" /> Email failed: {r.last_email_error}</p>}
                </div>
                <Badge variant={r.status === 'signed' ? 'success' : r.status === 'declined' ? 'secondary' : 'muted'}>{RECIPIENT_STATUS_LABELS[r.status as keyof typeof RECIPIENT_STATUS_LABELS]}</Badge>
                {open && r.status !== 'signed' && r.status !== 'declined' && turn && <SignerActions versionId={version.id} recipientId={r.id} canRemind={!!r.invited_at && r.last_email_status !== 'failed'} name={r.name} />}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <RequestActions versionId={version.id} status={status} needsFinalize={needsFinalize} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">History</CardTitle></CardHeader>
          <CardContent>
            <ol className="space-y-2 text-sm">
              {events.map((e) => (
                <li key={e.id} className="flex gap-3"><span className="w-40 shrink-0 text-xs text-muted-foreground">{formatUtc(e.created_at)}</span>
                  <span>{SIGNING_EVENT_LABELS[e.event_type] ?? e.event_type}{e.recipient_id ? ` · ${name.get(e.recipient_id) ?? ''}` : ''}{e.ip ? <span className="text-xs text-muted-foreground"> · {e.ip}</span> : null}</span></li>
              ))}
            </ol>
          </CardContent>
        </Card>
        <div className="space-y-6">
          {versions.length > 1 && (
            <Card><CardHeader className="pb-2"><CardTitle className="text-base">Versions</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-sm">{versions.map((v) => (
                <div key={v.id} className="flex items-center justify-between"><Link href={`/app/documents/${v.id}`} className={`hover:underline ${v.id === version.id ? 'font-semibold' : ''}`}>Version {v.version_no}</Link><span className="text-xs text-muted-foreground">{STATUS_LABELS[v.status as SigningStatus] ?? v.status}</span></div>))}</CardContent></Card>
          )}
          <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="size-4" /> What this record shows</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground"><p>{IDENTITY_STATEMENT}</p><p>{SIGNATURE_STATEMENT}</p></CardContent></Card>
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Document &amp; field layout</h2>
        <ReadOnlyViewer pdfUrl={pdfUrl} pages={version.pages} fields={uiFields} signerNames={signerNames} done={done} />
      </section>
    </div>
  );
}
