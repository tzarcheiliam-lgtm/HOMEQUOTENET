import { roofingIndustry as industry } from '@/content/industries';
import {
  IndustryLandingPage,
  industryMetadata,
} from '@/components/marketing/industry-page';

export const metadata = industryMetadata(industry);

export default function RoofingPage() {
  return <IndustryLandingPage industry={industry} />;
}
