import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { listAppointments, type AppointmentRow } from '@/lib/data/appointments';
import { appointmentTab } from '@/lib/appointments/view';
import type { Profile } from '@/lib/types';

export interface HomeLead {
  id: string;
  name: string;
  project: string | null;
  city: string | null;
  status: string;
  phone: string | null;
  created_at: string;
}

export interface HomeCallback {
  id: string;
  company_name: string;
  next_callback_at: string;
  phone: string | null;
}

export interface HomeNotification {
  id: string;
  title: string;
  body: string | null;
  url: string | null;
  created_at: string;
}

export interface MobileHomeData {
  today: AppointmentRow[];
  upcoming: AppointmentRow[];
  newLeads: HomeLead[];
  callbacks: HomeCallback[];
  activity: HomeNotification[];
  unread: number;
}

const OPEN_APPT = new Set(['scheduled', 'confirmed', 'rescheduled']);

/**
 * Everything the phone "action center" shows. Every query runs through the
 * signed-in user's own Supabase client, so RLS decides what each role and
 * contractor company can see — nothing here widens access. Each section
 * degrades to empty on error rather than failing the whole screen.
 */
export async function getMobileHome(profile: Profile): Promise<MobileHomeData> {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  const showCallbacks = profile.role === 'admin' || profile.role === 'setter';

  const [appointments, leads, callbacks, notes, unread] = await Promise.all([
    listAppointments().catch(() => [] as AppointmentRow[]),
    supabase
      .from('leads')
      .select('id, first_name, last_name, phone, city, status, created_at, vertical:verticals(name), sub_service:sub_services(name)')
      .in('status', ['new', 'assigned', 'contact_attempted'])
      .is('archived_at', null)
      .order('created_at', { ascending: false })
      .limit(5),
    showCallbacks
      ? supabase
          .from('contractor_prospects')
          .select('id, company_name, next_callback_at, phone')
          .lte('next_callback_at', nowIso)
          .is('do_not_call_at', null)
          .order('next_callback_at', { ascending: true })
          .limit(5)
      : Promise.resolve({ data: [] }),
    supabase
      .from('notifications')
      .select('id, title, body, url, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('notifications').select('id', { count: 'exact', head: true }).is('read_at', null),
  ]);

  const open = appointments.filter((a) => OPEN_APPT.has(a.status));
  const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));

  return {
    today: open.filter((a) => appointmentTab(a.scheduled_at) === 'today'),
    upcoming: open.filter((a) => a.scheduled_at && appointmentTab(a.scheduled_at) === 'upcoming').slice(0, 3),
    newLeads: ((leads.data ?? []) as unknown as Record<string, unknown>[]).map((l) => ({
      id: l.id as string,
      name: [l.first_name, l.last_name].filter(Boolean).join(' ') || (l.phone as string | null) || 'Lead',
      project:
        one(l.sub_service as { name: string } | { name: string }[] | null)?.name ??
        one(l.vertical as { name: string } | { name: string }[] | null)?.name ??
        null,
      city: (l.city as string | null) ?? null,
      status: l.status as string,
      phone: (l.phone as string | null) ?? null,
      created_at: l.created_at as string,
    })),
    callbacks: (callbacks.data ?? []) as HomeCallback[],
    activity: (notes.data ?? []) as HomeNotification[],
    unread: unread.count ?? 0,
  };
}
