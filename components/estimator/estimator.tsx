'use client';

import type { ContractorEstimatorConfig, EstimatorTemplate } from '@/lib/estimator/types';

export type EstimatorProps = {
  /** Already merged with the contractor's settings (applyContractorConfig). */
  template: EstimatorTemplate;
  contractor: ContractorEstimatorConfig;
  /** Compact layout for the iframe embed: no page-level spacing or sticky bars. */
  embedded?: boolean;
};

/** STAND-IN: the homeowner estimator (replaced by the real screens). */
export function Estimator({ template }: EstimatorProps) {
  return <div data-estimator={template.trade}>{template.title}</div>;
}
