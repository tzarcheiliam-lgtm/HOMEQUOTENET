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

## Phase 2 — know what happened (migration)

- `video_calls` table: meeting, room, host/guest joined + left times, duration.
- `POST /api/video/webhook` (LiveKit webhooks, signature-verified): participant joined/left, room finished.
- Push "Mike from ABC Roofing is in your video call" to the meeting's rep.
- Auto no-show: guest never joined → flag the meeting, feed the no-show recovery (§43/§46).
- Workflow events `video_call.joined` / `video_call.no_show` / `video_call.ended`.
- "Joined 2:03 pm · 31 min" chips on the appointment cards.

## Phase 3 — AI follow-up

- Recording/transcription **only with an on-screen consent step** (California is all-party consent).
- Claude writes summary, objections, price discussed, next step into the prospect's notes and suggests the sale outcome.
- Optional AI note-taker in the room (LiveKit Agents).

## Later

Homeowner virtual estimates: the code is already kind-generic (`appointment` |
`sales_appointment`); a contractor's video calendar gets rooms the same way.

## Costs (LiveKit Cloud, checked 2026-10-31)

Build (free): 5,000 participant-minutes, 50 GB, 100 concurrent → roughly 70
two-person 30-minute calls a month. Ship ($50): 150,000 minutes, 250 GB.
