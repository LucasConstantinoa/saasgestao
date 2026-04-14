import React, { useState, useCallback, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (type: ToastType, title: string, message?: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(async (type: ToastType, title: string, message?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);
    
    // Auto-dismiss after 5s
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
    
    // Persistent notification in Supabase
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase.from('notifications').insert({
          type: type === 'error' ? 'critical' : type,
          title,
          message: message || '',
          read: false,
          user_id: session.user.id
        });
      }
    } catch (err) {
      console.error('Failed to persist notification:', err);
    }
  }, []);

  const contextValue = React.useMemo(() => ({ toasts, addToast, removeToast }), [toasts, addToast, removeToast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

export const useToasts = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToasts must be used within a ToastProvider');
  return context;
};

const toastIcons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const toastAccentColors = {
  success: 'from-emerald-500 to-emerald-400',
  error: 'from-rose-500 to-rose-400',
  warning: 'from-amber-500 to-amber-400',
  info: 'from-sky-500 to-sky-400',
};

const toastIconColors = {
  success: 'text-emerald-500 bg-emerald-500/10',
  error: 'text-rose-500 bg-rose-500/10',
  warning: 'text-amber-500 bg-amber-500/10',
  info: 'text-sky-500 bg-sky-500/10',
};

interface ToastContainerProps {
  toasts: Toast[];
  removeToast: (id: string) => void;
}

export const ToastContainer = ({ toasts, removeToast }: ToastContainerProps) => {
  return (
    <div className="fixed top-24 right-6 z-[100] flex flex-col gap-3 pointer-events-none max-h-[calc(100vh-8rem)] overflow-y-auto p-2 custom-scrollbar">
      <AnimatePresence>
        {toasts.length > 3 && (
          <motion.button
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onClick={() => toasts.forEach(t => removeToast(t.id))}
            className="pointer-events-auto self-end px-3 py-1.5 bg-surface/80 backdrop-blur-xl border border-border/50 rounded-lg text-[10px] font-bold text-rose-500 uppercase tracking-wider hover:bg-rose-500/10 transition-all mb-2 shadow-lg"
          >
            Limpar Tudo
          </motion.button>
        )}
        {toasts.map((toast) => {
          const Icon = toastIcons[toast.type];
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 60, scale: 0.85, filter: 'blur(8px)' }}
              animate={{ opacity: 1, x: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, x: 30, scale: 0.9, filter: 'blur(4px)' }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="pointer-events-auto w-80 bg-[var(--surface)]/95 backdrop-blur-3xl rounded-xl overflow-hidden shadow-[0_16px_48px_rgba(0,0,0,0.1)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.5)] border border-border/30"
            >
              {/* Top accent bar */}
              <div className={cn("h-[2px] bg-gradient-to-r", toastAccentColors[toast.type])} />
              
              <div className="p-4 flex gap-3">
                <div className={cn("p-2 rounded-lg h-fit", toastIconColors[toast.type])}>
                  <Icon size={18} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm text-foreground">{toast.title}</h4>
                  {toast.message && <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">{toast.message}</p>}
                </div>
                
                <motion.button 
                  onClick={() => removeToast(toast.id)}
                  className="text-muted-foreground hover:text-foreground transition-colors shrink-0 self-start p-0.5"
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.8 }}
                >
                  <X size={14} />
                </motion.button>
              </div>

              {/* Auto-dismiss progress bar */}
              <motion.div
                className={cn("h-[2px] bg-gradient-to-r opacity-30", toastAccentColors[toast.type])}
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 5, ease: 'linear' }}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
