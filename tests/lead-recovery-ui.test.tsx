/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Lead recovery UI, server-rendered (no DOM): "Send my design to my partner" on the funnel's booking screen (and its
 * share-or-copy logic), the read-only shared design page, and "Couldn't reach them" in the calendar details sheet.
 */
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/actions/booking', () => ({
  cancelCalendarEvent: vi.fn(), rescheduleCalendarEvent: vi.fn(), setCalendarEventStatus: vi.fn(), reportMissedCall: vi.fn(),
  getCalendarSlots: vi.fn(async () => ({ ok: true, slots: [], timeZone: 'America/Los_Angeles', durationMinutes: 10, current: null })),
}));
// The sheet is a Radix portal (nothing renders on the server): draw its content inline.
vi.mock('@/components/calendar/panel', () => ({
  CalendarPanel: ({ open, title, children, footer }: { open: boolean; title: string; children: ReactNode; footer?: ReactNode }) =>
    open ? <div data-panel={title}>{children}{footer}</div> : null,
}));

import { POOL_MASTERS_FUNNEL } from '@/content/estimators/pool-masters-funnel';
import { POOL_MASTERS_ESTIMATOR } from '@/content/estimators/pool-masters';
import { FunnelBookingScreen } from '@/components/estimator/funnel/booking/funnel-booking';
import { shareOrCopy } from '@/components/estimator/funnel/booking/share-design';
import { SharedDesign } from '@/components/estimator/share/shared-design';
import { EventSheet } from '@/components/calendar/event-sheet';
import { canReportMissedCall, type CalendarEvent } from '@/components/calendar/view';
import { getEstimator } from '@/lib/estimator/registry';
import { funnelSpecFor } from '@/lib/estimator/funnel/engine';
import { sharedDesignView } from '@/lib/estimator/share-view';
import type { FunnelLeadResult } from '@/components/estimator/funnel/screens';
import type { Estimate, EstimatorTemplate } from '@/lib/estimator/types';

describe('"Send my design to my partner"', () => {
  const result: FunnelLeadResult = {
    estimate: { low: 85_000, high: 110_000 } as Estimate, qualified: true, bookingTicket: 'hqb1.e.t',
    contact: { firstName: 'Jordan', lastName: 'Rivera', email: 'j@x.test' }, shareUrl: '/estimator/pool-masters/my-design?size=classic&finish=luxe&extras=spa&spa=zero_edge&v=sig',
  };
  const render = (r: FunnelLeadResult) => renderToStaticMarkup(
    <FunnelBookingScreen slug="pool-masters" spec={POOL_MASTERS_FUNNEL} contractor={POOL_MASTERS_ESTIMATOR} template={{ trade: 'pool' } as EstimatorTemplate}
      selection={{ size: 'classic', finish: 'luxe', extras: 'spa', spa: 'zero_edge' }} result={r} embedded={false} headingId="h" />,
  );

  it('sits on the booking screen (before and after booking: the same screen) as a real button', () => {
    const h = render(result);
    expect(h).toContain('data-funnel-share=""');
    expect(h).toMatch(/<button type="button"[^>]*>.*Send my design to my partner<\/button>/);
    // Above the booking card, so it is there whether or not they have booked yet.
    expect(h.indexOf('data-funnel-share')).toBeLessThan(h.indexOf('data-funnel-calendar'));
    expect(h).toContain('role="status"');
  });

  it('is not offered when nothing was saved', () => {
    expect(render({ ...result, saved: false })).not.toContain('data-funnel-share');
  });

  it('uses the share sheet with title, text and url; falls back to copying, then to showing the link', async () => {
    const data = { title: 'My pool design · Pool Masters LA', text: 'Here’s the pool I designed with Pool Masters LA. Take a look:', url: 'https://x.test/estimator/pool-masters/my-design?size=classic' };
    const share = vi.fn(async () => undefined);
    const writeText = vi.fn(async () => undefined);
    expect(await shareOrCopy({ share, clipboard: { writeText } } as any, data)).toBe('shared');
    expect(share).toHaveBeenCalledWith(data);
    expect(writeText).not.toHaveBeenCalled();
    // Closing the sheet is not an error and copies nothing.
    const abort = vi.fn(async () => { throw Object.assign(new Error('x'), { name: 'AbortError' }); });
    expect(await shareOrCopy({ share: abort, clipboard: { writeText } } as any, data)).toBe('cancelled');
    expect(writeText).not.toHaveBeenCalled();
    // No share sheet (desktop): copy the link.
    expect(await shareOrCopy({ clipboard: { writeText } } as any, data)).toBe('copied');
    expect(writeText).toHaveBeenCalledWith(data.url);
    // canShare says no: copy.
    expect(await shareOrCopy({ share, canShare: () => false, clipboard: { writeText } } as any, data)).toBe('copied');
    // Clipboard blocked too: show the link.
    expect(await shareOrCopy({ clipboard: { writeText: async () => { throw new Error('denied'); } } } as any, data)).toBe('manual');
  });
});

describe('the shared design page', () => {
  const found = getEstimator('pool-masters')!;
  const spec = funnelSpecFor(found.contractor)!;
  const sel = { size: 'classic', finish: 'luxe', extras: 'spa', spa: 'zero_edge' };

  it('shows the picks with their photos and the ballpark for a signed link, nothing personal', () => {
    const h = renderToStaticMarkup(<SharedDesign contractor={found.contractor} spec={spec} view={sharedDesignView(spec, found.template, sel, true)} />);
    expect(h).toContain('A pool design from Pool Masters');
    for (const t of ['Classic', 'Luxe', 'Zero-edge spa']) expect(h).toContain(t);
    expect(h).toContain('data-shared-range=""');
    expect(h).toContain('Design your own pool');
    expect(h).not.toMatch(/Jordan|Rivera|@example|lead_?id/i);
  });

  it('without a valid signature: picks and photos only, no price', () => {
    const h = renderToStaticMarkup(<SharedDesign contractor={found.contractor} spec={spec} view={sharedDesignView(spec, found.template, sel, false)} />);
    expect(h).not.toContain('data-shared-range');
    expect(h).not.toMatch(/\$\d/);
  });
});

describe('"Couldn’t reach them" in the calendar details sheet', () => {
  const NOW = Date.parse('2026-11-03T18:30:00Z');
  const ev: CalendarEvent = {
    id: '11111111-2222-4333-8444-555555555555', kind: 'appointment', status: 'scheduled', startMs: NOW - 15 * 60_000, endMs: NOW - 5 * 60_000,
    title: 'Jordan Rivera', subtitle: 'Pools', phone: '+18185550100', email: 'j@x.test', city: 'Calabasas', leadId: 'lead-1', prospectId: null, source: 'estimator',
    meetingType: 'phone', location: 'Phone call', notes: null, contractorName: null, cancelReason: null, rescheduleCount: 0, design: null,
  };
  const sheet = (e: CalendarEvent, canWork = true) => renderToStaticMarkup(
    <EventSheet event={e} calendarId="cal" timeZone="America/Los_Angeles" canWork={canWork} allowOverride={false} nowMs={NOW} onClose={() => undefined} />,
  );

  it('shows on a call whose time came and that is still scheduled, with what it does', () => {
    const h = sheet(ev);
    expect(h).toContain('data-missed-call=""');
    expect(h).toContain('Couldn’t reach them');
    expect(h).toContain('Texts and emails Jordan a link to pick a new time, and logs the attempt.');
  });

  it('is hidden before the call, once marked, for visits / sales meetings, and for someone who can’t work the calendar', () => {
    expect(sheet({ ...ev, startMs: NOW + 60_000, endMs: NOW + 11 * 60_000 })).not.toContain('data-missed-call');
    expect(sheet({ ...ev, status: 'no_show' })).not.toContain('data-missed-call');
    expect(sheet({ ...ev, status: 'held' })).not.toContain('data-missed-call');
    expect(sheet({ ...ev, kind: 'visit' })).not.toContain('data-missed-call');
    expect(sheet({ ...ev, kind: 'sales_appointment', leadId: null, prospectId: 'p' })).not.toContain('data-missed-call');
    expect(sheet(ev, false)).not.toContain('data-missed-call');
    expect(canReportMissedCall(ev, true, NOW)).toBe(true);
    expect(canReportMissedCall({ ...ev, leadId: null }, true, NOW)).toBe(false);
  });
});
