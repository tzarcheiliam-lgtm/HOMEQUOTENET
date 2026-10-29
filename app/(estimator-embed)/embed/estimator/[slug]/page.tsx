import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { resolveExampleMedia, tradeMeta } from '@/components/estimator/builders/meta';
import { exampleFileExists } from '@/components/estimator/builders/example-files';
import { Configurator } from '@/components/estimator/configurator/configurator';
import { configuratorPhotoManifest } from '@/components/estimator/configurator/photo-manifest';
import { Estimator } from '@/components/estimator/estimator';
import { Funnel } from '@/components/estimator/funnel/funnel';
import { missingFunnelPhotos } from '@/components/estimator/funnel/photo-files';
import { initialFromSearch } from '@/components/estimator/funnel/state';
import { publicTemplate } from '@/lib/estimator/config';
import { configuratorSpecFor } from '@/lib/estimator/configurator/engine';
import { funnelSpecFor } from '@/lib/estimator/funnel/engine';
import { ESTIMATOR_SLUGS, getEstimator } from '@/lib/estimator/registry';
import { rendersEnabled } from '@/lib/estimator/render';

type Props = { params: Promise<{ slug: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>> };

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
export default async function EstimatorEmbedPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const found = getEstimator(slug);
  if (!found) notFound();
  const { contractor } = found;
  // The simple funnel starts straight at step 1 (the contractor's own site is the landing page).
  const funnel = funnelSpecFor(contractor);
  if (funnel) {
    const initial = initialFromSearch(funnel, searchParams ? await searchParams : undefined);
    return (
      <Funnel
        slug={contractor.slug}
        spec={funnel}
        contractor={contractor}
        template={publicTemplate(found.template, contractor)}
        embedded
        initialScreen={initial.screen}
        initialSelection={initial.selection}
        fromUrl={initial.fromUrl}
        missingPhotos={missingFunnelPhotos(funnel)}
      />
    );
  }
  const spec = configuratorSpecFor(contractor);
  if (spec) {
    return (
      <Configurator
        spec={spec}
        template={publicTemplate(found.template, contractor)}
        contractor={contractor}
        manifest={configuratorPhotoManifest(spec)}
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
