const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const LEAD_ROUTE = new RegExp(`^/app/leads/(${UUID})(?:/|$)`, 'i');

export type PageContext =
  | { kind: 'lead'; leadId: string }
  | { kind: 'page'; page: 'dashboard' | 'leads' | 'appointments' | 'other'; path: string };

/** Interprets the pathname the browser reports. Only a hint: any record is re-authorized server-side. */
export function parseRoute(pathname: string): PageContext {
  const path = pathname.split('?')[0].split('#')[0];
  const lead = LEAD_ROUTE.exec(path);
  if (lead) return { kind: 'lead', leadId: lead[1].toLowerCase() };
  if (path === '/app') return { kind: 'page', page: 'dashboard', path };
  if (path.startsWith('/app/leads')) return { kind: 'page', page: 'leads', path };
  if (path.startsWith('/app/appointments')) return { kind: 'page', page: 'appointments', path };
  return { kind: 'page', page: 'other', path: path.slice(0, 120) };
}

const UUID_RE = new RegExp(`^${UUID}$`, 'i');
export const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID_RE.test(v);
