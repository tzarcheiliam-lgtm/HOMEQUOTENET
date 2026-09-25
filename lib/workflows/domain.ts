import { z } from 'zod';
import type { AppointmentStatus, AssignmentStatus, LeadStatus, QualificationStatus } from '@/lib/types';
import {
  APPOINTMENT_STATUSES,
  ASSIGNMENT_STATUSES,
  LEAD_STATUSES,
  QUALIFICATION_STATUSES,
} from '@/lib/leads/constants';

/**
 * Bridges the workflow contract to the EXISTING HomeQuote domain. Workflow
 * code never re-declares pipeline values: it derives them from
 * lib/leads/constants (UI source) typed by lib/types (schema mirror), so a
 * status added to the app is automatically a valid workflow value.
 */

type NonEmpty<T> = [T, ...T[]];
const tuple = <T extends string>(values: readonly { value: string }[]) =>
  values.map((v) => v.value) as NonEmpty<T>;

export const LEAD_STATUS_VALUES = tuple<LeadStatus>(LEAD_STATUSES);
export const ASSIGNMENT_STATUS_VALUES = tuple<AssignmentStatus>(ASSIGNMENT_STATUSES);
export const APPOINTMENT_STATUS_VALUES = tuple<AppointmentStatus>(APPOINTMENT_STATUSES);
export const QUALIFICATION_STATUS_VALUES = tuple<QualificationStatus>(QUALIFICATION_STATUSES);

export const leadStatusSchema = z.enum(LEAD_STATUS_VALUES);
export const assignmentStatusSchema = z.enum(ASSIGNMENT_STATUS_VALUES);
export const appointmentStatusSchema = z.enum(APPOINTMENT_STATUS_VALUES);
export const qualificationStatusSchema = z.enum(QUALIFICATION_STATUS_VALUES);

export const uuidSchema = z.string().uuid();
export const isoDateTimeSchema = z.string().datetime({ offset: true });

/**
 * Entity kinds a workflow event or run can point at. Each maps to an existing
 * table: lead -> leads, lead_assignment -> lead_assignments (HomeQuote's
 * "deal": one lead sold to one contractor), appointment -> appointments,
 * estimate -> estimates, sale -> sales. task / message have NO table yet.
 */
export const WORKFLOW_ENTITY_TYPES = [
  'lead',
  'lead_assignment',
  'appointment',
  'estimate',
  'sale',
  'task',
  'message',
] as const;
export type WorkflowEntityType = (typeof WORKFLOW_ENTITY_TYPES)[number];
export const workflowEntityTypeSchema = z.enum(WORKFLOW_ENTITY_TYPES);

/**
 * Whether the app has what a trigger/action/field needs today.
 *  - ready:         backing tables exist; only the Phase 2+ handler/emitter is missing.
 *  - contract_only: shape is final but an external provider is deliberately not connected (SMS).
 *  - needs_domain:  HomeQuote has no table for it yet (tasks, tags, lead owner, inbound messages).
 * The engine must refuse to ENABLE a workflow that uses anything not 'ready'.
 */
export const AVAILABILITY = ['ready', 'contract_only', 'needs_domain'] as const;
export type Availability = (typeof AVAILABILITY)[number];
