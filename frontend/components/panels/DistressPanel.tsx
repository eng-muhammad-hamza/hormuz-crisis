'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store';
import { useShallow } from 'zustand/react/shallow';
import { formatTimestamp } from '@/lib/utils';
import {
  SideDrawer,
  PanelHeader,
  EmptyState,
  Button,
} from '@/components/ui/primitives';
import { playSound } from '@/lib/audio';
import { AnimatedIcon } from '@/components/ui/AnimatedIcon';

const SEVERITY_CONFIG: Record<
  string,
  { badge: string; border: string; bg: string }
> = {
  critical: {
    badge: 'text-rose-300 border-rose-500 bg-rose-950/60',
    border: 'border-l-rose-500',
    bg: 'bg-rose-950/20',
  },
  high: {
    badge: 'text-amber-300 border-amber-500 bg-amber-950/60',
    border: 'border-l-amber-500',
    bg: 'bg-amber-950/20',
  },
  medium: {
    badge: 'text-cyan-300 border-cyan-400 bg-cyan-950/60',
    border: 'border-l-cyan-400',
    bg: 'bg-cyan-950/20',
  },
  low: {
    badge: 'text-emerald-300 border-emerald-500 bg-emerald-950/60',
    border: 'border-l-emerald-500',
    bg: 'bg-emerald-950/20',
  },
};

export default function DistressPanel({ onClose }: { onClose: () => void }) {
  const { fleet, send } = useStore(
    useShallow((s) => ({
      fleet: s.fleet,
      send: s.send,
    }))
  );
  if (!fleet) return null;
  const messages = fleet.distressMessages;

  return (
    <SideDrawer width={440} accentClass="border-rose-500/70 aura-danger">
      <PanelHeader
        iconName="alert"
        title="Mayday Distress Channel"
        subtitle={
          messages.length
            ? `${messages.length} Active Emergency Transmissions`
            : 'Emergency Channel Clear'
        }
        badge={messages.length}
        badgeTone="danger"
        onClose={onClose}
        accentClass="border-rose-500/60"
      />

      <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-4 hide-scrollbar">
        {messages.length === 0 ? (
          <EmptyState
            iconName="radio"
            title="Channel Clear"
            hint="No emergency distress or Mayday signals detected in theater."
          />
        ) : (
          <AnimatePresence>
            {messages.map((msg, i) => {
              const sev = msg.extractedData?.severity || 'medium';
              const cfg = SEVERITY_CONFIG[sev] || SEVERITY_CONFIG.medium;

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={`p-4 rounded-xl border border-slate-800 border-l-4 ${cfg.border} ${cfg.bg} relative overflow-hidden shadow-lg`}
                >
                  {/* Top Bar: Vessel Name + Call Sign + Severity Badge */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm sm:text-base text-cyan-300">
                        {msg.shipName}
                      </span>
                      <span className="text-xs font-mono text-slate-400 px-2 py-0.5 rounded bg-slate-900 border border-slate-700">
                        {msg.shipId}
                      </span>
                    </div>

                    <span
                      className={`text-xs font-bold uppercase px-2.5 py-1 rounded-full border ${cfg.badge}`}
                    >
                      {sev} ALERT
                    </span>
                  </div>

                  {/* Mayday Raw Message */}
                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs sm:text-sm font-medium text-slate-100 leading-relaxed mb-3">
                    <span className="text-rose-400 font-bold mr-1.5 uppercase">
                      MAYDAY TRANSMISSION:
                    </span>
                    {msg.message}
                  </div>

                  {/* AI Automated Threat Extraction Analysis */}
                  {msg.extractedData ? (
                    <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-700/80 flex flex-col gap-3">
                      <div className="flex items-center justify-between text-xs font-bold text-cyan-300 tracking-wider uppercase">
                        <div className="flex items-center gap-1.5">
                          <AnimatedIcon name="cpu" size={16} />
                          <span>AI THREAT ASSESSMENT</span>
                        </div>
                        <span className="text-slate-400 font-mono">
                          CONFIDENCE:{' '}
                          {Math.round((msg.extractedData.confidence || 0) * 100)}%
                        </span>
                      </div>

                      {/* Issues tags */}
                      <div className="flex flex-wrap gap-1.5">
                        {msg.extractedData.issues.map((issue) => (
                          <span
                            key={issue}
                            className="text-xs font-semibold px-2.5 py-1 rounded-md bg-rose-950/50 text-rose-300 border border-rose-500/40 uppercase inline-flex items-center gap-1.5"
                          >
                            <AnimatedIcon name="alert" size={12} className="text-amber-400" />
                            <span>{issue}</span>
                          </span>
                        ))}
                      </div>

                      {/* Casualty / Damage info */}
                      {(msg.extractedData.injuryCount > 0 ||
                        msg.extractedData.damageEstimate > 0) && (
                        <div className="flex items-center gap-4 text-xs font-mono pt-2 border-t border-slate-800">
                          {msg.extractedData.injuryCount > 0 && (
                            <span className="text-rose-400 font-bold inline-flex items-center gap-1.5">
                              <AnimatedIcon name="heart-pulse" size={14} />
                              <span>{msg.extractedData.injuryCount} Casualties</span>
                            </span>
                          )}
                          {msg.extractedData.damageEstimate > 0 && (
                            <span className="text-slate-300 inline-flex items-center gap-1.5">
                              <AnimatedIcon name="activity" size={14} className="text-amber-400" />
                              <span>Est. ${msg.extractedData.damageEstimate.toLocaleString()}</span>
                            </span>
                          )}
                        </div>
                      )}

                      {/* Recommended Countermeasure */}
                      <div
                        className={`p-3 rounded-lg text-xs sm:text-sm font-medium leading-relaxed
                        ${
                          msg.extractedData.requiresImmediateAction
                            ? 'bg-rose-950/40 border border-rose-500/50 text-rose-200'
                            : 'bg-slate-950/60 border border-slate-800 text-slate-200'
                        }`}
                      >
                        <span className="text-xs font-bold uppercase block mb-1 text-cyan-300">
                          RECOMMENDED ACTION:
                        </span>
                        {msg.extractedData.recommendedAction}
                      </div>

                      {/* One-Click Immediate Dispatch Action */}
                      {msg.extractedData.requiresImmediateAction && (
                        <Button
                          tone="danger"
                          size="md"
                          full
                          onClick={() => {
                            playSound('command');
                            const ship = fleet.ships.find(
                              (s) => s.shipId === msg.shipId
                            );
                            if (!ship) return;
                            const nearest = fleet.ships
                              .filter(
                                (s) =>
                                  s.shipId !== msg.shipId &&
                                  !s.arrived &&
                                  s.fuel > 1000
                              )
                              .sort(
                                (a, b) =>
                                  Math.hypot(
                                    a.position[0] - ship.position[0],
                                    a.position[1] - ship.position[1]
                                  ) -
                                  Math.hypot(
                                    b.position[0] - ship.position[0],
                                    b.position[1] - ship.position[1]
                                  )
                              )[0];
                            if (nearest) {
                              send('request_assistance', {
                                fromShipId: msg.shipId,
                                toShipId: nearest.shipId,
                                assistType: 'escort',
                              });
                            }
                          }}
                          iconName="shield"
                          className="mt-1 py-2.5"
                        >
                          DISPATCH NEAREST FLEET ESCORT
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-400">
                      <span>AI ANALYSIS IN PROGRESS…</span>
                      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <motion.div
                          animate={{ x: ['-100%', '100%'] }}
                          transition={{
                            repeat: Infinity,
                            duration: 1.2,
                            ease: 'linear',
                          }}
                          className="w-1/2 h-full bg-cyan-400"
                        />
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-slate-400 font-mono mt-3 text-right">
                    TRANSMITTED: {formatTimestamp(msg.timestamp)}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </SideDrawer>
  );
}
