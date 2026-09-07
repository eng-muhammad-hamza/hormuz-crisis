'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store';
import { useShallow } from 'zustand/react/shallow';
import { formatETA } from '@/lib/utils';
import { AnimatedIcon, type IconName } from '@/components/ui/AnimatedIcon';

export default function StatusTicker() {
  const fleet = useStore(useShallow((s) => s.fleet));
  const [idx, setIdx] = useState(0);

  const items: {
    iconName: IconName;
    text: string;
    cls: string;
    highlight?: boolean;
  }[] = [];

  if (fleet) {
    const distressed = fleet.ships.filter((s) => s.status === 'distressed');
    const fuelCritical = fleet.ships.filter((s) => s.fuel < 500 && !s.arrived);
    const inWeather = fleet.ships.filter((s) => s.inWeather && !s.arrived);
    const rerouting = fleet.ships.filter((s) => s.status === 'rerouting');
    const arrived = fleet.ships.filter((s) => s.status === 'arrived');
    const critAlerts = fleet.alerts.filter(
      (a) => a.severity === 'critical' && !a.acknowledged
    );

    if (distressed.length)
      items.push({
        iconName: 'alert',
        text: `MAYDAY DISTRESS: ${distressed
          .map((s) => s.name)
          .join(', ')} REQUIRES IMMEDIATE ESCORT / MUTUAL AID`,
        cls: 'text-rose-400 font-bold',
        highlight: true,
      });
    if (fuelCritical.length)
      items.push({
        iconName: 'fuel',
        text: `CRITICAL FUEL DEPLETION: ${fuelCritical
          .map((s) => s.name)
          .join(', ')} (< 500t)`,
        cls: 'text-rose-400 font-bold',
        highlight: true,
      });
    if (critAlerts.length)
      items.push({
        iconName: 'bell',
        text: `${critAlerts.length} CRITICAL DEFENSE / PIRACY ALERTS ACTIVE IN THEATER`,
        cls: 'text-rose-400 font-bold',
        highlight: true,
      });
    if (rerouting.length)
      items.push({
        iconName: 'compass',
        text: `${rerouting.length} VESSELS EXECUTING REROUTE VECTORS TO AVOID CONFLICT ZONES`,
        cls: 'text-amber-400 font-semibold',
      });
    if (inWeather.length)
      items.push({
        iconName: 'wind',
        text: `${inWeather.length} VESSELS TRANSITING HEAVY WEATHER (+30% FUEL BURN RATE)`,
        cls: 'text-amber-400 font-semibold',
      });
    if (fleet.zones.filter((z) => z.active).length)
      items.push({
        iconName: 'shield',
        text: `${
          fleet.zones.filter((z) => z.active).length
        } RESTRICTED MARITIME ZONES ACTIVE IN STRAIT`,
        cls: 'text-amber-400 font-semibold',
      });

    const enRoute = fleet.ships
      .filter((s) => !s.arrived && s.eta && s.status === 'normal')
      .slice(0, 4);
    for (const ship of enRoute) {
      const dest = fleet.ports.find((p) => p.id === ship.destination);
      items.push({
        iconName: 'navigation',
        text: `${ship.name} → ${dest?.name || ship.destination} · ETA ${formatETA(
          ship.eta
        )}`,
        cls: 'text-cyan-400 font-medium',
      });
    }
    if (arrived.length)
      items.push({
        iconName: 'check',
        text: `SAFELY DOCKED: ${arrived.map((s) => s.name).join(', ')}`,
        cls: 'text-emerald-400 font-medium',
      });
    if (!items.length)
      items.push({
        iconName: 'activity',
        text: 'ALL SYSTEMS NOMINAL — 15 COMMERCIAL VESSELS TRACKED IN STRAIT OF HORMUZ',
        cls: 'text-emerald-400 font-medium',
      });
  } else {
    items.push({
      iconName: 'radio',
      text: 'ESTABLISHING SECURE REAL-TIME TELEMETRY UPLINK…',
      cls: 'text-slate-400',
    });
  }

  useEffect(() => {
    if (items.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % items.length), 4500);
    return () => clearInterval(t);
  }, [items.length]);

  const cur = items[idx % Math.max(1, items.length)];

  return (
    <div className="h-8 sm:h-9 shrink-0 flex items-center border-b border-slate-800 bg-slate-950/90 backdrop-blur-md px-4 sm:px-6 gap-3 relative z-10 text-xs sm:text-sm">
      <div className="flex items-center gap-2 shrink-0 pr-3 border-r border-slate-800">
        <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#00E5FF] animate-pulse" />
        <span className="font-bold tracking-wider text-xs text-cyan-400 uppercase">
          SITREP
        </span>
      </div>

      <div className="flex-1 overflow-hidden relative h-6">
        <AnimatePresence mode="wait">
          {cur && (
            <motion.div
              key={idx}
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -12, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-0 flex items-center gap-2.5 truncate"
            >
              <div className="shrink-0 text-slate-300">
                <AnimatedIcon
                  name={cur.iconName}
                  size={16}
                  isAnimated={cur.highlight}
                />
              </div>
              <span className={`truncate text-xs sm:text-sm tracking-wide ${cur.cls}`}>
                {cur.text}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {items.slice(0, 6).map((_, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            aria-label={`Jump to sitrep ${i + 1}`}
            className={`w-2 h-2 rounded-full transition-all cursor-pointer border-none
              ${
                i === idx % items.length
                  ? 'bg-cyan-400 shadow-[0_0_6px_#00E5FF] scale-125'
                  : 'bg-slate-700 hover:bg-slate-500'
              }`}
          />
        ))}
      </div>
    </div>
  );
}
