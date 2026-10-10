import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ContractorReviewForm } from '@/components/contractor-funnel/review-form';
import { REASON_LABELS } from '@/lib/contractor-funnel/schema';
import { serviceLabel, roleLabel, projectValueLabel, capacityLabel, sourceLabel, timelineLabel } from '@/lib/contractor-funnel/labels';

export const metadata = { title: 'Contractor submission · HomeQuote Network' };
export const dynamic = 'force-dynamic';

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-muted/40 px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="whitespace-pre-wrap break-words text-sm font-medium">{value || '—'}</dd>
    </div>
  );
}

export default async function ContractorSubmissionPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(['admin']);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { data: p } = await createAdminClient().from('contractor_funnel_submissions').select('*').eq('id', id).maybeSingle();
  if (!p) notFound();

  const services = (p.services as string[]).map((s) => (s === 'other' && p.service_other ? `Something else: ${p.service_other}` : serviceLabel(s)));
  const attribution = Object.entries((p.attribution ?? {}) as Record<string, string>);
  const reasons = (p.qualification_reasons as string[]).map((r) => REASON_LABELS[r] ?? r);

  return (
    <div className="space-y-5">
      <PageHeader title={p.company} description={`${p.name} · submitted ${new Date(p.created_at).toLocaleString()}`} backHref="/app/contractor-funnel" backLabel="Contractor funnel">
        <Badge variant={p.qualification_status === 'qualified' ? 'default' : 'secondary'}>{p.qualification_status === 'qualified' ? 'Qualified' : 'Needs review'}</Badge>
      </PageHeader>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Funnel answers</CardTitle></CardHeader>
            <CardContent>
              <dl className="grid gap-2 sm:grid-cols-2">
                <Field label="What services do you offer?" value={services.join(', ')} />
                <Field label="Where do you work?" value={p.service_area} />
                <Field label="Your role" value={roleLabel(p.role)} />
                <Field label="Typical project value" value={projectValueLabel(p.project_value)} />
                <Field label="Appointments you could take" value={capacityLabel(p.appointment_capacity)} />
                <Field label="Where customers come from now" value={(p.customer_sources as string[]).map(sourceLabel).join(', ')} />
                <Field label="When you want to start" value={timelineLabel(p.start_timeline)} />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Contact</CardTitle></CardHeader>
            <CardContent>
              <dl className="grid gap-2 sm:grid-cols-2">
                <Field label="Name" value={p.name} />
                <Field label="Company" value={p.company} />
                <Field label="Email" value={<a className="underline" href={`mailto:${p.email}`}>{p.email}</a>} />
                <Field label="Phone" value={<a className="underline" href={`tel:${p.phone_e164 ?? p.phone}`}>{p.phone}</a>} />
                <Field label="Website" value={p.website ? <a className="underline" href={p.website} target="_blank" rel="noopener noreferrer">{p.website}</a> : null} />
                <Field label="Agreed to be contacted" value={p.contact_consent ? 'Yes' : 'No'} />
                <Field label="Marketing messages opt-in" value={p.marketing_consent ? 'Yes' : 'No'} />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Qualification &amp; call</CardTitle></CardHeader>
            <CardContent>
              <dl className="grid gap-2 sm:grid-cols-2">
                <Field label="Result" value={p.qualification_status === 'qualified' ? 'Qualified — calendar shown' : 'Needs review — no calendar shown'} />
                <Field label="Why it needs review" value={reasons.join('; ')} />
                <Field label="Call booking" value={p.booking_status === 'none' ? 'Not booked' : p.booking_status === 'confirmed' ? 'Booked (verified with Calendly)' : 'Booked per the calendar embed (not verified)'} />
                <Field label="Call time" value={p.booking_start_time ? new Date(p.booking_start_time).toLocaleString() : null} />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Attribution</CardTitle></CardHeader>
            <CardContent>
              {attribution.length === 0 ? (
                <p className="text-sm text-muted-foreground">No campaign data captured.</p>
              ) : (
                <dl className="grid gap-2 sm:grid-cols-2">{attribution.map(([k, v]) => <Field key={k} label={k} value={v} />)}</dl>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader><CardTitle>Follow-up</CardTitle></CardHeader>
          <CardContent><ContractorReviewForm id={p.id} status={p.review_status} notes={p.review_notes ?? ''} /></CardContent>
        </Card>
      </div>
    </div>
  );
}
