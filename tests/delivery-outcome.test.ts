import { describe, it, expect } from 'vitest';
import {
  resolveDeliveryOutcome,
  type SinkState,
} from '@/lib/applications/outcome';

/**
 * The rule under test: a contractor is told "Application received" only when a
 * sink actually stored the submission. A log line is not a delivery.
 */

const PROD = true;
const DEV = false;

const outcome = (webhook: SinkState, supabase: SinkState, isProduction: boolean) =>
  resolveDeliveryOutcome({ webhook, supabase, isProduction });

describe('resolveDeliveryOutcome — a sink succeeded', () => {
  it('Supabase success (webhook not configured) reports success', () => {
    expect(outcome('skipped', 'ok', PROD)).toEqual({
      ok: true,
      persisted: true,
      mode: 'delivered',
    });
  });

  it('webhook success (Supabase not configured) reports success', () => {
    expect(outcome('ok', 'skipped', PROD)).toEqual({
      ok: true,
      persisted: true,
      mode: 'delivered',
    });
  });

  it('both sinks succeeding reports success', () => {
    expect(outcome('ok', 'ok', PROD)).toEqual({
      ok: true,
      persisted: true,
      mode: 'delivered',
    });
  });
});

describe('resolveDeliveryOutcome — one sink fails, the other succeeds', () => {
  it('webhook fails but Supabase stores it → success', () => {
    // The application is safely in the database; the applicant should not be
    // told to try again.
    expect(outcome('failed', 'ok', PROD)).toEqual({
      ok: true,
      persisted: true,
      mode: 'delivered',
    });
  });

  it('Supabase fails but the webhook delivers it → success', () => {
    expect(outcome('ok', 'failed', PROD)).toEqual({
      ok: true,
      persisted: true,
      mode: 'delivered',
    });
  });

  it('holds in development too', () => {
    expect(outcome('failed', 'ok', DEV).ok).toBe(true);
    expect(outcome('ok', 'failed', DEV).ok).toBe(true);
  });
});

describe('resolveDeliveryOutcome — nothing configured', () => {
  it('in PRODUCTION returns an error and never claims success', () => {
    const r = outcome('skipped', 'skipped', PROD);
    expect(r).toEqual({ ok: false, persisted: false, mode: 'unconfigured' });
    // The regression this guards: a log-only "success" silently loses the lead.
    expect(r.ok).toBe(false);
    expect(r.persisted).toBe(false);
  });

  it('in DEVELOPMENT keeps the clearly-identified logging fallback', () => {
    const r = outcome('skipped', 'skipped', DEV);
    expect(r).toEqual({ ok: true, persisted: false, mode: 'log_only_dev' });
    // Success locally, but never counted as persisted.
    expect(r.persisted).toBe(false);
  });
});

describe('resolveDeliveryOutcome — every configured sink failed', () => {
  it('both configured and both failing in PRODUCTION is an error', () => {
    expect(outcome('failed', 'failed', PROD)).toEqual({
      ok: false,
      persisted: false,
      mode: 'failed',
    });
  });

  it('a single configured sink failing in PRODUCTION is an error', () => {
    expect(outcome('failed', 'skipped', PROD).ok).toBe(false);
    expect(outcome('skipped', 'failed', PROD).ok).toBe(false);
  });

  it('failures in DEVELOPMENT are errors too, not a logging fallback', () => {
    // A configured sink that is broken is a real bug; the developer must see
    // it rather than have it masked by the log-only path.
    const r = outcome('failed', 'failed', DEV);
    expect(r.ok).toBe(false);
    expect(r.mode).toBe('failed');
  });
});

describe('resolveDeliveryOutcome — invariants', () => {
  const states: SinkState[] = ['skipped', 'ok', 'failed'];

  it('ok is true only when a sink succeeded, or in the dev fallback', () => {
    for (const w of states) {
      for (const s of states) {
        for (const prod of [PROD, DEV]) {
          const r = outcome(w, s, prod);
          const aSinkSucceeded = w === 'ok' || s === 'ok';
          const devFallback = !prod && w === 'skipped' && s === 'skipped';
          expect(r.ok).toBe(aSinkSucceeded || devFallback);
        }
      }
    }
  });

  it('persisted is true if and only if a sink returned ok', () => {
    for (const w of states) {
      for (const s of states) {
        for (const prod of [PROD, DEV]) {
          expect(outcome(w, s, prod).persisted).toBe(w === 'ok' || s === 'ok');
        }
      }
    }
  });

  it('never reports success in production without persisting', () => {
    for (const w of states) {
      for (const s of states) {
        const r = outcome(w, s, PROD);
        if (r.ok) expect(r.persisted).toBe(true);
      }
    }
  });

  it('only log_only_dev may be ok while not persisted', () => {
    for (const w of states) {
      for (const s of states) {
        for (const prod of [PROD, DEV]) {
          const r = outcome(w, s, prod);
          if (r.ok && !r.persisted) expect(r.mode).toBe('log_only_dev');
        }
      }
    }
  });
});
