import {
  SERVICE_OPTIONS, ROLE_OPTIONS, PROJECT_VALUE_OPTIONS, CAPACITY_OPTIONS, SOURCE_OPTIONS, TIMELINE_OPTIONS,
} from '@/lib/contractor-funnel/schema';

type Opts = readonly { value: string; label: string }[];
const label = (opts: Opts, v: string | null | undefined) => (v ? opts.find((o) => o.value === v)?.label ?? v : '');

export const serviceLabel = (v: string) => label(SERVICE_OPTIONS, v);
export const roleLabel = (v: string) => label(ROLE_OPTIONS, v);
export const projectValueLabel = (v: string) => label(PROJECT_VALUE_OPTIONS, v);
export const capacityLabel = (v: string) => label(CAPACITY_OPTIONS, v);
export const sourceLabel = (v: string) => label(SOURCE_OPTIONS, v);
export const timelineLabel = (v: string) => label(TIMELINE_OPTIONS, v);

export const REVIEW_STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'reviewing', label: 'Reviewing' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'booked', label: 'Booked' },
  { value: 'not_a_fit', label: 'Not a fit' },
  { value: 'spam', label: 'Spam' },
] as const;
export const reviewLabel = (v: string) => label(REVIEW_STATUSES, v);
