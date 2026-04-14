const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const crypto = require('crypto');

const supabaseUrl = "https://mqhzrmladohpujiigazq.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xaHpybWxhZG9ocHVqaWlnYXpxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjc1MDU1NiwiZXhwIjoyMDg4MzI2NTU2fQ.9U86Npv17tn409g6VcnPl8kTXv5m-QAo8lKYeFc3asw";
const fbSecret = "71add3525cf76ed5414faf252574420d";

const supabase = createClient(supabaseUrl, supabaseKey);

async function dryRunSync() {
  const branchId = 14; // Canoinhas
  const { data: branch } = await supabase.from('branches').select('*').eq('id', branchId).single();
  const token = branch.facebook_access_token;
  const adAccountIds = [branch.facebook_ad_account_id.replace('act_', '')];

  console.log('Testing with Account:', adAccountIds[0]);

  const parseDisplayValue = (str) => {
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
    try {
      const proof = crypto.createHmac('sha256', fbSecret).update(token).digest('hex');
      const response = await axios.get(`https://graph.facebook.com/v22.0/act_${cleanId}`, {
        params: {
          access_token: token,
          appsecret_proof: proof,
          fields: 'name,balance,funding_source_details{display_string,balance},total_prepaid_balance'
        }
      });
      console.log('FB Raw Response:', JSON.stringify(response.data, null, 2));
      const d = response.data;
      const displayStr = d.funding_source_details?.display_string;
      console.log('Parsed Display:', displayStr, ' -> ', parseDisplayValue(displayStr));
    } catch (e) {
      console.error('FB Error:', e.response?.data || e.message);
    }
  }
}

dryRunSync();
