import { generalContractorsIndustry as industry } from '@/content/industries';
import {
  IndustryLandingPage,
  industryMetadata,
} from '@/components/marketing/industry-page';

export const metadata = industryMetadata(industry);

export default function GeneralContractorsPage() {
  return <IndustryLandingPage industry={industry} />;
}
