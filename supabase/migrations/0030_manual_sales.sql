-- Manually entered sales (admin, Sales page). These are not tied to a lead
-- assignment, so assignment_id becomes optional and the sale carries its own
-- contractor / customer / source / vertical labels.
alter table public.sales
  alter column assignment_id drop not null,
  add column if not exists contractor_id uuid references public.contractors(id) on delete set null,
  add column if not exists customer_name text,
  add column if not exists source_label text,
  add column if not exists vertical_label text,
  add column if not exists is_manual boolean not null default false;

create index if not exists idx_sales_contractor on public.sales(contractor_id);

-- A sale must be either assignment-linked or manual.
alter table public.sales drop constraint if exists sales_assignment_or_manual;
alter table public.sales add constraint sales_assignment_or_manual
  check (assignment_id is not null or is_manual);
