'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/store';
import { useShallow } from 'zustand/react/shallow';
import { useFleetWS } from '@/hooks/useFleetWS';
import type { ThemeMode, UserRole } from '@/types';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'framer-motion';
import { playSound } from '@/lib/audio';
import { AnimatedIcon } from '@/components/ui/AnimatedIcon';
import { BorderBeam } from '@/components/ui/BorderBeam';

const FleetMap = dynamic(() => import('@/components/map/FleetMap'), {
  ssr: false,
});
const WaterBg = dynamic(() => import('@/components/map/WaterBackground'), {
  ssr: false,
});

import LoginScreen from '@/components/LoginScreen';
import TopBar from '@/components/TopBar';
import OpsStatusBar from '@/components/OpsStatusBar';
import StatusTicker from '@/components/StatusTicker';
import FleetSidebar from '@/components/panels/FleetSidebar';
import ShipDetailPanel from '@/components/panels/ShipDetailPanel';
import AlertsPanel from '@/components/alerts/AlertsPanel';
import AlertToasts from '@/components/alerts/AlertToasts';
import DistressPanel from '@/components/panels/DistressPanel';
import DirectivesPanel from '@/components/panels/DirectivesPanel';
import AnalyticsPanel from '@/components/panels/AnalyticsPanel';
import PredictivePanel from '@/components/panels/PredictivePanel';
import AssistancePanel from '@/components/panels/AssistancePanel';
import AdminTestConsole from '@/components/panels/AdminTestConsole';
import AIFleetAdvisor from '@/components/AIFleetAdvisor';
import PlaybackTimeline from '@/components/panels/PlaybackTimeline';
import EventLog from '@/components/panels/EventLog';

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showBottomPanel, setShowBottomPanel] = useState(true);

  const {
    theme,
    setTheme,
    setRole,
    setOperatorName,
    connected,
    selectedShipId,
    activePanel,
    closePanel,
  } = useStore(
    useShallow((s) => ({
      theme: s.theme,
      setTheme: s.setTheme,
      setRole: s.setRole,
      setOperatorName: s.setOperatorName,
      connected: s.connected,
      selectedShipId: s.selectedShipId,
      activePanel: s.activePanel,
      closePanel: s.closePanel,
    }))
  );

  const { send: wsSend } = useFleetWS();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Apply theme via data-theme attribute
  useEffect(() => {
    if (!mounted) return;
    if (theme === 'light')
      document.documentElement.setAttribute('data-theme', 'light');
    else document.documentElement.removeAttribute('data-theme');
  }, [theme, mounted]);

  const handleLogin = (
    role: UserRole,
    shipId: string | undefined,
    operatorName: string
  ) => {
    setRole(role, shipId);
    setOperatorName(operatorName);
    setLoggedIn(true);
    setTimeout(
      () => wsSend('authenticate', { role, shipId, operatorName }),
      300
    );
  };

  if (!mounted) return null;
  if (!loggedIn) return <LoginScreen onLogin={handleLogin} />;

  return (
    <div className="flex flex-col h-screen w-screen bg-[var(--color-surface-0)] text-[var(--color-ink-1)] overflow-hidden select-none font-sans">
      <TopBar onThemeChange={(t: ThemeMode) => setTheme(t)} />
      <OpsStatusBar />
      <StatusTicker />

      <div className="flex flex-1 overflow-hidden min-h-0 relative">
        <FleetSidebar />

        <main className="flex-1 flex flex-col overflow-hidden min-w-0 relative">
          <div className="flex-1 relative overflow-hidden min-h-0">
            <WaterBg />

            <div className="absolute inset-0 z-[1]">
              <FleetMap />
            </div>

            {/* Offline / Reconnecting Overlay */}
            {!connected && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="px-10 py-8 text-center bg-slate-900/90 border border-rose-500/80 rounded-2xl max-w-md w-full relative overflow-hidden shadow-2xl shadow-rose-950/50"
                >
                  <BorderBeam
                    size={220}
                    colorFrom="#FF3366"
                    colorTo="#F59E0B"
                    duration={8}
                  />
                  <div className="p-3 bg-rose-950/50 border border-rose-500/40 rounded-full w-14 h-14 mx-auto mb-4 flex items-center justify-center text-rose-400">
                    <AnimatedIcon name="alert" size={28} isAnimated={true} />
                  </div>
                  <h3 className="text-xl text-rose-400 font-bold uppercase tracking-tight mb-2">
                    Fleet Command Link Offline
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 mb-6">
                    Attempting WebSocket handshake with operations server on port
                    4000…
                  </p>
                  <div className="flex justify-center gap-2.5 mb-5">
                    {[0, 1, 2, 3].map((i) => (
                      <motion.div
                        key={i}
                        animate={{ opacity: [1, 0.2, 1], scale: [1, 1.4, 1] }}
                        transition={{
                          repeat: Infinity,
                          duration: 1,
                          delay: i * 0.2,
                        }}
                        className="w-2.5 h-2.5 rounded-full bg-rose-400 shadow-[0_0_8px_#FF3366]"
                      />
                    ))}
                  </div>
                  <div className="text-xs text-slate-400 font-mono">
                    Ensure simulation engine is started (
                    <code className="text-cyan-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      node index.js
                    </code>
                    )
                  </div>
                </motion.div>
              </div>
            )}
          </div>

          {/* Bottom Dock: Timeline + Mission Event Log */}
          <div className="relative z-20">
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-[60]">
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  playSound('click');
                  setShowBottomPanel(!showBottomPanel);
                }}
                className="bg-slate-900/90 border border-slate-700 hover:border-cyan-400 rounded-full px-5 py-1.5 text-xs font-bold tracking-wider text-cyan-300 uppercase shadow-2xl backdrop-blur-xl cursor-pointer hover:shadow-[0_0_15px_rgba(0,229,255,0.3)] transition-all flex items-center gap-2"
              >
                <AnimatedIcon
                  name={showBottomPanel ? 'chevron-down' : 'chevron-up'}
                  size={14}
                />
                <span>
                  {showBottomPanel
                    ? 'HIDE MISSION LOGS'
                    : 'SHOW MISSION LOGS'}
                </span>
              </motion.button>
            </div>

            <AnimatePresence>
              {showBottomPanel && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
                  className="overflow-hidden flex flex-col"
                >
                  <PlaybackTimeline />
                  <EventLog />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>

        {/* Unified Right-hand Panel Drawer (Mutually Exclusive with mode="wait") */}
        <AnimatePresence mode="wait">
          {selectedShipId && !activePanel && (
            <ShipDetailPanel key={`ship-${selectedShipId}`} />
          )}
          {activePanel === 'alerts' && (
            <AlertsPanel key="alerts" onClose={closePanel} />
          )}
          {activePanel === 'distress' && (
            <DistressPanel key="distress" onClose={closePanel} />
          )}
          {activePanel === 'directives' && (
            <DirectivesPanel key="directives" onClose={closePanel} />
          )}
          {activePanel === 'predictive' && (
            <PredictivePanel key="predictive" onClose={closePanel} />
          )}
          {activePanel === 'advisor' && (
            <AIFleetAdvisor key="advisor" onClose={closePanel} />
          )}
          {activePanel === 'assistance' && (
            <AssistancePanel key="assistance" onClose={closePanel} />
          )}
          {activePanel === 'analytics' && (
            <AnalyticsPanel key="analytics" onClose={closePanel} />
          )}
          {activePanel === 'admin' && (
            <AdminTestConsole key="admin" onClose={closePanel} />
          )}
        </AnimatePresence>
      </div>

      <AlertToasts />
    </div>
  );
}
