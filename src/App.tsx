import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios'; // Updated: 2026-04-14 - Force sync rebuild
import { InView } from 'react-intersection-observer';
import { motion, AnimatePresence } from 'motion/react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { UsersView } from '@/pages/UsersView';
import { Login } from '@/pages/LoginPage';
import { Layout } from '@/components/Layout';
import { PremiumLoading } from '@/components/PremiumLoading';
import { BranchRealTimeDashboard } from '@/components/BranchRealTimeDashboard';
import { KPI, Card, Badge } from '@/components/UI';
import { Modal } from '@/components/Modal';
import { EagleView } from '@/components/EagleView';
import { logSecurityEvent } from '@/lib/security';
import { useToasts } from '@/components/Toast';
import { AuditLog } from '@/components/AuditLog';
import { logAuditEvent } from '@/lib/audit';
import { SettingsView } from '@/components/SettingsView';
import { ReportsView } from '@/components/ReportsView';
import { ConfigurationView } from '@/components/ConfigurationView';
import { NotificationsView } from '@/components/NotificationsView';
import { MetaView } from '@/pages/MetaView';
import { FacebookCallback } from '@/pages/FacebookCallback';
// Removed SQLEditorView

import { RegisterSaleModal } from '@/components/RegisterSaleModal';
// Removed ChatWidget
import { NewCampaignModal } from '@/components/NewCampaignModal';
import { EditCampaignModal } from '@/components/EditCampaignModal';
import { EditCompanyModal } from '@/components/EditCompanyModal';
import { EditProfileModal } from '@/components/EditProfileModal';
import { Tooltip } from '@/components/Tooltip';
import { BalanceEvolutionChart } from '@/components/BalanceEvolutionChart';
import { ExpandableLayout } from '@/components/ExpandableLayout';
import { 
  Building2, 
  TrendingUp, 
  Wallet, 
  DollarSign, 
  Users, 
  Clock, 
  Plus, 
  Edit2, 
  Trash2, 
  Pause,
  Play,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  BarChart3,
  Search,
  Filter,
  Sparkles,
  Facebook,
  Loader2,
  Settings as SettingsIcon,
  X,
  Calendar,
  DollarSign as DollarSignIcon,
  ArrowUpAZ,
  ArrowDownZA,
  Sun,
  Moon,
  ChevronDown,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { formatCurrency, formatPercent, cn, calculateDailySpend, calculateRealTimeBalance, isCriticalBranchesDismissed, dismissCriticalBranchesForCompany } from '@/lib/utils';
import { Company, Branch, Campaign, Sale, AuditEntry, Notification, AppSettings } from '@/types';
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/lib/supabase';
import { useTrafficFlow } from '@/context/TrafficFlowContext';
// Removed ErrorBoundary

const calculateLtvAndRoi = (saleData: any, companyType: string, totalCampaignSpend: number) => {
  let calculatedLtv = 0;
  let roi = 0;

  if (companyType === 'association') {
    calculatedLtv = (saleData.membership_fee || 0) + ((saleData.monthly_fee || 0) * 12);
  } else {
    calculatedLtv = saleData.sale_value || 0;
  }

  if (totalCampaignSpend > 0) {
    roi = Math.round(((calculatedLtv - totalCampaignSpend) / totalCampaignSpend) * 100);
  }

  return { calculatedLtv, roi };
};

const populateBranchEditForm = (branch: Branch, setters: {
  setNewName: (v: string) => void;
  setNewValue: (v: string) => void;
  setNewDailyExpense: (v: string) => void;
  setNewWhatsapp: (v: string) => void;
  setNewFacebookAdAccountId: (v: string) => void;
  setNewFacebookAccessToken: (v: string) => void;
  setIsEditBranchModalOpen: (v: boolean) => void;
}) => {
  setters.setNewName(branch.name || '');
  setters.setNewValue(calculateRealTimeBalance(branch).toString());
  setters.setNewDailyExpense((branch.daily_expense || 0).toString());
  setters.setNewWhatsapp(branch.whatsapp || '');
  setters.setNewFacebookAdAccountId(branch.facebook_ad_account_id || '');
  setters.setNewFacebookAccessToken(branch.facebook_access_token || '');
  setters.setIsEditBranchModalOpen(true);
};

type View = 'companies' | 'company' | 'branch' | 'eagle' | 'reports' | 'history' | 'settings' | 'configuration' | 'notifications';

const RealTimeBalanceKPI = ({ branch, campaigns, onSync, isSyncing, onConfigure }: { branch: Branch, campaigns: Campaign[], onSync?: () => void, isSyncing?: boolean, onConfigure?: () => void }) => {
  const hasFacebookConfig = Boolean(branch.facebook_ad_account_id);

  return <KPI 
    label="Saldo Atual" 
    value={!hasFacebookConfig ? "NÃO CONFIGURADO" : formatCurrency(branch.balance || 0, 2)} 
    icon={Wallet} 
    trendLabel={!hasFacebookConfig ? "ID da Conta de Anúncios ausente" : "Saldo da última sincronização"} 
    valueClassName={cn(
      "font-extrabold text-3xl md:text-4xl tracking-tighter",
      !hasFacebookConfig ? "text-rose-500 text-xl" : ((branch.balance || 0) < 0 ? "text-rose-500" : "text-foreground")
    )}
    badge={!hasFacebookConfig ? 'Erro de Configuração' : undefined}
    badgeColor={!hasFacebookConfig ? 'red' : undefined}
    
    action={
      <div className="flex items-center gap-2">
        {!hasFacebookConfig && onConfigure && (
          <button 
            onClick={onConfigure}
            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 transition-colors text-rose-500"
            title="Configurar Facebook Ads"
          >
            <SettingsIcon size={16} />
          </button>
        )}
        {onSync && (
          <button 
            onClick={onSync}
            disabled={isSyncing || !hasFacebookConfig}
            className={cn(
              "p-1.5 rounded-lg hover:bg-muted transition-colors",
              isSyncing && "animate-spin",
              !hasFacebookConfig && "opacity-30 cursor-not-allowed"
            )}
            title={hasFacebookConfig ? "Sincronizar com Facebook" : "Configure o ID da conta primeiro"}
          >
            <Sparkles size={16} className="text-primary" />
          </button>
        )}
      </div>
    }
  />;
};

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    companies, 
    branches, 
    myBranches,
    campaigns, 
    sales, 
    notifications, 
    auditLogs, 
    settings, 
    loading,
    isAdmin,
    userPermissions,
    fetchData,
    setSettings,
    setCompanies,
    setBranches,
    setCampaigns,
    setSales,
    setNotifications,
    setAuditLogs
  } = useTrafficFlow();

  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      if (session?.user?.user_metadata) {
        if (session.user.user_metadata.userName) setUserName(session.user.user_metadata.userName);
        if (session.user.user_metadata.userAvatar) setUserAvatar(session.user.user_metadata.userAvatar);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
      const userId = session?.user?.id;
      
      if (event === 'SIGNED_IN' && userId) {
        logSecurityEvent('AUTH_EVENT', 'auth', { event: 'SIGNED_IN', email: session.user.email }, userId);
      } else if (event === 'SIGNED_OUT') {
        logSecurityEvent('AUTH_EVENT', 'auth', { event: 'SIGNED_OUT' });
      }
      if (session?.user?.user_metadata) {
        if (session.user.user_metadata.userName) setUserName(session.user.user_metadata.userName);
        if (session.user.user_metadata.userAvatar) setUserAvatar(session.user.user_metadata.userAvatar);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
  };

  // ... rest of state ...
  const [currentView, setView] = useState<View>('companies');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  // Access Control Logic
  const currentBranchPermission = (userPermissions || []).find(p => p.id === selectedBranch?.id || p.branch_id === selectedBranch?.id);
  
  const canManageSelectedBranch = isAdmin || currentBranchPermission?.permission_level === 'edit' || currentBranchPermission?.permission_level === 'admin';
  const canAddSale = isAdmin || ['edit', 'add_sale', 'operator', 'admin'].includes(currentBranchPermission?.permission_level);
  const isReportsOnly = !isAdmin && currentBranchPermission?.permission_level === 'reports_only';
  
  // Update view logic based on permissions
  useEffect(() => {
    if (isReportsOnly && currentView !== 'reports') {
      setView('reports');
    }
  }, [isReportsOnly, currentView]);

  const canNavigateTo = (view: View) => {
    if (isAdmin) return true;
    if (isReportsOnly) return view === 'reports' || view === 'notifications';
    return true; // Simplified for now
  };
  const lastActivity = useRef(Date.now());
  const sessionStart = useRef(Date.now());

  useEffect(() => {
    if (!isAuthenticated) {
      sessionStart.current = Date.now();
      return;
    }
    
    sessionStart.current = Date.now();
    lastActivity.current = Date.now();

    const resetActivity = () => { lastActivity.current = Date.now(); };
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];
    events.forEach(e => window.addEventListener(e, resetActivity));

    const interval = setInterval(() => {
      const now = Date.now();
      const inactiveTime = now - lastActivity.current;
      const sessionTime = now - sessionStart.current;

      if (inactiveTime > 10 * 60 * 1000 || sessionTime > 60 * 60 * 1000) {
        handleLogout();
      }
    }, 60000); // Check every minute

    return () => {
      events.forEach(e => window.removeEventListener(e, resetActivity));
      clearInterval(interval);
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (selectedCompany) {
      localStorage.setItem('lastSelectedCompanyId', selectedCompany.id.toString());
    }
  }, [selectedCompany]);

  useEffect(() => {
    if (!isAuthenticated) return;
    
    const path = location.pathname;
    let pageName = 'Página Desconhecida';
    
    if (path === '/companies') pageName = 'Lista de Empresas';
    else if (path.startsWith('/companies/') && !path.includes('/branches/')) pageName = 'Detalhes da Empresa';
    else if (path.includes('/branches/')) pageName = 'Detalhes da Filial';
    else if (path === '/eagle') pageName = 'Visão de Águia';
    else if (path === '/assistant') pageName = 'Assistente IA';
    else if (path === '/reports') pageName = 'Relatórios';
    else if (path === '/history') pageName = 'Histórico';
    else if (path === '/users') pageName = 'Usuários';
    else if (path === '/settings') pageName = 'Configurações';
    else if (path === '/') pageName = 'Dashboard Inicial';

    logAuditEvent('Navegação', `Acessou a página: ${pageName}`, 'info');
  }, [location.pathname, isAuthenticated]);

  useEffect(() => {
    const path = location.pathname;
    
    // Parse /companies/:companyId/branches/:branchId
    const branchMatch = path.match(/^\/companies\/(\d+)\/branches\/(\d+)$/);
    if (branchMatch) {
      const companyId = parseInt(branchMatch[1]);
      const branchId = parseInt(branchMatch[2]);
      
      const company = (companies || []).find(c => c && c.id === companyId);
      if (company) {
        setSelectedCompany(company);
      }
      
      const branch = (branches || []).find(b => b && b.id === branchId);
      if (branch) {
        setSelectedBranch(branch);
        setView('branch');
      }
      return;
    }
    
    // Parse /companies/:companyId
    const companyMatch = path.match(/^\/companies\/(\d+)$/);
    if (companyMatch) {
      const companyId = parseInt(companyMatch[1]);
      const company = (companies || []).find(c => c && c.id === companyId);
      if (company) {
        if (selectedCompany?.id !== company.id) {
          setDismissedCriticalBranches(isCriticalBranchesDismissed(company.id));
        }
        setSelectedCompany(company);
        setView('company');
      }
      setSelectedBranch(null);
      return;
    }
    
    // Parse /companies
    if (path === '/companies') {
      setView('companies');
      setSelectedCompany(null);
      setSelectedBranch(null);
      return;
    }
  }, [location.pathname, companies, branches]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddBranchModalOpen, setIsAddBranchModalOpen] = useState(false);
  const [newDailyExpense, setNewDailyExpense] = useState('');
  const [newFacebookAdAccountId, setNewFacebookAdAccountId] = useState('');
  const [newFacebookAccessToken, setNewFacebookAccessToken] = useState('');
  const [fetchedAdAccounts, setFetchedAdAccounts] = useState<{id: string, name: string}[]>([]);
  const [isFetchingAccounts, setIsFetchingAccounts] = useState(false);
  const [isChatWidgetOpen, setIsChatWidgetOpen] = useState(false);
  const [showCriticalBalanceBanner, setShowCriticalBalanceBanner] = useState(true);
  const [dismissedCriticalBranches, setDismissedCriticalBranches] = useState(false);
  const [showNotificationsPopover, setShowNotificationsPopover] = useState(false);
  const [showSettingsPopover, setShowSettingsPopover] = useState(false);
  const [isRegisterSaleModalOpen, setIsRegisterSaleModalOpen] = useState(false);
  const [isEditSaleModalOpen, setIsEditSaleModalOpen] = useState(false);
  const [selectedSaleForModal, setSelectedSaleForModal] = useState<Sale | null>(null);
  const [isNewCampaignModalOpen, setIsNewCampaignModalOpen] = useState(false);
  const [isEditCampaignModalOpen, setIsEditCampaignModalOpen] = useState(false);
  const [selectedCampaignForModal, setSelectedCampaignForModal] = useState<Campaign | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditBranchModalOpen, setIsEditBranchModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingCompany, setDeletingCompany] = useState<Company | null>(null);
  const [isDeleteCampaignModalOpen, setIsDeleteCampaignModalOpen] = useState(false);
  const [deletingCampaign, setDeletingCampaign] = useState<Campaign | null>(null);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [userName, setUserName] = useState('Admin');
  const [userAvatar, setUserAvatar] = useState('');
  const [branchSearch, setBranchSearch] = useState('');
  const [branchSortBy, setBranchSortBy] = useState<'name' | 'balance' | 'daysRemaining' | 'roi'>('name');
  const [branchSortOrder, setBranchSortOrder] = useState<'asc' | 'desc'>('asc');
  const [salesSortBy, setSalesSortBy] = useState<'date' | 'value' | 'roi'>('date');
  const [salesSortOrder, setSalesSortOrder] = useState<'asc' | 'desc'>('desc');
  const [companyFilter, setCompanyFilter] = useState<'all' | 'association' | 'direct_sales'>('all');
  const [salesPage, setSalesPage] = useState(1);
  const [theme, setTheme] = useState<string>(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme || 'dark';
  });
  
  // Form state
  const [newName, setNewName] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newCompanyType, setNewCompanyType] = useState<'association' | 'direct_sales'>('direct_sales');
  const [newLogo, setNewLogo] = useState('');
  const [newWhatsapp, setNewWhatsapp] = useState('');
  const [campaignStatusFilter, setCampaignStatusFilter] = useState<'all' | 'active' | 'paused'>('all');

  const { addToast } = useToasts();
  const checkedBranchesRef = React.useRef<Set<number>>(new Set());
  const hasInitialSyncRun = useRef(false);

  const fetchAdAccounts = useCallback(async (token: string) => {
    // If no token, we send 'test' to signify we want to use the server's master token
    const tokenToUse = (token && token.length > 10) ? token : 'test';
    
    setIsFetchingAccounts(true);
    try {
      const response = await axios.get(`/api/facebook/ad-accounts`, {
        params: { token: tokenToUse }
      });
      
      const accounts = response.data.data.map((acc: any) => ({
        id: acc.account_id || acc.id,
        name: acc.name,
        balance: acc.funding_source_details?.display_string || ''
      }));
      
      setFetchedAdAccounts(accounts);
      if (accounts.length === 0) {
        addToast('info', 'Nenhuma conta encontrada', 'Não encontramos contas de anúncio vinculadas a este token.');
      }
    } catch (err: any) {
      console.error("Erro ao buscar contas:", err);
      addToast('error', 'Erro ao buscar contas', err.response?.data?.error?.message || err.message);
    } finally {
      setIsFetchingAccounts(false);
    }
  }, [addToast]);
  const [isSyncingBalance, setIsSyncingBalance] = useState(false);

  const criticalNotifications = notifications.filter(n => n.type === 'critical' && !n.read);

  // Automatic notifications for low balance
  useEffect(() => {
    if (loading || (branches || []).length === 0 || (campaigns || []).length === 0) return;

    const checkLowBalance = async () => {
      for (const branch of (branches || [])) {
        if (!branch || checkedBranchesRef.current.has(branch.id)) continue;

        const branchCampaigns = (campaigns || []).filter(c => c && c.branch_id === branch.id);
        const dailySpend = calculateDailySpend(branchCampaigns);
        
        if (dailySpend > 0 && (branch.balance || 0) < dailySpend * 3) {
          const recentNotification = notifications.find(n => 
            n.title === 'Saldo Baixo' && 
            n.message.includes(branch.name) &&
            new Date(n.timestamp).getTime() > Date.now() - 24 * 60 * 60 * 1000
          );

          if (!recentNotification) {
            const newNotif = {
              type: 'critical',
              title: 'Saldo Baixo',
              message: `A filial ${branch.name} tem saldo para menos de 3 dias de campanha.`,
              read: false,
              branch_id: branch.id
            };
            
            const { data, error } = await supabase.from('notifications').insert(newNotif).select().single();
            if (!error && data) {
              setNotifications(prev => [data, ...prev]);
              addToast('warning', 'Atenção: Saldo Baixo', newNotif.message);
            }
          }
          checkedBranchesRef.current.add(branch.id);
        }
      }
    };

    checkLowBalance();
  }, [branches, campaigns, loading, notifications, addToast, setNotifications]);

  // Apply primary color from settings
  useEffect(() => {
    if (settings.primaryColor) {
      document.documentElement.style.setProperty('--primary', settings.primaryColor);
      
      // Convert hex to rgb for rgba() usage in CSS
      const hex = settings.primaryColor.replace('#', '');
      if (hex.length === 6) {
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        document.documentElement.style.setProperty('--primary-rgb', `${r}, ${g}, ${b}`);

        // Mix with a dark gray base to create dark theme backgrounds that match the primary color
        const baseR = 20;
        const baseG = 20;
        const baseB = 20;
        const mix = (primaryC: number, baseC: number, amount: number) => Math.round(primaryC * amount + baseC * (1 - amount));
        
        const intensity = settings.backgroundIntensity ?? 4;
        const bgAmount = intensity / 100;
        const surfAmount = (intensity / 100) * 2;
        const surfLightAmount = (intensity / 100) * 3;
        
        // Very dark background
        const bgR = mix(r, baseR, bgAmount);
        const bgG = mix(g, baseG, bgAmount);
        const bgB = mix(b, baseB, bgAmount);
        document.documentElement.style.setProperty('--dark-bg', `rgb(${bgR}, ${bgG}, ${bgB})`);
        
        // Slightly lighter surface
        const surfR = mix(r, baseR, surfAmount);
        const surfG = mix(g, baseG, surfAmount);
        const surfB = mix(b, baseB, surfAmount);
        document.documentElement.style.setProperty('--dark-surface', `rgb(${surfR}, ${surfG}, ${surfB})`);
        
        // Even lighter surface
        const surfLightR = mix(r, baseR, surfLightAmount);
        const surfLightG = mix(g, baseG, surfLightAmount);
        const surfLightB = mix(b, baseB, surfLightAmount);
        document.documentElement.style.setProperty('--dark-surface-light', `rgb(${surfLightR}, ${surfLightG}, ${surfLightB})`);
        
        // Glass background (tinted with base)
        document.documentElement.style.setProperty('--dark-glass-bg', `rgba(${bgR}, ${bgG}, ${bgB}, 0.7)`);
      }
    }
  }, [settings.primaryColor, settings.backgroundIntensity]);

  useEffect(() => {
    const darkThemes = ['dark', 'slate-theme', 'zinc-theme', 'transparent-glass'];
    document.documentElement.classList.remove('dark', 'transparent-glass', 'light-gray', 'slate-theme', 'zinc-theme');
    
    if (theme !== 'light') {
      document.documentElement.classList.add(theme);
    }
    
    if (darkThemes.includes(theme)) {
      document.documentElement.classList.add('dark');
    }
    
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Sync theme state with settings.theme
  useEffect(() => {
    if (settings.theme) {
      setTheme(settings.theme);
    }
  }, [settings.theme]);

  const setThemeDirectly = (newTheme: string) => {
    setTheme(newTheme);
    
    // Update settings only if authenticated
    if (isAuthenticated) {
      handleSaveSettings({ ...settings, theme: newTheme }, true);
    }
  };

  const handleSaveSettings = async (newSettings: AppSettings, silent: boolean = false) => {
    try {
      const userSpecificKeys = ['brandName', 'logoUrl', 'theme', 'primaryColor', 'backgroundIntensity'];
      const userSpecificData: any = {};
      const globalSettings: any = {};

      Object.entries(newSettings).forEach(([key, value]) => {
        if (userSpecificKeys.includes(key)) {
          userSpecificData[key] = value;
        } else {
          globalSettings[key] = value;
        }
      });

      // Save user-specific settings to user_metadata
      await supabase.auth.updateUser({
        data: userSpecificData
      });

      // Save global settings to settings table
      await Promise.all(
        Object.entries(globalSettings).map(async ([key, value]) => {
          const valToSave = (typeof value === 'object' && value !== null) ? JSON.stringify(value) : String(value);
          const { error } = await supabase.from('settings').upsert({ key, value: valToSave }, { onConflict: 'key' });
          if (error) throw error;
        })
      );
      
      setSettings(newSettings);
      if (!silent) {
        addToast('success', 'Configurações salvas', 'As preferências foram atualizadas.');
      }
    } catch (error) {
      console.error('Settings save error:', error);
      if (!silent) {
        addToast('error', 'Erro ao salvar', 'Não foi possível salvar as configurações.');
      }
    }
  };

  const handleDeleteSale = async (sale: Sale) => {
    if (!isAdmin && !(myBranches || []).some(b => b && b.id === sale.branch_id)) {
      addToast('error', 'Acesso negado', 'Você não tem permissão para excluir vendas desta filial.');
      return;
    }
    if (!confirm(`Tem certeza que deseja excluir a venda de ${formatCurrency(sale.sale_value || sale.membership_fee || 0)}?`)) return;

    try {
      const { error } = await supabase.from('sales').delete().eq('id', sale.id);
      if (error) throw error;

      setSales(prev => prev.filter(s => s.id !== sale.id));
      addToast('success', 'Venda excluída', 'O registro foi removido com sucesso.');
      
      await supabase.from('audit_log').insert({
        action: 'Venda excluída',
        detail: `Venda de ${formatCurrency(sale.sale_value || sale.membership_fee || 0)} removida.`,
        type: 'delete'
      });
    } catch (error) {
      console.error('Error deleting sale:', error);
      addToast('error', 'Erro ao excluir', 'Não foi possível remover a venda.');
    }
  };

  const handleSyncBranchBalance = async () => {
    if (!selectedBranch) return;
    setIsSyncingBalance(true);
    addToast('info', 'Sincronizando', `Buscando saldo real do Facebook para ${selectedBranch.name}...`);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão não encontrada");

      const response = await axios.post(`/api/sync-branch`, { 
        branchId: selectedBranch.id 
      }, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      
      if (response.data.success) {
        setBranches(prev => prev.map(b => 
          b.id === selectedBranch.id ? { ...b, balance: response.data.balance } : b
        ));
        setSelectedBranch(prev => prev ? { ...prev, balance: response.data.balance } : null);
        addToast('success', 'Sincronizado', `Saldo atualizado: R$ ${response.data.balance.toFixed(2)}`);
      }
    } catch (err: any) {
      console.error('Error syncing individual branch balance:', err);
      addToast('error', 'Erro ao sincronizar', err.response?.data?.error || 'Não foi possível atualizar o saldo agora.');
    } finally {
      setIsSyncingBalance(false);
    }
  };

  const openEditSaleModal = (sale: Sale) => {
    // Find branch and company for the sale
    const branch = (branches || []).find(b => b.id === sale.branch_id);
    const company = (companies || []).find(c => c.id === branch?.company_id);
    
    if (branch) setSelectedBranch(branch);
    if (company) setSelectedCompany(company);
    
    setSelectedSaleForModal(sale);
    setIsEditSaleModalOpen(true);
  };

  const handleRegisterSale = async (saleData: any) => {
    if (!canManageSelectedBranch) {
      addToast('error', 'Acesso negado', 'Você não tem permissão para registrar vendas nesta filial.');
      return;
    }
    if (!selectedBranch || !selectedCompany) return;

    const branchCampaigns = campaigns.filter(c => c.branch_id === selectedBranch.id && c.status !== 'paused');
    const totalCampaignSpend = branchCampaigns.reduce((acc, c) => acc + c.spend, 0);
    const { calculatedLtv, roi } = calculateLtvAndRoi(saleData, selectedCompany.type, totalCampaignSpend);

    try {
      const { data, error } = await supabase.from('sales').insert({
        ...saleData,
        branch_id: selectedBranch.id,
        total_ltv: calculatedLtv,
        roi: roi
      }).select().single();
      
      if (error) throw error;
      
      setSales(prev => [...prev, data]);
      await fetchData();
      addToast('success', 'Venda registrada', 'A venda foi registrada com sucesso.');
      setIsRegisterSaleModalOpen(false);

      await supabase.from('audit_log').insert({
        action: 'Venda registrada',
        detail: `${data.client_name} - ${formatCurrency(calculatedLtv)}`,
        type: 'success'
      });
    } catch (error) {
      console.error('Sale registration error:', error);
      addToast('error', 'Erro ao registrar', 'Não foi possível registrar a venda.');
    }
  };

  const handleEditSale = async (saleData: any) => {
    if (!canManageSelectedBranch) {
      addToast('error', 'Acesso negado', 'Você não tem permissão para editar vendas nesta filial.');
      return;
    }
    if (!selectedSaleForModal || !selectedBranch || !selectedCompany) return;

    const branchCampaigns = campaigns.filter(c => c.branch_id === selectedBranch.id && c.status !== 'paused');
    const totalCampaignSpend = branchCampaigns.reduce((acc, c) => acc + c.spend, 0);
    const { calculatedLtv, roi } = calculateLtvAndRoi(saleData, selectedCompany.type, totalCampaignSpend);

    try {
      const { data, error } = await supabase.from('sales').update({
        ...saleData,
        total_ltv: calculatedLtv,
        roi: roi
      }).eq('id', selectedSaleForModal.id).select().single();
      
      if (error) throw error;
      
      setSales(prev => prev.map(s => s.id === selectedSaleForModal.id ? data : s));
      await fetchData();
      addToast('success', 'Venda atualizada', 'A venda foi atualizada com sucesso.');
      setIsEditSaleModalOpen(false);
      setSelectedSaleForModal(null);

      await supabase.from('audit_log').insert({
        action: 'Venda editada',
        detail: `${data.client_name} - ${formatCurrency(calculatedLtv)}`,
        type: 'update'
      });
    } catch (error) {
      console.error('Sale update error:', error);
      addToast('error', 'Erro ao atualizar', 'Não foi possível atualizar a venda.');
    }
  };

  const handleEditCompany = (company: Company) => {
    setEditingCompany(company);
    setIsEditModalOpen(true);
  };

  const handleDeleteCompany = (company: Company) => {
    if (!isAdmin) {
      addToast('error', 'Acesso negado', 'Apenas administradores podem excluir empresas.');
      return;
    }
    setDeletingCompany(company);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteCompany = async () => {
    if (!deletingCompany) return;

    try {
      const { error } = await supabase.from('clients').delete().eq('id', deletingCompany.id);

      if (error) throw error;
      
      setCompanies(prev => prev.filter(c => c.id !== deletingCompany.id));
      addToast('success', 'Empresa excluída', `"${deletingCompany.name}" foi excluída com sucesso.`);
      setIsDeleteModalOpen(false);
      
      await supabase.from('audit_log').insert({
        action: 'Empresa excluída',
        detail: `"${deletingCompany.name}" foi removida do sistema.`,
        type: 'delete'
      });
      
      setDeletingCompany(null);
    } catch (error) {
      addToast('error', 'Erro ao excluir', 'Ocorreu um erro ao tentar excluir a empresa.');
    }
  };

  const handleDeleteCampaign = (campaign: Campaign) => {
    if (!canManageSelectedBranch) {
      addToast('error', 'Acesso negado', 'Você não tem permissão para excluir campanhas nesta filial.');
      return;
    }
    setDeletingCampaign(campaign);
    setIsDeleteCampaignModalOpen(true);
  };

  const confirmDeleteCampaign = async () => {
    if (!deletingCampaign || !selectedBranch) return;

    try {
      // Calculate current real-time balance to "crave" (fix) it
      const newCampaigns = (campaigns || []).filter(c => c && c.id !== deletingCampaign.id);
      const newDailyRate = calculateDailySpend(newCampaigns.filter(c => c && c.branch_id === selectedBranch.id));

      // Update branch daily_expense in DB
      const { data: updatedBranch, error } = await supabase
        .from('branches')
        .update({ 
          daily_expense: newDailyRate,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedBranch.id)
        .select()
        .single();

      if (error) throw error;

      if (deletingCampaign.meta_campaign_id) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            await axios.post(`/api/facebook/delete-campaign`, {
              campaignId: deletingCampaign.meta_campaign_id,
              branchId: selectedBranch.id
            }, {
              headers: { Authorization: `Bearer ${session.access_token}` }
            });
          }
        } catch (err: any) {
          console.error("Error deleting meta campaign:", err);
          addToast('error', 'Erro no Meta Ads', 'Não foi possível excluir a campanha no Facebook.');
          return; // Stop deletion if Meta fails
        }
      }

      const { error: deleteError } = await supabase.from('campaigns').delete().eq('id', deletingCampaign.id);

      if (deleteError) throw deleteError;
      
      setCampaigns(prev => prev.filter(c => c.id !== deletingCampaign.id));
      setBranches(prev => prev.map(b => b.id === selectedBranch.id ? updatedBranch : b));
      setSelectedBranch(updatedBranch);

      addToast('success', 'Campanha excluída', `"${deletingCampaign.name}" foi excluída com sucesso.`);
      setIsDeleteCampaignModalOpen(false);
      setDeletingCampaign(null);
      
      // Log audit
      await supabase.from('audit_log').insert({
        action: 'Campanha excluída',
        detail: `Campanha "${deletingCampaign.name}" em ${selectedBranch.name}`,
        type: 'delete'
      });
    } catch (error) {
      addToast('error', 'Erro ao excluir', 'Ocorreu um erro ao tentar excluir a campanha.');
    }
  };

  const handleToggleCampaignStatus = async (campaign: Campaign) => {
    if (!canManageSelectedBranch) {
      addToast('error', 'Acesso negado', 'Você não tem permissão para alterar status de campanhas nesta filial.');
      return;
    }
    if (!selectedBranch) return;

    const newStatus = campaign.status === 'paused' ? 'active' : 'paused';
    
    try {
      if (campaign.meta_campaign_id) {
        await axios.post(`/api/facebook/toggle-campaign`, {
          branchId: selectedBranch.id,
          campaignId: campaign.meta_campaign_id,
          status: newStatus
        });
      }

      const newCampaigns = (campaigns || []).map(c => c && c.id === campaign.id ? { ...c, status: newStatus } : c);
      const newDailyRate = calculateDailySpend(newCampaigns.filter(c => c && c.branch_id === selectedBranch.id));

      const { data: updatedBranch, error } = await supabase
        .from('branches')
        .update({ daily_expense: newDailyRate, updated_at: new Date().toISOString() })
        .eq('id', selectedBranch.id)
        .select()
        .single();

      if (error) throw error;
      
      const { error: campError } = await supabase.from('campaigns').update({ status: newStatus }).eq('id', campaign.id);
      if (campError) throw campError;

      setCampaigns(newCampaigns);
      setBranches(prev => prev.map(b => b.id === selectedBranch.id ? updatedBranch : b));
      setSelectedBranch(updatedBranch);

      addToast('success', 'Status alterado', `Campanha ${newStatus === 'active' ? 'ativada' : 'pausada'} no Facebook.`);
    } catch (error: any) {
      console.error('Toggle Campaign Error:', error);
      addToast('error', 'Erro ao alterar status', error.response?.data?.error || error.message);
    }
  };

  const handleEditBranchSubmit = async () => {
    if (!canManageSelectedBranch) {
      addToast('error', 'Acesso negado', 'Você não tem permissão para editar esta filial.');
      return;
    }
    if (!newName.trim()) {
      addToast('warning', 'Campo obrigatório', 'O nome é obrigatório.');
      return;
    }

    if (!selectedBranch) return;

    try {
      const oldBalance = selectedBranch.balance || 0;
      const newBalance = parseFloat(newValue) || 0;
      
      const { data, error } = await supabase.from('branches').update({
        name: newName,
        balance: newBalance,
        budget: newBalance,
        daily_expense: parseFloat(newDailyExpense) || 0,
        whatsapp: newWhatsapp,
        facebook_ad_account_id: newFacebookAdAccountId,
        facebook_access_token: newFacebookAccessToken
      }).eq('id', selectedBranch.id).select().single();
      
      if (error) throw error;

      // Check for recharge
      if (newBalance > oldBalance) {
        const rechargeAmount = newBalance - oldBalance;
        const newNotif = {
          type: 'success' as const,
          title: 'Recarga Efetuada',
          message: `A filial ${selectedBranch.name} foi recarregada com ${formatCurrency(rechargeAmount)}. Novo saldo: ${formatCurrency(newBalance)}.`,
          read: false
        };
        
        const { data: notifData, error: notifError } = await supabase.from('notifications').insert(newNotif).select().single();
        if (!notifError && notifData) {
          setNotifications(prev => [notifData, ...prev]);
          addToast('success', 'Recarga Confirmada', newNotif.message);
        }

        // Log audit with balance info for chart
        await supabase.from('audit_log').insert({
          action: 'Recarga de Saldo',
          detail: `Recarga de ${formatCurrency(rechargeAmount)} para ${selectedBranch.name}. Novo saldo: ${formatCurrency(newBalance)}`,
          type: 'success'
        });
      } else {
        await supabase.from('audit_log').insert({
          action: 'Filial editada',
          detail: `"${newName}"`,
          type: 'update'
        });
      }
      
      setBranches(prev => prev.map(b => b.id === selectedBranch.id ? data : b));
      setSelectedBranch(data);
      addToast('success', 'Filial atualizada', `"${newName}" foi atualizada com sucesso.`);
      setIsEditBranchModalOpen(false);

      await supabase.from('audit_log').insert({
        action: 'Filial atualizada',
        detail: `Dados da filial "${newName}" foram modificados.`,
        type: 'info'
      });
    } catch (error) {
      console.error('Error updating branch:', error);
      addToast('error', 'Erro ao atualizar', 'Ocorreu um erro ao tentar atualizar a filial.');
    }
  };

  const handleUpdateCompany = async (companyData: Company) => {
    if (!isAdmin) {
      addToast('error', 'Acesso negado', 'Apenas administradores podem atualizar empresas.');
      return;
    }
    if (!editingCompany) return;

    try {
      const { error } = await supabase.from('clients').update(companyData).eq('id', editingCompany.id);
      
      if (error) throw error;
      
      setCompanies(prev => prev.map(c => c.id === editingCompany.id ? { ...c, ...companyData } : c));
      addToast('success', 'Empresa atualizada', `"${companyData.name}" foi atualizada com sucesso.`);
      setIsEditModalOpen(false);
      
      await supabase.from('audit_log').insert({
        action: 'Empresa atualizada',
        detail: `Dados de "${companyData.name}" foram modificados.`,
        type: 'info'
      });
      
      setEditingCompany(null);
    } catch (error) {
      console.error('Update company error:', error);
      addToast('error', 'Erro ao atualizar', 'Ocorreu um erro ao tentar atualizar os dados.');
    }
  };

  const handleNewCampaign = async (name: string, purpose: string, spend: number, paymentSource: 'company' | 'consultant') => {
    if (!canManageSelectedBranch) {
      addToast('error', 'Acesso negado', 'Você não tem permissão para criar campanhas nesta filial.');
      return;
    }
    if (!selectedBranch) return;
    try {
      const isMetaCampaign = !!selectedBranch.facebook_ad_account_id;
      const initialStatus = isMetaCampaign ? 'paused' : 'active';
      
      const newCampaigns = [...campaigns, { spend, status: initialStatus, payment_source: paymentSource, branch_id: selectedBranch.id }];
      const newDailyRate = calculateDailySpend(newCampaigns.filter(c => (c as any).branch_id === selectedBranch.id));

      // Update branch daily_expense in DB
      const { data: updatedBranch, error } = await supabase
        .from('branches')
        .update({ 
          daily_expense: newDailyRate,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedBranch.id)
        .select()
        .single();

      if (error) throw error;

      let metaCampaignId = null;
      if (selectedBranch.facebook_ad_account_id) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            const objectiveMap: Record<string, string> = {
              'leads': 'OUTCOME_LEADS',
              'vendas': 'OUTCOME_SALES',
              'marca': 'OUTCOME_AWARENESS'
            };
            const metaObjective = objectiveMap[purpose] || 'OUTCOME_TRAFFIC';
            
            const response = await axios.post(`/api/facebook/create-campaign`, {
              branchId: selectedBranch.id,
              name,
              objective: metaObjective,
              dailyBudget: Math.round(spend * 100)
            }, {
              headers: { Authorization: `Bearer ${session.access_token}` }
            });
            metaCampaignId = response.data.id;
          }
        } catch (err: any) {
          console.error("Error creating meta campaign:", err);
          addToast('error', 'Erro no Meta Ads', 'Não foi possível criar a campanha no Facebook.');
          return; // Stop creation if Meta fails
        }
      }

      const { data: insertedCampaign, error: insertError } = await supabase.from('campaigns').insert({
        branch_id: selectedBranch.id,
        meta_campaign_id: metaCampaignId,
        name,
        purpose,
        spend,
        payment_source: paymentSource,
        status: metaCampaignId ? 'paused' : 'active' // Meta creates as PAUSED by default
      }).select().single();
      
      if (insertError) throw insertError;
      
      setCampaigns(prev => [...prev, insertedCampaign]);
      setBranches(prev => prev.map(b => b.id === selectedBranch.id ? updatedBranch : b));
      setSelectedBranch(updatedBranch);

      setIsNewCampaignModalOpen(false);
      addToast('success', 'Campanha criada', `"${name}" foi adicionada com sucesso.`);
      
      await supabase.from('audit_log').insert({
        action: 'Campanha criada',
        detail: `Campanha "${name}" em ${selectedBranch.name}`,
        type: 'success'
      });
    } catch (error) {
      console.error('Campaign creation error:', error);
      addToast('error', 'Erro ao criar campanha', 'Ocorreu um erro ao tentar criar a campanha.');
    }
  };

  const handleUpdateCampaign = async (id: number, name: string, purpose: string, spend: number) => {
    if (!selectedBranch) return;
    
    try {
      const campaign = campaigns.find(c => c.id === id);
      if (!campaign) return;

      // 1. Update in Meta if it's a Meta campaign
      if (campaign.meta_campaign_id) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            await axios.post(`/api/facebook/update-campaign`, {
              campaignId: campaign.meta_campaign_id,
              branchId: selectedBranch.id,
              name,
              dailyBudget: Math.round(spend * 100)
            }, {
              headers: { Authorization: `Bearer ${session.access_token}` }
            });
          }
        } catch (err: any) {
          console.error("Error updating meta campaign:", err);
          addToast('error', 'Erro no Meta Ads', 'Não foi possível atualizar no Facebook, mas os dados locais podem ser salvos.');
        }
      }

      // 2. Update in Supabase
      const { data: updatedCampaign, error: campaignError } = await supabase
        .from('campaigns')
        .update({ name, purpose, spend })
        .eq('id', id)
        .select()
        .single();

      if (campaignError) throw campaignError;

      // 3. Update branch daily rate
      const updatedCampaigns = campaigns.map(c => c.id === id ? updatedCampaign : c);
      const newDailyRate = calculateDailySpend(updatedCampaigns.filter(c => c.branch_id === selectedBranch.id));

      const { data: updatedBranch, error: branchError } = await supabase
        .from('branches')
        .update({ daily_expense: newDailyRate })
        .eq('id', selectedBranch.id)
        .select()
        .single();

      if (branchError) throw branchError;

      // 4. Update state
      setCampaigns(updatedCampaigns);
      setBranches(prev => prev.map(b => b.id === selectedBranch.id ? updatedBranch : b));
      setSelectedBranch(updatedBranch);

      setIsEditCampaignModalOpen(false);
      addToast('success', 'Campanha atualizada', `"${name}" atualizada com sucesso.`);

      await supabase.from('audit_log').insert({
        action: 'Campanha editada',
        detail: `"${name}" em ${selectedBranch.name} (Gasto: ${formatCurrency(spend)})`,
        type: 'update'
      });
    } catch (error) {
      console.error('Update campaign error:', error);
      addToast('error', 'Erro ao atualizar', 'Ocorreu um erro ao salvar as alterações.');
    }
  };

  const generateInsights = async () => {
    if (!selectedBranch) {
      addToast('warning', 'Selecione uma filial', 'Selecione uma filial para gerar insights específicos.');
      return;
    }
    
    setIsChatWidgetOpen(true);
  };

  const getPageContextData = () => {
    let context = "";
    let dataSummary = "";

    if (location.pathname === '/eagle') {
      context = "Visão de Águia (Dashboard Geral)";
      const totalInvestment = (campaigns || []).reduce((acc, c) => acc + (c.spend || 0), 0);
      const totalSales = (sales || []).length;
      const totalRoi = (sales || []).length > 0 ? (sales || []).reduce((acc, s) => acc + (s.roi || 0), 0) / (sales || []).length : 0;
      dataSummary = `
        - Total de Empresas: ${(companies || []).length}
        - Total de Filiais: ${(branches || []).length}
        - Investimento Diário Total: ${formatCurrency(totalInvestment)}
        - Total de Vendas (Geral): ${totalSales}
        - ROI Médio Consolidado: ${formatPercent(totalRoi)}
      `;
    } else if (location.pathname.includes('/branches/')) {
      context = `Detalhes da Filial: ${selectedBranch?.name}`;
      const branchSales = (sales || []).filter(s => s.branch_id === selectedBranch?.id);
      const branchCampaigns = (campaigns || []).filter(c => c.branch_id === selectedBranch?.id);
      const dailySpend = calculateDailySpend(branchCampaigns);
      const roi = branchSales.length > 0 ? branchSales.reduce((acc, s) => acc + (s.roi || 0), 0) / branchSales.length : 0;
      dataSummary = `
        - Filial: ${selectedBranch?.name}
        - Saldo Atual: ${formatCurrency(selectedBranch?.balance || 0)}
        - Investimento Diário: ${formatCurrency(dailySpend)}
        - Total de Vendas: ${branchSales.length}
        - ROI Médio: ${formatPercent(roi)}
        - Campanhas: ${branchCampaigns.length}
      `;
    } else if (location.pathname.includes('/companies/')) {
      context = `Detalhes da Empresa: ${selectedCompany?.name}`;
      const branchesForCompany = (branches || []).filter(b => b && b.company_id === selectedCompany?.id);
      const salesForCompany = (sales || []).filter(s => s && branchesForCompany.some(b => b && b.id === s.branch_id));
      const totalDailyInvestment = (campaigns || []).filter(c => c && branchesForCompany.some(b => b && b.id === c.branch_id)).reduce((acc, c) => acc + (c.spend || 0), 0);
      const totalRoi = salesForCompany.length > 0 ? salesForCompany.reduce((acc, s) => acc + (s.roi || 0), 0) / salesForCompany.length : 0;
      dataSummary = `
        - Empresa: ${selectedCompany?.name}
        - Total de Filiais: ${branchesForCompany.length}
        - Investimento Diário: ${formatCurrency(totalDailyInvestment)}
        - Total de Vendas: ${salesForCompany.length}
        - ROI Médio: ${formatPercent(totalRoi)}
      `;
    } else if (location.pathname === '/reports') {
      context = "Módulo de Relatórios";
      dataSummary = `O usuário está na tela de geração de relatórios para as filiais.`;
    } else if (location.pathname === '/history') {
      context = "Histórico de Auditoria";
      dataSummary = `O usuário está revisando os logs de auditoria do sistema.`;
    } else {
      context = "Dashboard Principal / Empresas";
      dataSummary = `
        - Total de Empresas: ${(companies || []).length}
        - Total de Filiais: ${(branches || []).length}
      `;
    }
    return { context, dataSummary };
  };

  const handleInsightsClick = () => {
    setIsChatWidgetOpen(true);
  };

  // Render Views
  const renderCompanies = () => (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPI 
          label="Total em Saldo" 
          value={formatCurrency((isAdmin ? (branches || []) : (myBranches || [])).reduce((acc, b) => acc + (b?.balance || 0), 0))} 
          icon={Wallet} 
          trend={12}
          trendLabel="vs mês anterior"
          
        />
        <KPI 
          label="ROI Médio" 
          value="245%" 
          icon={TrendingUp} 
          trend={5}
          trendLabel="vs mês anterior"
          
        />
        <KPI 
          label="Investimento Diário" 
          value={formatCurrency((campaigns || []).reduce((acc, c) => acc + (c.spend || 0), 0))} 
          icon={DollarSign} 
          
        />
        <KPI 
          label="Novas Vendas" 
          value={(sales || []).length} 
          icon={Users} 
          trend={-2}
          trendLabel="vs ontem"
          
        />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="text-lg font-bold tracking-tight text-foreground uppercase tracking-widest">Suas Empresas</h3>
        <div className="flex items-center gap-2 p-1 bg-muted rounded-2xl border border-border overflow-x-auto no-scrollbar max-w-full">
          {['all', 'association', 'direct_sales'].map((type) => (
            <button
              key={type}
              onClick={() => setCompanyFilter(type as any)}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                companyFilter === type 
                  ? "bg-[var(--surface)] text-primary dark:text-black shadow-lg shadow-primary/10" 
                  : "text-muted-foreground hover:text-primary"
              )}
            >
              {type === 'all' ? 'Todas' : type === 'association' ? 'Associação' : 'Venda Direta'}
            </button>
          ))}
        </div>
      </div>

      {settings.cardLayout === 'expand' ? (
        <ExpandableLayout
          items={companies ? companies.filter(c => c && (companyFilter === 'all' || c.type === companyFilter)) : []}
          keyExtractor={(c) => c?.id}
          renderItem={(company, isExpanded) => (
            <Card 
              onClick={() => handleSelectCompany(company)} 
               
              isExpanded={isExpanded}
              layout="expand"
              hoverable={false}
            >
              <div className="flex flex-col h-full justify-between p-2">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden shrink-0">
                    {company.logo ? (
                      <img src={company.logo} alt={company.name} className="w-full h-full object-cover" />
                    ) : (
                      <Building2 className="text-primary" size={24} />
                    )}
                  </div>
                  {isExpanded && (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="overflow-hidden"
                    >
                      <h4 className="font-black text-lg text-foreground truncate">{company.name}</h4>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Desde {company.created_at ? new Date(company.created_at).toLocaleDateString() : '-'}</p>
                    </motion.div>
                  )}
                </div>

                {isExpanded && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-2 gap-4 mt-4"
                  >
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Budget</span>
                      <p className="font-black text-foreground text-sm">{formatCurrency(company.monthly_budget)}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Filiais</span>
                      <p className="font-black text-foreground text-sm">{(branches || []).filter(b => b && b.company_id === company.id).length}</p>
                    </div>
                  </motion.div>
                )}
              </div>
            </Card>
          )}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="companies-grid">
          {companies && companies.length > 0 ? companies.filter(c => c && (companyFilter === 'all' || c.type === companyFilter)).map((company) => (
            <InView key={company.id} triggerOnce={true} threshold={0.1}>
              {({ inView, ref }) => (
                <motion.div
                  ref={ref}
                  initial={{ opacity: 0, y: 20 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="min-h-[200px]"
                >
                  <Card onClick={() => handleSelectCompany(company)} >
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/5 dark:bg-primary/5 border border-primary/10 flex items-center justify-center overflow-hidden">
                    {company.logo ? (
                      <img src={company.logo} alt={company.name} className="w-full h-full object-cover" />
                    ) : (
                      <Building2 className="text-primary" size={24} />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-lg text-foreground">{company.name}</h4>
                    <p className="text-xs text-muted-foreground font-medium">Cadastrada em {company.created_at ? new Date(company.created_at).toLocaleDateString() : '-'}</p>
                  </div>
                </div>
                <Badge variant="success">Ativa</Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-3 rounded-xl bg-primary/5 dark:bg-primary/10 border border-primary/10">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Budget Mensal</p>
                  <p className="font-bold text-sm text-foreground">{formatCurrency(company.monthly_budget)}</p>
                </div>
                <div className="p-3 rounded-xl bg-primary/5 dark:bg-primary/10 border border-primary/10">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Filiais</p>
                  <p className="font-bold text-sm text-foreground">{(branches || []).filter(b => b && b.company_id === company.id).length}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border">
  
                <button className="text-primary text-xs font-bold flex items-center gap-1 hover:underline">
                  Gerenciar <ArrowRight size={14} />
                </button>
                <div className="flex items-center">
                  <button onClick={(e) => { e.stopPropagation(); handleEditCompany(company); }} className="p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteCompany(company); }} className="p-2 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition-all">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
                  </Card>
                </motion.div>
              )}
            </InView>
          )) : (
            <div className="col-span-full text-center py-12">
              <Building2 className="mx-auto text-muted-foreground/20 mb-4" size={48} />
              <p className="text-muted-foreground font-bold uppercase tracking-widest">Nenhuma empresa encontrada</p>
            </div>
          )}
        </div>
      )}

        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="border-2 border-dashed border-border rounded-[2rem] p-6 flex flex-col items-center justify-center gap-3 text-muted-foreground hover:border-primary/40 hover:text-primary transition-all group min-h-[200px] bg-primary/5 dark:bg-primary/5"
        >
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform border border-primary/20">
            <Plus size={24} />
          </div>
          <span className="font-bold text-sm uppercase tracking-widest">Adicionar Empresa</span>
        </button>
      </div>
    );

  // Branches, campaigns, and sales are now fetched globally in TrafficFlowContext.

  // Fetch campaigns and sales when branch selected (no longer needed as they are fetched by company)
  // useEffect(() => {
  //   if (selectedBranch) {
  //     Promise.all([
  //       supabase.from('campaigns').select('*').eq('branch_id', selectedBranch.id),
  //       supabase.from('sales').select('*').eq('branch_id', selectedBranch.id)
  //     ]).then(([cRes, sRes]) => {
  //       if (cRes.error) console.error('Error fetching campaigns:', cRes.error);
  //       else setCampaigns(cRes.data || []);
  //       if (sRes.error) console.error('Error fetching sales:', sRes.error);
  //       else setSales(sRes.data || []);
  //     });
  //   }
  // }, [selectedBranch]);

  useEffect(() => {
    const interval = setInterval(() => {
      // Force re-render to update real-time balances
      setBranches(prev => [...prev]);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectCompany = (company: Company) => {
    setSelectedCompany(company);
    setView('company');
    if (company) navigate(`/companies/${company.id}`);
  };

  const handleSelectBranch = (branch: Branch) => {
    setSelectedBranch(branch);
    if (selectedCompany && branch) {
      navigate(`/companies/${selectedCompany.id}/branches/${branch.id}`);
    } else if (branch) {
      navigate(`/companies/${branch.company_id}/branches/${branch.id}`);
    }
  };

  const handleAddSubmit = async () => {
    if (!newName.trim()) {
      addToast('warning', 'Campo obrigatório', 'O nome é obrigatório.');
      return;
    }

    try {
      if (currentView === 'companies') {
        const { data, error } = await supabase.from('clients').insert({
          name: newName,
          monthly_budget: parseFloat(newValue) || 0,
          type: newCompanyType,
          logo: newLogo
        }).select().single();
        
        if (error) throw error;
        
        setCompanies(prev => [...prev, data]);
        addToast('success', 'Empresa criada', `"${newName}" foi adicionada com sucesso.`);
        setIsAddModalOpen(false);
        
        await supabase.from('audit_log').insert({
          action: 'Empresa criada',
          detail: `"${newName}"`,
          type: 'success'
        });
      } else if (currentView === 'company' && selectedCompany) {
        const { data, error } = await supabase.from('branches').insert({
          company_id: selectedCompany.id,
          name: newName,
          balance: parseFloat(newValue) || 0,
          budget: parseFloat(newValue) || 0,
          daily_expense: parseFloat(newDailyExpense) || 0,
          whatsapp: newWhatsapp,
          facebook_ad_account_id: newFacebookAdAccountId,
          facebook_access_token: newFacebookAccessToken,
          created_at: new Date().toISOString()
        }).select().single();
        
        if (error) throw error;
        
        setBranches(prev => [...prev, data]);
        await fetchData();
        addToast('success', 'Filial criada', `"${newName}" foi adicionada com sucesso.`);
        setIsAddBranchModalOpen(false);

        await supabase.from('audit_log').insert({
          action: 'Filial criada',
          detail: `"${newName}" em "${selectedCompany.name}"`,
          type: 'success'
        });
      }
      setIsAddModalOpen(false);
      setIsAddBranchModalOpen(false);
      setNewName('');
      setNewValue('');
      setNewDailyExpense('');
      setNewLogo('');
    } catch (error) {
      console.error('Save error:', error);
      addToast('error', 'Erro ao salvar', 'Ocorreu um erro ao tentar salvar os dados. Verifique sua conexão.');
    }
  };

  const calculateRealTimeBalance = (branch: Branch) => {
    return branch.balance || 0;
  };



  const renderCompany = () => {
    if (!selectedCompany) return null;

    const branchesForCompany = (branches || []).filter(b => b && b.company_id === selectedCompany.id);
    const salesForCompany = (sales || []).filter(s => s && branchesForCompany.some(b => b && b.id === s.branch_id));
    const totalBalance = branchesForCompany.reduce((acc, b) => acc + calculateRealTimeBalance(b), 0);
    const totalDailyInvestment = (campaigns || []).filter(c => c && branchesForCompany.some(b => b && b.id === c.branch_id)).reduce((acc, c) => acc + (c.spend || 0), 0);
    const totalSales = salesForCompany.length;
    const totalRoi = salesForCompany.length > 0 ? salesForCompany.reduce((acc, s) => acc + (s.roi || 0), 0) / salesForCompany.length : 0;

    const sortedBranches = [...branchesForCompany].sort((a, b) => {
      let compareA: any;
      let compareB: any;

      if (branchSortBy === 'name') {
        compareA = (a.name || '').toLowerCase();
        compareB = (b.name || '').toLowerCase();
      } else if (branchSortBy === 'balance') {
        compareA = a.balance || 0;
        compareB = b.balance || 0;
      } else if (branchSortBy === 'daysRemaining') {
        const aDailySpend = calculateDailySpend((campaigns || []).filter(c => c.branch_id === a.id));
        const bDailySpend = calculateDailySpend((campaigns || []).filter(c => c.branch_id === b.id));
        compareA = aDailySpend > 0 ? Math.floor((a.balance || 0) / aDailySpend) : Infinity;
        compareB = bDailySpend > 0 ? Math.floor((b.balance || 0) / bDailySpend) : Infinity;
      } else if (branchSortBy === 'roi') {
        const aSales = (sales || []).filter(s => s.branch_id === a.id);
        const bSales = (sales || []).filter(s => s.branch_id === b.id);
        compareA = aSales.length > 0 ? aSales.reduce((acc, s) => acc + (s.roi || 0), 0) / aSales.length : 0;
        compareB = bSales.length > 0 ? bSales.reduce((acc, s) => acc + (s.roi || 0), 0) / bSales.length : 0;
      }

      if (compareA < compareB) return branchSortOrder === 'asc' ? -1 : 1;
      if (compareA > compareB) return branchSortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">{selectedCompany.name}</h2>
          <button 
            onClick={() => setIsAddBranchModalOpen(true)}
            className="btn-primary flex items-center gap-2 text-xs"
          >
            <Plus size={16} />
            <span>Nova Filial</span>
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPI label="Total de Filiais" value={branchesForCompany.length.toString()} icon={Building2}  />
          <KPI label="Investimento Diário" value={formatCurrency(totalDailyInvestment)} icon={DollarSign}  />
          <KPI label="ROI Consolidado" value={formatPercent(totalRoi)} icon={TrendingUp}  />
          <KPI label="Saldo Total" value={formatCurrency(totalBalance)} icon={Wallet}  />
        </div>



        <div className="space-y-4">
          <h3 className="text-lg font-bold tracking-tight">Top 3 Filiais</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...branchesForCompany]
              .sort((a, b) => {
                const aSales = (sales || []).filter(s => s && s.branch_id === a.id).length;
                const bSales = (sales || []).filter(s => s && s.branch_id === b.id).length;
                if (aSales !== bSales) return bSales - aSales;
                const aRoi = aSales > 0 ? (sales || []).filter(s => s && s.branch_id === a.id).reduce((acc, s) => acc + (s.roi || 0), 0) / aSales : 0;
                const bRoi = bSales > 0 ? (sales || []).filter(s => s && s.branch_id === b.id).reduce((acc, s) => acc + (s.roi || 0), 0) / bSales : 0;
                return bRoi - aRoi;
              })
              .slice(0, 3)
              .map(branch => (
                <Tooltip
                  key={branch.id}
                  content={
                    <div className="space-y-1">
                      <p><span className="text-primary font-bold">Saldo:</span> {formatCurrency(branch.balance || 0)}</p>
                      <p><span className="text-primary font-bold">WhatsApp:</span> {branch.whatsapp || '-'}</p>
                    </div>
                  }
                >
                  <Card 
                    className="bg-muted border-border cursor-pointer"
                    onClick={() => handleSelectBranch(branch)}
                    
                  >
                    <h4 className="font-bold text-foreground">{branch.name}</h4>
                    <p className="text-sm text-muted-foreground">Vendas: {(sales || []).filter(s => s && s.branch_id === branch.id).length}</p>
                    <p className="text-sm text-muted-foreground">ROI: {formatPercent(((sales || []).filter(s => s && s.branch_id === branch.id).length > 0) ? ((sales || []).filter(s => s && s.branch_id === branch.id).reduce((acc, s) => acc + (s.roi || 0), 0) / (sales || []).filter(s => s && s.branch_id === branch.id).length) : 0)}</p>
                  </Card>
                </Tooltip>
              ))}
          </div>
        </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h3 className="text-xl font-bold tracking-tight">Filiais de {selectedCompany?.name}</h3>
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <input 
                type="text"
                placeholder="Buscar filial..."
                value={branchSearch}
                onChange={(e) => setBranchSearch(e.target.value)}
                className={cn(
                  "w-full rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none transition-all",
                  "bg-surface border border-border text-foreground focus:border-primary"
                )}
              />
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="sort-by" className="text-xs font-bold text-muted-foreground uppercase tracking-widest hidden sm:inline">Ordenar por:</label>
              <select
                id="sort-by"
                value={branchSortBy}
                onChange={(e) => setBranchSortBy(e.target.value as 'name' | 'balance' | 'daysRemaining' | 'roi')}
                className={cn(
                  "rounded-lg px-4 py-2 text-sm focus:outline-none transition-all font-medium appearance-none cursor-pointer",
                  theme === 'light' || theme === 'light-gray'
                    ? "bg-background border border-border text-foreground focus:border-primary"
                    : "bg-white/5 border border-white/10 text-white focus:border-primary"
                )}
              >
                <option value="name" className="bg-[var(--surface)] text-[var(--text-primary)]">Nome</option>
                <option value="balance" className="bg-[var(--surface)] text-[var(--text-primary)]">Saldo</option>
                <option value="daysRemaining" className="bg-[var(--surface)] text-[var(--text-primary)]">Dias Restantes</option>
                <option value="roi" className="bg-[var(--surface)] text-[var(--text-primary)]">ROI</option>
              </select>
            </div>
            <button 
              onClick={() => setBranchSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="p-2 rounded-lg hover:bg-[var(--surface-light)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
            >
              {branchSortOrder === 'asc' ? <ArrowUpAZ size={18} /> : <ArrowDownZA size={18} />}
            </button>
          </div>
        </div>

      <BranchRealTimeDashboard 
        companyId={selectedCompany?.id} 
        onBranchClick={(branch) => {
          if (branch) navigate(`/companies/${selectedCompany?.id}/branches/${branch.id}`);
        }}
        sortBy={branchSortBy}
        sortOrder={branchSortOrder}
        search={branchSearch}
        sales={sales}
        campaigns={campaigns}
        branchesPerPage={settings.branchesPerPage}
      />
    </div>
  );
};

  useEffect(() => {
    setSalesPage(1);
  }, [selectedBranch, settings.salesPerPage]);

  const renderBranch = () => {
    if (!selectedBranch) return null;
    if (!isAdmin && !(myBranches || []).find(b => b && b.id === selectedBranch.id)) return <Navigate to="/" />;
    const branchSales = (sales || []).filter(s => s && s.branch_id === selectedBranch.id);
    const branchCampaigns = (campaigns || []).filter(c => c && c.branch_id === selectedBranch.id);
    const dailySpend = calculateDailySpend(branchCampaigns);
    const roi = branchSales.length > 0 ? branchSales.reduce((acc, s) => acc + (s.roi || 0), 0) / branchSales.length : 0;

    const sortedBranchSales = [...branchSales].sort((a, b) => {
      let valA: number, valB: number;
      if (salesSortBy === 'date') {
        valA = new Date(a.date).getTime();
        valB = new Date(b.date).getTime();
      } else if (salesSortBy === 'value') {
        valA = selectedCompany?.type === 'association' ? (a.membership_fee || 0) + (a.monthly_fee || 0) : (a.sale_value || 0);
        valB = selectedCompany?.type === 'association' ? (b.membership_fee || 0) + (b.monthly_fee || 0) : (b.sale_value || 0);
      } else if (salesSortBy === 'roi') {
        valA = a.roi || 0;
        valB = b.roi || 0;
      } else {
        valA = 0; valB = 0;
      }
      
      if (valA < valB) return salesSortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return salesSortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    const handleSalesSort = (field: 'date' | 'value' | 'roi') => {
      if (salesSortBy === field) {
        setSalesSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
      } else {
        setSalesSortBy(field);
        setSalesSortOrder('desc');
      }
    };

    const salesPerPage = settings.salesPerPage || 10;
    const totalPages = Math.ceil(sortedBranchSales.length / salesPerPage);
    const paginatedSales = sortedBranchSales.slice((salesPage - 1) * salesPerPage, salesPage * salesPerPage);

    return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">{selectedBranch?.name}</h2>
        {canManageSelectedBranch && (
          <button 
            onClick={() => {
              if (selectedBranch) {
                populateBranchEditForm(selectedBranch, {
                  setNewName,
                  setNewValue,
                  setNewDailyExpense,
                  setNewWhatsapp,
                  setNewFacebookAdAccountId,
                  setNewFacebookAccessToken,
                  setIsEditBranchModalOpen
                });
              }
            }} 
            className="btn-secondary flex items-center gap-2 text-xs"
          >
            <SettingsIcon size={16} />
            <span>Editar Filial</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <RealTimeBalanceKPI 
          branch={selectedBranch} 
          campaigns={branchCampaigns} 
          onSync={handleSyncBranchBalance}
          isSyncing={isSyncingBalance}
          onConfigure={() => {
            if (selectedBranch) {
              populateBranchEditForm(selectedBranch, {
                setNewName,
                setNewValue,
                setNewDailyExpense,
                setNewWhatsapp,
                setNewFacebookAdAccountId,
                setNewFacebookAccessToken,
                setIsEditBranchModalOpen
              });
            }
          }}
        />
        <KPI label="ROI Total" value={formatPercent(roi)} icon={TrendingUp} color="sky" animateBorder={false} />
        <KPI label="Gasto Total" value={formatCurrency(dailySpend)} icon={DollarSign} animateBorder={false} />
        <KPI label="Ticket Médio" value={formatCurrency(0)} icon={Users} animateBorder={false} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
            <h3 className="text-xl font-bold tracking-tight text-foreground">Campanhas Ads</h3>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-2 flex-1 sm:flex-none">
                <select 
                  value={campaignStatusFilter}
                  onChange={(e) => setCampaignStatusFilter(e.target.value as any)}
                  className="bg-surface border border-border rounded-xl px-4 py-2 text-sm font-bold focus:outline-none focus:border-primary transition-all w-full"
                >
                  <option value="all">Todas as Campanhas</option>
                  <option value="active">Apenas Ativas</option>
                  <option value="paused">Apenas Pausadas</option>
                </select>
              </div>
              {canManageSelectedBranch && (
                <button 
                  onClick={() => setIsNewCampaignModalOpen(true)} 
                  className="btn-primary flex items-center gap-2 h-10 px-4 min-w-fit active:scale-95 transition-transform"
                >
                  <Plus size={18} />
                  <span className="font-bold">Nova</span>
                </button>
              )}
            </div>
          </div>
          
          <div className="space-y-4">
            {/* Desktop Table - Hidden on Mobile */}
            <div className="hidden md:block">
              <Card className="p-0 overflow-hidden" animateBorder={false}>
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-muted border-b border-border">
                      <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Campanha</th>
                      <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Propósito</th>
                      <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Gasto Diário</th>
                      <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Status</th>
                      <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px] text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {branchCampaigns.filter(c => campaignStatusFilter === 'all' || c.status === campaignStatusFilter).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground italic">Nenhuma campanha encontrada</td>
                      </tr>
                    ) : (
                      branchCampaigns
                        .filter(c => campaignStatusFilter === 'all' || c.status === campaignStatusFilter)
                        .map(c => (
                        <motion.tr 
                          key={c.id} 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className={cn(
                            "group transition-all cursor-pointer border-l-4",
                            c.status === 'paused' ? "border-transparent bg-muted/20 opacity-70" : "border-emerald-500 hover:bg-muted"
                          )}
                          onClick={() => { setSelectedCampaignForModal(c); setIsEditCampaignModalOpen(true); }}
                        >
                          <td className="px-6 py-4 font-bold text-foreground">{c.name}</td>
                          <td className="px-6 py-4"><Badge variant={c.status === 'paused' ? 'neutral' : 'primary'}>{c.purpose}</Badge></td>
                          <td className="px-6 py-4 font-medium text-foreground">{formatCurrency(c.spend)}</td>
                          <td className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest">
                            <span className={c.status === 'paused' ? "text-muted-foreground" : "text-emerald-500 animate-pulse"}>
                              {c.status === 'paused' ? '● Pausada' : '● Ativa'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end items-center gap-4">
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleToggleCampaignStatus(c); }}
                                className={cn("relative inline-flex h-6 w-11 items-center rounded-full transition-colors", c.status === 'paused' ? "bg-muted" : "bg-emerald-500")}
                              >
                                <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white transition-transform", c.status === 'paused' ? "translate-x-1" : "translate-x-6")} />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </tbody>
                </table>
              </Card>
            </div>

            {/* Mobile Card View - Shown on Mobile */}
            <div className="md:hidden space-y-3 pb-4">
              {branchCampaigns.filter(c => campaignStatusFilter === 'all' || c.status === campaignStatusFilter).length === 0 ? (
                <div className="p-8 text-center text-muted-foreground italic bg-surface/50 rounded-2xl border border-dashed border-border">
                  Nenhuma campanha encontrada
                </div>
              ) : (
                branchCampaigns
                  .filter(c => campaignStatusFilter === 'all' || c.status === campaignStatusFilter)
                  .map(c => (
                  <motion.div 
                    key={c.id}
                    className={cn(
                      "p-4 rounded-2xl border bg-surface/50 flex flex-col gap-4 relative overflow-hidden transition-all active:scale-[0.98]",
                      c.status === 'paused' ? "border-border/50 opacity-60" : "border-emerald-500/30 bg-emerald-500/5 shadow-sm"
                    )}
                    onClick={() => { setSelectedCampaignForModal(c); setIsEditCampaignModalOpen(true); }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-foreground leading-tight">{c.name}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={c.status === 'paused' ? 'neutral' : 'primary'} className="text-[9px] px-1.5">{c.purpose}</Badge>
                          <span className="text-[10px] font-bold text-muted-foreground tracking-widest">{formatCurrency(c.spend)}/dia</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-3">
                        {/* Mobile Toggle - Huge touch target */}
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleToggleCampaignStatus(c); }}
                          className={cn(
                            "relative inline-flex h-10 w-16 items-center rounded-full transition-colors active:scale-90",
                            c.status === 'paused' ? "bg-muted/80" : "bg-emerald-500"
                          )}
                        >
                          <span className={cn(
                            "inline-block h-8 w-8 transform rounded-full bg-white shadow-md transition-transform",
                            c.status === 'paused' ? "translate-x-1" : "translate-x-7"
                          )} />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-border/20 pt-3">
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-[0.15em]",
                        c.status === 'paused' ? "text-muted-foreground" : "text-emerald-500"
                      )}>
                        {c.status === 'paused' ? 'Pausada no Meta' : 'Rodando Agora'}
                      </span>
                      <div className="flex items-center gap-2">
                        <button className="p-2 text-primary bg-primary/10 rounded-lg"><Edit2 size={14} /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteCampaign(c); }} className="p-2 text-rose-500 bg-rose-500/10 rounded-lg"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>

          <Card className="p-6" >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold tracking-tight uppercase tracking-widest text-foreground">Evolução do Saldo</h3>
              <Badge variant="primary">Histórico</Badge>
            </div>
            <BalanceEvolutionChart 
              branchId={selectedBranch?.id} 
              auditLogs={auditLogs} 
              currentBalance={selectedBranch?.balance || 0}
            />
          </Card>

          <div className="flex items-center justify-between pt-4">
            <h3 className="text-lg font-bold tracking-tight">Vendas Recentes</h3>
            <button onClick={() => setIsRegisterSaleModalOpen(true)} className="btn-secondary flex items-center gap-2 text-xs">
              <Plus size={16} />
              <span>{selectedCompany?.type === 'association' ? 'Registrar Adesão' : 'Registrar Venda'}</span>
            </button>
          </div>

          <Card className="p-0 overflow-hidden" >
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-muted border-b border-border">
                  <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Cliente</th>
                  <th 
                    className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px] cursor-pointer hover:text-primary transition-colors"
                    onClick={() => handleSalesSort('date')}
                  >
                    <div className="flex items-center gap-1">
                      Data
                      {salesSortBy === 'date' && (
                        <ChevronDown size={12} className={cn("transition-transform", salesSortOrder === 'asc' && "rotate-180")} />
                      )}
                    </div>
                  </th>
                  {selectedCompany?.type === 'association' ? (
                    <>
                      <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Adesão</th>
                      <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Mensalidade</th>
                    </>
                  ) : (
                    <>
                      <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Item</th>
                      <th 
                        className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px] cursor-pointer hover:text-primary transition-colors"
                        onClick={() => handleSalesSort('value')}
                      >
                        <div className="flex items-center gap-1">
                          Valor
                          {salesSortBy === 'value' && (
                            <ChevronDown size={12} className={cn("transition-transform", salesSortOrder === 'asc' && "rotate-180")} />
                          )}
                        </div>
                      </th>
                      <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Parcelas</th>
                    </>
                  )}
                  <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">LTV</th>
                  <th 
                    className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px] cursor-pointer hover:text-primary transition-colors"
                    onClick={() => handleSalesSort('roi')}
                  >
                    <div className="flex items-center gap-1">
                      ROI
                      {salesSortBy === 'roi' && (
                        <ChevronDown size={12} className={cn("transition-transform", salesSortOrder === 'asc' && "rotate-180")} />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px] text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedSales.length === 0 ? (
                  <tr>
                    <td colSpan={selectedCompany?.type === 'association' ? 7 : 8} className="px-6 py-12 text-center text-muted-foreground italic">Nenhuma venda registrada</td>
                  </tr>
                ) : (
                  paginatedSales.map(s => (
                    <tr key={s.id} className="group hover:bg-muted transition-colors">
                      <td className="px-6 py-4 font-bold text-foreground">
                        <Tooltip 
                          content={
                            <div className="space-y-1">
                              <p><span className="text-primary font-bold">Item:</span> {s.item_sold || '-'}</p>
                              <p><span className="text-primary font-bold">Notas:</span> {s.notes || '-'}</p>
                            </div>
                          }
                        >
                          {s.client_name}
                        </Tooltip>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{s.date ? new Date(s.date).toLocaleDateString() : '-'}</td>
                      {selectedCompany?.type === 'association' ? (
                        <>
                          <td className="px-6 py-4 font-medium text-foreground">{formatCurrency(s.membership_fee || 0)}</td>
                          <td className="px-6 py-4 font-medium text-foreground">{formatCurrency(s.monthly_fee || 0)}</td>
                        </>
                      ) : (
                        <>
                          <td className="px-6 py-4 font-medium text-foreground">{s.item_sold}</td>
                          <td className="px-6 py-4 font-medium text-foreground">{formatCurrency(s.sale_value || 0)}</td>
                          <td className="px-6 py-4 font-medium text-foreground">{s.installments}x de {formatCurrency(s.installment_value || 0)}</td>
                        </>
                      )}
                      <td className="px-6 py-4 font-black text-primary">{formatCurrency(s.total_ltv || 0)}</td>
                      <td className="px-6 py-4">
                        <span className={cn("font-bold", s.roi >= 0 ? "text-primary dark:text-primary" : "text-rose-500 dark:text-rose-400")}>
                          {s.roi}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          <button 
                            onClick={() => openEditSaleModal(s)}
                            className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-all"
                            title="Editar"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            onClick={() => handleDeleteSale(s)}
                            className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-400 transition-all"
                            title="Excluir"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Card>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-4">
              <button 
                onClick={() => setSalesPage(prev => Math.max(1, prev - 1))}
                disabled={salesPage === 1}
                className="p-2 rounded-lg hover:bg-primary/10 text-primary disabled:opacity-30 transition-all"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                Página {salesPage} de {totalPages}
              </span>
              <button 
                onClick={() => setSalesPage(prev => Math.min(totalPages, prev + 1))}
                disabled={salesPage === totalPages}
                className="p-2 rounded-lg hover:bg-primary/10 text-primary disabled:opacity-30 transition-all"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}

          <Card className="p-6 mt-8" >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold tracking-tight uppercase tracking-widest text-foreground">Evolução do Saldo</h3>
              <Badge variant="primary">Histórico</Badge>
            </div>
            <BalanceEvolutionChart 
              branchId={selectedBranch?.id} 
              auditLogs={auditLogs} 
              currentBalance={selectedBranch?.balance || 0}
            />
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/10 border-primary/20 shadow-[0_0_30px_rgba(0,212,255,0.1)]" >
            <h4 className="font-bold text-lg mb-4 flex items-center gap-2 text-foreground uppercase tracking-widest">
              <Clock size={20} className="text-primary" />
              Previsão de ROI
            </h4>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed font-medium">
              Baseado no seu histórico de vendas e investimento, projetamos o retorno para os próximos 30 dias.
            </p>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Cenário Base</span>
                <span className="font-black text-primary">0%</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden border border-border">
                <div className="h-full bg-gradient-to-r from-primary to-primary w-0" />
              </div>
              <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                <span>Conservador</span>
                <span>Otimista</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
    );
  };

  const getBreadcrumb = () => {
    if (location.pathname === '/configuration') {
      return [{ label: 'Sistema' }, { label: 'Configuração' }];
    }
    const items: { label: string; onClick?: () => void }[] = [{ label: 'Empresas', onClick: () => navigate('/companies') }];
    if (selectedCompany) {
      items.push({ label: selectedCompany.name, onClick: () => navigate(`/companies/${selectedCompany.id}`) });
    }
    if (selectedBranch) {
      items.push({ label: selectedBranch.name });
    }
    return items;
  };

  const getTitle = () => {
    if (location.pathname.includes('/branches/')) return selectedBranch?.name || 'Filial';
    if (location.pathname.includes('/companies/')) return selectedCompany?.name || 'Empresa';
    if (location.pathname === '/companies') return 'Dashboard Geral';
    if (location.pathname === '/eagle') return 'Visão de Águia';
    if (location.pathname === '/history') return 'Histórico de Alterações';
    if (location.pathname === '/reports') return 'Relatórios Detalhados';
    if (location.pathname === '/assistant') return 'Assistente IA';
    if (location.pathname === '/notifications') return 'Notificações';
    if (location.pathname === '/configuration') return 'Configuração do Sistema';
    return 'TrafficFlow';
  };

  const handleMarkAllNotificationsAsRead = async () => {
    try {
      const { error } = await supabase.from('notifications').update({ read: true }).eq('read', false);
      if (error) throw error;
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      addToast('success', 'Notificações lidas', 'Todas as notificações foram marcadas como lidas.');
    } catch (error) {
      addToast('error', 'Erro', 'Não foi possível marcar notificações como lidas.');
    }
  };

  const handleMarkNotificationAsRead = async (id: number) => {
    try {
      const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
      if (error) throw error;
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (error) {
      addToast('error', 'Erro', 'Não foi possível marcar a notificação como lida.');
    }
  };

  const handleDeleteNotification = async (id: number) => {
    try {
      const { error } = await supabase.from('notifications').delete().eq('id', id);
      if (error) throw error;
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      addToast('error', 'Erro', 'Não foi possível excluir a notificação.');
    }
  };

  const handleClearAllNotifications = async () => {
    if (!confirm('Tem certeza que deseja limpar todas as notificações?')) return;
    try {
      const { error } = await supabase.from('notifications').delete().neq('id', 0); // Delete all
      if (error) throw error;
      setNotifications([]);
      addToast('success', 'Notificações limpas', 'Todas as notificações foram removidas.');
    } catch (error) {
      addToast('error', 'Erro', 'Não foi possível limpar as notificações.');
    }
  };

  const toggleTheme = () => {
    const themes = ['light', 'dark', 'transparent-glass', 'light-gray', 'slate-theme', 'zinc-theme'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setThemeDirectly(themes[nextIndex]);
  };

  if (loading) return <PremiumLoading />;

  if (location.pathname.startsWith('/fb-connect/') || location.pathname === '/facebook-callback') {
    return (
      <Routes>
        <Route path="/fb-connect/:token" element={<FacebookCallback />} />
        <Route path="/facebook-callback" element={<FacebookCallback />} />
      </Routes>
    );
  }

  if (!isAuthenticated) {
    return (
      <Login 
        onLogin={() => setIsAuthenticated(true)} 
        theme={theme}
      />
    );
  }

  return (
      <>
        <Layout 
        title={getTitle()}
        breadcrumb={getBreadcrumb()}
        onAction={undefined}
        actionLabel={undefined}
        notificationsCount={notifications.filter(n => !n.read).length}
        showNotificationsPopover={showNotificationsPopover}
        setShowNotificationsPopover={setShowNotificationsPopover}
        notifications={notifications}
        onMarkAllAsRead={handleMarkAllNotificationsAsRead}
        onMarkNotificationAsRead={handleMarkNotificationAsRead}
        onDeleteNotification={handleDeleteNotification}
        onClearAllNotifications={handleClearAllNotifications}
        showSettingsPopover={showSettingsPopover}
        setShowSettingsPopover={setShowSettingsPopover}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        userName={userName}
        userAvatar={userAvatar}
        onProfileClick={() => setIsEditProfileModalOpen(true)}
        theme={theme}
        onToggleTheme={setThemeDirectly}
        onLogout={handleLogout}
        isAdmin={isAdmin}
        isReportsOnly={isReportsOnly}
        branches={branches}
      >
        {/* Low Balance Banner */}
        {showCriticalBalanceBanner && criticalNotifications.length > 0 && !isReportsOnly && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-between gap-4 shadow-[0_8px_32px_rgba(244,63,94,0.1)] backdrop-blur-md"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500 flex items-center justify-center text-white shadow-lg shadow-rose-500/30">
                <AlertTriangle size={20} />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-rose-600 dark:text-rose-400">Atenção: Saldo Crítico</h4>
                <p className="text-sm text-rose-600/80 dark:text-rose-400/80">
                  {criticalNotifications.length === 1 
                    ? criticalNotifications[0].message 
                    : `${criticalNotifications.length} filiais estão com saldo crítico.`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  navigate('/notifications');
                  setShowNotificationsPopover(false);
                }}
                className="px-4 py-2 bg-rose-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/20 whitespace-nowrap"
              >
                Ver Detalhes
              </button>
              <button 
                onClick={() => setShowCriticalBalanceBanner(false)}
                className="p-2 text-rose-500 hover:bg-rose-500/20 rounded-xl transition-all"
              >
                <X size={20} />
              </button>
            </div>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
          >
            <Routes>
              <Route path="/companies" element={canNavigateTo('companies') ? renderCompanies() : <Navigate to="/reports" />} />
              <Route path="/companies/:companyId" element={canNavigateTo('companies') ? renderCompany() : <Navigate to="/reports" />} />
              <Route path="/companies/:companyId/branches/:branchId" element={canNavigateTo('companies') ? renderBranch() : <Navigate to="/reports" />} />
              <Route path="/eagle" element={canNavigateTo('eagle') ? <EagleView companies={companies} branches={branches} campaigns={campaigns} sales={sales} /> : <Navigate to="/reports" />} />
              <Route path="/reports" element={<ReportsView branches={isAdmin ? branches : myBranches} companies={companies} campaigns={campaigns} branchesPerPage={settings.branchesPerPage} />} />
              <Route path="/facebook" element={isAdmin ? <MetaView /> : <Navigate to="/" />} />
              <Route path="/facebook/callback" element={isAdmin ? <MetaView /> : <Navigate to="/" />} />
              <Route path="/history" element={canNavigateTo('history') ? <AuditLog logs={auditLogs} /> : <Navigate to="/reports" />} />
              <Route path="/users" element={isAdmin ? <UsersView /> : <Navigate to="/" />} />
              <Route path="/settings" element={isAdmin ? <SettingsView settings={settings} onSave={handleSaveSettings} /> : <Navigate to="/" />} />
              <Route path="/configuration" element={isAdmin ? <ConfigurationView /> : <Navigate to="/" />} />
              <Route path="/notifications" element={
                <div className="max-w-4xl mx-auto">
                  <Card className="p-8" >
                    <div className="flex items-center justify-between mb-8">
                      <h2 className="text-2xl font-bold text-foreground">Todas as Notificações</h2>
                      <button 
                        onClick={handleMarkAllNotificationsAsRead}
                        className="text-xs font-bold text-primary hover:underline uppercase tracking-widest"
                      >
                        Marcar todas como lidas
                      </button>
                    </div>
                    <NotificationsView 
                      notifications={notifications} 
                      onMarkAllAsRead={handleMarkAllNotificationsAsRead} 
                      onMarkAsRead={handleMarkNotificationAsRead}
                      onDelete={handleDeleteNotification}
                      onClearAll={handleClearAllNotifications}
                    />
                  </Card>
                </div>
              } />
              <Route path="/" element={
                <Navigate to={
                  localStorage.getItem('lastSelectedCompanyId') && (companies || []).some(c => c && c.id.toString() === localStorage.getItem('lastSelectedCompanyId'))
                    ? `/companies/${localStorage.getItem('lastSelectedCompanyId')}`
                    : "/companies"
                } />
              } />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </Layout>

      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Nova Empresa"
        footer={
          <>
            <button onClick={() => setIsAddModalOpen(false)} className="btn-secondary">Cancelar</button>
            <button onClick={handleAddSubmit} className="btn-primary">Criar</button>
          </>
        }
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Nome</label>
            <input 
              type="text" 
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ex: Rede de Academias X"
              className={cn(
                "w-full rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all",
                "bg-surface border border-border text-foreground"
              )}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Budget Mensal</label>
            <input 
              type="number" 
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="0.00"
              className={cn(
                "w-full rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all",
                "bg-surface border border-border text-foreground"
              )}
            />
          </div>
          <div className="space-y-3">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Tipo de Empresa</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setNewCompanyType('direct_sales')}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all",
                  newCompanyType === 'direct_sales'
                    ? 'bg-primary/10 border-primary text-primary shadow-[0_0_20px_rgba(0,212,255,0.1)]'
                    : 'bg-surface border-border text-foreground hover:border-primary/30'
                )}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${newCompanyType === 'direct_sales' ? 'bg-primary/20' : 'bg-[var(--surface-light)]'}`}>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <span className="text-xs font-bold uppercase tracking-widest">Venda Direta</span>
              </button>
              <button
                type="button"
                onClick={() => setNewCompanyType('association')}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all",
                  newCompanyType === 'association'
                    ? 'bg-primary/10 border-primary text-primary shadow-[0_0_20px_rgba(0,212,255,0.1)]'
                    : 'bg-surface border-border text-foreground hover:border-primary/30'
                )}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${newCompanyType === 'association' ? 'bg-primary/20' : 'bg-[var(--surface-light)]'}`}>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <span className="text-xs font-bold uppercase tracking-widest">Associação</span>
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">URL do Logo</label>
            <input 
              type="text" 
              value={newLogo}
              onChange={(e) => setNewLogo(e.target.value)}
              placeholder="https://exemplo.com/logo.png"
              className={cn(
                "w-full rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all",
                "bg-surface border border-border text-foreground"
              )}
            />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isEditBranchModalOpen}
        onClose={() => { setIsEditBranchModalOpen(false); setFetchedAdAccounts([]); }}
        title="Editar Filial"
        footer={
          <>
            <button onClick={() => setIsEditBranchModalOpen(false)} className="btn-secondary">Cancelar</button>
            <button onClick={handleEditBranchSubmit} className="btn-primary">Salvar Alterações</button>
          </>
        }
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Nome da Filial</label>
            <input 
              type="text" 
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ex: Unidade Centro"
              className={cn(
                "w-full rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all",
                "bg-surface border border-border text-foreground"
              )}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Saldo (R$)</label>
            <input 
              type="number" 
              value={newValue}
              readOnly
              className={cn(
                "w-full rounded-xl px-4 py-3 focus:outline-none transition-all cursor-not-allowed opacity-60",
                "bg-surface border border-border text-foreground"
              )}
            />
            <p className="text-[10px] text-muted-foreground italic">O saldo é sincronizado automaticamente com a conta de anúncios.</p>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Gasto por Dia (R$)</label>
            <input 
              type="number" 
              value={newDailyExpense}
              onChange={(e) => setNewDailyExpense(e.target.value)}
              placeholder="0.00"
              className={cn(
                "w-full rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all",
                "bg-surface border border-border text-foreground"
              )}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">WhatsApp do Responsável</label>
            <input 
              type="text" 
              value={newWhatsapp}
              onChange={(e) => setNewWhatsapp(e.target.value)}
              placeholder="Ex: 5511999999999"
              className={cn(
                "w-full rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all",
                "bg-surface border border-border text-foreground"
              )}
            />
          </div>

          <div className="pt-4 border-t border-border space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-widest">
              <Facebook size={14} />
              Integração Facebook Ads
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">ID da Conta de Anúncios</label>
                <button 
                  type="button"
                  onClick={() => fetchAdAccounts(newFacebookAccessToken || settings.facebook_access_token || '')}
                  disabled={isFetchingAccounts}
                  className="text-[10px] font-black text-primary hover:underline uppercase tracking-widest flex items-center gap-1"
                >
                  {isFetchingAccounts ? (
                    <RefreshCw size={10} className="animate-spin" />
                  ) : (
                    <Search size={10} />
                  )}
                  {fetchedAdAccounts.length > 0 ? 'Atualizar Lista' : (newFacebookAccessToken ? 'Buscar Contas' : 'Buscar Contas (Master)')}
                </button>
              </div>
              
              {fetchedAdAccounts.length > 0 ? (
                <div className="relative group">
                  <select
                    value={newFacebookAdAccountId}
                    onChange={(e) => setNewFacebookAdAccountId(e.target.value)}
                    className={cn(
                      "w-full rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all appearance-none",
                      "bg-surface border border-border text-foreground"
                    )}
                  >
                    <option value="">Selecione uma conta...</option>
                    {fetchedAdAccounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} {acc.balance ? `- ${acc.balance}` : ''} ({acc.id})
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-muted-foreground">
                    <ChevronDown size={16} />
                  </div>
                </div>
              ) : (
                <input 
                  type="text" 
                  value={newFacebookAdAccountId}
                  onChange={(e) => setNewFacebookAdAccountId(e.target.value)}
                  placeholder="act_123456789"
                  className={cn(
                    "w-full rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all",
                    "bg-surface border border-border text-foreground"
                  )}
                />
              )}
              
              {fetchedAdAccounts.length > 0 && (
                <button 
                  type="button"
                  onClick={() => setFetchedAdAccounts([])}
                  className="text-[9px] font-bold text-muted-foreground hover:text-foreground uppercase tracking-widest"
                >
                  Digitar ID manualmente
                </button>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Access Token (Opcional se usar Master)</label>
              <input 
                type="password" 
                value={newFacebookAccessToken}
                onChange={(e) => setNewFacebookAccessToken(e.target.value)}
                placeholder="EAA..."
                className={cn(
                  "w-full rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all",
                  "bg-surface border border-border text-foreground"
                )}
              />
              <p className="text-[10px] text-muted-foreground">Se deixado em branco, usará o token configurado na integração principal.</p>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isAddBranchModalOpen}
        onClose={() => { setIsAddBranchModalOpen(false); setFetchedAdAccounts([]); }}
        title="Nova Filial"
        footer={
          <>
            <button onClick={() => setIsAddBranchModalOpen(false)} className="btn-secondary">Cancelar</button>
            <button onClick={handleAddSubmit} className="btn-primary">Ativar Filial</button>
          </>
        }
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Nome da Filial</label>
            <input 
              type="text" 
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ex: Unidade Centro"
              className={cn(
                "w-full rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all",
                "bg-surface border border-border text-foreground"
              )}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Saldo Inicial (R$)</label>
            <input 
              type="number" 
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="0.00"
              className={cn(
                "w-full rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all",
                "bg-surface border border-border text-foreground"
              )}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Gasto por Dia (R$)</label>
            <input 
              type="number" 
              value={newDailyExpense}
              onChange={(e) => setNewDailyExpense(e.target.value)}
              placeholder="0.00"
              className={cn(
                "w-full rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all",
                "bg-surface border border-border text-foreground"
              )}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">WhatsApp do Responsável</label>
            <input 
              type="text" 
              value={newWhatsapp}
              onChange={(e) => setNewWhatsapp(e.target.value)}
              placeholder="Ex: 5511999999999"
              className={cn(
                "w-full rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all",
                "bg-surface border border-border text-foreground"
              )}
            />
          </div>

          <div className="pt-4 border-t border-border space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-widest">
              <Facebook size={14} />
              Integração Facebook Ads
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">ID da Conta de Anúncios</label>
                <button 
                  type="button"
                  onClick={() => fetchAdAccounts(newFacebookAccessToken || settings.facebook_access_token || '')}
                  disabled={isFetchingAccounts}
                  className="text-[10px] font-black text-primary hover:underline uppercase tracking-widest flex items-center gap-1"
                >
                  {isFetchingAccounts ? (
                    <RefreshCw size={10} className="animate-spin" />
                  ) : (
                    <Search size={10} />
                  )}
                  {fetchedAdAccounts.length > 0 ? 'Atualizar Lista' : (newFacebookAccessToken ? 'Buscar Contas' : 'Buscar Contas (Master)')}
                </button>
              </div>
              
              {fetchedAdAccounts.length > 0 ? (
                <div className="relative group">
                  <select
                    value={newFacebookAdAccountId}
                    onChange={(e) => setNewFacebookAdAccountId(e.target.value)}
                    className={cn(
                      "w-full rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all appearance-none",
                      "bg-surface border border-border text-foreground"
                    )}
                  >
                    <option value="">Selecione uma conta...</option>
                    {fetchedAdAccounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} {acc.balance ? `- ${acc.balance}` : ''} ({acc.id})
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-muted-foreground">
                    <ChevronDown size={16} />
                  </div>
                </div>
              ) : (
                <input 
                  type="text" 
                  value={newFacebookAdAccountId}
                  onChange={(e) => setNewFacebookAdAccountId(e.target.value)}
                  placeholder="act_123456789"
                  className={cn(
                    "w-full rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all",
                    "bg-surface border border-border text-foreground"
                  )}
                />
              )}
              
              {fetchedAdAccounts.length > 0 && (
                <button 
                  type="button"
                  onClick={() => setFetchedAdAccounts([])}
                  className="text-[9px] font-bold text-muted-foreground hover:text-foreground uppercase tracking-widest"
                >
                  Digitar ID manualmente
                </button>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Access Token (Opcional se usar Master)</label>
              <input 
                type="password" 
                value={newFacebookAccessToken}
                onChange={(e) => setNewFacebookAccessToken(e.target.value)}
                placeholder="EAA..."
                className={cn(
                  "w-full rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all",
                  "bg-surface border border-border text-foreground"
                )}
              />
              <p className="text-[10px] text-muted-foreground">Se deixado em branco, usará o token configurado na integração principal.</p>
            </div>
          </div>
        </div>
      </Modal>

      {selectedBranch && (
        <RegisterSaleModal
          isOpen={isRegisterSaleModalOpen}
          onClose={() => setIsRegisterSaleModalOpen(false)}
          onRegisterSale={handleRegisterSale}
          companyType={selectedCompany?.type || 'direct_sales'}
        />
      )}

      {selectedBranch && (
        <RegisterSaleModal
          isOpen={isEditSaleModalOpen}
          onClose={() => {
            setIsEditSaleModalOpen(false);
            setSelectedSaleForModal(null);
          }}
          onRegisterSale={handleEditSale}
          companyType={selectedCompany?.type || 'direct_sales'}
          editingSale={selectedSaleForModal}
        />
      )}

      {selectedBranch && (
        <NewCampaignModal
          isOpen={isNewCampaignModalOpen}
          onClose={() => setIsNewCampaignModalOpen(false)}
          onNewCampaign={handleNewCampaign}
          companyName={selectedCompany?.name || 'Empresa'}
        />
      )}

      {selectedCampaignForModal && (
        <EditCampaignModal
          isOpen={isEditCampaignModalOpen}
          onClose={() => {
            setIsEditCampaignModalOpen(false);
            setSelectedCampaignForModal(null);
          }}
          campaign={selectedCampaignForModal}
          onUpdateCampaign={handleUpdateCampaign}
        />
      )}

      {editingCompany && (
        <EditCompanyModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          company={editingCompany}
          onUpdateCompany={handleUpdateCompany}
        />
      )}

      {/* Modais de Edição */}

      {/* Modais de Edição */}

      <EditProfileModal
        isOpen={isEditProfileModalOpen}
        onClose={() => setIsEditProfileModalOpen(false)}
        currentName={userName}
        currentAvatar={userAvatar}
        onSave={async (name, avatar) => {
          setUserName(name);
          setUserAvatar(avatar);
          try {
            await supabase.auth.updateUser({
              data: { userName: name, userAvatar: avatar }
            });
            addToast('success', 'Perfil atualizado', 'Seu nome e foto de perfil foram atualizados.');
          } catch (error) {
            console.error('Error updating profile:', error);
            addToast('error', 'Erro', 'Não foi possível salvar o perfil.');
          }
        }}
      />

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirmar Exclusão de Empresa"
        footer={
          <>
            <button onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 rounded-xl text-muted-foreground hover:bg-muted transition-all font-bold text-sm">Cancelar</button>
            <button onClick={confirmDeleteCompany} className="px-4 py-2 rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition-all font-bold text-sm">Excluir Empresa</button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Você tem certeza que deseja excluir a empresa <span className="font-bold text-foreground">"{deletingCompany?.name}"</span>?
          </p>
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
            <p className="text-xs text-rose-600 dark:text-rose-400 font-bold uppercase tracking-widest">Aviso Crítico</p>
            <p className="text-sm text-rose-600/80 dark:text-rose-400/80 mt-1">
              Esta ação excluirá permanentemente a empresa e TODAS as suas filiais, campanhas e registros. Esta ação não pode ser desfeita.
            </p>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isDeleteCampaignModalOpen}
        onClose={() => setIsDeleteCampaignModalOpen(false)}
        title="Confirmar Exclusão de Campanha"
        footer={
          <>
            <button onClick={() => setIsDeleteCampaignModalOpen(false)} className="px-4 py-2 rounded-xl text-muted-foreground hover:bg-muted transition-all font-bold text-sm">Cancelar</button>
            <button onClick={confirmDeleteCampaign} className="px-4 py-2 rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition-all font-bold text-sm">Excluir Campanha</button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Você tem certeza que deseja excluir a campanha <span className="font-bold text-foreground">"{deletingCampaign?.name}"</span>?
          </p>
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
            <p className="text-xs text-rose-600 dark:text-rose-400 font-bold uppercase tracking-widest">Atenção</p>
            <p className="text-sm text-rose-600/80 dark:text-rose-400/80 mt-1">
              Ao excluir esta campanha, o cálculo de gasto diário da filial será recalculado imediatamente. Esta ação não pode ser desfeita.
            </p>
          </div>
        </div>
      </Modal>
      </>
  );
}

