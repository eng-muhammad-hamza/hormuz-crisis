'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, TextInput, Field } from '@/components/ui/primitives';
import { unlockAudio, playSound } from '@/lib/audio';
import { AnimatedIcon, type IconName } from '@/components/ui/AnimatedIcon';
import { BorderBeam } from '@/components/ui/BorderBeam';

const SHIPS = [
  { id: 'MV-1', name: 'Aurora', cargo: 'Crude Oil', type: 'Crude' },
  { id: 'MV-2', name: 'Borealis', cargo: 'Containers', type: 'Containers' },
  { id: 'MV-3', name: 'Cygnus', cargo: 'LNG Gas', type: 'LNG' },
  { id: 'MV-4', name: 'Dragon', cargo: 'Grain', type: 'Grain' },
  { id: 'MV-5', name: 'Emerald', cargo: 'Crude Oil', type: 'Crude' },
  { id: 'MV-6', name: 'Falcon', cargo: 'Containers', type: 'Containers' },
  { id: 'MV-7', name: 'Gharial', cargo: 'Crude Oil', type: 'Crude' },
  { id: 'MV-8', name: 'Halcyon', cargo: 'Automobiles', type: 'Automobiles' },
  { id: 'MV-9', name: 'Iris', cargo: 'Crude Oil', type: 'Crude' },
  { id: 'MV-10', name: 'Jade', cargo: 'Containers', type: 'Containers' },
  { id: 'MV-11', name: 'Kite', cargo: 'LNG Gas', type: 'LNG' },
  { id: 'MV-12', name: 'Lotus', cargo: 'Crude Oil', type: 'Crude' },
  { id: 'MV-13', name: 'Mirage', cargo: 'Containers', type: 'Containers' },
  { id: 'MV-14', name: 'Nova', cargo: 'Heavy Cargo', type: 'Heavy Cargo' },
  { id: 'MV-15', name: 'Orca', cargo: 'Crude Oil', type: 'Crude' },
];

type Role = 'command' | 'captain' | 'observer' | 'admin';

interface LoginScreenProps {
  onLogin: (
    role: Role,
    shipId: string | undefined,
    operatorName: string
  ) => void;
}

const ROLES: {
  key: Role;
  iconName: IconName;
  badge: string;
  label: string;
  desc: string;
  ring: string;
  bg: string;
  text: string;
}[] = [
  {
    key: 'command',
    iconName: 'shield',
    badge: 'C2 OVERSIGHT',
    label: 'Fleet Commander',
    desc: 'Full fleet visibility, route directives, restricted zone enforcement, mutual aid & AI advisor',
    ring: 'border-amber-500/70',
    bg: 'bg-amber-950/20',
    text: 'text-amber-300',
  },
  {
    key: 'captain',
    iconName: 'navigation',
    badge: 'BRIDGE COMMAND',
    label: 'Vessel Captain',
    desc: 'Command an individual merchant vessel, execute waypoints, respond to directives & broadcast Mayday',
    ring: 'border-cyan-400/70',
    bg: 'bg-cyan-950/20',
    text: 'text-cyan-300',
  },
  {
    key: 'observer',
    iconName: 'eye',
    badge: 'INTEL SITREP',
    label: 'Maritime Observer',
    desc: 'Real-time telemetry, spatial traffic monitoring & crisis situational awareness (read-only)',
    ring: 'border-slate-500/70',
    bg: 'bg-slate-900/40',
    text: 'text-slate-300',
  },
  {
    key: 'admin',
    iconName: 'sliders',
    badge: 'SYSTEM OVERRIDE',
    label: 'Test Ops Admin',
    desc: 'Direct simulation engine overrides, synthetic threat injection, sim acceleration & debug table',
    ring: 'border-purple-500/70',
    bg: 'bg-purple-950/20',
    text: 'text-purple-300',
  },
];

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [step, setStep] = useState<'role' | 'identity'>('role');
  const [selected, setSelected] = useState<Role | null>('command');
  const [shipId, setShipId] = useState('MV-1');
  const [name, setName] = useState('');
  const [entering, setEntering] = useState(false);

  const selectedRole = ROLES.find((r) => r.key === selected);

  const namePlaceholder =
    selected === 'command'
      ? 'e.g. Admiral T. Vance'
      : selected === 'captain'
      ? 'e.g. Capt. Sarah Jenkins'
      : selected === 'admin'
      ? 'e.g. Systems Engineer Ortiz'
      : 'e.g. Maritime Analyst J. Ortiz';

  const handleContinue = () => {
    if (selected) {
      playSound('click');
      setStep('identity');
    }
  };

  const handleEnter = () => {
    if (!selected || entering) return;
    setEntering(true);
    playSound('command');
    const fallback =
      selected === 'command'
        ? 'Fleet Commander'
        : selected === 'captain'
        ? 'Bridge Captain'
        : selected === 'admin'
        ? 'Ops Administrator'
        : 'Watch Officer';
    const finalName = name.trim() || fallback;
    setTimeout(() => {
      onLogin(selected, selected === 'captain' ? shipId : undefined, finalName);
    }, 700);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
      transition={{ duration: 0.6 }}
      className="fixed inset-0 z-[1000] bg-slate-950/95 flex items-center justify-center overflow-y-auto p-4 sm:p-6"
    >
      {/* ── Background Tactical Radar Reticle & Glows ── */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden opacity-25">
        {[500, 750, 1000, 1300].map((size, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full border border-cyan-500/20"
            style={{ width: size, height: size }}
            animate={{ scale: [1, 1.02, 1], opacity: [0.15, 0.3, 0.15] }}
            transition={{
              duration: 6 + i * 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ))}

        <div className="absolute w-full h-px bg-cyan-500/20" />
        <div className="absolute h-full w-px bg-cyan-500/20" />

        {/* Rotating radar sweep */}
        <motion.div
          className="absolute rounded-full overflow-hidden"
          style={{ width: 1200, height: 1200 }}
          animate={{ rotate: 360 }}
          transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
        >
          <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent_75%,rgba(0,229,255,0.2)_100%)]" />
        </motion.div>
      </div>

      {/* ── Central Authentication Modal ── */}
      <div className="relative z-10 w-full max-w-[620px] my-auto">
        <div className="bg-slate-900/95 backdrop-blur-2xl rounded-2xl border border-slate-700/80 p-6 sm:p-8 relative overflow-hidden shadow-2xl shadow-black/80">
          <BorderBeam size={260} duration={14} colorFrom="#00E5FF" colorTo="#A855F7" />

          {/* Secure status indicator */}
          <div className="absolute top-4 right-5 text-[11px] text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#10B981] animate-pulse" />
            <span>SECURE C2 LINK</span>
          </div>

          {/* Header */}
          <div className="text-center mb-6 pt-1">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 220, damping: 20 }}
              className="inline-flex items-center justify-center w-13 h-13 rounded-xl bg-cyan-950/60 border border-cyan-400/40 mb-3 text-cyan-300 shadow-[0_0_20px_rgba(0,229,255,0.25)]"
            >
              <AnimatedIcon name="anchor" size={26} isAnimated={true} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white uppercase">
                HORMUZ <span className="text-cyan-400">CRISIS</span>
              </h1>
              <p className="text-xs font-medium text-slate-400 mt-1 max-w-sm mx-auto">
                Naval Command &amp; Control Situational Awareness Center
              </p>
            </motion.div>

            <div className="flex items-center justify-center gap-3 mt-3 text-[11px] font-semibold text-slate-400 tracking-wide uppercase">
              <span>STRAIT OF HORMUZ</span>
              <span>·</span>
              <span>15 COMMERCIAL VESSELS</span>
              <span>·</span>
              <span className="text-emerald-400 font-bold">THEATER ACTIVE</span>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {step === 'role' ? (
              <motion.div
                key="role-step"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                <div className="text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-2.5 flex items-center gap-2.5">
                  <span>SELECT OPERATIONAL CLEARANCE</span>
                  <div className="h-px bg-slate-800 flex-1" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-5">
                  {ROLES.map((role) => {
                    const isSelected = selected === role.key;
                    return (
                      <motion.button
                        key={role.key}
                        whileHover={{ scale: 1.015, y: -1 }}
                        whileTap={{ scale: 0.985 }}
                        onClick={() => {
                          unlockAudio();
                          playSound('click');
                          setSelected(role.key);
                        }}
                        className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between min-h-[110px]
                          ${
                            isSelected
                              ? `${role.ring} ${role.bg} shadow-md shadow-cyan-950/20`
                              : 'border-slate-700/70 bg-slate-900/60 hover:bg-slate-800/80 hover:border-slate-600'
                          }`}
                      >
                        <div className="flex items-start justify-between gap-2.5 mb-1.5">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`p-1.5 rounded-lg border ${
                                isSelected
                                  ? `${role.ring} ${role.text} bg-slate-950/40`
                                  : 'border-slate-700 text-slate-400 bg-slate-800/50'
                              }`}
                            >
                              <AnimatedIcon
                                name={role.iconName}
                                size={18}
                                isAnimated={isSelected}
                              />
                            </div>
                            <div>
                              <h3
                                className={`text-sm font-bold tracking-tight ${
                                  isSelected ? role.text : 'text-slate-100'
                                }`}
                              >
                                {role.label}
                              </h3>
                              <p className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase mt-0.5">
                                {role.badge}
                              </p>
                            </div>
                          </div>
                          <div
                            className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs shrink-0 ${
                              isSelected
                                ? `${role.text} border-current bg-current/20 font-bold`
                                : 'border-slate-700 text-transparent'
                            }`}
                          >
                            {isSelected && <AnimatedIcon name="check" size={12} />}
                          </div>
                        </div>
                        <p className="text-[11px] font-normal text-slate-300 leading-snug">
                          {role.desc}
                        </p>
                      </motion.button>
                    );
                  })}
                </div>

                {/* Captain Ship Selector */}
                <AnimatePresence>
                  {selected === 'captain' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden mb-6 p-4 rounded-xl bg-slate-950/70 border border-slate-700"
                    >
                      <div className="text-xs font-bold tracking-wider text-cyan-400 uppercase mb-3 flex items-center justify-between">
                        <span>SELECT ASSIGNED VESSEL ({SHIPS.length})</span>
                        <span className="text-slate-400 font-mono">
                          ACTIVE: {shipId}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 max-h-48 overflow-y-auto pr-1">
                        {SHIPS.map((ship) => (
                          <button
                            key={ship.id}
                            onClick={() => {
                              playSound('click');
                              setShipId(ship.id);
                            }}
                            className={`p-2.5 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center
                              ${
                                shipId === ship.id
                                  ? 'border-cyan-400 bg-cyan-950/60 text-cyan-300 shadow-[0_0_12px_rgba(0,229,255,0.3)]'
                                  : 'border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-300'
                              }`}
                          >
                            <span className="text-xs font-bold truncate w-full text-slate-100">
                              {ship.name}
                            </span>
                            <span className="text-[10px] text-slate-400 mt-0.5">
                              {ship.id}
                            </span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <Button
                  tone="primary"
                  full
                  size="md"
                  onClick={handleContinue}
                  iconName="arrow-right"
                  className="h-10 shadow-[0_0_16px_rgba(0,229,255,0.3)]"
                >
                  INITIALIZE IDENTITY STEP
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="identity-step"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.25 }}
              >
                <div className="p-4 sm:p-5 rounded-xl bg-slate-950/70 border border-slate-700/80 mb-5">
                  <div className="flex items-center gap-3 pb-3 border-b border-slate-800 mb-3.5">
                    <div className="p-2 rounded-lg bg-cyan-950/60 border border-cyan-400/40 text-cyan-300">
                      <AnimatedIcon
                        name={selectedRole?.iconName || 'shield'}
                        size={20}
                      />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-cyan-300">
                        {selectedRole?.label}{' '}
                        {selected === 'captain' ? `· [${shipId}]` : ''}
                      </h3>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                        SECURITY CLEARANCE: VERIFIED
                      </p>
                    </div>
                  </div>

                  <Field
                    label="OPERATOR CALLSIGN / RANK & NAME"
                    hint="Will be authenticated on all naval directives, broadcast transcripts, and logs."
                  >
                    <TextInput
                      autoFocus
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={namePlaceholder}
                      maxLength={48}
                      className="text-xs sm:text-sm py-2.5 px-3 mt-1"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleEnter();
                      }}
                    />
                  </Field>

                  {/* Rank Presets */}
                  <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase mr-1">
                      QUICK TITLE:
                    </span>
                    {['Admiral', 'Captain', 'Commander', 'Officer'].map(
                      (prefix) => (
                        <button
                          key={prefix}
                          type="button"
                          onClick={() =>
                            setName((prev) =>
                              prev
                                ? `${prefix} ${prev.replace(
                                    /^(Admiral|Captain|Commander|Officer)\s*/i,
                                    ''
                                  )}`
                                : `${prefix} `
                            )
                          }
                          className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-cyan-300 border border-slate-700 cursor-pointer transition-colors"
                        >
                          +{prefix}
                        </button>
                      )
                    )}
                  </div>
                </div>

                <div className="flex gap-2.5">
                  <Button
                    tone="ghost"
                    size="md"
                    iconName="arrow-left"
                    onClick={() => setStep('role')}
                    className="h-10"
                  >
                    BACK
                  </Button>
                  <Button
                    tone={entering ? 'success' : 'primary'}
                    full
                    size="md"
                    disabled={entering}
                    onClick={handleEnter}
                    iconName={entering ? 'refresh' : 'check'}
                    className="h-10 shadow-[0_0_16px_rgba(0,229,255,0.3)]"
                  >
                    {entering
                      ? 'CONNECTING TO FLEET NETWORK…'
                      : 'AUTHORIZE & ENTER COMMAND DECK'}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="text-center mt-5">
          <p className="text-xs text-slate-400 font-semibold tracking-wider uppercase">
            RESTRICTED ACCESS · FLEET DEFENSE PROTOCOL ACTIVE · STRAIT OF HORMUZ
          </p>
        </div>
      </div>
    </motion.div>
  );
}
