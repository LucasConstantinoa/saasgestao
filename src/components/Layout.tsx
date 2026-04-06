import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Building2, 
  Eye, 
  Calendar, 
  History, 
  Bell, 
  Settings, 
  Plus, 
  LogOut,
  User,
  X,
  Lightbulb,
  Sparkles,
  Facebook,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { NotificationsView } from '@/components/NotificationsView';
import { SettingsView } from '@/components/SettingsView';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { ParticleField } from '@/components/ParticleField';

const SWIPE_THRESHOLD = 100;
const SWIPE_RATIO = 1.5;

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  to: string;
  badge?: number;
  requiredAdmin?: boolean;
  isAdmin: boolean;
}

const Sidebar = ({ isAdmin, location }: { isAdmin: boolean, location: any }) => {
  const navItems = [
    { icon: Building2, label: 'Empresas', to: '/companies' },
    { icon: Calendar, label: 'Relatórios', to: '/reports' },
    { icon: Settings, label: 'Configurações', to: '/settings' },
    { icon: Sparkles, label: 'Assistente', to: '/assistant' },
    { icon: Eye, label: 'Visão de Águia', to: '/eagle' },
    { icon: History, label: 'Histórico', to: '/history' },
    { icon: User, label: 'Usuários', to: '/users', requiredAdmin: true },
    { icon: Facebook, label: 'Meta', to: '/facebook', requiredAdmin: true },
    { icon: LayoutDashboard, label: 'Sistema', to: '/configuration', requiredAdmin: true },
  ];

  return (
    <div className="hidden lg:flex flex-col w-[260px] bg-[var(--surface)]/80 backdrop-blur-xl border-r border-border/50 h-screen sticky top-0 p-5 relative overflow-hidden">
      {/* Sidebar ambient glow */}
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-primary/3 to-transparent pointer-events-none" />
      
      {/* Logo */}
      <div className="flex items-center gap-3 mb-8 px-2 relative z-10">
        <motion.div 
          className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center shadow-[0_4px_15px_rgba(var(--primary-rgb),0.3)]"
          whileHover={{ scale: 1.05, rotate: 5 }}
          transition={{ type: "spring", stiffness: 400 }}
        >
          <Zap size={20} className="text-white" />
        </motion.div>
        <div className="flex flex-col">
          <span className="font-bold text-[15px] tracking-tight">TrafficFlow</span>
          <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-[0.15em]">Ultimate</span>
        </div>
      </div>

      {/* Nav Items */}
      <div className="flex flex-col gap-1 relative z-10">
        {navItems.map((item, index) => {
          if (item.requiredAdmin && !isAdmin) return null;
          const active = location.pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <motion.div
              key={item.to}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.04, duration: 0.3 }}
            >
              <Link
                to={item.to}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 relative group",
                  active 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
                )}
              >
                {/* Active indicator */}
                {active && (
                  <motion.div
                    layoutId="sidebarActiveIndicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-primary rounded-r-full shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <Icon size={18} className={cn("transition-transform duration-200", active && "drop-shadow-[0_0_6px_rgba(var(--primary-rgb),0.4)]")} />
                <span className="font-semibold text-[13px] tracking-wide">{item.label}</span>
                
                {/* Hover glow */}
                <div className="absolute inset-0 rounded-xl bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

interface LayoutProps {
  children: React.ReactNode;
  title: string;
  breadcrumb?: { label: string; onClick?: () => void }[];
  onAction?: () => void;
  actionLabel?: string;
  notificationsCount?: number;
  showNotificationsPopover: boolean;
  setShowNotificationsPopover: (show: boolean) => void;
  notifications: any[];
  onMarkAllAsRead: () => void;
  onMarkNotificationAsRead?: (id: number) => void;
  onDeleteNotification?: (id: number) => void;
  onClearAllNotifications?: () => void;
  showSettingsPopover: boolean;
  setShowSettingsPopover: (show: boolean) => void;
  settings: any;
  onSaveSettings: (settings: any) => void;
  onInsightsClick: () => void;
  userName: string;
  userAvatar: string;
  onProfileClick: () => void;
  theme: string;
  onToggleTheme: (theme: string) => void;
  onLogout: () => void;
  isAdmin: boolean;
  branches?: any[];
}

const MobileBottomNav = ({ location, isAdmin }: { location: any, isAdmin: boolean }) => {
  const navItems = [
    { icon: Building2, label: 'Empresas', to: '/companies' },
    { icon: Eye, label: 'Águia', to: '/eagle' },
    { icon: Sparkles, label: 'Assistente', to: '/assistant' },
    { icon: Calendar, label: 'Relatórios', to: '/reports' },
    { icon: History, label: 'Histórico', to: '/history' },
    { icon: User, label: 'Usuários', to: '/users', requiredAdmin: true },
    { icon: Facebook, label: 'Meta', to: '/facebook', requiredAdmin: true },
    { icon: Settings, label: 'Ajustes', to: '/settings', requiredAdmin: true },
    { icon: LayoutDashboard, label: 'Sistema', to: '/configuration', requiredAdmin: true },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-[var(--surface)]/90 backdrop-blur-2xl border-t border-border/30 z-50 pb-[max(env(safe-area-inset-bottom),2px)] shadow-[0_-8px_30px_rgba(0,0,0,0.1)] dark:shadow-[0_-8px_30px_rgba(0,0,0,0.5)]">
      <div className="flex items-center justify-evenly px-2 h-12 w-full">
        {navItems.map((item) => {
          if (item.requiredAdmin && !isAdmin) return null;
          const isActive = location.pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              draggable={false}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full relative transition-all duration-200",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="bottomNavIndicator"
                  className="absolute -top-[1px] w-6 h-[2px] bg-gradient-to-r from-primary to-violet-400 rounded-b-full shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]"
                />
              )}
              <Icon size={18} className={cn("transition-all duration-200", isActive ? "scale-110 stroke-[2.5px] drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.4)]" : "stroke-2")} />
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export const Layout = ({ 
  children, 
  title, 
  breadcrumb, 
  onAction, 
  actionLabel,
  notificationsCount = 0,
  showNotificationsPopover,
  setShowNotificationsPopover,
  notifications,
  onMarkAllAsRead,
  onMarkNotificationAsRead,
  onDeleteNotification,
  onClearAllNotifications,
  showSettingsPopover,
  setShowSettingsPopover,
  settings,
  onSaveSettings,
  onInsightsClick,
  userName,
  userAvatar,
  onProfileClick,
  theme,
  onToggleTheme,
  onLogout,
  isAdmin,
  branches = []
}: LayoutProps) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [hasVisited, setHasVisited] = useState(false);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const touchStartRef = React.useRef<{ x: number; y: number } | null>(null);

  const swippableRoutes = [
    { to: '/companies' },
    { to: '/eagle' },
    { to: '/assistant' },
    { to: '/reports' },
    { to: '/history' },
    { to: '/users', requiredAdmin: true },
    { to: '/settings', requiredAdmin: true },
    { to: '/configuration', requiredAdmin: true },
  ].filter(item => !item.requiredAdmin || isAdmin);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touchEnd = {
      x: e.changedTouches[0].clientX,
      y: e.changedTouches[0].clientY
    };
    const deltaX = touchEnd.x - touchStartRef.current.x;
    const deltaY = touchEnd.y - touchStartRef.current.y;
    if (Math.abs(deltaX) > SWIPE_THRESHOLD && Math.abs(deltaX) > Math.abs(deltaY) * SWIPE_RATIO) {
      const currentIndex = swippableRoutes.findIndex(item => location.pathname.startsWith(item.to));
      if (currentIndex !== -1) {
        if (deltaX > 0 && currentIndex > 0) {
          navigate(swippableRoutes[currentIndex - 1].to);
        } else if (deltaX < 0 && currentIndex < swippableRoutes.length - 1) {
          navigate(swippableRoutes[currentIndex + 1].to);
        }
      }
    }
    touchStartRef.current = null;
  };

  useEffect(() => {
    const visited = localStorage.getItem('hasVisitedBefore');
    if (visited) {
      setHasVisited(true);
    } else {
      localStorage.setItem('hasVisitedBefore', 'true');
    }
  }, []);

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

  return (
    <div 
      className="min-h-screen flex bg-background text-foreground transition-colors duration-400 relative"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Ambient Background */}
      <div className="ambient-bg" />

      <Sidebar isAdmin={isAdmin} location={location} />
      
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-[1]">
        
        {/* Top Navigation Bar */}
        <nav className={cn(
          "w-full px-4 md:px-8 py-3 flex items-center justify-between z-50 sticky top-0 transition-all duration-400",
          isScrolled 
            ? "bg-[var(--surface)]/80 backdrop-blur-2xl border-b border-border/50 shadow-[0_4px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)]" 
            : "bg-[var(--surface)]/40 backdrop-blur-xl border-b border-transparent"
        )}>
          
          {/* Left: Logo & Profile */}
          <div className="flex items-center justify-between w-full lg:w-auto lg:shrink-0">
            <motion.div 
              onClick={onProfileClick}
              className="flex items-center gap-2 xl:gap-3 px-3 xl:px-4 py-2 xl:py-2.5 rounded-xl bg-primary/5 border border-primary/8 hover:bg-primary/10 hover:border-primary/20 transition-all cursor-pointer group"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="w-8 h-8 xl:w-9 xl:h-9 rounded-lg bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center font-bold text-white text-sm shadow-[0_3px_12px_rgba(var(--primary-rgb),0.25)] group-hover:shadow-[0_4px_18px_rgba(var(--primary-rgb),0.4)] transition-all overflow-hidden border border-white/10">
                {userAvatar ? <img src={userAvatar} alt={userName} className="w-full h-full object-cover" /> : <span className="text-xs font-black">TF</span>}
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] xl:text-[11px] font-bold text-primary/80 tracking-wide whitespace-nowrap">
                  {hasVisited ? 'Bem-vindo de volta' : 'Bem-vindo'}, {userName}
                </span>
                <span className="text-[8px] xl:text-[9px] text-muted-foreground font-medium tracking-wide whitespace-nowrap">Gestor de Tráfego</span>
              </div>
            </motion.div>

            <div className="flex items-center gap-1 lg:hidden">
              <motion.button 
                onClick={onLogout}
                className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-colors flex items-center justify-center"
                aria-label="Sair"
                whileTap={{ scale: 0.9 }}
              >
                <LogOut size={20} />
              </motion.button>
            </div>
          </div>

          {/* Right: Logout & Theme */}
          <div className="hidden lg:flex items-center justify-end gap-2 xl:gap-3 lg:shrink-0">
            <motion.button 
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-rose-500/80 hover:text-rose-500 hover:bg-rose-500/8 transition-all font-semibold text-xs tracking-wide"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <LogOut size={15} />
              <span>Sair</span>
            </motion.button>
          </div>
        </nav>

        {/* Page Header */}
        <header className="px-4 md:px-8 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-transparent">
          <div className="flex flex-col">
            {breadcrumb && (
              <nav className="flex items-center gap-2 text-[13px] text-muted-foreground mb-2">
                {breadcrumb.map((item, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <span className="opacity-30">/</span>}
                    <button 
                      onClick={item.onClick}
                      className={cn(
                        "px-2 py-1 rounded-lg transition-all duration-200 font-semibold tracking-tight",
                        item.onClick 
                          ? "text-foreground hover:text-primary hover:bg-primary/8 active:scale-95" 
                          : "text-muted-foreground cursor-default"
                      )}
                    >
                      {item.label}
                    </button>
                  </React.Fragment>
                ))}
              </nav>
            )}
            <motion.h1 
              key={title}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="text-2xl md:text-[28px] font-extrabold tracking-tight bg-gradient-to-r from-foreground via-foreground to-primary/60 bg-clip-text text-transparent"
            >
              {title}
            </motion.h1>
          </div>

          <div className="flex items-center gap-2 md:gap-3 flex-wrap">
            <motion.button 
              onClick={onInsightsClick}
              className="flex btn-secondary p-2.5 rounded-xl transition-all"
              title="Insights IA"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
            >
              <Lightbulb size={18} />
            </motion.button>
            
            <div className="relative">
              <motion.button 
                onClick={() => {
                  setShowNotificationsPopover(!showNotificationsPopover);
                  setShowSettingsPopover(false);
                }}
                className="flex btn-secondary p-2.5 rounded-xl relative transition-all"
                title="Notificações"
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
              >
                <Bell size={18} />
                {notificationsCount > 0 && (
                  <motion.span 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-background shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                  />
                )}
              </motion.button>

              <AnimatePresence>
                {showNotificationsPopover && (
                  <>
                    <div 
                      className="fixed inset-0 z-[90]" 
                      onClick={() => setShowNotificationsPopover(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      className="fixed top-32 left-1/2 -translate-x-1/2 w-[calc(100vw-2rem)] max-w-sm md:absolute md:left-auto md:-translate-x-0 md:top-full md:right-0 md:mt-3 z-[100] max-h-[75vh] overflow-y-auto overscroll-contain bg-[var(--surface)]/95 backdrop-blur-3xl rounded-2xl p-4 shadow-[0_20px_60px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.6)] border border-border/50"
                    >
                      <div className="absolute -top-1.5 right-4 w-3 h-3 bg-[var(--surface)] rotate-45 border-t border-l border-border/30 hidden md:block" />
                      
                      <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/30">
                        <div className="flex items-center gap-2">
                          <Bell size={18} className="text-primary" />
                          <h3 className="font-bold text-lg text-foreground tracking-tight">Notificações</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          {notifications.length > 0 && (
                            <button 
                              onClick={onClearAllNotifications}
                              className="text-[10px] font-bold text-rose-500 hover:underline uppercase tracking-wider"
                            >
                              Limpar
                            </button>
                          )}
                          {notifications.filter(n => !n.read).length > 0 && (
                            <button 
                              onClick={onMarkAllAsRead}
                              className="text-[10px] font-bold text-primary hover:underline uppercase tracking-wider"
                            >
                              Lidas
                            </button>
                          )}
                          <button onClick={() => setShowNotificationsPopover(false)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                            <X size={18} />
                          </button>
                        </div>
                      </div>
                      <NotificationsView 
                        notifications={notifications} 
                        onMarkAllAsRead={onMarkAllAsRead} 
                        onMarkAsRead={onMarkNotificationAsRead}
                        onDelete={onDeleteNotification}
                        onClearAll={onClearAllNotifications}
                        isPopover 
                      />
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <div className="relative">
              <motion.button 
                onClick={() => {
                  setShowSettingsPopover(!showSettingsPopover);
                  setShowNotificationsPopover(false);
                }}
                className="flex btn-secondary p-2.5 rounded-xl transition-all"
                title="Configurações"
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
              >
                <Settings size={18} />
              </motion.button>

              <AnimatePresence>
                {showSettingsPopover && (
                  <>
                    <div 
                      className="fixed inset-0 z-[90]" 
                      onClick={() => setShowSettingsPopover(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      className="fixed top-32 left-1/2 -translate-x-1/2 w-[calc(100vw-2rem)] max-w-sm md:absolute md:left-auto md:-translate-x-0 md:top-full md:right-0 md:mt-3 z-[100] max-h-[75vh] overflow-y-auto overscroll-contain bg-[var(--surface)]/95 backdrop-blur-3xl rounded-2xl p-4 shadow-[0_20px_60px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.6)] border border-border/50"
                    >
                      <div className="absolute -top-1.5 right-4 w-3 h-3 bg-[var(--surface)] rotate-45 border-t border-l border-border/30 hidden md:block" />
                      
                      <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/30">
                        <div className="flex items-center gap-2">
                          <Settings size={18} className="text-primary" />
                          <h3 className="font-bold text-lg text-foreground tracking-tight">Ajustes Rápidos</h3>
                        </div>
                        <button onClick={() => setShowSettingsPopover(false)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                          <X size={18} />
                        </button>
                      </div>
                      <SettingsView 
                        settings={settings} 
                        onSave={onSaveSettings} 
                        isPopover 
                        branches={branches}
                      />
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {onAction && actionLabel && (
              <motion.button 
                onClick={onAction}
                className="btn-primary flex items-center gap-2 ml-2"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <Plus size={16} />
                <span>{actionLabel}</span>
              </motion.button>
            )}
          </div>
        </header>

        {/* Page Content */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-4 pb-28 lg:pb-8 md:p-8 w-full max-w-[1600px] mx-auto custom-scrollbar"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 15, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
              transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <MobileBottomNav location={location} isAdmin={isAdmin} />

      {/* Floating Theme Button */}
      <ThemeSwitcher theme={theme} onToggleTheme={onToggleTheme} />

    </div>
  );
};
