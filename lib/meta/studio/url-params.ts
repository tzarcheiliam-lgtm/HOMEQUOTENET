/**
 * Destination URL handling for ads. The destination is untrusted text typed by staff (or later imported), so it
 * is parsed and constrained before it can reach Meta. HQN attribution parameters are added WITHOUT overwriting
 * anything already on the URL, and they are sent as the creative's `url_tags` so Meta substitutes its dynamic
 * macros ({{campaign.id}} etc.) per ad. The key names must match ATTRIBUTION_PARAMS in lib/funnels/schema.ts
 * (renaming one side silently breaks capture).
 */

export const HQN_URL_TAGS: ReadonlyArray<readonly [string, string]> = [
  ['utm_source', 'facebook'],
  ['utm_medium', 'paid_social'],
  ['utm_campaign', '{{campaign.name}}'],
  ['utm_content', '{{ad.name}}'],
  ['utm_term', '{{adset.name}}'],
  ['campaign_id', '{{campaign.id}}'],
  ['campaign_name', '{{campaign.name}}'],
  ['adset_id', '{{adset.id}}'],
  ['adset_name', '{{adset.name}}'],
  ['ad_id', '{{ad.id}}'],
  ['ad_name', '{{ad.name}}'],
  ['placement', '{{placement}}'],
  ['site_source_name', '{{site_source_name}}'],
];

export type DestinationResult =
  | { ok: true; url: string; urlTags: string; keptExisting: string[]; added: string[] }
  | { ok: false; error: string };

export function buildDestination(raw: string, opts: { allowedHosts?: string[] } = {}): DestinationResult {
  let u: URL;
  try { u = new URL(raw.trim()); } catch { return { ok: false, error: 'Enter a full web address, starting with https://' }; }
  if (u.protocol !== 'https:') return { ok: false, error: 'The destination must use https://' };
  if (u.username || u.password) return { ok: false, error: 'The destination must not contain a username or password.' };
  const host = u.hostname.toLowerCase();
  if (host === 'localhost' || /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.endsWith('.local') || host.endsWith('.internal') || !host.includes('.')) {
    return { ok: false, error: 'The destination must be a public website address.' };
  }
  if (opts.allowedHosts?.length && !opts.allowedHosts.some((h) => host === h || host.endsWith(`.${h}`))) {
    return { ok: false, error: `The destination host must be one of: ${opts.allowedHosts.join(', ')}.` };
  }
  const existing = new Set([...u.searchParams.keys()].map((k) => k.toLowerCase()));
  const keptExisting: string[] = [];
  const added: string[] = [];
  const tags: string[] = [];
  for (const [k, v] of HQN_URL_TAGS) {
    if (existing.has(k)) { keptExisting.push(k); continue; }
    added.push(k);
    tags.push(`${k}=${v}`);
  }
  u.hash = '';
  return { ok: true, url: u.toString(), urlTags: tags.join('&'), keptExisting, added };
}
