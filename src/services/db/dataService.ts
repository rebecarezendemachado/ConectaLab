// =============================================================================
// MATÉRIA REATIVA - CAMADA CENTRAL DE SERVIÇO DE DADOS & REPOSITÓRIO (DAL)
// SISTEMA ZERADO (EMPTY-STATE) - INTEGRAÇÃO PREPARADA E ATIVA COM MYSQL / REST API
// =============================================================================

import {
  ProdutoQuimico,
  Fornecedor,
  SolicitacaoLaboratorio,
  CompraItem,
  EstoqueItem,
  RegistroConsumoAluno,
  RelatoOcorrenciaAluno,
  Usuario,
  AlertaNotificacao,
  TurmaSala,
  DocumentoArquivo,
  CompraCotacao
} from '../../types';
import {
  initialProdutos,
  initialFornecedores,
  initialSolicitacoes,
  initialCompras,
  initialEstoque,
  initialConsumosAluno,
  initialOcorrenciasAluno,
  initialUsuarios
} from '../../data/initialData';
import { DatabaseBackup, DatabaseConnectionStatus, DatabaseDetailedStats, IRepository } from './types';

const STORAGE_VERSION_KEY = 'materia_reativa_db_v12_zerado_completo';

const STORAGE_KEYS = {
  USUARIOS: 'materia_reativa_db_usuarios',
  PRODUTOS: 'materia_reativa_db_produtos',
  FORNECEDORES: 'materia_reativa_db_fornecedores',
  SOLICITACOES: 'materia_reativa_db_solicitacoes',
  COMPRAS: 'materia_reativa_db_compras',
  ESTOQUE: 'materia_reativa_db_estoque',
  CONSUMOS_ALUNO: 'materia_reativa_db_consumos_aluno',
  OCORRENCIAS_ALUNO: 'materia_reativa_db_ocorrencias_aluno',
  SESSAO_USUARIO: 'materia_reativa_sessao_ativa',
  ULTIMA_SINCRONIZACAO: 'materia_reativa_db_sync_time'
};

// Procedimento de limpeza forçada para garantir que o sistema inicie totalmente zerado
const purgarDadosLegadosSeNecessario = () => {
  try {
    const versao = localStorage.getItem(STORAGE_VERSION_KEY);
    if (!versao) {
      localStorage.removeItem(STORAGE_KEYS.USUARIOS);
      localStorage.removeItem(STORAGE_KEYS.PRODUTOS);
      localStorage.removeItem(STORAGE_KEYS.FORNECEDORES);
      localStorage.removeItem(STORAGE_KEYS.SOLICITACOES);
      localStorage.removeItem(STORAGE_KEYS.COMPRAS);
      localStorage.removeItem(STORAGE_KEYS.ESTOQUE);
      localStorage.removeItem(STORAGE_KEYS.CONSUMOS_ALUNO);
      localStorage.removeItem(STORAGE_KEYS.OCORRENCIAS_ALUNO);
      localStorage.removeItem('materia_reativa_email');
      localStorage.removeItem(STORAGE_KEYS.SESSAO_USUARIO);
      localStorage.removeItem('materia_reativa_avatar_url');
      localStorage.setItem(STORAGE_VERSION_KEY, '12.0');
    }
  } catch (e) {
    console.warn('[DataService] Aviso ao inicializar storage limpo:', e);
  }
};

purgarDadosLegadosSeNecessario();

// =============================================================================
// COMUNICAÇÃO COM O SERVIDOR CENTRAL
// Todos os dados compartilhados vivem no banco do servidor. O navegador NÃO guarda
// cópia local desses dados (isso causava "só aparece no aparelho onde foi cadastrado").
// A identificação do usuário é um cookie HttpOnly emitido pelo servidor.
// =============================================================================
export class ErroApi extends Error {
  status: number;
  constructor(mensagem: string, status: number) {
    super(mensagem);
    this.name = 'ErroApi';
    this.status = status;
  }
}

const avisarErro = (mensagem: string) => {
  try {
    window.dispatchEvent(new CustomEvent('mr:erro-api', { detail: mensagem }));
  } catch {
    /* ambiente sem window */
  }
};

async function chamarApi<R = any>(url: string, opcoes: RequestInit = {}, silencioso = false): Promise<R> {
  let res: Response;
  try {
    res = await fetch(url, {
      credentials: 'same-origin',
      ...opcoes,
      headers: {
        Accept: 'application/json',
        ...(opcoes.body ? { 'Content-Type': 'application/json' } : {}),
        ...((opcoes.headers as Record<string, string>) || {})
      }
    });
  } catch {
    const msg = 'Sem conexão com o servidor. Verifique a internet e tente novamente.';
    if (!silencioso) avisarErro(msg);
    throw new ErroApi(msg, 0);
  }
  let corpo: any = null;
  try {
    corpo = await res.json();
  } catch {
    /* resposta sem corpo */
  }
  if (!res.ok) {
    const msg =
      corpo?.error ||
      (res.status === 401
        ? 'Sua sessão expirou. Faça login novamente.'
        : res.status === 403
        ? 'Você não tem permissão para realizar esta operação.'
        : 'Não foi possível concluir a operação.');
    if (res.status === 401 && !url.startsWith('/api/auth/')) {
      // sessão vencida: o App volta para o login e retorna à mesma tela depois
      try {
        localStorage.removeItem(STORAGE_KEYS.SESSAO_USUARIO);
        window.dispatchEvent(new CustomEvent('mr:sessao-expirada'));
      } catch {
        /* ignora */
      }
    } else if (!silencioso) {
      avisarErro(msg);
    }
    throw new ErroApi(msg, res.status);
  }
  try {
    localStorage.setItem(STORAGE_KEYS.ULTIMA_SINCRONIZACAO, new Date().toISOString());
  } catch {
    /* ignora */
  }
  return corpo as R;
}

// Repositório central: lê e grava SEMPRE no servidor (o servidor valida a permissão de cada operação)
class RepositorioCentral<T extends { id: string }> implements IRepository<T> {
  private apiEndpoint: string;

  constructor(apiEndpoint: string) {
    this.apiEndpoint = apiEndpoint;
  }

  async listar(): Promise<T[]> {
    try {
      const dados = await chamarApi<T[]>(this.apiEndpoint, {}, true);
      return Array.isArray(dados) ? dados : [];
    } catch (e) {
      // Sem permissão para listar (ex.: aluno em área de gestão) = lista vazia, sem alarme.
      // Falha de rede: avisa uma vez e devolve vazio, sem inventar dados locais.
      if (e instanceof ErroApi && e.status === 0) avisarErro(e.message);
      return [];
    }
  }

  async obterPorId(id: string): Promise<T | null> {
    const todos = await this.listar();
    return todos.find((it) => it.id === id) || null;
  }

  async criar(item: T): Promise<T> {
    const salvo = await chamarApi<T>(this.apiEndpoint, { method: 'POST', body: JSON.stringify(item) });
    return salvo && typeof salvo === 'object' && (salvo as any).id ? salvo : item;
  }

  async atualizar(item: T): Promise<T> {
    const salvo = await chamarApi<T>(this.apiEndpoint, { method: 'POST', body: JSON.stringify(item) });
    return salvo && typeof salvo === 'object' && (salvo as any).id ? salvo : item;
  }

  async deletar(id: string): Promise<boolean> {
    await chamarApi(`${this.apiEndpoint}/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return true;
  }

  // Dados compartilhados não podem ser trocados em massa pelo navegador.
  substituirTodos(_dados: T[]): void {
    throw new ErroApi('Esta operação em massa foi desativada: os dados ficam no banco central.', 405);
  }

  limpar(): void {
    throw new ErroApi('Esta operação foi desativada: os dados ficam no banco central.', 405);
  }
}

// Remove a sessão local apenas se ela ainda for a mesma que existia quando a
// operação começou. Evita que uma resposta atrasada (logout/validação) apague
// o login novo feito logo em seguida — era o que impedia entrar de novo.
function limparSessaoSeNaoMudou(anterior: string | null): void {
  try {
    if (localStorage.getItem(STORAGE_KEYS.SESSAO_USUARIO) === anterior) {
      localStorage.removeItem(STORAGE_KEYS.SESSAO_USUARIO);
    }
  } catch {
    /* ambiente sem localStorage */
  }
}

function lerSessaoBruta(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.SESSAO_USUARIO);
  } catch {
    return null;
  }
}

// Instâncias dos repositórios, ligadas aos endpoints do servidor central
const repoUsuarios = new RepositorioCentral<Usuario>('/api/usuarios');
const repoProdutos = new RepositorioCentral<ProdutoQuimico>('/api/produtos');
const repoFornecedores = new RepositorioCentral<Fornecedor>('/api/fornecedores');
const repoSolicitacoes = new RepositorioCentral<SolicitacaoLaboratorio>('/api/solicitacoes');
const repoCompras = new RepositorioCentral<CompraItem>('/api/compras');
const repoEstoque = new RepositorioCentral<EstoqueItem>('/api/estoque');
const repoConsumosAluno = new RepositorioCentral<RegistroConsumoAluno>('/api/consumos');
const repoOcorrenciasAluno = new RepositorioCentral<RelatoOcorrenciaAluno>('/api/ocorrencias');
const repoAlertas = new RepositorioCentral<AlertaNotificacao>('/api/alertas');

// SERVIÇO PRINCIPAL DE BANCO DE DADOS
export const dataService = {
  usuarios: repoUsuarios,
  produtos: repoProdutos,
  fornecedores: repoFornecedores,
  solicitacoes: repoSolicitacoes,
  compras: repoCompras,
  estoque: repoEstoque,
  consumosAluno: repoConsumosAluno,
  ocorrenciasAluno: repoOcorrenciasAluno,
  alertas: repoAlertas,

  async listarAlertasDinamicosDescartados(): Promise<string[]> {
    try {
      const ids = await chamarApi<string[]>('/api/alertas/descartados', {}, true);
      return Array.isArray(ids) ? ids : [];
    } catch {
      return [];
    }
  },

  async dispensarAlertaDinamico(id: string): Promise<void> {
    await chamarApi(`/api/alertas/${encodeURIComponent(id)}/dispensar`, { method: 'POST' });
  },

  // Registra consumo real, abate do estoque do produto e gera avisos/alertas
  async registrarConsumoEAbater(dados: {
    produtoNome: string;
    quantidade: number;
    unidade?: string;
    autorNome: string;
    autorPerfil: 'aluno' | 'professor';
    turma?: string;
    bancada?: string;
    pratica?: string;
    observacoes?: string;
    alunoId?: string;
  }): Promise<{ produto: ProdutoQuimico | null; alerta: AlertaNotificacao }> {
    // O servidor faz tudo em uma transação (baixa do produto e do lote, registro do consumo,
    // alerta para os destinatários certos e auditoria). Autor e perfil vêm da sessão, não daqui.
    const resp = await chamarApi<{ produto: any; alerta: AlertaNotificacao }>('/api/operacoes/consumo', {
      method: 'POST',
      body: JSON.stringify({
        produtoNome: dados.produtoNome,
        quantidade: dados.quantidade,
        unidade: dados.unidade,
        turma: dados.turma,
        bancada: dados.bancada,
        pratica: dados.pratica,
        observacoes: dados.observacoes,
        alunoId: dados.alunoId
      })
    });
    return { produto: resp.produto ? ({ ...resp.produto } as ProdutoQuimico) : null, alerta: resp.alerta };
  },

  // Gestão de Sessão do Usuário Conectado
  obterSessao(): Usuario | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SESSAO_USUARIO);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  salvarSessao(usuario: Usuario): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SESSAO_USUARIO, JSON.stringify(usuario));
    } catch (e) {
      console.warn('Erro ao salvar sessão:', e);
    }
  },

  encerrarSessao(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.SESSAO_USUARIO);
    } catch (e) {
      console.warn('Erro ao encerrar sessão:', e);
    }
  },

  // O servidor confere e-mail e senha (com hash) e inicia a sessão por cookie HttpOnly
  async entrar(email: string, senha: string, perfil: 'aluno' | 'professor', lembrar = false): Promise<Usuario> {
    const r = await chamarApi<{ usuario: Usuario }>(
      '/api/auth/login',
      { method: 'POST', body: JSON.stringify({ email, senha, perfil, lembrar }) },
      true
    );
    dataService.salvarSessao(r.usuario);
    return r.usuario;
  },

  async entrarComoAdministradora(email: string, senha: string, lembrar = false): Promise<Usuario> {
    const usuario = await this.entrar(email, senha, 'professor', lembrar);
    if (usuario.tipoPerfil === 'administrador') return usuario;
    await this.sair();
    throw new ErroApi('Esta conta não tem acesso administrativo. Use o e-mail e a senha da Kátia.', 403);
  },

  async turmasPublicas(): Promise<{ id: string; nome: string; anoLetivo: string }[]> {
    return chamarApi('/api/auth/turmas', {}, true);
  },

  async statusAdministradora(): Promise<{ configurada: boolean }> {
    return chamarApi('/api/auth/admin-status', {}, true);
  },

  async listarTurmas(): Promise<TurmaSala[]> {
    return chamarApi('/api/turmas', {}, true);
  },
  async salvarTurma(turma: Partial<TurmaSala> & { nome: string; professorIds: string[] }): Promise<TurmaSala> {
    return chamarApi('/api/turmas', { method: 'POST', body: JSON.stringify(turma) });
  },
  async excluirTurma(id: string): Promise<void> {
    await chamarApi(`/api/turmas/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
  async vincularAlunosTurma(id: string, alunoIds: string[]): Promise<{ movidos: number }> {
    return chamarApi(`/api/turmas/${encodeURIComponent(id)}/alunos`, { method: 'POST', body: JSON.stringify({ alunoIds }) });
  },
  async removerAlunoTurma(id: string, alunoId: string): Promise<void> {
    await chamarApi(`/api/turmas/${encodeURIComponent(id)}/alunos/${encodeURIComponent(alunoId)}`, { method: 'DELETE' });
  },

  async listarDocumentos(): Promise<DocumentoArquivo[]> {
    return chamarApi('/api/documentos', {}, true);
  },
  async enviarDocumento(dados: {
    titulo: string; categoria: string; nomeArquivo: string; mimeType: string; conteudoBase64: string;
    produtoId?: string; compraId?: string; documentoOrigemId?: string;
  }): Promise<DocumentoArquivo> {
    return chamarApi('/api/documentos', { method: 'POST', body: JSON.stringify(dados) });
  },
  async excluirDocumento(id: string): Promise<void> {
    await chamarApi(`/api/documentos/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
  urlDocumento(id: string): string {
    return `/api/documentos/${encodeURIComponent(id)}/arquivo`;
  },

  async transicionarCompra(id: string, para: string, dados: Record<string, unknown> = {}): Promise<any> {
    return chamarApi(`/api/compras/${encodeURIComponent(id)}/transicao`, { method: 'POST', body: JSON.stringify({ para, ...dados }) });
  },
  async receberCompraParcial(id: string, dados: { quantidadeRecebida: number; quantidadeDanificada?: number; divergencia?: string; observacao?: string }): Promise<any> {
    return chamarApi(`/api/compras/${encodeURIComponent(id)}/recebimento`, { method: 'POST', body: JSON.stringify(dados) });
  },
  async listarCotacoes(compraId: string): Promise<CompraCotacao[]> {
    return chamarApi(`/api/compras/${encodeURIComponent(compraId)}/cotacoes`, {}, true);
  },
  async salvarCotacao(compraId: string, dados: Partial<CompraCotacao> & { fornecedorNome: string; valorTotal: number }): Promise<CompraCotacao> {
    return chamarApi(`/api/compras/${encodeURIComponent(compraId)}/cotacoes`, { method: 'POST', body: JSON.stringify(dados) });
  },
  async historicoCompra(compraId: string): Promise<{ historico: any[]; recebimentos: any[] }> {
    return chamarApi(`/api/compras/${encodeURIComponent(compraId)}/historico`, {}, true);
  },
  async registrarPagamentoCompra(compraId: string, valor: number): Promise<void> {
    await chamarApi(`/api/compras/${encodeURIComponent(compraId)}/pagamento`, { method: 'POST', body: JSON.stringify({ valor }) });
  },

  // Cadastro público: acesso liberado para aluno e professor (sem aprovação manual da administradora)
  async registrar(dados: {
    nome: string;
    email: string;
    senha: string;
    tipoPerfil: 'aluno' | 'professor';
    primeiroAcessoAdmin?: boolean;
    turma?: string;
    matricula?: string;
    departamento?: string;
  }): Promise<{ usuario?: Usuario; pendente?: boolean; mensagem?: string }> {
    const r = await chamarApi<{ usuario?: Usuario; pendente?: boolean; mensagem?: string }>(
      '/api/auth/registrar',
      { method: 'POST', body: JSON.stringify(dados) },
      true
    );
    if (r.usuario) dataService.salvarSessao(r.usuario);
    return r;
  },

  // Recuperação administrativa disponível apenas no próprio computador do servidor.
  async recuperarAcessoAdministradora(dados: {
    nome: string;
    email: string;
    senha: string;
  }): Promise<Usuario> {
    const r = await chamarApi<{ usuario: Usuario }>(
      '/api/auth/recuperar-admin',
      { method: 'POST', body: JSON.stringify(dados) },
      true
    );
    dataService.salvarSessao(r.usuario);
    return r.usuario;
  },

  // Recebimento e conferência de uma compra: o SERVIDOR dá entrada no estoque só com o que foi recebido
  async receberCompra(compraId: string): Promise<{ etapa: string; entradaEstoque: number; pendente: number }> {
    return chamarApi(`/api/compras/${encodeURIComponent(compraId)}/recebimento`, {
      method: 'POST',
      body: JSON.stringify({ receberTudo: true })
    });
  },

  // Encerra a sessão no servidor (invalida o cookie) e limpa o que o navegador exibe.
  // Não apaga uma sessão NOVA que tenha sido criada enquanto esta requisição estava em andamento.
  async sair(): Promise<void> {
    const anterior = lerSessaoBruta();
    try {
      await chamarApi('/api/auth/logout', { method: 'POST' }, true);
    } catch {
      /* mesmo sem rede, o acesso local é encerrado */
    }
    limparSessaoSeNaoMudou(anterior);
  },

  // Confere com o servidor se a sessão continua válida (usado ao recarregar a página)
  async validarSessao(): Promise<Usuario | null> {
    const anterior = lerSessaoBruta();
    try {
      const r = await chamarApi<{ usuario: Usuario }>('/api/auth/me', {}, true);
      // Se a pessoa entrou de novo enquanto a conferência corria, preserva o login novo.
      if (lerSessaoBruta() !== anterior) return dataService.obterSessao();
      dataService.salvarSessao(r.usuario);
      return r.usuario;
    } catch (e) {
      if (e instanceof ErroApi && e.status === 0) return dataService.obterSessao(); // sem rede: não derruba a pessoa
      limparSessaoSeNaoMudou(anterior);
      return null;
    }
  },

  // Status da Conexão / Armazenamento (Verifica API MySQL em tempo real)
  async obterStatus(): Promise<DatabaseConnectionStatus> {
    const [u, p, f, s, c, e, ca, oa] = await Promise.all([
      repoUsuarios.listar(),
      repoProdutos.listar(),
      repoFornecedores.listar(),
      repoSolicitacoes.listar(),
      repoCompras.listar(),
      repoEstoque.listar(),
      repoConsumosAluno.listar(),
      repoOcorrenciasAluno.listar()
    ]);

    const alunosCount = u.filter((usr) => usr.tipoPerfil === 'aluno').length;
    const professoresCount = u.filter((usr) => usr.tipoPerfil === 'professor').length;
    const total = u.length + p.length + f.length + s.length + c.length + e.length + ca.length + oa.length;
    const syncTime = localStorage.getItem(STORAGE_KEYS.ULTIMA_SINCRONIZACAO) || new Date().toISOString();

    const detailedStats: DatabaseDetailedStats = {
      totalGeral: total,
      produtos: p.length,
      alunos: alunosCount,
      professores: professoresCount,
      fornecedores: f.length,
      estoque: e.length,
      solicitacoes: s.length,
      compras: c.length,
      consumosAluno: ca.length,
      ocorrenciasAluno: oa.length
    };

    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const info = await res.json();
        if (info.status === 'conectado') {
          return {
            provedor: 'mysql',
            status: 'conectado',
            itensArmazenados: total,
            stats: detailedStats,
            ultimaSincronizacao: new Date().toLocaleTimeString('pt-BR'),
            mensagem: `MySQL conectado${info.host ? ` em ${info.host} (${info.database})` : ''}. ${total} registros sincronizados em tempo real!`
          };
        }
      }
    } catch {
      // Continua para o retorno padrão caso endpoint não esteja pronto
    }

    return {
      provedor: 'local_storage',
      status: 'local_persistido',
      itensArmazenados: total,
      stats: detailedStats,
      ultimaSincronizacao: new Date(syncTime).toLocaleTimeString('pt-BR'),
      mensagem: total === 0
        ? 'Banco de dados ativo e 100% zerado. Aguardando novos cadastros pelo usuário.'
        : `Banco de dados ativo com persistência permanente. ${total} registros sincronizados.`
    };
  },

  // Inicializar tabelas no MySQL via API
  async inicializarTabelasMySQL(): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch('/api/init-db', { method: 'POST' });
      const data = await res.json();
      return { success: res.ok, message: data.message || data.error || 'Executado' };
    } catch (e: any) {
      return { success: false, message: e.message || 'Falha de comunicação com o servidor' };
    }
  },

  // Exportar Backup Completo em Formato JSON Estruturado
  async exportarBackupJSON(): Promise<DatabaseBackup> {
    const [usuarios, produtos, fornecedores, solicitacoes, compras, estoque, consumosAluno, ocorrenciasAluno] =
      await Promise.all([
        repoUsuarios.listar(),
        repoProdutos.listar(),
        repoFornecedores.listar(),
        repoSolicitacoes.listar(),
        repoCompras.listar(),
        repoEstoque.listar(),
        repoConsumosAluno.listar(),
        repoOcorrenciasAluno.listar()
      ]);

    return {
      versao: '2.0.0',
      dataGeracao: new Date().toISOString(),
      origem: 'Matéria Reativa - Sistema Laboratorial',
      usuarios,
      produtos,
      fornecedores,
      solicitacoes,
      compras,
      estoque,
      consumosAluno,
      ocorrenciasAluno
    };
  },

  // Zerar completamente toda a base de dados
  async zerarBaseDeDados(): Promise<void> {
    repoUsuarios.limpar();
    repoProdutos.limpar();
    repoFornecedores.limpar();
    repoSolicitacoes.limpar();
    repoCompras.limpar();
    repoEstoque.limpar();
    repoConsumosAluno.limpar();
    repoOcorrenciasAluno.limpar();
    this.encerrarSessao();
    try {
      localStorage.removeItem('materia_reativa_produtos');
      localStorage.removeItem('materia_reativa_fornecedores');
      localStorage.removeItem('materia_reativa_solicitacoes');
      localStorage.removeItem('materia_reativa_compras');
      localStorage.removeItem('materia_reativa_estoque');
      localStorage.removeItem('materia_reativa_email');
      localStorage.removeItem('materia_reativa_usuario');
      localStorage.removeItem('materia_reativa_lembrete');
      localStorage.setItem(STORAGE_KEYS.ULTIMA_SINCRONIZACAO, new Date().toISOString());
    } catch {}
  },

  // Importar / Restaurar Backup de JSON
  async restaurarBackup(backup: DatabaseBackup): Promise<boolean> {
    if (!backup) {
      throw new Error('Arquivo de backup inválido ou corrompido.');
    }

    if (Array.isArray(backup.usuarios)) repoUsuarios.substituirTodos(backup.usuarios);
    if (Array.isArray(backup.produtos)) repoProdutos.substituirTodos(backup.produtos);
    if (Array.isArray(backup.fornecedores)) repoFornecedores.substituirTodos(backup.fornecedores);
    if (Array.isArray(backup.solicitacoes)) repoSolicitacoes.substituirTodos(backup.solicitacoes);
    if (Array.isArray(backup.compras)) repoCompras.substituirTodos(backup.compras);
    if (Array.isArray(backup.estoque)) repoEstoque.substituirTodos(backup.estoque);
    if (Array.isArray(backup.consumosAluno)) repoConsumosAluno.substituirTodos(backup.consumosAluno);
    if (Array.isArray(backup.ocorrenciasAluno)) repoOcorrenciasAluno.substituirTodos(backup.ocorrenciasAluno);

    return true;
  },

  // Gerar Script de Carga SQL (DUMP) com todos os dados atuais prontos para rodar no MySQL
  async gerarDumpSQL(): Promise<string> {
    const backup = await this.exportarBackupJSON();

    let sql = `-- =============================================================================\n`;
    sql += `-- DUMP DE BANCO DE DADOS - MATÉRIA REATIVA\n`;
    sql += `-- GERADO EM: ${new Date().toLocaleString('pt-BR')}\n`;
    sql += `-- COMPATIBILIDADE: MySQL 8.0+, MariaDB, PostgreSQL\n`;
    sql += `-- =============================================================================\n\n`;

    const escape = (val?: any) => {
      if (val === null || val === undefined) return 'NULL';
      return `'${String(val).replace(/'/g, "''")}'`;
    };

    // 0. Usuários
    sql += `-- 1. USUÁRIOS (${(backup.usuarios || []).length} registros)\n`;
    for (const u of backup.usuarios || []) {
      sql += `INSERT INTO usuarios (id, nome, email, senha_hash, tipo_perfil, matricula, turma, departamento, criado_em)\n`;
      sql += `VALUES (${escape(u.id)}, ${escape(u.nome)}, ${escape(u.email)}, ${escape(u.senha)}, ${escape(u.tipoPerfil)}, ${escape(u.matricula)}, ${escape(u.turma)}, ${escape(u.departamento)}, ${escape(u.criadoEm)});\n`;
    }
    sql += `\n`;

    // 1. Produtos Químicos
    sql += `-- 2. PRODUTOS QUÍMICOS (${backup.produtos.length} registros)\n`;
    for (const p of backup.produtos) {
      sql += `INSERT INTO produtos_quimicos (id, nome, cas_number, formula_quimica, massa_molar, pureza, classe_perigo, cor_perigo, situacao_legal, estoque_atual, estoque_minimo, unidade, validade_lote, localizacao, fornecedor_principal)\n`;
      sql += `VALUES (${escape(p.id)}, ${escape(p.nome)}, ${escape(p.cas)}, ${escape(p.formulaQuimica)}, ${escape(p.massaMolar)}, ${escape(p.pureza)}, ${escape(p.classePerigo)}, ${escape(p.corPerigo)}, ${escape(p.situacao)}, ${p.estoqueAtual}, ${p.estoqueMinimo}, ${escape(p.unidade)}, ${escape(p.validade)}, ${escape(p.localizacao)}, ${escape(p.fornecedorPrincipal)});\n`;
    }
    sql += `\n`;

    // 2. Fornecedores
    sql += `-- 3. FORNECEDORES (${backup.fornecedores.length} registros)\n`;
    for (const f of backup.fornecedores) {
      sql += `INSERT INTO fornecedores (id, razao_social, cnpj, contato, endereco, email, responsavel, status)\n`;
      sql += `VALUES (${escape(f.id)}, ${escape(f.razaoSocial)}, ${escape(f.cnpj)}, ${escape(f.contato)}, ${escape(f.endereco)}, ${escape(f.email)}, ${escape(f.responsavel)}, ${escape(f.status)});\n`;
    }
    sql += `\n`;

    // 3. Consumos Aluno
    sql += `-- 4. CONSUMOS DE ALUNOS (${backup.consumosAluno.length} registros)\n`;
    for (const c of backup.consumosAluno) {
      sql += `INSERT INTO consumos_aluno (id, aluno_nome, turma, bancada, pratica, produto_nome, quantidade_usada, unidade, data_registro, hora_registro, professor_orientador, observacoes, status_visto)\n`;
      sql += `VALUES (${escape(c.id)}, ${escape(c.alunoNome)}, ${escape(c.turma)}, ${escape(c.bancada)}, ${escape(c.pratica)}, ${escape(c.produtoNome)}, ${c.quantidadeUsada}, ${escape(c.unidade)}, ${escape(c.data)}, ${escape(c.hora)}, ${escape(c.professorOrientador)}, ${escape(c.observacoes)}, ${escape(c.statusVisto)});\n`;
    }
    sql += `\n`;

    // 4. Ocorrências Aluno
    sql += `-- 5. OCORRÊNCIAS DE ALUNOS (${backup.ocorrenciasAluno.length} registros)\n`;
    for (const o of backup.ocorrenciasAluno) {
      sql += `INSERT INTO ocorrencias_aluno (id, aluno_nome, turma, bancada, tipo_ocorrencia, reagente_envolvido, gravidade, descricao, primeiros_socorros_adotados, data_ocorrencia, hora_ocorrencia, status_atendimento)\n`;
      sql += `VALUES (${escape(o.id)}, ${escape(o.alunoNome)}, ${escape(o.turma)}, ${escape(o.bancada)}, ${escape(o.tipoOcorrencia)}, ${escape(o.reagenteEnvolvido)}, ${escape(o.gravidade)}, ${escape(o.descricao)}, ${escape(o.primeirosSocorrosAdotados)}, ${escape(o.data)}, ${escape(o.hora)}, ${escape(o.status)});\n`;
    }

    return sql;
  }
};
