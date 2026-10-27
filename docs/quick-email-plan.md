# Quick Emails from the Call Workspace: Plan

Goal: sending the follow-up email a cold call calls for should be as fast as
logging the call, one tap from the prospect you're on, with the right
template already picked for what just happened. Today it means leaving the
call, opening Calls → Emails, finding the company in a dropdown, and
re-typing what you just heard.

---

## What the data says (production, last 30 days)

| Fact | Number | What it means |
|---|---|---|
| Calls logged | 295 | The call loop is busy |
| Emails sent | 10 | Hardly any calls get a follow-up email |
| Prospects with any email on file | **14 of 879** | The real bottleneck: nobody captures the email *on the call* |
| Most-used template | "More info after our call": 13 of 17 sends ever | One template does most of the work; the library is barely used |
| Gmail senders connected | 2 | Setters can send from their own inbox |

**So the plan does two things:**
1. **Capture the email during the call**: "What's the best email for you?"
   becomes a field in the log form.
2. **Send in one tap**: the template is chosen by the call's outcome, the
   recipient is pre-filled, and you send without leaving the prospect.

## Problems in today's emails (fix alongside)

1. **Wrong signature.** Every email is signed "Best, Liam — HomeQuote
   Network" (`buildProspectEmailHtml`), even when a setter sends it from their
   own Gmail. The prospect gets an email *from* Sam signed *Liam*. Sign with
   the sender's name and phone, falling back to "Liam" only for Liam.
2. **No opt-out or mailing address.** US CAN-SPAM rules require both in
   commercial email, B2B included. Add a footer line: "Not interested? Reply
   'stop' and I won't email again · HomeQuote Network, [address]". A "stop"
   reply is honoured by marking the prospect no-email, which needs a mailing
   address from you.
3. **"Want Me to Hold Your Area?"** implies exclusivity, which the call script
   promises never to offer. Keep it out of quick actions (its own description
   says to use it only when an area is really being held).
4. **`{{lead.city}}` in contractor templates** fills from the *homeowner*
   context and comes out blank for a contractor. Use the prospect's city.

---

## Phase 1: Quick email in the call workspace

**1. Email capture in the log form.** For outcomes where you reached someone
(spoke with DM, callback requested, interested, follow-up, booked,
gatekeeper), show a **Best email** field pre-filled from the prospect.
- Saved to `decision_maker_email` with the outcome, even if no email is sent.
- That alone turns calls into reachable contacts.

**2. Outcome → email, the quick action.** After a save, the right follow-up is
offered in a small sheet over the current prospect, *before* the next one
loads:

| Outcome logged | Suggested email | Why |
|---|---|---|
| Spoke with DM / Interested | **More info after our call** (existing, best performer) | Strike while warm |
| Appointment booked | **Meeting confirmed** (new): date, time, time zone, how they'll be reached, plus a calendar invite (`.ics`) | Confirmed meetings happen, and happened meetings get sold. This protects setter pay |
| Callback requested | **Talk on {day}** (new): one line on what you'll cover | Makes the callback feel booked, not vague |
| Left voicemail | **Sorry I missed you** (new): two lines and the booking link | Pairs every voicemail with something they can click |
| Gatekeeper | **For {owner name}** (new): short intro to pass along | Gets past the front desk |
| Not interested | *(none by default)* "If anything changes" is available but never suggested | Respect the no |
| No answer / wrong number / DNC | *(no email)* | Nothing to follow up, or not allowed |

**The sheet:**
- Recipient and template are pre-filled, and the subject and body are
  editable in place. The preview is collapsed (one tap to open).
- Buttons: **Send & next** · **Skip** · **Edit more**.
- The next prospect loads after Send or Skip, so emailing never breaks the
  call loop.
- With no email on file, the sheet opens on the **Best email** field first.

**3. Standalone quick action.** An **Email** button in the prospect header
and in the phone action bar (Call · Log · **Email** · Next).
- Keyboard: `E` opens the sheet with the template for the latest outcome;
  `Cmd/Ctrl+Enter` sends.

**4. One code path for sending.** Pull the core of `sendProspectEmail` into a
shared function used by both the full composer (`/app/calls/emails`, which
stays for one-off emails) and the quick sheet, so validation, DNC checks,
logging (`prospect_email_logs`) and the Gmail send can never diverge.

## Phase 2: Templates made for the call

- New **Cold Call Follow-Up** category in `email_templates`: Sorry I missed
  you, For {owner}, Talk on {day}, Meeting confirmed, If anything changes.
  Admins edit them on `/app/email-templates` as usual. The outcome →
  template map lives in code, keyed by template key.
- **Merge fields:** first name, company, city, services discussed, the
  sender's name and phone, the meeting date/time/zone/type, and the booking
  link.
- **Short by design:** 3–5 lines that read well on a phone. One question,
  one link.
- **Meeting confirmed** attaches an `.ics` invite. The calendar code
  already exists in `lib/calendar`.

## Phase 3: Follow-through

- **Email follow-ups in the setter's money queue**: "Emailed 3 days ago, no
  meeting yet → call back". That's a new queue kind, ranked between hot and
  rescue.
- **Guardrails:**
  - never to DNC or opted-out prospects;
  - a warning if this prospect was emailed in the last 24 hours;
  - the same template at most once per 7 days per prospect;
  - a per-sender cap of 100 a day (Gmail's own limits are higher; this
    catches mistakes).
- **Stats:** emails sent today on the Stats page, and "emails → meetings
  booked within 7 days" so you can see which templates work.
- **History** already shows sent emails on each prospect. Add the template
  name and who sent it.

## Decisions needed

1. **Pop-up or button?** Should the email sheet open **automatically** after
   DM / voicemail / gatekeeper / callback / booked outcomes (recommended:
   fastest, and always skippable), or only when the caller taps Email?
2. **Mailing address for the opt-out footer.** Which address should appear?
3. **Voicemail emails:** send these to a company's general email when no
   decision-maker email is known? (Recommended: yes, since that's how most
   cold voicemail follow-ups land.)

## Build order (small PRs)

1. Signature, opt-out footer and template fixes (problems 1–4) and the shared
   send function, with tests.
2. Email capture field and the quick sheet with the outcome map, using the
   existing "More info" template, plus the `E` shortcut and the action-bar
   button.
3. The new Cold Call Follow-Up templates, merge fields and the `.ics`
   attachment.
4. Follow-ups in the money queue, guardrails, stats.
5. `HOMEQUOTE_CONTEXT.md` updated with each.
