import React, { useState } from 'react';
import { Modal } from '@/components/Modal';
import { useToasts } from '@/components/Toast';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NewCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNewCampaign: (name: string, purpose: string, spend: number, paymentSource: 'company' | 'consultant') => void;
  companyName: string;
}

export const NewCampaignModal: React.FC<NewCampaignModalProps> = ({
  isOpen,
  onClose,
  onNewCampaign,
  companyName,
}) => {
  const { addToast } = useToasts();
  const [name, setName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [spend, setSpend] = useState('');
  const [paymentSource, setPaymentSource] = useState<'company' | 'consultant' | null>(null);
  const [rememberChoice, setRememberChoice] = useState(false);

  const handleSubmit = () => {
    if (!name.trim() || !purpose.trim() || !spend || !paymentSource) {
      addToast('warning', 'Campos obrigatórios', 'Preencha todos os campos da campanha.');
      return;
    }
    const spendValue = parseFloat(spend);
    if (isNaN(spendValue) || spendValue <= 0) {
      addToast('warning', 'Valor inválido', 'O gasto diário deve ser um número positivo.');
      return;
    }
    if (rememberChoice) {
      localStorage.setItem('defaultPaymentSource', paymentSource);
    }
    onNewCampaign(name, purpose, spendValue, paymentSource);
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
        <div className="space-y-4">
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Quem paga?</label>
          <div className="grid grid-cols-2 gap-4">
            <label className={cn(
              "relative flex items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all",
              paymentSource === 'company' 
                ? "border-primary bg-primary/5 text-primary" 
                : "border-border bg-muted/20 hover:border-primary/30"
            )}>
              <input 
                type="radio" 
                name="paymentSource" 
                value="company" 
                checked={paymentSource === 'company'}
                onChange={() => setPaymentSource('company')}
                className="sr-only"
              />
              <span className="font-bold text-sm">{companyName}</span>
            </label>
            <label className={cn(
              "relative flex items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all",
              paymentSource === 'consultant' 
                ? "border-primary bg-primary/5 text-primary" 
                : "border-border bg-muted/20 hover:border-primary/30"
            )}>
              <input 
                type="radio" 
                name="paymentSource" 
                value="consultant" 
                checked={paymentSource === 'consultant'}
                onChange={() => setPaymentSource('consultant')}
                className="sr-only"
              />
              <span className="font-bold text-sm">Consultor</span>
            </label>
          </div>
        </div>
        <label className="flex items-center gap-3 cursor-pointer group">
          <div className={cn(
            "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
            rememberChoice 
              ? "bg-primary border-primary" 
              : "border-border group-hover:border-primary/50"
          )}>
            {rememberChoice && <div className="w-2.5 h-2.5 bg-white rounded-sm" />}
          </div>
          <input 
            type="checkbox" 
            id="rememberChoice"
            checked={rememberChoice}
            onChange={(e) => setRememberChoice(e.target.checked)}
            className="sr-only"
          />
          <span className="text-sm font-medium text-foreground">Lembrar minha escolha</span>
        </label>
      </div>
    </Modal>
  );
};
