import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { BranchRealTimeDashboard } from './components/BranchRealTimeDashboard';
import { KPI, Card, Badge } from './components/UI';
import { Modal } from './components/Modal';
import { EagleView } from './components/EagleView';
import { ToastContainer, useToasts } from './components/Toast';
import { AuditLog } from './components/AuditLog';
import { SettingsView } from './components/SettingsView';
import { ReportsView } from './components/ReportsView';
import { NotificationsView } from './components/NotificationsView';
import { RegisterSaleModal } from './components/RegisterSaleModal';
import { NewCampaignModal } from './components/NewCampaignModal';
import { EditCompanyModal } from './components/EditCompanyModal';
import { EditProfileModal } from './components/EditProfileModal';
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
  ArrowRight,
  BarChart3,
  Search,
  Filter,
  Sparkles,
  Loader2,
  Settings as SettingsIcon,
  X,
  Calendar,
  DollarSign as DollarSignIcon,
  ArrowUpAZ,
  ArrowDownZA,
  Sun,
  Moon
} from 'lucide-react';
import { formatCurrency, formatPercent, getHealthStatus, cn, calculateDailySpend } from './lib/utils';
import { Company, Branch, Campaign, Sale, AuditEntry, Notification, AppSettings } from './types';
import { motion } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { supabase } from '../supabase';
import { useTrafficFlow } from './context/TrafficFlowContext';

// ... (rest of the file)

type View = 'companies' | 'company' | 'branch' | 'eagle' | 'reports' | 'history' | 'settings';

const RealTimeBalanceKPI = ({ branch, campaigns }: { branch: Branch, campaigns: Campaign[] }) => {
  const [balance, setBalance] = useState(branch.balance || 0);
  const [rechargeInfo, setRechargeInfo] = useState('');
  
  useEffect(() => {
    if (campaigns.length === 0) {
      setBalance(branch.balance || 0);
      setRechargeInfo('Aguardando campanha');
      return;
    }

    const interval = setInterval(() => {
      const referenceDate = branch.updated_at || branch.created_at;
      const startTime = new Date(referenceDate).getTime();
      const elapsedMs = Math.max(0, Date.now() - startTime);
      const dailyRate = calculateDailySpend(campaigns);
      const initialBalance = branch.balance || 0;
      const currentBalance = initialBalance - (elapsedMs * (dailyRate / (24 * 60 * 60 * 1000)));
      setBalance(Math.max(0, currentBalance));

      const daysLeft = dailyRate > 0 ? currentBalance / dailyRate : Infinity;
      if (currentBalance <= 0) {
        setRechargeInfo('⚠️ CAIXA ZERADO');
      } else if (daysLeft === Infinity) {
        setRechargeInfo('Sem gasto diário');
      } else {
        const rechargeDate = new Date(Date.now() + daysLeft * 24 * 60 * 60 * 1000);
        setRechargeInfo(`Recarregar em: ${rechargeDate.toLocaleDateString('pt-BR')} às ${rechargeDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`);
      }
    }, 50);
    
    return () => clearInterval(interval);
  }, [branch, campaigns]);

  return <KPI 
    label="Saldo Atual" 
    value={formatCurrency(balance, 4)} 
    icon={Wallet} 
    trendLabel={rechargeInfo} 
    valueClassName="text-[#00ffcc] [text-shadow:0_0_10px_rgba(0,255,204,0.5)] font-mono"
  />;
};

export default function App() {
  const { 
    companies, 
    branches, 
    campaigns, 
    sales, 
    notifications, 
    auditLogs, 
    settings, 
    loading,
    setSettings,
    setCompanies,
    setBranches,
    setCampaigns,
    setSales,
    setNotifications,
    setAuditLogs
  } = useTrafficFlow();

  const [currentView, setView] = useState<View>('companies');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddBranchModalOpen, setIsAddBranchModalOpen] = useState(false);
  const [newDailyExpense, setNewDailyExpense] = useState('');
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [showNotificationsPopover, setShowNotificationsPopover] = useState(false);
  const [showSettingsPopover, setShowSettingsPopover] = useState(false);
  const [isRegisterSaleModalOpen, setIsRegisterSaleModalOpen] = useState(false);
  const [isNewCampaignModalOpen, setIsNewCampaignModalOpen] = useState(false);
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
  const [branchSortBy, setBranchSortBy] = useState<'name' | 'balance' | 'daysRemaining' | 'roi'>('name');
  const [branchSortOrder, setBranchSortOrder] = useState<'asc' | 'desc'>('asc');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const savedTheme = localStorage.getItem('theme');
    return (savedTheme as 'dark' | 'light') || 'dark';
  });
  
  // Form state
  const [newName, setNewName] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newCompanyType, setNewCompanyType] = useState<'association' | 'direct_sales'>('direct_sales');
  const [newLogo, setNewLogo] = useState('');
  const [newWhatsapp, setNewWhatsapp] = useState('');

  const { toasts, addToast, removeToast } = useToasts();

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
      }
    }
  }, [settings.primaryColor]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'dark' ? 'light' : 'dark'));
  };

  const handleSaveSettings = async (newSettings: AppSettings) => {
    try {
      await Promise.all(
        Object.entries(newSettings).map(async ([key, value]) => {
          const { error } = await supabase.from('settings').upsert({ key, value: String(value) }, { onConflict: 'key' });
          if (error) throw error;
        })
      );
      setSettings(newSettings);
      addToast('success', 'Configurações salvas', 'As preferências foram atualizadas.');
    } catch (error) {
      console.error('Settings save error:', error);
      addToast('error', 'Erro ao salvar', 'Não foi possível salvar as configurações.');
    }
  };

  const handleRegisterSale = async (saleData: any) => {
    if (!selectedBranch || !selectedCompany) return;

    let calculatedLtv = 0;
    let roi = 0; // This should be calculated based on your business logic

    if (selectedCompany.type === 'association') {
      calculatedLtv = saleData.membership_fee + (saleData.monthly_fee * 12);
    } else {
      calculatedLtv = saleData.sale_value; // Or your specific LTV calculation for direct sales
    }

    // Placeholder for ROI calculation
    const totalCampaignSpend = campaigns.reduce((acc, c) => acc + c.spend, 0);
    if (totalCampaignSpend > 0) {
      roi = ((calculatedLtv - totalCampaignSpend) / totalCampaignSpend) * 100;
    }

    try {
      const { error } = await supabase.from('sales').insert({
        ...saleData,
        branch_id: selectedBranch.id,
        total_ltv: calculatedLtv,
        roi: parseFloat(roi.toFixed(2)),
      });
      
      if (error) throw error;
      
      addToast('success', 'Venda Registrada', `Venda para ${saleData.client_name} registrada com sucesso.`);
      const { data: salesData, error: salesError } = await supabase.from('sales')
        .select('*').eq('branch_id', selectedBranch.id);
      if (salesError) throw salesError;
      setSales(salesData || []);
      setIsRegisterSaleModalOpen(false);
      
      await supabase.from('audit_log').insert({
        action: 'Venda registrada',
        detail: `Venda para ${saleData.client_name} em ${selectedBranch.name}`,
        type: 'success'
      });
    } catch (error) {
      console.error('Sale registration error:', error);
      addToast('error', 'Erro ao registrar venda', 'Ocorreu um erro ao tentar registrar a venda.');
    }
  };

  const handleEditCompany = (company: Company) => {
    setEditingCompany(company);
    setIsEditModalOpen(true);
  };

  const handleDeleteCompany = (company: Company) => {
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
      setDeletingCompany(null);
    } catch (error) {
      addToast('error', 'Erro ao excluir', 'Ocorreu um erro ao tentar excluir a empresa.');
    }
  };

  const handleDeleteCampaign = (campaign: Campaign) => {
    setDeletingCampaign(campaign);
    setIsDeleteCampaignModalOpen(true);
  };

  const confirmDeleteCampaign = async () => {
    if (!deletingCampaign || !selectedBranch) return;

    try {
      // Calculate current real-time balance to "crave" (fix) it
      const referenceDate = selectedBranch.updated_at || selectedBranch.created_at;
      const startTime = new Date(referenceDate).getTime();
      const elapsedMs = Math.max(0, Date.now() - startTime);
      const branchCampaigns = campaigns.filter(c => c.branch_id === selectedBranch.id);
      const dailyRate = calculateDailySpend(branchCampaigns);
      const initialBalance = selectedBranch.balance || 0;
      const currentBalance = Math.max(0, initialBalance - (elapsedMs * (dailyRate / (24 * 60 * 60 * 1000))));

      // Update branch balance in DB
      const { data: updatedBranch, error: updateError } = await supabase
        .from('branches')
        .update({ 
          balance: currentBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedBranch.id)
        .select()
        .single();

      if (updateError) throw updateError;

      const { error } = await supabase.from('campaigns').delete().eq('id', deletingCampaign.id);

      if (error) throw error;
      
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
    if (!selectedBranch) return;

    const newStatus = campaign.status === 'paused' ? 'active' : 'paused';

    try {
      // Calculate current real-time balance to "crave" (fix) it before changing status
      const referenceDate = selectedBranch.updated_at || selectedBranch.created_at;
      const startTime = new Date(referenceDate).getTime();
      const elapsedMs = Math.max(0, Date.now() - startTime);
      const branchCampaigns = campaigns.filter(c => c.branch_id === selectedBranch.id);
      const dailyRate = calculateDailySpend(branchCampaigns);
      const initialBalance = selectedBranch.balance || 0;
      const currentBalance = Math.max(0, initialBalance - (elapsedMs * (dailyRate / (24 * 60 * 60 * 1000))));

      // Update branch balance in DB
      const { data: updatedBranch, error: updateError } = await supabase
        .from('branches')
        .update({ 
          balance: currentBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedBranch.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Update campaign status
      const { data: updatedCampaign, error: campaignError } = await supabase
        .from('campaigns')
        .update({ status: newStatus })
        .eq('id', campaign.id)
        .select()
        .single();

      if (campaignError) throw campaignError;

      setCampaigns(prev => prev.map(c => c.id === campaign.id ? updatedCampaign : c));
      setBranches(prev => prev.map(b => b.id === selectedBranch.id ? updatedBranch : b));
      setSelectedBranch(updatedBranch);

      addToast('success', `Campanha ${newStatus === 'paused' ? 'pausada' : 'ativada'}`, `"${campaign.name}" foi ${newStatus === 'paused' ? 'pausada' : 'ativada'} com sucesso.`);
      
      await supabase.from('audit_log').insert({
        action: `Campanha ${newStatus === 'paused' ? 'pausada' : 'ativada'}`,
        detail: `Campanha "${campaign.name}" em ${selectedBranch.name}`,
        type: 'info'
      });
    } catch (error) {
      console.error('Toggle campaign status error:', error);
      addToast('error', 'Erro ao alterar status', 'Ocorreu um erro ao tentar alterar o status da campanha.');
    }
  };

  const handleEditBranchSubmit = async () => {
    if (!newName.trim()) {
      addToast('warning', 'Campo obrigatório', 'O nome é obrigatório.');
      return;
    }

    if (!selectedBranch) return;

    try {
      const { data, error } = await supabase.from('branches').update({
        name: newName,
        balance: parseFloat(newValue) || 0,
        budget: parseFloat(newValue) || 0,
        daily_expense: parseFloat(newDailyExpense) || 0,
        whatsapp: newWhatsapp
      }).eq('id', selectedBranch.id).select().single();
      
      if (error) throw error;
      
      setBranches(prev => prev.map(b => b.id === selectedBranch.id ? data : b));
      setSelectedBranch(data);
      addToast('success', 'Filial atualizada', `"${newName}" foi atualizada com sucesso.`);
      setIsEditBranchModalOpen(false);
      
      await supabase.from('audit_log').insert({
        action: 'Filial editada',
        detail: `"${newName}"`,
        type: 'update'
      });
    } catch (error) {
      console.error('Error updating branch:', error);
      addToast('error', 'Erro ao atualizar', 'Ocorreu um erro ao tentar atualizar a filial.');
    }
  };

  const handleUpdateCompany = async (companyData: Company) => {
    if (!editingCompany) return;

    try {
      const { error } = await supabase.from('clients').update(companyData).eq('id', editingCompany.id);
      
      if (error) throw error;
      
      setCompanies(prev => prev.map(c => c.id === editingCompany.id ? { ...c, ...companyData } : c));
      addToast('success', 'Empresa atualizada', `"${companyData.name}" foi atualizada com sucesso.`);
      setIsEditModalOpen(false);
      setEditingCompany(null);
    } catch (error) {
      console.error('Update company error:', error);
      addToast('error', 'Erro ao atualizar', 'Ocorreu um erro ao tentar atualizar os dados.');
    }
  };

  const handleNewCampaign = async (name: string, purpose: string, spend: number) => {
    if (!selectedBranch) return;
    try {
      // Calculate current real-time balance to "crave" (fix) it before adding new campaign
      const referenceDate = selectedBranch.updated_at || selectedBranch.created_at;
      const startTime = new Date(referenceDate).getTime();
      const elapsedMs = Math.max(0, Date.now() - startTime);
      const branchCampaigns = campaigns.filter(c => c.branch_id === selectedBranch.id);
      const dailyRate = calculateDailySpend(branchCampaigns);
      const initialBalance = selectedBranch.balance || 0;
      const currentBalance = Math.max(0, initialBalance - (elapsedMs * (dailyRate / (24 * 60 * 60 * 1000))));

      // Update branch balance in DB
      const { data: updatedBranch, error: updateError } = await supabase
        .from('branches')
        .update({ 
          balance: currentBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedBranch.id)
        .select()
        .single();

      if (updateError) throw updateError;

      const { data, error } = await supabase.from('campaigns').insert({
        branch_id: selectedBranch.id,
        name,
        purpose,
        spend,
        status: 'active'
      }).select().single();
      
      if (error) throw error;
      
      setCampaigns(prev => [...prev, data]);
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

  const generateInsights = async () => {
    setIsGeneratingInsights(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const model = ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analise os seguintes dados de tráfego e forneça 3 insights estratégicos curtos em português:
          Empresa: ${selectedCompany?.name || 'Geral'}
          Filial: ${selectedBranch?.name || 'Todas'}
          Vendas: ${sales.length}
          Investimento: ${formatCurrency(campaigns.reduce((acc, c) => acc + c.spend, 0))}
          ROI: ${sales.length > 0 ? "245%" : "0%"}`,
      });
      const response = await model;
      setAiInsights(response.text || "Não foi possível gerar insights no momento.");
    } catch (error) {
      console.error('Error generating insights:', error);
      addToast('error', 'Erro na IA', 'Não foi possível gerar insights automáticos.');
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  // Render Views
  const renderCompanies = () => (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPI 
          label="Total em Saldo" 
          value={formatCurrency(branches.reduce((acc, b) => acc + (b.balance || 0), 0))} 
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
          value={formatCurrency(campaigns.reduce((acc, c) => acc + (c.spend || 0), 0))} 
          icon={DollarSign} 
        />
        <KPI 
          label="Novas Vendas" 
          value={sales.length} 
          icon={Users} 
          trend={-2}
          trendLabel="vs ontem"
        />
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold tracking-tight text-slate-800 dark:text-white uppercase tracking-widest">Suas Empresas</h3>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-lg bg-primary/5 dark:bg-primary/10 border border-primary/10 text-slate-400 hover:text-primary transition-all">
            <Filter size={18} />
          </button>
          <button className="p-2 rounded-lg bg-primary/5 dark:bg-primary/10 border border-primary/10 text-slate-400 hover:text-primary transition-all">
            <BarChart3 size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {companies && companies.length > 0 ? companies.map((company) => (
          <Card key={company.id} onClick={() => handleSelectCompany(company)}>
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
                  <h4 className="font-bold text-lg text-slate-800 dark:text-white">{company.name}</h4>
                  <p className="text-xs text-slate-500 dark:text-primary/40 font-medium">Cadastrada em {company.created_at ? new Date(company.created_at).toLocaleDateString() : '-'}</p>
                </div>
              </div>
              <Badge variant="success">Ativa</Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-3 rounded-xl bg-primary/5 dark:bg-primary/10 border border-primary/10">
                <p className="text-[10px] font-bold text-slate-400 dark:text-primary/30 uppercase tracking-widest mb-1">Budget Mensal</p>
                <p className="font-bold text-sm text-slate-800 dark:text-white">{formatCurrency(company.monthly_budget)}</p>
              </div>
              <div className="p-3 rounded-xl bg-primary/5 dark:bg-primary/10 border border-primary/10">
                <p className="text-[10px] font-bold text-slate-400 dark:text-primary/30 uppercase tracking-widest mb-1">Filiais</p>
                <p className="font-bold text-sm text-slate-800 dark:text-white">0</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-primary/20">
 
              <button className="text-primary text-xs font-bold flex items-center gap-1 hover:underline">
                Gerenciar <ArrowRight size={14} />
              </button>
              <div className="flex items-center">
                <button onClick={(e) => { e.stopPropagation(); handleEditCompany(company); }} className="p-2 rounded-lg hover:bg-primary/10 text-slate-400 hover:text-primary transition-all">
                  <Edit2 size={14} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleDeleteCompany(company); }} className="p-2 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 transition-all">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </Card>
        )) : null}

        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="border-2 border-dashed border-slate-200 dark:border-primary/20 rounded-[2rem] p-6 flex flex-col items-center justify-center gap-3 text-slate-400 hover:border-primary/40 hover:text-primary transition-all group min-h-[200px] bg-primary/5 dark:bg-primary/5"
        >
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform border border-primary/20">
            <Plus size={24} />
          </div>
          <span className="font-bold text-sm uppercase tracking-widest">Adicionar Empresa</span>
        </button>
      </div>
    </div>
  );

  // Fetch branches when company selected
  useEffect(() => {
    if (selectedCompany) {
      supabase.from('branches').select('*, updated_at').eq('company_id', selectedCompany.id)
        .then(({ data, error }) => {
          if (error) console.error('Error fetching branches:', error);
          else setBranches(data || []);
        });
    }
  }, [selectedCompany]);

  // Fetch campaigns and sales when branch selected
  useEffect(() => {
    if (selectedBranch) {
      Promise.all([
        supabase.from('campaigns').select('*').eq('branch_id', selectedBranch.id),
        supabase.from('sales').select('*').eq('branch_id', selectedBranch.id)
      ]).then(([cRes, sRes]) => {
        if (cRes.error) console.error('Error fetching campaigns:', cRes.error);
        else setCampaigns(cRes.data || []);
        if (sRes.error) console.error('Error fetching sales:', sRes.error);
        else setSales(sRes.data || []);
      });
    }
  }, [selectedBranch]);

  const handleSelectCompany = (company: Company) => {
    setSelectedCompany(company);
    setView('company');
  };

  const handleSelectBranch = (branch: Branch) => {
    setSelectedBranch(branch);
    setView('branch');
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
          created_at: new Date().toISOString()
        }).select().single();
        
        if (error) throw error;
        
        setBranches(prev => [...prev, data]);
        addToast('success', 'Filial criada', `"${newName}" foi adicionada com sucesso.`);
        setIsAddBranchModalOpen(false);
        
        const { data: branchesData, error: branchesError } = await supabase.from('branches')
          .select('*').eq('company_id', selectedCompany.id);
        if (branchesError) throw branchesError;
        setBranches(branchesData || []);

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
    if (!branch.created_at || !branch.daily_expense) return branch.balance || 0;
    const date = new Date(branch.created_at).getTime();
    if (isNaN(date)) return branch.balance || 0;
    const elapsedMs = Date.now() - date;
    const expensePerMs = branch.daily_expense / (24 * 60 * 60 * 1000);
    const totalExpenseSoFar = elapsedMs * expensePerMs;
    return Math.max(0, (branch.balance || 0) - totalExpenseSoFar);
  };


  const handleEditCompany = (company: Company) => {
    setEditingCompany(company);
    setIsEditModalOpen(true);
  };

  const handleDeleteCompany = (company: Company) => {
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
      setDeletingCompany(null);
    } catch (error) {
      addToast('error', 'Erro ao excluir', 'Ocorreu um erro ao tentar excluir a empresa.');
    }
  };

  const handleDeleteCampaign = (campaign: Campaign) => {
    setDeletingCampaign(campaign);
    setIsDeleteCampaignModalOpen(true);
  };

  const confirmDeleteCampaign = async () => {
    if (!deletingCampaign || !selectedBranch) return;

    try {
      // Calculate current real-time balance to "crave" (fix) it
      const referenceDate = selectedBranch.updated_at || selectedBranch.created_at;
      const startTime = new Date(referenceDate).getTime();
      const elapsedMs = Math.max(0, Date.now() - startTime);
      const branchCampaigns = campaigns.filter(c => c.branch_id === selectedBranch.id);
      const dailyRate = calculateDailySpend(branchCampaigns);
      const initialBalance = selectedBranch.balance || 0;
      const currentBalance = Math.max(0, initialBalance - (elapsedMs * (dailyRate / (24 * 60 * 60 * 1000))));

      // Update branch balance in DB
      const { data: updatedBranch, error: updateError } = await supabase
        .from('branches')
        .update({ 
          balance: currentBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedBranch.id)
        .select()
        .single();

      if (updateError) throw updateError;

      const { error } = await supabase.from('campaigns').delete().eq('id', deletingCampaign.id);

      if (error) throw error;
      
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
    if (!selectedBranch) return;

    const newStatus = campaign.status === 'paused' ? 'active' : 'paused';

    try {
      // Calculate current real-time balance to "crave" (fix) it before changing status
      const referenceDate = selectedBranch.updated_at || selectedBranch.created_at;
      const startTime = new Date(referenceDate).getTime();
      const elapsedMs = Math.max(0, Date.now() - startTime);
      const branchCampaigns = campaigns.filter(c => c.branch_id === selectedBranch.id);
      const dailyRate = calculateDailySpend(branchCampaigns);
      const initialBalance = selectedBranch.balance || 0;
      const currentBalance = Math.max(0, initialBalance - (elapsedMs * (dailyRate / (24 * 60 * 60 * 1000))));

      // Update branch balance in DB
      const { data: updatedBranch, error: updateError } = await supabase
        .from('branches')
        .update({ 
          balance: currentBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedBranch.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Update campaign status
      const { data: updatedCampaign, error: campaignError } = await supabase
        .from('campaigns')
        .update({ status: newStatus })
        .eq('id', campaign.id)
        .select()
        .single();

      if (campaignError) throw campaignError;

      setCampaigns(prev => prev.map(c => c.id === campaign.id ? updatedCampaign : c));
      setBranches(prev => prev.map(b => b.id === selectedBranch.id ? updatedBranch : b));
      setSelectedBranch(updatedBranch);

      addToast('success', `Campanha ${newStatus === 'paused' ? 'pausada' : 'ativada'}`, `"${campaign.name}" foi ${newStatus === 'paused' ? 'pausada' : 'ativada'} com sucesso.`);
      
      await supabase.from('audit_log').insert({
        action: `Campanha ${newStatus === 'paused' ? 'pausada' : 'ativada'}`,
        detail: `Campanha "${campaign.name}" em ${selectedBranch.name}`,
        type: 'info'
      });
    } catch (error) {
      console.error('Toggle campaign status error:', error);
      addToast('error', 'Erro ao alterar status', 'Ocorreu um erro ao tentar alterar o status da campanha.');
    }
  };

  const handleEditBranchSubmit = async () => {
    if (!newName.trim()) {
      addToast('warning', 'Campo obrigatório', 'O nome é obrigatório.');
      return;
    }

    if (!selectedBranch) return;

    try {
      const { data, error } = await supabase.from('branches').update({
        name: newName,
        balance: parseFloat(newValue) || 0,
        budget: parseFloat(newValue) || 0,
        daily_expense: parseFloat(newDailyExpense) || 0,
        whatsapp: newWhatsapp
      }).eq('id', selectedBranch.id).select().single();
      
      if (error) throw error;
      
      setBranches(prev => prev.map(b => b.id === selectedBranch.id ? data : b));
      setSelectedBranch(data);
      addToast('success', 'Filial atualizada', `"${newName}" foi atualizada com sucesso.`);
      setIsEditBranchModalOpen(false);
      
      await supabase.from('audit_log').insert({
        action: 'Filial editada',
        detail: `"${newName}"`,
        type: 'update'
      });
    } catch (error) {
      console.error('Error updating branch:', error);
      addToast('error', 'Erro ao atualizar', 'Ocorreu um erro ao tentar atualizar a filial.');
    }
  };

  const handleUpdateCompany = async (companyData: Company) => {
    if (!editingCompany) return;

    try {
      const { error } = await supabase.from('clients').update(companyData).eq('id', editingCompany.id);
      
      if (error) throw error;
      
      setCompanies(prev => prev.map(c => c.id === editingCompany.id ? { ...c, ...companyData } : c));
      addToast('success', 'Empresa atualizada', `"${companyData.name}" foi atualizada com sucesso.`);
      setIsEditModalOpen(false);
      setEditingCompany(null);
    } catch (error) {
      console.error('Update company error:', error);
      addToast('error', 'Erro ao atualizar', 'Ocorreu um erro ao tentar atualizar os dados.');
    }
  };

  const handleNewCampaign = async (name: string, purpose: string, spend: number) => {
    if (!selectedBranch) return;
    try {
      // Calculate current real-time balance to "crave" (fix) it before adding new campaign
      const referenceDate = selectedBranch.updated_at || selectedBranch.created_at;
      const startTime = new Date(referenceDate).getTime();
      const elapsedMs = Math.max(0, Date.now() - startTime);
      const branchCampaigns = campaigns.filter(c => c.branch_id === selectedBranch.id);
      const dailyRate = calculateDailySpend(branchCampaigns);
      const initialBalance = selectedBranch.balance || 0;
      const currentBalance = Math.max(0, initialBalance - (elapsedMs * (dailyRate / (24 * 60 * 60 * 1000))));

      // Update branch balance in DB
      const { data: updatedBranch, error: updateError } = await supabase
        .from('branches')
        .update({ 
          balance: currentBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedBranch.id)
        .select()
        .single();

      if (updateError) throw updateError;

      const { data, error } = await supabase.from('campaigns').insert({
        branch_id: selectedBranch.id,
        name,
        purpose,
        spend,
        status: 'active'
      }).select().single();
      
      if (error) throw error;
      
      setCampaigns(prev => [...prev, data]);
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

  const generateInsights = async () => {
    setIsGeneratingInsights(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const model = ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analise os seguintes dados de tráfego e forneça 3 insights estratégicos curtos em português:
          Empresa: ${selectedCompany?.name || 'Geral'}
          Filial: ${selectedBranch?.name || 'Todas'}
          Vendas: ${sales.length}
          Investimento: ${formatCurrency(campaigns.reduce((acc, c) => acc + c.spend, 0))}
          ROI: ${sales.length > 0 ? "245%" : "0%"}`,
      });
      const response = await model;
      setAiInsights(response.text || "Não foi possível gerar insights no momento.");
    } catch (error) {
      console.error('Error generating insights:', error);
      addToast('error', 'Erro na IA', 'Não foi possível gerar insights automáticos.');
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  // Render Views
  const renderCompanies = () => (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPI 
          label="Total em Saldo" 
          value={formatCurrency(branches.reduce((acc, b) => acc + (b.balance || 0), 0))} 
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
          value={formatCurrency(campaigns.reduce((acc, c) => acc + (c.spend || 0), 0))} 
          icon={DollarSign} 
        />
        <KPI 
          label="Novas Vendas" 
          value={sales.length} 
          icon={Users} 
          trend={-2}
          trendLabel="vs ontem"
        />
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold tracking-tight text-slate-800 dark:text-white uppercase tracking-widest">Suas Empresas</h3>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-lg bg-primary/5 dark:bg-primary/10 border border-primary/10 text-slate-400 hover:text-primary transition-all">
            <Filter size={18} />
          </button>
          <button className="p-2 rounded-lg bg-primary/5 dark:bg-primary/10 border border-primary/10 text-slate-400 hover:text-primary transition-all">
            <BarChart3 size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {companies && companies.length > 0 ? companies.map((company) => (
          <Card key={company.id} onClick={() => handleSelectCompany(company)}>
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
                  <h4 className="font-bold text-lg text-slate-800 dark:text-white">{company.name}</h4>
                  <p className="text-xs text-slate-500 dark:text-primary/40 font-medium">Cadastrada em {company.created_at ? new Date(company.created_at).toLocaleDateString() : '-'}</p>
                </div>
              </div>
              <Badge variant="success">Ativa</Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-3 rounded-xl bg-primary/5 dark:bg-primary/10 border border-primary/10">
                <p className="text-[10px] font-bold text-slate-400 dark:text-primary/30 uppercase tracking-widest mb-1">Budget Mensal</p>
                <p className="font-bold text-sm text-slate-800 dark:text-white">{formatCurrency(company.monthly_budget)}</p>
              </div>
              <div className="p-3 rounded-xl bg-primary/5 dark:bg-primary/10 border border-primary/10">
                <p className="text-[10px] font-bold text-slate-400 dark:text-primary/30 uppercase tracking-widest mb-1">Filiais</p>
                <p className="font-bold text-sm text-slate-800 dark:text-white">0</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-primary/20">
 
              <button className="text-primary text-xs font-bold flex items-center gap-1 hover:underline">
                Gerenciar <ArrowRight size={14} />
              </button>
              <div className="flex items-center">
                <button onClick={(e) => { e.stopPropagation(); handleEditCompany(company); }} className="p-2 rounded-lg hover:bg-primary/10 text-slate-400 hover:text-primary transition-all">
                  <Edit2 size={14} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleDeleteCompany(company); }} className="p-2 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 transition-all">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </Card>
        )) : null}

        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="border-2 border-dashed border-slate-200 dark:border-primary/20 rounded-[2rem] p-6 flex flex-col items-center justify-center gap-3 text-slate-400 hover:border-primary/40 hover:text-primary transition-all group min-h-[200px] bg-primary/5 dark:bg-primary/5"
        >
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform border border-primary/20">
            <Plus size={24} />
          </div>
          <span className="font-bold text-sm uppercase tracking-widest">Adicionar Empresa</span>
        </button>
      </div>
    </div>
  );

  const renderCompany = () => {
    if (!selectedCompany) return null;

    const branchesForCompany = (branches || []).filter(b => b.company_id === selectedCompany.id);
    const salesForCompany = (sales || []).filter(s => branchesForCompany.some(b => b.id === s.branch_id));
    const totalBalance = branchesForCompany.reduce((acc, b) => acc + (b.balance || 0), 0);
    const totalDailyInvestment = (campaigns || []).filter(c => branchesForCompany.some(b => b.id === c.branch_id)).reduce((acc, c) => acc + (c.spend || 0), 0);
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPI label="Total de Filiais" value={branchesForCompany.length.toString()} icon={Building2} />
          <KPI label="Investimento Diário" value={formatCurrency(totalDailyInvestment)} icon={DollarSign} />
          <KPI label="ROI Consolidado" value={formatPercent(totalRoi)} icon={TrendingUp} />
          <KPI label="Saldo Total" value={formatCurrency(totalBalance)} icon={Wallet} />
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-bold tracking-tight">Top 3 Filiais</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...branchesForCompany]
              .sort((a, b) => {
                const aSales = sales.filter(s => s.branch_id === a.id).length;
                const bSales = sales.filter(s => s.branch_id === b.id).length;
                if (aSales !== bSales) return bSales - aSales;
                const aRoi = aSales > 0 ? sales.filter(s => s.branch_id === a.id).reduce((acc, s) => acc + (s.roi || 0), 0) / aSales : 0;
                const bRoi = bSales > 0 ? sales.filter(s => s.branch_id === b.id).reduce((acc, s) => acc + (s.roi || 0), 0) / bSales : 0;
                return bRoi - aRoi;
              })
              .slice(0, 3)
              .map(branch => (
                <Card key={branch.id} className="bg-slate-800 border-slate-700">
                  <h4 className="font-bold text-white">{branch.name}</h4>
                  <p className="text-sm text-slate-400">Vendas: {sales.filter(s => s.branch_id === branch.id).length}</p>
                  <p className="text-sm text-slate-400">ROI: {formatPercent(sales.filter(s => s.branch_id === branch.id).reduce((acc, s) => acc + (s.roi || 0), 0) / sales.filter(s => s.branch_id === branch.id).length)}</p>
                </Card>
              ))}
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h3 className="text-xl font-bold tracking-tight">Filiais de {selectedCompany?.name}</h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label htmlFor="sort-by" className="text-xs font-bold text-slate-500 uppercase tracking-widest hidden sm:inline">Ordenar por:</label>
              <select
                id="sort-by"
                value={branchSortBy}
                onChange={(e) => setBranchSortBy(e.target.value as 'name' | 'balance' | 'daysRemaining' | 'roi')}
                className="bg-[#0f172a] border border-[#1e293b] rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-indigo-500 transition-all text-white font-medium"
              >
                <option value="name">Nome</option>
                <option value="balance">Saldo</option>
                <option value="daysRemaining">Dias Restantes</option>
                <option value="roi">ROI</option>
              </select>
            </div>
            <button 
              onClick={() => setBranchSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-white/5 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-all"
            >
              {branchSortOrder === 'asc' ? <ArrowUpAZ size={18} /> : <ArrowDownZA size={18} />}
            </button>
          </div>
        </div>

      <BranchRealTimeDashboard 
        companyId={selectedCompany.id} 
        onBranchClick={(branch) => {
          setSelectedBranch(branch);
          setView('branch');
        }}
      />
    </div>
  );
};

  const renderBranch = () => {
    if (!selectedBranch) return null;
    const branchSales = (sales || []).filter(s => s.branch_id === selectedBranch.id);
    const branchCampaigns = (campaigns || []).filter(c => c.branch_id === selectedBranch.id);
    const dailySpend = calculateDailySpend(branchCampaigns);
    const roi = branchSales.length > 0 ? branchSales.reduce((acc, s) => acc + (s.roi || 0), 0) / branchSales.length : 0;

    return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">{selectedBranch?.name}</h2>
        <button 
          onClick={() => {
            if (selectedBranch) {
              setNewName(selectedBranch.name || '');
              setNewValue((selectedBranch.balance || 0).toString());
              setNewDailyExpense((selectedBranch.daily_expense || 0).toString());
              setNewWhatsapp(selectedBranch.whatsapp || '');
              setIsEditBranchModalOpen(true);
            }
          }} 
          className="btn-secondary flex items-center gap-2 text-xs"
        >
          <SettingsIcon size={16} />
          <span>Editar Filial</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <RealTimeBalanceKPI branch={selectedBranch} campaigns={branchCampaigns} />
        <KPI label="ROI Total" value={formatPercent(roi)} icon={TrendingUp} color="sky" />
        <KPI label="Gasto Total" value={formatCurrency(dailySpend)} icon={DollarSign} />
        <KPI label="Ticket Médio" value={formatCurrency(0)} icon={Users} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold tracking-tight">Campanhas Ativas</h3>
            <button onClick={() => setIsNewCampaignModalOpen(true)} className="btn-primary flex items-center gap-2 text-xs">
              <Plus size={16} />
              <span>Nova Campanha</span>
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {branchCampaigns.length === 0 ? (
              <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-500 dark:text-primary/40 border-2 border-dashed border-slate-200 dark:border-primary/20 rounded-[2rem] bg-primary/5 dark:bg-primary/5">
                <BarChart3 size={40} className="mb-4 opacity-20" />
                <p className="font-bold uppercase tracking-widest text-xs">Nenhuma campanha cadastrada</p>
              </div>
            ) : (
              branchCampaigns.map(c => (
                <Card key={c.id} className={cn(
                  "group bg-primary/5 dark:bg-primary/5 border-primary/10 transition-all",
                  c.status === 'paused' && "opacity-60 grayscale-[0.5]"
                )}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Badge variant={c.status === 'paused' ? 'neutral' : 'primary'}>
                        {c.purpose}
                      </Badge>
                      {c.status === 'paused' && (
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pausada</span>
                      )}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={() => handleToggleCampaignStatus(c)}
                        className={cn(
                          "p-1.5 rounded-lg transition-all",
                          c.status === 'paused' ? "hover:bg-emerald-500/10 text-emerald-500" : "hover:bg-amber-500/10 text-amber-500"
                        )}
                        title={c.status === 'paused' ? "Ativar" : "Pausar"}
                      >
                        {c.status === 'paused' ? <Play size={12} /> : <Pause size={12} />}
                      </button>
                      <button className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-all"><Edit2 size={12} /></button>
                      <button onClick={() => handleDeleteCampaign(c)} className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-400 transition-all"><Trash2 size={12} /></button>
                    </div>
                  </div>
                  <h5 className="font-black text-lg mb-2 text-slate-800 dark:text-white tracking-tight">{c.name}</h5>
                  <div className="flex items-baseline gap-1.5">
                    <span className={cn(
                      "text-2xl font-black transition-colors",
                      c.status === 'paused' ? "text-slate-400" : "text-primary dark:text-primary"
                    )}>
                      {formatCurrency(c.spend)}
                    </span>
                    <span className="text-[10px] font-extrabold text-slate-400 dark:text-primary/30 uppercase tracking-[0.2em]">/ dia</span>
                  </div>
                </Card>
              ))
            )}
          </div>

          <div className="flex items-center justify-between pt-4">
            <h3 className="text-lg font-bold tracking-tight">Vendas Recentes</h3>
            <button onClick={() => setIsRegisterSaleModalOpen(true)} className="btn-secondary flex items-center gap-2 text-xs">
              <Plus size={16} />
              <span>{selectedCompany?.type === 'association' ? 'Registrar Adesão' : 'Registrar Venda'}</span>
            </button>
          </div>

          <div className="glass rounded-[2rem] overflow-hidden border border-slate-200 dark:border-primary/20 shadow-xl">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-primary/10 border-b border-slate-200 dark:border-primary/20">
                  <th className="px-6 py-4 font-bold text-slate-500 dark:text-primary/40 uppercase tracking-widest text-[10px]">Cliente</th>
                  <th className="px-6 py-4 font-bold text-slate-500 dark:text-primary/40 uppercase tracking-widest text-[10px]">Data</th>
                  {selectedCompany?.type === 'association' ? (
                    <>
                      <th className="px-6 py-4 font-bold text-slate-500 dark:text-primary/40 uppercase tracking-widest text-[10px]">Adesão</th>
                      <th className="px-6 py-4 font-bold text-slate-500 dark:text-primary/40 uppercase tracking-widest text-[10px]">Mensalidade</th>
                    </>
                  ) : (
                    <>
                      <th className="px-6 py-4 font-bold text-slate-500 dark:text-primary/40 uppercase tracking-widest text-[10px]">Item</th>
                      <th className="px-6 py-4 font-bold text-slate-500 dark:text-primary/40 uppercase tracking-widest text-[10px]">Valor</th>
                      <th className="px-6 py-4 font-bold text-slate-500 dark:text-primary/40 uppercase tracking-widest text-[10px]">Parcelas</th>
                    </>
                  )}
                  <th className="px-6 py-4 font-bold text-slate-500 dark:text-primary/40 uppercase tracking-widest text-[10px]">LTV</th>
                  <th className="px-6 py-4 font-bold text-slate-500 dark:text-primary/40 uppercase tracking-widest text-[10px]">ROI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-primary/20">
                {branchSales.length === 0 ? (
                  <tr>
                    <td colSpan={selectedCompany?.type === 'association' ? 6 : 7} className="px-6 py-12 text-center text-slate-500 dark:text-primary/30 italic">Nenhuma venda registrada</td>
                  </tr>
                ) : (
                  branchSales.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-primary/5 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-800 dark:text-white">{s.client_name}</td>
                      <td className="px-6 py-4 text-slate-500 dark:text-primary/40">{s.date ? new Date(s.date).toLocaleDateString() : '-'}</td>
                      {selectedCompany?.type === 'association' ? (
                        <>
                          <td className="px-6 py-4 font-medium text-slate-800 dark:text-white">{formatCurrency(s.membership_fee || 0)}</td>
                          <td className="px-6 py-4 font-medium text-slate-800 dark:text-white">{formatCurrency(s.monthly_fee || 0)}</td>
                        </>
                      ) : (
                        <>
                          <td className="px-6 py-4 font-medium text-slate-800 dark:text-white">{s.item_sold}</td>
                          <td className="px-6 py-4 font-medium text-slate-800 dark:text-white">{formatCurrency(s.sale_value || 0)}</td>
                          <td className="px-6 py-4 font-medium text-slate-800 dark:text-white">{s.installments}x de {formatCurrency(s.installment_value || 0)}</td>
                        </>
                      )}
                      <td className="px-6 py-4 font-black text-primary">{formatCurrency(s.total_ltv || 0)}</td>
                      <td className="px-6 py-4">
                        <span className={cn("font-bold", s.roi >= 0 ? "text-primary dark:text-primary" : "text-rose-500 dark:text-rose-400")}>
                          {s.roi}%
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/10 border-primary/20 shadow-[0_0_30px_rgba(0,212,255,0.1)]">
            <h4 className="font-bold text-lg mb-4 flex items-center gap-2 text-slate-800 dark:text-white uppercase tracking-widest">
              <Clock size={20} className="text-primary" />
              Previsão de ROI
            </h4>
            <p className="text-sm text-slate-600 dark:text-primary/60 mb-6 leading-relaxed font-medium">
              Baseado no seu histórico de vendas e investimento, projetamos o retorno para os próximos 30 dias.
            </p>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-primary/40 uppercase tracking-widest">Cenário Base</span>
                <span className="font-black text-primary">0%</span>
              </div>
              <div className="h-2 w-full bg-slate-200 dark:bg-primary/20 rounded-full overflow-hidden border border-slate-300 dark:border-primary/20">
                <div className="h-full bg-gradient-to-r from-primary to-primary w-0" />
              </div>
              <div className="flex justify-between text-[10px] font-bold text-slate-500 dark:text-primary/30 uppercase tracking-widest">
                <span>Conservador</span>
                <span>Otimista</span>
              </div>
            </div>
          </Card>

          <Card className="border-primary/10">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-lg flex items-center gap-2 text-slate-800 dark:text-white uppercase tracking-widest">
                <Sparkles size={20} className="text-primary" />
                Insights da IA
              </h4>
              <button 
                onClick={generateInsights}
                disabled={isGeneratingInsights}
                className="p-2 rounded-lg hover:bg-primary/10 text-primary disabled:opacity-50 transition-all"
              >
                {isGeneratingInsights ? <Loader2 size={18} className="animate-spin" /> : <TrendingUp size={18} />}
              </button>
            </div>
            <div className="space-y-4">
              {aiInsights ? (
                <div className="prose prose-sm dark:prose-invert text-slate-600 dark:text-slate-400 leading-relaxed">
                  <ReactMarkdown>{aiInsights}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">Clique no ícone acima para gerar insights estratégicos baseados em seus dados reais.</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
    );
  };

  const getBreadcrumb = () => {
    const items: { label: string; onClick?: () => void }[] = [{ label: 'Empresas', onClick: () => setView('companies') }];
    if (selectedCompany) {
      items.push({ label: selectedCompany.name, onClick: () => setView('company') });
    }
    if (selectedBranch) {
      items.push({ label: selectedBranch.name });
    }
    return items;
  };

  const getTitle = () => {
    if (currentView === 'companies') return 'Dashboard Geral';
    if (currentView === 'company') return selectedCompany?.name || 'Empresa';
    if (currentView === 'branch') return selectedBranch?.name || 'Filial';
    if (currentView === 'eagle') return 'Visão de Águia';
    if (currentView === 'history') return 'Histórico de Alterações';
    if (currentView === 'reports') return 'Relatórios Detalhados';
    return 'TrafficFlow';
  };

  const handleMarkAllNotificationsAsRead = async () => {
    try {
      await fetch('/api/notifications/read-all', { method: 'PUT' });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      addToast('success', 'Notificações lidas', 'Todas as notificações foram marcadas como lidas.');
    } catch (error) {
      addToast('error', 'Erro', 'Não foi possível marcar notificações como lidas.');
    }
  };

  return (
    <>
      <Layout 
        currentView={currentView} 
        setView={(v) => setView(v as View)} 
        title={getTitle()}
        breadcrumb={currentView !== 'companies' && currentView !== 'eagle' && currentView !== 'history' && currentView !== 'reports' ? getBreadcrumb() : undefined}
        onAction={
          currentView === 'companies' ? () => setIsAddModalOpen(true) : 
          currentView === 'company' ? () => setIsAddBranchModalOpen(true) : 
          undefined
        }
        actionLabel={currentView === 'companies' ? 'Nova Empresa' : currentView === 'company' ? 'Nova Filial' : undefined}
        notificationsCount={notifications.filter(n => !n.read).length}
        onNotificationsClick={() => setShowNotificationsPopover(prev => !prev)}
        onSettingsClick={() => setShowSettingsPopover(prev => !prev)}
        userName={userName}
        userAvatar={userAvatar}
        onProfileClick={() => setIsEditProfileModalOpen(true)}
        theme={theme}
        onToggleTheme={toggleTheme}
      >
        {currentView === 'companies' && renderCompanies()}
        {currentView === 'company' && renderCompany()}
        {currentView === 'branch' && renderBranch()}
        {currentView === 'eagle' && <EagleView companies={companies} branches={branches} campaigns={campaigns} sales={sales} />}
        {currentView === 'history' && <AuditLog logs={auditLogs} />}
        {currentView === 'reports' && <ReportsView branches={branches} companies={companies} campaigns={campaigns} />}
        {currentView === 'settings' && <SettingsView settings={settings} onSave={handleSaveSettings} />}
      </Layout>

      {showNotificationsPopover && (
        <div className="fixed top-20 right-6 z-[100] w-96 bg-white/90 dark:bg-slate-950/60 backdrop-blur-2xl rounded-2xl p-4 shadow-[0_16px_48px_rgba(0,0,0,0.1)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.6)] border border-gray-200 dark:border-white/5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg text-slate-800 dark:text-white">Notificações</h3>
            <button onClick={() => setShowNotificationsPopover(false)} className="text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>
          <NotificationsView notifications={notifications} onMarkAllAsRead={handleMarkAllNotificationsAsRead} />
        </div>
      )}

      {showSettingsPopover && (
        <div className="fixed top-20 right-6 z-[100] w-96 bg-white/90 dark:bg-slate-950/60 backdrop-blur-2xl rounded-2xl p-4 shadow-[0_16px_48px_rgba(0,0,0,0.1)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.6)] border border-gray-200 dark:border-white/5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg text-slate-800 dark:text-white">Configurações Rápidas</h3>
            <button onClick={() => setShowSettingsPopover(false)} className="text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>
          <SettingsView settings={settings} onSave={handleSaveSettings} isPopover />
        </div>
      )}

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
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Nome</label>
            <input 
              type="text" 
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ex: Rede de Academias X"
              className="w-full bg-slate-50 dark:bg-primary/5 border border-slate-200 dark:border-primary/20 rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all text-slate-800 dark:text-white"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Budget Mensal</label>
            <input 
              type="number" 
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="0.00"
              className="w-full bg-slate-50 dark:bg-primary/5 border border-slate-200 dark:border-primary/20 rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all text-slate-800 dark:text-white"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Tipo de Empresa</label>
            <select
              value={newCompanyType}
              onChange={(e) => setNewCompanyType(e.target.value as 'association' | 'direct_sales')}
              className="w-full bg-slate-50 dark:bg-primary/5 border border-slate-200 dark:border-primary/20 rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all text-slate-800 dark:text-white"
            >
              <option value="direct_sales">Venda Direta</option>
              <option value="association">Associação</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">URL do Logo</label>
            <input 
              type="text" 
              value={newLogo}
              onChange={(e) => setNewLogo(e.target.value)}
              placeholder="https://exemplo.com/logo.png"
              className="w-full bg-slate-50 dark:bg-primary/5 border border-slate-200 dark:border-primary/20 rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all text-slate-800 dark:text-white"
            />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isEditBranchModalOpen}
        onClose={() => setIsEditBranchModalOpen(false)}
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
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Nome da Filial</label>
            <input 
              type="text" 
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ex: Unidade Centro"
              className="w-full bg-slate-50 dark:bg-primary/5 border border-slate-200 dark:border-primary/20 rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all text-slate-800 dark:text-white"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Saldo (R$)</label>
            <input 
              type="number" 
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="0.00"
              className="w-full bg-slate-50 dark:bg-primary/5 border border-slate-200 dark:border-primary/20 rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all text-slate-800 dark:text-white"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Gasto por Dia (R$)</label>
            <input 
              type="number" 
              value={newDailyExpense}
              onChange={(e) => setNewDailyExpense(e.target.value)}
              placeholder="0.00"
              className="w-full bg-slate-50 dark:bg-primary/5 border border-slate-200 dark:border-primary/20 rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all text-slate-800 dark:text-white"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">WhatsApp do Responsável</label>
            <input 
              type="text" 
              value={newWhatsapp}
              onChange={(e) => setNewWhatsapp(e.target.value)}
              placeholder="Ex: 5511999999999"
              className="w-full bg-slate-50 dark:bg-primary/5 border border-slate-200 dark:border-primary/20 rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all text-slate-800 dark:text-white"
            />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isAddBranchModalOpen}
        onClose={() => setIsAddBranchModalOpen(false)}
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
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Nome da Filial</label>
            <input 
              type="text" 
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ex: Unidade Centro"
              className="w-full bg-slate-50 dark:bg-primary/5 border border-slate-200 dark:border-primary/20 rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all text-slate-800 dark:text-white"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Saldo Inicial (R$)</label>
            <input 
              type="number" 
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="0.00"
              className="w-full bg-slate-50 dark:bg-primary/5 border border-slate-200 dark:border-primary/20 rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all text-slate-800 dark:text-white"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Gasto por Dia (R$)</label>
            <input 
              type="number" 
              value={newDailyExpense}
              onChange={(e) => setNewDailyExpense(e.target.value)}
              placeholder="0.00"
              className="w-full bg-slate-50 dark:bg-primary/5 border border-slate-200 dark:border-primary/20 rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all text-slate-800 dark:text-white"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">WhatsApp do Responsável</label>
            <input 
              type="text" 
              value={newWhatsapp}
              onChange={(e) => setNewWhatsapp(e.target.value)}
              placeholder="Ex: 5511999999999"
              className="w-full bg-slate-50 dark:bg-primary/5 border border-slate-200 dark:border-primary/20 rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all text-slate-800 dark:text-white"
            />
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
        <NewCampaignModal
          isOpen={isNewCampaignModalOpen}
          onClose={() => setIsNewCampaignModalOpen(false)}
          onNewCampaign={handleNewCampaign}
        />
      )}

            <ToastContainer toasts={toasts} removeToast={removeToast} />

      {editingCompany && (
        <EditCompanyModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          company={editingCompany}
          onUpdateCompany={handleUpdateCompany}
        />
      )}

      <EditProfileModal
        isOpen={isEditProfileModalOpen}
        onClose={() => setIsEditProfileModalOpen(false)}
        currentName={userName}
        currentAvatar={userAvatar}
        onSave={(name, avatar) => {
          setUserName(name);
          setUserAvatar(avatar);
          addToast('success', 'Perfil atualizado', 'Seu nome e foto de perfil foram atualizados.');
        }}
      />

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirmar Exclusão de Empresa"
        footer={
          <>
            <button onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-all font-bold text-sm">Cancelar</button>
            <button onClick={confirmDeleteCompany} className="px-4 py-2 rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition-all font-bold text-sm">Excluir Empresa</button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-slate-600 dark:text-slate-300">
            Você tem certeza que deseja excluir a empresa <span className="font-bold text-slate-800 dark:text-white">"{deletingCompany?.name}"</span>?
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
            <button onClick={() => setIsDeleteCampaignModalOpen(false)} className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-all font-bold text-sm">Cancelar</button>
            <button onClick={confirmDeleteCampaign} className="px-4 py-2 rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition-all font-bold text-sm">Excluir Campanha</button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-slate-600 dark:text-slate-300">
            Você tem certeza que deseja excluir a campanha <span className="font-bold text-slate-800 dark:text-white">"{deletingCampaign?.name}"</span>?
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

