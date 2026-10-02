-- 0036: (1) persist the visitor's optional advertising-measurement choice with the funnel session so
-- server-side Meta events (Lead, later Schedule) honor an opt-out; (2) stop save_funnel_session from
-- silently merging different people / separate inquiries that merely share an email or phone.
--
-- Idempotent. Same 10-argument signature as 0034 (create or replace), so grants and callers are unchanged.
-- Apply BEFORE deploying the matching app code: the app writes funnel_sessions.measurement_allowed and
-- fails safe (sends no server Meta events) if the column does not exist.
--
-- measurement_allowed: null = the choice was never recorded (older session); the app then falls back to the
-- funnel's consentMode default (opt_out funnels on, opt_in funnels off).

alter table public.funnel_sessions add column if not exists measurement_allowed boolean;

create or replace function public.save_funnel_session(
  p_id uuid, p_hash text, p_version integer, p_answers jsonb, p_step text,
  p_completed text default null, p_contact jsonb default null,
  p_qualified boolean default null, p_consent text default null,
  p_service_area_valid boolean default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare s public.funnel_sessions; f public.funnels; l uuid; a uuid; was_duplicate boolean := false; scope jsonb; v_zip text; v_addr text;
  c record; v_possible uuid; v_email text; v_phone text; v_first text; v_last text;
begin
  select * into s from public.funnel_sessions where id=p_id and token_hash=p_hash and expires_at>now() for update;
  if not found then raise exception 'Session expired'; end if;
  select * into f from public.funnels where id=s.funnel_id and published;
  if not found then raise exception 'Funnel unavailable'; end if;
  if s.version <> p_version then raise exception 'Session changed; reload' using errcode='40001'; end if;
  if s.contact_submitted_at is not null then return to_jsonb(s) - 'token_hash' - 'rate_key' - 'contact'; end if;
  update public.funnel_sessions set answers=p_answers, current_step=p_step,
    qualified=p_qualified, service_area_valid=p_service_area_valid, version=version+1, updated_at=now() where id=s.id;
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
      -- The funnel's Address question (if any) fills the canonical leads.address column;
      -- the answer itself stays in the session answers and lead activity too.
      v_addr := nullif(trim(p_answers->>(select q->>'id' from jsonb_array_elements(s.config_snapshot->'questions') q where q->>'type'='address' limit 1)),'');
      -- Contact matching (0036). A shared email or phone alone is NOT proof of the same person or the
      -- same inquiry: a spouse, a reused family line, a typo, or the same homeowner asking about a
      -- different project must not be silently folded into an older lead. A submission reuses an
      -- existing lead only when ALL of these hold:
      --   1. identity: the same email AND phone, or one of them plus the same first name (and the same
      --      last name when both are present);
      --   2. the lead is still open (not sold / lost / cancelled);
      --   3. it was created in the last 30 days;
      --   4. the project answers are identical (a double submit or replay, not a new project).
      -- Anything else creates a NEW lead; if it still shares an email/phone with an existing lead in
      -- scope, a "possible duplicate" note is added to the new lead for staff to review. Existing
      -- leads, their history and assignments are never modified here.
      -- Scope is unchanged from 0034: a house funnel considers any active lead; a client funnel only
      -- leads from this same funnel or already assigned to this contractor (never another client's).
      v_email := lower(trim(p_contact->>'email'));
      v_phone := public.to_e164(p_contact->>'phone');
      v_first := lower(trim(coalesce(p_contact->>'firstName','')));
      v_last := lower(trim(coalesce(p_contact->>'lastName','')));
      for c in
        select existing.id, existing.first_name, existing.last_name, existing.status, existing.created_at, existing.project_description,
               (existing.email_normalized = v_email) as email_hit, (existing.phone_e164 = v_phone) as phone_hit
        from public.leads existing
        where existing.archived_at is null
          and (existing.email_normalized = v_email or existing.phone_e164 = v_phone)
          and (f.contractor_id is null
               or existing.consent_source = 'funnel:' || f.slug
               or exists(select 1 from public.lead_assignments la where la.lead_id = existing.id and la.contractor_id = f.contractor_id))
        order by existing.created_at
      loop
        if (
             (c.email_hit and c.phone_hit)
             or (v_first <> '' and lower(trim(coalesce(c.first_name,''))) = v_first
                 and (v_last = '' or trim(coalesce(c.last_name,'')) = '' or lower(trim(c.last_name)) = v_last))
           )
           and c.status::text not in ('sold','lost','cancelled')
           and c.created_at > now() - interval '30 days'
           and c.project_description is not distinct from p_answers::text
        then
          l := c.id;
          exit;
        end if;
        v_possible := coalesce(v_possible, c.id);
      end loop;
      was_duplicate := l is not null;
      if l is null then
        -- qualified stays false: the funnel's automatic check (service area etc.)
        -- is kept on the session/activity; a person qualifies the lead.
        insert into public.leads(first_name,last_name,email,phone,address,zip,vertical_id,source,platform,qualified,
          budget_range,timeline,project_description,utm_source,utm_medium,utm_campaign,utm_term,utm_content,
          referrer,landing_page_url,external_lead_id,integration_id,consent_granted,consent_at,consent_source,consent_disclosure,
          campaign,campaign_id,ad_set,ad_set_id,ad_name,ad_id,placement,fbclid,service_area_valid,qualification_status)
        values(p_contact->>'firstName',p_contact->>'lastName',lower(p_contact->>'email'),public.to_e164(p_contact->>'phone'),
          v_addr,v_zip,f.vertical_id,'website','web',false,p_answers->>'budget',p_answers->>'timeline',
          p_answers::text,s.attribution->>'utm_source',s.attribution->>'utm_medium',s.attribution->>'utm_campaign',s.attribution->>'utm_term',s.attribution->>'utm_content',
          s.attribution->>'referrer',s.attribution->>'landing_page_url',s.id::text,f.integration_id,true,now(),'funnel:'||f.slug,p_consent,
          coalesce(s.attribution->>'campaign_name',s.attribution->>'utm_campaign'),s.attribution->>'campaign_id',
          s.attribution->>'adset_name',s.attribution->>'adset_id',coalesce(s.attribution->>'ad_name',s.attribution->>'utm_content'),s.attribution->>'ad_id',
          s.attribution->>'placement',s.attribution->>'fbclid',p_service_area_valid,
          case when p_service_area_valid is false then 'out_of_service_area' else 'needs_qualification' end)
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
        scope || jsonb_build_object('funnel',f.slug,'session_id',s.id,'answers',p_answers,'attribution',s.attribution,'qualified',p_qualified,'consent',p_consent,'service_area_valid',p_service_area_valid));
      if not was_duplicate and v_possible is not null then
        insert into public.lead_activities(lead_id,type,body,metadata) values(l,'system',
          'Possible duplicate: this request shares an email or phone with an existing lead but is a different person or a separate project, so it was kept as its own lead. Review before contacting.',
          scope || jsonb_build_object('possible_duplicate_of',v_possible));
      end if;
      -- Also queues the internal new-lead alert (trg_lead_intake_alert).
      insert into public.lead_intake_events(integration_id,provider,platform,status,external_lead_id,lead_id,duplicate_of,normalized)
        values(f.integration_id,'website','web',case when was_duplicate then 'duplicate' else 'created' end,s.id::text,l,
          case when was_duplicate then l end,jsonb_build_object('funnel',f.slug,'answers',p_answers,'attribution',s.attribution,'qualified',p_qualified)
          || case when v_possible is not null and not was_duplicate then jsonb_build_object('possible_duplicate_of',v_possible) else '{}'::jsonb end);
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

revoke all on function public.save_funnel_session(uuid,text,integer,jsonb,text,text,jsonb,boolean,text,boolean) from public,anon,authenticated;
grant execute on function public.save_funnel_session(uuid,text,integer,jsonb,text,text,jsonb,boolean,text,boolean) to service_role;
