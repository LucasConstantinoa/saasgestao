import React, { useState, useEffect } from 'react';
import { Building2, CheckCircle2, Shield, Eye as EyeIcon, Edit3, ShoppingCart, ShieldCheck, Settings, ChevronDown, BarChart3, Target, FileEdit } from 'lucide-react';
import { Branch, Company } from '@/types';
import { cn } from '@/lib/utils';
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
  { value: 'reports_only', label: 'Relatórios', icon: ShieldCheck, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { value: 'add_sale', label: 'Add Venda', icon: ShoppingCart, color: 'text-violet-500', bg: 'bg-violet-500/10' },
  { value: 'edit', label: 'Editar', icon: Edit3, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
];

const granularLabels: Record<string, { label: string; icon: any }> = {
  can_view_reports: { label: 'Acesso a Relatórios', icon: BarChart3 },
  can_edit_campaigns: { label: 'Editar Campanhas Meta', icon: Target },
  can_edit_branch_info: { label: 'Editar Dados Filial', icon: FileEdit },
  can_add_sales: { label: 'Registrar Vendas', icon: ShoppingCart },
};

export const BranchCard = ({ branch, company, permissions, onPermissionChange, userId }: BranchCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const perm = permissions[branch.id] || { level: 'none', granular: {} };
  const currentLevel = perm.level || 'none';
  const granular = perm.granular || {};

  const hasPermissions = currentLevel !== 'none';
  const currentPerm = permissionLevels.find(p => p.value === currentLevel) || permissionLevels[0];
  const CurrentIcon = currentPerm.icon;

  const handleLevelChange = (level: string) => {
    // Default granular sets based on level
    const newGranular: any = { ...granular };
    if (level === 'none') {
      Object.keys(granularLabels).forEach(k => newGranular[k] = false);
    } else if (level === 'view') {
      newGranular.can_view_reports = true;
      newGranular.can_edit_campaigns = false;
      newGranular.can_edit_branch_info = false;
      newGranular.can_add_sales = false;
    } else if (level === 'reports_only') {
      newGranular.can_view_reports = true;
      newGranular.can_edit_campaigns = false;
      newGranular.can_edit_branch_info = false;
      newGranular.can_add_sales = false;
    } else if (level === 'add_sale') {
      newGranular.can_view_reports = true;
      newGranular.can_add_sales = true;
    } else if (level === 'edit') {
      Object.keys(granularLabels).forEach(k => newGranular[k] = true);
    }

    onPermissionChange(userId, branch.id, level, newGranular);
  };

  const cyclePermission = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentIndex = permissionLevels.findIndex(p => p.value === currentLevel);
    const nextIndex = (currentIndex + 1) % permissionLevels.length;
    handleLevelChange(permissionLevels[nextIndex].value);
  };

  const toggleGranular = (key: string) => {
    const newGranular = { ...granular, [key]: !granular[key] };
    // If any granular is true, ensure level isn't 'none'
    let level = currentLevel;
    const hasAny = Object.values(newGranular).some(v => v);
    if (hasAny && level === 'none') level = 'view';
    if (!hasAny) level = 'none';

    onPermissionChange(userId, branch.id, level, newGranular);
  };

  return (
    <motion.div
      layout
      className={cn(
        "rounded-2xl border transition-all duration-300 overflow-hidden",
        hasPermissions
          ? "bg-primary/5 border-primary/20 shadow-lg shadow-primary/5"
          : "bg-surface border-border/40 hover:border-border/70"
      )}
    >
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/30 transition-all group/card"
        onClick={cyclePermission}
      >
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

        {/* Action Button (Cycles) */}
        <div className={cn(
          "px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm border",
          currentPerm.bg, currentPerm.color, "border-current/10",
          "group-hover/card:brightness-110 group-active/card:scale-95"
        )}>
          {currentPerm.label}
        </div>

        {/* Settings Toggle (Expands) */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          className={cn(
            "p-2 rounded-xl transition-all border",
            expanded
              ? "bg-primary text-black border-primary shadow-lg shadow-primary/20 rotate-180"
              : "bg-muted/50 text-muted-foreground border-border/40 hover:border-border hover:text-foreground"
          )}
        >
          {expanded ? <ChevronDown size={14} /> : <Settings size={14} />}
        </button>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border/40 bg-muted/20"
          >
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Settings size={12} className="text-primary" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Acessos Detalhados</span>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {Object.entries(granularLabels).map(([key, info]) => (
                  <label
                    key={key}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer group",
                      granular[key]
                        ? "bg-primary/5 border-primary/20 text-foreground"
                        : "bg-surface/50 border-border/30 text-muted-foreground hover:border-border"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg transition-colors",
                        granular[key] ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground/40"
                      )}>
                        <info.icon size={14} />
                      </div>
                      <span className="text-xs font-bold leading-none">{info.label}</span>
                    </div>

                    <div
                      className="relative"
                      onClick={(e) => { e.preventDefault(); toggleGranular(key); }}
                    >
                      <div className={cn(
                        "w-8 h-4 rounded-full transition-all duration-300",
                        granular[key] ? "bg-primary" : "bg-muted-foreground/20"
                      )} />
                      <motion.div
                        animate={{ x: granular[key] ? 16 : 0 }}
                        className="absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow-md"
                      />
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

