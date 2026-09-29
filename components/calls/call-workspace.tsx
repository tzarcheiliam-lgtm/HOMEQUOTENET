'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarPlus, ClipboardEdit, Phone, PhoneOff, SkipForward } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ActionBarItem, MobileActionBar } from '@/components/mobile/mobile-action-bar';
import type { ProspectDisposition } from '@/lib/types';

type Tab = 'info' | 'script' | 'log' | 'history';

const TABS: { id: Tab; label: string }[] = [
  { id: 'info', label: 'Info' },
  { id: 'script', label: 'Script' },
  { id: 'log', label: 'Log' },
  { id: 'history', label: 'History' },
];

interface Preset {
  outcome: ProspectDisposition;
  n: number;
}

const WorkspaceContext = createContext<{ preset: Preset | null }>({ preset: null });

/** OutcomeForm reads this to honour the action bar's "Appt" shortcut. */
export function useOutcomePreset(): Preset | null {
  return useContext(WorkspaceContext).preset;
}

/**
 * Lays out one prospect's calling workspace.
 *
 * lg and up: the two-column desktop layout, every panel visible — exactly what
 * the page rendered before. Below lg the same four panels become tabs (Info /
 * Script / Log / History) under a sticky tab strip, with a pinned action bar
 * (Call · Log · Appt · Next) so the whole call loop is thumb-reachable without
 * scrolling. Panels are only hidden with CSS, never unmounted, so a half-typed
 * outcome survives a trip to the Script tab.
 */
export function CallWorkspace({
  info,
  log,
  script,
  history,
  historyCount,
  tel,
  dnc,
  nextHref,
}: {
  info: React.ReactNode;
  log: React.ReactNode;
  script: React.ReactNode;
  history: React.ReactNode;
  historyCount: number;
  /** tel: href, or null when the prospect cannot be dialled. */
  tel: string | null;
  dnc: boolean;
  /** The next prospect in this caller's queue, or the list when none. */
  nextHref: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('info');
  const [preset, setPreset] = useState<Preset | null>(null);

  const go = useCallback((next: Tab) => {
    setTab(next);
    window.scrollTo({ top: 0 });
  }, []);

  // Deep link from the list cards: /app/calls/<id>#log opens the Log tab.
  useEffect(() => {
    if (window.location.hash === '#log') setTab('log');
  }, []);

  const ctx = useMemo(() => ({ preset }), [preset]);

  const panel = (id: Tab) => cn(tab === id ? 'block' : 'hidden', 'lg:block');

  return (
    <WorkspaceContext.Provider value={ctx}>
      <div
        role="tablist"
        aria-label="Prospect sections"
        className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-30 -mx-3 mb-3 grid grid-cols-4 border-b bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/85 lg:hidden"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => go(t.id)}
            className={cn(
              '-mb-px flex min-h-12 items-center justify-center gap-1 border-b-2 text-sm font-medium',
              tab === t.id
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground'
            )}
          >
            {t.label}
            {t.id === 'history' && historyCount > 0 ? (
              <span className="rounded-full bg-muted px-1.5 text-[11px] tabular-nums">
                {historyCount}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-5 lg:gap-6">
        <div className="space-y-4 lg:col-span-3 lg:space-y-6">
          <div id="panel-info" role="tabpanel" aria-labelledby="tab-info" className={panel('info')}>
            {info}
          </div>
          <div id="panel-log" role="tabpanel" aria-labelledby="tab-log" className={panel('log')}>
            {log}
          </div>
        </div>
        <div className="space-y-4 lg:col-span-2 lg:space-y-6">
          <div
            id="panel-script"
            role="tabpanel"
            aria-labelledby="tab-script"
            className={panel('script')}
          >
            {script}
          </div>
          <div
            id="panel-history"
            role="tabpanel"
            aria-labelledby="tab-history"
            className={panel('history')}
          >
            {history}
          </div>
        </div>
      </div>

      {tab === 'log' ? null : (
        <MobileActionBar>
          {tel ? (
            <ActionBarItem href={tel} icon={Phone} label="Call" primary grow={1.5} />
          ) : (
            <ActionBarItem icon={PhoneOff} label={dnc ? 'DNC' : 'No number'} disabled grow={1.5} />
          )}
          {dnc ? null : (
            <>
              <ActionBarItem onClick={() => go('log')} icon={ClipboardEdit} label="Log" />
              <ActionBarItem
                onClick={() => {
                  setPreset({ outcome: 'appointment_booked', n: Date.now() });
                  go('log');
                }}
                icon={CalendarPlus}
                label="Appt"
              />
            </>
          )}
          <ActionBarItem onClick={() => router.push(nextHref)} icon={SkipForward} label="Next" />
        </MobileActionBar>
      )}
    </WorkspaceContext.Provider>
  );
}
