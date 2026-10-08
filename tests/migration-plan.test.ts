import { readdirSync, readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { describe, expect, it } from 'vitest';
import { nextSteps, planMigrations, sentinelsOf } from '../scripts/staging/migration-plan-lib.mjs';
import { fullSchema } from './helpers/full-migrations';

const dir = new URL('../supabase/migrations/', import.meta.url);
const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort().map((name) => ({ name, sql: readFileSync(new URL(name, dir), 'utf8') }));

const existsOn = (db: PGlite) => async (c: { kind: string; name: string; table?: string }) => {
  const q = (sql: string, p: unknown[]) => db.query(sql, p).then((r) => r.rows.length > 0);
  return c.kind === 'table' ? q(`select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=$1 and c.relkind in ('r','p')`, [c.name])
    : c.kind === 'function' ? q(`select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=$1`, [c.name])
    : c.kind === 'type' ? q(`select 1 from pg_type t join pg_namespace n on n.oid=t.typnamespace where n.nspname='public' and t.typname=$1`, [c.name])
    : q(`select 1 from information_schema.columns where table_schema='public' and table_name=$1 and column_name=$2`, [c.table, c.name]);
};

describe('migration planner', () => {
  it('parses what a migration creates', () => {
    const s = sentinelsOf(`-- create table public.nope(x int);\ncreate table if not exists public.a (id int);\ncreate or replace function public.f() returns int as $$ select 1 $$ language sql;\nalter table public.a add column if not exists b text, add column c int;\ncreate type public.t as enum ('x');`);
    expect([...s.tables]).toEqual(['a']); expect([...s.functions]).toEqual(['f']); expect([...s.types]).toEqual(['t']); expect(s.columns).toEqual([['a', 'b'], ['a', 'c']]);
  });
  it('the real files include BOTH 0041 and 0042 and every file declares something checkable', () => {
    const names = files.map((f) => f.name);
    expect(names).toEqual(expect.arrayContaining(['0040_signing_templates_reminders_codes.sql', '0041_visual_workflow_builder.sql', '0042_meta_ads_analytics_outcomes.sql']));
    // Policy/trigger-only migrations create nothing detectable; this list must not grow silently.
    const undetectable = files.filter((f) => !Object.values(sentinelsOf(f.sql)).some((v) => (v as { size?: number; length?: number }).size || (v as { length?: number }).length)).map((f) => f.name);
    expect(undetectable).toEqual(['0022_restore_contractor_activity_visibility.sql', '0027_email_templates_call_workspace.sql', '0033_workflow_send_push.sql']);
  });
  it('FRESH database: every migration is missing, and the plan is ALL of them in order', async () => {
    const db = new PGlite();
    await db.exec(`create role anon; create role authenticated; create role service_role; create schema auth; create table auth.users(id uuid primary key);`);
    const rows = await planMigrations(files, existsOn(db));
    expect(new Set(rows.map((r: { status: string }) => r.status))).toEqual(new Set(['missing', 'unknown']));
    const plan = nextSteps(rows);
    expect(plan.ok).toBe(true); expect(plan.pending).toEqual(files.map((f) => f.name)); // the WHOLE chain, 0001 through 0042
    await db.close();
  }, 60_000);
  it('FULLY migrated database (0001-0042 applied for real): everything is applied', async () => {
    const db = await fullSchema();
    const rows = await planMigrations(files, existsOn(db));
    expect(rows.filter((r: { status: string }) => r.status !== 'applied' && r.status !== 'unknown')).toEqual([]);
    expect(nextSteps(rows)).toMatchObject({ ok: true, pending: [] });
    await db.close();
  }, 120_000);
  it('EXISTING staging that stops at 0040: plan = 0041 then 0042, in that order', async () => {
    const db = new PGlite();
    await db.exec(`create role anon; create role authenticated; create role service_role; create role supabase_admin; create schema auth; create schema storage; create schema extensions;
      create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}', encrypted_password text);
      create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
      create function auth.role() returns text language sql stable as $$ select 'authenticated' $$;
      create function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$;
      create table storage.buckets (id text primary key, name text, public boolean default false, file_size_limit bigint, allowed_mime_types text[]);
      create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid, metadata jsonb);
      create function storage.foldername(name text) returns text[] language sql as $$ select string_to_array(name,'/') $$;
      grant usage on schema auth, storage to anon, authenticated, service_role; grant execute on all functions in schema auth to anon, authenticated, service_role;`);
    for (const f of files.filter((x) => x.name < '0041')) await db.exec(f.sql.replace(/create extension if not exists ["']?pgcrypto["']?[^;]*;/gi, ''));
    const plan = nextSteps(await planMigrations(files, existsOn(db)));
    expect(plan).toMatchObject({ ok: true, pending: ['0041_visual_workflow_builder.sql', '0042_meta_ads_analytics_outcomes.sql'] });
    await db.close();
  }, 120_000);
  it('flags a half-applied or gapped database instead of guessing', async () => {
    const db = new PGlite();
    await db.exec(`create role anon; create role authenticated; create role service_role; create schema auth; create table auth.users(id uuid primary key); create table public.profiles(id uuid);`);
    const rows = await planMigrations(files, existsOn(db));
    expect(nextSteps(rows).ok).toBe(false); // profiles exists (0001's table) but nothing else of 0001 does -> partial
    await db.close();
  });
});
