'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  forwardRef,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  type InputHTMLAttributes,
  type CSSProperties,
} from 'react';
import { AnimatedIcon, type IconName } from './AnimatedIcon';

/* ════════════════════════════════════════════════════════
   PANEL — Ergonomic, Glassmorphic Card Container
   ════════════════════════════════════════════════════════ */

export function Panel({
  children,
  className = '',
  glow = false,
  style,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  glow?: boolean;
  style?: CSSProperties;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={style}
      className={`glass-panel rounded-xl overflow-hidden relative shadow-xl shrink-0 border border-slate-700/60 dark:border-cyan-500/20 transition-all duration-300
        ${
          glow
            ? 'shadow-[0_0_30px_rgba(0,229,255,0.2)] border-cyan-400/50'
            : 'shadow-[0_8px_24px_rgba(0,0,0,0.4)]'
        }
        ${className}`}
    >
      {children}
    </div>
  );
}

const badgeTones = {
  accent: 'text-cyan-400 bg-cyan-950/50 border-cyan-400/40 shadow-[0_0_12px_rgba(0,229,255,0.25)]',
  danger: 'text-rose-400 bg-rose-950/50 border-rose-500/40 shadow-[0_0_12px_rgba(255,51,102,0.25)]',
  warning: 'text-amber-400 bg-amber-950/50 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.25)]',
  success: 'text-emerald-400 bg-emerald-950/50 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.25)]',
  muted: 'text-slate-400 bg-slate-800/60 border-slate-700',
} as const;

export function PanelHeader({
  icon,
  iconName,
  title,
  subtitle,
  badge,
  badgeTone = 'accent',
  onClose,
  accentClass,
}: {
  icon?: ReactNode;
  iconName?: IconName;
  title: string;
  subtitle?: string;
  badge?: string | number;
  badgeTone?: keyof typeof badgeTones;
  onClose?: () => void;
  accentClass?: string;
}) {
  return (
    <div
      className={`flex items-center justify-between px-5 py-3.5 min-h-[54px] bg-slate-900/80 backdrop-blur-md border-b border-slate-700/60 gap-4 shrink-0 ${accentClass || ''}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {iconName ? (
          <div className="text-cyan-400 p-1.5 rounded-lg bg-cyan-950/40 border border-cyan-500/20 shrink-0">
            <AnimatedIcon name={iconName} size={20} />
          </div>
        ) : icon ? (
          <span className="text-lg leading-none shrink-0 drop-shadow-sm text-cyan-400">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <h3 className="text-sm sm:text-base font-bold tracking-wide text-slate-100 truncate">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs font-medium text-slate-400 truncate leading-tight mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2.5 shrink-0">
        {badge !== undefined && (
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-md border ${badgeTones[badgeTone]}`}
          >
            {badge}
          </span>
        )}
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close panel"
            className="w-8 h-8 flex items-center justify-center bg-slate-800/70 border border-slate-700 rounded-lg
              text-slate-400 cursor-pointer text-sm shrink-0 transition-all duration-200
              hover:text-rose-400 hover:border-rose-500/60 hover:bg-rose-950/40 hover:shadow-[0_0_12px_rgba(255,51,102,0.3)]"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

export function PanelBody({
  children,
  className = '',
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div style={style} className={`p-4 sm:p-5 ${className}`}>
      {children}
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   SIDE DRAWER — Smooth Slide-Out Console Drawer
   ════════════════════════════════════════════════════════ */

export function SideDrawer({
  children,
  width = 420,
  accentClass,
}: {
  children: ReactNode;
  width?: number;
  accentClass?: string;
}) {
  return (
    <motion.div
      initial={{ x: width, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: width, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      style={{ width: `min(${width}px, 100vw)` }}
      className={`shrink-0 h-full glass-panel-elevated border-l border-slate-700/80 flex flex-col overflow-hidden shadow-[-12px_0_40px_rgba(0,0,0,0.7)] relative z-20 ${accentClass || ''}`}
    >
      {children}
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════
   BUTTONS — Elevated Tactile Micro-Interactions
   ════════════════════════════════════════════════════════ */

type ButtonTone = 'primary' | 'danger' | 'ghost' | 'success' | 'warning';

const buttonTones: Record<ButtonTone, string> = {
  primary:
    'bg-cyan-500/20 text-cyan-300 border-cyan-400/60 hover:bg-cyan-500/30 hover:border-cyan-300 hover:shadow-[0_0_20px_rgba(0,229,255,0.4)]',
  danger:
    'bg-rose-500/20 text-rose-300 border-rose-500/60 hover:bg-rose-500/30 hover:border-rose-400 hover:shadow-[0_0_20px_rgba(255,51,102,0.4)]',
  success:
    'bg-emerald-500/20 text-emerald-300 border-emerald-500/60 hover:bg-emerald-500/30 hover:border-emerald-400 hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]',
  warning:
    'bg-amber-500/20 text-amber-300 border-amber-500/60 hover:bg-amber-500/30 hover:border-amber-400 hover:shadow-[0_0_20px_rgba(245,158,11,0.4)]',
  ghost:
    'bg-slate-800/70 text-slate-200 border-slate-700/80 hover:bg-slate-700/80 hover:text-white hover:border-slate-600 hover:shadow-[0_4px_16px_rgba(0,0,0,0.3)]',
};

export function Button({
  children,
  tone = 'ghost',
  size = 'md',
  full = false,
  disabled = false,
  icon,
  iconName,
  onClick,
  className = '',
  type = 'button',
}: {
  children: ReactNode;
  tone?: ButtonTone;
  size?: 'sm' | 'md' | 'lg';
  full?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  iconName?: IconName;
  onClick?: () => void;
  className?: string;
  type?: 'button' | 'submit';
}) {
  const sizeClasses = {
    sm: 'px-2.5 py-1 text-xs font-medium gap-1.5 rounded-md h-7.5',
    md: 'px-3.5 py-1.5 text-xs font-semibold gap-2 rounded-lg h-9',
    lg: 'px-5 py-2.5 text-sm font-bold gap-2.5 rounded-xl h-11',
  }[size];

  return (
    <motion.button
      type={type}
      whileHover={disabled ? {} : { scale: 1.02, y: -1 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center border font-sans tracking-wide transition-all select-none
        ${full ? 'w-full' : ''}
        ${sizeClasses}
        ${disabled ? 'opacity-40 cursor-not-allowed grayscale' : 'cursor-pointer'}
        ${buttonTones[tone]} ${className}`}
    >
      {iconName && <AnimatedIcon name={iconName} size={size === 'sm' ? 13 : size === 'lg' ? 18 : 15} />}
      {icon && !iconName && <span>{icon}</span>}
      <span>{children}</span>
    </motion.button>
  );
}

/* ════════════════════════════════════════════════════════
   FORM FIELDS — Spacious, Ergonomic & Legible
   ════════════════════════════════════════════════════════ */

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 mb-2">
      <label className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase flex items-center justify-between">
        <span>{label}</span>
      </label>
      {children}
      {hint && (
        <span className="text-[11px] font-normal text-slate-400 mt-0.5 leading-relaxed">
          {hint}
        </span>
      )}
    </div>
  );
}

const fieldClass =
  'w-full bg-slate-900/95 text-slate-100 border border-slate-700/80 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium outline-none transition-all duration-200 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500/30 hover:border-slate-500 placeholder:text-slate-500 shadow-sm';

export const TextInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function TextInput(props, ref) {
  return (
    <input
      ref={ref}
      {...props}
      className={`${fieldClass} ${props.className || ''}`}
      style={props.style}
    />
  );
});

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`${fieldClass} h-9 cursor-pointer pr-8 appearance-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] ${props.className || ''}`}
      style={props.style}
    />
  );
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`${fieldClass} resize-none leading-relaxed min-h-[75px] p-2.5 ${props.className || ''}`}
      style={props.style}
    />
  );
}

/* ════════════════════════════════════════════════════════
   STAT CARD — Glowing Elevated Metric Tile
   ════════════════════════════════════════════════════════ */

export function StatCard({
  label,
  value,
  colorClass = 'text-slate-100',
  icon,
  iconName,
}: {
  label: string;
  value: ReactNode;
  colorClass?: string;
  icon?: string;
  iconName?: IconName;
}) {
  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.02 }}
      className="p-4 sm:p-5 bg-slate-900/70 backdrop-blur-md border border-slate-700/60 rounded-xl hover:border-cyan-400/60 transition-all relative overflow-hidden group shadow-lg"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className="text-xs sm:text-sm font-semibold text-slate-400 uppercase tracking-wider truncate">
          {label}
        </span>
        {iconName ? (
          <div className="text-cyan-400 opacity-80 group-hover:opacity-100 transition-opacity">
            <AnimatedIcon name={iconName} size={20} />
          </div>
        ) : icon ? (
          <span className="text-lg opacity-80">{icon}</span>
        ) : null}
      </div>
      <div
        className={`text-2xl sm:text-3xl font-bold tracking-tight leading-none tabular relative z-10 ${colorClass}`}
      >
        {value}
      </div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════
   STATUS PILL — High Visibility Tag
   ════════════════════════════════════════════════════════ */

export function StatusPill({
  color,
  children,
  pulse = false,
}: {
  color: string;
  children: ReactNode;
  pulse?: boolean;
}) {
  return (
    <span
      className="inline-flex items-center rounded-full text-xs font-semibold tracking-wide whitespace-nowrap border shadow-sm px-3 py-1 gap-2"
      style={{
        background: `${color}20`,
        color,
        borderColor: `${color}60`,
      }}
    >
      {pulse && (
        <motion.span
          animate={{ opacity: [1, 0.3, 1], scale: [1, 1.3, 1] }}
          transition={{ repeat: Infinity, duration: 1.2 }}
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: color, boxShadow: `0 0 8px ${color}` }}
        />
      )}
      {children}
    </span>
  );
}

/* ════════════════════════════════════════════════════════
   EMPTY STATE — Spacious & Friendly
   ════════════════════════════════════════════════════════ */

export function EmptyState({
  icon,
  iconName,
  title,
  hint,
}: {
  icon?: string;
  iconName?: IconName;
  title: string;
  hint?: string;
}) {
  return (
    <div className="text-center bg-slate-900/40 backdrop-blur-sm rounded-xl border border-slate-700/50 border-dashed p-8 m-4 relative overflow-hidden flex flex-col items-center justify-center">
      {iconName ? (
        <div className="p-3 bg-slate-800/60 rounded-full border border-slate-700 text-cyan-400 mb-3">
          <AnimatedIcon name={iconName} size={32} />
        </div>
      ) : icon ? (
        <div className="text-4xl mb-3 opacity-60 drop-shadow-md">{icon}</div>
      ) : null}
      <h4 className="text-sm sm:text-base font-bold text-slate-200">
        {title}
      </h4>
      {hint && (
        <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-sm">
          {hint}
        </p>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   TOGGLE SWITCH
   ════════════════════════════════════════════════════════ */

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex items-center h-6 w-11 rounded-full transition-all shrink-0 cursor-pointer border border-slate-700
        ${
          checked
            ? 'bg-cyan-500/40 border-cyan-400 shadow-[0_0_12px_rgba(0,229,255,0.4)]'
            : 'bg-slate-800'
        }`}
      aria-pressed={checked}
      aria-label={label}
    >
      <motion.span
        className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full shadow-md ${
          checked ? 'bg-cyan-400 shadow-[0_0_10px_#00E5FF]' : 'bg-slate-400'
        }`}
        animate={{ x: checked ? 20 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </button>
  );
}

export { AnimatePresence, motion };
