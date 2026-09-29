import type { UserRole } from '@/lib/types';

/**
 * The single registry of notification categories. Adding one = a boolean
 * column on public.notification_preferences (same name) + an entry here; the
 * settings UI, validation and preference checks all read from this list.
 */
export const NOTIFICATION_TYPES = [
  { id: 'new_lead', label: 'New leads', description: 'A new homeowner lead arrives.', roles: ['admin'] },
  { id: 'lead_assigned', label: 'Lead assigned', description: 'A lead is assigned to you or your company.', roles: ['admin', 'setter', 'contractor'] },
  { id: 'appointment_booked', label: 'Appointment booked', description: 'A new appointment is booked.', roles: ['admin', 'setter', 'caller', 'contractor'] },
  { id: 'appointment_changed', label: 'Appointment changed', description: 'An appointment is moved to a new time.', roles: ['admin', 'setter', 'caller', 'contractor'] },
  { id: 'appointment_cancelled', label: 'Appointment cancelled', description: 'An appointment is cancelled.', roles: ['admin', 'setter', 'caller', 'contractor'] },
  { id: 'callback_due', label: 'Callback due', description: 'A scheduled prospect callback is due.', roles: ['admin', 'setter', 'caller'] },
  { id: 'form_submission', label: 'Form submissions', description: 'A funnel or form is submitted.', roles: ['admin'] },
  { id: 'payment_received', label: 'Payments', description: 'A payment is confirmed.', roles: ['admin'] },
  { id: 'workflow_alert', label: 'Automation alerts', description: 'An automation raises an alert.', roles: ['admin', 'contractor'] },
] as const satisfies readonly { id: string; label: string; description: string; roles: readonly UserRole[] }[];

export type NotificationType = (typeof NOTIFICATION_TYPES)[number]['id'];
export const NOTIFICATION_TYPE_IDS = NOTIFICATION_TYPES.map((t) => t.id) as NotificationType[];

export function isNotificationType(value: unknown): value is NotificationType {
  return typeof value === 'string' && (NOTIFICATION_TYPE_IDS as string[]).includes(value);
}

export function notificationTypesForRole(role: UserRole) {
  return NOTIFICATION_TYPES.filter((t) => (t.roles as readonly UserRole[]).includes(role));
}

export interface NotificationPreferences {
  enabled: boolean;
  types: Record<NotificationType, boolean>;
}

export function defaultPreferences(): NotificationPreferences {
  return {
    enabled: true,
    types: Object.fromEntries(NOTIFICATION_TYPE_IDS.map((id) => [id, true])) as Record<NotificationType, boolean>,
  };
}

/** Row shape returned to the bell / notification center. */
export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  url: string | null;
  entity_id: string | null;
  read_at: string | null;
  created_at: string;
}

/** The JSON the service worker receives (kept small and non-sensitive). */
export interface PushPayload {
  title: string;
  body?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url: string;
  notification_type: string;
  entity_id?: string | null;
  metadata?: Record<string, unknown>;
  /** Unread count after this notification, used for the app-icon badge. */
  badge_count?: number;
}

// --- Admin-configurable routing --------------------------------------------------

/**
 * Who a notification type is addressed to. "assigned_*" audiences are resolved
 * from the event's own records (never "every user with that role"), and
 * contractor users can only ever be reached through assigned_contractor.
 */
export const AUDIENCES = ['admins', 'assigned_setter', 'assigned_caller', 'assigned_contractor'] as const;
export type Audience = (typeof AUDIENCES)[number];

export const AUDIENCE_LABELS: Record<Audience, string> = {
  admins: 'Admins',
  assigned_setter: 'Assigned Setter',
  assigned_caller: 'Assigned Caller',
  assigned_contractor: 'Assigned Contractor',
};

export interface RoutingRule {
  admins: boolean;
  assigned_setter: boolean;
  assigned_caller: boolean;
  assigned_contractor: boolean;
  /** Hand-picked HomeQuote staff (admin/setter/caller). Never contractor users. */
  specific_user_ids: string[];
}

const ALL: readonly Audience[] = AUDIENCES;

/** Audiences that make sense for each type (the editor and the server both enforce this). */
export const ALLOWED_AUDIENCES: Record<NotificationType, readonly Audience[]> = {
  new_lead: ['admins', 'assigned_setter'],
  form_submission: ['admins'],
  lead_assigned: ALL,
  appointment_booked: ALL,
  appointment_changed: ALL,
  appointment_cancelled: ALL,
  callback_due: ['admins', 'assigned_caller'],
  payment_received: ['admins'],
  workflow_alert: ['admins'],
};

const rule = (...on: Audience[]): RoutingRule => ({
  admins: on.includes('admins'),
  assigned_setter: on.includes('assigned_setter'),
  assigned_caller: on.includes('assigned_caller'),
  assigned_contractor: on.includes('assigned_contractor'),
  specific_user_ids: [],
});

/** What applies until an admin saves a rule for that type. */
export const DEFAULT_ROUTING: Record<NotificationType, RoutingRule> = {
  new_lead: rule('admins'),
  form_submission: rule('admins'),
  lead_assigned: rule('admins', 'assigned_setter', 'assigned_caller', 'assigned_contractor'),
  appointment_booked: rule('admins', 'assigned_setter', 'assigned_caller', 'assigned_contractor'),
  appointment_changed: rule('admins', 'assigned_setter', 'assigned_caller', 'assigned_contractor'),
  appointment_cancelled: rule('admins', 'assigned_setter', 'assigned_caller', 'assigned_contractor'),
  callback_due: rule('assigned_caller'),
  payment_received: rule('admins'),
  workflow_alert: rule('admins'),
};
