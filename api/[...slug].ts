import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";

// Inline types (avoid cross-directory import that breaks Vercel serverless build)
interface FundingSourceDetails {
  id: string;
  name?: string;
  display_string: string;
  balance: string;
  type: string;
  balance_source?: string;
  last_balance_fetch?: string;
}

interface FacebookAccountResponse {
  id: string;
  balance: string;
  is_prepaid_account: boolean;
  funding_source_details?: FundingSourceDetails;
  spend_cap?: string;
  amount_spent?: string;
  account_status: string;
  total_prepaid_balance?: string;
  currency?: string;
}



async function axiosWithRetry(fn: () => Promise<any>, retries = 3, backoff = 1000): Promise<any> {
  try {
    return await fn();
  } catch (err: any) {
    const status = err.response?.status;
    if (retries > 0 && (status === 429 || (status >= 500 && status <= 599))) {
      console.warn(`Retrying request due to status ${status}. Retries left: ${retries}`);
      await new Promise(resolve => setTimeout(resolve, backoff));
      return axiosWithRetry(fn, retries - 1, backoff * 2);
    }
    throw err;
  }
}

import crypto from "crypto";

// Helper to generate appsecret_proof
function getAppSecretProof(token: string): string {
  // Use env var or fallback to the provided app secret
  const secret = process.env.FACEBOOK_APP_SECRET || '71add3525cf76ed5414faf252574420d';
  if (!secret) {
    console.error("[getAppSecretProof] FACEBOOK_APP_SECRET not set!");
    return "";
  }
  return crypto.createHmac('sha256', secret).update(token).digest('hex');
}

const app = express();
app.use((req, res, next) => {
  console.log(`[EXPRESS_DEBUG] ${req.method} ${req.url} | originalUrl: ${req.originalUrl}`);
  next();
});
console.log(`[API] Starting server...`);
console.log(`[API] FACEBOOK_APP_SECRET is set: ${!!process.env.FACEBOOK_APP_SECRET}`);
app.use(cors());
app.use(express.json());

// Normalização de URL para Vercel (remove /api se presente)
app.use((req, res, next) => {
  if (req.url.startsWith("/api/")) {
    req.url = req.url.replace("/api/", "/");
  } else if (req.url === "/api") {
    req.url = "/";
  }
  next();
});

// Initialize Supabase Admin Client
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://mqhzrmladohpujiigazq.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

console.log(`[Supabase] Initializing with URL: ${supabaseUrl}`);
console.log(`[Supabase] Service Key present: ${!!supabaseServiceKey}`);

let supabaseAdmin: any = null;
if (supabaseServiceKey) {
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  console.log('[Supabase] Admin Client initialized');
} else {
  console.warn("[Supabase] SUPABASE_SERVICE_ROLE_KEY is not set. Admin routes will not work.");
}

// --- MIDDLEWARES ---

// Branch Auth Middleware
const branchAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
    const token = authHeader.split(' ')[1];
    
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
    if (!supabaseAnonKey) {
      console.error('SUPABASE_ANON_KEY is missing in branchAuth');
      return res.status(500).json({ error: 'SUPABASE_ANON_KEY or VITE_SUPABASE_ANON_KEY is not set.' });
    }

    const supabaseUserClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    const { data: { user }, error } = await supabaseUserClient.auth.getUser();
    if (error || !user) {
      console.error('Auth error:', error);
      return res.status(403).json({ error: 'Forbidden', details: error?.message });
    }

    // Se for admin master, libera tudo
    if (user.email === 'brtreino@gmail.com' || user.email === 'trafegopagoprosul@gmail.com' || user.user_metadata?.role === 'admin') {
      (req as any).supabase = supabaseAdmin || supabaseUserClient;
      return next();
    }

    // Verifica permissão na tabela
    const rawBranchId = req.query.branchId || req.body.branchId;
    if (!rawBranchId) return res.status(400).json({ error: 'branchId is required' });
    const branchId = parseInt(rawBranchId as string);
    if (isNaN(branchId)) return res.status(400).json({ error: 'branchId must be a number' });

    const clientToUse = supabaseAdmin || supabaseUserClient;
    const { data, error: permError } = await clientToUse
      .from('user_branch_permissions')
      .select('*')
      .eq('user_id', user.id)
      .eq('branch_id', branchId)
      .single();

    if (permError || !data) return res.status(403).json({ error: 'Forbidden: Sem permissão para esta filial' });
    
    (req as any).supabase = supabaseAdmin || supabaseUserClient;
    next();
  } catch (err: any) {
    console.error('branchAuth Middleware Error:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
};

// User Auth Middleware (No branch check)
const userAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
    const token = authHeader.split(' ')[1];
    
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
    if (!supabaseAnonKey) {
      console.error('SUPABASE_ANON_KEY is missing in userAuth');
      return res.status(500).json({ error: 'SUPABASE_ANON_KEY or VITE_SUPABASE_ANON_KEY is not set.' });
    }

    const supabaseUserClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    const { data: { user }, error } = await supabaseUserClient.auth.getUser();
    if (error || !user) return res.status(403).json({ error: 'Forbidden' });

    (req as any).supabase = supabaseAdmin || supabaseUserClient;
    next();
  } catch (err: any) {
    console.error('userAuth Middleware Error:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
};

// Admin Middleware
const adminAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
    const token = authHeader.split(' ')[1];

    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return res.status(403).json({ error: 'Forbidden', details: error?.message });

    if (user.user_metadata?.role === 'admin' || 
        user.email === 'brtreino@gmail.com' || 
        user.email === 'trafegopagoprosul@gmail.com') {
      next();
    } else {
      res.status(403).json({ error: 'Forbidden: Admin access required' });
    }
  } catch (err: any) {
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
};
// --- API ROUTES ---

const api = express.Router();

// Debug middleware for the API router
api.use((req, res, next) => {
  console.log(`[API Router] Request: ${req.method} ${req.url}`);
  next();
});

// Helper function to sync a single branch balance
async function syncBranchBalance(supabaseClient: any, branch: any) {
  try {
    if (!branch.facebook_ad_account_id) return;

    let tokenToUse = branch.facebook_access_token;
    if (!tokenToUse) {
      const { data: settingsRow } = await supabaseClient
        .from('settings')
        .select('value')
        .eq('key', 'facebook_access_token')
        .single();
      tokenToUse = settingsRow?.value;
    }

    if (!tokenToUse) return;

    const adAccountIds = branch.facebook_ad_account_id.split(',').map((id: string) => id.trim().split('|')[0]).filter(Boolean);
    
    let totalBalance = 0;
    await Promise.all(adAccountIds.map(async (accountId: string) => {
      try {
        const cleanId = accountId.replace('act_', '');
        const accountRes = await axiosWithRetry(() => axios.get(`https://graph.facebook.com/v22.0/act_${cleanId}`, {
          headers: { Authorization: `Bearer ${tokenToUse}` },
          params: { 
            fields: 'balance,is_prepaid_account,funding_source_details{id,name,display_string,balance,type,balance_source,last_balance_fetch},spend_cap,amount_spent,account_status,total_prepaid_balance',
            appsecret_proof: getAppSecretProof(tokenToUse)
          }
        }));
        
        const data: FacebookAccountResponse = accountRes.data as FacebookAccountResponse;
        console.log(`[DEBUG_DETAILED] Raw API response for ${cleanId} (${data.funding_source_details?.display_string || 'no funding source'}):`, JSON.stringify(data));
        const balanceVal = parseFloat(data.balance || "0");
        const totalPrepaidVal = parseFloat(data.total_prepaid_balance || "0");
        const amountSpentVal = parseFloat(data.amount_spent || "0");
        const spendCapVal = parseFloat(data.spend_cap || "0");
        
        const fundingBalance = data.funding_source_details?.balance ? parseFloat(data.funding_source_details.balance) : 0;
        const fundingName = data.funding_source_details?.display_string || data.funding_source_details?.name || 'unknown';
        const totalPrepaid = totalPrepaidVal;
        const rawBalance = balanceVal;
        const spent = amountSpentVal;
        const cap = spendCapVal;
        
        // --- BALANCE CALCULATION LOGIC ---
        const isPrepaid = data.is_prepaid_account || !!(data.funding_source_details && (data.funding_source_details.balance || data.funding_source_details.display_string));

        let accountBalance = 0;

        const parseDisplayValue = (str: string | undefined) => {
          if (!str) return 0;
          const cleaned = str.replace(/[^\d,.-]/g, '');
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

        if (isPrepaid) {
          const displayStr = data.funding_source_details?.display_string;
          if (displayStr) {
            accountBalance = parseDisplayValue(displayStr);
            console.log(`[SYNC API] ${cleanId}: display_string="${displayStr}" -> R$ ${accountBalance}`);
          } else if (data.funding_source_details?.balance) {
            accountBalance = Math.abs(parseFloat(data.funding_source_details.balance) / 100);
            console.log(`[SYNC API] ${cleanId}: funding.balance -> R$ ${accountBalance}`);
          } else if (data.total_prepaid_balance && parseFloat(data.total_prepaid_balance) !== 0) {
            accountBalance = Math.abs(parseFloat(data.total_prepaid_balance) / 100);
          } else {
            accountBalance = Math.abs(parseFloat(data.balance || "0") / 100);
          }
        } else {
          // Standard Postpaid logic
          const rawBalance = parseFloat(data.balance || "0") / 100;
          const amountSpent = parseFloat(data.amount_spent || "0") / 100;
          const spendCap = parseFloat(data.spend_cap || "0") / 100;

          if (spendCap > 0) {
            accountBalance = Math.max(0, spendCap - amountSpent);
          } else {
            // Balance is debt for postpaid (usually positive number), so we negate it for "available fuel"
            accountBalance = -rawBalance;
          }
        }
        
        console.log(`[DEBUG_DETAILED] Account ${data.id}: isPrepaid=${isPrepaid}, CalcValue=${accountBalance}`);
        totalBalance += accountBalance;

        // DEBUG LOG TO SUPABASE
        await supabaseClient.from('audit_log').insert({
          action: 'META_SYNC_VAL',
          detail: `Account ${data.id} (${data.funding_source_details?.display_string}): calc=${accountBalance}, prepaid=${data.total_prepaid_balance}, funding=${data.funding_source_details?.balance}, raw=${data.balance}`,
          type: 'info'
        });
      } catch (err: any) {
        console.error(`Erro ao buscar conta ${accountId}:`, err.message);
        await supabaseClient.from('audit_log').insert({
          action: 'DEBUG_META_ERROR',
          detail: `Filial ${branch.id} (${accountId}): ${err.message}`,
          type: 'error'
        });
      }
    }));

    await supabaseClient
      .from('branches')
      .update({ 
        balance: totalBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', branch.id);
      
    console.log(`Saldo atualizado para filial ${branch.id}: ${totalBalance}`);

    // --- SYNC CAMPAIGNS ---
    console.log(`Puxando campanhas para filial ${branch.id}...`);
    let allCampaigns: any[] = [];
    await Promise.all(adAccountIds.map(async (accountId: string) => {
      try {
        const cleanId = accountId.replace('act_', '');
        const campsRes = await axiosWithRetry(() => axios.get(`https://graph.facebook.com/v22.0/act_${cleanId}/campaigns`, {
          headers: { Authorization: `Bearer ${tokenToUse}` },
          params: { 
            fields: 'id,name,status,effective_status,daily_budget,lifetime_budget,objective,start_time',
            appsecret_proof: getAppSecretProof(tokenToUse)
          }
        }));
        
        const camps = campsRes.data.data || [];
        camps.forEach((c: any) => {
          allCampaigns.push({
            branch_id: branch.id,
            name: c.name,
            spend: parseFloat(c.daily_budget || "0") / 100,
            status: c.status?.toLowerCase() === 'active' ? 'active' : 'paused',
            purpose: (c.objective?.toLowerCase() === 'outcome_sales' || c.objective?.toLowerCase() === 'sales') ? 'vendas' : 'leads',
            created_at: c.start_time || new Date().toISOString(),
            meta_campaign_id: c.id
          });
        });
      } catch (err: any) {
        console.error(`Erro ao buscar campanhas da conta ${accountId}:`, err.message);
      }
    }));

    if (allCampaigns.length > 0) {
      // Delete old campaigns for this branch to avoid duplicates/stale data
      await supabaseClient
        .from('campaigns')
        .delete()
        .eq('branch_id', branch.id);
      
      // Insert new ones from Facebook
      await supabaseClient
        .from('campaigns')
        .insert(allCampaigns);
      
      console.log(`${allCampaigns.length} campanhas sincronizadas para filial ${branch.id}`);
    }

  } catch (err: any) {
    console.error(`Erro ao sincronizar filial ${branch.id}:`, err.message);
  }
}

// Main sync task
async function syncAllBranchesBalances() {
  if (!supabaseAdmin) return;
  
  console.log("Iniciando sincronização automática de saldos...");
  
  const { data: branches } = await supabaseAdmin
    .from('branches')
    .select('id, facebook_ad_account_id, facebook_access_token');
    
  if (branches) {
    for (const branch of branches) {
      await syncBranchBalance(supabaseAdmin, branch);
    }
  }
  console.log("Sincronização automática concluída.");
}

// Schedule sync every 10 minutes (600.000 ms)
if (!process.env.VERCEL) {
  setInterval(syncAllBranchesBalances, 600000);
}

// Proxy for direct FB API calls with security signatures
api.get("/facebook/ad-accounts", async (req, res) => {
  try {
    const token = req.query.token as string;
    if (!token) return res.status(400).json({ error: "Token is required" });
    
    const response = await axios.get(`https://graph.facebook.com/v22.0/me/adaccounts`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { 
        fields: 'name,account_id,id',
        limit: 500,
        appsecret_proof: getAppSecretProof(token)
      }
    });
    
    res.json(response.data);
  } catch (err: any) {
    console.error("AdAccounts Proxy error:", err.message);
    res.status(err.response?.status || 500).json(err.response?.data || { error: err.message });
  }
});

// Trigger all branches sync
api.post("/facebook/sync-all", userAuth, async (req, res) => {
  try {
    const supabaseClient = (req as any).supabase;
    console.log("Iniciando sincronização automática de saldos...");
    const { data: branches } = await supabaseClient
      .from('branches')
      .select('id, facebook_ad_account_id, facebook_access_token');
      
    if (branches) {
      for (const branch of branches) {
        await syncBranchBalance(supabaseClient, branch);
      }
    }
    console.log("Sincronização automática concluída.");
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao sincronizar todas as filiais' });
  }
});

api.post("/facebook/sync", userAuth, async (req, res) => {
  const { branchId } = req.body;
  if (!branchId) return res.status(400).json({ error: 'branchId is required' });
  
  try {
    const supabaseClient = (req as any).supabase;
    const { data: branch, error } = await supabaseClient
      .from('branches')
      .select('id, facebook_ad_account_id, facebook_access_token')
      .eq('id', branchId)
      .single();
      
    if (error || !branch) return res.status(404).json({ error: 'Branch not found' });
    
    await syncBranchBalance(supabaseClient, branch);
    
    const { data: updatedBranch } = await supabaseClient
      .from('branches')
      .select('balance')
      .eq('id', branchId)
      .single();
      
    res.json({ success: true, balance: updatedBranch?.balance });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao sincronizar filial' });
  }
});

// Admin Routes
api.post("/admin/users", adminAuth, async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: { role },
      email_confirm: true,
    });
    if (error) return res.status(400).json({ error: error.message });
    res.json(data.user);
  } catch (err: any) {
    console.error("Create User Error:", err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

api.get("/admin/users", adminAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data.users);
  } catch (err: any) {
    console.error("List Users Error:", err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

api.delete("/admin/users/:id", adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  } catch (err: any) {
    console.error("Delete User Error:", err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

api.post("/admin/permissions", adminAuth, async (req, res) => {
  try {
    const { user_id, branch_id, permission_level, granular_permissions } = req.body;
    
    if (permission_level === 'none') {
      const { error } = await supabaseAdmin
        .from('user_branch_permissions')
        .delete()
        .eq('user_id', user_id)
        .eq('branch_id', branch_id);
      if (error) return res.status(400).json({ error: error.message });
    } else {
      const { error } = await supabaseAdmin
        .from('user_branch_permissions')
        .upsert({ user_id, branch_id, permission_level, granular_permissions }, { onConflict: 'user_id, branch_id' });
      if (error) return res.status(400).json({ error: error.message });
    }
    
    res.json({ success: true });
  } catch (err: any) {
    console.error("Set Permissions Error:", err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

api.get("/admin/permissions", adminAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('user_branch_permissions').select('*');
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (err: any) {
    console.error("Get Permissions Error:", err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});


// Facebook Token Exchange
api.post("/facebook/exchange-token", userAuth, async (req, res) => {
  const { shortLivedToken } = req.body;
  const supabaseClient = (req as any).supabase;
  
  try {
    const { data: settingsRows } = await supabaseClient
      .from('settings')
      .select('key, value')
      .in('key', ['facebook_app_id', 'facebook_app_secret']);

    const settings: Record<string, string> = {};
    settingsRows?.forEach((row: any) => {
      settings[row.key] = row.value;
    });

    const appId = settings.facebook_app_id;
    const appSecret = settings.facebook_app_secret;

    if (!appId || !appSecret) {
      return res.status(400).json({ error: 'Facebook App ID ou App Secret não configurados nas configurações do sistema.' });
    }

    const response = await axios.get(`https://graph.facebook.com/v22.0/oauth/access_token`, {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: appId,
        client_secret: appSecret,
        fb_exchange_token: shortLivedToken
      }
    });
    res.json(response.data);
  } catch (err: any) {
    console.error("Error exchanging token:", err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.error?.message || 'Erro ao trocar token do Facebook' });
  }
});

api.get("/facebook/accounts", userAuth, async (req, res) => {
  const { access_token } = req.query;
  if (!access_token) return res.status(400).json({ error: 'Token de acesso não fornecido' });

  try {
    // 1. Fetch Business Managers
    const bmsRes = await axios.get(`https://graph.facebook.com/v22.0/me/businesses`, {
      params: { access_token, fields: 'id,name,vertical' }
    });
    const bms = bmsRes.data.data || [];

    // 2. Fetch Ad Accounts for each BM
    const bmsWithAccounts = await Promise.all(bms.map(async (bm: any) => {
      try {
        const accountsRes = await axios.get(`https://graph.facebook.com/v22.0/${bm.id}/adaccounts`, {
          params: { access_token, fields: 'id,name,account_id,currency,account_status' }
        });
        return { ...bm, adAccounts: accountsRes.data.data || [] };
      } catch (err) {
        console.error(`Error fetching accounts for BM ${bm.id}:`, err);
        return { ...bm, adAccounts: [] };
      }
    }));

    // 3. Fetch Personal Ad Accounts (not in a BM)
    const personalAccountsRes = await axios.get(`https://graph.facebook.com/v22.0/me/adaccounts`, {
      params: { access_token, fields: 'id,name,account_id,currency,account_status' }
    });
    const personalAccounts = personalAccountsRes.data.data || [];

    if (personalAccounts.length > 0) {
      bmsWithAccounts.push({
        id: 'personal',
        name: 'Contas Pessoais',
        adAccounts: personalAccounts
      });
    }

    res.json({ bms: bmsWithAccounts });
  } catch (err: any) {
    console.error("Error fetching FB accounts:", err.response?.data || err.message);
    res.status(500).json({ error: 'Erro ao buscar contas no Facebook' });
  }
});

// Campaign Routes
api.get("/facebook/balance", branchAuth, async (req, res) => {
  const rawBranchId = req.query.branchId;
  const branchId = parseInt(rawBranchId as string);
  const supabaseClient = (req as any).supabase;
  
  try {
    // 1. Fetch branch data
    console.log(`Fetching balance for branch: ${branchId}`);
    const { data: branch, error: branchError } = await supabaseClient
      .from('branches')
      .select('facebook_ad_account_id, facebook_access_token')
      .eq('id', branchId)
      .single();

    if (branchError) {
      console.error(`Branch fetch error for ${branchId}:`, branchError);
      return res.status(400).json({ error: 'Erro ao buscar dados da filial', details: branchError.message, branchId });
    }
    if (!branch) {
      console.error(`Branch ${branchId} not found`);
      return res.status(404).json({ error: 'Filial não encontrada', branchId });
    }
    if (!branch?.facebook_ad_account_id) {
      console.error(`Branch ${branchId} has no facebook_ad_account_id`);
      return res.status(400).json({ error: 'Filial não configurada com ID de conta do Facebook', branchId });
    }

    let tokenToUse = branch.facebook_access_token;

    // 2. Fallback to master token if branch token is missing
    if (!tokenToUse) {
      const { data: settingsRow } = await supabaseClient
        .from('settings')
        .select('value')
        .eq('key', 'facebook_access_token')
        .single();
      
      tokenToUse = settingsRow?.value;
    }

    if (!tokenToUse) {
      return res.status(400).json({ error: 'Token do Facebook não encontrado (nem na filial, nem global)' });
    }

    // 3. Handle multiple ad account IDs (comma-separated, potentially with |level)
    const adAccountIds = branch.facebook_ad_account_id.split(',').map((id: string) => {
      const trimmed = id.trim();
      if (!trimmed) return null;
      // Extract ID if it's in the format id|level, and remove 'act_' prefix if present
      const clean = trimmed.split('|')[0].replace('act_', '');
      return clean;
    }).filter(Boolean);
    
    console.log(`[DEBUG] Ad Account IDs to fetch:`, adAccountIds);
    
    if (adAccountIds.length === 0) {
      return res.status(400).json({ error: 'Nenhum ID de conta válido encontrado' });
    }

    // Fetch data for all accounts
    const errors: string[] = [];
    const accountPromises = adAccountIds.map(async (cleanId: string) => {
      try {
        const [accountRes, insightsRes] = await Promise.all([
          axiosWithRetry(() => axios.get(`https://graph.facebook.com/v22.0/act_${cleanId}`, {
            headers: { Authorization: `Bearer ${tokenToUse}` },
            params: { 
              fields: 'balance,amount_spent,spend_cap,currency,funding_source_details{id,name,display_string,balance,type,balance_source,last_balance_fetch},account_status',
              appsecret_proof: getAppSecretProof(tokenToUse)
            }
          })).then(res => {
            console.log(`[DEBUG] Raw Facebook API response for account ${cleanId}:`, JSON.stringify(res.data, null, 2));
            return res;
          }),
          axiosWithRetry(() => axios.get(`https://graph.facebook.com/v22.0/act_${cleanId}/insights`, {
            headers: { Authorization: `Bearer ${tokenToUse}` },
            params: {
              date_preset: 'today',
              fields: 'spend',
              appsecret_proof: getAppSecretProof(tokenToUse)
            }
          })).catch(() => ({ data: { data: [] } }))
        ]);
        
        return {
          account: accountRes.data,
          insights: insightsRes.data?.data || []
        };
      } catch (err: any) {
        console.error(`[DEBUG] Erro ao buscar conta ${cleanId}:`, err.response?.data || err.message);
        errors.push(`Conta ${cleanId}: ${err.response?.data?.error?.message || err.message}`);
        return null;
      }
    });

    const results = (await Promise.all(accountPromises)).filter(Boolean);

    if (results.length === 0) {
      return res.status(400).json({ 
        error: 'Não foi possível obter dados de nenhuma das contas vinculadas',
        details: errors
      });
    }

    // Aggregate results
    let totalBalance = 0;
    let totalAmountSpent = 0;
    let totalSpendCap = 0;
    let totalRemainingBalance = 0;
    let totalTodaySpend = 0;
    let currency = results[0]?.account?.currency || 'BRL';
    let isPrepaidGlobal = results.some(r => r?.account?.is_prepaid_account || (r?.account?.funding_source_details && r?.account?.funding_source_details.balance));

    results.forEach(res => {
      const data: FacebookAccountResponse = res?.account as FacebookAccountResponse;
      if (!data) return;
      
      console.log(`[DEBUG] Fetching balance for branch ${branchId}, account ${data.id} (${data.funding_source_details?.display_string || 'no source'}). Raw data:`, JSON.stringify(data, null, 2));
      
      const insights = res?.insights || [];
      
      const balanceVal = parseFloat(data.balance || "0");
      const amountSpentVal = parseFloat(data.amount_spent || "0");
      const spendCapVal = parseFloat(data.spend_cap || "0");
      
      const balance = isNaN(balanceVal) ? 0 : balanceVal / 100;
      const amountSpent = isNaN(amountSpentVal) ? 0 : amountSpentVal / 100;
      const spendCap = isNaN(spendCapVal) ? 0 : spendCapVal / 100;
      const todaySpend = insights.length > 0 ? parseFloat(insights[0].spend || "0") : 0;

      const parseDisplayValue = (str: string | undefined) => {
        if (!str) return 0;
        const cleaned = str.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
        return parseFloat(cleaned) || 0;
      };

      let remainingBalance = 0;
      const isPrepaid = data.is_prepaid_account || !!(data.funding_source_details && (data.funding_source_details.balance || data.funding_source_details.display_string));
      
      if (isPrepaid) {
        const fundingVal = data.funding_source_details?.balance ? parseFloat(data.funding_source_details.balance) / 100 : 0;
        const prepaidVal = data.total_prepaid_balance ? parseFloat(data.total_prepaid_balance) / 100 : 0;
        const displayVal = parseDisplayValue(data.funding_source_details?.display_string);
        
        remainingBalance = Math.abs(fundingVal || prepaidVal || displayVal || (parseFloat(data.balance || "0") / 100));
      } else {
        remainingBalance = - (parseFloat(data.balance || "0") / 100);
        if (data.spend_cap && data.spend_cap !== "0") {
          remainingBalance = (parseFloat(data.spend_cap) / 100) - (parseFloat(data.amount_spent || "0") / 100);
        }
      }
      
      totalBalance += parseFloat(data.balance || "0") / 100;
      totalAmountSpent += parseFloat(data.amount_spent || "0") / 100;
      totalSpendCap += parseFloat(data.spend_cap || "0") / 100;
      totalRemainingBalance += remainingBalance;
      totalTodaySpend += insights.length > 0 ? parseFloat(insights[0].spend || "0") : 0;
    });

    res.json({
      facebook_balance: totalBalance,
      amount_spent: totalAmountSpent,
      spend_cap: totalSpendCap,
      remaining_balance: totalRemainingBalance,
      today_spend: totalTodaySpend,
      currency,
      is_prepaid: isPrepaidGlobal,
      account_count: results.length
    });
  } catch (err: any) {
    console.error("Error fetching FB balance:", err.message, JSON.stringify(err.response?.data || err));
    const status = err.response?.status || 500;
    console.error(`[DEBUG] API Error ${status}:`, err.response?.data);
    res.status(status).json({ 
      error: err.response?.data?.error?.message || err.message || 'Erro ao buscar dados no Facebook',
      details: err.response?.data || err.message,
      debug_info: {
        status: status,
        data: err.response?.data
      }
    });
  }
});

api.get("/campaigns", branchAuth, async (req, res) => {
  const { branchId } = req.query;
  const supabaseClient = (req as any).supabase;
  
  // 1. Buscar dados da filial
  console.log(`Fetching campaigns for branch: ${branchId}`);
  const { data: branch, error } = await supabaseClient
    .from('branches')
    .select('facebook_ad_account_id, facebook_access_token')
    .eq('id', branchId)
    .single();

  if (error) {
    console.error(`Branch fetch error for ${branchId}:`, error);
    return res.status(400).json({ error: 'Erro ao buscar dados da filial' });
  }
  if (!branch?.facebook_access_token || !branch?.facebook_ad_account_id) {
    console.error(`Branch ${branchId} missing configuration`);
    return res.status(400).json({ error: 'Filial não configurada com Facebook (Conta de Anúncio ou Token ausente)' });
  }

  try {
    const adAccountIds = branch.facebook_ad_account_id.split(',').map((id: string) => {
      const trimmed = id.trim();
      if (!trimmed) return null;
      const clean = trimmed.split('|')[0].replace('act_', '');
      return clean;
    }).filter(Boolean);

    console.log(`[DEBUG] Campaign Ad Account IDs to fetch:`, adAccountIds);

    if (adAccountIds.length === 0) {
      return res.status(400).json({ error: 'Nenhum ID de conta válido encontrado' });
    }

    let allCampaigns: any[] = [];
    const errors: string[] = [];

    await Promise.all(adAccountIds.map(async (cleanId) => {
      try {
        const response = await axiosWithRetry(() => axios.get(`https://graph.facebook.com/v22.0/act_${cleanId}/campaigns`, {
          headers: { Authorization: `Bearer ${branch.facebook_access_token}` },
          params: {
            fields: 'id,name,status,effective_status,daily_budget,lifetime_budget,objective,start_time,stop_time'
          }
        }));
        if (response.data && response.data.data) {
          allCampaigns = [...allCampaigns, ...response.data.data.map((c: any) => ({ ...c, account_id: cleanId }))];
        }
      } catch (err: any) {
        console.error(`[DEBUG] Erro ao buscar campanhas da conta ${cleanId}:`, err.response?.data || err.message);
        errors.push(`Conta ${cleanId}: ${err.response?.data?.error?.message || err.message}`);
      }
    }));

    res.json({ campaigns: allCampaigns, errors: errors.length > 0 ? errors : undefined });
  } catch (err: any) {
    console.error("Error fetching campaigns:", err.response?.data || err.message);
    const status = err.response?.status || 500;
    res.status(status).json({ 
      error: err.response?.data?.error?.message || err.message || 'Erro ao buscar campanhas',
      details: err.response?.data || err.message
    });
  }
});

api.post("/campaigns", branchAuth, async (req, res) => {
  const { branchId, name, objective, daily_budget } = req.body;
  const supabaseClient = (req as any).supabase;
  
  const { data: branch } = await supabaseClient
    .from('branches')
    .select('facebook_ad_account_id, facebook_access_token')
    .eq('id', branchId)
    .single();

  if (!branch?.facebook_access_token || !branch?.facebook_ad_account_id) {
    return res.status(400).json({ error: 'Filial não configurada com Facebook' });
  }

  try {
    const adAccountIds = branch.facebook_ad_account_id.split(',').map((id: string) => {
      const trimmed = id.trim();
      if (!trimmed) return null;
      return trimmed.split('|')[0].replace('act_', '');
    }).filter(Boolean);

    if (adAccountIds.length === 0) {
      return res.status(400).json({ error: 'Nenhum ID de conta válido encontrado' });
    }

    const cleanId = adAccountIds[0]; // Use the first account

    // Lógica de criação de campanha
    const response = await axios.post(`https://graph.facebook.com/v22.0/act_${cleanId}/campaigns`, {
      name,
      objective,
      status: 'PAUSED',
      daily_budget,
      special_ad_categories: ['NONE']
    }, {
      headers: { Authorization: `Bearer ${branch.facebook_access_token}` }
    });
    res.json(response.data);
  } catch (err: any) {
    res.status(500).json({ error: err.response?.data?.error?.message || 'Erro ao criar campanha' });
  }
});

api.patch("/campaigns/:id", branchAuth, async (req, res) => {
  const { id } = req.params;
  const { branchId, status, name, daily_budget } = req.body; // status: 'ACTIVE' ou 'PAUSED'
  const supabaseClient = (req as any).supabase;
  
  const { data: branch } = await supabaseClient
    .from('branches')
    .select('facebook_access_token')
    .eq('id', branchId)
    .single();

  try {
    const updateData: any = {};
    if (status) updateData.status = status;
    if (name) updateData.name = name;
    
    // Check if we need to update budget
    if (daily_budget !== undefined) {
      // Fetch current campaign to check budget type
      const currentCampaign = await axios.get(`https://graph.facebook.com/v22.0/${id}`, {
        params: { fields: 'daily_budget,lifetime_budget' },
        headers: { Authorization: `Bearer ${branch.facebook_access_token}` }
      });
      
      if (currentCampaign.data.daily_budget) {
        updateData.daily_budget = daily_budget;
      } else if (currentCampaign.data.lifetime_budget) {
        // Cannot update daily budget for lifetime budget campaigns
        // We could potentially update lifetime_budget but it's complex, so we skip budget update
        console.warn(`Campaign ${id} uses lifetime budget. Skipping daily budget update.`);
      } else {
        updateData.daily_budget = daily_budget; // Default to daily if none set
      }
    }

    const response = await axios.post(`https://graph.facebook.com/v22.0/${id}`, updateData, {
      headers: { Authorization: `Bearer ${branch.facebook_access_token}` }
    });
    res.json(response.data);
  } catch (err: any) {
    res.status(500).json({ error: err.response?.data?.error?.message || 'Erro ao atualizar campanha' });
  }
});

api.delete("/campaigns/:id", branchAuth, async (req, res) => {
  const { id } = req.params;
  const { branchId } = req.query;
  const supabaseClient = (req as any).supabase;
  
  const { data: branch } = await supabaseClient
    .from('branches')
    .select('facebook_access_token')
    .eq('id', branchId)
    .single();

  try {
    const response = await axios.delete(`https://graph.facebook.com/v22.0/${id}`, {
      headers: { Authorization: `Bearer ${branch.facebook_access_token}` }
    });
    res.json(response.data);
  } catch (err: any) {
    res.status(500).json({ error: err.response?.data?.error?.message || 'Erro ao excluir campanha' });
  }
});

// Health check endpoint
api.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    supabaseAdminInitialized: !!supabaseAdmin,
    env: process.env.NODE_ENV,
    vercel: !!process.env.VERCEL,
    url: req.url,
    originalUrl: req.originalUrl
  });
});

// === DEVELOPER DIAGNOSTIC PAGE ===
// Serves a visual HTML page when devs/admins visit API routes in browser

const diagnosticHTML = (route: string, info: any) => `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>🔧 API Diagnóstico - ${route}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{background:#0a0e1a;color:#e0e0e0;font-family:'Segoe UI',system-ui,sans-serif;padding:24px}
    .container{max-width:900px;margin:0 auto}
    h1{font-size:28px;color:#00d4ff;margin-bottom:8px;display:flex;align-items:center;gap:12px}
    h1 span{font-size:16px;background:#1a2035;padding:4px 12px;border-radius:8px;color:#7a8baa}
    .badge{display:inline-block;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px}
    .badge-ok{background:#10b98120;color:#10b981;border:1px solid #10b98140}
    .badge-err{background:#ef444420;color:#ef4444;border:1px solid #ef444440}
    .badge-warn{background:#f59e0b20;color:#f59e0b;border:1px solid #f59e0b40}
    .card{background:#111827;border:1px solid #1e293b;border-radius:16px;padding:20px;margin:16px 0}
    .card h2{font-size:16px;color:#94a3b8;margin-bottom:12px;font-weight:600}
    .row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #1e293b}
    .row:last-child{border:none}
    .row .label{color:#64748b;font-size:13px}
    .row .value{color:#e2e8f0;font-size:13px;font-weight:600;font-family:'Cascadia Code','Fira Code',monospace}
    .routes{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}
    .route{background:#0f172a;border:1px solid #1e293b;border-radius:10px;padding:12px;font-size:12px}
    .route .method{font-weight:700;margin-right:6px}
    .method-get{color:#22d3ee}.method-post{color:#a78bfa}.method-delete{color:#f87171}
    .footer{margin-top:32px;text-align:center;color:#475569;font-size:11px}
    a{color:#00d4ff;text-decoration:none}a:hover{text-decoration:underline}
    pre{background:#0f172a;padding:12px;border-radius:8px;font-size:12px;overflow-x:auto;color:#94a3b8;margin-top:8px}
  </style>
</head>
<body>
  <div class="container">
    <h1>🔧 API Diagnóstico <span>${route}</span></h1>
    <p style="color:#64748b;margin:8px 0 24px">Painel de desenvolvedor — Somente para admins</p>

    <div class="card">
      <h2>⚡ Status do Servidor</h2>
      <div class="row"><span class="label">Supabase Admin</span><span class="value">${info.supabaseAdmin ? '<span class="badge badge-ok">Conectado</span>' : '<span class="badge badge-err">Desconectado</span>'}</span></div>
      <div class="row"><span class="label">Facebook App Secret</span><span class="value">${info.fbSecret ? '<span class="badge badge-ok">Configurado</span>' : '<span class="badge badge-warn">Não definido</span>'}</span></div>
      <div class="row"><span class="label">Ambiente</span><span class="value">${info.vercel ? 'Vercel (Produção)' : 'Local (Dev)'}</span></div>
      <div class="row"><span class="label">Rota acessada</span><span class="value">${route}</span></div>
      <div class="row"><span class="label">Timestamp</span><span class="value">${new Date().toISOString()}</span></div>
    </div>

    <div class="card">
      <h2>🗺️ Rotas Disponíveis</h2>
      <div class="routes">
        <div class="route"><span class="method method-get">GET</span> /api/health</div>
        <div class="route"><span class="method method-get">GET</span> /api/facebook/ad-accounts</div>
        <div class="route"><span class="method method-get">GET</span> /api/facebook/balance</div>
        <div class="route"><span class="method method-get">GET</span> /api/facebook/accounts</div>
        <div class="route"><span class="method method-get">GET</span> /api/campaigns</div>
        <div class="route"><span class="method method-post">POST</span> /api/facebook/sync</div>
        <div class="route"><span class="method method-post">POST</span> /api/facebook/sync-all</div>
        <div class="route"><span class="method method-post">POST</span> /api/facebook/exchange-token</div>
        <div class="route"><span class="method method-post">POST</span> /api/admin/users</div>
        <div class="route"><span class="method method-get">GET</span> /api/admin/users</div>
        <div class="route"><span class="method method-post">POST</span> /api/admin/permissions</div>
        <div class="route"><span class="method method-get">GET</span> /api/admin/permissions</div>
      </div>
    </div>

    <div class="card">
      <h2>💡 Dica</h2>
      <p style="font-size:13px;color:#94a3b8">Rotas <span class="method method-post" style="font-size:12px">POST</span> só funcionam via requisição AJAX (axios/fetch), não pelo navegador. Use o <a href="/configuration">Centro de Diagnóstico</a> na aba Configurações para testar as APIs.</p>
    </div>

    <div class="footer">SaaS Gestão — API v1.0 — ${new Date().toLocaleDateString('pt-BR')}</div>
  </div>
</body>
</html>`;

// GET handlers for sync routes (show diagnostic page instead of 404)
api.get("/facebook/sync", (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(diagnosticHTML('/api/facebook/sync', {
    supabaseAdmin: !!supabaseAdmin,
    fbSecret: !!process.env.FACEBOOK_APP_SECRET,
    vercel: !!process.env.VERCEL
  }));
});

api.get("/facebook/sync-all", (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(diagnosticHTML('/api/facebook/sync-all', {
    supabaseAdmin: !!supabaseAdmin,
    fbSecret: !!process.env.FACEBOOK_APP_SECRET,
    vercel: !!process.env.VERCEL
  }));
});

// Root API diagnostic page
api.get("/", (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(diagnosticHTML('/api', {
    supabaseAdmin: !!supabaseAdmin,
    fbSecret: !!process.env.FACEBOOK_APP_SECRET,
    vercel: !!process.env.VERCEL
  }));
});

// Catch-all for API router — show diagnostic for GET, JSON error for others
api.all("*", (req, res) => {
  console.log(`[API Router] ${req.method} ${req.url}`);
  if (req.method === 'GET') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(diagnosticHTML(req.originalUrl || req.url, {
      supabaseAdmin: !!supabaseAdmin,
      fbSecret: !!process.env.FACEBOOK_APP_SECRET,
      vercel: !!process.env.VERCEL
    }));
  } else {
    res.status(404).json({ 
      error: `Route ${req.method} ${req.url} not found`,
      hint: 'Use GET /api/health para verificar o status do servidor'
    });
  }
});

// Mount the API router - URL normalization middleware already strips /api/ prefix
app.use("/", api);

// Catch-all route for API to debug 404s
app.all("*", (req, res, next) => {
  console.log(`[Global 404] ${req.method} ${req.url} | originalUrl: ${req.originalUrl}`);
  res.status(404).json({ 
    error: `Route ${req.method} ${req.url} not found in Express API`,
    message: "If you are seeing this, the route is not defined in any router.",
    method: req.method,
    url: req.url,
    path: req.path,
    originalUrl: req.originalUrl
  });
});

// Vite middleware for development (only if not on Vercel)
async function setupVite() {
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    } else if (!process.env.VERCEL) {
      console.warn("Dist folder not found at " + distPath + ". Please run 'npm run build' first.");
      app.get("*", (req, res) => {
        res.status(500).send("Dist folder not found. Please run 'npm run build' first.");
      });
    }
  }
}

if (!process.env.VERCEL) {
  setupVite().then(() => {
    const PORT = 3000;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  });
}

export default app;
