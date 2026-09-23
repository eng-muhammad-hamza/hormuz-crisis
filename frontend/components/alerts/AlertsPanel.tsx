'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store';
import { useShallow } from 'zustand/react/shallow';
import { formatTime, severityColor } from '@/lib/utils';
import {
  SideDrawer,
  PanelHeader,
  EmptyState,
} from '@/components/ui/primitives';
import { screenShake } from '@/lib/gsapEffects';
import { playSound } from '@/lib/audio';
import { AnimatedIcon, type IconName } from '@/components/ui/AnimatedIcon';

const ALERT_ICON_MAP: Record<string, IconName> = {
  GEOFENCE_BREACH: 'shield',
  PROXIMITY: 'alert',
  DISTRESS: 'alert',
  FUEL_LOW: 'fuel',
  OUT_OF_FUEL: 'fuel',
  STRANDED: 'anchor',
  ARRIVED: 'check',
  PREDICTIVE_ZONE: 'target',
  PREDICTIVE_FUEL: 'fuel',
  SYSTEM: 'activity',
};

export default function AlertsPanel({ onClose }: { onClose: () => void }) {
  const { fleet, send } = useStore(
    useShallow((s) => ({
      fleet: s.fleet,
      send: s.send,
    }))
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const seenCritical = useRef(new Set<string>());

  const alerts = (fleet?.alerts || [])
    .filter((a) => !a.acknowledged)
    .sort((a, b) => {
      const sev: Record<string, number> = {
        critical: 0,
        warning: 1,
        info: 2,
        success: 3,
      };
      return (sev[a.severity] ?? 9) - (sev[b.severity] ?? 9);
    });

  useEffect(() => {
    for (const a of alerts) {
      if (a.severity === 'critical' && !seenCritical.current.has(a.id)) {
        seenCritical.current.add(a.id);
        screenShake(rootRef.current, 5);
      }
    }
  }, [alerts]);

  if (!fleet) return null;

  const acknowledge = (id: string) => {
    playSound('click');
    send('acknowledge_alert', { alertId: id });
  };

  const acknowledgeAll = () => {
    playSound('click');
    alerts.forEach((a) => send('acknowledge_alert', { alertId: a.id }));
  };

  const hasCritical = alerts.some((a) => a.severity === 'critical');

  return (
    <SideDrawer
      width={420}
      accentClass={
        hasCritical
          ? 'border-rose-500/80 aura-danger shadow-[0_0_35px_rgba(255,51,102,0.35)]'
          : 'border-slate-800'
      }
    >
      <div ref={rootRef} className="flex flex-col h-full">
        <PanelHeader
          iconName="bell"
          title="Active Incident Alerts"
          subtitle={
            alerts.length
              ? `${alerts.length} Incidents Require Command Attention`
              : 'All Theater Corridors Clear'
          }
          badge={alerts.length}
          badgeTone={
            hasCritical ? 'danger' : alerts.length ? 'warning' : 'success'
          }
          onClose={onClose}
          accentClass={hasCritical ? 'border-rose-500/60' : undefined}
        />

        {alerts.length > 0 && (
          <div className="px-4 py-2.5 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              INCIDENTS QUEUED ({alerts.length})
            </span>
            <button
              onClick={acknowledgeAll}
              className="text-xs font-bold text-cyan-300 hover:text-white uppercase tracking-wider bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-400/40 px-3 py-1 rounded-lg cursor-pointer transition-colors"
            >
              ACKNOWLEDGE ALL
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 hide-scrollbar">
          {alerts.length === 0 ? (
            <EmptyState
              iconName="check"
              title="ALL CORRIDORS SECURE"
              hint="No unacknowledged tactical alerts across the fleet."
            />
          ) : (
            <AnimatePresence>
              {alerts.map((alert) => {
                const c = severityColor(alert.severity);
                const isCrit = alert.severity === 'critical';
                const iconName = ALERT_ICON_MAP[alert.type] || 'alert';

                return (
                  <motion.div
                    key={alert.id}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className={`p-3.5 rounded-xl border border-slate-800 border-l-4 relative overflow-hidden transition-all shadow-md
                      ${
                        isCrit
                          ? 'border-l-rose-500 bg-rose-950/25 hover:bg-rose-950/35 shadow-[0_0_16px_rgba(255,51,102,0.25)]'
                          : 'border-l-amber-500 bg-slate-900/70 hover:bg-slate-800/80'
                      }`}
                    style={{ borderLeftColor: c }}
                  >
                    <div className="flex items-start gap-3 mb-2.5">
                      <div
                        className="p-2 rounded-lg bg-slate-950/60 border border-slate-800 shrink-0"
                        style={{ color: c }}
                      >
                        <AnimatedIcon name={iconName} size={18} isAnimated={isCrit} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span
                            className="font-bold text-xs uppercase tracking-wider"
                            style={{ color: c }}
                          >
                            {alert.severity} INCIDENT
                          </span>
                          <span className="text-xs font-mono text-slate-400">
                            {formatTime(alert.timestamp)}
                          </span>
                        </div>
                        <h4 className="font-semibold text-xs sm:text-sm text-slate-100 leading-snug">
                          {alert.message}
                        </h4>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                      <span className="text-slate-400 uppercase font-medium">
                        TYPE: {alert.type}
                      </span>
                      <button
                        onClick={() => acknowledge(alert.id)}
                        className="px-3 py-1 rounded-lg bg-slate-800 text-slate-200 hover:text-cyan-300 hover:border-cyan-400 border border-slate-700 font-semibold uppercase tracking-wider cursor-pointer transition-colors"
                      >
                        ACKNOWLEDGE
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </div>
    </SideDrawer>
  );
}
