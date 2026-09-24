-- HomeQuote lead review + distribution.
--
-- New flow: Ad -> form -> lead saved in HomeQuote -> internal new-lead email to
-- the HomeQuote team (LEAD_ALERT_EMAILS, server env) -> a person qualifies the
-- lead -> an admin picks recipients -> "Send lead" emails them.
--
-- 1. Leads get a human review state (qualification_status) separate from the
--    funnel's automatic service-area check, plus free-text qualification notes.
-- 2. lead_recipients: the people a qualified lead can be sent to (team members
--    and contractors), managed in the app, optionally linked to a contractor
--    business so sending also creates the normal lead assignment.
-- 3. lead_email_deliveries: durable outbox + history for both the internal
--    new-lead alert and every qualified-lead send (status, attempts, Gmail id).
-- 4. Every lead_intake_events row that created or matched a lead (all sources:
--    funnels, Meta, GHL, Zapier, API) queues exactly one internal alert.
-- 5. A client funnel (e.g. Ethan / Pool Masters LA) still assigns its lead to
--    that contractor business inside HomeQuote (tracking/billing only). No
--    one is emailed: people only receive a lead when an admin selects them
--    and clicks Send lead. Calendly / GHL bookings are recorded on the lead
--    (and on the assignment's appointments when one exists).
--
-- Additive: existing leads are marked needs_qualification unless a person had
-- already qualified them; submitted client-funnel leads missing their
-- contractor assignment are backfilled; no alert is queued for past intakes.

-- ---- 1. lead review state ---------------------------------------------------
alter table public.leads
  add column if not exists qualification_status text not null default 'needs_qualification',
  add column if not exists qualification_notes text;
alter table public.leads drop constraint if exists leads_qualification_status_check;
alter table public.leads add constraint leads_qualification_status_check
  check (qualification_status in ('needs_qualification', 'qualified', 'not_qualified'));
update public.leads set qualification_status = 'qualified'
  where qualified and qualified_by is not null and qualification_status = 'needs_qualification';
create index if not exists idx_leads_qualification_status on public.leads(qualification_status);

-- ---- 2. recipients ------------------------------------------------------------
create table if not exists public.lead_recipients (
  id             uuid primary key default gen_random_uuid(),
  name           text not null check (length(trim(name)) between 1 and 120),
  company        text check (company is null or length(company) <= 160),
  email          text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(email) <= 254),
  phone          text check (phone is null or length(phone) <= 40),
  kind           text not null check (kind in ('team_member', 'contractor')),
  -- Optional link to a contractor business: sending then also creates the
  -- lead assignment used for appointments, outcomes and billing.
  contractor_id  uuid references public.contractors(id) on delete set null,
  is_active      boolean not null default true,
  created_by     uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create unique index if not exists lead_recipients_email_unique on public.lead_recipients (lower(email));
drop trigger if exists trg_lead_recipients_updated_at on public.lead_recipients;
create trigger trg_lead_recipients_updated_at before update on public.lead_recipients
  for each row execute function public.set_updated_at();
alter table public.lead_recipients enable row level security;
drop policy if exists lead_recipients_select on public.lead_recipients;
create policy lead_recipients_select on public.lead_recipients for select using (public.is_staff());
drop policy if exists lead_recipients_insert on public.lead_recipients;
create policy lead_recipients_insert on public.lead_recipients for insert with check (public.is_admin());
drop policy if exists lead_recipients_update on public.lead_recipients;
create policy lead_recipients_update on public.lead_recipients for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists lead_recipients_delete on public.lead_recipients;
create policy lead_recipients_delete on public.lead_recipients for delete using (public.is_admin());

-- ---- 3. email outbox / history ------------------------------------------------
create table if not exists public.lead_email_deliveries (
  id                  uuid primary key default gen_random_uuid(),
  lead_id             uuid not null references public.leads(id) on delete cascade,
  kind                text not null check (kind in ('new_lead_alert', 'qualified_lead')),
  intake_event_id     uuid references public.lead_intake_events(id) on delete set null,
  is_repeat           boolean not null default false,  -- alert for a repeat submission of an existing lead
  recipient_id        uuid references public.lead_recipients(id) on delete set null,
  recipient_name      text,
  recipient_email     text,          -- alerts: filled with the team addresses when sent
  is_resend           boolean not null default false,
  requested_by        uuid references public.profiles(id) on delete set null,
  status              text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed')),
  attempts            integer not null default 0,
  available_at        timestamptz not null default now(),
  subject             text,
  provider_message_id text,
  last_error          text,
  sent_at             timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint lead_email_qualified_shape check (kind <> 'qualified_lead' or recipient_email is not null),
  constraint lead_email_sent_shape check (status <> 'sent' or (sent_at is not null and provider_message_id is not null))
);
-- One internal alert per intake event.
create unique index if not exists lead_email_alert_once on public.lead_email_deliveries (intake_event_id)
  where kind = 'new_lead_alert';
-- A qualified lead goes to a given address once, unless an admin explicitly resends.
create unique index if not exists lead_email_send_once on public.lead_email_deliveries (lead_id, lower(recipient_email))
  where kind = 'qualified_lead' and not is_resend;
create index if not exists idx_lead_email_deliveries_lead on public.lead_email_deliveries (lead_id, created_at desc);
create index if not exists idx_lead_email_deliveries_queue on public.lead_email_deliveries (available_at)
  where status in ('pending', 'failed', 'sending');
drop trigger if exists trg_lead_email_deliveries_updated_at on public.lead_email_deliveries;
create trigger trg_lead_email_deliveries_updated_at before update on public.lead_email_deliveries
  for each row execute function public.set_updated_at();
alter table public.lead_email_deliveries enable row level security;
drop policy if exists lead_email_deliveries_select on public.lead_email_deliveries;
create policy lead_email_deliveries_select on public.lead_email_deliveries for select using (public.is_staff());
-- No write policies: trusted server code (service role) queues and finalizes rows.

-- ---- 4. queue one internal alert for every new/matched intake ------------------
create or replace function public.queue_new_lead_alert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status in ('created', 'duplicate') and coalesce(new.lead_id, new.duplicate_of) is not null then
    insert into public.lead_email_deliveries (lead_id, kind, intake_event_id, is_repeat)
      values (coalesce(new.lead_id, new.duplicate_of), 'new_lead_alert', new.id, new.status = 'duplicate')
      on conflict do nothing;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_lead_intake_alert on public.lead_intake_events;
create trigger trg_lead_intake_alert after insert on public.lead_intake_events
  for each row execute function public.queue_new_lead_alert();

-- Lease a batch of due emails (or specific ids, e.g. right after "Send lead").
create or replace function public.claim_lead_email_deliveries(p_ids uuid[] default null)
returns setof public.lead_email_deliveries language sql security definer set search_path = public as $$
  update public.lead_email_deliveries
     set status = 'sending', attempts = attempts + 1, available_at = now() + interval '5 minutes'
   where id in (
     select id from public.lead_email_deliveries
      where (p_ids is null and attempts < 6 and available_at <= now()
               -- 'sending' past its lease = a run that crashed mid-send.
               and status in ('pending', 'failed', 'sending'))
         or (p_ids is not null and id = any(p_ids) and status in ('pending', 'failed'))
      order by created_at
      for update skip locked limit 20)
  returning *;
$$;
revoke all on function public.claim_lead_email_deliveries(uuid[]) from public, anon, authenticated;
grant execute on function public.claim_lead_email_deliveries(uuid[]) to service_role;

-- ---- 5a. booking time kept on the booking itself -------------------------------
alter table public.funnel_bookings add column if not exists scheduled_at timestamptz;

-- ---- 5b. funnel submission: save + alert; client funnels assign (no email) ------
create or replace function public.save_funnel_session(
  p_id uuid, p_hash text, p_version integer, p_answers jsonb, p_step text,
  p_completed text default null, p_contact jsonb default null,
  p_qualified boolean default null, p_consent text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare s public.funnel_sessions; f public.funnels; l uuid; a uuid; was_duplicate boolean := false; scope jsonb;
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
          p_answers->>(select q->>'id' from jsonb_array_elements(s.config_snapshot->'questions') q where q->>'type'='zip'),
          f.vertical_id,'website','web',false,p_answers->>'budget',p_answers->>'timeline',
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

-- ---- 5b'. backfill: submitted client-funnel leads get their contractor assignment
insert into public.lead_assignments(lead_id, contractor_id)
  select distinct s.lead_id, f.contractor_id from public.funnel_sessions s join public.funnels f on f.id=s.funnel_id
   where s.lead_id is not null and f.contractor_id is not null and not f.is_demo
  on conflict (lead_id, contractor_id) do nothing;
update public.funnel_sessions s set assignment_id = la.id
  from public.funnels f, public.lead_assignments la
 where f.id = s.funnel_id and f.contractor_id is not null and s.lead_id is not null and s.assignment_id is null
   and la.lead_id = s.lead_id and la.contractor_id = f.contractor_id;

-- ---- 5c. Calendly booking: record on the lead; appointment only if assigned ----
create or replace function public.record_calendly_booking(p_session uuid, p_hash text, p_invitee text, p_event text,
  p_time timestamptz default null, p_verified boolean default false)
returns jsonb language plpgsql security definer set search_path=public as $$
declare s public.funnel_sessions; a uuid; c uuid;
begin
  select * into s from public.funnel_sessions where id=p_session and token_hash=p_hash and expires_at>now() for update;
  if not found or s.contact_submitted_at is null or s.qualified is not true or s.lead_id is null
    or s.config_snapshot->>'calendarProvider' is distinct from 'calendly' then
    raise exception 'Booking does not match a submitted session';
  end if;
  if exists(select 1 from public.funnel_bookings where provider='calendly' and external_id=p_invitee and session_id<>s.id) then
    raise exception 'Calendly invitee already belongs to another session';
  end if;
  if s.booked_at is not null then return to_jsonb(s) - 'token_hash' - 'rate_key' - 'contact'; end if;
  if s.assignment_id is not null then
    select contractor_id into c from public.lead_assignments where id=s.assignment_id;
    insert into public.appointments(assignment_id,scheduled_at,notes)
      values(s.assignment_id,p_time,case when p_time is null then 'Booked in Calendly from the website funnel (see Calendly for the time)' else 'Booked in Calendly from the website funnel' end)
      returning id into a;
    update public.lead_assignments set status='appointment_set' where id=s.assignment_id and status in ('assigned','accepted','contacted');
  end if;
  insert into public.funnel_bookings(provider,integration_id,external_id,session_id,appointment_id,verified,scheduled_at)
    values('calendly',null,p_invitee,s.id,a,p_verified,p_time);
  update public.funnel_sessions set booked_at=now() where id=s.id;
  insert into public.funnel_events(session_id,event) values(s.id,'appointment_booked') on conflict do nothing;
  insert into public.lead_activities(lead_id,type,body,metadata) values(s.lead_id,'appointment',
    'Appointment booked in Calendly from the website funnel',
    case when c is null then '{}'::jsonb else jsonb_build_object('contractor_id',c) end
      || jsonb_build_object('appointment_id',a,'session_id',s.id,'calendly_event',p_event,'calendly_invitee',p_invitee,'scheduled_at',p_time,'verified',p_verified));
  select * into s from public.funnel_sessions where id=p_session;
  return to_jsonb(s) - 'token_hash' - 'rate_key' - 'contact';
end;
$$;
revoke all on function public.record_calendly_booking(uuid,text,text,text,timestamptz,boolean) from public,anon,authenticated;
grant execute on function public.record_calendly_booking(uuid,text,text,text,timestamptz,boolean) to service_role;

-- ---- 5d. GHL calendar callback: same, now that sessions have no assignment ----
create or replace function public.record_funnel_booking(p_session uuid,p_integration uuid,p_external text,p_calendar text,p_time timestamptz)
returns uuid language plpgsql security definer set search_path=public as $$
declare s public.funnel_sessions; a uuid; c uuid; existing uuid;
begin
  select fs.* into s from public.funnel_sessions fs join public.funnels f on f.id=fs.funnel_id
    where fs.id=p_session and f.integration_id=p_integration and not f.is_demo for update of fs;
  if not found or s.lead_id is null or s.qualified is not true or s.config_snapshot->>'calendarId' is distinct from p_calendar
    then raise exception 'Booking does not match a submitted session'; end if;
  if exists(select 1 from public.funnel_bookings where integration_id=p_integration and external_id=p_external and session_id<>s.id) then
    raise exception 'Provider appointment already belongs to another session';
  end if;
  select id, appointment_id into existing, a from public.funnel_bookings where integration_id=p_integration and external_id=p_external;
  if existing is not null then return a; end if;
  if s.assignment_id is not null then
    select contractor_id into c from public.lead_assignments where id=s.assignment_id;
    insert into public.appointments(assignment_id,scheduled_at,notes) values(s.assignment_id,p_time,'Booked through website funnel') returning id into a;
    update public.lead_assignments set status='appointment_set' where id=s.assignment_id and status in ('assigned','accepted','contacted');
  end if;
  insert into public.funnel_bookings(integration_id,external_id,session_id,appointment_id,scheduled_at) values(p_integration,p_external,s.id,a,p_time);
  update public.funnel_sessions set booked_at=now() where id=s.id;
  insert into public.funnel_events(session_id,event) values(s.id,'appointment_booked') on conflict do nothing;
  insert into public.lead_activities(lead_id,type,body,metadata) values(s.lead_id,'appointment','Website appointment confirmed',
    case when c is null then '{}'::jsonb else jsonb_build_object('contractor_id',c) end
      || jsonb_build_object('appointment_id',a,'session_id',s.id,'scheduled_at',p_time));
  return a;
end;
$$;
revoke all on function public.record_funnel_booking(uuid,uuid,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.record_funnel_booking(uuid,uuid,text,text,timestamptz) to service_role;

-- ---- 6. send a qualified lead ---------------------------------------------------
-- Queues one email per selected recipient. Without p_resend, a recipient who
-- already has a send for this lead is skipped (reported back), so double
-- clicks and repeat submits never email anyone twice. Contractor-linked
-- recipients also get the standard lead assignment, and a website booking made
-- on that contractor's funnel is attached as their appointment.
create or replace function public.distribute_lead(p_lead uuid, p_recipients uuid[], p_actor uuid, p_resend boolean default false)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  ld public.leads; r public.lead_recipients; d uuid; asg uuid; queued uuid[] := '{}'; skipped jsonb := '[]'; prior boolean; b record;
begin
  select * into ld from public.leads where id=p_lead for update;
  if not found then raise exception 'Lead not found'; end if;
  if ld.qualification_status <> 'qualified' then raise exception 'Qualify the lead before sending it' using errcode='P0001'; end if;
  if coalesce(array_length(p_recipients,1),0) = 0 then raise exception 'Choose at least one recipient'; end if;
  for r in select * from public.lead_recipients where id = any(p_recipients) order by name loop
    if not r.is_active then
      skipped := skipped || jsonb_build_object('id',r.id,'name',r.name,'reason','inactive');
      continue;
    end if;
    select exists(select 1 from public.lead_email_deliveries where lead_id=p_lead and kind='qualified_lead'
      and lower(recipient_email)=lower(r.email)) into prior;
    if prior and not p_resend then
      skipped := skipped || jsonb_build_object('id',r.id,'name',r.name,'reason','already_sent');
      continue;
    end if;
    insert into public.lead_email_deliveries(lead_id,kind,recipient_id,recipient_name,recipient_email,is_resend,requested_by)
      values(p_lead,'qualified_lead',r.id,r.name,lower(r.email),prior,p_actor) returning id into d;
    queued := queued || d;
    if r.contractor_id is not null then
      insert into public.lead_assignments(lead_id,contractor_id,assigned_by,pricing_agreement_id)
        values(p_lead,r.contractor_id,p_actor,(select id from public.pricing_agreements where contractor_id=r.contractor_id and is_active
          and (vertical_id=ld.vertical_id or vertical_id is null) and active_from<=current_date and (active_to is null or active_to>=current_date)
          order by (vertical_id=ld.vertical_id) desc nulls last,active_from desc limit 1))
        on conflict(lead_id,contractor_id) do nothing;
      select id into asg from public.lead_assignments where lead_id=p_lead and contractor_id=r.contractor_id;
      for b in select fb.id, fb.scheduled_at, fs.id as session_id from public.funnel_bookings fb
          join public.funnel_sessions fs on fs.id=fb.session_id join public.funnels f on f.id=fs.funnel_id
          where fs.lead_id=p_lead and fb.appointment_id is null and f.contractor_id=r.contractor_id loop
        insert into public.appointments(assignment_id,scheduled_at,notes)
          values(asg,b.scheduled_at,'Booked by the homeowner on the website funnel') returning id into d;
        update public.funnel_bookings set appointment_id=d where id=b.id;
        update public.funnel_sessions set assignment_id=asg where id=b.session_id and assignment_id is null;
        update public.lead_assignments set status='appointment_set' where id=asg and status in ('assigned','accepted','contacted');
      end loop;
    end if;
    insert into public.lead_activities(lead_id,actor_id,type,body,metadata)
      values(p_lead,p_actor,'assignment',
        case when prior then 'Lead re-sent to ' else 'Lead sent to ' end || r.name || coalesce(' (' || r.company || ')',''),
        jsonb_build_object('recipient_id',r.id,'recipient_kind',r.kind,'resend',prior));
  end loop;
  if array_length(queued,1) > 0 then
    update public.leads set status='assigned' where id=p_lead and status in ('new','contact_attempted','qualified');
  end if;
  return jsonb_build_object('queued',to_jsonb(queued),'skipped',skipped);
end;
$$;
revoke all on function public.distribute_lead(uuid,uuid[],uuid,boolean) from public,anon,authenticated;
grant execute on function public.distribute_lead(uuid,uuid[],uuid,boolean) to service_role;
