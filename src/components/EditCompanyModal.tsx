import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/Modal';
import { Company } from '@/types';

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
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Nome</label>
          <input 
            type="text" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all text-foreground"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Budget Mensal</label>
          <input 
            type="number" 
            value={monthlyBudget}
            onChange={(e) => setMonthlyBudget(e.target.value)}
            className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all text-foreground"
          />
        </div>
        <div className="space-y-3">
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Tipo de Empresa</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setType('direct_sales')}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${
                type === 'direct_sales'
                  ? 'bg-primary/10 border-primary text-primary shadow-[0_0_20px_rgba(0,212,255,0.1)]'
                  : 'bg-muted/30 border-border text-muted-foreground hover:border-primary/30'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${type === 'direct_sales' ? 'bg-primary/20' : 'bg-muted'}`}>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <span className="text-xs font-bold uppercase tracking-widest">Venda Direta</span>
            </button>
            <button
              type="button"
              onClick={() => setType('association')}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${
                type === 'association'
                  ? 'bg-primary/10 border-primary text-primary shadow-[0_0_20px_rgba(0,212,255,0.1)]'
                  : 'bg-muted/30 border-border text-muted-foreground hover:border-primary/30'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${type === 'association' ? 'bg-primary/20' : 'bg-muted'}`}>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <span className="text-xs font-bold uppercase tracking-widest">Associação</span>
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">URL do Logo</label>
          <input 
            type="text" 
            value={logo}
            onChange={(e) => setLogo(e.target.value)}
            className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all text-foreground"
          />
        </div>
      </div>
    </Modal>
  );
};
