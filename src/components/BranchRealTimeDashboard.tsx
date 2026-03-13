import React, { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { supabase } from '../../supabase';
import styled from 'styled-components';
import { Branch, Campaign } from '../types';
import { calculateDailySpend } from '../lib/utils';
import { Modal } from './Modal';

const StyledCard = styled.div`
  .card {
    width: 100%;
    min-height: 240px;
    height: auto;
    background: #1e293b;
    border-radius: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: white;
    transition: 0.2s ease-in-out;
    cursor: pointer;
    border: 1px solid #334155;
    position: relative;
    overflow: hidden;
    padding: 20px;
  }

  .nameBox {
    font-size: 14px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #94a3b8;
    position: absolute;
    top: 20px;
    z-index: 2;
  }

  .textBox {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 15px;
    z-index: 2;
    padding: 20px;
    text-align: center;
  }

  .textBox > .price {
    font-size: 48px;
    font-weight: 900;
    color: #00ffcc;
    text-shadow: 0 0 20px rgba(0, 255, 204, 0.6), 0 0 40px rgba(0, 255, 204, 0.4);
    font-family: 'JetBrains Mono', monospace;
    letter-spacing: -2px;
    margin: 10px 0;
  }

  .textBox > span {
    font-size: 14px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    padding: 6px 16px;
    border-radius: 100px;
    background: rgba(255, 255, 255, 0.1);
  }

  .card:hover {
    transform: translateY(-5px);
    border-color: #00ffcc;
    box-shadow: 0 10px 30px -10px rgba(0, 255, 204, 0.2);
  }

  .card:hover > .textBox > .price {
    text-shadow: 0 0 15px rgba(0, 255, 204, 0.8), 0 0 30px rgba(0, 255, 204, 0.5);
  }

  .delete-btn {
    position: absolute;
    top: 10px;
    right: 10px;
    z-index: 3;
    color: #64748b;
    transition: color 0.2s;
  }

  .delete-btn:hover {
    color: #ef4444;
  }
`;

export const BranchRealTimeDashboard: React.FC<{ companyId: number; onBranchClick: (branch: Branch) => void }> = ({ companyId, onBranchClick }) => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [branchesRes, campaignsRes] = await Promise.all([
        supabase.from('branches').select('*').eq('company_id', companyId),
        supabase.from('campaigns').select('*')
      ]);
      if (branchesRes.error) console.error('Error fetching branches:', branchesRes.error);
      else setBranches(branchesRes.data || []);
      
      if (campaignsRes.error) console.error('Error fetching campaigns:', campaignsRes.error);
      else setCampaigns(campaignsRes.data || []);
      setLoading(false);
    };

    fetchData();

    const channel = supabase
      .channel('branches_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'branches', filter: `company_id=eq.${companyId}` }, (payload) => {
        if (payload.eventType === 'INSERT') setBranches(prev => [...prev, payload.new as Branch]);
        else if (payload.eventType === 'DELETE') setBranches(prev => prev.filter(b => b.id !== (payload.old as any).id));
        else if (payload.eventType === 'UPDATE') setBranches(prev => prev.map(b => b.id === (payload.new as any).id ? payload.new as Branch : b));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [companyId]);

  const handleDeleteClick = (branch: Branch) => {
    setBranchToDelete(branch);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteBranch = async () => {
    if (!branchToDelete) return;
    const { error } = await supabase.from('branches').delete().eq('id', branchToDelete.id);
    if (error) {
      console.error('Error deleting branch:', error);
    } else {
      setIsDeleteModalOpen(false);
      setBranchToDelete(null);
    }
  };

  if (loading) {
    return <div className="text-white text-center p-8">Carregando filiais...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {branches.map(branch => (
          <BranchCard 
            key={branch.id} 
            branch={branch} 
            campaigns={campaigns.filter(c => c.branch_id === branch.id)} 
            onDelete={() => handleDeleteClick(branch)} 
            onClick={() => onBranchClick(branch)} 
          />
        ))}
      </div>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirmar Exclusão de Filial"
        footer={
          <>
            <button onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-all font-bold text-sm">Cancelar</button>
            <button onClick={confirmDeleteBranch} className="px-4 py-2 rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition-all font-bold text-sm">Excluir Filial</button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-slate-600 dark:text-slate-300">
            Você tem certeza que deseja excluir a filial <span className="font-bold text-slate-800 dark:text-white">"{branchToDelete?.name}"</span>?
          </p>
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
            <p className="text-xs text-rose-600 dark:text-rose-400 font-bold uppercase tracking-widest">Aviso Crítico</p>
            <p className="text-sm text-rose-600/80 dark:text-rose-400/80 mt-1">
              Esta ação excluirá permanentemente todos os dados associados a esta filial, incluindo campanhas e registros de vendas. Esta ação não pode ser desfeita.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const BranchCard: React.FC<{ branch: Branch; campaigns: Campaign[]; onDelete: () => void; onClick: () => void }> = ({ branch, campaigns, onDelete, onClick }) => {
  const [balance, setBalance] = useState(branch.balance || 0);
  const [alert, setAlert] = useState({ text: '', color: '' });

  useEffect(() => {
    if (campaigns.length === 0) {
      setBalance(branch.balance || 0);
      setAlert({ text: 'Aguardando campanha', color: 'text-slate-500' });
      return;
    }
    
    const interval = setInterval(() => {
      const referenceDate = branch.updated_at || branch.created_at;
      const startTime = new Date(referenceDate).getTime();
      const elapsedMs = Math.max(0, Date.now() - startTime);
      const dailyRate = calculateDailySpend(campaigns);
      const initialBalance = branch.balance || 0;
      const currentBalance = initialBalance - (elapsedMs * (dailyRate / (24 * 60 * 60 * 1000)));
      setBalance(Math.max(0, currentBalance));

      const daysLeft = dailyRate > 0 ? currentBalance / dailyRate : Infinity;
      
      if (currentBalance <= 0) {
        setAlert({ text: '⚠️ CAIXA ZERADO', color: 'text-rose-500' });
      } else if (daysLeft === Infinity) {
        setAlert({ text: 'Sem gasto diário', color: 'text-slate-500' });
      } else {
        const rechargeDate = new Date(Date.now() + daysLeft * 24 * 60 * 60 * 1000);
        const dateStr = rechargeDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        const timeStr = rechargeDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        
        const color = daysLeft <= 3 ? 'text-orange-500' : 'text-emerald-500';
        setAlert({ text: `Recarregar: ${dateStr} às ${timeStr}`, color });
      }
    }, 50);
    return () => clearInterval(interval);
  }, [branch, campaigns]);

  return (
    <StyledCard onClick={onClick}>
      <div className="card">
        <button className="delete-btn" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
          <Trash2 size={20} />
        </button>
        <p className="nameBox">{branch.name}</p>
        <div className="textBox">
          <p className="text price">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 4 }).format(balance)}
          </p>
          <span className={alert.color}>{alert.text}</span>
        </div>
      </div>
    </StyledCard>
  );
};
