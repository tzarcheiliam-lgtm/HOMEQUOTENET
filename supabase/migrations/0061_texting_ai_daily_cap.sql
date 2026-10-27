-- Daily ceiling on the assistant's own replies (separate from the overall text limit), so a loop or
-- a burst of replies can't run up the AI bill. Idempotent.
alter table public.sms_settings add column if not exists max_ai_replies_per_day integer not null default 150
  check (max_ai_replies_per_day between 1 and 5000);
