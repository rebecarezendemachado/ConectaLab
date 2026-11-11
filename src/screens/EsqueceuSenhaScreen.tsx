import React, { useState } from 'react';
import { Logo } from '../components/Logo';
import { WaveDna } from '../components/WaveDna';
import { Mail, EyeOff, Eye, ArrowLeft, CheckCircle2 } from 'lucide-react';

interface EsqueceuSenhaScreenProps {
  onNavigate: (screen: 'index' | 'login' | 'cadastro' | 'esqueceu-senha' | 'dashboard') => void;
}

export const EsqueceuSenhaScreen: React.FC<EsqueceuSenhaScreenProps> = ({ onNavigate }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmeSenha, setConfirmeSenha] = useState('');
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (novaSenha.length < 6) {
      setErro('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (novaSenha !== confirmeSenha) {
      setErro('A confirmação da nova senha não confere.');
      return;
    }

    setSucesso(true);
    setTimeout(() => {
      onNavigate('login');
    }, 1800);
  };

  return (
    <div className="w-full min-h-screen flex flex-col lg:flex-row bg-white overflow-x-hidden font-sans">
      {/* Botão voltar flutuante */}
      <button
        onClick={() => onNavigate('login')}
        className="absolute top-4 left-4 z-30 flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white text-xs font-semibold backdrop-blur-md transition active:scale-95"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Voltar ao Login</span>
      </button>

      {/* LADO ESQUERDO: Formulário de Redefinição */}
      <div className="w-full lg:w-1/2 min-h-screen flex items-center justify-center pt-16 pb-8 px-5 sm:p-10 lg:p-14 z-20 bg-white">
        <div className="w-full max-w-[360px] flex flex-col items-center">
          {/* Logo Matéria Reativa */}
          <div
            className="mb-8 w-full flex items-center justify-center cursor-pointer transition hover:opacity-90 text-center"
            onClick={() => onNavigate('index')}
            title="Voltar ao início"
          >
            <Logo width={210} variant="dark" className="mx-auto" />
          </div>

          {sucesso ? (
            <div className="w-full bg-green-50 border border-green-200 rounded-xl p-6 text-center space-y-3 animate-in fade-in zoom-in-95">
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-green-900">Senha Redefinida!</h3>
              <p className="text-xs text-green-700">
                Sua senha foi alterada com sucesso no sistema do laboratório. Redirecionando para o login...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="w-full space-y-4">
              {erro && (
                <div className="p-2.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg text-center">
                  {erro}
                </div>
              )}

              {/* Campo E-mail */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-zinc-800">
                  E-mail
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="exemplo@escola.com"
                    className="w-full h-10 px-3.5 pr-10 text-sm text-zinc-800 rounded-lg border border-zinc-300 focus:outline-none focus:border-[#2F80ED] focus:ring-1 focus:ring-[#2F80ED] transition shadow-xs placeholder:text-zinc-400"
                  />
                  <Mail className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                </div>
              </div>

              {/* Campo Nova Senha */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-zinc-800">
                  Nova senha
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-10 px-3.5 pr-10 text-sm text-zinc-800 rounded-lg border border-zinc-300 focus:outline-none focus:border-[#2F80ED] focus:ring-1 focus:ring-[#2F80ED] transition shadow-xs placeholder:text-zinc-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition p-0.5"
                  >
                    {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Campo Confirme a Senha */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-zinc-800">
                  Confirme a senha
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmeSenha}
                    onChange={(e) => setConfirmeSenha(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-10 px-3.5 pr-10 text-sm text-zinc-800 rounded-lg border border-zinc-300 focus:outline-none focus:border-[#2F80ED] focus:ring-1 focus:ring-[#2F80ED] transition shadow-xs placeholder:text-zinc-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition p-0.5"
                  >
                    {showConfirmPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Botão Entrar / Redefinir Azul Vibrante (#2F80ED) */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full h-10 rounded-lg bg-[#2F80ED] hover:bg-[#256fd0] active:scale-[0.99] text-white text-sm font-semibold tracking-wide shadow-md shadow-blue-500/20 transition cursor-pointer"
                >
                  Entrar
                </button>
              </div>

              {/* Link de retorno */}
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => onNavigate('login')}
                  className="text-xs text-[#2F80ED] hover:text-blue-700 hover:underline font-medium transition"
                >
                  Lembrou da senha? Entrar
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* LADO DIREITO: Ilustração de DNA no Esqueceu Senha (Figma) */}
      <div className="hidden lg:block lg:w-1/2 min-h-screen relative overflow-hidden bg-black">
        <WaveDna dnaPosition="right" />
      </div>
    </div>
  );
};
