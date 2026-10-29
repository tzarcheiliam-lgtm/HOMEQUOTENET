import { AlertTriangle, CalendarCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { disconnectCalendar, updateCalendarPreferences } from '@/lib/actions/availability';
import { FeedLink } from './feed-link';

export interface ConnectionView {
  id: string;
  provider: string;
  account_email: string | null;
  calendar_name: string | null;
  status: 'active' | 'needs_reconnect';
  push_appointments: boolean;
  import_busy: boolean;
  last_synced_at: string | null;
  last_error: string | null;
}

const NOTICES: Record<string, { tone: 'ok' | 'bad'; text: string }> = {
  connected: { tone: 'ok', text: 'Google Calendar connected. Your upcoming appointments are being added.' },
  cancelled: { tone: 'bad', text: 'Google Calendar was not connected (cancelled).' },
  invalid_state: { tone: 'bad', text: 'That sign-in link expired. Please try connecting again.' },
  token_error: { tone: 'bad', text: 'Google would not complete the connection. Please try again.' },
  missing_permission: { tone: 'bad', text: 'Both calendar permissions are needed (view busy times and add events). Please connect again and leave both ticked.' },
  not_configured: { tone: 'bad', text: 'Google Calendar isn’t set up on this HomeQuote site yet. Ask your HomeQuote admin.' },
  forbidden: { tone: 'bad', text: 'Only contractor accounts and HomeQuote team members can connect a calendar.' },
};

export function CalendarNotice({ code }: { code?: string }) {
  const n = code ? NOTICES[code] : undefined;
  if (!n) return null;
  return (
    <p role="status" className={`rounded-md border p-3 text-sm ${n.tone === 'ok' ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'border-red-300 bg-red-50 text-red-900'}`}>
      {n.text}
    </p>
  );
}

export function CalendarConnections({
  connections,
  googleConfigured,
  hasFeedLink,
  host = false,
}: {
  connections: ConnectionView[];
  googleConfigured: boolean;
  hasFeedLink: boolean;
  /** A HomeQuote team / sales host (booking calendar settings): Google only, call wording, no feed link. */
  host?: boolean;
}) {
  const google = connections.find((c) => c.provider === 'google');
  // Direct Google sign-in is optional and hidden until an admin sets it up; the calendar link below works for everyone.
  const showGoogleSignIn = googleConfigured || !!google;
  return (
    <div className={showGoogleSignIn && !host ? 'grid gap-4 lg:grid-cols-2' : 'grid gap-4'}>
      {showGoogleSignIn && (
      <section className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold">Google Calendar</h3>
          {google ? (
            <Badge variant={google.status === 'active' ? 'success' : 'warning'}>{google.status === 'active' ? 'Connected' : 'Needs reconnect'}</Badge>
          ) : (
            <Badge variant="muted">Not connected</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {host
            ? 'Two-way: times you’re busy on Google are not offered to callers (only “busy”, never your event details), and every call booked on the calendars you host is added to your calendar, including changes and cancellations.'
            : 'Two-way: times you’re busy on Google show as unavailable in HomeQuote (only “busy”, never your event details), and every appointment HomeQuote assigns you is added to your calendar automatically — including changes and cancellations.'}
        </p>
        {google ? (
          <>
            <p className="text-sm">
              <CalendarCheck className="mr-1 inline size-4" />
              {google.account_email ?? 'Google account'} · {google.calendar_name ?? 'Primary calendar'}
            </p>
            {google.status === 'needs_reconnect' && (
              <p className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-sm text-amber-900" role="alert">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                Google access expired or was removed, so new appointments are not reaching your calendar. Reconnect to resume.
              </p>
            )}
            {google.last_error && google.status === 'active' && <p className="text-xs text-amber-800">Last sync problem: {google.last_error}</p>}
            <p className="text-xs text-muted-foreground">
              Last synced: {google.last_synced_at ? new Date(google.last_synced_at).toLocaleString() : 'not yet'}
            </p>
            <form action={updateCalendarPreferences} className="space-y-2">
              <input type="hidden" name="connection_id" value={google.id} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="push_appointments" defaultChecked={google.push_appointments} /> Add my HomeQuote appointments to this calendar
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="import_busy" defaultChecked={google.import_busy} /> Treat my busy times as unavailable in HomeQuote
              </label>
              <Button type="submit" size="sm" variant="outline">Save</Button>
            </form>
            <div className="flex flex-wrap gap-2">
              {google.status === 'needs_reconnect' && (
                <Button asChild size="sm"><a href="/api/integrations/google-calendar/oauth/start">Reconnect Google</a></Button>
              )}
              <form action={disconnectCalendar}>
                <input type="hidden" name="connection_id" value={google.id} />
                <Button type="submit" size="sm" variant="outline">Disconnect</Button>
              </form>
            </div>
          </>
        ) : (
          <Button asChild><a href="/api/integrations/google-calendar/oauth/start">Connect Google Calendar</a></Button>
        )}
      </section>
      )}

      {!host && (
      <section className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold">Add appointments to your calendar</h3>
          <Badge variant={hasFeedLink ? 'success' : 'muted'}>{hasFeedLink ? 'Link active' : 'Not set up'}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Tap the button, pick Apple or Google, and confirm. From then on every appointment HomeQuote books for you — and any change or
          cancellation — shows up in your calendar automatically. Works with Apple Calendar, Google Calendar, Outlook and more.
        </p>
        <FeedLink hasLink={hasFeedLink} />
        <p className="text-xs text-muted-foreground">You can also download any single appointment as an .ics file from the Appointments page.</p>
      </section>
      )}
    </div>
  );
}
