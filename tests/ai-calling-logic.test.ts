import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { inWindow, nextEligible, resolveZones } from '@/lib/ai-calling/timezone';
import { evaluateEligibility, hasCallConsent, validPhone, type EligibilityInput } from '@/lib/ai-calling/eligibility';

const W = { startHour: 8, endHour: 21 };
const at = (iso: string) => new Date(iso);

describe('timezone resolution', () => {
  it('resolves state, falls back to a California ZIP, and refuses to guess', () => {
    expect(resolveZones({ state: 'ca' })).toEqual(['America/Los_Angeles']);
    expect(resolveZones({ state: null, zip: '90210' })).toEqual(['America/Los_Angeles']);
    expect(resolveZones({ state: null, zip: '10001' })).toBeNull(); // ZIP only resolves CA today
    expect(resolveZones({ state: 'ZZ', zip: null })).toBeNull();
    expect(resolveZones({})).toBeNull();
  });
  it('uses every zone for states that span timezones', () => {
    expect(resolveZones({ state: 'TX' })).toEqual(['America/Chicago', 'America/Denver']);
  });
});

describe('calling window', () => {
  it('allows 8:00-20:59 local and blocks 21:00 / 07:59 (Pacific, PDT in October)', () => {
    const z = ['America/Los_Angeles'];
    expect(inWindow(at('2026-10-06T15:00:00Z'), z, W)).toBe(true);  // 08:00 PDT
    expect(inWindow(at('2026-10-06T14:59:00Z'), z, W)).toBe(false); // 07:59 PDT
    expect(inWindow(at('2026-10-07T03:59:00Z'), z, W)).toBe(true);  // 20:59 PDT
    expect(inWindow(at('2026-10-07T04:00:00Z'), z, W)).toBe(false); // 21:00 PDT
  });
  it('handles the DST change (PST in winter)', () => {
    const z = ['America/Los_Angeles'];
    expect(inWindow(at('2026-12-15T16:00:00Z'), z, W)).toBe(true);  // 08:00 PST
    expect(inWindow(at('2026-12-15T15:59:00Z'), z, W)).toBe(false); // 07:59 PST
  });
  it('multi-zone states must be inside the window in ALL zones', () => {
    const tx = ['America/Chicago', 'America/Denver'];
    expect(inWindow(at('2026-10-06T13:30:00Z'), tx, W)).toBe(false); // 08:30 CT = 07:30 MT
    expect(inWindow(at('2026-10-06T14:00:00Z'), tx, W)).toBe(true);  // 09:00 CT = 08:00 MT
    expect(inWindow(at('2026-10-07T01:59:00Z'), tx, W)).toBe(true);  // 20:59 CT
    expect(inWindow(at('2026-10-07T02:00:00Z'), tx, W)).toBe(false); // 21:00 CT
  });
  it('schedules the next eligible minute: tonight after 9pm -> 8:00 next morning', () => {
    const z = ['America/Los_Angeles'];
    const n = nextEligible(at('2026-10-07T05:30:00Z'), z, W)!; // 22:30 PDT Oct 6
    expect(n.toISOString()).toBe('2026-10-07T15:00:00.000Z');   // 08:00 PDT Oct 7
    const same = at('2026-10-06T20:00:00Z');
    expect(nextEligible(same, z, W)).toBe(same);
  });
});

const base = (o: Partial<EligibilityInput> = {}): EligibilityInput => ({
  trigger: 'auto_form', now: at('2026-10-06T20:00:00Z'), createdAt: at('2026-10-06T19:59:00Z'), maxJobAgeHours: 48,
  contractorMode: 'automatic', agentId: 'a', phoneNumberId: 'p', phone: '+13105550123',
  consent: { granted: true, at: '2026-10-06T19:59:00Z', disclosure: 'I agree that X may call, text, or email me, including using automated technology.' },
  optedOut: false, doNotCall: false, recentDuplicate: false, state: 'CA', zip: '90210', window: W, ...o,
});
const block = (o: Partial<EligibilityInput>) => { const d = evaluateEligibility(base(o)); return d.action === 'block' ? d.reason : d.action; };

describe('eligibility', () => {
  it('dispatches a fully eligible job', () => expect(evaluateEligibility(base()).action).toBe('dispatch'));
  it('blocks every failing precondition with its own reason', () => {
    expect(block({ contractorMode: 'off' })).toBe('contractor_off');
    expect(block({ contractorMode: null })).toBe('contractor_off');
    expect(block({ contractorMode: 'manual_only' })).toBe('contractor_not_automatic');
    expect(block({ agentId: null })).toBe('not_configured');
    expect(block({ phoneNumberId: ' ' })).toBe('not_configured');
    expect(block({ phone: '+1555' })).toBe('invalid_number');
    expect(block({ phone: null })).toBe('invalid_number');
    expect(block({ phone: '+442071838750' })).toBe('invalid_number'); // US/Canada numbers only
    expect(block({ optedOut: true })).toBe('opted_out');
    expect(block({ doNotCall: true })).toBe('do_not_call');
    expect(block({ recentDuplicate: true })).toBe('duplicate_recent_call');
    expect(block({ leadArchived: true })).toBe('lead_archived');
    expect(block({ state: null, zip: '10001' })).toBe('unknown_timezone');
  });
  it('requires consent wording that actually covers calls', () => {
    expect(block({ consent: { granted: false, at: null, disclosure: null } })).toBe('no_consent');
    expect(block({ consent: { granted: true, at: null, disclosure: 'may call me' } })).toBe('no_consent');
    expect(block({ consent: { granted: true, at: '2026-10-06T19:00:00Z', disclosure: null } })).toBe('no_consent');
    expect(block({ consent: { granted: true, at: '2026-10-06T19:00:00Z', disclosure: 'Lead form: Pool Remodel Quotes' } })).toBe('no_consent'); // e.g. a Meta form name
    expect(hasCallConsent(base())).toBe(true);
  });
  it('manual calls to a new contact need a recorded basis + reference instead of a disclosure', () => {
    const m = { trigger: 'manual' as const, contractorMode: 'manual_only' as const };
    expect(block({ ...m, consent: { granted: true, at: '2026-10-06T19:00:00Z', disclosure: null, basis: 'verbal', reference: 'Phone intake 10/6' } })).toBe('dispatch');
    expect(block({ ...m, consent: { granted: true, at: '2026-10-06T19:00:00Z', disclosure: null, basis: 'verbal', reference: '' } })).toBe('no_consent');
    expect(block({ ...m, consent: { granted: false, at: null, disclosure: null } })).toBe('no_consent');
  });
  it('defers (does not block) outside the calling window and names the next eligible time', () => {
    const d = evaluateEligibility(base({ now: at('2026-10-07T06:00:00Z'), createdAt: at('2026-10-07T05:59:00Z') })); // 23:00 PDT
    expect(d.action).toBe('defer');
    if (d.action === 'defer') expect(d.until.toISOString()).toBe('2026-10-07T15:00:00.000Z');
  });
  it('expires jobs that waited too long instead of calling stale leads', () => {
    expect(block({ createdAt: at('2026-10-03T00:00:00Z') })).toBe('expired');
  });
  it('validates NANP numbers', () => {
    expect(validPhone('+13105550123')).toBe(true);
    expect(validPhone('+11105550123')).toBe(false);
    expect(validPhone('3105550123')).toBe(false);
  });
});
