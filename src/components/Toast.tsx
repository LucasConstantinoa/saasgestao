import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContainerProps {
  toasts: Toast[];
  removeToast: (id: string) => void;
}

export const ToastContainer = ({ toasts, removeToast }: ToastContainerProps) => {
  return (
    <div className="fixed top-6 right-6 z-[200] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            className={cn(
              "pointer-events-auto w-80 bg-white/90 dark:bg-slate-950/60 backdrop-blur-2xl rounded-2xl p-4 flex gap-3 shadow-[0_16px_48px_rgba(0,0,0,0.1)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.6)] border border-gray-200 dark:border-white/5 border-l-4",
              toast.type === 'success' && "border-l-sky-500 shadow-sky-500/5",
              toast.type === 'error' && "border-l-rose-500 shadow-rose-500/5",
              toast.type === 'warning' && "border-l-amber-500 shadow-amber-500/5",
              toast.type === 'info' && "border-l-primary shadow-primary/5"
            )}
          >
            <div className={cn(
              "p-2 rounded-xl h-fit",
              toast.type === 'success' && "bg-sky-500/10 text-sky-500 dark:text-sky-400",
              toast.type === 'error' && "bg-rose-500/10 text-rose-500 dark:text-rose-400",
              toast.type === 'warning' && "bg-amber-500/10 text-amber-500 dark:text-amber-400",
              toast.type === 'info' && "bg-primary/10 text-primary"
            )}>
              {toast.type === 'success' && <CheckCircle size={20} />}
              {toast.type === 'error' && <AlertCircle size={20} />}
              {toast.type === 'warning' && <AlertCircle size={20} />}
              {toast.type === 'info' && <Info size={20} />}
            </div>
            
            <div className="flex-1">
              <h4 className="font-bold text-sm text-slate-800 dark:text-white">{toast.title}</h4>
              {toast.message && <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">{toast.message}</p>}
            </div>
            
            <button 
              onClick={() => removeToast(toast.id)}
              className="text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export const useToasts = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = React.useCallback((type: ToastType, title: string, message?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => removeToast(id), 3000);
  }, [removeToast]);

  return { toasts, addToast, removeToast };
};
