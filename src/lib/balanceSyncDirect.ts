// Direct Facebook Balance Sync - No API Routes
// Uses FB app secret + Supabase service key (security note: production = env vars)

const SUPABASE_URL = 'https://mqhzrmladohpujiigazq.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xaHpybWxhZG9ocHVqaWlnYXpxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjc1MDU1NiwiZXhwIjoyMDg4MzI2NTU2fQ.9U86Npv17tn409g6VcnPl8kTXv5m-QAo8lKYeFc3asw';
const FB_APP_SECRET = '71add3525cf76ed5414faf252574420d';

import { createClient } from '@supabase/supabase-js';

console.log('🔧 balanceSyncDirect LOADED - Supabase ready');
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const parseDisplayValue = (str: string | undefined): number => {
  if (!str) return 0;
  const cleaned = str.replace(/[^\d,.-]/g, '');
  if (!cleaned) return 0;

  let numericValue = 0;
  if (cleaned.includes(',') && cleaned.includes('.')) {
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    if (lastComma > lastDot) {
      numericValue = parseFloat(cleaned.replace(/\./g, '').replace(',', '.')) || 0;
    } else {
      numericValue = parseFloat(cleaned.replace(/,/g, '')) || 0;
    }
  } else if (cleaned.includes(',')) {
    const parts = cleaned.split(',');
    if (parts[parts.length - 1].length === 2) {
      numericValue = parseFloat(cleaned.replace(',', '.')) || 0;
    } else {
      numericValue = parseFloat(cleaned.replace(/,/g, '')) || 0;
    }
  } else {
    numericValue = parseFloat(cleaned) || 0;
  }
  return Math.abs(numericValue);
};

const generateAppSecretProof = async (accessToken: string): Promise<string> => {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(FB_APP_SECRET);
  const tokenData = encoder.encode(accessToken);
  
  const key = await crypto.subtle.importKey(
    'raw', 
    keyData, 
    { name: 'HMAC', hash: 'SHA-256' }, 
    false, 
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, tokenData);
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

export const syncBranchBalanceDirect = async (branchId: number): Promise<{ success: boolean; balance: number }> => {
  console.log('🚀 === SYNC BRANCH DIRECT START === ID:', branchId);
  try {
    // Get branch with admin client
    const { data: branch } = await supabaseAdmin
      .from('branches')
      .select('*')
      .eq('id', branchId)
      .single();

    if (!branch) throw new Error('Branch not found');
    if (!branch.facebook_ad_account_id) throw new Error('No ad account ID');

    const fbToken = branch.facebook_access_token || 
      (await supabaseAdmin.from('settings').select('value').eq('key', 'facebook_access_token').single())?.data?.value;

    if (!fbToken) throw new Error('Facebook token not found');

    const adAccountIds = (branch.facebook_ad_account_id || '')
      .split(',')
      .map(id => id.trim().split('|')[0].replace('act_', ''))
      .filter(Boolean);

    let totalBalance = 0;

    for (const cleanId of adAccountIds) {
      const proof = await generateAppSecretProof(fbToken);
      
      const params = new URLSearchParams({
        access_token: fbToken,
        appsecret_proof: proof,
        fields: 'funding_source_details'
      });
      
      const response = await fetch(`https://graph.facebook.com/v22.0/act_${cleanId}?${params}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        console.error(`FB API error ${cleanId}:`, response.status, await response.text());
        continue;
      }
      
      const data = await response.json();
      console.log(`[DEBUG ${cleanId}] display_string:`, data.funding_source_details?.display_string);
      
      const displayStr = data.funding_source_details?.display_string;
      
      if (displayStr) {
        const value = parseDisplayValue(displayStr);
        console.log(`[SYNC ${cleanId}] Parsed: R$ ${value.toFixed(2)} from "${displayStr}"`);
        totalBalance += value;
      } else {
        console.warn(`[NO DISPLAY] ${cleanId}:`, data.funding_source_details);
      }
    }

    // Update branch balance
    const { error } = await supabaseAdmin
      .from('branches')
      .update({ 
        balance: totalBalance, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', branchId);

    if (error) throw error;

    return { success: true, balance: totalBalance };
  } catch (error: any) {
    console.error('Direct sync error:', error);
    throw new Error(error.message || 'Sync failed');
  }
};

export const syncAllBranchesDirect = async (): Promise<{ success: boolean }> => {
  try {
    const { data: branches } = await supabaseAdmin
      .from('branches')
      .select('id, facebook_ad_account_id')
      .gt('balance', 0); // Only active

    const results = await Promise.allSettled(
      branches?.map(b => syncBranchBalanceDirect(b.id)) || []
    );

    const successes = results.filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled');
    
    return { success: successes.length > 0 };
  } catch (error) {
    throw error;
  }
};
