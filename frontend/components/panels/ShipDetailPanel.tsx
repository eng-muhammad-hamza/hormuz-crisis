'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/store';
import { useShallow } from 'zustand/react/shallow';
import { STATUS_COLORS, STATUS_LABELS } from '@/lib/theme';
import {
  formatDistance,
  formatETA,
  fuelPercent,
  fuelColor,
  headingToCardinal,
} from '@/lib/utils';
import {
  Panel,
  PanelHeader,
  PanelBody,
  Button,
  Field,
  Select,
  TextArea,
  StatusPill,
} from '@/components/ui/primitives';
import { tickerCount } from '@/lib/gsapEffects';
import { playSound } from '@/lib/audio';
import { AnimatedIcon } from '@/components/ui/AnimatedIcon';
import { CargoBadge } from '@/components/ui/CargoBadge';

export default function ShipDetailPanel() {
  const {
    fleet,
    selectedShipId,
    selectShip,
    role,
    send,
    pickingWaypointFor,
    setPickingWaypointFor,
  } = useStore(
    useShallow((s) => ({
      fleet: s.fleet,
      selectedShipId: s.selectedShipId,
      selectShip: s.selectShip,
      role: s.role,
      send: s.send,
      pickingWaypointFor: s.pickingWaypointFor,
      setPickingWaypointFor: s.setPickingWaypointFor,
    }))
  );

  const [directiveType, setDirectiveType] = useState('REROUTE');
  const [newDest, setNewDest] = useState('');
  const [distressText, setDistressText] = useState('');
  const [speed, setSpeed] = useState(14);
  const [sending, setSending] = useState(false);
  const [assistTarget, setAssistTarget] = useState('');
  const [assistType, setAssistType] = useState('fuel_transfer');

  const fuelDigitRef = useRef<HTMLSpanElement>(null);
  const prevFuelRef = useRef<number | null>(null);

  const ship = fleet?.ships.find((s) => s.shipId === selectedShipId);

  useEffect(() => {
    if (!ship) return;
    const prev = prevFuelRef.current ?? ship.fuel;
    tickerCount(fuelDigitRef.current, prev, ship.fuel, {
      duration: 0.8,
      decimals: 0,
    });
    prevFuelRef.current = ship.fuel;
  }, [ship?.fuel, ship?.shipId]);

  if (!ship || !fleet) return null;

  const port = fleet.ports.find((p) => p.id === ship.destination);
  const fuel = fuelPercent(ship.fuel, ship.fuelCapacity || 8500);
  const statusColor = STATUS_COLORS[ship.status] || '#00E5FF';
  const isCritical = ['distressed', 'out_of_fuel', 'stranded'].includes(
    ship.status
  );
  const captainLabel = ship.assignedCaptain || ship.defaultCaptainName;
  const isLiveManned = !!ship.operatorSessionId;
  const isPickingForThisShip = pickingWaypointFor === ship.shipId;
  const canCommand = role === 'command' || role === 'admin';
  const canCaptain = role === 'captain' || role === 'admin';

  const handleDirective = () => {
    playSound('command');
    if (directiveType === 'WAYPOINT') {
      setPickingWaypointFor(isPickingForThisShip ? null : ship.shipId);
      return;
    }
    setSending(true);
    const params: Record<string, unknown> = {};
    if (directiveType === 'REROUTE')
      params.newDestination = newDest || ship.destination;
    if (directiveType === 'SPEED_CHANGE') params.speed = speed;
    send('issue_directive', { shipId: ship.shipId, directiveType, params });
    setTimeout(() => setSending(false), 900);
  };

  const handleDistress = () => {
    if (!distressText.trim()) return;
    playSound('distress');
    send('submit_distress', { shipId: ship.shipId, message: distressText });
    setDistressText('');
  };

  const handleAssist = () => {
    if (!assistTarget) return;
    playSound('command');
    send('request_assistance', {
      fromShipId: ship.shipId,
      toShipId: assistTarget,
      assistType,
    });
  };

  const nearbyShips = fleet.ships
    .filter((s) => s.shipId !== ship.shipId && !s.arrived)
    .map((s) => ({
      ...s,
      dist: Math.hypot(
        s.position[0] - ship.position[0],
        s.position[1] - ship.position[1]
      ),
    }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 6);

  return (
    <motion.aside
      key={ship.shipId}
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 60 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      className="w-[430px] max-w-[95vw] shrink-0 border-l border-slate-700/80 bg-slate-950/95 backdrop-blur-2xl flex flex-col h-full z-20 relative shadow-[-16px_0_40px_rgba(0,0,0,0.7)]"
    >
      {/* ── Top Header ── */}
      <div
        className={`shrink-0 p-4 sm:p-5 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md relative overflow-hidden
          ${isCritical ? 'aura-danger bg-rose-950/30' : ''}`}
      >
        {/* Indicator bar */}
        <div
          className="absolute left-0 top-0 bottom-0 w-2"
          style={{ backgroundColor: statusColor }}
        />

        <div className="flex items-start justify-between pl-3">
          <div className="flex items-center gap-3">
            <CargoBadge cargo={ship.cargo} iconOnly size={28} />
            <div>
              <div className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
                <span className="text-cyan-300">{ship.name}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono border border-slate-700">
                  {ship.shipId}
                </span>
              </div>
              <div className="flex items-center gap-2.5 mt-1.5">
                <StatusPill color={statusColor} pulse={isCritical}>
                  {STATUS_LABELS[ship.status] || ship.status}
                </StatusPill>
                <span
                  className={`text-xs font-semibold tracking-wide flex items-center gap-1.5 ${
                    isLiveManned ? 'text-cyan-400' : 'text-slate-400'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isLiveManned ? 'bg-cyan-400 shadow-[0_0_6px_#00E5FF]' : 'bg-slate-600'
                    }`}
                  />
                  <span>{captainLabel}</span>
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              playSound('click');
              selectShip(null);
            }}
            aria-label="Close ship details"
            className="w-8 h-8 flex items-center justify-center bg-slate-800/80 border border-slate-700 rounded-lg text-slate-400 hover:text-rose-400 hover:border-rose-500 cursor-pointer transition-all duration-200"
          >
            <AnimatedIcon name="close" size={16} />
          </button>
        </div>
      </div>

      {/* ── Scrollable Body Content with generous padding ── */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-4 hide-scrollbar">
        {/* 1. Tactical Navigation Telemetry */}
        <Panel className="border-slate-800 bg-slate-900/60 shadow-lg">
          <PanelHeader
            iconName="compass"
            title="Navigation Telemetry"
            badge={`${headingToCardinal(ship.heading)} ${Math.round(
              ship.heading
            )}°`}
            badgeTone="accent"
          />
          <PanelBody className="grid grid-cols-2 gap-2.5 text-xs sm:text-sm">
            {[
              { l: 'LATITUDE', v: `${ship.position[0].toFixed(4)}° N` },
              { l: 'LONGITUDE', v: `${ship.position[1].toFixed(4)}° E` },
              { l: 'TRANSIT SPEED', v: `${ship.speed} KNOTS` },
              {
                l: 'HEADING',
                v: `${Math.round(ship.heading)}° (${headingToCardinal(
                  ship.heading
                )})`,
              },
              { l: 'DESTINATION', v: port?.name || ship.destination },
              {
                l: 'DISTANCE',
                v: formatDistance(ship.distanceToDestination),
              },
              { l: 'ESTIMATED ARRIVAL', v: formatETA(ship.eta), hl: true },
              {
                l: 'WEATHER CONDITIONS',
                v: ship.inWeather
                  ? ship.currentWeather?.name || 'ADVERSE'
                  : 'CLEAR SKY',
                danger: ship.inWeather,
              },
            ].map((item) => (
              <div
                key={item.l}
                className="p-3 rounded-xl bg-slate-950/60 border border-slate-800"
              >
                <div className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase">
                  {item.l}
                </div>
                <div
                  className={`font-bold text-xs sm:text-sm mt-1 truncate ${
                    item.danger
                      ? 'text-amber-400'
                      : item.hl
                      ? 'text-cyan-400'
                      : 'text-slate-100'
                  }`}
                >
                  {item.v}
                </div>
              </div>
            ))}
          </PanelBody>
        </Panel>

        {/* 2. Fuel & Cargo */}
        <Panel className="border-slate-800 bg-slate-900/60 shadow-lg">
          <PanelHeader
            iconName="fuel"
            title="Cargo & Fuel Telemetry"
          />
          <PanelBody className="flex flex-col gap-3">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="flex items-center gap-3">
                <CargoBadge cargo={ship.cargo} iconOnly size={24} />
                <div>
                  <h4 className="text-sm font-bold text-slate-100">
                    {ship.cargo}
                  </h4>
                  <p className="text-xs text-slate-400 font-medium">
                    Commercial Cargo Manifest
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs sm:text-sm font-bold text-slate-300">
                  CREW: {ship.crewCount}
                </div>
                <div className="text-xs font-semibold text-emerald-400">
                  STATUS OK
                </div>
              </div>
            </div>

            {/* Fuel Gauge */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Bunker Fuel Remaining
                </span>
                <span
                  className="text-xs sm:text-sm font-bold tabular-nums"
                  style={{ color: fuelColor(fuel) }}
                >
                  <span ref={fuelDigitRef}>{Math.round(ship.fuel)}</span>t /{' '}
                  {ship.fuelCapacity || 8500}t ({Math.round(fuel)}%)
                </span>
              </div>
              <div className="h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700 shadow-inner">
                <motion.div
                  animate={{ width: `${fuel}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{
                    background: `linear-gradient(90deg, ${fuelColor(
                      fuel
                    )}, ${fuelColor(fuel)}CC)`,
                    boxShadow: `0 0 10px ${fuelColor(fuel)}`,
                  }}
                />
              </div>
            </div>

            {ship.predictedFuelShortfall && (
              <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/50 text-xs font-semibold text-rose-300 flex items-center gap-2">
                <AnimatedIcon name="alert" size={15} />
                <span>Projected fuel shortfall before port arrival</span>
              </div>
            )}
            {ship.inWeather && (
              <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-500/50 text-xs font-semibold text-amber-300 flex items-center gap-2">
                <AnimatedIcon name="wind" size={15} />
                <span>+30% Fuel Burn in Adverse Weather</span>
              </div>
            )}
            {ship.inspectionRequested && (
              <div className="p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-400/50 text-xs font-semibold text-cyan-300 flex items-center gap-2">
                <AnimatedIcon name="search" size={15} />
                <span>Cargo inspection order active on record</span>
              </div>
            )}
          </PanelBody>
        </Panel>

        {/* 3. Command Actions & Directives */}
        {canCommand && (
          <Panel glow className="border-cyan-500/40 bg-slate-900/70 shadow-xl">
            <PanelHeader
              iconName="radio"
              title="Command Directives"
              subtitle={
                role === 'admin'
                  ? 'Admin executing as Command'
                  : 'Issue tactical order to vessel'
              }
            />
            <PanelBody className="flex flex-col gap-3">
              <Field label="Directive Type">
                <Select
                  value={directiveType}
                  onChange={(e) => setDirectiveType(e.target.value)}
                >
                  <option value="REROUTE">Reroute to Safe Port</option>
                  <option value="WAYPOINT">Divert via Tactical Waypoint</option>
                  <option value="HOLD">Hold Current Position</option>
                  <option value="RESUME">Resume Original Course</option>
                  <option value="SPEED_CHANGE">Change Transit Speed</option>
                  <option value="INSPECT">Order Cargo Inspection</option>
                </Select>
              </Field>

              {directiveType === 'WAYPOINT' && (
                <div
                  className={`p-3 rounded-lg border text-xs font-medium tracking-wide leading-relaxed
                  ${
                    isPickingForThisShip
                      ? 'text-cyan-300 bg-cyan-950/40 border-cyan-400 animate-pulse'
                      : 'text-slate-300 bg-slate-950/60 border-slate-800'
                  }`}
                >
                  {isPickingForThisShip
                    ? 'Waypoint tool armed! Click anywhere on the map to set a new navigation waypoint.'
                    : 'Click "Arm Waypoint Picker" below, then click on the tactical map to assign coordinates.'}
                </div>
              )}

              {directiveType === 'REROUTE' && (
                <Field label="New Destination Port">
                  <Select
                    value={newDest}
                    onChange={(e) => setNewDest(e.target.value)}
                  >
                    <option value="">Select Destination Port…</option>
                    {fleet.ports
                      .filter((p) => p.id !== ship.destination)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </Select>
                </Field>
              )}

              {directiveType === 'SPEED_CHANGE' && (
                <Field label={`Transit Speed — ${speed} Knots`}>
                  <input
                    type="range"
                    min={4}
                    max={28}
                    value={speed}
                    onChange={(e) => setSpeed(Number(e.target.value))}
                    className="mt-1"
                  />
                  <div className="flex justify-between text-[11px] font-semibold text-slate-400 mt-1">
                    <span>4 kn (Eco)</span>
                    <span>14 kn (Std)</span>
                    <span>28 kn (Flank)</span>
                  </div>
                </Field>
              )}

              <Button
                tone={
                  directiveType === 'WAYPOINT' && isPickingForThisShip
                    ? 'warning'
                    : 'primary'
                }
                full
                size="md"
                disabled={sending}
                onClick={handleDirective}
                iconName={
                  directiveType === 'WAYPOINT' ? 'map-pin' : 'send'
                }
                className="mt-1"
              >
                {sending
                  ? 'Transmitting Directive…'
                  : directiveType === 'WAYPOINT'
                  ? isPickingForThisShip
                    ? 'Cancel Waypoint Mode'
                    : 'Arm Waypoint Picker'
                  : 'Transmit Directive'}
              </Button>
            </PanelBody>
          </Panel>
        )}

        {/* 4. Request Mutual Aid */}
        {canCommand && (
          <Panel className="border-slate-800 bg-slate-900/60 shadow-lg">
            <PanelHeader
              iconName="lifebuoy"
              title="Coordinate Mutual Aid"
              subtitle="Pair with nearby fleet asset"
            />
            <PanelBody className="flex flex-col gap-3">
              <Field label="Assistance Type">
                <Select
                  value={assistType}
                  onChange={(e) => setAssistType(e.target.value)}
                >
                  <option value="fuel_transfer">Emergency Fuel Transfer</option>
                  <option value="medical">Medical Evacuation / AID</option>
                  <option value="escort">Convoy Escort Protection</option>
                  <option value="cargo_offload">Emergency Cargo Offload</option>
                </Select>
              </Field>

              <Field label="Responding Fleet Vessel">
                <Select
                  value={assistTarget}
                  onChange={(e) => setAssistTarget(e.target.value)}
                >
                  <option value="">Select Nearby Vessel…</option>
                  {nearbyShips.map((s) => (
                    <option key={s.shipId} value={s.shipId}>
                      {s.name} ({formatDistance(s.dist * 111)} away)
                    </option>
                  ))}
                </Select>
              </Field>

              <Button
                tone="ghost"
                full
                size="md"
                disabled={!assistTarget}
                onClick={handleAssist}
                iconName="shield"
                className="mt-1"
              >
                Dispatch Mutual Aid
              </Button>
            </PanelBody>
          </Panel>
        )}

        {/* 5. Captain Distress Mayday */}
        {canCaptain && (
          <Panel glow className="aura-danger border-rose-500/50 bg-slate-900/70 shadow-xl">
            <PanelHeader
              iconName="alert"
              title="Mayday Distress Channel"
              subtitle={
                role === 'admin'
                  ? 'Admin executing as Captain'
                  : 'Broadcast emergency alert'
              }
              accentClass="border-rose-500/50"
            />
            <PanelBody className="flex flex-col gap-3">
              <TextArea
                value={distressText}
                onChange={(e) => setDistressText(e.target.value)}
                placeholder="State nature of emergency (e.g., Engine failure, drone swarm, hostile boarding, heavy fire, critical flooding)..."
                rows={3}
                className="text-xs sm:text-sm font-medium"
              />
              <Button
                tone="danger"
                full
                size="md"
                disabled={!distressText.trim()}
                onClick={handleDistress}
                iconName="alert"
                className="mt-1"
              >
                Broadcast Mayday Distress
              </Button>
            </PanelBody>
          </Panel>
        )}
      </div>
    </motion.aside>
  );
}
