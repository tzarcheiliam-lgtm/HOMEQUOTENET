import { homeownerProjects } from '@/content/homeowners';
import {
  HomeownerProjectPage,
  homeownerMetadata,
} from '@/components/marketing/homeowner-page';

const project = homeownerProjects.find((p) => p.slug === 'bathroom-remodel')!;

export const metadata = homeownerMetadata('/homeowners/bathroom-remodel', project.seo);

export default function Page() {
  return <HomeownerProjectPage project={project} />;
}
