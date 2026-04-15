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
  
  // LOG: What did we get from Meta?
  console.log(`[PARSER-SLUG] Received string: "${str}"`);

  // Remove everything except numbers, comma, dot and minus
  // Use a more aggressive regex to handle cases like "R$ R$ 388,55"
  const cleaned = str.replace(/[^\d,.-]/g, '').trim();
  if (!cleaned) return 0;

  let numericValue = 0;
  
  // Format 1: "1.234,56" (European/Brazilian)
  if (cleaned.includes(',') && cleaned.includes('.')) {
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    if (lastComma > lastDot) {
      numericValue = parseFloat(cleaned.replace(/\./g, '').replace(',', '.')) || 0;
    } else {
      numericValue = parseFloat(cleaned.replace(/,/g, '')) || 0;
    }
  } 
  // Format 2: "1234,56" (Just decimal comma)
  else if (cleaned.includes(',')) {
    const parts = cleaned.split(',');
    if (parts[parts.length - 1].length <= 2) {
      numericValue = parseFloat(cleaned.replace(',', '.')) || 0;
    } else {
      numericValue = parseFloat(cleaned.replace(/,/g, '')) || 0;
    }
  } 
  else {
    numericValue = parseFloat(cleaned) || 0;
  }

  console.log(`[PARSER-SLUG] Result for "${str}": ${numericValue}`);
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
        // SURGICAL CHAIN: We try one by one to avoid API Erro #100
        let accountVal = 0;
        let successFound = false;

        // STEP 1: Funding (Best quality)
        try {
          const res1 = await axios.get(`https://graph.facebook.com/v22.0/act_${cleanId}`, {
            params: { access_token: token, appsecret_proof: proof, fields: 'name,funding_source_details,currency,account_status' },
            timeout: 10000
          });
          const displayStr = res1.data.funding_source_details?.display_string;
          if (displayStr) {
            accountVal = parseDisplayValue(displayStr);
            if (accountVal > 0) successFound = true;
          }
        } catch (e) {}

        // STEP 2: Prepaid
        if (!successFound) {
          try {
            const res2 = await axios.get(`https://graph.facebook.com/v22.0/act_${cleanId}`, {
              params: { access_token: token, appsecret_proof: proof, fields: 'total_prepaid_balance' }
            });
            if (res2.data.total_prepaid_balance) {
              accountVal = Math.abs(parseFloat(res2.data.total_prepaid_balance) / 100);
              if (accountVal > 0) successFound = true;
            }
          } catch (e) {}
        }

        // STEP 3: Remaining
        if (!successFound) {
          try {
            const res3 = await axios.get(`https://graph.facebook.com/v22.0/act_${cleanId}`, {
              params: { access_token: token, appsecret_proof: proof, fields: 'remaining_balance' }
            });
            if (res3.data.remaining_balance) {
              accountVal = Math.abs(parseFloat(res3.data.remaining_balance) / 100);
              if (accountVal > 0) successFound = true;
            }
          } catch (e) {}
        }

        // STEP 4: Balance
        if (!successFound) {
          try {
            const res4 = await axios.get(`https://graph.facebook.com/v22.0/act_${cleanId}`, {
              params: { access_token: token, appsecret_proof: proof, fields: 'balance' }
            });
            if (res4.data.balance !== undefined) {
              accountVal = Math.abs(parseFloat(res4.data.balance) / 100);
              if (accountVal > 0) successFound = true;
            }
          } catch (e) {}
        }

        // STEP 5: Spend Cap
        if (!successFound) {
          try {
            const res5 = await axios.get(`https://graph.facebook.com/v22.0/act_${cleanId}`, {
              params: { access_token: token, appsecret_proof: proof, fields: 'spend_cap,amount_spent' }
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

        // Sync Campaigns (Separate call)
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
      params: { 
        fields: 'name,account_id,id,funding_source_details', 
        limit: 1000, 
        access_token: token, 
        appsecret_proof: proof 
      }
    });
    res.json(response.data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/facebook/insights", async (req, res) => {
  const { accountIds, token: reqToken, since, until, fields, level } = req.query;
  
  let token = (reqToken as string);
  if (!token || token === 'test' || token === 'undefined') {
    const { data: s } = await supabaseAdmin.from('settings').select('value').eq('key', 'facebook_access_token').single();
    token = s?.value;
  }

  if (!token) return res.status(400).json({ error: "Token not found" });
  if (!accountIds) return res.status(400).json({ error: "Missing accountIds" });

  const ids = (accountIds as string).split(',');
  const proof = getAppSecretProof(token);
  const allData: any[] = [];

  try {
    for (const id of ids) {
      const cleanId = id.trim().replace('act_', '');
      const response = await axios.get(`https://graph.facebook.com/v22.0/act_${cleanId}/insights`, {
        params: {
          access_token: token,
          appsecret_proof: proof,
          time_range: JSON.stringify({ since, until }),
          fields: fields || 'campaign_name,reach,impressions,clicks,spend,actions',
          level: level || 'campaign'
        }
      });
      if (response.data.data) allData.push(...response.data.data);
    }
    res.json({ data: allData });
  } catch (err: any) {
    console.error("Insights Fetch Error:", err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.error?.message || err.message });
  }
});

app.post("/api/facebook/create-campaign", async (req, res) => {
  const { branchId, name, objective, dailyBudget } = req.body;
  if (!branchId || !name || !objective) return res.status(400).json({ error: 'Missing params' });

  try {
    const { data: branch } = await supabaseAdmin.from('branches').select('*').eq('id', branchId).single();
    if (!branch) throw new Error("Branch not found");

    let token = branch.facebook_access_token;
    if (!token) {
      const { data: s } = await supabaseAdmin.from('settings').select('value').eq('key', 'facebook_access_token').single();
      token = s?.value;
    }
    if (!token) throw new Error("Token not found");

    // Get the first ad account ID if multiple
    const adAccountId = (branch.facebook_ad_account_id || '').split(',')[0].trim().split('|')[0].replace('act_', '');
    if (!adAccountId) throw new Error("Ad Account ID not configured for this branch");

    const proof = getAppSecretProof(token);

    const response = await axios.post(`https://graph.facebook.com/v22.0/act_${adAccountId}/campaigns`, {
      name,
      objective,
      status: 'PAUSED',
      daily_budget: dailyBudget,
      special_ad_categories: '[]',
      access_token: token,
      appsecret_proof: proof
    });

    res.json(response.data);
  } catch (err: any) {
    console.error("Create Campaign Error:", err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.error?.message || err.message });
  }
});

app.post("/api/facebook/update-campaign", async (req, res) => {
  const { campaignId, branchId, dailyBudget, name } = req.body;
  if (!campaignId || !branchId) return res.status(400).json({ error: 'Missing params' });

  try {
    const { data: branch } = await supabaseAdmin.from('branches').select('facebook_access_token').eq('id', branchId).single();
    let token = branch?.facebook_access_token;
    if (!token) {
      const { data: s } = await supabaseAdmin.from('settings').select('value').eq('key', 'facebook_access_token').single();
      token = s?.value;
    }
    if (!token) throw new Error("Token not found");

    const proof = getAppSecretProof(token);
    const updateData: any = {
      access_token: token,
      appsecret_proof: proof
    };
    if (dailyBudget !== undefined) updateData.daily_budget = dailyBudget;
    if (name) updateData.name = name;

    await axios.post(`https://graph.facebook.com/v22.0/${campaignId}`, updateData);

    res.json({ success: true });
  } catch (err: any) {
    console.error("Update Campaign Error:", err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.error?.message || err.message });
  }
});

app.post("/api/facebook/delete-campaign", async (req, res) => {
  const { campaignId, branchId } = req.body;
  if (!campaignId || !branchId) return res.status(400).json({ error: 'Missing params' });

  try {
    const { data: branch } = await supabaseAdmin.from('branches').select('facebook_access_token').eq('id', branchId).single();
    let token = branch?.facebook_access_token;
    if (!token) {
      const { data: s } = await supabaseAdmin.from('settings').select('value').eq('key', 'facebook_access_token').single();
      token = s?.value;
    }
    if (!token) throw new Error("Token not found");

    const proof = getAppSecretProof(token);

    await axios.delete(`https://graph.facebook.com/v22.0/${campaignId}`, {
      params: { 
        access_token: token, 
        appsecret_proof: proof 
      }
    });

    res.json({ success: true });
  } catch (err: any) {
    console.error("Delete Campaign Error:", err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.error?.message || err.message });
  }
});

// --- ADMIN ROUTES ---

const isAdminMiddleware = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No authorization header' });
  const token = authHeader.split(' ')[1];
  
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) throw error;
    
    const isMaster = ['brtreino@gmail.com', 'trafegopagoprosul@gmail.com'].includes(user.email || '');
    if (!isMaster && user.user_metadata?.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }
    
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

app.get("/api/admin/users", isAdminMiddleware, async (req, res) => {
  try {
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) throw error;
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/users", isAdminMiddleware, async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const { data: { user }, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: role || 'user' }
    });
    if (error) throw error;
    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/admin/users/:userId", isAdminMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/admin/permissions", isAdminMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('user_branch_permissions').select('*');
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/permissions", isAdminMiddleware, async (req, res) => {
  try {
    const { user_id, branch_id, permission_level, granular_permissions } = req.body;
    const { data, error } = await supabaseAdmin
      .from('user_branch_permissions')
      .upsert({ 
        user_id, 
        branch_id, 
        permission_level: permission_level || 'viewer', 
        granular_permissions: granular_permissions || {} 
      }, { onConflict: 'user_id,branch_id' })
      .select()
      .single();
      
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- ADMIN ROUTES ---

const isAdminMiddleware = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No authorization header' });
  const token = authHeader.split(' ')[1];
  
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) throw error;
    
    const isMaster = user.email === 'brtreino@gmail.com';
    if (!isMaster) {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }
    
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

app.get("/api/admin/users", isAdminMiddleware, async (req, res) => {
  try {
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) throw error;
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/users", isAdminMiddleware, async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const { data: { user }, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: role || 'user' }
    });
    if (error) throw error;
    
    // Also update public.users table if it exists
    await supabaseAdmin.from('users').upsert({ id: user.id, email: user.email, role: role || 'user' });
    
    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/admin/users/:userId", isAdminMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw error;
    
    // Cleanup permissions
    await supabaseAdmin.from('user_branch_permissions').delete().eq('user_id', userId);
    // Cleanup public.users
    await supabaseAdmin.from('users').delete().eq('id', userId);
    
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/admin/permissions", isAdminMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('user_branch_permissions').select('*');
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/permissions", isAdminMiddleware, async (req, res) => {
  try {
    const { user_id, branch_id, permission_level, granular_permissions } = req.body;
    const { data, error } = await supabaseAdmin
      .from('user_branch_permissions')
      .upsert({ 
        user_id, 
        branch_id, 
        permission_level: permission_level || 'viewer', 
        granular_permissions: granular_permissions || {} 
      }, { onConflict: 'user_id,branch_id' })
      .select()
      .single();
      
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Vercel normalization
app.all("*", (req, res) => {
  res.status(404).json({ error: `Not found: ${req.url}` });
});

// Automatic Sync Background Task (15 minutes)
async function autoSync() {
  console.log("[AUTO-SYNC] Iniciando sincronização programada (15 min)...");
  const { data: branches } = await supabaseAdmin.from('branches').select('*');
  if (branches) {
    for (const b of branches) await syncBranchBalance(supabaseAdmin, b);
  }
}

// Start the interval
setInterval(autoSync, 900000);

export default app;
