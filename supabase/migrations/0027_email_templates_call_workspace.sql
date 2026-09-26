-- ===========================================================================
-- Let the calling workspace (callers + setters) use the email template
-- library from the Calls > Emails tab, e.g. the Contractor Sales / Contractor
-- Onboarding categories when following up with a contractor prospect.
--
-- Previously only admins (and contractors, for contractor_visible rows) could
-- read email_templates at all, so a caller/setter got zero rows back. This
-- widens read access to active templates for is_call_agent() (public.is_
-- call_agent(), added in 0011_setter_call_access.sql = role in ('caller',
-- 'setter')). Nothing about write access changes: creating, editing, and
-- deleting templates stays admin-only (email_templates_insert/update/delete
-- policies from 0026 are untouched).
-- ===========================================================================

drop policy if exists email_templates_select on public.email_templates;
create policy email_templates_select on public.email_templates for select
  using (
    public.is_admin()
    or (is_active and public.is_call_agent())
    or (is_active and contractor_visible and public.auth_contractor_id() is not null)
  );
