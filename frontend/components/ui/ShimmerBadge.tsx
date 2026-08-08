'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface ShimmerBadgeProps {
  children: React.ReactNode;
  icon?: React.ReactNode;
  variant?: 'cyan' | 'emerald' | 'amber' | 'crimson' | 'purple' | 'slate';
  pulse?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function ShimmerBadge({
  children,
  icon,
  variant = 'cyan',
  pulse = false,
  className = '',
  size = 'md',
}: ShimmerBadgeProps) {
  const colorStyles = {
    cyan: {
      bg: 'bg-cyan-950/40 text-cyan-300 border-cyan-400/40',
      dot: 'bg-cyan-400 shadow-[0_0_8px_#00E5FF]',
      shimmer: 'from-transparent via-cyan-400/20 to-transparent',
    },
    emerald: {
      bg: 'bg-emerald-950/40 text-emerald-300 border-emerald-400/40',
      dot: 'bg-emerald-400 shadow-[0_0_8px_#10B981]',
      shimmer: 'from-transparent via-emerald-400/20 to-transparent',
    },
    amber: {
      bg: 'bg-amber-950/40 text-amber-300 border-amber-400/40',
      dot: 'bg-amber-400 shadow-[0_0_8px_#F59E0B]',
      shimmer: 'from-transparent via-amber-400/20 to-transparent',
    },
    crimson: {
      bg: 'bg-rose-950/40 text-rose-300 border-rose-400/40',
      dot: 'bg-rose-400 shadow-[0_0_8px_#FF3366]',
      shimmer: 'from-transparent via-rose-400/20 to-transparent',
    },
    purple: {
      bg: 'bg-purple-950/40 text-purple-300 border-purple-400/40',
      dot: 'bg-purple-400 shadow-[0_0_8px_#A855F7]',
      shimmer: 'from-transparent via-purple-400/20 to-transparent',
    },
    slate: {
      bg: 'bg-slate-900/60 text-slate-300 border-slate-700/60',
      dot: 'bg-slate-400 shadow-[0_0_8px_#94A3B8]',
      shimmer: 'from-transparent via-slate-400/20 to-transparent',
    },
  }[variant];

  const sizeClasses = {
    sm: 'text-xs px-2.5 py-1 gap-1.5',
    md: 'text-sm px-3.5 py-1.5 gap-2',
    lg: 'text-base px-4 py-2 gap-2.5 font-semibold',
  }[size];

  return (
    <div
      className={`relative inline-flex items-center rounded-full border backdrop-blur-md overflow-hidden font-medium ${colorStyles.bg} ${sizeClasses} ${className}`}
    >
      {/* Moving Shimmer Overlay */}
      <motion.div
        initial={{ x: '-100%' }}
        animate={{ x: '200%' }}
        transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
        className={`pointer-events-none absolute inset-0 w-1/2 bg-gradient-to-r ${colorStyles.shimmer}`}
      />

      {/* Pulse Dot */}
      {pulse ? (
        <span className="relative flex h-2 w-2">
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${colorStyles.dot}`}
          />
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${colorStyles.dot}`}
          />
        </span>
      ) : (
        <span
          className={`inline-block h-2 w-2 rounded-full ${colorStyles.dot}`}
        />
      )}

      {/* Icon */}
      {icon && <span className="flex items-center">{icon}</span>}

      {/* Label */}
      <span className="relative z-10 leading-none">{children}</span>
    </div>
  );
}
