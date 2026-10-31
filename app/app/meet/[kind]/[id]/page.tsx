import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireProfile } from '@/lib/auth';
import { joinVideoAsHost } from '@/lib/actions/video';
import { closedMessage, videoWhen } from '@/lib/video/copy';
import { isUuid, kindFromSegment, videoGuestPath, videoGuestToken } from '@/lib/video/links';
import { videoRoomsEnabled } from '@/lib/video/livekit.server';
import { meetingForHost, windowFor } from '@/lib/video/rooms.server';
import { bookingLinkSecret } from '@/lib/booking/notify.server';
import { siteUrl } from '@/lib/calendar/config';
import { CopyGuestLink } from '@/components/video/copy-guest-link';
import { VideoCall } from '@/components/video/video-call';

export const metadata: Metadata = { title: 'Video call · HomeQuote Network' };
export const dynamic = 'force-dynamic';

/**
 * The host's side of a HomeQuote video room: whoever can see the meeting in
 * the CRM (RLS) may host it. Drawn over the app shell, full screen.
 */
export default async function HostVideoPage({ params }: { params: Promise<{ kind: string; id: string }> }) {
  const me = await requireProfile();
  const { kind: segment, id } = await params;
  const kind = kindFromSegment(segment);
  if (!kind || !isUuid(id)) notFound();
  const m = await meetingForHost(kind, id);
  if (!m) notFound();

  const back = kind === 'sales_appointment' ? '/app/calls/appointments' : m.leadId ? `/app/leads/${m.leadId}` : '/app/appointments';
  const who = [m.guestName, m.subject && m.subject !== m.guestName ? m.subject : null].filter(Boolean).join(' · ') || 'your guest';
  const title = `Video call with ${who}`;
  const when = videoWhen(m.startMs, m.hostTimeZone);
  const token = videoGuestToken(kind, id, bookingLinkSecret());
  const guestUrl = token ? `${siteUrl()}${videoGuestPath(token)}` : null;

  const notice = !videoRoomsEnabled()
    ? { title: 'Video calls are not set up yet', body: 'Add LIVEKIT_URL, LIVEKIT_API_KEY and LIVEKIT_API_SECRET in Vercel to turn on HomeQuote video rooms.' }
    : !m.videoRoom
      ? m.ownLink
        ? { title: 'This meeting uses its own link', body: m.ownLink }
        : { title: 'This is not a video meeting', body: 'Change the meeting type to Video to give it a HomeQuote video room.' }
      : closedMessage(windowFor(m, 'host'), m.hostTimeZone, 'host');

  return (
    <div className="fixed inset-0 z-[60] overflow-auto bg-[#111]">
      {notice ? (
        <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center text-white">
          <h1 className="text-xl font-semibold">{notice.title}</h1>
          <p className="text-sm text-white/70">{title} · {when}</p>
          <p className="max-w-md break-words text-sm text-white/80">{notice.body}</p>
          {m.videoRoom && guestUrl ? <CopyGuestLink url={guestUrl} /> : null}
          <Link href={back} className="mt-2 text-sm text-white underline underline-offset-4">Back to HomeQuote</Link>
        </main>
      ) : (
        <>
          <VideoCall
            role="host"
            title={title}
            when={when}
            waitingFor={m.guestName || 'your guest'}
            defaultName={me.full_name || 'HomeQuote'}
            join={joinVideoAsHost.bind(null, kind, id)}
            backHref={back}
          />
          {guestUrl ? (
            <div className="pointer-events-none fixed bottom-24 right-4 z-[61] hidden sm:block">
              <div className="pointer-events-auto"><CopyGuestLink url={guestUrl} compact /></div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
