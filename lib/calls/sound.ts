/**
 * Tiny synthesized sounds for the calling HUD — no audio files. Off unless
 * the caller turns them on (a per-browser preference). Every call is wrapped
 * so a blocked AudioContext or private-mode storage can never break a page.
 */

export type CallSound = 'tick' | 'chime' | 'jackpot';

const PREF_KEY = 'hq.calls.sound';
let ctx: AudioContext | null = null;

export function soundEnabled(): boolean {
  try {
    return window.localStorage.getItem(PREF_KEY) === '1';
  } catch {
    return false;
  }
}

export function setSoundEnabled(on: boolean): void {
  try {
    window.localStorage.setItem(PREF_KEY, on ? '1' : '0');
  } catch {
    /* storage unavailable: the toggle just won't persist */
  }
}

function tone(ac: AudioContext, freq: number, start: number, dur: number, gain = 0.08, type: OscillatorType = 'sine') {
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0, ac.currentTime + start);
  g.gain.linearRampToValueAtTime(gain, ac.currentTime + start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + start + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(ac.currentTime + start);
  osc.stop(ac.currentTime + start + dur + 0.02);
}

export function playSound(kind: CallSound): void {
  if (!soundEnabled()) return;
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx ??= new AC();
    if (ctx.state === 'suspended') void ctx.resume();
    if (kind === 'tick') {
      tone(ctx, 880, 0, 0.08, 0.05, 'triangle');
    } else if (kind === 'chime') {
      tone(ctx, 659.25, 0, 0.25);
      tone(ctx, 987.77, 0.1, 0.35);
    } else {
      // Cha-ching: a quick rising arpeggio and a bright top note.
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(ctx!, f, i * 0.07, 0.3, 0.07, 'triangle'));
      tone(ctx, 2093, 0.3, 0.5, 0.05);
    }
  } catch {
    /* audio not available */
  }
}
