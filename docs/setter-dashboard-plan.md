# Appointment Setter Dashboard: "Hungry" Plan

Goal: when a setter opens `/app`, they should feel three things within a second:
**what they've earned, what they're leaving on the table, and exactly who to
call next to earn more.** The page is built around money, urgency and the next
action, not around counts.

Decisions already made (2026-10-27):
- Setters are paid **per appointment**.
- Each setter's **weekly booking goal is set by an admin**; there is no default.
- This sits alongside the existing 100-calls/day HUD (`HOMEQUOTE_CONTEXT.md`
  §34). Calls are the effort, bookings are the score, dollars are the reward.

---

## What the data says right now (production, last 30 days)

| Fact | Number | What it means for the design |
|---|---|---|
| Active setters | 2 | The leaderboard is a head-to-head; frame it as a duel |
| New homeowner leads | 29 (27 website, 2 Meta) | Not enough fresh leads to fill a day |
| Leads still waiting for a first contact | 0 | Fresh leads alone can't make a setter "hungry" |
| Median time to first contact | ~13 s | Automatic texting already makes the first touch; setters must win the *conversation*, not the race |
| Appointments | 5, **none created by a setter** | Bookings come from funnels/Calendly; setters get no credit today |
| Appointments marked held / no-show | **0 of 5** | Outcomes are never recorded, so "earned" can't be computed honestly yet |
| Per-appointment price on any pricing agreement | none set | The contractor-side $125 isn't recorded in the DB yet |

**Takeaways:**
1. The dashboard must **create work**, not just display it: re-engage stale
   leads, confirm and rescue appointments, rebook no-shows, and route to the
   contractor cold-call pool when homeowner leads run dry.
2. **Outcome tracking is a prerequisite.** Without held/no-show, every money
   number is a guess. Phase 0 fixes this.
3. **Attribution must be explicit.** We need to know which setter earned which
   booking, including when a funnel booking was really closed by a setter.

---

## Phase 0: Make the money real (prerequisite)

1. **Per-setter pay settings** (migration `0061_setter_pay.sql`):
   - `profiles.pay_per_appointment numeric(10,2)` (null = not set)
   - `profiles.pay_per_sales_appointment numeric(10,2)` (contractor sales calls
     booked from the cold-call side, `prospect_sales_appointments.partner_id`)
   - `profiles.weekly_booking_goal integer` (null = no goal shown)
   - All three are admin-only, through the same `guard_profile_privileges()`
     pattern as `daily_call_goal`.
   - `call_workspace_settings.pay_basis text check in ('booked','held')`,
     default `'held'`. Paying on *held* stops junk bookings. The dashboard shows
     **pending** money (booked, not yet held) and **earned** money (held).
2. **Attribution**: `appointments.set_by uuid references profiles`.
   - It defaults to `created_by` when the creator is a setter or admin.
   - It's editable by an admin ("Credit this booking to…") for funnel bookings
     a setter actually closed.
   - Backfill: `set_by = created_by` where the creator's role is setter or admin.
   - Index `(set_by, scheduled_at)`.
3. **Outcome capture**, so held/no-show actually gets recorded:
   - The day after `scheduled_at`, the appointment shows on the setter's
     dashboard and the contractor's home as **"Did it happen?" → Held /
     No-show / Rescheduled**, one tap each.
   - Contractor confirmation wins; setter-marked outcomes show as "unconfirmed".
   - An admin "Outcomes overdue" count on the admin dashboard.
4. **Pay audit**: every pay-rate or credit change writes `audit_logs`
   (`user.pay_rate`, `appointment.credit`).

## Phase 1: The money hero (top of `/app` for setters)

A full-width card, the first thing on desktop and phone:

- **`$1,250 earned this month`**: big, emerald (money is the one color in
  the design system), with a count-up animation like the call HUD.
- Under it: **`$375 pending`** (booked, waiting to be held), then
  **"Next booking = +$125"**.
- **Weekly booking ring**: `3 / 10 bookings this week`, using the same
  `GoalRing` component (gold at the goal). It's hidden when the admin hasn't
  set a goal.
- **Pace line**: "On pace for 11 this week", or "Need 2/day to hit 10". Work
  week is Mon–Fri, measured in Los Angeles time.
- **Booking streak chip**: 🔥 consecutive workdays with at least one booking.
- **"Best week ever: $1,875"** personal-best line. When this week beats it:
  🏆 NEW PB.

## Phase 2: "Money on the table" queue (the core of hunger)

One ranked list under the hero: who to call right now, each row tagged with
what it's worth and why it's urgent. One tap to open the lead or prospect;
one-tap logging comes from the existing `ContactForm` / `OutcomeForm`.

Rows come from real queries, ranked by urgency × value:

| Row type | Source | Why it's urgent |
|---|---|---|
| 🔴 **Hot reply** | lead replied to a text and no human has called yet (`sms_conversations` / `sms_messages`, latest inbound) | They're engaged *right now*; minutes matter |
| 🟠 **Confirm tomorrow** | appointments tomorrow, not yet confirmed | Protects pending $ (a no-show pays nothing) |
| 🟠 **Rescue no-show** | `no_show` in the last 7 days | Rebooking turns $0 back into $125 |
| 🟡 **Callback due** | lead callbacks and prospect `next_callback_at <= now` | A promised call |
| 🟡 **Fresh lead, no conversation** | created < 48 h, contacted but no human call logged | Auto-text touched them; a call books them |
| 🔵 **Re-engage** | 7–90 days old, `contact_attempted`, never booked | "Still thinking about your pool?" Turns a dead list into bookings |
| ⚪ **Cold-call pool** | due prospects from `/app/calls` | When homeowner work runs out, there's always a next dial |

- Each row shows its **$ value**: the setter's pay rate, or the contractor
  sales rate for prospects. A header total reads **"$1,500 on the table today"**.
- **Speed timers** on hot replies and fresh leads count up from the moment
  they arrived ("4:12 since reply"), amber after 5 min and red after 15.
- An empty queue never dead-ends: it says "You cleared the board 🎉" and
  offers **Start power hour** into the cold-call pool.

## Phase 3: Competition and loss aversion

- **Head-to-head card** (when the leaderboard is on; it is now): "You $750 ·
  your teammate $875 — one booking takes the lead." With two setters, a duel beats a
  ranked table.
- **Weekly board** by bookings and $ earned, plus show rate (held ÷ booked),
  so quality counts too.
- **"Slipped away this week"**: leads that went 7+ days without contact, with a
  one-tap "Call now". The loss is framed as recoverable money, never as blame.
- **Monday recap** (first open each week): last week's $, bookings, show rate,
  rank, PBs, and this week's goal.

## Phase 4: Rewards

- **Booking jackpot** (exists): extend it to say the dollar amount
  ("💰 +$125 — $500 this week").
- **First booking of the day**: its own celebration.
- **Held confirmation**: when a booking flips to *held*, the setter gets a toast
  or push: "Tuesday's appointment was held: +$125 earned."
- **Badges** for setters: First $1K month, 5-booking day, 90% show rate (min 10),
  Rescue hero (3 no-shows rebooked), Speed demon (median reply-to-call < 2 min).
- **Push notifications** (the PWA push already exists, migration 0031) for hot
  replies and held confirmations only. Never more than these two kinds, so
  push stays meaningful.

## Admin side

- On the team board (`/app/calls/stats`) and each person's Team page: pay per
  appointment, pay per sales appointment and weekly booking goal, inline, next
  to the daily call goal.
- **Payout view** (`/app/calls/stats?view=payouts`): per setter, per week:
  booked, held, no-show, pending $, earned $, as a CSV export. It's the real
  number you pay from.
- "Credit to setter" on each appointment.
- An "Outcomes overdue" nudge.

## Guardrails

- **Honest money only.** Earned = held × the setter's rate at the time (store
  the rate on the appointment when credited: `appointments.setter_pay_amount`,
  so later rate changes never rewrite history). Pending is labelled as pending.
  Nothing is estimated or rounded up.
- **Privacy:** a setter sees their own $. The head-to-head shows the other
  person's $ only while the leaderboard is on. Admins see everyone's.
- **Quality over volume:** pay on *held* by default, show rate always visible,
  and no reward for bookings later marked cancelled within 24 h.
- **RLS:** new columns follow the existing guard. Reads that span users
  go through the service role with explicit user filters (same pattern as
  `lib/data/call-stats.ts`). The setter sidebar stays at its five sections
  (`tests/setter-access.test.ts`).
- **Reduced motion and accessibility**, as in the call HUD.

## Build order (small PRs)

1. **Phase 0**: migration 0061 (pay rates, weekly goal, `set_by`,
   `setter_pay_amount`, pay basis), backfill, outcome capture UI, admin
   inputs, payout view. Tests: PGlite migration and guard tests, plus
   attribution and earned/pending maths.
2. **Phase 1**: `lib/data/setter-dashboard.ts` and the money hero on `/app`
   (desktop and the phone `MobileHome`).
3. **Phase 2**: the money-on-the-table queue, with tested ranking in
   `lib/setter/queue.ts`.
4. **Phase 3**: head-to-head, weekly board, slipped-away, Monday recap.
5. **Phase 4**: rewards, badges, push for hot replies and held confirmations.
6. Update `HOMEQUOTE_CONTEXT.md` with each PR.

---

## Copy-paste prompt for the build session

> Read `CLAUDE.md`, `HOMEQUOTE_CONTEXT.md` (§5 Roles, §8 Lead & Appointment
> Flow, §34 Daily call goal) and `docs/setter-dashboard-plan.md`. Build
> **Phase 0 and Phase 1** of that plan:
>
> 1. Confirm the highest migration number (0060 at time of writing), then add
>    `0061_setter_pay.sql`:
>    - `profiles.pay_per_appointment`, `profiles.pay_per_sales_appointment`,
>      `profiles.weekly_booking_goal` (admin-only via `guard_profile_privileges()`);
>    - `call_workspace_settings.pay_basis` ('booked' | 'held', default 'held');
>    - `appointments.set_by` (backfilled from `created_by` for setter/admin
>      creators) and `appointments.setter_pay_amount` (rate snapshot at credit
>      time).
>
>    Test it with PGlite (`tests/helpers/full-migrations.ts`) like
>    `tests/calls-goals-db.test.ts`.
> 2. Add a one-tap "Did it happen? Held / No-show / Rescheduled" prompt for
>    appointments whose time has passed, for setters (their own bookings) and
>    contractors (their appointments). Contractor answers win. Audit every
>    change.
> 3. Admin inputs for the three per-person settings on the team board and
>    `/app/team/[id]`, plus a payout view with CSV export.
> 4. `lib/data/setter-dashboard.ts` (service role, explicit user filters,
>    `cache()`d) and a money hero at the top of the setter's `/app`:
>    - earned $ (held) and pending $ (booked);
>    - a weekly booking ring using `GoalRing`, hidden if no goal is set;
>    - a pace line, booking streak and best-week PB;
>    - on desktop and in `components/dashboard/mobile-home.tsx`.
>
>    Pure maths in `lib/setter/` with vitest tests.
> 5. Keep the setter sidebar at five sections (`tests/setter-access.test.ts`
>    must pass). Run `npx tsc --noEmit`, lint on changed files, and `npm test`.
>    Check it in a browser at desktop and phone widths. Update
>    `HOMEQUOTE_CONTEXT.md`. Commit and push to the working branch; open a PR
>    only if asked.
