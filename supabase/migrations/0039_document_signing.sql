-- ============================================================================
-- Documents & Signing (electronic signature workflow)
-- ============================================================================
-- Model
--   signing_documents   logical document (title, owner contractor, optional lead)
--   signing_versions    one signable version of a document. Draft -> sent (locked).
--                       Any change after sending = a NEW version; the old request
--                       is voided (signing_new_version).
--   signing_recipients  signers of one version (name, email, order, token HASH)
--   signing_fields      field placement (fractions of the DISPLAYED page, 0..1,
--                       top-left origin) + sender-prefilled values
--   signing_field_values signer-entered values (insert-only, kept apart from
--                       the sender's prefill_value)
--   signing_events      append-only audit log, hash-chained per version
--
-- SECURITY
--   * Files live in the PRIVATE storage bucket 'signing-documents'. No storage
--     policies are created, so only the service role (server code) can read or
--     write objects; the app hands out short-lived signed URLs after its own
--     authorization checks.
--   * Signing tokens are stored only as SHA-256 hashes. Plaintext exists only in
--     the invitation email.
--   * All writes are service-role only (no insert/update/delete policies). The
--     state transitions below are SECURITY DEFINER functions that only the
--     service role may execute; they are atomic (row locks), idempotent and
--     return {ok:false,error:...} for business-rule failures so that side
--     effects (e.g. lazily marking a request expired) still commit.
--   * Triggers enforce immutability in the database itself: a sent version's
--     content and fields cannot change, recorded values and audit events cannot
--     be updated or deleted, final file hashes can be written once.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Private bucket (guarded so the migration also runs where storage is absent)
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('signing-documents', 'signing-documents', false, 26214400, array['application/pdf'])
    on conflict (id) do update set public = false;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.signing_documents (
  id                 uuid primary key default gen_random_uuid(),
  -- NULL = HomeQuote network level (admins only).
  contractor_id      uuid references public.contractors(id) on delete restrict,
  lead_id            uuid references public.leads(id) on delete set null,
  title              text not null check (char_length(title) between 1 and 200),
  created_by         uuid references public.profiles(id) on delete set null,
  current_version_id uuid,
  archived_at        timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists idx_signing_documents_contractor on public.signing_documents(contractor_id, created_at desc);
create index if not exists idx_signing_documents_lead on public.signing_documents(lead_id) where lead_id is not null;

create table if not exists public.signing_versions (
  id                    uuid primary key default gen_random_uuid(),
  document_id           uuid not null references public.signing_documents(id) on delete restrict,
  version_no            integer not null check (version_no >= 1),
  status                text not null default 'draft'
    check (status in ('draft','awaiting_signature','partially_signed','completed','declined','voided','expired')),
  -- original upload (never modified)
  original_path         text not null,
  original_sha256       text not null check (original_sha256 ~ '^[0-9a-f]{64}$'),
  original_size         integer not null check (original_size > 0),
  page_count            integer not null check (page_count between 1 and 200),
  -- [{w,h,rotation}] displayed size in PDF points after rotation + CropBox
  pages                 jsonb not null,
  detection             jsonb not null default '{}'::jsonb,
  -- request settings (locked once sent)
  subject               text check (subject is null or char_length(subject) <= 200),
  message               text check (message is null or char_length(message) <= 4000),
  signing_order         text not null default 'sequential' check (signing_order in ('sequential','parallel')),
  expiry_days           smallint not null default 14 check (expiry_days between 1 and 90),
  expires_at            timestamptz,
  -- sender snapshot at send time
  sender_user_id        uuid references public.profiles(id) on delete set null,
  sender_name           text,
  sender_email          text,
  sender_business_name  text,
  -- pre-send review gate
  placement_reviewed_at timestamptz,
  placement_reviewed_by uuid references public.profiles(id) on delete set null,
  placement_review_hash text,
  -- lifecycle
  sent_at               timestamptz,
  completed_at          timestamptz,
  declined_at           timestamptz,
  voided_at             timestamptz,
  void_reason           text,
  voided_by             uuid references public.profiles(id) on delete set null,
  retention_until       timestamptz,
  -- completed artifacts
  finalize_claimed_until timestamptz,
  finalize_error        text,
  finalized_at          timestamptz,
  final_path            text,
  final_sha256          text,
  certificate_path      text,
  certificate_sha256    text,
  created_by            uuid references public.profiles(id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (document_id, version_no)
);
create index if not exists idx_signing_versions_status on public.signing_versions(status, expires_at);

alter table public.signing_documents
  drop constraint if exists signing_documents_current_version_fk;
alter table public.signing_documents
  add constraint signing_documents_current_version_fk
  foreign key (current_version_id) references public.signing_versions(id) on delete set null
  deferrable initially deferred;

create table if not exists public.signing_recipients (
  id                       uuid primary key default gen_random_uuid(),
  version_id               uuid not null references public.signing_versions(id) on delete cascade,
  name                     text not null check (char_length(btrim(name)) between 1 and 200),
  email                    text not null check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  order_index              smallint not null check (order_index >= 1),
  status                   text not null default 'pending' check (status in ('pending','sent','viewed','signed','declined')),
  auth_method              text not null default 'email_link',
  -- signing token (hash only)
  token_hash               text,
  token_issued_at          timestamptz,
  token_expires_at         timestamptz,
  token_invalidated_at     timestamptz,
  -- read-only access to the completed document
  download_token_hash      text,
  download_token_expires_at timestamptz,
  -- delivery
  invited_at               timestamptz,
  last_sent_at             timestamptz,
  send_count               integer not null default 0,
  last_email_status        text check (last_email_status in ('sent','failed')),
  last_email_error         text,
  last_reminded_at         timestamptz,
  -- signer actions
  first_viewed_at          timestamptz,
  consent_at               timestamptz,
  consent_version          text,
  signed_at                timestamptz,
  declined_at              timestamptz,
  decline_reason           text,
  sign_ip                  text,
  sign_user_agent          text,
  sign_timezone            text,
  created_at               timestamptz not null default now(),
  unique (version_id, order_index)
);
create unique index if not exists uq_signing_recipient_token on public.signing_recipients(token_hash) where token_hash is not null;
create unique index if not exists uq_signing_recipient_dl_token on public.signing_recipients(download_token_hash) where download_token_hash is not null;
create index if not exists idx_signing_recipients_email on public.signing_recipients(lower(email));

create table if not exists public.signing_fields (
  id             uuid primary key default gen_random_uuid(),
  version_id     uuid not null references public.signing_versions(id) on delete cascade,
  recipient_id   uuid references public.signing_recipients(id) on delete cascade,
  type           text not null check (type in ('signature','initials','name','date','text','checkbox')),
  page           smallint not null check (page >= 1),
  x              double precision not null check (x >= 0 and x <= 1),
  y              double precision not null check (y >= 0 and y <= 1),
  w              double precision not null check (w > 0 and w <= 1),
  h              double precision not null check (h > 0 and h <= 1),
  required       boolean not null default true,
  label          text check (label is null or char_length(label) <= 120),
  -- checkboxes sharing a group_key are mutually exclusive
  group_key      text check (group_key is null or char_length(group_key) <= 60),
  -- SENDER-provided content (text fields only); signers cannot edit it
  prefill_value  text check (prefill_value is null or char_length(prefill_value) <= 1000),
  date_format    text check (date_format is null or date_format in ('MMM d, yyyy','MM/dd/yyyy','dd/MM/yyyy','yyyy-MM-dd')),
  -- detection provenance
  source         text not null default 'manual' check (source in ('acroform','text','ocr','manual')),
  confidence     real check (confidence is null or (confidence >= 0 and confidence <= 1)),
  needs_review   boolean not null default false,
  reviewed_at    timestamptz,
  role_hint      text,
  detection_note text,
  source_ref     text,
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now(),
  constraint signing_fields_prefill_text_only check (prefill_value is null or type = 'text')
);
create index if not exists idx_signing_fields_version on public.signing_fields(version_id, page);

create table if not exists public.signing_field_values (
  id           uuid primary key default gen_random_uuid(),
  field_id     uuid not null unique references public.signing_fields(id) on delete cascade,
  version_id   uuid not null references public.signing_versions(id) on delete cascade,
  recipient_id uuid not null references public.signing_recipients(id) on delete cascade,
  value        text,                                    -- text / 'true'|'false' / formatted date
  sig_method   text check (sig_method in ('drawn','typed')),
  typed_text   text check (typed_text is null or char_length(typed_text) <= 200),
  image_png    text,                                    -- base64 PNG of a signature/initials
  created_at   timestamptz not null default now()
);
create index if not exists idx_signing_values_version on public.signing_field_values(version_id);

create table if not exists public.signing_events (
  id           bigint generated always as identity primary key,
  version_id   uuid not null references public.signing_versions(id) on delete cascade,
  recipient_id uuid references public.signing_recipients(id) on delete set null,
  event_type   text not null,
  actor_user_id uuid references public.profiles(id) on delete set null,
  ip           text,
  user_agent   text,
  metadata     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default clock_timestamp(),
  prev_hash    text,
  event_hash   text
);
create index if not exists idx_signing_events_version on public.signing_events(version_id, id);

-- ---------------------------------------------------------------------------
-- Immutability triggers
-- ---------------------------------------------------------------------------
create or replace function public.signing_events_chain() returns trigger
language plpgsql as $$
declare prev text;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.version_id::text, 7));
  select event_hash into prev from public.signing_events where version_id = new.version_id order by id desc limit 1;
  new.created_at := clock_timestamp();
  new.prev_hash := prev;
  new.event_hash := encode(sha256(convert_to(
    coalesce(prev, '') || '|' || new.version_id::text || '|' || coalesce(new.recipient_id::text, '') || '|' ||
    new.event_type || '|' || to_char(new.created_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.US') || '|' || new.metadata::text,
    'UTF8')), 'hex');
  return new;
end $$;
drop trigger if exists trg_signing_events_chain on public.signing_events;
create trigger trg_signing_events_chain before insert on public.signing_events
  for each row execute function public.signing_events_chain();

create or replace function public.signing_forbid_change() returns trigger
language plpgsql as $$
begin
  -- Allow the cascade from deleting an unsent (draft) version, never anything else.
  if tg_op = 'DELETE' and not exists (select 1 from public.signing_versions v where v.id = old.version_id and v.sent_at is not null) then
    return old;
  end if;
  raise exception 'signing:immutable' using errcode = 'P0001';
end $$;
drop trigger if exists trg_signing_events_immutable on public.signing_events;
create trigger trg_signing_events_immutable before update or delete on public.signing_events
  for each row execute function public.signing_forbid_change();
drop trigger if exists trg_signing_values_immutable on public.signing_field_values;
create trigger trg_signing_values_immutable before update or delete on public.signing_field_values
  for each row execute function public.signing_forbid_change();

create or replace function public.signing_fields_lock() returns trigger
language plpgsql as $$
declare vid uuid; locked boolean;
begin
  vid := case when tg_op = 'DELETE' then old.version_id else new.version_id end;
  select sent_at is not null into locked from public.signing_versions where id = vid;
  if coalesce(locked, false) then
    -- review marks are the only thing that may change on a sent field? No: fully locked.
    raise exception 'signing:locked' using errcode = 'P0001';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;
drop trigger if exists trg_signing_fields_lock on public.signing_fields;
create trigger trg_signing_fields_lock before insert or update or delete on public.signing_fields
  for each row execute function public.signing_fields_lock();

create or replace function public.signing_recipients_lock() returns trigger
language plpgsql as $$
declare locked boolean;
begin
  if tg_op = 'UPDATE' then
    select sent_at is not null into locked from public.signing_versions where id = old.version_id;
    if coalesce(locked, false) and (new.name is distinct from old.name or new.email is distinct from old.email
       or new.order_index is distinct from old.order_index or new.version_id is distinct from old.version_id) then
      raise exception 'signing:locked' using errcode = 'P0001';
    end if;
    return new;
  end if;
  select sent_at is not null into locked from public.signing_versions
    where id = case when tg_op = 'DELETE' then old.version_id else new.version_id end;
  if coalesce(locked, false) then raise exception 'signing:locked' using errcode = 'P0001'; end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;
drop trigger if exists trg_signing_recipients_lock on public.signing_recipients;
create trigger trg_signing_recipients_lock before insert or update or delete on public.signing_recipients
  for each row execute function public.signing_recipients_lock();

create or replace function public.signing_versions_guard() returns trigger
language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    if old.sent_at is not null then raise exception 'signing:locked' using errcode = 'P0001'; end if;
    return old;
  end if;
  new.updated_at := now();
  if old.sent_at is not null then
    if new.original_path is distinct from old.original_path or new.original_sha256 is distinct from old.original_sha256
       or new.pages is distinct from old.pages or new.subject is distinct from old.subject
       or new.message is distinct from old.message or new.signing_order is distinct from old.signing_order
       or new.sent_at is distinct from old.sent_at or new.document_id is distinct from old.document_id
       or new.version_no is distinct from old.version_no or new.expires_at is distinct from old.expires_at then
      raise exception 'signing:locked' using errcode = 'P0001';
    end if;
  end if;
  if old.final_sha256 is not null and (new.final_sha256 is distinct from old.final_sha256
     or new.final_path is distinct from old.final_path or new.certificate_sha256 is distinct from old.certificate_sha256
     or new.certificate_path is distinct from old.certificate_path) then
    raise exception 'signing:immutable' using errcode = 'P0001';
  end if;
  -- terminal states never move again
  if old.status in ('completed','declined','voided','expired') and new.status is distinct from old.status then
    raise exception 'signing:terminal' using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists trg_signing_versions_guard on public.signing_versions;
create trigger trg_signing_versions_guard before update or delete on public.signing_versions
  for each row execute function public.signing_versions_guard();

create or replace function public.signing_documents_guard() returns trigger
language plpgsql as $$
begin
  if new.contractor_id is distinct from old.contractor_id then
    raise exception 'signing:immutable' using errcode = 'P0001';
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists trg_signing_documents_guard on public.signing_documents;
create trigger trg_signing_documents_guard before update on public.signing_documents
  for each row execute function public.signing_documents_guard();

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.signing_can_read_document(p_doc uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.signing_documents d
    where d.id = p_doc
      and (public.is_admin() or (d.contractor_id is not null and d.contractor_id = public.auth_contractor_id()))
  )
$$;

create or replace function public.signing_can_read_version(p_version uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.signing_versions v
    where v.id = p_version and public.signing_can_read_document(v.document_id)
  )
$$;

create or replace function public.signing_log_event(
  p_version uuid, p_recipient uuid, p_type text, p_actor uuid, p_ip text, p_ua text, p_meta jsonb
) returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.signing_events(version_id, recipient_id, event_type, actor_user_id, ip, user_agent, metadata)
  values (p_version, p_recipient, p_type, p_actor, left(p_ip, 80), left(p_ua, 400), coalesce(p_meta, '{}'::jsonb));
end $$;

-- Hash of everything the sender reviewed (fields, recipients, order, file).
create or replace function public.signing_config_hash(p_version uuid) returns text
language sql stable security definer set search_path = public as $$
  select encode(sha256(convert_to(
    coalesce((select v.signing_order || '|' || v.original_sha256 from public.signing_versions v where v.id = p_version), '') || '#' ||
    coalesce((select string_agg(r.order_index::text || ':' || lower(r.email) || ':' || r.name, ';' order by r.order_index)
              from public.signing_recipients r where r.version_id = p_version), '') || '#' ||
    coalesce((select string_agg(concat_ws(',', f.id::text, f.type, f.page::text, round(f.x::numeric, 5)::text, round(f.y::numeric, 5)::text,
              round(f.w::numeric, 5)::text, round(f.h::numeric, 5)::text, f.required::text, coalesce(f.recipient_id::text, ''),
              coalesce(f.group_key, ''), coalesce(f.prefill_value, ''), coalesce(f.label, ''), coalesce(f.date_format, '')), ';' order by f.id)
              from public.signing_fields f where f.version_id = p_version), ''),
    'UTF8')), 'hex')
$$;

create or replace function public.signing_verify_chain(p_version uuid) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare e record; prev text := null; expected text;
begin
  for e in select * from public.signing_events where version_id = p_version order by id loop
    expected := encode(sha256(convert_to(
      coalesce(prev, '') || '|' || e.version_id::text || '|' || coalesce(e.recipient_id::text, '') || '|' ||
      e.event_type || '|' || to_char(e.created_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.US') || '|' || e.metadata::text,
      'UTF8')), 'hex');
    if e.event_hash is distinct from expected or e.prev_hash is distinct from prev then return false; end if;
    prev := e.event_hash;
  end loop;
  return true;
end $$;

-- ---------------------------------------------------------------------------
-- Sender-side transitions
-- ---------------------------------------------------------------------------
create or replace function public.signing_mark_reviewed(p_version uuid, p_actor uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v public.signing_versions;
begin
  select * into v from public.signing_versions where id = p_version for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if v.status <> 'draft' then return jsonb_build_object('ok', false, 'error', 'not_draft'); end if;
  update public.signing_versions
     set placement_reviewed_at = now(), placement_reviewed_by = p_actor,
         placement_review_hash = public.signing_config_hash(p_version)
   where id = p_version;
  perform public.signing_log_event(p_version, null, 'placement_reviewed', p_actor, null, null, '{}'::jsonb);
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.signing_send(
  p_version uuid, p_actor uuid, p_sender_name text, p_sender_email text, p_business text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v public.signing_versions; n_rec int; n_bad int; bad_recipient text;
begin
  select * into v from public.signing_versions where id = p_version for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if v.status <> 'draft' then return jsonb_build_object('ok', false, 'error', 'not_draft'); end if;
  if coalesce(btrim(v.subject), '') = '' then return jsonb_build_object('ok', false, 'error', 'subject_required'); end if;
  select count(*) into n_rec from public.signing_recipients where version_id = p_version;
  if n_rec = 0 then return jsonb_build_object('ok', false, 'error', 'no_recipients'); end if;
  if exists (select 1 from public.signing_recipients r where r.version_id = p_version
             and not exists (select 1 from public.signing_fields f where f.recipient_id = r.id and f.type = 'signature')) then
    return jsonb_build_object('ok', false, 'error', 'recipient_without_signature');
  end if;
  select count(*) into n_bad from public.signing_fields f
   where f.version_id = p_version and f.recipient_id is null and f.prefill_value is null;
  if n_bad > 0 then return jsonb_build_object('ok', false, 'error', 'unassigned_fields', 'count', n_bad); end if;
  select count(*) into n_bad from public.signing_fields f
   where f.version_id = p_version and f.needs_review and f.reviewed_at is null;
  if n_bad > 0 then return jsonb_build_object('ok', false, 'error', 'unreviewed_fields', 'count', n_bad); end if;
  if v.placement_review_hash is null or v.placement_review_hash <> public.signing_config_hash(p_version) then
    return jsonb_build_object('ok', false, 'error', 'review_required');
  end if;
  update public.signing_versions
     set status = 'awaiting_signature', sent_at = now(),
         expires_at = now() + make_interval(days => v.expiry_days),
         sender_user_id = p_actor, sender_name = p_sender_name, sender_email = p_sender_email, sender_business_name = p_business
   where id = p_version;
  perform public.signing_log_event(p_version, null, 'sent', p_actor, null, null,
    jsonb_build_object('recipients', n_rec, 'signing_order', v.signing_order, 'document_sha256', v.original_sha256,
                       'config_sha256', v.placement_review_hash));
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.signing_void(p_version uuid, p_actor uuid, p_reason text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v public.signing_versions;
begin
  select * into v from public.signing_versions where id = p_version for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if v.status not in ('awaiting_signature', 'partially_signed') then
    return jsonb_build_object('ok', false, 'error', 'not_voidable', 'status', v.status);
  end if;
  update public.signing_versions set status = 'voided', voided_at = now(), voided_by = p_actor,
         void_reason = left(coalesce(p_reason, ''), 500) where id = p_version;
  update public.signing_recipients set token_invalidated_at = now() where version_id = p_version and token_invalidated_at is null;
  perform public.signing_log_event(p_version, null, 'voided', p_actor, null, null, jsonb_build_object('reason', left(coalesce(p_reason, ''), 500)));
  return jsonb_build_object('ok', true);
end $$;

-- Create the next draft version (copy of fields + recipients). If the source
-- request is still open it is voided in the same transaction.
create or replace function public.signing_new_version(p_version uuid, p_actor uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v public.signing_versions; nv uuid; next_no int; m jsonb := '{}'::jsonb; r record; nr uuid; f record;
begin
  select * into v from public.signing_versions where id = p_version for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if v.status = 'draft' then return jsonb_build_object('ok', false, 'error', 'already_draft'); end if;
  perform 1 from public.signing_documents where id = v.document_id for update;
  select max(version_no) + 1 into next_no from public.signing_versions where document_id = v.document_id;
  if exists (select 1 from public.signing_versions where document_id = v.document_id and status = 'draft') then
    return jsonb_build_object('ok', false, 'error', 'draft_exists');
  end if;
  if v.status in ('awaiting_signature', 'partially_signed') then
    update public.signing_versions set status = 'voided', voided_at = now(), voided_by = p_actor, void_reason = 'Superseded by a new version'
     where id = p_version;
    update public.signing_recipients set token_invalidated_at = now() where version_id = p_version and token_invalidated_at is null;
    perform public.signing_log_event(p_version, null, 'voided', p_actor, null, null, jsonb_build_object('reason', 'Superseded by a new version'));
  end if;
  insert into public.signing_versions(document_id, version_no, original_path, original_sha256, original_size, page_count, pages,
                                      detection, subject, message, signing_order, expiry_days, created_by)
  values (v.document_id, next_no, v.original_path, v.original_sha256, v.original_size, v.page_count, v.pages,
          v.detection, v.subject, v.message, v.signing_order, v.expiry_days, p_actor)
  returning id into nv;
  for r in select * from public.signing_recipients where version_id = p_version order by order_index loop
    insert into public.signing_recipients(version_id, name, email, order_index) values (nv, r.name, r.email, r.order_index) returning id into nr;
    m := m || jsonb_build_object(r.id::text, nr::text);
  end loop;
  for f in select * from public.signing_fields where version_id = p_version loop
    insert into public.signing_fields(version_id, recipient_id, type, page, x, y, w, h, required, label, group_key, prefill_value, date_format,
                                      source, confidence, needs_review, reviewed_at, role_hint, detection_note, source_ref, sort_order)
    values (nv, case when f.recipient_id is null then null else (m ->> f.recipient_id::text)::uuid end, f.type, f.page, f.x, f.y, f.w, f.h,
            f.required, f.label, f.group_key, f.prefill_value, f.date_format, f.source, f.confidence, f.needs_review, f.reviewed_at,
            f.role_hint, f.detection_note, f.source_ref, f.sort_order);
  end loop;
  update public.signing_documents set current_version_id = nv where id = v.document_id;
  perform public.signing_log_event(nv, null, 'version_created', p_actor, null, null, jsonb_build_object('from_version', p_version, 'version_no', next_no));
  return jsonb_build_object('ok', true, 'version_id', nv, 'version_no', next_no);
end $$;

-- Atomically replace a DRAFT's settings, recipients and fields (one transaction).
-- p_recipients: [{name,email}] in signing order. p_fields: [{recipient_index (1-based|null), type, page, x,y,w,h,
-- required,label,group_key,prefill_value,date_format,source,confidence,needs_review,reviewed,role_hint,detection_note,source_ref}]
create or replace function public.signing_save_draft(
  p_version uuid, p_subject text, p_message text, p_order text, p_expiry_days integer, p_recipients jsonb, p_fields jsonb
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v public.signing_versions; el jsonb; ids uuid[] := '{}'; rid uuid; i int := 0; ridx int; sort_n int := 0;
begin
  select * into v from public.signing_versions where id = p_version for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if v.status <> 'draft' or v.sent_at is not null then return jsonb_build_object('ok', false, 'error', 'locked'); end if;
  if jsonb_typeof(p_recipients) <> 'array' or jsonb_typeof(p_fields) <> 'array' then return jsonb_build_object('ok', false, 'error', 'bad_request'); end if;
  if jsonb_array_length(p_recipients) > 10 or jsonb_array_length(p_fields) > 400 then return jsonb_build_object('ok', false, 'error', 'too_many'); end if;
  -- validate everything BEFORE any destructive step (a returned error does not roll back)
  for el in select * from jsonb_array_elements(p_fields) loop
    ridx := nullif(el ->> 'recipient_index', '')::int;
    if ridx is not null and (ridx < 1 or ridx > jsonb_array_length(p_recipients)) then return jsonb_build_object('ok', false, 'error', 'bad_recipient'); end if;
  end loop;
  update public.signing_versions
     set subject = nullif(btrim(p_subject), ''), message = nullif(btrim(p_message), ''),
         signing_order = case when p_order in ('sequential', 'parallel') then p_order else signing_order end,
         expiry_days = greatest(1, least(coalesce(p_expiry_days, 14), 90))
   where id = p_version;
  delete from public.signing_fields where version_id = p_version;
  delete from public.signing_recipients where version_id = p_version;
  for el in select * from jsonb_array_elements(p_recipients) loop
    i := i + 1;
    insert into public.signing_recipients(version_id, name, email, order_index)
    values (p_version, btrim(el ->> 'name'), lower(btrim(el ->> 'email')), i) returning id into rid;
    ids := ids || rid;
  end loop;
  for el in select * from jsonb_array_elements(p_fields) loop
    ridx := nullif(el ->> 'recipient_index', '')::int;
    sort_n := sort_n + 1;
    insert into public.signing_fields(version_id, recipient_id, type, page, x, y, w, h, required, label, group_key, prefill_value, date_format,
                                      source, confidence, needs_review, reviewed_at, role_hint, detection_note, source_ref, sort_order)
    values (p_version, case when ridx is null then null else ids[ridx] end, el ->> 'type', (el ->> 'page')::smallint,
            (el ->> 'x')::float8, (el ->> 'y')::float8, (el ->> 'w')::float8, (el ->> 'h')::float8,
            coalesce((el ->> 'required')::boolean, true), nullif(el ->> 'label', ''), nullif(el ->> 'group_key', ''),
            nullif(el ->> 'prefill_value', ''), nullif(el ->> 'date_format', ''), coalesce(nullif(el ->> 'source', ''), 'manual'),
            nullif(el ->> 'confidence', '')::real, coalesce((el ->> 'needs_review')::boolean, false),
            case when coalesce((el ->> 'reviewed')::boolean, false) then now() else null end,
            nullif(el ->> 'role_hint', ''), nullif(el ->> 'detection_note', ''), nullif(el ->> 'source_ref', ''), sort_n);
  end loop;
  -- any edit invalidates a previous placement review
  update public.signing_versions set placement_reviewed_at = null, placement_review_hash = null where id = p_version;
  return jsonb_build_object('ok', true);
end $$;

-- ---------------------------------------------------------------------------
-- Token handling + signer-side transitions
-- ---------------------------------------------------------------------------
-- Issue (or rotate) the signing token for one recipient. Rotating invalidates the
-- previous link. Sequential requests only issue a token on the recipient's turn.
create or replace function public.signing_issue_token(p_recipient uuid, p_token_hash text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r public.signing_recipients; v public.signing_versions;
begin
  select * into r from public.signing_recipients where id = p_recipient for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  select * into v from public.signing_versions where id = r.version_id for update;
  if v.status not in ('awaiting_signature', 'partially_signed') then return jsonb_build_object('ok', false, 'error', v.status); end if;
  if v.expires_at <= now() then return jsonb_build_object('ok', false, 'error', 'expired'); end if;
  if r.status in ('signed', 'declined') then return jsonb_build_object('ok', false, 'error', r.status); end if;
  if v.signing_order = 'sequential' and exists (
       select 1 from public.signing_recipients o where o.version_id = r.version_id and o.order_index < r.order_index and o.status <> 'signed') then
    return jsonb_build_object('ok', false, 'error', 'not_your_turn');
  end if;
  update public.signing_recipients
     set token_hash = p_token_hash, token_issued_at = now(), token_expires_at = v.expires_at, token_invalidated_at = null,
         status = case when status = 'pending' then 'sent' else status end,
         invited_at = coalesce(invited_at, now())
   where id = p_recipient;
  return jsonb_build_object('ok', true, 'expires_at', v.expires_at, 'version_id', v.id);
end $$;

create or replace function public.signing_issue_download_token(p_recipient uuid, p_token_hash text, p_days integer) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r public.signing_recipients; v public.signing_versions;
begin
  select * into r from public.signing_recipients where id = p_recipient for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  select * into v from public.signing_versions where id = r.version_id;
  if v.status <> 'completed' then return jsonb_build_object('ok', false, 'error', 'not_completed'); end if;
  update public.signing_recipients set download_token_hash = p_token_hash,
         download_token_expires_at = now() + make_interval(days => greatest(1, least(p_days, 365)))
   where id = p_recipient;
  return jsonb_build_object('ok', true);
end $$;

-- Resolve a signing token. Never reveals document content; marks "viewed".
create or replace function public.signing_open(p_token_hash text, p_ip text, p_ua text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r public.signing_recipients; v public.signing_versions; first_view boolean := false;
begin
  if p_token_hash is null or length(p_token_hash) <> 64 then return jsonb_build_object('state', 'invalid'); end if;
  select * into r from public.signing_recipients where token_hash = p_token_hash for update;
  if not found then return jsonb_build_object('state', 'invalid'); end if;
  select * into v from public.signing_versions where id = r.version_id for update;
  if r.status = 'signed' then return jsonb_build_object('state', 'signed', 'recipient_id', r.id, 'version_id', v.id, 'version_status', v.status); end if;
  if r.status = 'declined' or v.status = 'declined' then return jsonb_build_object('state', 'declined', 'version_id', v.id); end if;
  if v.status = 'voided' then return jsonb_build_object('state', 'voided', 'version_id', v.id); end if;
  if v.status in ('awaiting_signature', 'partially_signed') and v.expires_at <= now() then
    update public.signing_versions set status = 'expired' where id = v.id;
    update public.signing_recipients set token_invalidated_at = now() where version_id = v.id and token_invalidated_at is null;
    perform public.signing_log_event(v.id, null, 'expired', null, null, null, '{}'::jsonb);
    return jsonb_build_object('state', 'expired', 'version_id', v.id);
  end if;
  if v.status = 'expired' then return jsonb_build_object('state', 'expired', 'version_id', v.id); end if;
  if v.status = 'completed' then return jsonb_build_object('state', 'signed', 'recipient_id', r.id, 'version_id', v.id, 'version_status', v.status); end if;
  if r.token_invalidated_at is not null or r.token_expires_at <= now() then return jsonb_build_object('state', 'invalid'); end if;
  if v.status not in ('awaiting_signature', 'partially_signed') then return jsonb_build_object('state', 'invalid'); end if;
  if v.signing_order = 'sequential' and exists (
       select 1 from public.signing_recipients o where o.version_id = r.version_id and o.order_index < r.order_index and o.status <> 'signed') then
    return jsonb_build_object('state', 'not_your_turn', 'version_id', v.id);
  end if;
  if r.first_viewed_at is null then first_view := true; end if;
  update public.signing_recipients
     set first_viewed_at = coalesce(first_viewed_at, now()), status = case when status in ('pending', 'sent') then 'viewed' else status end
   where id = r.id;
  perform public.signing_log_event(v.id, r.id, case when first_view then 'viewed' else 'viewed_again' end, null, p_ip, p_ua, '{}'::jsonb);
  return jsonb_build_object('state', 'ok', 'recipient_id', r.id, 'version_id', v.id, 'consented', r.consent_at is not null);
end $$;

create or replace function public.signing_record_consent(p_token_hash text, p_consent_version text, p_consent_sha256 text, p_ip text, p_ua text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r public.signing_recipients; v public.signing_versions;
begin
  select * into r from public.signing_recipients where token_hash = p_token_hash for update;
  if not found or r.token_invalidated_at is not null or r.token_expires_at <= now() then return jsonb_build_object('ok', false, 'error', 'invalid'); end if;
  select * into v from public.signing_versions where id = r.version_id;
  if v.status not in ('awaiting_signature', 'partially_signed') or r.status in ('signed', 'declined') then return jsonb_build_object('ok', false, 'error', 'not_open'); end if;
  if r.consent_at is null then
    update public.signing_recipients set consent_at = now(), consent_version = p_consent_version where id = r.id;
    perform public.signing_log_event(v.id, r.id, 'consent_given', null, p_ip, p_ua,
      jsonb_build_object('consent_version', p_consent_version, 'consent_text_sha256', p_consent_sha256));
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- Atomic completion of one recipient's fields. Idempotent: a retry after success
-- returns {ok:true, already:true} and changes nothing.
create or replace function public.signing_submit(p_token_hash text, p_values jsonb, p_ctx jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  r public.signing_recipients; v public.signing_versions; el jsonb; f public.signing_fields; val record;
  missing uuid[] := '{}'; seen uuid[] := '{}'; cnt int; remaining int; now_completed boolean := false; fid uuid;
  val_text text; method text; typed text; img text;
begin
  if p_token_hash is null or length(p_token_hash) <> 64 then return jsonb_build_object('ok', false, 'error', 'invalid'); end if;
  select * into r from public.signing_recipients where token_hash = p_token_hash for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'invalid'); end if;
  select * into v from public.signing_versions where id = r.version_id for update;
  if r.status = 'signed' then
    return jsonb_build_object('ok', true, 'already', true, 'completed', v.status = 'completed', 'version_id', v.id, 'recipient_id', r.id);
  end if;
  if r.status = 'declined' or v.status = 'declined' then return jsonb_build_object('ok', false, 'error', 'declined'); end if;
  if v.status = 'voided' then return jsonb_build_object('ok', false, 'error', 'voided'); end if;
  if v.status in ('awaiting_signature', 'partially_signed') and v.expires_at <= now() then
    update public.signing_versions set status = 'expired' where id = v.id;
    update public.signing_recipients set token_invalidated_at = now() where version_id = v.id and token_invalidated_at is null;
    perform public.signing_log_event(v.id, null, 'expired', null, null, null, '{}'::jsonb);
    return jsonb_build_object('ok', false, 'error', 'expired');
  end if;
  if v.status = 'expired' then return jsonb_build_object('ok', false, 'error', 'expired'); end if;
  if v.status not in ('awaiting_signature', 'partially_signed') or r.token_invalidated_at is not null or r.token_expires_at <= now() then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  if v.signing_order = 'sequential' and exists (
       select 1 from public.signing_recipients o where o.version_id = r.version_id and o.order_index < r.order_index and o.status <> 'signed') then
    return jsonb_build_object('ok', false, 'error', 'not_your_turn');
  end if;
  if r.consent_at is null then return jsonb_build_object('ok', false, 'error', 'consent_required'); end if;
  if jsonb_typeof(p_values) <> 'array' then return jsonb_build_object('ok', false, 'error', 'bad_request'); end if;

  -- validate every submitted value belongs to THIS recipient's fields
  for el in select * from jsonb_array_elements(p_values) loop
    begin fid := (el ->> 'field_id')::uuid; exception when others then return jsonb_build_object('ok', false, 'error', 'bad_field'); end;
    select * into f from public.signing_fields where id = fid and version_id = v.id and recipient_id = r.id;
    if not found or fid = any(seen) or f.prefill_value is not null then return jsonb_build_object('ok', false, 'error', 'bad_field', 'field_id', fid); end if;
    seen := seen || fid;
    val_text := el ->> 'value'; method := el ->> 'sig_method'; typed := el ->> 'typed_text'; img := el ->> 'image_png';
    if f.type in ('signature', 'initials') then
      if method not in ('drawn', 'typed') or coalesce(img, '') = '' or (method = 'typed' and coalesce(btrim(typed), '') = '') then
        missing := missing || fid;
      end if;
    elsif f.type = 'checkbox' then
      if coalesce(val_text, '') not in ('true', 'false') then return jsonb_build_object('ok', false, 'error', 'bad_value', 'field_id', fid); end if;
    else
      if f.type = 'text' and char_length(coalesce(val_text, '')) > 1000 or f.type <> 'text' and char_length(coalesce(val_text, '')) > 200 then
        return jsonb_build_object('ok', false, 'error', 'too_long', 'field_id', fid);
      end if;
      if f.required and coalesce(btrim(val_text), '') = '' then missing := missing || fid; end if;
    end if;
  end loop;
  -- every required assigned field must be present and complete
  for f in select * from public.signing_fields where version_id = v.id and recipient_id = r.id and prefill_value is null and required loop
    if not (f.id = any(seen)) then missing := missing || f.id; continue; end if;
    select value into el from jsonb_array_elements(p_values) where (value ->> 'field_id')::uuid = f.id limit 1;
    if f.type = 'checkbox' and coalesce(el ->> 'value', '') <> 'true' and f.group_key is null then missing := missing || f.id; end if;
  end loop;
  -- exclusive checkbox groups: at most one checked; a required group needs exactly one
  for val in
    select f2.group_key as gk, bool_or(f2.required) as req,
           count(*) filter (where exists (select 1 from jsonb_array_elements(p_values) e
                                           where (e ->> 'field_id')::uuid = f2.id and e ->> 'value' = 'true')) as checked
      from public.signing_fields f2
     where f2.version_id = v.id and f2.recipient_id = r.id and f2.type = 'checkbox' and f2.group_key is not null
     group by f2.group_key
  loop
    if val.checked > 1 then return jsonb_build_object('ok', false, 'error', 'group_conflict', 'group', val.gk); end if;
    if val.req and val.checked = 0 then
      return jsonb_build_object('ok', false, 'error', 'missing_required', 'group', val.gk, 'fields', '[]'::jsonb);
    end if;
  end loop;
  if array_length(missing, 1) > 0 then
    return jsonb_build_object('ok', false, 'error', 'missing_required', 'fields', to_jsonb(missing));
  end if;

  for el in select * from jsonb_array_elements(p_values) loop
    insert into public.signing_field_values(field_id, version_id, recipient_id, value, sig_method, typed_text, image_png)
    values ((el ->> 'field_id')::uuid, v.id, r.id, el ->> 'value', nullif(el ->> 'sig_method', ''), el ->> 'typed_text', el ->> 'image_png');
  end loop;

  update public.signing_recipients
     set status = 'signed', signed_at = now(), token_invalidated_at = now(),
         sign_ip = left(p_ctx ->> 'ip', 80), sign_user_agent = left(p_ctx ->> 'user_agent', 400), sign_timezone = left(p_ctx ->> 'timezone', 64)
   where id = r.id;
  select count(*) into remaining from public.signing_recipients where version_id = v.id and status <> 'signed';
  if remaining = 0 then
    update public.signing_versions
       set status = 'completed', completed_at = now(), retention_until = now() + interval '7 years'
     where id = v.id;
    now_completed := true;
  else
    update public.signing_versions set status = 'partially_signed' where id = v.id;
  end if;
  perform public.signing_log_event(v.id, r.id, 'signed', null, p_ctx ->> 'ip', p_ctx ->> 'user_agent',
    jsonb_build_object('timezone', p_ctx ->> 'timezone', 'fields', cardinality(seen), 'auth_method', r.auth_method));
  if now_completed then
    perform public.signing_log_event(v.id, null, 'completed', null, null, null, '{}'::jsonb);
  end if;
  return jsonb_build_object('ok', true, 'completed', now_completed, 'version_id', v.id, 'recipient_id', r.id);
end $$;

create or replace function public.signing_decline(p_token_hash text, p_reason text, p_ip text, p_ua text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r public.signing_recipients; v public.signing_versions;
begin
  select * into r from public.signing_recipients where token_hash = p_token_hash for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'invalid'); end if;
  select * into v from public.signing_versions where id = r.version_id for update;
  if r.status = 'declined' then return jsonb_build_object('ok', true, 'already', true, 'version_id', v.id); end if;
  if r.status = 'signed' or v.status not in ('awaiting_signature', 'partially_signed') or r.token_invalidated_at is not null then
    return jsonb_build_object('ok', false, 'error', 'not_open');
  end if;
  update public.signing_recipients set status = 'declined', declined_at = now(), decline_reason = left(coalesce(p_reason, ''), 1000), token_invalidated_at = now() where id = r.id;
  update public.signing_versions set status = 'declined', declined_at = now() where id = v.id;
  update public.signing_recipients set token_invalidated_at = now() where version_id = v.id and token_invalidated_at is null;
  perform public.signing_log_event(v.id, r.id, 'declined', null, p_ip, p_ua, jsonb_build_object('reason', left(coalesce(p_reason, ''), 1000)));
  return jsonb_build_object('ok', true, 'version_id', v.id);
end $$;

create or replace function public.signing_expire_due() returns integer
language plpgsql security definer set search_path = public as $$
declare v record; n integer := 0;
begin
  for v in select id from public.signing_versions where status in ('awaiting_signature', 'partially_signed') and expires_at <= now() for update skip locked loop
    update public.signing_versions set status = 'expired' where id = v.id;
    update public.signing_recipients set token_invalidated_at = now() where version_id = v.id and token_invalidated_at is null;
    perform public.signing_log_event(v.id, null, 'expired', null, null, null, '{}'::jsonb);
    n := n + 1;
  end loop;
  return n;
end $$;

-- Single-flight lease so two requests do not both build the final PDF.
create or replace function public.signing_claim_finalize(p_version uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare v public.signing_versions;
begin
  select * into v from public.signing_versions where id = p_version for update;
  if not found or v.status <> 'completed' or v.final_sha256 is not null then return false; end if;
  if v.finalize_claimed_until is not null and v.finalize_claimed_until > now() then return false; end if;
  update public.signing_versions set finalize_claimed_until = now() + interval '3 minutes' where id = p_version;
  return true;
end $$;

create or replace function public.signing_record_final(
  p_version uuid, p_final_path text, p_final_sha text, p_cert_path text, p_cert_sha text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v public.signing_versions;
begin
  select * into v from public.signing_versions where id = p_version for update;
  if not found or v.status <> 'completed' then return jsonb_build_object('ok', false, 'error', 'not_completed'); end if;
  if v.final_sha256 is not null then return jsonb_build_object('ok', true, 'already', true); end if;
  update public.signing_versions
     set final_path = p_final_path, final_sha256 = p_final_sha, certificate_path = p_cert_path, certificate_sha256 = p_cert_sha,
         finalized_at = now(), finalize_error = null, finalize_claimed_until = null
   where id = p_version;
  perform public.signing_log_event(p_version, null, 'finalized', null, null, null,
    jsonb_build_object('final_sha256', p_final_sha, 'certificate_sha256', p_cert_sha, 'original_sha256', v.original_sha256));
  return jsonb_build_object('ok', true);
end $$;

-- ---------------------------------------------------------------------------
-- Row Level Security: read-only for authorized sender-side users
-- ---------------------------------------------------------------------------
alter table public.signing_documents     enable row level security;
alter table public.signing_versions      enable row level security;
alter table public.signing_recipients    enable row level security;
alter table public.signing_fields        enable row level security;
alter table public.signing_field_values  enable row level security;
alter table public.signing_events        enable row level security;

drop policy if exists signing_documents_select on public.signing_documents;
create policy signing_documents_select on public.signing_documents for select
  using (public.signing_can_read_document(id));
drop policy if exists signing_versions_select on public.signing_versions;
create policy signing_versions_select on public.signing_versions for select
  using (public.signing_can_read_document(document_id));
drop policy if exists signing_recipients_select on public.signing_recipients;
create policy signing_recipients_select on public.signing_recipients for select
  using (public.signing_can_read_version(version_id));
drop policy if exists signing_fields_select on public.signing_fields;
create policy signing_fields_select on public.signing_fields for select
  using (public.signing_can_read_version(version_id));
drop policy if exists signing_field_values_select on public.signing_field_values;
create policy signing_field_values_select on public.signing_field_values for select
  using (public.signing_can_read_version(version_id));
drop policy if exists signing_events_select on public.signing_events;
create policy signing_events_select on public.signing_events for select
  using (public.signing_can_read_version(version_id));

revoke all on public.signing_documents, public.signing_versions, public.signing_recipients, public.signing_fields,
              public.signing_field_values, public.signing_events from anon, authenticated;
grant select on public.signing_documents, public.signing_versions, public.signing_fields, public.signing_field_values, public.signing_events to authenticated;
-- Token hashes are never exposed to browser clients.
grant select (id, version_id, name, email, order_index, status, auth_method, invited_at, last_sent_at, send_count,
              last_email_status, last_email_error, last_reminded_at, first_viewed_at, consent_at, consent_version, signed_at,
              declined_at, decline_reason, created_at)
  on public.signing_recipients to authenticated;
-- The signature image blobs are only needed by the server (final PDF); keep them out of browser queries.
revoke select on public.signing_field_values from authenticated;
grant select (id, field_id, version_id, recipient_id, value, sig_method, typed_text, created_at) on public.signing_field_values to authenticated;
grant all on public.signing_documents, public.signing_versions, public.signing_recipients, public.signing_fields,
             public.signing_field_values, public.signing_events to service_role;

revoke all on function
  public.signing_log_event(uuid, uuid, text, uuid, text, text, jsonb),
  public.signing_mark_reviewed(uuid, uuid),
  public.signing_save_draft(uuid, text, text, text, integer, jsonb, jsonb),
  public.signing_send(uuid, uuid, text, text, text),
  public.signing_void(uuid, uuid, text),
  public.signing_new_version(uuid, uuid),
  public.signing_issue_token(uuid, text),
  public.signing_issue_download_token(uuid, text, integer),
  public.signing_open(text, text, text),
  public.signing_record_consent(text, text, text, text, text),
  public.signing_submit(text, jsonb, jsonb),
  public.signing_decline(text, text, text, text),
  public.signing_expire_due(),
  public.signing_claim_finalize(uuid),
  public.signing_record_final(uuid, text, text, text, text),
  public.signing_config_hash(uuid),
  public.signing_verify_chain(uuid)
  from public, anon, authenticated;
grant execute on function
  public.signing_log_event(uuid, uuid, text, uuid, text, text, jsonb),
  public.signing_mark_reviewed(uuid, uuid),
  public.signing_save_draft(uuid, text, text, text, integer, jsonb, jsonb),
  public.signing_send(uuid, uuid, text, text, text),
  public.signing_void(uuid, uuid, text),
  public.signing_new_version(uuid, uuid),
  public.signing_issue_token(uuid, text),
  public.signing_issue_download_token(uuid, text, integer),
  public.signing_open(text, text, text),
  public.signing_record_consent(text, text, text, text, text),
  public.signing_submit(text, jsonb, jsonb),
  public.signing_decline(text, text, text, text),
  public.signing_expire_due(),
  public.signing_claim_finalize(uuid),
  public.signing_record_final(uuid, text, text, text, text),
  public.signing_config_hash(uuid),
  public.signing_verify_chain(uuid)
  to service_role;
