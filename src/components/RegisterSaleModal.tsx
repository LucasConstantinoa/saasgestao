import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { useToasts } from './Toast';

interface RegisterSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegisterSale: (saleData: any) => void;
  companyType: 'association' | 'direct_sales';
}

export const RegisterSaleModal: React.FC<RegisterSaleModalProps> = ({
  isOpen,
  onClose,
  onRegisterSale,
  companyType,
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
  }, [isOpen, companyType]);

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
      title={`Registrar Nova Venda - ${companyType === 'association' ? 'Associação' : 'Venda Direta'}`}
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={handleSubmit} className="btn-primary">Registrar</button>
        </>
      }
    >
      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 dark:text-sky-400/40 uppercase tracking-[0.2em]">Nome do Cliente</label>
          <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} className="w-full bg-slate-50 dark:bg-sky-950/20 border border-slate-200 dark:border-sky-500/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all text-slate-800 dark:text-white" />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 dark:text-sky-400/40 uppercase tracking-[0.2em]">Data</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-slate-50 dark:bg-sky-950/20 border border-slate-200 dark:border-sky-500/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all text-slate-800 dark:text-white" />
        </div>

        {companyType === 'association' ? (
          <>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 dark:text-sky-400/40 uppercase tracking-[0.2em]">Valor da Adesão</label>
              <input type="number" value={membershipFee} onChange={(e) => setMembershipFee(e.target.value)} className="w-full bg-slate-50 dark:bg-sky-950/20 border border-slate-200 dark:border-sky-500/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all text-slate-800 dark:text-white" placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 dark:text-sky-400/40 uppercase tracking-[0.2em]">Valor da Mensalidade</label>
              <input type="number" value={monthlyFee} onChange={(e) => setMonthlyFee(e.target.value)} className="w-full bg-slate-50 dark:bg-sky-950/20 border border-slate-200 dark:border-sky-500/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all text-slate-800 dark:text-white" placeholder="0.00" />
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 dark:text-sky-400/40 uppercase tracking-[0.2em]">Item Vendido</label>
              <input type="text" value={itemSold} onChange={(e) => setItemSold(e.target.value)} className="w-full bg-slate-50 dark:bg-sky-950/20 border border-slate-200 dark:border-sky-500/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all text-slate-800 dark:text-white" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 dark:text-sky-400/40 uppercase tracking-[0.2em]">Valor da Venda</label>
              <input type="number" value={saleValue} onChange={(e) => setSaleValue(e.target.value)} className="w-full bg-slate-50 dark:bg-sky-950/20 border border-slate-200 dark:border-sky-500/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all disabled:opacity-50 text-slate-800 dark:text-white" placeholder="0.00" disabled={isParcelado} />
            </div>
            <div className="flex items-center gap-2">
              <div className="checkbox-wrapper">
                <input id="parcelado-check" type="checkbox" checked={isParcelado} onChange={(e) => setIsParcelado(e.target.checked)} />
                <label htmlFor="parcelado-check">
                  <div className="tick_mark"></div>
                </label>
              </div>
              <label htmlFor="parcelado-check" className="text-xs font-black uppercase tracking-widest cursor-pointer text-slate-800 dark:text-white">Venda Parcelada?</label>
            </div>
            {isParcelado && (
              <div className="grid grid-cols-2 gap-4 p-4 border border-slate-200 dark:border-sky-500/10 rounded-xl bg-sky-500/5 dark:bg-sky-950/10">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 dark:text-sky-400/40 uppercase tracking-[0.2em]">Nº de Parcelas</label>
                  <input type="number" value={installments} onChange={(e) => setInstallments(e.target.value)} className="w-full bg-slate-50 dark:bg-sky-950/20 border border-slate-200 dark:border-sky-500/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all text-slate-800 dark:text-white" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 dark:text-sky-400/40 uppercase tracking-[0.2em]">Valor da Parcela</label>
                  <input type="number" value={installmentValue} onChange={(e) => setInstallmentValue(e.target.value)} className="w-full bg-slate-50 dark:bg-sky-950/20 border border-slate-200 dark:border-sky-500/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all text-slate-800 dark:text-white" placeholder="0.00" />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
};
