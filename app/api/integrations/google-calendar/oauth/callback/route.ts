import { timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { getProfile } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  CALENDAR_EVENTS_SCOPE,
  CALENDAR_FREEBUSY_SCOPE,
  encryptCalendarSecret,
  googleCalendarReady,
} from '@/lib/calendar/config';
import { exchangeCode, fetchAccountEmail, googleCalendarReturnPath, mayConnectGoogleCalendar } from '@/lib/calendar/google';
import { backfillHostedAppointments, backfillUpcomingAppointments, flushCalendarSyncSoon } from '@/lib/calendar/sync.server';

const COOKIE_PATH = '/api/integrations/google-calendar/oauth/callback';

function sameState(left: string | null, right: string | undefined): boolean {
  if (!left || !right) return false;
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function finish(request: NextRequest, status: string, path = '/app/availability') {
  const url = new URL(path, request.url);
  url.searchParams.set('calendar', status);
  const response = NextResponse.redirect(url);
  for (const name of ['hqn_gcal_oauth_state', 'hqn_gcal_oauth_verifier']) {
    response.cookies.set(name, '', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: COOKIE_PATH, maxAge: 0 });
  }
  return response;
}

export async function GET(request: NextRequest) {
  const me = await getProfile();
  if (!me || !me.is_active || !mayConnectGoogleCalendar(me)) return finish(request, 'forbidden');
  // Contractor users: their company's appointments. HomeQuote staff: the booking calendars they host (no contractor).
  const contractorId = me.role === 'contractor' ? me.contractor_id : null;
  const back = googleCalendarReturnPath(me);

  // cookie = "<userId>.<state>": the flow can only be completed by the user who started it.
  const state = request.nextUrl.searchParams.get('state');
  const cookie = request.cookies.get('hqn_gcal_oauth_state')?.value;
  if (!cookie || !cookie.startsWith(`${me.id}.`) || !sameState(state, cookie.slice(me.id.length + 1))) {
    return finish(request, 'invalid_state', back);
  }
  const verifier = request.cookies.get('hqn_gcal_oauth_verifier')?.value;
  const code = request.nextUrl.searchParams.get('code');
  if (!code || !verifier || request.nextUrl.searchParams.get('error')) return finish(request, 'cancelled', back);
  if (!googleCalendarReady()) return finish(request, 'not_configured', back);

  try {
    const token = await exchangeCode(code, verifier);
    if (!token.access_token || !token.refresh_token || !token.scope) return finish(request, 'token_error', back);
    const granted = token.scope.split(/\s+/);
    // The user can untick individual permissions on Google's consent screen.
    if (!granted.includes(CALENDAR_EVENTS_SCOPE) || !granted.includes(CALENDAR_FREEBUSY_SCOPE)) {
      return finish(request, 'missing_permission', back);
    }
    const email = await fetchAccountEmail(token.access_token);
    const db = createAdminClient();
    const values = {
      contractor_id: contractorId,
      account_email: email,
      calendar_id: 'primary',
      calendar_name: email ? `${email} (primary)` : 'Primary calendar',
      encrypted_credentials: encryptCalendarSecret(token.refresh_token),
      granted_scope: token.scope,
      status: 'active' as const,
      last_error: null,
      connected_at: new Date().toISOString(),
    };
    const { data: existing } = await db.from('calendar_connections').select('id').eq('user_id', me.id).eq('provider', 'google').maybeSingle();
    const { error } = existing
      ? await db.from('calendar_connections').update(values).eq('id', existing.id)
      : await db.from('calendar_connections').insert({ ...values, user_id: me.id, provider: 'google' });
    if (error) return finish(request, 'token_error', back);
    if (contractorId) await backfillUpcomingAppointments(db, contractorId);
    else await backfillHostedAppointments(db, me.id);
    flushCalendarSyncSoon();
    return finish(request, 'connected', back);
  } catch {
    return finish(request, 'token_error', back);
  }
}
