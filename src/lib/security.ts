import { supabase } from '@/lib/supabase';

export const logSecurityEvent = async (action: string, resource: string, metadata: any = {}, userId?: string) => {
  try {
    const ipResponse = await fetch('https://api.ipify.org?format=json');
    const { ip } = await ipResponse.json();

    await supabase.from('security_logs').insert({
      user_id: userId,
      action,
      resource,
      ip_address: ip,
      metadata
    });
  } catch (error) {
    console.error('Erro ao salvar log de segurança:', error);
  }
};
