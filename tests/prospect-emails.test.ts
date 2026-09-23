import { describe, expect, it, vi } from 'vitest';
import { buildMoreInfoAfterCallEmail } from '@/lib/emails/template';
import { buildRawGmailMessage, deliverGmailWithAccessToken } from '@/lib/emails/gmail-message';
import { decryptToken, encryptToken } from '@/lib/emails/token-crypto';

describe('More info after our call template', () => {
  it('personalizes only from known contact, company, service, and sender data', () => {
    const draft = buildMoreInfoAfterCallEmail(
      { company_name: 'Pacific Pools', primary_services: ['pool remodeling', 'new pool construction'] },
      'Jordan Lee',
      'Liam Cohen'
    );
    expect(draft.subject).toContain('Pacific Pools');
    expect(draft.message).toContain('Hi Jordan,');
    expect(draft.message).toContain('pool remodeling and new pool construction');
    expect(draft.message).toContain('$125 per booked appointment');
    expect(draft.message).toContain('no upfront payment for a batch of leads');
    expect(draft.message).toContain('15-minute call');
    expect(draft.message).not.toMatch(/\{\{|\[.*?\]|exclusive|guaranteed to close|shared/i);
  });

  it('omits unknown personal details without leaving placeholders', () => {
    const draft = buildMoreInfoAfterCallEmail(
      { company_name: 'Pacific Pools', primary_services: [] },
      '',
      null
    );
    expect(draft.message).toContain('Hi,');
    expect(draft.message).toContain('pool projects');
    expect(draft.message).not.toContain('undefined');
    expect(draft.message).not.toContain('null');
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

  it('builds a plain-text MIME message and returns a successful Gmail id', async () => {
    const request = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      void input;
      void init;
      return new Response(JSON.stringify({ id: 'gmail-message-1' }), { status: 200 });
    });
    const result = await deliverGmailWithAccessToken(
      'access-token',
      { fromEmail: 'hello@example.com', toEmail: 'jordan@example.com', subject: 'Follow up', message: 'Hello Jordan' },
      request as typeof fetch
    );
    expect(result.id).toBe('gmail-message-1');
    const init = request.mock.calls[0][1] as RequestInit;
    const payload = JSON.parse(String(init.body));
    const mime = Buffer.from(payload.raw, 'base64url').toString('utf8');
    expect(mime).toContain('From: HomeQuote Network <hello@example.com>');
    expect(mime).toContain('To: jordan@example.com');
    expect(mime).toContain('Hello Jordan');
  });

  it('throws the provider error and never reports a failed request as sent', async () => {
    const request = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      void input;
      void init;
      return new Response(JSON.stringify({ error: { message: 'Invalid recipient' } }), { status: 400 });
    });
    await expect(
      deliverGmailWithAccessToken(
        'access-token',
        { fromEmail: 'hello@example.com', toEmail: 'bad@example.com', subject: 'Follow up', message: 'Hello' },
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
    });
    expect(Buffer.from(raw, 'base64url').toString('utf8')).toContain('Subject: =?UTF-8?B?');
  });
});
