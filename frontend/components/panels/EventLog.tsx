'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store';
import { useShallow } from 'zustand/react/shallow';
import { formatTime, severityColor } from '@/lib/utils';
import { AnimatedIcon, type IconName } from '@/components/ui/AnimatedIcon';

export default function EventLog() {
  const eventLog = useStore(useShallow((s) => s.eventLog));
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [eventLog.length]);

  const SEV_ICON_MAP: Record<string, IconName> = {
    critical: 'alert',
    warning: 'alert',
    success: 'check',
    info: 'activity',
  };

  return (
    <div className="shrink-0 flex flex-col border-t border-slate-800 bg-slate-950/95 backdrop-blur-md h-[150px] font-sans text-xs">
      {/* ── Terminal Header ── */}
      <div className="shrink-0 flex items-center justify-between px-4 sm:px-6 py-2 border-b border-slate-800 bg-slate-900/70">
        <div className="flex items-center gap-2.5">
          <motion.div
            animate={{ opacity: [1, 0.25, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#00E5FF]"
          />
          <span className="font-bold text-xs text-slate-300 uppercase tracking-wider">
            MISSION EVENT LOG STREAM
          </span>
        </div>
        <span className="text-xs text-slate-400 font-mono">
          {eventLog.length} ENTRIES ARCHIVED
        </span>
      </div>

      {/* ── Log Entries Stream ── */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-2 flex flex-col gap-1.5 hide-scrollbar">
        <AnimatePresence initial={false}>
          {[...eventLog]
            .reverse()
            .slice(0, 40)
            .map((entry) => {
              const iconName = SEV_ICON_MAP[entry.severity] || 'activity';
              const isCrit = entry.severity === 'critical';

              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-3 py-1 hover:bg-slate-900/60 px-2 rounded-lg transition-colors text-xs"
                >
                  <span className="text-xs text-slate-500 shrink-0 font-mono">
                    {formatTime(entry.timestamp)}
                  </span>
                  <div
                    className="shrink-0"
                    style={{ color: severityColor(entry.severity) }}
                  >
                    <AnimatedIcon name={iconName} size={14} isAnimated={isCrit} />
                  </div>
                  <div className="text-slate-300 font-medium tracking-wide truncate">
                    {entry.entityId !== 'SYSTEM' && (
                      <span className="text-cyan-400 font-mono font-bold mr-2">
                        [{entry.entityId}]
                      </span>
                    )}
                    <span>{entry.message}</span>
                  </div>
                </motion.div>
              );
            })}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
