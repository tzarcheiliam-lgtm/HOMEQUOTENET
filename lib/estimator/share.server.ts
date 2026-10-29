import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { encodeFunnelSelection } from '@/lib/estimator/funnel/engine';
import type { FunnelSelection, FunnelSpec } from '@/lib/estimator/funnel/types';
import { shareDesignPath } from './share';

/**
 * Signature on a shared design link (lib/estimator/share.ts): HMAC of
 * "<slug>?<canonical picks>" with a key derived from ESTIMATOR_RENDER_SECRET
 * (else the service role key), 16 bytes, base64url. Only the lead route signs
 * (after the contact step), so the ballpark on the shared page is the one the
 * homeowner was shown. No expiry: the picks are not personal and the price is
 * recomputed on every view.
 */
function shareKey(): Buffer | null {
  const secret = process.env.ESTIMATOR_RENDER_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  return secret ? createHmac('sha256', secret).update('hqn-estimator-share-v1').digest() : null;
}

function mac(slug: string, query: string): string | null {
  const key = shareKey();
  return key ? createHmac('sha256', key).update(`${slug}?${query}`).digest().subarray(0, 16).toString('base64url') : null;
}

export function signShare(slug: string, spec: FunnelSpec, selection: FunnelSelection): string | null {
  return mac(slug, encodeFunnelSelection(spec, selection));
}

export function verifyShare(slug: string, spec: FunnelSpec, selection: FunnelSelection, sig: unknown): boolean {
  if (typeof sig !== 'string' || !/^[A-Za-z0-9_-]{22}$/.test(sig)) return false;
  const expected = mac(slug, encodeFunnelSelection(spec, selection));
  if (!expected) return false;
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** The signed share path (unsigned when no secret is configured). */
export function signedSharePath(slug: string, spec: FunnelSpec, selection: FunnelSelection): string {
  return shareDesignPath(slug, spec, selection, signShare(slug, spec, selection));
}
