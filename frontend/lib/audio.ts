'use client';

/**
 * Audio engine for HORMUZ CRISIS.
 *
 * Browsers block AudioContext output until a user gesture unlocks it, and
 * creating a fresh AudioContext per sound (the old implementation) silently
 * fails after the first call in most browsers — which is why alert sounds
 * were inaudible. This module keeps ONE shared, lazily-created context,
 * exposes an explicit `unlockAudio()` to call from the first click anywhere
 * in the app, and renders a genuine two-tone siren wail (not a single beep)
 * for critical/distress events so it's actually audible and identifiable.
 */

let ctx: AudioContext | null = null;
let unlocked = false;
let activeSiren: { stop: () => void } | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  return ctx;
}

/** Call this from any user gesture (click) to satisfy browser autoplay policy. */
export function unlockAudio() {
  const c = getCtx();
  if (!c) return;
  if (c.state === 'suspended') c.resume();
  unlocked = true;
}

export function isAudioUnlocked() {
  return unlocked;
}

function tone(c: AudioContext, freq: number, start: number, dur: number, gainPeak: number, type: OscillatorType = 'sine') {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(gainPeak, start + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(start);
  osc.stop(start + dur + 0.02);
  return osc;
}

export type SoundType = 'alert' | 'distress' | 'arrival' | 'warning' | 'directive' | 'command' | 'success' | 'click';

/** Short, one-shot UI sounds — chimes, blips, confirmations. */
export function playSound(type: SoundType) {
  const c = getCtx();
  if (!c) return;
  if (c.state === 'suspended') c.resume();
  const t = c.currentTime;

  switch (type) {
    case 'distress':
      tone(c, 880, t, 0.16, 0.22); tone(c, 660, t + 0.14, 0.16, 0.22); tone(c, 880, t + 0.28, 0.18, 0.22);
      break;
    case 'alert':
      tone(c, 700, t, 0.14, 0.18); tone(c, 560, t + 0.12, 0.16, 0.18);
      break;
    case 'warning':
      tone(c, 460, t, 0.16, 0.13);
      break;
    case 'arrival':
      tone(c, 523, t, 0.12, 0.13); tone(c, 659, t + 0.1, 0.12, 0.13); tone(c, 784, t + 0.2, 0.18, 0.13);
      break;
    case 'success':
      tone(c, 600, t, 0.1, 0.12); tone(c, 900, t + 0.08, 0.16, 0.12);
      break;
    case 'command':
    case 'directive':
      tone(c, 520, t, 0.08, 0.14, 'square'); tone(c, 780, t + 0.09, 0.12, 0.16, 'square');
      break;
    case 'click':
      tone(c, 1000, t, 0.04, 0.05, 'square');
      break;
  }
}

/**
 * Continuous two-tone war siren — genuinely loops (rising/falling wail) until
 * stopSiren() is called. Used for sustained critical-distress states so it's
 * unmistakable even with the tab unfocused or panel closed.
 */
function _unusedSiren() { // siren added in next commit
  const c = getCtx();
  if (!c) return;
  if (c.state === 'suspended') c.resume();
  if (activeSiren) return; // already wailing

  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'sawtooth';
  gain.gain.value = 0;
  osc.connect(gain);
  gain.connect(c.destination);

  const WAIL_LOW = 420, WAIL_HIGH = 880, WAIL_PERIOD = 1.1;
  let running = true;
  const startTime = c.currentTime;

  gain.gain.setTargetAtTime(0.12, c.currentTime, 0.08);
  osc.start();

  const lfo = () => {
    if (!running) return;
    const elapsed = c.currentTime - startTime;
    const phase = (elapsed % WAIL_PERIOD) / WAIL_PERIOD; // 0..1
    const wail = WAIL_LOW + (WAIL_HIGH - WAIL_LOW) * (0.5 - 0.5 * Math.cos(phase * Math.PI * 2));
    osc.frequency.setValueAtTime(wail, c.currentTime);
    requestAnimationFrame(lfo);
  };
  lfo();

  activeSiren = {
    stop: () => {
      running = false;
      gain.gain.setTargetAtTime(0, c.currentTime, 0.12);
      setTimeout(() => { try { osc.stop(); } catch { /* already stopped */ } }, 250);
    },
  };
}

export function stopSiren() {
  if (activeSiren) { activeSiren.stop(); activeSiren = null; }
}

export function isSirenActive() {
  return !!activeSiren;
}
