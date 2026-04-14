import React, { useState, useEffect } from 'react';
import { KPI, Card, Badge } from '@/components/UI';
import { Building2, TrendingUp, DollarSign, Wallet, AlertTriangle, ArrowUpAZ, ArrowDownZA, X, Zap, RefreshCw } from 'lucide-react';
import { formatCurrency, formatPercent, cn, calculateDailySpend, calculateRealTimeBalance, isCriticalBranchesDismissed, dismissCriticalBranchesForCompany } from '@/lib/utils';
import { logAuditEvent } from '@/lib/audit';
import { supabase } from '@/lib/supabase';
import axios from 'axios';
import { useToasts } from '@/components/Toast';
import { BranchRealTimeDashboard } from '@/components/BranchRealTimeDashboard';
import { Branch, Campaign, Sale, Company } from '@/types';

interface Props {
  selectedCompany: Company;
  branches: Branch[];
  campaigns: Campaign[];
  sales: Sale[];
  branchSortBy: 'name' | 'balance' | 'daysRemaining' | 'roi';
  setBranchSortBy: (sortBy: 'name' | 'balance' | 'daysRemaining' | 'roi') => void;
  branchSortOrder: 'asc' | 'desc';
  setBranchSortOrder: (order: 'asc' | 'desc') => void;
  handleSelectBranch: (branch: Branch) => void;
}

export const CompanyView: React.FC<Props> = ({ 
  selectedCompany, branches, campaigns, sales, branchSortBy, setBranchSortBy, branchSortOrder, setBranchSortOrder, handleSelectBranch 
}) => {
  const [dismissedCritical, setDismissedCritical] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const { addToast } = useToasts();

  const handleSyncAll = async () => {
    setIsSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão não encontrada");

      const response = await axios.post('/api/facebook/sync-all', {}, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (response.data.success) {
        addToast('success', 'Sincronizado', 'Saldos de todas as filiais atualizados!');
      }
    } catch (err: any) {
      console.error('Sync-all error:', err);
      addToast('error', 'Erro Backend API', err.response?.data?.error || 'Não foi possível sincronizar agora.');
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (selectedCompany) {
      setDismissedCritical(isCriticalBranchesDismissed(selectedCompany.id));
      logAuditEvent('Visualizou Empresa', `Visualizou a empresa "${selectedCompany.name}"`, 'info');
    }
  }, [selectedCompany?.id]);

  const branchesForCompany = (branches || []).filter(b => b.company_id === selectedCompany.id);
  const salesForCompany = (sales || []).filter(s => branchesForCompany.some(b => b.id === s.branch_id));
  const totalBalance = branchesForCompany.reduce((acc, b) => acc + calculateRealTimeBalance(b), 0);
  const totalDailyInvestment = (campaigns || []).filter(c => branchesForCompany.some(b => b.id === c.branch_id)).reduce((acc, c) => acc + (c.spend || 0), 0);
  const totalSales = salesForCompany.length;
  const totalRoi = salesForCompany.length > 0 ? salesForCompany.reduce((acc, s) => acc + (s.roi || 0), 0) / salesForCompany.length : 0;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPI label="Total de Filiais" value={branchesForCompany.length.toString()} icon={Building2} />
        <KPI label="Investimento Diário" value={formatCurrency(totalDailyInvestment)} icon={DollarSign} />
        <KPI label="ROI Consolidado" value={formatPercent(totalRoi)} icon={TrendingUp} />
        <KPI label="Saldo Total" value={formatCurrency(totalBalance)} icon={Wallet} />
      </div>

      {!dismissedCritical && branchesForCompany.filter(b => {
        const dailySpend = calculateDailySpend((campaigns || []).filter(c => c.branch_id === b.id));
        const balance = calculateRealTimeBalance(b);
        return dailySpend > 0 && balance / dailySpend <= 3;
      }).length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold tracking-tight text-destructive flex items-center gap-2">
              <AlertTriangle size={20} />
              Filiais com Saldo Crítico (≤ 3 dias)
            </h3>
            <button 
              onClick={() => {
                setDismissedCritical(true);
                if (selectedCompany) {
                  dismissCriticalBranchesForCompany(selectedCompany.id);
                }
              }}
              className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
              title="Ocultar alertas"
            >
              <X size={20} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {branchesForCompany.filter(b => {
              const dailySpend = calculateDailySpend((campaigns || []).filter(c => c.branch_id === b.id));
              const balance = calculateRealTimeBalance(b);
              return dailySpend > 0 && balance / dailySpend <= 3;
            }).map(branch => {
              const dailySpend = calculateDailySpend((campaigns || []).filter(c => c.branch_id === branch.id));
              const balance = calculateRealTimeBalance(branch);
              const daysLeft = balance / dailySpend;
              return (
                <Card 
                  key={branch.id} 
                  className="bg-destructive/10 border-destructive/20 cursor-pointer hover:bg-destructive/20 transition-colors"
                  onClick={() => handleSelectBranch(branch)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-destructive">{branch.name}</h4>
                      <p className="text-sm text-destructive/80 mt-1">
                        Saldo: {formatCurrency(balance)}
                      </p>
                    </div>
                    <div className="px-2 py-1 bg-destructive text-destructive-foreground text-xs font-bold rounded-md">
                      {daysLeft < 1 ? 'Acaba hoje' : `${Math.floor(daysLeft)} dias`}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

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
              <Card key={branch.id} className="bg-muted border-border">
                <h4 className="font-bold text-foreground">{branch.name}</h4>
                <p className="text-sm text-muted-foreground">Vendas: {sales.filter(s => s.branch_id === branch.id).length}</p>
                <p className="text-sm text-muted-foreground">ROI: {formatPercent(sales.filter(s => s.branch_id === branch.id).reduce((acc, s) => acc + (s.roi || 0), 0) / sales.filter(s => s.branch_id === branch.id).length)}</p>
              </Card>
            ))}
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h3 className="text-xl font-bold tracking-tight">Filiais de {selectedCompany.name}</h3>
        <button 
          onClick={handleSyncAll}
          disabled={isSyncing}
          className="btn-secondary flex items-center gap-2 text-xs disabled:opacity-50"
        >
          <RefreshCw size={16} className={cn(isSyncing && "animate-spin")} />
          <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Tudo'}</span>
        </button>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label htmlFor="sort-by" className="text-xs font-bold text-muted-foreground uppercase tracking-widest hidden sm:inline">Ordenar por:</label>
            <select
              id="sort-by"
              value={branchSortBy}
              onChange={(e) => setBranchSortBy(e.target.value as 'name' | 'balance' | 'daysRemaining' | 'roi')}
              className={cn(
                "rounded-lg px-4 py-2 text-sm focus:outline-none transition-all font-medium appearance-none cursor-pointer",
                "bg-surface border border-border text-foreground focus:border-primary"
              )}
            >
              <option value="name" className="bg-surface text-foreground">Nome</option>
              <option value="balance" className="bg-surface text-foreground">Saldo</option>
              <option value="daysRemaining" className="bg-surface text-foreground">Dias Restantes</option>
              <option value="roi" className="bg-surface text-foreground">ROI</option>
            </select>
          </div>
          <button 
            onClick={() => setBranchSortOrder(branchSortOrder === 'asc' ? 'desc' : 'asc')}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
          >
            {branchSortOrder === 'asc' ? <ArrowUpAZ size={18} /> : <ArrowDownZA size={18} />}
          </button>
        </div>
      </div>

      <BranchRealTimeDashboard 
        companyId={selectedCompany.id} 
        onBranchClick={handleSelectBranch}
        sortBy={branchSortBy}
        sortOrder={branchSortOrder}
        search=""
        sales={salesForCompany}
        campaigns={campaigns.filter(c => branchesForCompany.some(b => b.id === c.branch_id))}
        branchesPerPage={6}
      />
    </div>
  );
};
