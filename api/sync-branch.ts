import { createClient } from "@supabase/supabase-js";
import axios from "axios";
import crypto from "crypto";

const supabaseUrl = "https://mqhzrmladohpujiigazq.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xaHpybWxhZG9ocHVqaWlnYXpxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjc1MDU1NiwiZXhwIjoyMDg4MzI2NTU2fQ.9U86Npv17tn409g6VcnPl8kTXv5m-QAo8lKYeFc3asw";
const fbSecret = "71add3525cf76ed5414faf252574420d";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { branchId } = req.body;
  const authHeader = req.headers.authorization;
  if (!branchId || !authHeader) return res.status(400).json({ error: 'Missing parameters (branchId or auth)' });

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Auth validation
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth Error:', authError?.message);
      return res.status(401).json({ error: `Unauthorized: ${authError?.message || 'Invalid session'}` });
    }

    // Get branch
    const { data: branch, error: bError } = await supabase.from('branches').select('*').eq('id', branchId).single();
    if (bError || !branch) return res.status(404).json({ error: 'Branch not found' });

    const fbToken = branch.facebook_access_token || (await supabase.from('settings').select('value').eq('key', 'facebook_access_token').single()).data?.value;
    
    if (!fbToken) {
      console.error('Facebook Token not found for branch:', branchId);
      return res.status(400).json({ error: 'Token do Facebook não configurado.' });
    }

    const adAccountIds = (branch.facebook_ad_account_id || '').split(',')
      .map((id: string) => id.trim().split('|')[0].replace('act_', ''))
      .filter(Boolean);

    if (adAccountIds.length === 0) {
      return res.status(400).json({ error: 'Nenhum ID de conta de anúncio encontrado.' });
    }

    let totalBalance = 0;
    let debugInfo: any[] = [];

    const parseDisplayValue = (str: string | undefined) => {
      if (!str) return 0;
      
      // LOG: What did we get from Meta?
      console.log(`[PARSER] Received string: "${str}"`);

      // Remove everything except numbers, comma, dot and minus
      // We also keep the space once to check for thousand separators vs decimals
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

      console.log(`[PARSER] Result for "${str}": ${numericValue}`);
      return Math.abs(numericValue);
    };

    for (const cleanId of adAccountIds) {
      try {
        const proof = crypto.createHmac('sha256', fbSecret).update(fbToken).digest('hex');
        
        // SURGICAL CHAIN: We try one by one to avoid API Erro #100
        let accountVal = 0;
        let successFound = false;

        // STEP 1: Funding Source Details (Best Quality)
        try {
          const res1 = await axios.get(`https://graph.facebook.com/v22.0/act_${cleanId}`, {
            params: { access_token: fbToken, appsecret_proof: proof, fields: 'name,funding_source_details,currency,account_status' },
            timeout: 10000
          });
          const d = res1.data;
          const displayStr = d.funding_source_details?.display_string;
          if (displayStr) {
            accountVal = parseDisplayValue(displayStr);
            if (accountVal > 0) successFound = true;
          }
        } catch (e) {}

        // STEP 2: Total Prepaid Balance
        if (!successFound) {
          try {
            const res2 = await axios.get(`https://graph.facebook.com/v22.0/act_${cleanId}`, {
              params: { access_token: fbToken, appsecret_proof: proof, fields: 'total_prepaid_balance' }
            });
            if (res2.data.total_prepaid_balance) {
              accountVal = Math.abs(parseFloat(res2.data.total_prepaid_balance) / 100);
              if (accountVal > 0) successFound = true;
            }
          } catch (e) {}
        }

        // STEP 3: Remaining Balance
        if (!successFound) {
          try {
            const res3 = await axios.get(`https://graph.facebook.com/v22.0/act_${cleanId}`, {
              params: { access_token: fbToken, appsecret_proof: proof, fields: 'remaining_balance' }
            });
            if (res3.data.remaining_balance) {
              accountVal = Math.abs(parseFloat(res3.data.remaining_balance) / 100);
              if (accountVal > 0) successFound = true;
            }
          } catch (e) {}
        }

        // STEP 4: Balance (Fallback)
        if (!successFound) {
          try {
            const res4 = await axios.get(`https://graph.facebook.com/v22.0/act_${cleanId}`, {
              params: { access_token: fbToken, appsecret_proof: proof, fields: 'balance' }
            });
            if (res4.data.balance !== undefined) {
              accountVal = Math.abs(parseFloat(res4.data.balance) / 100);
              if (accountVal > 0) successFound = true;
            }
          } catch (e) {}
        }

        // STEP 5: Spend Cap (Last Resort)
        if (!successFound) {
          try {
            const res5 = await axios.get(`https://graph.facebook.com/v22.0/act_${cleanId}`, {
              params: { access_token: fbToken, appsecret_proof: proof, fields: 'spend_cap,amount_spent' }
            });
            const { spend_cap, amount_spent } = res5.data;
            if (spend_cap && amount_spent) {
              const cap = parseFloat(spend_cap);
              const spent = parseFloat(amount_spent);
              if (cap > 0 && cap > spent) accountVal = (cap - spent) / 100;
            }
          } catch (e) {}
        }

        totalBalance += accountVal;
        debugInfo.push({
          id: cleanId,
          calculated: accountVal,
          method: successFound ? 'found' : 'fallback-last'
        });
      } catch (accErr: any) {
        console.error(`FB Account Error (${cleanId}):`, accErr.response?.data || accErr.message);
        debugInfo.push({ id: cleanId, error: accErr.response?.data || accErr.message });
      }
    }

    await supabase.from('branches').update({ 
      balance: totalBalance, 
      updated_at: new Date().toISOString() 
    }).eq('id', branchId);

    return res.json({ 
      success: true, 
      balance: totalBalance,
      debug: debugInfo
    });

  } catch (err: any) {
    console.error('Final Sync Error:', err);
    return res.status(500).json({ error: err.response?.data?.error?.message || err.message || 'Erro interno desconhecido' });
  }
}
