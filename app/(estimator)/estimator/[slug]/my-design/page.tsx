import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SharedDesign } from '@/components/estimator/share/shared-design';
import { decodeFunnelSelection, funnelSpecFor } from '@/lib/estimator/funnel/engine';
import { getEstimator } from '@/lib/estimator/registry';
import { SHARE_SIG_PARAM } from '@/lib/estimator/share';
import { verifyShare } from '@/lib/estimator/share.server';
import { sharedDesignView } from '@/lib/estimator/share-view';
import { site } from '@/content/site';

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * "Send my design to my partner": a read-only page with the picks, their photos
 * and (for a link the lead route signed) the ballpark. The URL holds only the
 * picks (?size=..&finish=..&extras=..) and the signature: no name, no lead id.
 * Open Graph uses the main design photo, so iMessage / WhatsApp previews show
 * the pool. Never indexed.
 */
export const dynamic = 'force-dynamic';

const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL ?? site.url).replace(/\/+$/, '');

function toParams(sp: Record<string, string | string[] | undefined>): URLSearchParams {
  const out = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    const one = Array.isArray(v) ? v[0] : v;
    if (typeof one === 'string') out.set(k, one.slice(0, 80));
  }
  return out;
}

async function load(props: Props) {
  const { slug } = await props.params;
  const found = getEstimator(slug);
  const spec = found ? funnelSpecFor(found.contractor) : null;
  if (!found || !spec) return null;
  const params = toParams(await props.searchParams);
  const selection = decodeFunnelSelection(spec, params);
  const verified = verifyShare(slug, spec, selection, params.get(SHARE_SIG_PARAM));
  return { ...found, spec, view: sharedDesignView(spec, found.template, selection, verified) };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const data = await load(props);
  if (!data) return { title: 'Design not found', robots: { index: false, follow: false } };
  const { contractor, view } = data;
  const image = new URL(view.main.srcSm ?? view.main.src, `${siteUrl()}/`).toString();
  const title = `A ${view.noun} design from ${contractor.contractorName}`;
  const description = `${view.recap}${view.range ? ` · Ballpark ${view.range}` : ''}. Designed with ${contractor.contractorName}.`;
  return {
    title: { absolute: title },
    description,
    robots: { index: false, follow: false },
    referrer: 'no-referrer',
    openGraph: { type: 'website', title, description, siteName: contractor.contractorName, images: [{ url: image, alt: view.main.alt }] },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}

export default async function SharedDesignPage(props: Props) {
  const data = await load(props);
  if (!data) notFound();
  return <SharedDesign contractor={data.contractor} spec={data.spec} view={data.view} />;
}
