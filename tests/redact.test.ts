import { describe, it, expect } from 'vitest';
import {
  redactForLog,
  categorizeError,
  toLogPath,
  newSubmissionRef,
  type RedactableRecord,
  type RedactionContext,
} from '@/lib/applications/redact';

/**
 * The guarantee under test: nothing that identifies an applicant reaches a
 * production failure log.
 *
 * Every sensitive field carries a unique sentinel, so a leak anywhere in the
 * serialized output — including somewhere we did not anticipate, such as a
 * nested object or an error string — fails the assertion rather than slipping
 * through a field-by-field check.
 */

const MARKERS = {
  first_name: 'ZZFIRSTNAMEMARKERZZ',
  last_name: 'ZZLASTNAMEMARKERZZ',
  email: 'zzemailmarkerzz@example.invalid',
  phone: '+15550009999',
  website: 'https://zzwebsitemarkerzz.invalid',
  notes: 'ZZNOTESMARKERZZ sensitive free text',
} as const;

/** A full submission, shaped as it reaches the delivery layer. */
const fullRecord = {
  ...MARKERS,
  company: 'Rivera Pool Remodeling',
  primary_services: ['Pool resurfacing', 'Tile & coping'],
  service_areas: 'Los Angeles County — San Fernando Valley',
  avg_project_value: '$25,000 – $50,000',
  min_project_size: '$10,000+',
  monthly_lead_capacity: '6 – 15 per month',
  response_time: 'Within 5 minutes',
  uses_crm: 'Yes — GoHighLevel',
  track: 'pay_per_lead',
  consent: 'on',
  submitted_at: '2026-09-17T01:23:45.000Z',
  source_page: 'https://homequotenet.com/apply?utm_source=zzquerymarkerzz&ref=zzrefmarkerzz',
  user_agent: 'Mozilla/5.0 ZZUAMARKERZZ',
};

const context: RedactionContext = {
  ref: 'hq_testref01',
  sinks: { webhook: 'failed', supabase: 'failed' },
  errors: [
    'webhook: Webhook responded 500 Internal Server Error',
    'supabase: Supabase insert failed: password=ZZSECRETMARKERZZ host=db.internal',
  ],
};

const serialize = () =>
  JSON.stringify(redactForLog(fullRecord as RedactableRecord, context));

describe('redactForLog — sensitive fields never reach the log', () => {
  it('omits every marker value from the serialized output', () => {
    const out = serialize();
    for (const [field, marker] of Object.entries(MARKERS)) {
      expect(out, `${field} leaked into the log`).not.toContain(marker);
    }
  });

  it('omits the applicant name, email, phone, website and notes individually', () => {
    const out = serialize();
    expect(out).not.toContain(MARKERS.first_name);
    expect(out).not.toContain(MARKERS.last_name);
    expect(out).not.toContain(MARKERS.email);
    expect(out).not.toContain(MARKERS.phone);
    expect(out).not.toContain(MARKERS.website);
    expect(out).not.toContain(MARKERS.notes);
  });

  it('does not carry the raw payload through under any key', () => {
    const r = redactForLog(fullRecord as RedactableRecord, context);
    const keys = Object.keys(r).sort();
    expect(keys).toEqual([
      'company',
      'error_categories',
      'primary_services',
      'ref',
      'service_areas',
      'sinks',
      'source_path',
      'submitted_at',
      'track',
    ]);
    // No stray fields smuggled in from the source record.
    expect(r).not.toHaveProperty('email');
    expect(r).not.toHaveProperty('phone');
    expect(r).not.toHaveProperty('notes');
    expect(r).not.toHaveProperty('user_agent');
    expect(r).not.toHaveProperty('record');
  });

  it('drops query parameters from the source page', () => {
    const out = serialize();
    expect(out).not.toContain('zzquerymarkerzz');
    expect(out).not.toContain('zzrefmarkerzz');
    expect(redactForLog(fullRecord as RedactableRecord, context).source_path).toBe(
      '/apply'
    );
  });

  it('never echoes raw error text, which can carry credentials', () => {
    const out = serialize();
    expect(out).not.toContain('ZZSECRETMARKERZZ');
    expect(out).not.toContain('password=');
    expect(out).not.toContain('db.internal');
    expect(out).not.toContain('Internal Server Error');
  });

  it('adding a field to the record does not add it to the log', () => {
    // Guards the build-a-new-object approach: an extra key must be ignored.
    const withExtra = { ...fullRecord, secret_new_field: 'ZZNEWFIELDMARKERZZ' };
    const out = JSON.stringify(
      redactForLog(withExtra as unknown as RedactableRecord, context)
    );
    expect(out).not.toContain('ZZNEWFIELDMARKERZZ');
  });
});

describe('redactForLog — diagnostic fields are retained', () => {
  const r = () => redactForLog(fullRecord as RedactableRecord, context);

  it('keeps the reference id and timestamp', () => {
    expect(r().ref).toBe('hq_testref01');
    expect(r().submitted_at).toBe('2026-09-17T01:23:45.000Z');
  });

  it('keeps the company, service area, project types and track', () => {
    expect(r().company).toBe('Rivera Pool Remodeling');
    expect(r().service_areas).toBe('Los Angeles County — San Fernando Valley');
    expect(r().primary_services).toEqual(['Pool resurfacing', 'Tile & coping']);
    expect(r().track).toBe('pay_per_lead');
  });

  it('keeps the source pathname and the sink statuses', () => {
    expect(r().source_path).toBe('/apply');
    expect(r().sinks).toEqual({ webhook: 'failed', supabase: 'failed' });
  });

  it('keeps sanitized error categories', () => {
    expect(r().error_categories).toEqual(['webhook_http_500', 'supabase_error']);
  });

  it('copies arrays rather than aliasing the source record', () => {
    const out = r();
    out.primary_services.push('mutated');
    expect(fullRecord.primary_services).toEqual([
      'Pool resurfacing',
      'Tile & coping',
    ]);
  });
});

describe('categorizeError', () => {
  it('classifies webhook failures without echoing the message', () => {
    expect(categorizeError('webhook: Webhook responded 500 Internal Server Error'))
      .toBe('webhook_http_500');
    expect(categorizeError('webhook: Webhook responded 404 Not Found'))
      .toBe('webhook_http_404');
    expect(categorizeError('webhook: The operation was aborted'))
      .toBe('webhook_timeout');
    expect(categorizeError('webhook: fetch failed')).toBe('webhook_unreachable');
    expect(categorizeError('webhook: something odd')).toBe('webhook_error');
  });

  it('classifies supabase failures', () => {
    expect(categorizeError('supabase: Supabase insert failed: relation does not exist'))
      .toBe('supabase_error');
    expect(categorizeError('supabase: fetch failed')).toBe('supabase_unreachable');
  });

  it('falls back to a generic category', () => {
    expect(categorizeError('postgresql://user:pw@host/db blew up')).toBe(
      'unknown_error'
    );
  });

  it('returns a category, never the input', () => {
    const raw = 'webhook: https://hooks.example.com/ZZTOKENMARKERZZ failed';
    expect(categorizeError(raw)).not.toContain('ZZTOKENMARKERZZ');
    expect(categorizeError(raw)).not.toContain('hooks.example.com');
  });

  it('de-duplicates categories in the redacted output', () => {
    const out = redactForLog(fullRecord as RedactableRecord, {
      ...context,
      errors: [
        'webhook: Webhook responded 500 a',
        'webhook: Webhook responded 500 b',
      ],
    });
    expect(out.error_categories).toEqual(['webhook_http_500']);
  });
});

describe('toLogPath', () => {
  it('returns the pathname only', () => {
    expect(toLogPath('https://homequotenet.com/pool-contractors?x=1#y')).toBe(
      '/pool-contractors'
    );
  });

  it('handles a missing source', () => {
    expect(toLogPath(null)).toBeNull();
  });

  it('strips the query from a non-absolute value', () => {
    expect(toLogPath('/apply?utm=zzmarkerzz')).toBe('/apply');
    expect(toLogPath('/apply?utm=zzmarkerzz')).not.toContain('zzmarkerzz');
  });
});

describe('newSubmissionRef', () => {
  it('is prefixed and short', () => {
    const ref = newSubmissionRef();
    expect(ref.startsWith('hq_')).toBe(true);
    expect(ref.length).toBeLessThanOrEqual(16);
  });

  it('is not derived from the applicant details', () => {
    // Two refs generated back to back must differ, which a hash of the record
    // would not. Guards against anyone "improving" this into a content hash.
    const a = newSubmissionRef();
    const b = newSubmissionRef();
    expect(a).not.toBe(b);
  });
});
