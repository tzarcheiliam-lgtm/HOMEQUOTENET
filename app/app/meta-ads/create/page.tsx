import Link from 'next/link';
import { PlusCircle, Megaphone } from 'lucide-react';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { when } from '@/components/meta/format';

export const metadata = { title: 'Create Ad · HomeQuote Network' };
export const dynamic = 'force-dynamic';

const LABEL: Record<string, [Parameters<typeof Badge>[0]['variant'], string]> = {
  draft: ['muted', 'Draft'], ready: ['info', 'Confirmed, not sent'], creating: ['warning', 'Creating…'], created_paused: ['success', 'Created paused in Meta'],
  partial: ['warning', 'Partly created'], failed: ['danger', 'Failed'], cancelled: ['muted', 'Cancelled'],
};

export default async function CreateAdListPage() {
  await requireRole(['admin']);
  const db = await createClient();
  const { data } = await db.from('meta_ad_drafts').select('id, name, status, account_id, meta_effective_status, meta_status_checked_at, updated_at, last_error_message').order('updated_at', { ascending: false }).limit(100);
  const rows = (data ?? []) as { id: string; name: string; status: string; account_id: string; meta_effective_status: string | null; meta_status_checked_at: string | null; updated_at: string; last_error_message: string | null }[];
  return (
    <div className="space-y-6">
      <PageHeader title="Create Ad" description="Build a paid Facebook/Instagram ad, review it, and create it in Meta as paused. This does not post to your Page or Instagram feed.">
        <Button asChild size="sm"><Link href="/app/meta-ads/create/new"><PlusCircle className="size-4" aria-hidden="true" />New ad</Link></Button>
      </PageHeader>
      {rows.length === 0 ? <EmptyState icon={Megaphone} title="No ad drafts yet" description="Start a new ad. You can save a draft without touching Meta." /> : (
        <Card><CardContent className="divide-y p-0">
          {rows.map((r) => {
            const [variant, label] = LABEL[r.status] ?? ['muted', r.status];
            return (
              <Link key={r.id} href={`/app/meta-ads/create/${r.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-muted/50">
                <span className="min-w-0 flex-1 truncate font-medium">{r.name}</span>
                <Badge variant={variant}>{label}</Badge>
                {r.meta_effective_status && <span className="text-xs text-muted-foreground">Meta says: {r.meta_effective_status}</span>}
                <span className="text-xs text-muted-foreground">{r.account_id} · {when(r.updated_at)}</span>
                {r.last_error_message && <span className="w-full text-xs text-destructive">{r.last_error_message}</span>}
              </Link>
            );
          })}
        </CardContent></Card>
      )}
    </div>
  );
}
