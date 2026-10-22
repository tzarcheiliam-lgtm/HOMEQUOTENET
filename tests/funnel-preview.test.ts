import { describe, expect, it } from 'vitest';
import { funnelPreview } from '@/lib/funnels/preview';

describe('funnel link preview', () => {
  it('gives bathroom and kitchen funnels a homeowner card', () => {
    expect(funnelPreview('Bathroom remodeling', 'bathroom-remodel')?.headline).toBe('Planning a Bathroom Remodel?');
    expect(funnelPreview('Kitchen remodeling', 'kitchen-remodel')?.headline).toBe('Planning a Kitchen Remodel?');
  });
  it('works from the industry alone or the slug alone', () => {
    expect(funnelPreview('Bathroom', 'avinash-b')?.headline).toMatch(/Bathroom/);
    expect(funnelPreview(undefined, 'kitchen-remodel')?.headline).toMatch(/Kitchen/);
    expect(funnelPreview(null, 'bathroom-remodeling-2')?.headline).toMatch(/Bathroom/);
  });
  it('keeps the site-wide card for anything else, including a funnel that is both', () => {
    expect(funnelPreview('Pool remodeling', 'pool-remodeling')).toBeNull();
    expect(funnelPreview('ADU', 'adu-ads')).toBeNull();
    expect(funnelPreview('Kitchen & bath remodeling', 'remodel')).toBeNull();
  });
  it('never uses the contractor wording', () => {
    for (const p of [funnelPreview('Kitchen', 'k'), funnelPreview('Bathroom', 'b')]) {
      expect(JSON.stringify(p).toLowerCase()).not.toMatch(/contractor leads|retainer|your calendar/);
    }
  });
});
