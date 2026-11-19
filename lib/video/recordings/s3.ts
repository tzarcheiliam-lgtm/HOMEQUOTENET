import { createHash, createHmac } from 'node:crypto';

/**
 * Minimal AWS Signature V4 query-string signing for any S3-compatible store (Cloudflare R2,
 * Supabase Storage's S3 endpoint, AWS S3, Backblaze B2). Used for video call recordings (§51):
 * short-lived links to watch / download a recording, and deleting files when they expire.
 * No SDK: one pure function, checked against AWS's published example in the tests.
 *
 * Path-style addressing: <endpoint path>/<bucket>/<key> (what LiveKit Egress uploads with,
 * forcePathStyle). An empty bucket signs <endpoint>/<key> (virtual-hosted endpoints).
 */
export interface S3Target {
  endpoint: string;
  region: string;
  accessKey: string;
  secret: string;
  bucket: string;
}

export interface PresignInput {
  method: 'GET' | 'DELETE' | 'HEAD';
  key: string;
  /** Seconds the link stays valid (1 to 604800). */
  expiresSec: number;
  /** Extra signed query params, e.g. response-content-disposition. */
  query?: Record<string, string>;
  now?: Date;
}

/** RFC 3986 encoding as SigV4 wants it (encodeURIComponent leaves !'()* alone). */
const enc = (s: string) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
const encPath = (p: string) => p.split('/').map(enc).join('/');
const hmac = (key: Buffer | string, data: string) => createHmac('sha256', key).update(data, 'utf8').digest();
const sha256 = (data: string) => createHash('sha256').update(data, 'utf8').digest('hex');

export function presignS3Url(t: S3Target, input: PresignInput): string {
  const url = new URL(t.endpoint);
  const base = url.pathname.replace(/\/+$/, '');
  const path = `${base}/${t.bucket ? `${encPath(t.bucket)}/` : ''}${encPath(input.key.replace(/^\/+/, ''))}`;
  const now = input.now ?? new Date();
  const amzDate = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const day = amzDate.slice(0, 8);
  const scope = `${day}/${t.region}/s3/aws4_request`;
  const expires = Math.max(1, Math.min(604_800, Math.floor(input.expiresSec)));
  const params: Record<string, string> = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${t.accessKey}/${scope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(expires),
    'X-Amz-SignedHeaders': 'host',
    ...(input.query ?? {}),
  };
  const query = Object.keys(params)
    .sort()
    .map((k) => `${enc(k)}=${enc(params[k])}`)
    .join('&');
  const canonical = [input.method, path, query, `host:${url.host}`, '', 'host', 'UNSIGNED-PAYLOAD'].join('\n');
  const toSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonical)].join('\n');
  const key = hmac(hmac(hmac(hmac(`AWS4${t.secret}`, day), t.region), 's3'), 'aws4_request');
  const signature = createHmac('sha256', key).update(toSign, 'utf8').digest('hex');
  return `${url.protocol}//${url.host}${path}?${query}&X-Amz-Signature=${signature}`;
}

/** Delete one object. A missing object counts as deleted. Never throws; false = try again later. */
export async function deleteS3Object(t: S3Target, key: string, fetchImpl: typeof fetch = fetch): Promise<boolean> {
  try {
    const res = await fetchImpl(presignS3Url(t, { method: 'DELETE', key, expiresSec: 300 }), { method: 'DELETE', signal: AbortSignal.timeout(15_000) });
    return res.ok || res.status === 404;
  } catch {
    return false;
  }
}

/** "attachment; filename=..." safe for any name (ASCII fallback + RFC 5987). */
export function attachmentDisposition(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  return `attachment; filename="${ascii}"; filename*=UTF-8''${enc(filename)}`;
}
