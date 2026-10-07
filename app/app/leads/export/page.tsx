import { redirect } from 'next/navigation';
import { Download, Facebook } from 'lucide-react';
import { requireProfile } from '@/lib/auth';
import { canExportCompanyData } from '@/lib/permissions';
import { filtersToQuery, parseLeadFilters } from '@/lib/leads/filters';
import { MAX_EXPORT_LEADS, prepareFacebookExport } from '@/lib/leads/facebook-export.server';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { cn } from '@/lib/utils';

export const metadata = { title: 'Export leads for Facebook · HomeQuote Network' };
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const FILTER_LABELS: Record<string, string> = {
  q: 'Search', status: 'Status', source: 'Source', city: 'City', zip: 'ZIP', date_from: 'From', date_to: 'To', archived: 'Archived',
  assigned: 'Assignment', review: 'Review', contractor_id: 'Contractor filter', vertical_id: 'Industry filter', sub_service_id: 'Service filter',
};

export default async function ExportLeadsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const profile = await requireProfile();
  if (!canExportCompanyData(profile)) redirect('/app/leads');
  const sp = await searchParams;
  const query = filtersToQuery(sp);
  const result = await prepareFacebookExport(parseLeadFilters(sp));
  const { counts } = result;
  const applied = [...new URLSearchParams(query).entries()].filter(([k, v]) => k !== 'archived' || v !== 'active');
  const href = `/api/leads/export/facebook${query ? `?${query}` : ''}`;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Export leads for Facebook" description="A CSV in Facebook's customer-list format, for adding people to an audience by hand." backHref={`/app/leads${query ? `?${query}` : ''}`} backLabel="Leads" />

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">What will be in the file</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>It uses the same filters as the Leads page{applied.length ? ':' : ' (none set, so every active lead).'} {applied.map(([k, v]) => `${FILTER_LABELS[k] ?? k}: ${v}`).join(' · ')}</p>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div><dt className="text-xs text-muted-foreground">Leads matching</dt><dd className="text-2xl font-semibold tabular-nums">{counts.considered}</dd></div>
            <div><dt className="text-xs text-muted-foreground">In the file</dt><dd className="text-2xl font-semibold tabular-nums text-emerald-700">{counts.exported}</dd></div>
            <div><dt className="text-xs text-muted-foreground">No email or phone</dt><dd className="text-2xl font-semibold tabular-nums">{counts.noContact}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Repeat people</dt><dd className="text-2xl font-semibold tabular-nums">{counts.duplicates}</dd></div>
          </dl>
          {counts.optedOut > 0 && <p className="rounded-md bg-muted/60 p-2 text-xs">{counts.optedOut} lead{counts.optedOut === 1 ? '' : 's'} left out because they declined advertising measurement on the form.</p>}
          {result.truncated && <p className="rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">There are more than {MAX_EXPORT_LEADS.toLocaleString()} matching leads, so only the newest {MAX_EXPORT_LEADS.toLocaleString()} are included. Narrow the filters (for example a date range) and export again for the rest.</p>}
          <a href={href} download className={cn(buttonVariants({ size: 'lg' }), counts.exported === 0 && 'pointer-events-none opacity-50', 'max-lg:w-full')} aria-disabled={counts.exported === 0}>
            <Download className="size-4" /> Download CSV ({counts.exported})
          </a>
          {counts.exported === 0 && <p className="text-xs text-muted-foreground">Nothing to export with these filters.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Facebook className="size-4" /> Adding it in Facebook</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <ol className="list-decimal space-y-1 pl-5">
            <li>In Meta Ads Manager open <strong>Audiences</strong>, then <strong>Create audience</strong>, then <strong>Custom audience</strong>, then <strong>Customer list</strong>.</li>
            <li>Choose <strong>Add customers from your own file</strong> and upload this CSV.</li>
            <li>On the mapping step, check each column is matched (<code>email</code>, <code>phone</code>, <code>fn</code>, <code>ln</code>, <code>zip</code>, <code>ct</code>, <code>st</code>, <code>country</code>) and finish. Facebook hashes the file in your browser before sending it.</li>
          </ol>
          <p className="text-xs">Columns: email, phone (with country code, digits only), first and last name (lowercase, no punctuation), 5-digit ZIP, city, 2-letter state, and country (always <code>us</code>). People with neither an email nor a usable phone are skipped, and each person is listed once. Only upload people you are allowed to use for advertising under your privacy policy and Meta&rsquo;s terms. Leads from before the advertising opt-out was recorded cannot be checked for it. Every export is logged.</p>
        </CardContent>
      </Card>
    </div>
  );
}
