import { poolIndustry as industry } from '@/content/industries';
import {
  IndustryLandingPage,
  industryMetadata,
} from '@/components/marketing/industry-page';

export const metadata = industryMetadata(industry);

export default function PoolContractorsPage() {
  return <IndustryLandingPage industry={industry} />;
}
