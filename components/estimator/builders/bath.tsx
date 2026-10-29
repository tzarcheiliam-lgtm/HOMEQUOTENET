'use client';

import { useMemo, type CSSProperties } from 'react';
import { bathAreaBoxes, bathLayout, type BathArea } from '@/lib/estimator/scene/bath/geometry';
import { rasterizeBathScene } from '@/lib/estimator/scene/bath/rasterize';
import { buildBathScene, EXAMPLE_BATH_SCENE } from '@/lib/estimator/scene/bath/scene';
import type { BathSceneSpec } from '@/lib/estimator/scene/bath/types';
import { BATH_SCENE } from '@/lib/estimator/scene/bath/types';
import { BathScene } from '../scene/bath/bath-scene';
import { BathSample, hasBathSample } from '../swatches';
import {
  bathAddedOptions,
  bathChangeMessages,
  bathDescription,
  bathDesignSummary,
  bathHighlights,
  bathIsBefore,
  bathIsVisual,
  bathOptionPhrase,
  bathResultHeading,
} from './bath-words';
import { TRADE_META } from './meta';
import type { TradeBuilder, TradeCopy, TradeSceneProps } from './types';

/** The shower tile close-up looks at the shower wall; the other finishes at the vanity. */
const SHOWER_CLOSE_UPS: ReadonlySet<string> = new Set(['showerTile']);

/** "What changes" flash over a renewed area (classes `bh-*`): a quick lift and a soft rim of light. */
const HIGHLIGHT_CSS = `
.bh-area{position:absolute;pointer-events:none;border-radius:10px;opacity:0;background:rgba(255,255,255,.2);box-shadow:inset 0 0 0 2px rgba(255,255,255,.9),0 0 28px rgba(255,255,255,.5);animation:bh-flash 680ms ease-out both}
@keyframes bh-flash{0%{opacity:0;transform:scale(.985)}25%{opacity:1;transform:none}100%{opacity:0}}
@media (prefers-reduced-motion:reduce){.bh-area{display:none}}
`;

const pct = (v: number, of: number) => `${((v / of) * 100).toFixed(2)}%`;

function BathHighlights({ scene, items }: { scene: BathSceneSpec; items: readonly unknown[] }) {
  const boxes = useMemo(() => bathAreaBoxes(bathLayout(scene)), [scene]);
  const areas = items.filter((i): i is BathArea => typeof i === 'string' && i in boxes);
  if (areas.length === 0) return null;
  const { width: W, height: H } = BATH_SCENE;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true" data-bath-highlights={areas.join(' ')}>
      <style>{HIGHLIGHT_CSS}</style>
      {areas.map((area, i) => {
        const b = boxes[area];
        const style: CSSProperties = {
          left: pct(Math.max(0, b.x), W),
          top: pct(Math.max(0, b.y), H),
          width: pct(Math.min(W, b.x + b.w) - Math.max(0, b.x), W),
          height: pct(Math.min(H, b.y + b.h) - Math.max(0, b.y), H),
          animationDelay: `${Math.min(i * 60, 120)}ms`,
        };
        return <span key={area} className="bh-area" style={style} />;
      })}
    </div>
  );
}

function BathTradeScene({ scene, mode, label, focus, focusOn, still, leaving, covered, highlight, className }: TradeSceneProps<BathSceneSpec>) {
  const close = focus === 'close';
  const picture = (
    <BathScene
      scene={scene}
      mood={mode === 'evening' ? 'evening' : 'day'}
      label={label}
      focus={close ? 'close' : 'overview'}
      target={focusOn && SHOWER_CLOSE_UPS.has(focusOn) ? 'shower' : 'vanity'}
      still={still || leaving}
      decorative={leaving || covered}
      className={leaving ? 'absolute inset-0 block size-full' : className}
    />
  );
  // The example leaving fades out as a whole (the canvas scene has no fade of its own).
  if (leaving) return <div className={`eb-leave ${className ?? ''}`}>{picture}</div>;
  // The plain "before" room says what it is; highlights land on the overview only (the boxes are unzoomed).
  const before = !still && !covered && bathIsBefore(scene);
  const flash = highlight && !close && !still ? highlight : null;
  if (!before && !flash) return picture;
  return (
    <div className={className ?? 'relative'}>
      {picture}
      {flash ? <BathHighlights key={flash.key} scene={scene} items={flash.items} /> : null}
      {before ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-2.5 top-2.5 inline-flex h-7 items-center rounded-full bg-[#06122b]/70 px-3 text-[11px] font-semibold text-white shadow-sm sm:right-3 sm:top-3 sm:h-8 sm:text-xs"
        >
          Your bathroom today
        </span>
      ) : null}
    </div>
  );
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
  // A network with no jobs of its own: the photo always says it is AI-rendered.
  photoLabel: 'AI-rendered photo',
  chipPhotoNote: 'Style idea (AI-generated)',
  hiddenNote: 'Your bathroom picture is hidden.',
  visit: 'free in-home consultation',
  helper: 'Your contractor',
  bookLabel: 'Book your free in-home consultation',
  siteVisitHeading: 'Confirmed in person at your free consultation',
  priceOnSite: 'Priced in person at your free consultation',
  // The network acts first (the funnel's thank-you page): a project specialist calls, then the match.
  contactLine: (name) =>
    `A ${name} project specialist will call you shortly to talk through your design and next steps, including a free in-home consultation with a licensed local bathroom contractor.`,
  // Still plainly an example (compliance), but says what the figures are instead of calling them placeholders.
  examplePriceNote: 'Example prices: a typical Southern California range for a design like this, not yet confirmed by a local contractor.',
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
  highlights: bathHighlights,
  addedOptions: bathAddedOptions,
  unsureIds: [],
  chipAlign: 'start',
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
