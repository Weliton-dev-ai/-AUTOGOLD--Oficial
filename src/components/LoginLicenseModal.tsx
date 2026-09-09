import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { ShieldCheck, Key, LogIn, Sparkles, CheckCircle2, AlertCircle, Wrench, Car } from 'lucide-react';
import { UserAccount } from '../types';
import { saveCurrentUser, validateLifetimeKey } from '../utils/storage';

interface LoginLicenseModalProps {
  currentUser: UserAccount | null;
  onLoginSuccess: (user: UserAccount) => void;
}

export const LoginLicenseModal: React.FC<LoginLicenseModalProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<'login' | 'activate'>('login');
  const [email, setEmail] = useState('oficina@autogold.com.br');
  const [password, setPassword] = useState('123456');
  const [activationKey, setActivationKey] = useState('GOLD-2026-PRO');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Por favor, informe seu e-mail e senha de acesso.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const user: UserAccount = {
        email: email.trim().toLowerCase(),
        nome: email.split('@')[0] || 'Oficina AutoGold',
        licencaAtiva: true,
        chaveAtivacao: 'GOLD-2026-PRO',
        dataAtivacao: new Date().toISOString(),
      };
      saveCurrentUser(user);
      onLoginSuccess(user);
    }, 400);
  };

  const handleActivateLicense = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email.trim()) {
      setErrorMsg('Informe o e-mail que ficará vinculado à Licença Vitalícia.');
      return;
    }

    const validation = validateLifetimeKey(activationKey, email);

    if (!validation.valid) {
      setErrorMsg(validation.message);
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSuccessMsg('Licença Vitalícia Ativa! Acesso liberado permanentemente neste dispositivo.');
      
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#0066FF', '#00D2FF', '#FFD700', '#FFFFFF'],
      });

      setTimeout(() => {
        const user: UserAccount = {
          email: email.trim().toLowerCase(),
          nome: email.split('@')[0] || 'Oficina Master',
          licencaAtiva: true,
          chaveAtivacao: activationKey.toUpperCase().trim(),
          dataAtivacao: new Date().toISOString(),
        };
        saveCurrentUser(user);
        onLoginSuccess(user);
      }, 1000);
    }, 600);
  };

  return (
    <div id="modal-login-licenca" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0A0C]/90 backdrop-blur-md">
      <div className="w-full max-w-md bg-[#121E2B] border border-[#1E3349] rounded-2xl shadow-2xl overflow-hidden text-slate-100 animate-in fade-in zoom-in duration-200">
        {/* Top Metallic Banner */}
        <div className="bg-gradient-to-r from-[#0F1B27] via-[#16293D] to-[#0F1B27] p-6 text-center border-b border-[#1E3349] relative">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0066FF] to-[#0040A8] text-white shadow-lg shadow-blue-600/30 mb-3 border border-blue-400/40">
            <Wrench className="w-8 h-8 text-white stroke-[2.2]" />
          </div>
          
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl font-black tracking-wider text-white">AUTO</span>
            <span className="text-2xl font-black tracking-wider bg-gradient-to-r from-[#FFD700] via-[#FFA500] to-[#FFB700] bg-clip-text text-transparent">
              GOLD
            </span>
          </div>
          <p className="text-xs uppercase tracking-widest text-blue-400/90 font-semibold mt-1">
            Gestão de Funilaria & Pintura
          </p>

          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0A0A0C]/60 border border-blue-500/30 text-xs text-blue-300">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>Sistema Profissional para Oficinas</span>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-800/80 flex items-center gap-2.5 text-red-200 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/80 flex items-center gap-2.5 text-emerald-200 text-xs font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  E-mail de Acesso
                </label>
                <input
                  id="input-login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ex: contato@suaoficina.com.br"
                  className="w-full px-4 py-3 bg-[#0A0A0C] border border-[#223952] rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Senha
                </label>
                <input
                  id="input-login-senha"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-[#0A0A0C] border border-[#223952] rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] transition-all"
                />
              </div>

              <button
                id="btn-entrar-app"
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-[#0066FF] to-[#0052CC] hover:from-[#1A73E8] hover:to-[#0066FF] text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 text-sm active:scale-[0.99] cursor-pointer"
              >
                {loading ? (
                  <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Entrar no Aplicativo</span>
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <button
                  id="btn-abrir-ativar-licenca"
                  type="button"
                  onClick={() => {
                    setErrorMsg('');
                    setSuccessMsg('');
                    setMode('activate');
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-semibold transition-colors cursor-pointer py-1"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Possui Chave de Ativação? Ativar Licença</span>
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleActivateLicense} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-[#0A0A0C]/80 border border-blue-500/20 text-xs text-slate-300 space-y-1">
                <p className="font-semibold text-blue-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Ativação Vitalícia AutoGold
                </p>
                <p className="text-slate-400 text-[11px]">
                  Insira o código de ativação fornecido na aquisição para liberar o uso ilimitado.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  E-mail do Proprietário / Oficina
                </label>
                <input
                  id="input-ativar-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="oficina@exemplo.com.br"
                  className="w-full px-4 py-3 bg-[#0A0A0C] border border-[#223952] rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Chave de Ativação Vitalícia
                </label>
                <div className="relative">
                  <input
                    id="input-chave-ativacao"
                    type="text"
                    required
                    value={activationKey}
                    onChange={(e) => setActivationKey(e.target.value.toUpperCase())}
                    placeholder="ex: GOLD-2026-PRO"
                    className="w-full pl-10 pr-4 py-3 bg-[#0A0A0C] border border-blue-500/40 rounded-xl text-yellow-400 font-mono font-bold tracking-wider placeholder-slate-600 text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                  />
                  <Key className="w-4 h-4 text-blue-400 absolute left-3.5 top-3.5" />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Chaves válidas: <span className="text-yellow-400 font-mono">GOLD-2026-PRO</span> ou <span className="text-yellow-400 font-mono">AUTOGOLD-VITALICIO</span>
                </p>
              </div>

              <button
                id="btn-validar-licenca"
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-700/30 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
              >
                {loading ? (
                  <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Validar & Ativar Licença Vitalícia</span>
                  </>
                )}
              </button>

              <button
                id="btn-voltar-login"
                type="button"
                onClick={() => {
                  setErrorMsg('');
                  setSuccessMsg('');
                  setMode('login');
                }}
                className="w-full py-2.5 px-4 bg-[#0A0A0C] hover:bg-[#162536] text-slate-400 hover:text-slate-200 border border-[#223952] rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                Voltar para Tela de Login
              </button>
            </form>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-[#0A0A0C]/90 border-t border-[#1E3349] flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <Car className="w-3.5 h-3.5 text-blue-400" /> AutoGold v2026
          </span>
          <span className="text-emerald-400 font-medium flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            Pronto para Produção
          </span>
        </div>
      </div>
    </div>
  );
};
