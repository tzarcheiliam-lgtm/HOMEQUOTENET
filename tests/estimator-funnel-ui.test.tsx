import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { Funnel } from '@/components/estimator/funnel/funnel';
import { FunnelLanding, headlineLines } from '@/components/estimator/funnel/landing';
import { missingFunnelPhotos } from '@/components/estimator/funnel/photo-files';
import {
  clampScreen,
  initialFromSearch,
  nextScreen,
  parseScreen,
  photoSrcSet,
  prevScreen,
  progress,
  readStored,
  resolvePhoto,
  resultFor,
  screenParam,
  screenUrl,
  stepCount,
  stepCta,
  stepLabel,
  storageKey,
  writeStored,
  type FunnelScreen,
} from '@/components/estimator/funnel/state';
import { HOMEQUOTE_BATHROOM_ESTIMATOR } from '@/content/estimators/homequote-bathroom';
import { POOL_MASTERS_FUNNEL as SPEC } from '@/content/estimators/pool-masters-funnel';
import { publicTemplate } from '@/lib/estimator/config';
import { allFunnelSelections, defaultFunnelSelection, stepOptionPhotos } from '@/lib/estimator/funnel/engine';
import { getEstimator } from '@/lib/estimator/registry';
import EstimatorPage from '@/app/(estimator)/estimator/[slug]/page';
import FunnelDesignPage, { generateStaticParams as designParams } from '@/app/(estimator)/estimator/[slug]/design/page';
import EstimatorEmbedPage from '@/app/(estimator-embed)/embed/estimator/[slug]/page';

vi.mock('server-only', () => ({}));
// redirect() throws in Next; record it instead.
vi.mock('next/navigation', async (orig) => ({
  ...(await orig<typeof import('next/navigation')>()),
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
}));

const found = getEstimator('pool-masters')!;
const contractor = found.contractor;
const T = publicTemplate(found.template, contractor);
const base = defaultFunnelSelection(SPEC);
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

const render = (screen: FunnelScreen, selection = base, embedded = false) =>
  renderToStaticMarkup(
    <Funnel slug="pool-masters" spec={SPEC} contractor={contractor} template={T} initialScreen={screen} initialSelection={selection} embedded={embedded} />,
  );

describe('funnel screens and URL', () => {
  it('reads ?step= (1..n, contact, book) and falls back to step 1', () => {
    expect(parseScreen(SPEC, '1')).toEqual({ kind: 'step', index: 0 });
    expect(parseScreen(SPEC, '3')).toEqual({ kind: 'step', index: 2 });
    expect(parseScreen(SPEC, 'contact')).toEqual({ kind: 'contact' });
    expect(parseScreen(SPEC, 'book')).toEqual({ kind: 'book' });
    for (const junk of [null, undefined, '', '0', '4', '1.5', 'x']) expect(parseScreen(SPEC, junk)).toEqual({ kind: 'step', index: 0 });
  });

  it('walks size -> finish -> extras -> contact -> book and back', () => {
    const order: FunnelScreen[] = [{ kind: 'step', index: 0 }];
    while (order.at(-1)!.kind !== 'book') order.push(nextScreen(SPEC, order.at(-1)!));
    expect(order.map(screenParam)).toEqual(['1', '2', '3', 'contact', 'book']);
    expect(prevScreen(SPEC, { kind: 'step', index: 0 })).toBeNull();
    expect(screenParam(prevScreen(SPEC, { kind: 'contact' })!)).toBe('3');
  });

  it('labels "Step n of 3" and fills the bar in quarters, the contact step full', () => {
    expect(stepCount(SPEC)).toBe(3);
    expect(stepLabel(SPEC, { kind: 'step', index: 1 })).toBe('Step 2 of 3');
    expect(stepLabel(SPEC, { kind: 'contact' })).toBe(SPEC.contactStep.eyebrow);
    expect(stepLabel(SPEC, { kind: 'book' })).toBeNull();
    expect([0, 1, 2].map((index) => progress(SPEC, { kind: 'step', index }))).toEqual([0.25, 0.5, 0.75]);
    expect(progress(SPEC, { kind: 'contact' })).toBe(1);
    expect([0, 1, 2].map((i) => stepCta(SPEC, i))).toEqual(['Continue', 'Continue', 'Get my estimate']);
  });

  it('puts the screen and every pick in the URL and keeps UTMs, dropping stale picks', () => {
    const sel = { size: 'estate', finish: 'luxe', extras: 'backyard' };
    const url = screenUrl(SPEC, '/estimator/pool-masters/design', { kind: 'step', index: 1 }, sel, '?utm_source=fb&size=compact&step=3&fbclid=x');
    expect(url).toBe('/estimator/pool-masters/design?step=2&size=estate&finish=luxe&extras=backyard&spa=raised&kitchen=full&fire=bowls&cabana=lounge&utm_source=fb&fbclid=x');
    const back = initialFromSearch(SPEC, Object.fromEntries(new URLSearchParams(url.split('?')[1])));
    expect(back).toEqual({ screen: { kind: 'step', index: 1 }, selection: { ...sel, spa: 'raised', kitchen: 'full', fire: 'bowls', cabana: 'lounge' }, fromUrl: true });
    // A follow-up param left over from another path is dropped.
    expect(screenUrl(SPEC, '/d', { kind: 'step', index: 2 }, { size: 'classic', finish: 'standard', extras: 'pool' }, '?spa=flush&kitchen=chef')).toBe(
      '/d?step=3&size=classic&finish=standard&extras=pool',
    );
    expect(initialFromSearch(SPEC, {})).toEqual({ screen: { kind: 'step', index: 0 }, selection: base, fromUrl: false });
    expect(initialFromSearch(SPEC, { step: ['contact', '1'], size: 'nope' }).screen).toEqual({ kind: 'contact' });
  });

  it('keeps picks and the lead result in sessionStorage, and never throws on bad or blocked storage', () => {
    const mem = new Map<string, string>();
    const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) };
    const result = { estimate: { low: 1, high: 2 } as never, qualified: true, contact: { firstName: 'A', lastName: 'B', email: 'a@b.co' } };
    writeStored('pool-masters', { v: 1, selection: { size: 'compact', finish: 'luxe', extras: 'spa', spa: 'flush' }, result }, storage);
    expect(readStored(SPEC, 'pool-masters', storage)).toEqual({ v: 1, selection: { size: 'compact', finish: 'luxe', extras: 'spa', spa: 'flush' }, result });
    mem.set(storageKey('pool-masters'), JSON.stringify({ v: 1, selection: { size: 'huge' } }));
    expect(readStored(SPEC, 'pool-masters', storage)).toEqual({ v: 1, selection: base, result: undefined });
    mem.set(storageKey('pool-masters'), '{oops');
    expect(readStored(SPEC, 'pool-masters', storage)).toBeNull();
    const blocked = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(readStored(SPEC, 'pool-masters', blocked)).toBeNull();
    expect(() => writeStored('pool-masters', { v: 1, selection: base }, blocked)).not.toThrow();
  });

  it('a lead result only opens the booking step for the picks it was priced for', () => {
    const sel = { size: 'classic', finish: 'luxe', extras: 'spa' };
    const result = { estimate: { low: 1, high: 2 } as never, qualified: true, contact: { firstName: 'A', lastName: 'B', email: 'a@b.co' }, selection: sel };
    expect(resultFor(SPEC, result, { ...sel })).toBe(result);
    expect(resultFor(SPEC, result, { ...sel, extras: 'backyard' })).toBeNull();
    // A different follow-up pick is a different design too.
    expect(resultFor(SPEC, { ...result, selection: { ...sel, spa: 'raised' } }, { ...sel, spa: 'raised' })).not.toBeNull();
    expect(resultFor(SPEC, { ...result, selection: { ...sel, spa: 'raised' } }, { ...sel, spa: 'flush' })).toBeNull();
    // Saved before results carried their picks: stale.
    expect(resultFor(SPEC, { ...result, selection: undefined }, sel)).toBeNull();
    expect(resultFor(SPEC, null, sel)).toBeNull();
  });
});

describe('funnel follow-up steps (spa, kitchen, fire, cabana)', () => {
  const spa = { size: 'classic', finish: 'luxe', extras: 'spa', spa: 'zero_edge' };
  const full = { size: 'estate', finish: 'standard', extras: 'backyard', spa: 'flush', kitchen: 'chef', fire: 'fireplace', cabana: 'pergola' };

  it('counts only the steps on the path: 3 for just the pool, 4 with a spa, 7 for the full backyard', () => {
    expect(stepCount(SPEC, base)).toBe(3);
    expect(stepCount(SPEC, spa)).toBe(4);
    expect(stepCount(SPEC, full)).toBe(7);
    expect(stepLabel(SPEC, { kind: 'step', index: 3 }, spa)).toBe('Step 4 of 4');
    expect(stepLabel(SPEC, { kind: 'step', index: 6 }, full)).toBe('Step 7 of 7');
    expect(progress(SPEC, { kind: 'step', index: 3 }, spa)).toBe(0.8);
    expect([0, 1, 2, 3].map((i) => stepCta(SPEC, i, spa))).toEqual(['Continue', 'Continue', 'Continue', 'Get my estimate']);
    expect([0, 1, 2, 3, 4, 5, 6].map((i) => stepCta(SPEC, i, full)).at(-1)).toBe('Get my estimate');
    expect([0, 1, 2, 3, 4, 5].every((i) => stepCta(SPEC, i, full) === 'Continue')).toBe(true);
  });

  it('walks the full backyard path forward and back, the contact step after step 7', () => {
    const order: FunnelScreen[] = [{ kind: 'step', index: 0 }];
    while (order.at(-1)!.kind !== 'book') order.push(nextScreen(SPEC, order.at(-1)!, full));
    expect(order.map(screenParam)).toEqual(['1', '2', '3', '4', '5', '6', '7', 'contact', 'book']);
    expect(screenParam(prevScreen(SPEC, { kind: 'contact' }, full)!)).toBe('7');
    expect(screenParam(prevScreen(SPEC, { kind: 'contact' }, spa)!)).toBe('4');
    expect(screenParam(prevScreen(SPEC, { kind: 'contact' }, base)!)).toBe('3');
  });

  it('reads ?step=4..7 only when the picks show that many steps, and clamps a screen past the end', () => {
    expect(parseScreen(SPEC, '7', full)).toEqual({ kind: 'step', index: 6 });
    expect(parseScreen(SPEC, '4', spa)).toEqual({ kind: 'step', index: 3 });
    expect(parseScreen(SPEC, '5', spa)).toEqual({ kind: 'step', index: 0 });
    expect(parseScreen(SPEC, '4', base)).toEqual({ kind: 'step', index: 0 });
    expect(clampScreen(SPEC, { kind: 'step', index: 6 }, spa)).toEqual({ kind: 'step', index: 3 });
    expect(clampScreen(SPEC, { kind: 'contact' }, spa)).toEqual({ kind: 'contact' });
    // A refresh on step 6 of the full backyard comes back to step 6 with every pick.
    const url = screenUrl(SPEC, '/estimator/pool-masters/design', { kind: 'step', index: 5 }, full);
    expect(initialFromSearch(SPEC, Object.fromEntries(new URLSearchParams(url.split('?')[1])))).toEqual({ screen: { kind: 'step', index: 5 }, selection: full, fromUrl: true });
  });

  it('renders each follow-up as one question, three cards, its own photos and the right button', () => {
    const cases = [
      { sel: spa, index: 3, title: 'Choose your spa.', label: 'Step 4 of 4', options: ['Flush spa', 'Raised spa', 'Zero-edge spa'], cta: 'Get my estimate' },
      { sel: full, index: 4, title: 'Choose your outdoor kitchen.', label: 'Step 5 of 7', options: ['Grill island', 'Full kitchen', 'Chef’s kitchen'], cta: 'Continue' },
      { sel: full, index: 5, title: 'Choose your fire feature.', label: 'Step 6 of 7', options: ['Fire pit', 'Outdoor fireplace', 'Fire bowls'], cta: 'Continue' },
      { sel: full, index: 6, title: 'Choose your cabana.', label: 'Step 7 of 7', options: ['Pergola', 'Cabana', 'Covered lounge'], cta: 'Get my estimate' },
    ];
    for (const c of cases) {
      const html = render({ kind: 'step', index: c.index }, c.sel);
      const t = text(html).replace(/&#x27;/g, '’').replace(/'/g, '’');
      expect(t).toContain(c.label);
      expect(t).toContain(c.title);
      for (const o of c.options) expect(t).toContain(o);
      expect(html.match(/type="radio"/g)).toHaveLength(3);
      expect(html.match(/class="fn-layer /g)).toHaveLength(3);
      expect(html).toContain(`>${c.cta}</button>`);
    }
    expect(render({ kind: 'step', index: 3 }, spa)).toMatch(/<input[^>]*checked=""[^>]*value="zero_edge"/);
    expect(render({ kind: 'step', index: 3 }, spa)).toContain('/estimator/pool-masters/funnel/spa-zero-edge');
  });
});

describe('funnel photos', () => {
  it('every photo any screen can show is on disk, or has a fallback that is', () => {
    const exists = (src: string) => existsSync(join(process.cwd(), 'public', src));
    for (const sel of allFunnelSelections(SPEC)) {
      for (const step of SPEC.steps) {
        for (const p of Object.values(stepOptionPhotos(SPEC, step.id, sel))) {
          expect(exists(p.src) || (p.fallback !== undefined && exists(p.fallback.src)), `${step.id} ${p.src}`).toBe(true);
        }
      }
    }
    expect(exists(SPEC.landing.heroPhoto.src)).toBe(true);
    if (SPEC.landing.heroPhoto.srcSm) expect(exists(SPEC.landing.heroPhoto.srcSm)).toBe(true);
  });

  it('a file the server finds missing shows its fallback straight away', () => {
    const photo = { src: '/x/plan.webp', srcSm: '/x/plan-sm.webp', alt: 'Plan', fallback: { src: '/x/aerial.webp', alt: 'Aerial' } };
    expect(resolvePhoto(photo, new Set(['/x/plan.webp']))).toEqual({ src: '/x/aerial.webp', alt: 'Aerial', isFallback: true });
    expect(resolvePhoto(photo, new Set(['/x/plan-sm.webp']))).toMatchObject({ src: '/x/plan.webp', srcSm: undefined, isFallback: false });
    expect(photoSrcSet({ src: '/a.webp', srcSm: '/a-sm.webp' })).toBe('/a-sm.webp 1200w, /a.webp 1800w');
    expect(photoSrcSet({ src: '/p.webp', srcSm: '/p-sm.webp', widths: { sm: 800, full: 1200 } })).toBe('/p-sm.webp 800w, /p.webp 1200w');
    expect(photoSrcSet({ src: '/a.webp' })).toBeUndefined();
    expect(missingFunnelPhotos(SPEC, join(process.cwd(), 'no-such-dir'))).toEqual([]);
    // A function bundle with some of public/ (a logo) but not the photo folders: nothing is "missing".
    expect(missingFunnelPhotos(SPEC, process.cwd())).toEqual([]);
  });
});

describe('funnel step markup', () => {
  it('step 1: one question, the photo on top, the options as radios, one button, no prices and no form fields', () => {
    const html = render({ kind: 'step', index: 0 });
    const t = text(html);
    expect(t).toContain('Step 1 of 3');
    expect(html).toContain(`>${SPEC.steps[0].label}</h1>`);
    expect(html.match(/type="radio"/g)).toHaveLength(SPEC.steps[0].options.length);
    for (const o of SPEC.steps[0].options) expect(t).toContain(o.title);
    expect(html).toMatch(/<input[^>]*checked=""[^>]*value="classic"/);
    expect(html).toContain('aria-valuenow="25"');
    expect(html).toContain('>Continue</button>');
    // No back arrow on the first question; no price or contact field before the contact step.
    expect(html).not.toContain('aria-label="Back"');
    expect(t).not.toMatch(/\$\s?\d/);
    expect(html).not.toMatch(/type="(email|tel)"/);
    // Every option's photo is in the card up front, so a tap swaps instantly; only the picked one is announced.
    const layers = html.match(/<img[^>]*fn-layer[^>]*>/g)!;
    expect(layers).toHaveLength(SPEC.steps[0].options.length);
    expect(layers.filter((l) => !l.includes('aria-hidden'))).toHaveLength(1);
    expect(layers.some((l) => l.includes('size-classic') && l.includes('fetchPriority="high"'))).toBe(true);
    // The site's own chrome only: logo home link and the footer.
    expect(html).toContain('href="/estimator/pool-masters"');
    expect(html).toContain('href="/privacy"');
  });

  it('step 3 shows the picked finish in its photos, a back arrow and "Get my estimate" when it is the last step', () => {
    const last = render({ kind: 'step', index: 2 }, { size: 'classic', finish: 'luxe', extras: 'pool' });
    expect(text(last)).toContain('Step 3 of 3');
    expect(last).toContain('>Get my estimate</button>');
    const html = render({ kind: 'step', index: 2 }, { size: 'classic', finish: 'luxe', extras: 'spa', spa: 'raised' });
    expect(text(html)).toContain('Step 3 of 4');
    expect(html).toContain('>Continue</button>');
    expect(html).toContain('aria-label="Back"');
    expect(html).toContain('aerial-porcelain-pebble-spa');
    // Nothing over the photos: the example-design note is one quiet line in the footer.
    expect(html).not.toContain('Example design');
    expect(html).not.toMatch(/AI-assisted<\/span>/);
    expect(html.match(/AI-assisted/g)).toHaveLength(1);
    expect(html.slice(html.indexOf('<footer'))).toContain(SPEC.photoNote!);
    expect(html).toMatch(/<input[^>]*checked=""[^>]*value="spa"/);
  });

  it('the embed has no logo bar or footer and starts on step 1', () => {
    const html = render({ kind: 'step', index: 0 }, base, true);
    expect(html).not.toContain('<footer');
    expect(html).not.toContain('<main');
    expect(text(html)).toContain('Step 1 of 3');
    // The note sits once under the column, never on the photo.
    expect(html.match(/AI-assisted/g)).toHaveLength(1);
    expect(html).not.toContain('Example design');
  });

  it('?step=book without a sent lead renders a placeholder, never someone else\'s price', () => {
    const html = render({ kind: 'book' });
    expect(html).toContain('aria-busy="true"');
    expect(text(html)).not.toMatch(/\$\s?\d/);
  });
});

describe('funnel landing', () => {
  it('splits the headline after the comma for the phone break', () => {
    expect(headlineLines('Backyard pools, remodeled just for you')).toEqual(['Backyard pools,', 'remodeled just for you']);
    expect(headlineLines('Pools')).toEqual(['Pools']);
  });

  it('announcement, header card, headline, one line, one button, the hero with its phone copy, then real projects', () => {
    const html = renderToStaticMarkup(<FunnelLanding spec={SPEC} contractor={contractor} designHref="/estimator/pool-masters/design" />);
    const t = text(html);
    expect(t).toContain(SPEC.landing.announcement.replace('&', '&amp;'));
    expect(html).toContain('aria-label="Dismiss announcement"');
    expect(t).toContain('Backyard pools,');
    expect(t).toContain(SPEC.landing.subline.replace(/-/g, '\u2011'));
    expect(html.match(/href="\/estimator\/pool-masters\/design"/g)!.length).toBeGreaterThanOrEqual(2);
    expect(html).toContain(`srcSet="${SPEC.landing.heroPhoto.srcSm} 1200w, ${SPEC.landing.heroPhoto.src} 1800w"`);
    expect(html).toContain('tel:+18186436888');
    expect(html).toContain('id="projects"');
    for (const p of SPEC.landing.projects ?? []) expect(html).toContain(p.src);
    expect(t).toContain(contractor.licenseLabel);
    expect(t).not.toMatch(/\$\s?\d|★|reviews?/i);
    // No badge on the hero: one quiet footer line only.
    expect(html).not.toContain('Example design');
    expect(html.match(/AI-assisted/g)).toHaveLength(1);
    expect(html.slice(html.indexOf('<footer'))).toContain(SPEC.photoNote!);
  });
});

describe('funnel pages', () => {
  it('/estimator/pool-masters is the landing; /design and the embed render the steps from the URL', async () => {
    const landing = renderToStaticMarkup(await EstimatorPage({ params: Promise.resolve({ slug: 'pool-masters' }) }));
    expect(landing).toContain('Backyard pools,');
    expect(landing).not.toContain('type="radio"');

    const design = renderToStaticMarkup(
      await FunnelDesignPage({ params: Promise.resolve({ slug: 'pool-masters' }), searchParams: Promise.resolve({ step: '2', size: 'estate', finish: 'luxe' }) }),
    );
    expect(text(design)).toContain('Step 2 of 3');
    expect(design).toMatch(/<input[^>]*checked=""[^>]*value="luxe"/);

    const embed = renderToStaticMarkup(await EstimatorEmbedPage({ params: Promise.resolve({ slug: 'pool-masters' }), searchParams: Promise.resolve({}) }));
    expect(text(embed)).toContain('Step 1 of 3');
  });

  it('only funnel contractors get /design; others are sent to their main page', async () => {
    expect(designParams()).toEqual([{ slug: 'pool-masters' }, { slug: 'bathroom-remodel' }, { slug: 'kitchen-remodel' }, { slug: 'adu' }]);
    // The bathroom page set back to the builder: no /design.
    HOMEQUOTE_BATHROOM_ESTIMATOR.experience = 'builder';
    try {
      expect(designParams()).toEqual([{ slug: 'pool-masters' }, { slug: 'kitchen-remodel' }, { slug: 'adu' }]);
      await expect(FunnelDesignPage({ params: Promise.resolve({ slug: 'bathroom-remodel' }), searchParams: Promise.resolve({}) })).rejects.toThrow(
        'REDIRECT /estimator/bathroom-remodel',
      );
    } finally {
      HOMEQUOTE_BATHROOM_ESTIMATOR.experience = 'funnel';
    }
  });
});
