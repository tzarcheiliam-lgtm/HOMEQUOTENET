import { describe, expect, it } from 'vitest';
import { funnelSchema, inServiceArea, qualify } from '@/lib/funnels/schema';

const base = {
  version: 1, clientName: 'Acme', industry: 'Pools', serviceArea: { label: 'your area', zipCodes: [], zipPrefixes: [] },
  questions: [{ id: 'zip', type: 'zip', headline: 'ZIP?', options: [], showWhen: [] }],
  thankYouPage: { headline: 'Thanks', message: 'We will call.' },
};

describe('funnel with no service-area ZIPs', () => {
  const config = funnelSchema.parse(base);
  it('accepts any ZIP and qualifies', () => {
    expect(inServiceArea(config, '10001')).toBe(true);
    expect(qualify(config, { zip: '10001' })).toBe(true);
  });
  it('still enforces a ZIP list when one is given', () => {
    const limited = funnelSchema.parse({ ...base, serviceArea: { ...base.serviceArea, zipPrefixes: ['913'] } });
    expect(inServiceArea(limited, '91364')).toBe(true);
    expect(inServiceArea(limited, '10001')).toBe(false);
  });
});
