import { createClient } from "@supabase/supabase-js";
import axios from "axios";
import crypto from "crypto";

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://mqhzrmladohpujiigazq.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
const fbSecret = process.env.FACEBOOK_APP_SECRET || '71add3525cf76ed5414faf252574420d';

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

    const token = branch.facebook_access_token || (await supabase.from('settings').select('value').eq('key', 'facebook_access_token').single()).data?.value;
    if (!token) return res.status(400).json({ error: 'Facebook token not found' });

    const adAccountIds = branch.facebook_ad_account_id.split(',').map((id: string) => id.trim().split('|')[0].replace('act_', '')).filter(Boolean);
    let totalBalance = 0;

    const parseDisplayValue = (str: string | undefined) => {
      if (!str) return 0;
      const cleaned = str.replace(/[^\d,.-]/g, '');
      let numericValue = 0;
      if (cleaned.includes(',') && cleaned.includes('.')) {
        const lastComma = cleaned.lastIndexOf(',');
        const lastDot = cleaned.lastIndexOf('.');
        if (lastComma > lastDot) numericValue = parseFloat(cleaned.replace(/\./g, '').replace(',', '.')) || 0;
        else numericValue = parseFloat(cleaned.replace(/,/g, '')) || 0;
      } else if (cleaned.includes(',')) {
        const parts = cleaned.split(',');
        if (parts[parts.length - 1].length === 2) numericValue = parseFloat(cleaned.replace(',', '.')) || 0;
        else numericValue = parseFloat(cleaned.replace(/,/g, '')) || 0;
      } else numericValue = parseFloat(cleaned) || 0;
      return Math.abs(numericValue);
    };

    for (const cleanId of adAccountIds) {
      const proof = crypto.createHmac('sha256', fbSecret).update(token).digest('hex');
      const response = await axios.get(`https://graph.facebook.com/v22.0/act_${cleanId}`, {
        params: {
          access_token: token,
          appsecret_proof: proof,
          fields: 'balance,is_prepaid_account,funding_source_details{display_string,balance},total_prepaid_balance'
        }
      });
      const d = response.data;
      const displayStr = d.funding_source_details?.display_string;
      
      if (displayStr) {
        totalBalance += parseDisplayValue(displayStr);
      } else if (d.funding_source_details?.balance) {
        totalBalance += Math.abs(parseFloat(d.funding_source_details.balance) / 100);
      } else if (d.total_prepaid_balance) {
        totalBalance += Math.abs(parseFloat(d.total_prepaid_balance) / 100);
      } else {
        totalBalance += Math.abs(parseFloat(d.balance || "0") / 100);
      }
    }

    await supabase.from('branches').update({ balance: totalBalance, updated_at: new Date().toISOString() }).eq('id', branchId);
    return res.json({ success: true, balance: totalBalance });

  } catch (err: any) {
    return res.status(500).json({ error: err.response?.data?.error?.message || err.message });
  }
}
