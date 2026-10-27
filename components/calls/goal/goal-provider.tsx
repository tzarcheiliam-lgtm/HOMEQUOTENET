'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ProspectDisposition } from '@/lib/types';
import type { GoalSnapshot } from '@/lib/data/call-stats';
import { DM_REACHED_OUTCOMES } from '@/lib/calls/constants';
import {
  COMBO_THRESHOLD,
  DEDUPE_WINDOW_MS,
  milestoneCrossed,
  milestoneMessage,
  tierFor,
  type GoalTier,
} from '@/lib/calls/goals';
import { playSound, setSoundEnabled, soundEnabled } from '@/lib/calls/sound';
import { toast } from '@/components/ui/toaster';
import { formatMoney } from '@/lib/setter/money';
import { celebrate, Celebrations } from './celebrations';

/**
 * Live state for the daily goal HUD. The server snapshot is the truth; a
 * logged call bumps the count optimistically the moment it is submitted, so
 * the number moves before the next prospect loads. A fresh snapshot (any
 * server re-render after the save) replaces the optimistic bumps; a failed
 * save reverts its bump. Repeat logs on the same prospect within 60 seconds
 * are not counted, exactly as the server counts them.
 */

interface Bump {
  token: number;
  key: string;
  outcome: ProspectDisposition | null;
  at: number;
}

export interface PowerSession {
  startedAt: number;
  startCount: number;
}

interface GoalContextValue {
  goal: number;
  count: number;
  streak: number;
  combo: number;
  bookedToday: number;
  tier: GoalTier;
  week: GoalSnapshot['week'];
  /** Record a call the moment it is submitted. Returns a token, or null if it will not count. */
  bump: (call: { key: string; outcome: ProspectDisposition | null }) => number | null;
  revert: (token: number | null) => void;
  power: PowerSession | null;
  startPower: () => void;
  stopPower: () => void;
  sound: boolean;
  setSound: (on: boolean) => void;
  autoDial: boolean;
  setAutoDial: (on: boolean) => void;
}

const GoalContext = createContext<GoalContextValue | null>(null);

/** Null outside a GoalProvider (e.g. a contractor's leads page): callers no-op. */
export function useGoal(): GoalContextValue | null {
  return useContext(GoalContext);
}

const POWER_KEY = 'hq.calls.power';
const AUTODIAL_KEY = 'hq.calls.autodial';

function readJson<T>(store: 'local' | 'session', key: string): T | null {
  try {
    const raw = (store === 'local' ? window.localStorage : window.sessionStorage).getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function writeJson(store: 'local' | 'session', key: string, v: unknown): void {
  try {
    const s = store === 'local' ? window.localStorage : window.sessionStorage;
    if (v === null) s.removeItem(key);
    else s.setItem(key, JSON.stringify(v));
  } catch {
    /* storage unavailable */
  }
}

const isDm = (o: ProspectDisposition | null) => !!o && DM_REACHED_OUTCOMES.includes(o);

/** "3 of 10 booked this week · each one that sells pays $150" — whatever is known. */
function bookingLine(s: GoalSnapshot, pendingBumps: Bump[]): string {
  // `pendingBumps` are the bumps before this one; this booking is +1.
  const n = (s.bookedThisWeek ?? 0) + pendingBumps.filter((b) => b.outcome === 'appointment_booked').length + 1;
  const week = s.weeklyBookingGoal ? `${n} of ${s.weeklyBookingGoal} booked this week` : `${n} booked this week`;
  const pay = s.payPerSale !== null && s.payPerSale !== undefined ? ` · if it sells, +${formatMoney(s.payPerSale)}` : '';
  return `${week}${pay}. Keep going.`;
}

export function GoalProvider({
  snapshot,
  children,
}: {
  snapshot: GoalSnapshot;
  children: React.ReactNode;
}) {
  const [bumps, setBumps] = useState<Bump[]>([]);
  const [power, setPower] = useState<PowerSession | null>(null);
  const [sound, setSoundState] = useState(false);
  const [autoDial, setAutoDialState] = useState(false);
  const tokenRef = useRef(1);

  // Fresh numbers from the server already include every saved call.
  useEffect(() => {
    setBumps([]);
  }, [snapshot.asOf]);

  useEffect(() => {
    setPower(readJson<PowerSession>('session', POWER_KEY));
    setSoundState(soundEnabled());
    setAutoDialState(readJson<boolean>('local', AUTODIAL_KEY) === true);
  }, []);

  const count = snapshot.today + bumps.length;
  let combo = snapshot.combo;
  for (const b of bumps) if (b.outcome !== null) combo = isDm(b.outcome) ? combo + 1 : 0;
  const bookedToday = snapshot.bookedToday + bumps.filter((b) => b.outcome === 'appointment_booked').length;

  // bump() reads the latest numbers without re-creating itself each render.
  const live = useRef({ count, combo, goal: snapshot.goal, bumps, recent: snapshot.recent, snapshot });
  live.current = { count, combo, goal: snapshot.goal, bumps, recent: snapshot.recent, snapshot };

  const bump = useCallback<GoalContextValue['bump']>(({ key, outcome }) => {
    const now = Date.now();
    const { count: prev, combo: prevCombo, goal, bumps: current, recent } = live.current;
    const seen = [
      ...recent.filter((r) => r.key === key).map((r) => Date.parse(r.at)),
      ...current.filter((b) => b.key === key).map((b) => b.at),
    ];
    if (seen.some((t) => now - t < DEDUPE_WINDOW_MS)) return null;

    const token = tokenRef.current++;
    setBumps((list) => [...list, { token, key, outcome, at: now }]);

    const next = prev + 1;
    const nextCombo = outcome === null ? prevCombo : isDm(outcome) ? prevCombo + 1 : 0;
    const milestone = milestoneCrossed(prev, next, goal);

    if (outcome === 'appointment_booked') {
      playSound('jackpot');
      celebrate({ title: '💰 Appointment booked!', sub: bookingLine(live.current.snapshot, current), intensity: 'jackpot' });
    } else if (milestone !== null && milestone >= goal) {
      playSound('jackpot');
      celebrate({ title: milestoneMessage(milestone, goal), sub: 'Everything from here is bonus.', intensity: 'big' });
    } else if (milestone !== null) {
      playSound('chime');
      celebrate({ intensity: 'small' });
      toast(milestoneMessage(milestone, goal));
    } else {
      playSound('tick');
    }
    if (nextCombo === COMBO_THRESHOLD && outcome !== 'appointment_booked') {
      toast(`🔥 On fire — ${COMBO_THRESHOLD} decision-makers in a row`);
    }
    return token;
  }, []);

  const revert = useCallback((token: number | null) => {
    if (token === null) return;
    setBumps((list) => list.filter((b) => b.token !== token));
  }, []);

  const startPower = useCallback(() => {
    const s = { startedAt: Date.now(), startCount: live.current.count };
    writeJson('session', POWER_KEY, s);
    setPower(s);
  }, []);
  const stopPower = useCallback(() => {
    writeJson('session', POWER_KEY, null);
    setPower(null);
  }, []);
  const setSound = useCallback((on: boolean) => {
    setSoundEnabled(on);
    setSoundState(on);
    if (on) playSound('chime');
  }, []);
  const setAutoDial = useCallback((on: boolean) => {
    writeJson('local', AUTODIAL_KEY, on);
    setAutoDialState(on);
  }, []);

  const value = useMemo<GoalContextValue>(
    () => ({
      goal: snapshot.goal,
      count,
      // Today joins the streak the moment the goal is crossed.
      streak: snapshot.streak + (snapshot.today < snapshot.goal && count >= snapshot.goal ? 1 : 0),
      combo,
      bookedToday,
      tier: tierFor(count, snapshot.goal),
      week: snapshot.week,
      bump,
      revert,
      power,
      startPower,
      stopPower,
      sound,
      setSound,
      autoDial,
      setAutoDial,
    }),
    [snapshot.goal, snapshot.streak, snapshot.today, snapshot.week, count, combo, bookedToday, bump, revert, power, startPower, stopPower, sound, setSound, autoDial, setAutoDial]
  );

  return (
    <GoalContext.Provider value={value}>
      <Celebrations />
      {children}
    </GoalContext.Provider>
  );
}
