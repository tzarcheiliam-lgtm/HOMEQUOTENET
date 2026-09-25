import 'server-only';
import { lookup as dnsLookup, type LookupAddress } from 'node:dns';
import { request } from 'node:https';
import { BlockList, isIP } from 'node:net';

/**
 * SSRF protection for the send_webhook workflow action.
 *
 * A URL check alone is not enough: a public-looking hostname can resolve to
 * 127.0.0.1, 10.x, 169.254.169.254 (cloud metadata) etc., and can change what
 * it resolves to between a pre-check and the real request (DNS rebinding).
 * So the request is made with a custom DNS `lookup` that validates every
 * resolved address at connection time — the address checked is the address
 * connected to. Redirects are never followed.
 */

const blocked = new BlockList();
for (const [net, prefix] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12],
  ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.88.99.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15],
  ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4],
] as const) blocked.addSubnet(net, prefix, 'ipv4');
for (const [net, prefix] of [
  ['::', 128], ['::1', 128], ['fc00::', 7], ['fe80::', 10], ['fec0::', 10], ['ff00::', 8], ['2001:db8::', 32], ['100::', 64],
] as const) blocked.addSubnet(net, prefix, 'ipv6');

const BLOCKED_HOST_SUFFIXES = ['.localhost', '.local', '.internal', '.lan', '.home.arpa'];

/** IPv4 embedded in IPv4-mapped (::ffff:a.b.c.d) or NAT64 (64:ff9b::a.b.c.d) addresses. */
function embeddedIpv4(ip: string): string | null {
  const m = ip.toLowerCase().match(/^(?:::ffff:|64:ff9b::)(\d+\.\d+\.\d+\.\d+)$/);
  if (m) return m[1];
  const hex = ip.toLowerCase().match(/^(?:::ffff:|64:ff9b::)([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (!hex) return null;
  const a = parseInt(hex[1], 16), b = parseInt(hex[2], 16);
  return `${a >> 8}.${a & 255}.${b >> 8}.${b & 255}`;
}

/** True for loopback, private, link-local, metadata, CGNAT, multicast, reserved and documentation ranges. */
export function isBlockedAddress(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) return blocked.check(ip, 'ipv4');
  if (family === 6) {
    const v4 = embeddedIpv4(ip);
    if (v4) return blocked.check(v4, 'ipv4');
    return blocked.check(ip, 'ipv6');
  }
  return true; // not an IP at all: never connect to it
}

export type WebhookUrlCheck = { ok: true; url: URL } | { ok: false; reason: string };

/** Static checks that need no DNS: HTTPS only, no credentials, no internal hostnames or blocked literal IPs. */
export function checkWebhookUrl(raw: string): WebhookUrlCheck {
  let url: URL;
  try { url = new URL(raw); } catch { return { ok: false, reason: 'invalid_url' }; }
  if (url.protocol !== 'https:') return { ok: false, reason: 'https_required' };
  if (url.username || url.password) return { ok: false, reason: 'credentials_in_url' };
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
  if (!host || host === 'localhost' || BLOCKED_HOST_SUFFIXES.some((s) => host.endsWith(s))) return { ok: false, reason: 'internal_host' };
  if (host === 'metadata.google.internal' || host === 'metadata') return { ok: false, reason: 'internal_host' };
  if (isIP(host) && isBlockedAddress(host)) return { ok: false, reason: 'blocked_address' };
  return { ok: true, url };
}

type LookupFn = (hostname: string, options: { all: true }, cb: (err: NodeJS.ErrnoException | null, addresses: LookupAddress[]) => void) => void;

export class BlockedWebhookTargetError extends Error {
  readonly code = 'EWEBHOOKBLOCKED';
  constructor(readonly hostname: string) { super(`Webhook host ${hostname} resolves to a blocked address`); }
}

/**
 * A `lookup` for http(s).request that resolves all addresses and refuses the
 * connection if ANY of them is blocked (a host with one public and one private
 * record is treated as hostile).
 */
export function safeLookup(resolve: LookupFn = dnsLookup as unknown as LookupFn) {
  return (hostname: string, options: { all?: boolean } | number, cb: (...args: unknown[]) => void) => {
    const wantAll = typeof options === 'object' && options?.all === true;
    resolve(hostname, { all: true }, (err, addresses) => {
      if (err) return cb(err);
      if (!addresses.length || addresses.some((a) => isBlockedAddress(a.address))) return cb(new BlockedWebhookTargetError(hostname));
      if (wantAll) return cb(null, addresses);
      cb(null, addresses[0].address, addresses[0].family);
    });
  };
}

export type WebhookPostResult =
  | { ok: true; status: number }
  | { ok: false; reason: 'blocked' | 'redirect' | 'timeout' | 'network'; status?: number; detail?: string };

/**
 * POST JSON to a vetted HTTPS URL. Never follows redirects (3xx -> 'redirect').
 * `resolve` is injectable for tests; production uses the system resolver.
 */
export function postWebhook(
  rawUrl: string,
  init: { headers: Record<string, string>; body: string; timeoutMs?: number; resolve?: LookupFn }
): Promise<WebhookPostResult> {
  const check = checkWebhookUrl(rawUrl);
  if (!check.ok) return Promise.resolve({ ok: false, reason: 'blocked', detail: check.reason });
  const { url } = check;
  return new Promise((resolvePromise) => {
    const req = request(
      {
        protocol: 'https:', hostname: url.hostname.replace(/^\[|\]$/g, ''), port: url.port || 443,
        path: `${url.pathname}${url.search}`, method: 'POST',
        headers: { ...init.headers, 'Content-Length': Buffer.byteLength(init.body) },
        lookup: safeLookup(init.resolve) as never,
        timeout: init.timeoutMs ?? 10_000,
      },
      (res) => {
        res.resume(); // drain; the body is never read or stored
        const status = res.statusCode ?? 0;
        if (status >= 300 && status < 400) resolvePromise({ ok: false, reason: 'redirect', status });
        else resolvePromise({ ok: true, status });
      }
    );
    req.on('timeout', () => req.destroy(Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' })));
    req.on('error', (err: NodeJS.ErrnoException) => {
      if (err instanceof BlockedWebhookTargetError || err.code === 'EWEBHOOKBLOCKED') resolvePromise({ ok: false, reason: 'blocked', detail: 'blocked_address' });
      else if (err.code === 'ETIMEDOUT') resolvePromise({ ok: false, reason: 'timeout' });
      else resolvePromise({ ok: false, reason: 'network', detail: err.code });
    });
    req.end(init.body);
  });
}
