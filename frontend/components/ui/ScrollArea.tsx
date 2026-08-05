'use client';

import React from 'react';

interface ScrollAreaProps {
  children: React.ReactNode;
  className?: string;
  maxHeight?: string | number;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function ScrollArea({
  children,
  className = '',
  maxHeight,
  padding = 'md',
}: ScrollAreaProps) {
  const paddingClass = {
    none: 'p-0',
    sm: 'p-2 sm:p-3',
    md: 'p-3 sm:p-4',
    lg: 'p-4 sm:p-6',
  }[padding];

  return (
    <div
      style={maxHeight ? { maxHeight } : undefined}
      className={`relative w-full overflow-y-auto overflow-x-hidden transition-all duration-200 
      scrollbar-thin scrollbar-thumb-cyan-500/30 scrollbar-track-transparent hover:scrollbar-thumb-cyan-500/60
      ${paddingClass} ${className}`}
    >
      {children}
    </div>
  );
}
