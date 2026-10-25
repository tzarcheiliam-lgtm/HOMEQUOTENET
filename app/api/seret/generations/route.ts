import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/auth';
import { describe, recentGenerations, refreshGeneration } from '@/lib/seret/engine';

/** Signed-in admins only: recent images/videos made through the Seret API, for Seret's Projects page. */
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET() {
  const profile = await getProfile().catch(() => null);
  if (!profile || profile.role !== 'admin' || !profile.is_active) return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
  if (!process.env.KIE_API_KEY) return NextResponse.json({ items: [] });
  const rows = await recentGenerations(30);
  // Bring a few running jobs up to date so finished work appears without waiting for Claude to ask.
  const fresh = await Promise.all(rows.map((r, i) => (r.status === 'running' && i < 5 ? refreshGeneration(r).catch(() => r) : r)));
  return NextResponse.json({ items: await Promise.all(fresh.map(describe)) }, { headers: { 'Cache-Control': 'no-store' } });
}
