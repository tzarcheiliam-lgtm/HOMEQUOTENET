# Meta Ads Studio — setup, activation and rollback

Migration **0043** (depends on **0042**). Everything ships **dormant**: live writes OFF, automation STOPPED, every rule OFF,
every ad account read-only. Nothing in this release publishes an ad, changes a budget, sends a conversion event or enrolls
historical data. Read `docs/meta-ads-setup.md` first — it covers the reporting import and conversion feedback this builds on.

## How the pieces fit

| Layer | Migration | What | Where |
|---|---|---|---|
| Analytics + feedback | 0042 (was drafted as 0041) | Marketing API mirror (accounts, campaigns, ad sets, ads, daily insights), outcome ledger, conversion-event outbox, delivery switch | `/app/meta-ads`, `/setup`, `/events`, `POST /api/meta/tick` |
| Studio (this doc) | 0043 | Pages/Instagram/datasets/forms, creative library, paused ad creation, audits, change proposals, optimization rules, activity log | `/app/meta-ads/{creatives,create,audits,rules,settings}`, `POST /api/meta/studio-tick` |

One area, one nav entry ("Meta Ads"), one set of tabs (`app/app/meta-ads/layout.tsx`). The Studio **reads** the analytics tables
(`meta_ad_accounts`, `meta_campaigns`, `meta_adsets`, `meta_ads`, `meta_insights_daily`, `meta_settings`,
`lead_outcome_events`, `meta_conversion_events`) and never writes them, except `meta_object_state` which is its own.
Account → contractor mapping stays on `meta_ad_accounts.contractor_id` (analytics); the Studio adds the same explicit mapping for
Pages / datasets on `meta_assets.contractor_id`. There is one Graph client for reading (`lib/meta/marketing-api.ts`); the only
state-changing client is `lib/meta/studio/write-api.ts`.

## Migration numbering and merge order

Three branches wanted 0041. Resolved without renaming anything that was applied to a shared database:

1. `0041_visual_workflow_builder.sql` — already on `main`. **Keeps 0041.**
2. `0042_meta_ads_analytics_outcomes.sql` — the analytics branch (`claude/busy-lovelace-xzm9j9`, commit `3ee4c96`) originally called it
   `0041_meta_ads_analytics_outcomes.sql`. It was **not applied anywhere** (its own docs say so), so it was renamed to 0042 on the
   `meta-ads` branch (`git mv`; tests and docs updated).
3. `0043_meta_ads_studio.sql` — this work.

`meta-ads` already contains `3ee4c96` plus a merge of `main` at `97129b1`, so **merging `meta-ads` into `main` brings in both Meta pieces
and the rename in one step.** Do not also merge `claude/busy-lovelace-xzm9j9` separately: it would re-add the 0041-named file. If that
branch's session merges first anyway, delete its `0041_meta_ads_analytics_outcomes.sql` and keep 0042.

Apply in order **0041 → 0042 → 0043**. Before applying, confirm what production has already run (do not re-run or rename an applied file):

```sql
select version, name from supabase_migrations.schema_migrations where version >= '0037' order by version;
```

All three migrations are idempotent (`if not exists` / `drop ... if exists`).

## What Meta requires (verified against developers.facebook.com on 2026-10-07)

- **Graph / Marketing API version:** v26.0 (released 2026-07-29). Set `META_GRAPH_VERSION` only to override.
- **Creating campaigns, ad sets, creatives and ads** needs the `ads_management` permission; Meta lists `pages_read_engagement` and
  `pages_show_list` as its dependencies. Meta's "Create & manage ads" use case also lists `business_management`. Reading Instant Form
  details uses `leads_retrieval` (already used by the lead webhook). **Confirm the exact set in your App Dashboard use case** — Meta
  changes this list; the app was not inspected.
- **Access tier:** Meta renamed Ads Management Standard Access to the *Marketing API Access Tier* (May 2026): "Limited Access" (Live
  mode + verified Business) and "Full Access" (App Review). **Managing ad accounts your own Business owns works with a System User.
  Managing other businesses' ad accounts (contractors who own their accounts) requires Full / Advanced Access via App Review and
  Business Verification.** Connecting your own Business does **not** authorize you to manage anyone else's — HQN does not imply
  otherwise, and nothing in this release attempts it.
- **Campaign API surface used:** objectives `OUTCOME_LEADS` and `OUTCOME_TRAFFIC`; `special_ad_categories` must be `NONE` (restricted
  categories are refused); ad set `optimization_goal` ∈ `LEAD_GENERATION`, `QUALITY_LEAD`, `OFFSITE_CONVERSIONS`, `LINK_CLICKS`,
  `LANDING_PAGE_VIEWS`; `destination_type` `ON_AD` (Instant Form) or `WEBSITE`; `promoted_object.page_id` for lead generation; all
  objects created `PAUSED`. Advantage+ Shopping / App campaign creation is no longer available through the API and is not offered.
- **Not verified from Meta's own pages (treat as open):**
  1. *Budget units.* The reference does not state whether `daily_budget` is in minor units. HQN sends minor units (USD → cents) and
     shows the exact value on the review screen. **Confirm with one paused test ad before any live use.**
  2. *Image/video limits.* Meta's creative-spec pages could not be fetched; limits come from consistent secondary sources
     (JPG/PNG ≤ 30 MB; MP4/MOV ≤ 4 GB; video ≥ 1 s). Only clearly unusable files are hard errors; recommended sizes/ratios are warnings.
     One place to edit: `SPEC` in `lib/meta/studio/creative-specs.ts`.
  3. *Which `instagram_user_id` / `lead_gen_form_id` field names your API version expects on creatives.* The payload preview shows what
     will be sent; the first paused test confirms it.
  4. *Whether a System User token can list a Page's `leadgen_forms`.* If not, discovery records the error per Page and the form picker is empty.

## Environment variables

| Name | Where | Purpose |
|---|---|---|
| `META_MARKETING_ACCESS_TOKEN` | Vercel (server) | Existing. Read-only System User token (`ads_read`) — reporting, asset discovery, live state. |
| `META_ADS_WRITE_TOKEN` | Vercel (server) | **New.** System User token with `ads_management`, assigned only to the ad accounts/Pages HQN may change. Absent = every write path reports "Setup required". Kept separate so reporting stays low-privilege. |
| `META_TICK_SECRET` | Vercel + GitHub secret | Existing. Also authorizes `POST /api/meta/studio-tick`. |
| `META_STUDIO_TICK_URL` | GitHub secret | **New.** `https://<production domain>/api/meta/studio-tick` for `.github/workflows/meta-studio-tick.yml` (hourly). |
| `META_GRAPH_VERSION`, `META_APP_ID`, `META_APP_SECRET`, `META_CONVERSIONS_API_TOKEN` | Vercel | Existing; unchanged. |

Secrets live only in server environment variables. They are never stored in the database, shown in the UI, or written to the activity log
(error text is redacted; a test asserts no UI module references a token variable).

## Supabase storage

Migration 0043 creates the private bucket `meta-creatives` (no public access, no storage policies — only signed URLs minted by
admin-checked server code). Confirm in Supabase → Storage that it exists and that the project's **upload size limit** is high enough
for the videos you intend to upload (the free-plan default is far below Meta's 4 GB cap).

## Activation sequence (each step is reversible; stop at any point)

1. Merge `meta-ads` → `main`; apply 0041 (if not already), 0042, 0043 to **staging first**, then production. Deploy.
2. Set `META_MARKETING_ACCESS_TOKEN` (if not set). Meta Ads → Setup → **Sync now**. Map each ad account to a contractor (or leave as network).
3. Meta Ads → Activity & settings → **Discover Pages, datasets, forms and live state**. Map each Page and dataset to its contractor.
4. Set audit thresholds you actually believe in (blank = "Not assessed"). Run an **audit** (Audits & Recommendations). Read-only.
5. Create rules in **Recommend only** mode and enable them; review the recorded evaluations for a few days. Still read-only.
6. Upload creatives; build a **draft** ad and review the exact payloads. Still nothing sent.
7. Set `META_ADS_WRITE_TOKEN` + GitHub secret `META_STUDIO_TICK_URL`. In Settings: turn **Live writes ON** (type `ENABLE META WRITES`) and enable writes for **one** ad account.
8. Confirm a draft (type `CONFIRM`) → **Create PAUSED objects in Meta** for a throwaway ad. Check it in Ads Manager (budget units, targeting,
   Instant Form, URL tags). Delete it in Ads Manager.
9. Only then consider approval-mode rules/proposals. Automatic rules last: they require the global **Release automation stop** (type
   `START AUTOMATION`), the per-account switch, a rule with an expiry date, and typing `ENABLE AUTO` per rule — and can only pause or
   decrease budgets.

## Rollback

- **Immediate stop of everything HQN can do to Meta:** Settings → Live writes → *Turn OFF*. Drafts, rules and audits keep working read-only.
- **Stop automation only:** Settings → HQN automation → *Stop*. This does **not** pause ads already running in Meta; use Ads Manager or an approved proposal for that.
- **Single rule:** Rules → Disable (or Delete). Changing a rule's behaviour auto-disables it and bumps its version.
- **A paused ad HQN created:** delete/archive it in Ads Manager (HQN never deletes anything in Meta). Draft rows remain as history.
- **An applied change:** the previous live values are stored on the proposal. Reversing is a **new proposal** that needs approval. Spend already
  incurred and delivery already affected cannot be undone.
- **Code:** revert the merge. The migrations are additive; leaving the tables in place is harmless. To remove them, drop in reverse order
  (`meta_*` Studio tables, then 0042's) — only after confirming nothing else references them.

## How the safety rules are enforced (and tested)

- *No Meta write without all of:* write token present, global live-writes ON, per-account writes ON, a confirmed draft/approved proposal
  (`lib/meta/studio/gate.ts`). Tested in `tests/meta-studio-create.test.ts`.
- *No duplicate objects:* atomic `claim_meta_draft` / `claim_meta_proposal` (SQL), unique idempotency keys, one open proposal per target,
  tagged object names + find-before-create, POSTs never auto-retried. Tested with a fake Meta that times out after creating.
- *No silent overwrite of Ads Manager edits:* proposals re-read live state and go `stale` on any difference; hourly state sync flags external changes.
- *Rules:* owner-defined thresholds, minimum evidence, data freshness, conversion-lag exclusion, cooldown, per-day limit, max adjustment,
  floor/ceiling, budget-owner awareness, conflict detection, suspension on stale data / failing credentials / unverified tracking, no fallback from a
  quality metric to clicks, auto never raises budgets, auto requires expiry. Tested in `tests/meta-studio-rules.test.ts`.
- *Spend:* a periodic job cannot promise an exact ceiling. Use Meta's own account spending limit / campaign spend cap; the Settings page has a note
  field for it.

## Audit methodology and licence

`lib/meta/studio/audit.ts` (`hqn-meta-audit/1.0.0`) adapts the *contract* of the **claude-ads** skill v2.0.1 (MIT, © 2026 agricidaniel; `ads/references/meta-audit.md`,
`scoring-system.md`): controls return `unknown`/`not_applicable` without evidence, no universal thresholds, recommendations carry baseline /
mechanism / confidence / next step / measurement window. Its numeric score and benchmarks were deliberately **not** imported (no supportable
baseline here). The skill's scripts were not run. The MIT notice is reproduced in the source header. An LLM-written narrative layer is **not**
included: it would need a paid provider key (Anthropic API or other; subscription credits do not cover app calls) — decide provider, data handling
and cost before adding one.

## Known limits

- No OAuth "connect with Facebook" flow. Accounts are connected by System User tokens (the existing approach). Letting contractors connect their own
  accounts needs App Review first; build it after approval.
- Organic Page/Instagram posting is **not** implemented and not implied.
- Editing a draft requires re-entering its schedule times.
- Creative thumbnails for videos come from a browser-captured frame; images are shown directly. No server-side transcoding exists.
- Funnel-step performance, creative fatigue (frequency) and Events Manager diagnostics (EMQ, deduplication report) are **Not assessed** in audits.
- Account-level audits include all Meta-signalled HQN leads (ad id, campaign id, `fbclid`, or source = meta) unless the account is mapped to a contractor, in which case only that contractor's assigned leads.
