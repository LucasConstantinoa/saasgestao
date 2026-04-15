import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://mqhzrmladohpujiigazq.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xaHpybWxhZG9ocHVqaWlnYXpxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjc1MDU1NiwiZXhwIjoyMDg4MzI2NTU2fQ.9U86Npv17tn409g6VcnPl8kTXv5m-QAo8lKYeFc3asw";

// Inicializa o cliente com a Chave Mestra (Service Role)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: any, res: any) {
  // CORS Headers
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

  // Verifica Auth para ter certeza que quem está chamando é Admin
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
      // List Users
      const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
      if (error) throw error;
      
      // Get branch links if we want a complete view, but frontend merges it via permissions table.
      return res.json(users);
    } 
    
    else if (req.method === 'POST') {
      // Create User
      const { email, password, role } = req.body;
      const { data: createdUser, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { role: role || 'user' }
      });
      if (error) throw error;
      
      // Update public.users
      await supabaseAdmin.from('users').upsert({ id: createdUser.user.id, email: createdUser.user.email, role: role || 'user' });
      
      return res.json(createdUser.user);
    }
    
    else if (req.method === 'DELETE') {
      // Delete user: the query parameter usually comes in via req.query if using dynamic routes
      // But Vercel's standard without next.js is just req.query
      const { id } = req.query; 
      if (!id) return res.status(400).json({ error: 'Missing User ID' });
      
      const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
      if (error) throw error;
      
      await supabaseAdmin.from('user_branch_permissions').delete().eq('user_id', id);
      await supabaseAdmin.from('users').delete().eq('id', id);
      
      return res.json({ success: true });
    }

    else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (err: any) {
    console.error('Admin API Users Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
