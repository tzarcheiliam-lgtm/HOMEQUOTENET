# Visual workflow builder - staging verification runbook

**Status: NOT YET RUN.** No staging Supabase project or credentials exist in the build environment, so every
"staging" and "provider" item in `docs/visual-workflow-builder.md` §7 is still open. This is the exact procedure
to close them. Nothing here contacts a real customer.

## Ground rules
- Use a **separate** Supabase project (staging) and a Vercel **preview** deployment pointed at it. Never the production project (`fzglejpmxriohuyalcjt`) or `homequotenet.com`.
- Staging data is synthetic. Do not copy customer leads into staging.
- Staging env: `AI_CALLING_GLOBAL_ENABLED=false`, **no** `FISH_API_KEY`, a staging-only `FISH_WEBHOOK_SECRET`, a staging-only `WORKFLOW_CRON_SECRET`. Gmail sending off (or a sandbox mailbox) and no push credentials, so no external action can happen.
- A real call is a separate, explicitly authorized step (§9). It needs **your designated test number and your go-ahead** first.

## 1. Create staging and apply migrations
1. New Supabase project -> apply migrations `0001` ... `0040` in order, then dry-run 0041:
   `SUPABASE_DB_URL=<staging> node scripts/apply-migrations.mjs --dry-run supabase/migrations/0041_visual_workflow_builder.sql`
2. Seed a few synthetic classic workflows, leads and a contractor (so "classic still works" means something).
3. Apply for real: `SUPABASE_DB_URL=<staging> node scripts/apply-migrations.mjs supabase/migrations/0041_visual_workflow_builder.sql`

## 2. Read-only schema/safety checks (guarded)
```
STAGING_PROJECT_REF=<staging ref> STAGING_CONFIRM=I-understand-this-is-not-production \
SUPABASE_DB_URL=<staging direct connection> node scripts/staging/verify-0041.mjs
```
Refuses to run if the environment mentions production, `AI_CALLING_GLOBAL_ENABLED=true`, or `FISH_API_KEY` is set. Expect every line `pass`: tables, RLS on, service-only functions not executable by anon/authenticated, calling switch off, no contractor able to dial, no visual workflow enabled, classic workflows untouched.

## 3. Real authenticated permission checks
Create four staging accounts: admin, contractor owner (company A), contractor staff (A), setter. Create company B's owner too.
Using each account's real session (browser or `Authorization: Bearer <access token>` against the staging project):

| Actor | Must succeed | Must be refused |
|---|---|---|
| Admin | open `/app/workflows`, create/publish/pause/archive any workflow, grant contractor access at *Automations -> Contractor access* | - |
| Owner A (access NOT granted) | (record what the page shows) | create, save draft, publish |
| Owner A (access granted) | create/save/publish/pause **their own** workflow | open or edit company B's workflow; read company B's runs, calls or the opt-out list; open *Contractor access* |
| Staff A | view, complete a workflow task | create/edit/publish |
| Setter | - | `/app/workflows` (redirect) and every `wfg_*` RPC |

Also call each `wfg_*` RPC as signed-out (`anon`): all must be refused. Record HTTP status per cell.

## 4. Linear workflows unchanged
Trigger an event that a seeded **classic** workflow listens for; confirm the run completes exactly as before 0041, with a visual workflow enabled on the same trigger beside it.

## 5. Visual workflow lifecycle
Draft from a template -> dry run -> live test (recipients = a staging inbox you control) -> publish -> trigger enrollment -> edit the draft and publish v2 -> confirm the earlier run stays on v1 and a new run uses v2 -> confirm no historical lead was enrolled at publish.

## 6. Durable waits with the real scheduler
Add a wait step, enroll, then let the **real** scheduler resume it: call the staging tick route (no GitHub schedule needed):
```
curl -sS -X POST -H "Authorization: Bearer $STAGING_WORKFLOW_CRON_SECRET" https://<preview-host>/api/workflows/tick
```
Redeploy/restart between the wait starting and the tick to prove nothing lives in memory. The production GitHub Actions cron is **not** used for staging; run the same call on a schedule you control if you want a soak test.

## 7. Signed webhooks (still no real Fish)
Staging has no Fish credentials, so deliver *simulated* events signed with the staging webhook secret:
```
body='{"event":"call.analyzed","session":{"id":"stg-1","metadata":{"job_id":"<job id>"}},"analysis":{"status":"completed","data":[{"name":"appointment_booked","value":true}]}}'
t=$(date +%s); sig=$(printf '%s.%s' "$t" "$body" | openssl dgst -sha256 -hmac "$STAGING_FISH_WEBHOOK_SECRET" -hex | sed 's/^.* //')
curl -sS -X POST -H "x-fish-webhook-signature: t=$t,v1=$sig" -d "$body" https://<preview-host>/api/ai-calling/webhook
```
(Create the job row by hand in staging: `trigger_source='workflow'`, status `accepted`, `provider_session_id='stg-1'`; record an appointment for the same lead + contractor first.) Check: wrong/missing signature -> 401; the same delivery sent twice -> one resume, one lead note, one `ai_call_events` row per event.

## 8. Duplicates, cancellation, global controls, rollback
- Re-send the same domain event / webhook / tick concurrently: still one call job, one email in the sandbox mailbox, one note.
- Cancel a run with a queued call: call job becomes `cancelled`.
- Flip the admin switch and `AI_CALLING_GLOBAL_ENABLED` and confirm no job leaves `queued`/`blocked` (there is no agent configured, so none could dial anyway).
- Pause/resume with several waiting runs; confirm the staggered release and the "events not enrolled" count.
- **Rollback rehearsal:** `psql "$STAGING_DB_URL" -v ON_ERROR_STOP=1 -f supabase/rollback/0041_visual_workflow_builder_soft_rollback.sql`, then re-run step 2 and step 4.

## 9. Provider test (separate, needs your authorization)
Only after steps 1-8 pass **and you give me**: (a) the designated test phone number (yours), (b) written go-ahead for one call, (c) the staging Fish agent + number. Then: configure the staging contractor in `workflow_only`, `AI_CALLING_GLOBAL_ENABLED=true` on the preview only, enroll one synthetic lead whose phone is your number, place exactly one call, confirm the signed webhook resumes the run once, and turn calling off again. Until then the live-test mode ("never dials") is the only call path exercised.

## Results (fill in)
| Step | Date | Who | Result |
|---|---|---|---|
| 1 migrations | | | |
| 2 checks | | | |
| 3 permissions | | | |
| 4 linear | | | |
| 5 lifecycle | | | |
| 6 scheduler | | | |
| 7 webhooks | | | |
| 8 dup/cancel/controls/rollback | | | |
| 9 provider | | | |
