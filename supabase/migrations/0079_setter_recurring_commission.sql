-- =============================================================================
-- 0079 — Setter commission on the contractor's monthly payment
--
-- A sold contractor meeting now records what the contractor pays HomeQuote per
-- month (monthly_fee). The booking setter earns a percentage of it:
--   monthly_fee >= 2500: 15% of the first month, then 10% every month the
--                        contractor stays
--   monthly_fee <  2500: 10% of the first month, then  7% every month
-- (rates live in lib/setter/money.ts). setter_pay_amount keeps the first-month
-- commission; later months are computed. churned_at ends the recurring pay.
-- Admin-only, like the other sale columns. Idempotent.
-- =============================================================================
alter table public.prospect_sales_appointments
  add column if not exists monthly_fee numeric(10,2),
  add column if not exists churned_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'sales_appointments_monthly_fee_check') then
    alter table public.prospect_sales_appointments add constraint sales_appointments_monthly_fee_check
      check (monthly_fee is null or (monthly_fee >= 0 and sale_outcome = 'sold'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'sales_appointments_churn_check') then
    alter table public.prospect_sales_appointments add constraint sales_appointments_churn_check
      check (churned_at is null or sale_outcome = 'sold');
  end if;
end $$;

comment on column public.prospect_sales_appointments.monthly_fee is
  'What the sold contractor pays HomeQuote per month; the base for the setter commission. Admin-only.';
comment on column public.prospect_sales_appointments.churned_at is
  'When the sold contractor cancelled; recurring setter commission stops. Admin-only.';

create or replace function public.guard_sales_appointment_pay()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if tg_op = 'INSERT' then
      if new.sale_outcome is not null or new.sale_decided_at is not null
         or new.sale_decided_by is not null or new.setter_pay_amount is not null
         or new.monthly_fee is not null or new.churned_at is not null then
        raise exception 'Only an HQN administrator can record a sale';
      end if;
    elsif new.sale_outcome is distinct from old.sale_outcome
       or new.sale_decided_at is distinct from old.sale_decided_at
       or new.sale_decided_by is distinct from old.sale_decided_by
       or new.setter_pay_amount is distinct from old.setter_pay_amount
       or new.monthly_fee is distinct from old.monthly_fee
       or new.churned_at is distinct from old.churned_at
       or new.partner_id is distinct from old.partner_id then
      raise exception 'Only an HQN administrator can record a sale or change who booked a meeting';
    end if;
  end if;
  return new;
end;
$$;
