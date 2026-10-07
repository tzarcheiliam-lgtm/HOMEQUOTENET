import { ImageIcon } from 'lucide-react';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { listContractors } from '@/lib/data/contractors';
import { CREATIVE_BUCKET } from '@/lib/meta/studio/drafts.server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { CreativeUploader } from '@/components/meta/studio/creative-uploader';
import { CreativeCard, type CreativeView } from '@/components/meta/studio/creative-card';

export const metadata = { title: 'Creative Library · HomeQuote Network' };
export const dynamic = 'force-dynamic';

export default async function CreativeLibraryPage({ searchParams }: { searchParams: Promise<{ contractor?: string; q?: string }> }) {
  await requireRole(['admin']);
  const sp = await searchParams;
  const db = await createClient();
  const contractors = (await listContractors()).map((c) => ({ id: c.id, name: c.name }));
  const names = new Map(contractors.map((c) => [c.id, c.name]));
  let q = db.from('meta_creatives').select('id, contractor_id, campaign_label, name, tags, kind, bytes, width, height, duration_seconds, storage_path, thumbnail_path, status, validation, meta_account_id').order('created_at', { ascending: false }).limit(200);
  if (sp.contractor && /^[0-9a-f-]{36}$/i.test(sp.contractor)) q = q.eq('contractor_id', sp.contractor);
  const { data } = await q;
  const rows = (data ?? []) as (Omit<CreativeView, 'contractorName' | 'previewUrl' | 'thumbUrl' | 'usedBy'> & { contractor_id: string | null; storage_path: string; thumbnail_path: string | null })[];
  const term = sp.q?.trim().toLowerCase();
  const shown = term ? rows.filter((r) => r.name.toLowerCase().includes(term) || r.tags.some((t) => t.includes(term)) || (r.campaign_label ?? '').toLowerCase().includes(term)) : rows;

  // Short-lived signed URLs for previews (private bucket). Minted with the service role after the admin check above.
  const svc = createAdminClient().storage.from(CREATIVE_BUCKET);
  const { data: used } = await db.from('meta_ad_drafts').select('creative_id').not('creative_id', 'is', null);
  const usage = new Map<string, number>();
  for (const u of (used ?? []) as { creative_id: string }[]) usage.set(u.creative_id, (usage.get(u.creative_id) ?? 0) + 1);
  const views: CreativeView[] = await Promise.all(shown.map(async (r) => {
    const ready = r.status === 'ready' || r.status === 'processing' || r.status === 'uploaded';
    const [main, th] = await Promise.all([ready ? svc.createSignedUrl(r.storage_path, 900) : Promise.resolve({ data: null }), r.thumbnail_path && ready ? svc.createSignedUrl(r.thumbnail_path, 900) : Promise.resolve({ data: null })]);
    return { ...r, contractorName: r.contractor_id ? (names.get(r.contractor_id) ?? 'Unknown contractor') : null, previewUrl: main.data?.signedUrl ?? null, thumbUrl: th.data?.signedUrl ?? null, usedBy: usage.get(r.id) ?? 0 };
  }));

  return (
    <div className="space-y-6">
      <PageHeader title="Creative Library" description="Images and videos you can reuse across ads, organized by contractor and campaign. Originals are never modified." />
      <Card>
        <CardHeader><CardTitle>Add a creative</CardTitle><CardDescription>Files go to private storage. HQN reads the real file header to confirm type, size and length before it can be used in an ad.</CardDescription></CardHeader>
        <CardContent><CreativeUploader contractors={contractors} /></CardContent>
      </Card>

      <form className="flex flex-wrap items-end gap-3" method="get">
        <div className="space-y-1"><label htmlFor="f-q" className="text-sm font-medium">Search</label><input id="f-q" name="q" defaultValue={sp.q ?? ''} placeholder="name, tag or campaign" className="border-input bg-background h-11 w-full rounded-md border px-3 text-base md:text-sm lg:h-9 sm:w-64" /></div>
        <div className="space-y-1"><label htmlFor="f-c" className="text-sm font-medium">Contractor</label>
          <select id="f-c" name="contractor" defaultValue={sp.contractor ?? ''} className="border-input bg-background h-11 rounded-md border px-3 text-base md:text-sm lg:h-9">
            <option value="">All</option>{contractors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select></div>
        <button className="border-input hover:bg-accent h-11 rounded-md border px-4 text-sm lg:h-9" type="submit">Filter</button>
      </form>

      {views.length === 0 ? <EmptyState icon={ImageIcon} title="No creatives yet" description="Upload an image or video above. You will pick from here when creating an ad." /> : (
        <div className="grid gap-4 md:grid-cols-2">{views.map((c) => <CreativeCard key={c.id} c={c} />)}</div>
      )}
    </div>
  );
}
