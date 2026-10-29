'use client';

import { rasterizeBathScene } from '@/lib/estimator/scene/bath/rasterize';
import { buildBathScene, EXAMPLE_BATH_SCENE } from '@/lib/estimator/scene/bath/scene';
import type { BathSceneSpec } from '@/lib/estimator/scene/bath/types';
import { BathScene } from '../scene/bath/bath-scene';
import { BathSample, hasBathSample } from '../swatches';
import {
  bathAddedOptions,
  bathChangeMessages,
  bathDescription,
  bathDesignSummary,
  bathIsVisual,
  bathOptionPhrase,
  bathResultHeading,
} from './bath-words';
import { TRADE_META } from './meta';
import type { TradeBuilder, TradeCopy, TradeSceneProps } from './types';

function BathTradeScene({ scene, mode, label, focus, still, leaving, className }: TradeSceneProps<BathSceneSpec>) {
  const picture = (
    <BathScene
      scene={scene}
      mood={mode === 'evening' ? 'evening' : 'day'}
      label={label}
      focus={focus === 'close' ? 'close' : 'overview'}
      still={still || leaving}
      className={leaving ? 'absolute inset-0 block size-full' : className}
    />
  );
  // The example leaving fades out as a whole (the canvas scene has no fade of its own).
  return leaving ? <div className={`eb-leave ${className ?? ''}`}>{picture}</div> : picture;
}

/**
 * The bathroom's words. HomeQuote Network is a matching network, not a
 * contractor: the next step is a free in-home consultation with a licensed
 * local bathroom contractor, and nothing says "we" build it.
 */
export const BATH_COPY: TradeCopy = {
  subject: 'bathroom',
  stageLabel: 'Bathroom',
  sceneCaption: 'Illustration — final details are confirmed at your free in-home consultation',
  sceneCaptionShort: 'Illustration — final details confirmed in person',
  photoCaption: 'AI-rendered photo of your design, not a finished job. Final details are confirmed at your free in-home consultation.',
  chipPhotoNote: 'Style idea (AI-generated)',
  hiddenNote: 'Your bathroom picture is hidden.',
  visit: 'free in-home consultation',
  helper: 'Your contractor',
  bookLabel: 'Book your free in-home consultation',
  siteVisitHeading: 'Your contractor will confirm these in person',
  priceOnSite: 'Your contractor will price this with you in person',
  contactLine: () => 'A licensed local bathroom contractor will reach out to set up your free in-home consultation.',
  designFile: 'my-bathroom-design.png',
  photoFile: 'my-bathroom-photo.jpg',
  shareTitle: 'My bathroom design',
  shareDesignText: 'My new bathroom design.',
  sharePhotoText: 'A realistic photo of my new bathroom design.',
};

/**
 * The bathroom builder: an eye-level picture of their bathroom (BathScene)
 * that repaints on every pick, Daylight / Evening, and close-ups for the
 * finishes.
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
  highlights: () => [],
  addedOptions: bathAddedOptions,
  unsureIds: [],
  optionVisual: (questionId, optionId) =>
    hasBathSample(questionId, optionId) ? <BathSample questionId={questionId} optionId={optionId} className="h-full w-full" /> : null,
  rasterize: (frame) => {
    const el = frame.querySelector<HTMLCanvasElement>('[data-bath-scene] > canvas:not(.bs-prev)') ?? frame.querySelector<SVGSVGElement>('[data-bath-scene] svg');
    return el ? rasterizeBathScene(el) : Promise.reject(new Error('scene not found'));
  },
  hero: TRADE_META.bathroom.hero,
  copy: BATH_COPY,
  resultHeading: (firstName, _items, spec) => bathResultHeading(firstName, spec),
  exampleImages: TRADE_META.bathroom.exampleImages,
  exampleVideo: TRADE_META.bathroom.exampleVideo,
  renderSubject: 'bathroom',
};
