import type { UserRole } from '@/lib/types';

export interface NavItem {
  label: string;
  href: string;
  /** Lucide icon name (resolved in the sidebar). */
  icon: string;
  /** Which roles can see this item. */
  roles: UserRole[];
  /** Full page title when `label` is a shortened bottom-bar label. */
  title?: string;
  /** Sidebar / menu section. Dashboard has none and sits above the headings. */
  group?: NavGroup;
}

export type NavGroup = 'Operations' | 'Growth' | 'Administration';
export const NAV_GROUP_ORDER: NavGroup[] = ['Operations', 'Growth', 'Administration'];

const GROUP_BY_LABEL: Record<string, NavGroup> = {
  Leads: 'Operations',
  'My Leads': 'Operations',
  Contractors: 'Operations',
  'Lead Recipients': 'Operations',
  Calls: 'Operations',
  'AI Agent Calls': 'Operations',
  'Documents & Signing': 'Operations',
  Appointments: 'Operations',
  'Call Logs': 'Operations',
  'Call Appointments': 'Operations',
  'Call Emails': 'Operations',
  'Growth Tools': 'Growth',
  'Service Requests': 'Growth',
  Funnels: 'Growth',
  Analytics: 'Growth',
  'Meta Ads': 'Growth',
  Automations: 'Growth',
  'Email Templates': 'Growth',
  Sales: 'Administration',
  Billing: 'Administration',
  Team: 'Administration',
  Integrations: 'Administration',
  'Lead Intake': 'Administration',
  'Audit Log': 'Administration',
};

/** Items in display order, bucketed by heading (ungrouped items first). */
export function groupNavItems(items: NavItem[]): { group: NavGroup | null; items: NavItem[] }[] {
  const out: { group: NavGroup | null; items: NavItem[] }[] = [];
  const loose = items.filter((i) => !i.group);
  if (loose.length) out.push({ group: null, items: loose });
  for (const group of NAV_GROUP_ORDER) {
    const inGroup = items.filter((i) => i.group === group);
    if (inGroup.length) out.push({ group, items: inGroup });
  }
  return out;
}

// The UI is admin-first, but each item declares exactly which roles see it.
const BASE_NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/app',
    icon: 'LayoutDashboard',
    roles: ['admin', 'setter', 'contractor'],
  },
  {
    label: 'Leads',
    href: '/app/leads',
    icon: 'Users',
    roles: ['admin', 'setter'],
  },
  {
    label: 'My Leads',
    href: '/app/leads',
    icon: 'Inbox',
    roles: ['contractor'],
  },
  {
    label: 'Contractors',
    href: '/app/contractors',
    icon: 'Building2',
    roles: ['admin', 'setter'],
  },
  // Who a qualified lead can be sent to (contractors + team members).
  {
    label: 'Lead Recipients',
    href: '/app/lead-recipients',
    icon: 'Send',
    roles: ['admin'],
  },
  // The partner cold-calling workspace. Callers and setters work their own
  // assigned list here; admins use it to assign prospects and compare agents.
  // Contractors never see it.
  {
    label: 'Calls',
    href: '/app/calls',
    icon: 'Phone',
    roles: ['admin', 'caller', 'setter'],
  },
  // AI voice agent calls to new form leads and admin-initiated calls (admin only; server actions re-check the role).
  {
    label: 'AI Agent Calls',
    href: '/app/ai-calls',
    icon: 'Bot',
    roles: ['admin'],
  },
  {
    label: 'Appointments',
    href: '/app/appointments',
    icon: 'CalendarDays',
    roles: ['admin', 'setter', 'contractor'],
  },
  // Electronic document signing. HQN admins see every company's documents; contractor owners/staff only their own
  // (enforced server-side in lib/signing/access.ts and by RLS, not by this list).
  {
    label: 'Documents & Signing',
    href: '/app/documents',
    icon: 'FileSignature',
    roles: ['admin', 'contractor'],
  },
  // Optional growth services for contractors. Listed after the lead workflow
  // so leads and appointments stay first.
  {
    label: 'Growth Tools',
    href: '/app/growth',
    icon: 'Sprout',
    roles: ['contractor'],
  },
  // Contractors' requests for growth services, reviewed by HQN admins.
  {
    label: 'Service Requests',
    href: '/app/service-requests',
    icon: 'Handshake',
    roles: ['admin'],
  },
  {
    label: 'Sales',
    href: '/app/sales',
    icon: 'DollarSign',
    roles: ['admin'],
  },
  {
    label: 'Billing',
    href: '/app/billing',
    icon: 'Receipt',
    roles: ['admin'],
  },
  {
    label: 'Analytics',
    href: '/app/analytics',
    icon: 'BarChart3',
    roles: ['admin'],
  },
  // Meta Ads reporting + lead-outcome feedback. Admins see every account; contractor owners only campaigns an
  // admin mapped to their company (enforced by RLS and lib/permissions.canViewMetaAds, not by this list).
  {
    label: 'Meta Ads',
    href: '/app/meta-ads',
    icon: 'Megaphone',
    roles: ['admin', 'contractor'],
  },
  {
    label: 'Funnels',
    href: '/app/funnels',
    icon: 'BarChart3',
    roles: ['admin'],
  },
  {
    label: 'Automations',
    href: '/app/workflows',
    icon: 'Workflow',
    roles: ['admin', 'contractor'],
  },
  {
    label: 'Email Templates',
    href: '/app/email-templates',
    icon: 'Mail',
    roles: ['admin', 'contractor'],
  },
  {
    label: 'Team',
    href: '/app/team',
    icon: 'ShieldCheck',
    roles: ['admin'],
  },
  {
    label: 'Integrations',
    href: '/app/integrations',
    icon: 'Plug',
    roles: ['admin'],
  },
  {
    label: 'Lead Intake',
    href: '/app/lead-intake',
    icon: 'ArrowDownToLine',
    roles: ['admin'],
  },
  {
    label: 'Audit Log',
    href: '/app/audit',
    icon: 'ScrollText',
    roles: ['admin'],
  },
];

export const NAV_ITEMS: NavItem[] = BASE_NAV_ITEMS.map((i) => ({ ...i, group: GROUP_BY_LABEL[i.label] }));

export function navItemsForRole(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrator',
  setter: 'Appointment Setter',
  contractor: 'Contractor',
  caller: 'Partner (Caller)',
};

/**
 * Where a signed-in user belongs. Callers have exactly one job — the calling
 * workspace — so that is home; everyone else keeps the role-aware dashboard.
 */
export function homePathFor(role: UserRole): string {
  return role === 'caller' ? '/app/calls' : '/app';
}

/* ---- Mobile navigation ---------------------------------------------------
 * The phone UI shows a few destinations in a bottom bar and everything else
 * behind "More". Both lists are derived from NAV_ITEMS (plus the calling
 * workspace sub-pages), so a role can never see a route on a phone that it
 * cannot see in the desktop sidebar.
 */

/** Calling-workspace sub-pages: not in the sidebar (CallsSubnav covers them
 *  on desktop) but worth first-class phone navigation. Same guard as the
 *  pages themselves (requireCallWorkspace). */
const CALL_WORKSPACE_EXTRAS: NavItem[] = ([
  {
    label: 'Call Logs',
    href: '/app/calls/logs',
    icon: 'ClipboardList',
    roles: ['admin', 'caller', 'setter'],
  },
  {
    label: 'Call Appointments',
    href: '/app/calls/appointments',
    icon: 'CalendarCheck',
    roles: ['admin', 'caller', 'setter'],
  },
  {
    label: 'Call Emails',
    href: '/app/calls/emails',
    icon: 'Mail',
    roles: ['admin', 'caller', 'setter'],
  },
] as NavItem[]).map((i) => ({ ...i, group: GROUP_BY_LABEL[i.label] }));

/** Bottom-bar picks per role, in order. Label is the short phone label. */
/**
 * Bottom-bar picks per role, in order (label is the short phone label). The bar
 * always adds an Alerts tab (notifications) and a More tab, so keep these to
 * three or four to stay at five tabs. Anything not listed lives under More.
 */
const MOBILE_PRIMARY: Record<UserRole, { href: string; label: string }[]> = {
  admin: [
    { href: '/app', label: 'Home' },
    { href: '/app/leads', label: 'Leads' },
    { href: '/app/appointments', label: 'Appts' },
  ],
  setter: [
    { href: '/app', label: 'Home' },
    { href: '/app/calls', label: 'Calls' },
    { href: '/app/leads', label: 'Leads' },
  ],
  caller: [
    { href: '/app/calls', label: 'Prospects' },
    { href: '/app/calls/logs', label: 'Logs' },
    { href: '/app/calls/appointments', label: 'Appts' },
  ],
  contractor: [
    { href: '/app', label: 'Home' },
    { href: '/app/leads', label: 'Leads' },
    { href: '/app/appointments', label: 'Appts' },
  ],
};

export interface MobileNav {
  primary: NavItem[];
  secondary: NavItem[];
}

export function mobileNavForRole(role: UserRole): MobileNav {
  const visible = [...NAV_ITEMS, ...CALL_WORKSPACE_EXTRAS].filter((i) =>
    i.roles.includes(role)
  );
  const primary: NavItem[] = [];
  for (const pick of MOBILE_PRIMARY[role]) {
    const item = visible.find((i) => i.href === pick.href);
    if (item) primary.push({ ...item, label: pick.label, title: item.label });
  }
  const taken = new Set(primary.map((p) => p.href));
  const seen = new Set<string>();
  const secondary = visible.filter((i) => {
    if (taken.has(i.href)) return false;
    const key = `${i.href}|${i.label}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return { primary, secondary };
}
