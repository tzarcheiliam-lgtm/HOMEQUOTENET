import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  chipText,
  designSummary,
  isVisualQuestion,
  optionLabeler,
  optionPhrase,
  previewAnswers,
  renderProgress,
  renderStage,
  renderStartProblem,
  RENDER_TYPICAL_MS,
  sceneChanges,
  sceneDescription,
  scrollDelta,
} from '@/components/estimator/builder';
import { EstimatorFlow } from '@/components/estimator/estimator-flow';
import { ScenePanel, SCENE_CAPTION } from '@/components/estimator/scene/scene-panel';
import { DesignList, RenderProgress, ResultScene } from '@/components/estimator/screens/design-result';
import type { LeadSuccess } from '@/components/estimator/screens/result-screen';
import { applyPackage, computeEstimate } from '@/lib/estimator/engine';
import { buildScene } from '@/lib/estimator/scene/scene';
import type { SceneSpec } from '@/lib/estimator/scene/types';
import { POOL_TEMPLATE } from '@/lib/estimator/templates/pool';
import type { Answers, EstimatorQuestion } from '@/lib/estimator/types';
import { FIXTURE_CONTRACTOR } from './fixtures/estimator-template';

const T = POOL_TEMPLATE;
const q = (id: string): EstimatorQuestion => T.questions.find((x) => x.id === id)!;
const label = optionLabeler(T);
const BASE: Answers = { project: ['remodel'], shape: ['rectangle'], size: ['medium'] };
const scene = (answers: Answers) => buildScene(T, { answers });
const withPackage = (id: string, base: Answers = BASE) => applyPackage(T, base, id);

/** A scene with everything off, to diff against. */
const PLAIN: SceneSpec = scene(BASE);

describe('hover / focus preview', () => {
  it('only previews questions that change the picture', () => {
    for (const id of ['shape', 'size', 'package', 'surface', 'tile', 'coping', 'deck', 'deckSize', 'features', 'extras']) {
      expect(isVisualQuestion(q(id)), id).toBe(true);
    }
    for (const id of ['project', 'scope', 'equipment', 'cracks', 'access', 'hillside']) {
      expect(isVisualQuestion(q(id)), id).toBe(false);
    }
  });

  it('a single question previews the hovered option without touching the real answers', () => {
    const answers = { ...BASE };
    const next = previewAnswers(T, answers, q('shape'), 'freeform');
    expect(next?.shape).toEqual(['freeform']);
    expect(answers.shape).toEqual(['rectangle']);
    expect(scene(next!).shape).toBe('freeform');
  });

  it('shows nothing new for the picked option, an unknown option or a non-visual question', () => {
    expect(previewAnswers(T, BASE, q('shape'), 'rectangle')).toBeNull();
    expect(previewAnswers(T, BASE, q('shape'), 'hexagon')).toBeNull();
    expect(previewAnswers(T, BASE, q('cracks'), 'yes')).toBeNull();
  });

  it('a multi option previews being added, and an already-included one shows nothing new', () => {
    const answers = { ...withPackage('custom'), scope: ['features'], features: ['spa'] };
    const next = previewAnswers(T, answers, q('features'), 'baja');
    expect(next?.features).toEqual(['spa', 'baja']);
    expect(scene(next!).features).toMatchObject({ spa: true, baja: true });
    expect(previewAnswers(T, answers, q('features'), 'spa')).toBeNull();
  });

  it('a package card previews the whole package look', () => {
    const next = previewAnswers(T, BASE, q('package'), 'transformation');
    const s = scene(next!);
    expect(s).toMatchObject({ surface: 'pebble', tile: 'glass', coping: 'travertine', deck: 'pavers', deckSize: 'medium' });
    expect(s.features).toMatchObject({ baja: true, waterBowls: true, fireBowls: true, lights: true, spa: false });
    expect(previewAnswers(T, withPackage('signature'), q('package'), 'signature')).toBeNull();
  });

  it('names the preview in plain words', () => {
    expect(optionPhrase('coping', 'travertine', label)).toBe('Travertine coping');
    expect(optionPhrase('tile', 'stone', label)).toBe('Natural stone waterline tile');
    expect(optionPhrase('deck', 'pavers', label)).toBe('Paver deck');
    expect(optionPhrase('shape', 'l_shape', label)).toBe('L-shaped pool');
    expect(optionPhrase('size', 'large', label)).toBe('Large pool');
    expect(optionPhrase('package', 'signature', label)).toBe('Signature package');
    expect(optionPhrase('features', 'baja', label)).toBe('Baja shelf');
  });
});

describe('change chips', () => {
  it('says nothing when nothing visible changed', () => {
    expect(sceneChanges(PLAIN, { ...PLAIN })).toEqual([]);
    expect(chipText([])).toBe('');
  });

  it('announces added and removed features and extras with the template labels', () => {
    const withBaja = { ...PLAIN, features: { ...PLAIN.features, baja: true } };
    expect(sceneChanges(PLAIN, withBaja, label)).toEqual(['Baja shelf added']);
    expect(sceneChanges(withBaja, PLAIN, label)).toEqual(['Baja shelf removed']);
    const withKitchen = { ...PLAIN, extras: { ...PLAIN.extras, kitchen: true } };
    expect(sceneChanges(PLAIN, withKitchen, label)).toEqual(['Outdoor kitchen added']);
  });

  it('names a new material, but not one that goes back to "not decided"', () => {
    const travertine = { ...PLAIN, coping: 'travertine' };
    expect(sceneChanges(PLAIN, travertine, label)).toEqual(['Travertine coping']);
    expect(sceneChanges(travertine, PLAIN, label)).toEqual([]);
    expect(sceneChanges(PLAIN, { ...PLAIN, surface: 'pebble' }, label)).toEqual(['Pebble finish']);
  });

  it('works without a template (fallback names) and for shape, size and deck size', () => {
    expect(sceneChanges(PLAIN, { ...PLAIN, features: { ...PLAIN.features, spa: true } })).toEqual(['Spa added']);
    expect(sceneChanges(PLAIN, { ...PLAIN, shape: 'freeform' })).toEqual(['Freeform pool']);
    expect(sceneChanges(PLAIN, { ...PLAIN, lengthFt: 36, widthFt: 18 })).toEqual(['36 × 18 ft pool']);
    const deck = { ...PLAIN, deck: 'pavers', deckSize: 'medium' as const };
    // A new deck says the material; a later size change says the size.
    expect(sceneChanges(PLAIN, deck, label)).toEqual(['Paver deck']);
    expect(sceneChanges(deck, { ...deck, deckSize: 'large' }, label)).toEqual(['Large deck area']);
  });

  it('puts additions first and shortens a package pick to two items plus a count', () => {
    const messages = sceneChanges(PLAIN, scene(withPackage('signature')), label);
    expect(messages[0]).toBe('LED pool lights added');
    expect(messages).toEqual(['LED pool lights added', 'Pebble finish', 'Glass waterline tile', 'Travertine coping']);
    expect(chipText(messages)).toBe('LED pool lights added · Pebble finish +2 more');
    expect(chipText(['Spa added'])).toBe('Spa added');
  });
});

describe('design summary and description', () => {
  const full = scene({ ...withPackage('transformation', { ...BASE, project: ['backyard'], shape: ['freeform'], size: ['large'] }), extras: ['kitchen', 'fire_pit'] });

  it('lists the visible choices in plain words', () => {
    expect(designSummary(full, label)).toEqual([
      { label: 'Pool', value: 'Freeform, about 36 × 18 ft' },
      { label: 'Pool surface', value: 'Pebble' },
      { label: 'Waterline tile', value: 'Glass' },
      { label: 'Coping', value: 'Travertine' },
      { label: 'Deck', value: 'Pavers, medium' },
      { label: 'Features', value: 'Baja shelf, Water bowls, Fire bowls, LED pool lights' },
      { label: 'Backyard', value: 'Outdoor kitchen, Fire pit' },
    ]);
  });

  it('leaves out undecided materials and lists just the pool when nothing is picked yet', () => {
    expect(designSummary(PLAIN, label)).toEqual([{ label: 'Pool', value: 'Rectangle, about 30 × 15 ft' }]);
  });

  it('describes the picture for screen readers', () => {
    expect(sceneDescription(PLAIN, label)).toBe('Top-down illustration of a 30 × 15 ft rectangular pool.');
    const text = sceneDescription(full, label);
    expect(text).toContain('36 × 18 ft freeform pool with a pebble finish, glass waterline tile, travertine coping and a paver deck.');
    expect(text).toContain('Features: baja shelf, water bowls, fire bowls and LED pool lights.');
    expect(text).toContain('Backyard: outdoor kitchen and fire pit.');
  });
});

describe('photoreal render progress', () => {
  it('moves quickly at first, keeps moving, and never claims to be done', () => {
    const steps = [0, 5_000, 20_000, RENDER_TYPICAL_MS, 60_000, 120_000, 600_000].map(renderProgress);
    for (let i = 1; i < steps.length; i++) expect(steps[i]).toBeGreaterThanOrEqual(steps[i - 1]);
    expect(steps[0]).toBeGreaterThan(0);
    expect(steps[2]).toBeGreaterThan(40);
    expect(Math.max(...steps)).toBeLessThanOrEqual(95);
  });

  it('tells a little story while it works', () => {
    expect(renderStage(0)).toBe('Reading your design');
    expect(renderStage(15_000)).toBe('Filling the pool with water');
    expect(renderStage(100_000)).toBe('Taking a little longer than usual');
  });

  it('hides the button for good when renders are off or used up, and offers a retry otherwise', () => {
    expect(renderStartProblem({ ok: false, reason: 'disabled', message: '' }).retry).toBe(false);
    expect(renderStartProblem({ ok: false, reason: 'limit', message: '' }).retry).toBe(false);
    expect(renderStartProblem({ ok: false, reason: 'error', message: '' }).retry).toBe(true);
    expect(renderStartProblem({ ok: false, reason: 'invalid', message: '' }).retry).toBe(true);
  });
});

describe('scrolling under the pinned picture', () => {
  it('leaves a screen alone when its top is already comfortably in view', () => {
    expect(scrollDelta(400, 800, 380)).toBeNull();
  });
  it('scrolls a screen hidden under the picture (or above the screen) down to just below it', () => {
    expect(scrollDelta(120, 800, 380)).toBe(-260);
    expect(scrollDelta(-900, 800, 96)).toBe(-996);
  });
  it('scrolls up a screen that starts low on the page', () => {
    expect(scrollDelta(700, 800, 96)).toBe(604);
  });
});

/* ------------------------------------------------------------------ */
/* Rendering                                                           */
/* ------------------------------------------------------------------ */

describe('scene panel', () => {
  it('draws the scene with a keyboard-friendly Day/Night switch, the caption and a polite live region', () => {
    const html = renderToStaticMarkup(<ScenePanel template={T} answers={withPackage('signature')} />);
    expect(html).toContain('class="ps-root');
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Top-down illustration of a 30 × 15 ft rectangular pool with a pebble finish');
    expect(html).toMatch(/role="group" aria-label="Lighting"/);
    expect(html).toMatch(/<button type="button" aria-pressed="true"[^>]*>.*?Day<\/button>/);
    expect(html).toMatch(/<button type="button" aria-pressed="false"[^>]*>.*?Night<\/button>/);
    expect(html).toContain(SCENE_CAPTION);
    expect(html).toMatch(/role="status" aria-live="polite"/);
    expect(html).toContain('aspect-ratio:3 / 2');
    // Phone collapse control, and the design-so-far pills.
    expect(html).toMatch(/aria-expanded="true" aria-controls="[^"]+"/);
    expect(html).toContain('Hide picture');
    expect(html).toContain('Your design so far');
    expect(html).not.toContain('$');
  });

  it('marks the night view as pressed when night is on', () => {
    const html = renderToStaticMarkup(<ScenePanel template={T} answers={BASE} night onNightChange={() => {}} />);
    expect(html).toMatch(/<button type="button" aria-pressed="true"[^>]*>.*?Night<\/button>/);
  });

  it('draws a hover preview as a labelled ghost, and nothing when the preview would look the same', () => {
    const ghost = renderToStaticMarkup(
      <ScenePanel template={T} answers={BASE} preview={{ answers: { ...BASE, shape: ['freeform'] }, label: 'Freeform pool' }} />,
    );
    expect(ghost).toContain('data-preview="true"');
    expect(ghost).toContain('Preview: Freeform pool');
    expect(ghost).toContain('freeform pool');
    const same = renderToStaticMarkup(<ScenePanel template={T} answers={BASE} preview={{ answers: { ...BASE, size: ['unsure'] }, label: 'Not sure pool' }} />);
    expect(same).not.toContain('data-preview');
    expect(same).not.toContain('Preview:');
  });

  it('the result variant has no collapse control', () => {
    const html = renderToStaticMarkup(<ScenePanel template={T} answers={BASE} variant="result" />);
    expect(html).not.toContain('Hide picture');
    expect(html).toContain(SCENE_CAPTION);
  });
});

describe('result design', () => {
  const answers: Answers = { ...withPackage('transformation', { ...BASE, project: ['backyard'] }), extras: ['kitchen'], cracks: ['no'], access: ['no'], hillside: ['no'] };
  const estimate = computeEstimate(T, { answers });
  const result: LeadSuccess = { ok: true, estimate, qualified: true, calendarUrl: 'https://example.com/book' };
  const flow = (r: LeadSuccess) =>
    renderToStaticMarkup(<EstimatorFlow template={T} contractor={FIXTURE_CONTRACTOR} seed={{ answers, result: r }} />);

  it('shows the finished scene, Save my design, the design list, the range and the booking button', () => {
    const html = flow(result);
    expect(html).toContain('data-scene-panel="result"');
    expect(html).toContain('Save my design');
    expect(html).toContain('Your design');
    expect(html).toContain('Outdoor kitchen');
    expect(html).toContain('Your ballpark estimate');
    expect(html).toContain('Book your free on-site consultation');
    expect(html).not.toContain('See it for real');
    // The booking button comes right after the range, before the site-visit and exclusions blocks.
    expect(html.indexOf('Book your free on-site consultation')).toBeLessThan(html.indexOf('Not included'));
  });

  it('offers "See it for real" only when the lead response carries a render token', () => {
    const html = flow({ ...result, renderToken: 'token-123' });
    expect(html).toContain('See it for real');
    expect(html).toContain('realistic aerial photo');
    expect(html).not.toContain('token-123');
  });

  it('renders the scene, actions and day/night switch on its own', () => {
    const html = renderToStaticMarkup(
      <ResultScene template={T} answers={answers} night={false} onNightChange={() => {}} slug="pool-masters" renderToken="t" designItems={designSummary(scene(answers), label)} />,
    );
    expect(html).toContain('class="ps-root');
    expect(html).toContain('aria-label="Lighting"');
    expect(html).toContain('Save my design');
    expect(html).toContain('See it for real');
    expect(html).toContain('Pavers, medium');
  });

  it('shows the render progress as a labelled progress bar with a story line', () => {
    const html = renderToStaticMarkup(<RenderProgress preparing={false} elapsedMs={15_000} />);
    expect(html).toContain('Creating your realistic preview');
    expect(html).toContain('Filling the pool with water');
    expect(html).toMatch(/role="progressbar" aria-label="Realistic preview progress"/);
    expect(html).toMatch(/aria-valuenow="\d+"/);
  });

  it('lists nothing when there is nothing to list', () => {
    expect(renderToStaticMarkup(<DesignList items={[]} />)).toBe('');
  });
});
