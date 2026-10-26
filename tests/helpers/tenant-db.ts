/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PGlite } from '@electric-sql/pglite';
import { fakeSupabase } from './pglite-supabase';

/**
 * A supabase-js stand-in over PGlite that also understands the one nested filter the assistant uses to pin a contractor to
 * their own company: select('..., lead_assignments!inner(contractor_id)') + eq('lead_assignments.contractor_id', company).
 * It resolves that filter against the REAL lead_assignments rows, so a lead outside the company is genuinely not returned.
 */
export function tenantDb(pg: PGlite) {
  const real = fakeSupabase(pg);
  return {
    ...real,
    from(table: string) {
      if (table !== 'leads') return real.from(table);
      const ops: [string, any[]][] = [];
      let tenant: string | null = null;
      const build = async () => {
        const b: any = real.from('leads');
        for (const [m, a] of ops) b[m](...a);
        if (tenant) {
          const ids = (await pg.query<any>(`select lead_id from public.lead_assignments where contractor_id=$1`, [tenant])).rows.map((r) => r.lead_id);
          b.in('id', ids);
        }
        return { b }; // wrapped: the builder is thenable, so awaiting it directly would run the query
      };
      const proxy: any = new Proxy({}, {
        get(_t, prop: string) {
          if (prop === 'select') return (cols: string, o?: any) => { ops.push(['select', [String(cols).replace(/,\s*lead_assignments!inner\([^)]*\)/, ''), o]]); return proxy; };
          if (prop === 'eq') return (col: string, v: any) => { if (col === 'lead_assignments.contractor_id') tenant = v; else ops.push(['eq', [col, v]]); return proxy; };
          if (prop === 'then') return (resolve: any, reject: any) => build().then(({ b }) => b.run()).then(resolve, reject);
          if (prop === 'maybeSingle' || prop === 'single') return async () => { const { b } = await build(); b[prop](); return b.run(); };
          return (...a: any[]) => { ops.push([prop, a]); return proxy; };
        },
      });
      return proxy;
    },
  };
}
