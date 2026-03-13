import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal = ({ isOpen, onClose, title, children, footer, size = 'md' }: ModalProps) => {
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-3xl',
    xl: 'max-w-5xl',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={cn(
              "relative w-full bg-white/90 dark:bg-slate-950/40 backdrop-blur-3xl border border-gray-200 dark:border-white/5 shadow-[0_32px_64px_rgba(0,0,0,0.1)] dark:shadow-[0_32px_64px_rgba(0,0,0,0.6)] rounded-3xl overflow-hidden flex flex-col max-h-[90vh]",
              sizes[size]
            )}
          >
            <div className="px-8 py-6 border-b border-gray-200 dark:border-white/5 flex items-center justify-between">
              <h3 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white">{title}</h3>
              <button 
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-sky-500/10 text-slate-500 hover:text-primary dark:text-sky-400/40 dark:hover:text-primary transition-all"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 text-slate-800 dark:text-white">
              {children}
            </div>
            
            {footer && (
              <div className="px-8 py-6 border-t border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-slate-900/30 flex items-center justify-end gap-3">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
