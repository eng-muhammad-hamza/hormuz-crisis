'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store';
import { useShallow } from 'zustand/react/shallow';
import {
  haversineDistance,
  formatDistance,
  formatTimestamp,
} from '@/lib/utils';
import {
  SideDrawer,
  PanelHeader,
  EmptyState,
  Button,
  Field,
  Select,
} from '@/components/ui/primitives';
import { playSound } from '@/lib/audio';
import { AnimatedIcon, type IconName } from '@/components/ui/AnimatedIcon';

const ASSIST_TYPES: {
  id: string;
  label: string;
  iconName: IconName;
  desc: string;
}[] = [
  {
    id: 'fuel_transfer',
    label: 'Fuel Transfer',
    iconName: 'fuel',
    desc: 'Pump bunker fuel reserves to stranded ship',
  },
  {
    id: 'medical',
    label: 'Medical Evac',
    iconName: 'activity',
    desc: 'Deploy emergency medical team & triage',
  },
  {
    id: 'escort',
    label: 'Convoy Escort',
    iconName: 'shield',
    desc: 'Provide armed close-escort protection',
  },
  {
    id: 'cargo_offload',
    label: 'Cargo Offload',
    iconName: 'anchor',
    desc: 'Transfer container/crude cargo to lighten ship',
  },
];

const STATUS_TONE: Record<
  string,
  { badge: string; text: string; border: string }
> = {
  pending: {
    badge: 'bg-amber-950/40 text-amber-300 border-amber-500/50',
    text: 'text-amber-400',
    border: 'border-l-amber-500',
  },
  accepted: {
    badge: 'bg-emerald-950/40 text-emerald-300 border-emerald-500/50',
    text: 'text-emerald-400',
    border: 'border-l-emerald-500',
  },
  declined: {
    badge: 'bg-rose-950/40 text-rose-300 border-rose-500/50',
    text: 'text-rose-400',
    border: 'border-l-rose-500',
  },
};

export default function AssistancePanel({ onClose }: { onClose: () => void }) {
  const { fleet, send, role } = useStore(
    useShallow((s) => ({
      fleet: s.fleet,
      send: s.send,
      role: s.role,
    }))
  );
  const [fromShipId, setFromShipId] = useState('');
  const [toShipId, setToShipId] = useState('');
  const [assistType, setAssistType] = useState('escort');
  const [sent, setSent] = useState(false);

  if (!fleet) return null;

  const canDispatch = role === 'command' || role === 'admin';
  const distressedShips = fleet.ships.filter((s) =>
    ['distressed', 'out_of_fuel', 'insufficient_fuel', 'stranded'].includes(
      s.status
    )
  );
  const availableShips = fleet.ships.filter(
    (s) =>
      !s.arrived &&
      s.shipId !== fromShipId &&
      !['distressed', 'out_of_fuel'].includes(s.status) &&
      s.fuel > 800
  );

  const targetShip = fleet.ships.find((s) => s.shipId === fromShipId);
  const rescuerShip = fleet.ships.find((s) => s.shipId === toShipId);
  const distance =
    targetShip && rescuerShip
      ? haversineDistance(
          targetShip.position[0],
          targetShip.position[1],
          rescuerShip.position[0],
          rescuerShip.position[1]
        )
      : null;

  const handleSubmit = () => {
    if (!fromShipId || !toShipId) return;
    playSound('command');
    send('request_assistance', { fromShipId, toShipId, assistType });
    setSent(true);
    setTimeout(() => {
      setSent(false);
      setFromShipId('');
      setToShipId('');
    }, 1800);
  };

  const requests = fleet.assistanceRequests || [];

  return (
    <SideDrawer width={420}>
      <PanelHeader
        iconName="lifebuoy"
        title="Mutual Aid Network"
        subtitle="Vessel-to-Vessel Emergency Assistance"
        badge={requests.filter((r) => r.status === 'pending').length || undefined}
        badgeTone="warning"
        onClose={onClose}
      />

      {canDispatch && (
        <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex flex-col gap-3.5">
          <Field label="VESSEL IN NEED OF AID">
            <Select
              value={fromShipId}
              onChange={(e) => setFromShipId(e.target.value)}
            >
              <option value="">Select target vessel…</option>
              {distressedShips.length > 0 && (
                <optgroup label="DISTRESSED VESSELS">
                  {distressedShips.map((s) => (
                    <option key={s.shipId} value={s.shipId}>
                      {s.name} — {s.status.replace('_', ' ').toUpperCase()}
                    </option>
                  ))}
                </optgroup>
              )}
              <optgroup label="ALL ACTIVE SHIPS">
                {fleet.ships
                  .filter((s) => !s.arrived)
                  .map((s) => (
                    <option key={s.shipId} value={s.shipId}>
                      {s.name}
                    </option>
                  ))}
              </optgroup>
            </Select>
          </Field>

          <Field label="ASSISTANCE TYPE">
            <div className="grid grid-cols-2 gap-2">
              {ASSIST_TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    playSound('click');
                    setAssistType(t.id);
                  }}
                  title={t.desc}
                  className={`text-left p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5
                    ${
                      assistType === t.id
                        ? 'border-cyan-400 bg-cyan-950/50 text-cyan-300 shadow-[0_0_12px_rgba(0,229,255,0.25)]'
                        : 'border-slate-800 bg-slate-900/70 text-slate-300 hover:bg-slate-800'
                    }`}
                >
                  <div className="shrink-0 text-cyan-400 mt-0.5">
                    <AnimatedIcon name={t.iconName} size={18} />
                  </div>
                  <div className="min-w-0">
                    <div
                      className={`text-xs font-bold uppercase truncate ${
                        assistType === t.id ? 'text-cyan-300' : 'text-slate-100'
                      }`}
                    >
                      {t.label}
                    </div>
                    <p className="text-[11px] text-slate-400 truncate leading-tight mt-0.5">
                      {t.desc}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </Field>

          <Field label="RESPONDING FLEET ASSET">
            <Select
              value={toShipId}
              onChange={(e) => setToShipId(e.target.value)}
              disabled={!fromShipId}
            >
              <option value="">Select available responder…</option>
              {availableShips.map((s) => {
                const d = targetShip
                  ? haversineDistance(
                      targetShip.position[0],
                      targetShip.position[1],
                      s.position[0],
                      s.position[1]
                    )
                  : null;
                return (
                  <option key={s.shipId} value={s.shipId}>
                    {s.name} {d !== null ? `(${formatDistance(d)} away)` : ''}
                  </option>
                );
              })}
            </Select>
          </Field>

          {distance !== null && (
            <div className="text-xs font-mono text-slate-300 bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
              <span>INTER-VESSEL DISTANCE:</span>
              <span className="font-bold text-cyan-400 text-sm">
                {formatDistance(distance)}
              </span>
            </div>
          )}

          <Button
            tone={sent ? 'success' : 'primary'}
            full
            size="md"
            disabled={!fromShipId || !toShipId}
            onClick={handleSubmit}
            iconName="send"
            className="py-3 mt-1"
          >
            {sent ? 'AID REQUEST DISPATCHED' : 'DISPATCH MUTUAL AID ORDER'}
          </Button>
        </div>
      )}

      {/* Requests History List */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-3 hide-scrollbar">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
          AID COORDINATION LOG
        </h4>
        {requests.length === 0 ? (
          <EmptyState
            iconName="lifebuoy"
            title="No Aid Transmissions"
            hint="Mutual assistance requests between ships will be tracked here."
          />
        ) : (
          <AnimatePresence>
            {requests.map((r, i) => {
              const tone = STATUS_TONE[r.status] || STATUS_TONE.pending;
              return (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className={`p-3.5 rounded-xl border border-slate-800 border-l-4 ${tone.border} bg-slate-900/70 shadow-md`}
                >
                  <div className="flex items-center justify-between text-xs sm:text-sm font-semibold mb-1.5">
                    <div>
                      <span className="text-cyan-300 font-bold">
                        {r.toShipName}
                      </span>
                      <AnimatedIcon
                        name="arrow-right"
                        size={13}
                        className="inline-block mx-1.5 text-cyan-400 align-middle"
                      />
                      <span className="text-slate-200">
                        aiding {r.fromShipName}
                      </span>
                    </div>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full border uppercase ${tone.badge}`}
                    >
                      {r.status}
                    </span>
                  </div>

                  <div className="text-xs text-slate-400 uppercase mb-1.5">
                    TYPE:{' '}
                    {ASSIST_TYPES.find((t) => t.id === r.type)?.label ||
                      r.type}
                  </div>

                  <div className="text-xs font-mono text-slate-500 text-right">
                    {formatTimestamp(r.timestamp)}
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
