import type { UserRole } from '@/lib/types';

export interface NavItem {
  label: string;
  href: string;
  /** Lucide icon name (resolved in the sidebar). */
  icon: string;
  /** Which roles can see this item. */
  roles: UserRole[];
}

// The UI is admin-first, but each item declares exactly which roles see it.
export const NAV_ITEMS: NavItem[] = [
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
  {
    label: 'Appointments',
    href: '/app/appointments',
    icon: 'CalendarDays',
    roles: ['admin', 'setter', 'contractor'],
  },
  // Optional growth services for contractors. Listed after the lead workflow
  // so leads and appointments stay first.
  {
    label: 'Grow Your Business',
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
  {
    label: 'Funnels',
    href: '/app/funnels',
    icon: 'BarChart3',
    roles: ['admin'],
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
