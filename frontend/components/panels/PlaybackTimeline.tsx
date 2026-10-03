'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/store';
import { useShallow } from 'zustand/react/shallow';
import { formatTimestamp } from '@/lib/utils';
import { playSound } from '@/lib/audio';
import { AnimatedIcon } from '@/components/ui/AnimatedIcon';

export default function PlaybackTimeline() {
  const { history, playbackIndex, setPlaybackIndex } = useStore(
    useShallow((s) => ({
      history: s.history,
      playbackIndex: s.playbackIndex,
      setPlaybackIndex: s.setPlaybackIndex,
    }))
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const isLive = playbackIndex === null;
  const total = history.length;

  useEffect(() => {
    if (isPlaying && !isLive) {
      playIntervalRef.current = setInterval(() => {
        setPlaybackIndex((prev: number | null) => {
          if (prev === null) return null;
          const next = prev + 1;
          if (next >= total) {
            setIsPlaying(false);
            return null;
          }
          return next;
        });
      }, 500);
    } else if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
    }
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [isPlaying, isLive, total, setPlaybackIndex]);

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackRef.current || total === 0) return;
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.max(
      0,
      Math.min(1, (e.clientX - rect.left) / rect.width)
    );
    setPlaybackIndex(Math.floor(ratio * (total - 1)));
    setIsPlaying(false);
  };

  const currentSnap = playbackIndex !== null ? history[playbackIndex] : null;
  const progress =
    playbackIndex !== null ? playbackIndex / Math.max(1, total - 1) : 1;

  if (total < 2) return null;

  return (
    <div className="shrink-0 flex items-center justify-between border-t border-slate-800 bg-slate-950/90 backdrop-blur-md px-4 sm:px-6 py-2.5 gap-4 text-xs font-sans">
      {/* ── Playback Controls ── */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          onClick={() => {
            playSound('click');
            if (isLive) {
              setPlaybackIndex(0);
              setIsPlaying(true);
            } else {
              setIsPlaying((p) => !p);
            }
          }}
          title={
            isLive
              ? 'Play history'
              : isPlaying
              ? 'Pause replay'
              : 'Play replay'
          }
          className="w-9 h-9 rounded-xl border border-slate-700 bg-slate-900 flex items-center justify-center text-cyan-400 hover:border-cyan-400 hover:bg-slate-800 cursor-pointer transition-all"
        >
          <AnimatedIcon name={isPlaying ? 'pause' : 'play'} size={18} />
        </button>

        <button
          onClick={() => {
            playSound('click');
            setPlaybackIndex(null);
            setIsPlaying(false);
          }}
          title="Return to real-time live feed"
          className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer uppercase tracking-wider transition-all
            ${
              isLive
                ? 'bg-emerald-950/50 text-emerald-300 border-emerald-500/60 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
            }`}
        >
          {isLive ? (
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
              LIVE TELEMETRY
            </span>
          ) : (
            'RESUME LIVE'
          )}
        </button>
      </div>

      {/* ── Timeline Track & Keyframe Indicators ── */}
      <div className="flex-1 relative flex flex-col justify-center">
        <div
          ref={trackRef}
          onClick={handleTrackClick}
          className="cursor-pointer relative overflow-hidden bg-slate-800 border border-slate-700 rounded-full h-3 shadow-inner"
        >
          {/* Progress fill */}
          <motion.div
            className="absolute left-0 top-0 h-full rounded-full"
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.1 }}
            style={{
              background: isLive
                ? 'linear-gradient(to right, #00E5FF, #10B981)'
                : '#00E5FF',
            }}
          />

          {/* Alert keyframe ticks */}
          {history.map((snap, i) =>
            snap.alertCount === 0 ? null : (
              <div
                key={i}
                className="absolute top-0 h-full w-1 bg-rose-500 z-10 rounded-full"
                style={{ left: `${(i / Math.max(1, total - 1)) * 100}%` }}
                title={`${snap.alertCount} alerts at ${formatTimestamp(
                  snap.timestamp
                )}`}
              />
            )
          )}
        </div>

        {/* Timestamps */}
        <div className="flex justify-between items-center text-xs text-slate-400 font-mono mt-1.5">
          <span>
            {history[0] ? formatTimestamp(history[0].timestamp) : '—'}
          </span>
          {currentSnap && !isLive && (
            <span className="text-amber-400 font-bold uppercase tracking-wider">
              REPLAY: {formatTimestamp(currentSnap.timestamp)}
            </span>
          )}
          <span>
            {history[total - 1]
              ? formatTimestamp(history[total - 1].timestamp)
              : '—'}
          </span>
        </div>
      </div>

      {/* ── Snapshot Metadata ── */}
      <div className="shrink-0 text-right min-w-[100px]">
        {currentSnap && !isLive ? (
          <div>
            <div className="text-xs font-bold text-amber-400 uppercase">
              REPLAYING
            </div>
            <div className="text-xs text-slate-400 font-mono">
              {playbackIndex! + 1}/{total} · {currentSnap.alertCount} alerts
            </div>
          </div>
        ) : (
          <div>
            <div className="text-xs font-bold text-emerald-400 uppercase flex items-center justify-end gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>REAL-TIME</span>
            </div>
            <div className="text-xs text-slate-400 font-mono">
              {total} snapshots
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
