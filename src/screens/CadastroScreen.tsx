import React, { useState } from 'react';
import { Logo } from '../components/Logo';
import { WaveDna } from '../components/WaveDna';
import {
  Mail,
  Edit3,
  EyeOff,
  Eye,
  ArrowLeft,
  CheckCircle2,
  GraduationCap,
  FlaskConical,
  Loader2
} from 'lucide-react';
import { dataService } from '../services/db/dataService';
import { Usuario } from '../types';

interface CadastroScreenProps {
  onNavigate: (screen: 'index' | 'login' | 'cadastro' | 'esqueceu-senha' | 'dashboard') => void;
  onSetPerfil?: (perfil: 'aluno' | 'professor') => void;
}

export const CadastroScreen: React.FC<CadastroScreenProps> = ({ onNavigate, onSetPerfil }) => {
  const [tipoPerfil, setTipoPerfil] = useState<'aluno' | 'professor'>('aluno');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [campoComplementar, setCampoComplementar] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (!nome.trim() || !email.trim() || !senha) {
      setErro('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (senha.length < 6) {
      setErro('A senha deve conter no mínimo 6 caracteres.');
      return;
    }

    if (senha !== confirmarSenha) {
      setErro('As senhas não coincidem. Verifique e tente novamente.');
      return;
    }

    setCarregando(true);

    try {
      // Verificar se e-mail já existe no banco
      const usuariosExistentes = await dataService.usuarios.listar();
      const jaExiste = usuariosExistentes.some(
        (u) => u.email.trim().toLowerCase() === email.trim().toLowerCase()
      );

      if (jaExiste) {
        setErro('Este e-mail já está cadastrado no sistema. Faça login.');
        setCarregando(false);
        return;
      }

      // Criar nova conta no banco de dados do sistema
      const novoUsuario: Usuario = {
        id: `USR-${Date.now().toString().slice(-6)}`,
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        senha: senha,
        tipoPerfil: tipoPerfil,
        turma: tipoPerfil === 'aluno' ? campoComplementar.trim() || 'Turma Geral' : undefined,
        departamento: tipoPerfil === 'professor' ? campoComplementar.trim() || 'Depto. de Química' : undefined,
        criadoEm: new Date().toISOString()
      };

      await dataService.usuarios.criar(novoUsuario);

      // Salva a sessão ativa e avisa o app
      dataService.salvarSessao(novoUsuario);
      if (onSetPerfil) {
        onSetPerfil(tipoPerfil);
      }

      setSucesso(true);
      setTimeout(() => {
        onNavigate('login');
      }, 1600);
    } catch (err) {
      setErro('Erro ao cadastrar usuário. Tente novamente.');
      console.error(err);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="w-full min-h-screen flex flex-col lg:flex-row bg-white overflow-x-hidden font-sans">
      {/* Botão voltar */}
      <button
        onClick={() => onNavigate('login')}
        className="absolute top-4 left-4 z-30 flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold transition active:scale-95 cursor-pointer shadow-xs"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Voltar ao Login</span>
      </button>

      {/* LADO ESQUERDO: Formulário de Cadastro */}
      <div className="w-full lg:w-1/2 min-h-screen flex items-center justify-center pt-16 pb-8 px-5 sm:p-8 lg:p-12 z-20 bg-white">
        <div className="w-full max-w-[360px] flex flex-col items-center">
          {/* Logo Matéria Reativa */}
          <div
            className="mb-4 w-full flex items-center justify-center cursor-pointer transition hover:opacity-90 text-center"
            onClick={() => onNavigate('index')}
            title="Voltar ao início"
          >
            <Logo width={210} variant="dark" className="mx-auto" />
          </div>

          <div className="w-full text-center mb-4">
            <h2 className="text-base font-bold text-zinc-900">Criar Nova Conta</h2>
            <p className="text-[11px] text-zinc-500">
              Cadastre seu usuário para ter acesso ao laboratório
            </p>
          </div>

          {sucesso ? (
            <div className="w-full bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center space-y-3 animate-in fade-in zoom-in-95">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-emerald-900">Conta cadastrada com sucesso!</h3>
              <p className="text-xs text-emerald-700">
                Seu usuário foi registrado com perfil de <strong>{tipoPerfil === 'aluno' ? 'Aluno' : 'Professor(a)'}</strong>.
              </p>
              <p className="text-[11px] text-emerald-600">
                Redirecionando para login...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="w-full space-y-3">
              {erro && (
                <div className="p-2.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg text-center">
                  {erro}
                </div>
              )}

              {/* Seletor de Tipo de Perfil */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-zinc-800">
                  Tipo de Acesso
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTipoPerfil('aluno')}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      tipoPerfil === 'aluno'
                        ? 'bg-blue-50 border-[#2F80ED] text-[#2F80ED] shadow-xs'
                        : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4" />
                    <span>Aluno</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTipoPerfil('professor')}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      tipoPerfil === 'professor'
                        ? 'bg-blue-50 border-[#2F80ED] text-[#2F80ED] shadow-xs'
                        : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                    }`}
                  >
                    <FlaskConical className="w-4 h-4" />
                    <span>Professor(a)</span>
                  </button>
                </div>
              </div>

              {/* Campo Nome */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-zinc-800">
                  Nome Completo
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Seu nome completo"
                    className="w-full h-9.5 px-3.5 pr-10 text-xs text-zinc-800 rounded-lg border border-zinc-300 focus:outline-none focus:border-[#2F80ED] focus:ring-1 focus:ring-[#2F80ED] transition shadow-xs placeholder:text-zinc-400"
                  />
                  <Edit3 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                </div>
              </div>

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
                    className="w-full h-9.5 px-3.5 pr-10 text-xs text-zinc-800 rounded-lg border border-zinc-300 focus:outline-none focus:border-[#2F80ED] focus:ring-1 focus:ring-[#2F80ED] transition shadow-xs placeholder:text-zinc-400"
                  />
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                </div>
              </div>

              {/* Campo Complementar (Turma ou Departamento) */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-zinc-800">
                  {tipoPerfil === 'aluno' ? 'Turma / Ano Letivo' : 'Departamento / Registro'}
                </label>
                <input
                  type="text"
                  value={campoComplementar}
                  onChange={(e) => setCampoComplementar(e.target.value)}
                  placeholder={
                    tipoPerfil === 'aluno'
                      ? 'Ex: Turma 3º B (Química)'
                      : 'Ex: Depto. de Química Geral / CRQ'
                  }
                  className="w-full h-9.5 px-3.5 text-xs text-zinc-800 rounded-lg border border-zinc-300 focus:outline-none focus:border-[#2F80ED] focus:ring-1 focus:ring-[#2F80ED] transition shadow-xs placeholder:text-zinc-400"
                />
              </div>

              {/* Campo Senha */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-zinc-800">
                  Senha (mínimo 6 caracteres)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-9.5 px-3.5 pr-10 text-xs text-zinc-800 rounded-lg border border-zinc-300 focus:outline-none focus:border-[#2F80ED] focus:ring-1 focus:ring-[#2F80ED] transition shadow-xs placeholder:text-zinc-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition p-0.5 cursor-pointer"
                  >
                    {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Campo Confirmar Senha */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-zinc-800">
                  Confirmar senha
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-9.5 px-3.5 pr-10 text-xs text-zinc-800 rounded-lg border border-zinc-300 focus:outline-none focus:border-[#2F80ED] focus:ring-1 focus:ring-[#2F80ED] transition shadow-xs placeholder:text-zinc-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition p-0.5 cursor-pointer"
                  >
                    {showConfirmPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Botão Cadastrar Azul (#2F80ED) */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={carregando}
                  className="w-full h-10 rounded-lg bg-[#2F80ED] hover:bg-[#256fd0] active:scale-[0.99] text-white text-xs font-semibold tracking-wide shadow-md shadow-blue-500/20 transition cursor-pointer flex items-center justify-center gap-2"
                >
                  {carregando ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Cadastrando...</span>
                    </>
                  ) : (
                    <span>Cadastrar Conta</span>
                  )}
                </button>
              </div>

              {/* Link voltar para login */}
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => onNavigate('login')}
                  className="text-xs text-[#2F80ED] hover:text-blue-700 hover:underline font-medium transition cursor-pointer"
                >
                  já tem uma conta? faça login
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* LADO DIREITO: Ilustração de DNA no Cadastro (Figma) */}
      <div className="hidden lg:block lg:w-1/2 min-h-screen relative overflow-hidden bg-black">
        <WaveDna dnaPosition="right" />
      </div>
    </div>
  );
};
