'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/store';
import { useShallow } from 'zustand/react/shallow';
import { STATUS_COLORS, STATUS_LABELS } from '@/lib/theme';
import { fuelPercent, fuelColor, formatETA } from '@/lib/utils';
import { playSound } from '@/lib/audio';
import { AnimatedIcon, type IconName } from '@/components/ui/AnimatedIcon';
import { TiltCard } from '@/components/ui/TiltCard';
import { CargoBadge } from '@/components/ui/CargoBadge';

type FilterType = 'all' | 'distress' | 'weather' | 'rerouting';

export default function FleetSidebar() {
  const {
    fleet,
    selectedShipId,
    selectShip,
    sidebarCollapsed,
    toggleSidebar,
    captainShipId,
  } = useStore(
    useShallow((s) => ({
      fleet: s.fleet,
      selectedShipId: s.selectedShipId,
      selectShip: s.selectShip,
      sidebarCollapsed: s.sidebarCollapsed,
      toggleSidebar: s.toggleSidebar,
      captainShipId: s.captainShipId,
    }))
  );

  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');

  const sortedShips = useMemo(() => {
    if (!fleet) return [];
    const p: Record<string, number> = {
      distressed: 0,
      out_of_fuel: 1,
      stranded: 2,
      insufficient_fuel: 3,
      rerouting: 4,
      normal: 5,
      assisting: 6,
      stopped: 7,
      arrived: 8,
    };
    return [...fleet.ships].sort(
      (a, b) => (p[a.status] ?? 9) - (p[b.status] ?? 9)
    );
  }, [fleet]);

  const filteredShips = useMemo(() => {
    return sortedShips.filter((ship) => {
      // Filter by type
      if (filter === 'distress') {
        if (
          !['distressed', 'out_of_fuel', 'stranded', 'insufficient_fuel'].includes(
            ship.status
          )
        )
          return false;
      } else if (filter === 'weather') {
        if (!ship.inWeather || ship.arrived) return false;
      } else if (filter === 'rerouting') {
        if (ship.status !== 'rerouting') return false;
      }

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = ship.name.toLowerCase().includes(q);
        const matchesId = ship.shipId.toLowerCase().includes(q);
        const matchesCargo = (ship.cargo || '').toLowerCase().includes(q);
        const matchesCaptain = (
          ship.assignedCaptain || ship.defaultCaptainName || ''
        ).toLowerCase().includes(q);
        return matchesName || matchesId || matchesCargo || matchesCaptain;
      }

      return true;
    });
  }, [sortedShips, filter, search]);

  if (!fleet) return null;

  const distressCount = fleet.ships.filter((s) =>
    ['distressed', 'out_of_fuel', 'stranded'].includes(s.status)
  ).length;
  const weatherCount = fleet.ships.filter(
    (s) => s.inWeather && !s.arrived
  ).length;

  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? 58 : 390 }}
      transition={{ type: 'spring', stiffness: 320, damping: 30 }}
      className="shrink-0 border-r border-slate-700/80 bg-slate-950/90 backdrop-blur-2xl overflow-hidden flex flex-col h-full z-20 relative shadow-[8px_0_32px_rgba(0,0,0,0.6)]"
    >
      {/* ── Top Header ── */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-800 bg-slate-900/70 shrink-0 min-h-[58px]">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="text-cyan-400 p-1.5 rounded-lg bg-cyan-950/50 border border-cyan-500/30 flex items-center justify-center">
              <AnimatedIcon name="anchor" size={18} />
            </div>
            <h2 className="text-sm sm:text-base font-bold tracking-wider text-white uppercase truncate">
              Fleet Operations
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-400/40">
              {fleet.ships.filter((s) => !s.arrived).length}/15
            </span>
          </div>
        )}

        <button
          onClick={() => {
            playSound('click');
            toggleSidebar();
          }}
          title={sidebarCollapsed ? 'Expand fleet panel' : 'Collapse fleet panel'}
          className={`w-9 h-9 rounded-xl border border-slate-700 bg-slate-800/80 flex items-center justify-center text-slate-300 hover:text-cyan-300 hover:border-cyan-400 cursor-pointer transition-all duration-200 ${
            sidebarCollapsed ? 'mx-auto' : 'ml-auto'
          }`}
        >
          <AnimatedIcon
            name={sidebarCollapsed ? 'arrow-right' : 'close'}
            size={16}
          />
        </button>
      </div>

      {!sidebarCollapsed && (
        <>
          {/* ── Search & Filter Controls with generous padding ── */}
          <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex flex-col gap-3 shrink-0">
            {/* Search Input */}
            <div className="relative flex items-center">
              <div className="absolute left-3 pointer-events-none text-slate-400 flex items-center justify-center w-4 h-4">
                <AnimatedIcon name="search" size={15} />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search vessels, cargo, captain…"
                className="w-full pl-9 pr-8 py-2 bg-slate-900/90 border border-slate-700 rounded-lg text-xs sm:text-sm font-medium text-slate-100 placeholder:text-slate-500 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500/30 transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 text-slate-400 hover:text-white cursor-pointer"
                >
                  <AnimatedIcon name="close" size={14} />
                </button>
              )}
            </div>

            {/* Quick Filter Segmented Control */}
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-950/60 rounded-lg border border-slate-800">
              {[
                {
                  key: 'all' as const,
                  label: 'ALL',
                  count: fleet.ships.length,
                },
                {
                  key: 'distress' as const,
                  label: 'SOS',
                  count: distressCount,
                  danger: distressCount > 0,
                },
                {
                  key: 'weather' as const,
                  label: 'STORM',
                  count: weatherCount,
                },
                {
                  key: 'rerouting' as const,
                  label: 'REROUTE',
                  count: fleet.ships.filter((s) => s.status === 'rerouting')
                    .length,
                },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => {
                    playSound('click');
                    setFilter(tab.key);
                  }}
                  className={`py-1.5 px-1 rounded-md text-[11px] font-bold tracking-wide transition-all duration-200 cursor-pointer text-center
                    ${
                      filter === tab.key
                        ? tab.danger
                          ? 'bg-rose-950/80 border border-rose-500/80 text-rose-200 shadow-sm'
                          : 'bg-cyan-950/80 border border-cyan-400/80 text-cyan-200 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className="ml-1 text-[10px] font-semibold opacity-80">
                      ({tab.count})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ── 3D Tilt Ship Cards List with comfortable padding & scroll ── */}
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5 hide-scrollbar">
            {filteredShips.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-xs sm:text-sm font-medium">
                No matching vessels found in sector
              </div>
            ) : (
              filteredShips.map((ship) => {
                const isSelected = selectedShipId === ship.shipId;
                const isMine = ship.shipId === captainShipId;
                const port = fleet.ports.find((p) => p.id === ship.destination);
                const fuel = fuelPercent(ship.fuel, ship.fuelCapacity || 8500);
                const isCritical = [
                  'distressed',
                  'out_of_fuel',
                  'stranded',
                ].includes(ship.status);
                const statusColor = STATUS_COLORS[ship.status] || '#94a3b8';
                const isLiveManned = !!ship.operatorSessionId;
                const captainLabel =
                  ship.assignedCaptain || ship.defaultCaptainName;

                return (
                  <TiltCard
                    key={ship.shipId}
                    isSelected={isSelected || isMine}
                    isCritical={isCritical}
                    glowColor="rgba(0, 229, 255, 0.25)"
                    onClick={() => {
                      playSound('click');
                      selectShip(isSelected ? null : ship.shipId);
                    }}
                    className={`rounded-xl border transition-all relative overflow-hidden select-none p-3
                      ${
                        isSelected || isMine
                          ? 'bg-cyan-950/45 border-cyan-400/90 shadow-[0_0_18px_rgba(0,229,255,0.25)]'
                          : isCritical
                          ? 'bg-rose-950/40 border-rose-500/80 shadow-[0_0_16px_rgba(255,51,102,0.3)]'
                          : 'bg-slate-900/80 border-slate-700/70 hover:bg-slate-850 hover:border-slate-600'
                      }`}
                  >
                    {/* Clean Left status accent line */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-1"
                      style={{
                        backgroundColor:
                          isSelected || isMine
                            ? 'var(--color-accent)'
                            : statusColor,
                      }}
                    />

                    {/* Top Row: Cargo Icon + Vessel Name + YOU Badge + Status Pill */}
                    <div className="flex items-center justify-between gap-2 pl-1 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <CargoBadge cargo={ship.cargo} iconOnly size={16} />
                        <h3
                          className={`text-sm font-bold tracking-tight truncate ${
                            isSelected || isMine
                              ? 'text-cyan-300'
                              : 'text-white'
                          }`}
                        >
                          {ship.name}
                        </h3>
                        {isMine && (
                          <span className="px-1.5 py-0.2 rounded bg-cyan-400 text-slate-950 font-black text-[9px] tracking-wider uppercase shrink-0">
                            YOU
                          </span>
                        )}
                      </div>

                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide border shrink-0"
                        style={{
                          background: `${statusColor}20`,
                          color: statusColor,
                          borderColor: `${statusColor}50`,
                        }}
                      >
                        {isCritical && (
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping mr-1 align-middle" />
                        )}
                        {STATUS_LABELS[ship.status] || ship.status}
                      </span>
                    </div>

                    {/* Middle Row: Captain + Destination */}
                    <div className="flex items-center justify-between text-xs pl-1 mb-2 text-slate-400">
                      <div className="flex items-center gap-1.5 truncate max-w-[150px]">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            isLiveManned
                              ? 'bg-cyan-400 shadow-[0_0_6px_#00E5FF]'
                              : 'bg-slate-600'
                          }`}
                        />
                        <span className="truncate text-slate-300 font-normal">
                          {captainLabel}
                        </span>
                      </div>
                      <div className="text-slate-300 font-medium truncate ml-2 flex items-center gap-1">
                        <AnimatedIcon
                          name="arrow-right"
                          size={11}
                          className="text-cyan-400 shrink-0"
                        />
                        <span className="truncate">
                          {port?.name || ship.destination}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Row: Fuel Gauge + Speed & Heading + ETA */}
                    <div className="pl-1 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs">
                      {/* Fuel Bar */}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400">
                          FUEL:
                        </span>
                        <div className="w-14 sm:w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/60">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${fuel}%`,
                              background: fuelColor(fuel),
                              boxShadow: `0 0 6px ${fuelColor(fuel)}`,
                            }}
                          />
                        </div>
                        <span
                          className="font-bold tabular-nums text-[11px]"
                          style={{ color: fuelColor(fuel) }}
                        >
                          {Math.round(fuel)}%
                        </span>
                      </div>

                      <div className="text-slate-400 flex items-center gap-1.5 ml-auto tabular-nums text-[11px]">
                        <span className="font-semibold text-slate-300">
                          {ship.speed} kn
                        </span>
                        <span>·</span>
                        <span className="text-cyan-400 font-semibold font-mono">
                          ETA {formatETA(ship.eta)}
                        </span>
                      </div>
                    </div>
                  </TiltCard>
                );
              })
            )}
          </div>
        </>
      )}

      {/* ── Collapsed Vertical Blip View ── */}
      {sidebarCollapsed && (
        <div className="flex-1 py-4 flex flex-col items-center gap-3.5 overflow-y-auto hide-scrollbar">
          {sortedShips.map((ship) => {
            const isSelected = selectedShipId === ship.shipId;
            const isCrit = [
              'distressed',
              'out_of_fuel',
              'stranded',
            ].includes(ship.status);
            const statusColor = STATUS_COLORS[ship.status] || '#94a3b8';
            return (
              <motion.button
                key={ship.shipId}
                whileHover={{ scale: 1.4 }}
                onClick={() => {
                  playSound('click');
                  selectShip(ship.shipId);
                }}
                title={`${ship.name} (${ship.shipId}) — ${STATUS_LABELS[ship.status]}`}
                className={`w-4 h-4 rounded-full shrink-0 cursor-pointer transition-all
                  ${
                    isSelected
                      ? 'ring-2 ring-cyan-400 shadow-[0_0_12px_#00E5FF] scale-125'
                      : ''
                  }`}
                style={{
                  background: statusColor,
                  boxShadow: isCrit ? `0 0 12px ${statusColor}` : undefined,
                }}
              />
            );
          })}
        </div>
      )}
    </motion.aside>
  );
}
