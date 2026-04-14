import React from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { GlowCard } from './GlowCard';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
  glowColor?: 'blue' | 'purple' | 'green' | 'red' | 'orange';
  borderRadius?: number;
  customSize?: boolean;
  animateBorder?: boolean;
  glass?: boolean;
  isExpanded?: boolean;
  layout?: 'grid' | 'expand';
}

export const Card = ({ 
  children, 
  className, 
  onClick, 
  hoverable = true, 
  glowColor = 'blue', 
  borderRadius = 24,
  customSize = true,
  animateBorder = true,
  glass = true,
  isExpanded = true,
  layout = 'grid'
}: CardProps) => (
  <GlowCard
    onClick={onClick}
    customSize={customSize}
    glowColor={glowColor}
    borderRadius={borderRadius}
    animateBorder={animateBorder}
    glass={glass}
    className={cn(
      "card",
      onClick && "cursor-pointer",
      layout === 'expand' ? "w-full h-full border-none shadow-none bg-transparent" : "",
      className
    )}
  >
    {children}
  </GlowCard>
);

interface KPIProps {
  label: string;
  value: string | number;
  trend?: number;
  trendLabel?: string;
  icon?: React.ElementType;
  color?: string;
  loading?: boolean;
  valueClassName?: string;
  badge?: string;
  badgeColor?: 'red' | 'green' | 'yellow' | 'blue';
  action?: React.ReactNode;
  glass?: boolean;
  animateBorder?: boolean;
}

export const KPI = ({ label, value, trend, trendLabel, icon: Icon, color = "primary", loading, valueClassName, badge, badgeColor = 'blue', action, glass = true, animateBorder = true }: KPIProps) => (
  <Card glass={glass} animateBorder={animateBorder} className="flex flex-col justify-between h-full relative overflow-hidden group">
    {/* Hover inner glow */}
    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
    
    {badge && (
      <div className={cn(
        "absolute top-0 right-0 px-3 py-1 text-[9px] font-bold uppercase tracking-widest",
        "rounded-bl-xl",
        badgeColor === 'red' && "bg-destructive text-destructive-foreground",
        badgeColor === 'green' && "bg-emerald-500 text-white",
        badgeColor === 'yellow' && "bg-amber-500 text-white",
        badgeColor === 'blue' && "bg-primary text-primary-foreground"
      )}>
        {badge}
      </div>
    )}
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-primary/60 uppercase tracking-[0.15em]">{label}</span>
          {action}
        </div>
        {Icon && !badge && (
          <div className={cn("p-2.5 rounded-xl bg-primary/5 text-primary border border-primary/8 group-hover:bg-primary/10 group-hover:border-primary/20 transition-all")}>
            <Icon size={18} />
          </div>
        )}
      </div>
      
      <div className="flex items-baseline gap-2">
        <h3 className={cn("text-3xl font-black tracking-tight text-foreground", valueClassName)}>{value}</h3>
      </div>
    </div>
    
    <div className="mt-4">
      {trend !== undefined && (
        <div className={cn(
          "flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full w-fit border",
          trend >= 0 
            ? "text-emerald-500 bg-emerald-500/8 border-emerald-500/15" 
            : "text-rose-500 bg-rose-500/8 border-rose-500/15"
        )}>
          {trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          <span>{Math.abs(trend)}%</span>
        </div>
      )}
      
      {trendLabel && (
        <p className="text-[10px] text-muted-foreground font-medium mt-2 tracking-wide">{trendLabel}</p>
      )}
    </div>
  </Card>
);

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'neutral';
  className?: string;
}

export const Badge = ({ children, variant = 'neutral', className }: BadgeProps) => {
  const variants = {
    primary: "bg-primary/8 text-primary border-primary/20",
    success: "bg-emerald-500/8 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    warning: "bg-amber-500/8 text-amber-600 dark:text-amber-400 border-amber-500/20",
    error: "bg-rose-500/8 text-rose-500 border-rose-500/20",
    neutral: "bg-muted text-muted-foreground border-border/50",
  };

  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-bold border uppercase tracking-[0.1em]",
      variants[variant],
      className
    )}>
      {children}
    </span>
  );
};
