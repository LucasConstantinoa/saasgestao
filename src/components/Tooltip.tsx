import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const Tooltip = ({ content, children, className, position = 'top' }: TooltipProps) => {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: position === 'top' ? 5 : position === 'bottom' ? -5 : 0, x: position === 'left' ? 5 : position === 'right' ? -5 : 0 }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: position === 'top' ? 5 : position === 'bottom' ? -5 : 0, x: position === 'left' ? 5 : position === 'right' ? -5 : 0 }}
            className={cn(
              "absolute z-[9999] px-3 py-2 text-xs font-medium text-white bg-slate-900 dark:bg-slate-800 rounded-lg shadow-xl border border-slate-700 dark:border-slate-600 whitespace-nowrap pointer-events-none min-w-[150px]",
              positionClasses[position],
              className
            )}
          >
            {content}
            <div className={cn(
              "absolute w-2 h-2 bg-slate-900 dark:bg-slate-800 border-slate-700 dark:border-slate-600 border-b border-r transform rotate-45",
              position === 'top' && "bottom-[-5px] left-1/2 -translate-x-1/2 border-t-0 border-l-0",
              position === 'bottom' && "top-[-5px] left-1/2 -translate-x-1/2 border-b-0 border-r-0 border-t border-l",
              position === 'left' && "right-[-5px] top-1/2 -translate-y-1/2 border-t border-l-0 border-b-0 border-r",
              position === 'right' && "left-[-5px] top-1/2 -translate-y-1/2 border-t-0 border-l border-b border-r-0"
            )} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
