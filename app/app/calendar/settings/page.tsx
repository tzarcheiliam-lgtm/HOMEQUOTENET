/* eslint-disable @typescript-eslint/no-explicit-any -- rows come from the untyped Supabase client, as elsewhere in lib/data */
import { CalendarDays } from 'lucide-react';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getContractorCalendar, listVisibleCalendars, loadCalendarRules } from '@/lib/booking/calendars.server';
import { addBookingCalendarMember, saveBookingCalendarRules, saveBookingCalendarSettings } from '@/lib/actions/booking';
import { canManageCalendar, canViewCalendar, isCalendarStaff, type CalendarViewer } from '@/components/calendar/access';
import { CalendarMembers, type MemberView } from '@/components/calendar/calendar-members';
import { CalendarSettingsForm } from '@/components/calendar/calendar-settings-form';
import { WeeklyEditor } from '@/components/availability/weekly-editor';
import { CalendarConnections, CalendarNotice, type ConnectionView } from '@/components/availability/calendar-connections';
import { googleCalendarReady } from '@/lib/calendar/config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';

export const metadata = { title: 'Calendar settings · HomeQuote Network' };

const KIND_HELP: Record<string, string> = {
  team: 'Homeowners from network funnels (no contractor yet) book a call with a HomeQuote project specialist here.',
  sales: 'Contractors from the sales funnel book their call with HomeQuote here.',
  contractor: 'Homeowners from this contractor’s own funnels and estimator book their call here.',
};

/**
 * Settings of one booking calendar (0070): rules, weekly hours, hosts.
 * Admins edit any calendar; a contractor owner edits their own; setters and
 * contractor staff read. Reads go through the user's client (RLS); the
 * actions re-check the role before writing.
 */
export default async function CalendarSettingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const profile = await requireRole(['admin', 'setter', 'contractor']);
  const sp = await searchParams;
  const requested = Array.isArray(sp.cal) ? sp.cal[0] : sp.cal;
  const viewer: CalendarViewer = { id: profile.id, role: profile.role, contractor_id: profile.contractor_id, contractor_role: profile.contractor_role };
  const userDb = await createClient();
  if (!isCalendarStaff(viewer) && profile.contractor_id) {
    await getContractorCalendar(profile.contractor_id, { create: true, db: createAdminClient() }).catch(() => null);
  }
  const calendars = (await listVisibleCalendars(userDb)).filter((c) => canViewCalendar(viewer, c));
  const calendar = calendars.find((c) => c.id === requested)
    ?? calendars.find((c) => c.kind === 'contractor' && c.contractorId === profile.contractor_id)
    ?? (isCalendarStaff(viewer) ? calendars.find((c) => c.kind === 'team') : undefined);
  if (!calendar) {
    return (
      <div className="space-y-4">
        <PageHeader title="Calendar settings" backHref="/app/calendar" backLabel="Calendar" />
        <EmptyState icon={CalendarDays} title="Calendar not found" description="Pick a calendar from the Calendar page." />
      </div>
    );
  }
  const canEdit = canManageCalendar(viewer, calendar);
  const { rules } = await loadCalendarRules(calendar.id, userDb as any);

  // Hosts and who could be one. Profiles are read with the service role (contractors cannot list HomeQuote staff);
  // only names and emails of people who could host THIS calendar are shown.
  const admin = createAdminClient();
  const { data: memberRows } = await userDb.from('booking_calendar_members').select('user_id, notify').eq('calendar_id', calendar.id);
  const candidateQuery = admin.from('profiles').select('id, full_name, email, role, contractor_id').eq('is_active', true).order('full_name');
  const { data: candidateRows } = calendar.kind === 'contractor'
    ? await candidateQuery.eq('role', 'contractor').eq('contractor_id', calendar.contractorId)
    : await candidateQuery.in('role', ['admin', 'setter']);
  const ids = ((memberRows ?? []) as any[]).map((m) => m.user_id as string);
  const { data: memberProfiles } = ids.length ? await admin.from('profiles').select('id, full_name, email').in('id', ids) : { data: [] };
  const byId = new Map(((memberProfiles ?? []) as any[]).map((p) => [p.id as string, p]));
  const members: MemberView[] = ((memberRows ?? []) as any[]).map((m) => {
    const p = byId.get(m.user_id);
    return { userId: m.user_id, name: p?.full_name || p?.email || 'Team member', email: p?.email ?? null, notify: !!m.notify };
  });
  const candidates = ((candidateRows ?? []) as any[]).map((p) => ({ id: p.id as string, name: (p.full_name || p.email || 'Team member') as string }));

  // HomeQuote hosts (team / sales) connect their OWN Google here, so callers are never offered a time they are busy.
  // Contractor users connect theirs on the Availability page (it covers their on-site visits too).
  const staffHost = isCalendarStaff(viewer) && calendar.kind !== 'contractor';
  const connectionColumns = 'id, provider, account_email, calendar_name, status, push_appointments, import_busy, last_synced_at, last_error';
  let { data: connectionRows } = staffHost
    ? await userDb.from('calendar_connections').select(`${connectionColumns}, mirror_all_appointments`).eq('user_id', profile.id)
    : { data: [] as any[] };
  // Before migration 0073 the mirror column does not exist yet: still show the connection.
  if (staffHost && !connectionRows) ({ data: connectionRows } = await userDb.from('calendar_connections').select(connectionColumns).eq('user_id', profile.id));
  const connections = (connectionRows ?? []) as ConnectionView[];
  const googleNotice = Array.isArray(sp.calendar) ? sp.calendar[0] : sp.calendar;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${calendar.name} · Settings`}
        description={`${KIND_HELP[calendar.kind] ?? ''}${canEdit ? '' : ' Read-only.'}`}
        backHref={`/app/calendar?cal=${calendar.id}`}
        backLabel="Calendar"
      />

      <CalendarNotice code={googleNotice} />

      <Card>
        <CardHeader><CardTitle>Booking rules</CardTitle></CardHeader>
        <CardContent>
          <CalendarSettingsForm calendar={calendar} readOnly={!canEdit} saveAction={saveBookingCalendarSettings.bind(null, calendar.id)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Weekly hours</CardTitle></CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">
            Times are in {calendar.timezone.replace(/_/g, ' ')}. Days with no hours are days off.
          </p>
          {rules.length === 0 && (
            <p className="mb-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100" role="alert">
              No hours are set, so nobody can book this calendar.
            </p>
          )}
          <WeeklyEditor
            key={rules.map((r) => `${r.weekday}:${r.startMinute}-${r.endMinute}`).join(',')}
            rules={rules}
            readOnly={!canEdit}
            saveAction={saveBookingCalendarRules.bind(null, calendar.id)}
            submitLabel="Save weekly hours"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Hosts</CardTitle></CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">
            Hosts are emailed about every booking, and their connected Google Calendar blocks busy times.
          </p>
          <CalendarMembers
            calendarId={calendar.id}
            members={members}
            candidates={candidates}
            readOnly={!canEdit}
            addAction={addBookingCalendarMember.bind(null, calendar.id)}
          />
        </CardContent>
      </Card>

      {staffHost && (
        <Card>
          <CardHeader><CardTitle>Your Google Calendar</CardTitle></CardHeader>
          <CardContent>
            {googleCalendarReady() || connections.length ? (
              <CalendarConnections connections={connections} googleConfigured={googleCalendarReady()} hasFeedLink={false} host canMirror={profile.role === 'admin'} />
            ) : (
              <p className="text-sm text-muted-foreground" role="note">
                Google Calendar sign-in isn’t set up on this site yet, so times you are busy elsewhere are not blocked here. Block them with
                weekly hours, or ask an admin to set up Google Calendar.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
