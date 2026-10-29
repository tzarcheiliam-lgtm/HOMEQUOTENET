/**
 * The booking flow as a pure reducer (BookingFlow drives it; tests drive it
 * directly). pick -> confirm -> booking -> booked, with a way back to pick when
 * the time was taken meanwhile, and a side path to "request a callback".
 * Selecting a time is optimistic: the confirm view shows at once, with no
 * request until the homeowner confirms.
 */
import type { PublicBooking, PublicCalendar, PublicSlot } from './types';

export type FlowView = 'loading' | 'unavailable' | 'pick' | 'confirm' | 'booking' | 'booked' | 'callback' | 'callback_sent';

export interface FlowState {
  view: FlowView;
  calendar: PublicCalendar | null;
  slots: PublicSlot[];
  selected: string | null;
  booking: PublicBooking | null;
  contact: { firstName: string | null; phoneHint: string | null };
  /** One message for the live region: what went wrong and what to do. */
  message: string | null;
  callbackRequested: boolean;
  /** Bumps when the view changes because of the homeowner (move focus then, never on first load). */
  focusKey: number;
}

export type FlowAction =
  | { type: 'loaded'; calendar: PublicCalendar; slots: PublicSlot[]; booked: PublicBooking | null; callbackRequested: boolean; contact: FlowState['contact']; message?: string | null }
  | { type: 'load_failed'; message: string }
  | { type: 'select'; start: string }
  | { type: 'back' }
  | { type: 'submit' }
  | { type: 'booked'; booking: PublicBooking }
  /** The server refused this time: back to the picker (slots reload), the selection is dropped. */
  | { type: 'pick_another'; message: string }
  /** Anything else that failed: stay where we are (confirm, callback) so it can be tried again. */
  | { type: 'failed'; message: string }
  | { type: 'open_callback' }
  | { type: 'callback_sent' };

export const initialFlow: FlowState = {
  view: 'loading', calendar: null, slots: [], selected: null, booking: null,
  contact: { firstName: null, phoneHint: null }, message: null, callbackRequested: false, focusKey: 0,
};

export function flowReducer(s: FlowState, a: FlowAction): FlowState {
  const moved = (next: Partial<FlowState>): FlowState => ({ ...s, ...next, focusKey: s.focusKey + 1 });
  switch (a.type) {
    case 'loaded': {
      // A refresh after booking shows the confirmation, not the picker. A reload that
      // follows "pick another time" keeps its message and moves focus to the picker.
      const view: FlowView = a.booked ? 'booked' : a.callbackRequested ? 'callback_sent' : 'pick';
      const base = { calendar: a.calendar, slots: a.slots, booking: a.booked ?? s.booking, contact: a.contact, callbackRequested: a.callbackRequested, view };
      if (s.view === 'loading' && s.focusKey === 0) return { ...s, ...base, message: a.message ?? null };
      return { ...s, ...base, message: a.message ?? s.message };
    }
    case 'load_failed':
      return { ...s, view: 'unavailable', message: a.message };
    case 'select':
      if (s.view !== 'pick' || !s.slots.some((x) => x.start === a.start)) return s;
      return moved({ view: 'confirm', selected: a.start, message: null });
    case 'back':
      return s.view === 'confirm' || s.view === 'callback' ? moved({ view: 'pick', message: null }) : s;
    case 'submit':
      return s.view === 'confirm' && s.selected ? { ...s, view: 'booking', message: null } : s;
    case 'booked':
      return moved({ view: 'booked', booking: a.booking, message: null });
    case 'pick_another':
      return moved({ view: 'pick', slots: s.slots.filter((x) => x.start !== s.selected), selected: null, message: a.message });
    case 'failed':
      return { ...s, view: s.view === 'booking' ? 'confirm' : s.view, message: a.message };
    case 'open_callback':
      return s.view === 'pick' ? moved({ view: 'callback', message: null }) : s;
    case 'callback_sent':
      return moved({ view: 'callback_sent', callbackRequested: true, message: null });
  }
}

/** Roving focus in the time list: the next index for a key, or null to let the key through. */
export function nextIndex(key: string, index: number, count: number): number | null {
  if (count <= 0) return null;
  switch (key) {
    case 'ArrowDown':
    case 'ArrowRight':
      return Math.min(count - 1, index + 1);
    case 'ArrowUp':
    case 'ArrowLeft':
      return Math.max(0, index - 1);
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return null;
  }
}
