import type { Connector, NormalizedLead } from './types';
import { metaConnector } from './meta';

// Generic connector: maps a flat JSON body with common field names. Used by
// Website Forms, Zapier, and the Public API — and a sensible fallback for any
// provider that posts already-structured data.
function genericNormalize(
  provider: string,
  payload: any
): NormalizedLead[] {
  const p = payload ?? {};
  const get = (...keys: string[]) => {
    for (const k of keys) {
      if (p[k] != null && p[k] !== '') return String(p[k]);
    }
    return null;
  };
  const fullName =
    get('full_name', 'name') ??
    ([get('first_name'), get('last_name')].filter(Boolean).join(' ') || null);

  return [
    {
      full_name: fullName,
      phone: get('phone', 'phone_number', 'mobile'),
      email: get('email'),
      address: get('address', 'street_address'),
      city: get('city'),
      state: get('state', 'province'),
      zip: get('zip', 'zip_code', 'postal_code'),
      source: get('source') ?? provider,
      platform: get('platform') ?? 'web',
      campaign: get('campaign', 'campaign_name', 'utm_campaign'),
      campaign_id: get('campaign_id'),
      ad_set: get('ad_set', 'adset_name'),
      ad_set_id: get('ad_set_id', 'adset_id'),
      ad: get('ad', 'ad_name'),
      ad_id: get('ad_id'),
      form: get('form', 'form_name'),
      form_id: get('form_id'),
      external_lead_id: get('external_lead_id', 'id', 'lead_id'),
      timestamp: get('timestamp', 'created_time'),
    },
  ];
}

function genericConnector(
  provider: string,
  label: string,
  description: string,
  category: Connector['category'],
  implemented = true
): Connector {
  return {
    provider,
    label,
    description,
    category,
    implemented,
    normalize: (payload) => genericNormalize(provider, payload),
  };
}

// The registry. Adding a new source = add a connector here + (optionally) seed a
// row in the integrations table. No schema change required.
export const CONNECTORS: Record<string, Connector> = {
  meta: metaConnector,
  website: genericConnector(
    'website',
    'Website Forms',
    'Inbound submissions from your own site forms.',
    'forms'
  ),
  zapier: genericConnector(
    'zapier',
    'Zapier',
    'Connect 6000+ apps; map fields to the common intake model.',
    'automation'
  ),
  api: genericConnector(
    'api',
    'Public API',
    'POST normalized leads directly to the intake endpoint.',
    'api'
  ),
  // Defined so the framework lists them; full connectors land in later phases.
  google: genericConnector(
    'google',
    'Google Ads Lead Forms',
    'Google Lead Form extensions (coming soon).',
    'ads',
    false
  ),
  ghl: genericConnector(
    'ghl',
    'GoHighLevel',
    'Sync leads from GoHighLevel (coming soon).',
    'crm',
    false
  ),
};

export function getConnector(provider: string): Connector | null {
  return CONNECTORS[provider] ?? null;
}
