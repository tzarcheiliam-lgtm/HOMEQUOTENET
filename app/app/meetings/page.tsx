import type { Metadata } from 'next';
import { requireCallWorkspace } from '@/lib/auth';
import { listMeetingLinks, prospectInvitee } from '@/lib/data/meeting-links';
import { videoRoomsEnabled } from '@/lib/video/livekit.server';
import { PageHeader } from '@/components/ui/page-header';
import { MeetingComposer } from '@/components/meetings/meeting-composer';
import { MeetingLinkList } from '@/components/meetings/meeting-link-list';

export const metadata: Metadata = { title: 'Video meetings · HomeQuote Network' };
export const dynamic = 'force-dynamic';

/**
 * Make a HomeQuote video meeting link and send it (§50). Admins, callers and
 * setters; a non-admin sees only their own links. ?prospect=<id> prefills the
 * prospect's name and contact (the "Video link" button on a prospect page).
 */
export default async function MeetingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const me = await requireCallWorkspace();
  const sp = await searchParams;
  const prospectId = typeof sp.prospect === 'string' ? sp.prospect : undefined;
  const [{ rows, ready }, prospect] = await Promise.all([listMeetingLinks(), prospectInvitee(prospectId)]);
  const enabled = videoRoomsEnabled();
  const hostFirstName = (me.full_name ?? '').trim().split(/\s+/)[0] || null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Video meetings" description="Make a meeting link, send it, and join from here. No app needed on their side." />
      {!enabled ? (
        <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Video calls are not set up yet: add LIVEKIT_URL, LIVEKIT_API_KEY and LIVEKIT_API_SECRET in Vercel.
        </p>
      ) : !ready ? (
        <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Meeting links need database migration 0075 before they can be saved.
        </p>
      ) : null}
      <MeetingComposer key={prospect?.id ?? 'new'} hostFirstName={hostFirstName} prospect={prospect} />
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Your links</h2>
        <MeetingLinkList rows={rows} showHost={me.role === 'admin'} />
      </section>
    </div>
  );
}
