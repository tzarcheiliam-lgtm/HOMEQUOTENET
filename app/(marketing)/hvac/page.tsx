import { hvacIndustry as industry } from '@/content/industries';
import {
  IndustryLandingPage,
  industryMetadata,
} from '@/components/marketing/industry-page';

export const metadata = industryMetadata(industry);

export default function HvacPage() {
  return <IndustryLandingPage industry={industry} />;
}
