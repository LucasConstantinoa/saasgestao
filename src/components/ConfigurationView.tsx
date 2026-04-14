import React, { useState, useEffect } from 'react';
import { Card } from '@/components/UI';
import { Palette, Type, Building2, Settings, Sparkles, Layout, Shield, Bell, Lock, CheckCircle2, AlertTriangle } from 'lucide-react';
import DiagnosticCenter from '../pages/DiagnosticCenter';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { useTrafficFlow } from '@/context/TrafficFlowContext';
import { supabase } from '@/lib/supabase';

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : null;
};

const BranchMetaLinker = ({ branch, adAccounts, onLink }: any) => {
  const [search, setSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const filtered = adAccounts.filter((acc: any) => 
    acc.account_name.toLowerCase().includes(search.toLowerCase()) ||
    acc.account_id.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 5); // Show top 5 matches

  const currentAccount = adAccounts.find((acc: any) => acc.account_id === branch.facebook_ad_account_id);

  return (
    <div className="p-5 border border-border rounded-3xl bg-surface-light/30 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold shadow-sm">
            {branch.name.substring(0, 1).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-black text-foreground">{branch.name}</p>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Meta Ads Management</span>
          </div>
        </div>
      </div>

      {!currentAccount || isSearching ? (
        <div className="space-y-3 pt-2">
          <div className="relative group">
            <input 
              type="text" 
              placeholder="Pesquisar contas Meta Ads (ID ou Nome)..."
              className="w-full bg-surface border border-border/50 p-3 h-12 rounded-2xl text-xs font-bold outline-none focus:border-primary/50 transition-all placeholder:text-muted-foreground/50 pr-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {isSearching && (
              <button 
                onClick={() => setIsSearching(false)}
                className="absolute right-3 top-3 text-[10px] font-black text-rose-500 uppercase px-2 py-1 bg-rose-500/10 rounded-lg"
              >
                Cancelar
              </button>
            )}
          </div>

          <div className="space-y-2">
            {search.length > 0 && filtered.length === 0 && (
              <p className="text-[10px] text-muted-foreground text-center py-2">Nenhuma conta encontrada para "{search}"</p>
            )}
            
            {(search.length > 0 ? filtered : []).map((acc: any) => (
              <motion.button
                key={acc.account_id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => {
                  onLink(branch.id, acc.account_id);
                  setIsSearching(false);
                  setSearch('');
                }}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-background border border-border/30 hover:border-primary/30 hover:bg-primary/5 transition-all group"
              >
                <div className="text-left">
                  <p className="text-[11px] font-bold text-foreground group-hover:text-primary transition-colors">{acc.account_name}</p>
                  <p className="text-[9px] text-muted-foreground font-mono">act_{acc.account_id}</p>
                </div>
                <div className="text-right">
                <p className="text-[10px] font-black text-foreground">R$ {acc.amount_spent?.toFixed(2) || '0.00'}</p>
                  <p className="text-[8px] text-muted-foreground uppercase">Saldo Gasto</p>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 flex items-center justify-between animate-in fade-in zoom-in duration-300">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-white">
              <CheckCircle2 size={16} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-foreground">{currentAccount.account_name}</p>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-primary font-bold uppercase tracking-tighter">Fixado</span>
                <span className="text-[8px] text-muted-foreground font-mono opacity-50">act_{currentAccount.account_id}</span>
              </div>
            </div>
          </div>
          <button 
            onClick={() => setIsSearching(true)}
            className="p-2 text-muted-foreground hover:text-primary transition-colors hover:bg-primary/5 rounded-lg"
            title="Alterar conta"
          >
            <Settings size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

const ModalBase = ({ title, subtitle, icon: Icon, children, onClose }: any) => (
  <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
  >
    <motion.div 
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 20 }}
      className="bg-surface border border-border p-5 md:p-8 rounded-[2rem] md:rounded-[2.5rem] w-full max-w-xl shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-purple-500 to-primary opacity-50" />
      
      <div className="flex items-center justify-between mb-4 md:mb-8 shrink-0">
        <div className="space-y-1">
          <h3 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-3">
            <Icon size={24} className="text-primary" />
            {title}
          </h3>
          <p className="text-muted-foreground text-xs uppercase tracking-widest font-bold">
            {subtitle}
          </p>
        </div>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-muted text-muted-foreground hover:text-foreground rounded-full transition-colors"
        >
          <Settings size={20} />
        </button>
      </div>

      <div className="space-y-6 overflow-y-auto custom-scrollbar flex-1 min-h-0 pr-1 pb-2">
        {children}
      </div>

      <div className="mt-6 md:mt-10 flex flex-col md:flex-row gap-3 shrink-0">
        <button className="flex-1 btn-primary py-3.5 md:py-4 order-1 md:order-none" onClick={onClose}>
          Salvar Alterações
        </button>
        <button className="btn-secondary py-3.5 md:py-4 md:px-8 order-2 md:order-none" onClick={() => onClose(true)}>
          Cancelar
        </button>
      </div>
    </motion.div>
  </motion.div>
);

import DiagnosticCenter from '../pages/DiagnosticCenter';

export const ConfigurationView = () => {
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const { isAdmin, settings, setSettings, branches } = useTrafficFlow();
  const [adAccounts, setAdAccounts] = useState<any[]>([]);

  useEffect(() => {
    if (isAdmin) {
      supabase.from('facebook_ad_accounts').select('*').then(({ data }) => {
        if (data) setAdAccounts(data);
      });
    }
  }, [isAdmin]);

  // Local state for interactive settings
  const [localSettings, setLocalSettings] = useState({
    ...settings,
    allowSelfRegistration: false,
    autoApproveSales: true,
    forceMFA: true,
    sessionTimeout: true,
    pushAlerts: true,
    emailReports: true,
    glassEffects: true,
    smoothTransitions: true
  });

  const toggleSetting = (key: keyof typeof localSettings) => {
    setLocalSettings(prev => ({ ...prev, [key]: !prev[key as any] }));
  };

  const updateColorGlobally = (color: string) => {
    document.documentElement.style.setProperty('--primary', color);
    const rgb = hexToRgb(color);
    if (rgb) document.documentElement.style.setProperty('--primary-rgb', rgb);
    setLocalSettings(prev => ({ ...prev, primaryColor: color }));
  };

  const configSections = [
    {
      id: 'colors',
      title: 'Cores & Identidade',
      description: 'Personalize a paleta de cores e a identidade visual da sua aplicação.',
      icon: Palette,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      action: 'Editar Cores',
      onClick: () => setActiveModal('colors')
    },
    {
      id: 'typography',
      title: 'Tipografia',
      description: 'Escolha as fontes e estilos para títulos, textos e elementos de interface.',
      icon: Type,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
      action: 'Editar Fontes',
      onClick: () => setActiveModal('typography')
    },
    {
      id: 'branches',
      title: 'Filiais (Master)',
      description: 'Gerencie opções globais para as filiais cadastradas no sistema.',
      icon: Building2,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      action: 'Configurar Filiais',
      onClick: () => setActiveModal('branches')
    },
    {
      id: 'themes',
      title: 'Temas & Interface',
      description: 'Configure o comportamento dos temas e elementos visuais da interface.',
      icon: Layout,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      action: 'Configurar Temas',
      onClick: () => setActiveModal('themes')
    },
    {
      id: 'security',
      title: 'Segurança',
      description: 'Configure políticas de acesso, logs de auditoria e autenticação MFA.',
      icon: Shield,
      color: 'text-rose-500',
      bg: 'bg-rose-500/10',
      action: 'Ajustar Segurança',
      onClick: () => setActiveModal('security')
    },
    {
      id: 'notifications',
      title: 'Notificações',
      description: 'Gerencie alertas do sistema, e-mails e notificações push globais.',
      icon: Bell,
      color: 'text-indigo-500',
      bg: 'bg-indigo-500/10',
      action: 'Configurar Alertas',
      onClick: () => setActiveModal('notifications')
    }
  ];

  const closeModal = (cancel?: boolean) => {
    if (!cancel) {
      setSettings(prev => ({ ...prev, primaryColor: localSettings.primaryColor }));
      // Save other functional state eventually
    } else {
      // Revert single-session changes like color if cancel was clicked
      updateColorGlobally(settings.primaryColor);
      setLocalSettings(prev => ({ ...prev, primaryColor: settings.primaryColor }));
    }
    setActiveModal(null);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 py-8 px-4">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles size={16} className="animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Painel de Controle</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-foreground">
            Configurações <span className="text-primary">Gerais</span>
          </h2>
          <p className="text-muted-foreground text-sm max-w-md">
            Gerencie todos os aspectos técnicos e visuais da sua plataforma em um único lugar.
          </p>
        </div>
        
        <div className="flex items-center gap-4 bg-surface/50 backdrop-blur-md border border-border p-2 rounded-2xl">
          <div className="px-4 py-2 border-r border-border">
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Status do Sistema</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold">Operacional</span>
            </div>
          </div>
          <div className="px-4 py-2">
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Versão</p>
            <p className="text-xs font-bold mt-1">v2.4.0-premium</p>
          </div>
        </div>
      </div>
      
      {/* BAA Diagnostic Button */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <Card className="p-8 border-2 border-dashed border-orange-200 hover:border-rose-500/50 bg-gradient-to-r from-rose-50/50 to-orange-50/50 hover:from-rose-50 hover:to-orange-50 transition-all">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-r from-rose-500 to-orange-500 flex items-center justify-center shadow-xl">
              <AlertTriangle size={28} className="text-white drop-shadow-lg" />
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-black text-foreground tracking-tight mb-2">BAA - Testes em Massa</h3>
              <p className="text-muted-foreground leading-relaxed">Testa todas as tabelas Supabase, APIs Facebook, permissões e conexões. Cataloga erros automaticamente.</p>
            </div>
            <DiagnosticCenter />
          </div>
        </Card>
      </motion.div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {configSections.map((section, index) => (
          <motion.div
            key={section.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="group h-full flex flex-col justify-between p-8 hover:border-primary/30 transition-all duration-500">
              <div>
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 duration-500", section.bg, section.color)}>
                  <section.icon size={28} />
                </div>
                <h3 className="text-xl font-black tracking-tight text-foreground mb-3 group-hover:text-primary transition-colors">
                  {section.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-8">
                  {section.description}
                </p>
              </div>
              
              <button 
                onClick={section.onClick}
                disabled={!isAdmin}
                className={cn(
                  "w-full flex items-center justify-center gap-2 transition-all duration-500",
                  isAdmin 
                    ? "btn-secondary group-hover:btn-primary" 
                    : "py-3 px-4 rounded-xl bg-surface border border-border text-muted-foreground/50 cursor-not-allowed text-sm font-semibold"
                )}
              >
                {!isAdmin && <Lock size={14} className="opacity-50" />}
                {section.action}
              </button>
            </Card>
          </motion.div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeModal === 'colors' && (
          <ModalBase key="colors" title="Cores & Identidade" subtitle="Identidade Visual" icon={Palette} onClose={(cancel: any) => closeModal(cancel)}>
            <div className="p-6 bg-muted/50 rounded-3xl border border-border">
              <p className="text-sm text-muted-foreground mb-4">Escolha a cor primária neon do sistema.</p>
              <div className="flex gap-4">
                {['#00d4ff', '#8b5cf6', '#10b981', '#f43f5e', '#f59e0b'].map((color) => (
                  <button 
                    key={color} 
                    onClick={() => updateColorGlobally(color)}
                    className={cn(
                      "w-12 h-12 rounded-full border-2 shadow-lg relative transition-transform hover:scale-110",
                      localSettings.primaryColor === color ? "border-white scale-110" : "border-surface"
                    )}
                    style={{ backgroundColor: color }}
                  >
                    {localSettings.primaryColor === color && <CheckCircle2 className="absolute -top-1 -right-1 text-white bg-black/50 rounded-full" size={16} />}
                  </button>
                ))}
              </div>
            </div>
          </ModalBase>
        )}

        {activeModal === 'typography' && (
          <ModalBase key="typography" title="Tipografia" subtitle="Estilo de Textos" icon={Type} onClose={(cancel: any) => closeModal(cancel)}>
            <div className="space-y-4">
              <div className="p-4 border border-primary/20 bg-primary/5 rounded-2xl">
                <p className="text-xs text-primary font-bold uppercase mb-2">Fonte Primária (Títulos)</p>
                <select className="w-full bg-surface border-none outline-none p-2 rounded-xl font-bold">
                  <option>Inter (Ativa)</option>
                  <option>Roboto</option>
                  <option>Outfit</option>
                </select>
              </div>
              <div className="p-4 border border-border bg-surface-light/30 rounded-2xl">
                <p className="text-xs text-muted-foreground font-bold uppercase mb-2">Fonte Secundária (Texto)</p>
                <select className="w-full bg-surface border-none outline-none p-2 rounded-xl">
                  <option>Inter (Ativa)</option>
                  <option>System Default</option>
                </select>
              </div>
            </div>
          </ModalBase>
        )}

        {activeModal === 'branches' && (
          <ModalBase key="branches" title="Configurações de Filiais" subtitle="Parâmetros Globais" icon={Building2} onClose={(cancel: any) => closeModal(cancel)}>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin">
              <div className="p-4 border border-border rounded-2xl flex items-center justify-between bg-surface-light/30 cursor-pointer" onClick={() => toggleSetting('allowSelfRegistration')}>
                <div>
                  <p className="text-sm font-bold text-foreground">Permitir Auto-Cadastro</p>
                  <p className="text-[10px] text-muted-foreground">Novas filiais podem se registrar sozinhas?</p>
                </div>
                <div className={cn("w-10 h-5 rounded-full relative transition-colors", localSettings.allowSelfRegistration ? "bg-primary" : "bg-border")}>
                  <div className={cn("w-4 h-4 rounded-full absolute top-0.5 transition-all", localSettings.allowSelfRegistration ? "bg-white right-0.5 shadow-sm" : "bg-muted-foreground left-0.5")} />
                </div>
              </div>

              <h4 className="font-black text-sm text-primary uppercase tracking-widest mt-8 mb-4">Gestão do Meta Ads por Filial</h4>
              <p className="text-xs text-muted-foreground mb-6">Cada filial deve ter uma conta de anúncio fixada para sincronização de saldos e campanhas em tempo real.</p>
              
              <div className="space-y-4">
                {branches.map(branch => (
                  <BranchMetaLinker 
                    key={branch.id} 
                    branch={branch} 
                    adAccounts={adAccounts}
                    onLink={async (branchId: number, accountId: string) => {
                      await supabase.from('branches').update({ facebook_ad_account_id: accountId }).eq('id', branchId);
                      // Update local visual state optimally
                      branch.facebook_ad_account_id = accountId;
                      setAdAccounts([...adAccounts]); // Just trigger re-render
                    }}
                  />
                ))}
              </div>
            </div>
          </ModalBase>
        )}

        {activeModal === 'themes' && (
          <ModalBase key="themes" title="Temas & Interface" subtitle="Personalização de Interface" icon={Layout} onClose={(cancel: any) => closeModal(cancel)}>
            <div className="p-6 bg-muted/50 rounded-3xl border border-border mb-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Layout size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold">Modo de Exibição</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Controle Global de Estilo</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                As configurações de tema agora são gerenciadas dinamicamente através do seletor rápido na barra de navegação ou nas configurações de marca.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border border-border rounded-2xl bg-surface-light/30 cursor-pointer" onClick={() => toggleSetting('smoothTransitions')}>
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-2">Transições</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">{localSettings.smoothTransitions ? "Suaves" : "Rápidas"}</span>
                  <div className={cn("w-8 h-4 rounded-full relative transition-colors", localSettings.smoothTransitions ? "bg-primary" : "bg-border")}>
                    <div className={cn("absolute top-1 w-2 h-2 bg-white rounded-full transition-all", localSettings.smoothTransitions ? "right-1" : "left-1")} />
                  </div>
                </div>
              </div>
              <div className="p-4 border border-border rounded-2xl bg-surface-light/30 cursor-pointer" onClick={() => toggleSetting('glassEffects')}>
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-2">Efeitos Glass</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">{localSettings.glassEffects ? "Ativados" : "Desativados"}</span>
                  <div className={cn("w-8 h-4 rounded-full relative transition-colors", localSettings.glassEffects ? "bg-primary" : "bg-border")}>
                    <div className={cn("absolute top-1 w-2 h-2 bg-white rounded-full transition-all", localSettings.glassEffects ? "right-1" : "left-1")} />
                  </div>
                </div>
              </div>
            </div>
          </ModalBase>
        )}

        {activeModal === 'security' && (
          <ModalBase key="security" title="Segurança & Logs" subtitle="Políticas de Autenticação" icon={Shield} onClose={(cancel: any) => closeModal(cancel)}>
             <div className="space-y-4">
              <div className="p-4 border border-border rounded-2xl flex items-center justify-between bg-surface-light/30 cursor-pointer" onClick={() => toggleSetting('forceMFA')}>
                <div>
                  <p className="text-sm font-bold text-foreground">Forçar 2FA (MFA)</p>
                  <p className="text-[10px] text-muted-foreground">Exigir autenticação em duas etapas para admins</p>
                </div>
                <div className={cn("w-10 h-5 rounded-full relative transition-colors", localSettings.forceMFA ? "bg-primary" : "bg-border")}>
                  <div className={cn("w-4 h-4 rounded-full absolute top-0.5 transition-all", localSettings.forceMFA ? "bg-white right-0.5 shadow-sm" : "bg-muted-foreground left-0.5")} />
                </div>
              </div>
              <div className="p-4 border border-border rounded-2xl flex items-center justify-between bg-surface-light/30 cursor-pointer" onClick={() => toggleSetting('sessionTimeout')}>
                <div>
                  <p className="text-sm font-bold text-foreground">Time-out de Sessão</p>
                  <p className="text-[10px] text-muted-foreground">Deslogar automaticamente após 30 min inativo</p>
                </div>
                <div className={cn("w-10 h-5 rounded-full relative transition-colors", localSettings.sessionTimeout ? "bg-primary" : "bg-border")}>
                  <div className={cn("w-4 h-4 rounded-full absolute top-0.5 transition-all", localSettings.sessionTimeout ? "bg-white right-0.5 shadow-sm" : "bg-muted-foreground left-0.5")} />
                </div>
              </div>
            </div>
          </ModalBase>
        )}

        {activeModal === 'notifications' && (
          <ModalBase key="notifications" title="Alertas Globais" subtitle="Sistema de Notificações" icon={Bell} onClose={(cancel: any) => closeModal(cancel)}>
            <div className="space-y-4">
              <div className="p-4 border border-border rounded-2xl flex items-center justify-between bg-surface-light/30 cursor-pointer" onClick={() => toggleSetting('pushAlerts')}>
                <div>
                  <p className="text-sm font-bold text-foreground">Alertas de Venda Pendente</p>
                  <p className="text-[10px] text-muted-foreground">Enviar push sempre que uma venda demorar para aprovar</p>
                </div>
                <div className={cn("w-10 h-5 rounded-full relative transition-colors", localSettings.pushAlerts ? "bg-primary" : "bg-border")}>
                  <div className={cn("w-4 h-4 rounded-full absolute top-0.5 transition-all", localSettings.pushAlerts ? "bg-white right-0.5 shadow-sm" : "bg-muted-foreground left-0.5")} />
                </div>
              </div>
              <div className="p-4 border border-border rounded-2xl flex items-center justify-between bg-surface-light/30 cursor-pointer" onClick={() => toggleSetting('emailReports')}>
                <div>
                  <p className="text-sm font-bold text-foreground">Relatório Diário via Email</p>
                  <p className="text-[10px] text-muted-foreground">Disparar às 08h da manhã com resumo do dia anterior</p>
                </div>
                <div className={cn("w-10 h-5 rounded-full relative transition-colors", localSettings.emailReports ? "bg-primary" : "bg-border")}>
                  <div className={cn("w-4 h-4 rounded-full absolute top-0.5 transition-all", localSettings.emailReports ? "bg-white right-0.5 shadow-sm" : "bg-muted-foreground left-0.5")} />
                </div>
              </div>
            </div>
          </ModalBase>
        )}
      </AnimatePresence>
    </div>
  );
};
