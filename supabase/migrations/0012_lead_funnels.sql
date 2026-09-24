-- Additive: homeowner funnels reuse contractors, leads, assignments and outcomes.
create table public.funnels (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{0,79}$'),
  contractor_id uuid references public.contractors(id),
  vertical_id uuid references public.verticals(id),
  integration_id uuid references public.integrations(id),
  published boolean not null default false,
  is_demo boolean not null default false,
  config jsonb not null,
  created_at timestamptz not null default now(),
  check (is_demo or contractor_id is not null)
);
create table public.funnel_sessions (
  id uuid primary key default gen_random_uuid(),
  funnel_id uuid not null references public.funnels(id),
  token_hash text not null unique,
  rate_key text not null,
  config_snapshot jsonb not null,
  answers jsonb not null default '{}',
  attribution jsonb not null default '{}',
  current_step text not null,
  version integer not null default 0,
  qualified boolean,
  lead_id uuid references public.leads(id),
  assignment_id uuid references public.lead_assignments(id),
  contact jsonb,
  contact_submitted_at timestamptz,
  booked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days'
);
create index on public.funnel_sessions(funnel_id, created_at);
create index on public.funnel_sessions(rate_key, created_at);
create table public.funnel_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.funnel_sessions(id) on delete cascade,
  event text not null check (event in ('landing_view','session_started','step_viewed','step_completed','contact_submitted','qualified','calendar_viewed','appointment_booked')),
  step_id text not null default '',
  created_at timestamptz not null default now(),
  unique(session_id, event, step_id)
);
create table public.funnel_deliveries (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.funnel_sessions(id) on delete cascade,
  integration_id uuid not null references public.integrations(id),
  status text not null default 'pending' check(status in ('pending','sending','sent','failed')),
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  last_error text,
  sent_at timestamptz
);
create table public.funnel_bookings (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid not null references public.integrations(id),
  external_id text not null,
  session_id uuid not null references public.funnel_sessions(id),
  appointment_id uuid not null references public.appointments(id),
  unique(integration_id, external_id)
);
alter table public.funnels enable row level security;
alter table public.funnel_sessions enable row level security;
alter table public.funnel_events enable row level security;
alter table public.funnel_deliveries enable row level security;
alter table public.funnel_bookings enable row level security;
create policy funnels_admin on public.funnels for all using (public.is_admin()) with check(public.is_admin());
create policy sessions_admin on public.funnel_sessions for select using (public.is_admin());
create policy events_admin on public.funnel_events for select using (public.is_admin());
create policy deliveries_admin on public.funnel_deliveries for select using (public.is_admin());
create policy bookings_admin on public.funnel_bookings for select using (public.is_admin());

-- One transaction: session lock, contact, existing lead/assignment model, intake
-- audit, events and durable outbound queue. Replays never create a second lead.
create or replace function public.save_funnel_session(
  p_id uuid, p_hash text, p_version integer, p_answers jsonb, p_step text,
  p_completed text default null, p_contact jsonb default null,
  p_qualified boolean default null, p_consent text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare s public.funnel_sessions; f public.funnels; l uuid; a uuid; ev text; was_duplicate boolean := false;
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
      -- Serialize by contact to prevent concurrent duplicate leads. Only reuse a
      -- lead already assigned to this contractor; never expose another client's lead.
      -- Lock BOTH normalized contact identifiers in a stable order. Different
      -- emails with the same phone cannot race to create duplicate client leads.
      perform pg_advisory_xact_lock(least(hashtextextended(lower(trim(p_contact->>'email')),0),hashtextextended(public.to_e164(p_contact->>'phone'),0)));
      perform pg_advisory_xact_lock(greatest(hashtextextended(lower(trim(p_contact->>'email')),0),hashtextextended(public.to_e164(p_contact->>'phone'),0)));
      select la.lead_id into l from public.lead_assignments la join public.leads existing on existing.id=la.lead_id
        where la.contractor_id=f.contractor_id and existing.archived_at is null
        and (existing.email_normalized=lower(trim(p_contact->>'email')) or existing.phone_e164=public.to_e164(p_contact->>'phone'))
        order by existing.created_at limit 1;
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
      insert into public.lead_assignments(lead_id,contractor_id,pricing_agreement_id)
        values(l,f.contractor_id,(select id from public.pricing_agreements where contractor_id=f.contractor_id and is_active
          and (vertical_id=f.vertical_id or vertical_id is null) and active_from<=current_date and (active_to is null or active_to>=current_date)
          order by (vertical_id=f.vertical_id) desc nulls last,active_from desc limit 1))
        on conflict(lead_id,contractor_id) do nothing;
      select id into a from public.lead_assignments where lead_id=l and contractor_id=f.contractor_id;
      insert into public.lead_activities(lead_id,type,body,metadata) values(l,'system','Website estimate request received',
        jsonb_build_object('funnel',f.slug,'session_id',s.id,'answers',p_answers,'attribution',s.attribution,'qualified',p_qualified,'consent',p_consent));
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

create or replace function public.record_funnel_booking(p_session uuid,p_integration uuid,p_external text,p_calendar text,p_time timestamptz)
returns uuid language plpgsql security definer set search_path=public as $$
declare s public.funnel_sessions; a uuid;
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
  insert into public.appointments(assignment_id,scheduled_at,notes) values(s.assignment_id,p_time,'Booked through website funnel') returning id into a;
  insert into public.funnel_bookings(integration_id,external_id,session_id,appointment_id) values(p_integration,p_external,s.id,a);
  update public.lead_assignments set status='appointment_set' where id=s.assignment_id and status in ('assigned','accepted','contacted');
  update public.funnel_sessions set booked_at=now() where id=s.id;
  insert into public.funnel_events(session_id,event) values(s.id,'appointment_booked') on conflict do nothing;
  insert into public.lead_activities(lead_id,type,body,metadata) values(s.lead_id,'system','Website appointment confirmed',jsonb_build_object('appointment_id',a,'session_id',s.id));
  return a;
end;
$$;
revoke all on function public.record_funnel_booking(uuid,uuid,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.record_funnel_booking(uuid,uuid,text,text,timestamptz) to service_role;

create or replace function public.claim_funnel_deliveries() returns setof public.funnel_deliveries
language sql security definer set search_path=public as $$
  update public.funnel_deliveries set status='sending', attempts=attempts+1,available_at=now()+interval '5 minutes'
  where id in(select id from public.funnel_deliveries where status<>'sent' and attempts<8 and available_at<=now()
    order by available_at for update skip locked limit 10) returning *;
$$;
revoke all on function public.claim_funnel_deliveries() from public,anon,authenticated;
grant execute on function public.claim_funnel_deliveries() to service_role;

-- Aggregation in SQL avoids the Supabase row limit distorting larger funnels.
create or replace function public.funnel_report(p_funnel uuid,p_since timestamptz) returns jsonb
language sql stable security definer set search_path=public as $$
  select jsonb_build_object(
    'events',(select coalesce(jsonb_agg(t),'[]') from (
      select e.event,e.step_id,count(distinct e.session_id)::integer as total
      from public.funnel_events e join public.funnel_sessions s on s.id=e.session_id
      where s.funnel_id=p_funnel and s.created_at>=p_since group by e.event,e.step_id) t),
    'showed',(select count(distinct s.id) from public.funnel_sessions s
      where s.funnel_id=p_funnel and s.created_at>=p_since and exists (
        select 1 from public.funnel_bookings b join public.appointments a on a.id=b.appointment_id where b.session_id=s.id and a.status='held')),
    'sold',(select count(distinct s.id) from public.funnel_sessions s
      where s.funnel_id=p_funnel and s.created_at>=p_since and s.contact_submitted_at is not null and exists (
        select 1 from public.sales sale where sale.assignment_id=s.assignment_id and sale.sale_status='won' and sale.created_at>=s.contact_submitted_at)),
    'pending',(select count(*) from public.funnel_deliveries d join public.funnel_sessions s on s.id=d.session_id where s.funnel_id=p_funnel and d.status<>'sent'),
    'failed',(select count(*) from public.funnel_deliveries d join public.funnel_sessions s on s.id=d.session_id where s.funnel_id=p_funnel and d.status='failed')
  );
$$;
revoke all on function public.funnel_report(uuid,timestamptz) from public,anon,authenticated;
grant execute on function public.funnel_report(uuid,timestamptz) to service_role;
