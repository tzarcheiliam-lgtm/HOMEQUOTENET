-- More texting controls, all editable in the app: the opening-text template (global, and per
-- contractor), a per-contractor sender name + extra instructions, a delay before the first text,
-- and how many assistant replies a conversation may have. Idempotent.

alter table public.sms_settings add column if not exists opening_template text;
alter table public.sms_settings add column if not exists first_text_delay_minutes integer not null default 0
  check (first_text_delay_minutes between 0 and 1440);
alter table public.sms_settings add column if not exists max_ai_turns integer not null default 14
  check (max_ai_turns between 2 and 40);

alter table public.contractors add column if not exists texting_sender_name text;
alter table public.contractors add column if not exists texting_opening_template text;
alter table public.contractors add column if not exists texting_extra_instructions text;
