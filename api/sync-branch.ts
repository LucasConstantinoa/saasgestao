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
        
        // SURGICAL REQUEST: We only ask for name and funding details.
        // Adding 'balance' or 'total_prepaid_balance' here often causes Erro #100 on some accounts.
        const response = await axios.get(`https://graph.facebook.com/v22.0/act_${cleanId}`, {
          params: {
            access_token: fbToken,
            appsecret_proof: proof,
            fields: 'name,funding_source_details,currency,account_status'
          },
          timeout: 15000
        });
        
        const d = response.data;
        let accountVal = 0;
        const displayStr = d.funding_source_details?.display_string;
        
        // DEBUG: Logging the exact string we found
        console.log(`[SYNC ONLY-DISPLAY] Account ${cleanId} display_string:`, displayStr);

        if (displayStr) {
          accountVal = parseDisplayValue(displayStr);
        } else {
          console.warn(`[SYNC ONLY-DISPLAY] display_string MISSING for ${cleanId}. Details:`, d.funding_source_details);
        }

        totalBalance += accountVal;
        debugInfo.push({
          id: cleanId,
          name: d.name,
          display: displayStr,
          funding: fundingBal,
          calculated: accountVal
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
