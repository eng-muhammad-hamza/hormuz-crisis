'use client';

import React from 'react';
import { AnimatedIcon, type IconName } from './AnimatedIcon';

interface CargoBadgeProps {
  cargo: string;
  className?: string;
  iconOnly?: boolean;
  size?: number;
}

const CARGO_MAP: Record<string, { iconName: IconName; color: string; label: string }> = {
  Crude: { iconName: 'fuel', color: 'text-amber-400', label: 'Crude Oil' },
  'Crude Oil': { iconName: 'fuel', color: 'text-amber-400', label: 'Crude Oil' },
  Containers: { iconName: 'layers', color: 'text-cyan-400', label: 'Container Cargo' },
  LNG: { iconName: 'zap', color: 'text-emerald-400', label: 'LNG Tanker' },
  'LNG Gas': { iconName: 'zap', color: 'text-emerald-400', label: 'LNG Tanker' },
  Grain: { iconName: 'lifebuoy', color: 'text-amber-300', label: 'Bulk Grain' },
  Automobiles: { iconName: 'activity', color: 'text-purple-400', label: 'Vehicles / RoRo' },
  'Heavy Cargo': { iconName: 'anchor', color: 'text-blue-400', label: 'Heavy Machinery' },
};

export function CargoBadge({
  cargo,
  className = '',
  iconOnly = false,
  size = 18,
}: CargoBadgeProps) {
  const item = CARGO_MAP[cargo] || {
    iconName: 'navigation' as IconName,
    color: 'text-slate-300',
    label: cargo || 'General Cargo',
  };

  if (iconOnly) {
    return (
      <div className={`shrink-0 inline-flex items-center justify-center ${item.color} ${className}`}>
        <AnimatedIcon name={item.iconName} size={size} />
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-700/80 text-xs font-semibold ${item.color} ${className}`}
    >
      <AnimatedIcon name={item.iconName} size={size} />
      <span>{item.label}</span>
    </div>
  );
}
