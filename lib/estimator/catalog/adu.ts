import type { EstimatorCatalog } from '../types.ts';

/**
 * The ADU option catalog: empty for now. Every ADU price lives in
 * lib/adu/pricing-config.ts (read by ../templates/adu.ts); add swap-in options
 * here once a builder wants choices beyond the funnel's.
 */
export const ADU_CATALOG: EstimatorCatalog = {};
