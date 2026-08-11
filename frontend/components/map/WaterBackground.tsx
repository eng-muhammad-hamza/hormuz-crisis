'use client';
import { useEffect, useRef } from 'react';
import { useStore } from '@/store';

export default function WaterBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const { theme } = useStore();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let t = 0;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = () => {
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      t += 0.006;

      const tacticalColors = {
        dark:  { base: 'rgba(3,7,18,',    grid: 'rgba(56,189,248,',  accent: 'rgba(0,229,255,' },
        light: { base: 'rgba(238,242,246,', grid: 'rgba(148,163,184,', accent: 'rgba(2,132,199,' },
      };
      const c = tacticalColors[theme] || tacticalColors.dark;

      // Base void fill
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, `${c.base}0.92)`);
      grad.addColorStop(1, `${c.base}0.82)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Bathymetric Topographic Waves
      const contours = [
        { amp: 8, freq: 0.004, speed: 0.2, opacity: 0.08, yOffset: H * 0.25 },
        { amp: 14, freq: 0.003, speed: 0.15, opacity: 0.06, yOffset: H * 0.55 },
        { amp: 10, freq: 0.006, speed: 0.25, opacity: 0.07, yOffset: H * 0.8 },
      ];

      ctx.lineWidth = 1;
      for (const contour of contours) {
        ctx.beginPath();
        ctx.moveTo(0, contour.yOffset);
        for (let x = 0; x <= W; x += 15) {
          const y = contour.yOffset +
            Math.sin(x * contour.freq + t * contour.speed) * contour.amp +
            Math.cos(x * contour.freq * 2 - t * contour.speed * 0.5) * contour.amp * 0.4;
          ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `${c.grid}${contour.opacity})`;
        ctx.stroke();
      }

      // Tactical Grid Coordinates
      ctx.save();
      const gridSpacing = 70;
      ctx.strokeStyle = `${c.grid}0.08)`;
      ctx.lineWidth = 0.8;
      for (let x = 0; x < W; x += gridSpacing) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 0; y < H; y += gridSpacing) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
      ctx.restore();

      // Sweeping Tactical Radar Beam
      const sweepY = (t * 300) % (H + 100);
      const sweepGrad = ctx.createLinearGradient(0, sweepY - 60, 0, sweepY);
      sweepGrad.addColorStop(0, `${c.accent}0)`);
      sweepGrad.addColorStop(1, `${c.accent}0.12)`);
      ctx.fillStyle = sweepGrad;
      ctx.fillRect(0, sweepY - 60, W, 60);

      // Sweep frontier line
      ctx.fillStyle = `${c.accent}0.4)`;
      ctx.fillRect(0, sweepY, W, 1);

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0 mix-blend-screen opacity-70"
    />
  );
}
