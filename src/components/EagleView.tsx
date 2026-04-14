import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import { Card, Badge } from '@/components/UI';
import { Modal } from '@/components/Modal';
import { Company, Branch, Campaign, Sale } from '@/types';
import { formatCurrency, formatPercent, calculateDailySpend } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';
import { useTrafficFlow } from '@/context/TrafficFlowContext';

interface EagleViewProps {
  companies: Company[];
  branches: Branch[];
  campaigns: Campaign[];
  sales: Sale[];
}

export const EagleView = ({ companies, branches, campaigns, sales }: EagleViewProps) => {
  const { settings } = useTrafficFlow();
  const [selectedCompanyId, setSelectedCompanyId] = React.useState<number | null>(null);

  const companyPerformance = (companies || []).map(company => {
    const companyBranches = (branches || []).filter(b => b.company_id === company.id);
    const companyCampaigns = (campaigns || []).filter(c => companyBranches.some(b => b.id === c.branch_id));
    const companySales = (sales || []).filter(s => companyBranches.some(b => b.id === s.branch_id));

    const totalBalance = companyBranches.reduce((acc, b) => acc + (b.balance || 0), 0);
    const totalSpend = calculateDailySpend(companyCampaigns);
    const totalRoi = companySales.length > 0 ? companySales.reduce((acc, s) => acc + (s.roi || 0), 0) / companySales.length : 0;
    const criticalAlerts = companyBranches.filter(b => {
      const branchDailySpend = calculateDailySpend((campaigns || []).filter(c => c.branch_id === b.id));
      return (b.balance || 0) <= 0 || (branchDailySpend > 0 && (b.balance || 0) / branchDailySpend < 3);
    }).length;

    return {
      ...company,
      totalBalance,
      totalSpend,
      totalRoi,
      criticalAlerts,
      branches: companyBranches.map(branch => {
        const branchCampaigns = (campaigns || []).filter(c => c.branch_id === branch.id);
        const branchSales = (sales || []).filter(s => s.branch_id === branch.id);
        const branchDailySpend = calculateDailySpend(branchCampaigns);
        const branchRoi = branchSales.length > 0 ? branchSales.reduce((acc, s) => acc + (s.roi || 0), 0) / branchSales.length : 0;
        const daysRemaining = branchDailySpend > 0 ? Math.floor((branch.balance || 0) / branchDailySpend) : Infinity;
        const salesQuantity = branchSales.length;
        return {
          ...branch,
          dailySpend: branchDailySpend,
          roi: branchRoi,
          daysRemaining,
          salesQuantity,
        };
      }),
    };
  });

  const chartData = companyPerformance.map(cp => ({
    name: cp.name,
    balance: cp.totalBalance,
    roi: cp.totalRoi,
  }));

  const selectedCompany = companyPerformance.find(cp => cp.id === selectedCompanyId);

  return (
    <div className="space-y-8">
      <Card animateBorder={true}>
        <h3 className="text-lg font-black tracking-tight mb-10 text-foreground uppercase tracking-[0.1em]">Comparativo de Saldo por Empresa</h3>
        <div className="h-[300px] md:h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 212, 255, 0.05)" vertical={false} />
              <Tooltip 
                cursor={{ fill: 'rgba(0, 212, 255, 0.05)' }}
                contentStyle={{ 
                  backgroundColor: 'var(--surface)', 
                  border: '1px solid var(--border)', 
                  borderRadius: '12px',
                  color: 'var(--foreground)'
                }}
                formatter={(value: number) => [formatCurrency(value), 'Saldo']}
              />
              <XAxis 
                dataKey="name" 
                stroke="var(--muted-foreground)" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                tick={{ fontSize: 10, fontWeight: 700, fill: 'var(--muted-foreground)' }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                stroke="var(--muted-foreground)" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(value) => `R$ ${value / 1000}k`}
                width={60}
                tick={{ fontWeight: 700, fill: 'var(--muted-foreground)' }}
              />
              <Tooltip 
                cursor={{ fill: 'rgba(0, 212, 255, 0.05)' }}
                contentStyle={{
                  backgroundColor: 'var(--surface)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid var(--border)',
                  borderRadius: '16px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
                  padding: '12px'
                }}
                itemStyle={{ color: 'var(--primary)', fontWeight: '900' }}
                labelStyle={{ color: 'var(--foreground)', marginBottom: '4px', fontWeight: '800' }}
                formatter={(value: number) => [formatCurrency(value), 'Saldo']}
              />
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={settings.primaryColor || "var(--primary)"} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.5} />
                </linearGradient>
              </defs>
              <Bar dataKey="balance" radius={[8, 8, 0, 0]} fill="url(#barGradient)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card animateBorder={true}>
          <h4 className="font-black mb-8 text-foreground uppercase tracking-widest text-sm">Desempenho por Empresa</h4>
          <div className="space-y-6">
            {companyPerformance.map(company => (
              <Card 
                key={company.id} 
                animateBorder={true}
                className="p-5 rounded-2xl bg-muted/50 border border-border cursor-pointer hover:bg-surface hover:border-primary/30 transition-all group"
                onClick={() => setSelectedCompanyId(company.id)}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                  <h5 className="font-black text-xl text-foreground group-hover:text-primary transition-colors">{company.name}</h5>
                  <Badge variant={company.criticalAlerts > 0 ? 'error' : 'success'} className="w-fit">
                    {company.criticalAlerts > 0 ? `${company.criticalAlerts} Alerta(s)` : 'Saudável'}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Saldo Total</span>
                    <span className="font-black text-foreground text-sm">{formatCurrency(company.totalBalance)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Gasto Diário</span>
                    <span className="font-black text-foreground text-sm">{formatCurrency(company.totalSpend)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">ROI Médio</span>
                    <span className="font-black text-primary text-sm">{formatPercent(company.totalRoi)}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </Card>

        <Card animateBorder={true}>
          <h4 className="font-black mb-8 text-foreground uppercase tracking-widest text-sm">Alertas Críticos</h4>
          <div className="space-y-4">
            {companyPerformance.filter(cp => cp.criticalAlerts > 0).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Badge variant="success" className="p-2">✓</Badge>
                </div>
                <p className="text-sm text-muted-foreground font-bold uppercase tracking-widest">Operação 100% Saudável</p>
              </div>
            ) : (
              companyPerformance.filter(cp => cp.criticalAlerts > 0).map(company => (
                <div key={company.id} className="p-4 rounded-2xl bg-destructive/5 border border-destructive/20 group/alert hover:bg-destructive/10 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-3 h-3 rounded-full bg-destructive animate-pulse shadow-[0_0_12px_rgba(244,63,94,0.6)]" />
                      <span className="font-black text-base text-destructive">{company.name}</span>
                    </div>
                    <Badge variant="error">
                      {company.criticalAlerts} Filiais em risco
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Modal Estilizado para Visão de Águia das Filiais */}
      <Modal
        isOpen={!!selectedCompany}
        onClose={() => setSelectedCompanyId(null)}
        title={`Visão de Águia: ${selectedCompany?.name}`}
        size="xl"
      >
        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 premium-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {selectedCompany?.branches.map(branch => (
              <Card 
                key={branch.id} 
                borderRadius={24}
                animateBorder={true}
                className="p-6 rounded-3xl bg-surface/50 backdrop-blur-xl border border-border hover:border-primary/40 transition-all group relative overflow-hidden shadow-lg hover:shadow-primary/10"
              >
                {/* Efeito de Vidro/Brilho */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-700" />
                <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-secondary/5 rounded-full blur-3xl group-hover:bg-secondary/10 transition-all duration-700" />
                
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="font-black text-xl text-foreground tracking-tight group-hover:text-primary transition-colors">{branch.name}</h4>
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 group-hover:scale-110 transition-transform">
                      <ChevronRight size={18} />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-2 border-b border-border">
                      <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest">Saldo</span>
                      <span className="font-black text-foreground">{formatCurrency(branch.balance)}</span>
                    </div>
                    
                    <div className="flex items-center justify-between py-2 border-b border-border">
                      <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest">Gasto Diário</span>
                      <span className="font-black text-foreground">{formatCurrency(branch.dailySpend)}</span>
                    </div>
                    
                    <div className="flex items-center justify-between py-2 border-b border-border">
                      <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest">ROI Médio</span>
                      <span className="font-black text-primary">{formatPercent(branch.roi)}</span>
                    </div>
 
                    <div className="flex items-center justify-between py-2">
                      <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest">Recarga Estimada</span>
                      <Badge variant={branch.daysRemaining < 3 ? 'error' : 'success'}>
                        {branch.daysRemaining === Infinity ? '∞' : new Date(Date.now() + branch.daysRemaining * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')}
                      </Badge>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
};
