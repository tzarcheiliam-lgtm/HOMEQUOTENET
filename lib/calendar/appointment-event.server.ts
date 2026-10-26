/* eslint-disable @typescript-eslint/no-explicit-any -- rows come from the untyped Supabase client, as elsewhere in lib/data */
import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { siteUrl } from './config';
import type { IcsEvent } from './ics';

type Db = ReturnType<typeof createAdminClient>;

export interface AppointmentDetail {
  id: string;
  scheduledAt: string | null;
  status: string;
  location: string | null;
  notes: string | null;
  updatedAt: string | null;
  contractorId: string | null;
  leadId: string | null;
  customerName: string;
  firstName: string | null;
  phone: string | null;
  address: string | null;
  project: string | null;
}

export const APPOINTMENT_SELECT = `id, scheduled_at, status, location, notes, updated_at,
  assignment:lead_assignments(contractor_id, lead:leads(id, first_name, last_name, phone, address, city, state, zip,
    vertical:verticals(name), sub_service:sub_services(name)))`;

export function mapAppointment(a: any): AppointmentDetail {
  const lead = a.assignment?.lead;
  const addressLine = [lead?.address, lead?.city, [lead?.state, lead?.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  return {
    id: a.id,
    scheduledAt: a.scheduled_at,
    status: a.status,
    location: a.location,
    notes: a.notes,
    updatedAt: a.updated_at ?? null,
    contractorId: a.assignment?.contractor_id ?? null,
    leadId: lead?.id ?? null,
    customerName: [lead?.first_name, lead?.last_name].filter(Boolean).join(' ') || 'Homeowner',
    firstName: lead?.first_name ?? null,
    phone: lead?.phone ?? null,
    address: addressLine || null,
    project: [lead?.vertical?.name, lead?.sub_service?.name].filter(Boolean).join(' · ') || null,
  };
}

export async function loadAppointment(db: Db, id: string): Promise<AppointmentDetail | null> {
  const { data } = await db.from('appointments').select(APPOINTMENT_SELECT).eq('id', id).maybeSingle();
  return data ? mapAppointment(data) : null;
}

export function appointmentLink(a: Pick<AppointmentDetail, 'leadId'>): string {
  return a.leadId ? `${siteUrl()}/app/leads/${a.leadId}` : `${siteUrl()}/app/appointments`;
}

export function eventTitle(a: AppointmentDetail): string {
  return `HomeQuote: ${[a.project, a.firstName ?? a.customerName].filter(Boolean).join(' – ')}`.replace(/: $/, '');
}

export function eventDescription(a: AppointmentDetail): string {
  return [
    `Customer: ${a.customerName}`,
    a.phone ? `Phone: ${a.phone}` : null,
    a.project ? `Project: ${a.project}` : null,
    a.notes ? `Notes: ${a.notes}` : null,
    '',
    `Open in HomeQuote: ${appointmentLink(a)}`,
  ]
    .filter((l) => l !== null)
    .join('\n');
}

export function eventLocation(a: AppointmentDetail): string | null {
  return a.location || a.address;
}

export function toIcsEvent(a: AppointmentDetail, durationMinutes: number): IcsEvent | null {
  if (!a.scheduledAt) return null;
  const startMs = new Date(a.scheduledAt).getTime();
  if (Number.isNaN(startMs)) return null;
  const cancelled = a.status === 'cancelled' || a.status === 'rescheduled';
  const updated = a.updatedAt ? new Date(a.updatedAt).getTime() : startMs;
  return {
    uid: `appt-${a.id}@homequotenet.com`,
    startMs,
    endMs: startMs + durationMinutes * 60_000,
    summary: eventTitle(a),
    description: eventDescription(a),
    location: eventLocation(a),
    url: appointmentLink(a),
    status: cancelled ? 'CANCELLED' : 'CONFIRMED',
    sequence: Math.floor(updated / 1000),
    lastModifiedMs: updated,
  };
}
