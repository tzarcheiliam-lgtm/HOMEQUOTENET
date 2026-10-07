/** Minimal stand-ins for the tables the workflow migrations depend on (shared by the PGlite suites). */
export const BASE_DDL = `
    create role anon; create role authenticated; create role service_role;
    create schema if not exists auth;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
    create function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
    create type public.lead_status as enum ('new','contact_attempted','qualified','assigned','appointment_set','appointment_completed','estimate_sent','sold','lost','cancelled');
    create type public.assignment_status as enum ('assigned','accepted','contacted','no_answer','qualified','appointment_set','appointment_held','estimate_given','sold','lost','not_qualified','returned');
    create table public.profiles (id uuid primary key default gen_random_uuid(), role text, is_active boolean default true, contractor_id uuid, contractor_role text, full_name text, email text);
    create table public.contractors (id uuid primary key default gen_random_uuid(), name text);
    create function public.is_admin() returns boolean language sql stable security definer as $$ select exists (select 1 from public.profiles where id = auth.uid() and is_active and role = 'admin') $$;
    create function public.auth_contractor_id() returns uuid language sql stable security definer as $$ select contractor_id from public.profiles where id = auth.uid() and is_active and role = 'contractor' $$;
    create table public.verticals (id uuid primary key default gen_random_uuid(), name text);
    create table public.sub_services (id uuid primary key default gen_random_uuid(), name text);
    create table public.leads (id uuid primary key default gen_random_uuid(), first_name text, last_name text, email text, phone_e164 text, state text, zip text, city text,
      consent_granted boolean default false, consent_at timestamptz, consent_source text, consent_disclosure text, archived_at timestamptz, project_description text,
      status public.lead_status default 'new', qualification_status text default 'needs_qualification', source text, vertical_id uuid, sub_service_id uuid,
      created_by uuid, created_at timestamptz default now(), updated_at timestamptz default now(), last_contact_date timestamptz);
    create table public.lead_assignments (id uuid primary key default gen_random_uuid(), lead_id uuid references leads(id), contractor_id uuid references contractors(id),
      status public.assignment_status default 'assigned', assigned_by uuid, assigned_at timestamptz default now(), updated_at timestamptz default now(), assigned_user_id uuid, unique(lead_id, contractor_id));
    create table public.appointments (id uuid primary key default gen_random_uuid(), assignment_id uuid references lead_assignments(id), scheduled_at timestamptz,
      status text default 'scheduled', location text, notes text, created_by uuid, created_at timestamptz default now(), updated_at timestamptz default now());
    create table public.estimates (id uuid primary key default gen_random_uuid(), assignment_id uuid references lead_assignments(id), amount numeric, status text default 'pending',
      created_by uuid, created_at timestamptz default now(), updated_at timestamptz default now());
    create table public.sales (id uuid primary key default gen_random_uuid(), assignment_id uuid, sale_status text, amount numeric, updated_at timestamptz default now());
    create table public.funnels (id uuid primary key default gen_random_uuid(), slug text, contractor_id uuid);
    create table public.funnel_sessions (id uuid primary key default gen_random_uuid(), funnel_id uuid, lead_id uuid);
    create table public.funnel_bookings (id uuid primary key default gen_random_uuid(), session_id uuid, appointment_id uuid, provider text, external_id text, scheduled_at timestamptz);
    create table public.lead_email_deliveries (id uuid primary key default gen_random_uuid(), lead_id uuid, kind text, recipient_email text, subject text, status text default 'pending', provider_message_id text);
    create table public.lead_activities (id uuid primary key default gen_random_uuid(), lead_id uuid, actor_id uuid, type text default 'note', body text, metadata jsonb default '{}', created_at timestamptz default now());
    create table public.contractor_prospects (id uuid primary key default gen_random_uuid(), phone_e164 text, disposition text, do_not_call_at timestamptz);
    create table public.email_templates (id uuid primary key default gen_random_uuid(), subject text, html_body text, text_body text, is_active boolean default true, contractor_visible boolean default true);
`;

export const MIGRATIONS_BEFORE_0041 = ['0020_workflow_automation_foundation.sql', '0024_workflow_runtime.sql', '0037_ai_call_events.sql', '0038_ai_calling_queue.sql'];
