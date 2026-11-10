'use client';

import { createContext, useContext } from 'react';
import type { TierId } from '@/lib/pitch/config';

export interface DeckState {
  /** The package the contractor is looking at: highlighted on every pricing slide and used by the calculator. */
  tier: TierId;
  setTier: (t: TierId) => void;
  goTo: (id: string) => void;
}

export const DeckContext = createContext<DeckState>({ tier: 'managed', setTier: () => {}, goTo: () => {} });

export const useDeck = () => useContext(DeckContext);

/** Messages between the deck and its presenter window (same browser, BroadcastChannel). */
export type DeckMessage =
  | { type: 'state'; index: number }
  | { type: 'goto'; index: number }
  | { type: 'hello' };

export const DECK_CHANNEL = 'hq-pitch-deck';

export const usd = (n: number, opts: { cents?: boolean } = {}) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: opts.cents ? 2 : 0 }).format(n);
