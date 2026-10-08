-- ============================================================================
-- Contracts & Templates (reusable agreements on top of Documents & Signing)
-- ============================================================================
-- Model
--   contract_templates          editable working copy of a reusable agreement (sections, default values, branding)
--   contract_template_versions  immutable snapshot created each time a template is PUBLISHED
--   contracts                   one agreement for one client. It COPIES the template content at creation, so editing
--                               or deleting a template never changes an existing agreement. When sent, the agreement
--                               is rendered to a PDF that becomes a normal signing_documents/signing_versions pair
--                               (migration 0039/0040) - tokens, consent, audit hash chain, reminders, expiry and the
--                               certificate of completion are all that engine, unchanged.
--   contract_events             append-only contract-level audit (the signing audit chain stays in signing_events)
--   contract_attachments        PDF exhibits (appended to the agreement when it is sent)
--   contract_seed_log           remembers which starter templates were seeded (a deleted starter is not resurrected)
--
-- SECURITY
--   * Everything is written by the service role from server code that checks the actor first; authenticated users
--     only get SELECT (RLS). Templates and attachments are admin-only. A contractor user can read ONLY sent
--     agreements of their own company (never drafts, never another company's).
--   * Once the linked signing request has left 'draft', the agreement row is frozen by trigger (content, client,
--     signers, branding, hashes), and it can never be deleted. Executed agreements are additionally protected by the
--     signing tables' own immutability triggers.
--   * Logos and exhibits live in the PRIVATE bucket 'contract-assets' (no storage policies: server access only).
--   * Contract events are emitted to the workflow engine by a database trigger on signing_events, so no signing code
--     path can forget to emit one, and a failing hook can never break signing.
--   * Signing a contract does NOT activate billing; payment stays on the existing verified Stripe flow.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- CRM logo (client logo is reused on every future agreement)
-- ---------------------------------------------------------------------------
alter table public.contractors add column if not exists logo_path text;
alter table public.contractors add column if not exists logo_updated_at timestamptz;

do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('contract-assets', 'contract-assets', false, 10485760, array['image/png', 'application/pdf'])
    on conflict (id) do update set public = false;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Templates
-- ---------------------------------------------------------------------------
create table if not exists public.contract_templates (
  id                uuid primary key default gen_random_uuid(),
  name              text not null check (char_length(btrim(name)) between 1 and 120),
  description       text check (description is null or char_length(description) <= 600),
  category          text not null default 'General' check (char_length(btrim(category)) between 1 and 60),
  status            text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  is_default        boolean not null default false,
  starter_key       text unique,
  requires_review   boolean not null default false,
  -- ordered sections: [{id,key,kind:'rich'|'signatures',title,showTitle,numbered,pageBreakBefore,doc}]
  sections          jsonb not null default '[]'::jsonb check (jsonb_typeof(sections) = 'array'),
  -- default signers: [{key,label}]
  signer_roles      jsonb not null default '[]'::jsonb check (jsonb_typeof(signer_roles) = 'array'),
  default_variables  jsonb not null default '{}'::jsonb check (jsonb_typeof(default_variables) = 'object'),
  branding          jsonb not null default '{"mode":"side_by_side"}'::jsonb check (jsonb_typeof(branding) = 'object'),
  latest_version_no integer not null default 0,
  created_by        uuid references public.profiles(id) on delete set null,
  updated_by        uuid references public.profiles(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  archived_at       timestamptz
);
create unique index if not exists uq_contract_templates_default on public.contract_templates (is_default) where is_default;
create index if not exists idx_contract_templates_status on public.contract_templates (status, category);
drop trigger if exists trg_contract_templates_updated on public.contract_templates;
create trigger trg_contract_templates_updated before update on public.contract_templates
  for each row execute function public.set_updated_at();

create table if not exists public.contract_template_versions (
  id             uuid primary key default gen_random_uuid(),
  template_id    uuid not null references public.contract_templates(id) on delete cascade,
  version_no     integer not null check (version_no >= 1),
  snapshot       jsonb not null,
  content_sha256 text not null check (content_sha256 ~ '^[0-9a-f]{64}$'),
  created_by     uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  unique (template_id, version_no)
);

-- Published versions never change. They may only disappear together with their (unreferenced) template.
create or replace function public.contract_template_versions_forbid_change() returns trigger
language plpgsql as $$
begin
  if tg_op = 'DELETE' and not exists (select 1 from public.contract_templates t where t.id = old.template_id) then
    return old;
  end if;
  raise exception 'contracts:immutable' using errcode = 'P0001';
end $$;
create or replace function public.contract_events_forbid_change() returns trigger
language plpgsql as $$
begin
  if tg_op = 'DELETE' and not exists (select 1 from public.contracts c where c.id = old.contract_id) then
    return old;
  end if;
  raise exception 'contracts:immutable' using errcode = 'P0001';
end $$;
drop trigger if exists trg_contract_template_versions_immutable on public.contract_template_versions;
create trigger trg_contract_template_versions_immutable before update or delete on public.contract_template_versions
  for each row execute function public.contract_template_versions_forbid_change();

create table if not exists public.contract_seed_log (
  key       text primary key,
  seeded_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Contracts
-- ---------------------------------------------------------------------------
create table if not exists public.contracts (
  id                  uuid primary key default gen_random_uuid(),
  contract_no         bigint generated by default as identity unique,
  title               text not null check (char_length(btrim(title)) between 1 and 200),
  template_id         uuid references public.contract_templates(id) on delete restrict,
  template_version_id uuid references public.contract_template_versions(id) on delete restrict,
  template_name       text,
  -- NULL for a client that is not (yet) in the CRM.
  contractor_id       uuid references public.contractors(id) on delete restrict,
  client              jsonb not null default '{}'::jsonb check (jsonb_typeof(client) = 'object'),
  sections            jsonb not null default '[]'::jsonb check (jsonb_typeof(sections) = 'array'),
  variables           jsonb not null default '{}'::jsonb check (jsonb_typeof(variables) = 'object'),
  branding            jsonb not null default '{"mode":"side_by_side"}'::jsonb check (jsonb_typeof(branding) = 'object'),
  -- [{role,label,name,email}] in signing order
  signers             jsonb not null default '[]'::jsonb check (jsonb_typeof(signers) = 'array'),
  settings            jsonb not null default '{}'::jsonb check (jsonb_typeof(settings) = 'object'),
  value_amount        numeric(14,2) check (value_amount is null or value_amount >= 0),
  signing_document_id uuid references public.signing_documents(id) on delete restrict,
  signing_version_id  uuid references public.signing_versions(id) on delete restrict,
  document_sha256     text check (document_sha256 is null or document_sha256 ~ '^[0-9a-f]{64}$'),
  content_sha256      text check (content_sha256 is null or content_sha256 ~ '^[0-9a-f]{64}$'),
  sent_at             timestamptz,
  sent_by             uuid references public.profiles(id) on delete set null,
  created_by          uuid references public.profiles(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists idx_contracts_contractor on public.contracts (contractor_id, created_at desc);
create index if not exists idx_contracts_template on public.contracts (template_id);
create unique index if not exists uq_contracts_signing_version on public.contracts (signing_version_id) where signing_version_id is not null;
drop trigger if exists trg_contracts_updated on public.contracts;
create trigger trg_contracts_updated before update on public.contracts
  for each row execute function public.set_updated_at();

-- A contract is "executed-locked" as soon as its signing request is no longer a draft.
create or replace function public.contract_is_locked(p_version uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select p_version is not null and exists (select 1 from public.signing_versions v where v.id = p_version and v.status <> 'draft')
$$;

create or replace function public.contracts_guard() returns trigger
language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    if public.contract_is_locked(old.signing_version_id) or old.sent_at is not null then
      raise exception 'contracts:locked' using errcode = 'P0001';
    end if;
    return old;
  end if;
  if public.contract_is_locked(old.signing_version_id) or old.sent_at is not null then
    if new.contract_no is distinct from old.contract_no or new.title is distinct from old.title
       or new.template_id is distinct from old.template_id or new.template_version_id is distinct from old.template_version_id
       or new.template_name is distinct from old.template_name or new.contractor_id is distinct from old.contractor_id
       or new.client is distinct from old.client or new.sections is distinct from old.sections
       or new.variables is distinct from old.variables or new.branding is distinct from old.branding
       or new.signers is distinct from old.signers or new.settings is distinct from old.settings
       or new.value_amount is distinct from old.value_amount
       or new.signing_document_id is distinct from old.signing_document_id
       or new.signing_version_id is distinct from old.signing_version_id
       or new.document_sha256 is distinct from old.document_sha256 or new.content_sha256 is distinct from old.content_sha256
       or (old.sent_at is not null and new.sent_at is distinct from old.sent_at)
       or new.created_by is distinct from old.created_by then
      raise exception 'contracts:locked' using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_contracts_guard on public.contracts;
create trigger trg_contracts_guard before update or delete on public.contracts
  for each row execute function public.contracts_guard();

create table if not exists public.contract_events (
  id            bigint generated always as identity primary key,
  contract_id   uuid not null references public.contracts(id) on delete cascade,
  event_type    text not null check (char_length(event_type) between 1 and 60),
  actor_user_id uuid references public.profiles(id) on delete set null,
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default clock_timestamp()
);
create index if not exists idx_contract_events_contract on public.contract_events (contract_id, id);
drop trigger if exists trg_contract_events_immutable on public.contract_events;
create trigger trg_contract_events_immutable before update or delete on public.contract_events
  for each row execute function public.contract_events_forbid_change();

create table if not exists public.contract_attachments (
  id          uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  path        text not null,
  filename    text not null check (char_length(filename) between 1 and 200),
  mime        text not null default 'application/pdf',
  size_bytes  integer not null check (size_bytes > 0),
  sha256      text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  page_count  integer,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists idx_contract_attachments_contract on public.contract_attachments (contract_id);

create or replace function public.contract_attachments_guard() returns trigger
language plpgsql as $$
declare cid uuid; locked boolean;
begin
  cid := case when tg_op = 'DELETE' then old.contract_id else new.contract_id end;
  select public.contract_is_locked(c.signing_version_id) or c.sent_at is not null into locked from public.contracts c where c.id = cid;
  -- cascade from deleting the (unsent) contract itself finds no row: allow it
  if locked then raise exception 'contracts:locked' using errcode = 'P0001'; end if;
  if tg_op = 'UPDATE' then raise exception 'contracts:immutable' using errcode = 'P0001'; end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;
drop trigger if exists trg_contract_attachments_guard on public.contract_attachments;
create trigger trg_contract_attachments_guard before insert or update or delete on public.contract_attachments
  for each row execute function public.contract_attachments_guard();

-- ---------------------------------------------------------------------------
-- State functions (service role only)
-- ---------------------------------------------------------------------------
-- Publish: snapshot the working copy as the next immutable version.
create or replace function public.contract_publish_template(p_template uuid, p_actor uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare t public.contract_templates; snap jsonb; n int; h text;
begin
  select * into t from public.contract_templates where id = p_template for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if t.status = 'archived' then return jsonb_build_object('ok', false, 'error', 'archived'); end if;
  if jsonb_array_length(t.sections) = 0 then return jsonb_build_object('ok', false, 'error', 'empty'); end if;
  snap := jsonb_build_object('name', t.name, 'description', t.description, 'category', t.category, 'sections', t.sections,
                             'signer_roles', t.signer_roles, 'default_variables', t.default_variables, 'branding', t.branding,
                             'requires_review', t.requires_review);
  h := encode(sha256(convert_to(snap::text, 'UTF8')), 'hex');
  -- publishing unchanged content again is a no-op (no empty versions)
  if t.latest_version_no > 0 and exists (select 1 from public.contract_template_versions v
       where v.template_id = p_template and v.version_no = t.latest_version_no and v.content_sha256 = h) then
    update public.contract_templates set status = 'published', updated_by = p_actor where id = p_template;
    return jsonb_build_object('ok', true, 'version_no', t.latest_version_no, 'unchanged', true);
  end if;
  n := t.latest_version_no + 1;
  insert into public.contract_template_versions (template_id, version_no, snapshot, content_sha256, created_by)
  values (p_template, n, snap, h, p_actor);
  update public.contract_templates set status = 'published', latest_version_no = n, updated_by = p_actor where id = p_template;
  return jsonb_build_object('ok', true, 'version_no', n);
end $$;

-- New draft contract from the LATEST PUBLISHED version of a template (never from the editable working copy).
create or replace function public.contract_create_from_template(
  p_template uuid, p_actor uuid, p_contractor uuid, p_title text, p_client jsonb
) returns jsonb language plpgsql security definer set search_path = public as $$
declare t public.contract_templates; v public.contract_template_versions; cid uuid; roles jsonb; c public.contractors; cl jsonb := coalesce(p_client, '{}'::jsonb);
begin
  select * into t from public.contract_templates where id = p_template;
  if not found or t.status <> 'published' or t.latest_version_no < 1 then return jsonb_build_object('ok', false, 'error', 'not_published'); end if;
  select * into v from public.contract_template_versions where template_id = p_template and version_no = t.latest_version_no;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_published'); end if;
  if p_contractor is not null then
    select * into c from public.contractors where id = p_contractor;
    if not found then return jsonb_build_object('ok', false, 'error', 'bad_contractor'); end if;
  end if;
  roles := v.snapshot -> 'signer_roles';
  insert into public.contracts (title, template_id, template_version_id, template_name, contractor_id, client, sections, variables,
                                branding, signers, settings, created_by)
  values (left(coalesce(nullif(btrim(p_title), ''), v.snapshot ->> 'name'), 200), t.id, v.id, v.snapshot ->> 'name', p_contractor, cl,
          v.snapshot -> 'sections', coalesce(v.snapshot -> 'default_variables', '{}'::jsonb), coalesce(v.snapshot -> 'branding', '{"mode":"side_by_side"}'::jsonb),
          '[]'::jsonb, jsonb_build_object('roles', roles), p_actor)
  returning id into cid;
  insert into public.contract_events (contract_id, event_type, actor_user_id, metadata)
  values (cid, 'created', p_actor, jsonb_build_object('template_id', t.id, 'template_version_no', v.version_no, 'template_sha256', v.content_sha256));
  return jsonb_build_object('ok', true, 'contract_id', cid, 'template_version_no', v.version_no);
end $$;

create or replace function public.contract_set_default_template(p_template uuid, p_actor uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare t public.contract_templates;
begin
  select * into t from public.contract_templates where id = p_template for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if t.status <> 'published' then return jsonb_build_object('ok', false, 'error', 'not_published'); end if;
  update public.contract_templates set is_default = false where is_default and id <> p_template;
  update public.contract_templates set is_default = true, updated_by = p_actor where id = p_template;
  return jsonb_build_object('ok', true);
end $$;

-- Connects a draft contract to its (draft) signing request. An abandoned attempt must be unlinked first.
create or replace function public.contract_link_signing(
  p_contract uuid, p_doc uuid, p_version uuid, p_variables jsonb, p_document_sha text, p_content_sha text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare c public.contracts;
begin
  select * into c from public.contracts where id = p_contract for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if c.sent_at is not null or public.contract_is_locked(c.signing_version_id) then return jsonb_build_object('ok', false, 'error', 'locked'); end if;
  -- A second sender (double click, two admins) must not replace a request that is still being prepared.
  if c.signing_version_id is not null then return jsonb_build_object('ok', false, 'error', 'in_progress'); end if;
  update public.contracts set signing_document_id = p_doc, signing_version_id = p_version, variables = p_variables,
         document_sha256 = p_document_sha, content_sha256 = p_content_sha where id = p_contract;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.contract_unlink_signing(p_contract uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c public.contracts;
begin
  select * into c from public.contracts where id = p_contract for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if c.sent_at is not null or public.contract_is_locked(c.signing_version_id) then return jsonb_build_object('ok', false, 'error', 'locked'); end if;
  update public.contracts set signing_document_id = null, signing_version_id = null, document_sha256 = null, content_sha256 = null where id = p_contract;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.contract_mark_sent(p_contract uuid, p_actor uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c public.contracts; sv public.signing_versions;
begin
  select * into c from public.contracts where id = p_contract for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if c.signing_version_id is null then return jsonb_build_object('ok', false, 'error', 'not_linked'); end if;
  select * into sv from public.signing_versions where id = c.signing_version_id;
  if sv.status = 'draft' then return jsonb_build_object('ok', false, 'error', 'not_sent'); end if;
  if c.sent_at is null then
    update public.contracts set sent_at = coalesce(sv.sent_at, now()), sent_by = p_actor where id = p_contract;
    insert into public.contract_events (contract_id, event_type, actor_user_id, metadata)
    values (p_contract, 'sent', p_actor, jsonb_build_object('signing_version_id', c.signing_version_id, 'document_sha256', c.document_sha256, 'content_sha256', c.content_sha256));
  end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.contract_log_event(p_contract uuid, p_type text, p_actor uuid, p_meta jsonb) returns void
language sql security definer set search_path = public as $$
  insert into public.contract_events (contract_id, event_type, actor_user_id, metadata) values (p_contract, p_type, p_actor, coalesce(p_meta, '{}'::jsonb))
$$;

revoke all on function public.contract_publish_template(uuid, uuid), public.contract_create_from_template(uuid, uuid, uuid, text, jsonb),
  public.contract_set_default_template(uuid, uuid), public.contract_link_signing(uuid, uuid, uuid, jsonb, text, text),
  public.contract_unlink_signing(uuid), public.contract_mark_sent(uuid, uuid), public.contract_log_event(uuid, text, uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.contract_publish_template(uuid, uuid), public.contract_create_from_template(uuid, uuid, uuid, text, jsonb),
  public.contract_set_default_template(uuid, uuid), public.contract_link_signing(uuid, uuid, uuid, jsonb, text, text),
  public.contract_unlink_signing(uuid), public.contract_mark_sent(uuid, uuid), public.contract_log_event(uuid, text, uuid, jsonb)
  to service_role;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.contract_templates         enable row level security;
alter table public.contract_template_versions enable row level security;
alter table public.contracts                  enable row level security;
alter table public.contract_events            enable row level security;
alter table public.contract_attachments       enable row level security;
alter table public.contract_seed_log          enable row level security;

drop policy if exists contract_templates_select on public.contract_templates;
create policy contract_templates_select on public.contract_templates for select using (public.is_admin());
drop policy if exists contract_template_versions_select on public.contract_template_versions;
create policy contract_template_versions_select on public.contract_template_versions for select using (public.is_admin());
drop policy if exists contract_events_select on public.contract_events;
create policy contract_events_select on public.contract_events for select using (public.is_admin());
drop policy if exists contract_attachments_select on public.contract_attachments;
create policy contract_attachments_select on public.contract_attachments for select using (public.is_admin());

-- A company sees only agreements that were actually SENT to it - never drafts, never another company's.
create or replace function public.contract_company_can_read(p_contractor uuid, p_version uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select p_contractor is not null and p_contractor = public.auth_contractor_id() and public.contract_is_locked(p_version)
$$;
drop policy if exists contracts_select on public.contracts;
create policy contracts_select on public.contracts for select
  using (public.is_admin() or public.contract_company_can_read(contractor_id, signing_version_id));

revoke all on public.contract_templates, public.contract_template_versions, public.contracts, public.contract_events,
              public.contract_attachments, public.contract_seed_log from anon, authenticated;
grant select on public.contract_templates, public.contract_template_versions, public.contract_events, public.contract_attachments to authenticated;
-- Companies get the columns they need to see their own agreement, not internal settings.
grant select (id, contract_no, title, template_name, contractor_id, client, sections, variables, branding, signers, value_amount,
              signing_document_id, signing_version_id, document_sha256, sent_at, created_at, updated_at) on public.contracts to authenticated;
-- Admin screens read through service-role server code (after an explicit admin check); browser sessions never need more than this.

-- ---------------------------------------------------------------------------
-- Workflow vocabulary: contract.* events (mirrored by lib/workflows/events.ts; a test fails if they drift)
-- ---------------------------------------------------------------------------
alter table public.workflows drop constraint if exists workflows_trigger_type_check;
alter table public.workflows add constraint workflows_trigger_type_check check (trigger_type in (
  'lead.created', 'lead.status_changed', 'lead.qualification_changed', 'lead.assigned',
  'assignment.status_changed',
  'appointment.booked', 'appointment.cancelled', 'appointment.completed', 'appointment.no_show',
  'appointment.rescheduled',
  'estimate.sent', 'estimate.accepted', 'deal.won', 'deal.lost',
  'task.completed', 'message.received',
  'ai_call.completed', 'ai_call.failed', 'workflow.manual_enrollment',
  'contract.created', 'contract.sent', 'contract.viewed', 'contract.signed', 'contract.fully_signed',
  'contract.declined', 'contract.expired'
));
alter table public.workflow_events drop constraint if exists workflow_events_type_check;
alter table public.workflow_events add constraint workflow_events_type_check check (type in (
  'lead.created', 'lead.status_changed', 'lead.qualification_changed', 'lead.assigned',
  'assignment.status_changed',
  'appointment.booked', 'appointment.cancelled', 'appointment.completed', 'appointment.no_show',
  'appointment.rescheduled',
  'estimate.sent', 'estimate.accepted', 'deal.won', 'deal.lost',
  'task.completed', 'message.received',
  'ai_call.completed', 'ai_call.failed', 'workflow.manual_enrollment',
  'contract.created', 'contract.sent', 'contract.viewed', 'contract.signed', 'contract.fully_signed',
  'contract.declined', 'contract.expired'
));
alter table public.workflow_events drop constraint if exists workflow_events_entity_type_check;
alter table public.workflow_events add constraint workflow_events_entity_type_check check (entity_type in (
  'lead', 'lead_assignment', 'appointment', 'estimate', 'sale', 'task', 'message', 'contract'
));
alter table public.workflow_runs drop constraint if exists workflow_runs_entity_type_check;
alter table public.workflow_runs add constraint workflow_runs_entity_type_check check (entity_type in (
  'lead', 'lead_assignment', 'appointment', 'estimate', 'sale', 'task', 'message', 'contract'
));

-- contract.created
create or replace function public.contract_emit_created() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  begin
    perform public.emit_workflow_event('contract.created', 'contract.created|contract:' || new.id, 'contract', new.id, 'db:contracts', now(),
      null, null, 'user', new.created_by,
      jsonb_build_object('contractId', new.id, 'contractNo', new.contract_no, 'clientContractorId', new.contractor_id, 'templateName', new.template_name),
      '{}', null, null);
  exception when others then
    raise warning 'contract.created hook failed for %: %', new.id, sqlerrm;
  end;
  return new;
end $$;
drop trigger if exists trg_contracts_emit_created on public.contracts;
create trigger trg_contracts_emit_created after insert on public.contracts
  for each row execute function public.contract_emit_created();

-- sent / viewed / signed / fully signed / declined / expired come from the signing audit log
create or replace function public.contract_emit_from_signing_event() returns trigger
language plpgsql security definer set search_path = public as $$
declare c record; ev text; k text; role_label text;
begin
  begin
    ev := case new.event_type
      when 'sent' then 'contract.sent' when 'viewed' then 'contract.viewed' when 'signed' then 'contract.signed'
      when 'completed' then 'contract.fully_signed' when 'declined' then 'contract.declined' when 'expired' then 'contract.expired'
      else null end;
    if ev is null then return new; end if;
    select id, contract_no, contractor_id, signers into c from public.contracts where signing_version_id = new.version_id;
    if not found then return new; end if;
    -- "signed" is per signer; every other event happens once per contract (the first viewer counts as "viewed")
    k := case when ev = 'contract.signed' then 'contract.signed|contract:' || c.id || ':' || coalesce(new.recipient_id::text, 'unknown')
              else ev || '|contract:' || c.id end;
    select coalesce(s ->> 'label', s ->> 'role') into role_label
      from jsonb_array_elements(c.signers) s
     where lower(s ->> 'email') = (select lower(r.email) from public.signing_recipients r where r.id = new.recipient_id) limit 1;
    perform public.emit_workflow_event(ev, k, 'contract', c.id, 'db:signing_events', coalesce(new.created_at, now()),
      null, null, 'system', null,
      jsonb_build_object('contractId', c.id, 'contractNo', c.contract_no, 'clientContractorId', c.contractor_id,
                         'signingVersionId', new.version_id, 'recipientId', new.recipient_id, 'signerRole', role_label),
      '{}', null, null);
  exception when others then
    raise warning 'contract workflow hook failed for signing event %: %', new.id, sqlerrm;
  end;
  return new;
end $$;
drop trigger if exists trg_signing_events_contract_emit on public.signing_events;
create trigger trg_signing_events_contract_emit after insert on public.signing_events
  for each row execute function public.contract_emit_from_signing_event();
