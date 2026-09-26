-- Stripe payments for Growth Tools requests.
--
-- An admin writes the price on a request (one-time or monthly, optional setup
-- fee). The contractor then sees "Review & pay" and pays on Stripe Checkout.
-- The Stripe webhook (app/api/stripe/webhook) records the outcome here.
-- Nothing is charged unless the contractor completes Checkout themselves.
--
-- Additive and safe to re-run.

-- ---- 1. Stripe customer per company ------------------------------------------
-- Written by the server (service role) the first time a company pays.
-- contractors is admin-write only (0001), so contractors can't change it.
alter table public.contractors add column if not exists stripe_customer_id text;
create unique index if not exists contractors_stripe_customer_id on public.contractors (stripe_customer_id)
  where stripe_customer_id is not null;

-- ---- 2. price + payment state on each request ---------------------------------
alter table public.service_requests
  add column if not exists price_cents integer,
  add column if not exists price_interval text,
  add column if not exists setup_fee_cents integer,
  add column if not exists price_description text,
  add column if not exists priced_at timestamptz,
  add column if not exists priced_by uuid references public.profiles(id) on delete set null,
  add column if not exists payment_status text not null default 'none',
  add column if not exists stripe_checkout_session_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists paid_at timestamptz;

alter table public.service_requests drop constraint if exists service_requests_price_check;
alter table public.service_requests add constraint service_requests_price_check check (
  (price_cents is null and price_interval is null and setup_fee_cents is null)
  or (
    price_cents between 50 and 10000000
    and price_interval in ('one_time', 'month')
    -- A setup fee only makes sense on top of a monthly price.
    and (setup_fee_cents is null or (price_interval = 'month' and setup_fee_cents between 50 and 10000000))
  )
);
alter table public.service_requests drop constraint if exists service_requests_price_description_check;
alter table public.service_requests add constraint service_requests_price_description_check
  check (price_description is null or length(price_description) <= 500);

-- none: no price yet · awaiting_payment: priced, contractor hasn't paid
-- processing: bank payment submitted, not yet cleared · paid: one-time paid
-- active / past_due / canceled: monthly subscription state · failed: payment failed
alter table public.service_requests drop constraint if exists service_requests_payment_status_check;
alter table public.service_requests add constraint service_requests_payment_status_check check (
  payment_status in ('none', 'awaiting_payment', 'processing', 'paid', 'active', 'past_due', 'canceled', 'failed')
  and (payment_status = 'none' or price_cents is not null)
);

create unique index if not exists service_requests_stripe_subscription on public.service_requests (stripe_subscription_id)
  where stripe_subscription_id is not null;
create index if not exists idx_service_requests_payment on public.service_requests (payment_status)
  where payment_status <> 'none';

-- ---- 3. insert policy: contractors can't file a pre-priced or pre-paid request ---
drop policy if exists service_requests_insert on public.service_requests;
create policy service_requests_insert on public.service_requests for insert
  with check (
    contractor_id = public.auth_contractor_id()
    and requested_by = auth.uid()
    and status = 'new'
    and status_changed_by is null
    and notification_status = 'pending'
    and notification_attempts = 0
    and notification_claimed_at is null
    and notification_error is null
    and notified_at is null
    and price_cents is null
    and priced_at is null
    and priced_by is null
    and payment_status = 'none'
    and stripe_checkout_session_id is null
    and stripe_subscription_id is null
    and paid_at is null
  );
-- Updates stay admin-only (0018); the webhook writes with the service role.

-- ---- 4. webhook idempotency ------------------------------------------------------
-- Stripe can deliver an event more than once; each id is processed once.
create table if not exists public.stripe_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);
alter table public.stripe_events enable row level security;
-- No policies: only the service role (webhook) reads or writes it.
