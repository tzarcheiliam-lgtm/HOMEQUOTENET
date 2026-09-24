import { describe, it, expect } from 'vitest';
import { normalizePhone, normalizeEmail } from '@/lib/leads/normalize';

describe('normalizePhone', () => {
  it('normalizes the three audit example inputs to the same E.164 value', () => {
    const expected = '+18185551234';
    expect(normalizePhone('8185551234')).toBe(expected);
    expect(normalizePhone('(818) 555-1234')).toBe(expected);
    expect(normalizePhone('+1 818-555-1234')).toBe(expected);
  });

  it('handles 11-digit with leading 1', () => {
    expect(normalizePhone('18185551234')).toBe('+18185551234');
  });

  it('returns null for empty / junk', () => {
    expect(normalizePhone('')).toBeNull();
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone('abc')).toBeNull();
  });
});

describe('normalizeEmail', () => {
  it('lowercases and trims', () => {
    expect(normalizeEmail('  Lead@Example.COM ')).toBe('lead@example.com');
  });
  it('returns null for empty', () => {
    expect(normalizeEmail('   ')).toBeNull();
    expect(normalizeEmail(undefined)).toBeNull();
  });
});
