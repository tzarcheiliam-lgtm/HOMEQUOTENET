-- Workflow Phase 4: transactional definition writes for the management UI.
-- Runtime history is never rewritten; active runs keep their definition_snapshot.

create or replace function public.workflow_replace_steps(p_workflow_id uuid, p_steps jsonb)
returns void language plpgsql security definer set search_path=public as $$
declare
  item jsonb;
  ids jsonb := '{}'::jsonb;
  step_id uuid;
  parent_key text;
begin
  if jsonb_typeof(p_steps) <> 'array' or jsonb_array_length(p_steps) < 1 or jsonb_array_length(p_steps) > 50 then
    raise exception 'workflow steps must be an array of 1-50 items' using errcode='22023';
  end if;
  for item in select value from jsonb_array_elements(p_steps) loop
    step_id := gen_random_uuid();
    if ids ? (item->>'key') then raise exception 'duplicate workflow step key' using errcode='22023'; end if;
    ids := ids || jsonb_build_object(item->>'key', step_id);
  end loop;
  delete from public.workflow_steps where workflow_id=p_workflow_id;
  for item in select value from jsonb_array_elements(p_steps) loop
    parent_key := nullif(item->>'parentKey','');
    insert into public.workflow_steps(id,workflow_id,key,position,parent_step_id,branch,step_type,action_type,name,config,conditions)
    values(
      (ids->>(item->>'key'))::uuid,p_workflow_id,item->>'key',(item->>'position')::integer,
      case when parent_key is null then null else (ids->>parent_key)::uuid end,
      nullif(item->>'branch',''),item->>'stepType',nullif(item#>>'{action,type}',''),nullif(item->>'name',''),
      coalesce(item#>'{action,config}','{}'::jsonb),nullif(item->'conditions','null'::jsonb)
    );
  end loop;
end $$;
revoke all on function public.workflow_replace_steps(uuid,jsonb) from public,anon,authenticated;

create or replace function public.create_workflow_definition(
  p_definition jsonb,p_contractor_id uuid default null,p_template_key text default null,
  p_source_template_id uuid default null,p_actor uuid default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare workflow_id uuid;
begin
  if not public.is_admin() then raise exception 'admin required' using errcode='42501'; end if;
  insert into public.workflows(contractor_id,name,description,is_template,template_key,source_template_id,
    trigger_type,trigger_config,conditions,exit_events,reentry_policy,enabled,version,created_by,updated_by)
  values(p_contractor_id,p_definition->>'name',p_definition->>'description',false,p_template_key,p_source_template_id,
    p_definition#>>'{trigger,type}',coalesce(p_definition#>'{trigger,config}','{}'),nullif(p_definition->'conditions','null'::jsonb),
    coalesce(array(select jsonb_array_elements_text(p_definition->'exitEvents')),'{}'),
    coalesce(p_definition->>'reentryPolicy','once_per_event'),false,1,p_actor,p_actor)
  returning id into workflow_id;
  perform public.workflow_replace_steps(workflow_id,p_definition->'steps');
  return workflow_id;
end $$;
revoke all on function public.create_workflow_definition(jsonb,uuid,text,uuid,uuid) from public,anon;
grant execute on function public.create_workflow_definition(jsonb,uuid,text,uuid,uuid) to authenticated;

create or replace function public.save_workflow_definition(
  p_workflow_id uuid,p_expected_version integer,p_definition jsonb,p_actor uuid default null
) returns integer language plpgsql security definer set search_path=public as $$
declare current_version integer; next_version integer;
begin
  if not public.is_admin() then raise exception 'admin required' using errcode='42501'; end if;
  select version into current_version from public.workflows where id=p_workflow_id and not is_template and archived_at is null for update;
  if current_version is null then raise exception 'workflow not found' using errcode='P0002'; end if;
  if current_version<>p_expected_version then raise exception 'workflow version changed' using errcode='40001'; end if;
  next_version:=current_version+1;
  update public.workflows set name=p_definition->>'name',description=p_definition->>'description',
    trigger_type=p_definition#>>'{trigger,type}',trigger_config=coalesce(p_definition#>'{trigger,config}','{}'),
    conditions=nullif(p_definition->'conditions','null'::jsonb),exit_events=coalesce(array(select jsonb_array_elements_text(p_definition->'exitEvents')),'{}'),
    reentry_policy=coalesce(p_definition->>'reentryPolicy','once_per_event'),version=next_version,updated_by=p_actor
    where id=p_workflow_id;
  perform public.workflow_replace_steps(p_workflow_id,p_definition->'steps');
  return next_version;
end $$;
revoke all on function public.save_workflow_definition(uuid,integer,jsonb,uuid) from public,anon;
grant execute on function public.save_workflow_definition(uuid,integer,jsonb,uuid) to authenticated;

create or replace function public.set_workflow_enabled(p_workflow_id uuid,p_enabled boolean,p_expected_version integer)
returns integer language plpgsql security definer set search_path=public as $$
declare next_version integer;
begin
  if not public.is_admin() then raise exception 'admin required' using errcode='42501'; end if;
  update public.workflows set enabled=p_enabled,version=version+1,updated_by=auth.uid()
    where id=p_workflow_id and not is_template and archived_at is null and version=p_expected_version
    returning version into next_version;
  if next_version is null then raise exception 'workflow version changed or workflow unavailable' using errcode='40001'; end if;
  return next_version;
end $$;
revoke all on function public.set_workflow_enabled(uuid,boolean,integer) from public,anon;
grant execute on function public.set_workflow_enabled(uuid,boolean,integer) to authenticated;

create or replace function public.archive_workflow(p_workflow_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_admin() then raise exception 'admin required' using errcode='42501'; end if;
  update public.workflows set enabled=false,archived_at=now(),version=version+1,updated_by=auth.uid()
    where id=p_workflow_id and not is_template and archived_at is null;
  if not found then raise exception 'workflow not found' using errcode='P0002'; end if;
end $$;
revoke all on function public.archive_workflow(uuid) from public,anon;
grant execute on function public.archive_workflow(uuid) to authenticated;

comment on function public.save_workflow_definition(uuid,integer,jsonb,uuid) is
  'Phase 4 transactional definition save. Running workflow snapshots are intentionally unchanged.';
