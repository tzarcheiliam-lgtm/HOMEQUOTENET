-- Texting failsafe: automatic retries for sends that provably did not go out, and a one-time "follow up by hand" alert
-- when a text finally fails.
--   attempts            how many times the Mac bridge has been handed this text (retries stop at 3)
--   failure_notified_at set once the team has been told this text failed, so it is never announced twice
alter table public.sms_messages add column if not exists attempts integer not null default 0;
alter table public.sms_messages add column if not exists failure_notified_at timestamptz;
create index if not exists idx_sms_messages_unnotified_failures on public.sms_messages (created_at)
  where status = 'failed' and direction = 'out' and failure_notified_at is null;

-- Each hand-off to the bridge counts as an attempt.
create or replace function public.claim_sms_outbound(p_limit integer default 5)
returns table (id uuid, phone_e164 text, body text)
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
  update public.sms_messages m set status = 'sending', claimed_at = now(), attempts = m.attempts + 1
    from picked, public.sms_conversations c
   where m.id = picked.id and c.id = m.conversation_id
  returning m.id, c.phone_e164, m.body;
end $$;
revoke all on function public.claim_sms_outbound(integer) from public, anon, authenticated;
grant execute on function public.claim_sms_outbound(integer) to service_role;
