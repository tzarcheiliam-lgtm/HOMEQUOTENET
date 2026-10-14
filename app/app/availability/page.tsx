import Link from 'next/link';
import { requireProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { loadStoredAvailability } from '@/lib/availability/data.server';
import { localParts } from '@/lib/availability/time';
import { googleCalendarReady } from '@/lib/calendar/config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { SettingsForm } from '@/components/availability/settings-form';
import { WeeklyEditor } from '@/components/availability/weekly-editor';
import { ExceptionsPanel } from '@/components/availability/exceptions-panel';
import { CalendarConnections, CalendarNotice, type ConnectionView } from '@/components/availability/calendar-connections';

export const metadata = { title: 'Availability · HomeQuote Network' };

export default async function AvailabilityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireProfile();
  const sp = await searchParams;
  const one = (k: string) => (Array.isArray(sp[k]) ? (sp[k] as string[])[0] : (sp[k] as string | undefined));
  const supabase = await createClient();

  const isContractor = profile.role === 'contractor' && !!profile.contractor_id;
  const isInternal = profile.role === 'admin' || profile.role === 'setter';
  if (!isContractor && !isInternal) {
    return <PageHeader title="Availability" description="Availability is managed by contractors." />;
  }

  const contractorId = isContractor ? profile.contractor_id! : (one('contractor') ?? '');
  if (isInternal && !contractorId) {
    const { data: contractors } = await supabase.from('contractors').select('id, name').order('name');
    return (
      <div className="space-y-4">
        <PageHeader title="Contractor availability" description="Choose a contractor to see when they can take appointments." />
        <Card>
          <CardContent className="divide-y p-0">
            {(contractors ?? []).map((c: { id: string; name: string }) => (
              <Link key={c.id} href={`/app/availability?contractor=${c.id}`} className="block px-4 py-3 text-sm font-medium hover:bg-muted/50">
                {c.name}
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data: contractor } = await supabase.from('contractors').select('id, name').eq('id', contractorId).maybeSingle();
  if (!contractor) return <PageHeader title="Availability" description="Contractor not found." />;

  const stored = await loadStoredAvailability(supabase, contractorId);
  // Owners and HQN admins edit; company staff and setters see it read-only.
  const canEdit = profile.role === 'admin' || (isContractor && profile.contractor_role === 'owner');
  const today = localParts(Date.now(), stored.settings.timezone).date;
  const weeklyDays = [...new Set(stored.rules.map((r) => r.weekday))];

  let connections: ConnectionView[] = [];
  let hasFeedLink = false;
  if (isContractor) {
    const { data } = await supabase
      .from('calendar_connections')
      .select('id, provider, account_email, calendar_name, status, push_appointments, import_busy, last_synced_at, last_error')
      .eq('user_id', profile.id);
    connections = (data ?? []) as ConnectionView[];
    // The feed token table is service-role only; just ask whether one exists via the server-side helper.
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const { data: token } = await createAdminClient().from('calendar_feed_tokens').select('id').eq('user_id', profile.id).maybeSingle();
    hasFeedLink = !!token;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={isContractor ? 'Availability' : `${contractor.name} · Availability`}
        description={
          canEdit
            ? 'Tell HomeQuote when you can’t take appointments. Our team won’t book you into blocked times.'
            : 'When this contractor can take appointments. Read-only.'
        }
        backHref={isInternal ? '/app/availability' : undefined}
        backLabel="All contractors"
      />
      <CalendarNotice code={one('calendar')} />

      {stored.settings.weeklyScheduleEnabled && stored.rules.length === 0 && (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" role="alert">
          Weekly hours are turned on but no hours are set, so no times can be booked. Add your hours below.
        </p>
      )}

      <Card>
        <CardHeader><CardTitle>Booking rules</CardTitle></CardHeader>
        <CardContent><SettingsForm contractorId={contractorId} settings={stored.settings} readOnly={!canEdit} /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Weekly hours</CardTitle></CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">
            Times are in {stored.settings.timezone.replace('_', ' ')}. Days with no hours are days off.
          </p>
          <WeeklyEditor
            key={stored.rules.map((r) => r.id).join(',')}
            contractorId={contractorId}
            rules={stored.rules}
            readOnly={!canEdit}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Time off &amp; extra hours</CardTitle></CardHeader>
        <CardContent>
          <ExceptionsPanel
            contractorId={contractorId}
            exceptions={stored.exceptions}
            weeklyEnabled={stored.settings.weeklyScheduleEnabled}
            weeklyDays={weeklyDays}
            today={today}
            readOnly={!canEdit}
          />
        </CardContent>
      </Card>

      {isContractor && (
        <Card>
          <CardHeader><CardTitle>Calendar connections</CardTitle></CardHeader>
          <CardContent>
            <CalendarConnections connections={connections} googleConfigured={googleCalendarReady()} hasFeedLink={hasFeedLink} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
