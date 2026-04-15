import React, { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { KPI, Card, Badge } from '@/components/UI';
import { TrendingUp, DollarSign, Users, Plus, Edit2, Trash2, Pause, Play, ChevronDown, Settings as SettingsIcon, AlertCircle } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { formatCurrency, formatPercent, cn, calculateDailySpend } from '@/lib/utils';
import { Branch, Campaign, Sale, Company } from '@/types';
import { logAuditEvent } from '@/lib/audit';

interface Props {
  selectedBranch: Branch;
  selectedCompany: Company | null;
  branchCampaigns: Campaign[];
  sales: Sale[];
  salesSortBy: 'date' | 'value' | 'roi';
  salesSortOrder: 'asc' | 'desc';
  handleSalesSort: (field: 'date' | 'value' | 'roi') => void;
  handleToggleCampaignStatus: (campaign: Campaign) => void;
  handleDeleteCampaign: (campaign: Campaign) => void;
  setIsNewCampaignModalOpen: (open: boolean) => void;
  setIsRegisterSaleModalOpen: (open: boolean) => void;
  setIsEditBranchModalOpen: (open: boolean) => void;
  setSelectedCampaignForModal: (campaign: Campaign) => void;
}

export const BranchView: React.FC<Props> = ({ 
  selectedBranch: initialBranch, selectedCompany, branchCampaigns, sales, salesSortBy, salesSortOrder, handleSalesSort,
  handleToggleCampaignStatus, handleDeleteCampaign, setIsNewCampaignModalOpen, setIsRegisterSaleModalOpen,
  setIsEditBranchModalOpen, setSelectedCampaignForModal, user
}) => {
  const { hasAccess } = usePermissions(user?.id || '');
  const canEdit = hasAccess(selectedBranch.id, 'edit');
  const canAddSales = hasAccess(selectedBranch.id, 'add_sale');
  const [selectedBranch, setSelectedBranch] = React.useState(initialBranch);

  useEffect(() => {
    setSelectedBranch(initialBranch);
  }, [initialBranch]);

  useEffect(() => {
    if (selectedBranch) {
      logAuditEvent('Visualizou Filial', `Visualizou a filial "${selectedBranch.name}"`, 'info');
    }

    const channel = supabase
      .channel('branch_updates')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'branches', 
        filter: `id=eq.${selectedBranch.id}` 
      }, (payload) => {
        setSelectedBranch(payload.new as Branch);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedBranch?.id]);

  const branchSales = (sales || []).filter(s => s.branch_id === selectedBranch.id);
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

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">{selectedBranch.name}</h2>
        <button 
          onClick={() => canEdit && setIsEditBranchModalOpen(true)}
          disabled={!canEdit}
          className={cn("btn-secondary flex items-center gap-2 text-xs", !canEdit && "opacity-50 cursor-not-allowed")}
        >
          <SettingsIcon size={16} />
          <span>{canEdit ? 'Editar Filial' : 'Sem permissão para editar'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* RealTimeBalanceKPI would need to be moved too, but for now let's keep it simple */}
        <KPI label="ROI Total" value={formatPercent(roi)} icon={TrendingUp} color="primary" />
        <KPI label="Gasto Total" value={formatCurrency(dailySpend)} icon={DollarSign} />
        <KPI label="Ticket Médio" value={formatCurrency(0)} icon={Users} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold tracking-tight">Campanhas Ativas</h3>
            <button onClick={() => canEdit && setIsNewCampaignModalOpen(true)} className={cn("btn-primary flex items-center gap-2 text-xs", !canEdit && "opacity-50 cursor-not-allowed")} disabled={!canEdit}>
              <Plus size={16} />
              <span>{canEdit ? 'Nova Campanha' : 'Sem permissão'}</span>
            </button>
          </div>
          
          <div className="overflow-x-auto no-scrollbar glass rounded-[2rem] border border-border shadow-xl">
            <table className="w-full text-left text-sm min-w-[600px]">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Campanha</th>
                  <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Propósito</th>
                  <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Gasto Diário</th>
                  <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Status</th>
                  <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px] text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {branchCampaigns.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground italic">Nenhuma campanha cadastrada</td>
                  </tr>
                ) : (
                  branchCampaigns.map(c => (
                    <tr 
                      key={c.id} 
                      onClick={() => setSelectedCampaignForModal(c)}
                      className={cn(
                        "group hover:bg-muted/50 transition-colors cursor-pointer",
                        c.status === 'paused' && "opacity-60 grayscale-[0.5]"
                      )}
                    >
                      <td className="px-6 py-4 font-bold text-foreground">{c.name}</td>
                      <td className="px-6 py-4">
                        <Badge variant={c.status === 'paused' ? 'neutral' : 'primary'}>
                          {c.purpose}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 font-medium text-foreground">{formatCurrency(c.spend)}</td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "text-xs font-bold uppercase tracking-widest",
                          c.status === 'paused' ? "text-muted-foreground" : "text-emerald-500"
                        )}>
                          {c.status === 'paused' ? 'Pausada' : 'Ativa'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button 
                            onClick={(e) => { e.stopPropagation(); if (canEdit) handleToggleCampaignStatus(c); }}
                            disabled={!canEdit}
                            className={cn(
                              "p-1.5 rounded-lg transition-all",
                              c.status === 'paused' ? "hover:bg-emerald-500/10 text-emerald-500" : "hover:bg-amber-500/10 text-amber-500",
                              !canEdit && "opacity-50 cursor-not-allowed"
                            )}
                            title={!canEdit ? "Sem permissão para editar" : c.status === 'paused' ? "Ativar" : "Pausar"}
                          >
                            {c.status === 'paused' ? <Play size={14} /> : <Pause size={14} />}
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); if (canEdit) setSelectedCampaignForModal(c); }} className={cn("p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-all", !canEdit && "opacity-50 cursor-not-allowed")} disabled={!canEdit}><Edit2 size={14} /></button>
                          <button onClick={(e) => { e.stopPropagation(); if (canEdit) handleDeleteCampaign(c); }} className={cn("p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-400 transition-all", !canEdit && "opacity-50 cursor-not-allowed")} disabled={!canEdit}><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-4">
            <h3 className="text-lg font-bold tracking-tight">Vendas Recentes</h3>
            <button onClick={() => canAddSales && setIsRegisterSaleModalOpen(true)} className={cn("btn-secondary flex items-center gap-2 text-xs", !canAddSales && "opacity-50 cursor-not-allowed")} disabled={!canAddSales}>
              <Plus size={16} />
              <span>{canAddSales ? (selectedCompany?.type === 'association' ? 'Registrar Adesão' : 'Registrar Venda') : 'Sem permissão para registrar'}</span>
            </button>
          </div>

          <div className="overflow-x-auto no-scrollbar glass rounded-[2rem] border border-border shadow-xl">
            <table className="w-full text-left text-sm min-w-[800px]">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
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
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sortedBranchSales.length === 0 ? (
                  <tr>
                    <td colSpan={selectedCompany?.type === 'association' ? 6 : 7} className="px-6 py-12 text-center text-muted-foreground italic">Nenhuma venda registrada</td>
                  </tr>
                ) : (
                  sortedBranchSales.map(s => (
                    <tr key={s.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-foreground">{s.client_name}</td>
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
                          <td className="px-6 py-4 text-muted-foreground">{s.installments}x</td>
                        </>
                      )}
                      <td className="px-6 py-4 font-medium text-foreground">{formatCurrency(s.total_ltv || 0)}</td>
                      <td className="px-6 py-4 font-bold text-emerald-500">{formatPercent(s.roi || 0)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
