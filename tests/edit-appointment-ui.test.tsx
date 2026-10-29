import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('@/lib/actions/prospects', () => ({ updateSalesAppointment: vi.fn(async () => ({ ok: true, message: 'Meeting updated' })) }));

import { EditAppointment } from '@/components/calls/edit-appointment';

describe('Edit button on a sales meeting', () => {
  it('renders an Edit button (the form opens in a dialog)', () => {
    const html = renderToStaticMarkup(<EditAppointment meeting={{ id: 'm1', company: 'Acme Remodel', scheduledAt: '2026-12-03T22:30:00Z', timeZone: 'America/Los_Angeles', appointmentType: 'phone', contactInfo: '818-555-0101', decisionMakerName: 'Mike', notes: null }} />);
    expect(html).toContain('Edit');
    expect(html).toContain('aria-haspopup="dialog"');
  });
});
