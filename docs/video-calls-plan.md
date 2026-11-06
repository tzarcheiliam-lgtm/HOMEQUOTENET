# HomeQuote video calls (LiveKit) — build plan

Goal: every **video** sales meeting gets its own HomeQuote video room at
`homequotenet.com/meet/…`. The contractor taps the link (no app, no account),
the HomeQuote rep joins from the CRM, and HomeQuote knows what happened.

Provider: **LiveKit Cloud** (Build plan, free to start; Ship $50/mo when we
outgrow it). LiveKit only carries the audio/video. HomeQuote keeps the links,
the permissions, the pages and the data.

## How it fits what already exists

Two ways a sales meeting gets booked today, and both already have a "video" type:

| Path | Where "video" lives today | What changes |
|---|---|---|
| Call workspace (setter books on a cold call) | `prospect_sales_appointments.appointment_type = 'video'`, a pasted link in `contact_info` | If `contact_info` is not an `https://` link, the meeting uses a HomeQuote room |
| Booking calendars (0070, self-serve booking pages) | `booking_calendars.meeting_type = 'video'` + a fixed `video_link` | If the calendar's video link is left **empty**, each booking gets its own HomeQuote room |

Rule (one function, `lib/video/links.ts`): **a video meeting uses a HomeQuote
room unless it has its own https meeting link, and LiveKit is configured.**
Existing Zoom/Meet links keep working unchanged.

## Phase 1 — working calls (this branch, no database migration)

Links are **signed, not stored**: the guest link is
`/meet/<kind><appointment id><HMAC signature>`, signed with the same secret
as the booking manage links (`BOOKING_LINK_SECRET`). Nothing to back-fill, and
it works for every existing video meeting the moment the keys are set. A
cancelled meeting's link stops working because the page re-checks the booking.

1. `lib/video/links.ts` — guest token sign/verify, room name, join window (pure, tested).
2. `lib/video/livekit.server.ts` — config check + short-lived join passes (`livekit-server-sdk`).
3. `lib/video/rooms.server.ts` — load the meeting behind a link, decide if it uses a room, build URLs.
4. Guest page `app/meet/[token]` — check camera/mic, enter name, "waiting for your HomeQuote rep".
5. Host page `app/app/meet/[kind]/[id]` — signed-in; allowed if the user can see the appointment (RLS).
6. `components/video/video-call.tsx` — LiveKit pre-join + call screen (screen share, chat, devices).
7. Room link everywhere the meeting is described:
   - booking confirmation / reminder emails + .ics (`lib/booking/notify.server.ts`)
   - the public booking + manage pages (`app/api/booking/_lib/resolve.ts`)
   - the "meeting confirmed" email invite from the call workspace (`lib/emails/meeting-invite.ts`)
   - the rep's own calendar: Add to Google/Apple + the Google mirror use the **host** join link
   - **Join video call** + **Copy guest link** on `/app/calls/appointments`
8. Calendar settings: video link becomes optional ("leave empty for a HomeQuote video room").
9. Join window: guests from 15 min before, hosts from 60 min before, until 2 h after the end.

**Setup (owner):** create a LiveKit Cloud project, then in Vercel set
`LIVEKIT_URL` (`wss://<project>.livekit.cloud`), `LIVEKIT_API_KEY`,
`LIVEKIT_API_SECRET`. Until they are set nothing changes anywhere.

## Phase 2 — know what happened (migration 0076) — BUILT 2026-11-06, see HOMEQUOTE_CONTEXT.md §52 (workflow events still to do)

- `video_calls` table: meeting, room, host/guest joined + left times, duration.
- `POST /api/video/webhook` (LiveKit webhooks, signature-verified): participant joined/left, room finished.
- Push "Mike from ABC Roofing is in your video call" to the meeting's rep.
- Auto no-show: guest never joined → flag the meeting, feed the no-show recovery (§43/§46).
- Workflow events `video_call.joined` / `video_call.no_show` / `video_call.ended`.
- "Joined 2:03 pm · 31 min" chips on the appointment cards.

## Phase 3 — AI follow-up (built, DORMANT; migration 0077; details in HOMEQUOTE_CONTEXT.md §51)

- **Consent first (California is all-party consent).** The host taps **Record & summarize**; everyone
  in the call gets a clear question. Capture starts only after **every** person (at least two) has
  agreed to that session. Each person's "yes" is their own LiveKit participant attribute, and the
  server re-reads the room from LiveKit before starting, so nobody can agree for someone else. A
  status pill with **Stop** shows while it is on; anyone can stop. A newcomer pauses capture
  *before* their join pass is issued; their mic stays off until they answer. The server writes
  what it saw to `video_recording_consents`.
- **Capture: LiveKit Egress, room composite, audio only** (Ogg/Opus, 32 kbps) → private Supabase
  Storage bucket via its S3 endpoint. One file per uninterrupted stretch of consent; files rotate
  at 50 min.
- **Speech-to-text: Fish Audio `transcribe-1-pro`** with diarization. It reuses `FISH_API_KEY`
  (no new vendor), at $0.36 per audio hour, behind a small `SpeechToText` interface.
- **Claude** (same client and model as the assistant, structured output) writes the summary,
  objections, price discussed, next step and a **suggested** outcome. The transcript is wrapped as
  untrusted data. The note goes on top of the prospect's notes (sales meetings and links with a
  prospect) or into the lead's timeline (homeowner appointments). The sale outcome is never set.
- Audio is deleted once transcribed; the transcript and summary stay on `video_recordings`
  (admins and the requester can read them).
- **Why this approach**: Egress needs no new runtime on Vercel and handles joins and leaves itself.
  Rejected: a LiveKit Agents transcriber (needs a worker deployed outside Vercel; keep it for live
  captions later); browser-side recording (depends on guests' phones and gives guests upload
  rights); per-track egress (a new egress for every reconnect).
- **To turn on**: apply 0077 (after 0076). Enable Supabase Storage → S3 Connection and create an
  access key. Set `VIDEO_TRANSCRIPTS_ENABLED=true`, `VIDEO_RECORDING_S3_ENDPOINT`, `_REGION`,
  `_ACCESS_KEY_ID`, `_SECRET_ACCESS_KEY`, then redeploy. The Phase 2 webhook calls
  `onVideoRoomEvent` (`lib/video/transcripts.server.ts`).
- **Cost per 30-min call**: about $0.20 (Fish $0.18 + Claude about $0.02; egress inside LiveKit's
  included minutes), or about $0.35 once past them (+$0.15 egress at $0.005/min).
- Later: a transcript page, a "suggested outcome" chip on the appointment card, live captions or
  an in-call AI note-taker (LiveKit Agents).

## Later

Homeowner virtual estimates: the code is already kind-generic (`appointment` |
`sales_appointment`); a contractor's video calendar gets rooms the same way.

## Costs (LiveKit Cloud, checked 2026-10-31)

Build (free): 5,000 participant-minutes, 50 GB, 100 concurrent → roughly 70
two-person 30-minute calls a month. Ship ($50): 150,000 minutes, 250 GB.
