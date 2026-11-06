'use client';

import dynamic from 'next/dynamic';
import type { VideoCallRoomProps } from './video-call-room';

/**
 * HomeQuote video call (LiveKit). The call UI touches camera, microphone and
 * WebRTC, which only exist in the browser, so it is loaded on the client only;
 * this also keeps the LiveKit bundle off every other page.
 */
const VideoCallRoom = dynamic(() => import('./video-call-room').then((m) => m.VideoCallRoom), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-dvh items-center justify-center bg-[#0a1b3d] text-sm text-white/70">
      <span className="hq-pulse mr-2.5 size-2 rounded-full bg-[#f5b700]" aria-hidden="true" />
      Getting your call ready…
    </div>
  ),
});

export function VideoCall(props: VideoCallRoomProps) {
  return <VideoCallRoom {...props} />;
}
