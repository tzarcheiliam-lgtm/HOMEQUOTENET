# Meta Ads Studio — setup, verification status, activation and rollback

Everything described here ships **dormant**. A fresh deployment cannot create, change, pause or spend anything in Meta, send a
conversion event, or run an automatic rule until a person turns each switch on deliberately. Read `docs/meta-ads-setup.md` for the
reporting import and conversion-event delivery this builds on (that part is the analytics layer; this document covers the Studio).

Last verified against Meta's public documentation: **2026-10-07**. Meta changes these pages; re-check anything marked below.

---

## 1. What exists

| Layer | Migration | Purpose | Where |
|---|---|---|---|
| Analytics + outcome feedback | `0042_meta_ads_analytics_outcomes.sql` | Meta mirror (accounts, campaigns, ad sets, ads, daily insights), HQN outcome ledger, conversion-event outbox, delivery switch (default OFF) | `/app/meta-ads`, `/setup`, `/events`, `POST /api/meta/tick` |
| Studio | `0043_meta_ads_studio.sql` | Pages/Instagram/datasets/forms, creative library, paused ad creation, audits, change proposals, optimization rules, activity log | `/app/meta-ads/{creatives,create,audits,rules,settings}`, `POST /api/meta/studio-tick` |

One navigation entry ("Meta Ads"), one tab bar (`app/app/meta-ads/layout.tsx`). The Studio reads the analytics tables and never writes
them (it owns `meta_object_state` and its own tables). There is one read client (`lib/meta/marketing-api.ts`) and exactly one
state-changing client (`lib/meta/studio/write-api.ts`).

## 2. Branch and migrations — what to merge

- **Merge `meta-ads`** (the branch in the worktree `fullappcreator-meta-ads`). It contains, by ancestry: the visual workflow builder
  (PR #6, migration 0041), the analytics layer through `5a9fadd`, and the Studio. `integration/meta-ads-workflow` on origin is the same
  commit as the analytics branch tip (`5a9fadd`) — a subset of `meta-ads`, so do not merge it separately.
- Final migration set, in apply order: `0041_visual_workflow_builder.sql` → `0042_meta_ads_analytics_outcomes.sql` → `0043_meta_ads_studio.sql`.
  The old `0041_meta_ads_analytics_outcomes.sql` no longer exists anywhere in the tree. The analytics branch renumbered itself to 0042; nothing
  that was applied to a shared database was renamed.
- Check what a database already has before applying: `select version, name from supabase_migrations.schema_migrations where version >= '0037' order by version;`
  `scripts/staging/` contains a migration planner (`tests/migration-plan.test.ts` shows its use). All three files are idempotent.

## 3. Verification status — read this before trusting anything

| Level | Meaning | What is at this level |
|---|---|---|
| **Implemented** | Code exists and is wired to the UI | Everything in section 1 |
| **Locally tested** | Proven with fixtures, a fake Meta, a local database, or a browser against a fake Meta | See §3a |
| **Verified against live Meta** | Proven by a real request to Meta | **Nothing yet.** See §3b for exactly what needs a real test |

### 3a. Locally tested (and how)
- **Unit tests with fakes** (`tests/meta-studio-*.test.ts`): money conversion, request construction, creation/retry/idempotency, proposals, rules,
  audit, gates, media probing, redaction.
- **Local database** (in-process Postgres with every real migration, real row-level security): tenant isolation, atomic claims, constraints.
- **Real browser against the real app** (`scripts/e2e/meta-studio/run.mjs`): Playwright drives the actual Next.js app on desktop and 390px mobile,
  backed by a Supabase stand-in (real migrations + RLS) and a **fake Meta that is strict about documented fields and injects failures**. All outbound
  traffic except localhost is blocked. See `scripts/e2e/meta-studio/README.md`.
- **Request-construction contract** (`tests/meta-studio-contract.test.ts`): every field HQN sends is checked against field lists and enums copied from
  Meta's official reference pages. This proves HQN sends only *documented* fields with *documented* values. It does not prove Meta accepts the combination.

### 3b. Needs a real Meta test (open until you run the paused test in §8)
1. **Budget units.** Meta's currencies page documents the *offset* only for bids; no official page states the unit of `daily_budget` / `lifetime_budget`,
   and Meta's own sample code is ambiguous. HQN therefore **blocks every budget** until a person confirms, per ad account, that a paused probe ad's budget
   shows in Ads Manager exactly as entered (§8). A mismatch keeps budgets blocked.
2. **Which CTA is valid for which objective.** Official: lead ads allow only APPLY_NOW, DOWNLOAD, GET_QUOTE, LEARN_MORE, SIGN_UP, SUBSCRIBE (HQN enforces this).
   Website/traffic CTA eligibility "depends on the campaign objective" per Meta's Ads Product Guide, which was not reachable.
3. **`promoted_object` shape for lead ads.** The ad set reference says pass `page_id`; the lead-ads guide shows the Page id. HQN sends `{ "page_id": ... }`.
4. **Video cover image.** Official docs list `image_url` and `image_hash` on `video_data` without saying one is mandatory. HQN requires a cover frame and sends `image_hash`.
5. **Video processing status values.** `AdVideo.status` is a documented field but its values were not documented where reachable. HQN proceeds only when
   `status.video_status` is exactly `ready`, and otherwise stops with Meta's raw value.
6. **Manual placements.** The values for `publisher_platforms`, `facebook_positions`, `instagram_positions` are not documented where reachable
   (Meta's own SDK types them as plain strings). **Manual placements are disabled**; automatic placements only.
7. **Image/video file limits.** Meta's creative-spec pages could not be fetched. Hard errors are limited to unusable files (wrong type, 30 MB images,
   4 GB videos, <1 s video, unreadable header); everything else is a warning. Edit `SPEC` in `lib/meta/studio/creative-specs.ts` after checking Meta's Ads Guide.
8. **Whether a System User token can list a Page's lead forms** (`/{page}/leadgen_forms`). If not, discovery records the error per Page.
9. **Instagram identity.** `instagram_user_id` is the documented `object_story_spec` field ("the Instagram user account that the ad will be posted to").
   Whether your System User may use that Instagram account is an asset-assignment question only Meta can answer.

## 4. How the ad-creation contract was verified

Sources (official, fetched 2026-10-07): Campaign / Ad set / Ad creative reference pages; `object_story_spec`, `link_data`, `video_data`,
`call_to_action`, `call_to_action.value` references; **Lead ads guide** (`/guides/lead-ads/create`); Targeting reference; Currencies page; `adimages` and `advideos` references.

| Element | Official finding | HQN behavior |
|---|---|---|
| Campaign | `objective` ∈ `OUTCOME_*`; `special_ad_categories` required; create status `ACTIVE`/`PAUSED` | `OUTCOME_LEADS`/`OUTCOME_TRAFFIC`, `special_ad_categories: []`, `PAUSED`; any special category is refused |
| Ad set (lead ads) | `optimization_goal` `LEAD_GENERATION`/`QUALITY_LEAD`; `destination_type` `ON_AD`; `promoted_object` Page; `billing_event` `IMPRESSIONS`; budget on campaign **or** ad set | exactly that; budget at one level; a new ad set inside a campaign that has a campaign-level budget is refused |
| Ad set (website) | `destination_type` `WEBSITE`; `OFFSITE_CONVERSIONS` needs `pixel_id` + `custom_event_type` | same; dataset must be mapped to the contractor |
| Lead-ad creative `link` | "can only be `https://fb.me/`" | enforced |
| Lead-ad CTA | types limited to the six above; `value.lead_gen_form_id` | image: `value = {lead_gen_form_id}`; video: `value = {link: "http://fb.me/", lead_gen_form_id}` (as in the guide) |
| Image | `link_data` takes `image_hash` **or** `picture`, never both; `adimages` takes base64 `bytes` | `image_hash` only |
| Video | `video_data`: `video_id`, `message`, `title`, `link_description`, `call_to_action`, `image_url`/`image_hash`; `advideos` takes `file_url` | cover uploaded to `adimages`, referenced by `image_hash`; wait for `ready` before the creative |
| Instagram | `object_story_spec.instagram_user_id` | used only if chosen and mapped to the Page |
| Page permission | `page_id` needs Admin/Editor on the Page; token's user needs the `ADVERTISE` task on the Page | documented in §6 |
| Targeting | `geo_locations.countries` (≥1) / `regions[{key}]`; `age_min` ≥ 13 (default 18), `age_max` ≤ 65; `genders` `1`/`2` | 18–65 enforced (stricter than Meta's 13) |
| URL parameters | creative `url_tags` | HQN attribution parameters appended as `url_tags`, never overwriting parameters already on the URL |

## 5. Budget and money handling (item 2)

- **Currency table** (`lib/meta/studio/money.ts`) is copied from Meta's Currencies page: 11 currencies have offset 1 (CLP, COP, CRC, HUF, ISK, IDR, JPY, KRW, PYG, TWD, VND);
  every other listed currency has offset 100. **A currency not on the page (e.g. UGX) is refused.** (An earlier internal copy of this list was wrong — it omitted COP/CRC/IDR
  and included UGX; it is gone.)
- Conversion is exact decimal arithmetic. An amount that would need rounding (`25.005` USD, `100.5` JPY) is **rejected, not rounded**.
- The review screen, the recorded confirmation and the request body are all generated from the same integer, and tests compare them for every documented currency.
- Bids use the same table (documented). **Budgets additionally require the per-account unit check** (§8), also required before any budget proposal or rule can lower a budget.
- Sanity ceilings catch an extra zero (100,000 for cent-based currencies, 100,000,000 for whole-unit ones).

## 6. Credentials — three separate kinds, never mixed

| Purpose | Variable | Where | Scope |
|---|---|---|---|
| **Reporting access** (read-only import, asset discovery, live state) | `META_MARKETING_ACCESS_TOKEN` | Vercel (server) | System User token, `ads_read` on the ad accounts to report on |
| **Ad-management access** (create paused ads, apply approved changes) | `META_ADS_WRITE_TOKEN` | Vercel (server) | System User token, `ads_management` + `pages_manage_ads` + `pages_read_engagement` + `pages_show_list` (Meta's lead-ads guide), `business_management` as listed in Meta's "Create & manage ads" use case; assign **only** the ad accounts and Pages HQN may change; the token's user needs the `ADVERTISE` task on each Page |
| **Conversion-event delivery** | `META_CONVERSIONS_API_TOKEN` | Vercel (server) | Dataset (Events Manager) access token; used only by the outcome-event queue |
| Scheduler | `META_TICK_SECRET` (+ GitHub secrets `META_TICK_URL`, `META_STUDIO_TICK_URL`) | Vercel + GitHub | Authorizes `/api/meta/tick` and `/api/meta/studio-tick` |
| Optional | `META_APP_ID`, `META_APP_SECRET` | Vercel | Token-expiry display; webhook signature check |

Verified (tests + browser run): tokens are read only in server code; never in a `NEXT_PUBLIC_` variable, a client component, a database column, a URL or request
body (only the `Authorization` header); every stored or returned message passes through `redact()`, which removes token patterns **and the exact values of the
credentials the process holds**; the Studio code has no `console` logging; the reporting modules cannot import the write client; with only the write token set
the reporting options are empty, and with only the reporting token set no writer can be built. Tokens are not encrypted at rest because they are **not stored**
— they live only in the hosting platform's secret store. Rotate by changing the environment variable and redeploying; a revoked token shows as an authentication
failure and suspends rules.

Meta access tiers (verified): managing ad accounts your own Business owns works with a System User. **Managing other businesses' accounts requires Advanced / "Full"
Access via Meta App Review and Business Verification.** Connecting your own business does not authorize managing anyone else's. No OAuth "connect with Facebook" flow
exists in this release.

## 7. Fresh staging database — prerequisites, in order

1. A Supabase project (or the existing staging project). Apply **all** migrations `0001` → `0043` in filename order (`supabase db push`, or `scripts/apply-migrations.mjs`
   with `SUPABASE_DB_URL`). On a database that already has `0001`–`0040`, only `0041`, `0042`, `0043` are pending.
2. **Storage:** migration 0043 creates the private bucket `meta-creatives`. Confirm it in Supabase → Storage (public: **off**). Raise the project's *upload size limit*
   if you will upload videos (the plan default is far below Meta's 4 GB cap). No storage policies are needed — access is by signed URLs minted by admin-checked server code.
3. **Auth/RLS:** nothing to configure; the migrations contain the policies. Admins see everything; a contractor sees only assets/creatives/campaigns mapped to them; all writes are service-role only.
4. **Environment variables** in Vercel (staging): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (existing); `META_MARKETING_ACCESS_TOKEN`,
   `META_TICK_SECRET` (§6). Leave `META_ADS_WRITE_TOKEN` **unset** until §8.
5. **Scheduler:** GitHub → Settings → Secrets → Actions: `META_TICK_SECRET` (same value), `META_TICK_URL` = `https://<staging>/api/meta/tick` (existing workflow),
   `META_STUDIO_TICK_URL` = `https://<staging>/api/meta/studio-tick` (`.github/workflows/meta-studio-tick.yml`, hourly). Until set, the jobs skip without failing.
6. Sign in as an HQN admin → **Meta Ads → Setup → Sync now**; map each ad account; **Activity & settings → Discover**; map Pages and datasets; set audit thresholds.

## 8. Paused-ad test procedure (the only way to close §3b)

Use a **throwaway ad account or at minimum a dedicated test campaign name**, staging first. Nothing below turns on spend: every object is created `PAUSED`.

1. Set `META_ADS_WRITE_TOKEN` in staging and redeploy. Activity & settings → **Live writes → ON** (type `ENABLE META WRITES`) → tick **writes** for the one test ad account only.
2. Upload a creative (JPG/PNG). Create Ad → tick **"This is a budget-unit probe"** (budget ≤ 5.00 in the account currency), choose an Instant Form and automatic placements → Save → review the **exact
   requests** → type `CONFIRM` → **Create PAUSED objects in Meta**.
3. In Ads Manager open the new campaign/ad set/ad (names end in `[HQN-XXXXXXXX]`). Verify: status **Paused** at every level; **budget shows exactly the amount entered**; objective Leads; Instant Form
   attached; Page and Instagram identity; location/age; **URL tags** include `ad_id={{ad.id}}` etc.; button text; no unexpected defaults (Advantage+ audience etc.).
4. Back in Activity & settings → that account's **Budget unit check** → choose the probe → type the budget Ads Manager shows → **Record result**. A match unlocks budgets for that currency; a mismatch
   keeps them blocked (stop and report it — the conversion must change in code, it is never auto-adapted).
5. Create a second real draft (e.g. 25.00) and create it paused. Check the same things. Try one **retry after a forced failure** (e.g. disconnect the Page assignment, create, restore, retry) and confirm no duplicate objects.
6. Delete the test objects in Ads Manager (HQN never deletes anything in Meta). Record what you saw; the open items in §3b are closed only by this.
7. Then, optionally: proposals (approval required), then approval-mode rules. **Automatic rules last, and only after a week of recommend-only evaluations.** Automatic rules can only **pause or lower** a
   daily budget, need an expiry date and the typed phrase `ENABLE AUTO`, and run only while the global automation stop is released (`START AUTOMATION`) and the account's automation switch is on.

## 9. Controls (item 6) — what is checked, and when

| Control | Checked at |
|---|---|
| Write token present · global **Live writes** · per-account **writes** · confirmed draft | when **Create** is clicked, after claiming the draft, and again before every object |
| Same three + **budget-unit check** (budget changes) · global **automation** and per-account **automation** (unattended changes) | for proposals: **immediately before the write**, after the claim and after re-reading Meta; a blocked proposal is **released back to "approved"** (stays queued, not failed) |
| Meta's current state | proposals: live re-read; if any reviewed value differs the proposal becomes `stale`; the object must also belong to the proposal's ad account |
| Budget **increases**, resumes, schedule/targeting changes, lifetime budgets | always need a person; unattended execution is hard-limited to *pause* and *lower a daily budget* regardless of rule configuration |
| Rule scope | enforced again at execution (`proposalWithinRule`): same account, exactly the rule's campaign/ad set, the rule's own action, within `max_adjust_pct`, floor/ceiling, and the rule still enabled and unexpired; account-wide rules can only notify |
| Rule health | suspended on stale data, failing credentials, unverified tracking, insufficient evidence; a quality-based rule never falls back to clicks/leads; cooldown and per-day limits; overlapping rules are skipped |
| Overlapping evaluations | a database lease prevents two rule ticks from evaluating at once |

## 10. Rollback

- **Stop everything HQN can do to Meta, instantly:** Activity & settings → Live writes → *Turn OFF*. Everything keeps working read-only.
- **Stop automation only:** HQN automation → *Stop*. This does **not** pause ads already running in Meta (use Ads Manager or an approved proposal).
- **One rule:** Disable or Delete. Changing a rule's behavior switches it off and bumps its version.
- **A paused ad HQN made:** delete it in Ads Manager. **An applied change:** the previous values are saved on the proposal; reversing is a new proposal that needs approval. Spend already incurred cannot be undone.
- **Code:** revert the merge. The migrations are additive; leaving the tables is harmless.

## 11. Audit methodology and licence

`lib/meta/studio/audit.ts` (`hqn-meta-audit/1.0.0`) adapts the *contract* of the **claude-ads** skill v2.0.1 (MIT, © 2026 agricidaniel; `ads/references/meta-audit.md`,
`scoring-system.md`): controls return not-assessed/not-applicable without evidence, no universal thresholds, recommendations carry baseline, mechanism, confidence, next step,
measurement window. Its numeric score and benchmarks were deliberately **not** imported. The skill's scripts were not run. An LLM-written narrative layer is **not** included: it would need
a paid provider key (Anthropic API or another; subscription credits do not cover app calls) — decide provider, data handling and cost first.

## 12. Known limits

- No OAuth connect flow (contractor-owned accounts need App Review first). No organic Page/Instagram posting. Manual placements disabled. Editing a draft requires re-entering its schedule.
- Video cover frames are captured in the browser; a codec the browser cannot decode produces no cover and the draft is blocked until a decodable file is uploaded.
- Funnel-step performance, creative fatigue (frequency) and Events Manager diagnostics (EMQ, deduplication report) are "Not assessed" in audits.
- Account-level audits include all Meta-signalled HQN leads unless the account is mapped to a contractor, in which case only that contractor's leads.
- `meta-ads-sql.test.ts` (analytics branch) fails when run between ~17:00 and 24:00 US Pacific on a machine not set to UTC (a test-clock issue, not an app bug; production runs in UTC). Run with `TZ=UTC`.
