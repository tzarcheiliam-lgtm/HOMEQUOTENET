-- =============================================================================
-- 0062 — Setter pay: paid per contractor sales meeting the owner sells
--
--   profiles.pay_per_sale            what this partner earns for each booked
--                                    sales meeting that is sold (admin-set)
--   profiles.weekly_booking_goal     sales meetings to book per week (admin-set;
--                                    null = no goal shown)
--   prospect_sales_appointments
--     .sale_outcome                  'sold' | 'not_sold' | null (undecided)
--     .sale_decided_at / _by         when and by whom the outcome was recorded
--     .setter_pay_amount             the partner's pay for this sale, snapshot
--                                    when it was marked sold, so a later rate
--                                    change never rewrites past earnings
--
-- Only an administrator can set pay, goals, sale outcomes, or move a meeting's
-- credit (partner_id): guard_profile_privileges() is extended and a new guard
-- covers the sales-appointment columns. Idempotent; safe to re-run.
-- =============================================================================

alter table public.profiles
  add column if not exists pay_per_sale numeric(10,2),
  add column if not exists weekly_booking_goal integer;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_pay_per_sale_range') then
    alter table public.profiles add constraint profiles_pay_per_sale_range
      check (pay_per_sale is null or pay_per_sale between 0 and 100000);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_weekly_booking_goal_range') then
    alter table public.profiles add constraint profiles_weekly_booking_goal_range
      check (weekly_booking_goal is null or weekly_booking_goal between 1 and 200);
  end if;
end $$;

comment on column public.profiles.pay_per_sale is
  'What this partner earns for each sales meeting they booked that is sold. Set by an administrator.';
comment on column public.profiles.weekly_booking_goal is
  'Sales meetings this partner aims to book per week (Mon–Fri). Null = no goal. Set by an administrator.';

-- Same guard as 0060, plus pay and the weekly booking goal.
create or replace function public.guard_profile_privileges()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.role is distinct from old.role
       or new.account_status is distinct from old.account_status
       or new.deleted_at is distinct from old.deleted_at
       or new.contractor_id is distinct from old.contractor_id
       or new.contractor_role is distinct from old.contractor_role
       or new.can_export_company_data is distinct from old.can_export_company_data
       or new.daily_call_goal is distinct from old.daily_call_goal
       or new.pay_per_sale is distinct from old.pay_per_sale
       or new.weekly_booking_goal is distinct from old.weekly_booking_goal then
      raise exception 'Only an HQN administrator can change account permissions';
    end if;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Sale outcome on contractor sales meetings
-- ---------------------------------------------------------------------------
alter table public.prospect_sales_appointments
  add column if not exists sale_outcome text,
  add column if not exists sale_decided_at timestamptz,
  add column if not exists sale_decided_by uuid references public.profiles(id) on delete set null,
  add column if not exists setter_pay_amount numeric(10,2);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'sales_appointments_sale_outcome_check') then
    alter table public.prospect_sales_appointments add constraint sales_appointments_sale_outcome_check
      check (sale_outcome is null or sale_outcome in ('sold', 'not_sold'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'sales_appointments_setter_pay_check') then
    alter table public.prospect_sales_appointments add constraint sales_appointments_setter_pay_check
      check (setter_pay_amount is null or (setter_pay_amount >= 0 and sale_outcome = 'sold'));
  end if;
end $$;

comment on column public.prospect_sales_appointments.sale_outcome is
  'Whether the owner sold this meeting: sold | not_sold | null (not decided yet). Admin-only.';
comment on column public.prospect_sales_appointments.setter_pay_amount is
  'The booking partner''s pay for this sale, fixed when it was marked sold. Admin-only.';

create index if not exists idx_sales_appointments_sold
  on public.prospect_sales_appointments (partner_id, sale_decided_at)
  where sale_outcome = 'sold';

-- Partners keep updating their own meetings (status, confirmation) under the
-- existing RLS policy; the money columns and the credit are administrator-only.
create or replace function public.guard_sales_appointment_pay()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if tg_op = 'INSERT' then
      if new.sale_outcome is not null or new.sale_decided_at is not null
         or new.sale_decided_by is not null or new.setter_pay_amount is not null then
        raise exception 'Only an HQN administrator can record a sale';
      end if;
    elsif new.sale_outcome is distinct from old.sale_outcome
       or new.sale_decided_at is distinct from old.sale_decided_at
       or new.sale_decided_by is distinct from old.sale_decided_by
       or new.setter_pay_amount is distinct from old.setter_pay_amount
       or new.partner_id is distinct from old.partner_id then
      raise exception 'Only an HQN administrator can record a sale or change who booked a meeting';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sales_appointments_pay_guard on public.prospect_sales_appointments;
create trigger trg_sales_appointments_pay_guard
  before insert or update on public.prospect_sales_appointments
  for each row execute function public.guard_sales_appointment_pay();
