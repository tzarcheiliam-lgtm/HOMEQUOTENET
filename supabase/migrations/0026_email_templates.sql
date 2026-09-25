-- ===========================================================================
-- EMAIL TEMPLATE LIBRARY
-- A reusable library of branded, variable-driven email templates that admins
-- can preview, duplicate, edit, and send manually today, and that workflow
-- send_email steps can reference by id (see 0020_workflow_automation_foundation
-- + lib/workflows/actions.ts) instead of hardcoding subject/body. This is not
-- a second email sender: delivery still goes through the existing Gmail
-- connection (lib/emails/gmail.ts sendGmailMessage).
-- ===========================================================================

create table public.email_templates (
  id                uuid primary key default gen_random_uuid(),
  key               text not null unique,               -- stable slug, e.g. 'homeowner_new_lead_confirmation'
  category          text not null,                       -- e.g. 'Homeowner Follow-Up'
  name              text not null,
  description       text,
  subject           text not null,
  html_body         text not null,
  text_body         text not null,
  variables         text[] not null default '{}',        -- merge fields this template references, e.g. {lead.first_name}
  contractor_visible boolean not null default false,      -- contractors may see/use it (vs admin-only)
  is_system         boolean not null default false,       -- seeded HomeQuote default (contractors can't edit these)
  is_active         boolean not null default true,
  created_by        uuid references public.profiles(id) on delete set null,
  updated_by        uuid references public.profiles(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create trigger trg_email_templates_updated_at
  before update on public.email_templates
  for each row execute function public.set_updated_at();
create index idx_email_templates_category on public.email_templates(category);
create index idx_email_templates_active on public.email_templates(is_active);

alter table public.email_templates enable row level security;

-- Admins manage everything. Contractors may only read active, contractor-visible
-- templates -- they can never see or edit internal/admin-only templates, and
-- never edit a system template.
create policy email_templates_select on public.email_templates for select
  using (public.is_admin() or (public.auth_contractor_id() is not null and contractor_visible and is_active));
create policy email_templates_insert on public.email_templates for insert
  with check (public.is_admin());
create policy email_templates_update on public.email_templates for update
  using (public.is_admin()) with check (public.is_admin());
create policy email_templates_delete on public.email_templates for delete
  using (public.is_admin() and not is_system);

-- ---------------------------------------------------------------------------
-- Audit trail for manual sends (workflow sends already log through
-- lead_email_deliveries). Kept separate: manual template sends can target a
-- lead OR a contractor, not just a lead.
-- ---------------------------------------------------------------------------
create table public.email_template_sends (
  id                uuid primary key default gen_random_uuid(),
  template_id       uuid references public.email_templates(id) on delete set null,
  template_key      text not null,
  recipient_type    text not null check (recipient_type in ('lead', 'contractor', 'custom')),
  recipient_id      uuid,
  recipient_email   text not null,
  subject           text not null,
  html_message      text not null,
  status            text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  provider_message_id text,
  error_message     text,
  sent_by           uuid references public.profiles(id) on delete set null,
  sent_at           timestamptz,
  created_at        timestamptz not null default now()
);
create index idx_email_template_sends_template on public.email_template_sends(template_id);
create index idx_email_template_sends_recipient on public.email_template_sends(recipient_type, recipient_id);

alter table public.email_template_sends enable row level security;
create policy email_template_sends_select on public.email_template_sends for select using (public.is_staff());
create policy email_template_sends_insert on public.email_template_sends for insert with check (public.is_staff());
create policy email_template_sends_update on public.email_template_sends for update using (public.is_staff()) with check (public.is_staff());

-- ---------------------------------------------------------------------------
-- Workflow compatibility: send_email steps may reference a saved template
-- instead of inline subject/body. Nullable, additive -- no existing workflow
-- rows change shape.
-- ---------------------------------------------------------------------------
comment on column public.email_templates.key is
  'Referenced from workflow_steps.action_config->>''templateId'' (by id) when a send_email step uses a saved template instead of inline subject/body.';
