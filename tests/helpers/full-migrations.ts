import { readdirSync, readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

/**
 * An isolated, disposable Postgres (PGlite, in-process) with EVERY real migration in supabase/migrations applied in
 * filename order. Only Supabase's platform pieces are stubbed (auth.users/auth.uid, storage tables, the API roles) and
 * the pgcrypto CREATE EXTENSION line is skipped (gen_random_uuid is built in). It never touches a shared database.
 * Set `app.uid` (set_config) to act as a signed-in user.
 */
export async function fullSchema(): Promise<PGlite> {
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
  `);
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.sql')).sort()) {
    const sql = readFileSync(new URL(f, dir), 'utf8').replace(/create extension if not exists ["']?pgcrypto["']?[^;]*;/gi, '');
    try { await db.exec(sql); } catch (e) { throw new Error(`migration ${f} failed: ${(e as Error).message}`); }
  }
  return db;
}
