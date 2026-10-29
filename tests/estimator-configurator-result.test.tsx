import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { POOL_MASTERS_CONFIGURATOR as SPEC } from '@/content/estimators/pool-masters-configurator';
import { ConfiguratorBooking } from '@/components/estimator/configurator/result/booking-form';
import {
  bookingRequest,
  calendarFrameUrl,
  designHighlights,
  emptyBookingFields,
  firstInvalidField,
  generalErrors,
  tidyPhone,
} from '@/components/estimator/configurator/result/booking-state';
import { ConfiguratorResultPage } from '@/components/estimator/configurator/result/result-page';
import { currentPhotos } from '@/components/estimator/configurator/photos';
import { costBreakdown, moneyRange } from '@/components/estimator/configurator/state';
import { publicTemplate } from '@/lib/estimator/config';
import { defaultSelection, selectionToAnswers } from '@/lib/estimator/configurator/engine';
import { estimatorConsentText, leadFieldErrors } from '@/lib/estimator/lead-client';
import { parseLeadRequest } from '@/lib/estimator/lead';
import { getEstimator } from '@/lib/estimator/registry';

vi.mock('server-only', () => ({}));

const { template: FULL, contractor } = getEstimator('pool-masters')!;
const T = publicTemplate(FULL, contractor);
const base = defaultSelection(SPEC);
const luxe = { ...base, luxe: true, picks: { ...base.picks, equipment: ['salt'] } };

function props(selection = luxe) {
  const breakdown = costBreakdown(SPEC, T, selection);
  return {
    slug: contractor.slug,
    contractor,
    template: T,
    spec: SPEC,
    selection,
    answers: selectionToAnswers(SPEC, selection),
    breakdown,
    photos: currentPhotos(SPEC, selection),
    designUrl: 'https://homequote.example/estimator/pool-masters?m=medium&lx=1',
    photoNote: SPEC.photoNote,
    onBack: () => undefined,
  };
}

describe('result page markup', () => {
  const html = renderToStaticMarkup(<ConfiguratorResultPage {...props()} />);
  it('shows the design: photos of every view, headline, plain-words summary', () => {
    expect(html).toContain('Here&#x27;s your pool.'.replace('&#x27;', '’'));
    for (const v of SPEC.views) expect(html).toContain(`${v.label} view`);
    expect(html).toContain(SPEC.photoNote);
    expect(html).toContain('Your design');
    expect(html).toContain('Pebble');
    expect(html).toContain('Salt system');
    expect(html).toContain('Luxe');
  });
  it('shows the total as a range with the compliance notes', () => {
    const { total } = costBreakdown(SPEC, T, luxe);
    expect(html).toContain(moneyRange(total));
    expect(html).toContain('Ballpark, not a quote');
    expect(html).toContain('Example prices');
    expect(html).toContain('confirmed at your free on-site visit');
  });
  it('financing in words only, with the disclosure, and no monthly figure', () => {
    expect(html).toContain('Financing available through third-party lenders');
    expect(html).toContain(contractor.financingDisclosure!.slice(0, 60));
    expect(html).not.toMatch(/\/mo\b|per month|monthly payment of/i);
  });
  it('next steps and the booking form with the funnel consent wording', () => {
    expect(html).toContain('Book your free on-site consultation');
    expect(html).toContain('measure, confirm materials and give you a firm price');
    for (const name of ['firstName', 'lastName', 'phone', 'email', 'zip']) expect(html).toContain(`name="${name}"`);
    expect(html).toMatch(/autocomplete="postal-code"/i);
    expect(html).toMatch(/autocomplete="tel"/i);
    expect(html).toContain(estimatorConsentText(contractor.contractorName));
    expect(html).toContain('Allow optional advertising measurement');
    expect(html).toContain('Book my free consultation');
    expect(html).toContain('within one business day');
  });
  it('the honeypot is hidden and not autofillable', () => {
    const pot = html.match(/<div hidden="" inert="" aria-hidden="true" class="hidden"><label>Leave this empty<input[^>]*>/)?.[0] ?? '';
    expect(pot).toContain('name="contact_url_2"');
    expect(pot).toMatch(/autocomplete="off"/i);
    expect(pot).toContain('tabindex="-1"');
  });
  it('real projects strip, preferring the photo agent’s projects when given', () => {
    expect(html).toContain('Recent Pool Masters LA projects');
    const custom = renderToStaticMarkup(<ConfiguratorResultPage {...props()} projects={[{ src: '/p/one.webp', alt: 'Real job one', caption: 'Encino' }]} />);
    expect(custom).toContain('/p/one.webp');
    expect(custom).toContain('Encino');
  });
  it('measurement is an opt-in: never pre-ticked, even for an opt-out contractor', () => {
    const form = renderToStaticMarkup(<ConfiguratorBooking {...props()} />);
    const box = form.match(/<input type="checkbox"[^>]*\/><span>Allow optional advertising measurement/)?.[0] ?? '';
    expect(contractor.adMeasurement).toBe('opt_out');
    expect(box).not.toBe('');
    expect(box).not.toContain('checked=""');
  });
});

describe('booking state', () => {
  const fields = { ...emptyBookingFields(), firstName: ' Ava ', lastName: 'Stone', email: ' ava@example.test ', phone: '(818) 555-0142', zip: '90210-1234', homeowner: 'yes' as const, consent: true };
  it('builds a request the server accepts, with the selection and no prices', () => {
    const request = bookingRequest({ answers: selectionToAnswers(SPEC, luxe), selection: luxe, fields, consentText: estimatorConsentText('Pool Masters LA'), measurement: false, submissionId: 'abcdefgh-1' });
    expect(request.zip).toBe('90210');
    expect(request.contact.firstName).toBe('Ava');
    expect(request.configurator).toEqual({ model: 'medium', picks: luxe.picks, luxe: true });
    expect(JSON.stringify(request)).not.toMatch(/low|high|price/);
    expect(parseLeadRequest(request).ok).toBe(true);
    expect(leadFieldErrors(fields)).toEqual({});
  });
  it('points at the first field to fix, in screen order, and keeps form errors apart', () => {
    expect(firstInvalidField({ consent: 'x', email: 'y', phone: 'z' })).toBe('phone');
    expect(firstInvalidField({ form: 'x' })).toBeNull();
    expect(generalErrors({ form: 'Server busy', email: 'bad', tracking: 'odd' })).toEqual(['Server busy', 'odd']);
  });
  it('lists the homeowner’s picks, marking Go Luxe rows', () => {
    const h = designHighlights(SPEC, luxe);
    expect(h.find((g) => g.group === 'Pool finish')?.items).toEqual([{ label: 'Pebble', luxe: true, included: false }]);
    expect(h.find((g) => g.group === 'Equipment')?.items[0].label).toBe('Salt system');
    expect(designHighlights(SPEC, base).some((g) => g.group === 'Backyard')).toBe(false);
  });
  it('embeds Calendly with the prefilled name and email kept', () => {
    const url = calendarFrameUrl('https://calendly.com/homequotenetwork/30min?name=Ava+Stone&email=ava%40example.test', 'homequote.example')!;
    const parsed = new URL(url);
    expect(parsed.searchParams.get('embed_domain')).toBe('homequote.example');
    expect(parsed.searchParams.get('name')).toBe('Ava Stone');
    expect(parsed.searchParams.get('email')).toBe('ava@example.test');
    expect(calendarFrameUrl('https://example.com/book', 'h')).toBeNull();
    expect(calendarFrameUrl(undefined, 'h')).toBeNull();
  });
  it('tidies a plain phone number and leaves anything else as typed', () => {
    expect(tidyPhone('8185550142')).toBe('(818) 555-0142');
    expect(tidyPhone('1 818 555 0142')).toBe('(818) 555-0142');
    expect(tidyPhone('818555')).toBe('818555');
    expect(tidyPhone('818 555 0142 ext 4')).toBe('818 555 0142 ext 4');
  });
});
