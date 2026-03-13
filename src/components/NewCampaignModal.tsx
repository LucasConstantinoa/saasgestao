import React, { useState } from 'react';
import { Modal } from './Modal';
import { useToasts } from './Toast';
import { Plus } from 'lucide-react';

interface NewCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNewCampaign: (name: string, purpose: string, spend: number) => void;
}

export const NewCampaignModal: React.FC<NewCampaignModalProps> = ({
  isOpen,
  onClose,
  onNewCampaign,
}) => {
  const { addToast } = useToasts();
  const [name, setName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [spend, setSpend] = useState('');

  const handleSubmit = () => {
    if (!name.trim() || !purpose.trim() || !spend) {
      addToast('warning', 'Campos obrigatórios', 'Preencha todos os campos da campanha.');
      return;
    }
    onNewCampaign(name, purpose, parseFloat(spend) || 0);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Criar Nova Campanha"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={handleSubmit} className="btn-primary">Criar Campanha</button>
        </>
      }
    >
      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 dark:text-sky-400/40 uppercase tracking-[0.2em]">Nome da Campanha</label>
          <input 
            type="text" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Campanha de Verão 2026"
            className="w-full bg-slate-50 dark:bg-sky-950/20 border border-slate-200 dark:border-sky-500/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all text-slate-800 dark:text-white"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 dark:text-sky-400/40 uppercase tracking-[0.2em]">Propósito</label>
          <input 
            type="text" 
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="Ex: Aumentar vendas em 15%"
            className="w-full bg-slate-50 dark:bg-sky-950/20 border border-slate-200 dark:border-sky-500/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all text-slate-800 dark:text-white"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 dark:text-sky-400/40 uppercase tracking-[0.2em]">Gasto Diário</label>
          <input 
            type="number" 
            value={spend}
            onChange={(e) => setSpend(e.target.value)}
            placeholder="0.00"
            className="w-full bg-slate-50 dark:bg-sky-950/20 border border-slate-200 dark:border-sky-500/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all text-slate-800 dark:text-white"
          />
        </div>
      </div>
    </Modal>
  );
};
