import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { industries } from '@/content/industries';
import {
  applicationSchema,
  SERVICES_BY_NICHE,
  PRIMARY_SERVICES,
  GENERAL_SERVICES,
  isServiceNicheKey,
} from '@/lib/validation/application';

const base = {
  first_name: 'Sam',
  last_name: 'Rivera',
  company: 'Rivera Roofing',
  phone: '(818) 555-0142',
  email: 'sam@riveraroofing.com',
  website: 'riveraroofing.com',
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

describe('industry service options', () => {
  it('keeps the pool list as the default set', () => {
    expect(SERVICES_BY_NICHE.pool).toBe(PRIMARY_SERVICES);
  });

  it.each(Object.entries(SERVICES_BY_NICHE))(
    'accepts every %s service in an application',
    (_key, services) => {
      const r = applicationSchema.safeParse({ ...base, primary_services: [...services] });
      expect(r.success).toBe(true);
    }
  );

  it('accepts every service on the general /apply list', () => {
    const r = applicationSchema.safeParse({ ...base, primary_services: [...GENERAL_SERVICES] });
    expect(r.success).toBe(true);
  });

  it('still rejects a service no page offers', () => {
    const r = applicationSchema.safeParse({ ...base, primary_services: ['Gutter cleaning'] });
    expect(r.success).toBe(false);
  });

  it('recognises niche keys and nothing else', () => {
    expect(isServiceNicheKey('roofing')).toBe(true);
    expect(isServiceNicheKey('plumbing')).toBe(false);
    expect(isServiceNicheKey(undefined)).toBe(false);
  });
});

describe('industry pages content', () => {
  it('has the five expected routes, each unique', () => {
    const slugs = industries.map((i) => i.slug);
    expect(slugs).toEqual([
      'general-contractors',
      'roofing',
      'hvac',
      'fencing',
      'pool-contractors',
    ]);
    expect(new Set(industries.map((i) => i.key)).size).toBe(industries.length);
  });

  it.each(industries.map((i) => [i.slug, i] as const))(
    '%s has complete sections',
    (_slug, industry) => {
      expect(industry.pains.items).toHaveLength(5);
      expect(industry.steps).toHaveLength(4);
      expect(industry.services.items.length).toBeGreaterThanOrEqual(8);
      expect(industry.reasons).toHaveLength(8);
      expect(industry.faq.length).toBeGreaterThanOrEqual(8);
      expect(new Set(industry.faq.map((f) => f.question)).size).toBe(industry.faq.length);
      expect(industry.seo.title.length).toBeLessThanOrEqual(70);
      expect(industry.seo.description.length).toBeLessThanOrEqual(220);
    }
  );

  it.each(industries.map((i) => [i.slug, i] as const))(
    '%s only references images that exist',
    (_slug, industry) => {
      for (const photo of [industry.imagery.hero, ...industry.imagery.gallery]) {
        expect(existsSync(path.join(process.cwd(), 'public', photo.src))).toBe(true);
        expect(photo.alt.length).toBeGreaterThan(10);
      }
    }
  );

  it('credits every stock photo outside the pool page', () => {
    for (const industry of industries.filter((i) => i.key !== 'pool')) {
      for (const photo of [industry.imagery.hero, ...industry.imagery.gallery]) {
        expect(photo.credit?.url).toMatch(/^https:\/\/unsplash\.com\/photos\//);
      }
    }
  });

  it('never promises outcomes in page copy', () => {
    // Phrases the compliance rules in content/site.ts rule out.
    const banned = /guaranteed (results|sales|jobs|appointments)|we guarantee (you|sales|results)|close rate of|\d+% (more|increase)|exclusiv|\bmeta\b|facebook|instagram/i;
    for (const industry of industries) {
      const copy = JSON.stringify({
        hero: industry.hero,
        pains: industry.pains,
        services: industry.services,
        reasons: industry.reasons,
        faq: industry.faq,
        note: industry.appointmentNote,
      });
      expect(copy).not.toMatch(banned);
    }
  });
});

describe('site-wide marketing copy', () => {
  // Every marketing source file. The privacy policy is excluded on purpose:
  // it has to name the platforms personal data can come from.
  const roots = ['content', 'components/marketing', 'app/(marketing)'];
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(entry.name) && !full.includes(`privacy${path.sep}`)) files.push(full);
    }
  };
  for (const root of roots) walk(path.join(process.cwd(), root));

  it.each(files.map((f) => [path.relative(process.cwd(), f)] as const))(
    '%s never claims exclusivity or names the ad platform',
    (rel) => {
      const text = readFileSync(path.join(process.cwd(), rel), 'utf8');
      expect(text).not.toMatch(/exclusiv/i);
      expect(text).not.toMatch(/\bMeta\b|Facebook|Instagram|Ads Manager/);
    }
  );
});
