import type { ContractorEstimatorConfig, EstimatorTemplate } from './types.ts';

export type RegisteredEstimator = {
  /** Template already merged with the contractor's settings. */
  template: EstimatorTemplate;
  contractor: ContractorEstimatorConfig;
};

/** Slugs with a published estimator (used by pages and the lead route). */
export const ESTIMATOR_SLUGS: readonly string[] = [];

/** STAND-IN: look up an estimator by slug (replaced by the real registry). */
export function getEstimator(_slug: string): RegisteredEstimator | null {
  return null;
}
