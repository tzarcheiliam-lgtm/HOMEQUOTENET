import type { ContractorEstimatorConfig, EstimatorCatalog, EstimatorTemplate } from './types.ts';

/**
 * STAND-IN: merge a contractor's settings into a template (enabled options,
 * labels, prices, custom options, packages, minimum job, pricesConfirmed).
 * Signature is the contract; the body is replaced by the real engine.
 */
export function applyContractorConfig(
  template: EstimatorTemplate,
  config: ContractorEstimatorConfig,
  _catalog?: EstimatorCatalog,
): EstimatorTemplate {
  return {
    ...template,
    pricesConfirmed: config.pricesConfirmed,
    minimumJob: config.minimumJob ?? template.minimumJob,
    packages: config.packages ?? template.packages,
  };
}
