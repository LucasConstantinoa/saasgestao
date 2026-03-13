import React, { useState, useEffect } from 'react';
import { Card, Badge } from './UI';
import { Modal } from './Modal';
import { Send, Copy, MessageCircle, Calendar as CalendarIcon, FileText } from 'lucide-react';
import { useToasts } from './Toast';
import { cn } from '../lib/utils';
import { Branch, Company, Campaign } from '../types';

interface ReportsViewProps {
  branches: Branch[];
  companies: Company[];
  campaigns: Campaign[];
}

export const ReportsView = ({ branches, companies, campaigns }: ReportsViewProps) => {
  const { addToast } = useToasts();
  
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  
  // Report Form State
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [alcance, setAlcance] = useState('');
  const [impressoes, setImpressoes] = useState('');
  const [cliques, setCliques] = useState('');
  const [ctr, setCtr] = useState('');
  const [leads, setLeads] = useState('');
  const [investimento, setInvestimento] = useState('');
  const [custoConversa, setCustoConversa] = useState('');
  const [cpc, setCpc] = useState('');

  // Auto-calculate investment when dates change
  useEffect(() => {
    if (selectedBranch && periodStart && periodEnd) {
      const start = new Date(periodStart + 'T12:00:00');
      const end = new Date(periodEnd + 'T12:00:00');
      
      if (end >= start) {
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end days
        
        const branchCampaigns = (campaigns || []).filter(c => c.branch_id === selectedBranch.id);
        const dailySpend = branchCampaigns.reduce((acc, c) => acc + (c.spend || 0), 0);
        
        const totalInvestment = dailySpend * diffDays;
        setInvestimento(totalInvestment.toFixed(2));
      } else {
        setInvestimento('');
      }
    }
  }, [periodStart, periodEnd, selectedBranch, campaigns]);

  // Auto-calculate CPC and Custo por Conversa
  useEffect(() => {
    const inv = parseFloat(investimento);
    const cliq = parseInt(cliques);
    const lds = parseInt(leads);

    if (!isNaN(inv)) {
      if (!isNaN(cliq) && cliq > 0) {
        setCpc((inv / cliq).toFixed(2));
      } else {
        setCpc('');
      }

      if (!isNaN(lds) && lds > 0) {
        setCustoConversa((inv / lds).toFixed(2));
      } else {
        setCustoConversa('');
      }
    } else {
      setCpc('');
      setCustoConversa('');
    }
  }, [investimento, cliques, leads]);

  const handleOpenReportModal = (branch: Branch) => {
    setSelectedBranch(branch);
    // Reset form
    setPeriodStart('');
    setPeriodEnd('');
    setAlcance('');
    setImpressoes('');
    setCliques('');
    setCtr('');
    setLeads('');
    setInvestimento('');
    setCustoConversa('');
    setCpc('');
    setIsReportModalOpen(true);
  };

  const handleGenerateReport = () => {
    if (!periodStart || !periodEnd) {
      addToast('warning', 'Atenção', 'Selecione o período do relatório.');
      return;
    }
    setIsReportModalOpen(false);
    setIsResultModalOpen(true);
  };

  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
  };

  const getFormattedReport = () => {
    if (!selectedBranch) return '';
    
    const start = periodStart ? new Date(periodStart + 'T12:00:00').toLocaleDateString('pt-BR') : '';
    const end = periodEnd ? new Date(periodEnd + 'T12:00:00').toLocaleDateString('pt-BR') : '';
    
    return `📊 *Relatório de Campanha*

✅ *Filial:* ${selectedBranch.name}
🗓️ *Período:* ${start} a ${end}

📌 *Alcance:* ${alcance || '0'}
📈 *Impressões:* ${impressoes || '0'}
👀 *Cliques:* ${cliques || '0'}
🎯 *CTR:* ${ctr || '0'}%
📥 *Leads:* ${leads || '0'}
💰 *Investimento:* ${formatCurrency(investimento)}
📌 *Custo por Conversa iniciada:* ${formatCurrency(custoConversa)}
📌 *Custo por Cliques no link (CPC):* ${formatCurrency(cpc)}`;
  };

  const handleCopyReport = () => {
    navigator.clipboard.writeText(getFormattedReport());
    addToast('success', 'Copiado', 'Relatório copiado para a área de transferência.');
  };

  const handleSendWhatsApp = () => {
    if (!selectedBranch?.whatsapp) {
      addToast('error', 'Erro', 'Esta filial não possui um número de WhatsApp cadastrado.');
      return;
    }
    
    const text = encodeURIComponent(getFormattedReport());
    const number = selectedBranch.whatsapp.replace(/\D/g, '');
    window.open(`https://wa.me/${number}?text=${text}`, '_blank');
    addToast('success', 'Enviando', 'Abrindo o WhatsApp...');
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-white mb-2">Geração de Relatórios</h2>
        <p className="text-slate-500 dark:text-slate-400">Gere e envie relatórios detalhados para os responsáveis de cada filial.</p>
      </div>

      <Card className="p-6">
        <h3 className="font-bold text-xl text-slate-800 dark:text-white mb-6">Selecione a Filial</h3>
        
        {(branches || []).length === 0 ? (
          <div className="py-12 text-center text-slate-500 dark:text-primary/30 border-2 border-dashed border-slate-200 dark:border-primary/20 rounded-[2rem] bg-primary/5 dark:bg-primary/5">
            <p className="font-bold uppercase tracking-widest text-xs">Nenhuma filial cadastrada.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(branches || []).map(branch => {
              const company = (companies || []).find(c => c.id === branch.company_id);
              return (
                <div 
                  key={branch.id} 
                  className="flex flex-col p-5 rounded-2xl bg-slate-50 dark:bg-primary/5 border border-slate-200 dark:border-primary/20 hover:border-primary/40 transition-all group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-bold text-lg text-slate-800 dark:text-white group-hover:text-primary transition-colors">{branch.name}</h4>
                      <p className="text-xs font-medium text-slate-500 dark:text-primary/40">{company?.name}</p>
                    </div>
                    {branch.whatsapp ? (
                      <Badge variant="success" className="flex items-center gap-1"><MessageCircle size={10} /> WhatsApp OK</Badge>
                    ) : (
                      <Badge variant="warning">Sem WhatsApp</Badge>
                    )}
                  </div>
                  
                  <button 
                    onClick={() => handleOpenReportModal(branch)}
                    className="mt-auto w-full py-2.5 rounded-xl bg-primary/10 text-primary font-bold text-xs uppercase tracking-widest hover:bg-primary hover:text-black transition-all flex items-center justify-center gap-2"
                  >
                    <FileText size={16} />
                    Gerar Relatório
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Modal de Preenchimento do Relatório */}
      <Modal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        title="Preencher Relatório"
        footer={
          <>
            <button onClick={() => setIsReportModalOpen(false)} className="btn-secondary">Cancelar</button>
            <button onClick={handleGenerateReport} className="btn-primary">Gerar Relatório</button>
          </>
        }
      >
        <div className="space-y-6">
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
            <p className="text-xs font-bold text-primary/60 uppercase tracking-widest mb-1">Filial Selecionada</p>
            <p className="font-bold text-lg text-slate-800 dark:text-white">{selectedBranch?.name}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Data Inicial</label>
              <input 
                type="date" 
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="w-full bg-slate-50 dark:bg-primary/5 border border-slate-200 dark:border-primary/20 rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all text-slate-800 dark:text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Data Final</label>
              <input 
                type="date" 
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="w-full bg-slate-50 dark:bg-primary/5 border border-slate-200 dark:border-primary/20 rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all text-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Alcance</label>
              <input 
                type="number" 
                value={alcance}
                onChange={(e) => setAlcance(e.target.value)}
                placeholder="Ex: 15000"
                className="w-full bg-slate-50 dark:bg-primary/5 border border-slate-200 dark:border-primary/20 rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all text-slate-800 dark:text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Impressões</label>
              <input 
                type="number" 
                value={impressoes}
                onChange={(e) => setImpressoes(e.target.value)}
                placeholder="Ex: 25000"
                className="w-full bg-slate-50 dark:bg-primary/5 border border-slate-200 dark:border-primary/20 rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all text-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Cliques</label>
              <input 
                type="number" 
                value={cliques}
                onChange={(e) => setCliques(e.target.value)}
                placeholder="Ex: 850"
                className="w-full bg-slate-50 dark:bg-primary/5 border border-slate-200 dark:border-primary/20 rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all text-slate-800 dark:text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">CTR (%)</label>
              <input 
                type="number" step="0.01"
                value={ctr}
                onChange={(e) => setCtr(e.target.value)}
                placeholder="Ex: 2.5"
                className="w-full bg-slate-50 dark:bg-primary/5 border border-slate-200 dark:border-primary/20 rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all text-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Leads</label>
              <input 
                type="number" 
                value={leads}
                onChange={(e) => setLeads(e.target.value)}
                placeholder="Ex: 45"
                className="w-full bg-slate-50 dark:bg-primary/5 border border-slate-200 dark:border-primary/20 rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all text-slate-800 dark:text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Investimento (R$)</label>
              <input 
                type="number" step="0.01"
                value={investimento}
                onChange={(e) => setInvestimento(e.target.value)}
                placeholder="Ex: 500.00"
                className="w-full bg-slate-50 dark:bg-primary/5 border border-slate-200 dark:border-primary/20 rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all text-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Custo por Conversa (R$)</label>
              <input 
                type="number" step="0.01"
                value={custoConversa}
                onChange={(e) => setCustoConversa(e.target.value)}
                placeholder="Ex: 5.50"
                className="w-full bg-slate-50 dark:bg-primary/5 border border-slate-200 dark:border-primary/20 rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all text-slate-800 dark:text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">CPC (R$)</label>
              <input 
                type="number" step="0.01"
                value={cpc}
                onChange={(e) => setCpc(e.target.value)}
                placeholder="Ex: 0.85"
                className="w-full bg-slate-50 dark:bg-primary/5 border border-slate-200 dark:border-primary/20 rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all text-slate-800 dark:text-white"
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal de Resultado do Relatório */}
      <Modal
        isOpen={isResultModalOpen}
        onClose={() => setIsResultModalOpen(false)}
        title="Relatório Gerado"
        footer={
          <>
            <button onClick={() => setIsResultModalOpen(false)} className="btn-secondary">Fechar</button>
            <div className="flex gap-2">
              <button onClick={handleCopyReport} className="btn-secondary flex items-center gap-2">
                <Copy size={16} /> Copiar
              </button>
              <button onClick={handleSendWhatsApp} className="btn-primary flex items-center gap-2 bg-[#25D366] text-white border-none hover:bg-[#128C7E] shadow-[0_8px_24px_rgba(37,211,102,0.35)]">
                <MessageCircle size={16} /> Enviar via WhatsApp
              </button>
            </div>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">O relatório está pronto para ser enviado. Você pode copiá-lo ou enviar diretamente pelo WhatsApp.</p>
          
          <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 relative group">
            <pre className="whitespace-pre-wrap font-sans text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
              {getFormattedReport()}
            </pre>
            <button 
              onClick={handleCopyReport}
              className="absolute top-4 right-4 p-2 rounded-lg bg-white dark:bg-slate-800 shadow-md text-slate-500 hover:text-primary opacity-0 group-hover:opacity-100 transition-all"
            >
              <Copy size={16} />
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
