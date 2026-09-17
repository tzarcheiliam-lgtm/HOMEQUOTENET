-- ============================================================================
-- HomeQuote Network — Production Hardening (post-audit)
-- ============================================================================
-- Additive migration. Run AFTER 0001–0004.
--   H1: backfill lead_assignments.pricing_agreement_id (revenue protection)
--   M1/M2: normalized contact columns + trigger + indexes (duplicate detection)
--   H4: TCPA consent fields on leads
-- No business logic is changed — these add data integrity + attribution support.
-- ============================================================================

-- ---- M2: phone → E.164 normalizer (matches the JS normalizer) --------------
create or replace function public.to_e164(p text)
returns text language plpgsql immutable as $$
declare d text;
begin
  if p is null then return null; end if;
  d := regexp_replace(p, '\D', '', 'g');
  if d = '' then return null; end if;
  if length(d) = 10 then return '+1' || d;
  elsif length(d) = 11 and left(d, 1) = '1' then return '+' || d;
  else return '+' || d; -- best effort for international / other lengths
  end if;
end;
$$;

-- ---- leads: normalized contact + consent (additive) ------------------------
alter table public.leads
  add column if not exists email_normalized   text,
  add column if not exists phone_e164          text,
  add column if not exists consent_granted     boolean not null default false,
  add column if not exists consent_at          timestamptz,
  add column if not exists consent_source      text,
  add column if not exists consent_disclosure  text;

-- Keep normalized columns in sync on every write (covers manual + intake).
create or replace function public.normalize_lead_contact()
returns trigger language plpgsql as $$
begin
  new.email_normalized := nullif(lower(trim(coalesce(new.email, ''))), '');
  new.phone_e164 := public.to_e164(new.phone);
  return new;
end;
$$;

drop trigger if exists trg_leads_normalize on public.leads;
create trigger trg_leads_normalize
  before insert or update on public.leads
  for each row execute function public.normalize_lead_contact();

-- Backfill existing rows.
update public.leads
  set email_normalized = nullif(lower(trim(coalesce(email, ''))), ''),
      phone_e164 = public.to_e164(phone);

create index if not exists idx_leads_email_normalized on public.leads (email_normalized);
create index if not exists idx_leads_phone_e164 on public.leads (phone_e164);

-- ---- H1: backfill active pricing agreement onto past assignments -----------
-- Picks the contractor's active agreement, preferring a vertical-specific match
-- over an all-verticals one. Only fills NULLs (preserves any explicit value).
update public.lead_assignments la
set pricing_agreement_id = (
  select pa.id
  from public.pricing_agreements pa
  join public.leads l on l.id = la.lead_id
  where pa.contractor_id = la.contractor_id
    and pa.is_active
    and (pa.vertical_id = l.vertical_id or pa.vertical_id is null)
    and pa.active_from <= current_date
    and (pa.active_to is null or pa.active_to >= current_date)
  order by (pa.vertical_id = l.vertical_id) desc nulls last, pa.active_from desc
  limit 1
)
where la.pricing_agreement_id is null;
