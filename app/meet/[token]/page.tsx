import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { joinVideoAsGuest } from '@/lib/actions/video';
import { closedMessage, videoWhen } from '@/lib/video/copy';
import { meetingForGuestToken, windowFor } from '@/lib/video/rooms.server';
import { VideoCall } from '@/components/video/video-call';

// A private, token-addressed page: never indexed, never cached, the token never leaves in a Referer.
export const metadata: Metadata = {
  title: 'Video call · HomeQuote Network',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};
export const dynamic = 'force-dynamic';

/**
 * The guest's side of a HomeQuote video room (the contractor on a sales call,
 * or a homeowner). The signed link is the credential: no account, no app.
 */
export default async function GuestVideoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const m = await meetingForGuestToken(token);
  if (!m || !m.videoRoom) notFound();

  const title = `Video call with ${m.hostLabel}`;
  const when = videoWhen(m.startMs, m.guestTimeZone);
  const closed = closedMessage(windowFor(m, 'guest'), m.guestTimeZone);
  if (closed) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-[#111] px-6 text-center text-white">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/60">HomeQuote Network</p>
        <h1 className="mt-2 text-xl font-semibold">{closed.title}</h1>
        <p className="mt-1 text-sm text-white/70">{title} · {when}</p>
        <p className="mt-4 max-w-sm text-sm text-white/80">{closed.body}</p>
      </main>
    );
  }

  return (
    <VideoCall
      role="guest"
      title={title}
      when={when}
      waitingFor={m.hostLabel}
      defaultName={m.guestName}
      join={joinVideoAsGuest.bind(null, token)}
    />
  );
}
