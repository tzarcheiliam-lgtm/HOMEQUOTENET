import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The contractor sales funnel books HomeQuote's own sales calendar whenever it
 * is active; the admin / env Calendly URLs are fallbacks only, and the site
 * default is no longer an external calendar.
 */

const m = vi.hoisted(() => ({ sales: null as unknown, row: null as unknown, throws: false }));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/booking/calendars.server', () => ({
  calendarForContractorFunnel: async () => {
    if (m.throws) throw new Error('relation "booking_calendars" does not exist');
    return m.sales;
  },
}));
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: m.row }) }) }) }) }),
}));

import { loadFunnelSettings } from '@/lib/contractor-funnel/settings.server';
import { NATIVE_SALES_CALENDAR_URL } from '@/lib/contractor-funnel/schema';
import { site } from '@/content/site';

beforeEach(() => {
  m.sales = { id: 'cal-sales', kind: 'sales', active: true };
  m.row = { sales_calendar_url: 'https://calendly.com/homequotenetwork/30min', meta_pixel_id: null, rules: null };
  m.throws = false;
  vi.stubEnv('CONTRACTOR_SALES_CALENDAR_URL', '');
});

describe('contractor funnel calendar', () => {
  it('uses the HomeQuote sales calendar first, even with a Calendly URL saved', async () => {
    const s = await loadFunnelSettings();
    expect(s.calendar).toEqual({ provider: 'homequote', url: NATIVE_SALES_CALENDAR_URL });
  });
  it('falls back to the saved URL only while the sales calendar is missing, off, or unreadable', async () => {
    m.sales = null;
    expect((await loadFunnelSettings()).calendar).toEqual({ provider: 'calendly', url: 'https://calendly.com/homequotenetwork/30min' });
    m.throws = true;
    expect((await loadFunnelSettings()).calendarSource).toBe('admin');
  });
  it('the site default is the in-site Check My Fit page, never an external calendar', async () => {
    m.sales = null;
    m.row = null;
    expect(site.contact.booking).toBe('/contractor-appointments/check-fit');
    const s = await loadFunnelSettings();
    expect(s.calendar).toBeNull();
    expect(s.calendarSource).toBe('none');
  });
});
