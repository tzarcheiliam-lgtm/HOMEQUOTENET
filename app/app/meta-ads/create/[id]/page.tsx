import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { accountGate } from '@/lib/meta/studio/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { reviewDraft, type DraftRow } from '@/lib/meta/studio/drafts.server';
import { buildPlan, draftTag } from '@/lib/meta/studio/draft';
import { buildDestination } from '@/lib/meta/studio/url-params';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { when } from '@/components/meta/format';
import { DraftActions } from '@/components/meta/studio/draft-actions';

export const metadata = { title: 'Review ad · HomeQuote Network' };
export const dynamic = 'force-dynamic';

export default async function DraftReviewPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(['admin']);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = await createClient();
  const { data } = await db.from('meta_ad_drafts').select('*').eq('id', id).maybeSingle();
  if (!data) notFound();
  const draft = data as DraftRow & { meta_effective_status: string | null; meta_review_feedback: unknown; meta_status_checked_at: string | null; last_error_message: string | null; last_error_class: string | null; created_objects: Record<string, string> };
  const review = await reviewDraft(db, draft);
  const gate = await accountGate(createAdminClient(), draft.account_id);
  const { data: acct } = await db.from('meta_ad_accounts').select('currency').eq('id', draft.account_id).maybeSingle();
  const { data: cr } = draft.creative_id ? await db.from('meta_creatives').select('kind').eq('id', draft.creative_id).maybeSingle() : { data: null };
  const dest = review.config?.conversion_location === 'website' && review.config.ad.destination_url ? buildDestination(review.config.ad.destination_url) : null;
  const plan = review.config && acct?.currency ? buildPlan({ name: draft.name, tag: draftTag(draft.idempotency_key), config: review.config, currency: acct.currency, have: draft.created_objects ?? {}, creativeKind: cr?.kind ?? 'image', destination: dest?.ok ? { url: dest.url, urlTags: dest.urlTags } : null }) : [];
  const editable = !['creating', 'created_paused', 'partial'].includes(draft.status);

  return (
    <div className="space-y-6">
      <PageHeader title={draft.name} description="Review everything below. Creating in Meta needs your typed confirmation, and ads are created paused." backHref="/app/meta-ads/create" backLabel="Create Ad">
        {editable && <Button asChild variant="outline" size="sm"><Link href={`/app/meta-ads/create/new?draft=${draft.id}`}>Edit</Link></Button>}
      </PageHeader>

      <Card>
        <CardHeader><CardTitle className="flex flex-wrap items-center gap-2">Status <Badge variant={draft.status === 'created_paused' ? 'success' : draft.status === 'failed' ? 'danger' : 'muted'}>{draft.status.replace('_', ' ')}</Badge></CardTitle>
          <CardDescription>
            {draft.meta_effective_status
              ? <>Meta says this ad is <b>{draft.meta_effective_status}</b> (checked {when(draft.meta_status_checked_at)}). Created is not the same as approved, and approved is not the same as delivering.</>
              : 'Not created in Meta yet.'}
          </CardDescription></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {draft.last_error_message && <p role="alert" className="text-destructive">{draft.last_error_message}</p>}
          {draft.meta_review_feedback != null && <details><summary className="cursor-pointer">Meta&rsquo;s review feedback (verbatim)</summary><pre className="mt-2 overflow-x-auto rounded bg-muted p-3 text-xs">{JSON.stringify(draft.meta_review_feedback, null, 2)}</pre></details>}
          {Object.keys(draft.created_objects ?? {}).length > 0 && (
            <div><p className="font-medium">Already created in Meta (paused)</p><ul className="text-xs text-muted-foreground">{Object.entries(draft.created_objects).map(([k, v]) => <li key={k}>{k.replace('_', ' ')}: {String(v)}</li>)}</ul></div>
          )}
        </CardContent>
      </Card>

      {review.errors.length > 0 && (
        <Card className="border-destructive/50"><CardHeader><CardTitle className="text-base text-destructive">Fix before creating</CardTitle></CardHeader>
          <CardContent><ul className="list-disc space-y-1 pl-5 text-sm">{review.errors.map((e) => <li key={e.code + (e.field ?? '')}>{e.message}</li>)}</ul></CardContent></Card>
      )}
      {review.warnings.length > 0 && (
        <Card><CardHeader><CardTitle className="text-base">Heads up</CardTitle></CardHeader>
          <CardContent><ul className="list-disc space-y-1 pl-5 text-sm text-amber-800">{review.warnings.map((w) => <li key={w.code + (w.field ?? '')}>{w.message}</li>)}</ul></CardContent></Card>
      )}

      {review.summary && (
        <Card>
          <CardHeader><CardTitle>What will be created</CardTitle><CardDescription>This is exactly what your confirmation covers.</CardDescription></CardHeader>
          <CardContent>
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              {([['Ad account', review.summary.account], ['Facebook Page', review.summary.page], ['Objective', review.summary.objective], ['Optimization', review.summary.optimization_goal], ['Budget', review.summary.budget], ['Amount sent to Meta (minor units)', String(review.summary.budget_minor_units_sent)], ['Schedule', review.summary.schedule], ['Destination', review.summary.destination], ['Created as', review.summary.created_as]] as const).map(([k, v]) => (
                <div key={k}><dt className="text-xs text-muted-foreground">{k}</dt><dd className="break-words font-medium">{v}</dd></div>
              ))}
            </dl>
            {dest?.ok && <p className="mt-4 text-xs text-muted-foreground">Tracking parameters added as URL tags: {dest.added.join(', ')}.{dest.keptExisting.length ? ` Kept from your URL (not overwritten): ${dest.keptExisting.join(', ')}.` : ''}</p>}
            {review.config?.conversion_location === 'instant_form' && <p className="mt-4 text-xs text-muted-foreground">The Instant Form attaches HQN tracking tags to the ad; lead ids reach HQN through the existing Meta Lead Ads webhook.</p>}
          </CardContent>
        </Card>
      )}

      {plan.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Exact Meta requests</CardTitle><CardDescription>Sent in this order, in your ad account, each with status PAUSED. Placeholders in [brackets] are filled by Meta&rsquo;s earlier responses. Budget units are unverified until the first paused test (see the setup guide).</CardDescription></CardHeader>
          <CardContent className="space-y-2">
            {plan.map((s) => <details key={s.step} className="rounded border p-2"><summary className="cursor-pointer text-sm font-medium">{s.step} → POST /{draft.account_id}/{s.object}</summary><pre className="mt-2 overflow-x-auto text-xs">{JSON.stringify(s.body, null, 2)}</pre></details>)}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Confirm and create</CardTitle></CardHeader>
        <CardContent><DraftActions draftId={draft.id} status={draft.status} hasErrors={review.errors.length > 0} confirmed={!!draft.confirmed_at} gateReasons={gate.reasons} /></CardContent>
      </Card>
    </div>
  );
}
