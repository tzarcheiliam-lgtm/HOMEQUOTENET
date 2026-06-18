import 'server-only';
import { createClient } from '@/lib/supabase/server';

export interface AppointmentRow {
  id: string;
  scheduled_at: string | null;
  status: string;
  location: string | null;
  lead_id: string | null;
  lead_name: string;
  contractor_name: string | null;
}

/** Appointments visible to the current user (RLS scopes by role). */
export async function listAppointments(): Promise<AppointmentRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('appointments')
    .select(
      `id, scheduled_at, status, location,
       assignment:lead_assignments(
         lead:leads(id, first_name, last_name, phone),
         contractor:contractors(name)
       )`
    )
    .order('scheduled_at', { ascending: true });

  return (data ?? []).map((a: any) => {
    const lead = a.assignment?.lead;
    const leadName =
      [lead?.first_name, lead?.last_name].filter(Boolean).join(' ') ||
      lead?.phone ||
      'Lead';
    return {
      id: a.id,
      scheduled_at: a.scheduled_at,
      status: a.status,
      location: a.location,
      lead_id: lead?.id ?? null,
      lead_name: leadName,
      contractor_name: a.assignment?.contractor?.name ?? null,
    };
  });
}
