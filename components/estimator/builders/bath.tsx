'use client';

import { buildBathScene, EXAMPLE_BATH_SCENE } from '@/lib/estimator/scene/bath/scene';
import type { BathSceneSpec } from '@/lib/estimator/scene/bath/types';
import { BathScene } from '../scene/bath/bath-scene';
import { bathChangeMessages, bathDescription, bathDesignSummary, bathIsVisual, bathOptionPhrase } from './bath-words';
import type { TradeBuilder, TradeSceneProps } from './types';

function BathTradeScene({ scene, mode, label, className }: TradeSceneProps<BathSceneSpec>) {
  return <BathScene scene={scene} mood={mode === 'evening' ? 'evening' : 'day'} label={label} className={className} />;
}

/** "Sam, here’s your new bathroom". */
function bathResultHeading(firstName: string): string {
  const name = firstName.trim();
  return name ? `${name}, here’s your new bathroom` : 'Here’s your new bathroom';
}

/**
 * The bathroom builder. HomeQuote-safe copy: the homeowner is connected with
 * a licensed local bathroom contractor; nothing claims "we" build it.
 */
export const BATH_BUILDER: TradeBuilder<BathSceneSpec> = {
  trade: 'bathroom',
  buildSpec: buildBathScene,
  exampleSpec: EXAMPLE_BATH_SCENE,
  Scene: BathTradeScene,
  modes: [
    { id: 'day', label: 'Daylight', icon: 'sun' },
    { id: 'evening', label: 'Evening', icon: 'moon' },
  ],
  changeMessages: (prev, next, label) => bathChangeMessages(prev, next, label),
  optionPhrase: bathOptionPhrase,
  isVisual: bathIsVisual,
  designSummary: bathDesignSummary,
  describe: bathDescription,
  closeUpIds: new Set(['showerTile', 'vanityFinish', 'counter', 'metal']),
  hero: {
    withRenders: {
      headline: 'Design your new bathroom. Get a realistic photo and a ballpark price.',
      subline:
        'About 2 minutes. Watch it change with every pick, then unlock an AI-rendered photo of your design and its price range.',
    },
    withoutRenders: {
      headline: 'Design your new bathroom and get a ballpark price',
      subline: 'About 2 minutes. Watch it change with every pick, then unlock your price range.',
    },
  },
  resultHeading: bathResultHeading,
  // Set once the example design and its kie.ai render are generated (public/estimator/hero/).
  exampleImages: null,
  renderSubject: 'bathroom',
};
