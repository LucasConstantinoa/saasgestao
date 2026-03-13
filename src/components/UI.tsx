import React from 'react';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export const Card = ({ children, className, onClick, hoverable = true }: CardProps) => (
  <div
    onClick={onClick}
    className={cn(
      "card",
      onClick && "cursor-pointer",
      className
    )}
  >
    {children}
  </div>
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
}

export const KPI = ({ label, value, trend, trendLabel, icon: Icon, color = "primary", loading, valueClassName }: KPIProps) => (
  <Card className="flex flex-col justify-between h-full">
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-extrabold text-primary/70 dark:text-primary/50 uppercase tracking-[0.2em]">{label}</span>
        {Icon && (
          <div className={cn("p-2.5 rounded-2xl bg-primary/5 dark:bg-primary/5 text-primary dark:text-primary/70 border border-primary/10")}>
            <Icon size={18} />
          </div>
        )}
      </div>
      
      <div className="flex items-baseline gap-2">
        <h3 className={cn("text-3xl font-black tracking-tight text-slate-800 dark:text-white drop-shadow-sm", valueClassName)}>{value}</h3>
      </div>
    </div>
    
    <div className="mt-4">
      {trend !== undefined && (
        <div className={cn(
          "flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full w-fit border",
          trend >= 0 
            ? "text-primary bg-primary/10 border-primary/20 dark:text-primary dark:bg-primary/10" 
            : "text-rose-600 bg-rose-500/10 border-rose-500/20 dark:text-rose-400 dark:bg-rose-400/10"
        )}>
          {trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          <span>{Math.abs(trend)}%</span>
        </div>
      )}
      
      {trendLabel && (
        <p className="text-[10px] text-slate-500 dark:text-primary/40 font-semibold mt-2 uppercase tracking-widest">{trendLabel}</p>
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
    primary: "bg-primary/10 text-primary border-primary/30",
    success: "bg-primary/10 text-primary border-primary/30",
    warning: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    error: "bg-rose-500/10 text-rose-400 border-rose-500/30",
    neutral: "bg-primary/5 text-primary/50 border-primary/10",
  };

  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-black border uppercase tracking-[0.15em]",
      variants[variant],
      className
    )}>
      {children}
    </span>
  );
};
