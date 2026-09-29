/** App-icon badge (Badging API). Never throws; silently no-ops where unsupported. */
export function setAppBadge(count: number): void {
  try {
    const nav = navigator as Navigator & {
      setAppBadge?: (n?: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
    if (count > 0 && nav.setAppBadge) void nav.setAppBadge(count).catch(() => {});
    else if (nav.clearAppBadge) void nav.clearAppBadge().catch(() => {});
  } catch {
    /* unsupported */
  }
}
