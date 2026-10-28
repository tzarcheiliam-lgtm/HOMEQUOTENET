/**
 * Pure helpers for the live pool builder's sense of progress: the named
 * stages above the questions (Pool, Style, Finishes, Features, Yard, Unlock),
 * the rewards being earned (Design, Price, Realistic photo) and the wording of
 * the unlock step. No React and no DOM, so they are unit-tested directly
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

export type StageId = 'pool' | 'style' | 'finishes' | 'features' | 'yard' | 'unlock';

const STAGE_LABEL: Record<StageId, string> = {
  pool: 'Pool',
  style: 'Style',
  finishes: 'Finishes',
  features: 'Features',
  yard: 'Yard',
  unlock: 'Unlock',
};

const POOL_ROLES = new Set(['project', 'shape', 'size']);
const FINISH_IDS = new Set(['surface', 'tile', 'coping', 'deck', 'deckSize']);
const FEATURE_IDS = new Set(['features', 'equipment']);
const YARD_IDS = new Set(['extras', 'cracks', 'access', 'hillside']);

/** The stage a screen belongs to on its own merits, or undefined (it then joins the stage before it). */
function ownStage(screen: FlowScreen): StageId | undefined {
  if (screen.kind === 'zip' || screen.kind === 'contact') return 'unlock';
  if (screen.kind !== 'questions') return undefined;
  if (screen.group === 'package' || screen.group === 'scope') return 'style';
  const has = (set: Set<string>) => screen.questions.some((q) => set.has(q.id) || (q.role !== undefined && set.has(q.role)));
  if (has(POOL_ROLES)) return 'pool';
  if (has(FINISH_IDS)) return 'finishes';
  if (has(FEATURE_IDS)) return 'features';
  if (has(YARD_IDS) || screen.id === 'property') return 'yard';
  return undefined;
}

/**
 * The named stages for the screens the homeowner will actually see, in order,
 * and the stage of each screen. A screen with no stage of its own (the looks
 * gallery, an unknown question) stays in the stage before it, and a stage
 * never comes back after a later one started, so the bar only moves forward.
 * Stages the path skips (Finishes and Features on the package path) are left out.
 */
export function flowStages(screens: readonly FlowScreen[]): { stages: Stage[]; stageOf: Record<string, StageId> } {
  const order: StageId[] = ['pool', 'style', 'finishes', 'features', 'yard', 'unlock'];
  const stages: Stage[] = [];
  const stageOf: Record<string, StageId> = {};
  let current: StageId | undefined;
  for (const screen of screens) {
    const own = ownStage(screen);
    const next = own && (!current || order.indexOf(own) > order.indexOf(current)) ? own : (current ?? own ?? 'pool');
    if (next !== current) {
      current = next;
      stages.push({ id: next, label: STAGE_LABEL[next] });
    }
    stageOf[screen.id] = current;
  }
  return { stages, stageOf };
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
 * realistic photo when renders are on, and never says anything will be sent
 * to them: the price, design and photo appear on the page.
 */
export function unlockCopy(rendersEnabled: boolean): UnlockCopy {
  return rendersEnabled
    ? {
        zipTitle: 'Unlock your realistic photo and price',
        contactTitle: 'One last step to unlock your photo and price',
        promise: 'See your ballpark price and design as soon as you finish, plus a realistic photo of your new pool, ready in about a minute.',
        submit: 'Unlock my photo and price',
        submitting: 'Unlocking…',
      }
    : {
        zipTitle: 'Unlock your price',
        contactTitle: 'One last step to unlock your price',
        promise: 'See your ballpark price and design as soon as you finish.',
        submit: 'Unlock my price',
        submitting: 'Unlocking…',
      };
}
