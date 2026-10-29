/**
 * Pure helpers for the live builder's sense of progress: the named
 * stages above the questions (Pool, Style, Details, Unlock), the rewards being
 * earned (Design, Price, Realistic photo) and the wording of the unlock step.
 * No React and no DOM, so they are unit-tested directly
 * (tests/estimator-unlock.test.tsx).
 *
 * Honesty rules: the realistic photo is only named when renders are switched
 * on (rendersEnabled), and nothing here ever carries a price.
 */

import type { RewardStep } from './shell/reward-tracker';
import type { Stage } from './shell/stage-stepper';
import type { FlowScreen } from './use-estimator-flow';

/* ------------------------------------------------------------------ */
/* Stages                                                              */
/* ------------------------------------------------------------------ */

export type StageId = 'pool' | 'style' | 'details' | 'unlock';

/** Short enough that four fit side by side on a 390 px phone. */
const STAGE_LABEL: Record<StageId, string> = {
  pool: 'Pool',
  style: 'Style',
  details: 'Details',
  unlock: 'Unlock',
};

const ORDER: readonly StageId[] = ['pool', 'style', 'details', 'unlock'];

const POOL_ROLES = new Set(['project', 'shape', 'size']);
/** Finishes and features are part of the look, so "Build my own" adds screens to Style instead of new stages. */
const STYLE_IDS = new Set(['surface', 'tile', 'coping', 'deck', 'deckSize', 'features', 'equipment']);
const DETAIL_IDS = new Set(['extras', 'cracks', 'access', 'hillside']);

/** The stage a screen belongs to on its own merits, or undefined (it then joins the stage before it). */
function ownStage(screen: FlowScreen): StageId | undefined {
  if (screen.kind === 'zip' || screen.kind === 'contact') return 'unlock';
  // "Which look do you like?" is inspiration for the style, wherever it sits in the path.
  if (screen.kind === 'looks') return 'style';
  if (screen.kind !== 'questions') return undefined;
  if (screen.group === 'package' || screen.group === 'scope') return 'style';
  const has = (set: Set<string>) => screen.questions.some((q) => set.has(q.id) || (q.role !== undefined && set.has(q.role)));
  if (has(POOL_ROLES)) return 'pool';
  if (has(STYLE_IDS)) return 'style';
  if (has(DETAIL_IDS) || screen.id === 'property') return 'details';
  return undefined;
}

/**
 * The named stages for the screens the homeowner will see, in order, and the
 * stage of each screen. A screen with no stage of its own stays in the stage
 * before it, and a stage never comes back after a later one started (a looks
 * gallery placed after the property questions stays in Details), so the bar
 * only moves forward. Opening "Build my own" adds screens inside Style rather
 * than adding stages, so the number of stages does not jump mid-way.
 * `firstLabel` names the first stage for the trade ("Pool", "Bathroom"; the
 * stage id stays 'pool').
 */
export function flowStages(screens: readonly FlowScreen[], firstLabel = STAGE_LABEL.pool): { stages: Stage[]; stageOf: Record<string, StageId> } {
  const labels: Record<StageId, string> = { ...STAGE_LABEL, pool: firstLabel };
  const stages: Stage[] = [];
  const stageOf: Record<string, StageId> = {};
  let current: StageId | undefined;
  for (const screen of screens) {
    const own = ownStage(screen);
    const next = own && (!current || ORDER.indexOf(own) > ORDER.indexOf(current)) ? own : (current ?? own ?? 'pool');
    if (next !== current) {
      current = next;
      stages.push(next === 'unlock' ? { id: next, label: labels[next], prize: true } : { id: next, label: labels[next] });
    }
    stageOf[screen.id] = current;
  }
  return { stages, stageOf };
}

/**
 * How far through its stage a screen is, as a share of that stage (0 to 1):
 * the current segment of the stage bar fills in steps instead of all at once.
 */
export function stageFraction(screens: readonly FlowScreen[], stageOf: Record<string, StageId>, screenId: string): number {
  const stage = stageOf[screenId];
  if (!stage) return 0;
  const inStage = screens.filter((s) => stageOf[s.id] === stage);
  const at = inStage.findIndex((s) => s.id === screenId);
  return at < 0 ? 0 : (at + 1) / inStage.length;
}

/* ------------------------------------------------------------------ */
/* Rewards                                                             */
/* ------------------------------------------------------------------ */

/** Where the homeowner is: still designing, on the ZIP/contact (unlock) screens, or on the result. */
export type FlowPhase = 'design' | 'unlock' | 'result';

/** The realistic photo on the result: being made, ready, or not coming (off, failed, not started). */
export type PhotoProgress = 'pending' | 'done' | 'none';

export const PHOTO_REWARD_LABEL = 'Realistic photo';

/**
 * Design > Price > Realistic photo. Design is done once the last design
 * screen is passed; Price and the photo stay locked until the result. The
 * photo step is only there when renders are on, and on the result only while
 * the photo is being made or once it is ready (a photo that does not come
 * simply drops out: no error drama).
 */
export function rewardSteps(phase: FlowPhase, rendersEnabled: boolean, photo: PhotoProgress = 'none'): RewardStep[] {
  const steps: RewardStep[] = [
    { id: 'design', label: 'Design', done: phase !== 'design' },
    { id: 'price', label: 'Price', done: phase === 'result', locked: phase !== 'result' },
  ];
  if (phase !== 'result') {
    if (rendersEnabled) steps.push({ id: 'photo', label: PHOTO_REWARD_LABEL, done: false, locked: true });
  } else if (photo !== 'none') {
    steps.push({ id: 'photo', label: PHOTO_REWARD_LABEL, done: photo === 'done' });
  }
  return steps;
}

/* ------------------------------------------------------------------ */
/* Unlock step wording                                                 */
/* ------------------------------------------------------------------ */

export type UnlockCopy = {
  /** Heading of the ZIP screen. */
  zipTitle: string;
  /** Heading of the contact screen. */
  contactTitle: string;
  /** The one honest line about what they get. */
  promise: string;
  /** Contact screen submit button, and its label while sending. */
  submit: string;
  submitting: string;
};

/**
 * Words for the unlock step (ZIP and contact screens). Only promises the
 * realistic photo when renders are on, never says anything will be sent to
 * them (the price and photo appear on the page), and never calls the design
 * locked: they can already see it. `subject` is the trade's ("pool", "bathroom").
 */
export function unlockCopy(rendersEnabled: boolean, subject = 'pool'): UnlockCopy {
  return rendersEnabled
    ? {
        zipTitle: 'Unlock your realistic photo and price',
        contactTitle: 'One last step to unlock your photo and price',
        promise: `Your design is ready. Unlock your ballpark price now, and a realistic photo of your ${subject} about a minute later.`,
        submit: 'Unlock my photo and price',
        submitting: 'Crunching numbers…',
      }
    : {
        zipTitle: 'Unlock your price',
        contactTitle: 'One last step to unlock your price',
        promise: 'Your design is ready. Unlock your ballpark price range to see what it could cost.',
        submit: 'Unlock my price',
        submitting: 'Crunching numbers…',
      };
}
