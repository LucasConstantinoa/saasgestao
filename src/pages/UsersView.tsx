import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from '@/components/UI';
import { supabase } from '@/lib/supabase';
import { useToasts } from '@/components/Toast';
import { useTrafficFlow } from '@/context/TrafficFlowContext';
import { cn } from '@/lib/utils';
import { ShieldCheck } from 'lucide-react';
import { UserSettingsModal } from '@/components/UserSettingsModal';
import { CreateUserModal } from '@/components/CreateUserModal';
import { UserSelector } from '@/components/UserSelector';

export const UsersView = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { addToast } = useToasts();
  const { companies, branches } = useTrafficFlow();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.warn('No active session, skipping admin data fetch');
        return;
      }
      const headers = { 'Authorization': `Bearer ${session.access_token}` };
      const [usersRes, permsRes] = await Promise.all([
        fetch('/api/admin/users', { headers }).then(async res => {
          if (!res.ok) throw new Error(`Failed to fetch users: ${res.status} ${await res.text()}`);
          return res.json();
        }),
        fetch('/api/admin/permissions', { headers }).then(async res => {
          if (!res.ok) throw new Error(`Failed to fetch permissions: ${res.status} ${await res.text()}`);
          return res.json();
        })
      ]);
      
      setUsers(Array.isArray(usersRes) ? usersRes : []);
      setPermissions(Array.isArray(permsRes) ? permsRes : []);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      setUsers([]);
      setPermissions([]);
    }
  };

  const handleCreateUser = async (email: string, password: string, permissions: any) => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
      body: JSON.stringify({ email, password, role: 'user' })
    });
    
    if (res.ok) {
      const newUser = await res.json();
      // Apply permissions
      for (const branch_id in permissions) {
        const { level, granular } = permissions[branch_id];
        await handlePermissionChange(newUser.id, parseInt(branch_id), level, granular);
      }
      addToast('success', 'Usuário criado', 'O novo membro foi adicionado com sucesso.');
      fetchData();
    } else {
      try {
        const errorData = await res.json();
        addToast('error', 'Erro ao criar usuário', errorData.error || 'Erro interno no servidor.');
      } catch (e) {
        addToast('error', 'Erro', 'Não foi possível criar o usuário. Erro 500.');
      }
    }
    setLoading(false);
  };

  const handlePermissionChange = async (user_id: string, branch_id: number, permission_level: string, granular?: any) => {
    // Optimistic UI update
    setPermissions(prev => {
      const existing = prev.find(p => p.user_id === user_id && p.branch_id === branch_id);
      if (existing) {
        return prev.map(p => p.user_id === user_id && p.branch_id === branch_id 
          ? { ...p, permission_level, granular_permissions: granular } 
          : p);
      } else {
        return [...prev, { user_id, branch_id, permission_level, granular_permissions: granular }];
      }
    });

    const { data: { session } } = await supabase.auth.getSession();
    await fetch('/api/admin/permissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
      body: JSON.stringify({ user_id, branch_id, permission_level, granular_permissions: granular })
    });
    fetchData();
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.')) return;
    
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/admin/users?id=${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      
      if (res.ok) {
        addToast('success', 'Usuário excluído', 'O usuário foi removido com sucesso.');
        setIsModalOpen(false);
        fetchData();
      } else {
        const errorData = await res.json();
        addToast('error', 'Erro ao excluir', errorData.error || 'Erro interno no servidor.');
      }
    } catch (e) {
      addToast('error', 'Erro', 'Não foi possível excluir o usuário.');
    }
    setLoading(false);
  };

  const openSettingsModal = (user: any) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto space-y-8"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white">Gestão de Acessos</h2>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <ShieldCheck size={18} />
          <span>Administração de Usuários</span>
        </div>
      </div>

      <UserSelector 
        users={users} 
        onSelectUser={openSettingsModal} 
        onCreateUser={() => setIsCreateModalOpen(true)} 
      />

      <UserSettingsModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        user={selectedUser}
        branches={branches}
        companies={companies}
        permissions={permissions}
        onPermissionChange={handlePermissionChange}
        onDeleteUser={handleDeleteUser}
      />
      
      <AnimatePresence>
        {isCreateModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-background/50 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>
      
      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        branches={branches}
        companies={companies}
        onCreateUser={handleCreateUser}
      />
    </motion.div>
  );
};
