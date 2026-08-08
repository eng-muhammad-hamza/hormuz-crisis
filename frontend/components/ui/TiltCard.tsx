'use client';

import React, { useRef, useState, MouseEvent } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  onClick?: () => void;
  isSelected?: boolean;
  isCritical?: boolean;
}

export function TiltCard({
  children,
  className = '',
  glowColor = 'rgba(0, 229, 255, 0.22)',
  onClick,
  isSelected = false,
  isCritical = false,
}: TiltCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  // Motion values for smooth 3D tilt
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 260, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 260, damping: 20 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ['9deg', '-9deg']);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ['-9deg', '9deg']);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setMousePos({ x: mouseX, y: mouseY });

    const xPct = mouseX / rect.width - 0.5;
    const yPct = mouseY / rect.height - 0.5;

    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    x.set(0);
    y.set(0);
  };

  return (
    <div
      style={{ perspective: 1000 }}
      className="w-full shrink-0"
    >
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={onClick}
        style={{
          rotateX,
          rotateY,
          transformStyle: 'flat',
        }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 350, damping: 22 }}
        className={`relative w-full rounded-2xl cursor-pointer select-none transition-shadow duration-300 ${
          isSelected
            ? 'shadow-[0_12px_36px_rgba(0,229,255,0.3)]'
            : isCritical
            ? 'shadow-[0_12px_36px_rgba(255,51,102,0.3)]'
            : 'shadow-[0_6px_20px_rgba(0,0,0,0.5)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.7)]'
        } ${className}`}
      >
        {/* Spotlight Hover Glow Layer */}
        <div
          className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-300 z-10"
          style={{
            opacity: isHovered ? 1 : 0,
            background: `radial-gradient(350px circle at ${mousePos.x}px ${mousePos.y}px, ${
              isCritical ? 'rgba(255, 51, 102, 0.22)' : glowColor
            }, transparent 75%)`,
          }}
        />

        {/* Card Content Layer */}
        <div className="relative z-20 h-full w-full">
          {children}
        </div>
      </motion.div>
    </div>
  );
}
