-- =============================================================================
-- 0063 — Contractor prospects can opt out of email
--
--   contractor_prospects.email_opt_out_at   set when the contractor asks us to
--                                           stop emailing ("stop" reply, or
--                                           said so on a call); every send
--                                           path refuses while it is set
--
-- Whoever holds the prospect may record the opt-out (the existing update
-- policy already limits writes to the assigned caller/setter or an admin);
-- only an administrator can lift it, the same rule as do-not-call.
-- Idempotent; safe to re-run.
-- =============================================================================

alter table public.contractor_prospects
  add column if not exists email_opt_out_at timestamptz;

comment on column public.contractor_prospects.email_opt_out_at is
  'When this contractor asked not to be emailed. While set, no prospect email can be sent. Only an admin can clear it.';

create or replace function public.guard_prospect_email_opt_out()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin()
     and old.email_opt_out_at is not null
     and new.email_opt_out_at is distinct from old.email_opt_out_at then
    raise exception 'Only an HQN administrator can lift an email opt-out';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prospects_email_opt_out_guard on public.contractor_prospects;
create trigger trg_prospects_email_opt_out_guard
  before update on public.contractor_prospects
  for each row execute function public.guard_prospect_email_opt_out();
