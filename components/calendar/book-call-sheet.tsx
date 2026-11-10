'use client';

import { useEffect, useState, useTransition } from 'react';
import { CalendarPlus, Search } from 'lucide-react';
import { formatSlot } from '@/lib/booking/format';
import { bookCallOnBehalf, searchBookable, type BookableParty } from '@/lib/actions/booking';
import { fmtPhone } from '@/components/calls/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CalendarPanel } from './panel';
import { SlotChooser, type ChosenTime } from './slot-chooser';

type Step = 'who' | 'when' | 'confirm';

/**
 * "Book a call" on someone's behalf: find the lead (or, on the sales
 * calendar, the contractor prospect), pick an open time in the same slot
 * picker the homeowner sees, add a note, book. The homeowner gets the same
 * confirmation text + email and manage link as a self-booked call.
 */
export function BookCallSheet({
  calendarId,
  calendarName,
  calendarKind,
  timeZone,
  allowOverride,
  open,
  onOpenChange,
}: {
  calendarId: string;
  calendarName: string;
  calendarKind: 'contractor' | 'team' | 'sales';
  timeZone: string;
  allowOverride: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [step, setStep] = useState<Step>('who');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BookableParty[] | null>(null);
  const [party, setParty] = useState<BookableParty | null>(null);
  const [chosen, setChosen] = useState<ChosenTime | null>(null);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const who = calendarKind === 'sales' ? 'prospect' : 'lead';

  useEffect(() => {
    if (!open) return;
    setStep('who');
    setQuery('');
    setParty(null);
    setChosen(null);
    setNotes('');
    setError(null);
    setDone(null);
  }, [open, calendarId]);

  // Search as they type (debounced); the first open lists the newest.
  useEffect(() => {
    if (!open || step !== 'who') return;
    let live = true;
    const t = setTimeout(() => {
      searchBookable(calendarId, query)
        .then((r) => { if (live) setResults(r.ok ? r.results : []); if (live && !r.ok) setError(r.error); })
        .catch(() => { if (live) setResults([]); });
    }, query ? 250 : 0);
    return () => { live = false; clearTimeout(t); };
  }, [open, step, query, calendarId]);

  const book = () => {
    if (!party || !chosen) return;
    setError(null);
    start(async () => {
      const r = await bookCallOnBehalf({ calendarId, partyId: party.id, startsAt: chosen.startsAt, notes: notes.trim() || undefined, override: chosen.override });
      if (!r.ok) {
        setError(r.error);
        if (r.pickAnother) { setChosen(null); setStep('when'); }
        return;
      }
      setDone(`Booked ${party.name} for ${formatSlot(Date.parse(r.startsAt), timeZone)}.`);
    });
  };

  const footer = done ? (
    <Button className="w-full" onClick={() => onOpenChange(false)}>Done</Button>
  ) : step === 'when' ? (
    <div className="flex gap-2">
      <Button variant="outline" className="flex-1" onClick={() => { setStep('who'); setChosen(null); }}>Back</Button>
      <Button className="flex-1" disabled={!chosen} onClick={() => setStep('confirm')}>Continue</Button>
    </div>
  ) : step === 'confirm' ? (
    <div className="flex gap-2">
      <Button variant="outline" className="flex-1" onClick={() => setStep('when')} disabled={pending}>Back</Button>
      <Button className="flex-1" onClick={book} disabled={pending}>{pending ? 'Booking…' : 'Book the call'}</Button>
    </div>
  ) : undefined;

  return (
    <CalendarPanel
      open={open}
      onOpenChange={onOpenChange}
      title={done ? 'Call booked' : step === 'who' ? `Who is the call with?` : step === 'when' ? 'Pick a time' : 'Confirm the call'}
      description={calendarName}
      footer={footer}
    >
      {error ? <p className="mb-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">{error}</p> : null}
      {done ? (
        <p className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100" role="status">
          {done} {calendarKind === 'sales' ? 'They get a confirmation email.' : 'They get a confirmation text and email with a link to reschedule or cancel.'}
        </p>
      ) : step === 'who' ? (
        <div className="space-y-3">
          <div className="relative">
            <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${who}s by name, phone or email`}
              aria-label={`Search ${who}s`}
              className="pl-9"
            />
          </div>
          {results === null ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : results.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No {who}s found.{calendarKind === 'contractor' ? ' Only leads assigned to this contractor can be booked here.' : ''}
            </p>
          ) : (
            <ul className="divide-y overflow-hidden rounded-xl border" aria-label={`Matching ${who}s`}>
              {results.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className="flex min-h-14 w-full flex-col justify-center px-4 py-2 text-left hover:bg-accent active:bg-accent"
                    onClick={() => { setParty(p); setStep('when'); setError(null); }}
                  >
                    <span className="text-sm font-medium">{p.name}</span>
                    <span className="text-xs text-muted-foreground">{[p.detail, p.phone ? fmtPhone(p.phone) : null].filter(Boolean).join(' · ') || ' '}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : step === 'when' ? (
        <div className="space-y-3">
          <p className="text-sm">With <span className="font-medium">{party?.name}</span></p>
          <SlotChooser calendarId={calendarId} calendarTimeZone={timeZone} allowOverride={allowOverride} value={chosen} onChange={setChosen} />
        </div>
      ) : (
        <div className="space-y-4">
          <dl className="grid grid-cols-[5rem_1fr] gap-x-3 gap-y-2 text-sm">
            <dt className="text-muted-foreground">With</dt>
            <dd className="font-medium">{party?.name}</dd>
            <dt className="text-muted-foreground">When</dt>
            <dd className="font-medium">
              {chosen ? formatSlot(Date.parse(chosen.startsAt), timeZone) : ''}
              {chosen?.override ? <span className="block text-xs font-normal text-amber-700 dark:text-amber-400">Outside the open times (logged)</span> : null}
            </dd>
            <dt className="text-muted-foreground">Calendar</dt>
            <dd>{calendarName}</dd>
          </dl>
          <div className="space-y-1.5">
            <label htmlFor="book-notes" className="text-sm font-medium">Note for the host (optional)</label>
            <Textarea id="book-notes" rows={3} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
      )}
    </CalendarPanel>
  );
}

/** The toolbar button that opens it. */
export function BookCallButton({ onClick }: { onClick: () => void }) {
  return (
    <Button onClick={onClick} data-calendar-book="">
      <CalendarPlus aria-hidden /> Book a call
    </Button>
  );
}
