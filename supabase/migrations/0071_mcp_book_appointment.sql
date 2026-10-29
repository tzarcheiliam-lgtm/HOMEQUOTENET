-- Claude connector: Claude can PROPOSE booking an appointment (kind 'book_appointment'); it is only booked when an
-- admin approves it on /app/claude-connector, exactly like lead assignments. Widens the kind check. Safe to re-run.
do $$
declare c text;
begin
  for c in select conname from pg_constraint
           where conrelid = 'public.mcp_pending_actions'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%kind%'
  loop
    execute format('alter table public.mcp_pending_actions drop constraint %I', c);
  end loop;
  alter table public.mcp_pending_actions add constraint mcp_pending_actions_kind_check check (kind in ('assign_lead', 'book_appointment'));
end $$;
