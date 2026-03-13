import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Company } from '../types';

interface EditCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: Company | null;
  onUpdateCompany: (company: Company) => void;
}

export const EditCompanyModal: React.FC<EditCompanyModalProps> = ({
  isOpen,
  onClose,
  company,
  onUpdateCompany,
}) => {
  const [name, setName] = useState('');
  const [monthlyBudget, setMonthlyBudget] = useState('');
  const [type, setType] = useState<'association' | 'direct_sales'>('direct_sales');
  const [logo, setLogo] = useState('');

  useEffect(() => {
    if (company) {
      setName(company.name || '');
      setMonthlyBudget(String(company.monthly_budget || ''));
      setType(company.type || 'direct_sales');
      setLogo(company.logo || '');
    }
  }, [company]);

  const handleSubmit = () => {
    if (company && name) {
      onUpdateCompany({
        ...company,
        name,
        monthly_budget: parseFloat(monthlyBudget) || 0,
        type,
        logo,
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Editar Empresa"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={handleSubmit} className="btn-primary">Salvar</button>
        </>
      }
    >
      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 dark:text-sky-400/40 uppercase tracking-[0.2em]">Nome</label>
          <input 
            type="text" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-slate-50 dark:bg-sky-950/20 border border-slate-200 dark:border-sky-500/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all text-slate-800 dark:text-white"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 dark:text-sky-400/40 uppercase tracking-[0.2em]">Budget Mensal</label>
          <input 
            type="number" 
            value={monthlyBudget}
            onChange={(e) => setMonthlyBudget(e.target.value)}
            className="w-full bg-slate-50 dark:bg-sky-950/20 border border-slate-200 dark:border-sky-500/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all text-slate-800 dark:text-white"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 dark:text-sky-400/40 uppercase tracking-[0.2em]">Tipo de Empresa</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as 'association' | 'direct_sales')}
            className="w-full bg-slate-50 dark:bg-sky-950/20 border border-slate-200 dark:border-sky-500/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all text-slate-800 dark:text-white"
          >
            <option value="direct_sales">Venda Direta</option>
            <option value="association">Associação</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 dark:text-sky-400/40 uppercase tracking-[0.2em]">URL do Logo</label>
          <input 
            type="text" 
            value={logo}
            onChange={(e) => setLogo(e.target.value)}
            className="w-full bg-slate-50 dark:bg-sky-950/20 border border-slate-200 dark:border-sky-500/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all text-slate-800 dark:text-white"
          />
        </div>
      </div>
    </Modal>
  );
};
