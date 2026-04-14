const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const crypto = require('crypto');

const supabaseUrl = "https://mqhzrmladohpujiigazq.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xaHpybWxhZG9ocHVqaWlnYXpxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjc1MDU1NiwiZXhwIjoyMDg4MzI2NTU2fQ.9U86Npv17tn409g6VcnPl8kTXv5m-QAo8lKYeFc3asw";
const fbSecret = "71add3525cf76ed5414faf252574420d";

const supabase = createClient(supabaseUrl, supabaseKey);

async function testBasic() {
  const branchId = 14; 
  const { data: branch } = await supabase.from('branches').select('*').eq('id', branchId).single();
  const token = branch.facebook_access_token;
  const cleanId = branch.facebook_ad_account_id.replace('act_', '');

  const proof = crypto.createHmac('sha256', fbSecret).update(token).digest('hex');
  
  try {
    const response = await axios.get(`https://graph.facebook.com/v22.0/act_${cleanId}`, {
      params: {
        access_token: token,
        appsecret_proof: proof,
        fields: 'id,name,account_status,currency'
      }
    });
    console.log('FB Basic Response:', JSON.stringify(response.data, null, 2));
  } catch (e) {
    console.error('FB Basic Error:', e.response?.data || e.message);
  }
}

testBasic();
