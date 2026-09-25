-- Workflow Phase 2: canonical emitters, durable claims and Gmail outbox reuse.

alter table public.workflow_events add column if not exists locked_by text, add column if not exists locked_until timestamptz;

create or replace function public.emit_workflow_event(
  p_type text,p_idempotency_key text,p_entity_type text,p_entity_id uuid,p_source text,
  p_occurred_at timestamptz default now(),p_contractor_id uuid default null,p_lead_id uuid default null,
  p_actor_type text default 'system',p_actor_id uuid default null,p_payload jsonb default '{}',p_metadata jsonb default '{}',
  p_correlation_id uuid default null,p_causation_id uuid default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare e uuid;
begin
  if p_idempotency_key not like p_type||'|%' or length(p_idempotency_key)-length(replace(p_idempotency_key,'|',''))<>1 then
    raise exception 'workflow event key must be <type>|<canonical fact ref>' using errcode='22023';
  end if;
  insert into workflow_events(type,idempotency_key,occurred_at,contractor_id,actor_type,actor_id,entity_type,entity_id,lead_id,source,correlation_id,causation_id,payload,metadata)
  values(p_type,p_idempotency_key,p_occurred_at,p_contractor_id,p_actor_type,p_actor_id,p_entity_type,p_entity_id,p_lead_id,p_source,p_correlation_id,p_causation_id,coalesce(p_payload,'{}'),coalesce(p_metadata,'{}'))
  on conflict(idempotency_key) do nothing returning id into e;
  if e is null then select id into e from workflow_events where idempotency_key=p_idempotency_key; end if;
  return e;
end $$;
revoke all on function public.emit_workflow_event(text,text,text,uuid,text,timestamptz,uuid,uuid,text,uuid,jsonb,jsonb,uuid,uuid) from public,anon,authenticated;
grant execute on function public.emit_workflow_event(text,text,text,uuid,text,timestamptz,uuid,uuid,text,uuid,jsonb,jsonb,uuid,uuid) to service_role;

create or replace function public.claim_workflow_events(p_worker text,p_limit integer default 20,p_lease_seconds integer default 120)
returns setof public.workflow_events language sql security definer set search_path=public as $$
 update workflow_events e set dispatch_status='dispatching',dispatch_attempts=dispatch_attempts+1,locked_by=p_worker,
 locked_until=now()+make_interval(secs=>greatest(30,least(p_lease_seconds,900))) where e.id in(
  -- Bounded: after 10 attempts an event is dead-lettered (left 'failed' for
  -- scripts/workflow-health.mjs) instead of being reclaimed forever.
  select id from workflow_events where available_at<=now() and dispatch_attempts<10 and (dispatch_status in('pending','failed') or (dispatch_status='dispatching' and locked_until<now()))
  order by available_at,recorded_at for update skip locked limit greatest(1,least(p_limit,100))) returning e.* $$;
revoke all on function public.claim_workflow_events(text,integer,integer) from public,anon,authenticated;
grant execute on function public.claim_workflow_events(text,integer,integer) to service_role;

create or replace function public.claim_workflow_runs(p_worker text,p_ids uuid[] default null,p_limit integer default 20,p_lease_seconds integer default 120)
returns setof public.workflow_runs language sql security definer set search_path=public as $$
 update workflow_runs r set metadata=metadata||jsonb_build_object('_claimed_from',status),status='running',started_at=coalesce(started_at,now()),resume_at=null,
 locked_by=p_worker,locked_until=now()+make_interval(secs=>greatest(30,least(p_lease_seconds,900))) where r.id in(
  select id from workflow_runs where (p_ids is null or id=any(p_ids)) and ((status='pending' and (resume_at is null or resume_at<=now())) or
  (status='waiting' and resume_at<=now()) or (status='running' and locked_until<now())) order by coalesce(resume_at,created_at),created_at
  for update skip locked limit greatest(1,least(p_limit,100))) returning r.* $$;
revoke all on function public.claim_workflow_runs(text,uuid[],integer,integer) from public,anon,authenticated;
grant execute on function public.claim_workflow_runs(text,uuid[],integer,integer) to service_role;

-- Reuse the existing Gmail delivery queue; workflow content is rendered once
-- and each step/recipient pair is unique across retries.
alter table public.lead_email_deliveries drop constraint if exists lead_email_deliveries_kind_check;
alter table public.lead_email_deliveries add constraint lead_email_deliveries_kind_check check(kind in('new_lead_alert','qualified_lead','workflow_email'));
alter table public.lead_email_deliveries add column if not exists workflow_step_run_id uuid references public.workflow_step_runs(id) on delete cascade,
 add column if not exists message text, add column if not exists html_message text;
create unique index if not exists lead_email_workflow_once on public.lead_email_deliveries(workflow_step_run_id,lower(recipient_email)) where kind='workflow_email';
alter table public.lead_email_deliveries drop constraint if exists lead_email_workflow_shape;
alter table public.lead_email_deliveries add constraint lead_email_workflow_shape check(kind<>'workflow_email' or
 (workflow_step_run_id is not null and recipient_email is not null and subject is not null and message is not null and html_message is not null));

create or replace function public.workflow_context_uuid(p_name text) returns uuid language plpgsql stable as $$
declare v text; begin v:=nullif(current_setting(p_name,true),''); return case when v is null then null else v::uuid end;
exception when invalid_text_representation then return null; end $$;
create or replace function public.workflow_actor_type() returns text language sql stable as $$
 select coalesce(nullif(current_setting('app.workflow_actor_type',true),''),'system') $$;

create or replace function public.emit_lead_workflow_events() returns trigger language plpgsql security definer set search_path=public as $$
declare v_slug text; tenant uuid; actor text:=workflow_actor_type(); cause uuid:=workflow_context_uuid('app.workflow_causation_id'); corr uuid:=workflow_context_uuid('app.workflow_correlation_id'); micros text;
begin
 if tg_op='INSERT' then
  if new.consent_source like 'funnel:%' then v_slug:=substring(new.consent_source from 8); select contractor_id into tenant from funnels where funnels.slug=v_slug; end if;
  perform emit_workflow_event('lead.created','lead.created|lead:'||new.id,'lead',new.id,'db:leads',new.created_at,tenant,new.id,
   case when actor='workflow' then 'workflow' when new.created_by is not null then 'user' else 'system' end,case when actor='workflow' then null else new.created_by end,
   -- Nullable payload keys stay present (the Phase 1 schema requires them);
   -- only the optional funnelSlug is omitted when absent.
   jsonb_build_object('leadId',new.id,'status',new.status,'qualificationStatus',new.qualification_status,'source',new.source,
   'verticalId',new.vertical_id,'subServiceId',new.sub_service_id,'city',new.city,'zip',new.zip)
   || case when v_slug is null then '{}'::jsonb else jsonb_build_object('funnelSlug',v_slug) end,'{}',corr,cause); return new;
 end if;
 micros:=((extract(epoch from new.updated_at)*1000000)::bigint)::text;
 if new.status is distinct from old.status then perform emit_workflow_event('lead.status_changed','lead.status_changed|lead:'||new.id||':status:'||new.status||':'||micros,
  'lead',new.id,'db:leads',new.updated_at,null,new.id,actor,null,jsonb_build_object('leadId',new.id,'fromStatus',old.status,'toStatus',new.status),'{}',corr,cause); end if;
 if new.qualification_status is distinct from old.qualification_status then perform emit_workflow_event('lead.qualification_changed','lead.qualification_changed|lead:'||new.id||':qualification:'||new.qualification_status||':'||micros,
  'lead',new.id,'db:leads',new.updated_at,null,new.id,actor,null,jsonb_build_object('leadId',new.id,'fromStatus',old.qualification_status,'toStatus',new.qualification_status),'{}',corr,cause); end if;
 return new; end $$;
drop trigger if exists trg_leads_workflow_events on public.leads;
create trigger trg_leads_workflow_events after insert or update of status,qualification_status on public.leads for each row execute function emit_lead_workflow_events();

create or replace function public.emit_assignment_workflow_events() returns trigger language plpgsql security definer set search_path=public as $$
declare actor text:=workflow_actor_type();cause uuid:=workflow_context_uuid('app.workflow_causation_id');corr uuid:=workflow_context_uuid('app.workflow_correlation_id');micros text;
begin
 if tg_op='INSERT' then perform emit_workflow_event('lead.assigned','lead.assigned|assignment:'||new.id,'lead_assignment',new.id,'db:lead_assignments',new.assigned_at,new.contractor_id,new.lead_id,actor,
  case when actor='workflow' then null else new.assigned_by end,jsonb_build_object('leadId',new.lead_id,'assignmentId',new.id,'contractorId',new.contractor_id,'assignedBy',new.assigned_by),'{}',corr,cause); return new; end if;
 if new.status is distinct from old.status then micros:=((extract(epoch from new.updated_at)*1000000)::bigint)::text;
  perform emit_workflow_event('assignment.status_changed','assignment.status_changed|assignment:'||new.id||':status:'||new.status||':'||micros,'lead_assignment',new.id,'db:lead_assignments',new.updated_at,new.contractor_id,new.lead_id,actor,null,
   jsonb_build_object('leadId',new.lead_id,'assignmentId',new.id,'contractorId',new.contractor_id,'fromStatus',old.status,'toStatus',new.status),'{}',corr,cause);
  if new.status='lost' then perform emit_workflow_event('deal.lost','deal.lost|assignment:'||new.id||':status:lost:'||micros,'lead_assignment',new.id,'db:lead_assignments',new.updated_at,new.contractor_id,new.lead_id,actor,null,
   jsonb_build_object('leadId',new.lead_id,'assignmentId',new.id,'contractorId',new.contractor_id,'fromStatus',old.status),'{}',corr,cause); end if;
 end if; return new; end $$;
drop trigger if exists trg_assignments_workflow_events on public.lead_assignments;
create trigger trg_assignments_workflow_events after insert or update of status on public.lead_assignments for each row execute function emit_assignment_workflow_events();

create or replace function public.emit_appointment_workflow_events() returns trigger language plpgsql security definer set search_path=public as $$
declare a lead_assignments;typ text;actor text:=workflow_actor_type();cause uuid:=workflow_context_uuid('app.workflow_causation_id');corr uuid:=workflow_context_uuid('app.workflow_correlation_id');micros text;booking_provider text;booking_external text;
begin select * into a from lead_assignments where id=new.assignment_id;
 if tg_op='INSERT' then
  -- When distribution promotes an earlier unassigned funnel booking into an
  -- appointment, reuse that booking fact's key instead of emitting it twice.
  select fb.provider,fb.external_id into booking_provider,booking_external from funnel_bookings fb
   join funnel_sessions fs on fs.id=fb.session_id join funnels f on f.id=fs.funnel_id
   where fb.appointment_id is null and fs.lead_id=a.lead_id and f.contractor_id=a.contractor_id
    and fb.scheduled_at is not distinct from new.scheduled_at order by fb.id limit 1;
  perform emit_workflow_event('appointment.booked','appointment.booked|'||case when booking_external is null then 'appointment:'||new.id else 'booking:'||coalesce(booking_provider,'integration')||':'||booking_external end,'appointment',new.id,'db:appointments',new.created_at,a.contractor_id,a.lead_id,actor,
  case when actor='workflow' then null else new.created_by end,jsonb_build_object('leadId',a.lead_id,'assignmentId',a.id,'contractorId',a.contractor_id,'appointmentId',new.id,'scheduledAt',new.scheduled_at),'{}',corr,cause);return new;end if;
 if new.status is not distinct from old.status then return new;end if;typ:=case new.status when 'cancelled' then 'appointment.cancelled' when 'held' then 'appointment.completed' when 'no_show' then 'appointment.no_show' end;if typ is null then return new;end if;
 micros:=((extract(epoch from new.updated_at)*1000000)::bigint)::text;perform emit_workflow_event(typ,typ||'|appointment:'||new.id||':status:'||new.status||':'||micros,'appointment',new.id,'db:appointments',new.updated_at,a.contractor_id,a.lead_id,actor,null,
 jsonb_build_object('leadId',a.lead_id,'assignmentId',a.id,'contractorId',a.contractor_id,'appointmentId',new.id,'scheduledAt',new.scheduled_at,'fromStatus',old.status,'toStatus',new.status),'{}',corr,cause);return new;end $$;
drop trigger if exists trg_appointments_workflow_events on public.appointments;
create trigger trg_appointments_workflow_events after insert or update of status on public.appointments for each row execute function emit_appointment_workflow_events();

create or replace function public.emit_unassigned_booking_workflow_event() returns trigger language plpgsql security definer set search_path=public as $$
declare s funnel_sessions;f funnels;begin if new.appointment_id is not null then return new;end if;select * into s from funnel_sessions where id=new.session_id;select * into f from funnels where id=s.funnel_id;if s.lead_id is null then return new;end if;
 perform emit_workflow_event('appointment.booked','appointment.booked|booking:'||coalesce(new.provider,'integration')||':'||new.external_id,'lead',s.lead_id,'db:funnel_bookings',now(),f.contractor_id,s.lead_id,'integration',null,
 jsonb_build_object('leadId',s.lead_id,'assignmentId',null,'contractorId',f.contractor_id,'appointmentId',null,'scheduledAt',new.scheduled_at,'bookingProvider',coalesce(new.provider,'integration'),'externalBookingId',new.external_id),'{}',null,null);return new;end $$;
drop trigger if exists trg_funnel_bookings_workflow_event on public.funnel_bookings;
create trigger trg_funnel_bookings_workflow_event after insert on public.funnel_bookings for each row execute function emit_unassigned_booking_workflow_event();

create or replace function public.emit_estimate_workflow_event() returns trigger language plpgsql security definer set search_path=public as $$
declare a lead_assignments;begin if new.status<>'sent' or (tg_op='UPDATE' and old.status='sent') then return new;end if;select * into a from lead_assignments where id=new.assignment_id;
 perform emit_workflow_event('estimate.sent','estimate.sent|estimate:'||new.id||':sent','estimate',new.id,'db:estimates',new.updated_at,a.contractor_id,a.lead_id,workflow_actor_type(),null,
 jsonb_build_object('leadId',a.lead_id,'assignmentId',a.id,'contractorId',a.contractor_id,'estimateId',new.id,'amount',new.amount),'{}',workflow_context_uuid('app.workflow_correlation_id'),workflow_context_uuid('app.workflow_causation_id'));return new;end $$;
drop trigger if exists trg_estimates_workflow_event on public.estimates;
create trigger trg_estimates_workflow_event after insert or update of status on public.estimates for each row execute function emit_estimate_workflow_event();

create or replace function public.emit_sale_workflow_event() returns trigger language plpgsql security definer set search_path=public as $$
declare a lead_assignments;begin if new.sale_status<>'won' or (tg_op='UPDATE' and old.sale_status='won') then return new;end if;select * into a from lead_assignments where id=new.assignment_id;
 perform emit_workflow_event('deal.won','deal.won|sale:'||new.id||':won','sale',new.id,'db:sales',new.updated_at,a.contractor_id,a.lead_id,workflow_actor_type(),null,
 jsonb_build_object('leadId',a.lead_id,'assignmentId',a.id,'contractorId',a.contractor_id,'saleId',new.id,'amount',new.amount),'{}',workflow_context_uuid('app.workflow_correlation_id'),workflow_context_uuid('app.workflow_causation_id'));return new;end $$;
drop trigger if exists trg_sales_workflow_event on public.sales;
create trigger trg_sales_workflow_event after insert or update of sale_status on public.sales for each row execute function emit_sale_workflow_event();

create or replace function public.workflow_change_pipeline_stage(p_pipeline text,p_lead uuid,p_assignment uuid,p_status text,p_causation uuid,p_correlation uuid)
returns void language plpgsql security definer set search_path=public as $$ begin perform set_config('app.workflow_actor_type','workflow',true);perform set_config('app.workflow_causation_id',coalesce(p_causation::text,''),true);perform set_config('app.workflow_correlation_id',coalesce(p_correlation::text,''),true);
 if p_pipeline='lead' then update leads set status=p_status::lead_status where id=p_lead;elsif p_pipeline='assignment' then update lead_assignments set status=p_status::assignment_status where id=p_assignment and lead_id=p_lead;else raise exception 'unknown pipeline' using errcode='22023';end if;if not found then raise exception 'workflow target not found' using errcode='P0002';end if;end $$;
revoke all on function public.workflow_change_pipeline_stage(text,uuid,uuid,text,uuid,uuid) from public,anon,authenticated;grant execute on function public.workflow_change_pipeline_stage(text,uuid,uuid,text,uuid,uuid) to service_role;

create or replace function public.workflow_create_appointment(p_lead uuid,p_assignment uuid,p_scheduled_at timestamptz,p_location text,p_notes text,p_causation uuid,p_correlation uuid)
returns uuid language plpgsql security definer set search_path=public as $$ declare v uuid;begin if not exists(select 1 from lead_assignments where id=p_assignment and lead_id=p_lead)then raise exception 'workflow assignment not found' using errcode='P0002';end if;
 perform set_config('app.workflow_actor_type','workflow',true);perform set_config('app.workflow_causation_id',coalesce(p_causation::text,''),true);perform set_config('app.workflow_correlation_id',coalesce(p_correlation::text,''),true);
 insert into appointments(assignment_id,scheduled_at,location,notes)values(p_assignment,p_scheduled_at,p_location,p_notes)returning id into v;return v;end $$;
revoke all on function public.workflow_create_appointment(uuid,uuid,timestamptz,text,text,uuid,uuid) from public,anon,authenticated;grant execute on function public.workflow_create_appointment(uuid,uuid,timestamptz,text,text,uuid,uuid) to service_role;
