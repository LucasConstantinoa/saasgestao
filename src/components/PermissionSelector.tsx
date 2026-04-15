import React from 'react';
import { Eye, Edit3, Lock, X, ShieldCheck } from 'lucide-react';
import { Building2 } from 'lucide-react';
import { Branch, Company } from '@/types';
import { cn } from '@/lib/utils';
import { BranchCard } from './BranchCard';

interface Props {
  userId: string;
  branches: Branch[];
  companies: Company[];
  permissions: any; // Can be a map or object
  onPermissionChange: (user_id: string, branch_id: number, level: string, granular?: any) => void;
  useCards?: boolean;
}

export const PermissionSelector = ({ userId, branches, companies, permissions, onPermissionChange, useCards = false }: Props) => {
  return (
    <div className="space-y-4">
      {companies.map(company => {
        const companyBranches = branches.filter(b => b.company_id === company.id);
        if (companyBranches.length === 0) return null;

        return (
          <div key={company.id} className="space-y-2">
            <h4 className="flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
              <Building2 size={12} /> {company.name}
            </h4>
            <div className={cn("grid gap-2", useCards ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1")}>
              {companyBranches.map(branch => {
                const perm = permissions[branch.id] || { level: 'none' };
                const hasAccess = perm.level === 'view' || perm.level === 'edit';

                if (useCards) {
                  return (
                    <BranchCard 
                      key={branch.id} 
                      branch={branch} 
                      company={company}
                      permissions={permissions} 
                      onPermissionChange={onPermissionChange}
                      userId={userId}
                    />
                  );
                }

                return (
                  <div key={branch.id} className="p-4 rounded-xl bg-muted/30 border border-border hover:border-primary/50 transition-colors flex items-center justify-between group">
                    <span className="text-sm font-medium text-foreground">{branch.name}</span>
                    <div className="flex items-center gap-2">
                      {perm.level === 'none' && <Lock className="text-destructive h-4 w-4 shrink-0" title="Sem acesso" />}
                      {perm.level === 'view' && <Eye className="text-blue-500 h-4 w-4 shrink-0" title="Visualizar apenas (sem alterar)" />}
                      {perm.level === 'edit' && <Edit3 className="text-emerald-500 h-4 w-4 shrink-0" title="Pode editar tudo" />}
                      {perm.level === 'reports_only' && <ShieldCheck className="text-amber-500 h-4 w-4 shrink-0" title="Relatórios apenas" />}
                      <select
                        value={perm.level}
                        onChange={(e) => onPermissionChange(userId, branch.id, e.target.value, {})}
                        className="p-2 bg-surface border border-border/50 rounded-lg text-xs font-bold text-foreground focus:ring-2 focus:ring-primary outline-none hover:border-primary/50 group-hover:bg-surface/80"
                      >
                        <option value="none">🔒 Sem acesso</option>
                        <option value="view">👁️ Visualizar (sem alterar)</option>
                        <option value="reports_only">📊 Relatórios</option>
                        <option value="add_sale">💰 Vendas</option>
                        <option value="edit">✏️ Admin Filial</option>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
