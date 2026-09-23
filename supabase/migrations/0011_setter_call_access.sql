-- ============================================================================
-- HomeQuote Network — Appointment Setters join the calling workspace
-- ============================================================================
-- Additive migration. Run AFTER 0001-0010. Re-runnable: every statement is
-- guarded with or-replace / drop-if-exists.
--
-- WHY
--   0007 gated the whole prospecting surface on is_caller() (role = 'caller').
--   Setters are being given the same day-to-day calling job, so the predicate
--   that means "works a call list" now covers both roles. Nothing here widens
--   what a non-admin may DO — only who counts as a non-admin call agent. Every
--   existing restriction still applies per row:
--
--     * only prospects assigned to you are visible or updatable
--     * guard_prospect_caller_update() still refuses identity/assignment edits
--       and still refuses to lift a do-not-call for anyone but an admin
--     * insert/delete on prospects, and all refresh-run rows, stay admin-only
--
--   is_admin() and is_staff() are untouched, so admin access and the existing
--   homeowner-side policies are unchanged. is_caller() is left in place: it
--   still means exactly "the caller role" for anything that needs that.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Predicate
-- ---------------------------------------------------------------------------
-- Compares role::text for the same reason is_caller() does — see the enum note
-- in 0007's header.
create or replace function public.is_call_agent()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and is_active
      and role::text in ('caller', 'setter')
  )
$$;

comment on function public.is_call_agent() is
  'Active non-admin who works a prospect call list (caller or appointment setter). Row-level ownership is still enforced separately by each policy.';

-- ---------------------------------------------------------------------------
-- contractor_prospects
-- ---------------------------------------------------------------------------
drop policy if exists prospects_select on public.contractor_prospects;
create policy prospects_select on public.contractor_prospects for select
  using (public.is_admin() or (public.is_call_agent() and assigned_to = auth.uid()));

-- WITH CHECK keeps assigned_to = auth.uid(), so a call agent cannot hand a
-- prospect to someone else even before the column guard runs.
drop policy if exists prospects_update on public.contractor_prospects;
create policy prospects_update on public.contractor_prospects for update
  using      (public.is_admin() or (public.is_call_agent() and assigned_to = auth.uid()))
  with check (public.is_admin() or (public.is_call_agent() and assigned_to = auth.uid()));

-- prospects_insert and prospects_delete stay admin-only and are not touched.

-- ---------------------------------------------------------------------------
-- prospect_call_attempts  (still append-only: no update/delete policy)
-- ---------------------------------------------------------------------------
drop policy if exists call_attempts_insert on public.prospect_call_attempts;
create policy call_attempts_insert on public.prospect_call_attempts for insert
  with check (
    public.is_admin()
    or (
      public.is_call_agent()
      and caller_id = auth.uid()
      and public.prospect_assigned_to_me(prospect_id)
    )
  );

-- call_attempts_select already keys off prospect_assigned_to_me() alone, which
-- is role-agnostic, so it needs no change.

-- ---------------------------------------------------------------------------
-- prospect_sales_appointments
-- ---------------------------------------------------------------------------
drop policy if exists sales_appointments_insert on public.prospect_sales_appointments;
create policy sales_appointments_insert on public.prospect_sales_appointments for insert
  with check (
    public.is_admin()
    or (
      public.is_call_agent()
      and partner_id = auth.uid()
      and public.prospect_assigned_to_me(prospect_id)
    )
  );

drop policy if exists sales_appointments_update on public.prospect_sales_appointments;
create policy sales_appointments_update on public.prospect_sales_appointments for update
  using      (public.is_admin() or (public.is_call_agent() and partner_id = auth.uid()))
  with check (public.is_admin() or (public.is_call_agent() and partner_id = auth.uid()));

-- sales_appointments_delete stays admin-only and is not touched.

-- ---------------------------------------------------------------------------
-- prospect_email_logs  (read-only to app users; writes stay service-role)
-- ---------------------------------------------------------------------------
drop policy if exists prospect_email_logs_select on public.prospect_email_logs;
create policy prospect_email_logs_select on public.prospect_email_logs for select
  using (public.is_admin() or (public.is_call_agent() and public.prospect_assigned_to_me(prospect_id)));
