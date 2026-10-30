import { describe, expect, it, vi } from 'vitest';
import { existsSync } from 'node:fs';
import { validateTemplate } from '@/lib/estimator/engine';
import { ESTIMATOR_SLUGS, getEstimator } from '@/lib/estimator/registry';
import { POOL_MASTERS_ESTIMATOR } from '@/content/estimators/pool-masters';
import { generateMetadata as publicMetadata, generateStaticParams } from '@/app/(estimator)/estimator/[slug]/page';
import { generateMetadata as embedMetadata } from '@/app/(estimator-embed)/embed/estimator/[slug]/page';

// The pages read rendersEnabled() from lib/estimator/render.ts, which is server-only.
vi.mock('server-only', () => ({}));

const params = (slug: string) => ({ params: Promise.resolve({ slug }) });

describe('estimator registry', () => {
  it('publishes pool-masters and nothing else', () => {
    expect(ESTIMATOR_SLUGS).toEqual(['pool-masters', 'bathroom-remodel', 'kitchen-remodel', 'roofing']);
    expect(getEstimator('pool-masters')).not.toBeNull();
  });

  it('returns null for unknown slugs, including object-prototype names', () => {
    expect(getEstimator('nope')).toBeNull();
    expect(getEstimator('')).toBeNull();
    expect(getEstimator('constructor')).toBeNull();
    expect(getEstimator('__proto__')).toBeNull();
  });

  it('merges to a template that passes validateTemplate', () => {
    expect(validateTemplate(getEstimator('pool-masters')!.template)).toEqual([]);
  });

  it('carries the contractor settings and pricesConfirmed through', () => {
    const { template, contractor } = getEstimator('pool-masters')!;
    expect(contractor).toBe(POOL_MASTERS_ESTIMATOR);
    expect(contractor).toMatchObject({
      slug: 'pool-masters',
      contractorName: 'Pool Masters LA',
      licenseLabel: 'CSLB #1112793',
      phone: '(818) 643-6888',
      funnelSlug: 'pool-masters',
      revealRange: 'after_contact',
      experience: 'funnel',
      pricesConfirmed: false,
    });
    expect(template.pricesConfirmed).toBe(false);
    expect(contractor.gallery?.length).toBeGreaterThan(0);
  });

  it('applies option photos to the template', () => {
    const { template } = getEstimator('pool-masters')!;
    const baja = template.questions.find((q) => q.id === 'features')?.options.find((o) => o.id === 'baja');
    expect(baja?.image).toBe(POOL_MASTERS_ESTIMATOR.options?.['features.baja']?.image);
  });

  it('has a logo file, a lender disclosure with no payment amounts and no brand product names', () => {
    expect(existsSync(`public${POOL_MASTERS_ESTIMATOR.logoUrl}`)).toBe(true);
    expect(POOL_MASTERS_ESTIMATOR.financingDisclosure).toMatch(/not a lender/i);
    const text = JSON.stringify(getEstimator('pool-masters')!.template) + JSON.stringify(POOL_MASTERS_ESTIMATOR.financingNote);
    expect(text).not.toMatch(/pebbletec|\$\s?\d[\d,]*\s*\/\s*(mo|month)|per month/i);
  });

  it('does not share state between calls', () => {
    const a = getEstimator('pool-masters')!;
    a.template.minimumJob = 1;
    expect(getEstimator('pool-masters')!.template.minimumJob).not.toBe(1);
  });
});

describe('estimator pages', () => {
  it('prerenders every registered slug', () => {
    expect(generateStaticParams()).toEqual([{ slug: 'pool-masters' }, { slug: 'bathroom-remodel' }, { slug: 'kitchen-remodel' }, { slug: 'roofing' }]);
  });

  it('public page is noindex while prices are examples', async () => {
    const meta = await publicMetadata(params('pool-masters'));
    expect(meta.robots).toEqual({ index: false, follow: false });
    expect(meta.title).toEqual({ absolute: 'Pool Remodel Price Estimator · Pool Masters LA' });
    expect(meta.alternates?.canonical).toBe('/estimator/pool-masters');
  });

  it('public page metadata for an unknown slug is noindex', async () => {
    const meta = await publicMetadata(params('nope'));
    expect(meta.robots).toEqual({ index: false, follow: false });
  });

  it('public page lives in its own route group, not the marketing one (no HomeQuote site chrome)', () => {
    expect(existsSync('app/(estimator)/estimator/[slug]/page.tsx')).toBe(true);
    expect(existsSync('app/(marketing)/estimator/[slug]/page.tsx')).toBe(false);
  });

  it('embed page is always noindex', async () => {
    expect((await embedMetadata(params('pool-masters'))).robots).toEqual({ index: false, follow: false });
    expect((await embedMetadata(params('nope'))).robots).toEqual({ index: false, follow: false });
  });
});
