import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Facebook, CheckCircle2, XCircle, Loader2, Zap, Shield } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ParticleField } from '@/components/ParticleField';
import axios from 'axios';

type Status = 'loading' | 'validating' | 'redirecting' | 'processing' | 'success' | 'error' | 'expired';

// Helper to generate appsecret_proof for the Graph API security requirement
async function generateAppSecretProof(accessToken: string, appSecret: string) {
  const enc = new TextEncoder();
  const key = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await window.crypto.subtle.sign(
    "HMAC",
    key,
    enc.encode(accessToken)
  );
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const FacebookCallback: React.FC = () => {
  const { token: paramToken } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  
  // Extract token from either URL path or OAuth state parameter.
  const token = paramToken || searchParams.get('state') || '';

  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('Verificando link...');
  const [branchName, setBranchName] = useState('');
  const [accountsFound, setAccountsFound] = useState(0);
  const [userName, setUserName] = useState('');

  const facebookAppId = import.meta.env.VITE_FACEBOOK_APP_ID || '1477005707153295';
  const facebookAppSecret = import.meta.env.VITE_FACEBOOK_APP_SECRET || '';
  
  // LOG: Copy this URL to Meta Console -> 'Valid OAuth Redirect URIs'
  useEffect(() => {
    console.log('🔗 [OAUTH] Redirect URI being used:', `${window.location.origin}/facebook-callback`);
    if (!facebookAppSecret) {
      console.error('❌ [CONFIG] VITE_FACEBOOK_APP_SECRET is missing! Add it to .env.local and Vercel settings.');
    }
  }, [facebookAppSecret]);
  
  // The redirect URI must be a singular fixed string to match Facebook App configuration exactly
  const redirectUri = `${window.location.origin}/facebook-callback`;

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      setStatus('error');
      setMessage('Login no Facebook foi cancelado ou negado.');
      return;
    }

    if (code) {
      // Step 2: We got the code back from Facebook
      processOAuthCode(code);
    } else {
      // Step 1: Validate the invite link and redirect to Facebook
      validateAndRedirect();
    }
  }, [token, searchParams]);

  const validateAndRedirect = async () => {
    if (!token) {
      setStatus('error');
      setMessage('Link inválido.');
      return;
    }

    setStatus('validating');
    setMessage('Validando link de convite...');

    try {
      // Check if the invite link exists and is valid
      const { data: invite, error } = await supabase
        .from('facebook_invite_links')
        .select('*, branches(name)')
        .eq('token', token)
        .is('used_at', null)
        .single();

      if (error || !invite) {
        setStatus('expired');
        setMessage('Este link já foi utilizado ou não existe.');
        return;
      }

      // Check expiry
      if (new Date(invite.expires_at) < new Date()) {
        setStatus('expired');
        setMessage('Este link expirou. Solicite um novo link ao administrador.');
        return;
      }

      setBranchName((invite as any).branches?.name || 'Filial');

      // Redirect to Facebook OAuth
      setStatus('redirecting');
      setMessage('Redirecionando para o Facebook...');

      const scope = 'ads_management,ads_read,business_management';
      const authUrl = `https://www.facebook.com/v22.0/dialog/oauth?client_id=${facebookAppId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&response_type=code&state=${token}`;

      setTimeout(() => {
        window.location.href = authUrl;
      }, 1500);
    } catch (err) {
      console.error('Validation error:', err);
      setStatus('error');
      setMessage('Erro ao validar o link. Tente novamente.');
    }
  };

  const processOAuthCode = async (code: string) => {
    setStatus('processing');
    setMessage('Conectando com o Facebook...');

    try {
      if (!facebookAppSecret) {
        throw new Error('CONFIG_ERROR: Meta App Secret is not defined in environment variables.');
      }

      // 1. Exchange code for short-lived token
      const tokenResponse = await axios.post('https://graph.facebook.com/v22.0/oauth/access_token', null, {
        params: {
          client_id: facebookAppId,
          redirect_uri: redirectUri,
          client_secret: facebookAppSecret,
          code
        }
      });

      const shortToken = tokenResponse.data.access_token;

      // 2. Exchange for long-lived token
      setMessage('Gerando token de longa duração...');
      const longTokenResponse = await axios.get('https://graph.facebook.com/v22.0/oauth/access_token', {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: facebookAppId,
          client_secret: facebookAppSecret,
          fb_exchange_token: shortToken
        }
      });

      const longToken = longTokenResponse.data.access_token;
      const expiresIn = longTokenResponse.data.expires_in; // seconds

      // 2.5 Generate appsecret_proof (required by some Meta App settings)
      const appSecretProof = await generateAppSecretProof(longToken, facebookAppSecret);

      // 3. Get user profile
      setMessage('Buscando perfil do Facebook...');
      const profileResponse = await axios.get('https://graph.facebook.com/v22.0/me', {
        params: { 
          fields: 'id,name,email,picture.width(200)', 
          access_token: longToken,
          appsecret_proof: appSecretProof
        }
      });

      const profile = profileResponse.data;
      setUserName(profile.name);

      // 4. Fetch ad accounts with REAL balances
      setMessage('Buscando contas de anúncios...');
      const adAccountsResponse = await axios.get('https://graph.facebook.com/v22.0/me/adaccounts', {
        params: {
          access_token: longToken,
          appsecret_proof: appSecretProof,
          fields: 'id,name,account_id,currency,account_status,balance,amount_spent',
          limit: 500
        }
      });

      const adAccounts = adAccountsResponse.data.data || [];
      setAccountsFound(adAccounts.length);

      // 5. Get invite link info
      const { data: invite } = await supabase
        .from('facebook_invite_links')
        .select('*')
        .eq('token', token)
        .single();

      if (!invite) {
        setStatus('error');
        setMessage('Link de convite não encontrado.');
        return;
      }

      const branchId = invite.branch_id;

      // 6. Save connection to Supabase
      setMessage('Salvando conexão...');
      const expiresAt = expiresIn
        ? new Date(Date.now() + expiresIn * 1000).toISOString()
        : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(); // 60 days default

      const { data: connection, error: connError } = await supabase
        .from('facebook_connections')
        .upsert({
          branch_id: branchId,
          facebook_user_id: profile.id,
          facebook_user_name: profile.name,
          facebook_user_picture: profile.picture?.data?.url || null,
          facebook_email: profile.email || null,
          access_token: longToken,
          token_expires_at: expiresAt,
          connected_by: invite.created_by,
          is_active: true,
          updated_at: new Date().toISOString()
        }, { onConflict: 'branch_id,facebook_user_id' })
        .select()
        .single();

      if (connError) {
        console.error('Connection save error:', connError);
        setStatus('error');
        setMessage('Erro ao salvar a conexão.');
        return;
      }

      // 7. Save ad accounts with REAL balances from FB API
      if (adAccounts.length > 0 && connection) {
        const accountRows = adAccounts.map((acc: any) => ({
          connection_id: connection.id,
          branch_id: branchId, // Vinculo original que convidou
          account_id: acc.id,
          account_name: acc.name,
          currency: acc.currency || 'BRL',
          status: acc.account_status === 1 ? 'active' : 'inactive',
          balance: acc.balance ? (parseInt(acc.balance) / 100) : 0,
          amount_spent: acc.amount_spent ? (parseInt(acc.amount_spent) / 100) : 0
        }));

        await supabase.from('facebook_ad_accounts').upsert(accountRows, {
          onConflict: 'connection_id,account_id'
        });
      }

      // We DO NOT auto-assign the first ad account directly to the Branch anymore.
      // The admin will select which Ad Account goes to which Branch in the Configuration Menu branch selector!

      // 9. Mark invite as used
      await supabase.from('facebook_invite_links').update({
        used_at: new Date().toISOString()
      }).eq('token', token);

      // 10. Log audit
      await supabase.from('audit_log').insert({
        action: 'Facebook Conectado',
        detail: `${profile.name} conectou Facebook à filial. ${adAccounts.length} contas encontradas.`,
        type: 'success'
      });

      setStatus('success');
      setMessage('Conexão realizada com sucesso!');
    } catch (err: any) {
      console.error('OAuth processing error:', err);
      setStatus('error');
      const errorMsg = err.response?.data?.error?.message || err.message;
      if (errorMsg === 'Error validating client secret.') {
        setMessage('Erro: "Secret" do Meta inválido ou ausente. Adicione VITE_FACEBOOK_APP_SECRET no Vercel.');
      } else if (err.message?.includes('CONFIG_ERROR')) {
        setMessage('Configuração Pendente: Chave VITE_FACEBOOK_APP_SECRET não encontrada.');
      } else {
        setMessage(errorMsg || 'Erro ao processar o login do Facebook.');
      }
    }
  };

  const statusConfig = {
    loading: { icon: Loader2, color: 'text-primary', spin: true },
    validating: { icon: Shield, color: 'text-primary', spin: false },
    redirecting: { icon: Facebook, color: 'text-blue-500', spin: false },
    processing: { icon: Loader2, color: 'text-primary', spin: true },
    success: { icon: CheckCircle2, color: 'text-emerald-500', spin: false },
    error: { icon: XCircle, color: 'text-rose-500', spin: false },
    expired: { icon: XCircle, color: 'text-amber-500', spin: false },
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <div className="min-h-screen bg-[#030308] flex items-center justify-center relative overflow-hidden">
      {/* Particles */}
      <div className="absolute inset-0 z-0">
        <ParticleField particleCount={40} color="0, 212, 255" speed={0.15} interactive={false} />
      </div>

      {/* Ambient glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-gradient-radial" 
        style={{ background: 'radial-gradient(circle, rgba(0, 212, 255, 0.06) 0%, transparent 70%)' }} />
      <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(139, 92, 246, 0.04) 0%, transparent 70%)' }} />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="bg-white/[0.03] backdrop-blur-3xl border border-white/[0.06] rounded-[2rem] p-10 text-center shadow-[0_8px_32px_rgba(0,0,0,0.8)]">
          {/* Top accent */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

          {/* Brand */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/5 border border-primary/10 mb-6"
          >
            <Zap className="h-3 w-3 fill-primary text-primary" />
            <span className="text-[10px] text-primary/60 uppercase tracking-[0.2em] font-bold">TrafficFlow Ultimate</span>
          </motion.div>

          {/* Status Icon */}
          <motion.div
            key={status}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 400 }}
            className="mb-6"
          >
            <div className={`w-20 h-20 mx-auto rounded-full bg-gradient-to-br ${
              status === 'success' ? 'from-emerald-500/20 to-emerald-500/5' :
              status === 'error' || status === 'expired' ? 'from-rose-500/20 to-rose-500/5' :
              'from-primary/20 to-primary/5'
            } flex items-center justify-center border border-white/5`}>
              <StatusIcon size={36} className={`${config.color} ${config.spin ? 'animate-spin' : ''}`} />
            </div>
          </motion.div>

          {/* Branch name */}
          {branchName && status !== 'error' && status !== 'expired' && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[11px] text-white/30 uppercase tracking-[0.15em] font-semibold mb-2"
            >
              Filial: {branchName}
            </motion.p>
          )}

          {/* Title based on status */}
          <motion.h2
            key={`title-${status}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xl font-bold text-white mb-2"
          >
            {status === 'success' ? 'Conectado!' :
             status === 'error' ? 'Erro na Conexão' :
             status === 'expired' ? 'Link Expirado' :
             'Conectar Facebook'}
          </motion.h2>

          {/* Message */}
          <motion.p
            key={`msg-${message}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-white/40 mb-6"
          >
            {message}
          </motion.p>

          {/* Success details */}
          {status === 'success' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-3"
            >
              <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                <p className="text-emerald-400 font-semibold text-sm">{userName}</p>
                <p className="text-[11px] text-emerald-400/60 mt-1">
                  {accountsFound} {accountsFound === 1 ? 'conta de anúncio encontrada' : 'contas de anúncios encontradas'}
                </p>
              </div>
              <p className="text-[11px] text-white/20">
                Você pode fechar esta página. O administrador já tem acesso às suas contas.
              </p>
            </motion.div>
          )}

          {/* Processing animation */}
          {(status === 'processing' || status === 'validating' || status === 'loading') && (
            <div className="flex justify-center gap-1 mt-2">
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-primary/40"
                  animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                  transition={{ duration: 1.2, delay: i * 0.2, repeat: Infinity }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-[9px] text-white/10 mt-6 uppercase tracking-[0.15em]">
          © 2026 TrafficFlow • Conexão segura via OAuth 2.0
        </p>
      </motion.div>
    </div>
  );
};
