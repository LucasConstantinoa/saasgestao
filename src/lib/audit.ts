import { supabase } from '@/lib/supabase';

export const logAuditEvent = async (action: string, detail: string, type: 'info' | 'success' | 'warning' | 'error' | 'delete' = 'info') => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const userName = session?.user?.user_metadata?.userName || session?.user?.email || 'Usuário Desconhecido';
    
    await supabase.from('audit_log').insert({
      action,
      detail: `${userName}: ${detail}`,
      type
    });
  } catch (error) {
    console.error('Failed to log audit event:', error);
  }
};
