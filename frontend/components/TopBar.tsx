'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/store';
import { useShallow } from 'zustand/react/shallow';
import { formatTime } from '@/lib/utils';
import { playSound } from '@/lib/audio';
import type { ThemeMode } from '@/types';
import { AnimatedIcon, type IconName } from '@/components/ui/AnimatedIcon';

interface TopBarProps {
  onThemeChange: (t: ThemeMode) => void;
}

export default function TopBar({ onThemeChange }: TopBarProps) {
  const {
    role,
    captainShipId,
    operatorName,
    connected,
    clientCount,
    theme,
    soundEnabled,
    setSoundEnabled,
    togglePanel,
    activePanel,
    criticalAlerts,
    distressCount,
    pendingForMe,
    pendingAssistanceCount,
    activeShip,
  } = useStore(
    useShallow((s) => {
      const fleet = s.fleet;
      const criticalAlerts =
        fleet?.alerts.filter(
          (a) => a.severity === 'critical' && !a.acknowledged
        ).length || 0;
      const distressCount =
        fleet?.distressMessages.filter((d) => d.status === 'processing')
          .length || 0;
      const pendingForMe =
        s.role === 'captain'
          ? (fleet?.directives.filter(
              (d) => d.shipId === s.captainShipId && d.status === 'pending'
            ).length || 0) +
            (fleet?.assistanceRequests?.filter(
              (r) => r.toShipId === s.captainShipId && r.status === 'pending'
            ).length || 0)
          : 0;
      const activeShip = s.captainShipId
        ? fleet?.ships.find((ship) => ship.shipId === s.captainShipId)
        : null;
      const pendingAssistanceCount =
        fleet?.assistanceRequests?.filter((r) => r.status === 'pending')
          .length || 0;

      return {
        role: s.role,
        captainShipId: s.captainShipId,
        operatorName: s.operatorName,
        connected: s.connected,
        clientCount: s.clientCount,
        theme: s.theme,
        soundEnabled: s.soundEnabled,
        setSoundEnabled: s.setSoundEnabled,
        togglePanel: s.togglePanel,
        activePanel: s.activePanel,
        criticalAlerts,
        distressCount,
        pendingForMe,
        pendingAssistanceCount,
        activeShip,
      };
    })
  );
  const [time, setTime] = useState('');

  useEffect(() => {
    setTime(formatTime(new Date().toISOString()));
    const t = setInterval(
      () => setTime(formatTime(new Date().toISOString())),
      1000
    );
    return () => clearInterval(t);
  }, []);

  const panelBtns: {
    key: NonNullable<ReturnType<typeof useStore.getState>['activePanel']>;
    iconName: IconName;
    label: string;
    badge: number;
    danger: boolean;
    warning?: boolean;
  }[] = [
    {
      key: 'alerts',
      iconName: 'bell',
      label: 'Alerts',
      badge: criticalAlerts,
      danger: criticalAlerts > 0,
    },
    {
      key: 'distress',
      iconName: 'alert',
      label: 'SOS',
      badge: distressCount,
      danger: distressCount > 0,
    },
    {
      key: 'directives',
      iconName: 'radio',
      label: 'Directives',
      badge: pendingForMe,
      danger: false,
      warning: pendingForMe > 0,
    },
    {
      key: 'predictive',
      iconName: 'target',
      label: 'Forecast',
      badge: 0,
      danger: false,
    },
    {
      key: 'advisor',
      iconName: 'cpu',
      label: 'AI Advisor',
      badge: 0,
      danger: false,
    },
    {
      key: 'assistance',
      iconName: 'lifebuoy',
      label: 'Mutual Aid',
      badge: pendingAssistanceCount,
      danger: false,
    },
    {
      key: 'analytics',
      iconName: 'activity',
      label: 'Analytics',
      badge: 0,
      danger: false,
    },
    ...(role === 'admin'
      ? [
          {
            key: 'admin' as const,
            iconName: 'sliders' as IconName,
            label: 'Admin',
            badge: 0,
            danger: false,
          },
        ]
      : []),
  ];

  return (
    <header className="h-14 shrink-0 bg-slate-950/85 backdrop-blur-xl border-b border-slate-700/60 z-30 relative flex items-center justify-between px-3 sm:px-5 gap-2 sm:gap-4 shadow-xl">
      {/* ── Left: Brand, Emblem & Clock ── */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <motion.div
            whileHover={{ scale: 1.08, rotate: 6 }}
            className="w-8 h-8 rounded-lg bg-cyan-950/60 border border-cyan-400/40 flex items-center justify-center text-cyan-400 shadow-[0_0_12px_rgba(0,229,255,0.25)] shrink-0"
          >
            <AnimatedIcon name="anchor" size={18} isAnimated={true} />
          </motion.div>
          <div>
            <div className="text-sm sm:text-base font-bold tracking-tight text-white leading-tight flex items-center gap-1.5">
              <span>HORMUZ</span>
              <span className="text-cyan-400 font-extrabold">CRISIS</span>
              <span className="hidden lg:inline-flex items-center text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-bold tracking-wide uppercase">
                C2 OPS
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-medium tracking-wide hidden sm:block">
              Strait of Hormuz Command
            </div>
          </div>
        </div>

        <div className="h-5 w-px bg-slate-700/70 mx-1 hidden md:block" />

        {/* Zulu Time */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-700/70 text-xs">
          <span className="text-slate-400 font-semibold">ZULU:</span>
          <span className="font-bold text-cyan-400 tabular-nums tracking-wider">
            {time || '00:00:00'}
          </span>
        </div>

        {/* Connection Status */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-700/70 text-xs">
          <motion.div
            animate={{ opacity: connected ? [1, 0.3, 1] : [1, 0, 1] }}
            transition={{ repeat: Infinity, duration: connected ? 2 : 0.6 }}
            className={`w-2 h-2 rounded-full ${
              connected
                ? 'bg-emerald-400 shadow-[0_0_8px_#10B981]'
                : 'bg-rose-500 shadow-[0_0_8px_#FF3366]'
            }`}
          />
          <span
            className={`font-semibold hidden md:inline text-xs ${
              connected ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {connected ? 'LINKED' : 'OFFLINE'}
          </span>
          {connected && (
            <span className="text-slate-400 text-[11px] font-normal">
              ({clientCount})
            </span>
          )}
        </div>
      </div>

      {/* ── Center: Tactical Systems Navigation Pills ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar py-1 min-w-0">
        {panelBtns.map((btn) => {
          const isActive = activePanel === btn.key;
          return (
            <motion.button
              key={btn.key}
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                playSound('click');
                togglePanel(btn.key);
              }}
              className={`relative flex items-center gap-1.5 h-8 px-2.5 sm:px-3 rounded-lg border text-xs font-semibold tracking-wide transition-all cursor-pointer shrink-0 whitespace-nowrap shadow-sm
                ${
                  btn.danger
                    ? 'border-rose-500/80 bg-rose-950/40 text-rose-300 shadow-[0_0_12px_rgba(255,51,102,0.35)] animate-pulse'
                    : btn.warning
                    ? 'border-amber-500/80 bg-amber-950/40 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                    : isActive
                    ? 'border-cyan-400 bg-cyan-950/50 text-cyan-300 shadow-[0_0_12px_rgba(0,229,255,0.3)]'
                    : 'border-slate-700/80 bg-slate-900/60 text-slate-300 hover:bg-slate-800 hover:text-white hover:border-slate-600'
                }`}
            >
              <AnimatedIcon
                name={btn.iconName}
                size={14}
                isAnimated={btn.danger || isActive}
              />
              <span className="whitespace-nowrap">{btn.label}</span>
              {btn.badge > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none ${
                    btn.danger
                      ? 'bg-rose-500 text-white shadow-[0_0_8px_#FF3366]'
                      : 'bg-cyan-400 text-slate-950 shadow-[0_0_8px_#00E5FF]'
                  }`}
                >
                  {btn.badge}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* ── Right: Captain Telemetry, Role Identity, Theme & Audio ── */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Active ship quick telemetry (for Captain role) */}
        {activeShip && (
          <div className="hidden xl:flex items-center gap-2 h-8 px-2.5 rounded-lg bg-slate-900/90 border border-slate-700/80 text-xs shrink-0">
            <span className="text-slate-400 font-medium">VESSEL:</span>
            <span className="text-cyan-400 font-bold">{activeShip.name}</span>
            <span className="text-slate-600">·</span>
            <span
              className={
                activeShip.fuel < 1000
                  ? 'text-rose-400 font-bold'
                  : 'text-emerald-400 font-semibold'
              }
            >
              {Math.round(activeShip.fuel)}t Fuel
            </span>
            <span className="text-slate-600">·</span>
            <span className="font-semibold text-slate-200">
              {activeShip.speed} kn
            </span>
          </div>
        )}

        {/* User Identity Chip */}
        <div
          className={`flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-xs font-semibold tracking-wide shrink-0
          ${
            role === 'command'
              ? 'bg-amber-950/40 border-amber-500/50 text-amber-300'
              : role === 'captain'
              ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-300'
              : role === 'admin'
              ? 'bg-purple-950/40 border-purple-500/50 text-purple-300'
              : 'bg-slate-900 border-slate-700 text-slate-300'
          }`}
        >
          <AnimatedIcon
            name={
              role === 'command'
                ? 'shield'
                : role === 'captain'
                ? 'navigation'
                : role === 'admin'
                ? 'sliders'
                : 'eye'
            }
            size={14}
          />
          <span className="truncate max-w-[100px] sm:max-w-[130px]">
            {operatorName || role}
          </span>
        </div>

        {/* Audio Toggle */}
        <button
          onClick={() => {
            playSound('click');
            setSoundEnabled(!soundEnabled);
          }}
          title={soundEnabled ? 'Mute sound effects' : 'Enable audio feedback'}
          className={`w-8 h-8 rounded-lg border flex items-center justify-center cursor-pointer transition-all duration-200 shrink-0
            ${
              soundEnabled
                ? 'bg-cyan-950/40 border-cyan-400/50 text-cyan-300 hover:bg-cyan-950/60 shadow-[0_0_8px_rgba(0,229,255,0.2)]'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
            }`}
        >
          <AnimatedIcon
            name={soundEnabled ? 'volume' : 'mute'}
            size={16}
            isAnimated={soundEnabled}
          />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={() => {
            playSound('click');
            onThemeChange(theme === 'dark' ? 'light' : 'dark');
          }}
          title={`Switch to ${theme === 'dark' ? 'Daylight Console' : 'Dark Ops Console'}`}
          className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-slate-700 bg-slate-900 hover:border-cyan-400 text-slate-300 hover:text-cyan-300 text-xs font-semibold cursor-pointer transition-all duration-200 shrink-0"
        >
          <AnimatedIcon
            name={theme === 'dark' ? 'sun' : 'moon'}
            size={15}
          />
          <span className="hidden sm:inline">
            {theme === 'dark' ? 'Daylight' : 'Dark Ops'}
          </span>
        </button>
      </div>
    </header>
  );
}
