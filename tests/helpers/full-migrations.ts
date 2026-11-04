import { readdirSync, readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

/**
 * An isolated, disposable Postgres (PGlite, in-process) with EVERY real migration in supabase/migrations applied in
 * filename order. Only Supabase's platform pieces are stubbed (auth.users/auth.uid, storage tables, the API roles,
 * cron / net / vault for the scheduler) and the pgcrypto / pg_net / pg_cron CREATE EXTENSION lines are skipped
 * (gen_random_uuid is built in; the others are stubbed). It never touches a shared database.
 * Set `app.uid` (set_config) to act as a signed-in user.
 */
export async function fullSchema(opts: { supabaseGrants?: boolean } = {}): Promise<PGlite> {
  const dir = new URL('../../supabase/migrations/', import.meta.url);
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role; create role supabase_admin;
    create schema auth; create schema storage; create schema extensions;
    create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}', encrypted_password text);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('app.uid', true), '')::uuid $$;
    create function auth.role() returns text language sql stable as $$ select 'authenticated' $$;
    create function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$;
    create table storage.buckets (id text primary key, name text, public boolean default false, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid, metadata jsonb);
    create function storage.foldername(name text) returns text[] language sql as $$ select string_to_array(name,'/') $$;
    grant usage on schema auth, storage to anon, authenticated, service_role;
    grant execute on all functions in schema auth to anon, authenticated, service_role;
    -- Supabase Cron (pg_cron), pg_net and Vault are platform extensions PGlite doesn't ship (migration 0074).
    -- Stubs with the same call shapes: cron.schedule upserts by name, net.http_post records the request.
    create schema cron; create schema net; create schema vault;
    create table cron.job (jobid bigserial primary key, jobname text unique, schedule text not null, command text not null, active boolean not null default true);
    create table cron.job_run_details (jobid bigint, start_time timestamptz, end_time timestamptz);
    create function cron.schedule(job_name text, schedule text, command text) returns bigint language sql as $$
      insert into cron.job (jobname, schedule, command) values (job_name, schedule, command)
      on conflict (jobname) do update set schedule = excluded.schedule, command = excluded.command returning jobid $$;
    create table net.http_request_queue (id bigserial primary key, method text, url text, headers jsonb, body jsonb, timeout_milliseconds int);
    create table net._http_response (id bigint, status_code int, content_type text, headers jsonb, content text, timed_out boolean, error_msg text, created timestamptz not null default now());
    create function net.http_post(url text, body jsonb default '{}'::jsonb, params jsonb default '{}'::jsonb,
      headers jsonb default '{"Content-Type": "application/json"}'::jsonb, timeout_milliseconds int default 2000) returns bigint language sql as $$
      insert into net.http_request_queue (method, url, headers, body, timeout_milliseconds) values ('POST', url, headers, body, timeout_milliseconds) returning id $$;
    create table vault.secrets (name text primary key, secret text not null);
    create view vault.decrypted_secrets as select name, secret as decrypted_secret from vault.secrets;
  `);
  // Real Supabase grants new public tables to the API roles by default; RLS then decides. Opt in to mimic that.
  if (opts.supabaseGrants) {
    await db.exec(`alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
      alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
      alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;`);
  }
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.sql')).sort()) {
    const sql = readFileSync(new URL(f, dir), 'utf8').replace(/create extension if not exists ["']?(pgcrypto|pg_net|pg_cron)["']?[^;]*;/gi, '');
    try { await db.exec(sql); } catch (e) { throw new Error(`migration ${f} failed: ${(e as Error).message}`); }
  }
  return db;
}
