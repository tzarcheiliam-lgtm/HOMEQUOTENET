import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import { flowStages, unlockCopy } from '@/components/estimator/builder-progress';
import { previewAnswers } from '@/components/estimator/builder';
import { getTradeBuilder, resolveExampleMedia, TRADE_META, tradeMeta } from '@/components/estimator/builders';
import { BATH_BUILDER } from '@/components/estimator/builders/bath';
import { bathResultHeading } from '@/components/estimator/builders/bath-words';
import { POOL_BUILDER, poolResultHeading } from '@/components/estimator/builders/pool';
import { EstimatorFlow } from '@/components/estimator/estimator-flow';
import { ExampleVideo } from '@/components/estimator/scene/example-compare';
import { builderFor, ScenePanel } from '@/components/estimator/scene/scene-panel';
import { contractorFacts } from '@/components/estimator/shell/facts';
import { EstimatorHeader } from '@/components/estimator/shell/estimator-header';
import { heroCopy } from '@/components/estimator/shell/estimator-hero';
import { flowScreens, type FlowState } from '@/components/estimator/use-estimator-flow';
import type { LeadSuccess } from '@/components/estimator/screens/result-screen';
import { publicTemplate } from '@/lib/estimator/config';
import { applyPackage, computeEstimate } from '@/lib/estimator/engine';
import { estimatorConsentText } from '@/lib/estimator/lead-client';
import { getEstimator } from '@/lib/estimator/registry';
import { EXAMPLE_BATH_SCENE } from '@/lib/estimator/scene/bath/scene';
import { POOL_TEMPLATE } from '@/lib/estimator/templates/pool';
import type { Answers } from '@/lib/estimator/types';
import EstimatorPage from '@/app/(estimator)/estimator/[slug]/page';

vi.mock('server-only', () => ({}));

const PHOTO_PROMISE = /realistic photo|photo-?real/i;

/** Visible text: no <style>, no tags. */
const text = (html: string) => html.replace(/<style>[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

const bath = getEstimator('bathroom-remodel')!;
/** What the browser gets: prices stripped before the contact step. */
const BT = publicTemplate(bath.template, bath.contractor);
const BC = bath.contractor;
const BASE: Answers = { project: ['full'], size: ['medium'] };
const SIGNATURE = applyPackage(BT, BASE, 'signature');
const CUSTOM: Answers = { ...applyPackage(BT, BASE, 'custom'), scope: ['bathing', 'vanity', 'floor', 'walls', 'extras'], bathing: ['walk_in'] };
const READY: Partial<FlowState> = { zip: '91301', homeowner: 'yes', timeline: 'asap' };

const flow = (screenId: string | undefined, rendersEnabled: boolean, answers: Answers = SIGNATURE) =>
  renderToStaticMarkup(<EstimatorFlow template={BT} contractor={BC} rendersEnabled={rendersEnabled} seed={{ screenId, answers, state: READY }} />);

describe('trade adapter selection', () => {
  it('picks the adapter per trade and nothing for unknown or prototype names', () => {
    expect(getTradeBuilder('pool')).toBe(POOL_BUILDER);
    expect(getTradeBuilder('bathroom')).toBe(BATH_BUILDER);
    for (const t of ['kitchen', '', '__proto__', 'constructor', 'toString']) expect(getTradeBuilder(t)).toBeNull();
    expect(tradeMeta('bathroom')).toBe(TRADE_META.bathroom);
    expect(tradeMeta('__proto__')).toBeNull();
  });

  it('the scene panel follows template.trade, with the pool as the fallback', () => {
    expect(builderFor(POOL_TEMPLATE)).toBe(POOL_BUILDER);
    expect(builderFor(BT)).toBe(BATH_BUILDER);
  });

  it('each adapter has two lighting modes and the server data it shares with the page', () => {
    expect(POOL_BUILDER.modes.map((m) => m.label)).toEqual(['Day', 'Night']);
    expect(BATH_BUILDER.modes.map((m) => m.label)).toEqual(['Daylight', 'Evening']);
    expect(POOL_BUILDER.hero).toBe(TRADE_META.pool.hero);
    expect(BATH_BUILDER.hero).toBe(TRADE_META.bathroom.hero);
    expect(BATH_BUILDER.exampleVideo).toBe(TRADE_META.bathroom.exampleVideo);
  });
});

describe('example media', () => {
  const bathMeta = TRADE_META.bathroom;

  it('prefers the design/photo pair, then the clip, then nothing, and only uses files that exist', () => {
    expect(resolveExampleMedia(bathMeta)?.kind).toBe('compare');
    const onlyVideo = (p: string) => !p.includes('bath-example');
    const video = resolveExampleMedia(bathMeta, onlyVideo);
    expect(video).toMatchObject({ kind: 'video', poster: '/estimator/hero/bath-hero.webp', mp4: '/estimator/hero/bath-hero.mp4' });
    const posterOnly = resolveExampleMedia(bathMeta, (p) => p.endsWith('.webp') && !p.includes('bath-example'));
    expect(posterOnly).toMatchObject({ kind: 'video', mp4: undefined, webm: undefined });
    expect(resolveExampleMedia(bathMeta, () => false)).toBeNull();
    // The pool keeps its pair.
    expect(resolveExampleMedia(TRADE_META.pool)).toMatchObject({ kind: 'compare', photo: '/estimator/hero/pool-design-photo.webp' });
  });

  it('the clip is muted, looping and inline, never autoplays (reduced motion keeps the poster) and is labelled AI-rendered', () => {
    const html = renderToStaticMarkup(
      <ExampleVideo video={{ mp4: '/estimator/hero/bath-hero.mp4', webm: '/estimator/hero/bath-hero.webm', poster: '/estimator/hero/bath-hero.webp', alt: 'AI clip' }} />,
    );
    expect(html).toMatch(/<video[^>]*muted/);
    expect(html).toMatch(/<video[^>]*loop/);
    expect(html).toMatch(/<video[^>]*playsInline|<video[^>]*playsinline/i);
    expect(html).not.toMatch(/autoplay/i);
    expect(html).toContain('poster="/estimator/hero/bath-hero.webp"');
    expect(text(html)).toMatch(/AI-rendered example/);
  });

  it('bathroom frame with renders on opens on the clip when the pair is missing; renders off shows the example picture only', () => {
    const clip = resolveExampleMedia(bathMeta, (p) => !p.includes('bath-example'));
    const on = renderToStaticMarkup(<ScenePanel template={BT} answers={{}} examplePhoto example={clip} />);
    expect(on).toContain('data-example-video');
    expect(on).not.toContain('aria-label="Lighting"');
    const off = renderToStaticMarkup(<ScenePanel template={BT} answers={{}} />);
    expect(off).not.toContain('data-example-video');
    expect(off).not.toContain('data-example-compare');
    expect(off).toContain('data-bath-scene');
    expect(text(off)).not.toMatch(PHOTO_PROMISE);
    expect(text(off)).toMatch(/Example — your picks will change it/);
    // Their own design replaces the example as soon as they pick.
    expect(renderToStaticMarkup(<ScenePanel template={BT} answers={{ project: ['full'] }} examplePhoto example={clip} />)).not.toContain('data-example-video');
  });
});

describe('hero copy per trade', () => {
  it('bathroom: promises the photo only with renders on, and says nothing a network cannot', () => {
    const { withRenders, withoutRenders } = TRADE_META.bathroom.hero;
    expect(withRenders.headline).toBe('Design your new bathroom. Get a realistic photo and a ballpark price.');
    expect(withoutRenders.headline).toBe('Design your bathroom and get a ballpark price');
    expect(Object.values(withoutRenders).join(' ')).not.toMatch(PHOTO_PROMISE);
    for (const copy of [withRenders, withoutRenders]) expect(copy.subline).toMatch(/2 minutes/);
  });

  it('pool hero copy is unchanged', () => {
    expect(TRADE_META.pool.hero.withRenders).toEqual(heroCopy(true));
    expect(TRADE_META.pool.hero.withoutRenders).toEqual(heroCopy(false));
    expect(heroCopy(true).headline).toBe('Design your pool. Get a realistic photo and a ballpark price.');
  });
});

describe('bathroom flow', () => {
  it('every screen renders the live bathroom picture with Daylight / Evening and the Bathroom stage', () => {
    for (const answers of [SIGNATURE, CUSTOM]) {
      const screens = flowScreens(BT, answers, { customize: answers === CUSTOM, hasGallery: false });
      for (const s of screens) {
        const html = flow(s.id, false, answers);
        expect(html, s.id).toContain('data-estimator="bathroom"');
        expect(html, s.id).toContain('data-bath-scene');
        expect(html, s.id).not.toContain('ps-root');
        expect(text(html), s.id).not.toMatch(/\bpool\b/i);
        // Ranges only after the contact step: no dollar figure anywhere before it.
        expect(text(html), s.id).not.toMatch(/\$\s*\d/);
        if (s.kind === 'questions' || s.kind === 'looks') {
          expect(text(html), s.id).toContain('Daylight');
          expect(text(html), s.id).toContain('Evening');
          expect(text(html), s.id).toContain('Bathroom');
        }
      }
    }
  });

  it('stages and unlock words name the bathroom', () => {
    const screens = flowScreens(BT, CUSTOM, { customize: true, hasGallery: false });
    expect(flowStages(screens, BATH_BUILDER.copy.stageLabel).stages.map((s) => s.label)).toEqual(['Bathroom', 'Style', 'Details', 'Unlock']);
    expect(unlockCopy(true, 'bathroom').promise).toMatch(/realistic photo of your bathroom/);
    expect(Object.values(unlockCopy(false, 'bathroom')).join(' ')).not.toMatch(PHOTO_PROMISE);
    const contact = text(flow('contact', true));
    expect(contact).toContain('One last step to unlock your photo and price');
    expect(contact).toMatch(/realistic photo of your bathroom/);
    // The consent wording comes from the shared helper, naming the funnel's client.
    expect(contact).toContain(text(estimatorConsentText('HomeQuote Network')).trim());
  });

  it('material options show samples of the textures the picture paints, and fixture finishes show metal chips', () => {
    const html = flow('showerTile', false, CUSTOM);
    expect(html).toMatch(/data-material="tile_(subway|zellige|marble|large_porcelain)"/);
    const metal = flow('metal', false, { ...CUSTOM, showerTile: ['subway'], vanity: ['single'], vanityFinish: ['white'], counter: ['quartz_white'], floor: ['lvp'], paint: ['sage'] });
    expect(metal).toContain('data-bath-metal="matte_black"');
  });

  it('previews hover picks on the bathroom questions', () => {
    const q = BT.questions.find((x) => x.id === 'showerTile')!;
    expect(previewAnswers(BT, CUSTOM, q, 'marble', BATH_BUILDER.isVisual)).toMatchObject({ showerTile: ['marble'] });
    // The pool rule alone would not preview a bathroom finish.
    expect(previewAnswers(BT, CUSTOM, q, 'marble')).toBeNull();
  });

  it('the result names their bathroom and the next step without claiming to be the contractor', () => {
    const answers: Answers = { ...SIGNATURE, plumbing: ['no'], damage: ['no'], location: ['no'] };
    const result: LeadSuccess = { ok: true, estimate: computeEstimate(bath.template, { answers }), qualified: true };
    const html = renderToStaticMarkup(
      <EstimatorFlow template={BT} contractor={BC} rendersEnabled={false} seed={{ answers, result, state: { ...READY, contact: { firstName: 'Sam', lastName: 'Lee', email: 's@example.com', phone: '5555550100', consent: true, website: '', note: '' } } }} />,
    );
    const visible = text(html);
    expect(visible).toMatch(/Sam, here’s your (walk-in shower|spa-style|new|refreshed) bathroom/);
    expect(visible).toContain('Ballpark, not a quote');
    // The network acts first (as the funnel's thank-you page says), then the licensed contractor.
    expect(visible).toContain('A HomeQuote Network project specialist will call you shortly to talk through your design and next steps, including a free in-home consultation with a licensed local bathroom contractor.');
    expect(visible).not.toMatch(/contractor will (reach out|confirm|price)/);
    expect(visible).not.toMatch(/\bwe (build|install)\b|years in business|on-site visit/i);
    expect(visible).not.toMatch(PHOTO_PROMISE);
  });

  it('result headings follow the design', () => {
    expect(bathResultHeading('Sam', { ...EXAMPLE_BATH_SCENE, bathing: 'walk_in' })).toBe('Sam, here’s your walk-in shower bathroom');
    expect(bathResultHeading(' ', { ...EXAMPLE_BATH_SCENE, bathing: 'tub_and_shower' })).toBe('Here’s your spa-style bathroom');
    expect(bathResultHeading('Sam', { ...EXAMPLE_BATH_SCENE, bathing: 'existing', project: 'refresh' })).toBe('Sam, here’s your refreshed bathroom');
    expect(poolResultHeading('Sam', [{ label: 'Pool', value: 'Freeform, about 30 × 15 ft' }])).toBe('Sam, here’s your freeform pool');
  });
});

describe('network shell', () => {
  it('truthful network facts, and a Start link instead of a phone', () => {
    expect(contractorFacts(BC)).toEqual(['Free in-home consultation', 'No obligation', 'Free to use']);
    expect(contractorFacts({ slug: 'x', facts: ['A'] })).toEqual(['A']);
    const html = renderToStaticMarkup(<EstimatorHeader contractor={BC} facts={contractorFacts(BC)} startHref="#design" />);
    expect(html).not.toContain('tel:');
    expect(html).toContain('href="#design"');
    expect(text(html)).toContain('Start my design');
    expect(html).toContain('alt="HomeQuote Network"');
  });

  describe('/estimator/bathroom-remodel page', () => {
    const saved = { ...process.env };
    afterEach(() => {
      process.env = { ...saved };
    });
    const page = async () => renderToStaticMarkup(await EstimatorPage({ params: Promise.resolve({ slug: 'bathroom-remodel' }) }));

    it('renders the bathroom builder with network copy, and promises the photo only with renders on', async () => {
      // The page runs the simple funnel now (tests/estimator-bath-funnel.test.tsx); the builder is kept working behind experience 'builder'.
      BC.experience = 'builder';
      onTestFinished(() => {
        BC.experience = 'funnel';
      });
      delete process.env.KIE_API_KEY;
      const off = await page();
      expect(off).toContain('data-estimator="bathroom"');
      expect(text(off)).toContain('Design your bathroom and get a ballpark price');
      expect(text(off)).not.toMatch(PHOTO_PROMISE);
      expect(off).toContain('id="design"');
      expect(text(off)).toContain('No obligation');
      expect(text(off)).not.toMatch(/CSLB|since \d{4}/);
      process.env.KIE_API_KEY = 'test-key';
      process.env.ESTIMATOR_RENDER_SECRET = 'test-secret';
      const on = await page();
      expect(text(on)).toContain('Design your new bathroom. Get a realistic photo and a ballpark price.');
      // An example opens the frame (the pair when made, else the clip).
      expect(on).toMatch(/data-example-(compare|video)/);
    });
  });
});
