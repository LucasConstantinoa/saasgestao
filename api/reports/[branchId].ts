import { createClient } from "@supabase/supabase-js";
import axios from 'axios';

const supabaseUrl = "https://mqhzrmladohpujiigazq.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xaHpybWxhZG9ocHVqaWlnYXpxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjc1MDU1NiwiZXhwIjoyMDg4MzI2NTU2fQ.9U86Npv17tn409g6VcnPl8kTXv5m-QAo8lKYeFc3asw";

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { branchId } = req.query;
  const { start, end } = req.body;
  
  if (!branchId) return res.status(400).json({ error: 'branchId required' });

  try {
    // Get branch details with service key (master key bypasses RLS)
    const { data: branch } = await supabaseAdmin
      .from('branches')
      .select('id, name, facebook_ad_account_id, facebook_access_token')
      .eq('id', parseInt(branchId as string))
      .single();

    if (!branch || !branch.facebook_ad_account_id) {
      return res.json([]);
    }

    const token = branch.facebook_access_token || process.env.FACEBOOK_TOKEN_MASTER;
    const accountId = branch.facebook_ad_account_id;

    // Facebook Graph API call using master token
    const response = await axios.get('https://graph.facebook.com/v20.0/' + accountId + '/insights', {
      params: {
        access_token: token,
        level: 'campaign',
        fields: 'campaign_name,reach,impressions,clicks,spend,actions{action_type}',
        time_range: JSON.stringify({ since: start, until: end }),
        date_preset: 'custom'
      }
    });

    const fbData = response.data.data || [];

    const processed = fbData.map((row: any) => ({
      campaign_name: row.campaign_name,
      reach: parseInt(row.reach || 0),
      impressions: parseInt(row.impressions || 0),
      clicks: parseInt(row.clicks || 0),
      spend: parseFloat(row.spend || 0),
      leads: row.actions?.reduce((sum: number, action: any) => {
        if (action.action_type === 'lead') sum += parseInt(action.value || 0);
        return sum;
      }, 0) || 0
    }));

    res.json(processed);
  } catch (error: any) {
    console.error('Reports API error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch reports', details: error.message });
  }
}

