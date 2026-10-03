'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store';
import { useShallow } from 'zustand/react/shallow';
import { haversineDistance, formatDistance } from '@/lib/utils';
import {
  SideDrawer,
  PanelHeader,
  EmptyState,
  Button,
} from '@/components/ui/primitives';
import { playSound } from '@/lib/audio';
import { AnimatedIcon, type IconName } from '@/components/ui/AnimatedIcon';

interface Suggestion {
  id: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  type: 'reroute' | 'zone' | 'assist' | 'fuel' | 'weather' | 'general';
  title: string;
  reasoning: string;
  action: string;
  shipId?: string;
  accepted?: boolean;
  rejected?: boolean;
}

const PRIORITY_CLASS: Record<
  string,
  { text: string; border: string; bg: string }
> = {
  critical: {
    text: 'text-rose-400',
    border: 'border-l-rose-500',
    bg: 'bg-rose-950/25',
  },
  high: {
    text: 'text-amber-400',
    border: 'border-l-amber-500',
    bg: 'bg-amber-950/25',
  },
  medium: {
    text: 'text-cyan-400',
    border: 'border-l-cyan-400',
    bg: 'bg-cyan-950/25',
  },
  low: {
    text: 'text-slate-400',
    border: 'border-l-slate-700',
    bg: 'bg-slate-900/60',
  },
};

const TYPE_ICON_MAP: Record<string, IconName> = {
  reroute: 'compass',
  zone: 'shield',
  assist: 'lifebuoy',
  fuel: 'fuel',
  weather: 'wind',
  general: 'cpu',
};

export default function AIFleetAdvisor({ onClose }: { onClose: () => void }) {
  const { fleet, send } = useStore(
    useShallow((s) => ({
      fleet: s.fleet,
      send: s.send,
    }))
  );
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastAnalyzed, setLastAnalyzed] = useState<string | null>(null);

  const analyze = useCallback(async () => {
    if (!fleet || loading) return;
    setLoading(true);
    setSuggestions([]);

    const distressed = fleet.ships.filter(
      (s) => s.status === 'distressed' || s.status === 'out_of_fuel'
    );
    const fuelLow = fleet.ships.filter((s) => s.fuel < 800 && !s.arrived);
    const inWeather = fleet.ships.filter((s) => s.inWeather && !s.arrived);
    const rerouting = fleet.ships.filter((s) => s.status === 'rerouting');
    const activeZones = fleet.zones.filter((z) => z.active);
    const criticalAlerts = fleet.alerts.filter(
      (a) => a.severity === 'critical' && !a.acknowledged
    );

    const situation = `
FLEET STATUS REPORT — Strait of Hormuz Operations
Timestamp: ${new Date().toISOString()}
Active vessels: ${fleet.ships.filter((s) => !s.arrived).length}/15
Distressed vessels: ${
      distressed
        .map((s) => `${s.name} (${s.cargo}, fuel:${Math.round(s.fuel)}t)`)
        .join(', ') || 'None'
    }
Low fuel vessels: ${
      fuelLow
        .map(
          (s) =>
            `${s.name} (${Math.round(s.fuel)}t remaining, dest:${
              fleet.ports.find((p) => p.id === s.destination)?.name
            })`
        )
        .join(', ') || 'None'
    }
Vessels in adverse weather (+30% fuel burn): ${
      inWeather.map((s) => s.name).join(', ') || 'None'
    }
Vessels rerouting: ${rerouting.map((s) => s.name).join(', ') || 'None'}
Active restricted zones: ${activeZones.length}
Critical alerts: ${criticalAlerts.length}
Weather zones: ${fleet.weatherZones
      .map((w) => `${w.name} (${w.intensity}, ${w.windSpeed}kn)`)
      .join(', ')}
    `.trim();

    try {
      const res = await fetch('/api/fleet-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          situation,
          ships: fleet.ships,
          ports: fleet.ports,
        }),
      });
      const data = await res.json();
      if (data.suggestions) {
        setSuggestions(
          data.suggestions.map((s: Suggestion, i: number) => ({
            ...s,
            id: `sug-${Date.now()}-${i}`,
          }))
        );
        setLastAnalyzed(
          new Date().toLocaleTimeString('en-US', { hour12: false })
        );
      }
    } catch {
      const fallback: Suggestion[] = [];
      if (fuelLow.length > 0) {
        fallback.push({
          id: `sug-fuel-${Date.now()}`,
          priority: 'high',
          type: 'fuel',
          title: `Critical Fuel Shortfall: ${fuelLow[0].name}`,
          reasoning: `${fuelLow[0].name} has only ${Math.round(
            fuelLow[0].fuel
          )}t fuel remaining and is ${formatDistance(
            fuelLow[0].distanceToDestination
          )} from destination.`,
          action: `Reroute ${fuelLow[0].name} to nearest port or dispatch emergency fuel transfer asset.`,
          shipId: fuelLow[0].shipId,
        });
      }
      if (inWeather.length > 0) {
        fallback.push({
          id: `sug-weather-${Date.now()}`,
          priority: 'medium',
          type: 'weather',
          title: `${inWeather.length} Vessels in Storm Weather`,
          reasoning: `Ships in weather zones burn 30% extra fuel. ${inWeather
            .map((s) => s.name)
            .join(', ')} could be steered around storm systems.`,
          action:
            'Consider rerouting affected merchant vessels around active storm cells to conserve fuel.',
        });
      }
      for (const ds of distressed) {
        const nearest = fleet.ships
          .filter((s) => s.shipId !== ds.shipId && !s.arrived && s.fuel > 1500)
          .sort(
            (a, b) =>
              haversineDistance(
                a.position[0],
                a.position[1],
                ds.position[0],
                ds.position[1]
              ) -
              haversineDistance(
                b.position[0],
                b.position[1],
                ds.position[0],
                ds.position[1]
              )
          )[0];
        if (nearest) {
          fallback.push({
            id: `sug-assist-${Date.now()}-${ds.shipId}`,
            priority: 'critical',
            type: 'assist',
            title: `${nearest.name} Positioned to Assist ${ds.name}`,
            reasoning: `${nearest.name} is ${formatDistance(
              haversineDistance(
                nearest.position[0],
                nearest.position[1],
                ds.position[0],
                ds.position[1]
              )
            )} from distressed ${ds.name} with ${Math.round(
              nearest.fuel
            )}t fuel reserve.`,
            action: `Dispatch ${nearest.name} to escort and provide aid to ${ds.name}.`,
            shipId: nearest.shipId,
          });
        }
      }
      if (fallback.length === 0) {
        fallback.push({
          id: `sug-nominal-${Date.now()}`,
          priority: 'low',
          type: 'general',
          title: 'Fleet Operations Nominal',
          reasoning:
            'No critical hazards detected across the Strait of Hormuz. All vessels proceeding on scheduled corridors.',
          action:
            'Continue monitoring choke point corridors and weather fronts.',
        });
      }
      setSuggestions(fallback);
      setLastAnalyzed(
        new Date().toLocaleTimeString('en-US', { hour12: false })
      );
    } finally {
      setLoading(false);
    }
  }, [fleet, loading]);

  useEffect(() => {
    if (suggestions.length === 0 && !loading) analyze();
  }, []); // eslint-disable-line

  useEffect(() => {
    const t = setInterval(analyze, 60000);
    return () => clearInterval(t);
  }, [analyze]);

  const acceptSuggestion = (sug: Suggestion) => {
    playSound('command');
    setSuggestions((prev) =>
      prev.map((s) => (s.id === sug.id ? { ...s, accepted: true } : s))
    );
    if (sug.shipId && sug.type === 'reroute') {
      const nearestPort = fleet?.ports[0];
      if (nearestPort) {
        send('issue_directive', {
          shipId: sug.shipId,
          directiveType: 'REROUTE',
          params: { newDestination: nearestPort.id },
        });
      }
    }
    if (sug.shipId && sug.type === 'assist') {
      const distressed = fleet?.ships.find((s) => s.status === 'distressed');
      if (distressed) {
        send('request_assistance', {
          fromShipId: distressed.shipId,
          toShipId: sug.shipId,
          assistType: 'escort',
        });
      }
    }
  };

  const rejectSuggestion = (id: string) => {
    playSound('click');
    setSuggestions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, rejected: true } : s))
    );
  };

  const pendingCount = suggestions.filter(
    (s) => !s.accepted && !s.rejected
  ).length;

  return (
    <SideDrawer width={420} accentClass="border-cyan-400">
      <PanelHeader
        iconName="cpu"
        title="AI Fleet Tactical Advisor"
        subtitle={
          loading
            ? 'Analyzing situational telemetry…'
            : lastAnalyzed
            ? `Evaluated at ${lastAnalyzed}`
            : 'Ready for analysis'
        }
        badge={pendingCount || undefined}
        badgeTone="accent"
        onClose={onClose}
      />

      <div className="p-4 border-b border-slate-800 bg-slate-900/60">
        <Button
          tone="ghost"
          size="md"
          full
          disabled={loading}
          onClick={() => {
            playSound('click');
            analyze();
          }}
          iconName="refresh"
          className="py-2.5"
        >
          {loading
            ? 'Analyzing Fleet Telemetry…'
            : 'Re-Analyze Fleet Situation'}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-3.5 hide-scrollbar">
        {suggestions.length === 0 && !loading ? (
          <EmptyState
            iconName="cpu"
            title="No Analysis Available"
            hint="Trigger an analysis to receive AI-driven strategic guidance."
          />
        ) : (
          <AnimatePresence>
            {suggestions.map((sug, i) => {
              const c = PRIORITY_CLASS[sug.priority];
              const iconName = TYPE_ICON_MAP[sug.type] || 'cpu';

              return (
                <motion.div
                  key={sug.id}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={`p-4 rounded-xl border border-slate-800 border-l-4 ${c.border} ${c.bg} transition-all shadow-md
                    ${
                      sug.rejected ? 'opacity-40 grayscale' : 'opacity-100'
                    }`}
                >
                  <div className="flex items-center justify-between gap-2.5 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-1.5 rounded-lg bg-slate-950/60 border border-slate-800 text-cyan-400">
                        <AnimatedIcon name={iconName} size={18} />
                      </div>
                      <h4 className="font-bold text-xs sm:text-sm uppercase text-slate-100 truncate">
                        {sug.title}
                      </h4>
                    </div>
                    <span
                      className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full border ${c.text} border-current shrink-0`}
                    >
                      {sug.priority}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-3">
                    {sug.reasoning}
                  </p>

                    <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs sm:text-sm font-semibold text-cyan-300 mb-3 leading-snug">
                      <span className="text-[11px] font-bold uppercase block text-slate-400 mb-1">
                        TACTICAL DIRECTIVE:
                      </span>
                      <div className="flex items-start gap-1.5 mt-0.5">
                        <div className="shrink-0 mt-0.5 text-cyan-400">
                          <AnimatedIcon name="arrow-right" size={13} />
                        </div>
                        <span>{sug.action}</span>
                      </div>
                    </div>

                  {!sug.accepted && !sug.rejected && (
                    <div className="flex gap-2.5">
                      <Button
                        tone="success"
                        size="sm"
                        full
                        iconName="check"
                        onClick={() => acceptSuggestion(sug)}
                      >
                        Execute Directive
                      </Button>
                      <Button
                        tone="ghost"
                        size="sm"
                        onClick={() => rejectSuggestion(sug.id)}
                      >
                        Dismiss
                      </Button>
                    </div>
                  )}

                  {sug.accepted && (
                    <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 mt-1">
                      <AnimatedIcon name="check" size={14} />
                      <span>DIRECTIVE EXECUTED &amp; BROADCASTED</span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </SideDrawer>
  );
}
