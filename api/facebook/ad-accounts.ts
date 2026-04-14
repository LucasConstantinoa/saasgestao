import { createClient } from "@supabase/supabase-js";
import axios from "axios";
import crypto from "crypto";

const fbSecret = "71add3525cf76ed5414faf252574420d";
const supabaseUrl = "https://mqhzrmladohpujiigazq.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xaHpybWxhZG9ocHVqaWlnYXpxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjc1MDU1NiwiZXhwIjoyMDg4MzI2NTU2fQ.9U86Npv17tn409g6VcnPl8kTXv5m-QAo8lKYeFc3asw";

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
const getAppSecretProof = (token: string) => crypto.createHmac('sha256', fbSecret).update(token).digest('hex');

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  let token = req.query.token as string;
  if (!token || token === 'test' || token === 'undefined') {
    const { data: s } = await supabaseAdmin.from('settings').select('value').eq('key', 'facebook_access_token').single();
    token = s?.value;
  }

  if (!token) return res.status(400).json({ error: "Token do Facebook não encontrado nas configurações master." });

  try {
    const proof = getAppSecretProof(token);
    const response = await axios.get(`https://graph.facebook.com/v22.0/me/adaccounts`, {
      params: { 
        fields: 'name,account_id,id,funding_source_details', 
        limit: 1000, 
        access_token: token, 
        appsecret_proof: proof 
      }
    });
    res.json(response.data);
  } catch (err: any) {
    console.error("AdAccounts Error:", err.response?.data || err.message);
    res.status(500).json(err.response?.data || { error: err.message });
  }
}
