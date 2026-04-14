import React, { useState, useEffect } from 'react';
import { Card, Badge } from '@/components/UI';
// Button from shadcn (use existing Button if available, or use html button)

import { Modal } from '@/components/Modal';
const Button = (props: any) => <button {...props} className={cn("px-4 py-2 rounded-lg transition-colors font-medium", props.className, props.variant === "outline" ? "border hover:bg-accent" : "bg-primary text-primary-foreground hover:bg-primary/90")} />;
import { supabase } from '@/lib/supabase';
import { useTrafficFlow } from '@/context/TrafficFlowContext';
import axios from 'axios';
import { Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TestResult {
  name: string;
  status: 'running' | 'pass' | 'fail' | 'warning';
  message: string;
  details?: string;
  error?: string;
}

const DiagnosticCenter = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState<'supabase' | 'facebook' | 'permissions' | 'balance' | 'all'>('supabase');
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const { isAdmin, fetchData, branches } = useTrafficFlow();

  if (!isAdmin) return null;

  const runSupabaseTests = async () => {
    const tests = [
      { name: 'audit_log (Admin only)', fn: async () => {
        const { data, error, count } = await supabase.from('audit_log').select('*', { count: 'exact', head: true });
        if (error) throw Object.assign(new Error(`Query failed: ${error.message}`), error);
        return `Count: ${count || 0}`;
      }},
      { name: 'branches', fn: async () => {
        const { data, error } = await supabase.from('branches').select('id, name, balance, facebook_ad_account_id, facebook_access_token, facebook_bm_id, facebook_bm_name, facebook_funding_source').limit(3);
        if (error) throw Object.assign(new Error(`Query failed: ${error.message}`), error);
        if (data.length > 0) {
          const hasToken = data.some((b: any) => b.facebook_access_token);
          const hasAccounts = data.some((b: any) => b.facebook_ad_account_id || b.facebook_bm_id);
          if (!hasAccounts) throw new Error('warning: Nenhuma conta do Facebook configurada');
          return `Count: ${data.length} - Tokens: ${hasToken ? 'OK' : 'MISSING'}`;
        }
        return 'Tabela existe, mas está vazia';
      }},
      { name: 'campaigns', fn: async () => {
        const { data, error, count } = await supabase.from('campaigns').select('*', { count: 'exact', head: true });
        if (error) throw Object.assign(new Error(`Query failed: ${error.message}`), error);
        return `Count: ${count || 0}`;
      }},
      { name: 'sales', fn: async () => {
        const { data, error, count } = await supabase.from('sales').select('*', { count: 'exact', head: true });
        if (error) throw Object.assign(new Error(`Query failed: ${error.message}`), error);
        return `Count: ${count || 0}`;
      } },
      { name: 'notifications', fn: async () => {
        const { data, error } = await supabase.from('notifications').select('*').order('id', { ascending: false }).limit(5);
        if (error) throw Object.assign(new Error(`Query failed: ${error.message}`), error);
        return `Recent: ${data.length} unread: ${data.filter((n: any) => !n.read).length}`;
      }},
      { name: 'user_branch_permissions', fn: async () => {
        const { data, error, count } = await supabase.from('user_branch_permissions').select('*', { count: 'exact', head: true });
        if (error) throw Object.assign(new Error(`Query failed: ${error.message}`), error);
        return `Count: ${count || 0}`;
      } },
      { name: 'settings', fn: async () => {
        const { data, error } = await supabase.from('settings').select('*');
        if (error) throw Object.assign(new Error(`Query failed: ${error.message}`), error);
        return `Keys: ${data.length}`;
      }}
    ];

    for (const test of tests) {
      const result: TestResult = { name: test.name, status: 'running', message: '' };
      setTestResults(prev => [...prev.filter(r => r.name !== test.name), result]);
      
      try {
        const details = await test.fn();
        if (details.startsWith('warning:')) {
          result.status = 'warning';
          result.message = `⚠️ ${details.replace('warning: ', '')}`;
        } else {
          result.status = 'pass';
          result.message = `✅ ${details}`;
        }
      } catch (error: any) {
        result.status = 'fail';
        result.message = `❌ Falha no banco de dados`;
        
        let errorDetails = error.message || String(error);
        if (error.code === '42501' || errorDetails.toLowerCase().includes('permission')) {
          result.message = '❌ Sem Permissão (RLS Policy)';
          errorDetails = "O usuário atual não possui permissão para acessar esta tabela. O Supabase bloqueou devido às regras de Row Level Security (RLS).";
        } else if (error.code === '42P01' || errorDetails.toLowerCase().includes('does not exist')) {
          result.message = '❌ Tabela não existe';
          errorDetails = "A tabela procurada não pôde ser encontrada no Supabase. Possa ser que ela ainda não tenha sido criada no banco de dados.";
        } else if (error.code) {
          result.message = `❌ Erro Supabase: ${error.code}`;
          errorDetails = `Ocorreu um erro no Supabase: ${errorDetails} \nDetalhes Extras: ${error.details || 'Nenhum'}`;
        } else if (error.message && error.message.includes('warning:')) {
          result.status = 'warning';
          result.message = `⚠️ Aviso`;
          errorDetails = error.message.replace('warning: ', '');
        }

        result.error = errorDetails;
      }
      setTestResults(prev => prev.map(r => r.name === test.name ? result : r));
    }
  };

  const runFacebookTests = async () => {
    const tests = [
      { name: 'Ad Accounts API', fn: async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('no_session');
        const response = await axios.get('/api/facebook/ad-accounts', { params: { token: 'test' }, headers: { Authorization: `Bearer ${session.access_token}` }, timeout: 15000 });
        return `Contas Retornadas: ${response.data.data?.length || 0}`;
      }},
      { name: 'Balance API (Saldos por Filial)', fn: async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('no_session');
        
        const activeBranches = (branches || []).filter(b => b.facebook_ad_account_id);
        if (activeBranches.length === 0) return 'warning: Nenhuma filial conectada ao Facebook Ads encontrada.';
        
        const branchResults = await Promise.all(activeBranches.map(async (branch) => {
          try {
            const res = await axios.get(`/api/facebook/balance?branchId=${branch.id}`, { headers: { Authorization: `Bearer ${session.access_token}` }, timeout: 20000 });
            const { remaining_balance, account_count } = res.data;
            return {
              name: branch.name,
              status: 'pass',
              value: parseFloat(remaining_balance) || 0,
              msg: `R$ ${(parseFloat(remaining_balance) || 0).toFixed(2)} (${account_count} conta/s)`
            };
          } catch (e: any) {
            return {
              name: branch.name,
              status: 'fail',
              value: 0,
              msg: `Falha: ${e.response?.data?.error || e.message}`
            };
          }
        }));

        const passed = branchResults.filter(r => r.status === 'pass');
        const failed = branchResults.filter(r => r.status === 'fail');
        const totalSum = branchResults.reduce((acc, curr) => acc + curr.value, 0);

        const details = branchResults.map(r => `${r.status === 'pass' ? '✅' : '❌'} ${r.name}: ${r.msg}`).join('\n');
        
        if (failed.length > 0) {
          throw Object.assign(new Error(`Sincronizadas: ${passed.length} | Falha: ${failed.length}\nTotal: R$ ${totalSum.toFixed(2)}`), { details });
        }
        
        return `${passed.length} filiais OK. Total Disponível: R$ ${totalSum.toFixed(2)}`;
      }}
    ];

    for (const test of tests) {
      const result: TestResult = { name: test.name, status: 'running', message: '' };
      setTestResults(prev => [...prev.filter(r => r.name !== test.name), result]);
      
      try {
        const details = await test.fn();
        if (typeof details === 'string' && details.startsWith('warning:')) {
          result.status = 'warning';
          result.message = `⚠️ ${details.replace('warning: ', '')}`;
        } else {
          result.status = 'pass';
          result.message = `✅ ${details}`;
        }
      } catch (error: any) {
        result.status = 'fail';
        result.message = `❌ Falha na API do Facebook`;
        
        let errorDetails = error.message || String(error);
        
        // Check if it's a thrown error with details (from balance test)
        if (error.details) {
          result.message = `⚠️ ${error.message}`;
          result.status = 'warning';
          errorDetails = error.details;
        } else if (error.message === 'no_session') {
          errorDetails = "O usuário atual não possui uma sessão válida de autenticação.";
        } else if (error.response?.status === 404) {
          result.message = '❌ Rota da API não existe (404)';
          errorDetails = "O endpoint não existe. Verifique se a rota está configurada no Vercel.";
        } else if (error.response?.status === 403 || error.response?.status === 401) {
          result.message = `❌ Acesso Negado (${error.response.status})`;
          errorDetails = `Não autorizado. O token do Facebook pode ser inválido ou estar vencido. Resposta: ${error.response?.data?.error?.message || JSON.stringify(error.response?.data)}`;
        } else if (error.response?.status === 500) {
          result.message = '❌ Erro Interno do Servidor (500)';
          errorDetails = `Erro interno: ${error.response?.data?.error?.message || JSON.stringify(error.response?.data) || 'Sem detalhes'}`;
        } else if (error.response?.data?.error) {
          result.message = `❌ Erro Facebook (${error.response?.status})`;
          errorDetails = `Facebook retornou: ${error.response.data.error.message || JSON.stringify(error.response.data.error)}`;
        } else if (error.request && !error.response) {
          result.message = '❌ Erro de CORS ou Rede';
          errorDetails = "A requisição foi enviada mas não houve resposta. Isso geralmente indica um erro de CORS (o Facebook bloqueou a requisição do navegador) ou problema de rede. Tente usar o botão de sincronizar diretamente nos cards das filiais.";
        } else if (errorDetails.toLowerCase().includes('network error')) {
          result.message = '❌ Erro de Rede';
          errorDetails = "Falha grave de rede. Sem conexão à internet ou proxy impedindo requisição.";
        }

        result.error = errorDetails;
      }
      setTestResults(prev => prev.map(r => r.name === test.name ? result : r));
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    await runSupabaseTests();
    await runFacebookTests();
    setIsRunning(false);
  };

  return (
    <div>
      <Button onClick={() => setIsModalOpen(true)} className="bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600">
        🚨 BAA Diagnóstico
      </Button>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="BAA - Testes em Massa" size="xl">
        <div className="space-y-6">
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCurrentTab('supabase')} className={currentTab === 'supabase' ? 'bg-primary' : ''}>
              Supabase Tables
            </Button>
            <Button variant="outline" onClick={() => setCurrentTab('facebook')} className={currentTab === 'facebook' ? 'bg-primary' : ''}>
              Facebook API
            </Button>
            <Button variant="outline" onClick={() => setCurrentTab('all')} className={currentTab === 'all' ? 'bg-primary' : ''}>
              Run All
            </Button>
          </div>

          <Button onClick={runAllTests} disabled={isRunning} className="w-full">
            {isRunning ? <Loader2 className="animate-spin" /> : '🚀 Executar Testes Completos'}
          </Button>

          <div className="space-y-4 max-h-96 overflow-auto">
            {testResults.map((result, i) => (
              <Card key={i} className={cn(
                'p-4',
                result.status === 'pass' ? 'border-emerald-200 bg-emerald-50/50' :
                result.status === 'fail' ? 'border-rose-200 bg-rose-50/50' :
                result.status === 'warning' ? 'border-amber-200 bg-amber-50/50' :
                'border-blue-200 bg-blue-50/50'
              )}>
                <div className="flex items-center gap-3">
                  {result.status === 'pass' && <CheckCircle className="text-emerald-500 h-5 w-5" />}
                  {result.status === 'fail' && <XCircle className="text-rose-500 h-5 w-5" />}
                  {result.status === 'warning' && <AlertTriangle className="text-amber-500 h-5 w-5" />}
                  {result.status === 'running' && <Loader2 className="animate-spin h-5 w-5" />}
                  
                  <div>
                    <div className="font-bold">{result.name}</div>
                    <div className="text-sm">{result.message}</div>
                    {result.details && <div className="text-xs mt-1 opacity-75">{result.details}</div>}
                    {result.error && <div className="text-xs mt-1 text-rose-500 font-mono bg-rose-50 p-1 rounded">{result.error}</div>}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="pt-4 border-t border-border text-xs text-muted-foreground space-y-1">
            <div>Status: {testResults.filter(r => r.status === 'pass').length}/{testResults.length} PASS</div>
            <div>Erros catalogados acima. Copie para fixar.</div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DiagnosticCenter;

