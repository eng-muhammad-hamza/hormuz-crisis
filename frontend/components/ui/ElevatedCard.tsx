'use client';

import React, { useRef, useState, MouseEvent } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

interface ElevatedCardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  enableSpotlight?: boolean;
  enableTilt?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'elevated' | 'glass' | 'alert' | 'highlight';
}

export function ElevatedCard({
  children,
  className = '',
  glowColor = 'rgba(0, 229, 255, 0.12)',
  enableSpotlight = true,
  enableTilt = false,
  padding = 'md',
  variant = 'default',
  ...props
}: ElevatedCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 });

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });

    if (enableTilt) {
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -5;
      const rotateY = ((x - centerX) / centerX) * 5;
      setTilt({ rotateX, rotateY });
    }
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (enableTilt) {
      setTilt({ rotateX: 0, rotateY: 0 });
    }
  };

  const paddingClasses = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-4 sm:p-5',
    lg: 'p-5 sm:p-6',
    xl: 'p-6 sm:p-8',
  }[padding];

  const variantClasses = {
    default:
      'bg-slate-900/80 dark:bg-slate-950/80 border border-slate-700/60 dark:border-cyan-500/20 shadow-lg shadow-black/40',
    elevated:
      'bg-slate-800/90 dark:bg-slate-900/90 border border-slate-600/60 dark:border-cyan-500/30 shadow-xl shadow-black/50',
    glass:
      'bg-slate-950/60 backdrop-blur-xl border border-white/10 dark:border-cyan-400/20 shadow-2xl',
    alert:
      'bg-rose-950/30 border border-rose-500/40 shadow-lg shadow-rose-950/40',
    highlight:
      'bg-cyan-950/20 border border-cyan-400/40 shadow-lg shadow-cyan-950/30',
  }[variant];

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      animate={
        enableTilt
          ? {
              rotateX: tilt.rotateX,
              rotateY: tilt.rotateY,
              transformPerspective: 1000,
            }
          : undefined
      }
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`relative overflow-hidden rounded-xl transition-shadow duration-300 ${variantClasses} ${paddingClasses} ${className}`}
      {...props}
    >
      {/* Aceternity Spotlight Hover Layer */}
      {enableSpotlight && (
        <div
          className="pointer-events-none absolute -inset-px rounded-xl opacity-0 transition-opacity duration-300"
          style={{
            opacity: isHovered ? 1 : 0,
            background: `radial-gradient(400px circle at ${mousePos.x}px ${mousePos.y}px, ${glowColor}, transparent 80%)`,
          }}
        />
      )}

      {/* Card Content with relative positioning above spotlight */}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}
