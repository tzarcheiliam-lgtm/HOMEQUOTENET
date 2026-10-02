-- Meta lead id duplicate check + reviewed, NON-DESTRUCTIVE resolution (run BEFORE migration 0035).
-- Run in the Supabase SQL editor. Nothing here deletes, merges or archives a lead.

-- ── STEP 1 — read-only report. If this returns zero rows you are done: apply migration 0035. ──
select l.integration_id, l.external_lead_id, count(*) as copies,
       array_agg(l.id order by l.created_at)          as lead_ids,
       array_agg(l.status order by l.created_at)      as statuses,
       array_agg(l.created_at order by l.created_at) as created_at
from public.leads l
where l.source = 'meta' and l.integration_id is not null and l.external_lead_id is not null
group by l.integration_id, l.external_lead_id
having count(*) > 1
order by min(l.created_at);

-- ── STEP 2 — inspect each group yourself (same person? assigned? has activity/sales?). ────────
-- Example: select id, status, first_name, last_name, created_at, assigned_to
--          from public.leads where external_lead_id = '<id from step 1>' order by created_at;

-- ── STEP 3 — only if duplicates exist AND you reviewed them: free the unique key WITHOUT losing
-- any lead. The oldest row in each group keeps its Meta lead id; every later copy keeps ALL its
-- data and history, and only has the id suffixed ('<id>#dup-<8 chars of its uuid>') so the unique
-- index can be created, plus a timeline note. Reversible: strip the suffix to restore it.
-- The script ends in ROLLBACK. Check the output, then change ROLLBACK to COMMIT and re-run.
begin;

with ranked as (
  select id, external_lead_id,
         row_number() over (partition by integration_id, external_lead_id order by created_at, id) as rn
  from public.leads
  where source = 'meta' and integration_id is not null and external_lead_id is not null
),
extras as (select id, external_lead_id from ranked where rn > 1),
changed as (
  update public.leads l
     set external_lead_id = l.external_lead_id || '#dup-' || left(l.id::text, 8)
    from extras e
   where l.id = e.id
   returning l.id, e.external_lead_id as original_meta_lead_id
)
insert into public.lead_activities (lead_id, type, body, metadata)
select id, 'system',
       'Duplicate Meta lead id: this lead shares its Meta lead id with an older lead. Kept as-is for review; Meta id suffixed so the unique index can be created.',
       jsonb_build_object('original_meta_lead_id', original_meta_lead_id)
from changed;

-- Verify: must return zero rows.
select integration_id, external_lead_id, count(*)
from public.leads
where source = 'meta' and integration_id is not null and external_lead_id is not null
group by 1, 2 having count(*) > 1;

rollback;  -- change to: commit;
