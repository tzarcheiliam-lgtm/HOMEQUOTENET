import type { IndustryPage } from '@/content/types';
import { poolIndustry } from './pool';
import { generalContractorsIndustry } from './general-contractors';
import { roofingIndustry } from './roofing';
import { fencingIndustry } from './fencing';
import { hvacIndustry } from './hvac';

export {
  poolIndustry,
  generalContractorsIndustry,
  roofingIndustry,
  fencingIndustry,
  hvacIndustry,
};

/**
 * Menu, footer, sitemap and homepage card order. Add a new industry here and
 * it appears everywhere at once.
 */
export const industries: IndustryPage[] = [
  generalContractorsIndustry,
  roofingIndustry,
  hvacIndustry,
  fencingIndustry,
  poolIndustry,
];
