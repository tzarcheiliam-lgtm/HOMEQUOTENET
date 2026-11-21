-- 0078: Voice notes and the in-home visit booking link for the texting assistant.
--
-- 1. The owner records a short introductory voice note for HomeQuote (Texting page) and one per contractor (contractor
--    page). They live in the PRIVATE storage bucket 'sms-voice-notes' (no storage policies: service role only).
-- 2. While the matching voice note is on, the first text to a lead asks "Can I send you a quick voice memo here?". When they say
--    yes, the voice note goes out, followed by a link to /booking/visit/<signed link> where they describe the project
--    and book the free in-home estimate (or a quick call when no contractor is on the lead yet).
-- 3. sms_messages can carry one attachment (the voice note), which the Mac bridge sends from Messages.
--
-- Ships OFF (voice_note_enabled false). Additive and safe to re-run.

alter table public.sms_settings add column if not exists voice_note_enabled boolean not null default false;
alter table public.sms_settings add column if not exists voice_note_path text check (voice_note_path is null or char_length(voice_note_path) <= 300);
alter table public.sms_settings add column if not exists voice_note_mime text check (voice_note_mime is null or char_length(voice_note_mime) <= 60);
alter table public.sms_settings add column if not exists voice_note_seconds integer check (voice_note_seconds is null or voice_note_seconds between 1 and 600);
alter table public.sms_settings add column if not exists voice_note_updated_at timestamptz;
-- Blank = the built-in wording (lib/sms/voice-note.ts).
alter table public.sms_settings add column if not exists voice_offer_template text check (voice_offer_template is null or char_length(voice_offer_template) <= 1000);
alter table public.sms_settings add column if not exists voice_link_template text check (voice_link_template is null or char_length(voice_link_template) <= 1000);

-- Each contractor can have its own voice note for its contractor-branded texts (set on the contractor's page).
-- Their voice memo question has its own wording too (blank = the general one); the line before the link is shared.
alter table public.contractors add column if not exists voice_note_enabled boolean not null default false;
alter table public.contractors add column if not exists voice_note_path text check (voice_note_path is null or char_length(voice_note_path) <= 300);
alter table public.contractors add column if not exists voice_note_mime text check (voice_note_mime is null or char_length(voice_note_mime) <= 60);
alter table public.contractors add column if not exists voice_note_seconds integer check (voice_note_seconds is null or voice_note_seconds between 1 and 600);
alter table public.contractors add column if not exists voice_note_updated_at timestamptz;
alter table public.contractors add column if not exists voice_offer_template text check (voice_offer_template is null or char_length(voice_offer_template) <= 1000);

-- offered: the first text asked; sent: the voice note and link went out; declined: they said no or wanted something else.
alter table public.sms_conversations add column if not exists voice_note_state text
  check (voice_note_state is null or voice_note_state in ('offered', 'sent', 'declined'));
-- Whose voice note was offered: the contractor's (its id), or NULL = HomeQuote's own.
alter table public.sms_conversations add column if not exists voice_note_contractor_id uuid references public.contractors(id) on delete set null;

alter table public.sms_messages add column if not exists attachment_path text check (attachment_path is null or char_length(attachment_path) <= 300);
alter table public.sms_messages add column if not exists attachment_mime text check (attachment_mime is null or char_length(attachment_mime) <= 60);

do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('sms-voice-notes', 'sms-voice-notes', false, 10485760,
            array['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/m4a', 'audio/aac', 'audio/wav', 'audio/x-wav', 'audio/x-caf'])
    on conflict (id) do update set public = false;
  end if;
end $$;

-- The bridge now also gets the attachment (if any) and send_after, so a voice note and the texts after it go out in
-- order. The return type changes, so the function is replaced.
drop function if exists public.claim_sms_outbound(integer);
create function public.claim_sms_outbound(p_limit integer default 5)
returns table (id uuid, phone_e164 text, body text, attachment_path text, attachment_mime text, send_after timestamptz)
language plpgsql set search_path = public as $$
begin
  update public.sms_messages m set status = 'failed', error = 'Bridge did not confirm within 10 minutes'
   where m.status = 'sending' and m.claimed_at < now() - interval '10 minutes';
  return query
  with picked as (
    select m.id from public.sms_messages m
     where m.status = 'queued' and m.direction = 'out' and m.send_after <= now()
     order by m.send_after
     limit greatest(1, least(coalesce(p_limit, 5), 20))
     for update skip locked
  )
  update public.sms_messages m set status = 'sending', claimed_at = now()
    from picked, public.sms_conversations c
   where m.id = picked.id and c.id = m.conversation_id
  returning m.id, c.phone_e164, m.body, m.attachment_path, m.attachment_mime, m.send_after;
end $$;
revoke all on function public.claim_sms_outbound(integer) from public, anon, authenticated;
grant execute on function public.claim_sms_outbound(integer) to service_role;

comment on column public.sms_messages.attachment_path is 'Object in the private sms-voice-notes bucket the Mac bridge sends with (or instead of) the text.';
