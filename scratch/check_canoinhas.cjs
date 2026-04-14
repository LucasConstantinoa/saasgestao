const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://mqhzrmladohpujiigazq.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xaHpybWxhZG9ocHVqaWlnYXpxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjc1MDU1NiwiZXhwIjoyMDg4MzI2NTU2fQ.9U86Npv17tn409g6VcnPl8kTXv5m-QAo8lKYeFc3asw";
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCanoinhas() {
  const { data, error } = await supabase
    .from('branches')
    .select('*')
    .ilike('name', '%Canoinhas%');
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('Canoinhas Branch Data:', JSON.stringify(data, null, 2));
}

checkCanoinhas();
