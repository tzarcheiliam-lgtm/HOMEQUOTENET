import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { site } from '@/content/site';
import { mergeRules, type CalendarInfo, type QualificationRules } from './schema';

export type FunnelSettings = {
  /** Where the sales calendar URL came from, so the admin page can say so. */
  calendarSource: 'admin' | 'env' | 'site' | 'none';
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
 * Calendar precedence: admin setting -> CONTRACTOR_SALES_CALENDAR_URL ->
 * the site's documented 30-minute contractor call (content/site.ts). Never a
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

  let calendar = parseCalendarUrl(row?.sales_calendar_url);
  let calendarSource: FunnelSettings['calendarSource'] = calendar ? 'admin' : 'none';
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
