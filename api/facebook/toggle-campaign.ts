import { createClient } from "@supabase/supabase-js";
import axios from "axios";
import crypto from "crypto";

const fbSecret = "71add3525cf76ed5414faf252574420d";
const supabaseUrl = "https://mqhzrmladohpujiigazq.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xaHpybWxhZG9ocHVqaWlnYXpxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjc1MDU1NiwiZXhwIjoyMDg4MzI2NTU2fQ.9U86Npv17tn409g6VcnPl8kTXv5m-QAo8lKYeFc3asw";

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
const getAppSecretProof = (token: string) => crypto.createHmac('sha256', fbSecret).update(token).digest('hex');

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { branchId, campaignId, status } = req.body;
  if (!branchId || !campaignId || !status) return res.status(400).json({ error: 'Faltando parâmetros' });

  try {
    const { data: b } = await supabaseAdmin.from('branches').select('facebook_access_token').eq('id', branchId).single();
    let token = b?.facebook_access_token;
    if (!token) {
      const { data: s } = await supabaseAdmin.from('settings').select('value').eq('key', 'facebook_access_token').single();
      token = s?.value;
    }
    if (!token) throw new Error("Token não configurado");

    const proof = getAppSecretProof(token);
    const fbStatus = status === 'active' ? 'ACTIVE' : 'PAUSED';

    await axios.post(`https://graph.facebook.com/v22.0/${campaignId}`, {
      status: fbStatus,
      access_token: token,
      appsecret_proof: proof
    });

    await supabaseAdmin.from('campaigns').update({ status }).eq('meta_campaign_id', campaignId);

    res.json({ success: true });
  } catch (err: any) {
    console.error("Toggle Error:", err.response?.data || err.message);
    res.status(500).json(err.response?.data || { error: err.message });
  }
}
