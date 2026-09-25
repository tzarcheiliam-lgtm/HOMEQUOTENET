import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  ACTIVE_SERVICES,
  GROWTH_SERVICES,
  REQUEST_STATUSES,
  SERVICE_SLUGS,
  formatPrice,
  getService,
  isRequestStatus,
  isRequestableService,
  isServiceSlug,
  requestStatusLabel,
  servicesByTier,
} from '@/lib/growth/catalog';
import { recommendService } from '@/lib/growth/recommend';
import { parseServiceRequest, statusUpdateSchema } from '@/lib/validation/service-request';
import { navItemsForRole } from '@/lib/nav';

const migration = readFileSync('supabase/migrations/0021_growth_tools_upsells.sql', 'utf8');
const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
};

describe('Growth Tools catalog', () => {
  it('features the AI Receptionist, with the requested copy', () => {
    expect(servicesByTier('featured').map((s) => s.slug)).toEqual(['ai_receptionist']);
    const ai = getService('ai_receptionist')!;
    expect(ai.tagline).toBe('Never miss another homeowner call.');
    expect(ai.cta).toBe('Request AI Receptionist');
    expect(ai.benefits).toEqual([
      'Answers calls 24/7',
      'Qualifies homeowners',
      'Books appointments',
      'Sends confirmations',
      'Reduces missed leads',
    ]);
  });

  it('offers the seven growth tools', () => {
    expect([...servicesByTier('featured'), ...servicesByTier('core')].map((s) => s.name)).toEqual([
      'AI Receptionist',
      'Automated Follow-Up',
      'CRM & Pipeline Upgrade',
      'Custom Lead Funnel',
      'Website & Landing Page',
      'Old Lead Reactivation',
      'Call & Lead Tracking',
    ]);
  });

  it('gives every active card a title, subtitle, 3–5 benefits and a strong CTA', () => {
    for (const s of ACTIVE_SERVICES) {
      expect(s.name.length).toBeGreaterThan(3);
      expect(s.tagline.length).toBeGreaterThan(15);
      expect(s.benefits.length).toBeGreaterThanOrEqual(3);
      expect(s.benefits.length).toBeLessThanOrEqual(5);
      expect(['Request Setup', 'Add to My Account', 'Learn More', 'Request This', 'Get Started', `Request ${s.name}`]).toContain(s.cta);
      expect(s.cta).not.toMatch(/submit/i);
      expect(s.notesHint).toMatch(/\?$/);
    }
  });

  it('keeps every earlier service valid so existing requests still display', () => {
    for (const old of ['brochures', 'brand_identity', 'website', 'landing_pages', 'social_ad_creative', 'photo_video', 'lead_follow_up', 'crm_setup', 'review_generation', 'local_seo']) {
      expect(isServiceSlug(old)).toBe(true);
      expect(getService(old)).toBeDefined();
    }
    // landing_pages merged into website: shown on old requests, not offered.
    expect(isRequestableService('landing_pages')).toBe(false);
    expect(ACTIVE_SERVICES.map((s) => s.slug)).not.toContain('landing_pages');
  });

  it('matches the database constraints in migration 0021', () => {
    expect(GROWTH_SERVICES.map((s) => s.slug).sort()).toEqual([...SERVICE_SLUGS].sort());
    for (const slug of SERVICE_SLUGS) expect(migration).toContain(`'${slug}'`);
    for (const { value } of REQUEST_STATUSES) expect(migration).toContain(`'${value}'`);
    expect(REQUEST_STATUSES.map((s) => s.label)).toEqual(['New', 'Contacted', 'In Progress', 'Completed', 'Declined']);
  });

  it('prices every active service with the agreed figures and a clear type', () => {
    const shown = Object.fromEntries(ACTIVE_SERVICES.map((s) => [s.slug, formatPrice(s.price)]));
    expect(shown).toEqual({
      ai_receptionist: '$399–$699/mo + $500 setup',
      lead_follow_up: '$149–$299/mo',
      crm_setup: 'Included with eligible HomeQuote plans',
      custom_funnel: '$350–$750 one-time',
      website: 'Starting at $500',
      lead_reactivation: '$300–$750 per campaign',
      call_tracking: '$99–$199/mo',
      brochures: '$350–$750 one-time',
      brand_identity: '$500–$1,000+ one-time',
      social_ad_creative: '$250–$500 per creative pack',
      photo_video: 'Custom quote',
      review_generation: '$99–$199/mo',
      local_seo: '$500–$1,000+/mo',
    });
    expect(getService('lead_reactivation')!.price.note).toBe('Messaging usage may be billed separately.');
    for (const s of GROWTH_SERVICES) {
      expect(Boolean(s.price.amount)).toBe(!['custom_quote', 'included'].includes(s.price.type));
    }
  });

  it('shows no invented results or popularity, and keeps prices out of the copy', () => {
    for (const s of GROWTH_SERVICES) expect(s.badge).toBeUndefined();
    const copy = JSON.stringify(GROWTH_SERVICES.map((s) => ({ ...s, price: undefined })));
    expect(copy).not.toMatch(/\$\s?\d|\d\s?%|guarantee|\bdouble\b|\btriple\b|\bROI\b|#1|best in|proven|testimonial/i);
  });

  it('recognises slugs and statuses', () => {
    expect(getService('nope')).toBeUndefined();
    expect(isServiceSlug('__proto__')).toBe(false);
    expect(isRequestStatus('in_progress')).toBe(true);
    expect(isRequestStatus('proposal_sent')).toBe(false);
    expect(requestStatusLabel('in_progress')).toBe('In Progress');
  });
});

describe('contextual recommendation', () => {
  it('suggests a website only to a company without one', () => {
    expect(recommendService({ website: null, requests: [] })?.service).toBe('website');
    expect(recommendService({ website: '   ', requests: [] })?.service).toBe('website');
    expect(recommendService({ website: 'poolmastersla.com', requests: [] })).toBeNull();
  });

  it('never re-suggests a service the company already asked about', () => {
    for (const status of REQUEST_STATUSES.map((s) => s.value)) {
      expect(recommendService({ website: null, requests: [{ service: 'website', status }] })).toBeNull();
    }
    expect(recommendService({ website: null, requests: [{ service: 'crm_setup', status: 'new' }] })?.service).toBe('website');
  });
});

describe('service request validation', () => {
  it('accepts an active service with optional notes and a known source', () => {
    const r = parseServiceRequest(form({ service: 'ai_receptionist', notes: '  We miss calls on weekends.  ', source: 'growth_page' }));
    expect(r.success && r.data).toEqual({ service: 'ai_receptionist', notes: 'We miss calls on weekends.', source: 'growth_page' });
    const empty = parseServiceRequest(form({ service: 'website', notes: '   ' }));
    expect(empty.success && empty.data).toEqual({ service: 'website', notes: null, source: null });
  });

  it('drops an unknown source instead of failing the request', () => {
    const r = parseServiceRequest(form({ service: 'website', source: 'somewhere-else' }));
    expect(r.success && r.data.source).toBeNull();
  });

  it('rejects unknown or retired services and oversized notes', () => {
    expect(parseServiceRequest(form({ service: 'free_money' })).success).toBe(false);
    expect(parseServiceRequest(form({})).success).toBe(false);
    expect(parseServiceRequest(form({ service: 'landing_pages' })).success).toBe(false);
    expect(parseServiceRequest(form({ service: 'website', notes: 'x'.repeat(2001) })).success).toBe(false);
  });

  it('ignores any company, user or status fields in the form', () => {
    const r = parseServiceRequest(
      form({ service: 'website', contractor_id: '11111111-1111-1111-1111-111111111111', requested_by: 'x', status: 'completed', notification_status: 'sent' })
    );
    expect(r.success && Object.keys(r.data).sort()).toEqual(['notes', 'service', 'source']);
  });

  it('only accepts known statuses for admin updates', () => {
    const id = '11111111-1111-4111-8111-111111111111';
    expect(statusUpdateSchema.safeParse({ id, status: 'in_progress' }).success).toBe(true);
    expect(statusUpdateSchema.safeParse({ id, status: 'accepted' }).success).toBe(false);
    expect(statusUpdateSchema.safeParse({ id: 'not-a-uuid', status: 'new' }).success).toBe(false);
  });
});

describe('navigation placement', () => {
  const hrefs = (role: Parameters<typeof navItemsForRole>[0]) => navItemsForRole(role).map((i) => i.href);

  it('gives contractors Growth Tools, listed after their lead workflow', () => {
    const items = navItemsForRole('contractor');
    const growth = items.find((i) => i.href === '/app/growth');
    expect(growth?.label).toBe('Growth Tools');
    const order = items.map((i) => i.href);
    expect(order.indexOf('/app/growth')).toBeGreaterThan(order.indexOf('/app/leads'));
    expect(order.indexOf('/app/growth')).toBeGreaterThan(order.indexOf('/app/appointments'));
    expect(order).not.toContain('/app/service-requests');
  });

  it('shows the review page to admins only', () => {
    expect(hrefs('admin')).toContain('/app/service-requests');
    expect(hrefs('admin')).not.toContain('/app/growth');
    for (const role of ['setter', 'caller'] as const) {
      expect(hrefs(role)).not.toContain('/app/service-requests');
      expect(hrefs(role)).not.toContain('/app/growth');
    }
  });
});
