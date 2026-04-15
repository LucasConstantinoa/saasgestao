const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const crypto = require('crypto');

const supabaseUrl = "https://mqhzrmladohpujiigazq.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xaHpybWxhZG9ocHVqaWlnYXpxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjc1MDU1NiwiZXhwIjoyMDg4MzI2NTU2fQ.9U86Npv17tn409g6VcnPl8kTXv5m-QAo8lKYeFc3asw";
const fbSecret = "71add3525cf76ed5414faf252574420d";

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFundingOnly() {
  const branchIds = [36, 37]; // Testing Diovane and Douglas
  
  for (const branchId of branchIds) {
    const { data: branch } = await supabase.from('branches').select('*').eq('id', branchId).single();
    if (!branch) {
      console.log(`Branch ${branchId} not found.`);
      continue;
    }
    let token = branch.facebook_access_token;
    if (!token) {
      const { data: globalToken } = await supabase.from('settings').select('value').eq('key', 'facebook_access_token').single();
      token = globalToken?.value;
    }
    console.log(`Token Length: ${token?.length}, Starts with: ${token?.substring(0, 10)}`);
    const cleanId = (branch.facebook_ad_account_id || '').replace('act_', '').split('|')[0];
    const proof = crypto.createHmac('sha256', fbSecret).update(token).digest('hex');
    
    console.log(`\n=== Testing Branch ID: ${branchId} | Name: ${branch.name} | Ad Account: act_${cleanId} ===`);
    try {
      const response = await axios.get(`https://graph.facebook.com/v22.0/act_${cleanId}`, {
        params: {
          access_token: token,
          appsecret_proof: proof,
          fields: 'name,funding_source_details,currency,account_status,balance,total_prepaid_balance,is_prepaid_account,remaining_balance,spend_cap,amount_spent'
        }
      });
      console.log('FB API Response:', JSON.stringify(response.data, null, 2));
    } catch (e) {
      console.error('FB API Error:', e.response?.data || e.message);
    }
  }
}

testFundingOnly();
