import React from 'react';
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
                  <div key={branch.id} className="p-4 rounded-xl bg-muted/30 border border-border flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{branch.name}</span>
                    <select
                      value={perm.level}
                      onChange={(e) => onPermissionChange(userId, branch.id, e.target.value, {})}
                      className="p-2 bg-surface border border-border rounded-lg text-xs font-bold text-foreground focus:ring-2 focus:ring-primary outline-none"
                    >
                      <option value="none">Sem acesso</option>
                      <option value="view">Visualizar</option>
                      <option value="add_sale">Adicionar Venda</option>
                      <option value="edit">Editar</option>
                    </select>
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
