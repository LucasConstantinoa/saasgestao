import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { UserBranchPermission, PermissionLevel } from '@/types';

export const usePermissions = (userId: string) => {
  const [permissions, setPermissions] = useState<Record<number, UserBranchPermission>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPermissions = async () => {
      const { data } = await supabase
        .from('user_branch_permissions')
        .select('*')
        .eq('user_id', userId);
      const map = data?.reduce((acc, p) => {
        acc[p.branch_id] = p;
        return acc;
      }, {} as Record<number, UserBranchPermission>);
      setPermissions(map || {});
      setLoading(false);
    };
    fetchPermissions();
  }, [userId]);

  const hasAccess = (branchId: number, minLevel: PermissionLevel): boolean => {
    const perm = permissions[branchId];
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

  return { permissions, loading, hasAccess };
};

