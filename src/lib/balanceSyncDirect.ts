import { supabase } from '@/lib/supabase';

export const syncBranchBalanceDirect = async (branchId: number): Promise<{ success: boolean; balance: number }> => {
  console.log('🚀 === SYNC BRANCH PROXY START === ID:', branchId);
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || '';

    const response = await fetch('/api/sync-branch', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ branchId })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Erro na API: ${response.status}`);
    }

    const data = await response.json();
    return { success: true, balance: data.balance };
  } catch (error: any) {
    console.error('Proxy sync error:', error);
    throw new Error(error.message || 'Falha na sincronização via servidor.');
  }
};

export const syncAllBranchesDirect = async (): Promise<{ success: boolean }> => {
  try {
    const { data: branches } = await supabase
      .from('branches')
      .select('id')
      .gt('balance', 0); // Only active

    if (!branches) return { success: false };

    const results = await Promise.allSettled(
      branches.map(b => syncBranchBalanceDirect(b.id))
    );

    const successes = results.filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled');
    
    return { success: successes.length > 0 };
  } catch (error) {
    console.error('Sync All Proxy error:', error);
    throw error;
  }
};
