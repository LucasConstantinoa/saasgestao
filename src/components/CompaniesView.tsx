import React from 'react';
import { KPI, Card, Badge } from '@/components/UI';
import { Building2, TrendingUp, DollarSign, Users, ArrowRight, Edit2, Trash2, Plus, BarChart3, ChevronDown } from 'lucide-react';
import { formatCurrency, cn, calculateRealTimeBalance } from '@/lib/utils';
import { Company, Branch, Campaign, Sale } from '@/types';

interface Props {
  branches: Branch[];
  campaigns: Campaign[];
  sales: Sale[];
  companies: Company[];
  companyFilter: 'all' | 'association' | 'direct_sales';
  setCompanyFilter: (filter: 'all' | 'association' | 'direct_sales') => void;
  handleSelectCompany: (company: Company) => void;
  handleEditCompany: (company: Company) => void;
  handleDeleteCompany: (company: Company) => void;
  setIsAddModalOpen: (open: boolean) => void;
}

export const CompaniesView: React.FC<Props> = ({ 
  branches, campaigns, sales, companies, companyFilter, setCompanyFilter, 
  handleSelectCompany, handleEditCompany, handleDeleteCompany, setIsAddModalOpen 
}) => {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPI 
          label="Total em Saldo" 
          value={formatCurrency(branches.reduce((acc, b) => acc + calculateRealTimeBalance(b), 0))} 
          icon={DollarSign} 
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

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="text-lg font-bold tracking-tight text-foreground uppercase tracking-widest">Suas Empresas</h3>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value as any)}
              className={cn(
                "appearance-none text-sm rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all",
                "bg-surface border border-border text-foreground"
              )}
            >
              <option value="all" className="bg-surface text-foreground">Todas as Empresas</option>
              <option value="association" className="bg-surface text-foreground">Associação</option>
              <option value="direct_sales" className="bg-surface text-foreground">Venda Direta</option>
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
          <button className="p-2 rounded-lg bg-muted border border-border text-muted-foreground hover:text-primary transition-all">
            <BarChart3 size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {companies && companies.length > 0 ? companies.filter(c => companyFilter === 'all' || c.type === companyFilter).map((company) => (
          <Card key={company.id} onClick={() => handleSelectCompany(company)} animateBorder={true}>
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-muted border border-border flex items-center justify-center overflow-hidden">
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
              <div className="p-3 rounded-xl bg-muted border border-border">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Budget Mensal</p>
                <p className="font-bold text-sm text-foreground">{formatCurrency(company.monthly_budget)}</p>
              </div>
              <div className="p-3 rounded-xl bg-muted border border-border">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Filiais</p>
                <p className="font-bold text-sm text-foreground">0</p>
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
        )) : null}

        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="border-2 border-dashed border-border rounded-[2rem] p-6 flex flex-col items-center justify-center gap-3 text-muted-foreground hover:border-primary/40 hover:text-primary transition-all group min-h-[200px] bg-muted/30"
        >
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform border border-primary/20">
            <Plus size={24} />
          </div>
          <span className="font-bold text-sm uppercase tracking-widest">Adicionar Empresa</span>
        </button>
      </div>
    </div>
  );
};
