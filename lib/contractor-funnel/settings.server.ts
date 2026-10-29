import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { site } from '@/content/site';
import { calendarForContractorFunnel } from '@/lib/booking/calendars.server';
import { NATIVE_SALES_CALENDAR_URL, mergeRules, type CalendarInfo, type QualificationRules } from './schema';

export type FunnelSettings = {
  /**
   * Where the sales calendar came from, so the admin page can say so. 'site' is the
   * site default, which is now HomeQuote's own sales calendar (provider 'homequote').
   */
  calendarSource: 'homequote' | 'admin' | 'env' | 'site' | 'none';
  calendar: CalendarInfo | null;
  pixelId: string | null;
  rules: QualificationRules;
};

/** https only, so a typo or javascript: URL can never reach an iframe/link. */
export function parseCalendarUrl(raw: string | null | undefined): CalendarInfo | null {
  if (!raw) return null;
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== 'https:') return null;
    return { url: u.toString(), provider: u.hostname === 'calendly.com' ? 'calendly' : 'link' };
  } catch {
    return null;
  }
}

/**
 * Calendar precedence: HomeQuote's own sales calendar (booking_calendars kind
 * 'sales', when active) -> admin URL setting -> CONTRACTOR_SALES_CALENDAR_URL ->
 * the site's link when it is an https URL (content/site.ts; today an in-site
 * page, so no external calendar). The external URLs are fallbacks only, used
 * while the sales calendar is missing or switched off. Never a
 * homeowner/client calendar, never invented.
 */
export async function loadFunnelSettings(): Promise<FunnelSettings> {
  let row: { sales_calendar_url: string | null; meta_pixel_id: string | null; rules: unknown } | null = null;
  try {
    const { data } = await createAdminClient()
      .from('contractor_funnel_settings')
      .select('sales_calendar_url, meta_pixel_id, rules')
      .eq('id', 'default')
      .maybeSingle();
    row = data;
  } catch {
    row = null; // Table missing / DB unreachable: fall through to env + site defaults.
  }

  let native = false;
  try {
    native = (await calendarForContractorFunnel()) !== null;
  } catch {
    native = false; // Booking tables missing / DB unreachable: the URL fallbacks below.
  }

  let calendar: CalendarInfo | null = native ? { url: NATIVE_SALES_CALENDAR_URL, provider: 'homequote' } : parseCalendarUrl(row?.sales_calendar_url);
  let calendarSource: FunnelSettings['calendarSource'] = native ? 'homequote' : calendar ? 'admin' : 'none';
  if (!calendar) {
    calendar = parseCalendarUrl(process.env.CONTRACTOR_SALES_CALENDAR_URL);
    if (calendar) calendarSource = 'env';
  }
  if (!calendar) {
    calendar = parseCalendarUrl(site.contact.booking);
    if (calendar) calendarSource = 'site';
  }

  const pixel = (row?.meta_pixel_id ?? process.env.NEXT_PUBLIC_CONTRACTOR_META_PIXEL_ID ?? '').trim();
  return {
    calendarSource,
    calendar,
    pixelId: /^\d{8,20}$/.test(pixel) ? pixel : null,
    rules: mergeRules(row?.rules),
  };
}
