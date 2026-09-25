-- Restores the private-sharing rule from 0013_house_funnels_private_sharing.sql
-- (each contractor sees only their own company's notes/files plus neutral
-- system entries on a shared lead) after 0017_contractor_portal_permissions.sql
-- introduced a second, stricter `lead_activities.visibility` gate on top of it.
--
-- Root cause: 0017 added `visibility` (default 'internal') and its
-- `activities_select`/`activities_insert` policies additionally require
-- `visibility = 'contractor'`. Its classification trigger only ever sets
-- 'contractor' for contractor-authored or explicitly-scoped
-- (metadata->>'contractor_id') entries; everything else -- including
-- system-generated facts about the lead itself, e.g. "Website estimate
-- request received" from save_funnel_session -- defaults to 'internal' and
-- became invisible to every contractor, even the one it's assigned to.
-- 0013's own function, activity_visible_to_contractor() (still referenced by
-- 0017's policies), already correctly classifies those as neutral/visible;
-- 0017's extra column just overrode it to hidden.
--
-- Fix, additive only (0013 and 0017 are both already applied and are not
-- edited): the default becomes 'contractor' instead of 'internal', so an
-- entry with no explicit visibility choice falls back to 0013's rule (via
-- the unchanged policy's activity_visible_to_contractor() check) instead of
-- being hidden outright. Code that deliberately wants an internal-only note
-- (lib/actions/leads.ts's addNote, which always passes visibility
-- explicitly) is unaffected -- it never relies on the default. A one-time
-- backfill reclassifies existing rows 0017 defaulted to 'internal' back to
-- 'contractor' wherever 0013's own rule would already show them.

alter table public.lead_activities alter column visibility set default 'contractor';

-- One-time backfill: only rows 0017 left at the (then-default) 'internal'
-- that 0013's own neutral-type rule already deems contractor-visible, i.e.
-- exactly what 0013's original backfill (in 0013's own migration) would have
-- set. Rows a human has since deliberately marked 'internal' through the app
-- are untouched by this function -- lib/actions/leads.ts always sets
-- visibility explicitly, so those already read 'internal' for a reason
-- unrelated to this default, and would only be re-touched here if they also
-- happen to match 0013's neutral definition (same rule, so no behavior
-- change either way).
update public.lead_activities a set visibility = 'contractor'
 where a.visibility = 'internal'
   and public.activity_visible_to_contractor(a.actor_id, a.type, a.metadata);
