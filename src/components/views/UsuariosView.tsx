import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  GraduationCap,
  ShieldCheck,
  Search,
  Plus,
  KeyRound,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  X,
  Copy,
  Check,
  RefreshCw,
  Mail,
  User,
  BookOpen,
  Sparkles,
  Lock,
  Calendar,
  Clock,
  ShieldAlert
} from 'lucide-react';
import { Usuario } from '../../types';

interface UsuariosViewProps {
  usuarios: Usuario[];
  onAddUsuario: (novo: Usuario) => Promise<void>;
  onUpdateUsuario: (atualizado: Usuario) => Promise<void>;
  onDeleteUsuario: (id: string) => Promise<void>;
  filtroInicial?: 'todos' | 'aluno' | 'professor';
  usuarioLogadoId?: string;
}

export const UsuariosView: React.FC<UsuariosViewProps> = ({
  usuarios,
  onAddUsuario,
  onUpdateUsuario,
  onDeleteUsuario,
  filtroInicial = 'todos',
  usuarioLogadoId
}) => {
  const [busca, setBusca] = useState('');
  const [filtroPerfil, setFiltroPerfil] = useState<'todos' | 'aluno' | 'professor'>(filtroInicial);
  const [filtroTurma, setFiltroTurma] = useState<string>('todas');
  const [toast, setToast] = useState<string | null>(null);

  // Sincronizar filtro quando clicado no Dashboard ou no Banco de Dados
  useEffect(() => {
    if (filtroInicial) {
      setFiltroPerfil(filtroInicial);
    }
  }, [filtroInicial]);

  // Modais
  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [modalEditar, setModalEditar] = useState<Usuario | null>(null);
  const [usuarioParaExcluir, setUsuarioParaExcluir] = useState<Usuario | null>(null);

  // Estados dos formulários
  const [novoPerfil, setNovoPerfil] = useState<'aluno' | 'professor'>('aluno');
  const [novoNome, setNovoNome] = useState('');
  const [novoEmail, setNovoEmail] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [novoComplemento, setNovoComplemento] = useState('');
  const [novaMatricula, setNovaMatricula] = useState('');
  const [salvando, setSalvando] = useState(false);

  const mostrarToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Lista de turmas existentes
  const turmasDisponiveis = useMemo(() => {
    const setT = new Set<string>();
    usuarios.forEach((u) => {
      if (u.turma && u.tipoPerfil === 'aluno') {
        setT.add(u.turma.trim());
      }
    });
    return Array.from(setT);
  }, [usuarios]);

  // Filtragem
  const usuariosFiltrados = useMemo(() => {
    return usuarios.filter((u) => {
      const matchPerfil =
        filtroPerfil === 'todos' || u.tipoPerfil === filtroPerfil;
      const matchTurma =
        filtroTurma === 'todas' || (u.turma && u.turma.trim() === filtroTurma);
      const termo = busca.toLowerCase().trim();
      const matchBusca =
        !termo ||
        u.nome.toLowerCase().includes(termo) ||
        u.email.toLowerCase().includes(termo) ||
        (u.turma && u.turma.toLowerCase().includes(termo)) ||
        (u.departamento && u.departamento.toLowerCase().includes(termo)) ||
        (u.matricula && u.matricula.toLowerCase().includes(termo));

      return matchPerfil && matchTurma && matchBusca;
    });
  }, [usuarios, filtroPerfil, filtroTurma, busca]);

  // Contagens
  const totalUsuarios = usuarios.length;
  const totalAlunos = usuarios.filter((u) => u.tipoPerfil === 'aluno').length;
  const totalProfessores = usuarios.filter((u) => u.tipoPerfil === 'professor').length;

  // Gerar senha sugerida
  const gerarSenhaAleatoria = (tipo: 'aluno' | 'professor' = 'aluno') => {
    const ano = new Date().getFullYear();
    const numero = Math.floor(100 + Math.random() * 900);
    return tipo === 'aluno' ? `Aluno@${ano}_${numero}` : `Prof@${ano}_${numero}`;
  };

  // Submissão do cadastro de novo usuário
  const handleCriarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNome.trim() || !novoEmail.trim() || !novaSenha.trim()) {
      mostrarToast('Preencha os campos obrigatórios (Nome, E-mail e Senha).');
      return;
    }

    // Verificar se e-mail já existe
    const existe = usuarios.some(
      (u) => u.email.trim().toLowerCase() === novoEmail.trim().toLowerCase()
    );
    if (existe) {
      mostrarToast('Este e-mail já está em uso por outro usuário.');
      return;
    }

    setSalvando(true);
    try {
      const agora = new Date();
      const novo: Usuario = {
        id: `USR-${Date.now().toString().slice(-6)}`,
        nome: novoNome.trim(),
        email: novoEmail.trim().toLowerCase(),
        senha: novaSenha.trim(),
        tipoPerfil: novoPerfil,
        turma: novoPerfil === 'aluno' ? novoComplemento.trim() || 'Turma Geral' : undefined,
        departamento: novoPerfil === 'professor' ? novoComplemento.trim() || 'Depto. de Química' : undefined,
        matricula: novaMatricula.trim() || undefined,
        criadoEm: agora.toISOString()
      };

      await onAddUsuario(novo);
      mostrarToast(`Conta de ${novo.tipoPerfil === 'aluno' ? 'Aluno' : 'Professor(a)'} criada com sucesso!`);
      setModalNovoAberto(false);
      setNovoNome('');
      setNovoEmail('');
      setNovaSenha('');
      setNovoComplemento('');
      setNovaMatricula('');
    } catch (err) {
      mostrarToast('Erro ao cadastrar usuário.');
    } finally {
      setSalvando(false);
    }
  };

  // Submissão de Edição
  const handleSalvarEdicao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalEditar) return;

    setSalvando(true);
    try {
      await onUpdateUsuario(modalEditar);
      mostrarToast(`Dados de ${modalEditar.nome} atualizados!`);
      setModalEditar(null);
    } catch (err) {
      mostrarToast('Erro ao atualizar usuário.');
    } finally {
      setSalvando(false);
    }
  };

  // Submissão de Exclusão
  const handleConfirmarExclusao = async () => {
    if (!usuarioParaExcluir) return;
    setSalvando(true);
    try {
      await onDeleteUsuario(usuarioParaExcluir.id);
      mostrarToast(`Usuário ${usuarioParaExcluir.nome} removido do sistema.`);
      setUsuarioParaExcluir(null);
    } catch (err) {
      mostrarToast('Erro ao remover usuário.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="space-y-6 relative">
      {/* Toast Feedback */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 bg-zinc-900 text-white text-xs font-semibold rounded-xl shadow-2xl border border-zinc-700 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. CABEÇALHO OFICIAL EXCLUSIVO DO PROFESSOR                                */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl p-6 border border-zinc-200/80 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-5">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
              Módulo Restrito à Docência
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
              <Users className="w-3.5 h-3.5 text-blue-600" />
              Alunos e Professores Cadastrados
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
            Gestão de Usuários do Laboratório
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1 max-w-3xl leading-relaxed">
            Painel docente para acompanhamento de alunos e professores cadastrados no laboratório, consulta de turmas e controle de acessos ativos.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              setNovoPerfil('aluno');
              setNovoNome('');
              setNovoEmail('');
              setNovaSenha(gerarSenhaAleatoria('aluno'));
              setNovoComplemento('');
              setNovaMatricula('');
              setModalNovoAberto(true);
            }}
            className="flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 rounded-xl bg-[#2F80ED] hover:bg-blue-600 active:scale-95 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Novo Usuário</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4 CARDS DE MÉTRICAS - AZUL PREDOMINANTE COM DETALHES DE CORES DIFERENTES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 sm:gap-6">
        {/* Card 1: Total de Usuários - Detalhe Ciano */}
        <div
          onClick={() => {
            setFiltroPerfil('todos');
            setFiltroTurma('todas');
          }}
          className="bg-gradient-to-br from-[#2B7FFF] to-[#1E6BDB] text-white rounded-3xl p-6 sm:p-7 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-out cursor-pointer flex items-center justify-between min-h-[135px] border border-blue-400/30"
        >
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-300 animate-pulse" />
              <h3 className="text-sm sm:text-base font-bold text-white/95">Total de Usuários</h3>
            </div>
            <div className="text-3xl sm:text-4xl font-black text-white tracking-tight font-mono leading-none">
              {totalUsuarios}
            </div>
            <p className="text-xs text-sky-100 font-medium">Perfis cadastrados</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-sky-400/20 text-white border border-sky-300/30 flex items-center justify-center flex-shrink-0 shadow-inner">
            <Users className="w-8 h-8 stroke-[1.6]" />
          </div>
        </div>

        {/* Card 2: Alunos - Detalhe Azul Claro */}
        <div
          onClick={() => {
            setFiltroPerfil('aluno');
            setFiltroTurma('todas');
          }}
          className="bg-gradient-to-br from-[#2B7FFF] to-[#1E6BDB] text-white rounded-3xl p-6 sm:p-7 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-out cursor-pointer flex items-center justify-between min-h-[135px] border border-blue-400/30"
        >
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-300" />
              <h3 className="text-sm sm:text-base font-bold text-white/95">Alunos Cadastrados</h3>
            </div>
            <div className="text-3xl sm:text-4xl font-black text-white tracking-tight font-mono leading-none">
              {totalAlunos}
            </div>
            <p className="text-xs text-blue-100 font-medium">Estudantes ativos</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-white/20 text-white border border-white/30 flex items-center justify-center flex-shrink-0 shadow-inner">
            <GraduationCap className="w-8 h-8 stroke-[1.6]" />
          </div>
        </div>

        {/* Card 3: Professores - Detalhe Violeta */}
        <div
          onClick={() => {
            setFiltroPerfil('professor');
            setFiltroTurma('todas');
          }}
          className="bg-gradient-to-br from-[#2B7FFF] to-[#1E6BDB] text-white rounded-3xl p-6 sm:p-7 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-out cursor-pointer flex items-center justify-between min-h-[135px] border border-blue-400/30"
        >
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-300" />
              <h3 className="text-sm sm:text-base font-bold text-white/95">Professores</h3>
            </div>
            <div className="text-3xl sm:text-4xl font-black text-white tracking-tight font-mono leading-none">
              {totalProfessores}
            </div>
            <p className="text-xs text-purple-100 font-medium">Docentes autorizados</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-purple-400/25 text-purple-100 border border-purple-300/40 flex items-center justify-center flex-shrink-0 shadow-inner">
            <ShieldCheck className="w-8 h-8 stroke-[1.6]" />
          </div>
        </div>

        {/* Card 4: Acessos Ativos - Detalhe Esmeralda */}
        <div
          onClick={() => {
            setFiltroPerfil('todos');
          }}
          className="bg-gradient-to-br from-[#2B7FFF] to-[#1E6BDB] text-white rounded-3xl p-6 sm:p-7 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-out cursor-pointer flex items-center justify-between min-h-[135px] border border-blue-400/30"
        >
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-300" />
              <h3 className="text-sm sm:text-base font-bold text-white/95">Acessos Ativos</h3>
            </div>
            <div className="text-3xl sm:text-4xl font-black text-white tracking-tight font-mono leading-none">
              {totalUsuarios}
            </div>
            <p className="text-xs text-emerald-100 font-medium">100% Homologado</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-emerald-400/25 text-emerald-100 border border-emerald-300/40 flex items-center justify-center flex-shrink-0 shadow-inner">
            <CheckCircle2 className="w-8 h-8 stroke-[1.6]" />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BLOCO PRINCIPAL: TABELA DE USUÁRIOS E GESTÃO DE SENHAS                     */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-xs border border-zinc-200/80 space-y-5">
        {/* Topo do Bloco: Título, Descrição e Botão Novo */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-zinc-900">
                Diretório de Pessoas Registradas
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                {usuariosFiltrados.length} {usuariosFiltrados.length === 1 ? 'pessoa' : 'pessoas'}
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Consulte a listagem de alunos e docentes cadastrados e acompanhe os acessos ao laboratório.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setNovoPerfil('aluno');
              setNovoNome('');
              setNovoEmail('');
              setNovaSenha(gerarSenhaAleatoria('aluno'));
              setNovoComplemento('');
              setNovaMatricula('');
              setModalNovoAberto(true);
            }}
            className="flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 rounded-xl bg-[#2F80ED] hover:bg-blue-600 active:scale-95 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 transition cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Usuário</span>
          </button>
        </div>

        {/* Barra de Filtros e Busca Espaçosa */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5">
          <div className="relative w-full md:w-80">
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, e-mail, turma..."
              className="w-full h-10 pl-10 pr-8 text-xs sm:text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-[#2F80ED] focus:bg-white transition"
            />
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            {busca && (
              <button
                onClick={() => setBusca('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Abas de Perfil */}
            <div className="flex items-center gap-1.5 bg-zinc-100/90 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setFiltroPerfil('todos')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  filtroPerfil === 'todos'
                    ? 'bg-white text-zinc-900 shadow-2xs font-bold'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Todos ({totalUsuarios})
              </button>
              <button
                onClick={() => setFiltroPerfil('aluno')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  filtroPerfil === 'aluno'
                    ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Alunos ({totalAlunos})
              </button>
              <button
                onClick={() => setFiltroPerfil('professor')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  filtroPerfil === 'professor'
                    ? 'bg-white text-purple-700 shadow-2xs font-bold'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Professores ({totalProfessores})
              </button>
            </div>

            {/* Dropdown de Turma se houver turmas cadastradas */}
            {turmasDisponiveis.length > 0 && (
              <select
                value={filtroTurma}
                onChange={(e) => setFiltroTurma(e.target.value)}
                className="h-9 px-3 text-xs bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-700 focus:outline-none focus:border-[#2F80ED]"
              >
                <option value="todas">Todas as Turmas</option>
                {turmasDisponiveis.map((t) => (
                  <option key={t} value={t}>
                    Turma: {t}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* LISTA EM CARDS PARA DISPOSITIVOS MÓVEIS (SMARTPHONES < 768px) */}
        <div className="block md:hidden space-y-3">
          {usuariosFiltrados.length === 0 ? (
            <div className="py-10 text-center text-xs text-zinc-500 bg-zinc-50 rounded-xl p-4 border border-dashed border-zinc-200">
              <Users className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <p className="font-semibold text-zinc-800">
                {usuarios.length === 0 ? 'Nenhum usuário cadastrado' : 'Nenhum usuário localizado'}
              </p>
              <p className="text-[11px] text-zinc-400 mt-1">
                {usuarios.length === 0
                  ? 'Cadastre alunos ou professores no botão acima.'
                  : 'Tente alterar os termos da busca.'}
              </p>
            </div>
          ) : (
            usuariosFiltrados.map((u) => {
              const isAluno = u.tipoPerfil === 'aluno';
              const inicial = u.nome.charAt(0).toUpperCase();
              return (
                <div
                  key={u.id}
                  className="bg-white rounded-2xl p-4 border border-zinc-200 shadow-2xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black shadow-2xs flex-shrink-0 ${
                          isAluno
                            ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                            : 'bg-purple-100 text-purple-700 border border-purple-200'
                        }`}
                      >
                        {inicial}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-zinc-900 text-xs truncate">{u.nome}</span>
                          {u.id === usuarioLogadoId && (
                            <span className="text-[9px] bg-zinc-100 text-zinc-600 px-1.5 py-0.2 rounded font-semibold border border-zinc-200">
                              Você
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-zinc-500 font-mono truncate block">{u.email}</span>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border flex-shrink-0 ${
                        isAluno
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          : 'bg-purple-50 text-purple-700 border-purple-200'
                      }`}
                    >
                      {isAluno ? 'Aluno' : 'Docente'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] bg-zinc-50 p-2.5 rounded-xl border border-zinc-100">
                    <div>
                      <span className="text-zinc-400 text-[10px] block">
                        {isAluno ? 'Turma:' : 'Departamento:'}
                      </span>
                      <strong className="text-zinc-800">
                        {isAluno ? (u.turma || 'Geral') : (u.departamento || 'Química')}
                      </strong>
                    </div>
                    <div className="text-right">
                      <span className="text-zinc-400 text-[10px] block">Cadastrado em:</span>
                      <span className="font-mono text-zinc-600 text-[10px]">
                        {u.criadoEm ? new Date(u.criadoEm).toLocaleDateString('pt-BR') : 'Recente'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-zinc-100">
                    <button
                      type="button"
                      onClick={() => setModalEditar({ ...u })}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 transition cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setUsuarioParaExcluir(u)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Excluir</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Tabela de Usuários para Desktop e Tablets */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold border-b border-zinc-100">
                <th className="pb-3 pl-1">USUÁRIO</th>
                <th className="pb-3">TIPO DE PERFIL</th>
                <th className="pb-3">TURMA / DEPARTAMENTO</th>
                <th className="pb-3">DATA DE CADASTRO</th>
                <th className="pb-3 text-center pr-1">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {usuariosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-14 text-center text-xs text-zinc-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                        <Users className="w-6 h-6" />
                      </div>
                      <span className="font-bold text-zinc-800 text-sm">
                        {usuarios.length === 0
                          ? 'Nenhum usuário cadastrado no sistema'
                          : 'Nenhum usuário encontrado com os filtros selecionados'}
                      </span>
                      <p className="text-[11px] text-zinc-400 max-w-sm">
                        {usuarios.length === 0
                          ? 'Clique no botão "+ Novo Usuário" acima para cadastrar o primeiro aluno ou professor.'
                          : 'Tente alterar os termos da busca ou alternar entre as abas de Alunos e Professores.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                usuariosFiltrados.map((u) => {
                  const isAluno = u.tipoPerfil === 'aluno';
                  const inicial = u.nome.charAt(0).toUpperCase();

                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-blue-50/20 transition group"
                    >
                      {/* Usuário (Avatar, Nome e E-mail) */}
                      <td className="py-4 pl-2">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black shadow-2xs flex-shrink-0 ${
                              isAluno
                                ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                                : 'bg-purple-100 text-purple-700 border border-purple-200'
                            }`}
                          >
                            {inicial}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-zinc-900 text-xs sm:text-sm">
                                {u.nome}
                              </span>
                              {u.id === usuarioLogadoId && (
                                <span className="text-[9px] bg-zinc-100 text-zinc-600 px-1.5 py-0.2 rounded font-semibold border border-zinc-200">
                                  Você
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5 font-mono">
                              <Mail className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                              <span className="truncate">{u.email}</span>
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Tipo de Perfil */}
                      <td className="py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border ${
                            isAluno
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : 'bg-purple-50 text-purple-700 border-purple-200'
                          }`}
                        >
                          {isAluno ? (
                            <>
                              <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Aluno (Bancada)</span>
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                              <span>Professor(a)</span>
                            </>
                          )}
                        </span>
                      </td>

                      {/* Turma ou Departamento */}
                      <td className="py-4 text-zinc-700">
                        {isAluno ? (
                          <span className="font-semibold text-zinc-900 bg-zinc-50 px-2.5 py-1 rounded-lg border border-zinc-200/80 text-xs">
                            {u.turma || 'Turma Geral'}
                          </span>
                        ) : (
                          <span className="text-zinc-700 font-medium text-xs">
                            {u.departamento || 'Depto. de Química'}
                          </span>
                        )}
                        {u.matricula && (
                          <span className="block text-[10px] text-zinc-400 font-mono mt-0.5">
                            Matrícula: {u.matricula}
                          </span>
                        )}
                      </td>

                      {/* Data de Cadastro */}
                      <td className="py-4 text-zinc-500 font-mono text-xs">
                        {u.criadoEm
                          ? new Date(u.criadoEm).toLocaleDateString('pt-BR')
                          : 'Recente'}
                      </td>

                      {/* Ações (Editar, Excluir) */}
                      <td className="py-4 pr-2 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {/* Botão Editar */}
                          <button
                            type="button"
                            onClick={() => setModalEditar({ ...u })}
                            className="p-2 rounded-xl text-zinc-500 hover:text-amber-600 hover:bg-amber-50 transition cursor-pointer border border-zinc-200"
                            title="Editar dados cadastrais"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Botão Excluir */}
                          <button
                            type="button"
                            onClick={() => setUsuarioParaExcluir(u)}
                            className="p-2 rounded-xl text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer border border-zinc-200"
                            title="Excluir usuário do sistema"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: CADASTRO DE NOVO USUÁRIO (ALUNO OU PROFESSOR)                      */}
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {modalNovoAberto && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/80 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">Cadastrar Nova Pessoa no Lab</h3>
                  <p className="text-[11px] text-zinc-500">Crie contas diretamente para estudantes ou docentes</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalNovoAberto(false)}
                className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg hover:bg-zinc-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCriarUsuario} className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Seleção do Perfil */}
              <div>
                <label className="text-xs font-bold text-zinc-800 block mb-1.5">
                  Tipo de Perfil:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNovoPerfil('aluno');
                      setNovaSenha(gerarSenhaAleatoria('aluno'));
                    }}
                    className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 cursor-pointer ${
                      novoPerfil === 'aluno'
                        ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500 text-indigo-950 font-bold'
                        : 'border-zinc-200 hover:bg-zinc-50 text-zinc-700'
                    }`}
                  >
                    <GraduationCap className="w-5 h-5 text-indigo-600" />
                    <div>
                      <span className="text-xs block">Aluno / Estudante</span>
                      <span className="text-[10px] text-zinc-500 font-normal">Acesso à bancada e consultas</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNovoPerfil('professor');
                      setNovaSenha(gerarSenhaAleatoria('professor'));
                    }}
                    className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 cursor-pointer ${
                      novoPerfil === 'professor'
                        ? 'bg-purple-50/70 border-purple-300 ring-2 ring-purple-500 text-purple-950 font-bold'
                        : 'border-zinc-200 hover:bg-zinc-50 text-zinc-700'
                    }`}
                  >
                    <ShieldCheck className="w-5 h-5 text-purple-600" />
                    <div>
                      <span className="text-xs block">Professor(a) / Gestor</span>
                      <span className="text-[10px] text-zinc-500 font-normal">Acesso total e controle</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Nome */}
              <div>
                <label className="text-xs font-bold text-zinc-800 block mb-1">
                  Nome Completo: *
                </label>
                <input
                  type="text"
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  required
                  placeholder="Ex: Nome do aluno ou professor"
                  className="w-full h-10 px-3 text-xs bg-zinc-50 border border-zinc-300 rounded-xl focus:outline-none focus:border-[#2F80ED] focus:bg-white transition"
                />
              </div>

              {/* E-mail */}
              <div>
                <label className="text-xs font-bold text-zinc-800 block mb-1">
                  E-mail de Acesso: *
                </label>
                <input
                  type="email"
                  value={novoEmail}
                  onChange={(e) => setNovoEmail(e.target.value)}
                  required
                  placeholder="Ex: aluno.lucas@escola.sp.gov.br"
                  className="w-full h-10 px-3 text-xs bg-zinc-50 border border-zinc-300 rounded-xl focus:outline-none focus:border-[#2F80ED] focus:bg-white transition"
                />
              </div>

              {/* Turma ou Departamento */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-zinc-800 block mb-1">
                    {novoPerfil === 'aluno' ? 'Turma Escolar: *' : 'Departamento / Disciplina: *'}
                  </label>
                  <input
                    type="text"
                    value={novoComplemento}
                    onChange={(e) => setNovoComplemento(e.target.value)}
                    placeholder={novoPerfil === 'aluno' ? 'Ex: 3º Ano B' : 'Ex: Química Orgânica'}
                    className="w-full h-10 px-3 text-xs bg-zinc-50 border border-zinc-300 rounded-xl focus:outline-none focus:border-[#2F80ED] focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-800 block mb-1">
                    Matrícula / RA (Opcional):
                  </label>
                  <input
                    type="text"
                    value={novaMatricula}
                    onChange={(e) => setNovaMatricula(e.target.value)}
                    placeholder="Ex: RA-2024-8841"
                    className="w-full h-10 px-3 text-xs bg-zinc-50 border border-zinc-300 rounded-xl focus:outline-none focus:border-[#2F80ED] focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Senha Inicial */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-zinc-800">
                    Senha Inicial de Acesso: *
                  </label>
                  <button
                    type="button"
                    onClick={() => setNovaSenha(gerarSenhaAleatoria(novoPerfil))}
                    className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Gerar Senha</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  required
                  className="w-full h-10 px-3 text-xs bg-zinc-50 border border-zinc-300 rounded-xl font-mono focus:outline-none focus:border-[#2F80ED] focus:bg-white transition"
                />
                <span className="text-[10px] text-zinc-400 mt-1 block">
                  Você poderá consultar ou redefinir esta senha a qualquer momento nesta tabela.
                </span>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-zinc-100 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setModalNovoAberto(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 hover:bg-zinc-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#2F80ED] hover:bg-blue-600 text-white shadow-md shadow-blue-500/20 active:scale-95 transition cursor-pointer disabled:opacity-50"
                >
                  {salvando ? 'Cadastrando...' : 'Cadastrar Pessoa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: EDIÇÃO DE DADOS CADASTRAIS                                       */}
      {/* ========================================================================= */}
      {modalEditar && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">Editar Dados do Usuário</h3>
                  <p className="text-[11px] text-zinc-500">{modalEditar.nome}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalEditar(null)}
                className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg hover:bg-zinc-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSalvarEdicao} className="p-5 space-y-3.5">
              <div>
                <label className="text-xs font-bold text-zinc-800 block mb-1">
                  Nome Completo:
                </label>
                <input
                  type="text"
                  value={modalEditar.nome}
                  onChange={(e) => setModalEditar({ ...modalEditar, nome: e.target.value })}
                  required
                  className="w-full h-10 px-3 text-xs bg-zinc-50 border border-zinc-300 rounded-xl focus:outline-none focus:border-[#2F80ED]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-800 block mb-1">
                  E-mail de Acesso:
                </label>
                <input
                  type="email"
                  value={modalEditar.email}
                  onChange={(e) => setModalEditar({ ...modalEditar, email: e.target.value })}
                  required
                  className="w-full h-10 px-3 text-xs bg-zinc-50 border border-zinc-300 rounded-xl focus:outline-none focus:border-[#2F80ED]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-zinc-800 block mb-1">
                    {modalEditar.tipoPerfil === 'aluno' ? 'Turma:' : 'Departamento:'}
                  </label>
                  <input
                    type="text"
                    value={modalEditar.tipoPerfil === 'aluno' ? (modalEditar.turma || '') : (modalEditar.departamento || '')}
                    onChange={(e) => {
                      if (modalEditar.tipoPerfil === 'aluno') {
                        setModalEditar({ ...modalEditar, turma: e.target.value });
                      } else {
                        setModalEditar({ ...modalEditar, departamento: e.target.value });
                      }
                    }}
                    className="w-full h-10 px-3 text-xs bg-zinc-50 border border-zinc-300 rounded-xl focus:outline-none focus:border-[#2F80ED]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-800 block mb-1">
                    Matrícula:
                  </label>
                  <input
                    type="text"
                    value={modalEditar.matricula || ''}
                    onChange={(e) => setModalEditar({ ...modalEditar, matricula: e.target.value })}
                    className="w-full h-10 px-3 text-xs bg-zinc-50 border border-zinc-300 rounded-xl focus:outline-none focus:border-[#2F80ED]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-800 block mb-1">
                  Perfil de Acesso:
                </label>
                <select
                  value={modalEditar.tipoPerfil}
                  onChange={(e) => setModalEditar({ ...modalEditar, tipoPerfil: e.target.value as any })}
                  className="w-full h-10 px-3 text-xs bg-zinc-50 border border-zinc-300 rounded-xl focus:outline-none focus:border-[#2F80ED]"
                >
                  <option value="aluno">Aluno (Acesso Acadêmico de Bancada)</option>
                  <option value="professor">Professor(a) (Gestão Total)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setModalEditar(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 hover:bg-zinc-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#2F80ED] hover:bg-blue-600 text-white shadow-md shadow-blue-500/20 active:scale-95 transition cursor-pointer disabled:opacity-50"
                >
                  {salvando ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: CONFIRMAÇÃO DE EXCLUSÃO DE USUÁRIO                                */}
      {/* ========================================================================= */}
      {usuarioParaExcluir && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-sm p-5 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200 shadow-2xs">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900">Excluir Conta de Acesso?</h3>
              <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                Tem certeza que deseja remover <strong>{usuarioParaExcluir.nome}</strong> ({usuarioParaExcluir.email})? A pessoa perderá imediatamente o login no sistema.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setUsuarioParaExcluir(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 hover:bg-zinc-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarExclusao}
                disabled={salvando}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 active:scale-95 transition cursor-pointer disabled:opacity-50"
              >
                {salvando ? 'Excluindo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
