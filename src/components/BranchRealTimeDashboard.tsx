import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useTrafficFlow } from '@/context/TrafficFlowContext';
import { BalanceEvolutionChart } from './BalanceEvolutionChart';
import { Trash2, AlertTriangle, CheckCircle, Clock, AlertCircle, Building2, PauseCircle, TrendingUp, Wallet, Zap, BarChart3, RefreshCw } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Tooltip } from '@/components/Tooltip';
import { cn } from '@/lib/utils';
import { logSecurityEvent } from '@/lib/security';
import { useToasts } from '@/components/Toast';
import { supabase } from '@/lib/supabase';
import { Branch, Campaign } from '@/types';
import { calculateDailySpend, formatCurrency } from '@/lib/utils';

export const BranchRealTimeDashboard: React.FC<{ 
  companyId: number; 
  onBranchClick: (branch: Branch) => void;
  sortBy?: 'name' | 'balance' | 'daysRemaining' | 'roi';
  sortOrder?: 'asc' | 'desc';
  search?: string;
  sales?: any[];
  campaigns?: Campaign[];
  branchesPerPage?: number;
}> = ({ companyId, onBranchClick, sortBy = 'name', sortOrder = 'asc', search = '', sales = [], campaigns = [], branchesPerPage = 4 }) => {
  const { auditLogs, isAdmin, settings } = useTrafficFlow();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);
  const { addToast } = useToasts();
  const [syncingBranches, setSyncingBranches] = useState<Set<number>>(new Set());

  const handleSyncBranch = async (branchId: number) => {
    setSyncingBranches(prev => new Set(prev).add(branchId));
    try {
      // 1. Get branch data from Supabase
      const { data: branch } = await supabase
        .from('branches')
        .select('id, name, facebook_ad_account_id, facebook_access_token')
        .eq('id', branchId)
        .single();

      if (!branch?.facebook_ad_account_id) {
        addToast('warning', 'Sem conta', 'Filial sem conta de anúncio configurada.');
        return;
      }

      // 2. Get token
      let token = branch.facebook_access_token;
      if (!token) {
        const { data: s } = await supabase.from('settings').select('value').eq('key', 'facebook_access_token').single();
        token = s?.value;
      }
      if (!token) { addToast('error', 'Sem token', 'Token do Facebook não encontrado.'); return; }

      // 3. Parse ad account IDs
      const adAccountIds = branch.facebook_ad_account_id.split(',')
        .map((id: string) => id.trim().split('|')[0].replace('act_', '')).filter(Boolean);

      // 4. Call Facebook Graph API directly — prioritize display_string
      let totalBalance = 0;

      for (const cleanId of adAccountIds) {
        try {
          const res = await axios.get(`https://graph.facebook.com/v22.0/act_${cleanId}`, {
            params: {
              access_token: token,
              fields: 'balance,is_prepaid_account,funding_source_details{id,display_string,balance,type},spend_cap,amount_spent,total_prepaid_balance'
            },
            timeout: 10000
          });
          const d = res.data;
          console.log(`[SYNC] Account ${cleanId}:`, JSON.stringify(d));

          // PRIORITY 1: funding_source_details.display_string (user's preferred source)
          const displayStr = d.funding_source_details?.display_string;
          if (displayStr) {
            // Parse "R$ 1.234,56" or "$1,234.56" etc.
            const cleaned = displayStr.replace(/[^\d,.-]/g, '');
            // Detect format: if has both . and , → Brazilian (1.234,56) or US (1,234.56)
            let numericValue = 0;
            if (cleaned.includes(',') && cleaned.includes('.')) {
              // Check which comes last — that's the decimal separator
              const lastComma = cleaned.lastIndexOf(',');
              const lastDot = cleaned.lastIndexOf('.');
              if (lastComma > lastDot) {
                // Brazilian: 1.234,56
                numericValue = parseFloat(cleaned.replace(/\./g, '').replace(',', '.')) || 0;
              } else {
                // US: 1,234.56
                numericValue = parseFloat(cleaned.replace(/,/g, '')) || 0;
              }
            } else if (cleaned.includes(',')) {
              // Could be "1234,56" (decimal) or "1,234" (thousands)
              const parts = cleaned.split(',');
              if (parts[parts.length - 1].length === 2) {
                numericValue = parseFloat(cleaned.replace(',', '.')) || 0;
              } else {
                numericValue = parseFloat(cleaned.replace(/,/g, '')) || 0;
              }
            } else {
              numericValue = parseFloat(cleaned) || 0;
            }
            totalBalance += Math.abs(numericValue);
            console.log(`[SYNC] ${cleanId}: display_string="${displayStr}" → R$ ${numericValue}`);
            continue; // Got balance from display_string, skip other calculations
          }

          // PRIORITY 2: funding_source_details.balance (raw cents)
          if (d.funding_source_details?.balance) {
            const val = Math.abs(parseFloat(d.funding_source_details.balance) / 100);
            totalBalance += val;
            console.log(`[SYNC] ${cleanId}: funding_source.balance → R$ ${val}`);
            continue;
          }

          // PRIORITY 3: total_prepaid_balance
          if (d.total_prepaid_balance && parseFloat(d.total_prepaid_balance) !== 0) {
            const val = Math.abs(parseFloat(d.total_prepaid_balance) / 100);
            totalBalance += val;
            continue;
          }

          // PRIORITY 4: Postpaid calculation (spend_cap - amount_spent) or raw balance
          const rawBal = parseFloat(d.balance || "0") / 100;
          const spent = parseFloat(d.amount_spent || "0") / 100;
          const cap = parseFloat(d.spend_cap || "0") / 100;
          const calcBal = cap > 0 ? Math.max(0, cap - spent) : Math.abs(rawBal);
          totalBalance += calcBal;
        } catch (accErr: any) {
          console.error(`[SYNC] Erro conta ${cleanId}:`, accErr.response?.data?.error?.message || accErr.message);
        }
      }

      // 5. Save to Supabase & update UI
      await supabase.from('branches').update({ balance: totalBalance, updated_at: new Date().toISOString() }).eq('id', branchId);
      setBranches(prev => prev.map(b => b.id === branchId ? { ...b, balance: totalBalance } : b));
      addToast('success', 'Sincronizado', `${branch.name}: R$ ${totalBalance.toFixed(2)}`);

    } catch (err: any) {
      console.error('Sync error:', err);
      // Fallback: reload from Supabase
      const { data: fb } = await supabase.from('branches').select('balance').eq('id', branchId).single();
      if (fb) setBranches(prev => prev.map(b => b.id === branchId ? { ...b, balance: fb.balance } : b));
      addToast('error', 'Erro', err.message || 'Falha ao sincronizar.');
    } finally {
      setSyncingBranches(prev => { const n = new Set(prev); n.delete(branchId); return n; });
    }
  };

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('branches').select('*').eq('company_id', companyId);
    if (error) console.error('Error fetching branches:', error);
    else setBranches(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [companyId]);

  const handleSyncAll = async () => {
    const activeBranches = branches.filter(b => b.facebook_ad_account_id);
    if (activeBranches.length === 0) {
      addToast('warning', 'Sem filiais', 'Nenhuma filial com conta de anúncio configurada.');
      return;
    }
    addToast('info', 'Sincronizando', `Buscando saldos de ${activeBranches.length} filiais...`);
    
    for (const branch of activeBranches) {
      await handleSyncBranch(branch.id);
    }
    
    addToast('success', 'Concluído', 'Sincronização de todas as filiais finalizada.');
  };

  const filteredBranches = branches.filter(b => b.name.toLowerCase().includes(search.toLowerCase()));

  const sortedBranches = [...filteredBranches].sort((a, b) => {
    let compareA: any;
    let compareB: any;
    if (sortBy === 'name') {
      compareA = (a.name || '').toLowerCase();
      compareB = (b.name || '').toLowerCase();
    } else if (sortBy === 'balance') {
      compareA = a.balance || 0;
      compareB = b.balance || 0;
    } else if (sortBy === 'roi') {
      const aSales = (sales || []).filter(s => s.branch_id === a.id);
      const bSales = (sales || []).filter(s => s.branch_id === b.id);
      compareA = aSales.length > 0 ? aSales.reduce((acc, s) => acc + (s.roi || 0), 0) / aSales.length : 0;
      compareB = bSales.length > 0 ? bSales.reduce((acc, s) => acc + (s.roi || 0), 0) / bSales.length : 0;
    } else {
      const aDailySpend = calculateDailySpend((campaigns || []).filter(c => c.branch_id === a.id));
      const bDailySpend = calculateDailySpend((campaigns || []).filter(c => c.branch_id === b.id));
      compareA = aDailySpend > 0 ? Math.floor((a.balance || 0) / aDailySpend) : Infinity;
      compareB = bDailySpend > 0 ? Math.floor((b.balance || 0) / bDailySpend) : Infinity;
    }
    if (compareA < compareB) return sortOrder === 'asc' ? -1 : 1;
    if (compareA > compareB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const handleDeleteClick = (branch: Branch) => {
    if (!isAdmin) {
      addToast('error', 'Acesso negado', 'Apenas administradores podem excluir filiais.');
      return;
    }
    setBranchToDelete(branch);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteBranch = async () => {
    if (!branchToDelete) return;
    const { error } = await supabase.from('branches').delete().eq('id', branchToDelete.id);
    if (error) {
      console.error('Error deleting branch:', error);
    } else {
      await logSecurityEvent('DATA_MODIFIED', 'branches', { action: 'delete', branchId: branchToDelete.id, branchName: branchToDelete.name });
      await supabase.from('audit_log').insert({
        action: 'Filial excluída',
        detail: `"${branchToDelete.name}" foi removida do sistema.`,
        type: 'delete'
      });
      setIsDeleteModalOpen(false);
      setBranchToDelete(null);
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(sortedBranches.length / branchesPerPage);
  const paginatedBranches = sortedBranches.slice((currentPage - 1) * branchesPerPage, currentPage * branchesPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, sortBy, sortOrder]);

  if (loading) {
    return <div className="text-foreground text-center p-8">Carregando filiais...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between px-4">
        <h3 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          Gerenciamento de Saldos
        </h3>
        <button
          onClick={handleSyncAll}
          disabled={syncingBranches.size > 0}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
        >
          <RefreshCw size={14} className={cn(syncingBranches.size > 0 && "animate-spin")} />
          Sincronizar Tudo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-4">
        {paginatedBranches.map((branch) => (
          <BranchCard 
            key={branch.id}
            branch={branch}
            campaigns={campaigns.filter(c => c.branch_id === branch.id)}
            sales={sales.filter(s => s.branch_id === branch.id)}
            auditLogs={auditLogs}
            onDelete={() => handleDeleteClick(branch)}
            onClick={() => onBranchClick(branch)}
            onSync={() => handleSyncBranch(branch.id)}
            isSyncing={syncingBranches.has(branch.id)}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 rounded-lg border border-border text-sm font-bold disabled:opacity-30 transition-all hover:bg-primary/10"
          >
            Anterior
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={cn(
                  "w-10 h-10 rounded-lg font-bold text-sm transition-all",
                  currentPage === page 
                    ? "bg-primary text-primary-foreground" 
                    : "text-foreground/60 hover:bg-surface border border-border"
                )}
              >
                {page}
              </button>
            ))}
          </div>
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 rounded-lg border border-border text-sm font-bold disabled:opacity-30 transition-all hover:bg-primary/10"
          >
            Próxima
          </button>
        </div>
      )}

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirmar Exclusão de Filial"
        footer={
          <>
            <button onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 rounded-xl text-muted-foreground hover:bg-muted transition-all font-bold text-sm">Cancelar</button>
            <button onClick={confirmDeleteBranch} className="px-4 py-2 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all font-bold text-sm">Excluir Filial</button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Você tem certeza que deseja excluir a filial <span className="font-bold text-foreground">"{branchToDelete?.name}"</span>?
          </p>
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-2xl">
            <p className="text-xs text-destructive font-bold uppercase tracking-widest">Aviso Crítico</p>
            <p className="text-sm text-destructive/80 mt-1">
              Esta ação excluirá permanentemente todos os dados associados a esta filial.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const BranchCard: React.FC<{ 
  branch: Branch; 
  campaigns: Campaign[]; 
  sales: any[];
  auditLogs: any[];
  onDelete: () => void; 
  onClick: () => void;
  isSyncing?: boolean;
  onSync?: () => void;
}> = ({ branch, campaigns, sales, auditLogs, onDelete, onClick, isSyncing, onSync }) => {
  const [isChartModalOpen, setIsChartModalOpen] = useState(false);

  const isAllPaused = campaigns.length > 0 && campaigns.every(c => c.status === 'paused');
  const hasPaused = campaigns.some(c => c.status === 'paused');

  const roi = useMemo(() => {
    if (sales.length === 0) return 0;
    return sales.reduce((acc, s) => acc + (s.roi || 0), 0) / sales.length;
  }, [sales]);

  const dailySpend = useMemo(() => calculateDailySpend(campaigns), [campaigns]);

  const [alert, setAlert] = useState({ text: '', color: '' });

  useEffect(() => {
    if (campaigns.length === 0) {
      setAlert({ text: 'Aguardando campanha', color: 'text-muted-foreground' });
      return;
    }
    
    const dailyRate = calculateDailySpend(campaigns);
    const daysLeft = dailyRate > 0 ? (branch.balance || 0) / dailyRate : Infinity;
    
    if ((branch.balance || 0) <= 0) {
      setAlert({ text: 'CAIXA ZERADO', color: 'text-rose-500' });
    } else if (isAllPaused) {
      setAlert({ text: 'Campanhas Pausadas', color: 'text-amber-500' });
    } else if (daysLeft === Infinity) {
      setAlert({ text: 'Sem gasto diário', color: 'text-muted-foreground' });
    } else {
      const rechargeDate = new Date(Date.now() + daysLeft * 24 * 60 * 60 * 1000);
      const dateStr = rechargeDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      const timeStr = rechargeDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      
      let color = 'text-emerald-500';
      if (daysLeft <= 3) color = 'text-orange-500';
      setAlert({ text: `Recarregar: ${dateStr} às ${timeStr}`, color });
    }
  }, [branch, campaigns, isAllPaused]);

  return (
    <>
      <Tooltip
        position="right"
        content={
          <div className="space-y-1">
            <p><span className="text-primary font-bold">Campanhas:</span> {campaigns.length}</p>
            <p><span className="text-primary font-bold">Gasto Diário:</span> {formatCurrency(dailySpend)}</p>
          </div>
        }
      >
        <div
          onClick={onClick}
          className={cn(
            "relative group cursor-pointer rounded-2xl border border-border bg-card shadow-sm hover:border-primary/50 transition-all duration-300 min-h-[280px]",
            (branch.balance || 0) <= 0 && "border-rose-500/50",
            isAllPaused && "opacity-70"
          )}
        >
          <div className="flex flex-col h-full p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center",
                  isAllPaused ? "bg-amber-500/10 text-amber-500" : "bg-primary/10 text-primary"
                )}>
                  <Building2 size={20} />
                </div>
                <div>
                  <span className="font-black text-sm text-foreground block" title={branch.name}>
                    {branch.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{campaigns.length} campanhas</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                  onClick={(e) => { e.stopPropagation(); setIsChartModalOpen(true); }}
                >
                  <BarChart3 size={14} />
                </button>
                <button 
                  className="p-2 rounded-lg text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10 transition-all"
                  onClick={(e) => { e.stopPropagation(); onSync && onSync(); }}
                  disabled={isSyncing}
                >
                  <RefreshCw size={14} className={cn(isSyncing && "animate-spin")} />
                </button>
                <button 
                  className="p-2 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-all" 
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center py-4">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Saldo Atual Meta</span>
              <div className={cn(
                "text-4xl font-black tracking-tight",
                isAllPaused ? "text-muted-foreground" : "text-foreground"
              )}>
                {formatCurrency(branch.balance || 0)}
              </div>
              <div className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-muted mt-3",
                alert.color
              )}>
                <span>{alert.text}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-border grid grid-cols-2 gap-3">
              <div className="flex flex-col items-center p-3 rounded-xl bg-muted">
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">ROI</span>
                <span className="text-lg font-black text-foreground">{roi.toFixed(1)}x</span>
              </div>
              <div className="flex flex-col items-center p-3 rounded-xl bg-muted">
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Gasto/Dia</span>
                <span className="text-lg font-black text-foreground">{formatCurrency(dailySpend, 0)}</span>
              </div>
            </div>

            {hasPaused && !isAllPaused && (
              <div className="absolute top-4 right-4">
                <PauseCircle size={14} className="text-amber-500 animate-pulse" />
              </div>
            )}
          </div>
        </div>
      </Tooltip>

      <Modal
        isOpen={isChartModalOpen}
        onClose={() => setIsChartModalOpen(false)}
        title={`Evolução de Saldo: ${branch.name}`}
      >
        <BalanceEvolutionChart branchId={branch.id} auditLogs={auditLogs} currentBalance={branch.balance || 0} />
      </Modal>
    </>
  );
};