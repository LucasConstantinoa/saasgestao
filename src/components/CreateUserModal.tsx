import React, { useState } from 'react';
import { Modal } from '@/components/Modal';
import { Branch, Company } from '@/types';
import { Mail, Lock, UserPlus, ShieldCheck, Eye, EyeOff, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { PermissionSelector } from '@/components/PermissionSelector';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  branches: Branch[];
  companies: Company[];
  onCreateUser: (email: string, password: string, permissions: any) => Promise<void>;
}

export const CreateUserModal = ({ isOpen, onClose, branches, companies, onCreateUser }: Props) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [permissions, setPermissions] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handlePermissionChange = (user_id: string, branch_id: number, level: string, granular?: any) => {
    setPermissions((prev: any) => ({
      ...prev,
      [branch_id]: { level, granular }
    }));
  };

  const permissionCount = Object.values(permissions).filter((p: any) => p.level && p.level !== 'none').length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      alert('Por favor, preencha o email e a senha.');
      return;
    }
    setLoading(true);
    await onCreateUser(email, password, permissions);
    setLoading(false);
    onClose();
    setEmail('');
    setPassword('');
    setPermissions({});
    setStep(1);
  };

  const handleClose = () => {
    onClose();
    setStep(1);
  };

  const canProceed = email.length > 0 && password.length >= 6;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      size="md"
      title={
        <div className="flex items-center gap-3 w-full">
          <motion.div 
            initial={{ scale: 0.5, opacity: 0, rotate: -20 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="w-11 h-11 bg-gradient-to-br from-primary/20 to-violet-500/10 rounded-xl flex items-center justify-center border border-primary/15 shrink-0"
          >
            <UserPlus className="text-primary" size={20} />
          </motion.div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold tracking-tight text-foreground">Novo Colaborador</h3>
            <p className="text-[11px] text-muted-foreground font-medium">
              {step === 1 ? 'Defina as credenciais de acesso' : 'Configure as permissões'}
            </p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className={cn(
              "w-8 h-1.5 rounded-full transition-all duration-300",
              step >= 1 ? "bg-primary" : "bg-muted"
            )} />
            <div className={cn(
              "w-8 h-1.5 rounded-full transition-all duration-300",
              step >= 2 ? "bg-primary" : "bg-muted"
            )} />
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5 p-0">
        
        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="space-y-5"
            >
              {/* Email field */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] ml-1 flex items-center gap-1.5">
                  <Mail size={11} className="text-primary" />
                  E-mail
                </label>
                <div className={cn(
                  "relative rounded-xl border-2 transition-all duration-300 overflow-hidden",
                  focusedField === 'email'
                    ? "border-primary/60 shadow-[0_0_0_3px_rgba(var(--primary-rgb),0.08)]"
                    : "border-border/60 hover:border-border"
                )}>
                  <input 
                    type="email" 
                    placeholder="colaborador@empresa.com"
                    value={email} 
                    onChange={e => setEmail(e.target.value)}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    className="w-full px-4 py-3.5 bg-transparent outline-none text-foreground placeholder:text-muted-foreground/30 text-sm font-medium" 
                    required 
                  />
                </div>
              </div>

              {/* Password field */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] ml-1 flex items-center gap-1.5">
                  <Lock size={11} className="text-primary" />
                  Senha
                </label>
                <div className={cn(
                  "relative rounded-xl border-2 transition-all duration-300 overflow-hidden",
                  focusedField === 'password'
                    ? "border-primary/60 shadow-[0_0_0_3px_rgba(var(--primary-rgb),0.08)]"
                    : "border-border/60 hover:border-border"
                )}>
                  <input 
                    type={showPassword ? "text" : "password"}
                    placeholder="Mínimo 6 caracteres"
                    value={password} 
                    onChange={e => setPassword(e.target.value)}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    className="w-full px-4 py-3.5 pr-12 bg-transparent outline-none text-foreground placeholder:text-muted-foreground/30 text-sm font-medium" 
                    required 
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground transition-colors p-1"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {/* Password strength */}
                {password.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="flex items-center gap-2 ml-1"
                  >
                    <div className="flex gap-1 flex-1">
                      {[1, 2, 3, 4].map(i => (
                        <div
                          key={i}
                          className={cn(
                            "h-1 flex-1 rounded-full transition-all duration-300",
                            password.length >= i * 2
                              ? password.length >= 8 ? "bg-emerald-500" : password.length >= 6 ? "bg-amber-500" : "bg-rose-500"
                              : "bg-muted"
                          )}
                        />
                      ))}
                    </div>
                    <span className={cn(
                      "text-[9px] font-semibold",
                      password.length >= 8 ? "text-emerald-500" : password.length >= 6 ? "text-amber-500" : "text-rose-500"
                    )}>
                      {password.length >= 8 ? "Forte" : password.length >= 6 ? "Médio" : "Fraco"}
                    </span>
                  </motion.div>
                )}
              </div>

              {/* Continue button */}
              <motion.button
                type="button"
                onClick={() => canProceed && setStep(2)}
                disabled={!canProceed}
                whileHover={canProceed ? { scale: 1.01 } : {}}
                whileTap={canProceed ? { scale: 0.98 } : {}}
                className={cn(
                  "w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all relative overflow-hidden group",
                  canProceed
                    ? "bg-gradient-to-r from-primary to-violet-500 text-white shadow-[0_6px_20px_rgba(var(--primary-rgb),0.25)] hover:shadow-[0_8px_28px_rgba(var(--primary-rgb),0.35)]"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
              >
                {canProceed && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                )}
                <span>Configurar Permissões</span>
                <ArrowRight size={16} className={cn("transition-transform", canProceed && "group-hover:translate-x-1")} />
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              {/* Back link */}
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-[11px] text-primary font-semibold hover:underline flex items-center gap-1 mb-2"
              >
                <ArrowRight size={12} className="rotate-180" />
                Voltar às credenciais
              </button>

              {/* Credential summary */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Mail size={14} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{email}</p>
                  <p className="text-[10px] text-muted-foreground">Novo colaborador</p>
                </div>
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
              </div>

              {/* Permissions */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="text-primary" size={15} />
                    <h3 className="text-[11px] font-bold text-foreground uppercase tracking-[0.1em]">Permissões</h3>
                  </div>
                  {permissionCount > 0 && (
                    <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      {permissionCount} {permissionCount === 1 ? 'filial' : 'filiais'}
                    </span>
                  )}
                </div>
                <div className="rounded-xl border border-border/30 overflow-hidden">
                  <div className="max-h-[40vh] overflow-y-auto p-3 custom-scrollbar">
                    <PermissionSelector
                      userId="new-user"
                      branches={branches}
                      companies={companies}
                      permissions={permissions}
                      onPermissionChange={handlePermissionChange}
                      useCards={true}
                    />
                  </div>
                </div>
              </div>

              {/* Submit */}
              <motion.button 
                whileHover={{ scale: 1.01, boxShadow: "0 8px 30px rgba(var(--primary-rgb), 0.3)" }}
                whileTap={{ scale: 0.98 }}
                type="submit" 
                className="w-full py-3.5 bg-gradient-to-r from-primary to-violet-500 text-white font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_6px_20px_rgba(var(--primary-rgb),0.25)] relative overflow-hidden group"
                disabled={loading}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>Criar Colaborador</span>
                  </>
                )}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </Modal>
  );
};
