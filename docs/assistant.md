# In-app assistant (Claude)

A persistent assistant on every signed-in `/app` page (floating button → side panel on desktop, full-height sheet on phones).
It answers questions about the user's own leads and appointments, drafts follow-ups, prepares notes and status changes,
creates work orders / proposals / contracts from admin-approved templates, and guides Meta tracking setup.

Greeting and intro text live in one place: `lib/assistant/config.ts` (`ASSISTANT_GREETING = 'Complote?'`, `ASSISTANT_INTRO`).

## Deploy checklist (order matters)

1. **Apply migrations before deploying the code:** `0049_assistant.sql`, `0050_customer_documents.sql`, `0051_meta_tracking_setup.sql`
   (`node scripts/staging/migration-plan.mjs` shows what a database is missing). All three are additive.
2. **Set `ANTHROPIC_API_KEY`** (server only, in Vercel env). Until it is set the panel shows a clear "not set up" state.
3. Optional: `ANTHROPIC_MODEL` (default `claude-sonnet-5-5`), `ASSISTANT_EFFORT` (`low`|`medium`|`high`, default `low`).
4. Limits (all optional, defaults shown in `.env.example`): `ASSISTANT_USER_DAILY_USD`, `ASSISTANT_TENANT_MONTHLY_USD`,
   `ASSISTANT_ORG_MONTHLY_USD`, `ASSISTANT_RATE_LIMIT_PER_MIN`, `ASSISTANT_MAX_OUTPUT_TOKENS`, `ASSISTANT_MAX_TOOL_ROUNDS`, `ASSISTANT_ENABLED=false` to switch it off.
5. Documents: an admin must **approve** at least one template (Contracts → Templates → open a template → "Customer documents & assistant").
6. Meta: see "Meta tracking" below (needs a Meta app; dormant until `META_APP_ID`, `META_APP_SECRET`, `META_TOKEN_ENCRYPTION_KEY` are set).

## Budget: what the app enforces and what it cannot

**In the app** (`lib/assistant/limits.ts`, table `assistant_usage`): every model call is logged with tokens and an *estimated* cost
(price table in `lib/assistant/pricing.ts`, unknown models are priced as the most expensive) by user, contractor and feature.
Before each message the server checks a per-minute rate limit, a rolling-24h per-user budget, a month-to-date per-company budget and a
month-to-date organisation budget (default **$100**). It fails *closed*: if spend cannot be read, the request is refused.
Output length (`max_tokens`), tool-call rounds, tool-result size and history (last 10 messages + a rolling summary) are all bounded.

**Limits of that enforcement — be aware:**
- Costs are estimates from token counts, not Anthropic's invoice. Update `pricing.ts` if prices change.
- It only counts what *this app* sends. Other uses of the same API key are invisible to it.
- The check happens before a request, so several simultaneous requests can overshoot a budget by a few cents.
- Month = calendar month in UTC; the user budget is a rolling 24 hours.

**So also set provider-side controls (these are the real hard stops).** Checked against Anthropic's rate-limit docs on 2026-10-20:
1. Create a **dedicated workspace** in the Claude Console for the assistant with its **own API key**, and set a **workspace spend limit** on it
   (workspaces can have their own spend and rate limits; the default workspace cannot be limited). Use that key as `ANTHROPIC_API_KEY`.
2. In **Settings → Billing → Spend limits** set an organisation limit (cannot exceed your tier cap: Start $500, Build $1,000, Scale $200,000 per month).
3. Do **not** enable paid auto-reload (Billing page). With prepaid credits and no auto-reload, spend cannot exceed what you bought.
4. When a limit you set is reached the API returns HTTP 400 "You have reached your specified API usage limits"; the tier cap returns 429
   `enforced_spend_limit_reached` with no `retry-after`. Retrying does not help either, so the assistant reports them as a limit (not as "busy").

## Security model

- Identity comes only from the Supabase session. Nothing in a request body (user, company, role) is trusted.
- Data tools read through the **user's own Supabase client** (RLS applies) and add an explicit pin (contractors are restricted to leads assigned to
  their company). A record id supplied by the model is looked up under those rules; a miss looks exactly like "not found".
- The model can only **propose** changes. `assistant_actions` rows are written by the server; the user must press Confirm, and the server re-checks
  access at execution time, claims the action atomically (one execution per action even on double-click/retry), and verifies the result by reading it
  back before reporting success. Every table is `SELECT own rows only`; there are no client write policies.
- Text from the database (notes, descriptions, names) is passed to the model as quoted data in `<tool_data untrusted="true">` blocks and the system
  prompt says never to follow instructions inside it.
- The Anthropic key is only read in server code. Meta tokens are AES-256-GCM encrypted in a table no client role can read.

## What it can and cannot do

Can: answer from your records, "what needs attention", appointment briefings from the lead's notes/activity timeline, copy-and-edit text/email drafts,
prepare a note (+ dated follow-up) or status change for confirmation, create/edit/send documents (below), guide Meta tracking setup (below).

Cannot (and says so): send texts or emails; notify you about follow-ups (the app has **no task list or reminder delivery** — a follow-up is a dated
note on the lead shown in "what needs attention"); reschedule or cancel appointments (it describes the change and links to the lead); there is no stored
text/email thread with homeowners, so "conversation history" means the activity timeline; publish ads, change budgets or edit active Meta campaigns.

## Work orders, proposals and contracts

Uses the existing contract-template engine (versioned templates, merge fields, PDF renderer, e-signature requests) with these additions:
- **Approval gate:** only templates an admin marked as work order / proposal / contract **and approved** (for the current published version) are
  usable. Re-publishing new wording clears the approval. Contracts additionally need the list of states they are approved for, and are only offered
  for a customer in one of them. No approved template ⇒ the assistant says so; it never writes contract text.
- Customer and project details are pulled from the authorized lead. **Scope, price, deposit, payment terms and dates are never invented**: missing
  values are requested from the user. The preview shows editable merge-field values; the wording is read-only.
- Saving a draft is separate from sending. Every edit creates a new immutable version. Sending = an e-signature request through the existing signing
  engine, bound to the exact version/content hash the user approved, requiring its own Confirm. `customer_document_events` records who approved what.
- Two starter templates (Customer Proposal, Customer Work Order) are seeded as drafts-for-review; they contain no legal terms and still need approval.
- Not built: sending a document as a plain email attachment (the assistant drafts the covering message for you to send yourself).

## Meta tracking

What already existed and is reused: browser pixel (`lib/funnels/tracking.ts`, consent opt-in/opt-out), server Conversions API
(`lib/meta/capi.ts`, same `event_id` = `<session>:<Event>` so Meta can de-duplicate), the attribution parameters and the Meta Ads area.

What was added (`lib/meta/setup/*`, `lib/assistant/meta-tools.ts`): Meta login (OAuth, state + cookie CSRF protection, `debug_token` check, long-lived token
encrypted at rest), listing **only** the ad accounts and datasets the connected login can access, attaching an existing dataset to a funnel
(`funnel.config.trackingPixels.metaPixelId`), optional dataset creation, a read-only tracking check, a guided test, and ad-set guidance.

**Requirements and Meta restrictions (verified against Meta's docs 2026-10-20):**
- You must create a Meta app, add `https://<your-site>/api/integrations/meta/connect/callback` to *Valid OAuth Redirect URIs*, and set the env vars.
- Permissions: `ads_read` (list accounts/pixels, read stats); `ads_management` only if creating a dataset. Standard access covers ad accounts the app
  owner/admins own; **managing other businesses' accounts needs Advanced access via App Review**. A development-mode app returns permission errors
  for other people. The assistant reports these as Meta restrictions.
- An ad account normally has **one pixel** (create fails with error 6200 if one exists), so datasets are reused by default.
- `promoted_object` (dataset + Lead event for an ad set) is generally not editable after an ad set exists, so the assistant never edits ad sets: it shows
  the exact settings and recommends duplicating the ad set. It does not publish ads, start spend, change budgets or modify active campaigns.
- Test events are **not sandboxed** (Meta: they still feed Events Manager / targeting). The guided test points to Meta's Test Events tool, warns that a
  form submission is a real lead and Lead conversion, and the assistant never submits forms or sends test conversions.
- **"Verified" is strict** (`lib/meta/setup/verify.ts`): only when Meta itself reports the pixel firing after setup *and* Lead events (and server Lead events
  when a server token exists). Installed code or an accepted API call is shown as "installed". De-duplication is never claimed (only visible in Events Manager).
- Server events use the single `META_CONVERSIONS_API_TOKEN`; they are not rewired to per-user tokens (those expire in ~60 days).

## What has and has not been tested

Tested automatically (`tests/assistant-*.test.ts`): the three migrations in a real Postgres (PGlite) with real RLS; tenant isolation for conversations,
Meta connections/tokens, documents; contractor pinning on lead lookups; role-based tool access; confirmation/cancel/duplicate/concurrent-confirm
behaviour; silent-failure detection; limits and cost; the chat loop with a fake Anthropic API (streaming, tool loop caps, cancel, provider errors);
document creation, versions, approval records and the full send-for-signature path (real PDF + signing engine, email and storage faked); Meta OAuth
state/CSRF, listing, configuring, creating, verification levels; UI safety (no unsafe links, honest "not saved yet" states).

**Not tested against real services** — treat as unverified until you try it: live Anthropic responses and streaming through Vercel, live Meta (login,
App Review/permissions, Graph response shapes — the pixel `stats` item shape is undocumented, so it is parsed defensively), real e-signature emails,
and the browser UI on real devices (it type-checks, builds and renders on the server, but was not driven in a browser).
