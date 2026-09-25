import { describe, expect, it } from 'vitest';
import { renderEmailTemplate, findUnknownVariables, EMAIL_VARIABLE_FIELDS, variablesIn } from '@/lib/emails/variables';
import { EMAIL_TEMPLATE_LIBRARY, buildEmailTemplateSeedRows } from '@/lib/emails/template-library';
import { buildBrandedEmailHtml, buildBrandedEmailText } from '@/lib/emails/template';

describe('renderEmailTemplate', () => {
  it('substitutes known lead/appointment/contractor/homequote fields', () => {
    const html = renderEmailTemplate('Hi {{lead.first_name}}, see you {{appointment.date}} with {{contractor.name}}. Call {{homequote.phone}}.', {
      lead: { first_name: 'Sarah' },
      appointment: { date: 'Thursday' },
      contractor: { name: 'Blue Wave Pools' },
      homequote: { phone: '555-0000' },
    });
    expect(html).toBe('Hi Sarah, see you Thursday with Blue Wave Pools. Call 555-0000.');
  });

  it('resolves lead.full_name from first/last name', () => {
    const html = renderEmailTemplate('{{lead.full_name}}', { lead: { first_name: 'Sarah', last_name: 'Nguyen' } });
    expect(html).toBe('Sarah Nguyen');
  });

  it('renders unknown or missing fields as empty string, never leaves the token or throws', () => {
    expect(renderEmailTemplate('Hi {{lead.first_name}}!', {})).toBe('Hi !');
    expect(renderEmailTemplate('{{not.a.real.field}}', {})).toBe('');
  });

  it('derives homequote.portal_url from site_url when not set explicitly', () => {
    expect(renderEmailTemplate('{{homequote.portal_url}}', { homequote: { siteUrl: 'https://homequotenet.com' } })).toBe(
      'https://homequotenet.com/sign-in'
    );
  });
});

describe('findUnknownVariables', () => {
  it('flags fields outside the canonical registry', () => {
    expect(findUnknownVariables('Hi {{lead.first_name}}, your {{billing.amount}} is due')).toEqual(['billing.amount']);
  });

  it('returns nothing for a fully-resolvable template', () => {
    expect(findUnknownVariables('Hi {{lead.first_name}}, {{contractor.name}} will call {{homequote.phone}}')).toEqual([]);
  });
});

describe('email template library', () => {
  it('has no template referencing a variable outside the canonical, resolvable registry', () => {
    for (const template of EMAIL_TEMPLATE_LIBRARY) {
      const tokens = [...variablesIn(template.subject), ...variablesIn(template.paragraphs.join('\n')), ...(template.cta ? variablesIn(template.cta.url) : [])];
      const unknown = tokens.filter((t) => !EMAIL_VARIABLE_FIELDS.includes(t));
      expect(unknown, `${template.key} references unresolvable variables: ${unknown.join(', ')}`).toEqual([]);
    }
  });

  it('has unique, slug-safe keys for every template', () => {
    const keys = EMAIL_TEMPLATE_LIBRARY.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const key of keys) expect(key).toMatch(/^[a-z][a-z0-9_]*$/);
  });

  it('seeds exactly 48 branded rows with rendered HTML and text bodies', () => {
    const rows = buildEmailTemplateSeedRows('https://homequotenet.com');
    expect(rows).toHaveLength(48);
    for (const row of rows) {
      expect(row.html_body).toContain('<div');
      expect(row.text_body.length).toBeGreaterThan(0);
      expect(row.is_system).toBe(true);
      expect(row.is_active).toBe(true);
    }
  });

  it('covers every documented template category', () => {
    const categories = new Set(EMAIL_TEMPLATE_LIBRARY.map((t) => t.category));
    expect(categories).toEqual(
      new Set([
        'Homeowner Follow-Up',
        'Appointments',
        'Estimate Follow-Up',
        'Contractor Sales',
        'Contractor Onboarding',
        'Upsells',
        'Billing',
        'Reporting',
        'Internal Notifications',
      ])
    );
  });
});

describe('buildBrandedEmailHtml / buildBrandedEmailText', () => {
  it('escapes paragraph text so raw HTML in content cannot inject markup', () => {
    const html = buildBrandedEmailHtml(['<script>alert(1)</script>'], { logoUrl: 'https://example.com/logo.png' });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('includes a CTA button only when both text and url are supplied', () => {
    const withCta = buildBrandedEmailHtml(['Hi'], { logoUrl: 'https://example.com/logo.png', ctaText: 'Open portal', ctaUrl: 'https://example.com' });
    const withoutCta = buildBrandedEmailHtml(['Hi'], { logoUrl: 'https://example.com/logo.png' });
    expect(withCta).toContain('Open portal');
    expect(withoutCta).not.toContain('<a href');
  });

  it('plain-text fallback has no HTML tags', () => {
    const text = buildBrandedEmailText(['Hi there', 'Second paragraph']);
    expect(text).not.toMatch(/<[^>]+>/);
    expect(text).toContain('Hi there');
    expect(text).toContain('HomeQuote Network');
  });
});
