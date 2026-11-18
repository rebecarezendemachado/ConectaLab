import React, { useEffect, useState } from 'react';
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
import { dataService, ErroApi } from '../services/db/dataService';
import { Usuario } from '../types';

interface CadastroScreenProps {
  onNavigate: (screen: 'index' | 'login' | 'cadastro' | 'esqueceu-senha' | 'dashboard') => void;
  onSetPerfil?: (perfil: 'aluno' | 'professor') => void;
  adminSetup?: boolean;
}

export const CadastroScreen: React.FC<CadastroScreenProps> = ({ onNavigate, onSetPerfil, adminSetup = false }) => {
  const [tipoPerfil, setTipoPerfil] = useState<'aluno' | 'professor'>(adminSetup ? 'professor' : 'aluno');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [campoComplementar, setCampoComplementar] = useState('');
  const [senha, setSenha] = useState('');
  const [avisoPendente, setAvisoPendente] = useState<string | null>(null);
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [turmasDisponiveis, setTurmasDisponiveis] = useState<{ id: string; nome: string; anoLetivo: string }[]>([]);
  const [carregandoTurmas, setCarregandoTurmas] = useState(true);

  useEffect(() => {
    let ativo = true;
    dataService.turmasPublicas().then((turmas) => { if (ativo) setTurmasDisponiveis(turmas); })
      .catch(() => { if (ativo) setTurmasDisponiveis([]); })
      .finally(() => { if (ativo) setCarregandoTurmas(false); });
    return () => { ativo = false; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (!nome.trim() || !email.trim() || !senha) {
      setErro('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (senha.length < (adminSetup ? 10 : 6)) {
      setErro(`A senha deve conter no mínimo ${adminSetup ? 10 : 6} caracteres.`);
      return;
    }

    if (senha !== confirmarSenha) {
      setErro('As senhas não coincidem. Verifique e tente novamente.');
      return;
    }

    // O formulário da Kátia usa uma única operação idempotente: cria a conta
    // no primeiro acesso ou recupera a conta existente, sem exigir senha antiga.
    if (adminSetup) {
      await recuperarAdmin();
      return;
    }

    setCarregando(true);

    try {
      // O servidor valida os dados, recusa e-mails repetidos e guarda a senha com hash.
      // O cadastro é liberado para acesso imediato (sem aprovação manual da administradora).
      const resposta = await dataService.registrar({
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        senha: senha,
        tipoPerfil: tipoPerfil,
        primeiroAcessoAdmin: adminSetup,
        turma: tipoPerfil === 'aluno' ? campoComplementar.trim() : undefined,
        departamento: adminSetup ? 'Administração' : tipoPerfil === 'professor' ? campoComplementar.trim() || 'Depto. de Química' : undefined
      });

      if (onSetPerfil) {
        onSetPerfil(tipoPerfil);
      }
      setAvisoPendente(null);

      setSucesso(true);
      setTimeout(() => {
        onNavigate(resposta.usuario ? 'dashboard' : 'login');
      }, 1000);
    } catch (err) {
      setErro(err instanceof ErroApi ? err.message : 'Erro ao cadastrar usuário. Tente novamente.');
      console.error(err);
    } finally {
      setCarregando(false);
    }
  };

  const recuperarAdmin = async () => {
    setErro(null);
    if (!adminSetup) return;
    if (!nome.trim() || !email.trim() || !senha) {
      setErro('Informe o nome, o e-mail e a nova senha da Kátia.');
      return;
    }
    if (senha.length < 10) {
      setErro('A nova senha deve conter no mínimo 10 caracteres.');
      return;
    }
    if (senha !== confirmarSenha) {
      setErro('As senhas não coincidem. Verifique e tente novamente.');
      return;
    }
    setCarregando(true);
    try {
      await dataService.recuperarAcessoAdministradora({
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        senha
      });
      onSetPerfil?.('professor');
      setSucesso(true);
      setTimeout(() => onNavigate('dashboard'), 500);
    } catch (err) {
      setErro(err instanceof ErroApi ? err.message : 'Não foi possível recuperar o acesso da Kátia.');
    } finally {
      setCarregando(false);
    }
  };

  // A recuperação também precisa ficar disponível quando o primeiro cadastro falha
  // por e-mail já utilizado ou por marcador administrativo inconsistente no banco.
  const adminPodeRecuperar = adminSetup && !!erro;

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
            <h2 className="text-base font-bold text-zinc-900">{adminSetup ? 'Primeiro acesso da Kátia' : 'Criar Nova Conta'}</h2>
            <p className="text-[11px] text-zinc-500">
              {adminSetup ? 'Use o e-mail da Kátia e defina uma senha que só ela conheça.' : 'Cadastre seu usuário para ter acesso ao laboratório'}
            </p>
          </div>

          {sucesso ? (
            <div className="w-full bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center space-y-3 animate-in fade-in zoom-in-95">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-emerald-900">{adminSetup ? 'Acesso administrativo configurado!' : 'Conta cadastrada com sucesso!'}</h3>
              <p className="text-xs text-emerald-700">
                {adminSetup ? 'A conta da Kátia está pronta. Use o e-mail e a senha que acabou de cadastrar no botão “Administradora · Kátia”.' : <>Seu usuário foi registrado com perfil de <strong>{tipoPerfil === 'aluno' ? 'Aluno' : 'Professor(a)'}</strong> e já pode acessar.</>}
              </p>
              <p className="text-[11px] text-emerald-600">
                {dataService.obterSessao()?.tipoPerfil === 'administrador' ? 'Entrando no painel administrativo...' : 'Entrando no sistema...'}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="w-full space-y-3">
              {erro && (
                <div className="p-2.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg text-center">
                  {erro}
                  {adminPodeRecuperar && (
                    <button
                      type="button"
                      disabled={carregando}
                      onClick={() => void recuperarAdmin()}
                      className="mt-2 block w-full rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                    >
                      {carregando ? 'Recuperando acesso…' : 'Recuperar acesso da Kátia neste computador'}
                    </button>
                  )}
                </div>
              )}

              {adminSetup ? <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2.5 text-[11px] leading-relaxed text-indigo-800"><strong>Conta administrativa da Kátia.</strong> Esta configuração funciona no computador onde o sistema está instalado e só pode ser feita uma vez. Crie uma senha com pelo menos 10 caracteres.</div> : <div className="space-y-1">
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
              </div>}

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

              {/* O aluno escolhe uma sala já criada e com docente; nomes livres deixam alunos sem acompanhamento. */}
              {!adminSetup && <div className="space-y-1">
                <label className="block text-xs font-semibold text-zinc-800">
                  {tipoPerfil === 'aluno' ? 'Turma / Ano Letivo' : 'Departamento / Registro'}
                </label>
                {tipoPerfil === 'aluno' ? (
                  <>
                    <select
                      required
                      value={campoComplementar}
                      onChange={(e) => setCampoComplementar(e.target.value)}
                      disabled={carregandoTurmas || turmasDisponiveis.length === 0}
                      className="w-full h-10 px-3.5 text-xs text-zinc-800 rounded-lg border border-zinc-300 bg-white focus:outline-none focus:border-[#2F80ED] focus:ring-1 focus:ring-[#2F80ED] disabled:bg-zinc-100"
                    >
                      <option value="">{carregandoTurmas ? 'Carregando turmas…' : 'Selecione sua turma'}</option>
                      {turmasDisponiveis.map((turma) => <option key={turma.id} value={turma.nome}>{turma.nome}{turma.anoLetivo ? ` • ${turma.anoLetivo}` : ''}</option>)}
                    </select>
                    {turmasDisponiveis.length === 0 && !carregandoTurmas && (
                      <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                        Ainda não há uma turma ativa com professor responsável. Peça à Kátia para criar a turma e vincular o docente.
                      </p>
                    )}
                  </>
                ) : (
                  <input type="text" value={campoComplementar} onChange={(e) => setCampoComplementar(e.target.value)}
                    placeholder="Ex: Depto. de Química Geral / CRQ"
                    className="w-full h-9.5 px-3.5 text-xs text-zinc-800 rounded-lg border border-zinc-300 focus:outline-none focus:border-[#2F80ED] focus:ring-1 focus:ring-[#2F80ED] transition shadow-xs placeholder:text-zinc-400" />
                )}
              </div>}

              {/* Campo Senha */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-zinc-800">
                  Senha (mínimo {adminSetup ? 10 : 6} caracteres)
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
                  disabled={carregando || (tipoPerfil === 'aluno' && (carregandoTurmas || turmasDisponiveis.length === 0 || !campoComplementar))}
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
