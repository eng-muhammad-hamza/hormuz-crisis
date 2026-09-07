'use client';

import { motion } from 'framer-motion';
import { useStore } from '@/store';
import { useShallow } from 'zustand/react/shallow';
import { fuelPercent, fuelColor } from '@/lib/utils';
import { STATUS_COLORS } from '@/lib/theme';
import { AnimatedIcon, type IconName } from '@/components/ui/AnimatedIcon';

export default function OpsStatusBar() {
  const fleet = useStore(useShallow((s) => s.fleet));
  const theme = useStore((s) => s.theme);
  if (!fleet) return null;

  const isLight = theme === 'light';
  const ships = fleet.ships;
  const totalFuel = ships.reduce((a, s) => a + s.fuel, 0);
  const maxFuel = ships.reduce((a, s) => a + (s.fuelCapacity || 8500), 0);
  const overallFuel = fuelPercent(totalFuel, maxFuel);
  const critAlerts = fleet.alerts.filter(
    (a) => a.severity === 'critical' && !a.acknowledged
  ).length;

  const stats: {
    iconName: IconName;
    label: string;
    value: string | number;
    cls?: string;
    hex?: string;
    blink?: boolean;
  }[] = [
    {
      iconName: 'anchor',
      label: 'ACTIVE FLEET',
      value: `${ships.filter((s) => !s.arrived).length}/15`,
      cls: 'text-cyan-400',
    },
    {
      iconName: 'navigation',
      label: 'NORMAL',
      value: ships.filter((s) => s.status === 'normal').length,
      hex: STATUS_COLORS.normal,
    },
    {
      iconName: 'compass',
      label: 'REROUTING',
      value: ships.filter((s) => s.status === 'rerouting').length,
      hex: isLight ? '#B45309' : STATUS_COLORS.rerouting,
    },
    {
      iconName: 'alert',
      label: 'DISTRESS',
      value: ships.filter((s) =>
        ['distressed', 'out_of_fuel', 'stranded'].includes(s.status)
      ).length,
      hex: STATUS_COLORS.distressed,
      blink: ships.some((s) => s.status === 'distressed'),
    },
    {
      iconName: 'wind',
      label: 'STORM SECTOR',
      value: ships.filter((s) => s.inWeather && !s.arrived).length,
      cls: 'text-amber-400',
    },
    {
      iconName: 'shield',
      label: 'ZONES ACTIVE',
      value: fleet.zones.filter((z) => z.active).length,
      cls: fleet.zones.some((z) => z.active)
        ? 'text-amber-400'
        : 'text-slate-400',
    },
    {
      iconName: 'bell',
      label: 'INCIDENTS',
      value: critAlerts,
      cls: critAlerts > 0 ? 'text-rose-400 font-bold' : 'text-emerald-400',
      blink: critAlerts > 0,
    },
  ];

  return (
    <div className="h-11 shrink-0 flex items-center justify-between border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-4 sm:px-6 z-20 relative hide-scrollbar overflow-x-auto text-xs sm:text-sm font-sans shadow-inner">
      {/* ── Left: Telemetry Metric Chips ── */}
      <div className="flex items-center gap-4 sm:gap-6 shrink-0">
        {stats.map((s, i) => (
          <div key={s.label} className="flex items-center gap-2 shrink-0">
            {i > 0 && <span className="text-slate-700 font-light">|</span>}
            <motion.div
              animate={
                s.blink
                  ? { opacity: [1, 0.25, 1], scale: [1, 1.25, 1] }
                  : undefined
              }
              transition={{ repeat: Infinity, duration: 0.9 }}
              className="text-slate-400 shrink-0"
            >
              <AnimatedIcon name={s.iconName} size={15} isAnimated={s.blink} />
            </motion.div>
            <span className="text-slate-400 text-xs font-semibold tracking-wider uppercase">
              {s.label}
            </span>
            <span
              className={`font-bold tabular-nums tracking-wide text-xs sm:text-sm ${
                s.cls || ''
              }`}
              style={s.hex ? { color: s.hex } : undefined}
            >
              {s.value}
            </span>
          </div>
        ))}
      </div>

      {/* ── Right: Fleet Fuel Capacity Bar ── */}
      <div className="flex items-center gap-3 shrink-0 ml-6">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          <AnimatedIcon name="fuel" size={15} />
          <span>FLEET FUEL:</span>
        </div>
        <div className="w-28 sm:w-36 h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700 relative shadow-inner">
          <motion.div
            animate={{ width: `${overallFuel}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{
              background: `linear-gradient(90deg, ${fuelColor(
                overallFuel
              )}, ${fuelColor(overallFuel)}CC)`,
              boxShadow: `0 0 10px ${fuelColor(overallFuel)}`,
            }}
          />
        </div>
        <span
          className="font-bold text-xs sm:text-sm tabular-nums"
          style={{
            color: fuelColor(overallFuel),
            textShadow: `0 0 6px ${fuelColor(overallFuel)}`,
          }}
        >
          {Math.round(overallFuel)}%
        </span>

        <span className="text-slate-700 mx-1">·</span>
        <span className="text-xs text-slate-400 font-mono tracking-wider">
          T+{fleet.tickCount}s
        </span>
      </div>
    </div>
  );
}
