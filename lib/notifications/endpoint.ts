/**
 * A push subscription's endpoint is a URL the SERVER will POST to, so an
 * attacker-supplied one would be a server-side request forgery vector. Only
 * the real browser push services are accepted (https, no credentials, no
 * custom port). Set PUSH_ENDPOINT_HOSTS (comma separated hostname suffixes)
 * to add another push service.
 */
const BUILT_IN_SUFFIXES = [
  'fcm.googleapis.com', // Chrome, Edge, Android, Brave, Opera
  'push.services.mozilla.com', // Firefox
  'push.apple.com', // Safari / iOS / iPadOS Home Screen web apps
  'notify.windows.com', // Windows Notification Service
];

function suffixes(): string[] {
  const extra = (process.env.PUSH_ENDPOINT_HOSTS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return [...BUILT_IN_SUFFIXES, ...extra];
}

export function isAllowedPushEndpoint(endpoint: string): boolean {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return false;
  const host = url.hostname.toLowerCase();
  return suffixes().some((s) => host === s || host.endsWith(`.${s}`));
}
