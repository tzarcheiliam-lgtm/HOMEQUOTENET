-- Ad-hoc Stripe payment links an admin sends from Billing ("send a payment for whatever"),
-- independent of Growth Tools service requests.
--
-- Each row is one Stripe Payment Link (single-use: it stops working after one completed payment).
-- Created and updated by the server with the service role (the Stripe webhook marks it paid);
-- admins can read them. Additive and safe to re-run.

create table if not exists public.payment_requests (
  id                      uuid primary key default gen_random_uuid(),
  created_by              uuid references public.profiles(id) on delete set null,
  contractor_id           uuid references public.contractors(id) on delete set null,
  amount_cents            integer not null check (amount_cents between 50 and 10000000),
  interval                text not null default 'one_time' check (interval in ('one_time', 'month')),
  setup_fee_cents         integer check (setup_fee_cents is null or (interval = 'month' and setup_fee_cents between 50 and 10000000)),
  description             text not null check (char_length(description) between 1 and 200),
  customer_name           text check (customer_name is null or char_length(customer_name) <= 120),
  customer_email          text check (customer_email is null or char_length(customer_email) <= 254),
  status                  text not null default 'sent' check (status in ('sent', 'paid', 'canceled')),
  stripe_payment_link_id  text,
  url                     text,
  stripe_session_id       text,
  emailed_at              timestamptz,
  paid_at                 timestamptz,
  created_at              timestamptz not null default now()
);

create index if not exists idx_payment_requests_created on public.payment_requests (created_at desc);
create index if not exists idx_payment_requests_link on public.payment_requests (stripe_payment_link_id) where stripe_payment_link_id is not null;
create index if not exists idx_payment_requests_contractor on public.payment_requests (contractor_id) where contractor_id is not null;

alter table public.payment_requests enable row level security;

drop policy if exists payment_requests_admin_select on public.payment_requests;
create policy payment_requests_admin_select on public.payment_requests for select using (public.is_admin());
-- No client write policies: only the service role (server actions + Stripe webhook) writes.

comment on table public.payment_requests is
  'Ad-hoc Stripe Payment Links sent by admins from Billing. Written by the server; admin read-only via RLS.';
