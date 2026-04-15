import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://mqhzrmladohpujiigazq.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xaHpybWxhZG9ocHVqaWlnYXpxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjc1MDU1NiwiZXhwIjoyMDg4MzI2NTU2fQ.9U86Npv17tn409g6VcnPl8kTXv5m-QAo8lKYeFc3asw";

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: any, res: any) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  )

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });
    
    const { data: profile } = await supabaseAdmin.from('users').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin' && user.email !== 'brtreino@gmail.com') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (req.method === 'GET') {
      const { data, error } = await supabaseAdmin.from('user_branch_permissions').select('*');
      if (error) throw error;
      return res.json(data || []);
    } 
    
    else if (req.method === 'POST') {
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
      return res.json(data);
    } else if (req.method === 'DELETE') {
      const { user_id, branch_id } = req.query;
      if (!user_id || !branch_id) return res.status(400).json({ error: 'Missing user_id or branch_id' });
      const { error } = await supabaseAdmin
        .from('user_branch_permissions')
        .delete()
        .eq('user_id', user_id)
        .eq('branch_id', parseInt(branch_id as string));
      if (error) throw error;
      return res.json({ success: true });
    }
    
    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err: any) {
    console.error('Admin API Permissions Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
