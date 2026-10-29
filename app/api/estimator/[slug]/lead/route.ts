import { NextResponse, after } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { captureAttribution } from '@/lib/funnels/schema';
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
import { configuratorSpecFor } from '@/lib/estimator/configurator/engine';
import { funnelSpecFor } from '@/lib/estimator/funnel/engine';
import { getEstimator } from '@/lib/estimator/registry';
import {
  ReplayCache, acceptedConsent, addressLine, bookingUrl, buildLeadPayload, configuratorLeadDesign, funnelLeadDesign, isHoneypot, originAllowed, parseLeadRequest, pickLikedLooks,
  sanitizeEstimatorAnswers, type ConfiguratorLeadDesign,
} from '@/lib/estimator/lead';
import { estimatorConsentText, type EstimatorLeadResponse } from '@/lib/estimator/lead-client';
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

/**
 * Successful replies by slug + submissionId + the contact's email/phone (hashed): the client's
 * automatic retry gets the first answer, not a second lead, and nobody else can read it back
 * with only the id.
 */
const replays = new ReplayCache<EstimatorLeadResponse>();
/** Requests still being saved, by the same key: a retry that arrives while the first is slow waits for it. */
const inflight = new Map<string, Promise<Response>>();

function replayKeyFor(slug: string, submissionId: unknown, contact: unknown): string | null {
  if (typeof submissionId !== 'string' || !submissionId) return null;
  const c = (contact && typeof contact === 'object' ? contact : {}) as { email?: unknown; phone?: unknown };
  const email = typeof c.email === 'string' ? c.email.trim().toLowerCase() : '';
  const phone = typeof c.phone === 'string' ? c.phone.replace(/\D/g, '').slice(-10) : '';
  return `${slug}:${submissionId.slice(0, 80)}:${hash(`${email}|${phone}`).slice(0, 24)}`;
}

/** " or call (818) 643-6888" when the contractor has a phone. */
const orCall = (phone: string | undefined) => (phone ? ` or call ${phone}` : '');

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
  let key: string | null = null;
  try {
    const peek = (await request.clone().json()) as { submissionId?: unknown; contact?: unknown };
    key = replayKeyFor((await context.params).slug, peek?.submissionId, peek?.contact);
  } catch {
    key = null;
  }
  if (!key) return handle(request, context);
  const pending = inflight.get(key);
  // The first copy is still saving: wait for it, then answer from the replay cache (or try again if it failed).
  if (pending) await pending.catch(() => undefined);
  else {
    const first = handle(request, context);
    inflight.set(key, first);
    try {
      return await first;
    } finally {
      inflight.delete(key);
    }
  }
  return handle(request, context);
}

async function handle(request: Request, context: Context): Promise<Response> {
  // The strict check first; then the www/apex twin, a proxied host and the configured site URL (originAllowed).
  if (!sameOrigin(request) && !originAllowed(request)) return fail('This page’s address doesn’t match our site. Reload the page and try again.', 403);
  const slug = (await context.params).slug;
  const registered = getEstimator(slug);
  if (!registered) return fail('This estimator is not available.', 404);
  const { template, contractor } = registered;

  let body: unknown;
  try { body = await readBody(request); } catch { return fail('We couldn’t read that request. Shorten any note and try again.', 400); }
  const parsed = parseLeadRequest(body);
  if (!parsed.ok) return reply({ ok: false, errors: parsed.errors }, 422);
  const lead = parsed.data;

  const replayKey = replayKeyFor(slug, lead.submissionId, lead.contact);
  const replayed = replayKey ? replays.get(replayKey) : undefined;
  if (replayed) return reply(replayed);

  // Never trust the browser: the answers are cut down to what the template allows and the
  // range is computed here. A funnel or configurator design is re-derived from the picks alone.
  const origin = new URL(request.url).origin;
  const where = { origin: request.headers.get('origin') && originAllowed(request) ? request.headers.get('origin')! : origin, slug };
  const spec = configuratorSpecFor(contractor);
  const funnelSpec = funnelSpecFor(contractor);
  let answers = sanitizeEstimatorAnswers(template, lead.answers);
  let estimate = computeEstimate(template, { answers, dimensions: lead.dimensions });
  let design: ConfiguratorLeadDesign | undefined;
  if (funnelSpec && lead.funnel) {
    ({ answers, estimate, design } = funnelLeadDesign(funnelSpec, template, lead.funnel, where));
  } else if (spec && lead.configurator) {
    ({ answers, estimate, design } = configuratorLeadDesign(spec, template, lead.configurator, where));
  }

  // Honeypot: look like a success, save nothing.
  if (isHoneypot(lead)) return reply({ ok: true, estimate, qualified: false });

  try {
    const funnel = await getFunnel(contractor.funnelSlug);
    if (!funnel) return fail(`We can’t take requests online for a moment. Please try again shortly${orCall(contractor.phone)}.`, 503);

    // The stored disclosure must be exactly what the homeowner saw next to the checkbox: the funnel's
    // wording or the estimator page's (contractor display name), whichever the page showed.
    const consent = acceptedConsent(lead.consentText, funnel.config, contractor);
    if (!consent) {
      return reply({
        ok: false,
        errors: { consent: 'We updated the consent wording. Please read it again and tick the box to continue.' },
        consentText: estimatorConsentText(contractor.contractorName),
      }, 409);
    }

    const likedLooks = pickLikedLooks(contractor, lead.likedLooks);
    const payload = buildLeadPayload({
      template, contractor, funnel: { slug: funnel.slug, contractorId: funnel.contractor_id, config: funnel.config },
      request: lead, answers, estimate, likedLooks, design,
    });
    // A funnel set to stop unqualified visitors keeps its rule: they see the range, nothing is saved.
    if (!payload.qualified && funnel.config.unqualifiedAction === 'stop') return reply({ ok: true, estimate, qualified: false, saved: false });

    // Same hourly per-visitor cap as the funnel session route (only a daily hash is retained, never the raw IP).
    const address = request.headers.get('x-vercel-forwarded-for') ?? request.headers.get('x-forwarded-for') ?? 'local';
    const rateKey = hash(`${address.split(',')[0]}:${new Date().toISOString().slice(0, 10)}`);
    const db = createAdminClient();
    const { count, error: rateError } = await db.from('funnel_sessions').select('id', { count: 'exact', head: true })
      .eq('rate_key', rateKey).gte('created_at', new Date(Date.now() - 3600000).toISOString());
    if (rateError) throw rateError;
    if ((count ?? 0) >= 30) return fail(`Too many requests from this connection in the last hour. Please try again later${orCall(contractor.phone)}.`, 429);

    // The visitor's own "Allow optional advertising measurement" choice; without it nothing
    // goes to Meta from the server and no browser ids are kept.
    const measurementAllowed = lead.measurement;
    const tracking = measurementAllowed ? lead.tracking : { pageUrl: lead.tracking?.pageUrl };

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
      p_consent: consent, p_service_area_valid: payload.areaValid,
    });
    if (error) throw error;
    const leadId = typeof data?.lead_id === 'string' ? data.lead_id : null;

    // The home address on the lead's own columns (the CRM contact card), only where they are still
    // empty: a funnel without an Address question leaves leads.address blank, and a deduped earlier
    // lead keeps whatever it already has. No schema change; never fails the submission.
    if (leadId && lead.address && !funnel.is_demo) {
      const { city, state } = lead.addressDetails ?? {};
      const fill = { address: addressLine(lead.address, lead.zip), ...(city ? { city } : {}), ...(state ? { state } : {}) };
      const { error: addressError } = await db.from('leads').update(fill).eq('id', leadId).is('address', null);
      if (addressError) console.error('[estimator-lead] could not store the address', addressError.code ?? 'unknown');
    }

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
    const done: EstimatorLeadResponse = {
      ok: true, estimate, qualified: payload.qualified,
      calendarUrl: payload.qualified ? bookingUrl(contractor.calendarUrl ?? funnel.config.calendarUrl, payload.contact, attribution) : undefined,
      renderToken,
    };
    if (replayKey) replays.set(replayKey, done);
    return reply(done);
  } catch (error) {
    console.error('[estimator-lead] Save failed', error instanceof Error ? error.name : (error as { code?: string })?.code ?? 'unknown');
    return fail(`We couldn’t save your request just now. Your details are still on the page: please try again${orCall(contractor.phone)}.`, 503);
  }
}
