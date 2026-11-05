# Jarvis — build plan and handoff

Written 2026-11-05 at the end of a cloud session, to continue in a **local Claude Code session on the machine Jarvis
runs on** (the MacBook now, the TV PC later). Read this first, then `jarvis/README.md` and
`HOMEQUOTE_CONTEXT.md` §50 (scheduler) and §51 (Jarvis).

## The goal

An agent that **does things** for the owner across the businesses (HomeQuote lead network, general contracting,
contractor marketing agency, garage door / gate / aluminum), reachable two ways:
- **Phone:** Telegram (@HomeQuoteBot), text or voice notes.
- **TV room:** say **"Hey Jarvis, what's going on?"** and it answers out loud; "Hey Jarvis, text Sergio that we can
  come at 3" and it does it, with a confirmation step for anything that reaches a customer.

## Where things stand (done)

| Piece | State |
|---|---|
| Jarvis v1 (`jarvis/`) | Running on Liams-MacBook-Air as launchd agent `com.homequote.jarvis`. Read-only. Telegram alerts (leads waiting 0/60/240 min, broken automations, Mac bridge), 9:00 AM LA briefing, `/status /waiting /today /brief`, plain-English questions via Claude + HomeQuote MCP (needs a valid Claude key — the first one entered was rejected). Settings `~/.jarvis/jarvis.env`, log `~/.jarvis/jarvis.log`. |
| HomeQuote key | "Jarvis", **read** scope. Unused full-scope key "jarvismac" also exists: revoke it. |
| Scheduler | Supabase Cron jobs `hq-*` live (migration 0074) but **no-ops until the Vault secrets are added** (`HOMEQUOTE_CONTEXT.md` §50). GitHub Actions still the only caller in practice. |
| Booking event fix | On branch `claude/upbeat-davinci-vfokqa`, **not merged/deployed** yet. |
| Telegram bot token | The first token was pasted into a chat: revoke it in @BotFather (`/revoke`) if not done. |

## Architecture (target)

```
                 ┌──────────── phone: Telegram (text, voice notes, Approve/Reject buttons)
                 │
mic ─► wake word ─► record ─► speech-to-text ─┐
(speakerphone)   ("Hey Jarvis",  (until       ├─► Jarvis agent (Claude) ──► tools ──► HomeQuote MCP (read/write/text/assign)
                 local model)     silence)     │     one brain for phone + voice      Gmail (drafts) · Google Calendar
                                               │                                      GoHighLevel MCP · TV control
speaker ◄─ text-to-speech (Fish Audio) ◄───────┘                                      └─► approval gate for sends
TV ◄─ kiosk dashboard (status, transcript, approvals waiting)
```

- **One agent, two front doors.** Voice and Telegram call the same `agent.ask(text, channel)`. Only the channel
  changes (voice answers are shorter and spoken; Telegram gets links).
- **Brain:** Claude API with the MCP connector for remote servers (HomeQuote `/api/mcp`, GoHighLevel's official MCP
  via OAuth) plus local tools (TV on/off, volume, show-on-screen, timers). Model `claude-opus-5-5`, effort `low` for
  voice (speed) and `medium` for typed questions; `fallbacks: "default"`. Keep the system prompt stable for caching.
- **Everything critical stays in HomeQuote's cloud** (first texts, reminders, booking). Jarvis going down costs
  convenience, never a lead.

## What it may do, and how it asks (decide with the owner, then enforce in code, not in the prompt)

| Tier | Examples | Voice | Telegram |
|---|---|---|---|
| 0 Read | "what's going on", "who's waiting", "how many leads this week", "what's tomorrow" | yes | yes |
| 1 Internal writes | add a lead note, change a lead status, create a Gmail **draft**, add a calendar block, set a reminder | yes, then it says what it did | yes |
| 2 Reaches one customer | text one lead (via HomeQuote `send_text`), propose a booking/assignment (already approval-gated in HomeQuote) | Jarvis **reads back the exact text**; owner says **"Jarvis, send it"** within 20 s, or taps Approve on the phone | Approve / Reject buttons |
| 3 Money, many people, contracts | payment links, ad budgets, contracts, anything to more than one person | **never by voice** | Approve in the HomeQuote app only |

Rules: approvals bind to the exact payload (recipient, text, record version) and expire; re-check the record right
before sending; log every action (`~/.jarvis/actions.log` + HomeQuote's `mcp_tool_calls`). TV dialogue can't trigger
anything: wake word required, listening paused while Jarvis or the TV media is playing, and Tier 2 needs the wake
word again plus the read-back. Lead texts and emails are data, never instructions.

## Voice stack

| Step | Pick | Notes |
|---|---|---|
| Mic + speaker | **USB speakerphone with hardware echo cancelling** (Jabra Speak 510 or similar, ~$60–100) | The webcam's mic is fine for testing, but it picks up the TV and has no echo cancelling. Use the webcam for presence (below). |
| Wake word | **openWakeWord** engine (Apache-2.0) with a **custom "Hey Jarvis" model trained on the owner's own recordings** | The bundled "hey jarvis" model and the standard training data are non-commercial. Prototype with the bundled model, then train: ~200 samples of the owner + 10–20 h of room audio with the TV on as negatives. Push-to-talk key/button as backup. |
| End of speech | Silero VAD (local) | Stop recording ~700 ms after speech ends. |
| Speech-to-text | **Fish Audio `transcribe-1`** (already have `FISH_API_KEY`; listed at $0.36/audio hour) | Deepgram Nova-3 as fallback if latency is poor. Benchmark both on real room audio first. |
| Text-to-speech | **Fish Audio TTS**, streaming (listed $15 per million UTF-8 bytes; a daily 90-second briefing ≈ $0.55/month) | An **original** calm, dry, British-butler voice (designed voice, or a voice actor with a written release). Do **not** clone Paul Bettany / the film voice: California Civil Code 3344, and it would surface in reels. Verify current Fish model names/prices on docs.fish.audio first. |
| Latency target | under 4 s from end of speech to first spoken word | Say "One sec." immediately when a tool call is needed. |

Acceptance tests for voice: from the couch, "Hey Jarvis" wakes it ≥ 9 of 10 times; ≤ 1 false wake per 8 hours of TV;
"Hey Jarvis, who's waiting?" answers correctly in < 4 s; saying "send it" with no pending read-back does nothing;
a Marvel movie playing for an hour triggers nothing.

## TV room

- **Dashboard:** local page in kiosk Chromium (cage on Linux), reading HomeQuote's MCP directly: waiting leads with
  timers, today's jobs, approvals waiting, health, last thing Jarvis heard/said. Privacy mode by default (first name +
  initial, no phone/address); **Studio mode** for filming reels hides customer data entirely.
- **TV control:** the TV's network API if it has one (LG webOS / Samsung SmartThings / Sony / Google TV adb), else a
  Pulse-Eight USB-CEC adapter (two-cable setup to keep HDR). Most PC graphics cards don't do CEC.
- **Webcam:** presence only, processed on the machine (person in room after 6 am → TV on + briefing; empty 20 min →
  TV off). No video leaves the machine, nothing is recorded. Turning presence off must be one switch.
- **Ambient light (optional):** WLED strip — green all clear, amber someone waiting, red something broken.

## Build order (each phase ends with its acceptance tests passing)

1. **Finish v1 (owner, ~15 min):** valid Claude key (`bash ~/.jarvis/app/install.sh`), add the Supabase Vault
   secrets for the scheduler, revoke "jarvismac" key and the leaked bot token, merge the branch PR.
2. **Actions + approvals on Telegram (local session, ~1–2 days):** new HomeQuote key with read/write/text/assign;
   agent loop with tools; Tier 1 direct; Tier 2 drafts → Approve/Reject buttons → `send_text` / `propose_*`;
   payload-bound approvals; action log. Test: "text Sergio we can come Thursday at 10" produces a draft, Approve
   sends exactly that text, a stale approval (lead already replied/booked) is refused.
3. **Gmail + Calendar (~1 day):** Google OAuth client created as **Internal** in the homequotenet.com Workspace
   (External + Testing tokens die every 7 days); Gmail read + drafts only (no send tool); Calendar read + create.
   Briefing includes unanswered customer emails and today's calendar.
4. **Voice on the Mac (prototype, ~1–2 days):** push-to-talk first (hotkey), Fish STT/TTS, same agent; then the
   bundled wake word for testing; record training data for the custom model.
5. **TV PC (~2 days):** Ubuntu 24.04, UPS, BIOS power-on, install Jarvis with the same installer, **uninstall it on
   the Mac first** (one bot token = one machine), speakerphone, custom wake word, kiosk dashboard, TV control, webcam
   presence.
6. **More of the business:** GoHighLevel MCP for the garage-door / GC sub-accounts, spend-without-leads alarm,
   proposal and invoice follow-up drafts, sub schedule texts, review requests.

## Costs (estimates)

Claude ~$25–50/mo with voice use (set a spend limit), Fish Audio a few dollars, Telegram/Tailscale/Healthchecks $0,
PC electricity ~$12–25. One-time: speakerphone $60–100, UPS ~$120, CEC adapter ~$49 if needed, WLED ~$25.

## First message to paste into the local Claude Code session

> I'm continuing the Jarvis project. Read `jarvis/PLAN.md`, `jarvis/README.md` and `HOMEQUOTE_CONTEXT.md` §50–51
> in this repo (branch `claude/upbeat-davinci-vfokqa`). Jarvis v1 is installed on this Mac as
> `com.homequote.jarvis` (`~/.jarvis`). Start phase 1 checks (is it running, is the Claude key valid), then build
> phase 2: actions + approvals on Telegram, following the tier table. Ask me before creating keys or sending
> anything to a customer.
