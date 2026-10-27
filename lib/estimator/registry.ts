import { POOL_MASTERS_ESTIMATOR } from '@/content/estimators/pool-masters';
import { POOL_CATALOG } from './catalog/pool.ts';
import { applyContractorConfig } from './config.ts';
import { POOL_TEMPLATE } from './templates/pool.ts';
import type { ContractorEstimatorConfig, EstimatorTemplate } from './types.ts';

export type RegisteredEstimator = {
  /** Template already merged with the contractor's settings. */
  template: EstimatorTemplate;
  contractor: ContractorEstimatorConfig;
};

/*
 * Published estimators. For now each is a config file in content/estimators/
 * merged onto the pool template; self-serve contractors will later load their
 * saved config here instead. Server-safe: no client-only imports.
 */
const CONTRACTORS: Record<string, ContractorEstimatorConfig> = {
  [POOL_MASTERS_ESTIMATOR.slug]: POOL_MASTERS_ESTIMATOR,
};

/** Slugs with a published estimator (used by pages and the lead route). */
export const ESTIMATOR_SLUGS: readonly string[] = Object.keys(CONTRACTORS);

/** The estimator for a slug (template merged with the contractor's settings), or null when there is none. */
export function getEstimator(slug: string): RegisteredEstimator | null {
  if (!Object.hasOwn(CONTRACTORS, slug)) return null;
  const contractor = CONTRACTORS[slug];
  return { template: applyContractorConfig(POOL_TEMPLATE, contractor, POOL_CATALOG), contractor };
}
