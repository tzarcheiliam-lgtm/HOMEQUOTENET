-- Contractor portal permissions and defense-in-depth authorization.
-- Additive migration: run after 0016_lead_review_distribution.sql.

-- ---- contractor membership capabilities -------------------------------------
alter table public.profiles
  add column if not exists contractor_role text,
  add column if not exists can_export_company_data boolean not null default false;

-- Preserve existing contractor access by treating current contractor accounts as
-- owners. New contractor accounts must be assigned owner/staff explicitly by HQN.
update public.profiles set contractor_role = 'owner'
 where role = 'contractor' and contractor_id is not null and contractor_role is null;

alter table public.profiles drop constraint if exists profiles_contractor_role_check;
alter table public.profiles add constraint profiles_contractor_role_check check (
  (role = 'contractor' and contractor_id is not null and contractor_role in ('owner', 'staff'))
  or (role <> 'contractor' and contractor_role is null)
) not valid;

create or replace function public.is_contractor_owner()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
     where id = auth.uid() and is_active and role = 'contractor'
       and contractor_id is not null and contractor_role = 'owner'
  )
$$;

-- Privileged membership fields are always controlled by an HQN administrator.
create or replace function public.guard_profile_privileges()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.role is distinct from old.role
       or new.account_status is distinct from old.account_status
       or new.deleted_at is distinct from old.deleted_at
       or new.contractor_id is distinct from old.contractor_id
       or new.contractor_role is distinct from old.contractor_role
       or new.can_export_company_data is distinct from old.can_export_company_data then
      raise exception 'Only an HQN administrator can change account permissions';
    end if;
  end if;
  return new;
end;
$$;

-- Owners may see the approved users in their company so they can assign work.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select using (
  id = auth.uid()
  or public.is_staff()
  or (public.is_contractor_owner() and role = 'contractor'
      and contractor_id = public.auth_contractor_id() and is_active)
);

-- ---- direct user assignment inside one contractor company --------------------
alter table public.lead_assignments
  add column if not exists assigned_user_id uuid references public.profiles(id) on delete set null;
create index if not exists idx_assignments_user on public.lead_assignments(assigned_user_id);

-- Creating a company assignment is an HQN-administrator operation. Funnel and
-- delivery jobs use the service role and continue to bypass RLS.
drop policy if exists assignments_insert on public.lead_assignments;
create policy assignments_insert on public.lead_assignments for insert
  with check (public.is_admin());

create or replace function public.guard_assignment_permissions()
returns trigger language plpgsql security definer set search_path = public as $$
declare target public.profiles;
begin
  -- Service-role jobs and HQN administrators retain full control.
  if auth.uid() is null or public.is_admin() then return new; end if;

  if tg_op = 'UPDATE' then
    if new.lead_id is distinct from old.lead_id
       or new.contractor_id is distinct from old.contractor_id
       or new.pricing_agreement_id is distinct from old.pricing_agreement_id
       or new.is_exclusive is distinct from old.is_exclusive
       or new.assigned_by is distinct from old.assigned_by
       or new.assigned_at is distinct from old.assigned_at then
      raise exception 'Assignment ownership fields are administrator-only';
    end if;

    if new.assigned_user_id is distinct from old.assigned_user_id then
      if not public.is_contractor_owner()
         or new.contractor_id is distinct from public.auth_contractor_id() then
        raise exception 'Only a contractor owner may assign company users';
      end if;
      if new.assigned_user_id is not null then
        select * into target from public.profiles where id = new.assigned_user_id;
        if not found or not target.is_active or target.role <> 'contractor'
           or target.contractor_id is distinct from new.contractor_id then
          raise exception 'Assignee must be an active user in this contractor company';
        end if;
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_assignment_permissions on public.lead_assignments;
create trigger trg_assignment_permissions before update on public.lead_assignments
  for each row execute function public.guard_assignment_permissions();

-- ---- internal versus contractor-visible notes -------------------------------
alter table public.lead_activities
  add column if not exists visibility text not null default 'internal';
alter table public.lead_activities drop constraint if exists lead_activities_visibility_check;
alter table public.lead_activities add constraint lead_activities_visibility_check
  check (visibility in ('internal', 'contractor'));

-- Existing contractor-authored or explicitly contractor-scoped entries remain
-- visible to that company. Everything else becomes HQN-internal.
update public.lead_activities a set visibility = 'contractor'
 where (a.metadata ? 'contractor_id')
    or exists (
      select 1 from public.profiles p
       where p.id = a.actor_id and p.role = 'contractor' and p.contractor_id is not null
    );

create or replace function public.classify_activity_visibility()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.metadata ? 'contractor_id'
     or exists (select 1 from public.profiles p where p.id = new.actor_id and p.role = 'contractor') then
    new.visibility := 'contractor';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_classify_activity_visibility on public.lead_activities;
create trigger trg_classify_activity_visibility before insert or update on public.lead_activities
  for each row execute function public.classify_activity_visibility();

drop policy if exists activities_select on public.lead_activities;
create policy activities_select on public.lead_activities for select using (
  public.is_staff()
  or (visibility = 'contractor' and public.lead_assigned_to_me(lead_id)
      and public.activity_visible_to_contractor(actor_id, type, metadata))
);

drop policy if exists activities_insert on public.lead_activities;
create policy activities_insert on public.lead_activities for insert with check (
  public.is_staff()
  or (visibility = 'contractor' and public.lead_assigned_to_me(lead_id)
      and actor_id = auth.uid()
      and (not metadata ? 'contractor_id'
           or metadata->>'contractor_id' = public.auth_contractor_id()::text))
);

-- The legacy leads.notes column had no column-level confidentiality. Move any
-- existing content into the classified activity stream and keep it empty.
insert into public.lead_activities(lead_id, type, body, visibility, metadata)
select id, 'note', notes, 'internal', jsonb_build_object('migrated_from', 'leads.notes')
  from public.leads where notes is not null and length(trim(notes)) > 0;
update public.leads set notes = null where notes is not null;
alter table public.leads drop constraint if exists leads_legacy_notes_empty;
alter table public.leads add constraint leads_legacy_notes_empty check (notes is null);

-- ---- contractor workflow hardening ------------------------------------------
alter type public.assignment_status add value if not exists 'no_answer';
alter type public.assignment_status add value if not exists 'qualified';
alter type public.assignment_status add value if not exists 'not_qualified';

-- Replace broad ALL policies so contractor users cannot delete outcome records.
drop policy if exists appointments_write on public.appointments;
drop policy if exists appointments_insert on public.appointments;
drop policy if exists appointments_update on public.appointments;
drop policy if exists appointments_delete on public.appointments;
create policy appointments_insert on public.appointments for insert
  with check (public.is_staff() or public.owns_assignment(assignment_id));
create policy appointments_update on public.appointments for update
  using (public.is_staff() or public.owns_assignment(assignment_id))
  with check (public.is_staff() or public.owns_assignment(assignment_id));
create policy appointments_delete on public.appointments for delete using (public.is_admin());

drop policy if exists estimates_write on public.estimates;
drop policy if exists estimates_insert on public.estimates;
drop policy if exists estimates_update on public.estimates;
drop policy if exists estimates_delete on public.estimates;
create policy estimates_insert on public.estimates for insert
  with check (public.is_staff() or public.owns_assignment(assignment_id));
create policy estimates_update on public.estimates for update
  using (public.is_staff() or public.owns_assignment(assignment_id))
  with check (public.is_staff() or public.owns_assignment(assignment_id));
create policy estimates_delete on public.estimates for delete using (public.is_admin());

drop policy if exists sales_write on public.sales;
drop policy if exists sales_insert on public.sales;
drop policy if exists sales_update on public.sales;
drop policy if exists sales_delete on public.sales;
create policy sales_insert on public.sales for insert
  with check (public.is_staff() or public.owns_assignment(assignment_id));
create policy sales_update on public.sales for update
  using (public.is_staff() or public.owns_assignment(assignment_id))
  with check (public.is_staff() or public.owns_assignment(assignment_id));
create policy sales_delete on public.sales for delete using (public.is_admin());

-- Recipients never auto-receive leads by default. Only HQN administrators can
-- manage this flag under the existing recipient write policies.
alter table public.lead_recipients
  add column if not exists automatic_distribution_enabled boolean not null default false;
update public.lead_recipients set automatic_distribution_enabled = false
 where automatic_distribution_enabled is distinct from false;

-- Manual distribution remains service-role only and requires a server-verified
-- HQN administrator actor. This prevents another server path from bypassing the
-- action-level role check by supplying an arbitrary actor id.
create or replace function public.distribute_lead(
  p_lead uuid, p_recipients uuid[], p_actor uuid, p_resend boolean default false
) returns jsonb language plpgsql security definer set search_path=public as $$
declare
  ld public.leads; r public.lead_recipients; d uuid; asg uuid;
  queued uuid[] := '{}'; skipped jsonb := '[]'; prior boolean; b record;
begin
  if not exists (
    select 1 from public.profiles p
     where p.id = p_actor and p.is_active and p.role = 'admin'
  ) then raise exception 'HQN administrator required'; end if;
  select * into ld from public.leads where id=p_lead for update;
  if not found then raise exception 'Lead not found'; end if;
  if ld.qualification_status <> 'qualified' then raise exception 'Qualify the lead before sending it' using errcode='P0001'; end if;
  if coalesce(array_length(p_recipients,1),0) = 0 then raise exception 'Choose at least one recipient'; end if;
  for r in select * from public.lead_recipients where id = any(p_recipients) order by name loop
    if not r.is_active then
      skipped := skipped || jsonb_build_object('id',r.id,'name',r.name,'reason','inactive'); continue;
    end if;
    select exists(select 1 from public.lead_email_deliveries where lead_id=p_lead and kind='qualified_lead'
      and lower(recipient_email)=lower(r.email)) into prior;
    if prior and not p_resend then
      skipped := skipped || jsonb_build_object('id',r.id,'name',r.name,'reason','already_sent'); continue;
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
    insert into public.lead_activities(lead_id,actor_id,type,body,metadata,visibility)
      values(p_lead,p_actor,'assignment',
        case when prior then 'Lead re-sent to ' else 'Lead sent to ' end || r.name || coalesce(' (' || r.company || ')',''),
        jsonb_build_object('recipient_id',r.id,'recipient_kind',r.kind,'resend',prior),'internal');
  end loop;
  if array_length(queued,1) > 0 then
    update public.leads set status='assigned' where id=p_lead and status in ('new','contact_attempted','qualified');
  end if;
  return jsonb_build_object('queued',to_jsonb(queued),'skipped',skipped);
end;
$$;
revoke all on function public.distribute_lead(uuid,uuid[],uuid,boolean) from public,anon,authenticated;
grant execute on function public.distribute_lead(uuid,uuid[],uuid,boolean) to service_role;
