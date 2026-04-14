import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sun, Moon, Sparkles, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThemeSwitcherProps {
  theme: string;
  onToggleTheme: (theme: string) => void;
}

export const ThemeSwitcher = ({ theme, onToggleTheme }: ThemeSwitcherProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const themes = [
    { id: 'light', label: 'Claro', icon: Sun, description: 'Tema claro' },
    { id: 'dark', label: 'Escuro', icon: Moon, description: 'Tema escuro' },
    { id: 'transparent-glass', label: 'Glass', icon: Sparkles, description: 'Ultra glass' },
    { id: 'light-gray', label: 'Cinza', icon: Sun, description: 'Suave' },
    { id: 'slate-theme', label: 'Slate', icon: Moon, description: 'Profissional' },
    { id: 'zinc-theme', label: 'Zinc', icon: Moon, description: 'Minimal' },
  ];

  const isDark = theme === 'dark' || theme === 'slate-theme' || theme === 'zinc-theme';
  const isGlass = theme === 'transparent-glass';

  return (
    <div className="fixed bottom-20 right-4 lg:bottom-8 lg:right-8 z-[50]">
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 lg:w-13 lg:h-13 rounded-full border border-border/50 bg-[var(--surface)]/90 backdrop-blur-xl shadow-lg flex items-center justify-center transition-all duration-300 overflow-hidden group"
        aria-label="Alternar tema"
        whileHover={{ scale: 1.1, boxShadow: '0 0 25px rgba(var(--primary-rgb), 0.2)' }}
        whileTap={{ scale: 0.9 }}
      >
        <div className="relative w-5 h-5">
          <Sun size={20} className={cn("absolute inset-0 transition-all duration-500", isDark || isGlass ? "opacity-0 rotate-90 scale-50" : "opacity-100 rotate-0 scale-100 text-foreground")} />
          <Moon size={20} className={cn("absolute inset-0 transition-all duration-500", !isDark || isGlass ? "opacity-0 -rotate-90 scale-50" : "opacity-100 rotate-0 scale-100 text-foreground")} />
          <Sparkles size={20} className={cn("absolute inset-0 transition-all duration-500", !isGlass ? "opacity-0 scale-50" : "opacity-100 scale-100 text-primary")} />
        </div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[-1]"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: -10, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="absolute bottom-full right-0 mb-4 bg-[var(--surface)]/95 backdrop-blur-3xl border border-border/50 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.2)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.6)] p-2 z-[41] flex flex-col gap-0.5 min-w-[180px] overflow-hidden"
            >
              {/* Header */}
              <div className="px-3 py-2 border-b border-border/20 mb-1">
                <div className="flex items-center gap-2">
                  <Palette size={14} className="text-primary" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Aparência</span>
                </div>
              </div>

              {themes.map((t, index) => {
                const Icon = t.icon;
                const isActive = theme === t.id;
                return (
                  <motion.button
                    key={t.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.04 }}
                    onClick={() => {
                      onToggleTheme(t.id);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all relative group",
                      isActive 
                        ? "bg-primary/10 text-primary" 
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="themeActiveIndicator"
                        className="absolute left-1 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-primary rounded-full"
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                      />
                    )}
                    <Icon size={16} className={cn(isActive && "drop-shadow-[0_0_4px_rgba(var(--primary-rgb),0.4)]")} />
                    <div className="flex flex-col items-start">
                      <span className="text-[13px]">{t.label}</span>
                    </div>
                  </motion.button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
