import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/auth';
import { canExportCompanyData } from '@/lib/permissions';
import { createAdminClient } from '@/lib/supabase/admin';
import { parseLeadFilters } from '@/lib/leads/filters';
import { prepareFacebookExport } from '@/lib/leads/facebook-export.server';

// Downloads the leads currently shown (same filters as the Leads page) as a Facebook customer-list CSV.
// Admins, and contractor users the admin allowed to export; rows are limited by the caller's own row-level access.
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  // A download link on our own pages is same-origin; refuse anything a third-party page tries to trigger.
  if (request.headers.get('sec-fetch-site') === 'cross-site') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  let profile;
  try { profile = await getProfile(); } catch { return NextResponse.json({ error: 'Please try again' }, { status: 503 }); }
  if (!profile || !profile.is_active) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  if (!canExportCompanyData(profile)) return NextResponse.json({ error: 'You do not have permission to export leads' }, { status: 403 });

  const params = Object.fromEntries(new URL(request.url).searchParams);
  const filters = parseLeadFilters(params);
  let result;
  try { result = await prepareFacebookExport(filters); } catch { return NextResponse.json({ error: 'Could not build the export' }, { status: 500 }); }

  // Exporting personal data is recorded: who, when, how many (never the data itself).
  await createAdminClient().from('audit_logs').insert({
    actor_id: profile.id, action: 'leads.export_facebook', metadata: { filters: params, ...result.counts, truncated: result.truncated },
  });

  const day = new Date().toISOString().slice(0, 10);
  return new NextResponse(result.csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="leads-facebook-${day}.csv"`,
      'Cache-Control': 'no-store',
      'X-Export-Rows': String(result.counts.exported),
      ...(result.truncated ? { 'X-Export-Truncated': 'true' } : {}),
    },
  });
}
