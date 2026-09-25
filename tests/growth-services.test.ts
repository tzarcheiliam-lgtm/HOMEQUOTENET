import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  GROWTH_SERVICES,
  REQUEST_STATUSES,
  SERVICE_SLUGS,
  getService,
  isRequestStatus,
  isServiceSlug,
  requestStatusLabel,
} from '@/lib/growth/catalog';
import { recommendService } from '@/lib/growth/recommend';
import { parseServiceRequest, statusUpdateSchema } from '@/lib/validation/service-request';
import { navItemsForRole } from '@/lib/nav';

const migration = readFileSync('supabase/migrations/0018_contractor_service_requests.sql', 'utf8');
const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
};

describe('growth service catalog', () => {
  it('offers the ten requested services, each complete', () => {
    expect(GROWTH_SERVICES.map((s) => s.slug)).toEqual([...SERVICE_SLUGS]);
    expect(new Set(SERVICE_SLUGS).size).toBe(10);
    for (const s of GROWTH_SERVICES) {
      expect(s.name.length).toBeGreaterThan(3);
      expect(s.summary.length).toBeGreaterThan(20);
      expect(s.summary.length).toBeLessThanOrEqual(100);
      expect(s.deliverables.length).toBeGreaterThanOrEqual(3);
      expect(s.notesHint).toMatch(/\?$/);
    }
  });

  it('matches the database constraints in migration 0018', () => {
    for (const slug of SERVICE_SLUGS) expect(migration).toContain(`'${slug}'`);
    for (const { value } of REQUEST_STATUSES) expect(migration).toContain(`'${value}'`);
    expect(REQUEST_STATUSES.map((s) => s.label)).toEqual(['New', 'Contacted', 'Proposal Sent', 'Accepted', 'Closed']);
  });

  it('makes no pricing or performance claims', () => {
    const copy = JSON.stringify(GROWTH_SERVICES);
    expect(copy).not.toMatch(/\$\s?\d|\d\s?%|guarantee|double|triple|\bROI\b|#1|best in|proven|testimonial/i);
  });

  it('recognises slugs and statuses', () => {
    expect(getService('website')?.name).toBe('Website creation or redesign');
    expect(getService('nope')).toBeUndefined();
    expect(isServiceSlug('local_seo')).toBe(true);
    expect(isServiceSlug('__proto__')).toBe(false);
    expect(isRequestStatus('proposal_sent')).toBe(true);
    expect(isRequestStatus('deleted')).toBe(false);
    expect(requestStatusLabel('proposal_sent')).toBe('Proposal Sent');
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
    // Asking about something else doesn't silence the website suggestion.
    expect(recommendService({ website: null, requests: [{ service: 'crm_setup', status: 'new' }] })?.service).toBe('website');
  });
});

describe('service request validation', () => {
  it('accepts a known service with optional notes', () => {
    const r = parseServiceRequest(form({ service: 'crm_setup', notes: '  We use a spreadsheet today.  ' }));
    expect(r.success && r.data).toEqual({ service: 'crm_setup', notes: 'We use a spreadsheet today.' });
    const empty = parseServiceRequest(form({ service: 'website', notes: '   ' }));
    expect(empty.success && empty.data.notes).toBeNull();
  });

  it('rejects unknown services and oversized notes', () => {
    expect(parseServiceRequest(form({ service: 'free_money' })).success).toBe(false);
    expect(parseServiceRequest(form({})).success).toBe(false);
    expect(parseServiceRequest(form({ service: 'website', notes: 'x'.repeat(2001) })).success).toBe(false);
  });

  it('ignores any company or user fields in the form', () => {
    const r = parseServiceRequest(
      form({ service: 'website', contractor_id: '11111111-1111-1111-1111-111111111111', requested_by: 'x', status: 'accepted' })
    );
    expect(r.success && Object.keys(r.data).sort()).toEqual(['notes', 'service']);
  });

  it('only accepts known statuses for admin updates', () => {
    const id = '11111111-1111-4111-8111-111111111111';
    expect(statusUpdateSchema.safeParse({ id, status: 'contacted' }).success).toBe(true);
    expect(statusUpdateSchema.safeParse({ id, status: 'paid' }).success).toBe(false);
    expect(statusUpdateSchema.safeParse({ id: 'not-a-uuid', status: 'new' }).success).toBe(false);
  });
});

describe('navigation placement', () => {
  const hrefs = (role: Parameters<typeof navItemsForRole>[0]) => navItemsForRole(role).map((i) => i.href);

  it('gives contractors a services page listed after their lead workflow', () => {
    const items = hrefs('contractor');
    expect(items).toContain('/app/growth');
    expect(items.indexOf('/app/growth')).toBeGreaterThan(items.indexOf('/app/leads'));
    expect(items.indexOf('/app/growth')).toBeGreaterThan(items.indexOf('/app/appointments'));
    expect(items).not.toContain('/app/service-requests');
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
