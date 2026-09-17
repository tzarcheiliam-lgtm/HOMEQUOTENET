import { describe, it, expect } from 'vitest';
import { applicationSchema } from '@/lib/validation/application';
import {
  checkHoneypot,
  checkFillTime,
  screenSubmission,
  MIN_FILL_SECONDS,
} from '@/lib/applications/spam';

/** A minimal submission that should always pass. */
const valid = {
  first_name: 'Sam',
  last_name: 'Rivera',
  company: 'Rivera Pool Remodeling',
  phone: '(818) 555-0142',
  email: 'sam@riverapools.com',
  website: 'riverapools.com',
  primary_services: ['Pool resurfacing'],
  service_areas: 'Los Angeles County — San Fernando Valley',
  avg_project_value: '$25,000 – $50,000',
  min_project_size: '$10,000+',
  monthly_lead_capacity: '6 – 15 per month',
  response_time: 'Within 5 minutes',
  uses_crm: 'Yes — GoHighLevel',
  track: 'pay_per_lead',
  notes: '',
  consent: 'on',
};

describe('applicationSchema', () => {
  it('accepts a complete, valid submission', () => {
    const r = applicationSchema.safeParse(valid);
    expect(r.success).toBe(true);
  });

  it('normalizes a bare domain into a URL', () => {
    const r = applicationSchema.safeParse(valid);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.website).toBe('https://riverapools.com');
  });

  it('leaves an already-qualified URL alone', () => {
    const r = applicationSchema.safeParse({
      ...valid,
      website: 'https://riverapools.com/pools',
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.website).toBe('https://riverapools.com/pools');
  });

  it('treats a blank website as null rather than an error', () => {
    const r = applicationSchema.safeParse({ ...valid, website: '' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.website).toBeNull();
  });

  it('trims whitespace from text fields', () => {
    const r = applicationSchema.safeParse({
      ...valid,
      first_name: '  Sam  ',
      company: '  Rivera Pool Remodeling ',
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.first_name).toBe('Sam');
      expect(r.data.company).toBe('Rivera Pool Remodeling');
    }
  });

  it('rejects a phone with fewer than 10 digits', () => {
    const r = applicationSchema.safeParse({ ...valid, phone: '555-0142' });
    expect(r.success).toBe(false);
  });

  it('accepts a phone with punctuation and a country code', () => {
    const r = applicationSchema.safeParse({ ...valid, phone: '+1 (818) 555-0142' });
    expect(r.success).toBe(true);
  });

  it('rejects an invalid email', () => {
    const r = applicationSchema.safeParse({ ...valid, email: 'sam@' });
    expect(r.success).toBe(false);
  });

  it('requires at least one primary service', () => {
    const r = applicationSchema.safeParse({ ...valid, primary_services: [] });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path[0] === 'primary_services')).toBe(
        true
      );
    }
  });

  it('rejects a service outside the allowed list', () => {
    const r = applicationSchema.safeParse({
      ...valid,
      primary_services: ['Weekly pool cleaning'],
    });
    expect(r.success).toBe(false);
  });

  it('rejects an unknown track', () => {
    const r = applicationSchema.safeParse({ ...valid, track: 'barter' });
    expect(r.success).toBe(false);
  });

  it('accepts the managed track', () => {
    const r = applicationSchema.safeParse({ ...valid, track: 'managed' });
    expect(r.success).toBe(true);
  });

  it('requires consent', () => {
    const r = applicationSchema.safeParse({ ...valid, consent: false });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path[0] === 'consent')).toBe(true);
    }
  });

  it('rejects a missing required field', () => {
    const { company, ...withoutCompany } = valid;
    void company;
    const r = applicationSchema.safeParse(withoutCompany);
    expect(r.success).toBe(false);
  });

  it('rejects a service area that is too short to be useful', () => {
    const r = applicationSchema.safeParse({ ...valid, service_areas: 'LA' });
    expect(r.success).toBe(false);
  });

  it('converts blank optional notes to null', () => {
    const r = applicationSchema.safeParse(valid);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.notes).toBeNull();
  });
});

describe('applicationSchema — missing fields produce readable errors', () => {
  // FormData.get() returns null for a field that was never submitted. Zod's
  // default message for that case leaks the entire list of permitted values,
  // which is unusable as a form error.
  const allNull = {
    first_name: null,
    last_name: null,
    company: null,
    phone: null,
    email: null,
    website: null,
    primary_services: null,
    service_areas: null,
    avg_project_value: null,
    min_project_size: null,
    monthly_lead_capacity: null,
    response_time: null,
    uses_crm: null,
    track: null,
    notes: null,
    consent: null,
  };

  it('fails cleanly when every field is null', () => {
    const r = applicationSchema.safeParse(allNull);
    expect(r.success).toBe(false);
  });

  it('never leaks a raw enum list or a type error into a message', () => {
    const r = applicationSchema.safeParse(allNull);
    expect(r.success).toBe(false);
    if (r.success) return;

    for (const issue of r.error.issues) {
      expect(issue.message).not.toContain('Expected');
      expect(issue.message).not.toContain('received null');
      expect(issue.message).not.toContain('|');
    }
  });

  it('gives the intended message for each select', () => {
    const r = applicationSchema.safeParse(allNull);
    expect(r.success).toBe(false);
    if (r.success) return;

    const byField = new Map(r.error.issues.map((i) => [i.path[0], i.message]));
    expect(byField.get('avg_project_value')).toBe(
      'Select an average project value'
    );
    expect(byField.get('min_project_size')).toBe(
      'Select a minimum project size'
    );
    expect(byField.get('monthly_lead_capacity')).toBe(
      'Select how many additional appointments you can handle'
    );
    expect(byField.get('response_time')).toBe(
      'Select your typical response time'
    );
    expect(byField.get('uses_crm')).toBe('Tell us whether you use a CRM');
    expect(byField.get('track')).toBe('Choose a preferred arrangement');
    expect(byField.get('first_name')).toBe('First name is required');
  });

  it('treats a null optional field as null, not an error', () => {
    const r = applicationSchema.safeParse({
      ...valid,
      notes: null,
      website: null,
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.notes).toBeNull();
      expect(r.data.website).toBeNull();
    }
  });

  it('accepts a single service submitted as a bare string', () => {
    // A form with one checkbox ticked can arrive as a string rather than an array.
    const r = applicationSchema.safeParse({
      ...valid,
      primary_services: 'Pool decking',
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.primary_services).toEqual(['Pool decking']);
  });
});

describe('spam screening', () => {
  it('flags a filled honeypot', () => {
    expect(checkHoneypot('http://spam.example')).toEqual({
      spam: true,
      reason: 'honeypot',
    });
  });

  it('passes an empty or whitespace-only honeypot', () => {
    expect(checkHoneypot('').spam).toBe(false);
    expect(checkHoneypot('   ').spam).toBe(false);
    expect(checkHoneypot(null).spam).toBe(false);
    expect(checkHoneypot(undefined).spam).toBe(false);
  });

  it('flags a submission faster than the minimum fill time', () => {
    const now = 1_000_000;
    const startedAt = now - (MIN_FILL_SECONDS - 1) * 1000;
    expect(checkFillTime(String(startedAt), now)).toEqual({
      spam: true,
      reason: 'too_fast',
    });
  });

  it('passes a submission that took long enough', () => {
    const now = 1_000_000;
    const startedAt = now - (MIN_FILL_SECONDS + 5) * 1000;
    expect(checkFillTime(String(startedAt), now).spam).toBe(false);
  });

  it('does not penalise a missing or unusable timestamp', () => {
    // JS may be disabled or the field may not have been set — never reject a
    // real applicant on this check alone.
    expect(checkFillTime(undefined, 1_000_000).spam).toBe(false);
    expect(checkFillTime('', 1_000_000).spam).toBe(false);
    expect(checkFillTime('0', 1_000_000).spam).toBe(false);
    expect(checkFillTime('not-a-number', 1_000_000).spam).toBe(false);
  });

  it('does not treat a future timestamp as spam', () => {
    expect(checkFillTime(String(2_000_000), 1_000_000).spam).toBe(false);
  });

  it('reports the honeypot first when both checks would trip', () => {
    const now = 1_000_000;
    const r = screenSubmission({
      honeypot: 'filled',
      startedAt: String(now - 100),
      now,
    });
    expect(r).toEqual({ spam: true, reason: 'honeypot' });
  });

  it('passes a genuine submission', () => {
    const now = 1_000_000;
    const r = screenSubmission({
      honeypot: '',
      startedAt: String(now - 45_000),
      now,
    });
    expect(r.spam).toBe(false);
  });
});
