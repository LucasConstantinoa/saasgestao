import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToasts } from '@/components/Toast';
import { useTrafficFlow } from '@/context/TrafficFlowContext';
import { Facebook, Link as LinkIcon, Copy, Trash2, CheckCircle2, Shield, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import { FacebookConnection, FacebookAdAccount, FacebookInviteLink, Branch } from '@/types';
import { Modal } from '@/components/Modal';

export const MetaView: React.FC = () => {
  const { branches } = useTrafficFlow();
  const { addToast } = useToasts();
  
  const [connections, setConnections] = useState<FacebookConnection[]>([]);
  const [adAccounts, setAdAccounts] = useState<Record<string, FacebookAdAccount[]>>({});
  const [inviteLinks, setInviteLinks] = useState<Record<number, FacebookInviteLink>>({});
  
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState<number | null>(null);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch connections
      const { data: conns, error: connError } = await supabase
        .from('facebook_connections')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (connError) throw connError;
      setConnections(conns || []);

      // Fetch ad accounts
      if (conns && conns.length > 0) {
        const { data: accounts, error: accError } = await supabase
          .from('facebook_ad_accounts')
          .select('*');
          
        if (accError) throw accError;
        
        // Group by connection ID
        const accountsByConn: Record<string, FacebookAdAccount[]> = {};
        accounts?.forEach((acc: any) => {
          if (!accountsByConn[acc.connection_id]) {
            accountsByConn[acc.connection_id] = [];
          }
          accountsByConn[acc.connection_id].push(acc);
        });
        setAdAccounts(accountsByConn);
      }

      // Fetch active invite links
      const { data: links, error: linkError } = await supabase
        .from('facebook_invite_links')
        .select('*')
        .is('used_at', null)
        .gte('expires_at', new Date().toISOString());

      if (linkError) throw linkError;

      const linksByBranch: Record<number, FacebookInviteLink> = {};
      links?.forEach((link: any) => {
        linksByBranch[link.branch_id] = link;
      });
      setInviteLinks(linksByBranch);

    } catch (err) {
      console.error('Error fetching Facebook data:', err);
      addToast('error', 'Erro', 'Falha ao carregar conexões do Meta.');
    } finally {
      setIsLoading(false);
    }
  };

  const generateInviteLink = async (branchId: number) => {
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('facebook_invite_links')
        .insert({
          branch_id: branchId,
          token,
          expires_at: expiresAt,
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;

      setInviteLinks(prev => ({ ...prev, [branchId]: data as FacebookInviteLink }));
      
      const url = `${window.location.origin}/fb-connect/${token}`;
      setGeneratedLink(url);
      
    } catch (err) {
      console.error('Error generating link:', err);
      addToast('error', 'Erro', 'Não foi possível gerar o link de convite.');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    addToast('success', 'Copiado', 'Link copiado para a área de transferência.');
  };

  const deleteConnection = async (id: string, branchId: number) => {
    if (!confirm('Tem certeza que deseja remover esta conexão? Ela parará de sincronizar as campanhas.')) return;
    
    try {
      const { error } = await supabase.from('facebook_connections').delete().eq('id', id);
      if (error) throw error;
      
      // Also clear the branch token if it's the active one
      await supabase.from('branches').update({
        facebook_access_token: null,
        facebook_ad_account_id: null
      }).eq('id', branchId);
      
      setConnections(prev => prev.filter(c => c.id !== id));
      addToast('success', 'Removida', 'A conexão do Facebook foi removida.');
    } catch (err) {
      console.error('Error deleting connection:', err);
      addToast('error', 'Erro', 'Não foi possível remover a conexão.');
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
              <Facebook className="text-blue-500" size={32} />
              Meta Conexões (Clientes)
            </h1>
            <p className="text-muted-foreground mt-1">
              Gere links de login para seus clientes conectarem suas próprias contas de anúncio.
            </p>
          </div>
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-all font-bold"
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
            Atualizar
          </button>
        </div>

        {/* Action Panel */}
        <div className="bg-surface border border-border rounded-[2rem] p-6 lg:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex-1">
              <h3 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
                <LinkIcon size={20} className="text-primary" />
                Gerar Link de Conexão
              </h3>
              <p className="text-sm text-muted-foreground">
                Selecione uma filial para gerar um link único. Envie este link ao seu cliente pelo WhatsApp, ele fará login no Facebook e o sistema vai importar as contas de anúncio automaticamente.
              </p>
            </div>
            <div className="w-full md:w-auto">
              <button
                onClick={() => setIsGenerateModalOpen(true)}
                className="w-full btn-primary flex items-center justify-center gap-2"
              >
                <Facebook size={18} />
                <span>Gerar Link do Cliente</span>
              </button>
            </div>
          </div>
        </div>

        {/* Existing Connections */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-foreground px-2">Conexões Ativas</h3>
          
          {isLoading && connections.length === 0 ? (
            <div className="flex justify-center p-12"><RefreshCw className="animate-spin text-primary" /></div>
          ) : connections.length === 0 ? (
            <div className="text-center p-12 bg-surface border border-border rounded-3xl">
              <Shield className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">Nenhuma conexão do Facebook estabelecida pelos clientes.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {connections.map(conn => {
                const branch = branches.find(b => b.id === conn.branch_id);
                const accounts = adAccounts[conn.id] || [];
                
                return (
                  <motion.div
                    key={conn.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-5 bg-surface border border-border rounded-2xl flex flex-col gap-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          {conn.facebook_user_picture ? (
                            <img src={conn.facebook_user_picture} alt="" className="w-12 h-12 rounded-xl object-cover" />
                          ) : (
                            <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                              <Facebook className="text-blue-500" />
                            </div>
                          )}
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-surface" />
                        </div>
                        <div>
                          <h4 className="font-bold text-foreground text-sm">{conn.facebook_user_name}</h4>
                          <span className="text-xs text-muted-foreground block">{conn.facebook_email}</span>
                          <span className="inline-block mt-1 px-2 py-0.5 bg-primary/10 text-primary text-[9px] font-bold uppercase rounded-md tracking-wider">
                            Filial: {branch?.name || conn.branch_id}
                          </span>
                        </div>
                      </div>
                      <button 
                        onClick={() => deleteConnection(conn.id, conn.branch_id)}
                        className="p-2 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="Remover conexão"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="pt-4 border-t border-border/50">
                      <p className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
                        <CheckCircle2 size={14} className="text-emerald-500" />
                        Contas de Anúncio Vinculadas ({accounts.length})
                      </p>
                      
                      <div className="space-y-2 max-h-[120px] overflow-y-auto custom-scrollbar pr-2">
                        {accounts.map(acc => (
                          <div key={acc.id} className="flex items-center justify-between p-2 rounded-lg bg-background border border-border/50">
                            <div>
                              <p className="text-xs font-bold text-foreground">{acc.account_name}</p>
                              <p className="text-[10px] text-muted-foreground font-mono">act_{acc.account_id}</p>
                            </div>
                            <span className="px-2 py-1 text-[9px] font-bold uppercase bg-emerald-500/10 text-emerald-500 rounded">
                              {acc.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Generate Link Modal */}
      <Modal
        isOpen={isGenerateModalOpen}
        onClose={() => {
          setIsGenerateModalOpen(false);
          setGeneratedLink('');
          setSelectedBranch(null);
        }}
        title="Gerar Link de Conexão com Meta"
      >
        <div className="space-y-6">
          {!generatedLink ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Selecione a Filial do Cliente
                </label>
                <select
                  className="input-base"
                  value={selectedBranch || ''}
                  onChange={(e) => setSelectedBranch(Number(e.target.value))}
                >
                  <option value="" disabled className="bg-background text-foreground">Escolha uma filial...</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id} className="bg-background text-foreground">{b.name}</option>
                  ))}
                </select>
              </div>

              {selectedBranch && inviteLinks[selectedBranch] && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex gap-3">
                  <Shield className="text-amber-500 shrink-0 mt-0.5" size={16} />
                  <div>
                    <h4 className="text-xs font-bold text-amber-500">Link Ativo Existente</h4>
                    <p className="text-[10px] text-amber-500/80 mt-1">
                      Já existe um link não utilizado para esta filial. Ao gerar um novo, você pode enviar para o cliente o novo link.
                    </p>
                  </div>
                </div>
              )}

              <button
                onClick={() => selectedBranch && generateInviteLink(selectedBranch)}
                disabled={!selectedBranch}
                className="w-full btn-primary"
              >
                Gerar Link Único
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                <h3 className="text-lg font-bold text-emerald-500">Link Gerado com Sucesso!</h3>
                <p className="text-sm text-emerald-500/80 mt-1">
                  Copie o link abaixo e envie para o seu cliente (ex: Copiar e colar no WhatsApp).
                </p>
              </div>

              <div className="flex items-center gap-2 p-3 bg-surface border border-border rounded-xl">
                <input
                  type="text"
                  readOnly
                  value={generatedLink}
                  className="flex-1 bg-transparent border-none outline-none text-sm text-foreground font-mono"
                />
                <button
                  onClick={() => copyToClipboard(generatedLink)}
                  className="p-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors whitespace-nowrap flex items-center gap-2 text-xs font-bold"
                >
                  <Copy size={14} />
                  Copiar
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};