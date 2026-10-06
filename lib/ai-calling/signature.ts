import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Fish Audio post-call webhook signature, per
 * https://docs.fish.audio/agents/monitor/webhooks#verify-the-signature
 *
 *   X-Fish-Webhook-Signature: t=<unix seconds>,v1=<hex HMAC-SHA256>
 *   v1 = HMAC_SHA256(secret, `${t}.` + rawBody)
 *
 * The timestamp is inside the MAC and must be within 5 minutes of our clock.
 * Unknown elements (a future `v2`) are ignored.
 */
export const FISH_SIGNATURE_HEADER = 'x-fish-webhook-signature';
export const FISH_TOLERANCE_SECONDS = 300;

export function verifyFishSignature(
  rawBody: string | Buffer,
  header: string | null | undefined,
  secret: string,
  nowSeconds: number = Date.now() / 1000,
): boolean {
  if (!secret || !header) return false;
  const elements = new Map<string, string>();
  for (const part of header.split(',')) {
    const i = part.indexOf('=');
    if (i > 0) elements.set(part.slice(0, i).trim(), part.slice(i + 1).trim());
  }
  const timestamp = elements.get('t') ?? '';
  const signature = elements.get('v1') ?? '';
  if (!/^\d+$/.test(timestamp) || !/^[0-9a-f]{64}$/.test(signature)) return false;
  if (Math.abs(nowSeconds - Number(timestamp)) > FISH_TOLERANCE_SECONDS) return false;
  const expected = createHmac('sha256', secret).update(`${timestamp}.`).update(rawBody).digest('hex');
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
