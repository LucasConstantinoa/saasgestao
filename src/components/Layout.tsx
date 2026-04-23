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

const Sidebar = ({ isAdmin, location, isReportsOnly }: { isAdmin: boolean, location: any, isReportsOnly?: boolean }) => {
  const navItems = [
    { icon: Building2, label: 'Empresas', to: '/companies', hidden: isReportsOnly },
    { icon: Calendar, label: 'Relatórios', to: '/reports' },
    { icon: Facebook, label: 'Meta (Clientes)', to: '/facebook', requiredAdmin: true },
    { icon: Settings, label: 'Configurações', to: '/settings', hidden: isReportsOnly },
    { icon: Eye, label: 'Visão de Águia', to: '/eagle', hidden: isReportsOnly },
    { icon: History, label: 'Histórico', to: '/history', hidden: isReportsOnly },
    { icon: User, label: 'Usuários', to: '/users', requiredAdmin: true },
    { icon: LayoutDashboard, label: 'Sistema', to: '/configuration', requiredAdmin: true },
  ];

  return (
    <div className="hidden lg:flex flex-col w-[260px] bg-[var(--surface)]/80 backdrop-blur-xl border-r border-border/50 h-screen sticky top-0 p-5 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-primary/3 to-transparent pointer-events-none" />
      
      <div className="flex items-center gap-3 mb-8 px-2 relative z-10">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center shadow-[0_4px_15px_rgba(var(--primary-rgb),0.3)]">
          <Zap size={20} className="text-white" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-[15px] tracking-tight">TrafficFlow</span>
          <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-[0.15em]">Ultimate</span>
        </div>
      </div>

      <div className="flex flex-col gap-1 relative z-10">
        {navItems.map((item) => {
          if (item.hidden) return null;
          if (item.requiredAdmin && !isAdmin) return null;
          const active = location.pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 relative group",
                active 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
              )}
            >
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-primary rounded-r-full" />
              )}
              <Icon size={18} />
              <span className="font-semibold text-[13px] tracking-wide">{item.label}</span>
            </Link>
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
  userName: string;
  userAvatar: string;
  onProfileClick: () => void;
  theme: string;
  onToggleTheme: (theme: string) => void;
  onLogout: () => void;
  isAdmin: boolean;
  isReportsOnly?: boolean;
  branches?: any[];
}

const MobileBottomNav = ({ location, isAdmin, isReportsOnly, onAdminMenuToggle }: { 
  location: any, 
  isAdmin: boolean, 
  isReportsOnly?: boolean,
  onAdminMenuToggle: () => void
}) => {
  // 5 core tabs max for mobile - prioritize most used
  const coreNavItems = [
    { icon: Building2, label: 'Empresas', to: '/companies', hidden: isReportsOnly },
    { icon: Calendar, label: 'Relatórios', to: '/reports' },
    { icon: Eye, label: 'Águia', to: '/eagle', hidden: isReportsOnly },
  ];

  const adminNavItems = isAdmin ? [
    { icon: Facebook, label: 'Meta', to: '/facebook' },
    { icon: User, label: 'Users', to: '/users' },
    { icon: Settings, label: 'Config', to: '/settings' },
    { icon: History, label: 'Histórico', to: '/history' },
    { icon: LayoutDashboard, label: 'Sistema', to: '/configuration' },
  ] : [];

  return (
    <>
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-[var(--surface)]/95 backdrop-blur-2xl border-t border-border/40 z-[60] pb-[max(env(safe-area-inset-bottom),8px)] shadow-2xl">
        <div className="flex items-center justify-evenly px-1.5 h-14 min-h-[56px] w-full gap-1">
          {coreNavItems.map((item) => {
            if (item.hidden) return null;
            const isActive = location.pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full relative p-1.5 rounded-lg transition-all duration-200 min-w-0",
                  isActive 
                    ? "bg-primary/20 text-primary shadow-lg scale-[1.05]" 
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50 active:scale-[0.95]"
                )}
                title={item.label}
              >
                <Icon size={16} />
              </Link>
            );
          })}
          
          {/* Admin Menu Button - 5th slot */}
          <button
            onClick={onAdminMenuToggle}
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full p-1.5 rounded-lg transition-all duration-200 relative min-w-0",
              adminNavItems.length > 0 
                ? "bg-accent/50 text-foreground shadow-md scale-[1.02] hover:scale-[1.05] active:scale-[0.95]" 
                : "text-muted-foreground/50"
            )}
            title={adminNavItems.length > 0 ? "Menu Admin" : "Sem acesso admin"}
          >
            <Settings size={16} />
            {adminNavItems.length > 0 && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-surface animate-pulse" />
            )}
          </button>
        </div>
      </div>
    </>
  );
};

const MobileAdminDrawer = ({ 
  isOpen, 
  onClose, 
  location, 
  isAdmin, 
  isReportsOnly 
}: { 
  isOpen: boolean;
  onClose: () => void;
  location: any;
  isAdmin: boolean;
  isReportsOnly?: boolean;
}) => {
  const adminNavItems = [
    { icon: Facebook, label: 'Meta (Clientes)', to: '/facebook' },
    { icon: User, label: 'Usuários', to: '/users' },
    { icon: Settings, label: 'Configurações', to: '/settings', hidden: isReportsOnly },
    { icon: History, label: 'Histórico', to: '/history', hidden: isReportsOnly },
    { icon: LayoutDashboard, label: 'Sistema', to: '/configuration' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div 
            className="lg:hidden fixed inset-0 bg-black/30 backdrop-blur-sm z-[70]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          
          {/* Drawer */}
          <motion.div 
            className="lg:hidden fixed bottom-0 left-0 right-0 bg-[var(--surface)] border-t border-border/50 shadow-2xl z-[80] rounded-t-3xl max-h-[70vh] overflow-y-auto"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            <div className="p-4 pt-6 pb-2 border-b border-border/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-black text-lg text-foreground tracking-tight">Menu Admin</h3>
                <button 
                  onClick={onClose}
                  className="p-2 rounded-xl hover:bg-accent/50 transition-all"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="space-y-1 px-4 py-3">
              {adminNavItems.map((item) => {
                if (item.hidden) return null;
                const isActive = location.pathname.startsWith(item.to);
                const Icon = item.icon;
                return (
                  <button
                    key={item.to}
                    onClick={() => {
                      onClose();
                      // Navigate after close animation
                      setTimeout(() => window.location.href = item.to, 200);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 text-left group",
                      isActive 
                        ? "bg-primary/10 text-primary font-bold shadow-lg" 
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <Icon size={20} className={cn(
                      "shrink-0 flex-shrink-0",
                      isActive ? "text-primary" : "group-hover:text-foreground"
                    )} />
                    <span className="font-semibold text-sm">{item.label}</span>
                    {isActive && (
                      <div className="ml-auto w-2 h-2 bg-primary rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
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
  userName,
  userAvatar,
  onProfileClick,
  theme,
  onToggleTheme,
  onLogout,
  isAdmin,
  isReportsOnly,
  branches = []
}: LayoutProps) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileAdminDrawerOpen, setIsMobileAdminDrawerOpen] = useState(false);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const touchStartRef = React.useRef<{ x: number; y: number } | null>(null);

  const swippableRoutes = [
    { to: '/companies', hidden: isReportsOnly },
    { to: '/eagle', hidden: isReportsOnly },
    { to: '/reports' },
    { to: '/history', hidden: isReportsOnly },
    { to: '/settings', requiredAdmin: true },
    { to: '/configuration', requiredAdmin: true },
  ].filter(item => (!item.requiredAdmin || isAdmin) && !item.hidden);

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
      <Sidebar isAdmin={isAdmin} location={location} isReportsOnly={isReportsOnly} />
      
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-[1]">
        <nav className={cn(
          "w-full px-4 md:px-8 py-3 flex items-center justify-between z-50 sticky top-0 transition-all duration-400",
          isScrolled 
            ? "bg-[var(--surface)]/80 backdrop-blur-2xl border-b border-border/50" 
            : "bg-[var(--surface)]/40 backdrop-blur-xl border-b border-transparent"
        )}>
          <div className="flex items-center justify-between w-full lg:w-auto lg:shrink-0">
            <div 
              onClick={onProfileClick}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/5 border border-primary/8 cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center font-bold text-white text-sm">
                {userAvatar ? <img src={userAvatar} alt={userName} className="w-full h-full object-cover" /> : <span>TF</span>}
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-primary/80">{userName}</span>
              </div>
            </div>
          </div>

          <div className="hidden lg:flex items-center justify-end gap-3">
            <button 
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-rose-500/80 hover:text-rose-500 hover:bg-rose-500/8 transition-all font-semibold text-xs"
            >
              <LogOut size={15} />
              <span>Sair</span>
            </button>
          </div>
        </nav>

        <header className="px-4 md:px-8 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowNotificationsPopover(!showNotificationsPopover)}
              className="p-2.5 rounded-xl bg-secondary"
            >
              <Bell size={18} />
            </button>
            <button 
              onClick={() => setShowSettingsPopover(!showSettingsPopover)}
              className="p-2.5 rounded-xl bg-secondary"
            >
              <Settings size={18} />
            </button>
          </div>
        </header>

        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-4 pb-28 lg:pb-8 md:p-8 w-full max-w-[1600px] mx-auto"
        >
          {children}
        </div>
      </main>

      <MobileBottomNav 
        location={location} 
        isAdmin={isAdmin} 
        isReportsOnly={isReportsOnly}
        onAdminMenuToggle={() => setIsMobileAdminDrawerOpen(true)}
      />
      <MobileAdminDrawer 
        isOpen={isMobileAdminDrawerOpen}
        onClose={() => setIsMobileAdminDrawerOpen(false)}
        location={location}
        isAdmin={isAdmin}
        isReportsOnly={isReportsOnly}
      />
      <ThemeSwitcher theme={theme} onToggleTheme={onToggleTheme} />
    </div>
  );
};
