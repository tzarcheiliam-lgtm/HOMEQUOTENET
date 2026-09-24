-- Calendly bookings for funnels (e.g. Ethan / Pool Masters LA).
-- The lead is saved when the contact form is submitted; this only upgrades a
-- saved session from "form submitted, not yet booked" to "appointment booked".
-- Calendly's inline embed reports the scheduled event + invitee URIs to the
-- page; the server records them (and verifies them with the Calendly API when
-- CALENDLY_API_TOKEN is configured). Invitee URIs deduplicate retries.
alter table public.funnel_bookings alter column integration_id drop not null;
alter table public.funnel_bookings alter column appointment_id drop not null;
alter table public.funnel_bookings add column if not exists provider text not null default 'ghl';
alter table public.funnel_bookings add column if not exists verified boolean not null default true;
create unique index if not exists funnel_bookings_provider_external on public.funnel_bookings(provider, external_id) where integration_id is null;

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
  insert into public.funnel_bookings(provider,integration_id,external_id,session_id,appointment_id,verified)
    values('calendly',null,p_invitee,s.id,a,p_verified);
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
