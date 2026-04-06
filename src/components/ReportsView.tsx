import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Badge } from '@/components/UI';
import { HighlightCard } from '@/components/ProductHighlightCard';
import { Modal } from '@/components/Modal';
import { Send, Copy, MessageCircle, Calendar as CalendarIcon, FileText, Download, Loader2, TrendingUp, Target, DollarSign, Users, RefreshCw } from 'lucide-react';
import { useToasts } from '@/components/Toast';
import { cn, formatCurrency } from '@/lib/utils';
import { useTrafficFlow } from '@/context/TrafficFlowContext';
import { supabase } from '@/lib/supabase';
import { Branch, Company, Campaign } from '@/types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import axios from 'axios';

interface ReportsViewProps {
  branches: Branch[];
  companies: Company[];
  campaigns: Campaign[];
  branchesPerPage?: number;
}

export const ReportsView = ({ branches, companies, campaigns, branchesPerPage: branchesPerPageProp = 6 }: ReportsViewProps) => {
  const navigate = useNavigate();
  const { addToast } = useToasts();
  const { setSettings, settings } = useTrafficFlow();
  
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [selectedBranchIds, setSelectedBranchIds] = useState<number[]>([]);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [isFetchingFacebook, setIsFetchingFacebook] = useState(false);
  const [isBulkReport, setIsBulkReport] = useState(false);
  const [bulkReportData, setBulkReportData] = useState<any[]>([]);
  const [facebookCampaigns, setFacebookCampaigns] = useState<any[]>([]);
  const reportRef = React.useRef<HTMLDivElement>(null);
  
  // Global Filters
  const [globalStart, setGlobalStart] = useState(() => {
    const d = new Date();
    d.setDate(1); // First day of current month
    return d.toISOString().split('T')[0];
  });
  const [globalEnd, setGlobalEnd] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

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

  const [reportType, setReportType] = useState<'campaign' | 'unified'>('campaign');
  
  const displayedCampaigns = useMemo(() => {
    if (reportType === 'campaign') return facebookCampaigns;
    
    const total = facebookCampaigns.reduce((acc, camp) => {
      acc.reach += camp.reach;
      acc.impressions += camp.impressions;
      acc.clicks += camp.clicks;
      acc.spend += camp.spend;
      acc.leads += camp.leads;
      return acc;
    }, { name: 'Total Unificado', reach: 0, impressions: 0, clicks: 0, spend: 0, leads: 0 });
    
    return [total];
  }, [facebookCampaigns, reportType]);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [branchesPerPage, setBranchesPerPage] = useState(branchesPerPageProp);

  useEffect(() => {
    setBranchesPerPage(branchesPerPageProp);
  }, [branchesPerPageProp]);

  // Calculate summary based on global filters
  const summary = useMemo(() => {
    const start = new Date(globalStart + 'T12:00:00');
    const end = new Date(globalEnd + 'T12:00:00');
    
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      return { days: 0, totalInvestment: 0 };
    }

    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    const totalDailySpend = (campaigns || []).reduce((acc, c) => acc + (c.spend || 0), 0);
    
    return {
      days: diffDays,
      totalInvestment: totalDailySpend * diffDays
    };
  }, [globalStart, globalEnd, campaigns]);

  // Auto-calculate investment when dates change (only if Facebook is not connected)
  useEffect(() => {
    if (selectedBranch && periodStart && periodEnd && !selectedBranch.facebook_ad_account_id) {
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

  const totalPages = Math.ceil((branches || []).length / branchesPerPage);
  
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const paginatedBranches = (branches || []).slice((currentPage - 1) * branchesPerPage, currentPage * branchesPerPage);

  const fetchLastReport = async (branchId: number) => {
    const { data, error } = await supabase
      .from('reports')
      .select('end_date')
      .eq('branch_id', branchId)
      .order('end_date', { ascending: false })
      .limit(1)
      .single();
    
    if (error) return null;
    return data.end_date;
  };

  const saveReport = async (branchId: number, start: string, end: string) => {
    const { error } = await supabase
      .from('reports')
      .insert({ branch_id: branchId, start_date: start, end_date: end });
    
    if (error) {
      addToast('error', 'Erro', 'Falha ao salvar relatório.');
      return false;
    }
    return true;
  };

  const checkReportExists = async (branchId: number, start: string, end: string) => {
    const { data, error } = await supabase
      .from('reports')
      .select('id')
      .eq('branch_id', branchId)
      .lte('start_date', end)
      .gte('end_date', start);
    
    if (error) return false;
    return data.length > 0;
  };

  const fetchBranchInsights = async (branch: Branch, start: string, end: string) => {
    const token = branch.facebook_access_token || settings.facebook_access_token;
    const accountIdString = branch.facebook_ad_account_id;
    
    if (!token || !accountIdString) return;

    setIsFetchingFacebook(true);
    try {
      const accountIds = accountIdString.split(',').map(id => {
        const trimmed = id.trim().replace('act_', '');
        return trimmed.split('|')[0];
      }).filter(Boolean);
      
      let totalReach = 0;
      let totalImpressions = 0;
      let totalClicks = 0;
      let totalSpend = 0;
      let totalLeads = 0;
      const allCampaigns: any[] = [];

      for (const accountId of accountIds) {
        try {
          const insightsRes = await axios.get(`https://graph.facebook.com/v22.0/act_${accountId}/insights`, {
            headers: { Authorization: `Bearer ${token}` },
            params: {
              time_range: JSON.stringify({ since: start, until: end }),
              fields: 'campaign_name,reach,impressions,clicks,spend,actions',
              level: 'campaign'
            }
          });
          
          const data = insightsRes.data.data;
          if (data && data.length > 0) {
            data.forEach((row: any) => {
              const reach = parseInt(row.reach || '0');
              const impressions = parseInt(row.impressions || '0');
              const clicks = parseInt(row.clicks || '0');
              const spend = parseFloat(row.spend || '0');
              let leads = 0;
              
              if (row.actions) {
                const leadsAction = row.actions.find((a: any) => a.action_type === 'lead' || a.action_type === 'onsite_conversion.messaging_conversation_started_7d');
                if (leadsAction) {
                  leads = parseInt(leadsAction.value || '0');
                }
              }

              totalReach += reach;
              totalImpressions += impressions;
              totalClicks += clicks;
              totalSpend += spend;
              totalLeads += leads;

              allCampaigns.push({
                id: row.campaign_id,
                name: row.campaign_name,
                reach,
                impressions,
                clicks,
                spend,
                leads
              });
            });
          }
        } catch (err) {
          console.error(`Error fetching insights for account ${accountId}:`, err);
        }
      }

      setFacebookCampaigns(allCampaigns);
      setAlcance(totalReach.toString());
      setImpressoes(totalImpressions.toString());
      setCliques(totalClicks.toString());
      setInvestimento(totalSpend.toFixed(2));
      setLeads(totalLeads.toString());
      
      if (totalImpressions > 0) {
        setCtr(((totalClicks / totalImpressions) * 100).toFixed(2));
      } else {
        setCtr('0');
      }
      
      addToast('success', 'Dados Sincronizados', 'Informações atualizadas do Facebook.');
    } catch (err) {
      console.error("Error in fetchBranchInsights:", err);
      addToast('error', 'Erro', 'Falha ao buscar dados do Facebook.');
    } finally {
      setIsFetchingFacebook(false);
    }
  };

  const handleOpenReportModal = async (branch: Branch) => {
    setSelectedBranch(branch);
    setIsBulkReport(false);
    
    // Fetch last report date
    const lastEndDate = await fetchLastReport(branch.id);
    let startDate = globalStart;
    
    if (lastEndDate) {
      const d = new Date(lastEndDate + 'T12:00:00');
      d.setDate(d.getDate() + 1);
      startDate = d.toISOString().split('T')[0];
    }
    
    setPeriodStart(startDate);
    setPeriodEnd(globalEnd);
    setAlcance('');
    setImpressoes('');
    setCliques('');
    setCtr('');
    setLeads('');
    setInvestimento('');
    setCustoConversa('');
    setCpc('');
    
    setIsReportModalOpen(true);
    setFacebookCampaigns([]);
    // Scroll to top to ensure modal is centered and visible
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Initial fetch
    fetchBranchInsights(branch, startDate, globalEnd);
  };

  // Re-fetch when dates change in the modal
  useEffect(() => {
    if (isReportModalOpen && selectedBranch && periodStart && periodEnd) {
      const timer = setTimeout(() => {
        fetchBranchInsights(selectedBranch, periodStart, periodEnd);
      }, 800); // Debounce
      return () => clearTimeout(timer);
    }
  }, [periodStart, periodEnd, isReportModalOpen]);

  const handleGenerateReport = async () => {
    console.log("handleGenerateReport called");
    if (!periodStart || !periodEnd) {
      addToast('warning', 'Atenção', 'Selecione o período do relatório.');
      return;
    }

    if (selectedBranch) {
      const exists = await checkReportExists(selectedBranch.id, periodStart, periodEnd);
      if (exists) {
        addToast('warning', 'Atenção', 'Já existe um relatório enviado dentro deste período.');
        return;
      }

      const saved = await saveReport(selectedBranch.id, periodStart, periodEnd);
      if (!saved) return;
    }

    setIsReportModalOpen(false);
    setIsResultModalOpen(true);
    // Scroll to top to ensure modal is centered and visible
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGenerateBulkReport = async () => {
    if (selectedBranchIds.length === 0) {
      addToast('warning', 'Atenção', 'Selecione ao menos uma filial.');
      return;
    }

    setIsFetchingFacebook(true);
    const results = [];
    
    try {
      for (const branchId of selectedBranchIds) {
        const branch = branches.find(b => b.id === branchId);
        if (!branch) continue;

        let totalReach = 0;
        let totalImpressions = 0;
        let totalClicks = 0;
        let totalSpend = 0;
        let totalLeads = 0;

        if (branch.facebook_access_token && branch.facebook_ad_account_id) {
          const accountIds = branch.facebook_ad_account_id.split(',').map(id => {
            const trimmed = id.trim().replace('act_', '');
            return trimmed.split('|')[0];
          }).filter(Boolean);
          for (const accountId of accountIds) {
            try {
              const insightsRes = await axios.get(`https://graph.facebook.com/v22.0/act_${accountId}/insights`, {
                headers: { Authorization: `Bearer ${branch.facebook_access_token}` },
                params: {
                  time_range: JSON.stringify({ since: globalStart, until: globalEnd }),
                  fields: 'reach,impressions,clicks,spend,actions'
                }
              });
              
              const data = insightsRes.data.data;
              if (data && data.length > 0) {
                const row = data[0];
                totalReach += parseInt(row.reach || '0');
                totalImpressions += parseInt(row.impressions || '0');
                totalClicks += parseInt(row.clicks || '0');
                totalSpend += parseFloat(row.spend || '0');
                
                if (row.actions) {
                  const leadsAction = row.actions.find((a: any) => a.action_type === 'lead');
                  if (leadsAction) {
                    totalLeads += parseInt(leadsAction.value || '0');
                  }
                }
              }
            } catch (err) {
              console.error(`Error fetching insights for branch ${branch.name}, account ${accountId}:`, err);
            }
          }
        }

        results.push({
          branchName: branch.name,
          alcance: totalReach,
          impressoes: totalImpressions,
          cliques: totalClicks,
          investimento: totalSpend,
          leads: totalLeads,
          ctr: totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0',
          cpc: totalClicks > 0 ? (totalSpend / totalClicks).toFixed(2) : '0',
          custoConversa: totalLeads > 0 ? (totalSpend / totalLeads).toFixed(2) : '0'
        });
      }

      setBulkReportData(results);
      setIsBulkReport(true);
      setPeriodStart(globalStart);
      setPeriodEnd(globalEnd);
      setIsResultModalOpen(true);
      addToast('success', 'Relatório Gerado', 'Informações de múltiplas filiais processadas.');
    } catch (error) {
      console.error("Error generating bulk report:", error);
      addToast('error', 'Erro', 'Falha ao gerar relatório em massa.');
    } finally {
      setIsFetchingFacebook(false);
    }
  };

  const formatCurrencyValue = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getFormattedReport = () => {
    const start = periodStart ? new Date(periodStart + 'T12:00:00').toLocaleDateString('pt-BR') : '';
    const end = periodEnd ? new Date(periodEnd + 'T12:00:00').toLocaleDateString('pt-BR') : '';

    if (isBulkReport) {
      let reportText = `\uD83D\uDCCA *Relatório Consolidado de Campanhas*\n\n`;
      reportText += `\uD83D\uDDD3\uFE0F *Período:* ${start} a ${end}\n\n`;
      
      bulkReportData.forEach(data => {
        reportText += `\uD83C\uDFE2 *Filial:* ${data.branchName}\n`;
        reportText += `\uD83C\uDFAF Alcance: ${data.alcance}\n`;
        reportText += `\uD83D\uDCE5 Leads: ${data.leads}\n`;
        reportText += `\uD83D\uDCB0 Investimento: ${formatCurrency(data.investimento)}\n`;
        reportText += `-------------------\n`;
      });

      const totalAlcance = bulkReportData.reduce((acc, d) => acc + d.alcance, 0);
      const totalLeads = bulkReportData.reduce((acc, d) => acc + d.leads, 0);
      const totalInvestimento = bulkReportData.reduce((acc, d) => acc + d.investimento, 0);

      reportText += `\n\uD83D\uDCC8 *TOTAL CONSOLIDADO*\n`;
      reportText += `\uD83C\uDFAF Alcance Total: ${totalAlcance}\n`;
      reportText += `\uD83D\uDCE5 Leads Total: ${totalLeads}\n`;
      reportText += `\uD83D\uDCB0 Investimento Total: ${formatCurrency(totalInvestimento)}`;
      
      return reportText;
    }

    if (!selectedBranch) return '';
    
    let reportText = `\uD83D\uDCCA *Relatório de Campanha*

\uD83C\uDFE2 *Filial:* ${selectedBranch.name}
\uD83D\uDDD3\uFE0F *Período:* ${start} a ${end}

\uD83C\uDFAF *Alcance:* ${alcance || '0'}
\uD83D\uDC41\uFE0F *Impressões:* ${impressoes || '0'}
\uD83D\uDDB1\uFE0F *Cliques:* ${cliques || '0'}
\uD83D\uDCC8 *CTR:* ${ctr || '0'}%
\uD83D\uDCE5 *Leads:* ${leads || '0'}
\uD83D\uDCB0 *Investimento:* ${formatCurrency(parseFloat(investimento) || 0)}
\uD83D\uDCB8 *Custo por Conversa:* ${formatCurrency(parseFloat(custoConversa) || 0)}
\uD83C\uDFF7\uFE0F *CPC:* ${formatCurrency(parseFloat(cpc) || 0)}`;

    if (facebookCampaigns.length > 0) {
      reportText += `\n\n\uD83D\uDCE2 *Campanhas Ativas:*`;
      facebookCampaigns.forEach(camp => {
        reportText += `\n- ${camp.name}: ${formatCurrency(camp.spend)} (${camp.leads} leads)`;
      });
    }

    return reportText;
  };

  const handleCopyReport = () => {
    navigator.clipboard.writeText(getFormattedReport().replace(/\u00A0/g, ' '));
    addToast('success', 'Copiado', 'Relatório copiado para a área de transferência.');
  };

  const handleSendWhatsApp = async () => {
    if (!selectedBranch?.whatsapp) {
      addToast('error', 'Erro', 'Esta filial não possui um número de WhatsApp cadastrado.');
      return;
    }
    
    setIsSendingWhatsApp(true);
    try {
      const text = encodeURIComponent(getFormattedReport().replace(/\u00A0/g, ' '));
      const number = selectedBranch.whatsapp.replace(/\D/g, '');
      window.open(`https://api.whatsapp.com/send?phone=55${number}&text=${text}`, '_blank');
      addToast('success', 'Enviando', 'Abrindo o WhatsApp...');
      // Small delay to show the loading state
      await new Promise(resolve => setTimeout(resolve, 1000));
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    
    setIsExportingPDF(true);
    try {
      const element = reportRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          // Fix for Tailwind 4 oklch/oklab colors which html2canvas doesn't support
          const style = clonedDoc.createElement('style');
          style.innerHTML = `
            * {
              color-scheme: light !important;
            }
            /* Force hex colors for common elements to avoid oklab/oklch issues */
            .text-primary { color: #0284c7 !important; }
            .bg-primary { background-color: #0284c7 !important; }
            .border-primary { border-color: #0284c7 !important; }
            .text-foreground { color: #1C1917 !important; }
            .text-muted-foreground { color: #57534E !important; }
            .bg-card { background-color: #ffffff !important; }
            .border-border { border-color: #D1D5DB !important; }
          `;
          clonedDoc.head.appendChild(style);
        }
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      
      const fileName = isBulkReport 
        ? `Relatorio_Consolidado_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`
        : `Relatorio_${selectedBranch?.name || 'Campanha'}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`;
        
      pdf.save(fileName);
      
      addToast('success', 'Sucesso', 'Relatório exportado com sucesso.');
    } catch (error) {
      console.error('PDF Export error:', error);
      addToast('error', 'Erro', 'Não foi possível exportar o PDF.');
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-2">Geração de Relatórios</h2>
          <p className="text-sm text-muted-foreground">Gere e envie relatórios detalhados para os responsáveis de cada filial.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 bg-muted p-4 rounded-2xl border border-border shadow-sm w-full md:w-auto">
          <div className="flex items-center justify-between sm:justify-start gap-4 w-full sm:w-auto">
            <div className="space-y-1 flex-1 sm:flex-none">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Início</label>
              <input 
                type="date" 
                value={globalStart}
                onChange={(e) => setGlobalStart(e.target.value)}
                className="w-full bg-transparent border-none p-0 text-sm font-bold text-foreground focus:ring-0 cursor-pointer"
              />
            </div>
            <div className="w-px h-8 bg-border hidden sm:block" />
            <div className="flex items-center justify-between sm:justify-start gap-4 w-full sm:w-auto">
              <div className="space-y-1 flex-1 sm:flex-none">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Fim</label>
                <input 
                  type="date" 
                  value={globalEnd}
                  onChange={(e) => setGlobalEnd(e.target.value)}
                  className="w-full bg-transparent border-none p-0 text-sm font-bold text-foreground focus:ring-0 cursor-pointer"
                />
              </div>
            </div>
          </div>
          <div className="w-full h-px sm:w-px sm:h-8 bg-border block" />
          <div className="space-y-1 w-full sm:w-auto">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Filiais/Pág</label>
            <select 
              value={branchesPerPage}
              onChange={async (e) => {
                const newPerPage = parseInt(e.target.value);
                const newSettings = { ...settings, branchesPerPage: newPerPage };
                setSettings(newSettings);
                
                try {
                  await Promise.all(
                    Object.entries(newSettings).map(async ([key, value]) => {
                      const valToSave = (typeof value === 'object' && value !== null) ? JSON.stringify(value) : String(value);
                      const { error } = await supabase.from('settings').upsert({ key, value: valToSave }, { onConflict: 'key' });
                      if (error) throw error;
                    })
                  );
                  addToast('success', 'Configurações atualizadas', 'A quantidade de filiais por página foi salva.');
                } catch (error) {
                  console.error('Error updating settings:', error);
                  addToast('error', 'Erro ao salvar', 'Não foi possível salvar as configurações.');
                }
              }}
              className={cn(
                "w-full rounded-xl px-4 py-2 text-sm font-bold focus:outline-none transition-all cursor-pointer appearance-none",
                "bg-surface border border-border text-foreground focus:border-primary"
              )}
            >
              {[3, 6, 9, 12, 15, 20].map(n => (
                <option key={n} value={n} className="bg-surface text-foreground">{n} Filiais</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-primary/5 border-primary/20 rounded-3xl">
          <p className="text-xs font-bold text-primary/60 uppercase tracking-widest mb-2">Investimento no Período</p>
          <p className="text-3xl font-black text-foreground">{formatCurrencyValue(summary.totalInvestment)}</p>
          <p className="text-[10px] text-muted-foreground mt-2 font-bold uppercase tracking-widest">Total consolidado ({summary.days} dias)</p>
        </Card>
        <Card className="p-6 rounded-3xl">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Filiais Ativas</p>
          <p className="text-3xl font-black text-foreground">{branches.length}</p>
          <p className="text-[10px] text-muted-foreground mt-2 font-bold uppercase tracking-widest">Com campanhas vinculadas</p>
        </Card>
        <Card className="p-6 rounded-3xl">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Média por Filial</p>
          <p className="text-3xl font-black text-foreground">
            {branches.length > 0 ? formatCurrencyValue(summary.totalInvestment / branches.length) : 'R$ 0,00'}
          </p>
          <p className="text-[10px] text-muted-foreground mt-2 font-bold uppercase tracking-widest">Investimento médio no período</p>
        </Card>
      </div>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/50 backdrop-blur-md p-6 rounded-3xl border border-border shadow-sm">
          <h3 className="font-bold text-xl text-foreground">Selecione a Filial</h3>
          <div className="flex items-center gap-2">
            {selectedBranchIds.length > 0 && (
              <button 
                onClick={handleGenerateBulkReport}
                disabled={isFetchingFacebook}
                className="btn-primary flex items-center gap-2 py-2 px-4 text-xs"
              >
                {isFetchingFacebook ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <FileText size={14} />
                )}
                Gerar Relatório Selecionado ({selectedBranchIds.length})
              </button>
            )}
            <button 
              onClick={() => {
                if (selectedBranchIds.length === branches.length) {
                  setSelectedBranchIds([]);
                } else {
                  setSelectedBranchIds(branches.map(b => b.id));
                }
              }}
              className="btn-secondary py-2 px-4 text-xs"
            >
              {selectedBranchIds.length === branches.length ? 'Desmarcar Tudo' : 'Selecionar Tudo'}
            </button>
          </div>
        </div>
        
        {(branches || []).length === 0 ? (
          <div className="py-12 text-center text-muted-foreground border-2 border-dashed border-border rounded-[2rem] bg-primary/5 dark:bg-primary/5">
            <p className="font-bold uppercase tracking-widest text-xs">Nenhuma filial cadastrada.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 relative z-20">
              {paginatedBranches.map(branch => {
                const company = (companies || []).find(c => c.id === branch.company_id);
                const isSelected = selectedBranchIds.includes(branch.id);
                return (
                  <HighlightCard
                    key={branch.id} 
                    branchName={branch.name}
                    animateBorder={true}
                    onClick={() => {
                      if (selectedBranchIds.includes(branch.id)) {
                        setSelectedBranchIds(prev => prev.filter(id => id !== branch.id));
                      } else {
                        setSelectedBranchIds(prev => [...prev, branch.id]);
                      }
                    }}
                    className={cn(
                      "h-auto min-h-[250px] sm:aspect-square relative z-20 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.05] hover:z-50",
                      isSelected ? "ring-2 ring-primary border-primary scale-[1.02]" : ""
                    )}
                  >
                    <div className="absolute top-2 right-2 z-20">
                      <div className={cn(
                        "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                        isSelected ? "bg-primary border-primary text-black" : "bg-surface border-border"
                      )}>
                        {isSelected && <TrendingUp size={12} strokeWidth={4} />}
                      </div>
                    </div>
                    <div className="flex justify-between items-start mb-4 relative z-20">
                      <div className="pr-6">
                        <h4 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors truncate" title={branch.name}>{branch.name}</h4>
                        <p className="text-xs font-medium text-muted-foreground">{company?.name}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2 mt-auto relative z-20">
                      {branch.whatsapp ? (
                        <Badge variant="success" className="flex items-center gap-1 whitespace-nowrap w-fit"><MessageCircle size={10} /> <span className="hidden sm:inline">WhatsApp OK</span><span className="sm:hidden">OK</span></Badge>
                      ) : (
                        <Badge variant="warning" className="whitespace-nowrap w-fit"><span className="hidden sm:inline">Sem WhatsApp</span><span className="sm:hidden">Sem WPP</span></Badge>
                      )}
                      
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleOpenReportModal(branch); }}
                        className="mt-auto w-full py-3 sm:py-2.5 rounded-xl bg-primary/10 text-primary font-bold text-xs uppercase tracking-widest hover:bg-primary hover:text-black transition-all flex items-center justify-center gap-2 active:scale-95"
                      >
                        <FileText size={16} />
                        Gerar Relatório
                      </button>
                    </div>
                  </HighlightCard>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8 bg-card/50 backdrop-blur-md p-4 rounded-2xl border border-border w-fit mx-auto">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className={cn(
                    "p-2 rounded-lg border text-sm font-bold disabled:opacity-30 transition-all",
                    "bg-surface border-border text-foreground hover:bg-primary/10"
                  )}
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
                          ? "bg-primary text-black shadow-[0_0_15px_rgba(0,212,255,0.3)]" 
                          : "text-foreground/60 hover:bg-surface border border-transparent hover:border-border"
                      )}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className={cn(
                    "p-2 rounded-lg border text-sm font-bold disabled:opacity-30 transition-all",
                    "bg-surface border-border text-foreground hover:bg-primary/10"
                  )}
                >
                  Próximo
                </button>
              </div>
            )}
          </div>
        )}
      </div>

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
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex justify-between items-center">
            <div>
              <p className="text-xs font-bold text-primary/60 uppercase tracking-widest mb-1">Filial Selecionada</p>
              <p className="font-bold text-lg text-foreground">{selectedBranch?.name}</p>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => selectedBranch && fetchBranchInsights(selectedBranch, periodStart, periodEnd)}
                disabled={isFetchingFacebook}
                className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-black transition-all"
                title="Sincronizar agora"
              >
                <RefreshCw size={16} className={cn(isFetchingFacebook && "animate-spin")} />
              </button>
              {isFetchingFacebook && (
                <div className="flex items-center gap-2 text-primary">
                  <span className="text-[10px] font-bold uppercase tracking-widest">Sincronizando...</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Tipo de Relatório</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" value="campaign" checked={reportType === 'campaign'} onChange={() => setReportType('campaign')} className="accent-primary" />
                Por Campanha
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" value="unified" checked={reportType === 'unified'} onChange={() => setReportType('unified')} className="accent-primary" />
                Unificado
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Data Inicial</label>
              <input 
                type="date" 
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className={cn(
                  "w-full rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all",
                  "bg-surface border border-border text-foreground"
                )}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Data Final</label>
              <input 
                type="date" 
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className={cn(
                  "w-full rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all",
                  "bg-surface border border-border text-foreground"
                )}
              />
            </div>
          </div>

          {displayedCampaigns.length > 0 && (
            <div className="space-y-3">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Campanhas Ativas no Período</label>
              <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                {displayedCampaigns.map((camp, index) => (
                  <div key={camp.id || index} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border text-xs">
                    <div className="flex-1 min-w-0 mr-4">
                      <p className="font-bold text-foreground truncate">{camp.name}</p>
                      <p className="text-[10px] text-muted-foreground">Investimento: {formatCurrency(camp.spend)} • Leads: {camp.leads}</p>
                    </div>
                    <Badge variant="neutral" className="text-[9px] uppercase tracking-tighter">Facebook Ads</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Alcance</label>
              <input 
                type="number" 
                value={alcance}
                onChange={(e) => setAlcance(e.target.value)}
                placeholder="Ex: 15000"
                className={cn(
                  "w-full rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all",
                  "bg-surface border border-border text-foreground"
                )}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Impressões</label>
              <input 
                type="number" 
                value={impressoes}
                onChange={(e) => setImpressoes(e.target.value)}
                placeholder="Ex: 25000"
                className={cn(
                  "w-full rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all",
                  "bg-surface border border-border text-foreground"
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Cliques</label>
              <input 
                type="number" 
                value={cliques}
                onChange={(e) => setCliques(e.target.value)}
                placeholder="Ex: 850"
                className={cn(
                  "w-full rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all",
                  "bg-surface border border-border text-foreground"
                )}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">CTR (%)</label>
              <input 
                type="number" step="0.01"
                value={ctr}
                onChange={(e) => setCtr(e.target.value)}
                placeholder="Ex: 2.5"
                className={cn(
                  "w-full rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all",
                  "bg-surface border border-border text-foreground"
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Leads</label>
              <input 
                type="number" 
                value={leads}
                onChange={(e) => setLeads(e.target.value)}
                placeholder="Ex: 45"
                className={cn(
                  "w-full rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all",
                  "bg-surface border border-border text-foreground"
                )}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Investimento (R$)</label>
              <input 
                type="number" step="0.01"
                value={investimento}
                onChange={(e) => setInvestimento(e.target.value)}
                placeholder="Ex: 500.00"
                className={cn(
                  "w-full rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all",
                  "bg-surface border border-border text-foreground"
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Custo por Conversa (R$)</label>
              <input 
                type="number" step="0.01"
                value={custoConversa}
                onChange={(e) => setCustoConversa(e.target.value)}
                placeholder="Ex: 5.50"
                className={cn(
                  "w-full rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all",
                  "bg-surface border border-border text-foreground"
                )}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">CPC (R$)</label>
              <input 
                type="number" step="0.01"
                value={cpc}
                onChange={(e) => setCpc(e.target.value)}
                placeholder="Ex: 0.85"
                className={cn(
                  "w-full rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all",
                  "bg-surface border border-border text-foreground"
                )}
              />
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isResultModalOpen}
        onClose={() => setIsResultModalOpen(false)}
        title={
          <div className="flex items-center justify-between w-full">
            <h3 className="text-xl font-bold tracking-tight text-foreground">Relatório Gerado</h3>
            <button 
              onClick={handleExportPDF} 
              disabled={isExportingPDF}
              className="p-2 rounded-xl hover:bg-primary/10 text-primary transition-all"
              title="Exportar para PDF"
            >
              {isExportingPDF ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
            </button>
          </div>
        }
        footer={
          <div className="flex flex-col sm:flex-row gap-2 w-full">
            <button onClick={() => setIsResultModalOpen(false)} className="btn-secondary w-full sm:w-auto order-2 sm:order-1">Fechar</button>
            {!isBulkReport && (
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:ml-auto order-1 sm:order-2">
                <button onClick={handleCopyReport} className="btn-secondary flex items-center justify-center gap-2 w-full sm:w-auto">
                  <Copy size={16} /> Copiar
                </button>
                <button 
                  onClick={handleSendWhatsApp} 
                  disabled={isSendingWhatsApp}
                  className="btn-primary flex items-center justify-center gap-2 bg-[#25D366] text-white border-none hover:bg-[#128C7E] shadow-[0_8px_24px_rgba(37,211,102,0.35)] disabled:opacity-70 w-full sm:w-auto"
                >
                  {isSendingWhatsApp ? <Loader2 size={16} className="animate-spin" /> : <MessageCircle size={16} />}
                  Enviar via WhatsApp
                </button>
              </div>
            )}
            {isBulkReport && (
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:ml-auto order-1 sm:order-2">
                <button onClick={handleCopyReport} className="btn-secondary flex items-center justify-center gap-2 w-full sm:w-auto">
                  <Copy size={16} /> Copiar Tudo
                </button>
              </div>
            )}
          </div>
        }
      >
        <div className="space-y-6">
          {/* Resumo Visual de KPIs */}
          {!isBulkReport && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-6 rounded-2xl bg-card border border-border flex flex-col items-center text-center aspect-square justify-center shadow-sm">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                  <Target className="text-primary" size={20} />
                </div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Leads</p>
                <p className="text-xl font-black text-foreground">{leads || '0'}</p>
              </div>
              <div className="p-6 rounded-2xl bg-card border border-border flex flex-col items-center text-center aspect-square justify-center shadow-sm">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center mb-2">
                  <TrendingUp className="text-emerald-500" size={20} />
                </div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">CTR</p>
                <p className="text-xl font-black text-foreground">{ctr || '0'}%</p>
              </div>
              <div className="p-6 rounded-2xl bg-card border border-border flex flex-col items-center text-center aspect-square justify-center shadow-sm">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center mb-2">
                  <DollarSign className="text-amber-500" size={20} />
                </div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Investimento</p>
                <p className="text-xl font-black text-foreground">{formatCurrency(parseFloat(investimento) || 0)}</p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {isBulkReport 
                ? `Relatório consolidado de ${bulkReportData.length} filiais.` 
                : "O relatório está pronto para ser enviado. Você pode copiá-lo ou enviar diretamente pelo WhatsApp."}
            </p>
            
            <div ref={reportRef} className="bg-card border border-border rounded-xl p-8 relative group shadow-sm">
              <div className="mb-6 sm:mb-8 border-b border-border pb-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-black font-black text-sm">TF</div>
                  <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight">TrafficFlow Report</h2>
                </div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Relatório Estratégico de Tráfego</p>
                {isBulkReport && (
                  <p className="text-sm font-bold text-primary mt-2">Período: {new Date(periodStart + 'T12:00:00').toLocaleDateString('pt-BR')} a {new Date(periodEnd + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                )}
              </div>

              {isBulkReport ? (
                <div className="space-y-8">
                  {bulkReportData.map((data, idx) => (
                    <div key={idx} className="space-y-4 border-b border-border pb-8 last:border-0">
                      <h4 className="font-black text-lg text-primary uppercase tracking-widest">{data.branchName}</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="p-3 bg-muted/30 rounded-xl border border-border">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">Alcance</p>
                          <p className="text-sm font-bold text-foreground">{data.alcance}</p>
                        </div>
                        <div className="p-3 bg-muted/30 rounded-xl border border-border">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">Leads</p>
                          <p className="text-sm font-bold text-foreground">{data.leads}</p>
                        </div>
                        <div className="p-3 bg-muted/30 rounded-xl border border-border">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">CTR</p>
                          <p className="text-sm font-bold text-foreground">{data.ctr}%</p>
                        </div>
                        <div className="p-3 bg-muted/30 rounded-xl border border-border">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">Investimento</p>
                          <p className="text-sm font-bold text-foreground">{formatCurrency(data.investimento)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <div className="pt-6 bg-primary/5 p-6 rounded-2xl border border-primary/20">
                    <h4 className="font-black text-xl text-foreground mb-4 uppercase tracking-widest">Total Consolidado</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Total Alcance</p>
                        <p className="text-xl font-black text-foreground">{bulkReportData.reduce((acc, d) => acc + d.alcance, 0)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Total Leads</p>
                        <p className="text-xl font-black text-foreground">{bulkReportData.reduce((acc, d) => acc + d.leads, 0)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Média CTR</p>
                        <p className="text-xl font-black text-foreground">
                          {(bulkReportData.reduce((acc, d) => acc + parseFloat(d.ctr), 0) / bulkReportData.length).toFixed(2)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Total Investido</p>
                        <p className="text-xl font-black text-foreground">
                          {formatCurrency(bulkReportData.reduce((acc, d) => acc + d.investimento, 0))}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-muted/50 rounded-2xl border border-border">
                    <p className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">🎯 Alcance</p>
                    <p className="text-lg font-bold text-foreground">{alcance || '0'}</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-2xl border border-border">
                    <p className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">👁️ Impressões</p>
                    <p className="text-lg font-bold text-foreground">{impressoes || '0'}</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-2xl border border-border">
                    <p className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">🖱️ Cliques</p>
                    <p className="text-lg font-bold text-foreground">{cliques || '0'}</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-2xl border border-border">
                    <p className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">📈 CTR</p>
                    <p className="text-lg font-bold text-foreground">{ctr || '0'}%</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-2xl border border-border">
                    <p className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">📥 Leads</p>
                    <p className="text-lg font-bold text-foreground">{leads || '0'}</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-2xl border border-border">
                    <p className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">💰 Investimento</p>
                    <p className="text-lg font-bold text-foreground">{formatCurrency(parseFloat(investimento) || 0)}</p>
                  </div>

                  {displayedCampaigns.length > 0 && (
                    <div className="col-span-1 sm:col-span-2 mt-4 space-y-3">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest border-b border-border pb-2">
                        {reportType === 'campaign' ? 'Detalhamento por Campanha' : 'Resumo Unificado'}
                      </p>
                      <div className="space-y-2">
                        {displayedCampaigns.map((camp, index) => (
                          <div key={camp.id || index} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border text-xs">
                            <div className="flex-1 min-w-0 mr-4">
                              <p className="font-bold text-foreground truncate">{camp.name}</p>
                              <p className="text-[10px] text-muted-foreground">Investimento: {formatCurrency(camp.spend)} • Leads: {camp.leads}</p>
                            </div>
                            {reportType === 'campaign' && (
                              <div className="text-right">
                                <p className="font-bold text-primary">{((camp.spend / parseFloat(investimento || '1')) * 100).toFixed(0)}%</p>
                                <p className="text-[9px] text-muted-foreground uppercase">do total</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-12 pt-6 border-t border-border text-center">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Gerado em {new Date().toLocaleString('pt-BR')}</p>
              </div>

              <button 
                onClick={handleCopyReport}
                className="absolute top-4 right-4 p-2 rounded-lg bg-muted shadow-sm text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-all no-print"
              >
                <Copy size={16} />
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
