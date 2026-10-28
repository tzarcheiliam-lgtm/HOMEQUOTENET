import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { flowStages, rewardSteps, stageFraction, unlockCopy } from '@/components/estimator/builder-progress';
import {
  formatElapsed,
  RENDER_MESSAGES,
  runRenderSession,
  sharePlan,
  shouldAutoRender,
  type RenderDeps,
  type RenderPhase,
} from '@/components/estimator/builder-render';
import { EstimatorFlow } from '@/components/estimator/estimator-flow';
import { UnlockPreview } from '@/components/estimator/screens/unlock-preview';
import { countUpRange, roundLine, type LeadSuccess } from '@/components/estimator/screens/result-screen';
import { COUNT_DELAY_MS, COUNT_MS, PHOTO_PANEL_DELAY_MS } from '@/components/estimator/screens/reveal-styles';
import { flowScreens, type FlowState } from '@/components/estimator/use-estimator-flow';
import { applyPackage, computeEstimate } from '@/lib/estimator/engine';
import { estimatorConsentText } from '@/lib/estimator/lead-client';
import type { RenderStart, RenderStatus } from '@/lib/estimator/render-client';
import { POOL_TEMPLATE } from '@/lib/estimator/templates/pool';
import type { Answers } from '@/lib/estimator/types';
import { FIXTURE_CONTRACTOR } from './fixtures/estimator-template';

const T = POOL_TEMPLATE;
const BASE: Answers = { project: ['backyard'], shape: ['rectangle'], size: ['medium'] };
const PACKAGE_PATH = applyPackage(T, BASE, 'signature');
const CUSTOM_PATH: Answers = { ...applyPackage(T, BASE, 'custom'), scope: ['surface', 'tile_coping', 'deck', 'features', 'equipment'] };
const READY_STATE: Partial<FlowState> = { zip: '91301', homeowner: 'yes', timeline: 'asap' };

const flow = (screenId: string | undefined, rendersEnabled: boolean, answers: Answers = PACKAGE_PATH, state: Partial<FlowState> = READY_STATE) =>
  renderToStaticMarkup(
    <EstimatorFlow template={T} contractor={FIXTURE_CONTRACTOR} rendersEnabled={rendersEnabled} seed={{ screenId, answers, state }} />,
  );

/** Visible text of some markup: no <style>, no SVG drawing (its coordinates are digits), no tags. */
const textOf = (html: string) =>
  html
    .replace(/<style>[\s\S]*?<\/style>/g, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/g, ' ')
    .replace(/<[^>]+>/g, ' ');

describe('named stages', () => {
  const labels = (answers: Answers, customize = false, hasGallery = false) =>
    flowStages(flowScreens(T, answers, { customize, hasGallery })).stages.map((s) => s.label);

  it('names the package path Pool, Style, Details, Unlock', () => {
    expect(labels(PACKAGE_PATH)).toEqual(['Pool', 'Style', 'Details', 'Unlock']);
  });

  it('keeps the same four stages when they build their own (finishes and features fill Style)', () => {
    expect(labels(CUSTOM_PATH)).toEqual(['Pool', 'Style', 'Details', 'Unlock']);
    expect(labels(CUSTOM_PATH, true, true)).toEqual(labels(PACKAGE_PATH, false, true));
  });

  it('fills the current stage part-way, screen by screen', () => {
    const screens = flowScreens(T, CUSTOM_PATH, { customize: false, hasGallery: true });
    const { stageOf } = flowStages(screens);
    const style = screens.filter((s) => stageOf[s.id] === 'style');
    expect(style.length).toBeGreaterThan(1);
    const parts = style.map((s) => stageFraction(screens, stageOf, s.id));
    for (let i = 1; i < parts.length; i++) expect(parts[i]).toBeGreaterThan(parts[i - 1]!);
    expect(parts[parts.length - 1]).toBe(1);
    expect(stageFraction(screens, stageOf, 'nope')).toBe(0);
  });

  it('marks Unlock as the prize stage', () => {
    const { stages } = flowStages(flowScreens(T, PACKAGE_PATH, { customize: false, hasGallery: false }));
    expect(stages.filter((s) => s.prize).map((s) => s.id)).toEqual(['unlock']);
  });

  it('keeps the looks gallery inside the stage before it, and maps every screen to a stage', () => {
    const screens = flowScreens(T, PACKAGE_PATH, { customize: false, hasGallery: true });
    const { stages, stageOf } = flowStages(screens);
    expect(stages.map((s) => s.id)).toEqual(['pool', 'style', 'details', 'unlock']);
    expect(stageOf.looks).toBe('details');
    expect(stageOf.zip).toBe('unlock');
    expect(stageOf.contact).toBe('unlock');
    for (const screen of screens) expect(stageOf[screen.id], screen.id).toBeDefined();
  });

  it('only moves forward: stage order never repeats', () => {
    const { stages } = flowStages(flowScreens(T, CUSTOM_PATH, { customize: false, hasGallery: true }));
    expect(new Set(stages.map((s) => s.id)).size).toBe(stages.length);
  });
});

describe('rewards', () => {
  const view = (steps: ReturnType<typeof rewardSteps>) => steps.map((s) => `${s.label}:${s.done ? 'done' : s.locked ? 'locked' : 'active'}`);

  it('locks Price (and the photo when renders are on) until the result', () => {
    expect(view(rewardSteps('design', false))).toEqual(['Design:active', 'Price:locked']);
    expect(view(rewardSteps('design', true))).toEqual(['Design:active', 'Price:locked', 'Realistic photo:locked']);
    expect(view(rewardSteps('unlock', true))).toEqual(['Design:done', 'Price:locked', 'Realistic photo:locked']);
  });

  it('on the result: Price is done and the photo follows the render, dropping out quietly if it does not come', () => {
    expect(view(rewardSteps('result', true, 'pending'))).toEqual(['Design:done', 'Price:done', 'Realistic photo:active']);
    expect(view(rewardSteps('result', true, 'done'))).toEqual(['Design:done', 'Price:done', 'Realistic photo:done']);
    expect(view(rewardSteps('result', true, 'none'))).toEqual(['Design:done', 'Price:done']);
  });
});

describe('unlock step copy', () => {
  it('promises the design and ballpark price, and the realistic photo only when renders are on', () => {
    const off = unlockCopy(false);
    expect(off.zipTitle).toBe('Unlock your price');
    expect(off.submit).toBe('Unlock my price');
    expect(off.promise).toContain('ballpark price');
    // The design is already theirs: never described as something to unlock.
    for (const copy of [off, unlockCopy(true)]) expect(copy.promise).not.toMatch(/unlock[^.]*design|and design/i);
    expect(Object.values(off).join(' ')).not.toMatch(/photo/i);

    const on = unlockCopy(true);
    expect(on.zipTitle).toBe('Unlock your realistic photo and price');
    expect(on.submit).toBe('Unlock my photo and price');
    expect(on.promise).toContain('realistic photo');
    expect(on.promise).toContain('about a minute');
  });

  it('never promises to send anything (nothing texts or emails the photo)', () => {
    for (const copy of [unlockCopy(false), unlockCopy(true)]) {
      expect(Object.values(copy).join(' ')).not.toMatch(/\b(send|sent|text|email|inbox)\b/i);
    }
  });

  it('shows the unlock headings, the locked preview and the button on the ZIP and contact screens (renders off)', () => {
    const zip = flow('zip', false);
    expect(zip).toContain('Unlock your price');
    expect(zip).toContain('data-unlock-preview');
    expect(zip).toContain('Ballpark price<span class="sr-only">, unlocks when you finish</span>');
    expect(zip).toContain('Your design<span class="sr-only">, ready</span>');
    expect(zip).toContain('Design, done');
    // The little picture of their design is shown as it is (no blur, no padlock over it) and holds still.
    expect(zip).not.toMatch(/data-unlock-preview[\s\S]*blur\(5px\)/);
    expect(zip).toMatch(/data-unlock-preview[\s\S]*data-paused=""/);
    // One progress indicator at a time: the rewards here, not the stage bar as well.
    expect(zip).not.toContain('aria-label="Your progress"');
    const contact = flow('contact', false);
    expect(contact).toContain('One last step to unlock your price');
    expect(contact).toMatch(/<button type="submit"[^>]*>Unlock my price<\/button>/);
    for (const html of [zip, contact]) expect(textOf(html)).not.toMatch(/photo/i);
  });

  it('adds the realistic photo to the headings, the preview and the button when renders are on', () => {
    const zip = flow('zip', true);
    expect(zip).toContain('Unlock your realistic photo and price');
    expect(zip).toContain('Ready about a minute after you unlock');
    expect(textOf(zip)).toContain('Realistic photo');
    const contact = flow('contact', true);
    expect(contact).toContain('One last step to unlock your photo and price');
    expect(contact).toMatch(/<button type="submit"[^>]*>Unlock my photo and price<\/button>/);
  });

  it('keeps the consent wording, its links, the measurement checkbox and the honeypot exactly as they were', () => {
    for (const rendersEnabled of [false, true]) {
      const html = flow('contact', rendersEnabled);
      expect(html).toContain(estimatorConsentText(FIXTURE_CONTRACTOR.contractorName));
      expect(html).toMatch(/href="\/privacy"/);
      expect(html).toMatch(/href="\/terms"/);
      expect(html).toContain('Allow optional advertising measurement');
      expect(html).toMatch(/<div hidden="" inert=""[^>]*><label>[^<]*<input[^>]*tabindex="-1"[^>]*name="contact_url_2"/);
    }
  });
});

describe('no price before the result', () => {
  it('the locked preview is placeholders only: no digits and no dollar sign', () => {
    for (const rendersEnabled of [false, true]) {
      const html = renderToStaticMarkup(
        <UnlockPreview template={T} answers={PACKAGE_PATH} rendersEnabled={rendersEnabled} promise={unlockCopy(rendersEnabled).promise} />,
      );
      expect(textOf(html)).not.toMatch(/[\d$]/);
    }
  });

  it('no screen before the result prints a price, with renders on or off', () => {
    for (const answers of [PACKAGE_PATH, CUSTOM_PATH]) {
      const screens = flowScreens(T, answers, { customize: false, hasGallery: false });
      for (const screen of screens) {
        for (const rendersEnabled of [false, true]) {
          const html = flow(screen.id, rendersEnabled, answers);
          expect(html, `${screen.id} renders=${rendersEnabled}`).not.toContain('$');
          expect(html).toMatch(/Price, locked|Unlock<\/span>/);
        }
      }
    }
  });

  it('the page up to and including the contact step never carries the estimate figures, in any form', () => {
    // Known template and answers: the figures the server will compute are known here, so look for them
    // (bare, with thousands separators, or as a "$" amount) in the markup the browser would get.
    let checked = 0;
    for (const answers of [PACKAGE_PATH, CUSTOM_PATH]) {
      const full: Answers = { ...answers, cracks: ['no'], access: ['no'], hillside: ['no'] };
      const { low, high, lines } = computeEstimate(T, { answers: full });
      const figures = [low, high, ...lines.flatMap((l) => [l.low, l.high])].filter((n): n is number => typeof n === 'number' && n >= 1000);
      checked += figures.length;
      for (const screenId of ['zip', 'contact']) {
        for (const rendersEnabled of [false, true]) {
          // Strip the SVG drawing first: its path coordinates are digits that can collide by chance.
          const html = flow(screenId, rendersEnabled, full).replace(/<svg[\s\S]*?<\/svg>/g, '');
          expect(html).not.toMatch(/\$\s*\d/);
          for (const n of figures) {
            for (const form of [String(Math.round(n)), Math.round(n).toLocaleString('en-US')]) {
              expect(html, `${screenId} renders=${rendersEnabled} has ${form}`).not.toMatch(new RegExp(`(?<![\\d.,])${form}(?![\\d])`));
            }
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(0);
  });
});

describe('the reveal', () => {
  const answers: Answers = { ...PACKAGE_PATH, cracks: ['no'], access: ['no'], hillside: ['no'] };
  const result: LeadSuccess = { ok: true, estimate: computeEstimate(T, { answers }), qualified: true, calendarUrl: 'https://example.com/book' };
  const resultView = (r: LeadSuccess, rendersEnabled: boolean) =>
    renderToStaticMarkup(<EstimatorFlow template={T} contractor={FIXTURE_CONTRACTOR} rendersEnabled={rendersEnabled} seed={{ answers, result: r }} />);

  it('with a render token the photo is on its way at once, but its progress waits for the price to land', () => {
    const html = resultView({ ...result, renderToken: 'tok' }, true);
    // One moment at a time: the price counts up first; the developing chip appears PHOTO_PANEL_DELAY_MS later.
    expect(html).not.toContain('data-developing=""');
    expect(PHOTO_PANEL_DELAY_MS).toBeGreaterThanOrEqual(COUNT_DELAY_MS + COUNT_MS);
    expect(html).toContain('Realistic photo, in progress');
    expect(html).toContain('Price, done');
    // The booking button is still the primary action, right after the range.
    expect(html.indexOf('Book your free on-site consultation')).toBeLessThan(html.indexOf('Not included'));
  });

  it('without a render token nothing develops and the photo is not mentioned in the tracker', () => {
    const html = resultView(result, true);
    expect(html).not.toContain('data-developing');
    expect(html).not.toContain('Realistic photo, ');
    expect(html).toContain('Price, done');
  });

  it('keeps the moment on the total: the breakdown is collapsed, with each line rounded to $100', () => {
    const html = resultView(result, false);
    expect(html).toMatch(/<details[^>]*>\s*<summary[^>]*>See what’s included \(\d+ items?\)/);
    expect(roundLine(16_030, 21_755)).toEqual([16_000, 21_800]);
    expect(roundLine(1_200, 1_200)).toEqual([1_200, 1_200]);
  });

  it('counts the price up in $500 steps from below, ending exactly on the server figures', () => {
    const [low0, high0] = countUpRange(85_000, 167_500, 0);
    expect(low0 % 500).toBe(0);
    expect(high0 % 500).toBe(0);
    expect(low0).toBeLessThan(85_000);
    expect(countUpRange(85_000, 167_500, 1)).toEqual([85_000, 167_500]);
    let last = 0;
    for (let t = 0; t <= 1; t += 0.05) {
      const [, high] = countUpRange(85_000, 167_500, t);
      expect(high).toBeGreaterThanOrEqual(last);
      last = high;
    }
  });
});

/* ------------------------------------------------------------------ */
/* Render session                                                      */
/* ------------------------------------------------------------------ */

function fakeDeps(over: Partial<RenderDeps> & { statuses?: Array<RenderStatus | Error> } = {}) {
  let clock = 0;
  const calls = { capture: 0, start: [] as string[], check: 0, preload: [] as string[] };
  const statuses = [...(over.statuses ?? [{ status: 'running' } as RenderStatus, { status: 'done', imageUrl: 'https://img/x.jpg' } as RenderStatus])];
  const deps: RenderDeps = {
    capture: async () => {
      calls.capture++;
      return 'data:image/png;base64,AAA';
    },
    start: async (png) => {
      calls.start.push(png);
      return { ok: true, taskId: 'task-1' } as RenderStart;
    },
    check: async () => {
      calls.check++;
      const next = statuses.shift() ?? { status: 'running' };
      if (next instanceof Error) throw next;
      return next;
    },
    preload: async (url) => {
      calls.preload.push(url);
    },
    sleep: async (ms) => {
      clock += ms;
    },
    now: () => clock,
    cancelled: () => false,
    ...over,
  };
  return { deps, calls };
}

async function run(deps: RenderDeps, opts?: { pollMs?: number; timeoutMs?: number }) {
  const phases: RenderPhase[] = [];
  const last = await runRenderSession(deps, (p) => phases.push(p), { pollMs: 1000, timeoutMs: 10_000, ...opts });
  return { phases, kinds: phases.map((p) => p.kind), last };
}

describe('realistic photo session', () => {
  it('captures the design, starts the render, polls and reveals the preloaded photo', async () => {
    const { deps, calls } = fakeDeps();
    const { kinds, last } = await run(deps);
    expect(kinds).toEqual(['preparing', 'running', 'done']);
    expect(calls.start).toEqual(['data:image/png;base64,AAA']);
    expect(calls.check).toBe(2);
    expect(calls.preload).toEqual(['https://img/x.jpg']);
    expect(last).toEqual({ kind: 'done', before: 'data:image/png;base64,AAA', imageUrl: 'https://img/x.jpg' });
  });

  it('turns off quietly when renders are disabled or used up (no polling)', async () => {
    for (const reason of ['disabled', 'limit', 'invalid'] as const) {
      const { deps, calls } = fakeDeps({ start: async () => ({ ok: false, reason, message: '' }) });
      const { kinds } = await run(deps);
      expect(kinds).toEqual(['preparing', 'off']);
      expect(calls.check).toBe(0);
    }
  });

  it('fails (retryable) when the start errors, throws or the capture fails', async () => {
    const errored = await run(fakeDeps({ start: async () => ({ ok: false, reason: 'error', message: 'x' }) }).deps);
    expect(errored.kinds).toEqual(['preparing', 'failed']);
    const thrown = await run(fakeDeps({ start: async () => Promise.reject(new Error('offline')) }).deps);
    expect(thrown.kinds).toEqual(['preparing', 'failed']);
    const { deps, calls } = fakeDeps({ capture: async () => Promise.reject(new Error('no svg')) });
    const captured = await run(deps);
    expect(captured.last).toEqual({ kind: 'failed', message: RENDER_MESSAGES.capture });
    expect(calls.start).toEqual([]);
  });

  it('retries a dropped status check, and fails when the render fails or the image will not load', async () => {
    const dropped = await run(fakeDeps({ statuses: [new Error('blip'), { status: 'done', imageUrl: 'u' }] }).deps);
    expect(dropped.last.kind).toBe('done');
    const failed = await run(fakeDeps({ statuses: [{ status: 'failed', message: 'nope' }] }).deps);
    expect(failed.last).toEqual({ kind: 'failed', message: RENDER_MESSAGES.finish });
    const unloadable = await run(fakeDeps({ preload: async () => Promise.reject(new Error('404')) }).deps);
    expect(unloadable.last).toEqual({ kind: 'failed', message: RENDER_MESSAGES.load });
  });

  it('gives up after the timeout', async () => {
    const { deps } = fakeDeps({ statuses: [] });
    const { last } = await run(deps, { pollMs: 1000, timeoutMs: 3500 });
    expect(last).toEqual({ kind: 'failed', message: RENDER_MESSAGES.slow });
  });

  it('stops quietly once nobody is waiting (no more calls or phases)', async () => {
    let gone = false;
    const { deps, calls } = fakeDeps({
      start: async () => {
        gone = true;
        return { ok: true, taskId: 't' };
      },
      cancelled: () => gone,
    });
    const { kinds, last } = await run(deps);
    expect(kinds).toEqual(['preparing']);
    expect(calls.check).toBe(0);
    expect(last.kind).toBe('idle');
  });

  it('starts by itself once per render token', () => {
    expect(shouldAutoRender('tok', new Set())).toBe(true);
    expect(shouldAutoRender('tok', new Set(['tok']))).toBe(false);
    expect(shouldAutoRender(undefined, new Set())).toBe(false);
  });
});

describe('developing clock and share', () => {
  it('formats the elapsed time as m:ss', () => {
    expect(formatElapsed(0)).toBe('0:00');
    expect(formatElapsed(7_400)).toBe('0:07');
    expect(formatElapsed(72_000)).toBe('1:12');
    expect(formatElapsed(Number.NaN)).toBe('0:00');
  });

  it('shares the picture itself when it can, else a link to the photo, else copies it, else hides Share', () => {
    const env = (canShareFiles: boolean, canShare: boolean, canCopy: boolean) => ({ canShareFiles, canShare, canCopy });
    expect(sharePlan(env(true, true, true), false)).toBe('files');
    expect(sharePlan(env(false, true, true), true)).toBe('link');
    expect(sharePlan(env(false, false, true), true)).toBe('copy');
    // No photo and no share sheet: "Save my design" already does the job.
    expect(sharePlan(env(false, true, true), false)).toBeNull();
    expect(sharePlan(env(false, false, false), true)).toBeNull();
  });
});
