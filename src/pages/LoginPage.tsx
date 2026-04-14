import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Circle, Eye, EyeOff, ArrowRight, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { logAuditEvent } from '@/lib/audit';
import { ParticleField } from '@/components/ParticleField';

interface ElegantShapeProps {
  className?: string;
  delay?: number;
  width?: number;
  height?: number;
  rotate?: number;
  gradient?: string;
}

function ElegantShape({
  className,
  delay = 0,
  width = 400,
  height = 100,
  rotate = 0,
  gradient = "from-white/[0.08]",
}: ElegantShapeProps) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: -150,
        rotate: rotate - 15,
      }}
      animate={{
        opacity: 1,
        y: 0,
        rotate: rotate,
      }}
      transition={{
        duration: 2.4,
        delay,
        ease: [0.23, 0.86, 0.39, 0.96],
        opacity: { duration: 1.2 },
      }}
      className={cn("absolute", className)}
    >
      <motion.div
        animate={{
          y: [0, 15, 0],
        }}
        transition={{
          duration: 12,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
        style={{
          width,
          height,
        }}
        className="relative"
      >
        <div
          className={cn(
            "absolute inset-0 rounded-full",
            "bg-gradient-to-r to-transparent",
            gradient,
            "backdrop-blur-[2px] border-2 border-white/[0.1]",
            "shadow-[0_8px_32px_0_rgba(255,255,255,0.07)]",
            "after:absolute after:inset-0 after:rounded-full",
            "after:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.15),transparent_70%)]"
          )}
        />
      </motion.div>
    </motion.div>
  );
}

interface LoginProps {
  onLogin: () => void;
  theme: string;
}

export const Login = ({ onLogin, theme }: LoginProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      await logAuditEvent('Login', `Usuário ${email} realizou login com sucesso.`, 'success');
      onLogin();
    } catch (error: any) {
      await logAuditEvent('Tentativa de Login', `Falha no login para o e-mail: ${email}. Erro: ${error.message}`, 'error');
      setMessage({ type: 'error', text: error.message || 'Erro ao fazer login' });
    } finally {
      setLoading(false);
    }
  };

  const isDark = theme !== 'light' && theme !== 'light-gray';

  const fadeUpVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 1,
        delay: 0.5 + i * 0.15,
        ease: [0.25, 0.4, 0.25, 1] as any,
      },
    }),
  };

  return (
    <div className={cn(
      "relative min-h-screen w-full flex items-center justify-center overflow-hidden transition-all duration-500",
      isDark ? "bg-[#030308]" : "bg-slate-50"
    )}>
      {/* Particle Background */}
      <div className="absolute inset-0 z-0">
        <ParticleField
          particleCount={60}
          color={isDark ? "0, 212, 255" : "2, 132, 199"}
          maxDistance={150}
          speed={0.2}
          interactive={true}
        />
      </div>

      {/* Gradient Overlays */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-transparent to-violet-500/[0.04] blur-3xl z-[1]" />
      
      {/* Ambient top-left glow */}
      <motion.div 
        className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full z-[1]"
        style={{ background: `radial-gradient(circle, rgba(var(--primary-rgb), 0.08) 0%, transparent 70%)` }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Ambient bottom-right glow */}
      <motion.div 
        className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full z-[1]"
        style={{ background: `radial-gradient(circle, rgba(139, 92, 246, 0.06) 0%, transparent 70%)` }}
        animate={{ scale: [1.2, 1, 1.2], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      
      {/* Elegant Shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-[2]">
        <ElegantShape
          delay={0.3}
          width={600}
          height={140}
          rotate={12}
          gradient="from-primary/[0.12]"
          className="left-[-10%] md:left-[-5%] top-[15%] md:top-[20%]"
        />

        <ElegantShape
          delay={0.5}
          width={500}
          height={120}
          rotate={-15}
          gradient="from-rose-500/[0.1]"
          className="right-[-5%] md:right-[0%] top-[70%] md:top-[75%]"
        />

        <ElegantShape
          delay={0.4}
          width={300}
          height={80}
          rotate={-8}
          gradient="from-violet-500/[0.1]"
          className="left-[5%] md:left-[10%] bottom-[5%] md:bottom-[10%]"
        />

        <ElegantShape
          delay={0.6}
          width={200}
          height={60}
          rotate={20}
          gradient="from-amber-500/[0.1]"
          className="right-[15%] md:right-[20%] top-[10%] md:top-[15%]"
        />

        <ElegantShape
          delay={0.7}
          width={150}
          height={40}
          rotate={-25}
          gradient="from-cyan-500/[0.1]"
          className="left-[20%] md:left-[25%] top-[5%] md:top-[10%]"
        />
      </div>

      {/* Vignette overlay */}
      <div className={cn(
        "absolute inset-0 pointer-events-none z-[3]",
        isDark 
          ? "bg-gradient-to-t from-[#030308] via-transparent to-[#030308]/80" 
          : "bg-gradient-to-t from-slate-50/80 via-transparent to-slate-50/50"
      )} />

      {/* Login Card */}
      <motion.div 
        custom={0}
        variants={fadeUpVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full max-w-[440px] mx-4"
      >
        <div 
          className={cn(
            "w-full p-8 md:p-12 transition-all duration-500 relative overflow-hidden",
            isDark
              ? "bg-white/[0.03] backdrop-blur-3xl border border-white/[0.06] rounded-[2rem] shadow-[0_8px_32px_0_rgba(0,0,0,0.8)]" 
              : "bg-white/90 backdrop-blur-xl border border-slate-200 rounded-[2rem] shadow-2xl"
          )}
        >
          {/* Card inner glow */}
          {isDark && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          )}

          <div className="text-center mb-10">
            <motion.div
              custom={1}
              variants={fadeUpVariants}
              initial="hidden"
              animate="visible"
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/5 border border-primary/10 mb-6"
            >
              <Zap className="h-3 w-3 fill-primary text-primary" />
              <span className={cn(
                "text-[10px] uppercase tracking-[0.2em] font-bold",
                isDark ? "text-primary/60" : "text-primary/80"
              )}>
                TrafficFlow Ultimate
              </span>
            </motion.div>
            
            <motion.h2 
              custom={2}
              variants={fadeUpVariants}
              initial="hidden"
              animate="visible"
              className={cn(
                "text-4xl font-black tracking-tighter",
                isDark ? "text-white" : "text-slate-900"
              )}
            >
              Bem-vindo <span className="bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">de volta</span>
            </motion.h2>
            <motion.p 
              custom={3}
              variants={fadeUpVariants}
              initial="hidden"
              animate="visible"
              className={cn(
                "text-xs font-medium mt-3",
                isDark ? "text-white/30" : "text-slate-400"
              )}
            >
              Faça login para acessar sua plataforma
            </motion.p>
          </div>

          <motion.form 
            custom={4}
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
            onSubmit={handleLogin} 
            className="space-y-5"
          >
            {/* Email */}
            <div className="space-y-2">
              <label className={cn(
                "text-[10px] font-bold uppercase tracking-[0.15em] ml-1",
                isDark ? "text-white/40" : "text-slate-400"
              )}>Email</label>
              <div className={cn(
                "relative rounded-xl border-2 transition-all duration-300",
                focusedField === 'email' 
                  ? "border-primary shadow-[0_0_0_3px_rgba(var(--primary-rgb),0.1)]" 
                  : isDark ? "border-white/8" : "border-slate-200"
              )}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  required
                  placeholder="seu@email.com"
                  className={cn(
                    "w-full px-5 py-4 rounded-xl border-none outline-none transition-all font-medium bg-transparent",
                    isDark ? "text-white placeholder:text-white/20" : "text-slate-900 placeholder:text-slate-300"
                  )}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className={cn(
                "text-[10px] font-bold uppercase tracking-[0.15em] ml-1",
                isDark ? "text-white/40" : "text-slate-400"
              )}>Senha</label>
              <div className={cn(
                "relative rounded-xl border-2 transition-all duration-300",
                focusedField === 'password' 
                  ? "border-primary shadow-[0_0_0_3px_rgba(var(--primary-rgb),0.1)]" 
                  : isDark ? "border-white/8" : "border-slate-200"
              )}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  required
                  placeholder="••••••••"
                  className={cn(
                    "w-full px-5 py-4 pr-12 rounded-xl border-none outline-none transition-all font-medium bg-transparent",
                    isDark ? "text-white placeholder:text-white/20" : "text-slate-900 placeholder:text-slate-300"
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={cn(
                    "absolute right-4 top-1/2 -translate-y-1/2 transition-colors",
                    isDark ? "text-white/30 hover:text-white/60" : "text-slate-300 hover:text-slate-500"
                  )}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            
            {/* Error message */}
            <AnimatePresence>
              {message && (
                <motion.div 
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  className={cn(
                    "p-4 rounded-xl text-xs font-bold border overflow-hidden",
                    message.type === 'success' 
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" 
                      : "bg-rose-500/10 border-rose-500/20 text-rose-500"
                  )}
                >
                  {message.text}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <div className="pt-2">
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "w-full py-4 rounded-xl text-sm font-bold uppercase tracking-[0.15em] flex items-center justify-center gap-3 group disabled:opacity-70 transition-all relative overflow-hidden",
                  "bg-gradient-to-r from-primary via-primary to-violet-500 text-white",
                  "shadow-[0_8px_30px_rgba(var(--primary-rgb),0.35)]",
                  "hover:shadow-[0_12px_40px_rgba(var(--primary-rgb),0.5)]"
                )}
              >
                {/* Shimmer overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
                
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Autenticando...</span>
                  </>
                ) : (
                  <>
                    <span>Entrar no Sistema</span>
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </motion.button>
            </div>
          </motion.form>

          <motion.div 
            custom={5}
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
            className="mt-10 text-center"
          >
            <p className={cn(
              "text-[10px] font-medium tracking-[0.15em]",
              isDark ? "text-white/15" : "text-slate-300"
            )}>
              © 2026 TRAFFICFLOW • TODOS OS DIREITOS RESERVADOS
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};
