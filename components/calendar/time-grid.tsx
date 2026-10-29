'use client';

import { formatTime } from '@/lib/booking/format';
import { cn } from '@/lib/utils';
import { NowLine } from './now-line';
import { dayLabel, openBands, statusStyle, type CalendarEvent, type HourRule, type PlacedEvent } from './view';

/** 60px an hour: a 30-minute call is 30px, enough for its start time and name on one line. */
export const PX_PER_MINUTE = 1;

const hourLabel = (h: number) => (h === 0 || h === 24 ? '12 AM' : h === 12 ? '12 PM' : h < 12 ? `${h} AM` : `${h - 12} PM`);

/**
 * Day / week time grid: an hour gutter, one column per day, the calendar's
 * open hours shaded white over a muted background, appointment blocks by
 * status (overlaps side by side), and the now line on today. Each block is a
 * button that opens the details sheet.
 */
export function TimeGrid({
  days,
  placedByDay,
  rules,
  timeZone,
  startHour,
  endHour,
  today,
  initialNowMs,
  onSelect,
  className,
}: {
  days: string[];
  placedByDay: Record<string, PlacedEvent[]>;
  rules: HourRule[];
  timeZone: string;
  startHour: number;
  endHour: number;
  today: string;
  initialNowMs: number;
  onSelect: (event: CalendarEvent) => void;
  className?: string;
}) {
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const height = (endHour - startHour) * 60 * PX_PER_MINUTE;
  const week = days.length > 1;
  return (
    <div className={cn('overflow-x-auto rounded-xl border bg-card', className)} data-calendar-grid={week ? 'week' : 'day'}>
      <div className={cn('grid', week ? 'min-w-[760px]' : '')} style={{ gridTemplateColumns: `3.5rem repeat(${days.length}, minmax(0, 1fr))` }}>
        {/* Header row */}
        <div className="sticky left-0 z-10 border-b bg-card" />
        {days.map((d) => (
          <div
            key={d}
            className={cn('border-b border-l px-2 py-2 text-center text-xs font-medium', d === today ? 'text-primary' : 'text-muted-foreground')}
            aria-current={d === today ? 'date' : undefined}
          >
            {dayLabel(d)}
          </div>
        ))}

        {/* Hour gutter */}
        <div className="sticky left-0 z-10 bg-card" style={{ height }}>
          {hours.map((h) => (
            <div key={h} className="relative text-right" style={{ height: 60 * PX_PER_MINUTE }}>
              <span className="absolute -top-2 right-2 text-[11px] tabular-nums text-muted-foreground">{h === startHour ? '' : hourLabel(h)}</span>
            </div>
          ))}
        </div>

        {days.map((d) => (
          <div key={d} className="relative border-l bg-muted/50" style={{ height }} data-calendar-day={d}>
            {openBands(rules, d).map((b, i) => {
              const top = Math.max(0, (b.startMin - startHour * 60) * PX_PER_MINUTE);
              const bottom = Math.min(height, (b.endMin - startHour * 60) * PX_PER_MINUTE);
              return bottom > top ? <div key={i} aria-hidden className="absolute inset-x-0 bg-background" style={{ top, height: bottom - top }} /> : null;
            })}
            {hours.map((h, i) =>
              i === 0 ? null : <div key={h} aria-hidden className="absolute inset-x-0 border-t border-border/70" style={{ top: i * 60 * PX_PER_MINUTE }} />
            )}
            {(placedByDay[d] ?? []).map((p) => {
              const s = statusStyle(p.event.kind, p.event.status);
              const top = Math.max(0, (p.startMin - startHour * 60) * PX_PER_MINUTE);
              const h = Math.max(28, (p.endMin - p.startMin) * PX_PER_MINUTE - 2);
              return (
                <button
                  key={`${p.event.kind}:${p.event.id}`}
                  type="button"
                  onClick={() => onSelect(p.event)}
                  data-calendar-event={p.event.id}
                  data-status={p.event.status}
                  className={cn(
                    'absolute z-10 overflow-hidden rounded-md border-l-4 px-1.5 py-0.5 text-left text-xs leading-tight shadow-xs outline-none transition-[filter] hover:brightness-95 focus-visible:ring-[3px] focus-visible:ring-ring/50',
                    s.block
                  )}
                  style={{
                    top,
                    height: h,
                    left: `calc(${(p.lane / p.lanes) * 100}% + 2px)`,
                    width: `calc(${100 / p.lanes}% - 4px)`,
                  }}
                  aria-label={`${p.event.title}, ${formatTime(p.event.startMs, timeZone)}, ${s.label}`}
                >
                  {/* Short blocks put the start time in front of the name, so a busy day can be scanned. */}
                  <span className="block truncate font-semibold">
                    {h < 34 ? <span className="mr-1 font-normal tabular-nums opacity-80">{formatTime(p.event.startMs, timeZone).replace(/ [AP]M$/, '')}</span> : null}
                    {p.event.title}
                  </span>
                  {h >= 34 ? (
                    <span className="block truncate opacity-80">
                      {formatTime(p.event.startMs, timeZone)}
                      {p.event.subtitle ? ` · ${p.event.subtitle}` : ''}
                    </span>
                  ) : null}
                </button>
              );
            })}
            <NowLine date={d} timeZone={timeZone} startHour={startHour} endHour={endHour} pxPerMinute={PX_PER_MINUTE} initialNowMs={initialNowMs} />
          </div>
        ))}
      </div>
    </div>
  );
}
