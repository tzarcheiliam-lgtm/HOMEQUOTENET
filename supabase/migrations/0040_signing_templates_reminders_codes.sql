-- ============================================================================
-- Documents & Signing, part 2: templates, automatic reminders, access codes
-- ============================================================================
-- Builds on 0039. Re-runnable (if-not-exists / create-or-replace / drop-if-exists).
--
-- ACCESS CODES (second factor on top of the emailed link)
--   * A version can require a 6-digit code. The code is generated server-side at
--     send time and shown to the SENDER once (to share by phone/text, never by
--     the signing email). Only a salted SHA-256 is stored.
--   * The signer enters it on the signing page. 5 wrong tries lock that signer
--     until the sender issues a new code. A correct code mints a separate
--     short-lived session secret (hash stored) that the signing page must send
--     with every later action, so a forwarded link alone is not enough.
--   * The database itself refuses to mark a signer "signed" on a code-required
--     request unless the code was verified (trigger below), and rotating the
--     signing link clears any earlier verification.
--   * This is still NOT legal identity verification; the certificate says so.
--
-- AUTOMATIC REMINDERS
--   * Per version: remind every N days, up to M times. The scheduler claims due
--     signers atomically (FOR UPDATE SKIP LOCKED) so two ticks cannot double-send.
--     A signer who opened the link in the last hour is skipped, because a
--     reminder issues a fresh link and would kill a page they have open.
--
-- TEMPLATES
--   * A template stores a private COPY of the PDF, the field layout by signer
--     ROLE (not by person), and default settings. It never stores signer names,
--     emails, signer-entered values or (by default) pre-filled text.
--   * A document created from a template starts as a normal draft and still has
--     to pass the placement review before it can be sent.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Columns
-- ---------------------------------------------------------------------------
alter table public.signing_versions
  add column if not exists auto_remind_days    smallint check (auto_remind_days is null or auto_remind_days between 1 and 30),
  add column if not exists auto_remind_max     smallint not null default 3 check (auto_remind_max between 1 and 10),
  add column if not exists require_access_code boolean  not null default false;

alter table public.signing_recipients
  add column if not exists auto_reminders_sent     smallint not null default 0,
  add column if not exists last_viewed_at          timestamptz,
  add column if not exists access_code_salt        text,
  add column if not exists access_code_hash        text,
  add column if not exists access_code_issued_at   timestamptz,
  add column if not exists access_code_attempts    smallint not null default 0,
  add column if not exists access_code_locked_at   timestamptz,
  add column if not exists access_verified_at      timestamptz,
  add column if not exists access_session_hash     text,
  add column if not exists access_session_expires_at timestamptz;
-- No browser role can read these: 0039 granted authenticated only an explicit column list.

-- ---------------------------------------------------------------------------
-- Lock the access-code requirement once sent (it is part of what the signers agreed to)
-- ---------------------------------------------------------------------------
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
       or new.version_no is distinct from old.version_no or new.expires_at is distinct from old.expires_at
       or new.require_access_code is distinct from old.require_access_code then
      raise exception 'signing:locked' using errcode = 'P0001';
    end if;
  end if;
  if old.final_sha256 is not null and (new.final_sha256 is distinct from old.final_sha256
     or new.final_path is distinct from old.final_path or new.certificate_sha256 is distinct from old.certificate_sha256
     or new.certificate_path is distinct from old.certificate_path) then
    raise exception 'signing:immutable' using errcode = 'P0001';
  end if;
  if old.status in ('completed','declined','voided','expired') and new.status is distinct from old.status then
    raise exception 'signing:terminal' using errcode = 'P0001';
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Recipient triggers: code enforcement + clear verification when the link rotates
-- ---------------------------------------------------------------------------
create or replace function public.signing_recipients_code_guard() returns trigger
language plpgsql as $$
declare needs boolean;
begin
  -- A new signing link invalidates any earlier code verification (it belonged to the old link).
  if new.token_hash is distinct from old.token_hash then
    new.access_verified_at := null;
    new.access_session_hash := null;
    new.access_session_expires_at := null;
  end if;
  -- Backstop: nobody becomes "signed" on a code-required request without a verified code.
  if new.status = 'signed' and old.status is distinct from 'signed' then
    select v.require_access_code into needs from public.signing_versions v where v.id = new.version_id;
    if coalesce(needs, false) and new.access_verified_at is null then
      raise exception 'signing:code_required' using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_signing_recipients_code_guard on public.signing_recipients;
create trigger trg_signing_recipients_code_guard before update on public.signing_recipients
  for each row execute function public.signing_recipients_code_guard();

-- ---------------------------------------------------------------------------
-- Draft options (draft only) and access codes
-- ---------------------------------------------------------------------------
create or replace function public.signing_set_draft_options(
  p_version uuid, p_auto_remind_days integer, p_auto_remind_max integer, p_require_code boolean
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v public.signing_versions;
begin
  select * into v from public.signing_versions where id = p_version for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if v.status <> 'draft' or v.sent_at is not null then return jsonb_build_object('ok', false, 'error', 'locked'); end if;
  update public.signing_versions
     set auto_remind_days = case when p_auto_remind_days is null then null else greatest(1, least(p_auto_remind_days, 30)) end,
         auto_remind_max = greatest(1, least(coalesce(p_auto_remind_max, 3), 10)),
         require_access_code = coalesce(p_require_code, false)
   where id = p_version;
  return jsonb_build_object('ok', true);
end $$;

-- Reminder settings may also be changed on an OPEN request (operational, not contractual).
create or replace function public.signing_set_reminders(p_version uuid, p_auto_remind_days integer, p_auto_remind_max integer, p_actor uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v public.signing_versions;
begin
  select * into v from public.signing_versions where id = p_version for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if v.status not in ('draft', 'awaiting_signature', 'partially_signed') then return jsonb_build_object('ok', false, 'error', 'not_open'); end if;
  update public.signing_versions
     set auto_remind_days = case when p_auto_remind_days is null then null else greatest(1, least(p_auto_remind_days, 30)) end,
         auto_remind_max = greatest(1, least(coalesce(p_auto_remind_max, 3), 10))
   where id = p_version;
  perform public.signing_log_event(p_version, null, 'reminders_configured', p_actor, null, null,
    jsonb_build_object('every_days', p_auto_remind_days, 'max', p_auto_remind_max));
  return jsonb_build_object('ok', true);
end $$;

-- Store a (salted, hashed) access code for one signer. Resets attempts, lock and any verified session.
create or replace function public.signing_set_access_code(p_recipient uuid, p_salt text, p_hash text, p_actor uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r public.signing_recipients; v public.signing_versions;
begin
  if p_salt is null or length(p_salt) < 16 or p_hash is null or p_hash !~ '^[0-9a-f]{64}$' then return jsonb_build_object('ok', false, 'error', 'bad_request'); end if;
  select * into r from public.signing_recipients where id = p_recipient for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  select * into v from public.signing_versions where id = r.version_id for update;
  if not v.require_access_code then return jsonb_build_object('ok', false, 'error', 'not_required'); end if;
  if v.status not in ('awaiting_signature', 'partially_signed') or r.status in ('signed', 'declined') then return jsonb_build_object('ok', false, 'error', 'not_open'); end if;
  update public.signing_recipients
     set access_code_salt = p_salt, access_code_hash = p_hash, access_code_issued_at = now(), access_code_attempts = 0,
         access_code_locked_at = null, access_verified_at = null, access_session_hash = null, access_session_expires_at = null,
         auth_method = 'email_link_code'
   where id = p_recipient;
  perform public.signing_log_event(v.id, p_recipient, 'access_code_issued', p_actor, null, null, '{}'::jsonb);
  return jsonb_build_object('ok', true);
end $$;

-- Check a code. Counts failures under the row lock; 5 wrong tries lock the signer.
create or replace function public.signing_verify_code(p_token_hash text, p_code text, p_session_hash text, p_ip text, p_ua text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r public.signing_recipients; v public.signing_versions; attempts int;
begin
  if p_token_hash is null or length(p_token_hash) <> 64 or p_session_hash is null or length(p_session_hash) <> 64 then return jsonb_build_object('ok', false, 'error', 'invalid'); end if;
  select * into r from public.signing_recipients where token_hash = p_token_hash for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'invalid'); end if;
  select * into v from public.signing_versions where id = r.version_id for update;
  if not v.require_access_code then return jsonb_build_object('ok', true, 'not_required', true); end if;
  if v.status not in ('awaiting_signature', 'partially_signed') or r.status in ('signed', 'declined')
     or r.token_invalidated_at is not null or r.token_expires_at <= now() then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  if r.access_code_hash is null then return jsonb_build_object('ok', false, 'error', 'code_missing'); end if;
  if r.access_code_locked_at is not null then return jsonb_build_object('ok', false, 'error', 'code_locked'); end if;
  if encode(sha256(convert_to(r.access_code_salt || ':' || btrim(coalesce(p_code, '')), 'UTF8')), 'hex') = r.access_code_hash then
    update public.signing_recipients
       set access_verified_at = now(), access_session_hash = p_session_hash,
           access_session_expires_at = now() + interval '4 hours', access_code_attempts = 0
     where id = r.id;
    perform public.signing_log_event(v.id, r.id, 'access_code_verified', null, p_ip, p_ua, '{}'::jsonb);
    return jsonb_build_object('ok', true);
  end if;
  attempts := r.access_code_attempts + 1;
  if attempts >= 5 then
    update public.signing_recipients set access_code_attempts = attempts, access_code_locked_at = now() where id = r.id;
    perform public.signing_log_event(v.id, r.id, 'access_code_locked', null, p_ip, p_ua, jsonb_build_object('attempts', attempts));
    return jsonb_build_object('ok', false, 'error', 'code_locked');
  end if;
  update public.signing_recipients set access_code_attempts = attempts where id = r.id;
  perform public.signing_log_event(v.id, r.id, 'access_code_failed', null, p_ip, p_ua, jsonb_build_object('attempt', attempts));
  return jsonb_build_object('ok', false, 'error', 'wrong_code', 'remaining', 5 - attempts);
end $$;

-- ---------------------------------------------------------------------------
-- Automatic reminders: claim due signers (atomic, bounded, single-flight)
-- ---------------------------------------------------------------------------
create or replace function public.signing_claim_auto_reminders(p_limit integer default 20)
returns table (recipient_id uuid, version_id uuid)
language plpgsql security definer set search_path = public as $$
begin
  return query
  with due as (
    select r.id
      from public.signing_recipients r
      join public.signing_versions v on v.id = r.version_id
     where v.status in ('awaiting_signature', 'partially_signed')
       and v.auto_remind_days is not null
       and v.expires_at > now()
       and r.status in ('sent', 'viewed')
       and r.invited_at is not null
       and r.token_invalidated_at is null
       and r.auto_reminders_sent < v.auto_remind_max
       and coalesce(r.last_sent_at, r.invited_at) <= now() - make_interval(days => v.auto_remind_days)
       and (r.last_viewed_at is null or r.last_viewed_at <= now() - interval '1 hour')
       and (v.signing_order = 'parallel' or not exists (
             select 1 from public.signing_recipients o
              where o.version_id = r.version_id and o.order_index < r.order_index and o.status <> 'signed'))
     order by coalesce(r.last_sent_at, r.invited_at)
     limit greatest(p_limit, 0)
     for update of r skip locked)
  update public.signing_recipients r
     set auto_reminders_sent = r.auto_reminders_sent + 1, last_sent_at = now()
    from due where r.id = due.id
  returning r.id, r.version_id;
end $$;

-- ---------------------------------------------------------------------------
-- New versions keep the reminder / access-code settings
-- ---------------------------------------------------------------------------
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
                                      detection, subject, message, signing_order, expiry_days, auto_remind_days, auto_remind_max,
                                      require_access_code, created_by)
  values (v.document_id, next_no, v.original_path, v.original_sha256, v.original_size, v.page_count, v.pages,
          v.detection, v.subject, v.message, v.signing_order, v.expiry_days, v.auto_remind_days, v.auto_remind_max,
          v.require_access_code, p_actor)
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

-- ---------------------------------------------------------------------------
-- Templates
-- ---------------------------------------------------------------------------
create table if not exists public.signing_templates (
  id                  uuid primary key default gen_random_uuid(),
  -- NULL = HomeQuote network level (admins only), exactly like documents.
  contractor_id       uuid references public.contractors(id) on delete restrict,
  name                text not null check (char_length(btrim(name)) between 1 and 120),
  description         text check (description is null or char_length(description) <= 500),
  original_path       text not null,
  original_sha256     text not null check (original_sha256 ~ '^[0-9a-f]{64}$'),
  original_size       integer not null check (original_size > 0),
  page_count          integer not null check (page_count between 1 and 200),
  pages               jsonb not null,
  detection           jsonb not null default '{}'::jsonb,
  subject             text check (subject is null or char_length(subject) <= 200),
  message             text check (message is null or char_length(message) <= 4000),
  signing_order       text not null default 'sequential' check (signing_order in ('sequential','parallel')),
  expiry_days         smallint not null default 14 check (expiry_days between 1 and 90),
  auto_remind_days    smallint check (auto_remind_days is null or auto_remind_days between 1 and 30),
  auto_remind_max     smallint not null default 3 check (auto_remind_max between 1 and 10),
  require_access_code boolean not null default false,
  use_count           integer not null default 0,
  last_used_at        timestamptz,
  archived_at         timestamptz,
  created_by          uuid references public.profiles(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists idx_signing_templates_owner on public.signing_templates(contractor_id, created_at desc);

create table if not exists public.signing_template_roles (
  template_id uuid not null references public.signing_templates(id) on delete cascade,
  order_index smallint not null check (order_index >= 1),
  label       text not null check (char_length(btrim(label)) between 1 and 60),
  primary key (template_id, order_index)
);

create table if not exists public.signing_template_fields (
  id             uuid primary key default gen_random_uuid(),
  template_id    uuid not null references public.signing_templates(id) on delete cascade,
  role_index     smallint check (role_index is null or role_index >= 1),
  type           text not null check (type in ('signature','initials','name','date','text','checkbox')),
  page           smallint not null check (page >= 1),
  x              double precision not null check (x >= 0 and x <= 1),
  y              double precision not null check (y >= 0 and y <= 1),
  w              double precision not null check (w > 0 and w <= 1),
  h              double precision not null check (h > 0 and h <= 1),
  required       boolean not null default true,
  label          text check (label is null or char_length(label) <= 120),
  group_key      text check (group_key is null or char_length(group_key) <= 60),
  prefill_value  text check (prefill_value is null or char_length(prefill_value) <= 1000),
  date_format    text check (date_format is null or date_format in ('MMM d, yyyy','MM/dd/yyyy','dd/MM/yyyy','yyyy-MM-dd')),
  source         text not null default 'manual' check (source in ('acroform','text','ocr','manual')),
  confidence     real check (confidence is null or (confidence >= 0 and confidence <= 1)),
  role_hint      text,
  sort_order     integer not null default 0,
  constraint signing_template_fields_prefill_text_only check (prefill_value is null or type = 'text')
);
create index if not exists idx_signing_template_fields_tpl on public.signing_template_fields(template_id);

create or replace function public.signing_can_read_template(p_template uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.signing_templates t
    where t.id = p_template
      and (public.is_admin() or (t.contractor_id is not null and t.contractor_id = public.auth_contractor_id()))
  )
$$;

-- Save a version's layout as a template. The PDF was already copied to p_path by the server.
-- p_roles: ["Homeowner", "Contractor", ...] one label per signer, in signing order.
create or replace function public.signing_create_template(
  p_template uuid, p_source_version uuid, p_actor uuid, p_name text, p_description text, p_roles jsonb, p_path text, p_keep_prefill boolean
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v public.signing_versions; d public.signing_documents; n_rec int; i int := 0; el jsonb; f record;
begin
  select * into v from public.signing_versions where id = p_source_version;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  select * into d from public.signing_documents where id = v.document_id;
  select count(*) into n_rec from public.signing_recipients where version_id = p_source_version;
  if n_rec = 0 then return jsonb_build_object('ok', false, 'error', 'no_recipients'); end if;
  if jsonb_typeof(p_roles) <> 'array' or jsonb_array_length(p_roles) <> n_rec then return jsonb_build_object('ok', false, 'error', 'bad_roles'); end if;
  if coalesce(btrim(p_name), '') = '' or p_path is null then return jsonb_build_object('ok', false, 'error', 'bad_request'); end if;
  insert into public.signing_templates(id, contractor_id, name, description, original_path, original_sha256, original_size, page_count, pages,
                                       detection, subject, message, signing_order, expiry_days, auto_remind_days, auto_remind_max,
                                       require_access_code, created_by)
  values (p_template, d.contractor_id, left(btrim(p_name), 120), nullif(left(btrim(coalesce(p_description, '')), 500), ''), p_path,
          v.original_sha256, v.original_size, v.page_count, v.pages, v.detection, v.subject, v.message, v.signing_order, v.expiry_days,
          v.auto_remind_days, v.auto_remind_max, v.require_access_code, p_actor);
  for el in select * from jsonb_array_elements(p_roles) loop
    i := i + 1;
    insert into public.signing_template_roles(template_id, order_index, label) values (p_template, i, left(btrim(el #>> '{}'), 60));
  end loop;
  for f in select fl.*, r.order_index as ridx from public.signing_fields fl
             left join public.signing_recipients r on r.id = fl.recipient_id
            where fl.version_id = p_source_version order by fl.sort_order loop
    insert into public.signing_template_fields(template_id, role_index, type, page, x, y, w, h, required, label, group_key, prefill_value,
                                               date_format, source, confidence, role_hint, sort_order)
    values (p_template, f.ridx, f.type, f.page, f.x, f.y, f.w, f.h, f.required, f.label, f.group_key,
            case when p_keep_prefill then f.prefill_value else null end, f.date_format, f.source, f.confidence, f.role_hint, f.sort_order);
  end loop;
  perform public.signing_log_event(p_source_version, null, 'template_saved', p_actor, null, null, jsonb_build_object('template_id', p_template));
  return jsonb_build_object('ok', true);
end $$;

-- Create a document + draft version + signers + fields from a template, atomically.
-- p_recipients: [{name,email}] one per template role, in role order. The server already copied the PDF to p_path.
create or replace function public.signing_create_from_template(
  p_template uuid, p_doc uuid, p_version uuid, p_title text, p_actor uuid, p_lead uuid, p_recipients jsonb, p_path text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare t public.signing_templates; n_roles int; el jsonb; i int := 0; rid uuid; ids uuid[] := '{}'; f record;
begin
  select * into t from public.signing_templates where id = p_template for update;
  if not found or t.archived_at is not null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  select count(*) into n_roles from public.signing_template_roles where template_id = p_template;
  if jsonb_typeof(p_recipients) <> 'array' or jsonb_array_length(p_recipients) <> n_roles then return jsonb_build_object('ok', false, 'error', 'bad_roles'); end if;
  if coalesce(btrim(p_title), '') = '' or p_path is null then return jsonb_build_object('ok', false, 'error', 'bad_request'); end if;
  insert into public.signing_documents(id, contractor_id, lead_id, title, created_by)
  values (p_doc, t.contractor_id, p_lead, left(btrim(p_title), 200), p_actor);
  insert into public.signing_versions(id, document_id, version_no, original_path, original_sha256, original_size, page_count, pages, detection,
                                      subject, message, signing_order, expiry_days, auto_remind_days, auto_remind_max, require_access_code, created_by)
  values (p_version, p_doc, 1, p_path, t.original_sha256, t.original_size, t.page_count, t.pages, t.detection, t.subject, t.message,
          t.signing_order, t.expiry_days, t.auto_remind_days, t.auto_remind_max, t.require_access_code, p_actor);
  for el in select * from jsonb_array_elements(p_recipients) loop
    i := i + 1;
    insert into public.signing_recipients(version_id, name, email, order_index)
    values (p_version, btrim(el ->> 'name'), lower(btrim(el ->> 'email')), i) returning id into rid;
    ids := ids || rid;
  end loop;
  for f in select * from public.signing_template_fields where template_id = p_template order by sort_order loop
    insert into public.signing_fields(version_id, recipient_id, type, page, x, y, w, h, required, label, group_key, prefill_value, date_format,
                                      source, confidence, needs_review, role_hint, sort_order)
    values (p_version, case when f.role_index is null then null else ids[f.role_index] end, f.type, f.page, f.x, f.y, f.w, f.h, f.required,
            f.label, f.group_key, f.prefill_value, f.date_format, f.source, f.confidence, false, f.role_hint, f.sort_order);
  end loop;
  update public.signing_documents set current_version_id = p_version where id = p_doc;
  update public.signing_templates set use_count = use_count + 1, last_used_at = now() where id = p_template;
  perform public.signing_log_event(p_version, null, 'version_created', p_actor, null, null,
    jsonb_build_object('version_no', 1, 'from_template', p_template, 'original_sha256', t.original_sha256));
  return jsonb_build_object('ok', true);
end $$;

-- ---------------------------------------------------------------------------
-- RLS + grants (read-only for authorized sender-side users, like 0039)
-- ---------------------------------------------------------------------------
alter table public.signing_templates       enable row level security;
alter table public.signing_template_roles  enable row level security;
alter table public.signing_template_fields enable row level security;

drop policy if exists signing_templates_select on public.signing_templates;
create policy signing_templates_select on public.signing_templates for select using (public.signing_can_read_template(id));
drop policy if exists signing_template_roles_select on public.signing_template_roles;
create policy signing_template_roles_select on public.signing_template_roles for select using (public.signing_can_read_template(template_id));
drop policy if exists signing_template_fields_select on public.signing_template_fields;
create policy signing_template_fields_select on public.signing_template_fields for select using (public.signing_can_read_template(template_id));

revoke all on public.signing_templates, public.signing_template_roles, public.signing_template_fields from anon, authenticated;
grant select on public.signing_templates, public.signing_template_roles, public.signing_template_fields to authenticated;
grant all on public.signing_templates, public.signing_template_roles, public.signing_template_fields to service_role;

revoke all on function
  public.signing_set_draft_options(uuid, integer, integer, boolean),
  public.signing_set_reminders(uuid, integer, integer, uuid),
  public.signing_set_access_code(uuid, text, text, uuid),
  public.signing_verify_code(text, text, text, text, text),
  public.signing_claim_auto_reminders(integer),
  public.signing_create_template(uuid, uuid, uuid, text, text, jsonb, text, boolean),
  public.signing_create_from_template(uuid, uuid, uuid, text, uuid, uuid, jsonb, text),
  public.signing_new_version(uuid, uuid)
  from public, anon, authenticated;
grant execute on function
  public.signing_set_draft_options(uuid, integer, integer, boolean),
  public.signing_set_reminders(uuid, integer, integer, uuid),
  public.signing_set_access_code(uuid, text, text, uuid),
  public.signing_verify_code(text, text, text, text, text),
  public.signing_claim_auto_reminders(integer),
  public.signing_create_template(uuid, uuid, uuid, text, text, jsonb, text, boolean),
  public.signing_create_from_template(uuid, uuid, uuid, text, uuid, uuid, jsonb, text),
  public.signing_new_version(uuid, uuid)
  to service_role;

notify pgrst, 'reload schema';
