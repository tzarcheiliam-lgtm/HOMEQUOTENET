-- Fixes a bug in 0019_funnel_builder.sql's sync_funnel_status() trigger.
--
-- Root cause: a BEFORE INSERT trigger receives NEW only after column
-- DEFAULTs have already been applied, so `new.status` is never actually null
-- when the caller omits it -- it already holds the column default 'draft'.
-- The original `coalesce(new.status, ...)` therefore always kept 'draft' and
-- then forced `new.published := false`, silently discarding an explicit
-- `published = true` on any insert that didn't also set `status`. That is
-- every insert written before this feature existed, including
-- scripts/funnels.mjs's `publish` command (the CLI real contractors/staff
-- use) and several tests -- all now silently create draft, unpublished
-- funnels while still printing/asserting success.
--
-- Fix: on insert, an explicit `published = true` (published defaults to
-- false, so true can only be explicit) now sets status to 'published'
-- before the published/status sync runs, instead of being overridden by the
-- status column's default. Does not change UPDATE behavior. 0019 is not
-- edited; this replaces only the function body.

create or replace function public.sync_funnel_status() returns trigger
language plpgsql as $$
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    new.published := (new.status = 'published');
  elsif tg_op = 'UPDATE' and new.published is distinct from old.published then
    new.status := case when new.published then 'published'
      when new.status = 'published' then 'draft' else new.status end;
  elsif tg_op = 'INSERT' then
    if new.published then new.status := 'published'; end if;
    new.published := (new.status = 'published');
  end if;
  return new;
end;
$$;

-- One-time backfill: any row inserted between 0019 and this fix that was
-- meant to be published (explicit published=true at insert time) but got
-- silently forced to draft. There is no way to see the caller's original
-- insert intent after the fact except published itself, which the buggy
-- trigger always overwrote to false -- so this cannot distinguish "meant to
-- publish" from "meant to stay draft" for rows already affected. Recorded
-- here for visibility; see this migration's report for the specific
-- funnels checked by hand instead of guessed at in SQL.
