-- Remembers when the "Mac bridge is down" alert last went out, so it repeats at most hourly and clears on recovery.
alter table public.sms_settings add column if not exists bridge_alert_sent_at timestamptz;
