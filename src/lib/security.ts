import { supabase } from '@/lib/supabase';
import type { UserBranchPermission, PermissionLevel } from '@/types';

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

export const getUserPermissions = async (userId: string): Promise<Record<number, UserBranchPermission>> => {
  const { data } = await supabase
    .from('user_branch_permissions')
    .select('*')
    .eq('user_id', userId);
  return data?.reduce((acc, p: UserBranchPermission) => {
    acc[p.branch_id] = p;
    return acc;
  }, {} as Record<number, UserBranchPermission>) || {};
};

export const hasPermission = async (userId: string, branchId: number, minLevel: PermissionLevel): Promise<boolean> => {
  const perms = await getUserPermissions(userId);
  const perm = perms[branchId];
  if (!perm) return false;

  const levels: Record<PermissionLevel, number> = {
    none: 0,
    view: 1,
    reports_only: 2,
    add_sale: 3,
    edit: 4
  };
  return levels[perm.permission_level] >= levels[minLevel];
};

