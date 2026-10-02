-- Meta Instant Form (leadgen) connector hardening. Additive.
-- * Idempotency: one HomeQuote lead per (integration, Meta leadgen_id), enforced by the
--   database so concurrent / retried webhook deliveries cannot create duplicates.
-- * Custom Instant Form answers and the Facebook Page ID are kept on the lead.

alter table public.leads
  add column if not exists answers jsonb,
  add column if not exists page_id text,
  -- Meta browser identifiers (_fbp/_fbc), stored write-once at website contact submit.
  add column if not exists fbp text,
  add column if not exists fbc text;

alter table public.lead_intake_events
  add column if not exists page_id text;

-- Refuse to proceed (rather than delete or merge anything) if duplicate Meta lead ids exist.
-- Run supabase/scripts/meta-duplicate-leads.sql first; it lists them and has a reviewed,
-- non-destructive resolution procedure.
do $$
declare n integer;
begin
  select count(*) into n from (
    select 1 from public.leads
    where source = 'meta' and integration_id is not null and external_lead_id is not null
    group by integration_id, external_lead_id having count(*) > 1
  ) d;
  if n > 0 then
    raise exception 'Migration 0035 stopped: % duplicate Meta lead id group(s) in public.leads. Review them with supabase/scripts/meta-duplicate-leads.sql; nothing was changed.', n;
  end if;
end $$;

-- Scoped to source = 'meta' so funnel/other leads that reuse external_lead_id are unaffected.
create unique index if not exists uq_leads_meta_external
  on public.leads (integration_id, external_lead_id)
  where source = 'meta' and integration_id is not null and external_lead_id is not null;
