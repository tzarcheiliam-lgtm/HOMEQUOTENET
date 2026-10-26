# Meta Ads Studio — end-to-end browser harness

A real-browser walkthrough of the real Next.js app in an **isolated** environment. Nothing in it contacts Meta, your Supabase
project, or any other service.

```
node scripts/e2e/meta-studio/run.mjs                 # both phases (about 10-15 minutes the first time: dev compile)
E2E_ONLY=phaseA node scripts/e2e/meta-studio/run.mjs # reporting token only; proves writes cannot be configured
E2E_OUT=some/dir  ...                                # screenshots (desktop + 390px mobile), report.json, server.log
```

Requires the repo's dev dependencies (Playwright's Chromium is already used by `scripts/test-*-browser.mjs`). Ports used: app 3100,
Supabase stand-in 54321, fake Meta 54400.

## What stands in for what

| Real thing | Stand-in | Fidelity |
|---|---|---|
| Postgres + Supabase PostgREST / GoTrue / Storage | `supabase-shim.mjs`: an in-process Postgres (PGlite) with **every real migration** applied and **real RLS** (each request runs as `anon` / `authenticated` with `auth.uid()` set, or as the service role), plus a small REST/auth/storage layer | Same schema, policies, triggers, grants. The REST layer implements only the query features the Meta pages use and fails loudly on anything else. |
| Meta Graph / Marketing API | `fake-graph.mjs`: **strict** about documented fields (rejects unknown parameters, non-PAUSED creation, bad parents), supports failure injection (reject, timeout-after-create, lost request, HTTP 500, video still processing, an edit made "in Ads Manager"), and records which token every request used | Proves HQN's behavior. **Does not prove real Meta accepts the same requests.** |
| Outbound network | `preload-fetch.cjs` redirects `graph.facebook.com` to the fake and **blocks every other non-localhost host** | — |

## What it covers

Phase A (no write token): sign-in, tabs, sync with the read token only, "Setup required" for writes, discovery, explicit asset/account mapping,
creative upload and validation (real bytes, disguised file, unsupported type, low-resolution warning, duplicate, video), draft building, exact-integer review,
confirmation, creation blocked with every reason listed, forged/unmapped Page refused, contractor tenant isolation (mobile).

Phase B (write token): switch ordering and typed phrases, paused creation with the write token only, simultaneous double-click, budget-unit mismatch vs match,
partial failure and resume, timeout-after-create (no duplicate), lost request, edit clears confirmation, audit → proposal → approve → apply (live re-read,
single PAUSED write), execution-time gate refusal with the proposal staying queued, Ads Manager drift → stale with no write, rules (suspended until tracking verified,
approval mode proposes only, auto mode needs typed phrase, global stop, account switch, scope, cooldown), scheduler auth, every screen on desktop and mobile
(no overflow, no script errors), and a scan proving no credential appears in the server log or any page the browser received.

Output notes: touch-target heights under 36px on mobile are reported as a NOTE, not a failure.
