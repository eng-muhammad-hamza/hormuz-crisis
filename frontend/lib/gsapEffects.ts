'use client';
import { gsap } from 'gsap';

/**
 * Reusable GSAP effects. Framer Motion handles component mount/unmount and
 * layout transitions throughout the app; GSAP is used here specifically for
 * the things it's better suited to: numeric ticker counting, timeline-based
 * multi-step sequences (the siren screen-shake), and SVG stroke draw-in for
 * the ship wake / route-line "transmission" effect.
 */

/** Animate a number counting up/down — used for fuel %, distance, ETA digits. */
export function tickerCount(
  el: HTMLElement | null,
  from: number,
  to: number,
  opts: { duration?: number; decimals?: number; suffix?: string; onUpdate?: (v: number) => void } = {}
) {
  if (!el) return;
  const { duration = 0.6, decimals = 0, suffix = '', onUpdate } = opts;
  const obj = { val: from };
  gsap.to(obj, {
    val: to,
    duration,
    ease: 'power2.out',
    onUpdate: () => {
      const v = Number(obj.val.toFixed(decimals));
      if (el) el.textContent = `${v}${suffix}`;
      onUpdate?.(v);
    },
  });
}

/** Brief, sharp screen-shake — fired once per NEW critical alert, not looped. */
export function screenShake(el: HTMLElement | null, intensity = 6) {
  if (!el) return;
  gsap.timeline()
    .to(el, { x: -intensity, duration: 0.04 })
    .to(el, { x: intensity, duration: 0.06 })
    .to(el, { x: -intensity * 0.6, duration: 0.06 })
    .to(el, { x: intensity * 0.4, duration: 0.06 })
    .to(el, { x: 0, duration: 0.08, ease: 'power2.out' });
}

/** Draw-in animation for an SVG path (ship route line / wake trail). */
export function drawPath(path: SVGPathElement | null, duration = 0.8) {
  if (!path) return;
  const length = path.getTotalLength();
  gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
  gsap.to(path, { strokeDashoffset: 0, duration, ease: 'power1.inOut' });
}

/** Staggered entrance for a list of card elements (sidebar ships, alert rows). */
export function staggerIn(els: Element[] | NodeListOf<Element>, opts: { stagger?: number; y?: number } = {}) {
  const { stagger = 0.04, y = 10 } = opts;
  gsap.fromTo(
    els,
    { opacity: 0, y },
    { opacity: 1, y: 0, duration: 0.35, stagger, ease: 'power2.out' }
  );
}

/** Pulsing glow ring used behind the siren icon while a critical alert is active. */
export function pulseRing(el: HTMLElement | null) {
  if (!el) return null;
  const tween = gsap.to(el, {
    scale: 1.8,
    opacity: 0,
    duration: 1.4,
    repeat: -1,
    ease: 'power1.out',
    transformOrigin: 'center',
  });
  return tween;
}

export { gsap };
