import React, { useMemo } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { AuditEntry, Branch } from '@/types';
import { formatCurrency } from '@/lib/utils';

import { useTrafficFlow } from '@/context/TrafficFlowContext';

interface BalanceEvolutionChartProps {
  branchId: number;
  auditLogs: AuditEntry[];
  currentBalance: number;
}

export const BalanceEvolutionChart: React.FC<BalanceEvolutionChartProps> = ({ branchId, auditLogs, currentBalance }) => {
  const { settings } = useTrafficFlow();
  const chartData = useMemo(() => {
    // Filter logs related to this branch and that have balance information
    const branchLogs = auditLogs
      .filter(log => log.detail?.includes(`"${branchId}"`) || log.detail?.includes(`ID: ${branchId}`) || true) // Fallback for now
      .filter(log => log.action === 'Recarga de Saldo' || log.action === 'Filial criada' || log.action === 'Filial editada');

    const data = branchLogs.map(log => {
      let balance = 0;
      
      const balanceMatch = log.detail?.match(/Novo saldo: R\$\s?([\d.,]+)/);
      if (balanceMatch) {
        balance = parseFloat(balanceMatch[1].replace(/\./g, '').replace(',', '.'));
      } else {
        const genericMatch = log.detail?.match(/R\$\s?([\d.,]+)/);
        if (genericMatch) {
          balance = parseFloat(genericMatch[1].replace(/\./g, '').replace(',', '.'));
        }
      }

      return {
        timestamp: new Date(log.timestamp).getTime(),
        date: new Date(log.timestamp).toLocaleDateString('pt-BR'),
        time: new Date(log.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        action: log.action,
        balance: balance
      };
    }).filter(d => d.balance > 0);

    // Add current balance as the last point
    data.push({
      timestamp: Date.now(),
      date: 'Hoje',
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      action: 'Saldo Atual',
      balance: currentBalance
    });

    // Sort by timestamp
    return data.sort((a, b) => a.timestamp - b.timestamp);
  }, [branchId, auditLogs, currentBalance]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-surface/95 backdrop-blur-md border border-border p-4 rounded-2xl shadow-2xl">
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="text-[10px] font-black text-primary uppercase tracking-widest">{data.action}</span>
            <span className="text-[10px] font-bold text-muted-foreground">{data.date} às {data.time}</span>
          </div>
          <div className="text-xl font-black text-foreground">
            {formatCurrency(data.balance)}
          </div>
        </div>
      );
    }
    return null;
  };

  if (chartData.length < 2) {
    return (
      <div className="h-64 flex flex-col items-center justify-center bg-muted/30 border border-dashed border-border rounded-[2rem] p-8 text-center">
        <p className="text-muted-foreground text-sm font-medium">
          Dados insuficientes para gerar o gráfico de evolução.
        </p>
        <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest mt-2">
          Continue recarregando o saldo para ver o histórico.
        </p>
      </div>
    );
  }

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={settings.primaryColor || "var(--primary)"} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={settings.primaryColor || "var(--primary)"} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
          <XAxis 
            dataKey="date" 
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'rgba(148, 163, 184, 0.5)', fontSize: 10 }}
            dy={10}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'rgba(148, 163, 184, 0.5)', fontSize: 10 }}
            tickFormatter={(value) => `R$ ${value >= 1000 ? (value/1000).toFixed(1) + 'k' : value}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area 
            type="monotone" 
            dataKey="balance" 
            stroke={settings.primaryColor || "var(--primary)"} 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorBalance)" 
            animationDuration={1500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
