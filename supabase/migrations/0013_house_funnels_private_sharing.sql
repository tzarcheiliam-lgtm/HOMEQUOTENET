-- House funnels + private lead sharing.
--
-- 1. A funnel with no contractor is a HomeQuote "house" funnel: submissions
--    become unassigned leads in the HomeQuote inbox, and staff distribute them
--    to one or more contractors with the existing assignment tools.
-- 2. When one lead is assigned to several contractors, each contractor must
--    only see their own side of it. Assignments, appointments, estimates and
--    sales are already per-assignment; activities and attachments were per
--    lead, so another contractor's notes/files and "Assigned to N contractors"
--    entries were visible. Contractors now see only their own company's
--    entries plus neutral HomeQuote entries.

alter table public.funnels drop constraint if exists funnels_check;

-- ---- contractor-scoped visibility ------------------------------------------
-- Rules, in order:
--  * metadata.contractor_id set  -> only that contractor (explicitly scoped).
--  * written by a contractor user -> only that contractor's own company.
--  * written by staff/system      -> only neutral entry types. Assignment,
--    appointment and status entries describe distribution, so they stay staff-only.
create or replace function public.activity_visible_to_contractor(p_actor uuid, p_type public.activity_type, p_metadata jsonb)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when p_metadata ? 'contractor_id' then p_metadata->>'contractor_id' = public.auth_contractor_id()::text
    when exists (select 1 from public.profiles p where p.id = p_actor and p.contractor_id is not null)
      then exists (select 1 from public.profiles p where p.id = p_actor and p.contractor_id = public.auth_contractor_id())
    else p_type in ('note', 'contact_attempt', 'qualification', 'field_change', 'system')
  end
$$;

create or replace function public.upload_visible_to_contractor(p_uploader uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select not exists (select 1 from public.profiles p where p.id = p_uploader and p.contractor_id is not null)
    or exists (select 1 from public.profiles p where p.id = p_uploader and p.contractor_id = public.auth_contractor_id())
$$;

drop policy if exists activities_select on public.lead_activities;
create policy activities_select on public.lead_activities for select
  using (public.is_staff() or (public.lead_assigned_to_me(lead_id)
    and public.activity_visible_to_contractor(actor_id, type, metadata)));
-- A contractor may only write entries as themselves, never scoped to someone else.
drop policy if exists activities_insert on public.lead_activities;
create policy activities_insert on public.lead_activities for insert
  with check (public.is_staff() or (public.lead_assigned_to_me(lead_id) and actor_id = auth.uid()
    and (not metadata ? 'contractor_id' or metadata->>'contractor_id' = public.auth_contractor_id()::text)));

drop policy if exists attachments_select on public.lead_attachments;
create policy attachments_select on public.lead_attachments for select
  using (public.is_staff() or (public.lead_assigned_to_me(lead_id) and public.upload_visible_to_contractor(uploaded_by)));
drop policy if exists attachments_insert on public.lead_attachments;
create policy attachments_insert on public.lead_attachments for insert
  with check (public.is_staff() or (public.lead_assigned_to_me(lead_id) and uploaded_by = auth.uid()));
-- Contractors may delete only files their own company uploaded.
drop policy if exists attachments_delete on public.lead_attachments;
create policy attachments_delete on public.lead_attachments for delete
  using (public.is_staff() or (public.lead_assigned_to_me(lead_id) and uploaded_by is not null
    and exists (select 1 from public.profiles p where p.id = uploaded_by and p.contractor_id = public.auth_contractor_id())));

-- ---- funnel submission: house funnels + scoped activity ---------------------
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
        -- Client funnel: only reuse a lead already assigned to this contractor;
        -- never expose another client's lead.
        select la.lead_id into l from public.lead_assignments la join public.leads existing on existing.id=la.lead_id
          where la.contractor_id=f.contractor_id and existing.archived_at is null
          and (existing.email_normalized=lower(trim(p_contact->>'email')) or existing.phone_e164=public.to_e164(p_contact->>'phone'))
          order by existing.created_at limit 1;
      end if;
      was_duplicate := l is not null;
      if l is null then
        insert into public.leads(first_name,last_name,email,phone,zip,vertical_id,source,platform,qualified,qualified_at,
          budget_range,timeline,project_description,utm_source,utm_medium,utm_campaign,utm_term,utm_content,
          referrer,landing_page_url,external_lead_id,integration_id,consent_granted,consent_at,consent_source,consent_disclosure)
        values(p_contact->>'firstName',p_contact->>'lastName',lower(p_contact->>'email'),public.to_e164(p_contact->>'phone'),
          p_answers->>(select q->>'id' from jsonb_array_elements(s.config_snapshot->'questions') q where q->>'type'='zip'),
          f.vertical_id,'website','web',p_qualified,case when p_qualified then now() end,p_answers->>'budget',p_answers->>'timeline',
          p_answers::text,s.attribution->>'utm_source',s.attribution->>'utm_medium',s.attribution->>'utm_campaign',s.attribution->>'utm_term',s.attribution->>'utm_content',
          s.attribution->>'referrer',s.attribution->>'landing_page_url',s.id::text,f.integration_id,true,now(),'funnel:'||f.slug,p_consent)
        returning id into l;
      end if;
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

-- Booking confirmation belongs to the booked contractor only.
create or replace function public.record_funnel_booking(p_session uuid,p_integration uuid,p_external text,p_calendar text,p_time timestamptz)
returns uuid language plpgsql security definer set search_path=public as $$
declare s public.funnel_sessions; a uuid; c uuid;
begin
  select fs.* into s from public.funnel_sessions fs join public.funnels f on f.id=fs.funnel_id
    where fs.id=p_session and f.integration_id=p_integration and not f.is_demo for update of fs;
  if not found or s.assignment_id is null or s.qualified is not true or s.config_snapshot->>'calendarId' is distinct from p_calendar
    then raise exception 'Booking does not match a submitted session'; end if;
  if exists(select 1 from public.funnel_bookings where integration_id=p_integration and external_id=p_external and session_id<>s.id) then
    raise exception 'Provider appointment already belongs to another session';
  end if;
  select appointment_id into a from public.funnel_bookings where integration_id=p_integration and external_id=p_external;
  if a is not null then return a; end if;
  select contractor_id into c from public.lead_assignments where id=s.assignment_id;
  insert into public.appointments(assignment_id,scheduled_at,notes) values(s.assignment_id,p_time,'Booked through website funnel') returning id into a;
  insert into public.funnel_bookings(integration_id,external_id,session_id,appointment_id) values(p_integration,p_external,s.id,a);
  update public.lead_assignments set status='appointment_set' where id=s.assignment_id and status in ('assigned','accepted','contacted');
  update public.funnel_sessions set booked_at=now() where id=s.id;
  insert into public.funnel_events(session_id,event) values(s.id,'appointment_booked') on conflict do nothing;
  insert into public.lead_activities(lead_id,type,body,metadata) values(s.lead_id,'system','Website appointment confirmed',
    jsonb_build_object('contractor_id',c,'appointment_id',a,'session_id',s.id));
  return a;
end;
$$;
revoke all on function public.record_funnel_booking(uuid,uuid,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.record_funnel_booking(uuid,uuid,text,text,timestamptz) to service_role;

-- Report showed/sold through the lead, so house-funnel leads shared with
-- several contractors count once per session regardless of who closed it.
create or replace function public.funnel_report(p_funnel uuid,p_since timestamptz) returns jsonb
language sql stable security definer set search_path=public as $$
  select jsonb_build_object(
    'events',(select coalesce(jsonb_agg(t),'[]') from (
      select e.event,e.step_id,count(distinct e.session_id)::integer as total
      from public.funnel_events e join public.funnel_sessions s on s.id=e.session_id
      where s.funnel_id=p_funnel and s.created_at>=p_since group by e.event,e.step_id) t),
    'showed',(select count(distinct s.id) from public.funnel_sessions s
      where s.funnel_id=p_funnel and s.created_at>=p_since and s.lead_id is not null and exists (
        select 1 from public.lead_assignments la join public.appointments ap on ap.assignment_id=la.id
        where la.lead_id=s.lead_id and ap.status='held' and ap.created_at>=s.contact_submitted_at)),
    'sold',(select count(distinct s.id) from public.funnel_sessions s
      where s.funnel_id=p_funnel and s.created_at>=p_since and s.lead_id is not null and exists (
        select 1 from public.lead_assignments la join public.sales sale on sale.assignment_id=la.id
        where la.lead_id=s.lead_id and sale.sale_status='won' and sale.created_at>=s.contact_submitted_at)),
    'pending',(select count(*) from public.funnel_deliveries d join public.funnel_sessions s on s.id=d.session_id where s.funnel_id=p_funnel and d.status<>'sent'),
    'failed',(select count(*) from public.funnel_deliveries d join public.funnel_sessions s on s.id=d.session_id where s.funnel_id=p_funnel and d.status='failed')
  );
$$;
revoke all on function public.funnel_report(uuid,timestamptz) from public,anon,authenticated;
grant execute on function public.funnel_report(uuid,timestamptz) to service_role;
