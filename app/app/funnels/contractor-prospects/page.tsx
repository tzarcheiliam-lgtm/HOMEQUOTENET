import { requireRole } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { loadFunnelSettings } from '@/lib/contractor-funnel/settings.server';
import { REASON_LABELS } from '@/lib/contractor-funnel/schema';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ContractorFunnelSettingsForm } from '@/components/funnels/contractor-funnel-settings-form';

export const metadata = { title: 'Contractor prospects · HomeQuote Network' };
export const dynamic = 'force-dynamic';

const SOURCE_TEXT = {
  admin: 'Set here',
  env: 'From CONTRACTOR_SALES_CALENDAR_URL',
  site: 'Site default (the 30-minute contractor call in content/site.ts)',
  none: 'NOT CONFIGURED — qualified prospects will see “we’ll contact you to schedule” instead of a calendar',
} as const;

type Row = {
  id: string; created_at: string; name: string; company: string; email: string; phone: string;
  services: string[]; service_area: string; qualification_status: 'qualified' | 'needs_review';
  qualification_reasons: string[]; booking_status: 'none' | 'reported' | 'confirmed'; attribution: Record<string, string> | null;
};

export default async function ContractorProspectsPage() {
  await requireRole(['admin']);
  const settings = await loadFunnelSettings();
  const db = createAdminClient();
  const [{ data: stored }, { data: rows, error }] = await Promise.all([
    db.from('contractor_funnel_settings').select('sales_calendar_url, meta_pixel_id').eq('id', 'default').maybeSingle(),
    db.from('contractor_funnel_submissions')
      .select('id, created_at, name, company, email, phone, services, service_area, qualification_status, qualification_reasons, booking_status, attribution')
      .order('created_at', { ascending: false }).limit(50),
  ]);
  const migrationMissing = Boolean(error);
  const prospects = (rows ?? []) as Row[];
  const withCalendar = settings.calendarSource;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contractor prospects"
        description="Contractors who completed the Check My Fit funnel at /contractor-appointments. These are not homeowner leads."
        backHref="/app/funnels" backLabel="Funnels"
      />

      {migrationMissing && (
        <Card><CardContent className="pt-6 text-sm text-destructive">The contractor_funnel_submissions table is missing. Apply migration 0045_contractor_prospect_funnel.sql before launching.</CardContent></Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <CardDescription>
            Calendar in use: <strong>{settings.calendar?.url ?? 'none'}</strong> · {SOURCE_TEXT[withCalendar]}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ContractorFunnelSettingsForm calendarUrl={stored?.sales_calendar_url ?? ''} pixelId={stored?.meta_pixel_id ?? ''} rules={settings.rules} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent submissions</CardTitle><CardDescription>Latest 50. “Reported” means the calendar embed said a booking happened but it was not verified with the Calendly API (set CALENDLY_API_TOKEN to verify).</CardDescription></CardHeader>
        <CardContent className="overflow-x-auto">
          {prospects.length === 0 ? <p className="text-sm text-muted-foreground">No submissions yet.</p> : (
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-muted-foreground"><th className="py-2 pr-4">When</th><th className="pr-4">Contact</th><th className="pr-4">Services / area</th><th className="pr-4">Outcome</th><th className="pr-4">Booking</th><th>Campaign</th></tr></thead>
              <tbody>
                {prospects.map((p) => (
                  <tr key={p.id} className="border-b align-top">
                    <td className="py-2 pr-4 whitespace-nowrap">{new Date(p.created_at).toLocaleString()}</td>
                    <td className="pr-4"><div className="font-medium">{p.name} · {p.company}</div><div className="text-muted-foreground">{p.email} · {p.phone}</div></td>
                    <td className="pr-4"><div>{p.services.join(', ')}</div><div className="text-muted-foreground">{p.service_area}</div></td>
                    <td className="pr-4">
                      <Badge variant={p.qualification_status === 'qualified' ? 'default' : 'secondary'}>{p.qualification_status === 'qualified' ? 'Qualified' : 'Needs review'}</Badge>
                      {p.qualification_reasons.map((r) => <div key={r} className="text-xs text-muted-foreground">{REASON_LABELS[r] ?? r}</div>)}
                    </td>
                    <td className="pr-4">{p.booking_status === 'none' ? '—' : p.booking_status === 'confirmed' ? 'Confirmed' : 'Reported (unverified)'}</td>
                    <td>{p.attribution?.utm_campaign ?? p.attribution?.campaign_name ?? 'Unknown'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
