# Deploying HomeQuote Network to Vercel

A step-by-step guide to push to GitHub and deploy to Vercel against your
production Supabase project.

---

## 0. Pre-flight (do these first)

- [ ] **Rotate your Supabase keys** if the `anon`/`service_role` keys were ever
      shared in chat/email. Supabase → Project Settings → API → "Reset" the
      service-role key, then update `.env.local` and Vercel. (The service-role
      key bypasses RLS — treat it like a root password.)
- [ ] Confirm `.env.local` is **not** committed (it's gitignored — verified).
- [ ] Run `npm run build` locally once to confirm a clean build.

---

## 1. GitHub setup

The project is already a git repo (`git init` done) with a correct `.gitignore`
(`.env*.local`, `node_modules`, `.next`, `build`, `.vercel` all ignored).

```bash
# from the project root
git add -A
git status                      # confirm .env.local is NOT listed
git commit -m "HomeQuote Network — initial production-ready commit"

# create the GitHub repo (pick one)
#   a) with GitHub CLI:
gh repo create homequote-network --private --source=. --remote=origin --push
#   b) or manually: create an empty repo on github.com, then:
git remote add origin https://github.com/<you>/homequote-network.git
git branch -M main
git push -u origin main
```

> Double-check on GitHub that **`.env.local` is absent** and only `.env.example`
> is present.

---

## 2. Vercel deployment

1. Go to [vercel.com/new](https://vercel.com/new) and **Import** the GitHub repo.
2. Framework preset: **Next.js** (auto-detected). Build command `next build`,
   output handled automatically. No overrides needed.
3. Add the environment variables below **before** the first deploy.
4. Deploy. Vercel assigns a URL like `https://homequote-network.vercel.app`.

### Environment variables (set all four in Vercel → Settings → Environment Variables)

| Variable | Value | Scope | Notes |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` | All | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your `anon` key | All | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | your `service_role` key | All | **Secret — server only** |
| `NEXT_PUBLIC_SITE_URL` | `https://your-domain.com` | All | **Must be the deployed URL** |

> `NEXT_PUBLIC_SITE_URL` is critical: it builds the Meta webhook callback URL and
> the password-reset / invitation redirect links. If it's wrong, those point at
> `localhost`. After you know your final domain, set it and **redeploy**.

---

## 3. Supabase production configuration

1. **Run migrations** (in order) in the SQL Editor of the project Vercel points to:
   `0001_initial_schema.sql` → `0002_phase4_outcomes.sql` →
   `0003_phase5_team.sql` → `0004_phase6_integrations.sql`.
   (If you deploy against your current project, only `0004` may still be pending.)
2. **Auth → URL Configuration:**
   - **Site URL:** `https://your-domain.com`
   - **Redirect URLs (allow-list):** add `https://your-domain.com/**`
     (and your `*.vercel.app` preview URL if you use previews).
3. **Auth → Providers → Email:** configure **SMTP** if you want invitations and
   password-reset emails to deliver. (The "Create user with temporary password"
   flow needs no email.)
4. Create your first admin: sign up at `/sign-up`, then in SQL:
   ```sql
   update public.profiles set role='admin', is_active=true
   where email='you@example.com';
   ```
   (After that, consider disabling public sign-ups under Auth → Providers → Email.)

---

## 4. Domain setup (optional but recommended)

1. Vercel → Project → **Settings → Domains** → add your custom domain; follow
   the DNS instructions.
2. Update **`NEXT_PUBLIC_SITE_URL`** to the custom domain and **redeploy**.
3. Update the Supabase **Site URL / redirect URLs** to match.

---

## 5. Meta webhook setup (after deployment)

The callback URL is generated from `NEXT_PUBLIC_SITE_URL`:

```
https://your-domain.com/api/integrations/meta/webhook
```

1. In the app: **Integrations → Meta Lead Ads** → set a **verify token**, your
   **Page ID**, and **Page access token**; tick **Enable**; Save.
2. In your Meta app (developers.facebook.com) → **Webhooks → Page**:
   - Callback URL: the URL above (copy it from the Meta settings page).
   - Verify token: the same string you set in the app.
   - Click **Verify and Save** (Meta calls our `GET` handshake).
3. Subscribe the Page to the **`leadgen`** field.
4. For live leads, your Meta app needs **App Review** for `leads_retrieval`;
   until then only dev/admin-role users' leads flow.

**Test mode:** the **Integrations → Meta → "Test the connection"** simulator runs
a synthetic lead through the full pipeline (dedupe + attribution) with **no ad
spend and no public URL required** — use it to validate before going live.

---

## 6. Post-deployment verification checklist

- [ ] App loads at the production URL; `/sign-in` renders.
- [ ] Sign in as admin; dashboard shows data.
- [ ] Create a contractor, a lead, assign it, record a sale — no errors.
- [ ] Team: create a user; confirm role/status work.
- [ ] **RLS check:** sign in as a contractor → sees only their own leads; cannot
      reach `/app/billing`, `/app/sales`, `/app/integrations`, `/app/team`.
- [ ] Integrations → Meta → **Send test lead** → appears in **Lead Intake** as
      `created`; send again → `duplicate`.
- [ ] Meta webhook **Verify and Save** succeeds in the Meta dashboard.
- [ ] Password reset / invite emails deliver (if SMTP configured).
- [ ] No secrets in the GitHub repo (`.env.local` absent).

---

## Notes

- **Next.js canary is intentional:** `experimental.ppr` and `clientSegmentCache`
  in `next.config.ts` require it, and both are supported on Vercel. The version is
  pinned in `package.json` for reproducible builds.
- The `middleware → proxy` deprecation warning is cosmetic on this canary and does
  not affect deployment.
- Webhook/intake endpoints run unauthenticated and rely on `SUPABASE_SERVICE_ROLE_KEY`
  being present in the server environment (Vercel) to write via the service role.
