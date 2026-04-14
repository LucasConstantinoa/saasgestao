import express from "express";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";
import crypto from "crypto";
import cors from "cors";

// CONFIG
const fbSecret = "71add3525cf76ed5414faf252574420d";
const supabaseUrl = "https://mqhzrmladohpujiigazq.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xaHpybWxhZG9ocHVqaWlnYXpxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjc1MDU1NiwiZXhwIjoyMDg4MzI2NTU2fQ.9U86Npv17tn409g6VcnPl8kTXv5m-QAo8lKYeFc3asw";

const app = express();
app.use(cors());
app.use(express.json());

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// UTILS
const getAppSecretProof = (token: string) => crypto.createHmac('sha256', fbSecret).update(token).digest('hex');

const parseDisplayValue = (str: string | undefined) => {
  if (!str) return 0;
  const cleaned = str.replace(/[^\d,.-]/g, '');
  if (!cleaned) return 0;
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

async function syncBranchBalance(supabase: any, branch: any) {
  try {
    const token = branch.facebook_access_token || (await supabase.from('settings').select('value').eq('key', 'facebook_access_token').single()).data?.value;
    if (!token) return;

    const adAccountIds = (branch.facebook_ad_account_id || '').split(',').map((id: string) => id.trim().split('|')[0].replace('act_', '')).filter(Boolean);
    let totalBalance = 0;
    let allCampaigns: any[] = [];

    const proof = getAppSecretProof(token);

    for (const cleanId of adAccountIds) {
      try {
        // Sync Balance
        const response = await axios.get(`https://graph.facebook.com/v22.0/act_${cleanId}`, {
          params: { access_token: token, appsecret_proof: proof, fields: 'name,funding_source_details,currency' }
        });
        const d = response.data;
        const displayStr = d.funding_source_details?.display_string;
        if (displayStr) totalBalance += parseDisplayValue(displayStr);
        else if (d.funding_source_details?.balance) totalBalance += Math.abs(parseFloat(d.funding_source_details.balance) / 100);

        // Sync Campaigns
        const campRes = await axios.get(`https://graph.facebook.com/v22.0/act_${cleanId}/campaigns`, {
          params: { access_token: token, appsecret_proof: proof, fields: 'id,name,status,objective,daily_budget' }
        });
        (campRes.data.data || []).forEach((c: any) => {
          allCampaigns.push({
            branch_id: branch.id,
            meta_campaign_id: c.id,
            name: c.name,
            status: c.status?.toLowerCase() === 'active' ? 'active' : 'paused',
            spend: parseFloat(c.daily_budget || "0") / 100,
            purpose: c.objective?.toLowerCase().includes('sales') ? 'vendas' : 'leads'
          });
        });
      } catch (e: any) {
        console.error(`Error in account ${cleanId}:`, e.message);
      }
    }

    // Update Branch
    await supabase.from('branches').update({ balance: totalBalance, updated_at: new Date().toISOString() }).eq('id', branch.id);
    
    // Update Campaigns (Clean and Insert)
    if (allCampaigns.length > 0) {
      await supabase.from('campaigns').delete().eq('branch_id', branch.id);
      await supabase.from('campaigns').insert(allCampaigns);
    }
    
    console.log(`Branch ${branch.name} synced: R$ ${totalBalance}, ${allCampaigns.length} campaigns.`);
  } catch (err: any) {
    console.error(`Sync error for branch ${branch.id}:`, err.message);
  }
}

// ENDPOINTS
app.post("/api/facebook/toggle-campaign", async (req, res) => {
  const { campaignId, branchId, status } = req.body;
  if (!campaignId || !branchId || !status) return res.status(400).json({ error: 'Missing params' });

  try {
    const { data: b } = await supabaseAdmin.from('branches').select('facebook_access_token').eq('id', branchId).single();
    let token = b?.facebook_access_token;
    if (!token) {
      const { data: s } = await supabaseAdmin.from('settings').select('value').eq('key', 'facebook_access_token').single();
      token = s?.value;
    }
    if (!token) throw new Error("Token not found");

    const proof = getAppSecretProof(token);
    const fbStatus = status === 'active' ? 'ACTIVE' : 'PAUSED';

    await axios.post(`https://graph.facebook.com/v22.0/${campaignId}`, {
      status: fbStatus,
      access_token: token,
      appsecret_proof: proof
    });

    // Update local DB
    await supabaseAdmin.from('campaigns').update({ status }).eq('meta_campaign_id', campaignId);

    res.json({ success: true });
  } catch (err: any) {
    console.error("Toggle Campaign Error:", err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.error?.message || err.message });
  }
});
app.post("/api/facebook/sync", async (req, res) => {
  const { branchId } = req.body;
  if (!branchId) return res.status(400).json({ error: 'Missing branchId' });
  const { data: branch } = await supabaseAdmin.from('branches').select('*').eq('id', branchId).single();
  if (!branch) return res.status(404).json({ error: 'Branch not found' });
  await syncBranchBalance(supabaseAdmin, branch);
  const { data: updated } = await supabaseAdmin.from('branches').select('balance').eq('id', branchId).single();
  res.json({ success: true, balance: updated?.balance });
});

app.post("/api/facebook/sync-all", async (req, res) => {
  const { data: branches } = await supabaseAdmin.from('branches').select('*');
  if (branches) {
    for (const b of branches) await syncBranchBalance(supabaseAdmin, b);
  }
  res.json({ success: true });
});

app.get("/api/facebook/ad-accounts", async (req, res) => {
  let token = req.query.token as string;
  if (!token || token === 'test' || token === 'undefined') {
    const { data: s } = await supabaseAdmin.from('settings').select('value').eq('key', 'facebook_access_token').single();
    token = s?.value;
  }
  if (!token) return res.status(400).json({ error: "Token not found" });
  try {
    const proof = getAppSecretProof(token);
    const response = await axios.get(`https://graph.facebook.com/v22.0/me/adaccounts`, {
      params: { fields: 'name,account_id,id', limit: 500, access_token: token, appsecret_proof: proof }
    });
    res.json(response.data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Vercel normalization
app.all("*", (req, res) => {
  res.status(404).json({ error: `Not found: ${req.url}` });
});

export default app;
