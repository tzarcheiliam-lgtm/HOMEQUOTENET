# Prompt: "Describe a workflow, the app builds it" (AI workflow builder + texting bridge as a workflow action)

Paste this at the start of a session, or tell the session: "Read `docs/prompts/workflow-ai-builder.md` and do it."

---

## Goal

On the Automations side of HomeQuote Network, an admin types what they want in plain English ("when a kitchen lead comes in from Meta, text them in 2 minutes, if they reply call-me alert me, if no reply in a day text again, if still nothing mark it cold"). The app turns that into a **draft** workflow in the existing visual builder. The admin reviews it, dry-runs it, and publishes it themselves. The AI never publishes, enables, sends, or calls anything.

The Mac texting bridge (iMessage via the Mac) must be a real, first-class workflow action, not "setup required". Also include whatever else is needed to make that useful (listed below).

## Read first (don't skim)

1. `CLAUDE.md` and `HOMEQUOTE_CONTEXT.md` (source of truth; update it when done, new sections at the end).
2. `docs/visual-workflow-builder.md` and `docs/workflow-automation-architecture.md` (graph engine, runs, waits, pause/resume, opt-out policy, known limits).
3. Graph model and rules: `lib/workflows/graph/model.ts` (node types, per-node config schemas, `workflowGraphSchema`, limits), `validate.ts` (what blocks publishing, `integrations.sms` gate), `templates.ts`, `edit.ts`, `engine.ts`, `executor.server.ts`, `actions.server.ts`, `readiness.server.ts`, `permissions.ts`, `dry-run.ts`; `lib/actions/workflow-graph.ts` and `lib/data/workflow-graph.ts` (drafts, autosave `revision`, publish).
4. The existing in-app assistant, which is the pattern to copy for the Claude API plumbing, budgets, untrusted-data handling and confirmations: `lib/assistant/` (`chat.ts`, `config.ts`, `limits.ts`, `untrusted.ts`, `registry.ts`, `prompt.ts`), and the section "In-app assistant, customer documents, guided Meta tracking" in `HOMEQUOTE_CONTEXT.md`.
5. The texting system: `lib/sms/` (`service.ts`, `rules.ts`, `agent.ts`, `config.ts`, `health.ts`, `bridge-auth.ts`), `app/api/sms/*`, `scripts/mac-sms-bridge/`, `/app/texting`, and these sections of `HOMEQUOTE_CONTEXT.md` (section numbers there are duplicated, so find them by title): "Automatic texting from the owner's Mac", "In-app texting + default-hours controls", "More texting customization", "Texting guards" (echo guard, one conversation per number, "Not texted" notes, daily assistant-reply cap), and "Visual workflow builder (graph engine)".

## What exists today (verified in the repo; re-check before relying on it)

- Visual graph workflow engine with 14 node types: trigger, send_email, **send_sms** (currently `availability: 'setup_required'`, "No SMS provider is connected"; publishing is blocked by `validate.ts` when `integrations.sms` is false and `readiness.server.ts` hard-codes `sms: false`), ai_call, create_task, add_note, update_lead_status, assign_lead, send_notification, wait_duration, wait_business_hours, wait_event, condition, end. Max 60 nodes / 120 edges.
- Drafts autosave (`workflow_graph_drafts`, optimistic `revision`); publishing makes immutable versions; runs are pinned to a version; dry run and live test exist; pause/resume semantics are defined.
- Permissions: admins everything; contractor owners only for their own company and only if enabled under Automations, Contractor access; setters/callers none.
- The texting bridge is separate from workflows: `sms_messages` queue picked up by the Mac, `sms_conversations`, opt-outs (`sms_opt_outs`), texting window, caps, AI texting assistant, handoff alerts. Workflows cannot send a text through it today.
- The Claude API key (`ANTHROPIC_API_KEY`) is already configured and used by the in-app assistant and the texting assistant.

## Part 1: make the Mac bridge a real workflow action

1. `send_sms` node sends through the bridge by queueing `sms_messages` (never by calling a provider directly). It must go through the same gates as the texting assistant: opt-out list, texting hours in the lead's time zone, daily text cap, one-conversation-per-number rule, valid US phone, consent on the lead, `sms_settings.enabled` and not stopped, contractor texting switch for contractor leads. A skipped send must record a plain reason on the run and on the lead ("Not texted: ...").
2. Sender name and wording follow the existing rules (house name or contractor's texting name, no links, 320 char cap, STOP keywords handled by the existing inbound path). Merge fields use the existing graph variables.
3. `readiness.server.ts`: `sms` is true only when the bridge is connected (recent `bridge_last_seen_at`), `SMS_BRIDGE_TOKEN` exists and texting is on. Otherwise the node shows a clear "Mac bridge not connected / texting is off" instead of a generic "no provider".
4. New workflow pieces needed to use texting well (design them with the engine's durable-wait model, no in-memory timers):
   - **Trigger**: "lead replied by text" and "lead opted out (STOP)", and a trigger for "new lead" that carries `source` (website / Meta / manual) and `niche` so conditions can branch on them.
   - **Wait for reply** (wait_event on `sms.replied`, with a timeout path "no reply").
   - **Condition fields** for: source, niche (from `lib/meta/niche.ts`), contractor, replied yes/no, replied wants call, texting opted out.
   - **Hand off to the texting assistant**: a node that starts (or continues) the AI conversation (reuse `startSmsForLead` / `startSmsForMetaLead` behaviour, goal = book the estimate visit) so a workflow can say "text first, then let the assistant take over".
   - **Alert me** reuses `send_notification` / `notifyAdmins` (push + email).
   - Stop rules: opt-out or a person taking over a conversation exits the run (exit events already exist for other triggers; follow the same pattern).
5. Never create a second text path that bypasses `lib/sms` rules. If a rule needs to change, change it once there.

## Part 2: the AI builder

User flow (Automations page, admins first; contractor owners only if the permissions model already allows them to build):
1. A "Describe it" box with 4-5 clickable examples.
2. The app asks at most 2 short clarifying questions only when something essential is missing (who gets it, which niche, how long to wait). Otherwise it builds.
3. Result screen: a plain-English summary ("Trigger, then 1... 2... 3..."), the graph preview, a list of **Assumptions** and a list of **Couldn't do** (anything the engine can't do, with the closest thing it used instead). Buttons: Open in builder, Dry run, Discard. Nothing is published.
4. "Change it" box on an existing draft: describe a change, the AI edits the draft (same guardrails, shows a diff of nodes added/removed/changed).
5. Optional but wanted: "Explain this workflow in plain English" for any existing workflow.

Technical requirements:
- Server action / route that calls Claude with **tool use**: the model returns the workflow through a single tool whose input schema is derived from `workflowGraphSchema` and the per-node `NODE_CONFIG_SCHEMAS`, plus `summary`, `assumptions[]`, `unsupported[]`. Do not parse free text.
- Always run the result through the real validators (`parseWorkflowGraph`, `validate.ts`, readiness). On validation errors, feed the exact errors back for up to 2 repair attempts, then show the user what's wrong instead of saving a broken draft.
- Save only as a **draft** (`workflow_graph_drafts`, `engine='graph'`), owned by the requester, through the same permission checks as the manual builder. Never call publish/resume/enroll. Dry run only through the existing dry-run path.
- The system prompt must be built from the real catalogue (node types, availability, merge fields, triggers, settable statuses, limits) generated from code, not hand-written lists that can drift. The model must never be told it can do something the engine can't.
- Treat lead data and any pasted text as untrusted (`lib/assistant/untrusted.ts`); the builder doesn't need lead data at all to build a workflow, so don't send any.
- Reuse the assistant's model config, per-user/day budget and rate limits (`lib/assistant/limits.ts`, `config.ts`); add a separate, lower cap for builder calls. Log each build (who, prompt, model, token counts, outcome, draft id) to a small table (new migration, additive, idempotent, next free number; admin read only) so cost and misuse are visible.
- Prompt-injection safety: the user's description can't make the model call tools other than the workflow tool, pick recipients outside the lead, or add webhook/code nodes (none exist, don't add any).

## Part 3: other things an owner will want (build the first four, list the rest as follow-ups)

1. **Starter templates** (drafts, one click) built on the new pieces: speed-to-lead text (website + Meta), "no reply" follow-up sequence (2 texts over 2 days, then mark cold), appointment reminders (day before + morning of), "lead wasn't texted, alert me", reactivation of old leads.
2. **Per-contractor workflows**: workflow scoped to one contractor's leads, using that contractor's texting name and wording.
3. **Run log in plain English** on the workflow page ("Texted Sam at 9:02, no reply after 24h, marked cold") so it can be trusted without reading JSON.
4. **A test mode** that sends to a number the admin enters (existing live-test rules: explicit test recipients; also bypass-free: opt-out and one-number rules still apply, so offer "reset this test number" guidance rather than weakening the rules).
5. Follow-ups to list, not build: quiet days, per-niche first texts, calling-queue steps (add the lead to a caller's list), outbound webhooks (needs a security review).

## Guardrails (non-negotiable)

- The AI proposes; a human publishes. Nothing sends, calls, assigns or changes a lead until a person publishes and the engine runs it.
- Follow the opt-out policy in `docs/visual-workflow-builder.md` section 3 everywhere (network-wide, E.164 key). No workflow can text or call someone who opted out.
- No new env vars unless unavoidable; no secrets in code, logs, or responses. Don't print secrets in tool output (config rows can contain an `app_secret`; select columns explicitly).
- Don't weaken `validate.ts` to make an AI draft pass. If a draft can't pass, tell the user why.
- Multi-tenant: a contractor owner's builder can only see and affect their own company. Add SQL-level tests for anything new that stores data.
- Database migrations: additive and idempotent, next free number (check `supabase/migrations/` and the live database; main has had number collisions). **Before running any migration that does `create or replace function` on an existing function, read the live function definition and diff it against the file** (a stale copy once nearly removed two permission checks). Do not run migrations yourself unless the user says to; give the exact SQL file name instead.

## How to work

1. Start by writing a short plan (files you'll touch, the order, risks) and put the 3-4 genuinely open decisions to the user with a recommended default. Candidate decisions: should contractor owners get the AI builder or admins only (recommend admins first); how many AI builds per day (recommend 30); whether "hand off to assistant" starts immediately or after a delay (recommend a configurable delay).
2. Ship in separate PRs, each independently safe and each with its own tests: (1) real send_sms via the bridge plus readiness and the reply/opt-out triggers, (2) the AI builder, (3) templates, per-contractor scope, plain-English run log.
3. Tests: fake the model with fixture responses (valid graph, invalid graph that gets repaired, invalid graph that stays invalid, injection attempt, request for something unsupported); run generated graphs through validate + dry run; bridge action tests against the PGlite texting setup in `tests/sms-texting.test.ts` (opt-out, hours, caps, one-per-number, echo, contractor switch). Run the full suite, `tsc --noEmit`, and eslint on changed files before every push.
4. Update `HOMEQUOTE_CONTEXT.md` (new section at the end) and the workflow docs. Open a PR per part, wait for the Vercel preview to succeed, and merge only when the user says "merge it".
5. Be honest in every summary about what was not verified (no live Anthropic calls in tests, no real phone/bridge send, no staging database). Say what the user must do (migration file names, env, bridge restart).

## Done when

- An admin types a plain-English description and gets a valid draft workflow in the builder, with assumptions and unsupported items listed, in under ~20 seconds, without any publish happening.
- A published workflow can text a lead through the Mac bridge, wait for a reply or a timeout, branch on it, alert the owner, and hand off to the texting assistant, with every existing texting rule still enforced.
- The full test suite, type check and lint pass, docs are updated, and the final message lists exactly what remains unverified.
