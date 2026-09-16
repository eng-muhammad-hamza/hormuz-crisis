'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store';
import { useShallow } from 'zustand/react/shallow';
import { formatTimestamp } from '@/lib/utils';
import {
  SideDrawer,
  PanelHeader,
  EmptyState,
  Button,
  TextArea,
} from '@/components/ui/primitives';
import { playSound } from '@/lib/audio';
import { AnimatedIcon, type IconName } from '@/components/ui/AnimatedIcon';
import type { Directive, FleetState, AssistanceRequest } from '@/types';

const DIRECTIVE_ICON_MAP: Record<string, IconName> = {
  REROUTE: 'compass',
  HOLD: 'pause',
  RESUME: 'play',
  SPEED_CHANGE: 'zap',
  ASSIST: 'lifebuoy',
  WAYPOINT: 'map-pin',
  INSPECT: 'search',
};

function DirectiveResponseCard({
  directive,
  fleet,
  onRespond,
}: {
  directive: Directive;
  fleet: FleetState;
  onRespond: (
    id: string,
    response: 'ACCEPTED' | 'ESCALATED',
    msg?: string
  ) => void;
}) {
  const [escalateMsg, setEscalateMsg] = useState('');
  const [showEscalate, setShowEscalate] = useState(false);
  const ship = fleet.ships.find((s) => s.shipId === directive.shipId);
  const destId = directive.params.newDestination as string | undefined;
  const port = destId ? fleet.ports.find((p) => p.id === destId) : null;

  const describe = () => {
    switch (directive.type) {
      case 'REROUTE':
        return `reroute to ${port?.name || destId}`;
      case 'WAYPOINT':
        return `divert to designated tactical waypoint and resume route`;
      case 'HOLD':
        return 'hold current coordinates immediately';
      case 'RESUME':
        return 'resume nominal course';
      case 'SPEED_CHANGE':
        return `adjust transit speed to ${String(directive.params.speed)} knots`;
      case 'INSPECT':
        return 'submit to physical cargo inspection on arrival';
      default:
        return directive.type.toLowerCase();
    }
  };

  return (
    <div className="p-4 rounded-xl border border-amber-500/80 bg-slate-900/90 shadow-lg">
      <div className="text-xs sm:text-sm leading-relaxed mb-3">
        <span className="text-amber-400 font-bold uppercase tracking-wider block mb-1">
          COMMAND DIRECTIVE TRANSMISSION:
        </span>
        <span className="text-slate-100 font-medium">
          <strong className="text-cyan-300">{ship?.name}</strong> ordered to{' '}
          {describe()}.
        </span>
      </div>

      {!showEscalate ? (
        <div className="flex gap-2.5">
          <Button
            tone="success"
            size="sm"
            full
            iconName="check"
            onClick={() => {
              playSound('command');
              onRespond(
                directive.id,
                'ACCEPTED',
                'Order received and acknowledged.'
              );
            }}
          >
            Comply &amp; Accept
          </Button>
          <Button
            tone="danger"
            size="sm"
            full
            iconName="alert"
            onClick={() => {
              playSound('click');
              setShowEscalate(true);
            }}
          >
            Cannot Comply
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          <TextArea
            value={escalateMsg}
            onChange={(e) => setEscalateMsg(e.target.value)}
            placeholder="State rationale / emergency distress justification…"
            rows={2}
            className="text-xs sm:text-sm"
          />
          <div className="flex gap-2">
            <Button
              tone="danger"
              size="sm"
              full
              iconName="alert"
              onClick={() => {
                playSound('distress');
                onRespond(directive.id, 'ESCALATED', escalateMsg);
              }}
            >
              Broadcast Distress
            </Button>
            <Button
              tone="ghost"
              size="sm"
              onClick={() => setShowEscalate(false)}
            >
              Back
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function AssistanceCard({
  req,
  onRespond,
}: {
  req: AssistanceRequest;
  onRespond: (id: string, accept: boolean) => void;
}) {
  const labels: Record<string, string> = {
    fuel_transfer: 'emergency fuel transfer',
    medical: 'emergency medical aid',
    escort: 'convoy escort protection',
    cargo_offload: 'emergency cargo offload',
  };

  return (
    <div className="p-4 rounded-xl border border-cyan-400/80 bg-slate-900/90 shadow-lg">
      <div className="text-xs sm:text-sm leading-relaxed mb-3">
        <span className="text-cyan-400 font-bold uppercase tracking-wider block mb-1">
          MUTUAL AID REQUEST:
        </span>
        <span className="text-slate-100 font-medium">
          <strong className="text-cyan-300">{req.fromShipName}</strong> requests{' '}
          {labels[req.type] || req.type} from your vessel.
        </span>
      </div>
      <div className="flex gap-2.5">
        <Button
          tone="success"
          size="sm"
          full
          iconName="check"
          onClick={() => {
            playSound('command');
            onRespond(req.id, true);
          }}
        >
          Render Assistance
        </Button>
        <Button
          tone="ghost"
          size="sm"
          full
          onClick={() => {
            playSound('click');
            onRespond(req.id, false);
          }}
        >
          Decline
        </Button>
      </div>
    </div>
  );
}

const STATUS_CLASS: Record<
  string,
  { text: string; border: string; bg: string }
> = {
  pending: {
    text: 'text-amber-400',
    border: 'border-l-amber-500',
    bg: 'bg-amber-950/40',
  },
  ACCEPTED: {
    text: 'text-emerald-400',
    border: 'border-l-emerald-500',
    bg: 'bg-emerald-950/40',
  },
  ESCALATED: {
    text: 'text-rose-400',
    border: 'border-l-rose-500',
    bg: 'bg-rose-950/40',
  },
};

export default function DirectivesPanel({ onClose }: { onClose: () => void }) {
  const { fleet, role, send, captainShipId } = useStore(
    useShallow((s) => ({
      fleet: s.fleet,
      role: s.role,
      send: s.send,
      captainShipId: s.captainShipId,
    }))
  );
  if (!fleet) return null;

  const directives = fleet.directives;
  const respondToDirective = (
    directiveId: string,
    response: 'ACCEPTED' | 'ESCALATED',
    captainMessage?: string
  ) =>
    send('respond_directive', {
      directiveId,
      response,
      captainMessage: captainMessage || '',
    });
  const respondToAssistance = (requestId: string, accept: boolean) =>
    send('respond_assistance', { requestId, accept });

  const isCaptainish = role === 'captain' || role === 'admin';
  const pendingDirectives = isCaptainish
    ? directives.filter(
        (d) =>
          (role === 'admin' || d.shipId === captainShipId) &&
          d.status === 'pending'
      )
    : [];
  const pendingAssistance = isCaptainish
    ? (fleet.assistanceRequests || []).filter(
        (r) =>
          (role === 'admin' || r.toShipId === captainShipId) &&
          r.status === 'pending'
      )
    : [];
  const hasPending = pendingDirectives.length + pendingAssistance.length > 0;

  return (
    <SideDrawer
      width={420}
      accentClass={hasPending ? 'border-amber-500/80' : undefined}
    >
      <PanelHeader
        iconName="radio"
        title="Directives &amp; C2 Channel"
        subtitle={
          hasPending
            ? 'Immediate Bridge Response Required'
            : `${directives.length} orders logged`
        }
        badge={
          hasPending
            ? pendingDirectives.length + pendingAssistance.length
            : undefined
        }
        badgeTone="warning"
        onClose={onClose}
      />

      {/* Action Required Banner for Bridge Captain */}
      {hasPending && (
        <div className="p-4 border-b border-slate-800 bg-amber-950/20 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>ACTION REQUIRED BY BRIDGE COMMAND</span>
          </div>
          {pendingDirectives.map((d) => (
            <DirectiveResponseCard
              key={d.id}
              directive={d}
              fleet={fleet}
              onRespond={respondToDirective}
            />
          ))}
          {pendingAssistance.map((r) => (
            <AssistanceCard
              key={r.id}
              req={r}
              onRespond={respondToAssistance}
            />
          ))}
        </div>
      )}

      {/* Directives History Log */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-3 hide-scrollbar">
        {directives.length === 0 ? (
          <EmptyState
            iconName="radio"
            title="No Directives Transmitted"
            hint="Official naval command directives issued to vessels will be archived here."
          />
        ) : (
          <AnimatePresence>
            {directives.map((d, i) => {
              const ship = fleet.ships.find((s) => s.shipId === d.shipId);
              const isEscalated = d.status === 'ESCALATED';
              const c = STATUS_CLASS[d.status] || STATUS_CLASS.pending;
              const iconName = DIRECTIVE_ICON_MAP[d.type] || 'radio';

              return (
                <motion.div
                  key={d.id}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className={`p-3.5 rounded-xl border border-slate-800 border-l-4 ${c.border} bg-slate-900/70 shadow-md`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-slate-950/60 border border-slate-800 text-cyan-400">
                        <AnimatedIcon name={iconName} size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold uppercase text-slate-100">
                          {d.type.replace('_', ' ')}
                        </h4>
                        <div className="text-xs font-semibold text-cyan-400 flex items-center gap-1.5 mt-0.5">
                          <AnimatedIcon name="arrow-right" size={12} />
                          <span>{ship?.name || d.shipId}</span>
                        </div>
                      </div>
                    </div>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full uppercase font-bold border ${c.text} ${c.bg}`}
                    >
                      {d.status}
                    </span>
                  </div>

                  {d.response && (
                    <div
                      className={`p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs sm:text-sm mb-2 flex items-start gap-1.5 ${
                        isEscalated
                          ? 'text-rose-300 font-semibold'
                          : 'text-slate-300'
                      }`}
                    >
                      <div className="shrink-0 mt-0.5">
                        <AnimatedIcon
                          name={isEscalated ? 'alert' : 'check'}
                          size={14}
                        />
                      </div>
                      <div>
                        <strong className={isEscalated ? 'text-rose-400' : 'text-emerald-400'}>
                          {isEscalated ? 'MAYDAY: ' : 'COMPLIANCE: '}
                        </strong>
                        {d.response}
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-slate-400 font-mono flex items-center justify-between pt-1 border-t border-slate-800/60">
                    <span>BY: {d.issuedBy}</span>
                    <span>{formatTimestamp(d.issuedAt)}</span>
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
