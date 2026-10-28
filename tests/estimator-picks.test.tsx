import { existsSync } from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { copingTexture, deckTexture, optionMaterial, tileTexture, waterLook } from '@/components/estimator/scene/materials';
import { PoolScene } from '@/components/estimator/scene/pool-scene';
import { EXAMPLE_CAPTION, ScenePanel, SCENE_CAPTION } from '@/components/estimator/scene/scene-panel';
import { PackageScreen } from '@/components/estimator/screens/package-screen';
import { QuestionScreen } from '@/components/estimator/screens/question-screen';
import { MaterialSample, MaterialSampler } from '@/components/estimator/swatches';
import { ChoiceTile } from '@/components/estimator/ui';
import type { FlowScreen } from '@/components/estimator/use-estimator-flow';
import { applyPackage } from '@/lib/estimator/engine';
import { POOL_CATALOG } from '@/lib/estimator/catalog/pool';
import { EXAMPLE_SCENE, hasAnyPick } from '@/lib/estimator/scene/example';
import { layoutScene } from '@/lib/estimator/scene/geometry';
import { HIGHLIGHT_MS, MAX_HIGHLIGHTS, sceneHighlights, sparkleSpots, type SparkleTarget } from '@/lib/estimator/scene/highlights';
import { TEXTURES } from '@/lib/estimator/scene/textures';
import { SCENE, type SceneSpec } from '@/lib/estimator/scene/types';
import { POOL_TEMPLATE } from '@/lib/estimator/templates/pool';
import type { Answers, EstimatorQuestion } from '@/lib/estimator/types';

const T = POOL_TEMPLATE;
const q = (id: string): EstimatorQuestion => T.questions.find((x) => x.id === id)!;
const screenOf = (id: string): FlowScreen => ({ id, kind: 'questions', title: q(id).label, questions: [q(id)] }) as unknown as FlowScreen;
const publicPath = (src: string) => path.join(process.cwd(), 'public', src);

const PLAIN: SceneSpec = {
  project: 'remodel',
  shape: 'rectangle',
  lengthFt: 30,
  widthFt: 15,
  surface: null,
  tile: null,
  coping: null,
  deck: null,
  deckSize: 'none',
  features: { baja: false, spa: false, waterBowls: false, fireBowls: false, lights: false },
  extras: { kitchen: false, patioCover: false, turfPlanting: false, firePit: false },
};
const kinds = (prev: SceneSpec, next: SceneSpec) => sceneHighlights(prev, next).map((h) => (h.kind === 'sparkle' ? `sparkle:${h.target}` : h.kind));

describe('what a pick changed (sceneHighlights)', () => {
  it('is empty when nothing visible changed', () => {
    expect(sceneHighlights(PLAIN, { ...PLAIN })).toEqual([]);
  });

  it('points at the area each material lives on', () => {
    expect(kinds(PLAIN, { ...PLAIN, coping: 'travertine' })).toEqual(['coping']);
    expect(kinds(PLAIN, { ...PLAIN, tile: 'glass' })).toEqual(['tile']);
    expect(kinds(PLAIN, { ...PLAIN, surface: 'pebble' })).toEqual(['water']);
    expect(kinds(PLAIN, { ...PLAIN, deck: 'pavers' })).toEqual(['deck']);
    expect(kinds({ ...PLAIN, deck: 'pavers', deckSize: 'small' }, { ...PLAIN, deck: 'pavers', deckSize: 'large' })).toEqual(['deck']);
    expect(kinds(PLAIN, { ...PLAIN, shape: 'freeform' })).toEqual(['pool']);
    expect(kinds(PLAIN, { ...PLAIN, lengthFt: 36, widthFt: 18 })).toEqual(['pool']);
  });

  it('sparkles where a feature or extra was added, and celebrates nothing that was removed or undecided', () => {
    expect(kinds(PLAIN, { ...PLAIN, features: { ...PLAIN.features, spa: true } })).toEqual(['sparkle:spa']);
    expect(kinds(PLAIN, { ...PLAIN, extras: { ...PLAIN.extras, firePit: true } })).toEqual(['sparkle:firePit']);
    const full = { ...PLAIN, surface: 'pebble', features: { ...PLAIN.features, spa: true } };
    expect(sceneHighlights(full, PLAIN)).toEqual([]);
    // Typed 30.02 ft vs 30: not a visible resize.
    expect(sceneHighlights(PLAIN, { ...PLAIN, lengthFt: 30.02 })).toEqual([]);
  });

  it('puts additions first and caps a package-sized change', () => {
    const next: SceneSpec = {
      ...PLAIN,
      surface: 'pebble',
      tile: 'glass',
      coping: 'travertine',
      deck: 'pavers',
      deckSize: 'medium',
      features: { ...PLAIN.features, baja: true, fireBowls: true },
    };
    const list = kinds(PLAIN, next);
    expect(list).toHaveLength(MAX_HIGHLIGHTS);
    expect(list.slice(0, 2)).toEqual(['sparkle:baja', 'sparkle:fireBowls']);
    expect(list.slice(2)).toEqual(['water', 'tile']);
  });

  it('is short: everything ends inside HIGHLIGHT_MS (< 0.7 s)', () => {
    expect(HIGHLIGHT_MS).toBeLessThanOrEqual(700);
    const html = renderToStaticMarkup(<PoolScene scene={PLAIN} label="x" />);
    const durations = [...html.matchAll(/\.ps-hl-[a-z]+\{opacity:0;animation:ps-hl-[a-z]+ (\d+)ms/g)].map((m) => Number(m[1]));
    expect(durations.length).toBeGreaterThanOrEqual(5);
    // The longest animation plus the largest start offset (130 ms).
    expect(Math.max(...durations) + 130).toBeLessThan(HIGHLIGHT_MS);
  });
});

describe('sparkle spots', () => {
  const full: SceneSpec = {
    ...PLAIN,
    project: 'backyard',
    deck: 'pavers',
    deckSize: 'medium',
    features: { baja: true, spa: true, waterBowls: true, fireBowls: true, lights: true },
    extras: { kitchen: true, patioCover: true, turfPlanting: true, firePit: true },
  };
  const layout = layoutScene(full);
  const targets: SparkleTarget[] = ['baja', 'spa', 'waterBowls', 'fireBowls', 'lights', 'kitchen', 'patioCover', 'firePit', 'turfPlanting'];

  it('finds one to three spots on the canvas for every item the layout placed', () => {
    for (const t of targets) {
      const spots = sparkleSpots(layout, t);
      expect(spots.length, t).toBeGreaterThan(0);
      expect(spots.length, t).toBeLessThanOrEqual(3);
      for (const p of spots) {
        expect(p.x, t).toBeGreaterThanOrEqual(0);
        expect(p.x, t).toBeLessThanOrEqual(SCENE.width);
        expect(p.y, t).toBeGreaterThanOrEqual(0);
        expect(p.y, t).toBeLessThanOrEqual(SCENE.height);
      }
    }
  });

  it('puts the spa sparkle on the spa', () => {
    const [p] = sparkleSpots(layout, 'spa');
    const b = layout.spa!.box;
    expect(p.x).toBeGreaterThan(b.x);
    expect(p.x).toBeLessThan(b.x + b.w);
    expect(p.y).toBeGreaterThan(b.y);
    expect(p.y).toBeLessThan(b.y + b.h);
  });

  it('has nothing to sparkle for an item that is not there', () => {
    const plain = layoutScene(PLAIN);
    expect(sparkleSpots(plain, 'spa')).toEqual([]);
    expect(sparkleSpots(plain, 'kitchen')).toEqual([]);
  });
});

describe('scene highlight layer', () => {
  it('draws nothing by default, and a labelled layer for a highlight', () => {
    expect(renderToStaticMarkup(<PoolScene scene={PLAIN} label="x" />)).not.toContain('class="ps-hl"');
    const html = renderToStaticMarkup(
      <PoolScene
        scene={{ ...PLAIN, coping: 'travertine', features: { ...PLAIN.features, spa: true } }}
        label="x"
        highlight={{ key: 1, items: [{ kind: 'sparkle', target: 'spa' }, { kind: 'coping' }, { kind: 'water' }, { kind: 'deck' }] }}
      />,
    );
    expect(html).toContain('data-highlights="spa coping water deck"');
    expect(html).toContain('class="ps-hl-star"');
    expect(html).toContain('class="ps-hl-sweep"');
    expect(html).toContain('class="ps-hl-ring"');
    expect(html).not.toMatch(/NaN|undefined/);
    // Unique ids per scene instance (two panels on a page must not share masks).
    const ids = [...html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('is hidden under reduced motion and keeps playing while the rest of the scene is paused', () => {
    const html = renderToStaticMarkup(<PoolScene scene={PLAIN} label="x" />);
    expect(html).toContain('@media (prefers-reduced-motion:reduce){.ps-hl{display:none}}');
    expect(html).toContain('.ps-root[data-paused] :not(.ps-hl,.ps-hl *){animation-play-state:paused!important}');
  });
});

describe('first look', () => {
  it('builds the picture up in three beats only when asked, and never under reduced motion', () => {
    const plain = renderToStaticMarkup(<PoolScene scene={EXAMPLE_SCENE} label="x" className="w-full" />);
    expect(plain).toContain('class="ps-root w-full"');
    const intro = renderToStaticMarkup(<PoolScene scene={EXAMPLE_SCENE} label="x" intro className="w-full" />);
    expect(intro).toContain('class="ps-root ps-intro w-full"');
    for (const beat of ['ps-yard', 'ps-pool', 'ps-deck', 'ps-things', 'ps-drone']) expect(intro).toContain(`class="${beat}"`);
    // Total about 1.2 s: the last beat starts at .68 s and runs .45 s; the drone settle runs 1.2 s.
    expect(intro).toContain('.ps-intro .ps-deck,.ps-intro .ps-things{animation:ps-fade .45s ease-out .68s both}');
    expect(intro).toContain('.ps-intro .ps-drone{animation:ps-drone 1.2s');
    expect(intro).toMatch(/@media \(prefers-reduced-motion:reduce\)\{\.ps-root \*\{animation:none!important;transition:none!important\}\}/);
  });

  it('knows when nothing has been picked yet', () => {
    expect(hasAnyPick({})).toBe(false);
    expect(hasAnyPick({ project: [] })).toBe(false);
    expect(hasAnyPick({ project: ['remodel'] })).toBe(true);
    expect(hasAnyPick({}, true)).toBe(true);
  });

  it('the example is a full, valid backyard', () => {
    const layout = layoutScene(EXAMPLE_SCENE);
    expect(layout.spa).not.toBeNull();
    expect(layout.baja).not.toBeNull();
    expect(layout.objects.map((o) => o.kind)).toEqual(expect.arrayContaining(['patio_cover', 'fire_pit']));
    expect(EXAMPLE_SCENE.surface && EXAMPLE_SCENE.coping && EXAMPLE_SCENE.deck).toBeTruthy();
  });

  it('shows the example, captioned as one, until the first answer; then only their answers', () => {
    const empty = renderToStaticMarkup(<ScenePanel template={T} answers={{}} />);
    expect(empty).toContain(EXAMPLE_CAPTION);
    expect(empty).toContain('aria-label="Example design, not your picks yet. Top-down illustration of a 34 × 15 ft rectangular pool');
    expect(empty).toContain('class="ps-root ps-intro');
    expect(empty).toContain(SCENE_CAPTION);
    expect(empty).not.toContain('$');

    const answered = renderToStaticMarkup(<ScenePanel template={T} answers={{ project: ['remodel'] }} />);
    expect(answered).not.toContain(EXAMPLE_CAPTION);
    expect(answered).toContain('aria-label="Top-down illustration of a 30 × 15 ft rectangular pool."');

    // The finished design never shows the example or replays the build-up.
    const result = renderToStaticMarkup(<ScenePanel template={T} answers={{}} variant="result" />);
    expect(result).not.toContain(EXAMPLE_CAPTION);
    expect(result).not.toContain('class="ps-root ps-intro');
  });

  it('the caption promises no photo and no price', () => {
    expect(EXAMPLE_CAPTION).toBe('Example — your picks will change it');
    expect(EXAMPLE_CAPTION).not.toMatch(/photo|realistic|price|\$/i);
  });
});

describe('real materials on option tiles', () => {
  const MATERIAL_QUESTIONS = ['surface', 'tile', 'coping', 'deck'] as const;

  it('every template material option shows the texture the scene paints for it', () => {
    const scenePaints: Record<(typeof MATERIAL_QUESTIONS)[number], (id: string) => string> = {
      surface: (id) => waterLook(id).floor,
      tile: tileTexture,
      coping: copingTexture,
      deck: deckTexture,
    };
    for (const qid of MATERIAL_QUESTIONS) {
      for (const o of q(qid).options) {
        const m = optionMaterial(qid, o.id);
        if (o.id === 'unsure') {
          expect(m, `${qid}.${o.id}`).toBeNull();
          continue;
        }
        expect(m, `${qid}.${o.id}`).not.toBeNull();
        expect(m!.texture, `${qid}.${o.id}`).toBe(scenePaints[qid](o.id));
        expect(existsSync(publicPath(TEXTURES[m!.texture].src!)), m!.texture).toBe(true);
        expect(m!.water === null, qid).toBe(qid !== 'surface');
      }
    }
  });

  it('maps catalog options strictly, and nothing outside the material questions', () => {
    for (const qid of MATERIAL_QUESTIONS) {
      for (const o of POOL_CATALOG[qid] ?? []) {
        const m = optionMaterial(qid, o.id);
        if (m) expect([waterLook(o.id).floor, tileTexture(o.id), copingTexture(o.id), deckTexture(o.id)], `${qid}.${o.id}`).toContain(m.texture);
      }
    }
    expect(optionMaterial('coping', 'brick')).toBeNull();
    expect(optionMaterial('deck', 'stamped_concrete')).toBeNull();
    expect(optionMaterial('surface', 'nope')).toBeNull();
    expect(optionMaterial('features', 'spa')).toBeNull();
  });

  it('renders a decorative crop of the texture; a finish sits under water', () => {
    const coping = renderToStaticMarkup(<MaterialSample questionId="coping" optionId="travertine" swatch="travertine" />);
    expect(coping).toMatch(/^<span aria-hidden="true" data-material="coping_travertine" data-swatch="travertine"/);
    expect(coping).toContain('url(/estimator/scene/textures/coping_travertine.webp)');
    expect(coping).not.toContain('water_caustics');
    const finish = renderToStaticMarkup(<MaterialSample questionId="surface" optionId="pebble" />);
    expect(finish).toContain('floor_pebble.webp');
    expect(finish).toContain('water_caustics.webp');
    expect(finish).toContain(waterLook('pebble').tint);
  });

  it('falls back to the drawn swatch, or nothing, without a texture', () => {
    expect(renderToStaticMarkup(<MaterialSample questionId="coping" optionId="brick" swatch="stone" />)).toContain('data-swatch="stone"');
    expect(renderToStaticMarkup(<MaterialSample questionId="coping" optionId="brick" />)).toBe('');
  });

  it('"Help me choose" shows a strip of every material', () => {
    const html = renderToStaticMarkup(<MaterialSampler questionId="coping" optionIds={['concrete', 'travertine', 'stone', 'unsure']} />);
    expect(html).toContain('data-material-sampler');
    expect(html.match(/data-material="/g)).toHaveLength(3);
    expect(renderToStaticMarkup(<MaterialSampler questionId="coping" optionIds={['concrete']} />)).toBe('');
  });

  it('the question screens use them', () => {
    const answers: Answers = { ...applyPackage(T, { project: ['remodel'], shape: ['rectangle'], size: ['medium'] }, 'custom'), surface: ['pebble'] };
    const surface = renderToStaticMarkup(<QuestionScreen screen={screenOf('surface')} answers={answers} onPick={() => {}} showPrices={false} />);
    expect(surface).toContain('data-material="floor_pebble"');
    expect(surface).toContain('data-swatch="pebble"');
    expect(surface).toContain('data-material-sampler');
    const deck = renderToStaticMarkup(<QuestionScreen screen={screenOf('deck')} answers={answers} onPick={() => {}} showPrices={false} />);
    for (const t of ['deck_pavers', 'deck_concrete', 'deck_porcelain', 'deck_resurface']) expect(deck).toContain(`data-material="${t}"`);
  });
});

describe('pick feedback on tiles and cards', () => {
  const tile = (checked: boolean, visual = true) =>
    renderToStaticMarkup(
      <ChoiceTile type="radio" name="n" value="v" checked={checked} onChange={() => {}} label="Travertine" visual={visual ? <span /> : undefined} />,
    );

  it('squeezes on press with a spring back, only without reduced motion', () => {
    const html = tile(false);
    expect(html).toContain('active:scale-[.97]');
    expect(html).toContain('cubic-bezier(.34,1.56,.64,1)');
    expect(html).toContain('motion-reduce:scale-100!');
    expect(html).toContain('motion-reduce:transition-none!');
    // Never `transition: all`.
    expect(html).not.toMatch(/transition-all|transition:all/);
  });

  it('pops a check badge on the picture of a picked tile (decorative: the input holds the state)', () => {
    const html = tile(true);
    expect(html).toMatch(/<span aria-hidden="true" data-check-badge=""/);
    expect(html).toContain('group-has-[:checked]:opacity-100');
    expect(html).toContain('checked=""');
    expect(tile(true, false)).not.toContain('data-check-badge');
  });

  it('package cards squeeze and pop a check too', () => {
    const pkg = q('package');
    const html = renderToStaticMarkup(
      <PackageScreen template={T} question={pkg} answers={applyPackage(T, {}, 'signature')} onPick={() => {}} canCustomize onCustomize={() => {}} />,
    );
    expect(html.match(/data-check-badge/g)?.length).toBe(pkg.options.length);
    expect(html).toContain('active:scale-[.97]');
  });
});
