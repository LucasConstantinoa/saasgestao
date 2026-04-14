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
  const { isAdmin, fetchData } = useTrafficFlow();

  if (!isAdmin) return null;

  const runSupabaseTests = async () => {
    const tests = [
      { name: 'audit_log (Admin only)', fn: async () => {
        const { data, error } = await supabase.from('audit_log').select('count', { count: 'exact', head: true });
        if (error) throw new Error(`Query failed: ${error.message}`);
        return `Count: ${data[0].count || 0}`;
      }},
      { name: 'branches', fn: async () => {
        const { data, error } = await supabase.from('branches').select('id, name, balance, facebook_ad_account_id, facebook_access_token, facebook_bm_id, facebook_bm_name, facebook_funding_source').limit(3);
        if (error) throw new Error(`Query failed: ${error.message}`);
        if (data.length > 0) {
          const hasToken = data.some((b: any) => b.facebook_access_token);
          const hasAccounts = data.some((b: any) => b.facebook_ad_account_id || b.facebook_bm_id);
          if (!hasAccounts) return 'warning: No Facebook accounts configured';
          return `Count: ${data.length} - Tokens: ${hasToken ? 'OK' : 'MISSING'}`;
        }
        return 'Empty table';
      }},
      { name: 'campaigns', fn: async () => {
        const { data, error } = await supabase.from('campaigns').select('count', { count: 'exact', head: true });
        if (error) throw new Error(`Query failed: ${error.message}`);
        return `Count: ${data[0].count || 0}`;
      }},
      { name: 'sales', fn: async () => {
        const { data, error } = await supabase.from('sales').select('count', { count: 'exact', head: true });
        if (error) throw new Error(`Query failed: ${error.message}`);
        return `Count: ${data[0].count || 0}`;
      }},
      { name: 'notifications', fn: async () => {
        const { data, error } = await supabase.from('notifications').select('*').order('id', { ascending: false }).limit(5);
        if (error) throw new Error(`Query failed: ${error.message}`);
        return `Recent: ${data.length} unread: ${data.filter((n: any) => !n.read).length}`;
      }},
      { name: 'user_branch_permissions', fn: async () => {
        const { data, error } = await supabase.from('user_branch_permissions').select('count', { count: 'exact', head: true });
        if (error) throw new Error(`Query failed: ${error.message}`);
        return `Count: ${data[0].count || 0}`;
      }},
      { name: 'settings', fn: async () => {
        const { data, error } = await supabase.from('settings').select('*');
        if (error) throw new Error(`Query failed: ${error.message}`);
        return `Keys: ${data.length}`;
      }}
    ];

    const results: TestResult[] = [];
    for (const test of tests) {
      const result: TestResult = { name: test.name, status: 'running', message: '' };
      setTestResults(prev => [...prev.filter(r => r.name !== test.name), result]);
      
      try {
        const details = await test.fn();
        result.status = 'pass';
        result.message = `✅ ${details}`;
      } catch (error: any) {
        result.status = 'fail';
        result.message = `❌ ${error.message}`;
        result.error = error.message;
      }
      setTestResults(prev => prev.map(r => r.name === test.name ? result : r));
    }
  };

  const runFacebookTests = async () => {
    const tests = [
      { name: 'Ad Accounts API', fn: async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('No session');
        const response = await axios.get('/api/facebook/ad-accounts', { params: { token: 'test' }, headers: { Authorization: `Bearer ${session.access_token}` } });
        return `Accounts: ${response.data.data?.length || 0}`;
      }},
      { name: 'Balance API', fn: async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('No session');
        const response = await axios.get('/api/facebook/balance?branchId=1', { headers: { Authorization: `Bearer ${session.access_token}` } });
        return `Balance OK: ${response.data.facebook_balance}`;
      }}
    ];

    const results: TestResult[] = [];
    for (const test of tests) {
      const result: TestResult = { name: test.name, status: 'running', message: '' };
      setTestResults(prev => [...prev.filter(r => r.name !== test.name), result]);
      
      try {
        const details = await test.fn();
        result.status = 'pass';
        result.message = `✅ ${details}`;
      } catch (error: any) {
        result.status = 'fail';
        result.message = `❌ ${error.message}`;
        result.error = error.message;
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

