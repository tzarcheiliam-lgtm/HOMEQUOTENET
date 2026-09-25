-- ============================================================================
-- Funnel builder (Phase 1: data model for no-code funnel management)
-- ============================================================================
-- Additive. Builds on 0012-0016 (funnels/funnel_sessions/... + review-first
-- leads). No existing table, column, function or RLS policy is removed or
-- narrowed. Renumbered from a draft 0018 after 0017/0018 landed on main for
-- unrelated contractor-portal work.
--
-- Design decision (see docs/funnel-builder-architecture.md): the builder does
-- NOT introduce funnel_steps / funnel_step_options / funnel_logic_rules
-- tables. `funnels.config` (jsonb, validated by lib/funnels/schema.ts
-- funnelSchema) already IS the steps/branching/branding/routing/calendar
-- model, and every consumer (public renderer, save_funnel_session,
-- funnel_report, GHL/Calendly delivery, RLS) is built on it. A second,
-- normalized step-table system would be exactly the "parallel lead/form
-- system" the brief says not to build. The builder edits and validates this
-- same JSON through server actions; nothing about the storage shape changes.
--
-- New in this migration:
--   1. funnels.status (draft/published/archived) — richer than `published`,
--      which stays as-is (existing public/report code reads it) and is kept
--      in sync by a trigger so nothing downstream needs to change.
--   2. funnels.created_by / updated_at — authorship + audit for the dashboard.
--   3. funnel_templates — reusable starting configs a funnel can be duplicated
--      from ("Create from template"). Duplicating copies the config into a
--      new funnels row with a new id/slug; templates are never run directly.
--
-- Workflow automation is owned by migration 0017 and the Phase 2 runtime.
-- The AFTER INSERT trigger on public.leads calls emit_workflow_event() with
-- the fact-level key `lead.created|lead:<lead id>`. This function therefore
-- keeps writing the normal lead/intake/activity facts and never inserts a
-- subsystem-specific workflow event of its own.

-- ---- 1-2. status, authorship, audit ----------------------------------------
alter table public.funnels
  add column if not exists status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  add column if not exists created_by uuid references public.profiles(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

-- Backfill: a funnel already marked published (the demo, Pool Masters, the
-- house pool funnel) starts life as 'published', not 'draft'.
update public.funnels set status = 'published' where published and status = 'draft';

drop trigger if exists trg_funnels_updated_at on public.funnels;
create trigger trg_funnels_updated_at
  before update on public.funnels
  for each row execute function public.set_updated_at();

-- Keep the legacy `published` boolean in sync with `status` in both
-- directions, so scripts/funnels.mjs (which still writes `published`) and the
-- builder (which writes `status`) never disagree about what the public
-- renderer serves.
create or replace function public.sync_funnel_status() returns trigger
language plpgsql as $$
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    new.published := (new.status = 'published');
  elsif tg_op = 'UPDATE' and new.published is distinct from old.published then
    new.status := case when new.published then 'published'
      when new.status = 'published' then 'draft' else new.status end;
  elsif tg_op = 'INSERT' then
    new.status := coalesce(new.status, case when new.published then 'published' else 'draft' end);
    new.published := (new.status = 'published');
  end if;
  return new;
end;
$$;
drop trigger if exists trg_funnels_sync_status on public.funnels;
create trigger trg_funnels_sync_status
  before insert or update on public.funnels
  for each row execute function public.sync_funnel_status();

create index if not exists idx_funnels_status on public.funnels(status, updated_at desc);

-- ---- 3. funnel_templates ----------------------------------------------------
create table if not exists public.funnel_templates (
  id          uuid primary key default gen_random_uuid(),
  -- Stable key for the built-in seed templates (content/funnels/templates/*.json);
  -- null for a template an admin saved from an existing funnel.
  key         text unique check (key is null or key ~ '^[a-z][a-z0-9_-]{0,63}$'),
  name        text not null check (length(trim(name)) between 1 and 120),
  category    text not null check (length(trim(category)) between 1 and 80),
  description text check (description is null or length(description) <= 500),
  config      jsonb not null,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);
alter table public.funnel_templates enable row level security;
create policy funnel_templates_admin on public.funnel_templates for all
  using (public.is_admin()) with check (public.is_admin());

-- ---- 4. save_funnel_session: emit lead.created on a brand-new lead ---------
create or replace function public.save_funnel_session(
  p_id uuid, p_hash text, p_version integer, p_answers jsonb, p_step text,
  p_completed text default null, p_contact jsonb default null,
  p_qualified boolean default null, p_consent text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare s public.funnel_sessions; f public.funnels; l uuid; a uuid; was_duplicate boolean := false; scope jsonb; v_zip text;
begin
  select * into s from public.funnel_sessions where id=p_id and token_hash=p_hash and expires_at>now() for update;
  if not found then raise exception 'Session expired'; end if;
  select * into f from public.funnels where id=s.funnel_id and published;
  if not found then raise exception 'Funnel unavailable'; end if;
  if s.version <> p_version then raise exception 'Session changed; reload' using errcode='40001'; end if;
  if s.contact_submitted_at is not null then return to_jsonb(s) - 'token_hash' - 'rate_key' - 'contact'; end if;
  update public.funnel_sessions set answers=p_answers, current_step=p_step,
    qualified=p_qualified, version=version+1, updated_at=now() where id=s.id;
  insert into public.funnel_events(session_id,event,step_id) values(s.id,'step_viewed',p_step) on conflict do nothing;
  if p_completed is not null then
    insert into public.funnel_events(session_id,event,step_id) values(s.id,'session_started',''),(s.id,'step_completed',p_completed) on conflict do nothing;
  end if;
  if p_contact is not null then
    if p_qualified is null or p_contact->>'consent' <> 'true' then raise exception 'Incomplete submission'; end if;
    if not f.is_demo then
      -- Serialize by both normalized contact identifiers to prevent concurrent duplicates.
      perform pg_advisory_xact_lock(least(hashtextextended(lower(trim(p_contact->>'email')),0),hashtextextended(public.to_e164(p_contact->>'phone'),0)));
      perform pg_advisory_xact_lock(greatest(hashtextextended(lower(trim(p_contact->>'email')),0),hashtextextended(public.to_e164(p_contact->>'phone'),0)));
      v_zip := p_answers->>(select q->>'id' from jsonb_array_elements(s.config_snapshot->'questions') q where q->>'type'='zip');
      if f.contractor_id is null then
        -- House funnel: HomeQuote owns the lead, so reuse any active match.
        select existing.id into l from public.leads existing
          where existing.archived_at is null
          and (existing.email_normalized=lower(trim(p_contact->>'email')) or existing.phone_e164=public.to_e164(p_contact->>'phone'))
          order by existing.created_at limit 1;
      else
        -- Client funnel: reuse only a lead from this same funnel or already
        -- assigned to this contractor; never merge into another client's lead.
        select existing.id into l from public.leads existing
          where existing.archived_at is null
          and (existing.email_normalized=lower(trim(p_contact->>'email')) or existing.phone_e164=public.to_e164(p_contact->>'phone'))
          and (existing.consent_source='funnel:'||f.slug
               or exists(select 1 from public.lead_assignments la where la.lead_id=existing.id and la.contractor_id=f.contractor_id))
          order by existing.created_at limit 1;
      end if;
      was_duplicate := l is not null;
      if l is null then
        -- qualified stays false: the funnel's automatic check (service area etc.)
        -- is kept on the session/activity; a person qualifies the lead.
        insert into public.leads(first_name,last_name,email,phone,zip,vertical_id,source,platform,qualified,
          budget_range,timeline,project_description,utm_source,utm_medium,utm_campaign,utm_term,utm_content,
          referrer,landing_page_url,external_lead_id,integration_id,consent_granted,consent_at,consent_source,consent_disclosure)
        values(p_contact->>'firstName',p_contact->>'lastName',lower(p_contact->>'email'),public.to_e164(p_contact->>'phone'),
          v_zip,f.vertical_id,'website','web',false,p_answers->>'budget',p_answers->>'timeline',
          p_answers::text,s.attribution->>'utm_source',s.attribution->>'utm_medium',s.attribution->>'utm_campaign',s.attribution->>'utm_term',s.attribution->>'utm_content',
          s.attribution->>'referrer',s.attribution->>'landing_page_url',s.id::text,f.integration_id,true,now(),'funnel:'||f.slug,p_consent)
        returning id into l;
      end if;
      -- Client funnel: record the lead against that contractor business in
      -- HomeQuote. This emails nobody (see distribute_lead for sending).
      if f.contractor_id is not null then
        insert into public.lead_assignments(lead_id,contractor_id,pricing_agreement_id)
          values(l,f.contractor_id,(select id from public.pricing_agreements where contractor_id=f.contractor_id and is_active
            and (vertical_id=f.vertical_id or vertical_id is null) and active_from<=current_date and (active_to is null or active_to>=current_date)
            order by (vertical_id=f.vertical_id) desc nulls last,active_from desc limit 1))
          on conflict(lead_id,contractor_id) do nothing;
        select id into a from public.lead_assignments where lead_id=l and contractor_id=f.contractor_id;
      end if;
      -- A client funnel's request belongs to that client; if the lead is later
      -- shared, other contractors must not see which client funnel it came from.
      scope := case when f.contractor_id is null then '{}'::jsonb else jsonb_build_object('contractor_id',f.contractor_id) end;
      insert into public.lead_activities(lead_id,type,body,metadata) values(l,'system','Website estimate request received',
        scope || jsonb_build_object('funnel',f.slug,'session_id',s.id,'answers',p_answers,'attribution',s.attribution,'qualified',p_qualified,'consent',p_consent));
      -- Also queues the internal new-lead alert (trg_lead_intake_alert).
      insert into public.lead_intake_events(integration_id,provider,platform,status,external_lead_id,lead_id,duplicate_of,normalized)
        values(f.integration_id,'website','web',case when was_duplicate then 'duplicate' else 'created' end,s.id::text,l,
          case when was_duplicate then l end,jsonb_build_object('funnel',f.slug,'answers',p_answers,'attribution',s.attribution,'qualified',p_qualified));
      if f.integration_id is not null then
        insert into public.funnel_deliveries(session_id,integration_id) values(s.id,f.integration_id) on conflict do nothing;
      end if;
      -- The canonical AFTER INSERT trigger on public.leads has already emitted
      -- `lead.created|lead:<lead id>` through emit_workflow_event() when this was
      -- a new lead. Duplicate funnel submissions reuse `l` and emit nothing.
    end if;
    update public.funnel_sessions set contact=case when f.is_demo then null else p_contact-'website' end,contact_submitted_at=now(),lead_id=l,assignment_id=a where id=s.id;
    insert into public.funnel_events(session_id,event) values(s.id,'contact_submitted') on conflict do nothing;
    if p_qualified then insert into public.funnel_events(session_id,event) values(s.id,'qualified') on conflict do nothing; end if;
  end if;
  select * into s from public.funnel_sessions where id=p_id;
  return to_jsonb(s) - 'token_hash' - 'rate_key' - 'contact';
end;
$$;
revoke all on function public.save_funnel_session(uuid,text,integer,jsonb,text,text,jsonb,boolean,text) from public,anon,authenticated;
grant execute on function public.save_funnel_session(uuid,text,integer,jsonb,text,text,jsonb,boolean,text) to service_role;
