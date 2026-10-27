import type { ProspectDisposition } from '@/lib/types';

/**
 * Opens the call workspace's quick email sheet from anywhere on the prospect
 * page: the save that just logged an outcome, the header / action-bar Email
 * buttons, or the E shortcut. One sheet listens; callers just describe why.
 */
export interface QuickEmailRequest {
  /** The outcome just logged (picks the template); omitted = the prospect's current one. */
  outcome?: ProspectDisposition | null;
  templateKey?: string;
  /** Meeting or callback time, for templates that mention it. */
  when?: { iso: string; timeZone: string; type?: string | null } | null;
  /** Where Send / Skip go next; omitted = stay on this prospect. */
  nextHref?: string | null;
}

export const QUICK_EMAIL_EVENT = 'hq:quick-email';

/**
 * Returns whether the sheet opened. It may not (no sheet mounted, a DNC prospect), and a
 * caller that was relying on the sheet to move on (Save, email & next) must move on itself.
 */
export function openQuickEmail(req: QuickEmailRequest = {}): boolean {
  const e = new CustomEvent<QuickEmailRequest>(QUICK_EMAIL_EVENT, { detail: req, cancelable: true });
  window.dispatchEvent(e);
  return e.defaultPrevented;
}
