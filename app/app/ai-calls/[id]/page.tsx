import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { getAiCallJob } from '@/lib/data/ai-calling';
import { cancelJob, retryJob } from '@/lib/actions/ai-calling';
import { BLOCK_LABELS, type BlockReason } from '@/lib/ai-calling/eligibility';
import { ConfirmAction } from '@/components/ui/confirm-action';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { JobStatusBadge } from '@/components/ai-calls/job-status-badge';

export const metadata = { title: 'AI call · HomeQuote Network' };

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '—');
const RETRYABLE = ['failed', 'no_answer', 'busy', 'blocked', 'expired'];

type Analysis = { status?: string | null; summary?: string | null; data?: { name?: string; type?: string; value?: unknown; rationale?: string }[]; criteria_results?: { name?: string; result?: string; rationale?: string }[]; error?: string | null };

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return <div className="grid gap-1 py-2 sm:grid-cols-[11rem_1fr]"><dt className="text-sm text-muted-foreground">{k}</dt><dd className="text-sm break-words">{children}</dd></div>;
}

export default async function AiCallDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(['admin']);
  const { id } = await params;
  const found = await getAiCallJob(id);
  if (!found) notFound();
  const { job, events } = found;
  const a = (job.analysis ?? null) as Analysis | null;
  const canCancel = job.status === 'queued' || job.status === 'blocked';
  const canRetry = RETRYABLE.includes(job.status);

  return (
    <div className="space-y-6">
      <PageHeader title={job.contact_name ?? 'AI call'} description={`${job.trigger_source === 'manual' ? 'Manual' : job.trigger_source === 'workflow' ? 'Automation' : 'Automatic'} call · ${job.contractor?.name ?? 'No contractor'}`} backHref="/app/ai-calls" backLabel="AI Agent Calls">
        {canRetry && <ConfirmAction action={retryJob} fields={{ id: job.id }} triggerLabel="Retry call" triggerVariant="default"
          title="Retry this call?" description="The call is queued again and every check (consent, opt-out, calling window, switches) is re-run before anything is dialed." confirmLabel="Retry" />}
        {canCancel && <ConfirmAction action={cancelJob} fields={{ id: job.id }} triggerLabel="Cancel call" destructive triggerVariant="destructive"
          title="Cancel this queued call?" description="It will not be dialed. This cannot be undone." confirmLabel="Cancel call" />}
      </PageHeader>

      <Card>
        <CardHeader className="flex-row items-center justify-between"><CardTitle className="text-base">Status</CardTitle><JobStatusBadge status={job.status} blockReason={job.block_reason} /></CardHeader>
        <CardContent>
          <dl className="divide-y">
            <Row k="Provider">{job.provider_session_id ? <>Accepted by Fish · session <code className="text-xs">{job.provider_session_id}</code></> : job.status === 'queued' ? 'Not yet sent to the provider' : 'Never reached the provider'}</Row>
            {job.status === 'queued' && <Row k="Scheduled to run">{fmt(job.run_at)}</Row>}
            {job.block_reason && <Row k="Reason">{BLOCK_LABELS[job.block_reason as BlockReason] ?? job.block_reason}</Row>}
            {job.last_error && <Row k="Last error"><code className="text-xs">{job.last_error}</code></Row>}
            <Row k="Dial result">{job.dial_status ? job.dial_status.replaceAll('_', ' ') : '—'}</Row>
            <Row k="Duration">{job.duration_seconds != null ? `${job.duration_seconds}s` : '—'}</Row>
            <Row k="Ended because">{job.ended_reason ? job.ended_reason.replaceAll('_', ' ') : '—'}</Row>
            <Row k="Attempts">{job.attempts} of {job.max_attempts}</Row>
            <Row k="Created">{fmt(job.created_at)}</Row>
            {job.conversation_started_at && <Row k="Call started">{fmt(job.conversation_started_at)}</Row>}
            {job.conversation_ended_at && <Row k="Call ended">{fmt(job.conversation_ended_at)}</Row>}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Contact and request</CardTitle></CardHeader>
        <CardContent>
          <dl className="divide-y">
            <Row k="Contact">{job.contact_name ?? '—'} · {job.contact_phone ?? 'no number'}</Row>
            <Row k="Lead">{job.lead_id ? <Link className="text-primary hover:underline" href={`/app/leads/${job.lead_id}`}>Open lead</Link> : 'Not linked to a lead'}</Row>
            <Row k="Location (for calling hours)">{[job.contact_state, job.contact_zip].filter(Boolean).join(' ') || 'Unknown'}</Row>
            <Row k="Purpose">{job.purpose ?? '—'}</Row>
            {job.context && <Row k="Context for the agent">{job.context}</Row>}
            <Row k="Consent">{[job.consent_basis, job.consent_reference].filter(Boolean).join(' · ') || 'None recorded'}{job.consent_at ? ` (${fmt(job.consent_at)})` : ''}</Row>
            {job.trigger_source === 'manual' && <Row k="Started by">{job.initiated_by ? <code className="text-xs">{job.initiated_by}</code> : 'Unknown'} {job.scheduled_for ? `· scheduled for ${fmt(job.scheduled_for)}` : '· immediate'}</Row>}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Call results</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {!a ? <p className="text-sm text-muted-foreground">No analysis yet. Fish sends it after the call ends (usually within a minute or two).</p> : (
            <>
              {a.status !== 'completed' && <p className="text-sm text-muted-foreground">Analysis {a.status ?? 'unavailable'}{a.error ? `: ${a.error}` : ''}.</p>}
              {a.summary && <div><h3 className="text-sm font-medium">Summary</h3><p className="mt-1 text-sm">{a.summary}</p></div>}
              {!!a.criteria_results?.length && <div><h3 className="text-sm font-medium">Qualification results</h3><ul className="mt-1 space-y-1 text-sm">{a.criteria_results.map((c, i) => <li key={i}><b>{c.name}</b>: {c.result}{c.rationale ? ` — ${c.rationale}` : ''}</li>)}</ul></div>}
              {!!a.data?.length && <div><h3 className="text-sm font-medium">Collected details (including callbacks)</h3><ul className="mt-1 space-y-1 text-sm">{a.data.map((d, i) => <li key={i}><b>{d.name}</b>: {String(d.value ?? '—')}</li>)}</ul></div>}
            </>
          )}
          <p className="text-xs text-muted-foreground">Transcripts and recordings are not shown here: Fish does not include them in webhooks, and this app does not fetch them yet. Use the session id above in the Fish console.</p>
        </CardContent>
      </Card>

      {!!events.length && (
        <Card>
          <CardHeader><CardTitle className="text-base">Provider events</CardTitle></CardHeader>
          <CardContent><ul className="space-y-1 text-sm">{events.map((e, i) => <li key={i}><code className="text-xs">{e.event}</code> · {fmt(e.received_at)}</li>)}</ul></CardContent>
        </Card>
      )}
    </div>
  );
}
