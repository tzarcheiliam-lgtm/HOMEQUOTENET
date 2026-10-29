/**
 * Pure logic behind the result's realistic photo: the render session
 * (capture the design, start the render, poll, preload the image) with its
 * I/O injected so it runs in tests without a browser, when to start it on its
 * own, the "developing" clock, and how Share works on this device.
 * No React and no DOM (tests/estimator-unlock.test.tsx).
 */

import type { RenderStart, RenderStatus } from '@/lib/estimator/render-client';
import { RENDER_POLL_MS, RENDER_TIMEOUT_MS, renderStartProblem, type RenderHelp } from './builder';

/* ------------------------------------------------------------------ */
/* Render session                                                      */
/* ------------------------------------------------------------------ */

export type RenderPhase =
  | { kind: 'idle' }
  /** Capturing the design and starting the render (no task yet). */
  | { kind: 'preparing' }
  | { kind: 'running'; taskId: string; before: string; startedAt: number }
  | { kind: 'done'; before: string; imageUrl: string }
  /** Renders are off, used up or this session has ended: no photo, and trying again cannot help. */
  | { kind: 'off'; message: string }
  /** Something went wrong that another try might fix. */
  | { kind: 'failed'; message: string };

/** What the session needs from the outside world (the browser, or a test). */
export type RenderDeps = {
  /** The design as a PNG data URL (rasterizeScene, after switching the picture to day). */
  capture: () => Promise<string>;
  start: (png: string) => Promise<RenderStart>;
  check: (taskId: string) => Promise<RenderStatus>;
  /** Resolves once the finished image has loaded, so it reveals in one go. */
  preload: (url: string) => Promise<void>;
  sleep: (ms: number) => Promise<void>;
  now: () => number;
  /** True once nobody is waiting for the result any more (the screen went away). */
  cancelled: () => boolean;
};

export const RENDER_MESSAGES = {
  capture: 'We could not capture your design for the realistic photo. Please try again.',
  slow: 'The realistic photo is taking longer than it should. Please try again in a minute.',
  load: 'We could not load the realistic photo. Please try again.',
  finish: 'We could not finish the realistic photo. Please try again.',
} as const;

/**
 * One render, start to finish: reports every phase through `onPhase` and
 * resolves with the last one. Never throws. A start that fails is 'off' when
 * another try cannot help (renders off, the per-lead limit, an expired
 * session) and 'failed' otherwise; a dropped status check is retried until
 * `timeoutMs`. Once `cancelled()` turns true it stops quietly (no more calls
 * or phases) and resolves 'idle'.
 */
export async function runRenderSession(
  deps: RenderDeps,
  onPhase: (phase: RenderPhase) => void,
  /** `help`: who shows the look in person, for the "cannot make a photo" messages (pool wording by default). */
  opts: { pollMs?: number; timeoutMs?: number; help?: RenderHelp } = {},
): Promise<RenderPhase> {
  const pollMs = opts.pollMs ?? RENDER_POLL_MS;
  const timeoutMs = opts.timeoutMs ?? RENDER_TIMEOUT_MS;
  const stopped: RenderPhase = { kind: 'idle' };
  const emit = (phase: RenderPhase): RenderPhase => {
    if (deps.cancelled()) return stopped;
    onPhase(phase);
    return phase;
  };
  const failed = (message: string): RenderPhase => emit({ kind: 'failed', message });

  emit({ kind: 'preparing' });
  let png: string;
  try {
    png = await deps.capture();
  } catch {
    return failed(RENDER_MESSAGES.capture);
  }
  if (deps.cancelled()) return stopped;

  const res = await deps.start(png).catch((): RenderStart => ({ ok: false, reason: 'error', message: '' }));
  if (!res.ok) {
    const problem = renderStartProblem(res, opts.help);
    return problem.retry ? failed(problem.message) : emit({ kind: 'off', message: problem.message });
  }
  const startedAt = deps.now();
  emit({ kind: 'running', taskId: res.taskId, before: png, startedAt });

  for (;;) {
    await deps.sleep(pollMs);
    if (deps.cancelled()) return stopped;
    if (deps.now() - startedAt > timeoutMs) return failed(RENDER_MESSAGES.slow);
    let status: RenderStatus;
    try {
      status = await deps.check(res.taskId);
    } catch {
      continue; // a dropped check is retried; the timeout above still applies
    }
    if (deps.cancelled()) return stopped;
    if (status.status === 'failed') return failed(RENDER_MESSAGES.finish);
    if (status.status === 'done') {
      try {
        await deps.preload(status.imageUrl);
      } catch {
        return failed(RENDER_MESSAGES.load);
      }
      return emit({ kind: 'done', before: png, imageUrl: status.imageUrl });
    }
  }
}

/**
 * Whether the result should start the realistic photo by itself: only when
 * the lead response carried a render token and this token has not been used
 * for an automatic start yet (a remount never spends a second render).
 * It uses one of the lead's renders; the server still caps them per lead.
 */
export function shouldAutoRender(renderToken: string | undefined, alreadyStarted: ReadonlySet<string>): renderToken is string {
  return Boolean(renderToken) && !alreadyStarted.has(renderToken!);
}

/**
 * Pause before the automatic start: lets the price count up and land before
 * the (CPU-heavy) snapshot of the design is taken, so the roll never stutters.
 * Kept after the result's PHOTO_PANEL_DELAY_MS-sized price reveal (about 1.2 s).
 */
export const AUTO_RENDER_DELAY_MS = 1600;

/** True while the photo is on its way (the developing state shows). */
export function renderWorking(phase: RenderPhase): boolean {
  return phase.kind === 'preparing' || phase.kind === 'running';
}

/* ------------------------------------------------------------------ */
/* Developing clock                                                    */
/* ------------------------------------------------------------------ */

/** "0:07", "1:12": the elapsed time shown while the photo develops. */
export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor((Number.isFinite(ms) ? ms : 0) / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/* ------------------------------------------------------------------ */
/* Share                                                               */
/* ------------------------------------------------------------------ */

/** What this browser can do (read once on the client). */
export type ShareEnv = { canShareFiles: boolean; canShare: boolean; canCopy: boolean };

/**
 * How "Share" works here: the picture itself through the share sheet when the
 * device can share files; otherwise the share sheet with a link to the photo;
 * otherwise the photo's link copied; otherwise nothing (the button is hidden:
 * "Save my design" already downloads the design).
 */
export function sharePlan(env: ShareEnv, hasPhoto: boolean): 'files' | 'link' | 'copy' | null {
  if (env.canShareFiles) return 'files';
  if (hasPhoto && env.canShare) return 'link';
  if (hasPhoto && env.canCopy) return 'copy';
  return null;
}
