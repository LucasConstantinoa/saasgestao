import React, { useEffect, useRef, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface GlowCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: 'blue' | 'purple' | 'green' | 'red' | 'orange';
  size?: 'sm' | 'md' | 'lg';
  width?: string | number;
  height?: string | number;
  borderRadius?: number;
  customSize?: boolean;
  onClick?: () => void;
  animateBorder?: boolean;
  glass?: boolean;
}

const glowColorMap = {
  blue: { base: 220, spread: 200 },
  purple: { base: 280, spread: 300 },
  green: { base: 120, spread: 200 },
  red: { base: 0, spread: 200 },
  orange: { base: 30, spread: 200 }
};

const sizeMap = {
  sm: 'w-48 h-64',
  md: 'w-64 h-80',
  lg: 'w-80 h-96'
};

export const GlowCard: React.FC<GlowCardProps> = ({ 
  children, 
  className = '', 
  glowColor = 'blue',
  size = 'md',
  width,
  height,
  borderRadius = 24,
  customSize = false,
  animateBorder = true,
  glass = true,
  onClick
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const syncPointer = (e: PointerEvent) => {
      if (!cardRef.current) return;
      
      const rect = cardRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      cardRef.current.style.setProperty('--x', x.toFixed(2));
      cardRef.current.style.setProperty('--xp', (x / rect.width).toFixed(2));
      cardRef.current.style.setProperty('--y', y.toFixed(2));
      cardRef.current.style.setProperty('--yp', (y / rect.height).toFixed(2));
    };

    window.addEventListener('pointermove', syncPointer);
    return () => window.removeEventListener('pointermove', syncPointer);
  }, []);

  const { base, spread } = glowColorMap[glowColor];

  const getSizeClasses = () => {
    if (customSize) return '';
    return sizeMap[size];
  };

  const hueValue = `calc(var(--base) + (var(--xp, 0) * var(--spread, 0)))`;

  const getInlineStyles = () => {
    const baseStyles: any = {
      '--base': base,
      '--spread': spread,
      '--radius': borderRadius.toString(),
      '--hue': hueValue,
      '--backdrop': glass ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.03)',
    };

    if (width !== undefined) {
      baseStyles.width = typeof width === 'number' ? `${width}px` : width;
    }
    if (height !== undefined) {
      baseStyles.height = typeof height === 'number' ? `${height}px` : height;
    }

    return baseStyles;
  };

  return (
    <div
      ref={cardRef}
      data-glow
      onClick={onClick}
      style={getInlineStyles()}
      className={cn(
        getSizeClasses(),
        !customSize && 'aspect-[3/4]',
        "relative flex flex-col",
        glass && "bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)]",
        className
      )}
    >
      {animateBorder && (
        <div className="border-beam" />
      )}
      <div className="relative z-10 flex flex-col gap-4 h-full w-full">
        {children}
      </div>
    </div>
  );
};
