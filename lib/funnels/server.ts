import 'server-only';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { funnelSchema, type FunnelConfig, type Session } from './schema';

export type Funnel = { id: string; slug: string; is_demo: boolean; contractor_id: string | null; integration_id: string | null; config: FunnelConfig };
export const hash = (value: string) => createHash('sha256').update(value).digest('hex');
export const cookieName = (slug: string) => `hqn_funnel_${slug}`;
export const newToken = () => randomBytes(32).toString('hex');
export function equalSecret(a: string, b: string) {
  return !!a && !!b && timingSafeEqual(Buffer.from(hash(a)), Buffer.from(hash(b)));
}
export async function getFunnel(slug: string): Promise<Funnel | null> {
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(slug)) return null;
  const { data, error } = await createAdminClient().from('funnels')
    .select('id,slug,is_demo,contractor_id,integration_id,config').eq('slug', slug).eq('published', true).maybeSingle();
  if (error) throw new Error('Funnel storage is unavailable');
  return data ? { ...data, config: funnelSchema.parse(data.config) } : null;
}
export async function getSession(funnel: Funnel) {
  const token = (await cookies()).get(cookieName(funnel.slug))?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const { data, error } = await createAdminClient().from('funnel_sessions').select('*')
    .eq('funnel_id', funnel.id).eq('token_hash', hash(token)).gt('expires_at', new Date().toISOString()).maybeSingle();
  if (error) throw new Error('Session storage is unavailable');
  return data as (Session & { token_hash: string; config_snapshot: FunnelConfig; contact: Record<string, unknown> | null }) | null;
}
export function publicSession(s: Session): Session {
  return { id: s.id, answers: s.answers, current_step: s.current_step, version: s.version, qualified: s.qualified,
    contact_submitted_at: s.contact_submitted_at, booked_at: s.booked_at, attribution: s.attribution };
}
export function sameOrigin(request: Request) {
  return request.headers.get('origin') === new URL(request.url).origin;
}
export async function readBody(request: Request): Promise<unknown> {
  if (Number(request.headers.get('content-length') ?? 0) > 20000) throw new Error('Request too large');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Missing request');
  let size = 0; const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 20000) { await reader.cancel(); throw new Error('Request too large'); }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString());
}
