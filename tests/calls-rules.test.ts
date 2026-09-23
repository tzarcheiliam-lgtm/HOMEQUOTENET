import { describe, it, expect } from 'vitest';
import {
  isDialable,
  isInQueue,
  prospectPatchFor,
  requiredFieldsFor,
  validateOutcome,
  visibleFieldsFor,
} from '@/lib/calls/rules';
import { DISPOSITIONS, LOGGABLE_OUTCOMES } from '@/lib/calls/constants';

// All fixtures are synthetic. No real contractor appears anywhere in tests.
const future = (hours: number) => new Date(Date.now() + hours * 3600_000).toISOString();
const past = (hours: number) => new Date(Date.now() - hours * 3600_000).toISOString();

describe('requiredFieldsFor', () => {
  it('asks for a callback time when a callback is requested', () => {
    expect(requiredFieldsFor('callback_requested')).toEqual(['callback_at']);
  });
  it('asks for decision-maker, contact method and follow-up when interested', () => {
    expect(requiredFieldsFor('interested')).toEqual([
      'decision_maker_name',
      'best_contact_method',
      'follow_up_at',
    ]);
  });
  it('asks for the full appointment set when booked', () => {
    expect(requiredFieldsFor('appointment_booked')).toEqual([
      'appointment_at',
      'appointment_type',
      'time_zone',
      'decision_maker_name',
      'contact_info',
    ]);
  });
  it('requires explicit confirmation for do-not-call', () => {
    expect(requiredFieldsFor('do_not_call')).toEqual(['confirm_do_not_call']);
  });
  it('requires nothing extra for a plain no-answer', () => {
    expect(requiredFieldsFor('no_answer')).toEqual([]);
  });
});

describe('visibleFieldsFor', () => {
  it('always includes notes', () => {
    for (const d of DISPOSITIONS) expect(visibleFieldsFor(d.value)).toContain('notes');
  });
  it('includes every required field', () => {
    for (const d of DISPOSITIONS) {
      const visible = visibleFieldsFor(d.value);
      for (const f of requiredFieldsFor(d.value)) expect(visible).toContain(f);
    }
  });
});

describe('validateOutcome', () => {
  it('rejects an unknown outcome', () => {
    const v = validateOutcome({ outcome: 'made_up' });
    expect(v.ok).toBe(false);
    expect(v.errors.outcome).toBeTruthy();
  });
  it("rejects 'new' — it is a starting state, not something you log", () => {
    expect(LOGGABLE_OUTCOMES).not.toContain('new');
    expect(validateOutcome({ outcome: 'new' }).ok).toBe(false);
  });
  it('accepts a bare no-answer', () => {
    const v = validateOutcome({ outcome: 'no_answer' });
    expect(v.ok).toBe(true);
    expect(v.outcome).toBe('no_answer');
  });
  it('reports every missing required field at once', () => {
    const v = validateOutcome({ outcome: 'appointment_booked' });
    expect(v.ok).toBe(false);
    expect(Object.keys(v.errors).sort()).toEqual(
      ['appointment_at', 'appointment_type', 'contact_info', 'decision_maker_name', 'time_zone'].sort()
    );
  });
  it('rejects a callback in the past', () => {
    const v = validateOutcome({ outcome: 'callback_requested', callback_at: past(2) });
    expect(v.ok).toBe(false);
    expect(v.errors.callback_at).toMatch(/past/);
  });
  it('rejects an unparseable date', () => {
    const v = validateOutcome({ outcome: 'callback_requested', callback_at: 'next tuesday' });
    expect(v.ok).toBe(false);
    expect(v.errors.callback_at).toMatch(/valid date/);
  });
  it('accepts a complete callback', () => {
    const v = validateOutcome({ outcome: 'callback_requested', callback_at: future(24) });
    expect(v.ok).toBe(true);
  });
  it('accepts a complete interested outcome', () => {
    const v = validateOutcome({
      outcome: 'interested',
      decision_maker_name: 'Test Owner',
      best_contact_method: 'phone',
      follow_up_at: future(48),
    });
    expect(v.ok).toBe(true);
  });
  it('accepts a complete booked appointment', () => {
    const v = validateOutcome({
      outcome: 'appointment_booked',
      appointment_at: future(72),
      appointment_type: 'phone',
      time_zone: 'America/Los_Angeles',
      decision_maker_name: 'Test Owner',
      contact_info: 'owner@example.test',
    });
    expect(v.ok).toBe(true);
  });
  it('refuses do-not-call without the confirmation box', () => {
    expect(validateOutcome({ outcome: 'do_not_call' }).ok).toBe(false);
    expect(validateOutcome({ outcome: 'do_not_call', confirm_do_not_call: false }).ok).toBe(false);
    expect(validateOutcome({ outcome: 'do_not_call', confirm_do_not_call: true }).ok).toBe(true);
  });
});

describe('prospectPatchFor', () => {
  it('sets the callback and clears follow-up/appointment for a callback', () => {
    const at = future(24);
    const p = prospectPatchFor('callback_requested', { outcome: 'callback_requested', callback_at: at });
    expect(p).toMatchObject({
      disposition: 'callback_requested',
      next_callback_at: at,
      follow_up_at: null,
      appointment_at: null,
    });
  });
  it('clears a pending callback when a later outcome supersedes it', () => {
    const p = prospectPatchFor('not_interested', { outcome: 'not_interested' });
    expect(p.next_callback_at).toBeNull();
  });
  it('carries the decision-maker name only when given', () => {
    expect(prospectPatchFor('no_answer', { outcome: 'no_answer' })).not.toHaveProperty(
      'decision_maker_name'
    );
    expect(
      prospectPatchFor('spoke_with_dm', { outcome: 'spoke_with_dm', decision_maker_name: '  Sam  ' })
        .decision_maker_name
    ).toBe('Sam');
  });
});

describe('queue and dialability', () => {
  it('terminal outcomes leave the queue', () => {
    for (const d of ['appointment_booked', 'not_interested', 'wrong_number', 'duplicate', 'do_not_call'] as const) {
      expect(isInQueue(d)).toBe(false);
    }
  });
  it('working outcomes stay in the queue', () => {
    for (const d of ['new', 'no_answer', 'left_voicemail', 'callback_requested', 'interested'] as const) {
      expect(isInQueue(d)).toBe(true);
    }
  });
  it('a do-not-call prospect is never dialable, whatever else it has', () => {
    expect(isDialable({ disposition: 'do_not_call', phone: '8185550123' })).toBe(false);
    expect(isDialable({ disposition: 'new', phone: '8185550123', do_not_call_at: past(1) })).toBe(false);
  });
  it('a prospect without a number is not dialable', () => {
    expect(isDialable({ disposition: 'new', phone: null })).toBe(false);
    expect(isDialable({ disposition: 'new', phone: '   ' })).toBe(false);
  });
  it('an ordinary prospect with a number is dialable', () => {
    expect(isDialable({ disposition: 'no_answer', phone: '(818) 555-0123' })).toBe(true);
  });
});
