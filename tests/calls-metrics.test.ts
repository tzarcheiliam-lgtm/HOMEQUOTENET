import { describe, it, expect } from 'vitest';
import { computeMetrics, dayBoundsInZone, formatRate } from '@/lib/calls/metrics';
import type { ProspectDisposition } from '@/lib/types';

const attempt = (outcome: ProspectDisposition) => ({
  outcome,
  created_at: new Date().toISOString(),
});

describe('computeMetrics', () => {
  it('returns zeros and null rates for no activity — never 0%', () => {
    const m = computeMetrics([]);
    expect(m).toEqual({
      attempts: 0,
      dmConversations: 0,
      interested: 0,
      appointmentsBooked: 0,
      contactRate: null,
      interestRate: null,
      bookingRate: null,
    });
  });

  it('contact rate = decision-maker conversations / attempts', () => {
    const m = computeMetrics([
      attempt('no_answer'),
      attempt('left_voicemail'),
      attempt('gatekeeper'),
      attempt('spoke_with_dm'),
    ]);
    expect(m.attempts).toBe(4);
    expect(m.dmConversations).toBe(1);
    expect(m.contactRate).toBeCloseTo(0.25);
  });

  it('a gatekeeper or voicemail is not a decision-maker conversation', () => {
    const m = computeMetrics([attempt('gatekeeper'), attempt('left_voicemail')]);
    expect(m.dmConversations).toBe(0);
    expect(m.contactRate).toBe(0);
    expect(m.interestRate).toBeNull();
    expect(m.bookingRate).toBeNull();
  });

  it('interest rate = interested / decision-maker conversations', () => {
    const m = computeMetrics([
      attempt('spoke_with_dm'),
      attempt('not_interested'),
      attempt('interested'),
      attempt('interested'),
    ]);
    expect(m.dmConversations).toBe(4);
    expect(m.interested).toBe(2);
    expect(m.interestRate).toBeCloseTo(0.5);
  });

  it('booking rate = appointments booked / decision-maker conversations', () => {
    const m = computeMetrics([
      attempt('no_answer'),
      attempt('spoke_with_dm'),
      attempt('callback_requested'),
      attempt('appointment_booked'),
    ]);
    expect(m.attempts).toBe(4);
    expect(m.dmConversations).toBe(3);
    expect(m.appointmentsBooked).toBe(1);
    expect(m.bookingRate).toBeCloseTo(1 / 3);
    // Attempts, not conversations, are the contact-rate denominator.
    expect(m.contactRate).toBeCloseTo(0.75);
  });
});

describe('formatRate', () => {
  it('shows a dash for no data', () => {
    expect(formatRate(null)).toBe('—');
  });
  it('rounds to a whole percent', () => {
    expect(formatRate(0)).toBe('0%');
    expect(formatRate(1 / 3)).toBe('33%');
    expect(formatRate(0.995)).toBe('100%');
  });
});

describe('dayBoundsInZone', () => {
  it('brackets the instant inside a 24h window in the zone', () => {
    const now = new Date('2026-09-23T20:30:00Z'); // 13:30 in Los Angeles (PDT)
    const { start, end } = dayBoundsInZone(now, 'America/Los_Angeles');
    expect(start.toISOString()).toBe('2026-09-23T07:00:00.000Z');
    expect(end.toISOString()).toBe('2026-09-24T07:00:00.000Z');
    expect(now >= start && now < end).toBe(true);
  });
  it('uses the zone’s calendar day, not UTC’s', () => {
    // 02:00 UTC on the 24th is still the 23rd in Los Angeles.
    const now = new Date('2026-09-24T02:00:00Z');
    const { start } = dayBoundsInZone(now, 'America/Los_Angeles');
    expect(start.toISOString()).toBe('2026-09-23T07:00:00.000Z');
  });
});
