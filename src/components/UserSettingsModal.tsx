import React, { useState } from 'react';
import { Modal } from '@/components/Modal';
import { Branch, Company } from '@/types';
import { User, Camera, Trash2, ShieldCheck, Settings } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PermissionSelector } from '@/components/PermissionSelector';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  branches: Branch[];
  companies: Company[];
  permissions: any[];
  onPermissionChange: (user_id: string, branch_id: number, level: string, granular?: any) => Promise<void>;
  onDeleteUser?: (userId: string) => void;
}

export const UserSettingsModal = ({ isOpen, onClose, user, branches, companies, permissions, onPermissionChange, onDeleteUser }: Props) => {
  const [activeTab, setActiveTab] = useState<'permissions' | 'profile'>('permissions');
  const [profilePic, setProfilePic] = useState<string | null>(user?.user_metadata?.avatar_url || null);
  const [role, setRole] = useState(user?.role || 'user');
  const isMasterOwner = user?.email === 'brtreino@gmail.com';

  const handleRoleChange = async (newRole: string) => {
    if (isMasterOwner) return;
    setRole(newRole);
    await supabase.from('users').update({ role: newRole }).eq('id', user.id);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('profiles').upload(fileName, file, { upsert: true });

    if (uploadError) {
      console.error('Error uploading:', uploadError);
      return;
    }

    const { data } = supabase.storage.from('profiles').getPublicUrl(fileName);
    setProfilePic(data.publicUrl);
    await supabase.auth.admin.updateUserById(user.id, { user_metadata: { avatar_url: data.publicUrl } });
  };

  const permissionsMap = permissions.reduce((acc, p) => {
    acc[p.branch_id] = { level: p.permission_level, granular: p.granular_permissions };
    return acc;
  }, {} as any);

  if (!user) return null;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={
        <div className="flex flex-col items-center justify-center w-full pt-4 pb-2">
          <div className="w-14 h-14 bg-gradient-to-br from-muted to-surface rounded-2xl flex items-center justify-center mb-3 shadow-md border border-border">
            {profilePic ? (
              <img src={profilePic} alt="Profile" className="w-full h-full object-cover rounded-2xl" />
            ) : (
              <User className="text-muted-foreground" size={28} />
            )}
          </div>
          <h3 className="text-xl font-bold tracking-tight text-foreground truncate max-w-[250px]">{user.email}</h3>
          <p className="text-sm text-muted-foreground mt-1">Gerencie acessos e informações</p>
        </div>
      }
    >
      <div className="flex gap-2 mb-6 bg-muted p-1 rounded-xl">
        <button 
          onClick={() => setActiveTab('permissions')} 
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'permissions' ? 'bg-surface text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <ShieldCheck size={16} />
          Permissões
        </button>
        <button 
          onClick={() => setActiveTab('profile')} 
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'profile' ? 'bg-surface text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <Settings size={16} />
          Perfil
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'permissions' ? (
            <div className="bg-muted/30 p-4 rounded-2xl border border-border">
              <PermissionSelector
                userId={user.id}
                branches={branches}
                companies={companies}
                permissions={permissionsMap}
                onPermissionChange={onPermissionChange}
                useCards={true}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-6 p-4">
              <div className="relative group">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-muted flex items-center justify-center border-4 border-surface shadow-xl">
                  {profilePic ? (
                    <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User size={48} className="text-muted-foreground/40" />
                  )}
                </div>
                <label className="absolute bottom-0 right-0 p-3 bg-primary text-black rounded-full cursor-pointer hover:bg-primary/80 transition-colors shadow-lg shadow-primary/30 group-hover:scale-110">
                  <Camera size={20} />
                  <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*" />
                </label>
              </div>
              <p className="text-sm text-muted-foreground font-medium">Toque na câmera para alterar a foto</p>

              <div className="w-full space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Permissão do Usuário</label>
                <select 
                  value={role} 
                  onChange={(e) => handleRoleChange(e.target.value)}
                  disabled={isMasterOwner}
                  className="w-full p-3 bg-surface border border-border rounded-xl text-sm font-bold text-foreground focus:ring-2 focus:ring-primary outline-none"
                >
                  <option value="user">Usuário Comum</option>
                  <option value="admin">Administrador</option>
                </select>
                {isMasterOwner && <p className="text-[10px] text-amber-500">Este usuário é o DONO MASTER e não pode ter sua função alterada.</p>}
              </div>

              {onDeleteUser && (
                <div className="w-full pt-8 mt-4 border-t border-border">
                  <button 
                    onClick={() => onDeleteUser(user.id)}
                    className="w-full flex items-center justify-center gap-2 p-4 text-rose-600 bg-rose-500/10 hover:bg-rose-500/20 rounded-2xl transition-colors font-bold text-sm border border-rose-500/20"
                  >
                    <Trash2 size={18} />
                    Excluir Usuário Permanentemente
                  </button>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </Modal>
  );
};
