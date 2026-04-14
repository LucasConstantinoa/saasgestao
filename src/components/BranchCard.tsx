import React, { useState } from 'react';
import { Building2, X, CheckCircle2, Facebook, ChevronDown, Shield, Eye as EyeIcon, Edit3, ShoppingCart } from 'lucide-react';
import { Branch, Company } from '@/types';
import { cn } from '@/lib/utils';
import { PermissionSelector } from './PermissionSelector';
import { supabase } from '@/lib/supabase';
import { useToasts } from '@/components/Toast';
import { motion, AnimatePresence } from 'motion/react';

interface BranchCardProps {
  branch: Branch;
  company: Company;
  permissions: any;
  onPermissionChange: (user_id: string, branch_id: number, level: string, granular?: any) => void;
  userId: string;
}

const permissionLevels = [
  { value: 'none', label: 'Sem Acesso', icon: Shield, color: 'text-muted-foreground', bg: 'bg-muted/30' },
  { value: 'view', label: 'Visualizar', icon: EyeIcon, color: 'text-sky-500', bg: 'bg-sky-500/10' },
  { value: 'add_sale', label: 'Add Venda', icon: ShoppingCart, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { value: 'edit', label: 'Editar', icon: Edit3, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
];

export const BranchCard = ({ branch, company, permissions, onPermissionChange, userId }: BranchCardProps) => {
  const { addToast } = useToasts();
  const [expanded, setExpanded] = useState(false);

  const perm = permissions[branch.id];
  const currentLevel = perm?.level || 'none';
  const hasPermissions = currentLevel !== 'none';
  const currentPerm = permissionLevels.find(p => p.value === currentLevel) || permissionLevels[0];
  const CurrentIcon = currentPerm.icon;

  const cyclePermission = () => {
    const currentIndex = permissionLevels.findIndex(p => p.value === currentLevel);
    const nextIndex = (currentIndex + 1) % permissionLevels.length;
    onPermissionChange(userId, branch.id, permissionLevels[nextIndex].value, {});
  };

  return (
    <motion.div
      layout
      className={cn(
        "rounded-xl border transition-all duration-300 overflow-hidden",
        hasPermissions 
          ? "bg-primary/3 border-primary/20 shadow-[0_0_15px_rgba(var(--primary-rgb),0.04)]" 
          : "bg-[var(--surface)]/60 border-border/40 hover:border-border/70"
      )}
    >
      <div className="flex items-center gap-3 p-3">
        {/* Icon */}
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300",
          hasPermissions 
            ? "bg-gradient-to-br from-primary/20 to-primary/5 text-primary" 
            : "bg-muted/50 text-muted-foreground"
        )}>
          <Building2 size={14} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h4 className="text-[12px] font-semibold text-foreground leading-tight truncate">{branch.name}</h4>
          <div className="flex items-center gap-1 mt-0.5">
            <CurrentIcon size={10} className={currentPerm.color} />
            <span className={cn("text-[9px] font-semibold", currentPerm.color)}>
              {currentPerm.label}
            </span>
          </div>
        </div>

        {/* Permission toggle */}
        <button
          type="button"
          onClick={cyclePermission}
          className={cn(
            "px-2.5 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all",
            currentPerm.bg, currentPerm.color,
            "hover:scale-105 active:scale-95"
          )}
        >
          {currentPerm.label}
        </button>

        {/* Status dot */}
        {hasPermissions && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500 }}
          >
            <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};
