# Funnel builder architecture

> **Future funnel-builder work must extend this architecture instead of
> creating competing funnel, submission, analytics, or lead-routing systems.**

## What this is

A no-code way to create, edit, duplicate, publish and report on the homeowner
lead funnels at `/estimate/[slug]` — build in `/app/funnels/[id]/builder`
instead of hand-editing a JSON file and running `scripts/funnels.mjs`. It
integrates with — and does not duplicate — HomeQuote's existing lead, CRM,
contractor and analytics architecture.

## Key decision: no funnel_steps / funnel_step_options / funnel_logic_rules tables

`funnels.config` (`jsonb`, validated by `lib/funnels/schema.ts`'s
`funnelSchema`) already **is** the steps/branching/branding/routing/calendar
model. Every consumer is built on it: the public renderer
(`components/funnels/funnel-experience.tsx`), session persistence and lead
creation (`save_funnel_session`), analytics (`funnel_report`), CRM/Calendly
delivery, and RLS. A step is a `questions[]` entry; an option is
`question.options[]`; branching logic is `showWhen`. Building a second,
normalized step-table system on top of this would be exactly the "parallel
lead/form system" a no-code builder must not create.

**The builder edits and validates this same JSON**, through server actions
(`lib/actions/funnel-builder.ts`), using pure helper functions
(`lib/funnels/builder.ts`: `addQuestion`, `removeQuestion`, `moveQuestion`,
`duplicateQuestion`, `addOption`/`removeOption`/`moveOption`,
`previewAdvance`). Nothing about the storage shape changed to build this.

If a future need (e.g. a text/date/address step type) truly can't fit this
model, extend `questionSchema`/`funnelSchema` in `lib/funnels/schema.ts` and
the corresponding render branch in `funnel-experience.tsx` — don't add a
parallel table.

## Funnel lifecycle

`funnels.status`: `draft -> published -> archived`, with `archived ->` back to
`draft` to resume editing. Migration `0019_funnel_builder.sql` adds this
column and keeps the legacy `published` boolean (which the public renderer,
`funnel_report`, and `scripts/funnels.mjs` already read) in sync in both
directions via `sync_funnel_status()`, so nothing downstream needed to change.

- **Draft**: editable in the builder; not served at `/estimate/[slug]`
  (`getFunnel()` only returns `published = true` rows) — a real visitor gets
  a 404, never a half-built form.
- **Published**: served publicly. `setFunnelStatusAction` re-validates the
  funnel's *currently saved* config against `funnelSchema` before allowing the
  transition, so a broken draft can never go live from the dashboard.
- **Archived**: unpublished (stops taking new visitors) but its config, leads
  and analytics are all kept; nothing is deleted.

**Editing a published funnel is safe** because every session snapshots its
config at creation (`funnel_sessions.config_snapshot`, from migration 0012):
a visitor mid-funnel keeps the questions they started with even if an admin
publishes a change under their feet. There is no separate version history
beyond that snapshot — if that's ever needed, add a `funnel_versions` table
that stores past `config` values, rather than reworking this snapshot.

## Step types (current)

Only `choice` (single-select cards) and `zip` are implemented — covering the
service-selection, branching and location questions of every existing funnel
(the pool demo, Pool Masters, and all 12 `content/funnels/templates/*.json`
niche starters). Contact info (name/phone/email + consent) is a **fixed**
step, not a generic input type, so its TCPA consent, honeypot and validation
(`contactSchema`) can't be edited away by mistake. Welcome/info screens are
just a `choice` question with one `featured` option — no separate type
needed.

**Not built** (see Known limitations): multi-select, free-text, number,
date/time, address, image-choice steps, and answer sounds. To add a new step
type: extend `questionSchema.type` in `lib/funnels/schema.ts`, add its render
branch in `funnel-experience.tsx`, add its settings panel in
`components/funnels/builder/funnel-builder.tsx`'s `StepSettings`, and extend
`previewAdvance`/`sanitizeAnswers`/`visibleQuestions` if it needs new
validation.

## Conditional logic

A step's `showWhen: [{ question, operator, values }]` (operators: `equals`,
`not_equals`, `in`; ANDed) can only reference an **earlier** question —
enforced by `funnelSchema`'s `superRefine` and by the builder itself:
`removeQuestion` drops any branch that pointed at the removed question, and
`moveQuestion` drops any branch that would now point at a *later* question
(both covered by `tests/funnel-builder.test.ts`). Qualification rules
(`qualificationRules`) use the same condition shape, evaluated against every
question's answer, AND'd with the ZIP service-area check
(`serviceArea.zipCodes` exact matches, `serviceArea.zipPrefixes` 3-digit
region matches).

## Templates

`funnel_templates` (migration 0019) stores reusable starting configs.
`scripts/seed-funnel-templates.mjs` seeds it from the JSON already in the
repo (`content/funnels/pool-remodeling.json` + the 12
`content/funnels/templates/*.json` niche starters). "Create funnel -> Start
from" (`components/funnels/builder/create-funnel-form.tsx` ->
`createFunnelAction`) copies a template's `config` into a **new** `funnels`
row with a new id and a freshly generated unique slug — the template row
itself is never mutated or run directly. A template's placeholder
`clientName`/`serviceArea.label` are overridden by what the admin typed; the
rest (ZIP list, branding, calendar) is finished in the builder afterward.

## Lead routing

Contractor/vertical assignment lives on the `funnels` row itself
(`contractor_id`, `vertical_id`), not in the JSON config — it's routing, not
funnel content — edited via `saveFunnelRouting`. `contractor_id = null` is a
**house funnel**: HomeQuote owns the lead (lands unassigned in the Leads
inbox; staff distribute it, possibly to several contractors — see
`docs/` migration `0013_house_funnels_private_sharing.sql` for the
private-sharing rules that keep one contractor from seeing another's notes on
a shared lead). `contractor_id` set is a **client funnel**: its lead is
recorded against that contractor inside HomeQuote (tracking/billing), but per
migration `0016_lead_review_distribution.sql` **no one is emailed
automatically** — a person qualifies the lead and an admin clicks "Send lead"
to actual recipients (`lead_recipients`, `distribute_lead()`).

Every submission still goes through the one existing entry point,
`save_funnel_session` (`supabase/migrations/0012...0016` and now `0019`,
which only adds authorship/status/template columns — it does not touch lead
creation): create/reuse the lead by normalized email/phone, assign it to the
funnel's contractor (if any), record the answers/attribution as a
`lead_activities` entry, log a `lead_intake_events` row, and queue a CRM
delivery if an integration is configured. The builder never bypasses this
function or writes to `leads`/`lead_assignments` directly.

## Completion actions / calendar

Configured per funnel via `calendarProvider` (`ghl` | `calendly`) +
`calendarUrl`/`calendarId`/`calendarHeadline` in the config, editable in the
builder's Calendar panel. No calendar configured -> thank-you screen only.
`ghl` embeds a GHL calendar and waits for a signed server callback
(`/api/funnels/[slug]/booking`); `calendly` embeds Calendly inline
(prefilled name/email/UTMs) and listens for its `calendly.event_scheduled`
postMessage, verified server-side (`record_calendly_booking`, optionally
against the real Calendly API with `CALENDLY_API_TOKEN`). A house funnel
(unassigned lead) has no calendar step — there's no contractor's calendar to
book yet.

## Analytics

Unchanged, and already covers most of the brief's asks: `funnel_events`
(`landing_view`, `session_started`, `step_viewed`, `step_completed`,
`contact_submitted`, `qualified`, `calendar_viewed`, `appointment_booked`)
and the `funnel_report(funnel_id, since)` RPC (stage funnel + per-question
view/complete/dropoff, `showed`/`sold` from the existing outcome tables). The
dashboard (`/app/funnels`) already renders this per funnel; the builder adds
create/edit/duplicate/publish/archive/copy-link/search around it. Ad-click
totals remain intentionally unavailable until a real ad-platform import
exists (see `FUNNELS.md`).

## Attribution

Unchanged (`captureAttribution` in `lib/funnels/schema.ts`): UTMs, fbclid,
gclid, landing URL and referrer are captured once per session and persisted
with the lead/activity. Not duplicated by the builder.

## Security / RLS

`funnels`/`funnel_sessions`/`funnel_events`/`funnel_deliveries`/
`funnel_bookings` RLS (migration 0012) is unchanged: only `is_admin()` can
read builder/admin data; the public `/estimate/[slug]` route never queries
these tables directly — it goes through the service-role-only
`getFunnel`/`getSession`/`save_funnel_session` functions in
`lib/funnels/server.ts`, which check the token-hashed session cookie, not a
Postgres role. `funnel_templates` (new) has the same `is_admin()`-only
policy. A contractor login can never reach any of this — the funnel builder
is staff-only.

## Public renderer / performance

Unchanged: `app/estimate/[slug]/page.tsx` still only imports
`getFunnel`/`FunnelExperience` — no builder code, no admin data ships to a
real visitor. `FunnelExperience` gained a `previewMode`/`jumpToStep` prop
used **only** by the builder's live preview: no network session is created
and no lead is ever saved from the builder, but the exact same
conversion-critical UI/CSS a real visitor sees is what the admin previews
(no second renderer to keep in sync). Step navigation in preview is simulated
by the pure `previewAdvance()` helper, which mirrors the real PATCH
endpoint's rules exactly.

## Workflow automation (not yet wired in)

A separate effort defines a canonical `lead.created` workflow event
(`docs/workflow-automation-architecture.md`, merged to `main`). Its migration
and TypeScript contract (`workflow_events` table, `lib/workflows/`) are **not
yet merged** — the doc's own "Database" line still points at
`0017_workflow_automation_foundation.sql`, a number `0017` no longer has on
`main` (it's now `contractor_portal_permissions`; this funnel-builder feature
also had to renumber its draft `0018` to `0019` for the same reason). Whoever
finishes that work will need to pick a new migration number and fix that
doc's header. Until `workflow_events` exists, this feature does not insert
into it — see the comment at the top of
`supabase/migrations/0019_funnel_builder.sql` and inside
`save_funnel_session` for exactly where to add that one insert once it lands,
instead of building a second "lead created" signal. Until then, the existing
`lead_intake_events` row (`status = 'created'` vs `'duplicate'`) is the
closest existing signal.

## Known limitations

- Only `choice` and `zip` step types exist (see "Step types" above for how to
  add more). No drag-and-drop step reordering — up/down buttons instead
  (kept intentionally simple per the brief's "avoid a complex drag-and-drop
  canvas").
- No answer-sound / micro-interaction. Not implemented; add it as a per-step
  boolean in `questionSchema` plus a small client-side audio trigger in
  `funnel-experience.tsx`'s answer `onClick`, gated on an explicit click (not
  autoplay) if it's built later.
- No multi-step version history beyond the per-session config snapshot.
- Contractor/vertical assignment isn't versioned — changing it doesn't move
  already-created leads, and there's no audit trail of past assignments yet
  beyond `funnels.updated_at`.
- The builder's live preview approximates the real flow (see "Public
  renderer" above) but does not exercise the real session API, GHL/Calendly
  delivery, or lead creation — that's intentional (nothing should be created
  while editing), but it means the true end-to-end path is only fully
  exercised by publishing and testing the live `/estimate/[slug]` URL.
- **Found during this work, not caused by it and not fixed here**: migration
  `0017_contractor_portal_permissions.sql` (contractor owner/staff
  permissions, landed on `main` after this feature's private-sharing work in
  `0013_house_funnels_private_sharing.sql`) redefines the `lead_activities`
  RLS select/insert policies, and `tests/funnels-house-db.test.ts`'s "shows
  each contractor only their own side of a shared lead" test now fails
  against that combination. Needs reconciling `activity_visible_to_contractor`
  (0013) with 0017's owner/staff model in a follow-up migration.
