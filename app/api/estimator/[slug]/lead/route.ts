import { NextResponse, after } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { captureAttribution, consentText } from '@/lib/funnels/schema';
import { getFunnel, hash, newToken, readBody, sameOrigin } from '@/lib/funnels/server';
import { deliverPendingFunnels } from '@/lib/funnels/delivery';
import { sendLeadEmailsSoon } from '@/lib/leads/notify';
import { flushNotificationsSoon } from '@/lib/notifications/outbox';
import { runAiCallQueue } from '@/lib/ai-calling/run.server';
import { smsConfigured } from '@/lib/sms/config';
import { startSmsForLead } from '@/lib/sms/service';
import { buildFbc, sendMetaEvent } from '@/lib/meta/capi';
import { nicheDataFor } from '@/lib/meta/niche';
import { rememberLeadMetaIds } from '@/lib/meta/lead-ids';
import { directSendAudit } from '@/lib/meta/audit.server';
import { computeEstimate } from '@/lib/estimator/engine';
import { getEstimator } from '@/lib/estimator/registry';
import { bookingUrl, buildLeadPayload, isHoneypot, parseLeadRequest, pickLikedLooks, sanitizeEstimatorAnswers } from '@/lib/estimator/lead';
import type { EstimatorLeadResponse } from '@/lib/estimator/lead-client';
import { signRenderToken } from '@/lib/estimator/render';

/**
 * Instant estimator lead capture. One request = one finished estimate + contact.
 * It is saved through the SAME path as a homeowner funnel submission (a
 * funnel_sessions row, then save_funnel_session) into the contractor's funnel,
 * so consent, dedupe, qualification, assignment, alerts, GHL/webhook delivery
 * and Meta events behave exactly like a funnel lead. Prices are always
 * recomputed here; nothing the browser sends about money is read.
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
type Context = { params: Promise<{ slug: string }> };

const reply = (data: EstimatorLeadResponse, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
const fail = (form: string, status: number) => reply({ ok: false, errors: { form } }, status);

/** Vercel overwrites x-forwarded-for; this is the real client IP (never logged/stored raw). */
function clientIp(request: Request): string | undefined {
  const header = request.headers.get('x-vercel-forwarded-for') ?? request.headers.get('x-forwarded-for');
  return header?.split(',')[0]?.trim() || undefined;
}

function deviceOf(userAgent: string | null): 'mobile' | 'tablet' | 'desktop' {
  if (/ipad|tablet/i.test(userAgent ?? '')) return 'tablet';
  return /mobi|iphone|android/i.test(userAgent ?? '') ? 'mobile' : 'desktop';
}

export async function POST(request: Request, context: Context) {
  if (!sameOrigin(request)) return fail('Invalid origin', 403);
  const slug = (await context.params).slug;
  const registered = getEstimator(slug);
  if (!registered) return fail('This estimator is not available.', 404);
  const { template, contractor } = registered;

  let body: unknown;
  try { body = await readBody(request); } catch { return fail('We couldn’t read that request. Please try again.', 400); }
  const parsed = parseLeadRequest(body);
  if (!parsed.ok) return reply({ ok: false, errors: parsed.errors }, 422);
  const lead = parsed.data;

  // Never trust the browser: the answers are cut down to what the template allows and the
  // range is computed here.
  const answers = sanitizeEstimatorAnswers(template, lead.answers);
  const estimate = computeEstimate(template, { answers, dimensions: lead.dimensions });

  // Honeypot: look like a success, save nothing.
  if (isHoneypot(lead)) return reply({ ok: true, estimate, qualified: false });

  try {
    const funnel = await getFunnel(contractor.funnelSlug);
    if (!funnel) return fail('This estimator is not accepting requests right now.', 503);

    // The stored disclosure must be exactly what the homeowner saw next to the checkbox.
    if (lead.consentText !== consentText(funnel.config)) {
      return reply({ ok: false, errors: { consent: 'The consent wording was updated. Please read it and check the box again.' } }, 409);
    }

    const likedLooks = pickLikedLooks(contractor, lead.likedLooks);
    const payload = buildLeadPayload({
      template, contractor, funnel: { slug: funnel.slug, contractorId: funnel.contractor_id, config: funnel.config },
      request: lead, answers, estimate, likedLooks,
    });
    // A funnel set to stop unqualified visitors keeps its rule: they see the range, nothing is saved.
    if (!payload.qualified && funnel.config.unqualifiedAction === 'stop') return reply({ ok: true, estimate, qualified: false });

    // Same hourly per-visitor cap as the funnel session route (only a daily hash is retained, never the raw IP).
    const address = request.headers.get('x-vercel-forwarded-for') ?? request.headers.get('x-forwarded-for') ?? 'local';
    const rateKey = hash(`${address.split(',')[0]}:${new Date().toISOString().slice(0, 10)}`);
    const db = createAdminClient();
    const { count, error: rateError } = await db.from('funnel_sessions').select('id', { count: 'exact', head: true })
      .eq('rate_key', rateKey).gte('created_at', new Date(Date.now() - 3600000).toISOString());
    if (rateError) throw rateError;
    if ((count ?? 0) >= 30) return fail('Too many requests. Please try again later.', 429);

    // The visitor's own "Allow optional advertising measurement" choice; without it nothing
    // goes to Meta from the server and no browser ids are kept.
    const measurementAllowed = lead.measurement;
    const tracking = measurementAllowed ? lead.tracking : { pageUrl: lead.tracking?.pageUrl };

    const origin = new URL(request.url).origin;
    const attribution = captureAttribution(tracking?.pageUrl ?? request.headers.get('referer') ?? `${origin}/`, request.headers.get('referer') ?? '', deviceOf(request.headers.get('user-agent')));
    const token = newToken();
    const { data: session, error: sessionError } = await db.from('funnel_sessions').insert({
      funnel_id: funnel.id, token_hash: hash(token), rate_key: rateKey, config_snapshot: funnel.config,
      current_step: 'contact', attribution, measurement_allowed: measurementAllowed,
    }).select('*').single();
    if (sessionError) throw sessionError;
    const { error: eventError } = await db.from('funnel_events').insert({ session_id: session.id, event: 'landing_view', step_id: '' });
    if (eventError) throw eventError;

    const { data, error } = await db.rpc('save_funnel_session', {
      p_id: session.id, p_hash: session.token_hash, p_version: session.version, p_answers: payload.funnelAnswers, p_step: payload.nextStep,
      p_completed: payload.completed, p_contact: payload.contact, p_qualified: payload.qualified,
      p_consent: consentText(funnel.config), p_service_area_valid: payload.areaValid,
    });
    if (error) throw error;
    const leadId = typeof data?.lead_id === 'string' ? data.lead_id : null;

    if (!funnel.is_demo) {
      // The full breakdown (lines, site-visit items, liked looks) on the lead's timeline.
      if (leadId) {
        const { error: activityError } = await db.from('lead_activities').insert({ lead_id: leadId, type: 'system', body: payload.activity.body, metadata: payload.activity.metadata });
        if (activityError) console.error('[estimator-lead] could not add timeline entry', activityError.code ?? 'unknown');
      }
      // Same follow-ups as a funnel submission: internal alert, AI calling nudge, texting, CRM delivery.
      sendLeadEmailsSoon();
      flushNotificationsSoon();
      after(async () => { try { await runAiCallQueue({ limit: 3 }); } catch { /* the scheduled tick retries */ } });
      if (smsConfigured() && leadId) after(async () => { try { await startSmsForLead(db, leadId); } catch { /* never blocks the submission */ } });
      if (funnel.integration_id) after(async () => { try { await deliverPendingFunnels(); } catch { /* the durable queue retains the job */ } });

      // Meta Lead: the funnel's event, never for an out-of-state ZIP, deduplicated against the
      // browser event through the id the page sent.
      const pixelId = funnel.config.trackingPixels.metaPixelId;
      if (pixelId && measurementAllowed && payload.areaValid !== false) {
        const fbc = tracking?.fbc ?? buildFbc(attribution.fbclid, new Date(session.created_at).getTime()) ?? undefined;
        after(() => sendMetaEvent({
          pixelId, eventName: 'Lead', eventId: tracking?.eventId ?? `${session.id}:Lead`,
          eventSourceUrl: attribution.landing_page_url ?? `${origin}/`,
          customData: nicheDataFor(funnel.config.industry, funnel.slug),
          user: {
            email: payload.contact.email, phone: payload.contact.phone, firstName: payload.contact.firstName, lastName: payload.contact.lastName,
            state: payload.areaValid === true ? 'CA' : undefined, zip: lead.zip,
            clientIpAddress: clientIp(request), clientUserAgent: request.headers.get('user-agent') ?? undefined,
            fbp: tracking?.fbp, fbc,
          },
        }, leadId ? directSendAudit(db, { leadId, stage: 'lead' }) : undefined));
      }
      // Remember the browser ids with the lead (write-once) for later server events such as Schedule.
      if (measurementAllowed && leadId) {
        const ids = { fbp: tracking?.fbp, fbc: tracking?.fbc ?? buildFbc(attribution.fbclid, new Date(session.created_at).getTime()) ?? undefined };
        if (ids.fbp || ids.fbc) after(() => rememberLeadMetaIds(db, leadId, ids));
      }
    }

    // Optional photoreal render of their design: only for a lead that was really saved (null when renders are off).
    const renderToken = leadId ? signRenderToken(slug, leadId) ?? undefined : undefined;
    return reply({
      ok: true, estimate, qualified: payload.qualified,
      calendarUrl: payload.qualified ? bookingUrl(contractor.calendarUrl ?? funnel.config.calendarUrl, payload.contact, attribution) : undefined,
      renderToken,
    });
  } catch (error) {
    console.error('[estimator-lead] Save failed', error instanceof Error ? error.name : (error as { code?: string })?.code ?? 'unknown');
    return fail('We couldn’t save that. Please try again.', 503);
  }
}
