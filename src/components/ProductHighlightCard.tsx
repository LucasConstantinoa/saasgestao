"use client";

import * as React from "react";
import { motion, HTMLMotionProps } from "motion/react";
import { cn } from "@/lib/utils";
import { GlowCard } from "./GlowCard";

interface HighlightCardProps extends Omit<HTMLMotionProps<"div">, 'title'> {
  categoryIcon?: React.ReactNode;
  category?: string;
  title?: string | React.ReactNode;
  description?: string | React.ReactNode;
  branchName: string;
  children?: React.ReactNode;
  isPaused?: boolean;
  isAlert?: boolean;
  animateBorder?: boolean;
}

export const HighlightCard = React.forwardRef<HTMLDivElement, HighlightCardProps>(
  ({ className, categoryIcon, category, title, description, branchName, children, isPaused, isAlert, animateBorder, ...props }, ref) => {
    
    return (
      <GlowCard
        glowColor={isAlert ? "red" : isPaused ? "orange" : "blue"}
        customSize
        animateBorder={animateBorder}
        className={cn(
          "relative h-[350px] w-full rounded-2xl bg-card shadow-lg transition-shadow duration-300 hover:shadow-2xl cursor-pointer group",
          isAlert ? "border-2 border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.2)]" : "",
          isPaused ? "bg-muted/40 border-amber-500/20 grayscale-[0.5]" : "bg-surface border border-border hover:border-primary/50",
          className
        )}
        onClick={props.onClick as any}
      >
        <div className="absolute inset-4 rounded-xl bg-card-foreground/5 shadow-inner overflow-hidden">
          
          {/* Diagonal line texture */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none"></div>

          <div className="relative z-10 flex h-full flex-col justify-between p-6 pr-20">
            {children ? children : (
              <>
                <div className="flex items-center space-x-2 text-card-foreground">
                  {categoryIcon}
                  <span className="text-sm font-medium">{category}</span>
                </div>
                
                <div className="text-card-foreground">
                  <h2 className={cn("text-4xl font-bold tracking-tight", isPaused ? "text-muted-foreground" : "text-primary")}>{title}</h2>
                  <div className="mt-2 max-w-[70%] text-xs text-muted-foreground">
                    {description}
                  </div>
                </div>
              </>
            )}
          </div>
          
          {/* Stylized Branch Name instead of Image */}
          <motion.div
            whileHover={{ scale: 1.05, y: -10, x: 5 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="absolute right-0 top-0 bottom-0 w-20 flex items-center justify-center pointer-events-none"
          >
            <span 
              className={cn(
                "text-5xl font-black tracking-tighter uppercase transition-colors duration-300",
                "text-foreground/30 dark:text-foreground/30", // Base visibility
                "group-hover:text-foreground/50 dark:group-hover:text-foreground/50", // Enhanced on hover
                branchName.length > 12 ? "text-3xl" : branchName.length > 8 ? "text-4xl" : "text-5xl"
              )} 
              style={{ 
                writingMode: 'vertical-rl', 
                textOrientation: 'mixed', 
                transform: 'rotate(180deg)',
                maxHeight: '100%',
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 1,
                WebkitBoxOrient: 'vertical'
              }}
            >
              {branchName}
            </span>
          </motion.div>
        </div>
      </GlowCard>
    );
  }
);

HighlightCard.displayName = "HighlightCard";
