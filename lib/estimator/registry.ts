import { HOMEQUOTE_BATHROOM_ESTIMATOR } from '@/content/estimators/homequote-bathroom';
import { HOMEQUOTE_KITCHEN_ESTIMATOR } from '@/content/estimators/homequote-kitchen';
import { POOL_MASTERS_ESTIMATOR } from '@/content/estimators/pool-masters';
import { BATHROOM_CATALOG } from './catalog/bathroom.ts';
import { KITCHEN_CATALOG } from './catalog/kitchen.ts';
import { POOL_CATALOG } from './catalog/pool.ts';
import { applyContractorConfig } from './config.ts';

import { BATHROOM_TEMPLATE } from './templates/bathroom.ts';
import { KITCHEN_TEMPLATE } from './templates/kitchen.ts';
import { POOL_TEMPLATE } from './templates/pool.ts';
import type { ContractorEstimatorConfig, EstimatorCatalog, EstimatorTemplate, EstimatorTrade } from './types.ts';

/** Re-exported for callers that already import the registry. */
export { configuratorSpecFor } from './configurator/engine.ts';

export type RegisteredEstimator = {
  /** Template already merged with the contractor's settings. */
  template: EstimatorTemplate;
  contractor: ContractorEstimatorConfig;
};

/** The default template and option catalog per trade (kitchen: funnel only, no live builder). */
export const TEMPLATES: Record<EstimatorTrade, { template: EstimatorTemplate; catalog: EstimatorCatalog }> = {
  pool: { template: POOL_TEMPLATE, catalog: POOL_CATALOG },
  bathroom: { template: BATHROOM_TEMPLATE, catalog: BATHROOM_CATALOG },
  kitchen: { template: KITCHEN_TEMPLATE, catalog: KITCHEN_CATALOG },
};

/*
 * Published estimators. For now each is a config file in content/estimators/
 * merged onto its trade's template (config.trade, default pool); self-serve
 * contractors will later load their saved config here instead. Server-safe:
 * no client-only imports.
 */
const CONTRACTORS: Record<string, ContractorEstimatorConfig> = {
  [POOL_MASTERS_ESTIMATOR.slug]: POOL_MASTERS_ESTIMATOR,
  [HOMEQUOTE_BATHROOM_ESTIMATOR.slug]: HOMEQUOTE_BATHROOM_ESTIMATOR,
  [HOMEQUOTE_KITCHEN_ESTIMATOR.slug]: HOMEQUOTE_KITCHEN_ESTIMATOR,
};

/** Slugs with a published estimator (used by pages and the lead route). */
export const ESTIMATOR_SLUGS: readonly string[] = Object.keys(CONTRACTORS);

/** The estimator for a slug (template merged with the contractor's settings), or null when there is none. */
export function getEstimator(slug: string): RegisteredEstimator | null {
  if (!Object.hasOwn(CONTRACTORS, slug)) return null;
  const contractor = CONTRACTORS[slug];
  const trade = contractor.trade ?? 'pool';
  if (!Object.hasOwn(TEMPLATES, trade)) return null;
  const { template, catalog } = TEMPLATES[trade];
  return { template: applyContractorConfig(template, contractor, catalog), contractor };
}
