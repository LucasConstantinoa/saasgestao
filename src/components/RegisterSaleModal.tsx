import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/Modal';
import { useToasts } from '@/components/Toast';

interface RegisterSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegisterSale: (saleData: any) => void;
  companyType: 'association' | 'direct_sales';
  editingSale?: any;
}

export const RegisterSaleModal: React.FC<RegisterSaleModalProps> = ({
  isOpen,
  onClose,
  onRegisterSale,
  companyType,
  editingSale,
}) => {
  const { addToast } = useToasts();
  const [clientName, setClientName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Association fields
  const [membershipFee, setMembershipFee] = useState('');
  const [monthlyFee, setMonthlyFee] = useState('');

  // Direct sale fields
  const [itemSold, setItemSold] = useState('');
  const [saleValue, setSaleValue] = useState('');
  const [isParcelado, setIsParcelado] = useState(false);
  const [installments, setInstallments] = useState('');
  const [installmentValue, setInstallmentValue] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (editingSale) {
        setClientName(editingSale.client_name || '');
        setDate(editingSale.date ? new Date(editingSale.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
        setMembershipFee(editingSale.membership_fee?.toString() || '');
        setMonthlyFee(editingSale.monthly_fee?.toString() || '');
        setItemSold(editingSale.item_sold || '');
        setSaleValue(editingSale.sale_value?.toString() || '');
        setIsParcelado(editingSale.has_installment || false);
        setInstallments(editingSale.installments?.toString() || '');
        setInstallmentValue(editingSale.installment_value?.toString() || '');
      } else {
        setClientName('');
        setDate(new Date().toISOString().split('T')[0]);
        setMembershipFee('');
        setMonthlyFee('');
        setItemSold('');
        setSaleValue('');
        setIsParcelado(false);
        setInstallments('');
        setInstallmentValue('');
      }
    }
  }, [isOpen, editingSale, companyType]);

  useEffect(() => {
    if (isParcelado) {
      const numInstallments = parseInt(installments, 10);
      const valInstallment = parseFloat(installmentValue);
      if (!isNaN(numInstallments) && !isNaN(valInstallment) && numInstallments > 0 && valInstallment > 0) {
        setSaleValue((numInstallments * valInstallment).toFixed(2));
      }
    }
  }, [isParcelado, installments, installmentValue]);

  const handleSubmit = () => {
    if (!clientName.trim()) {
      addToast('warning', 'Campo obrigatório', 'O nome do cliente é obrigatório.');
      return;
    }

    let saleData: any = { client_name: clientName, date };

    if (companyType === 'association') {
      if (!membershipFee || !monthlyFee) {
        addToast('warning', 'Campos obrigatórios', 'Preencha os valores de adesão e mensalidade.');
        return;
      }
      saleData = {
        ...saleData,
        membership_fee: parseFloat(membershipFee) || 0,
        monthly_fee: parseFloat(monthlyFee) || 0,
        adhesion_value: parseFloat(membershipFee) || 0, // Map to backend adhesion_value
        sale_value: 0,
      };
    } else {
      if (!itemSold.trim() || !saleValue) {
        addToast('warning', 'Campos obrigatórios', 'Preencha o item vendido e o valor da venda.');
        return;
      }
      saleData = {
        ...saleData,
        item_sold: itemSold,
        product: itemSold, // Map to backend product
        sale_value: parseFloat(saleValue) || 0,
        has_installment: isParcelado,
        installments: isParcelado ? (parseInt(installments, 10) || 1) : 1,
        installment_value: isParcelado ? (parseFloat(installmentValue) || 0) : parseFloat(saleValue),
      };
    }

    onRegisterSale(saleData);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${editingSale ? 'Editar' : 'Registrar Nova'} Venda - ${companyType === 'association' ? 'Associação' : 'Venda Direta'}`}
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={handleSubmit} className="btn-primary">{editingSale ? 'Salvar' : 'Registrar'}</button>
        </>
      }
    >
      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Nome do Cliente</label>
          <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all text-foreground" />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Data</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all text-foreground" />
        </div>

        {companyType === 'association' ? (
          <>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Valor da Adesão</label>
              <input type="number" value={membershipFee} onChange={(e) => setMembershipFee(e.target.value)} className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all text-foreground" placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Valor da Mensalidade</label>
              <input type="number" value={monthlyFee} onChange={(e) => setMonthlyFee(e.target.value)} className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all text-foreground" placeholder="0.00" />
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Item Vendido</label>
              <input type="text" value={itemSold} onChange={(e) => setItemSold(e.target.value)} className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all text-foreground" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Valor da Venda</label>
              <input type="number" value={saleValue} onChange={(e) => setSaleValue(e.target.value)} className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all disabled:opacity-50 text-foreground" placeholder="0.00" disabled={isParcelado} />
            </div>
            <div className="flex items-center gap-2">
              <div className="checkbox-wrapper">
                <input id="parcelado-check" type="checkbox" checked={isParcelado} onChange={(e) => setIsParcelado(e.target.checked)} />
                <label htmlFor="parcelado-check">
                  <div className="tick_mark"></div>
                </label>
              </div>
              <label htmlFor="parcelado-check" className="text-xs font-black uppercase tracking-widest cursor-pointer text-foreground">Venda Parcelada?</label>
            </div>
            {isParcelado && (
              <div className="grid grid-cols-2 gap-4 p-4 border border-border rounded-xl bg-muted/30">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Nº de Parcelas</label>
                  <input type="number" value={installments} onChange={(e) => setInstallments(e.target.value)} className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all text-foreground" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Valor da Parcela</label>
                  <input type="number" value={installmentValue} onChange={(e) => setInstallmentValue(e.target.value)} className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all text-foreground" placeholder="0.00" />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
};
