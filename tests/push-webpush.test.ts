import { createECDH, randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import type { IncomingMessage } from 'node:http';
import https from 'node:https';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import webpush from 'web-push';

vi.mock('server-only', () => ({}));

/**
 * The real Web Push transport (VAPID JWT + aes128gcm payload encryption) against
 * a local stand-in for a push service, with a browser-shaped subscription.
 */
let server: https.Server;
let haveOpenssl = true;
let base = '';
const received: { headers: IncomingMessage['headers']; body: Buffer }[] = [];
let respondWith = 201;

beforeAll(async () => {
  const keys = webpush.generateVAPIDKeys();
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = keys.publicKey;
  process.env.VAPID_PRIVATE_KEY = keys.privateKey;
  process.env.VAPID_SUBJECT = 'mailto:test@homequotenet.com';
  // web-push always speaks https, so the stand-in push service needs a (throwaway, self-signed) cert.
  let cert: { key: Buffer; cert: Buffer };
  try {
    const dir = mkdtempSync(join(tmpdir(), 'hq-push-'));
    execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', join(dir, 'k.pem'), '-out', join(dir, 'c.pem'), '-days', '1', '-subj', '/CN=127.0.0.1'], { stdio: 'ignore' });
    cert = { key: readFileSync(join(dir, 'k.pem')), cert: readFileSync(join(dir, 'c.pem')) };
  } catch {
    haveOpenssl = false;
    return;
  }
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  server = https.createServer(cert, (req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      received.push({ headers: req.headers, body: Buffer.concat(chunks) });
      res.statusCode = respondWith;
      res.end(respondWith === 410 ? 'push subscription has unsubscribed or expired' : '');
    });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  base = `https://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => new Promise<void>((r) => (haveOpenssl ? server.close(() => r()) : r())));

function browserSubscription() {
  const ecdh = createECDH('prime256v1');
  ecdh.generateKeys();
  return {
    endpoint: `${base}/push/abc`,
    p256dh: ecdh.getPublicKey().toString('base64url'),
    auth: randomBytes(16).toString('base64url'),
  };
}

describe('sendWebPush', () => {
  beforeEach((ctx) => {
    if (!haveOpenssl) ctx.skip();
  });

  it('sends an encrypted, VAPID-signed, high-urgency push', async () => {
    const { sendWebPush, isPushConfigured } = await import('@/lib/notifications/webpush');
    expect(isPushConfigured()).toBe(true);
    respondWith = 201;
    const r = await sendWebPush(browserSubscription(), { title: 'New Lead', url: '/app/leads/1' });
    expect(r).toEqual({ ok: true });

    const req = received.at(-1)!;
    expect(req.headers['content-encoding']).toBe('aes128gcm');
    expect(req.headers.authorization).toMatch(/^vapid t=[\w-]+\.[\w-]+\.[\w-]+, k=/);
    expect(req.headers.urgency).toBe('high');
    expect(req.headers.ttl).toBe(String(60 * 60 * 24));
    // Encrypted: the plaintext must not be readable on the wire.
    expect(req.body.toString('utf8')).not.toContain('New Lead');
    expect(req.body.length).toBeGreaterThan(60);
  });

  it('reports an expired subscription (410) as gone so it gets deleted', async () => {
    const { sendWebPush } = await import('@/lib/notifications/webpush');
    respondWith = 410;
    const r = await sendWebPush(browserSubscription(), { title: 'x' });
    expect(r).toMatchObject({ ok: false, gone: true, statusCode: 410 });
  });

  it('treats other failures as retryable, not gone', async () => {
    const { sendWebPush } = await import('@/lib/notifications/webpush');
    respondWith = 503;
    const r = await sendWebPush(browserSubscription(), { title: 'x' });
    expect(r).toMatchObject({ ok: false, gone: false, statusCode: 503 });
  });
});
