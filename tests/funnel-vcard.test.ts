import { describe, expect, it } from 'vitest';
import { buildContactVCard, vcardFileName, vcardPhone } from '@/lib/funnels/vcard';

const base = { clientName: 'Pool Masters, LA', industry: 'Pool remodeling' };

describe('funnel contact card', () => {
  it('normalises US phones and rejects bad ones', () => {
    expect(vcardPhone('(818) 555-0123')).toBe('+18185550123');
    expect(vcardPhone('1-818-555-0123')).toBe('+18185550123');
    expect(vcardPhone('123')).toBeNull();
  });
  it('builds a vCard with escaped fields', () => {
    const v = buildContactVCard({ ...base, contactCard: { phone: '(818) 555-0123', email: 'a@b.com', website: 'https://x.com' } })!;
    expect(v).toContain('FN:Pool Masters\\, LA');
    expect(v).toContain('TEL;TYPE=WORK,VOICE:+18185550123');
    expect(v).toContain('EMAIL;TYPE=WORK:a@b.com');
    expect(v.startsWith('BEGIN:VCARD\r\n')).toBe(true);
  });
  it('returns null without a usable phone', () => {
    expect(buildContactVCard(base)).toBeNull();
    expect(buildContactVCard({ ...base, contactCard: { phone: '123' } })).toBeNull();
  });
  it('makes a safe file name', () => expect(vcardFileName('Pool Masters, LA')).toBe('pool-masters-la.vcf'));
});
