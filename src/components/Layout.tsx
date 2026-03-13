import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Building2, 
  Eye, 
  Calendar, 
  History, 
  Download, 
  Upload, 
  Bell, 
  Settings, 
  Plus, 
  LogOut,
  User,
  Moon,
  Sun,
  Search,
  ChevronRight,
  Menu,
  X,
  Lightbulb
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  onClick: () => void;
  badge?: number;
}

const NavItem = ({ icon: Icon, label, active, onClick, badge }: NavItemProps) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-300 group relative whitespace-nowrap text-sm font-bold uppercase tracking-widest",
      active 
        ? "bg-sky-500/20 text-sky-400 border border-sky-500/30 shadow-[0_0_15px_rgba(0,212,255,0.15)]" 
        : "text-slate-500 hover:bg-sky-500/10 hover:text-sky-400 hover:border-sky-500/20 border border-transparent dark:text-sky-400/40 dark:hover:text-sky-400"
    )}
  >
    <Icon size={16} className={cn("transition-transform duration-300", active ? "scale-110 drop-shadow-[0_0_8px_rgba(0,212,255,0.5)]" : "group-hover:-translate-y-0.5")} />
    <span className="text-[10px]">{label}</span>
    {badge !== undefined && badge > 0 && (
      <span className="ml-1 bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-[0_0_10px_rgba(244,63,94,0.3)]">
        {badge}
      </span>
    )}
  </button>
);

interface LayoutProps {
  children: React.ReactNode;
  currentView: string;
  setView: (view: string) => void;
  title: string;
  breadcrumb?: { label: string; onClick?: () => void }[];
  onAction?: () => void;
  actionLabel?: string;
  notificationsCount?: number;
  onNotificationsClick: () => void;
  onSettingsClick: () => void;
  userName: string;
  userAvatar: string;
  onProfileClick: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const Layout = ({ 
  children, 
  currentView, 
  setView, 
  title, 
  breadcrumb, 
  onAction, 
  actionLabel,
  notificationsCount = 0,
  onNotificationsClick,
  onSettingsClick,
  userName,
  userAvatar,
  onProfileClick,
  theme,
  onToggleTheme
}: LayoutProps) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (scrollContainerRef.current) {
        setIsScrolled(scrollContainerRef.current.scrollTop > 20);
      }
    };
    
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
    }
    
    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  // Close mobile menu when view changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [currentView]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-slate-800 dark:text-foreground transition-colors duration-400">
      
      {/* Top Navigation Bar */}
      <nav className={cn(
        "w-full px-4 md:px-8 py-3 flex items-center justify-between z-50 sticky top-0 transition-all duration-300",
        isScrolled 
          ? "bg-white/95 dark:bg-black/80 backdrop-blur-xl border-b border-gray-200 dark:border-sky-500/20 shadow-lg dark:shadow-sky-500/5" 
          : "bg-white dark:bg-black border-b border-gray-200 dark:border-sky-500/10"
      )}>
        
        {/* Left: Logo & Profile */}
        <div className="flex items-center gap-6">
          <div 
            onClick={onProfileClick}
            className="flex items-center gap-3 px-3 py-2 rounded-xl bg-sky-500/5 border border-sky-500/10 hover:bg-sky-500/10 hover:border-sky-500/30 transition-all cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-sky-500 to-sky-400 flex items-center justify-center font-black text-sky-950 shadow-[0_0_12px_rgba(0,212,255,0.3)] group-hover:shadow-[0_0_20px_rgba(0,212,255,0.5)] group-hover:scale-105 transition-all overflow-hidden border-2 border-sky-500/40">
              {userAvatar ? <img src={userAvatar} alt={userName} className="w-full h-full object-cover" /> : <span>TF</span>}
            </div>
            <div className="flex flex-col hidden sm:flex">
              <span className="text-[11px] font-black text-sky-500 uppercase tracking-widest whitespace-nowrap">{userName}</span>
              <span className="text-[9px] text-slate-500 dark:text-sky-400/40 font-bold uppercase tracking-tighter whitespace-nowrap">Gestor de Tráfego</span>
            </div>
          </div>

          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Center: Desktop Nav Menu */}
        <div className="hidden lg:flex items-center gap-2 overflow-x-auto no-scrollbar">
          <NavItem 
            icon={Building2} 
            label="Empresas" 
            active={currentView === 'companies' || currentView === 'company' || currentView === 'branch'} 
            onClick={() => setView('companies')} 
          />
          <NavItem 
            icon={Eye} 
            label="Visão de Águia" 
            active={currentView === 'eagle'} 
            onClick={() => setView('eagle')} 
          />
          <NavItem 
            icon={Calendar} 
            label="Relatórios" 
            active={currentView === 'reports'} 
            onClick={() => setView('reports')} 
          />
          <NavItem 
            icon={History} 
            label="Histórico" 
            active={currentView === 'history'} 
            onClick={() => setView('history')} 
          />
          <NavItem 
            icon={Download} 
            label="Backup" 
            onClick={() => {}} 
          />
          <NavItem 
            icon={Upload} 
            label="Restaurar" 
            onClick={() => {}} 
          />
        </div>

        {/* Right: Empty space to balance flex-between, or could put search here */}
        <div className="hidden lg:block w-[200px]"></div>
      </nav>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-white dark:bg-[#141829] border-b border-gray-200 dark:border-white/10 overflow-hidden flex flex-col px-4 py-2 gap-2 shadow-xl z-40 sticky top-[73px]"
          >
            <NavItem icon={Building2} label="Empresas" active={currentView === 'companies' || currentView === 'company' || currentView === 'branch'} onClick={() => setView('companies')} />
            <NavItem icon={Eye} label="Visão de Águia" active={currentView === 'eagle'} onClick={() => setView('eagle')} />
            <NavItem icon={Calendar} label="Relatórios" active={currentView === 'reports'} onClick={() => setView('reports')} />
            <NavItem icon={History} label="Histórico" active={currentView === 'history'} onClick={() => setView('history')} />
            <NavItem icon={Settings} label="Configurações" active={currentView === 'settings'} onClick={() => setView('settings')} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Page Header */}
        <header className="px-4 md:px-8 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-transparent">
          <div className="flex flex-col">
            {breadcrumb && (
              <nav className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 mb-2">
                {breadcrumb.map((item, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <span className="text-slate-400 dark:text-slate-600">/</span>}
                    <button 
                      onClick={item.onClick}
                      className={cn("hover:text-primary hover:bg-primary/10 px-1.5 py-0.5 rounded transition-all", !item.onClick && "cursor-default text-slate-400 dark:text-slate-500")}
                    >
                      {item.label}
                    </button>
                  </React.Fragment>
                ))}
              </nav>
            )}
            <h1 className="text-2xl md:text-[28px] font-extrabold tracking-tight bg-gradient-to-br from-primary to-secondary bg-clip-text text-transparent">
              {title}
            </h1>
          </div>

          <div className="flex items-center gap-2 md:gap-3 flex-wrap">
            <button 
              className="btn-secondary p-2.5 rounded-xl"
              title="Insights IA"
            >
              <Lightbulb size={18} />
            </button>
            
            <button 
              onClick={onNotificationsClick}
              className="btn-secondary p-2.5 rounded-xl relative"
              title="Notificações"
            >
              <Bell size={18} />
              {notificationsCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-destructive rounded-full border-2 border-background" />
              )}
            </button>

            <button 
              onClick={onSettingsClick}
              className="btn-secondary p-2.5 rounded-xl"
              title="Configurações"
            >
              <Settings size={18} />
            </button>

            {onAction && actionLabel && (
              <button 
                onClick={onAction}
                className="btn-primary flex items-center gap-2 ml-2"
              >
                <Plus size={16} />
                <span>{actionLabel}</span>
              </button>
            )}
          </div>
        </header>

        {/* Page Content */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-4 md:p-8 w-full max-w-[1600px] mx-auto"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 20, filter: 'blur(12px)', scale: 0.98 }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)', scale: 1 }}
              exit={{ opacity: 0, y: -20, filter: 'blur(12px)', scale: 0.98 }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Floating Theme Button */}
      <button 
        onClick={onToggleTheme}
        className="fixed bottom-8 right-8 w-14 h-14 rounded-full border border-gray-200 dark:border-white/10 bg-white dark:bg-surface backdrop-blur-md shadow-lg flex items-center justify-center z-[9999] hover:-translate-y-1 hover:scale-105 hover:shadow-[0_0_20px_rgba(0,212,255,0.2)] active:translate-y-0 active:scale-95 transition-all duration-300 overflow-hidden group"
        aria-label="Alternar tema"
      >
        <div className="relative w-6 h-6">
          <Sun size={24} className={cn("absolute inset-0 transition-all duration-500", theme === 'dark' ? "opacity-0 rotate-90 scale-50" : "opacity-100 rotate-0 scale-100 text-slate-800")} />
          <Moon size={24} className={cn("absolute inset-0 transition-all duration-500", theme === 'light' ? "opacity-0 -rotate-90 scale-50" : "opacity-100 rotate-0 scale-100 text-slate-50")} />
        </div>
        <div className="absolute inset-[-2px] rounded-full border-2 border-primary opacity-0 group-hover:animate-[btnPulse_2s_ease-in-out_infinite]" />
      </button>

    </div>
  );
};
