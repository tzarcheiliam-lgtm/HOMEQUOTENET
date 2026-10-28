import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Estimator } from '@/components/estimator/estimator';
import { publicTemplate } from '@/lib/estimator/config';
import { ESTIMATOR_SLUGS, getEstimator } from '@/lib/estimator/registry';

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

export default async function EstimatorEmbedPage({ params }: Props) {
  const { slug } = await params;
  const found = getEstimator(slug);
  if (!found) notFound();
  return <Estimator template={publicTemplate(found.template, found.contractor)} contractor={found.contractor} embedded />;
}
