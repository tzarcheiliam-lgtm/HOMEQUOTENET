# HomeQuote Network — Setup Checklist

Everything you need to do to get the app running. Work top to bottom.

> Note: There is **one** migration to run (`supabase/migrations/0001_initial_schema.sql`).
> It already includes all schema through Phase 3. You confirmed you have **not** run
> any earlier copy, so this is a clean first run.

## Setup (do once, in order)

- [ ] **Open your Supabase project** (you already have an account).
- [ ] **Grab 3 API keys** — Supabase → Project Settings → API:
  - [ ] Project URL → `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `service_role` secret key → `SUPABASE_SERVICE_ROLE_KEY`
- [ ] **Create `.env.local`** in the project root (copy from `.env.example`) and fill in:
  ```
  NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-ref.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
  NEXT_PUBLIC_SITE_URL=http://localhost:3000
  ```
- [ ] **Run the database migration** — paste all of
      `supabase/migrations/0001_initial_schema.sql` into the Supabase SQL Editor and run it.
      This creates every table, all Row Level Security policies, and seeds the verticals
      (Fencing, ADU, Home Improvement) and the Home Improvement sub-services.
- [ ] **Start the app** — `npm run dev` (dependencies are already installed).
- [ ] **Sign up** at <http://localhost:3000/sign-up> (creates an INACTIVE account by design).
- [ ] **Make yourself admin** — in the Supabase SQL Editor:
  ```sql
  update public.profiles set role = 'admin', is_active = true
  where email = 'tzarcheiliam@gmail.com';
  ```
- [ ] **Sign in** at <http://localhost:3000/sign-in> → you land on the dashboard.

## Optional / recommended

- [ ] Disable public sign-ups once you're in (Supabase → Authentication → Providers → Email).
- [ ] Create staff/contractor accounts manually for now: create the user in the Supabase Auth
      dashboard, then set `role` / `is_active` / `contractor_id` on their row in `public.profiles`.
      (A proper in-app Team UI is planned for Phase 5.)
- [ ] Create a Supabase Storage bucket later if you want real file uploads — lead attachments
      are URL-based for now.

## Test the system end-to-end (after setup)

- [ ] **Contractors** (`/app/contractors`): add 2, set verticals served + a pricing agreement each.
- [ ] **Create a lead** (`/app/leads → New lead`): set Vertical = Home Improvement and confirm
      the sub-service dropdown populates; fill source/campaign/UTMs and economics.
- [ ] **List & filter**: search by name/phone; filter by vertical, source, status, city; try the
      "Unassigned" quick view.
- [ ] **Distribute**: assign the lead to BOTH contractors; confirm two independent assignments
      (many-to-many). Change one assignment's status and watch the lead's pipeline status follow.
- [ ] **Schedule an appointment** on an assignment → check it appears on `/app/appointments`.
- [ ] **Qualification / notes / contact**: mark qualified, log a contact attempt, add a note;
      confirm all show in the activity timeline.
- [ ] **Bulk actions**: select leads and bulk-set status or assign to a contractor.
- [ ] **Analytics** (`/app/analytics`): verify totals, CPL, ROAS, and the breakdowns.
- [ ] **RLS check (important)**: create a contractor login (`role='contractor'`, `is_active=true`,
      `contractor_id=<one contractor>`), sign in as them, and confirm they see ONLY their assigned
      leads and cannot reach pricing, billing, or analytics.

## Reference

- Environment variables: 4 total (above) — unchanged since Phase 1.
- Migrations: 1 total — `supabase/migrations/0001_initial_schema.sql`.
- Full project docs: see `README.md`.
