import type { EstimatorTrade } from '@/lib/estimator/types';
import { BATH_EXAMPLE_IMAGES, BATH_HERO_VIDEO, HERO_IMAGES } from '../scene/hero-images';
import { heroCopy } from '../shell/estimator-hero';
import type { ExampleImages, ExampleMedia, ExampleVideo, HeroCopy } from './types';

/**
 * The plain-data half of each trade's builder: what the SERVER page needs
 * (hero copy, example files, share preview, page description) without
 * importing the client adapters (a 'use client' module is only a reference on
 * the server). The adapters in pool.tsx / bath.tsx reuse these values, so
 * there is one copy of each.
 */
export type TradeMeta = {
  hero: { withRenders: HeroCopy; withoutRenders: HeroCopy };
  exampleImages: ExampleImages | null;
  exampleVideo: ExampleVideo | null;
  /** Page description for search and shared links (never a price, never a photo promise). */
  description(projectNoun: string, contractorName: string): string;
  /** Share preview: the example design picture (never the photo, so it promises nothing while renders are off). */
  shareImage: { url: string; alt: string } | null;
};

export const TRADE_META: Record<EstimatorTrade, TradeMeta> = {
  pool: {
    hero: { withRenders: heroCopy(true), withoutRenders: heroCopy(false) },
    exampleImages: {
      illustration: HERO_IMAGES.illustration,
      photo: HERO_IMAGES.photo,
      designAlt: 'Example design made in this builder: a rectangular pool with a spa, a lounging shelf, a porcelain deck with turf bands and a fire pit',
      photoAlt: 'The same example design as a realistic photo, made from the design picture',
    },
    exampleVideo: null,
    description: (noun, name) =>
      `Design your ${noun} with ${name}, watch it come to life and get a ballpark price range, then book a free on-site consultation. A ballpark, not a quote.`,
    shareImage: { url: HERO_IMAGES.illustration, alt: 'A pool design made in this builder' },
  },
  bathroom: {
    hero: {
      withRenders: {
        headline: 'Design your new bathroom. Get a realistic photo and a ballpark price.',
        subline: 'About 2 minutes. Watch it change with every pick, then unlock an AI-rendered photo of your design and its price range.',
      },
      withoutRenders: {
        headline: 'Design your bathroom and get a ballpark price',
        subline: 'About 2 minutes. Watch it change with every pick, then unlock your price range.',
      },
    },
    exampleImages: {
      illustration: BATH_EXAMPLE_IMAGES.illustration,
      photo: BATH_EXAMPLE_IMAGES.photo,
      designAlt: 'Example bathroom design made in this builder',
      photoAlt: 'The same example design as an AI-rendered realistic photo, made from the design picture',
    },
    exampleVideo: BATH_HERO_VIDEO,
    // A network, not a contractor: it connects them with a licensed local contractor.
    description: (noun) =>
      `Design your ${noun}, watch it come to life and get a ballpark price range, then get connected with a licensed local bathroom contractor for a free in-home consultation. A ballpark, not a quote.`,
    shareImage: { url: BATH_EXAMPLE_IMAGES.illustration, alt: 'A bathroom design made in this builder' },
  },
};

/** The plain-data builder facts for a trade, or null for a trade without a live builder. */
export function tradeMeta(trade: string): TradeMeta | null {
  return Object.hasOwn(TRADE_META, trade) ? TRADE_META[trade as EstimatorTrade] : null;
}

/**
 * What the frame opens on before the first answer (renders on): the example
 * design and its photo when both files exist, else the example clip when its
 * poster exists, else nothing (the example picture, captioned as one).
 * `exists` checks a public path: the pages pass a file check, the client
 * trusts the trade's own paths.
 */
export function resolveExampleMedia(
  meta: Pick<TradeMeta, 'exampleImages' | 'exampleVideo'>,
  exists: (publicPath: string) => boolean = () => true,
): ExampleMedia | null {
  const pair = meta.exampleImages;
  if (pair && exists(pair.illustration) && exists(pair.photo)) return { kind: 'compare', ...pair };
  const video = meta.exampleVideo;
  if (video && exists(video.poster)) {
    const mp4 = video.mp4 && exists(video.mp4) ? video.mp4 : undefined;
    const webm = video.webm && exists(video.webm) ? video.webm : undefined;
    return { kind: 'video', ...video, mp4, webm };
  }
  return null;
}
