import React, { useState, useEffect } from 'react';
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  Check,
  Copy,
  FileText,
  Server,
  HardDrive,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Table,
  Terminal,
  Code,
  Users,
  GraduationCap,
  FlaskConical,
  Truck,
  Boxes,
  ShoppingCart,
  Send,
  AlertOctagon,
  Lock,
  X,
  FileSpreadsheet,
  Info
} from 'lucide-react';
import { dataService } from '../../services/db/dataService';
import { DatabaseBackup, DatabaseConnectionStatus } from '../../services/db/types';

interface BancoDadosViewProps {
  onDataReset?: () => void;
  onDataReload?: () => void;
  onNavigateToUsuarios?: (filtro?: 'todos' | 'aluno' | 'professor') => void;
}

export const BancoDadosView: React.FC<BancoDadosViewProps> = ({
  onDataReset,
  onDataReload,
  onNavigateToUsuarios
}) => {
  const [status, setStatus] = useState<DatabaseConnectionStatus | null>(null);
  const [copiadoSQL, setCopiadoSQL] = useState(false);
  const [copiadoSchema, setCopiadoSchema] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [abaAtiva, setAbaAtiva] = useState<'status' | 'schema' | 'exportar' | 'integracao'>('status');

  // Estado do Modal de Segurança para Reset do Banco de Dados
  const [modalResetAberto, setModalResetAberto] = useState(false);
  const [palavraConfirmacao, setPalavraConfirmacao] = useState('');
  const [aceitouTermo, setAceitouTermo] = useState(false);

  const carregarStatus = async () => {
    const s = await dataService.obterStatus();
    setStatus(s);
  };

  useEffect(() => {
    carregarStatus();
  }, []);

  const handleExportarSQL = async () => {
    try {
      setCarregando(true);
      const sql = await dataService.gerarDumpSQL();
      const blob = new Blob([sql], { type: 'text/sql;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `materia_reativa_dump_${new Date().toISOString().split('T')[0]}.sql`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setMensagemSucesso('Script de Dump SQL gerado e baixado com sucesso!');
      setTimeout(() => setMensagemSucesso(null), 3500);
    } finally {
      setCarregando(false);
    }
  };

  const handleCopiarSQL = async () => {
    const sql = await dataService.gerarDumpSQL();
    navigator.clipboard.writeText(sql);
    setCopiadoSQL(true);
    setTimeout(() => setCopiadoSQL(false), 2000);
  };

  const handleExportarJSON = async () => {
    try {
      setCarregando(true);
      const backup = await dataService.exportarBackupJSON();
      const json = JSON.stringify(backup, null, 2);
      const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `materia_reativa_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setMensagemSucesso('Arquivo de backup JSON gerado e baixado com sucesso!');
      setTimeout(() => setMensagemSucesso(null), 3500);
    } finally {
      setCarregando(false);
    }
  };

  const handleImportarJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const conteudo = event.target?.result as string;
        const backup: DatabaseBackup = JSON.parse(conteudo);
        await dataService.restaurarBackup(backup);
        await carregarStatus();
        if (onDataReload) onDataReload();
        setMensagemSucesso('Backup restaurado com sucesso! Todos os dados foram sincronizados.');
        setTimeout(() => setMensagemSucesso(null), 4000);
      } catch (err) {
        alert('Falha ao restaurar backup. Verifique se o arquivo JSON é válido.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const executarResetComSeguranca = async () => {
    if (palavraConfirmacao.trim().toUpperCase() !== 'ZERAR' || !aceitouTermo) {
      return;
    }
    setCarregando(true);
    try {
      await dataService.zerarBaseDeDados();
      await carregarStatus();
      if (onDataReset) onDataReset();
      setModalResetAberto(false);
      setPalavraConfirmacao('');
      setAceitouTermo(false);
      setMensagemSucesso('Banco de dados completamente zerado com sucesso! A base agora está 100% limpa.');
      setTimeout(() => setMensagemSucesso(null), 4000);
    } finally {
      setCarregando(false);
    }
  };

  const ddlSchemaText = `-- =============================================================================
-- MATÉRIA REATIVA - TABELAS DO BANCO DE DADOS RELACIONAL (POSTGRESQL / MYSQL)
-- =============================================================================

CREATE TABLE IF NOT EXISTS usuarios (
    id VARCHAR(50) PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    tipo_perfil VARCHAR(20) NOT NULL CHECK (tipo_perfil IN ('aluno', 'professor', 'administrador')),
    matricula VARCHAR(50),
    turma VARCHAR(50),
    departamento VARCHAR(100),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS produtos_quimicos (
    id VARCHAR(50) PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    cas_number VARCHAR(50) NOT NULL,
    formula_quimica VARCHAR(100) NOT NULL,
    massa_molar VARCHAR(50) NOT NULL,
    pureza VARCHAR(50) NOT NULL,
    classe_perigo VARCHAR(100) NOT NULL,
    cor_perigo VARCHAR(50) NOT NULL,
    situacao_legal VARCHAR(50) NOT NULL,
    estoque_atual DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    estoque_minimo DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    unidade VARCHAR(20) NOT NULL,
    validade_lote VARCHAR(50) NOT NULL,
    localizacao VARCHAR(100) NOT NULL,
    fornecedor_principal VARCHAR(150)
);

CREATE TABLE IF NOT EXISTS fornecedores (
    id VARCHAR(50) PRIMARY KEY,
    razao_social VARCHAR(150) NOT NULL,
    cnpj VARCHAR(50) NOT NULL UNIQUE,
    contato VARCHAR(100) NOT NULL,
    endereco VARCHAR(200) NOT NULL,
    email VARCHAR(150) NOT NULL,
    responsavel VARCHAR(100) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'Ativo'
);

CREATE TABLE IF NOT EXISTS estoque_lotes (
    id VARCHAR(50) PRIMARY KEY,
    produto_nome VARCHAR(150) NOT NULL,
    cas_number VARCHAR(50) NOT NULL,
    quantidade DECIMAL(10,2) NOT NULL,
    unidade VARCHAR(20) NOT NULL,
    estoque_minimo DECIMAL(10,2) NOT NULL,
    validade VARCHAR(50) NOT NULL,
    lote VARCHAR(50) NOT NULL,
    localizacao VARCHAR(100) NOT NULL,
    fornecedor VARCHAR(150) NOT NULL,
    status_lote VARCHAR(30) NOT NULL DEFAULT 'Normal'
);

CREATE TABLE IF NOT EXISTS solicitacoes_laboratorio (
    id VARCHAR(50) PRIMARY KEY,
    professor VARCHAR(150) NOT NULL,
    disciplina VARCHAR(100) NOT NULL,
    turma VARCHAR(50) NOT NULL,
    data_pratica DATE NOT NULL,
    horario VARCHAR(50) NOT NULL,
    reagentes_solicitados TEXT NOT NULL,
    observacoes TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'Em análise'
);

CREATE TABLE IF NOT EXISTS compras_pedidos (
    id VARCHAR(50) PRIMARY KEY,
    produto_nome VARCHAR(150) NOT NULL,
    quantidade_solicitada VARCHAR(50) NOT NULL,
    fornecedor_cotado VARCHAR(150) NOT NULL,
    valor_estimado DECIMAL(10,2) NOT NULL,
    data_pedido DATE NOT NULL,
    prazo_previsto VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'Cotação'
);

CREATE TABLE IF NOT EXISTS consumos_aluno (
    id VARCHAR(50) PRIMARY KEY,
    aluno_nome VARCHAR(150) NOT NULL,
    turma VARCHAR(50) NOT NULL,
    bancada VARCHAR(50) NOT NULL,
    pratica VARCHAR(150) NOT NULL,
    produto_nome VARCHAR(150) NOT NULL,
    quantidade_usada DECIMAL(10,2) NOT NULL,
    unidade VARCHAR(20) NOT NULL,
    data_registro DATE NOT NULL,
    hora_registro TIME NOT NULL,
    professor_orientador VARCHAR(150),
    observacoes TEXT,
    status_visto VARCHAR(30) NOT NULL DEFAULT 'Aguardando Visto'
);

CREATE TABLE IF NOT EXISTS ocorrencias_aluno (
    id VARCHAR(50) PRIMARY KEY,
    aluno_nome VARCHAR(150) NOT NULL,
    turma VARCHAR(50) NOT NULL,
    bancada VARCHAR(50) NOT NULL,
    tipo_ocorrencia VARCHAR(100) NOT NULL,
    reagente_envolvido VARCHAR(200),
    gravidade VARCHAR(50) NOT NULL,
    descricao TEXT NOT NULL,
    primeiros_socorros_adotados TEXT NOT NULL,
    data_ocorrencia DATE NOT NULL,
    hora_ocorrencia TIME NOT NULL,
    status_atendimento VARCHAR(30) NOT NULL DEFAULT 'Notificado'
);`;

  const stats = status?.stats;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. CABEÇALHO COM TÍTULO E ABAS ESTILIZADAS E BEM SEPARADAS */}
      <div className="bg-white rounded-2xl p-6 border border-zinc-200/80 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-5">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Database className="w-3.5 h-3.5" />
              Arquitetura de Dados DAL
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
              <Server className="w-3.5 h-3.5" />
              MySQL / PostgreSQL / SQLite
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
              <HardDrive className="w-3.5 h-3.5" />
              Persistência Ativa
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
            Central de Banco de Dados & Visões Detalhadas
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1 max-w-3xl leading-relaxed">
            Consulte a contagem em tempo real de todas as entidades cadastradas (produtos, alunos, professores, fornecedores e movimentações), exporte cópias de segurança (SQL e JSON) ou reinicialize a base de forma segura.
          </p>
        </div>

        {/* Abas com botões nítidos, espaçados e com contorno */}
        <div className="flex flex-wrap items-center gap-2 bg-zinc-100/90 p-1.5 rounded-xl border border-zinc-200/90 shrink-0">
          <button
            type="button"
            onClick={() => setAbaAtiva('status')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              abaAtiva === 'status'
                ? 'bg-white text-blue-600 shadow-sm border border-zinc-200/80'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/70'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>Visão Geral & Estatísticas</span>
          </button>

          <button
            type="button"
            onClick={() => setAbaAtiva('schema')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              abaAtiva === 'schema'
                ? 'bg-white text-blue-600 shadow-sm border border-zinc-200/80'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/70'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>Esquema SQL (DDL)</span>
          </button>

          <button
            type="button"
            onClick={() => setAbaAtiva('exportar')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              abaAtiva === 'exportar'
                ? 'bg-white text-blue-600 shadow-sm border border-zinc-200/80'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/70'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar & Backups</span>
          </button>

          <button
            type="button"
            onClick={() => setAbaAtiva('integracao')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              abaAtiva === 'integracao'
                ? 'bg-white text-blue-600 shadow-sm border border-zinc-200/80'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/70'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Guia MySQL / Cloud SQL</span>
          </button>
        </div>
      </div>

      {/* Notificação de Sucesso */}
      {mensagemSucesso && (
        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs sm:text-sm text-emerald-800 flex items-center gap-3 animate-in fade-in shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-medium">{mensagemSucesso}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 1: VISÃO GERAL & CONTAGEM DETALHADA POR ENTIDADE                     */}
      {/* ========================================================================= */}
      {abaAtiva === 'status' && (
        <div className="space-y-6">
          {/* BANNER DE PERSISTÊNCIA PERMANENTE */}
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-blue-800/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0 text-emerald-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <strong className="text-sm uppercase tracking-wider font-bold text-emerald-300">
                    Garantia de Persistência Permanente Ativa
                  </strong>
                </div>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  Seus dados continuam gravados com segurança
                </h3>
                <p className="text-xs text-blue-100/90 mt-1 max-w-2xl leading-relaxed">
                  Todas as inclusões, edições e cadastros são gravados instantaneamente no disco local do navegador e sincronizados com as tabelas relacionais do servidor. Mesmo que você feche o navegador ou desligue o computador, nada se perde.
                </p>
              </div>
            </div>

            <div className="flex flex-col items-start md:items-end shrink-0 gap-1 text-xs text-blue-200 bg-white/5 p-3 rounded-xl border border-white/10">
              <span className="text-[11px] text-blue-300">Status de Gravação:</span>
              <strong className="text-emerald-400 font-bold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> 100% Salvo & Sincronizado
              </strong>
              <span className="text-[10px] text-blue-300/80">Última checagem: {status?.ultimaSincronizacao || 'Agora'}</span>
            </div>
          </div>

          {/* GRADE DETALHADA DE ENTIDADES DO BANCO DE DADOS */}
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <div>
                <h2 className="text-base font-bold text-zinc-900">Visão Detalhada de Registros por Entidade</h2>
                <p className="text-xs text-zinc-500">Contagem de registros individuais cadastrados na base de dados</p>
              </div>
              <button
                onClick={carregarStatus}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Atualizar Contadores</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
              {/* Card 1: Produtos Químicos */}
              <div className="bg-white rounded-2xl p-6 border border-zinc-200/90 shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[175px] group">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-400 group-hover:h-1.5 transition-all" />
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-2xs group-hover:scale-105 transition-transform">
                    <FlaskConical className="w-6 h-6" />
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    Catálogo
                  </span>
                </div>
                <div className="my-2">
                  <div className="text-3xl sm:text-4xl font-black text-zinc-900 tracking-tight font-mono">{stats?.produtos || 0}</div>
                  <span className="text-sm font-bold text-zinc-800 block mt-0.5">Produtos Químicos</span>
                </div>
                <div className="pt-2.5 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500">
                  <span>Reagentes & FISPQ</span>
                  <span className="text-blue-600 font-semibold group-hover:translate-x-0.5 transition-transform">&rarr;</span>
                </div>
              </div>

              {/* Card 2: Alunos (Clicável para Gestão de Contas e Senhas) */}
              <div
                onClick={() => onNavigateToUsuarios && onNavigateToUsuarios('aluno')}
                className="bg-white rounded-2xl p-6 border border-zinc-200/90 shadow-xs hover:shadow-lg hover:-translate-y-1 hover:border-indigo-300 transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[175px] group cursor-pointer"
                title="Clique para abrir a gestão de contas dos alunos e apoiar com senhas"
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 group-hover:h-1.5 transition-all" />
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shadow-2xs group-hover:scale-105 transition-transform">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                    Discentes
                  </span>
                </div>
                <div className="my-2">
                  <div className="text-3xl sm:text-4xl font-black text-zinc-900 tracking-tight font-mono">{stats?.alunos || 0}</div>
                  <span className="text-sm font-bold text-zinc-800 block mt-0.5">Alunos Cadastrados</span>
                </div>
                <div className="pt-2.5 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500">
                  <span className="text-indigo-600 font-bold group-hover:underline">Gerenciar contas & senhas</span>
                  <span className="text-indigo-600 font-bold group-hover:translate-x-1 transition-transform">&rarr;</span>
                </div>
              </div>

              {/* Card 3: Professores / Docentes (Clicável para Gestão de Acessos) */}
              <div
                onClick={() => onNavigateToUsuarios && onNavigateToUsuarios('professor')}
                className="bg-white rounded-2xl p-6 border border-zinc-200/90 shadow-xs hover:shadow-lg hover:-translate-y-1 hover:border-purple-300 transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[175px] group cursor-pointer"
                title="Clique para abrir a gestão de contas docentes"
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-pink-500 group-hover:h-1.5 transition-all" />
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 shadow-2xs group-hover:scale-105 transition-transform">
                    <Users className="w-6 h-6" />
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                    Docentes
                  </span>
                </div>
                <div className="my-2">
                  <div className="text-3xl sm:text-4xl font-black text-zinc-900 tracking-tight font-mono">{stats?.professores || 0}</div>
                  <span className="text-sm font-bold text-zinc-800 block mt-0.5">Professores / Gestores</span>
                </div>
                <div className="pt-2.5 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500">
                  <span className="text-purple-600 font-bold group-hover:underline">Ver contas e acessos</span>
                  <span className="text-purple-600 font-bold group-hover:translate-x-1 transition-transform">&rarr;</span>
                </div>
              </div>

              {/* Card 4: Fornecedores */}
              <div className="bg-white rounded-2xl p-6 border border-zinc-200/90 shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[175px] group">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400 group-hover:h-1.5 transition-all" />
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-2xs group-hover:scale-105 transition-transform">
                    <Truck className="w-6 h-6" />
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Parceiros
                  </span>
                </div>
                <div className="my-2">
                  <div className="text-3xl sm:text-4xl font-black text-zinc-900 tracking-tight font-mono">{stats?.fornecedores || 0}</div>
                  <span className="text-sm font-bold text-zinc-800 block mt-0.5">Fornecedores</span>
                </div>
                <div className="pt-2.5 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500">
                  <span>Empresas homologadas</span>
                  <span className="text-emerald-600 font-semibold group-hover:translate-x-0.5 transition-transform">&rarr;</span>
                </div>
              </div>

              {/* Card 5: Lotes em Estoque */}
              <div className="bg-white rounded-2xl p-6 border border-zinc-200/90 shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[175px] group">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-400 group-hover:h-1.5 transition-all" />
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shadow-2xs group-hover:scale-105 transition-transform">
                    <Boxes className="w-6 h-6" />
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Físico
                  </span>
                </div>
                <div className="my-2">
                  <div className="text-3xl sm:text-4xl font-black text-zinc-900 tracking-tight font-mono">{stats?.estoque || 0}</div>
                  <span className="text-sm font-bold text-zinc-800 block mt-0.5">Lotes de Estoque</span>
                </div>
                <div className="pt-2.5 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500">
                  <span>Frascos & almoxarifado</span>
                  <span className="text-amber-600 font-semibold group-hover:translate-x-0.5 transition-transform">&rarr;</span>
                </div>
              </div>

              {/* Card 6: Solicitações de Prática */}
              <div className="bg-white rounded-2xl p-6 border border-zinc-200/90 shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[175px] group">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-500 to-blue-500 group-hover:h-1.5 transition-all" />
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100 shadow-2xs group-hover:scale-105 transition-transform">
                    <FileText className="w-6 h-6" />
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-sky-50 text-sky-700 border border-sky-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                    Aulas
                  </span>
                </div>
                <div className="my-2">
                  <div className="text-3xl sm:text-4xl font-black text-zinc-900 tracking-tight font-mono">{stats?.solicitacoes || 0}</div>
                  <span className="text-sm font-bold text-zinc-800 block mt-0.5">Solicitações Docentes</span>
                </div>
                <div className="pt-2.5 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500">
                  <span>Práticas laboratoriais</span>
                  <span className="text-sky-600 font-semibold group-hover:translate-x-0.5 transition-transform">&rarr;</span>
                </div>
              </div>

              {/* Card 7: Compras e Cotações */}
              <div className="bg-white rounded-2xl p-6 border border-zinc-200/90 shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[175px] group">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-pink-500 group-hover:h-1.5 transition-all" />
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 shadow-2xs group-hover:scale-105 transition-transform">
                    <ShoppingCart className="w-6 h-6" />
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    Compras
                  </span>
                </div>
                <div className="my-2">
                  <div className="text-3xl sm:text-4xl font-black text-zinc-900 tracking-tight font-mono">{stats?.compras || 0}</div>
                  <span className="text-sm font-bold text-zinc-800 block mt-0.5">Pedidos de Compra</span>
                </div>
                <div className="pt-2.5 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500">
                  <span>Cotações e pedidos</span>
                  <span className="text-rose-600 font-semibold group-hover:translate-x-0.5 transition-transform">&rarr;</span>
                </div>
              </div>

              {/* Card 8: Consumos de Bancada */}
              <div className="bg-white rounded-2xl p-6 border border-zinc-200/90 shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[175px] group">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 to-emerald-400 group-hover:h-1.5 transition-all" />
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100 shadow-2xs group-hover:scale-105 transition-transform">
                    <Send className="w-6 h-6" />
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                    Consumo
                  </span>
                </div>
                <div className="my-2">
                  <div className="text-3xl sm:text-4xl font-black text-zinc-900 tracking-tight font-mono">{stats?.consumosAluno || 0}</div>
                  <span className="text-sm font-bold text-zinc-800 block mt-0.5">Registros de Bancada</span>
                </div>
                <div className="pt-2.5 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500">
                  <span>Apontamento dos alunos</span>
                  <span className="text-teal-600 font-semibold group-hover:translate-x-0.5 transition-transform">&rarr;</span>
                </div>
              </div>
            </div>

            {/* BANNER DE ATALHO RÁPIDO PARA GESTÃO DE CONTAS & SENHAS (EXCLUSIVO DOCENTE) */}
            <div className="mt-5 bg-gradient-to-r from-indigo-50 via-purple-50 to-blue-50 rounded-2xl p-5 border border-indigo-200/90 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full border border-indigo-200">
                      Módulo Exclusivo do Professor
                    </span>
                    <span className="text-xs font-semibold text-zinc-600">
                      {(stats?.alunos || 0) + (stats?.professores || 0)} contas registradas no laboratório
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-zinc-900 mt-1">
                    Auditoria de Contas, Controle de Entradas & Recuperação de Senhas
                  </h4>
                  <p className="text-xs text-zinc-600 mt-0.5 max-w-2xl leading-relaxed">
                    Acesse todos os dados de quem entrou ou se cadastrou, visualize e copie senhas em texto puro, ou redefina credenciais com 1 clique para ajudar alunos na bancada.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <button
                  type="button"
                  onClick={() => onNavigateToUsuarios && onNavigateToUsuarios('aluno')}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs hover:shadow-md transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>Alunos ({stats?.alunos || 0})</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateToUsuarios && onNavigateToUsuarios('professor')}
                  className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs hover:shadow-md transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Professores ({stats?.professores || 0})</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateToUsuarios && onNavigateToUsuarios('todos')}
                  className="px-3.5 py-2 rounded-xl bg-white hover:bg-zinc-100 text-zinc-800 border border-zinc-200 text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>Ver Todas as Contas &rarr;</span>
                </button>
              </div>
            </div>
          </div>

          {/* TABELA DE ESTRUTURA RELACIONAL */}
          <div className="bg-white rounded-2xl p-6 border border-zinc-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                  <Table className="w-4 h-4 text-blue-600" />
                  <span>Dicionário das Tabelas Relacionais do Sistema</span>
                </h3>
                <p className="text-xs text-zinc-500">Estrutura interna das 8 tabelas disponíveis para consulta e exportação</p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-zinc-100 text-zinc-800 border border-zinc-200 self-start sm:self-auto">
                Total Geral: {stats?.totalGeral || 0} registros
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 text-zinc-500 font-semibold bg-zinc-50/50">
                    <th className="py-2.5 px-3">Tabela</th>
                    <th className="py-2.5 px-3">Chave Primária</th>
                    <th className="py-2.5 px-3">Registros Atuais</th>
                    <th className="py-2.5 px-3">Finalidade</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  <tr>
                    <td className="py-2.5 px-3 font-mono font-bold text-blue-700">produtos_quimicos</td>
                    <td className="py-2.5 px-3 font-mono text-zinc-500">id (VARCHAR)</td>
                    <td className="py-2.5 px-3 font-bold text-zinc-900">{stats?.produtos || 0}</td>
                    <td className="py-2.5 px-3 text-zinc-600">Catálogo geral de reagentes, CAS, FISPQ e controle legal</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        (stats?.produtos || 0) > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-500'
                      }`}>
                        {(stats?.produtos || 0) > 0 ? 'Ativo' : 'Zerado'}
                      </span>
                    </td>
                  </tr>
                  <tr
                    onClick={() => onNavigateToUsuarios && onNavigateToUsuarios('todos')}
                    className="hover:bg-blue-50/50 cursor-pointer transition group"
                    title="Clique para gerenciar todas as contas e credenciais de usuários"
                  >
                    <td className="py-2.5 px-3 font-mono font-bold text-blue-700 flex items-center gap-1.5">
                      <span>usuarios</span>
                      <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-sans font-semibold group-hover:bg-blue-600 group-hover:text-white transition">
                        Gerenciar Contas &rarr;
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-zinc-500">id (VARCHAR)</td>
                    <td className="py-2.5 px-3 font-bold text-zinc-900">{(stats?.alunos || 0) + (stats?.professores || 0)}</td>
                    <td className="py-2.5 px-3 text-zinc-600">Autenticação, perfis acadêmicos (alunos e professores)</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        ((stats?.alunos || 0) + (stats?.professores || 0)) > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-500'
                      }`}>
                        {((stats?.alunos || 0) + (stats?.professores || 0)) > 0 ? 'Ativo' : 'Zerado'}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-mono font-bold text-blue-700">fornecedores</td>
                    <td className="py-2.5 px-3 font-mono text-zinc-500">id (VARCHAR)</td>
                    <td className="py-2.5 px-3 font-bold text-zinc-900">{stats?.fornecedores || 0}</td>
                    <td className="py-2.5 px-3 text-zinc-600">Empresas parceiras homologadas, CNPJ e contatos</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        (stats?.fornecedores || 0) > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-500'
                      }`}>
                        {(stats?.fornecedores || 0) > 0 ? 'Ativo' : 'Zerado'}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-mono font-bold text-blue-700">estoque_lotes</td>
                    <td className="py-2.5 px-3 font-mono text-zinc-500">id (VARCHAR)</td>
                    <td className="py-2.5 px-3 font-bold text-zinc-900">{stats?.estoque || 0}</td>
                    <td className="py-2.5 px-3 text-zinc-600">Controle físico de frascos, lotes, validade e locais</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        (stats?.estoque || 0) > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-500'
                      }`}>
                        {(stats?.estoque || 0) > 0 ? 'Ativo' : 'Zerado'}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-mono font-bold text-blue-700">solicitacoes_laboratorio</td>
                    <td className="py-2.5 px-3 font-mono text-zinc-500">id (VARCHAR)</td>
                    <td className="py-2.5 px-3 font-bold text-zinc-900">{stats?.solicitacoes || 0}</td>
                    <td className="py-2.5 px-3 text-zinc-600">Reagentes reservados para práticas pedagógicas</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        (stats?.solicitacoes || 0) > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-500'
                      }`}>
                        {(stats?.solicitacoes || 0) > 0 ? 'Ativo' : 'Zerado'}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-mono font-bold text-blue-700">compras_pedidos</td>
                    <td className="py-2.5 px-3 font-mono text-zinc-500">id (VARCHAR)</td>
                    <td className="py-2.5 px-3 font-bold text-zinc-900">{stats?.compras || 0}</td>
                    <td className="py-2.5 px-3 text-zinc-600">Ordens de compra, cotações e orçamentos do lab</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        (stats?.compras || 0) > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-500'
                      }`}>
                        {(stats?.compras || 0) > 0 ? 'Ativo' : 'Zerado'}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-mono font-bold text-blue-700">consumos_aluno</td>
                    <td className="py-2.5 px-3 font-mono text-zinc-500">id (VARCHAR)</td>
                    <td className="py-2.5 px-3 font-bold text-zinc-900">{stats?.consumosAluno || 0}</td>
                    <td className="py-2.5 px-3 text-zinc-600">Apontamento de uso de reagentes pelos estudantes</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        (stats?.consumosAluno || 0) > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-500'
                      }`}>
                        {(stats?.consumosAluno || 0) > 0 ? 'Ativo' : 'Zerado'}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-mono font-bold text-blue-700">ocorrencias_aluno</td>
                    <td className="py-2.5 px-3 font-mono text-zinc-500">id (VARCHAR)</td>
                    <td className="py-2.5 px-3 font-bold text-zinc-900">{stats?.ocorrenciasAluno || 0}</td>
                    <td className="py-2.5 px-3 text-zinc-600">Canal de emergência SOS, respingos e acidentes</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        (stats?.ocorrenciasAluno || 0) > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-500'
                      }`}>
                        {(stats?.ocorrenciasAluno || 0) > 0 ? 'Ativo' : 'Zerado'}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ZONA DE SEGURANÇA: RESET CONTROLADO DO BANCO */}
          <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 border border-rose-200">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-rose-950">Zona de Manutenção Crítica: Reset do Banco de Dados</h3>
                <p className="text-xs text-rose-700 mt-0.5 max-w-2xl leading-relaxed">
                  Caso queira recomeçar seus testes totalmente do zero, você pode limpar toda a base. O procedimento conta com dupla confirmação de segurança para evitar exclusões acidentais.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setPalavraConfirmacao('');
                setAceitouTermo(false);
                setModalResetAberto(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer shrink-0"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Resetar Banco de Dados</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: ESQUEMA DDL (schema.sql)                                           */}
      {/* ========================================================================= */}
      {abaAtiva === 'schema' && (
        <div className="bg-white rounded-2xl p-6 border border-zinc-200/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-100">
            <div>
              <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                <Code className="w-4 h-4 text-blue-600" />
                <span>Arquivo DDL Relacional (schema.sql)</span>
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Execute este script no seu phpMyAdmin (XAMPP), pgAdmin (PostgreSQL) ou Cloud SQL para criar as tabelas.
              </p>
            </div>

            <button
              onClick={() => {
                navigator.clipboard.writeText(ddlSchemaText);
                setCopiadoSchema(true);
                setTimeout(() => setCopiadoSchema(false), 2000);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl text-xs font-bold transition cursor-pointer self-start sm:self-auto"
            >
              {copiadoSchema ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copiadoSchema ? 'Schema Copiado!' : 'Copiar Script SQL'}</span>
            </button>
          </div>

          <div className="bg-zinc-950 text-zinc-100 p-5 rounded-2xl font-mono text-xs overflow-x-auto max-h-[460px] leading-relaxed border border-zinc-800 shadow-inner">
            <pre>{ddlSchemaText}</pre>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 3: EXPORTAR E BACKUP                                                  */}
      {/* ========================================================================= */}
      {abaAtiva === 'exportar' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Exportação SQL Dump */}
          <div className="bg-white rounded-2xl p-6 border border-zinc-200/80 shadow-xs space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900">Dump SQL Completo</h3>
                  <p className="text-xs text-zinc-500">Exporta comandos SQL INSERT para migração direta.</p>
                </div>
              </div>

              <p className="text-xs text-zinc-600 leading-relaxed">
                Gera um arquivo <code className="bg-zinc-100 px-1 py-0.5 rounded font-mono">.sql</code> pronto com todos os registros atuais formatados para importação em bancos MySQL, PostgreSQL ou MariaDB.
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                onClick={handleExportarSQL}
                disabled={carregando}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#2F80ED] hover:bg-blue-600 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Baixar Dump SQL (.sql)</span>
              </button>

              <button
                onClick={handleCopiarSQL}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-xs font-bold transition cursor-pointer"
                title="Copiar SQL para área de transferência"
              >
                {copiadoSQL ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copiadoSQL ? 'Copiado!' : 'Copiar'}</span>
              </button>
            </div>
          </div>

          {/* Backup e Restauração JSON */}
          <div className="bg-white rounded-2xl p-6 border border-zinc-200/80 shadow-xs space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900">Backup & Restauração JSON</h3>
                  <p className="text-xs text-zinc-500">Arquivo portátil estruturado para proteção de dados.</p>
                </div>
              </div>

              <p className="text-xs text-zinc-600 leading-relaxed">
                Baixe um arquivo de segurança completo ou restaure um arquivo anteriormente salvo para recuperar instantaneamente seu laboratório.
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5 pt-2">
              <button
                onClick={handleExportarJSON}
                disabled={carregando}
                className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Baixar Backup (.json)</span>
              </button>

              <label className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl text-xs font-bold transition cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>Restaurar (.json)</span>
                <input type="file" accept=".json" onChange={handleImportarJSON} className="hidden" />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 4: GUIA DE CONEXÃO COM BANCO REAL                                     */}
      {/* ========================================================================= */}
      {abaAtiva === 'integracao' && (
        <div className="bg-white rounded-2xl p-6 border border-zinc-200/80 shadow-xs space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-zinc-100">
            <Server className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-zinc-900">Como Conectar com um Banco de Dados Relacional Externo</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
            <div className="p-5 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3">
              <span className="w-7 h-7 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                1
              </span>
              <strong className="block text-zinc-900 text-sm font-bold">Criar o Banco & Tabelas</strong>
              <p className="text-zinc-600 leading-relaxed">
                Abra o arquivo <code className="bg-white px-1.5 py-0.5 rounded border font-mono">src/db/schema.sql</code> e execute no seu phpMyAdmin (XAMPP), Workbench ou PostgreSQL.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3">
              <span className="w-7 h-7 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                2
              </span>
              <strong className="block text-zinc-900 text-sm font-bold">Definir Conexão no .env</strong>
              <p className="text-zinc-600 leading-relaxed">
                Insira as credenciais do seu banco no arquivo <code className="bg-white px-1.5 py-0.5 rounded border font-mono">.env</code>:
                <br />
                <span className="font-mono text-[11px] text-blue-700 block mt-2 p-2 bg-white rounded border">
                  DATABASE_URL="mysql://root:@localhost:3306/materia_reativa"
                </span>
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3">
              <span className="w-7 h-7 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                3
              </span>
              <strong className="block text-zinc-900 text-sm font-bold">Sincronização em Tempo Real</strong>
              <p className="text-zinc-600 leading-relaxed">
                Ao rodar o servidor Node.js com <code className="bg-white px-1.5 py-0.5 rounded border font-mono">iniciar.bat</code> ou <code className="bg-white px-1.5 py-0.5 rounded border font-mono">npm run dev</code>, todas as operações da interface são replicadas em tempo real!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE SEGURANÇA: REVISÃO DE RESET DO BANCO DE DADOS                    */}
      {/* ========================================================================= */}
      {modalResetAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Topo de Perigo */}
            <div className="bg-rose-600 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Confirmação de Segurança</h3>
                  <p className="text-xs text-rose-100">Ação irreversível de reset do banco de dados</p>
                </div>
              </div>
              <button
                onClick={() => setModalResetAberto(false)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Conteúdo com Detalhamento dos Registros que serão Excluídos */}
            <div className="p-6 space-y-4">
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-2">
                <p className="font-bold">
                  Atenção: Ao confirmar, os seguintes dados serão permanentemente excluídos:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-rose-700">
                  <li><strong>{stats?.produtos || 0}</strong> produtos químicos cadastrados</li>
                  <li><strong>{stats?.alunos || 0}</strong> contas de alunos e <strong>{stats?.professores || 0}</strong> professores</li>
                  <li><strong>{stats?.fornecedores || 0}</strong> empresas fornecedoras</li>
                  <li><strong>{stats?.estoque || 0}</strong> lotes de estoque</li>
                  <li><strong>{stats?.solicitacoes || 0}</strong> solicitações de prática e <strong>{stats?.compras || 0}</strong> pedidos de compra</li>
                  <li><strong>{stats?.consumosAluno || 0}</strong> registros de bancada e <strong>{stats?.ocorrenciasAluno || 0}</strong> incidentes</li>
                </ul>
              </div>

              {/* Opção recomendada de backup */}
              <div className="flex items-center justify-between p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs">
                <span className="text-zinc-600">Deseja guardar uma cópia antes de limpar?</span>
                <button
                  type="button"
                  onClick={handleExportarJSON}
                  className="px-3 py-1.5 rounded-lg bg-white hover:bg-zinc-100 text-blue-600 font-bold border border-zinc-200 transition cursor-pointer flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar Backup</span>
                </button>
              </div>

              {/* Termo de Consentimento */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-zinc-200 bg-zinc-50/50 text-xs text-zinc-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={aceitouTermo}
                  onChange={(e) => setAceitouTermo(e.target.checked)}
                  className="w-4 h-4 mt-0.5 text-rose-600 rounded border-zinc-300 focus:ring-rose-500"
                />
                <span className="leading-relaxed">
                  Estou plenamente ciente de que esta ação é irreversível e deixará todo o sistema 100% zerado em branco.
                </span>
              </label>

              {/* Campo para Digitar a Palavra de Confirmação ZERAR */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 block">
                  Para desbloquear o botão, digite a palavra <strong className="text-rose-600 uppercase">ZERAR</strong> abaixo:
                </label>
                <input
                  type="text"
                  value={palavraConfirmacao}
                  onChange={(e) => setPalavraConfirmacao(e.target.value)}
                  placeholder="Digite ZERAR"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 text-sm font-mono uppercase font-bold outline-hidden transition"
                />
              </div>
            </div>

            {/* Rodapé de Ações */}
            <div className="p-5 bg-zinc-50 border-t border-zinc-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setModalResetAberto(false)}
                className="px-4 py-2.5 rounded-xl bg-white hover:bg-zinc-100 text-zinc-700 text-xs font-bold border border-zinc-200 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executarResetComSeguranca}
                disabled={carregando || palavraConfirmacao.trim().toUpperCase() !== 'ZERAR' || !aceitouTermo}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition ${
                  palavraConfirmacao.trim().toUpperCase() === 'ZERAR' && aceitouTermo && !carregando
                    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-md active:scale-95 cursor-pointer'
                    : 'bg-zinc-200 text-zinc-400 cursor-not-allowed border border-zinc-300'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${carregando ? 'animate-spin' : ''}`} />
                <span>{carregando ? 'Zerando base...' : 'Confirmar e Zerar Todo o Banco'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
