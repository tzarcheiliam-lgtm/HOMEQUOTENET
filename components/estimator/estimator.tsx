'use client';

import type { ContractorEstimatorConfig, EstimatorTemplate } from '@/lib/estimator/types';
import type { ExampleMedia } from './builders';
import { EstimatorFlow } from './estimator-flow';

export type EstimatorProps = {
  /** Already merged with the contractor's settings (applyContractorConfig). */
  template: EstimatorTemplate;
  contractor: ContractorEstimatorConfig;
  /** Compact layout for the iframe embed: no page-level spacing or sticky bars. */
  embedded?: boolean;
  /**
   * The photoreal "see it for real" render is switched on (server has KIE_API_KEY).
   * Copy that promises a realistic photo must only show when true.
   */
  rendersEnabled?: boolean;
  /**
   * Live builder, renders on: what the frame opens on before the first answer
   * (resolveExampleMedia on the server, so only files that exist). Omitted =
   * the trade's own example; null = just the example picture.
   */
  example?: ExampleMedia | null;
};

/**
 * The homeowner estimator: one screen at a time (with the live picture of the
 * project beside it for trades with a builder: pool, bathroom), then the
 * ballpark range and a booking button. Screen order and rules live in
 * use-estimator-flow.ts.
 */
export function Estimator({ template, contractor, embedded, rendersEnabled = false, example }: EstimatorProps) {
  return <EstimatorFlow template={template} contractor={contractor} embedded={embedded} rendersEnabled={rendersEnabled} example={example} />;
}
