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
import { Card, Badge } from './UI';
import { Company, Branch, Campaign, Sale } from '../types';
import { formatCurrency, formatPercent, calculateDailySpend } from '../lib/utils';
import { ChevronRight } from 'lucide-react';

interface EagleViewProps {
  companies: Company[];
  branches: Branch[];
  campaigns: Campaign[];
  sales: Sale[];
}

export const EagleView = ({ companies, branches, campaigns, sales }: EagleViewProps) => {
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

  if (selectedCompany) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-xl font-bold tracking-tight">Desempenho de {selectedCompany.name}</h3>
          <button onClick={() => setSelectedCompanyId(null)} className="btn-secondary flex items-center gap-2 text-xs w-fit">
            <ChevronRight size={16} className="rotate-180" />
            <span>Voltar para Empresas</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {selectedCompany.branches.map(branch => (
            <Card key={branch.id} className="group">
              <h4 className="font-black text-xl mb-6 text-slate-800 dark:text-sky-50 tracking-tight group-hover:text-primary transition-colors">{branch.name}</h4>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-sky-500/10">
                  <span className="text-[10px] font-extrabold text-slate-400 dark:text-sky-400/30 uppercase tracking-widest">Saldo</span>
                  <span className="font-black text-slate-800 dark:text-white">{formatCurrency(branch.balance)}</span>
                </div>
                
                <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-sky-500/10">
                  <span className="text-[10px] font-extrabold text-slate-400 dark:text-sky-400/30 uppercase tracking-widest">Gasto Diário</span>
                  <span className="font-black text-slate-800 dark:text-white">{formatCurrency(branch.dailySpend)}</span>
                </div>
                
                <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-sky-500/10">
                  <span className="text-[10px] font-extrabold text-slate-400 dark:text-sky-400/30 uppercase tracking-widest">ROI Médio</span>
                  <span className="font-black text-sky-500 dark:text-sky-400">{formatPercent(branch.roi)}</span>
                </div>

                <div className="flex items-center justify-between py-2">
                  <span className="text-[10px] font-extrabold text-slate-400 dark:text-sky-400/30 uppercase tracking-widest">Recarga Estimada</span>
                  <Badge variant={branch.daysRemaining < 3 ? 'error' : 'success'}>
                    {branch.daysRemaining === Infinity ? '∞' : new Date(Date.now() + branch.daysRemaining * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')}
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Card>
        <h3 className="text-lg font-black tracking-tight mb-10 text-slate-800 dark:text-sky-50 uppercase tracking-[0.1em]">Comparativo de Saldo por Empresa</h3>
        <div className="h-[300px] md:h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 212, 255, 0.05)" vertical={false} />
              <XAxis 
                dataKey="name" 
                stroke="#64748b" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                tick={{ fontSize: 10, fontWeight: 700 }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                stroke="#64748b" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(value) => `R$ ${value / 1000}k`}
                width={60}
                tick={{ fontWeight: 700 }}
              />
              <Tooltip 
                cursor={{ fill: 'rgba(0, 212, 255, 0.05)' }}
                contentStyle={{
                  backgroundColor: 'rgba(0, 0, 0, 0.9)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(0, 212, 255, 0.2)',
                  borderRadius: '16px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
                  padding: '12px'
                }}
                itemStyle={{ color: '#00d4ff', fontWeight: '900' }}
                labelStyle={{ color: '#f0f9ff', marginBottom: '4px', fontWeight: '800' }}
                formatter={(value: number) => [formatCurrency(value), 'Saldo']}
              />
              <Bar dataKey="balance" radius={[8, 8, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={index % 2 === 0 ? '#00d4ff' : '#38bdf8'} 
                    fillOpacity={0.9}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <h4 className="font-black mb-8 text-slate-800 dark:text-sky-50 uppercase tracking-widest text-sm">Desempenho por Empresa</h4>
          <div className="space-y-6">
            {companyPerformance.map(company => (
              <div 
                key={company.id} 
                className="p-5 rounded-2xl bg-slate-50/50 dark:bg-sky-950/20 border border-slate-200 dark:border-sky-500/10 cursor-pointer hover:bg-white dark:hover:bg-sky-900/30 hover:border-sky-500/30 transition-all group"
                onClick={() => setSelectedCompanyId(company.id)}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                  <h5 className="font-black text-xl text-slate-800 dark:text-sky-50 group-hover:text-sky-500 transition-colors">{company.name}</h5>
                  <Badge variant={company.criticalAlerts > 0 ? 'error' : 'success'} className="w-fit">
                    {company.criticalAlerts > 0 ? `${company.criticalAlerts} Alerta(s)` : 'Saudável'}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-sky-400/30 uppercase tracking-widest mb-1">Saldo Total</span>
                    <span className="font-black text-slate-800 dark:text-white text-sm">{formatCurrency(company.totalBalance)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-sky-400/30 uppercase tracking-widest mb-1">Gasto Diário</span>
                    <span className="font-black text-slate-800 dark:text-white text-sm">{formatCurrency(company.totalSpend)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-sky-400/30 uppercase tracking-widest mb-1">ROI Médio</span>
                    <span className="font-black text-sky-500 dark:text-sky-400 text-sm">{formatPercent(company.totalRoi)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h4 className="font-black mb-8 text-slate-800 dark:text-sky-50 uppercase tracking-widest text-sm">Alertas Críticos</h4>
          <div className="space-y-4">
            {companyPerformance.filter(cp => cp.criticalAlerts > 0).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-sky-500/10 flex items-center justify-center mb-4">
                  <Badge variant="success" className="p-2">✓</Badge>
                </div>
                <p className="text-sm text-slate-500 dark:text-sky-400/40 font-bold uppercase tracking-widest">Operação 100% Saudável</p>
              </div>
            ) : (
              companyPerformance.filter(cp => cp.criticalAlerts > 0).map(company => (
                <div key={company.id} className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 group/alert hover:bg-rose-500/10 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-3 h-3 rounded-full bg-rose-500 animate-pulse shadow-[0_0_12px_rgba(244,63,94,0.6)]" />
                      <span className="font-black text-base text-rose-600 dark:text-rose-400">{company.name}</span>
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
    </div>
  );
};
