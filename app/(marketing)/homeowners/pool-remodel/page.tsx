import { homeownerProjects } from '@/content/homeowners';
import {
  HomeownerProjectPage,
  homeownerMetadata,
} from '@/components/marketing/homeowner-page';

const project = homeownerProjects.find((p) => p.slug === 'pool-remodel')!;

export const metadata = homeownerMetadata('/homeowners/pool-remodel', project.seo);

export default function Page() {
  return <HomeownerProjectPage project={project} />;
}
