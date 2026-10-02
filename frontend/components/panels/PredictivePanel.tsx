'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/store';
import { useShallow } from 'zustand/react/shallow';
import { haversineDistance, formatDistance } from '@/lib/utils';
import {
  SideDrawer,
  PanelHeader,
  EmptyState,
} from '@/components/ui/primitives';
import { AnimatedIcon, type IconName } from '@/components/ui/AnimatedIcon';

interface Prediction {
  id: string;
  shipId: string;
  shipName: string;
  type: 'fuel_shortfall' | 'zone_entry' | 'weather_entry' | 'stranded_risk';
  message: string;
  severity: 'warning' | 'critical';
  minutesUntil: number;
}

const TYPE_ICON_MAP: Record<string, IconName> = {
  fuel_shortfall: 'fuel',
  zone_entry: 'shield',
  weather_entry: 'wind',
  stranded_risk: 'alert',
};

const REF_SPEED = 14,
  REF_RATE_PER_NM = 0.85;
function burnRatePerNm(speedKn: number, inWeather: boolean) {
  const ratio = Math.max(speedKn / REF_SPEED, 0.15);
  return REF_RATE_PER_NM * Math.pow(ratio, 3) * (inWeather ? 1.3 : 1);
}

export default function PredictivePanel({ onClose }: { onClose: () => void }) {
  const fleet = useStore(useShallow((s) => s.fleet));

  const predictions = useMemo((): Prediction[] => {
    if (!fleet) return [];
    const result: Prediction[] = [];

    for (const ship of fleet.ships) {
      if (ship.arrived || ship.status === 'stopped') continue;

      const port = fleet.ports.find((p) => p.id === ship.destination);
      if (port && ship.fuel > 0 && ship.speed > 0) {
        const distKm = ship.distanceToDestination;
        const distNm = distKm / 1.852;
        const speedKmh = ship.speed * 1.852;
        const hoursRemaining = distKm / speedKmh;
        const burnPerNm = burnRatePerNm(ship.speed, ship.inWeather);
        const fuelNeeded = distNm * burnPerNm;
        const margin = ship.fuel - fuelNeeded;

        if (margin < 300 && margin > 0) {
          result.push({
            id: `pred-fuel-${ship.shipId}`,
            shipId: ship.shipId,
            shipName: ship.name,
            type: 'fuel_shortfall',
            message: `Will arrive with only ~${Math.round(
              margin
            )}t bunker fuel remaining.`,
            severity: margin < 100 ? 'critical' : 'warning',
            minutesUntil: Math.round(hoursRemaining * 60),
          });
        }
        if (margin < 0) {
          const nmUntilEmpty = ship.fuel / burnPerNm;
          const hoursUntilEmpty = nmUntilEmpty / ship.speed;
          result.push({
            id: `pred-empty-${ship.shipId}`,
            shipId: ship.shipId,
            shipName: ship.name,
            type: 'stranded_risk',
            message: `Projected to run completely dry ${formatDistance(
              distKm - nmUntilEmpty * 1.852
            )} short of ${port.name}.`,
            severity: 'critical',
            minutesUntil: Math.round(hoursUntilEmpty * 60),
          });
        }
      }

      if (ship.path?.length) {
        for (const zone of fleet.zones) {
          if (!zone.active) continue;
          for (
            let i = ship.pathIndex;
            i < Math.min(ship.pathIndex + 5, ship.path.length);
            i++
          ) {
            const wp = ship.path[i];
            const lats = zone.polygon.map((p) => p[0]),
              lngs = zone.polygon.map((p) => p[1]);
            if (
              wp[0] >= Math.min(...lats) &&
              wp[0] <= Math.max(...lats) &&
              wp[1] >= Math.min(...lngs) &&
              wp[1] <= Math.max(...lngs)
            ) {
              const mins = Math.round(
                (haversineDistance(
                  ship.position[0],
                  ship.position[1],
                  wp[0],
                  wp[1]
                ) /
                  (ship.speed * 1.852)) *
                  60
              );
              result.push({
                id: `pred-zone-${ship.shipId}-${zone.id}`,
                shipId: ship.shipId,
                shipName: ship.name,
                type: 'zone_entry',
                message: `Course vector intersects restricted geofence "${zone.name}".`,
                severity: 'warning',
                minutesUntil: mins,
              });
              break;
            }
          }
        }
      }

      if (!ship.inWeather && ship.path) {
        for (const wz of fleet.weatherZones) {
          const hit = ship.path
            .slice(ship.pathIndex, ship.pathIndex + 6)
            .find(
              (wp) =>
                haversineDistance(
                  wp[0],
                  wp[1],
                  wz.center[0],
                  wz.center[1]
                ) <
                wz.radius * 111
            );
          if (hit) {
            const mins = Math.round(
              (haversineDistance(
                ship.position[0],
                ship.position[1],
                hit[0],
                hit[1]
              ) /
                (ship.speed * 1.852)) *
                60
            );
            result.push({
              id: `pred-wx-${ship.shipId}-${wz.id}`,
              shipId: ship.shipId,
              shipName: ship.name,
              type: 'weather_entry',
              message: `Entering storm cell ${wz.name} (${wz.intensity}) in ~${mins} minutes.`,
              severity: 'warning',
              minutesUntil: mins,
            });
            break;
          }
        }
      }
    }

    return result
      .filter((p) => p.minutesUntil <= 120)
      .sort((a, b) => {
        const order = { critical: 0, warning: 1 };
        return order[a.severity] !== order[b.severity]
          ? order[a.severity] - order[b.severity]
          : a.minutesUntil - b.minutesUntil;
      })
      .slice(0, 14);
  }, [fleet]);

  return (
    <SideDrawer width={420} accentClass="border-amber-500/80">
      <PanelHeader
        iconName="target"
        title="Predictive Risk Radar"
        subtitle="2-Hour Ahead Real-Time Telemetry Projections"
        badge={predictions.length}
        badgeTone="warning"
        onClose={onClose}
        accentClass="border-amber-500/60"
      />

      <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-3.5 hide-scrollbar">
        {predictions.length === 0 ? (
          <EmptyState
            iconName="check"
            title="No Projected Risks"
            hint="All vessel routes and fuel levels clear for the next 2 hours."
          />
        ) : (
          predictions.map((pred, i) => {
            const iconName = TYPE_ICON_MAP[pred.type] || 'alert';
            const isCrit = pred.severity === 'critical';

            return (
              <motion.div
                key={pred.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`p-4 rounded-xl border relative overflow-hidden transition-all shadow-md
                  ${
                    isCrit
                      ? 'border-rose-500/70 bg-rose-950/25 shadow-[0_0_16px_rgba(255,51,102,0.25)]'
                      : 'border-amber-500/60 bg-slate-900/80'
                  }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-lg border shrink-0 ${
                      isCrit
                        ? 'border-rose-500/50 text-rose-400 bg-rose-950/40'
                        : 'border-amber-500/50 text-amber-400 bg-amber-950/40'
                    }`}
                  >
                    <AnimatedIcon name={iconName} size={20} isAnimated={isCrit} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-sm text-cyan-300 truncate">
                        {pred.shipName}
                      </span>
                      <span
                        className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                          pred.minutesUntil < 20
                            ? 'bg-rose-950 text-rose-300 border border-rose-500 animate-pulse'
                            : 'bg-amber-950 text-amber-300 border border-amber-500'
                        }`}
                      >
                        T-{pred.minutesUntil} MIN
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm font-medium text-slate-200 leading-snug">
                      {pred.message}
                    </p>
                    <div className="text-xs text-slate-400 font-mono uppercase mt-2 flex items-center gap-2">
                      <span>SEVERITY: {pred.severity.toUpperCase()}</span>
                      <span>·</span>
                      <span>TYPE: {pred.type.replace('_', ' ').toUpperCase()}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </SideDrawer>
  );
}
