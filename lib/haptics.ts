/**
 * Very light haptic feedback for meaningful successes only (booked, assigned,
 * completed) — never on plain taps. Feature-detected: iOS Safari and desktops
 * simply ignore it, and reduced-motion users never get it.
 */
export function haptic(kind: 'success' | 'warning' = 'success'): void {
  try {
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    navigator.vibrate(kind === 'success' ? 12 : [18, 40, 18]);
  } catch {
    /* unsupported */
  }
}
