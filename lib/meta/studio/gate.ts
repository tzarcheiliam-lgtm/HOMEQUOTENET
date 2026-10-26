/**
 * The write gate: every state-changing Meta call (creating paused objects, applying a proposal, a rule action)
 * must pass `checkWriteGate` first. It is pure so it can be tested exhaustively; the server layer loads the
 * inputs. Reasons are returned in plain language so the UI can show exactly what is still switched off.
 */
export type GateInput = {
  writeTokenPresent: boolean;
  liveWritesEnabled: boolean; // meta_studio_settings.live_writes_enabled
  accountWritesEnabled: boolean; // meta_account_controls.writes_enabled
  accountKnown: boolean;
};
export type GateResult = { allowed: boolean; reasons: string[] };

export function checkWriteGate(g: GateInput): GateResult {
  const reasons: string[] = [];
  if (!g.accountKnown) reasons.push('This ad account has not been imported yet.');
  if (!g.writeTokenPresent) reasons.push('Setup required: META_ADS_WRITE_TOKEN is not set on the server.');
  if (!g.liveWritesEnabled) reasons.push('Live writes are switched off for HQN (Meta Ads > Settings).');
  if (!g.accountWritesEnabled) reasons.push('Writes are not enabled for this ad account (Meta Ads > Settings).');
  return { allowed: reasons.length === 0, reasons };
}

export type AutomationGateInput = {
  globalAutomationEnabled: boolean;
  accountAutomationEnabled: boolean;
} & GateInput;

/** Automation also needs the global stop released and the per-account switch on. */
export function checkAutomationGate(g: AutomationGateInput): GateResult {
  const base = checkWriteGate(g);
  const reasons = [...base.reasons];
  if (!g.globalAutomationEnabled) reasons.push('HQN automation is stopped globally. (This does not pause anything already running in Meta.)');
  if (!g.accountAutomationEnabled) reasons.push('Automation is not enabled for this ad account.');
  return { allowed: reasons.length === 0, reasons };
}
