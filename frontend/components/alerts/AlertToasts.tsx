'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store';
import { useShallow } from 'zustand/react/shallow';
import { severityColor } from '@/lib/utils';
import { playSound } from '@/lib/audio';
import { AnimatedIcon, type IconName } from '@/components/ui/AnimatedIcon';

interface Toast {
  id: string;
  message: string;
  severity: string;
  type: string;
}

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
};

export default function AlertToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seenAlerts = useRef(new Set<string>());
  const alerts = useStore(useShallow((s) => s.fleet?.alerts));

  useEffect(() => {
    if (!alerts) return;
    for (const alert of alerts) {
      if (!seenAlerts.current.has(alert.id) && !alert.acknowledged) {
        seenAlerts.current.add(alert.id);
        const toast: Toast = {
          id: alert.id,
          message: alert.message,
          severity: alert.severity,
          type: alert.type,
        };
        setToasts((prev) => [toast, ...prev].slice(0, 4));
        if (alert.severity === 'critical') playSound('alert');
        const delay = alert.severity === 'critical' ? 8000 : 4500;
        setTimeout(
          () => setToasts((prev) => prev.filter((t) => t.id !== toast.id)),
          delay
        );
      }
    }
  }, [alerts]);

  return (
    <div className="fixed bottom-28 right-6 z-[200] flex flex-col gap-3 pointer-events-none max-w-[400px]">
      <AnimatePresence>
        {toasts.map((toast) => {
          const c = severityColor(toast.severity);
          const isCrit = toast.severity === 'critical';
          const iconName = ALERT_ICON_MAP[toast.type] || 'alert';

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 80, scale: 0.92 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80, scale: 0.92, filter: 'blur(6px)' }}
              transition={{ type: 'spring', stiffness: 380, damping: 26 }}
              className="pointer-events-auto"
            >
              <div
                className={`p-4 rounded-xl backdrop-blur-2xl border border-l-4 shadow-2xl relative overflow-hidden
                  ${
                    isCrit
                      ? 'bg-rose-950/85 border-rose-500/80 shadow-[0_0_30px_rgba(255,51,102,0.45)]'
                      : 'bg-slate-900/90 border-slate-700/80 shadow-black/60'
                  }`}
                style={{ borderLeftColor: c }}
              >
                <div className="flex items-start gap-3.5 relative z-10">
                  <div
                    className="p-2 rounded-lg bg-slate-950/60 border border-slate-800 shrink-0"
                    style={{ color: c }}
                  >
                    <AnimatedIcon name={iconName} size={22} isAnimated={isCrit} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <div
                        className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
                          isCrit ? 'text-rose-300' : ''
                        }`}
                        style={!isCrit ? { color: c } : undefined}
                      >
                        {isCrit && (
                          <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping inline-block" />
                        )}
                        <span>{toast.severity} INCIDENT</span>
                      </div>
                      <button
                        onClick={() =>
                          setToasts((prev) =>
                            prev.filter((t) => t.id !== toast.id)
                          )
                        }
                        className="text-slate-400 hover:text-white text-xs cursor-pointer p-1"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="text-xs sm:text-sm font-semibold leading-snug text-slate-100">
                      {toast.message}
                    </div>
                  </div>
                </div>

                {/* Animated Dismiss Progress Bar */}
                <motion.div
                  className="absolute bottom-0 left-0 right-0 h-1 origin-left"
                  style={{ background: c }}
                  initial={{ scaleX: 1 }}
                  animate={{ scaleX: 0 }}
                  transition={{ duration: isCrit ? 8 : 4.5, ease: 'linear' }}
                />
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
