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
  
  // LOG: What did we get from Meta?
  console.log(`[FRONTEND-PARSER] Received string: "${str}"`);

  // Remove everything except numbers, comma, dot and minus
  const cleaned = str.replace(/[^\d,.-]/g, '');
  if (!cleaned) return 0;

  let numericValue = 0;
  
  // Format 1: "1.234,56" (European/Brazilian)
  if (cleaned.includes(',') && cleaned.includes('.')) {
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    if (lastComma > lastDot) {
      // Dot is thousand separator, comma is decimal
      numericValue = parseFloat(cleaned.replace(/\./g, '').replace(',', '.')) || 0;
    } else {
      // Comma is thousand separator, dot is decimal
      numericValue = parseFloat(cleaned.replace(/,/g, '')) || 0;
    }
  } 
  // Format 2: "1234,56" (Just decimal comma)
  else if (cleaned.includes(',')) {
    const parts = cleaned.split(',');
    // If it looks like decimals (2 digits after comma), treat as decimal
    if (parts[parts.length - 1].length === 2) {
      numericValue = parseFloat(cleaned.replace(',', '.')) || 0;
    } else {
      // Otherwise maybe it's a thousand separator for a whole number
      numericValue = parseFloat(cleaned.replace(/,/g, '')) || 0;
    }
  } 
  // Format 3: "1234.56" or "1234"
  else {
    numericValue = parseFloat(cleaned) || 0;
  }

  console.log(`[FRONTEND-PARSER] Result for "${str}": ${numericValue}`);
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
  console.log('🚀 === SYNC BRANCH PROXY START === ID:', branchId);
  try {
    // We use the proxy API to avoid CORS and keep the app secret safe on the server
    const sessionStr = localStorage.getItem('supabase.auth.token');
    let token = '';
    if (sessionStr) {
      try {
        const session = JSON.parse(sessionStr);
        token = session.currentSession?.access_token || '';
      } catch (e) {}
    }

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
