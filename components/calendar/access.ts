/**
 * Who may do what on a booking calendar (in-app calendar page + lib/actions/booking).
 * Mirrors the 0068 RLS so the UI never offers what the database would refuse:
 *   admin              every calendar: view, book, change, settings
 *   setter             every calendar: view, book, change; settings read-only
 *   contractor owner   their own company's calendar: view, book, change, settings
 *   contractor staff   their own company's calendar: view, book, change; settings read-only
 *   caller / anyone    nothing (the page redirects)
 * The database still has the last word: reads go through the user's own
 * client (RLS) before any service-role booking RPC runs.
 */
import type { CalendarKind } from '@/lib/booking/types';

export interface CalendarViewer {
  id: string;
  role: 'admin' | 'setter' | 'contractor' | 'caller';
  contractor_id: string | null;
  contractor_role: 'owner' | 'staff' | null;
}

export interface CalendarRef {
  kind: CalendarKind;
  contractorId: string | null;
}

export const isCalendarStaff = (v: CalendarViewer) => v.role === 'admin' || v.role === 'setter';

const ownsCalendar = (v: CalendarViewer, c: CalendarRef) =>
  v.role === 'contractor' && !!v.contractor_id && c.kind === 'contractor' && c.contractorId === v.contractor_id;

/** May open the calendar page at all. */
export const canUseCalendarPage = (v: CalendarViewer) => isCalendarStaff(v) || (v.role === 'contractor' && !!v.contractor_id);

export function canViewCalendar(v: CalendarViewer, c: CalendarRef): boolean {
  return isCalendarStaff(v) || ownsCalendar(v, c);
}

/** Book on behalf, reschedule, cancel, record held / no-show. */
export function canWorkCalendar(v: CalendarViewer, c: CalendarRef): boolean {
  return isCalendarStaff(v) || ownsCalendar(v, c);
}

/** Edit hours, length, buffer, notice, meeting type, hosts. */
export function canManageCalendar(v: CalendarViewer, c: CalendarRef): boolean {
  return v.role === 'admin' || (ownsCalendar(v, c) && v.contractor_role === 'owner');
}

/** "Book anyway" outside the open slots (audited): HomeQuote staff only, like the lead page's override. */
export const canOverrideSlots = (v: CalendarViewer) => isCalendarStaff(v);
