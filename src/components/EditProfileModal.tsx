import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, avatarUrl: string) => void;
  currentName: string;
  currentAvatar: string;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentName,
  currentAvatar,
}) => {
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName(currentName || '');
      setAvatarUrl(currentAvatar || '');
    }
  }, [isOpen, currentName, currentAvatar]);

  const handleSave = () => {
    onSave(name, avatarUrl);
    onClose();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Editar Perfil"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={handleSave} className="btn-primary">Salvar</button>
        </>
      }
    >
      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 dark:text-sky-400/40 uppercase tracking-[0.2em]">Nome</label>
          <input 
            type="text" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-slate-50 dark:bg-sky-950/20 border border-slate-200 dark:border-sky-500/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all text-slate-800 dark:text-white"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 dark:text-sky-400/40 uppercase tracking-[0.2em]">Foto de Perfil</label>
          <div className="flex items-center gap-4">
            <img src={avatarUrl || 'https://placehold.co/128'} alt="Avatar" className="w-16 h-16 rounded-full object-cover bg-slate-200 dark:bg-sky-950/30 border border-slate-300 dark:border-sky-500/10 shadow-lg" />
            <input 
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-black file:uppercase file:tracking-widest file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};
