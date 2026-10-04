'use client';

import { useState, useRef } from 'react';
import { useStore } from '@/store';
import { useShallow } from 'zustand/react/shallow';
import { STATUS_COLORS, STATUS_LABELS } from '@/lib/theme';
import { fuelPercent, fuelColor } from '@/lib/utils';
import {
  SideDrawer,
  PanelHeader,
  PanelBody,
  Panel,
  Button,
  Field,
  Select,
  TextInput,
  Toggle,
} from '@/components/ui/primitives';
import { playSound, startSiren, stopSiren, isSirenActive } from '@/lib/audio';
import { screenShake } from '@/lib/gsapEffects';
import { AnimatedIcon } from '@/components/ui/AnimatedIcon';

const ALERT_TYPES = [
  'GEOFENCE_BREACH',
  'PROXIMITY',
  'DISTRESS',
  'FUEL_LOW',
  'OUT_OF_FUEL',
  'STRANDED',
  'ARRIVED',
  'PREDICTIVE_ZONE',
  'PREDICTIVE_FUEL',
  'SYSTEM',
];
const SEVERITIES = ['info', 'warning', 'critical', 'success'];

export default function AdminTestConsole({ onClose }: { onClose: () => void }) {
  const { fleet, send } = useStore(
    useShallow((s) => ({
      fleet: s.fleet,
      send: s.send,
    }))
  );
  const [shipId, setShipId] = useState('MV-1');
  const [speedVal, setSpeedVal] = useState(14);
  const [fuelVal, setFuelVal] = useState(5000);
  const [headingVal, setHeadingVal] = useState(90);
  const [statusVal, setStatusVal] = useState('normal');
  const [alertType, setAlertType] = useState('SYSTEM');
  const [alertSeverity, setAlertSeverity] = useState<
    'info' | 'warning' | 'critical' | 'success'
  >('critical');
  const [alertMsg, setAlertMsg] = useState(
    'TEST: synthetic alert from Admin Console'
  );
  const [directiveType, setDirectiveType] = useState('REROUTE');
  const [directiveDest, setDirectiveDest] = useState('');
  const [sirenOn, setSirenOn] = useState(isSirenActive());
  const shakeRef = useRef<HTMLDivElement>(null);

  if (!fleet) return null;
  const ship = fleet.ships.find((s) => s.shipId === shipId);

  const applyOverride = (patch: Record<string, unknown>) => {
    send('admin_override_ship', { shipId, patch });
    screenShake(shakeRef.current, 4);
  };

  const fireTestAlert = () => {
    send('admin_fire_test_alert', {
      alertType,
      severity: alertSeverity,
      message: alertMsg,
      shipId,
    });
    playSound(alertSeverity === 'critical' ? 'alert' : 'warning');
  };

  const runDirectiveCycle = () => {
    const params: Record<string, unknown> = {};
    if (directiveType === 'REROUTE')
      params.newDestination = directiveDest || ship?.destination;
    if (directiveType === 'SPEED_CHANGE') params.speed = speedVal;
    send('admin_issue_and_accept_directive', {
      shipId,
      directiveType,
      params,
      autoResponse: 'ACCEPTED',
    });
  };

  const toggleSiren = () => {
    if (sirenOn) {
      stopSiren();
      setSirenOn(false);
    } else {
      startSiren();
      setSirenOn(true);
    }
  };

  return (
    <SideDrawer width={440} accentClass="border-purple-500/80">
      <div ref={shakeRef}>
        <PanelHeader
          iconName="sliders"
          title="Admin Test Console"
          subtitle="Full override authority · For verification only"
          badge="ADMIN"
          badgeTone="muted"
          onClose={onClose}
          accentClass="border-purple-500/60"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-4 hide-scrollbar">
        {/* Ship picker */}
        <Panel className="border-slate-800 bg-slate-900/60 shadow-lg">
          <PanelBody className="flex flex-col gap-3">
            <Field label="Target vessel">
              <Select
                value={shipId}
                onChange={(e) => setShipId(e.target.value)}
              >
                {fleet.ships.map((s) => (
                  <option key={s.shipId} value={s.shipId}>
                    {s.shipId} — {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            {ship && (
              <div className="flex items-center gap-3 text-xs pt-2 border-t border-slate-800">
                <span
                  className="px-2.5 py-0.5 rounded-full font-bold uppercase text-xs border"
                  style={{
                    color: STATUS_COLORS[ship.status],
                    borderColor: `${STATUS_COLORS[ship.status]}66`,
                    background: `${STATUS_COLORS[ship.status]}20`,
                  }}
                >
                  {STATUS_LABELS[ship.status]}
                </span>
                <span className="text-slate-300 font-semibold">
                  {ship.speed} kn
                </span>
                <span className="text-slate-400 tabular-nums">
                  {Math.round(ship.fuel)}t / {ship.fuelCapacity}t
                </span>
                <span
                  className="font-bold ml-auto tabular-nums"
                  style={{
                    color: fuelColor(
                      fuelPercent(ship.fuel, ship.fuelCapacity)
                    ),
                  }}
                >
                  {Math.round(fuelPercent(ship.fuel, ship.fuelCapacity))}%
                </span>
              </div>
            )}
          </PanelBody>
        </Panel>

        {/* Direct override */}
        <Panel className="border-slate-800 bg-slate-900/60 shadow-lg">
          <PanelHeader
            iconName="zap"
            title="Force Ship Values"
            subtitle="Instant simulation override"
          />
          <PanelBody className="grid grid-cols-2 gap-3">
            <Field label={`Speed — ${speedVal}kn`}>
              <input
                type="range"
                min={0}
                max={40}
                value={speedVal}
                onChange={(e) => setSpeedVal(Number(e.target.value))}
                className="mt-1"
              />
            </Field>
            <Field label={`Heading — ${headingVal}°`}>
              <input
                type="range"
                min={0}
                max={359}
                value={headingVal}
                onChange={(e) => setHeadingVal(Number(e.target.value))}
                className="mt-1"
              />
            </Field>
            <Field label="Fuel (tons)">
              <TextInput
                type="number"
                value={fuelVal}
                onChange={(e) => setFuelVal(Number(e.target.value))}
                min={0}
                max={ship?.fuelCapacity || 9000}
              />
            </Field>
            <Field label="Status">
              <Select
                value={statusVal}
                onChange={(e) => setStatusVal(e.target.value)}
              >
                {Object.keys(STATUS_LABELS).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </Select>
            </Field>
          </PanelBody>
          <div className="px-4 pb-4 pt-1 flex flex-wrap gap-2">
            <Button
              tone="primary"
              size="sm"
              onClick={() => applyOverride({ speed: speedVal })}
            >
              Set Speed
            </Button>
            <Button
              tone="primary"
              size="sm"
              onClick={() => applyOverride({ heading: headingVal })}
            >
              Set Heading
            </Button>
            <Button
              tone="warning"
              size="sm"
              onClick={() => applyOverride({ fuel: fuelVal })}
            >
              Set Fuel
            </Button>
            <Button
              tone="ghost"
              size="sm"
              onClick={() => applyOverride({ status: statusVal })}
            >
              Set Status
            </Button>
            <Button
              tone="danger"
              size="sm"
              iconName="fuel"
              onClick={() => applyOverride({ fuel: 0 })}
            >
              Empty Fuel
            </Button>
            <Button
              tone="danger"
              size="sm"
              iconName="zap"
              onClick={() => applyOverride({ speed: 38 })}
            >
              Max Knots
            </Button>
          </div>
        </Panel>

        {/* Alert / siren testing */}
        <Panel className="border-slate-800 bg-slate-900/60 shadow-lg">
          <PanelHeader
            iconName="bell"
            title="Fire a Test Alert"
            subtitle="Verifies alert pipeline & sirens"
          />
          <PanelBody className="grid grid-cols-2 gap-3">
            <Field label="Alert type">
              <Select
                value={alertType}
                onChange={(e) => setAlertType(e.target.value)}
              >
                {ALERT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Severity">
              <Select
                value={alertSeverity}
                onChange={(e) =>
                  setAlertSeverity(e.target.value as typeof alertSeverity)
                }
              >
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>
          </PanelBody>
          <div className="px-4 pb-2">
            <Field label="Message">
              <TextInput
                value={alertMsg}
                onChange={(e) => setAlertMsg(e.target.value)}
              />
            </Field>
          </div>
          <div className="px-4 pb-3 flex flex-wrap gap-2">
            <Button
              tone="danger"
              size="sm"
              iconName="alert"
              onClick={fireTestAlert}
            >
              Fire Alert
            </Button>
            <Button
              tone="ghost"
              size="sm"
              onClick={() => playSound('distress')}
            >
              Chime Mayday
            </Button>
            <Button
              tone="ghost"
              size="sm"
              onClick={() => playSound('alert')}
            >
              Chime Alert
            </Button>
          </div>
          <div className="mx-4 mb-4 p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-xs sm:text-sm font-bold text-slate-100">
                Continuous War Siren
              </div>
              <div className="text-xs text-slate-400">
                Loops until toggled off
              </div>
            </div>
            <Toggle
              checked={sirenOn}
              onChange={toggleSiren}
              label="Toggle siren"
            />
          </div>
        </Panel>

        {/* Simulation speed control */}
        <Panel className="border-slate-800 bg-slate-900/60 shadow-lg">
          <PanelHeader
            iconName="activity"
            title="Simulation Speed"
            subtitle={`Currently ${fleet.simTimeMultiplier ?? 90}× real time`}
          />
          <PanelBody className="flex flex-wrap gap-2">
            {[30, 90, 300, 900, 3600].map((mult) => (
              <Button
                key={mult}
                tone={
                  fleet.simTimeMultiplier === mult ? 'primary' : 'ghost'
                }
                size="sm"
                onClick={() =>
                  send('admin_set_sim_speed', { multiplier: mult })
                }
              >
                {mult}×
                {mult >= 3600
                  ? ' (1hr/s)'
                  : mult >= 60
                  ? ` (${(mult / 60).toFixed(0)}m/s)`
                  : ''}
              </Button>
            ))}
          </PanelBody>
        </Panel>

        {/* Live fleet snapshot table */}
        <Panel className="border-slate-800 bg-slate-900/60 shadow-lg">
          <PanelHeader
            iconName="database"
            title="Live Fleet Snapshot"
            subtitle={`Tick #${fleet.tickCount} · Refreshes 1Hz`}
          />
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-950 border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="px-3 py-2 font-bold text-left">SHIP</th>
                  <th className="px-3 py-2 font-bold text-left">STATUS</th>
                  <th className="px-3 py-2 font-bold text-right">FUEL</th>
                  <th className="px-3 py-2 font-bold text-right">KNOTS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {fleet.ships.map((s) => (
                  <tr
                    key={s.shipId}
                    className="hover:bg-slate-800/60 cursor-pointer transition-colors"
                    onClick={() => setShipId(s.shipId)}
                  >
                    <td className="px-3 py-2 font-mono font-bold text-cyan-400">
                      {s.shipId}
                    </td>
                    <td className="px-3 py-2 font-medium">
                      <span style={{ color: STATUS_COLORS[s.status] }}>
                        {STATUS_LABELS[s.status]}
                      </span>
                    </td>
                    <td
                      className="px-3 py-2 text-right tabular-nums font-bold"
                      style={{
                        color: fuelColor(
                          fuelPercent(s.fuel, s.fuelCapacity)
                        ),
                      }}
                    >
                      {Math.round(fuelPercent(s.fuel, s.fuelCapacity))}%
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-300">
                      {s.speed} kn
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </SideDrawer>
  );
}
