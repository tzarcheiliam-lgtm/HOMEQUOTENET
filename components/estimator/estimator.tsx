'use client';

import type { ContractorEstimatorConfig, EstimatorTemplate } from '@/lib/estimator/types';
import { EstimatorFlow } from './estimator-flow';

export type EstimatorProps = {
  /** Already merged with the contractor's settings (applyContractorConfig). */
  template: EstimatorTemplate;
  contractor: ContractorEstimatorConfig;
  /** Compact layout for the iframe embed: no page-level spacing or sticky bars. */
  embedded?: boolean;
};

/**
 * The homeowner estimator: one screen at a time, then the ballpark range and a
 * booking button. Screen order and rules live in use-estimator-flow.ts.
 */
export function Estimator({ template, contractor, embedded }: EstimatorProps) {
  return <EstimatorFlow template={template} contractor={contractor} embedded={embedded} />;
}
