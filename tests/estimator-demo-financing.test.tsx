import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { POOL_MASTERS_FUNNEL } from '@/content/estimators/pool-masters-funnel';
import { POOL_MASTERS_ESTIMATOR } from '@/content/estimators/pool-masters';
import {
  DEMO_FINANCING_KEY,
  demoFinancingFromSearch,
  exampleFinancingDisclosure,
  exampleFinancingLine,
  exampleMonthly,
  monthlyPayment,
  perThousand,
  syncDemoFinancing,
} from '@/lib/estimator/demo-financing';
import { FunnelBookingScreen } from '@/components/estimator/funnel/booking/funnel-booking';
import type { FunnelLeadResult } from '@/components/estimator/funnel/screens';
import type { Estimate, EstimatorTemplate } from '@/lib/estimator/types';

vi.mock('server-only', () => ({}));

/**
 * DEMO-ONLY example financing on the pool funnel's price card
 * (lib/estimator/demo-financing.ts): the payment math, the ?demo=financing
 * flag kept for the tab, and that nothing changes without it.
 */
const TERMS = POOL_MASTERS_FUNNEL.bookingStep.exampleFinancing!;

describe('example payment math (8.99% APR, 180 months)', () => {
  it('uses the contractor content terms', () => {
    expect(TERMS).toMatchObject({ apr: 8.99, months: 180, label: 'or from {monthly}/mo*' });
  });

  it('$64,000 -> $649/mo (standard amortization, rounded up to whole dollars); $1,000 -> $10.14', () => {
    expect(monthlyPayment(64_000, 8.99, 180)).toBeCloseTo(648.74, 1);
    expect(exampleMonthly(64_000, TERMS)).toBe(649);
    expect(perThousand(TERMS)).toBe(10.14);
    expect(monthlyPayment(1000, 8.99, 180)).toBeCloseTo(10.137, 3);
    // Rounds up, never down; an exact dollar stays put; 0% is principal / months.
    expect(exampleMonthly(65_000, TERMS)).toBe(Math.ceil(monthlyPayment(65_000, 8.99, 180)));
    expect(exampleMonthly(1800, { apr: 0, months: 180 })).toBe(10);
    expect(monthlyPayment(0, 8.99, 180)).toBe(0);
  });

  it('formats the line and the fine print', () => {
    expect(exampleFinancingLine(64_000, TERMS)).toBe('or from $649/mo*');
    expect(exampleFinancingLine(null, TERMS)).toBeNull();
    expect(exampleFinancingLine(0, TERMS)).toBeNull();
    expect(exampleFinancingDisclosure(TERMS)).toBe(
      '*Example only: 8.99% APR for 180 months, $10.14/mo per $1,000 financed, with approved credit. Not an offer of credit; actual terms from Pool Masters’ lending partners may differ.',
    );
  });
});

describe('the ?demo=financing flag', () => {
  const store = () => {
    const m = new Map<string, string>();
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m };
  };

  it('reads the query string', () => {
    expect(demoFinancingFromSearch('?demo=financing')).toBe(true);
    expect(demoFinancingFromSearch('?step=book&demo=financing&fbclid=x')).toBe(true);
    expect(demoFinancingFromSearch('?demo=off')).toBe(false);
    expect(demoFinancingFromSearch('?demo=other')).toBeNull();
    expect(demoFinancingFromSearch('?step=book')).toBeNull();
    expect(demoFinancingFromSearch('')).toBeNull();
  });

  it('is remembered for the tab (landing -> /design -> contact -> booking) and cleared with ?demo=off', () => {
    const s = store();
    expect(syncDemoFinancing('?step=book', s)).toBe(false);
    expect(syncDemoFinancing('?demo=financing', s)).toBe(true); // landing page
    expect(s.m.get(DEMO_FINANCING_KEY)).toBe('1');
    expect(syncDemoFinancing('', s)).toBe(true); // /design (the link drops the query)
    expect(syncDemoFinancing('?step=contact&size=classic', s)).toBe(true);
    expect(syncDemoFinancing('?step=book&size=classic', s)).toBe(true);
    expect(syncDemoFinancing('?demo=off', s)).toBe(false);
    expect(syncDemoFinancing('?step=book', s)).toBe(false);
  });

  it('never throws when storage is blocked', () => {
    const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); }, removeItem: () => { throw new Error('blocked'); } };
    expect(syncDemoFinancing('?demo=financing', broken)).toBe(true);
    expect(syncDemoFinancing('', broken)).toBe(false);
    expect(syncDemoFinancing('', null)).toBe(false);
  });
});

describe('the price card', () => {
  const estimate = { low: 64_000, high: 106_500 } as Estimate;
  const result: FunnelLeadResult = { estimate, qualified: true, bookingTicket: 'hqb1.e.t', contact: { firstName: 'Jordan', lastName: 'Rivera', email: 'j@x.test' } };
  const render = (demo: boolean) => renderToStaticMarkup(
    <FunnelBookingScreen slug="pool-masters" spec={POOL_MASTERS_FUNNEL} contractor={POOL_MASTERS_ESTIMATOR} template={{} as EstimatorTemplate}
      selection={{ size: 'classic', finish: 'luxe', extras: 'spa' }} result={result} embedded={false} headingId="h" initialDemoFinancing={demo} />,
  );

  it('without the flag nothing changes: "Financing available", no payment', () => {
    const h = render(false);
    expect(h).toContain('Financing available');
    expect(h).not.toMatch(/\/mo\b|Demo</);
    expect(h).not.toContain('data-funnel-demo-financing');
  });

  it('with the flag: "or from $649/mo*" from the LOW end, a Demo pill and the example fine print behind "See details"', () => {
    const h = render(true);
    expect(h).toContain('data-funnel-demo-financing=""');
    expect(h.replace(/<[^>]+>/g, '')).toContain('or from $649/mo*');
    expect(h).toContain('>Demo<');
    expect(h).toContain('See details');
    expect(h).toMatch(/hidden=""[^>]*>.*\*Example only: 8\.99% APR for 180 months, \$10\.14\/mo per \$1,000 financed/);
    expect(h).toContain('Not an offer of credit');
    // The lender's own disclosure is still there.
    expect(h).toContain('Pool Masters LA is not a lender');
    expect(h).not.toContain('Financing available');
  });

  it('a card without a range shows no payment even with the flag', () => {
    const h = renderToStaticMarkup(
      <FunnelBookingScreen slug="pool-masters" spec={POOL_MASTERS_FUNNEL} contractor={POOL_MASTERS_ESTIMATOR} template={{} as EstimatorTemplate}
        selection={{}} result={{ ...result, estimate: { low: null, high: null } as unknown as Estimate }} embedded={false} headingId="h" initialDemoFinancing />,
    );
    expect(h).not.toMatch(/\/mo\b/);
  });
});
