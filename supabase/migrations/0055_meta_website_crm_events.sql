-- Meta Conversions API for CRM events for WEBSITE leads.
--
-- Website funnel leads whose funnel Pixel is the configured CRM dataset (the bathroom and kitchen funnels) are
-- sent as CRM stage events (action_source system_generated, custom_data.event_source = 'crm'), matched with the
-- click id and hashed email/phone. They are stored in the same outbox with a new source_kind.
--
-- Additive and safe to re-run: only widens a check constraint. Delivery stays governed by meta_settings.delivery_mode
-- (default off); nothing is sent until an admin saves Live.

alter table public.meta_conversion_events drop constraint if exists meta_conversion_events_source_kind_check;
alter table public.meta_conversion_events
  add constraint meta_conversion_events_source_kind_check
  check (source_kind in ('website_pixel', 'instant_form_crm', 'website_crm'));
