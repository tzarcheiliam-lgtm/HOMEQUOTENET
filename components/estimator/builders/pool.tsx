'use client';

import { EXAMPLE_SCENE } from '@/lib/estimator/scene/example';
import { buildScene } from '@/lib/estimator/scene/scene';
import type { SceneSpec } from '@/lib/estimator/scene/types';
import { designSummary, isVisualQuestion, optionPhrase, sceneChanges, sceneDescription, type DesignItem } from '../builder';
import { HERO_IMAGES } from '../scene/hero-images';
import { PoolScene } from '../scene/pool-scene';
import { heroCopy } from '../shell/estimator-hero';
import type { TradeBuilder, TradeSceneProps } from './types';

const SHAPE_WORD: Record<string, string> = { Rectangle: 'rectangular', 'L-shape': 'L-shaped', Freeform: 'freeform' };

/** "Sam, here’s your freeform pool" (same wording as estimator-flow's resultHeading). */
function poolResultHeading(firstName: string, items: readonly DesignItem[]): string {
  const shape = SHAPE_WORD[items.find((i) => i.label === 'Pool')?.value.split(',')[0]?.trim() ?? ''];
  const pool = shape ? `${shape} pool` : 'pool';
  const name = firstName.trim();
  return name ? `${name}, here’s your ${pool}` : `Here’s your ${pool}`;
}

function PoolTradeScene({ scene, mode, label, focus, intro, still, className }: TradeSceneProps<SceneSpec>) {
  return (
    <PoolScene
      scene={scene}
      night={mode === 'night'}
      label={label}
      focus={focus === 'close' ? 'pool' : 'yard'}
      intro={intro}
      still={still}
      className={className}
    />
  );
}

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
  hero: { withRenders: heroCopy(true), withoutRenders: heroCopy(false) },
  resultHeading: poolResultHeading,
  exampleImages: {
    illustration: HERO_IMAGES.illustration,
    photo: HERO_IMAGES.photo,
    designAlt: 'Example design made in this builder: a rectangular pool with a spa, a lounging shelf, a porcelain deck with turf bands and a fire pit',
    photoAlt: 'The same example design as a realistic photo, made from the design picture',
  },
  renderSubject: 'backyard pool',
};
