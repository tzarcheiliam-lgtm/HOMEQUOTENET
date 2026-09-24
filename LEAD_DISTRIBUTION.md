# Lead review & distribution

Ad → form → **lead saved in HomeQuote** → **email to the HomeQuote team only**
(`LEAD_ALERT_EMAILS`) → someone qualifies it → an admin picks recipients →
**Send lead** → recipients get a qualified-lead email.

No form or intake source emails a raw lead to a contractor. Client funnels (the
Ethan / Pool Masters funnel) still **assign** the lead to their contractor business
("Pool Masters Inc") inside HomeQuote for tracking — that emails nobody. Ethan, Gio
or anyone else only receive a lead when an admin selects them and clicks Send lead.
GoHighLevel code is untouched and separate (only runs for a funnel whose
`integration_id` is set; none are today).

## Pieces (migration `0016_lead_review_distribution.sql`)

| What | Where |
| --- | --- |
| Review state | `leads.qualification_status` (`needs_qualification` / `qualified` / `not_qualified`), `qualification_notes`, existing `qualified_at` / `qualified_by` |
| Recipients | `lead_recipients` — name, company, email, phone, type (team member / contractor), active, optional link to a `contractors` row. Managed at **/app/lead-recipients** (admin). |
| Email outbox + history | `lead_email_deliveries` — one row per alert or send: status, attempts, Gmail message id, error, who sent it, resend flag |
| Alert trigger | `trg_lead_intake_alert` on `lead_intake_events`: every created/duplicate intake queues exactly one alert (repeat submissions are flagged as repeats) |
| Sending a lead | `distribute_lead(lead, recipients[], actor, resend)` — requires `qualified`; skips anyone who already received it unless `resend`; contractor-linked recipients also get the normal `lead_assignments` row, and a website booking made on that contractor's funnel becomes their appointment |
| Email content | `lib/leads/lead-emails.ts` (pure builders), sent by `lib/leads/notify.ts` through the existing HomeQuote Gmail connection |
| UI | Lead page → **Review & send** card (history, send, retry); Qualification card (decision + notes); Leads → **Needs qualification** view |

Emails are sent right after the request (`after()`), and anything that failed is
retried by the existing scheduled `POST /api/funnels/deliver` (Bearer
`FUNNEL_CRON_SECRET`) with backoff, up to 6 automatic attempts. Admins can retry a
failed email from the lead page at any time. "Sent" means Gmail accepted the
message; bounces show up in the HomeQuote Gmail inbox.

## Configure

- Alert recipients default to the confirmed `tzarcheiliam@gmail.com` and
  `nsolachnek@gmail.com` (`DEFAULT_LEAD_ALERT_EMAILS` in `lib/leads/notify.ts`).
  Optional server-only `LEAD_ALERT_EMAILS` (comma separated) overrides them. They
  never fall back to contractors.
- Gmail: existing `GOOGLE_GMAIL_CLIENT_ID`, `GOOGLE_GMAIL_CLIENT_SECRET`,
  `GMAIL_OAUTH_REDIRECT_URI`, `GMAIL_FROM_EMAIL`, `GMAIL_TOKEN_ENCRYPTION_KEY` and a
  connected account (already connected in the database).
- `NEXT_PUBLIC_SITE_URL` — used for the "VIEW & QUALIFY LEAD" link.

## Tests

```powershell
node node_modules/vitest/vitest.mjs run tests/lead-emails.test.ts
# DB scenario (rolled back). Until 0016 is applied, run DB tests serially:
node --env-file=.env.local node_modules/vitest/vitest.mjs run --no-file-parallelism tests/lead-distribution-db.test.ts tests/funnels-db.test.ts tests/funnel-calendly-db.test.ts
```
