import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import {
  buildMoreInfoAfterCallEmail,
  buildProspectEmailHtml,
  emailLogoUrl,
} from '@/lib/emails/template';
import { buildRawGmailMessage, deliverGmailWithAccessToken } from '@/lib/emails/gmail-message';
import { decryptToken, encryptToken } from '@/lib/emails/token-crypto';

describe('More info after our call template', () => {
  it('uses only reviewed contact, company, and discussed-service details', () => {
    const draft = buildMoreInfoAfterCallEmail(
      { company_name: 'Pacific Pools' },
      'Jordan Lee',
      ['pool remodeling', 'new pool construction']
    );
    expect(draft.subject).toContain('Pacific Pools');
    expect(draft.message).toContain('Hi Jordan,');
    expect(draft.message).toContain('Pacific Pools');
    expect(draft.message).toContain('pool remodeling and new pool construction');
    expect(draft.message).toContain('specific day and time');
    expect(draft.message).toContain('contractor to meet with the homeowner');
    expect(draft.message).toContain('15-minute call with Liam');
    expect(draft.message).toContain(
      'book an appointment with Liam and see our results at https://homequotenet.com/'
    );
    expect(draft.message).not.toMatch(
      /\{\{|\[.*?\]|\$|pricing|no upfront|exclusive|guaranteed|shared/i
    );
  });

  it('omits optional services without inventing them or leaving placeholders', () => {
    const draft = buildMoreInfoAfterCallEmail({ company_name: 'Pacific Pools' }, '', []);
    expect(draft.message).toContain('Hi,');
    expect(draft.message).not.toContain('Based on our conversation');
    expect(draft.message).not.toContain('undefined');
    expect(draft.message).not.toContain('null');
  });

  it('renders a compact Gmail-safe signature with an image-blocking fallback', () => {
    const logoUrl = emailLogoUrl('https://homequote-eight.vercel.app');
    const html = buildProspectEmailHtml(
      'Hi Jordan,\n\nThanks for your time.\n\nBook with Liam and see our results at https://homequotenet.com/.',
      logoUrl
    );
    expect(html).toContain(`src="${logoUrl}"`);
    expect(html).toContain('alt="HomeQuote Network"');
    expect(html).toContain('width="72"');
    expect(html).toContain('font-family:Arial,Helvetica,sans-serif');
    expect(html).toContain('color:#082f63');
    expect(html).toContain('Liam');
    expect(html).toContain(
      '<a href="https://homequotenet.com/" style="color:#1267a8;text-decoration:underline;">homequotenet.com</a>'
    );
  });

  it('ships a real-alpha PNG for the public signature asset', () => {
    const png = readFileSync('public/images/email/homequote-logo-transparent.png');
    expect(png.subarray(1, 4).toString()).toBe('PNG');
    // PNG IHDR color type 6 is truecolor with an alpha channel.
    expect(png[25]).toBe(6);
  });
});

describe('Gmail delivery', () => {
  it('encrypts stored refresh tokens with authenticated encryption', () => {
    const key = Buffer.alloc(32, 7);
    const encrypted = encryptToken('refresh-secret', key);
    expect(encrypted).not.toContain('refresh-secret');
    expect(decryptToken(encrypted, key)).toBe('refresh-secret');
    expect(() => decryptToken(encrypted, Buffer.alloc(32, 8))).toThrow();
  });

  it('sends the exact HTML preview in a multipart Gmail message', async () => {
    const request = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      void input;
      void init;
      return new Response(JSON.stringify({ id: 'gmail-message-1' }), { status: 200 });
    });
    const html = buildProspectEmailHtml(
      'Hi Jordan,\n\nThanks for your time.',
      'https://homequote-eight.vercel.app/images/email/homequote-logo-transparent.png'
    );
    const result = await deliverGmailWithAccessToken(
      'access-token',
      {
        fromEmail: 'hello@example.com',
        toEmail: 'jordan@example.com',
        subject: 'Follow up',
        message: 'Hi Jordan,\n\nThanks for your time.',
        html,
      },
      request as typeof fetch
    );
    expect(result.id).toBe('gmail-message-1');
    const init = request.mock.calls[0][1] as RequestInit;
    const payload = JSON.parse(String(init.body));
    const mime = Buffer.from(payload.raw, 'base64url').toString('utf8');
    expect(mime).toContain('Content-Type: multipart/alternative');
    expect(mime).toContain('From: HomeQuote Network <hello@example.com>');
    expect(mime).toContain('To: jordan@example.com');
    expect(mime).toContain('Best,\r\nLiam\r\nHomeQuote Network');
    expect(mime).toContain(html);
  });

  it('throws the provider error and never reports a failed request as sent', async () => {
    const request = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      void input;
      void init;
      return new Response(JSON.stringify({ error: { message: 'Invalid recipient' } }), {
        status: 400,
      });
    });
    await expect(
      deliverGmailWithAccessToken(
        'access-token',
        {
          fromEmail: 'hello@example.com',
          toEmail: 'bad@example.com',
          subject: 'Follow up',
          message: 'Hello',
          html: '<div>Hello</div>',
        },
        request as typeof fetch
      )
    ).rejects.toThrow('Invalid recipient');
  });

  it('encodes non-ASCII subjects safely', () => {
    const raw = buildRawGmailMessage({
      fromEmail: 'hello@example.com',
      toEmail: 'jordan@example.com',
      subject: 'Following up — Pacific Pools',
      message: 'Hello',
      html: '<div>Hello</div>',
    });
    expect(Buffer.from(raw, 'base64url').toString('utf8')).toContain('Subject: =?UTF-8?B?');
  });
});
