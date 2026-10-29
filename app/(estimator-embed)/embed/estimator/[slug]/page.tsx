import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { resolveExampleMedia, tradeMeta } from '@/components/estimator/builders/meta';
import { exampleFileExists } from '@/components/estimator/builders/example-files';
import { Configurator } from '@/components/estimator/configurator/configurator';
import { configuratorPhotoManifest } from '@/components/estimator/configurator/photo-manifest';
import { Estimator } from '@/components/estimator/estimator';
import { publicTemplate } from '@/lib/estimator/config';
import { ESTIMATOR_SLUGS, getEstimator } from '@/lib/estimator/registry';
import { rendersEnabled } from '@/lib/estimator/render';

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return ESTIMATOR_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const found = getEstimator(slug);
  return {
    title: found ? `${found.template.title.replace(/\b[a-z]/g, (c) => c.toUpperCase())} Price Estimator · ${found.contractor.contractorName}` : 'Estimator not found',
    robots: { index: false, follow: false },
  };
}

/**
 * The estimator alone, for a contractor's own site to iframe (it brings its own
 * header). rendersEnabled is the server-only check that decides whether any copy
 * may promise a realistic photo.
 */
export default async function EstimatorEmbedPage({ params }: Props) {
  const { slug } = await params;
  const found = getEstimator(slug);
  if (!found) notFound();
  const { contractor } = found;
  if (contractor.experience === 'configurator' && contractor.configurator) {
    return (
      <Configurator
        spec={contractor.configurator}
        template={publicTemplate(found.template, contractor)}
        contractor={contractor}
        manifest={configuratorPhotoManifest(contractor.configurator)}
        embedded
      />
    );
  }
  const renders = rendersEnabled();
  const meta = tradeMeta(found.template.trade);
  // The example the builder opens on (renders on), only from files that exist.
  const example = meta && renders ? resolveExampleMedia(meta, exampleFileExists) : null;
  return (
    <Estimator
      template={publicTemplate(found.template, found.contractor)}
      contractor={found.contractor}
      embedded
      rendersEnabled={renders}
      example={example}
    />
  );
}
