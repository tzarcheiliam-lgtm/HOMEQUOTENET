/** Pure rules for what may be called "verified". Installing code or an accepted API request is never enough. */
export type CheckState = 'ok' | 'warn' | 'bad' | 'unknown' | 'na';
export interface Check { id: string; label: string; state: CheckState; detail: string; checkedAt: string | null }

export type TrackingLevel =
  | 'not_configured'  // no dataset attached to the funnel
  | 'installed'       // attached and the funnel loads the pixel, but Meta has not been seen receiving anything yet
  | 'receiving'       // Meta reports the pixel firing after setup, but no Lead event seen yet
  | 'verified';       // Meta reports Lead events after setup (and server events too, when server tracking is on)

export interface Observed {
  configuredAt: string;
  funnelPublished: boolean;
  isDemo: boolean;
  consentMode: 'opt_in' | 'opt_out';
  serverTokenPresent: boolean;
  pixelUnavailable: boolean;
  pixelLastFiredAt: string | null;
  /** Meta stats after setup; null = could not be read / shape not recognised (never treated as zero). */
  browserCounts: Record<string, number> | null;
  serverCounts: Record<string, number> | null;
  /** Rows in our own conversion ledger: real (non-test) server Lead sends Meta answered 'accepted' to, after setup. */
  ledgerAcceptedLeads: number;
  checkedAt: string;
}

const after = (iso: string | null, ref: string) => !!iso && new Date(iso).getTime() >= new Date(ref).getTime();

export function evaluate(o: Observed): { level: TrackingLevel; checks: Check[] } {
  const at = o.checkedAt;
  const checks: Check[] = [];
  const fired = after(o.pixelLastFiredAt, o.configuredAt);
  const leadBrowser = o.browserCounts?.Lead ?? 0;
  const leadServer = o.serverCounts?.Lead ?? 0;
  const serverExpected = o.serverTokenPresent;

  checks.push({ id: 'published', label: 'Funnel published', state: o.funnelPublished ? 'ok' : 'bad', detail: o.funnelPublished ? 'Visitors can load the funnel and its pixel.' : 'Draft or archived funnels are not reachable by ads or visitors, so nothing can fire.', checkedAt: at });
  checks.push({ id: 'consent', label: 'Consent setting', state: o.consentMode === 'opt_out' ? 'ok' : 'warn',
    detail: o.consentMode === 'opt_out' ? 'The pixel runs on visit; visitors can switch it off.' : 'Opt-in: the pixel stays off until a visitor ticks the footer box, so only consenting visitors are measured. This is intentional, not a fault.', checkedAt: at });
  checks.push({ id: 'dataset_available', label: 'Dataset available in Meta', state: o.pixelUnavailable ? 'bad' : 'ok', detail: o.pixelUnavailable ? 'Meta reports this pixel as unavailable.' : 'Meta returned the dataset for the connected account.', checkedAt: at });
  checks.push({ id: 'pixel_fired', label: 'Meta has seen the pixel fire since setup', state: o.pixelLastFiredAt === null ? 'warn' : fired ? 'ok' : 'warn',
    detail: o.pixelLastFiredAt === null ? 'Meta shows no activity for this dataset yet.' : fired ? `Last fired ${o.pixelLastFiredAt}.` : `Last fired ${o.pixelLastFiredAt}, which is before this funnel was connected.`, checkedAt: at });
  checks.push({ id: 'browser_lead', label: 'Browser Lead event received by Meta', state: o.browserCounts === null ? 'unknown' : leadBrowser > 0 ? 'ok' : 'warn',
    detail: o.browserCounts === null ? 'Could not read Meta’s event counts (permission or response format). Check Events Manager.' : leadBrowser > 0 ? `${leadBrowser} Lead event(s) in the window.` : 'No Lead events yet. Submit a real test lead (see the guided test) and re-check.', checkedAt: at });
  if (!o.isDemo) {
    checks.push({ id: 'server', label: 'Server (Conversions API) Lead events', state: !serverExpected ? 'na' : o.serverCounts === null ? 'unknown' : leadServer > 0 || o.ledgerAcceptedLeads > 0 ? 'ok' : 'warn',
      detail: !serverExpected ? 'Server tracking is off (no META_CONVERSIONS_API_TOKEN). Browser tracking still works.'
        : leadServer > 0 ? `${leadServer} server Lead event(s) reported by Meta.`
        : o.ledgerAcceptedLeads > 0 ? `Meta accepted ${o.ledgerAcceptedLeads} server Lead send(s) from this app; Meta’s own counts were not available.`
        : 'No server Lead events seen yet.', checkedAt: at });
  }
  checks.push({ id: 'dedup', label: 'Browser/server de-duplication', state: 'unknown', detail: 'Both use event name + event_id "<session>:Lead", which is what Meta needs. Whether Meta actually merged a pair is only visible in Events Manager (Overview → Deduplication), so it is not claimed here.', checkedAt: at });

  let level: TrackingLevel = 'installed';
  if (fired) level = 'receiving';
  const serverOk = !serverExpected || leadServer > 0 || o.ledgerAcceptedLeads > 0;
  if (fired && leadBrowser > 0 && serverOk && o.funnelPublished && !o.pixelUnavailable) level = 'verified';
  return { level, checks };
}

export const LEVEL_LABEL: Record<TrackingLevel, string> = {
  not_configured: 'Not connected', installed: 'Installed — not yet seen by Meta', receiving: 'Meta is receiving events — no Lead yet', verified: 'Verified: Meta reported Lead events after setup',
};
