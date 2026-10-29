import type { EstimatorTrade } from '@/lib/estimator/types';
import { BATH_BUILDER } from './bath';
import { POOL_BUILDER } from './pool';
import type { TradeBuilder } from './types';

export type { BuilderMode, ExampleImages, HeroCopy, TradeBuilder, TradeSceneProps } from './types';

/** The live-builder adapter per trade (kitchen slots in here). */
const BUILDERS: Record<EstimatorTrade, TradeBuilder<never>> = {
  pool: POOL_BUILDER as unknown as TradeBuilder<never>,
  bathroom: BATH_BUILDER as unknown as TradeBuilder<never>,
};

/**
 * The live builder for a template's trade, or null for a trade without one
 * (the flow then shows the plain question-by-question estimator). The spec
 * type is erased: the flow only passes buildSpec's result back to the same
 * adapter.
 */
export function getTradeBuilder(trade: string): TradeBuilder<unknown> | null {
  return Object.hasOwn(BUILDERS, trade) ? (BUILDERS[trade as EstimatorTrade] as unknown as TradeBuilder<unknown>) : null;
}
