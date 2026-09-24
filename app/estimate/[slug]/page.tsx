import { cache } from 'react';
import { notFound } from 'next/navigation';
import type { Metadata, Viewport } from 'next';
import { getFunnel } from '@/lib/funnels/server';
import { FunnelExperience } from '@/components/funnels/funnel-experience';
import { baseOpenGraph, defaultOgImage } from '@/lib/site-metadata';
import { site } from '@/content/site';
import './funnel.css';

export const dynamic = 'force-dynamic';
export const viewport: Viewport = { width: 'device-width', initialScale: 1, maximumScale: 5 };

// One lookup per request, shared by generateMetadata and the page.
const loadFunnel = cache(getFunnel);

const DEFAULT_TITLE = 'Tell us about your project | HomeQuote';
const DEFAULT_DESCRIPTION =
  'Answer a few quick questions about your home project and book a free estimate with a qualified local contractor.';

/**
 * Link previews stay HomeQuote-branded (root opengraph-image, favicon) for
 * every funnel. A funnel may set config.seo.title / .description to change the
 * wording only.
 */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const seo = await loadFunnel(slug).then(f => f?.config.seo, () => undefined);
  const title = seo?.title ?? DEFAULT_TITLE;
  const description = seo?.description ?? DEFAULT_DESCRIPTION;
  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: { ...baseOpenGraph, title, description, url: `${site.url}/estimate/${slug}`, images: [defaultOgImage] },
    twitter: { card: 'summary_large_image', title, description, images: [defaultOgImage] },
  };
}

export default async function EstimatePage({ params }: { params: Promise<{ slug: string }> }) {
  let funnel;
  try { funnel = await loadFunnel((await params).slug); }
  catch { return <main className="mx-auto max-w-lg px-6 py-24"><h1 className="text-2xl font-semibold">We’ll be right back.</h1><p className="mt-4">Estimate requests are temporarily unavailable. Please try again shortly.</p></main>; }
  if (!funnel) notFound();
  return <FunnelExperience slug={funnel.slug} initialConfig={funnel.config} demo={funnel.is_demo} />;
}
