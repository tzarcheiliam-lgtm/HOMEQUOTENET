import { describe, expect, it } from 'vitest';
import {
  parseLeadDescription,
  humanizeToken,
  displayValue,
  formatLeadAge,
} from '@/lib/leads/display';

describe('parseLeadDescription', () => {
  it('parses a JSON blob into human-readable fields instead of raw JSON', () => {
    const raw = JSON.stringify({
      zip: '91607',
      service: 'full_remodel',
      timeline: '1_3_months',
      homeowner: 'yes',
    });
    const parsed = parseLeadDescription(raw);
    expect(parsed.isStructured).toBe(true);
    expect(parsed.fields.map((f) => f.value)).not.toContain(raw);
    const byKey = Object.fromEntries(parsed.fields.map((f) => [f.key, f.value]));
    expect(byKey.zip).toBe('91607');
    expect(byKey.service).toBe('Full Remodel');
    expect(byKey.timeline).toBe('1-3 Months');
    expect(byKey.homeowner).toBe('Yes');
    // Never render the raw JSON string anywhere in the output.
    expect(JSON.stringify(parsed)).not.toContain('{"zip"');
  });

  it('pulls a notes/description field out as free text, not a chip', () => {
    const raw = JSON.stringify({ zip: '90210', notes: 'Wants a quote ASAP' });
    const parsed = parseLeadDescription(raw);
    expect(parsed.text).toBe('Wants a quote ASAP');
    expect(parsed.fields.some((f) => f.key === 'notes')).toBe(false);
  });

  it('falls back to plain text when the value is not JSON', () => {
    const parsed = parseLeadDescription('Homeowner wants a full kitchen remodel.');
    expect(parsed.isStructured).toBe(false);
    expect(parsed.text).toBe('Homeowner wants a full kitchen remodel.');
  });

  it('falls back to plain text when JSON.parse fails on JSON-looking input', () => {
    const parsed = parseLeadDescription('{not valid json');
    expect(parsed.isStructured).toBe(false);
    expect(parsed.text).toBe('{not valid json');
  });

  it('treats null/empty input as no description', () => {
    expect(parseLeadDescription(null)).toEqual({ isStructured: false, fields: [], text: null });
    expect(parseLeadDescription('   ')).toEqual({ isStructured: false, fields: [], text: null });
  });

  it('never crashes on a JSON array', () => {
    const parsed = parseLeadDescription('[1,2,3]');
    expect(parsed.isStructured).toBe(false);
  });
});

describe('humanizeToken', () => {
  it('converts snake_case enums to Title Case', () => {
    expect(humanizeToken('full_remodel')).toBe('Full Remodel');
  });

  it('joins numeric ranges with a dash', () => {
    expect(humanizeToken('1_3_months')).toBe('1-3 Months');
  });

  it('leaves already-human text alone', () => {
    expect(humanizeToken('1-3 months')).toBe('1-3 months');
  });
});

describe('displayValue', () => {
  it('falls back to "Not provided" for empty values', () => {
    expect(displayValue(null)).toBe('Not provided');
    expect(displayValue(undefined)).toBe('Not provided');
    expect(displayValue('')).toBe('Not provided');
  });

  it('passes through real values', () => {
    expect(displayValue('91607')).toBe('91607');
  });
});

describe('formatLeadAge', () => {
  it('formats minutes for a recent timestamp', () => {
    const iso = new Date(Date.now() - 12 * 60_000).toISOString();
    expect(formatLeadAge(iso)).toBe('12 minutes');
  });

  it('returns null for missing timestamps', () => {
    expect(formatLeadAge(null)).toBeNull();
  });
});
