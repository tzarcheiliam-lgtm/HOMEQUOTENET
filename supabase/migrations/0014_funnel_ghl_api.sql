-- Direct GoHighLevel API delivery for funnels (replaces inbound-webhook-only).
-- 'skipped' = intentionally not sent (e.g. unqualified lead with onlyQualified).
-- The GHL contact/opportunity IDs are kept for support and reconciliation.
alter table public.funnel_deliveries drop constraint if exists funnel_deliveries_status_check;
alter table public.funnel_deliveries add constraint funnel_deliveries_status_check
  check (status in ('pending','sending','sent','failed','skipped'));
alter table public.funnel_deliveries
  add column if not exists external_contact_id text,
  add column if not exists external_opportunity_id text;

create or replace function public.claim_funnel_deliveries() returns setof public.funnel_deliveries
language sql security definer set search_path=public as $$
  update public.funnel_deliveries set status='sending', attempts=attempts+1,available_at=now()+interval '5 minutes'
  where id in(select id from public.funnel_deliveries where status not in ('sent','skipped') and attempts<8 and available_at<=now()
    order by available_at for update skip locked limit 10) returning *;
$$;
revoke all on function public.claim_funnel_deliveries() from public,anon,authenticated;
grant execute on function public.claim_funnel_deliveries() to service_role;

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
    'pending',(select count(*) from public.funnel_deliveries d join public.funnel_sessions s on s.id=d.session_id where s.funnel_id=p_funnel and d.status not in ('sent','skipped')),
    'failed',(select count(*) from public.funnel_deliveries d join public.funnel_sessions s on s.id=d.session_id where s.funnel_id=p_funnel and d.status='failed')
  );
$$;
revoke all on function public.funnel_report(uuid,timestamptz) from public,anon,authenticated;
grant execute on function public.funnel_report(uuid,timestamptz) to service_role;
