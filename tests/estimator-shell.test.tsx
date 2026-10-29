import { readFileSync, statSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import { HOMEQUOTE_BATHROOM_ESTIMATOR } from '@/content/estimators/homequote-bathroom';
import { EXAMPLE_LABELS, ExampleCompare, HERO_IMAGES } from '@/components/estimator/scene/example-compare';
import { ScenePanel } from '@/components/estimator/scene/scene-panel';
import { EstimatorFooter } from '@/components/estimator/shell/estimator-footer';
import { EstimatorHeader } from '@/components/estimator/shell/estimator-header';
import { EstimatorHero, heroCopy } from '@/components/estimator/shell/estimator-hero';
import { contractorFacts, telHref } from '@/components/estimator/shell/facts';
import { newlyDone, RewardTracker, rewardState, rewardText, type RewardStep } from '@/components/estimator/shell/reward-tracker';
import { StageStepper, stageStates, stageSummary } from '@/components/estimator/shell/stage-stepper';
import { POOL_MASTERS_ESTIMATOR } from '@/content/estimators/pool-masters';
import { POOL_TEMPLATE } from '@/lib/estimator/templates/pool';
import EstimatorPage from '@/app/(estimator)/estimator/[slug]/page';

vi.mock('server-only', () => ({}));

/** Visible-ish text: tags and the inline <style> blocks dropped. */
const text = (html: string) => html.replace(/<style>[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const PHOTO_PROMISE = /realistic photo|photo-?real/i;

describe('facts', () => {
  it('builds tel: links from US numbers and rejects junk', () => {
    expect(telHref('(818) 643-6888')).toBe('tel:+18186436888');
    expect(telHref('1-818-643-6888')).toBe('tel:+18186436888');
    expect(telHref('')).toBeNull();
    expect(telHref(undefined)).toBeNull();
    expect(telHref('call us')).toBeNull();
  });

  it('only shows published facts, and nothing for unknown or prototype slugs', () => {
    expect(contractorFacts('pool-masters')).toEqual(['Licensed & insured', 'Serving SoCal since 2010', 'Free on-site estimate']);
    expect(contractorFacts('nope')).toEqual([]);
    expect(contractorFacts('__proto__')).toEqual([]);
    expect(contractorFacts('constructor')).toEqual([]);
  });
});

describe('EstimatorHeader / EstimatorFooter', () => {
  it('shows the contractor logo, license and a tap-to-call button with a 44px target', () => {
    const html = renderToStaticMarkup(<EstimatorHeader contractor={POOL_MASTERS_ESTIMATOR} facts={contractorFacts('pool-masters')} />);
    expect(html).toContain('href="tel:+18186436888"');
    expect(html).toContain('aria-label="Call Pool Masters LA at (818) 643-6888"');
    expect(html).toContain('alt="Pool Masters LA"');
    expect(html).toContain('CSLB #1112793');
    expect(html).toContain('Licensed &amp; insured');
    expect(html).toMatch(/<a [^>]*class="[^"]*\bh-11\b/);
    // The flow pins its picture under a 64 / 80 px header.
    expect(html).toMatch(/class="[^"]*\bh-16\b[^"]*\bsm:h-20\b/);
  });

  it('drops the call button without a phone and falls back to the name without a logo', () => {
    const html = renderToStaticMarkup(<EstimatorHeader contractor={{ ...POOL_MASTERS_ESTIMATOR, phone: undefined, logoUrl: undefined }} />);
    expect(html).not.toContain('tel:');
    expect(text(html)).toContain('Pool Masters LA');
  });

  it('footer links Privacy and Terms and says Powered by Rendoly in plain text (no third logo)', () => {
    const html = renderToStaticMarkup(<EstimatorFooter contractor={POOL_MASTERS_ESTIMATOR} />);
    expect(html).toContain('href="/privacy"');
    expect(html).toContain('href="/terms"');
    expect(html).not.toContain('/brand/rendoly/rendoly-mark.svg');
    expect(text(html)).toMatch(/Powered by Rendoly/);
    expect(text(html)).toContain(POOL_MASTERS_ESTIMATOR.serviceAreaLabel!);
  });
});

describe('hero and the example photo', () => {
  it('leads with the outcome, and only promises a realistic photo when renders are on', () => {
    expect(heroCopy(true).headline).toMatch(/realistic photo/);
    expect(heroCopy(true).headline).toMatch(/ballpark price/);
    expect(heroCopy(false).headline).toMatch(/ballpark price/);
    expect(Object.values(heroCopy(false)).join(' ')).not.toMatch(PHOTO_PROMISE);
    for (const on of [true, false]) expect(heroCopy(on).subline).toMatch(/2 minutes/);
  });

  it('the hero is words only: no pictures, no price placeholder that could go stale after the result', () => {
    for (const on of [true, false]) {
      const html = renderToStaticMarkup(<EstimatorHero rendersEnabled={on} facts={contractorFacts('pool-masters')} />);
      expect(html).toContain('<h1');
      expect(html).not.toContain('<img');
      expect(html).not.toMatch(/data-reward|Unlocks at the end/);
      expect(text(html)).not.toMatch(/\$\s*\d/);
      expect(text(html)).toContain('Serving SoCal since 2010');
    }
  });

  it('renders on: the builder frame opens on an example design beside its realistic photo, both labelled as an example', () => {
    const html = renderToStaticMarkup(<ScenePanel template={POOL_TEMPLATE} answers={{}} examplePhoto />);
    expect(html).toContain('data-example-compare');
    expect(html).toMatch(/pool-design-photo\.webp/);
    expect(html).toMatch(/pool-design-illustration\.webp/);
    expect(text(html)).toContain(EXAMPLE_LABELS.design);
    expect(text(html)).toContain(EXAMPLE_LABELS.photo);
    expect(EXAMPLE_LABELS.design).toMatch(/example/i);
    // A draggable split that works with a keyboard and screen readers.
    expect(html).toMatch(/<input type="range"[^>]*aria-label="Compare an example design with its realistic photo"/);
    // No day/night switch over a photo.
    expect(html).not.toContain('aria-label="Lighting"');
  });

  it('renders off: no photo anywhere in the frame; once they pick, their own design replaces the example', () => {
    const off = renderToStaticMarkup(<ScenePanel template={POOL_TEMPLATE} answers={{}} />);
    expect(off).not.toContain('data-example-compare');
    expect(off).not.toContain(HERO_IMAGES.photo);
    expect(text(off)).not.toMatch(PHOTO_PROMISE);
    const picked = renderToStaticMarkup(<ScenePanel template={POOL_TEMPLATE} answers={{ shape: ['rectangle'] }} examplePhoto />);
    expect(picked).not.toContain('data-example-compare');
  });

  it('the example sweep stops under prefers-reduced-motion and moves only transform/clip-path/opacity', () => {
    const css = renderToStaticMarkup(<ExampleCompare />);
    expect(css).toContain('@media (prefers-reduced-motion:reduce){.ec-glide .ec-before,.ec-glide .ec-handle{transition:none}.ec-leave{animation:none;opacity:0}}');
    expect(css).not.toMatch(/transition:[^;}]*(width|left|height)/);
  });

  it('hero assets exist as small WebP files without metadata', () => {
    for (const src of Object.values(HERO_IMAGES)) {
      const path = `public${src}`;
      const bytes = readFileSync(path);
      expect(bytes.subarray(0, 4).toString('latin1')).toBe('RIFF');
      expect(bytes.subarray(8, 12).toString('latin1')).toBe('WEBP');
      expect(statSync(path).size).toBeLessThan(180 * 1024);
      const chunks = bytes.toString('latin1');
      expect(chunks).not.toContain('EXIF');
      expect(chunks).not.toContain('XMP ');
    }
  });
});

describe('RewardTracker', () => {
  const steps: RewardStep[] = [
    { id: 'design', label: 'Design', done: true, locked: false },
    { id: 'price', label: 'Price', done: false, locked: true },
    { id: 'photo', label: 'Realistic photo', done: false, locked: true },
  ];

  it('derives done > locked > in progress', () => {
    expect(rewardState({ id: 'a', label: 'A', done: true, locked: true })).toBe('done');
    expect(rewardState({ id: 'a', label: 'A', done: false, locked: true })).toBe('locked');
    expect(rewardState({ id: 'a', label: 'A', done: false })).toBe('active');
    expect(rewardText(steps[1]!)).toBe('Price, locked');
  });

  it('renders an ordered list with the state in text, not colour alone, and a polite live region', () => {
    const html = renderToStaticMarkup(<RewardTracker steps={steps} />);
    expect(html).toContain('<ol aria-label="What you get"');
    expect(html.match(/<li /g)).toHaveLength(3);
    expect(text(html)).toContain('Design, done');
    expect(text(html)).toContain('Realistic photo, locked');
    expect(html).toContain('data-state="done"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('es-tick');
    expect(html).toContain('@media (prefers-reduced-motion:reduce){.es-tick{animation:none}}');
  });

  it('announces only steps that just became done', () => {
    const next = steps.map((s) => (s.id === 'price' ? { ...s, done: true } : s));
    expect(newlyDone(steps, next)).toEqual(['Price']);
    expect(newlyDone(next, next)).toEqual([]);
    expect(newlyDone([], steps)).toEqual(['Design']);
    // A step announced elsewhere (the photo's own status line) is left out: one announcement per event.
    const photo = next.map((s) => (s.id === 'photo' ? { ...s, done: true } : s));
    expect(newlyDone(next, photo, ['photo'])).toEqual([]);
  });
});

describe('StageStepper', () => {
  const stages = [
    { id: 'pool', label: 'Pool' },
    { id: 'finishes', label: 'Finishes' },
    { id: 'features', label: 'Features' },
    { id: 'backyard', label: 'Backyard' },
    { id: 'unlock', label: 'Unlock' },
  ];

  it('marks earlier stages done, the current one current and the rest upcoming', () => {
    expect(stageStates(stages, 'features')).toEqual(['done', 'done', 'current', 'upcoming', 'upcoming']);
    expect(stageStates(stages, 'nope')).toEqual(Array(5).fill('upcoming'));
    expect(stageSummary(stages, 'finishes')).toBe('Finishes, stage 2 of 5');
    expect(stageSummary(stages, undefined)).toBe('');
  });

  it('renders named stages with aria-current and a transform-only fill that respects reduced motion', () => {
    const html = renderToStaticMarkup(<StageStepper stages={stages} current="finishes" />);
    expect(html).toContain('role="group" aria-label="Progress"');
    expect(html.match(/aria-current="step"/g)).toHaveLength(1);
    expect(html).toMatch(/<li[^>]*data-state="current"[^>]*aria-current="step"/);
    expect(text(html)).toContain('Finishes, stage 2 of 5');
    expect(text(html)).toContain('Pool (done)');
    expect(text(html)).not.toMatch(/Step \d/);
    expect(html).toContain('motion-reduce:transition-none');
    expect(html).toContain('transform:scaleX(0)');
    // The current stage fills part-way.
    expect(renderToStaticMarkup(<StageStepper stages={stages} current="finishes" fraction={0.5} />)).toContain('transform:scaleX(0.5)');
    expect(html).not.toMatch(/transition-\[[^\]]*width/);
  });
});

describe('/estimator/[slug] page', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });
  const page = async () => renderToStaticMarkup(await EstimatorPage({ params: Promise.resolve({ slug: 'pool-masters' }) }));

  it('is contractor-branded: own header, hero and footer, no HomeQuote site navigation', async () => {
    delete process.env.KIE_API_KEY;
    const html = await page();
    expect(html).toContain('tel:+18186436888');
    // Pool Masters runs the simple funnel: this page is its landing (tests/estimator-funnel-ui.test.tsx).
    expect(html).toContain('Backyard pools,');
    expect(html).toContain('href="/estimator/pool-masters/design"');
    expect(html).toContain('id="main"');
    expect(text(html)).not.toMatch(/Partner login|Check Availability|How it works/);
  });

  it('promises a realistic photo only when the server can make one (step-by-step builder)', async () => {
    // The bathroom page runs the simple funnel now; its builder (experience 'builder') is still kept working.
    HOMEQUOTE_BATHROOM_ESTIMATOR.experience = 'builder';
    onTestFinished(() => {
      HOMEQUOTE_BATHROOM_ESTIMATOR.experience = 'funnel';
    });
    const bathroom = async () => renderToStaticMarkup(await EstimatorPage({ params: Promise.resolve({ slug: 'bathroom-remodel' }) }));
    delete process.env.KIE_API_KEY;
    const off = await bathroom();
    expect(text(off)).not.toMatch(/realistic photo/i);
    expect(off).not.toContain('data-example-compare');
    process.env.KIE_API_KEY = 'test-key';
    process.env.ESTIMATOR_RENDER_SECRET = 'test-secret';
    const on = await bathroom();
    expect(text(on)).toMatch(/Get a realistic photo/);
    expect(on).toContain('data-example-compare');
  });

  it('never makes the pool configurator wait for a render: the photos are pre-rendered', async () => {
    process.env.KIE_API_KEY = 'test-key';
    process.env.ESTIMATOR_RENDER_SECRET = 'test-secret';
    const html = await page();
    expect(text(html)).not.toMatch(/realistic photo/i);
    expect(html).not.toContain('data-example-compare');
    expect(html).toContain('/estimator/pool-masters/configurator/');
  });
});
