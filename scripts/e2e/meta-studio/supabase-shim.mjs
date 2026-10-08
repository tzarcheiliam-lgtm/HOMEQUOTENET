// Local, disposable stand-in for the parts of Supabase the app uses (PostgREST + GoTrue + Storage), backed by an
// in-process Postgres (PGlite) with EVERY real migration applied. It exists so the real Next.js app can be driven in a
// browser without touching any shared database. It is a TEST HARNESS, not a Supabase reimplementation: it supports the
// query features the Meta Ads pages use, rejects what it does not understand (so gaps are loud), and is never run in prod.
//
// Real RLS is exercised: each request runs as role anon/authenticated/service (superuser) with `app.uid` set, and
// auth.uid() in the migrations reads it. Default privileges mimic Supabase's (all on public tables to API roles) BEFORE the
// migrations run, so the explicit revoke/grant lines in 0042/0043 are what actually decide access.
import http from 'node:http';
import { readdirSync, readFileSync } from 'node:fs';
import { randomBytes, randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = (payload) => `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(payload)}.shim-signature`;
const decode = (t) => { try { return JSON.parse(Buffer.from(t.split('.')[1], 'base64url').toString()); } catch { return null; } };

export const TEST_PASSWORD = 'e2e-password';
export const ANON_KEY = jwt({ role: 'anon', iss: 'shim' });
export const SERVICE_KEY = jwt({ role: 'service_role', iss: 'shim' });

export async function startShim({ port = 54321, migrationsDir, log = () => {} } = {}) {
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role; create role supabase_admin;
    create schema auth; create schema storage; create schema extensions;
    create table auth.users (id uuid primary key default gen_random_uuid(), email text unique, raw_user_meta_data jsonb default '{}', encrypted_password text, email_confirmed_at timestamptz default now(), created_at timestamptz default now());
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('app.uid', true), '')::uuid $$;
    create function auth.role() returns text language sql stable as $$ select coalesce(nullif(current_setting('app.role', true), ''), 'anon') $$;
    create function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$;
    create table storage.buckets (id text primary key, name text, public boolean default false, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid, metadata jsonb);
    create function storage.foldername(name text) returns text[] language sql as $$ select string_to_array(name,'/') $$;
    grant usage on schema auth, storage, public to anon, authenticated, service_role;
    grant execute on all functions in schema auth to anon, authenticated, service_role;
    -- Supabase grants API roles everything on new public objects by default; mimic that BEFORE migrations run.
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
    alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
  `);
  for (const f of readdirSync(migrationsDir).filter((x) => x.endsWith('.sql')).sort()) {
    const sql = readFileSync(`${migrationsDir}/${f}`, 'utf8').replace(/create extension if not exists ["']?pgcrypto["']?[^;]*;/gi, '');
    try { await db.exec(sql); } catch (e) { throw new Error(`migration ${f} failed: ${e.message}`); }
  }

  // ---- serialise all DB work (PGlite is single-connection) ----------------------------------------------------------
  let chain = Promise.resolve();
  const exclusive = (fn) => { const run = chain.then(fn, fn); chain = run.catch(() => {}); return run; };

  const colTypes = new Map();
  async function typesOf(table) {
    if (!colTypes.has(table)) {
      const { rows } = await db.query(`select column_name, data_type, udt_name from information_schema.columns where table_schema='public' and table_name=$1`, [table]);
      colTypes.set(table, Object.fromEntries(rows.map((r) => [r.column_name, r])));
    }
    return colTypes.get(table);
  }
  const qid = (s) => { if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(s)) throw httpError(400, 'PGRST100', `unsupported identifier ${s}`); return `"${s}"`; };
  const httpError = (status, code, message, details = null) => Object.assign(new Error(message), { status, pg: { code, message, details, hint: null } });

  const encodeParam = (types, col, v) => {
    const t = types[col];
    if (v === null || v === undefined) return null;
    if (t && (t.data_type === 'ARRAY')) return Array.isArray(v) ? `{${v.map((x) => `"${String(x).replace(/(["\\])/g, '\\$1')}"`).join(',')}}` : v;
    if (t && (t.udt_name === 'jsonb' || t.udt_name === 'json')) return JSON.stringify(v);
    if (typeof v === 'object') return JSON.stringify(v);
    return v;
  };

  const unq = (s) => (s.startsWith('"') && s.endsWith('"') ? s.slice(1, -1).replace(/\\(["\\])/g, '$1') : s);
  const splitTop = (s) => { const out = []; let depth = 0, q = false, cur = ''; for (const ch of s) { if (ch === '"') q = !q; if (!q && ch === '(') depth++; if (!q && ch === ')') depth--; if (!q && depth === 0 && ch === ',') { out.push(cur); cur = ''; } else cur += ch; } if (cur) out.push(cur); return out; };

  function condition(col, spec, params) {
    let negate = false; let s = spec;
    if (s.startsWith('not.')) { negate = true; s = s.slice(4); }
    const dot = s.indexOf('.'); const op = s.slice(0, dot); const raw = s.slice(dot + 1);
    const c = qid(col); let sql;
    const p = (v) => { params.push(v); return `$${params.length}`; };
    if (op === 'is') sql = raw === 'null' ? `${c} is null` : raw === 'true' ? `${c} is true` : raw === 'false' ? `${c} is false` : (() => { throw httpError(400, 'PGRST100', `bad is.${raw}`); })();
    else if (op === 'in') { const items = splitTop(raw.replace(/^\(/, '').replace(/\)$/, '')).map(unq); sql = items.length ? `${c} in (${items.map((i) => p(i)).join(',')})` : 'false'; }
    else if (['eq', 'neq', 'gt', 'gte', 'lt', 'lte'].includes(op)) sql = `${c} ${{ eq: '=', neq: '<>', gt: '>', gte: '>=', lt: '<', lte: '<=' }[op]} ${p(unq(raw))}`;
    else if (op === 'like' || op === 'ilike') sql = `${c} ${op} ${p(unq(raw).replace(/\*/g, '%'))}`;
    else throw httpError(400, 'PGRST100', `shim: unsupported filter operator "${op}"`);
    return negate ? `not (${sql})` : sql;
  }
  function orGroup(inner, params) { return '(' + splitTop(inner).map((part) => { const m = /^([A-Za-z_][A-Za-z0-9_]*)\.(.*)$/.exec(part); if (!m) throw httpError(400, 'PGRST100', `shim: unsupported or() part ${part}`); return condition(m[1], m[2], params); }).join(' or ') + ')'; }

  function where(search, params) {
    const reserved = new Set(['select', 'order', 'limit', 'offset', 'on_conflict', 'columns']);
    const parts = [];
    for (const [k, v] of search.entries()) {
      if (reserved.has(k)) continue;
      if (k === 'or') parts.push(orGroup(v.replace(/^\(/, '').replace(/\)$/, ''), params));
      else if (k === 'and') throw httpError(400, 'PGRST100', 'shim: and() unsupported');
      else parts.push(condition(k, v, params));
    }
    return parts.length ? ` where ${parts.join(' and ')}` : '';
  }
  // Foreign-key embedding (PostgREST "rel(cols)" / "rel(count)"), one level deep, single-column FKs.
  const fkCache = new Map();
  async function fkBetween(table, rel) {
    const key = `${table}>${rel}`;
    if (fkCache.has(key)) return fkCache.get(key);
    const q = (child, parent) => db.query(
      `select a.attname as col, af.attname as refcol from pg_constraint c
         join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
         join pg_attribute af on af.attrelid = c.confrelid and af.attnum = c.confkey[1]
        where c.contype = 'f' and array_length(c.conkey, 1) = 1 and c.conrelid = ('public.' || $1)::regclass and c.confrelid = ('public.' || $2)::regclass limit 1`, [child, parent]);
    let r = (await q(rel, table)).rows[0];
    let out = r ? { dir: 'many', col: r.col, refcol: r.refcol } : null;
    if (!out) { r = (await q(table, rel)).rows[0]; out = r ? { dir: 'one', col: r.col, refcol: r.refcol } : null; }
    fkCache.set(key, out);
    return out;
  }
  async function selectList(table, sel) {
    if (!sel || sel === '*') return '*';
    const out = [];
    for (let c of splitTop(sel)) {
      c = c.trim();
      const m = /^([A-Za-z_][A-Za-z0-9_]*)\(([\s\S]*)\)$/.exec(c);
      if (!m) {
        if (c === '*') { out.push('"_t".*'); continue; }
        if (c.includes(':') && !c.includes('::')) throw httpError(400, 'PGRST100', 'shim: aliases unsupported');
        out.push(qid(c.split('::')[0])); continue;
      }
      const [, rel, inner] = m;
      if (inner.includes('(')) throw httpError(400, 'PGRST200', `shim: nested embedding unsupported (${c})`);
      const fk = await fkBetween(table, rel);
      if (!fk) throw httpError(400, 'PGRST200', `shim: no foreign key between ${table} and ${rel}`);
      const cols = inner.trim() === '*' ? null : splitTop(inner).map((x) => x.trim());
      const obj = cols ? `jsonb_build_object(${cols.map((x) => `'${x}', "r".${qid(x)}`).join(', ')})` : 'to_jsonb("r")';
      if (fk.dir === 'many') {
        const cond = `"r".${qid(fk.col)} = "_t".${qid(fk.refcol)}`;
        out.push(inner.trim() === 'count'
          ? `(select jsonb_build_array(jsonb_build_object('count', count(*))) from ${qid(rel)} "r" where ${cond}) as ${qid(rel)}`
          : `(select coalesce(jsonb_agg(${obj}), '[]'::jsonb) from ${qid(rel)} "r" where ${cond}) as ${qid(rel)}`);
      } else {
        out.push(`(select ${obj} from ${qid(rel)} "r" where "r".${qid(fk.refcol)} = "_t".${qid(fk.col)} limit 1) as ${qid(rel)}`);
      }
    }
    return out.join(', ');
  }
  function orderBy(search) {
    const o = search.get('order'); if (!o) return '';
    return ' order by ' + o.split(',').map((term) => { const [col, ...mods] = term.split('.'); return `${qid(col)} ${mods.includes('desc') ? 'desc' : 'asc'}${mods.includes('nullsfirst') ? ' nulls first' : mods.includes('nullslast') ? ' nulls last' : ''}`; }).join(', ');
  }

  async function asRole(ctx, fn) {
    return exclusive(async () => {
      try {
        await db.exec('begin');
        if (ctx.role !== 'service_role') await db.exec(`set local role ${ctx.role === 'authenticated' ? 'authenticated' : 'anon'}`);
        await db.query(`select set_config('app.uid', $1, true), set_config('app.role', $2, true)`, [ctx.uid ?? '', ctx.role]);
        const out = await fn();
        await db.exec('commit');
        return out;
      } catch (e) { try { await db.exec('rollback'); } catch { /* ignore */ } throw e; }
    });
  }
  const pgErr = (e) => {
    if (e.pg) return e;
    const code = e.code ?? 'XX000';
    const status = code === '23505' || code === '23503' ? 409 : code === '42501' ? 403 : code === '42P01' ? 404 : 400;
    return Object.assign(e, { status, pg: { code, message: e.message, details: e.detail ?? null, hint: e.hint ?? null } });
  };

  async function rest(req, url, ctx, bodyText) {
    const table = url.pathname.replace('/rest/v1/', '').split('/')[0];
    const search = url.searchParams;
    const prefer = String(req.headers.prefer ?? '');
    const wantsRows = prefer.includes('return=representation');
    const wantsObject = String(req.headers.accept ?? '').includes('application/vnd.pgrst.object+json');
    const wantsCount = /count=(exact|planned|estimated)/.test(prefer);

    if (url.pathname.startsWith('/rest/v1/rpc/')) {
      const fn = url.pathname.replace('/rest/v1/rpc/', '');
      const args = bodyText ? JSON.parse(bodyText) : {};
      const keys = Object.keys(args);
      const rows = await asRole(ctx, async () => {
        const sql = `select to_jsonb(r) as j, r from ${qid(fn)}(${keys.map((k, i) => `${qid(k)} => $${i + 1}`).join(', ')}) r`;
        try { return (await db.query(`select * from (${sql}) z`, keys.map((k) => (typeof args[k] === 'object' && args[k] !== null ? JSON.stringify(args[k]) : args[k])))).rows; }
        catch (e) { if (/does not return|record|composite/i.test(e.message)) return (await db.query(`select ${qid(fn)}(${keys.map((k, i) => `${qid(k)} => $${i + 1}`).join(', ')}) as j`, keys.map((k) => args[k]))).rows; throw e; }
      });
      const out = rows.map((r) => r.j);
      return { status: 200, body: out.length === 1 && out[0] && typeof out[0] === 'object' && Object.keys(out[0]).length === 1 && fn in out[0] ? out[0][fn] : out };
    }

    const types = await typesOf(table);
    if (!Object.keys(types).length) throw httpError(404, '42P01', `relation "public.${table}" does not exist`);
    const method = req.method;
    return asRole(ctx, async () => {
      const params = [];
      if (method === 'GET' || method === 'HEAD') {
        const w = where(search, params);
        let total = null;
        if (wantsCount) total = Number((await db.query(`select count(*)::int as n from ${qid(table)}${w}`, params)).rows[0].n);
        let sql = `select ${await selectList(table, search.get('select'))} from ${qid(table)} "_t"${w}${orderBy(search)}`;
        if (search.get('limit')) sql += ` limit ${Number(search.get('limit'))}`;
        if (search.get('offset')) sql += ` offset ${Number(search.get('offset'))}`;
        const rows = method === 'HEAD' ? [] : (await db.query(`select to_jsonb(t) as j from (${sql}) t`, params)).rows.map((r) => r.j);
        return { status: 200, rows, total, object: wantsObject };
      }
      const body = bodyText ? JSON.parse(bodyText) : {};
      if (method === 'POST') {
        const list = Array.isArray(body) ? body : [body];
        const out = [];
        for (const row of list) {
          const cols = Object.keys(row); for (const c of cols) if (!types[c]) throw httpError(400, 'PGRST204', `Could not find the '${c}' column of '${table}' in the schema cache`);
          const ps = cols.map((c) => encodeParam(types, c, row[c]));
          let sql = cols.length ? `insert into ${qid(table)} (${cols.map(qid).join(',')}) values (${cols.map((_, i) => `$${i + 1}`).join(',')})` : `insert into ${qid(table)} default values`;
          const oc = search.get('on_conflict');
          if (oc) { const target = oc.split(',').map(qid).join(','); sql += prefer.includes('ignore-duplicates') ? ` on conflict (${target}) do nothing` : ` on conflict (${target}) do update set ${cols.map((c) => `${qid(c)} = excluded.${qid(c)}`).join(', ')}`; }
          else if (prefer.includes('ignore-duplicates')) sql += ' on conflict do nothing';
          sql += ' returning to_jsonb(' + qid(table) + '.*) as j';
          const r = await db.query(sql, ps); out.push(...r.rows.map((x) => x.j));
        }
        return { status: 201, rows: wantsRows ? out : null, object: wantsObject };
      }
      if (method === 'PATCH') {
        const cols = Object.keys(body); for (const c of cols) if (!types[c]) throw httpError(400, 'PGRST204', `Could not find the '${c}' column of '${table}' in the schema cache`);
        const ps = cols.map((c) => encodeParam(types, c, body[c])); params.push(...ps);
        const w = where(search, params);
        const set = cols.map((c, i) => `${qid(c)} = $${i + 1}`).join(', ');
        const r = await db.query(`update ${qid(table)} set ${set}${w} returning to_jsonb(${qid(table)}.*) as j`, params);
        return { status: 200, rows: wantsRows ? r.rows.map((x) => x.j) : null, object: wantsObject };
      }
      if (method === 'DELETE') {
        const w = where(search, params);
        const r = await db.query(`delete from ${qid(table)}${w} returning to_jsonb(${qid(table)}.*) as j`, params);
        return { status: 200, rows: wantsRows ? r.rows.map((x) => x.j) : null, object: wantsObject };
      }
      throw httpError(405, 'PGRST000', `method ${method} unsupported`);
    });
  }

  // ---- GoTrue -----------------------------------------------------------------------------------------------------------------
  const refreshTokens = new Map();
  async function sessionFor(userId) {
    const { rows } = await db.query(`select id, email, raw_user_meta_data from auth.users where id=$1`, [userId]);
    const u = rows[0]; if (!u) return null;
    const now = Math.floor(Date.now() / 1000), exp = now + 3600 * 24;
    const access = jwt({ sub: u.id, role: 'authenticated', aud: 'authenticated', email: u.email, exp, iat: now });
    const refresh = randomBytes(12).toString('hex'); refreshTokens.set(refresh, u.id);
    return { access_token: access, token_type: 'bearer', expires_in: exp - now, expires_at: exp, refresh_token: refresh, user: { id: u.id, aud: 'authenticated', role: 'authenticated', email: u.email, email_confirmed_at: new Date().toISOString(), app_metadata: {}, user_metadata: u.raw_user_meta_data ?? {}, created_at: new Date().toISOString() } };
  }
  async function auth(req, url, bodyText) {
    const path = url.pathname.replace('/auth/v1', '');
    if (path === '/token') {
      const body = bodyText ? JSON.parse(bodyText) : {};
      const grant = url.searchParams.get('grant_type');
      if (grant === 'password') {
        const { rows } = await db.query(`select id from auth.users where lower(email)=lower($1)`, [body.email ?? '']);
        if (!rows[0] || body.password !== TEST_PASSWORD) return { status: 400, body: { code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials', error: 'invalid_grant', error_description: 'Invalid login credentials' } };
        return { status: 200, body: await sessionFor(rows[0].id) };
      }
      if (grant === 'refresh_token') {
        const uid = refreshTokens.get(body.refresh_token);
        if (!uid) return { status: 400, body: { code: 400, error_code: 'refresh_token_not_found', msg: 'Invalid Refresh Token', error: 'invalid_grant' } };
        return { status: 200, body: await sessionFor(uid) };
      }
    }
    if (path === '/user') {
      const t = String(req.headers.authorization ?? '').replace(/^Bearer /i, ''); const p = decode(t);
      if (!p?.sub || p.role !== 'authenticated') return { status: 401, body: { code: 401, error_code: 'bad_jwt', msg: 'invalid JWT' } };
      const s = await sessionFor(p.sub); return s ? { status: 200, body: s.user } : { status: 401, body: { code: 401, msg: 'user not found' } };
    }
    if (path === '/logout') return { status: 204, body: null };
    return { status: 404, body: { msg: `shim: unsupported auth route ${path}` } };
  }

  // ---- Storage ----------------------------------------------------------------------------------------------------------------
  const objects = new Map(); const tokens = new Map();
  const mime = (name) => (name.endsWith('.png') ? 'image/png' : name.endsWith('.jpg') ? 'image/jpeg' : name.endsWith('.mp4') ? 'video/mp4' : 'application/octet-stream');
  async function storage(req, url, ctx, buf) {
    const path = url.pathname.replace('/storage/v1', '');
    const isService = ctx.role === 'service_role';
    let m;
    if ((m = /^\/object\/upload\/sign\/([^/]+)\/(.+)$/.exec(path)) && req.method === 'POST') {
      if (!isService) return { status: 403, body: { error: 'forbidden', message: 'service role required' } };
      const token = randomBytes(10).toString('hex'); tokens.set(token, { bucket: m[1], name: decodeURIComponent(m[2]), kind: 'upload' });
      return { status: 200, body: { url: `/object/upload/sign/${m[1]}/${m[2]}?token=${token}` } };
    }
    if ((m = /^\/object\/upload\/sign\/([^/]+)\/(.+)$/.exec(path)) && req.method === 'PUT') {
      const t = tokens.get(url.searchParams.get('token') ?? ''); if (!t || t.kind !== 'upload' || t.name !== decodeURIComponent(m[2])) return { status: 401, body: { error: 'invalid token' } };
      const ct = req.headers['content-type'] ?? '';
      let data = buf;
      if (ct.startsWith('multipart/')) { const fd = await new Response(buf, { headers: { 'content-type': ct } }).formData(); const f = [...fd.values()].find((v) => typeof v !== 'string'); data = Buffer.from(await f.arrayBuffer()); }
      objects.set(`${t.bucket}/${t.name}`, { data, type: mime(t.name) });
      return { status: 200, body: { Key: `${t.bucket}/${t.name}` } };
    }
    if ((m = /^\/object\/sign\/([^/]+)\/(.+)$/.exec(path)) && req.method === 'POST') {
      if (!isService) return { status: 403, body: { error: 'forbidden' } };
      const name = decodeURIComponent(m[2]); if (!objects.has(`${m[1]}/${name}`)) return { status: 400, body: { error: 'Object not found', message: 'Object not found', statusCode: '404' } };
      const token = randomBytes(10).toString('hex'); tokens.set(token, { bucket: m[1], name, kind: 'read' });
      return { status: 200, body: { signedURL: `/object/sign/${m[1]}/${m[2]}?token=${token}` } };
    }
    if ((m = /^\/object\/sign\/([^/]+)\/(.+)$/.exec(path)) && (req.method === 'GET' || req.method === 'HEAD')) {
      const t = tokens.get(url.searchParams.get('token') ?? ''); const name = decodeURIComponent(m[2]);
      if (!t || t.kind !== 'read' || t.name !== name) return { status: 401, body: { error: 'invalid token' } };
      return fileResponse(req, objects.get(`${m[1]}/${name}`));
    }
    if ((m = /^\/object\/([^/]+)\/(.+)$/.exec(path)) && req.method === 'GET') {
      if (!isService) return { status: 403, body: { error: 'forbidden' } };
      return fileResponse(req, objects.get(`${m[1]}/${decodeURIComponent(m[2])}`));
    }
    if ((m = /^\/object\/([^/]+)$/.exec(path)) && req.method === 'DELETE') {
      if (!isService) return { status: 403, body: { error: 'forbidden' } };
      const { prefixes } = JSON.parse(buf.toString() || '{}'); const removed = [];
      for (const p of prefixes ?? []) if (objects.delete(`${m[1]}/${p}`)) removed.push({ name: p });
      return { status: 200, body: removed };
    }
    return { status: 404, body: { error: 'not_found', message: `shim: unsupported storage route ${req.method} ${path}` } };
  }
  function fileResponse(req, o) {
    if (!o) return { status: 404, body: { error: 'Object not found' } };
    const range = /^bytes=(\d*)-(\d*)$/.exec(String(req.headers.range ?? ''));
    if (range) {
      const total = o.data.length; let start = range[1] === '' ? Math.max(0, total - Number(range[2])) : Number(range[1]); let end = range[1] === '' ? total - 1 : (range[2] === '' ? total - 1 : Math.min(Number(range[2]), total - 1));
      return { status: 206, raw: o.data.subarray(start, end + 1), headers: { 'content-type': o.type, 'content-range': `bytes ${start}-${end}/${total}`, 'content-length': String(end - start + 1) } };
    }
    return { status: 200, raw: req.method === 'HEAD' ? Buffer.alloc(0) : o.data, headers: { 'content-type': o.type, 'content-length': String(o.data.length) } };
  }

  // ---- HTTP -----------------------------------------------------------------------------------------------------------------------
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,HEAD,OPTIONS', 'access-control-expose-headers': 'content-range,content-length', 'access-control-max-age': '600' };
  const server = http.createServer(async (req, res) => {
    const send = (status, body, headers = {}) => { const text = body === null || body === undefined ? '' : (Buffer.isBuffer(body) ? body : JSON.stringify(body)); res.writeHead(status, { ...cors, ...(Buffer.isBuffer(body) ? {} : { 'content-type': 'application/json' }), ...headers }); res.end(req.method === 'HEAD' ? undefined : text); };
    if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
    const chunks = []; for await (const c of req) chunks.push(c);
    const buf = Buffer.concat(chunks); const bodyText = buf.toString('utf8');
    const url = new URL(req.url, `http://localhost:${port}`);
    try {
      const bearer = String(req.headers.authorization ?? '').replace(/^Bearer /i, '') || String(req.headers.apikey ?? '');
      const p = bearer ? decode(bearer) : null;
      const ctx = { role: p?.role === 'service_role' ? 'service_role' : p?.role === 'authenticated' ? 'authenticated' : 'anon', uid: p?.sub ?? null };
      log(`${req.method} ${url.pathname}${url.search.slice(0, 140)} as ${ctx.role}`);
      if (url.pathname.startsWith('/rest/v1/')) {
        const r = await rest(req, url, ctx, bodyText);
        if (r.rows === null) return send(r.status === 201 ? 201 : 204, null);
        let rows = r.rows ?? r.body;
        if (r.body !== undefined && r.rows === undefined) return send(200, r.body);
        const headers = {}; if (r.total !== null && r.total !== undefined) headers['content-range'] = rows.length ? `0-${rows.length - 1}/${r.total}` : `*/${r.total}`;
        if (r.object) { if (rows.length !== 1) return send(406, { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned', details: `The result contains ${rows.length} rows`, hint: null }, headers); return send(r.status, rows[0], headers); }
        return send(r.status, rows, headers);
      }
      if (url.pathname.startsWith('/auth/v1/')) { const r = await auth(req, url, bodyText); return send(r.status, r.body); }
      if (url.pathname.startsWith('/storage/v1/')) { const r = await storage(req, url, ctx, buf); return r.raw !== undefined ? send(r.status, r.raw, r.headers) : send(r.status, r.body); }
      if (url.pathname === '/__health') return send(200, { ok: true });
      if (url.pathname === '/__sql' && req.method === 'POST') { const { sql, params } = JSON.parse(bodyText); const out = await exclusive(() => db.query(sql, params ?? [])); return send(200, out.rows); }
      return send(404, { message: `shim: unsupported route ${url.pathname}` });
    } catch (e) {
      const err = pgErr(e);
      log(`  !! ${err.pg.code} ${err.pg.message}`);
      send(err.status ?? 400, err.pg);
    }
  });
  await new Promise((r) => server.listen(port, '127.0.0.1', r));
  return {
    url: `http://localhost:${port}`, db, objects,
    sql: (sql, params) => exclusive(() => db.query(sql, params ?? [])).then((r) => r.rows),
    async createUser({ email, fullName, role = 'admin', contractorId = null, contractorRole = null }) {
      const id = randomUUID();
      await exclusive(async () => {
        await db.query(`insert into auth.users (id, email, raw_user_meta_data) values ($1,$2,$3)`, [id, email, JSON.stringify({ full_name: fullName })]);
        await db.query(`insert into public.profiles (id, email, full_name, role, account_status, contractor_id) values ($1,$2,$3,$4,'active',$5) on conflict (id) do update set role=excluded.role, account_status='active', contractor_id=excluded.contractor_id, full_name=excluded.full_name`, [id, email, fullName, role, contractorId]);
        if (contractorRole) await db.query(`update public.profiles set contractor_role=$2 where id=$1`, [id, contractorRole]).catch(() => {});
      });
      return id;
    },
    close: () => new Promise((r) => server.close(() => db.close().then(r, r))),
  };
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` || process.argv[1]?.endsWith('supabase-shim.mjs')) {
  const dir = new URL('../../../supabase/migrations', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
  const s = await startShim({ migrationsDir: dir, log: (m) => console.log(m) });
  console.log('shim up at', s.url);
}
