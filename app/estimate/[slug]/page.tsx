import { notFound } from 'next/navigation';
import type { Metadata, Viewport } from 'next';
import { getFunnel } from '@/lib/funnels/server';
import { FunnelExperience } from '@/components/funnels/funnel-experience';
import './funnel.css';

export const dynamic = 'force-dynamic';
export const viewport: Viewport = { width: 'device-width', initialScale: 1, maximumScale: 5 };
export const metadata: Metadata = { title: 'Tell us about your project | HomeQuote', robots: { index: false, follow: false } };
export default async function EstimatePage({ params }: { params: Promise<{ slug: string }> }) {
  let funnel;
  try { funnel = await getFunnel((await params).slug); }
  catch { return <main className="mx-auto max-w-lg px-6 py-24"><h1 className="text-2xl font-semibold">We’ll be right back.</h1><p className="mt-4">Estimate requests are temporarily unavailable. Please try again shortly.</p></main>; }
  if (!funnel) notFound();
  return <FunnelExperience slug={funnel.slug} initialConfig={funnel.config} demo={funnel.is_demo} />;
}
