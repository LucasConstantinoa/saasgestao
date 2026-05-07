import React from 'react';
import { Building2, Shield, ShieldCheck } from 'lucide-react';
import { Branch, Company } from '@/types';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';

interface BranchCardProps {
  branch: Branch;
  company: Company;
  permissions: any;
  onPermissionChange: (user_id: string, branch_id: number, level: string, granular?: any) => void;
  userId: string;
}

const permissionLevels = [
  { value: 'none', label: 'Sem Acesso', icon: Shield, color: 'text-muted-foreground', bg: 'bg-muted/30' },
  { value: 'view', label: 'Acesso Liberado', icon: ShieldCheck, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
];

export const BranchCard = ({ branch, company, permissions, onPermissionChange, userId }: BranchCardProps) => {
  const perm = permissions[branch.id] || { level: 'none', granular: {} };
  const currentLevel = perm.level === 'none' ? 'none' : 'view'; // Simplifica qualquer nível legado para 'view'

  const hasPermissions = currentLevel !== 'none';
  const currentPerm = permissionLevels.find(p => p.value === currentLevel) || permissionLevels[0];
  const CurrentIcon = currentPerm.icon;

  const togglePermission = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextLevel = currentLevel === 'none' ? 'view' : 'none';
    
    // Simplificamos as permissões granulares: Acesso liberado ganha relatório e notificações
    const newGranular = nextLevel === 'none' 
      ? { can_view_reports: false, notify_low_balance: false }
      : { can_view_reports: true, notify_low_balance: true };

    onPermissionChange(userId, branch.id, nextLevel, newGranular);
  };

  return (
    <motion.div
      layout
      className={cn(
        "rounded-2xl border transition-all duration-300 overflow-hidden cursor-pointer group/card",
        hasPermissions
          ? "bg-primary/5 border-primary/20 shadow-lg shadow-primary/5"
          : "bg-surface border-border/40 hover:border-border/70"
      )}
      onClick={togglePermission}
    >
      <div className="flex items-center gap-3 p-4 transition-all">
        {/* Icon */}
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300",
          hasPermissions
            ? "bg-gradient-to-br from-primary/20 to-primary/5 text-primary border border-primary/10"
            : "bg-muted text-muted-foreground border border-border/50"
        )}>
          <Building2 size={18} className="transition-transform group-hover/card:scale-110" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-foreground leading-tight truncate">{branch.name}</h4>
          <div className="flex items-center gap-1.5 mt-1">
            <CurrentIcon size={12} className={currentPerm.color} />
            <span className={cn("text-[10px] font-bold uppercase tracking-wider", currentPerm.color)}>
              {currentPerm.label}
            </span>
          </div>
        </div>

        {/* Action Button Toggle */}
        <div className={cn(
          "px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm border",
          currentPerm.bg, currentPerm.color, "border-current/10",
          "group-hover/card:brightness-110 group-active/card:scale-95"
        )}>
          {currentPerm.label}
        </div>
      </div>
    </motion.div>
  );
};

