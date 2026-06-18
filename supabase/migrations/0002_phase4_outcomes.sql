-- ============================================================================
-- HomeQuote Network — Phase 4: Outcomes & Revenue
-- ============================================================================
-- Additive migration. Run this AFTER 0001 (which is already applied).
-- Extends each lead_assignment's funnel: Estimate -> Sale -> Commission -> Billing.
-- Preserves the many-to-many model: estimates, sales, and billing all hang off
-- lead_assignments, never off leads directly.
--
-- NOTE on enums: the two `alter type ... add value` statements below cannot run
-- inside an explicit transaction block. The Supabase SQL editor runs them fine.
-- If you ever wrap this file in BEGIN/COMMIT and it errors, run those two lines
-- on their own first.
-- ============================================================================

-- Sale status (new enum, guarded so the migration is re-runnable).
do $$
begin
  if not exists (select 1 from pg_type where typname = 'sale_status') then
    create type public.sale_status as enum ('won', 'pending', 'refunded', 'cancelled');
  end if;
end $$;

-- Extend billing status with the Phase 4 states.
alter type public.billing_status add value if not exists 'overdue';
alter type public.billing_status add value if not exists 'waived';

-- ---- estimates -------------------------------------------------------------
alter table public.estimates
  add column if not exists estimate_date date not null default current_date;

-- ---- sales -----------------------------------------------------------------
alter table public.sales
  add column if not exists sale_date date not null default current_date,
  add column if not exists sale_status public.sale_status not null default 'won',
  add column if not exists commission_amount numeric(12,2),
  add column if not exists commission_type text,
  add column if not exists commission_is_override boolean not null default false;

-- closed_at already exists in 0001 and serves as the "closed date".

-- ---- billing_events --------------------------------------------------------
alter table public.billing_events
  add column if not exists amount_paid numeric(12,2) not null default 0,
  add column if not exists due_date date,
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists trg_billing_events_updated_at on public.billing_events;
create trigger trg_billing_events_updated_at
  before update on public.billing_events
  for each row execute function public.set_updated_at();

-- ============================================================================
-- RLS: no new tables. Existing policies already enforce Phase 4 requirements:
--   * estimates / sales  -> staff OR owns_assignment (contractors manage their own)
--   * billing_events     -> admin only (contractors cannot view or edit billing)
-- ============================================================================
