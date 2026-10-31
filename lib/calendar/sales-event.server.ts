/* eslint-disable @typescript-eslint/no-explicit-any -- rows come from the untyped Supabase client, as elsewhere in lib/data */
import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { siteUrl } from './config';
import type { CalendarEventInput } from './google';

type Db = ReturnType<typeof createAdminClient>;

/** A sales meeting with a contractor prospect (public.prospect_sales_appointments), as an admin's calendar shows it (0073). */
export interface SalesMeetingDetail {
  id: string;
  prospectId: string;
  company: string;
  decisionMaker: string | null;
  phone: string | null;
  contactInfo: string | null;
  type: string | null;
  scheduledAt: string;
  endsAt: string | null;
  status: string;
  notes: string | null;
  city: string | null;
  state: string | null;
}

const SELECT = `id, prospect_id, decision_maker_name, scheduled_at, ends_at, appointment_type, contact_info, status, notes,
  prospect:contractor_prospects(company_name, phone, city, state)`;

export async function loadSalesMeeting(db: Db, id: string): Promise<SalesMeetingDetail | null> {
  const { data } = await db.from('prospect_sales_appointments').select(SELECT).eq('id', id).maybeSingle();
  if (!data) return null;
  const r = data as any;
  return {
    id: r.id,
    prospectId: r.prospect_id,
    company: r.prospect?.company_name || 'Contractor',
    decisionMaker: r.decision_maker_name ?? null,
    phone: r.prospect?.phone ?? null,
    contactInfo: r.contact_info ?? null,
    type: r.appointment_type ?? null,
    scheduledAt: r.scheduled_at,
    endsAt: r.ends_at ?? null,
    status: r.status,
    notes: r.notes ?? null,
    city: r.prospect?.city ?? null,
    state: r.prospect?.state ?? null,
  };
}

/** Kept on the calendar while open or done; a cancelled meeting comes off. */
export function salesMeetingWanted(m: SalesMeetingDetail): boolean {
  return !!m.scheduledAt && m.status !== 'cancelled';
}

const SALES_MINUTES = 30;
const TYPE_WORDS: Record<string, string> = { phone: 'Phone call', video: 'Video call', in_person: 'In person' };

export function salesMeetingLink(m: Pick<SalesMeetingDetail, 'prospectId'>): string {
  return `${siteUrl()}/app/calls/${m.prospectId}`;
}

export function salesMeetingEvent(m: SalesMeetingDetail): CalendarEventInput {
  const startMs = new Date(m.scheduledAt).getTime();
  const endMs = m.endsAt ? new Date(m.endsAt).getTime() : NaN;
  const end = Number.isFinite(endMs) && endMs > startMs ? endMs : startMs + SALES_MINUTES * 60_000;
  const link = salesMeetingLink(m);
  const where = [m.city, m.state].filter(Boolean).join(', ');
  const isUrl = !!m.contactInfo && /^https?:\/\//i.test(m.contactInfo.trim());
  return {
    summary: `Sales call · ${m.company} (contractor)`,
    description: [
      `Contractor: ${m.company}${where ? ` (${where})` : ''}`,
      m.decisionMaker ? `With: ${m.decisionMaker}` : null,
      m.type ? `Type: ${TYPE_WORDS[m.type] ?? m.type}` : null,
      m.contactInfo ? `Contact: ${m.contactInfo}` : null,
      m.phone ? `Company phone: ${m.phone}` : null,
      `Status: ${m.status}`,
      m.notes ? `Notes: ${m.notes}` : null,
      '',
      `Open in HomeQuote: ${link}`,
    ].filter((l) => l !== null).join('\n'),
    location: isUrl ? m.contactInfo!.trim() : m.type === 'in_person' && where ? where : null,
    startIso: new Date(startMs).toISOString(),
    endIso: new Date(end).toISOString(),
    url: link,
  };
}
