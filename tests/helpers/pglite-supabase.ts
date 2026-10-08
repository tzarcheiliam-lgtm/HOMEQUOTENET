/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * A tiny supabase-js look-alike backed by PGlite + an in-memory storage bucket, so the real service layer
 * (lib/signing/*) can run end to end in tests against the real migration SQL. Supports exactly the query
 * shapes the signing code uses: select/insert/update/delete with eq/in/is/order/limit, single/maybeSingle,
 * head counts, rpc() with named args, and storage download/upload/signed URLs.
 */
import type { PGlite } from '@electric-sql/pglite';

type Filter = { col: string; op: 'eq' | 'in' | 'is' | 'ilike' | 'neq' | 'gte' | 'lte' | 'lt' | 'gt' | 'notin' | 'or' | 'contains'; val: unknown };
/** RPCs that return a table (called with `select * from fn(...)`). */
const SET_RETURNING = new Set(['signing_claim_auto_reminders', 'claim_workflow_runs', 'claim_workflow_events', 'claim_ai_call_jobs']);
/** Columns that are jsonb arrays (an empty or all-string array would otherwise be sent as text[]). */
const JSONB_ARRAY_COLUMNS = new Set(['sections', 'signers', 'signer_roles']);
const ident = (s: string) => `"${s.replace(/"/g, '""')}"`;

class Builder {
  private filters: Filter[] = [];
  private _order: { col: string; asc: boolean }[] = [];
  private _limit: number | null = null;
  private _single: 'single' | 'maybe' | null = null;
  private _cols = '*';
  private _count = false;
  private _head = false;
  private op: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private payload: any = null;
  private _returning = false;
  private _upsert: { onConflict?: string; ignoreDuplicates?: boolean } | null = null;
  constructor(private db: PGlite, private table: string) {}
  select(cols = '*', opts?: { count?: string; head?: boolean }) { if (this.op === 'select') this._cols = cols; else { this._returning = true; this._cols = cols; } this._count = !!opts?.count; this._head = !!opts?.head; return this; }
  insert(p: any) { this.op = 'insert'; this.payload = p; return this; }
  update(p: any) { this.op = 'update'; this.payload = p; return this; }
  upsert(p: any, o?: { onConflict?: string; ignoreDuplicates?: boolean }) { this.op = 'insert'; this.payload = p; this._upsert = o ?? {}; return this; }
  delete() { this.op = 'delete'; return this; }
  eq(col: string, val: unknown) { this.filters.push({ col, op: 'eq', val }); return this; }
  in(col: string, val: unknown[]) { this.filters.push({ col, op: 'in', val }); return this; }
  is(col: string, val: unknown) { this.filters.push({ col, op: 'is', val }); return this; }
  ilike(col: string, val: string) { this.filters.push({ col, op: 'ilike', val }); return this; }
  contains(col: string, val: unknown) { this.filters.push({ col, op: 'contains', val }); return this; }
  neq(col: string, val: unknown) { this.filters.push({ col, op: 'neq', val }); return this; }
  gte(col: string, val: unknown) { this.filters.push({ col, op: 'gte', val }); return this; }
  lte(col: string, val: unknown) { this.filters.push({ col, op: 'lte', val }); return this; }
  lt(col: string, val: unknown) { this.filters.push({ col, op: 'lt', val }); return this; }
  gt(col: string, val: unknown) { this.filters.push({ col, op: 'gt', val }); return this; }
  not(col: string, op: string, val: unknown) { if (op === 'in') this.filters.push({ col, op: 'notin', val: String(val).replace(/^\(|\)$/g, '').split(',') }); return this; }
  or(expr: string) { this.filters.push({ col: '', op: 'or', val: expr }); return this; }
  order(col: string, o?: { ascending?: boolean }) { this._order.push({ col, asc: o?.ascending !== false }); return this; }
  limit(n: number) { this._limit = n; return this; }
  single() { this._single = 'single'; return this; }
  maybeSingle() { this._single = 'maybe'; return this; }
  private where(params: unknown[]) {
    if (!this.filters.length) return '';
    return ' where ' + this.filters.map((f) => {
      if (f.op === 'is') return `${ident(f.col)} is ${f.val === null ? 'null' : String(f.val)}`;
      if (f.op === 'contains') { params.push(f.val); return `${ident(f.col)} @> $${params.length}`; }
      if (f.op === 'neq') { params.push(f.val); return `${ident(f.col)} is distinct from $${params.length}`; }
      if (f.op === 'gte' || f.op === 'lte' || f.op === 'lt' || f.op === 'gt') { params.push(f.val); return `${ident(f.col)} ${{ gte: '>=', lte: '<=', lt: '<', gt: '>' }[f.op]} $${params.length}`; }
      if (f.op === 'notin') { const arr = f.val as unknown[]; return `${ident(f.col)} not in (${arr.map((v) => { params.push(v); return `$${params.length}`; }).join(',')})`; }
      if (f.op === 'or') {
        // Supports the `col.is.null,col.neq.value,col.eq.value` shapes used by the app.
        const parts = String(f.val).split(',').map((term) => {
          const [col, op, ...rest] = term.split('.'); const v = rest.join('.');
          if (op === 'is') return `${ident(col)} is ${v}`;
          if (op === 'not' && rest[0] === 'is') return `${ident(col)} is not ${rest.slice(1).join('.')}`; // col.not.is.null
          params.push(v);
          return `${ident(col)} ${op === 'neq' ? 'is distinct from' : '='} $${params.length}`;
        });
        return `(${parts.join(' or ')})`;
      }
      if (f.op === 'ilike') { params.push(f.val); return `${ident(f.col)} ilike $${params.length}`; }
      if (f.op === 'in') { const arr = f.val as unknown[]; if (!arr.length) return 'false'; return `${ident(f.col)} in (${arr.map((v) => { params.push(v); return `$${params.length}`; }).join(',')})`; }
      params.push(f.val); return `${ident(f.col)} = $${params.length}`;
    }).join(' and ');
  }
  private val(params: unknown[], v: unknown, col?: string) {
    if (col && JSONB_ARRAY_COLUMNS.has(col) && Array.isArray(v)) { params.push(JSON.stringify(v)); return `$${params.length}::jsonb`; }
    if (v instanceof Date) { params.push(v.toISOString()); return `$${params.length}`; }
    if (Array.isArray(v) && v.every((x) => typeof x === 'string')) { params.push(v); return `$${params.length}`; } // text[] / uuid[] columns
    if (v !== null && typeof v === 'object') { params.push(JSON.stringify(v)); return `$${params.length}::jsonb`; }
    params.push(v); return `$${params.length}`;
  }
  async run(): Promise<{ data: any; error: { message: string; code?: string } | null; count?: number }> {
    try {
      const params: unknown[] = [];
      let sql: string;
      if (this.op === 'insert') {
        const rows = Array.isArray(this.payload) ? this.payload : [this.payload];
        const cols = Object.keys(rows[0]);
        sql = `insert into ${ident(this.table)} (${cols.map(ident).join(',')}) values ${rows.map((r: any) => `(${cols.map((c) => this.val(params, r[c], c)).join(',')})`).join(',')}`;
        if (this._upsert) {
          const target = this._upsert.onConflict ? `(${this._upsert.onConflict.split(',').map((c) => ident(c.trim())).join(',')})` : '';
          sql += this._upsert.ignoreDuplicates ? ` on conflict ${target} do nothing` : ` on conflict ${target} do update set ${cols.map((c) => `${ident(c)} = excluded.${ident(c)}`).join(',')}`;
        }
      } else if (this.op === 'update') {
        const cols = Object.keys(this.payload);
        sql = `update ${ident(this.table)} set ${cols.map((c) => `${ident(c)} = ${this.val(params, this.payload[c], c)}`).join(',')}${this.where(params)}`;
      } else if (this.op === 'delete') {
        sql = `delete from ${ident(this.table)}${this.where(params)}`;
      } else {
        const cols = this._cols === '*' ? '*' : this._cols.split(',').map((c) => ident(c.trim())).join(',');
        sql = `select ${this._head ? 'count(*)::int as n' : cols} from ${ident(this.table)}${this.where(params)}`;
        if (!this._head) {
          if (this._order.length) sql += ' order by ' + this._order.map((o) => `${ident(o.col)} ${o.asc ? 'asc' : 'desc'}`).join(',');
          if (this._limit !== null) sql += ` limit ${this._limit}`;
        }
      }
      if (this.op !== 'select' && this._returning) sql += ' returning ' + (this._cols === '*' ? '*' : this._cols.split(',').map((c) => ident(c.trim())).join(','));
      const res = await this.db.query<any>(sql, params);
      // PostgREST returns timestamps as ISO strings, never Date objects.
      for (const row of res.rows) for (const k of Object.keys(row)) if (row[k] instanceof Date) row[k] = Number.isFinite((row[k] as Date).getTime()) ? (row[k] as Date).toISOString() : 'infinity';
      if (this.op !== 'select' && !this._returning) return { data: null, error: null };
      if (this._head) return { data: null, error: null, count: res.rows[0].n };
      if (this._single === 'single') return res.rows.length === 1 ? { data: res.rows[0], error: null } : { data: null, error: { message: `expected 1 row, got ${res.rows.length}` } };
      if (this._single === 'maybe') return { data: res.rows[0] ?? null, error: null };
      return { data: res.rows, error: null };
    } catch (e) {
      return { data: null, error: { message: (e as Error).message, code: (e as { code?: string }).code } };
    }
  }
  then(resolve: (v: any) => unknown, reject?: (e: unknown) => unknown) { return this.run().then(resolve, reject); }
}

export class FakeStorage {
  files = new Map<string, Uint8Array>();
  from(_bucket: string) {
    return {
      download: async (path: string) => { const f = this.files.get(path); return f ? { data: new Blob([f.slice().buffer as ArrayBuffer]), error: null } : { data: null, error: { message: 'not found' } }; },
      upload: async (path: string, bytes: Uint8Array, o?: { upsert?: boolean }) => { if (this.files.has(path) && !o?.upsert) return { error: { message: 'exists' } }; this.files.set(path, new Uint8Array(bytes)); return { error: null }; },
      createSignedUrl: async (path: string) => (this.files.has(path) ? { data: { signedUrl: `https://storage.test/signed/${encodeURIComponent(path)}?t=1` }, error: null } : { data: null, error: { message: 'not found' } }),
      createSignedUploadUrl: async (path: string) => ({ data: { signedUrl: `https://storage.test/upload/${path}`, token: 'upload-token', path }, error: null }),
      remove: async (paths: string[]) => { for (const p of paths) this.files.delete(p); return { error: null }; },
      copy: async (from: string, to: string) => { const f = this.files.get(from); if (!f) return { error: { message: 'not found' } }; this.files.set(to, new Uint8Array(f)); return { error: null }; },
    };
  }
}

export function fakeSupabase(db: PGlite, storage = new FakeStorage()) {
  return {
    storage,
    from: (table: string) => new Builder(db, table),
    rpc: async (fn: string, args: Record<string, unknown> = {}) => {
      try {
        const params: unknown[] = [];
        const named = Object.entries(args).map(([k, v]) => {
          if (Array.isArray(v) && v.every((x) => typeof x === 'string')) { params.push(v); return `${k} := $${params.length}`; }
          if (v !== null && typeof v === 'object') { params.push(JSON.stringify(v)); return `${k} := $${params.length}::jsonb`; }
          params.push(v); return `${k} := $${params.length}`;
        });
        if (SET_RETURNING.has(fn)) {
          const rows = await db.query<any>(`select * from ${fn}(${named.join(', ')})`, params);
          for (const row of rows.rows) for (const k of Object.keys(row)) if (row[k] instanceof Date) row[k] = Number.isFinite((row[k] as Date).getTime()) ? (row[k] as Date).toISOString() : 'infinity';
          return { data: rows.rows, error: null };
        }
        const res = await db.query<any>(`select ${fn}(${named.join(', ')}) as r`, params);
        return { data: res.rows[0]?.r ?? null, error: null };
      } catch (e) { return { data: null, error: { message: (e as Error).message } }; }
    },
  };
}
