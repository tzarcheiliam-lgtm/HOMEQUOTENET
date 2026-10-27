# Calling Workspace: "Dopamine" Plan

> **Status (2026-10-27): built — all four phases.** What shipped and where it
> lives is in `HOMEQUOTE_CONTEXT.md` §34. Differences from this plan: no
> "undo" for one-tap outcomes (attempts stay append-only), the heatmap shows
> four Monday-aligned weeks, and setters' homeowner calls count toward the
> same goal. Migration `0060_call_goals.sql` must be applied for per-person
> goals and the leaderboard switch; without it everything else works with a
> goal of 100.

Goal: make cold calling (`/app/calls`, callers + setters) and appointment
setting (`/app/leads`, setters) feel like a game you want to keep playing.
Three levers: **a visible goal that moves on every call** (100 calls/day),
**fewer clicks between calls**, and **charts and rewards that make progress
feel real**.

Everything below sits on data we already record. No fake numbers: every
counter is a count of real rows.

---

## What exists today (verified in code)

| Piece | Where | Notes |
|---|---|---|
| Cold-call log | `prospect_call_attempts` (append-only, `caller_id`, `outcome`, `created_at`) | One row per logged call |
| Setter homeowner call log | `lead_activities` with `type = 'contact_attempt'` via `logContactAttempt` (`lib/actions/leads.ts`) | Free-text `body` outcome |
| Today's metrics | `getCallerDashboard()` in `lib/data/prospects.ts`, `computeMetrics()` + `dayBoundsInZone()` in `lib/calls/metrics.ts` | LA day boundary, already correct |
| Dashboard UI | `components/calls/caller-dashboard.tsx`: six static `KpiCard`s | No goal, no motion, admins don't see it |
| Call loop | `app/app/calls/[id]/page.tsx`, `CallWorkspace`, `OutcomeForm` | Already has "Save and open next" plus a phone action bar (Call · Log · Appt · Next) |
| Outcomes with **no required fields** | `requiredFieldsFor()` in `lib/calls/rules.ts` | `no_answer`, `left_voicemail`, `gatekeeper`, `spoke_with_dm`, `not_interested`, `wrong_number`, `duplicate` can be one tap |
| Chart library | none in `package.json` | Build charts as small hand-written SVG components, so no new dependency |

Most calls end in no answer or voicemail. Those outcomes need no extra
fields, so the biggest friction win is **one tap: save and load the next
prospect.**

---

## Phase 1: The 100-call goal HUD (biggest dopamine per line of code)

**Daily goal ring.** A sticky bar (or card) on every `/app/calls*` page and on
`/app/leads*` for setters:

- A big ring or progress bar: **`47 / 100`**. The number counts up
  (requestAnimationFrame tween, ~400ms) every time it changes.
- Milestone pops at 10 / 25 / 50 / 75 / 100: a toast ("Halfway there 🔥"),
  a short confetti burst (CSS/canvas, no library), and the ring changing
  color: slate → blue → violet → gold at 100.
- **Pace line**: "On pace for 112 by 5:00 PM" or "Need 9/hr to hit 100".
  The math is attempts ÷ elapsed working hours, projected to the end of the
  workday (default 8:00–17:00 LA, configurable).
- **Streak chip**: "🔥 4-day streak", meaning consecutive workdays that hit
  the goal (weekends skipped).
- Past 100, the ring shows overflow ("112 / 100 · +12 bonus").

**What counts as a call:**
- Callers: today's `prospect_call_attempts` where `caller_id = me`.
- Setters: the above **plus** today's `lead_activities` rows with
  `type = 'contact_attempt'` and `actor_id = me`. Both are real dials.

**Instant update.** After `logCallOutcome` / `logContactAttempt` succeeds,
bump the counter optimistically on the client (`useOptimistic` or a small
context), then let `revalidatePath` reconcile it. The number must move
*before* the next prospect finishes loading. That moment is the reward.

**Daily goal setting.** Migration `0059_daily_call_goal.sql` (check that the
highest migration number is still 0058 first):
`alter table profiles add column daily_call_goal int not null default 100
check (daily_call_goal between 1 and 1000);`. Admins edit it per person from
Team; callers and setters see it read-only.

**Admins** get the same HUD for themselves when they call, and a team strip
on `/app/calls`: one mini ring per caller.

## Phase 2: Frictionless call loop

1. **One-tap outcomes.** In `OutcomeForm`, the outcomes with no required
   fields (list above) become big buttons that **submit immediately and go
   to the next prospect**. No select, no Save button. Outcomes that need
   fields (callback, interested, booked, DNC) keep today's reveal-fields
   flow.
2. **Keyboard shortcuts** (desktop): `C` call (opens `tel:`), `1` no
   answer, `2` voicemail, `3` gatekeeper, `4` spoke with DM, `5` callback,
   `6` interested, `7` booked, `8` not interested, `N` / `→` skip,
   `Enter` save & next. Show a small `?` cheatsheet overlay. Disable the
   shortcuts while focus is in a text field.
3. **Power Dial mode** (`/app/calls/dial`, or a "Start power hour" button):
   opens the first due prospect in My list. After every save it lands on the
   next one with the HUD and a session timer ("Power hour · 23 calls ·
   38:12"). Optional setting: auto-open the `tel:` link when a prospect
   loads (off by default).
4. **Prefetch the next prospect.** `router.prefetch(nextHref)` on mount, so
   Save & next feels instant.
5. **Undo instead of confirm**: after a one-tap save, show a 5-second
   "Logged No answer · Undo" toast. This needs an `undoLastAttempt` action
   that deletes the caller's own latest attempt within N seconds and restores
   the prior disposition. Attempts are append-only today, so this needs an
   explicit, narrow RLS/service-role path. Alternatively, skip undo for v1.
6. **Setter homeowner side**: the same loop on `/app/leads`. Add a "Next
   lead to call" button (oldest `new`/`contact_attempted` lead the setter can
   see) and one-tap No answer / Voicemail / Reached chips that call
   `logContactAttempt` and advance.

## Phase 3: Dopamine charts (`/app/calls/stats` or on the dashboard)

All hand-written SVG, following `DESIGN_SYSTEM.md` tokens, with light and
dark mode:

- **Today by hour**: bars per hour, with a ghost overlay of your best day
  ("beating your best day by 6 at 11 AM").
- **14-day goal heatmap**, GitHub style: a cell per day, filled by
  calls ÷ goal, gold border when the goal was hit.
- **Funnel**: Dials → DM conversations → Interested → Booked, today vs.
  7-day average, using `computeMetrics` so the definitions never drift.
- **Personal bests** cards: most calls in a day, most DMs in a day, longest
  streak, fastest 25 calls. "NEW PB" badge when one is beaten today.
- **Sparkline** inside each KPI card (7-day trend) so the existing cards
  feel alive.

Data: one query for the last 30 days of the caller's attempts
(`outcome, created_at`), bucketed in TypeScript with `dayBoundsInZone`.
Add an index on `prospect_call_attempts (caller_id, created_at)` if one
doesn't exist yet.

## Phase 4: Rewards and social

- **Booking = jackpot.** `appointment_booked` gets its own celebration
  (bigger confetti, "💰 Appointment booked" banner, +1 on a "Booked this
  week" counter). It's the outcome that makes money, so it should feel like
  it.
- **Combo / hot streak**: three DM conversations in a row → "🔥 On fire"
  chip until the next no-answer.
- **Badges** (computed, not stored): First 100, 5-day streak, 10 bookings,
  Early bird (25 calls before 10 AM). Show them on a profile strip.
- **Leaderboard** (admin toggle, off by default): today / this week, calls
  and bookings, for callers and setters.
- **Sound** (off by default, toggle saved in localStorage): a soft tick per
  call, a chime per milestone, a cha-ching per booking.

## Guardrails

- **Real counts only.** Optimistic bumps always reconcile with the server.
  Never count skips. Never reward a log on a DNC prospect (already blocked
  in `rules.ts`).
- **Anti-gaming.** Repeated logs on the same prospect within 60 seconds
  count once toward the goal (dedupe when counting, without blocking the
  log).
- **Accessibility.** Respect `prefers-reduced-motion` (no confetti or
  tween, just the number), keep `role="status"` live regions for milestone
  text, and don't use color alone.
- **RBAC.** Don't add sidebar nav items for setters: their nav is pinned to
  five sections by `tests/setter-access.test.ts`. The HUD goes in the
  calls/leads layouts, and stats are a sub-tab in `CallsSubnav`. Any new
  page uses `requireCallWorkspace()`. Callers never see homeowner leads.
- **Timezones.** Every "today" uses `dayBoundsInZone` (LA).
- **Mobile first.** The HUD collapses to a slim progress bar under the top
  bar on phones, and the action bar keeps working.

## Suggested build order (small PRs)

1. `lib/calls/goals.ts` (pure: pace, streak, milestone, dedupe) with
   vitest tests, the `daily_call_goal` migration, and `GoalHud` with
   count-up + milestones on `/app/calls`.
2. One-tap outcomes, keyboard shortcuts, next-prefetch.
3. Setter homeowner counting + the "Next lead" loop on `/app/leads`.
4. Stats page: hourly bars, heatmap, funnel, personal bests.
5. Booking jackpot, combos, badges, sound, opt-in leaderboard.
6. Update `HOMEQUOTE_CONTEXT.md` §7 after each PR.

---

## Copy-paste prompt for the build session

> Read `CLAUDE.md`, `HOMEQUOTE_CONTEXT.md` (§5 Roles, §7 Prospecting/Calling)
> and `docs/calling-dopamine-plan.md`. Implement **Phase 1 and Phase 2** of
> that plan for the calling workspace:
>
> 1. Add `lib/calls/goals.ts`: pure functions for daily goal progress,
>    pace projection (working hours 8:00–17:00 America/Los_Angeles), goal
>    streak over workdays, milestone detection (10/25/50/75/100), and
>    60-second same-prospect dedupe. Unit-test it in `tests/`.
> 2. Add migration `0059_daily_call_goal.sql` (confirm the highest existing
>    number first): `profiles.daily_call_goal int not null default 100`
>    with a 1–1000 check. Let admins edit it per person on the Team page.
> 3. Extend `getCallerDashboard` to return goal, today's count (setters
>    also count today's `lead_activities` `contact_attempt` rows by
>    `actor_id`), pace, and streak. Show it to admins too.
> 4. Build a client `GoalHud` component: progress ring `N / goal` with a
>    count-up animation, color tiers, milestone toast + lightweight confetti
>    (no new npm deps), pace line, streak chip, overflow past 100. Respect
>    `prefers-reduced-motion`. Mount it on every `/app/calls*` page (and
>    `/app/leads*` for setters) without adding nav items:
>    `tests/setter-access.test.ts` must still pass. The count must bump
>    optimistically the moment an outcome is saved.
> 5. In `components/calls/outcome-form.tsx`, make the outcomes with no
>    required fields (per `requiredFieldsFor` in `lib/calls/rules.ts`)
>    one-tap: submit immediately and advance to the next prospect. Add
>    desktop keyboard shortcuts (C, 1–8, N, Enter) with a `?` cheatsheet,
>    disabled while typing. Prefetch the next prospect on mount.
> 6. Match the existing code style (comment density, Tailwind tokens from
>    `DESIGN_SYSTEM.md`, server actions pattern). Run `npm run lint`,
>    `npx tsc --noEmit`, and `npm test`, and check the result in the browser
>    on desktop and phone widths. Update `HOMEQUOTE_CONTEXT.md` §7. Commit
>    and push to the working branch; don't open a PR unless asked.
