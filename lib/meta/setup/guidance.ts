import { HQN_URL_TAGS } from '@/lib/meta/studio/url-params';

export interface AdGuidance {
  summary: string;
  relationships: string[];
  settings: { label: string; value: string }[];
  apiView: { promoted_object: { pixel_id: string; custom_event_type: 'LEAD' }; optimization_goal: string; note: string };
  destinationUrl: string;
  urlParameters: string;
  deliveryImplications: string[];
  applied: false;
}

/**
 * Plain explanation + the exact settings to use when creating a website lead ad set. NOTHING here is applied by the app:
 * Meta documents promoted_object as generally immutable after creation, so the safe path for an existing campaign is a new
 * (paused) ad set, which a person reviews and publishes in Ads Manager.
 */
export function adSetGuidance(input: { pixelId: string; funnelUrl: string | null }): AdGuidance {
  const params = HQN_URL_TAGS.map(([k, v]) => `${k}=${v}`).join('&');
  return {
    summary: 'The pixel tracks the funnel; the ad only needs to link to the funnel; the ad set tells Meta which dataset and event to optimize for.',
    relationships: [
      'Pixel / dataset: measures what happens on the funnel page (PageView, Lead, Schedule).',
      'Ad: its website link points to the published funnel URL. The ad does not need the pixel ID.',
      'Ad set: for a website lead campaign, choose this dataset and the "Lead" conversion event so Meta optimizes for submitted leads.',
    ],
    settings: [
      { label: 'Campaign objective', value: 'Leads (Ads Manager) — conversion location: Website' },
      { label: 'Dataset (pixel)', value: input.pixelId },
      { label: 'Conversion event', value: 'Lead' },
      { label: 'Ad destination', value: input.funnelUrl ?? 'Publish the funnel first, then use its /estimate/<slug> URL' },
    ],
    apiView: {
      promoted_object: { pixel_id: input.pixelId, custom_event_type: 'LEAD' },
      optimization_goal: 'OFFSITE_CONVERSIONS',
      note: 'Meta’s promoted_object reference requires custom_event_type whenever pixel_id is used. Confirm the optimization goal in Ads Manager for your campaign type.',
    },
    destinationUrl: input.funnelUrl ?? '',
    urlParameters: params,
    deliveryImplications: [
      'Meta documents promoted_object as generally not changeable after an ad set is created, so switching an existing ad set’s dataset/event may be refused or reset learning.',
      'The safest route for an existing campaign is to duplicate the ad set, set the dataset and Lead event on the copy, review it, and publish it yourself in Ads Manager.',
      'Editing an active ad set can reset its learning phase and change delivery and cost. The assistant does not edit active campaigns, change budgets, publish ads or start spend.',
      'Meta usually needs a number of recent conversion events before optimization is reliable; a brand-new dataset may deliver less well at first.',
    ],
    applied: false,
  };
}
