-- ============================================================================
-- HomeQuote Network — Refresh Prospects search memory (map grid)
-- ============================================================================
-- Additive migration. Re-runnable.
--
-- Refresh Prospects now searches Google square by square over a map grid
-- (lib/prospecting/grid.ts) instead of the same county-wide text queries every
-- run, which only ever reached Google's top 60 and came back mostly
-- duplicates. One row per (niche, search phrase, map square) that a run
-- finished: 'done' (fully read) or 'split' (came back full, so its four
-- smaller squares are searched instead). The next run skips done squares
-- until they go stale (120 days) and continues inside split ones.
--
-- CSLB license-list imports need no schema change: they use
-- contractor_prospects.external_source = 'cslb' and external_id = license
-- number, so uq_prospects_external (0008) keeps a license from coming back.
-- ============================================================================

create table if not exists public.prospect_search_cells (
  niche_key    text not null,          -- catalog niche slug, or 'custom:<label>'
  query        text not null,          -- the search phrase
  cell         text not null,          -- grid square id, e.g. 'la:2.3/1/0'
  status       text not null check (status in ('done', 'split')),
  result_count integer not null default 0 check (result_count >= 0),
  searched_at  timestamptz not null default now(),
  primary key (niche_key, query, cell)
);

comment on table public.prospect_search_cells is
  'Map squares Refresh Prospects has searched per niche + phrase, so runs continue instead of repeating Google''s top 60.';

alter table public.prospect_search_cells enable row level security;

drop policy if exists search_cells_admin on public.prospect_search_cells;
create policy search_cells_admin on public.prospect_search_cells for all
  using (public.is_admin()) with check (public.is_admin());
