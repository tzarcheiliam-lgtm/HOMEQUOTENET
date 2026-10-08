export type DeliveryMode = 'off' | 'test' | 'live';
export type SettingsPatch = { delivery_mode: DeliveryMode; legacy_direct_qualified?: boolean; ledger_cursor_at?: string; ledger_cursor_id?: null };

/**
 * What changes when an admin saves the delivery mode. Pure so the handoff rules are tested exactly as they run:
 *  - leaving Off, or going Test -> Live, moves the ledger cursor to NOW: only outcomes recorded afterwards are queued
 *    (never a historical sweep);
 *  - Live retires the original direct QualifiedLead sender (the queue sends instead; same event id);
 *  - Test leaves the direct sender alone, because test events never count - real sending must not pause during testing;
 *  - Off keeps the direct sender only if `restoreLegacy` is set (explicit rollback to today's behavior).
 */
export function deliveryModePatch(prev: DeliveryMode | undefined, next: DeliveryMode, restoreLegacy: boolean, now = new Date()): SettingsPatch {
  const patch: SettingsPatch = { delivery_mode: next };
  if (prev !== next && next !== 'off') { patch.ledger_cursor_at = now.toISOString(); patch.ledger_cursor_id = null; }
  if (next === 'live') patch.legacy_direct_qualified = false;
  else if (next === 'off') patch.legacy_direct_qualified = restoreLegacy;
  return patch;
}
