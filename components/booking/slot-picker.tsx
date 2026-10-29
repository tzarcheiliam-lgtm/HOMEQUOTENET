'use client';

import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { formatDayHeading, formatTime } from '@/lib/booking/format';
import { groupSlotsByDay } from '@/lib/booking/slots';
import { nextIndex } from './flow-state';
import type { PublicSlot } from './types';
import { sameClock, zoneCity, zoneLabel } from './zone';
import './booking.css';

/**
 * The time picker, in the Buildoly style: a day heading, then that day's open
 * times as stacked full-width blue buttons. Mobile first.
 *
 * - Days and times are grouped in the viewer's zone, which is always named
 *   ("Times are in Pacific Time (PDT)"); when the calendar's zone has a
 *   different clock the homeowner can switch to it.
 * - Three days at first, then "Show more days"; six times per day, then
 *   "N more times". New content only ever appears below what was tapped.
 * - Each day is a listbox labelled by its heading: one Tab stop per day,
 *   arrow keys / Home / End move between its times, Enter or Space picks one.
 * - `current` (rescheduling) is shown in place but cannot be picked.
 */

export interface SlotPickerProps {
  slots: PublicSlot[];
  /** Zone the times are shown in. */
  timeZone: string;
  /** Zones the viewer may switch between (their own, the calendar's); a switch shows only when the clocks differ. */
  zoneChoices?: string[];
  onTimeZoneChange?: (timeZone: string) => void;
  selected?: string | null;
  current?: string | null;
  onSelect: (start: string) => void;
  /** Heading level for the day names (default 3). */
  headingLevel?: 2 | 3 | 4;
  initialDays?: number;
  perDay?: number;
  disabled?: boolean;
}

const MORE_DAYS = 3;

export function SlotPicker({
  slots, timeZone, zoneChoices = [], onTimeZoneChange, selected = null, current = null, onSelect,
  headingLevel = 3, initialDays = 3, perDay = 6, disabled = false,
}: SlotPickerProps) {
  const uid = useId();
  const [dayCount, setDayCount] = useState(initialDays);
  const [openDays, setOpenDays] = useState<ReadonlySet<string>>(() => new Set());
  const lists = useRef(new Map<string, HTMLDivElement | null>());
  const rootRef = useRef<HTMLDivElement>(null);

  const withCurrent = useMemo(() => {
    const list = slots.map((s) => ({ startMs: Date.parse(s.start), endMs: Date.parse(s.end) }));
    if (current && !list.some((s) => s.startMs === Date.parse(current))) list.push({ startMs: Date.parse(current), endMs: Date.parse(current) });
    return list;
  }, [slots, current]);
  const days = useMemo(() => groupSlotsByDay(withCurrent, timeZone), [withCurrent, timeZone]);
  const shown = days.slice(0, dayCount);
  const H = `h${headingLevel}` as 'h2' | 'h3' | 'h4';
  const firstMs = withCurrent[0]?.startMs ?? Date.now();
  const switchTo = zoneChoices.find((z) => z !== timeZone && !sameClock(z, timeZone, firstMs)) ?? null;

  /** After revealing more, focus the first new time (the button that was pressed may be gone). */
  function focusLater(selector: string, index: number) {
    requestAnimationFrame(() => {
      const root = rootRef.current?.querySelector(selector);
      root?.querySelectorAll<HTMLButtonElement>('[role="option"]:not([aria-disabled="true"])')[index]?.focus();
    });
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>, date: string) {
    const list = lists.current.get(date);
    if (!list) return;
    const options = Array.from(list.querySelectorAll<HTMLButtonElement>('[role="option"]'));
    const at = options.indexOf(document.activeElement as HTMLButtonElement);
    const next = nextIndex(e.key, Math.max(0, at), options.length);
    if (next === null) return;
    e.preventDefault();
    options.forEach((o, i) => (o.tabIndex = i === next ? 0 : -1));
    options[next]?.focus();
  }

  return (
    <div ref={rootRef} className="bk" data-booking-slot-picker="">
      <p className="bk-copy text-[14.5px] leading-[21px] text-[var(--bk-muted)]" data-booking-zone="">
        Times are in {zoneLabel(firstMs, timeZone)}.
        {switchTo && onTimeZoneChange ? (
          <>
            {' '}
            <button type="button" className="bk-link -my-3 align-baseline" onClick={() => onTimeZoneChange(switchTo)}>
              Show {zoneCity(switchTo)} time
            </button>
          </>
        ) : null}
      </p>

      <div className="mt-5 flex flex-col gap-7">
        {shown.map((day, dayIndex) => {
          const headingId = `${uid}-d${dayIndex}`;
          const open = openDays.has(day.date);
          const visible = open ? day.slots : day.slots.slice(0, perDay);
          const hidden = day.slots.length - visible.length;
          const focusStart = visible.find((s) => s.startMs === Date.parse(selected ?? ''))?.startMs
            ?? visible.find((s) => !isCurrent(s.startMs, current))?.startMs;
          return (
            <section key={day.date} aria-labelledby={headingId} data-booking-day={day.date}>
              <H id={headingId} className="bk-heading text-[20px] font-[550] leading-[26px] tracking-[-0.012em] text-[var(--bk-ink)]">
                {formatDayHeading(day.slots[0].startMs, timeZone)}
              </H>
              <div
                ref={(el) => { lists.current.set(day.date, el); }}
                role="listbox"
                aria-labelledby={headingId}
                aria-disabled={disabled || undefined}
                className="mt-3 flex flex-col gap-2.5"
                onKeyDown={(e) => onKeyDown(e, day.date)}
              >
                {visible.map((slot) => {
                  const start = new Date(slot.startMs).toISOString();
                  const isCur = isCurrent(slot.startMs, current);
                  const isSel = !isCur && selected !== null && Date.parse(selected) === slot.startMs;
                  return (
                    <button
                      key={slot.startMs}
                      type="button"
                      role="option"
                      aria-selected={isSel}
                      aria-disabled={isCur || disabled || undefined}
                      tabIndex={slot.startMs === focusStart ? 0 : -1}
                      className="bk-slot"
                      data-slot-start={start}
                      onClick={() => { if (!isCur && !disabled) onSelect(start); }}
                    >
                      {isSel ? <Check aria-hidden className="size-[18px] -ml-1" strokeWidth={2.4} /> : null}
                      <span>{formatTime(slot.startMs, timeZone)}</span>
                      {isCur ? <span className="text-[14px] font-normal">(your current time)</span> : null}
                    </button>
                  );
                })}
              </div>
              {hidden > 0 ? (
                <button
                  type="button"
                  className="bk-link mt-1"
                  onClick={() => {
                    setOpenDays((prev) => new Set(prev).add(day.date));
                    focusLater(`[data-booking-day="${day.date}"]`, perDay);
                  }}
                >
                  {hidden} more {hidden === 1 ? 'time' : 'times'}
                  <ChevronDown aria-hidden className="size-4" />
                </button>
              ) : null}
            </section>
          );
        })}
      </div>

      {days.length > shown.length ? (
        <button type="button" className="bk-secondary mt-7 w-full" onClick={() => {
          const next = days[shown.length];
          setDayCount((n) => n + MORE_DAYS);
          // The button stays while more days remain; once it goes, focus would be lost.
          if (next && days.length <= shown.length + MORE_DAYS) focusLater(`[data-booking-day="${next.date}"]`, 0);
        }}>
          Show more days
        </button>
      ) : null}
    </div>
  );
}

const isCurrent = (ms: number, current: string | null) => current !== null && Date.parse(current) === ms;

/**
 * Same footprint as the picker (zone line, two days of buttons), so nothing
 * jumps when the times arrive.
 */
export function SlotPickerSkeleton({ days = 2, perDay = 4 }: { days?: number; perDay?: number }) {
  return (
    <div className="bk" aria-hidden data-booking-skeleton="">
      <div className="bk-skeleton h-[21px] w-[62%]" />
      <div className="mt-5 flex flex-col gap-7">
        {Array.from({ length: days }, (_, d) => (
          <div key={d}>
            <div className="bk-skeleton h-[26px] w-[58%]" />
            <div className="mt-3 flex flex-col gap-2.5">
              {Array.from({ length: perDay }, (_, i) => <div key={i} className="bk-skeleton h-14 w-full" />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
