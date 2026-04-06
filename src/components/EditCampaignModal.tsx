import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/Modal';
import { useToasts } from '@/components/Toast';
import { Campaign } from '@/types';
import { Edit2, Eye, TrendingUp, DollarSign, Target, Calendar } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface EditCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: Campaign | null;
  onUpdateCampaign: (id: number, name: string, purpose: string, spend: number) => void;
}

export const EditCampaignModal: React.FC<EditCampaignModalProps> = ({
  isOpen,
  onClose,
  campaign,
  onUpdateCampaign,
}) => {
  const { addToast } = useToasts();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [spend, setSpend] = useState('');

  useEffect(() => {
    if (campaign) {
      setName(campaign.name || '');
      setPurpose(campaign.purpose || '');
      setSpend((campaign.spend || 0).toString());
      setIsEditing(false); // Reset to view mode when opening a new campaign
    }
  }, [campaign, isOpen]);

  const handleSubmit = () => {
    if (!campaign) return;
    if (!name.trim() || !purpose.trim() || !spend) {
      addToast('warning', 'Campos obrigatórios', 'Preencha todos os campos da campanha.');
      return;
    }
    const spendValue = parseFloat(spend);
    if (isNaN(spendValue) || spendValue <= 0) {
      addToast('warning', 'Valor inválido', 'O gasto diário deve ser um número positivo.');
      return;
    }
    onUpdateCampaign(campaign.id, name, purpose, spendValue);
    setIsEditing(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center justify-between w-full pr-4">
          <h3 className="text-xl font-bold tracking-tight text-foreground">
            {isEditing ? "Editar Campanha" : "Detalhes da Campanha"}
          </h3>
          <div className="flex items-center bg-muted p-1 rounded-xl border border-border">
            <button 
              onClick={() => setIsEditing(false)} 
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                !isEditing 
                  ? 'bg-surface text-primary shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Eye size={12} />
              Visualizar
            </button>
            <button 
              onClick={() => setIsEditing(true)} 
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                isEditing 
                  ? 'bg-surface text-primary shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Edit2 size={12} />
              Editar
            </button>
          </div>
        </div>
      }
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <button onClick={onClose} className="btn-secondary">Fechar</button>
          {isEditing && (
            <button onClick={handleSubmit} className="btn-primary">Salvar Alterações</button>
          )}
        </div>
      }
    >
      {isEditing ? (
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Nome da Campanha</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Campanha de Verão 2026"
              className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all text-foreground"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Propósito</label>
            <input 
              type="text" 
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Ex: Aumentar vendas em 15%"
              className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all text-foreground"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Gasto Diário</label>
            <input 
              type="number" 
              value={spend}
              onChange={(e) => setSpend(e.target.value)}
              placeholder="0.00"
              className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all text-foreground"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-4 p-6 rounded-[2rem] bg-primary/5 border border-primary/10 mb-2">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Target size={32} className="text-primary" />
            </div>
            <div>
              <h4 className="text-2xl font-black text-foreground tracking-tight">{campaign?.name}</h4>
              <p className="text-sm font-bold text-primary uppercase tracking-widest">{campaign?.status === 'active' ? 'Ativa' : 'Pausada'}</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
              <Target size={12} /> Nome da Campanha
            </label>
            <div className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 text-foreground font-bold">
              {campaign?.name}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
              <TrendingUp size={12} /> Propósito
            </label>
            <div className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 text-foreground font-bold">
              {campaign?.purpose}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
                <DollarSign size={12} /> Gasto Diário
              </label>
              <div className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 text-foreground font-bold">
                {formatCurrency(campaign?.spend || 0)}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
                <Calendar size={12} /> Data de Criação
              </label>
              <div className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 text-foreground font-bold">
                {campaign?.created_at ? new Date(campaign.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};
