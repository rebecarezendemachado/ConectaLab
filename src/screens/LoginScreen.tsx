import React, { useState } from 'react';
import { Logo } from '../components/Logo';
import { WaveDna } from '../components/WaveDna';
import { Mail, EyeOff, Eye, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { dataService } from '../services/db/dataService';

interface LoginScreenProps {
  userType: 'aluno' | 'professor';
  onNavigate: (screen: 'index' | 'login' | 'cadastro' | 'esqueceu-senha' | 'dashboard') => void;
  onToggleUserType?: (perfil: 'aluno' | 'professor') => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ userType, onNavigate, onToggleUserType }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [lembrar, setLembrar] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (!email.trim() || !senha) {
      setErro('Por favor, informe seu e-mail e sua senha.');
      return;
    }

    setCarregando(true);

    try {
      const usuarios = await dataService.usuarios.listar();

      if (usuarios.length === 0) {
        setErro('Nenhum usuário cadastrado. Crie sua conta em "Cadastre-se".');
        setCarregando(false);
        return;
      }

      const usuarioEncontrado = usuarios.find(
        (u) =>
          u.email.trim().toLowerCase() === email.trim().toLowerCase() &&
          u.senha === senha
      );

      if (!usuarioEncontrado) {
        setErro('E-mail ou senha incorretos.');
        setCarregando(false);
        return;
      }

      // Validação estrita: se selecionou login como Aluno, aceita SOMENTE conta de Aluno
      if (usuarioEncontrado.tipoPerfil !== userType) {
        if (userType === 'aluno') {
          setErro(
            'Acesso restrito: esta conta pertence a um Professor. Para acessá-la, volte para o início e escolha "Sou Professor".'
          );
        } else {
          setErro(
            'Acesso restrito: esta conta pertence a um Aluno. Para acessá-la, volte para o início e escolha "Sou Aluno".'
          );
        }
        setCarregando(false);
        return;
      }

      // Usuário autenticado com sucesso!
      dataService.salvarSessao(usuarioEncontrado);

      if (lembrar) {
        localStorage.setItem('materia_reativa_email', email);
      } else {
        localStorage.removeItem('materia_reativa_email');
      }

      setTimeout(() => {
        setCarregando(false);
        onNavigate('dashboard');
      }, 350);
    } catch (err) {
      setErro('Erro ao realizar login. Tente novamente.');
      console.error(err);
      setCarregando(false);
    }
  };

  return (
    <div className="w-full min-h-screen flex flex-col md:flex-row bg-white overflow-hidden font-sans">
      {/* Botão de retorno */}
      <div className="absolute top-5 left-5 z-30">
        <button
          type="button"
          onClick={() => onNavigate('index')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Voltar</span>
        </button>
      </div>

      {/* LADO ESQUERDO: Formulário Centralizado e Confortável (50% da tela) */}
      <div className="w-full md:w-1/2 min-h-screen flex items-center justify-center py-10 px-6 sm:px-12 z-20 bg-white">
        <div className="w-full max-w-[340px] flex flex-col items-center">
          {/* Logo Matéria Reativa */}
          <div
            className="mb-3 w-full flex items-center justify-center cursor-pointer transition hover:opacity-90 text-center"
            onClick={() => onNavigate('index')}
            title="Voltar ao início"
          >
            <Logo width={210} variant="dark" className="mx-auto" />
          </div>

          {/* Seletor de Perfil Aluno / Professor com botões claros, espaçados e responsivos */}
          <div className="mb-4 w-full bg-zinc-100 p-1 rounded-xl flex items-center justify-between border border-zinc-200/80 shadow-2xs">
            <button
              type="button"
              onClick={() => {
                setErro(null);
                if (onToggleUserType) onToggleUserType('aluno');
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer text-center ${
                userType === 'aluno'
                  ? 'bg-[#2B7FFF] text-white shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60'
              }`}
            >
              Sou Aluno
            </button>
            <button
              type="button"
              onClick={() => {
                setErro(null);
                if (onToggleUserType) onToggleUserType('professor');
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer text-center ${
                userType === 'professor'
                  ? 'bg-[#2B7FFF] text-white shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60'
              }`}
            >
              Sou Professor
            </button>
          </div>

          <form onSubmit={handleSubmit} className="w-full space-y-3.5">
            {erro && (
              <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl text-left leading-relaxed flex flex-col gap-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <span>{erro}</span>
                </div>
                {onToggleUserType && erro.includes('esta conta pertence a um') && (
                  <button
                    type="button"
                    onClick={() => {
                      const novoTipo = userType === 'aluno' ? 'professor' : 'aluno';
                      onToggleUserType(novoTipo);
                      setErro(null);
                    }}
                    className="self-start text-[11px] font-bold text-blue-700 hover:text-blue-900 underline cursor-pointer"
                  >
                    Alternar agora para {userType === 'aluno' ? 'Sou Professor' : 'Sou Aluno'} e tentar novamente
                  </button>
                )}
              </div>
            )}

            {/* Campo E-mail */}
            <div className="space-y-1">
              <label htmlFor="input-email" className="block text-xs font-semibold text-zinc-800">
                E-mail
              </label>
              <div className="relative">
                <input
                  id="input-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@exemplo.com"
                  className="w-full h-10 px-3.5 pr-10 text-sm text-zinc-800 rounded-lg border border-zinc-300 focus:outline-none focus:border-[#2F80ED] focus:ring-1 focus:ring-[#2F80ED] transition shadow-xs placeholder:text-zinc-400"
                />
                <Mail className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
              </div>
            </div>

            {/* Campo Senha */}
            <div className="space-y-1">
              <label htmlFor="input-senha" className="block text-xs font-semibold text-zinc-800">
                Senha
              </label>
              <div className="relative">
                <input
                  id="input-senha"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-10 px-3.5 pr-10 text-sm text-zinc-800 rounded-lg border border-zinc-300 focus:outline-none focus:border-[#2F80ED] focus:ring-1 focus:ring-[#2F80ED] transition shadow-xs placeholder:text-zinc-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition p-0.5 cursor-pointer"
                  title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                >
                  {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Opções: Lembrar acesso e Esqueceu senha */}
            <div className="flex items-center justify-between pt-0.5 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer select-none text-zinc-700">
                <input
                  type="checkbox"
                  checked={lembrar}
                  onChange={(e) => setLembrar(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-zinc-300 text-[#2F80ED] focus:ring-[#2F80ED] cursor-pointer"
                />
                <span className="text-[11px] font-medium">Lembrar acesso</span>
              </label>

              <button
                type="button"
                onClick={() => onNavigate('esqueceu-senha')}
                className="text-[11px] text-[#2F80ED] hover:text-blue-700 hover:underline transition font-medium cursor-pointer"
              >
                Esqueceu sua senha?
              </button>
            </div>

            {/* Botão Entrar Azul Vibrante do Figma (#2F80ED) */}
            <div className="pt-1.5">
              <button
                type="submit"
                disabled={carregando}
                className="w-full h-10 rounded-lg bg-[#2F80ED] hover:bg-[#256fd0] active:scale-[0.99] text-white text-sm font-semibold tracking-wide shadow-sm shadow-blue-500/20 transition cursor-pointer flex items-center justify-center gap-2"
              >
                {carregando ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Autenticando...</span>
                  </>
                ) : (
                  <span>Entrar</span>
                )}
              </button>
            </div>

            {/* Link Cadastre-se */}
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => onNavigate('cadastro')}
                className="text-xs text-[#2F80ED] hover:text-blue-700 hover:underline font-semibold transition cursor-pointer"
              >
                Não tem conta? Cadastre-se
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* LADO DIREITO: Ilustração de DNA com Curva Orgânica (50% da tela) */}
      <div className="hidden md:block md:w-1/2 min-h-screen relative overflow-hidden bg-black">
        <WaveDna dnaPosition="right" />
      </div>
    </div>
  );
};
