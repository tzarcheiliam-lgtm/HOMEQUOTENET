-- HomeQuote Growth Tools (contractor upsells), round 2.
--
-- Builds on 0018_contractor_service_requests.sql (already applied; not edited).
-- Additive and safe to re-run:
--   1. New upsells: AI Receptionist, Custom Lead Funnel, Old Lead
--      Reactivation, Call & Lead Tracking. Every earlier service slug stays
--      valid so existing requests keep working.
--   2. Statuses become New / Contacted / In Progress / Completed / Declined.
--      Existing rows are mapped (proposal_sent -> in_progress,
--      accepted -> completed, closed -> declined).
--   3. Where the request came from (source) and whether the HQN team was
--      emailed (notification_*), so a failed email never loses a request and
--      admins can see it and retry.
--   4. Insert policy also pins the notification fields, so a contractor can't
--      mark their own request as already notified.
-- Nothing here purchases, bills or enrolls anyone.

-- ---- 1. services ------------------------------------------------------------
alter table public.service_requests drop constraint if exists service_requests_service_check;
alter table public.service_requests add constraint service_requests_service_check check (service in (
  'ai_receptionist', 'lead_follow_up', 'crm_setup', 'custom_funnel', 'website',
  'lead_reactivation', 'call_tracking',
  'brochures', 'brand_identity', 'social_ad_creative', 'photo_video',
  'review_generation', 'local_seo',
  'landing_pages'  -- retired: merged into 'website'; kept for existing requests
));

-- ---- 2. statuses --------------------------------------------------------------
drop index if exists public.service_requests_one_open;
alter table public.service_requests drop constraint if exists service_requests_status_check;
update public.service_requests set status = case status
    when 'proposal_sent' then 'in_progress'
    when 'accepted' then 'completed'
    when 'closed' then 'declined'
    else status end
  where status in ('proposal_sent', 'accepted', 'closed');
alter table public.service_requests add constraint service_requests_status_check
  check (status in ('new', 'contacted', 'in_progress', 'completed', 'declined'));
-- One open request per company per service; a completed or declined one can be asked again.
create unique index if not exists service_requests_one_open on public.service_requests (contractor_id, service)
  where status in ('new', 'contacted', 'in_progress');

-- ---- 3. source + notification tracking ------------------------------------------
alter table public.service_requests
  add column if not exists source text,
  add column if not exists notification_status text not null default 'pending',
  add column if not exists notification_attempts integer not null default 0,
  add column if not exists notification_claimed_at timestamptz,
  add column if not exists notification_error text,
  add column if not exists notified_at timestamptz;
alter table public.service_requests drop constraint if exists service_requests_source_check;
alter table public.service_requests add constraint service_requests_source_check
  check (source is null or source in ('growth_page', 'service_page', 'dashboard'));
alter table public.service_requests drop constraint if exists service_requests_notification_check;
alter table public.service_requests add constraint service_requests_notification_check
  check (notification_status in ('pending', 'sending', 'sent', 'failed')
         and (notification_status <> 'sent' or notified_at is not null)
         and (notification_error is null or length(notification_error) <= 500));
-- Requests made before this migration weren't tracked, so they start as
-- 'pending' (email not confirmed); an admin can resend from the review page.
create index if not exists idx_service_requests_notification on public.service_requests (notification_status)
  where notification_status in ('pending', 'sending', 'failed');

-- ---- 4. insert policy -------------------------------------------------------------
drop policy if exists service_requests_insert on public.service_requests;
create policy service_requests_insert on public.service_requests for insert
  with check (
    contractor_id = public.auth_contractor_id()
    and requested_by = auth.uid()
    and status = 'new'
    and status_changed_by is null
    and notification_status = 'pending'
    and notification_attempts = 0
    and notification_claimed_at is null
    and notification_error is null
    and notified_at is null
  );
