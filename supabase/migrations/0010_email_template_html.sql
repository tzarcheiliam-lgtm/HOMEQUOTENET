-- HomeQuote Network — HTML email preview parity and call-specific service interests.

alter table public.contractor_prospects
  add column if not exists email_service_interests text[] not null default '{}';

alter table public.prospect_email_logs
  add column if not exists html_message text;

comment on column public.contractor_prospects.email_service_interests is
  'Pool services the contractor explicitly said they want more of; used for reviewed email personalization.';

comment on column public.prospect_email_logs.html_message is
  'Exact reviewed HTML body submitted to Gmail; plain message remains available for activity display and fallback clients.';
