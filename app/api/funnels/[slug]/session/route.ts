import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { calendlyUri, captureAttribution, consentText, contactSchema, funnelSchema, qualify, sanitizeAnswers, visibleQuestions, type FunnelConfig, type Session } from '@/lib/funnels/schema';
import { verifyCalendlyBooking } from '@/lib/funnels/calendly';
import { cookieName, getFunnel, getSession, hash, newToken, publicSession, readBody, sameOrigin } from '@/lib/funnels/server';
import { after } from 'next/server';
import { deliverPendingFunnels } from '@/lib/funnels/delivery';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
type Context = { params: Promise<{ slug: string }> };
const reply = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
/** Calendly step only: return the owner's name/email so the booking form is prefilled after a refresh. */
function withPrefill(session: Session, s: { config_snapshot: FunnelConfig; contact: Record<string, unknown> | null }) {
  const config = funnelSchema.parse(s.config_snapshot);
  if (config.calendarProvider !== 'calendly' || session.current_step !== 'calendar' || session.booked_at || !s.contact) return session;
  return { ...session, prefill: { name: `${s.contact.firstName ?? ''} ${s.contact.lastName ?? ''}`.trim(), email: String(s.contact.email ?? '') } };
}
export async function POST(request: Request, context: Context) {
  if (!sameOrigin(request)) return reply({ error: 'Invalid origin' }, 403);
  try {
    const funnel = await getFunnel((await context.params).slug);
    if (!funnel) return reply({ error: 'Funnel unavailable' }, 404);
    const existing = await getSession(funnel);
    if (existing) return reply({ session: withPrefill(publicSession(existing), existing), config: existing.config_snapshot });
    const body = z.object({ url: z.string().url().max(4000), referrer: z.string().max(2000), device: z.enum(['mobile', 'tablet', 'desktop']) }).parse(await readBody(request));
    // Vercel overwrites this header; only a daily hash is retained, never raw IP.
    const address = request.headers.get('x-vercel-forwarded-for') ?? request.headers.get('x-forwarded-for') ?? 'local';
    const rateKey = hash(`${address.split(',')[0]}:${new Date().toISOString().slice(0, 10)}`);
    const db = createAdminClient();
    const { count, error: rateError } = await db.from('funnel_sessions').select('id', { count: 'exact', head: true }).eq('rate_key', rateKey).gte('created_at', new Date(Date.now() - 3600000).toISOString());
    if (rateError) throw rateError;
    if ((count ?? 0) >= 30) return reply({ error: 'Too many requests. Please try again later.' }, 429);
    const token = newToken();
    const { data, error } = await db.from('funnel_sessions').insert({ funnel_id: funnel.id, token_hash: hash(token), rate_key: rateKey,
      config_snapshot: funnel.config, current_step: funnel.config.questions[0].id,
      attribution: captureAttribution(body.url, body.referrer, body.device),
    }).select('*').single();
    if (error) throw error;
    const { error: eventError } = await db.from('funnel_events').insert([
      { session_id: data.id, event: 'landing_view', step_id: '' },
      { session_id: data.id, event: 'step_viewed', step_id: data.current_step },
    ]);
    if (eventError) throw eventError;
    (await cookies()).set(cookieName(funnel.slug), token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: `/api/funnels/${funnel.slug}`, maxAge: 60 * 60 * 24 * 30 });
    return reply({ session: publicSession(data), config: funnel.config });
  } catch (error) {
    console.error('[funnel-session] Start failed', error instanceof Error ? error.name : (error as { code?: string })?.code ?? 'unknown');
    return reply({ error: 'We couldn’t start your request. Please try again.' }, 503);
  }
}

export async function GET(_request: Request, context: Context) {
  try {
    const funnel = await getFunnel((await context.params).slug);
    const session = funnel && await getSession(funnel);
    return session ? reply({ session: withPrefill(publicSession(session), session), config: session.config_snapshot }) : reply({ error: 'Session expired' }, 401);
  } catch { return reply({ error: 'We couldn’t restore your progress.' }, 503); }
}

const updateSchema = z.object({
  version: z.number().int().nonnegative(),
  answer: z.object({ question: z.string().max(50), value: z.string().max(100) }).optional(),
  step: z.string().max(50).optional(),
  contact: contactSchema.optional(),
  calendarViewed: z.boolean().optional(),
  calendlyBooking: z.object({ eventUri: calendlyUri, inviteeUri: calendlyUri }).optional(),
});
export async function PATCH(request: Request, context: Context) {
  if (!sameOrigin(request)) return reply({ error: 'Invalid origin' }, 403);
  try {
    const funnel = await getFunnel((await context.params).slug);
    const s = funnel && await getSession(funnel);
    if (!s || !funnel) return reply({ error: 'Session expired. Refresh to start again.' }, 401);
    const parsed = updateSchema.safeParse(await readBody(request));
    if (!parsed.success) return reply({ error: parsed.error.issues[0].message }, 422);
    const body = parsed.data;
    const config = funnelSchema.parse(s.config_snapshot);
    const db = createAdminClient();
    if (s.contact_submitted_at) {
      if (body.calendarViewed && s.qualified && config.calendarUrl) {
        const { error } = await db.from('funnel_events').upsert({ session_id: s.id, event: 'calendar_viewed', step_id: '' }, { onConflict: 'session_id,event,step_id', ignoreDuplicates: true });
        if (error) throw error;
      }
      if (body.calendlyBooking && s.qualified && config.calendarProvider === 'calendly' && !s.booked_at) {
        const { eventUri, inviteeUri } = body.calendlyBooking;
        const check = await verifyCalendlyBooking(eventUri, inviteeUri);
        const { data, error } = await db.rpc('record_calendly_booking', { p_session: s.id, p_hash: s.token_hash, p_invitee: inviteeUri,
          p_event: eventUri, p_time: check.startTime, p_verified: check.verified });
        if (error) return reply({ error: 'We couldn’t confirm that booking. Your request is saved and the team will follow up.' }, 422);
        return reply({ session: publicSession(data) });
      }
      return reply({ session: withPrefill(publicSession(s), s) });
    }
    let answers = sanitizeAnswers(config, s.answers);
    let completed: string | null = null;
    let nextStep = s.current_step;
    if (body.answer) {
      const q = visibleQuestions(config, answers).find(q => q.id === body.answer!.question);
      if (!q || q.id !== s.current_step) return reply({ error: 'Please answer the current question.' }, 422);
      const updated = sanitizeAnswers(config, { ...answers, [q.id]: body.answer.value });
      if (!updated[q.id]) return reply({ error: q.type === 'zip' ? 'Enter a valid five-digit ZIP code.' : 'Choose one of the options.' }, 422);
      answers = updated; completed = q.id;
      const visible = visibleQuestions(config, answers);
      nextStep = visible[visible.findIndex(item => item.id === q.id) + 1]?.id ?? 'qualification';
    } else if (body.step) {
      const visible = visibleQuestions(config, answers);
      const firstMissing = visible.findIndex(q => !answers[q.id]);
      const index = visible.findIndex(q => q.id === body.step);
      if (index >= 0 && (firstMissing < 0 || index <= firstMissing)) nextStep = body.step;
      else if (body.step === 'contact' && qualify(config, answers) !== null && !(qualify(config, answers) === false && config.unqualifiedAction === 'stop')) nextStep = 'contact';
      else return reply({ error: 'Please complete the earlier questions.' }, 422);
    }
    const qualified = qualify(config, answers);
    if (body.contact) {
      if (qualified === null || s.current_step !== 'contact' || (!qualified && config.unqualifiedAction === 'stop')) return reply({ error: 'Please finish the questions first.' }, 422);
      nextStep = qualified && config.calendarUrl ? 'calendar' : 'thanks';
    }
    const { data, error } = await db.rpc('save_funnel_session', { p_id: s.id, p_hash: s.token_hash, p_version: body.version,
      p_answers: answers, p_step: nextStep, p_completed: completed, p_contact: body.contact ?? null, p_qualified: qualified, p_consent: consentText(config) });
    if (error) return reply({ error: error.code === '40001' ? 'Your progress changed in another tab. Refresh to continue.' : 'We couldn’t save that. Please try again.' }, error.code === '40001' ? 409 : 503);
    if (body.contact && !funnel.is_demo && funnel.integration_id) after(async () => { try { await deliverPendingFunnels(); } catch { /* Durable queue retains the job for retry. */ } });
    const saved = publicSession(data);
    return reply({ session: body.contact && config.calendarProvider === 'calendly' && saved.current_step === 'calendar'
      ? { ...saved, prefill: { name: `${body.contact.firstName} ${body.contact.lastName}`, email: body.contact.email } } : saved });
  } catch { return reply({ error: 'We couldn’t save that. Please try again.' }, 503); }
}
