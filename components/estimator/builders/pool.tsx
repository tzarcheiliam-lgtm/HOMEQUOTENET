'use client';

import { EXAMPLE_SCENE } from '@/lib/estimator/scene/example';
import { sceneHighlights, type SceneHighlight } from '@/lib/estimator/scene/highlights';
import { rasterizeScene } from '@/lib/estimator/scene/rasterize';
import { buildScene } from '@/lib/estimator/scene/scene';
import type { SceneSpec } from '@/lib/estimator/scene/types';
import { addedOptions, designSummary, isVisualQuestion, optionPhrase, sceneChanges, sceneDescription, type DesignItem } from '../builder';
import { PoolScene } from '../scene/pool-scene';
import { TRADE_META } from './meta';
import type { TradeBuilder, TradeCopy, TradeSceneProps } from './types';

const SHAPE_WORD: Record<string, string> = { Rectangle: 'rectangular', 'L-shape': 'L-shaped', Freeform: 'freeform' };

/** "Sam, here’s your freeform pool": names the outcome (their shape, from the design list) when it can. */
export function poolResultHeading(firstName: string, items: readonly DesignItem[]): string {
  const shape = SHAPE_WORD[items.find((i) => i.label === 'Pool')?.value.split(',')[0]?.trim() ?? ''];
  const pool = shape ? `${shape} pool` : 'pool';
  const name = firstName.trim();
  return name ? `${name}, here’s your ${pool}` : `Here’s your ${pool}`;
}

function PoolTradeScene({ scene, mode, label, focus, intro, still, highlight, leaving, className }: TradeSceneProps<SceneSpec>) {
  return (
    <PoolScene
      scene={scene}
      night={mode === 'night'}
      label={label}
      focus={focus === 'close' ? 'pool' : 'yard'}
      intro={intro}
      still={still}
      // Same object the panel holds (the pool scene keys its flash on it).
      highlight={highlight as { key: number; items: SceneHighlight[] } | null | undefined}
      className={leaving ? `ps-leave ${className ?? ''}` : className}
    />
  );
}

/** The pool's words (the live builder's wording before trades were split out, unchanged). */
export const POOL_COPY: TradeCopy = {
  subject: 'pool',
  stageLabel: 'Pool',
  sceneCaption: 'Illustration — your final design is confirmed at the on-site visit',
  sceneCaptionShort: 'Illustration — final design confirmed on site',
  photoCaption: 'AI-rendered photo of your design. Final details are confirmed at your free on-site visit.',
  chipPhotoNote: 'Like this finished job',
  hiddenNote: 'Your pool picture is hidden.',
  visit: 'free on-site visit',
  helper: 'Your designer',
  bookLabel: 'Book your free on-site consultation',
  siteVisitHeading: 'We will confirm these on site',
  priceOnSite: 'We will price this with you on site',
  contactLine: (name) => `${name} will contact you to set up your free on-site consultation.`,
  designFile: 'my-pool-design.png',
  photoFile: 'my-pool-photo.jpg',
  shareTitle: 'My pool design',
  shareDesignText: 'My new pool design.',
  sharePhotoText: 'A realistic photo of my new pool design.',
};

/** The pool builder, wrapping the existing pool pieces unchanged. */
export const POOL_BUILDER: TradeBuilder<SceneSpec> = {
  trade: 'pool',
  buildSpec: buildScene,
  exampleSpec: EXAMPLE_SCENE,
  Scene: PoolTradeScene,
  modes: [
    { id: 'day', label: 'Day', icon: 'sun' },
    { id: 'night', label: 'Night', icon: 'moon' },
  ],
  changeMessages: (prev, next, label, unsure) => sceneChanges(prev, next, label, unsure),
  optionPhrase,
  isVisual: isVisualQuestion,
  designSummary,
  describe: sceneDescription,
  closeUpIds: new Set(['surface', 'tile', 'coping']),
  highlights: sceneHighlights,
  addedOptions,
  unsureIds: ['surface', 'tile', 'coping', 'deck'],
  rasterize: (frame) => {
    const svg = frame.querySelector<SVGSVGElement>('svg.ps-root') ?? frame.querySelector<SVGSVGElement>('svg');
    return svg ? rasterizeScene(svg) : Promise.reject(new Error('scene not found'));
  },
  hero: TRADE_META.pool.hero,
  copy: POOL_COPY,
  resultHeading: poolResultHeading,
  exampleImages: TRADE_META.pool.exampleImages,
  exampleVideo: TRADE_META.pool.exampleVideo,
  renderSubject: 'backyard pool',
};
