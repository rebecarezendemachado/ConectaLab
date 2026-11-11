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
  AlertaNotificacao
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

// Repositório Híbrido: Conecta diretamente à API MySQL com Fallback resiliente
class HybridRepository<T extends { id: string }> implements IRepository<T> {
  private key: string;
  private defaultData: T[];
  private apiEndpoint: string;

  constructor(key: string, defaultData: T[], apiEndpoint: string) {
    this.key = key;
    this.defaultData = defaultData;
    this.apiEndpoint = apiEndpoint;
  }

  private carregarLocal(): T[] {
    try {
      const raw = localStorage.getItem(this.key);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn(`[DataService] Falha ao carregar chave ${this.key}:`, e);
    }
    this.salvarLocal(this.defaultData);
    return this.defaultData;
  }

  private salvarLocal(dados: T[]): void {
    try {
      localStorage.setItem(this.key, JSON.stringify(dados));
      localStorage.setItem(STORAGE_KEYS.ULTIMA_SINCRONIZACAO, new Date().toISOString());
    } catch (e) {
      console.warn(`[DataService] Falha ao salvar chave ${this.key}:`, e);
    }
  }

  async listar(): Promise<T[]> {
    try {
      const res = await fetch(this.apiEndpoint, { headers: { Accept: 'application/json' } });
      if (res.ok) {
        const dados = await res.json();
        if (Array.isArray(dados)) {
          this.salvarLocal(dados);
          return dados;
        }
      }
    } catch {
      // Em caso de falha de rede ou servidor não disponível, usa cache local
    }
    return this.carregarLocal();
  }

  async obterPorId(id: string): Promise<T | null> {
    const todos = await this.listar();
    return todos.find((it) => it.id === id) || null;
  }

  async criar(item: T): Promise<T> {
    try {
      const res = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
      if (res.ok) {
        const criado = await res.json().catch(() => item);
        const locais = this.carregarLocal();
        const atualizados = [criado, ...locais.filter(x => x.id !== criado.id)];
        this.salvarLocal(atualizados);
        return criado;
      }
    } catch {
      // Fallback
    }

    const itens = this.carregarLocal();
    const existe = itens.find((it) => it.id === item.id);
    const atualizados = existe ? itens.map((it) => (it.id === item.id ? item : it)) : [item, ...itens];
    this.salvarLocal(atualizados);
    return item;
  }

  async atualizar(item: T): Promise<T> {
    try {
      const res = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
      if (res.ok) {
        const atualizado = await res.json().catch(() => item);
        const locais = this.carregarLocal();
        const atualizados = locais.map(x => x.id === atualizado.id ? atualizado : x);
        this.salvarLocal(atualizados);
        return atualizado;
      }
    } catch {
      // Fallback
    }

    const itens = this.carregarLocal();
    const atualizados = itens.map((it) => (it.id === item.id ? item : it));
    this.salvarLocal(atualizados);
    return item;
  }

  async deletar(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.apiEndpoint}/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        const locais = this.carregarLocal();
        const filtrados = locais.filter((it) => it.id !== id);
        this.salvarLocal(filtrados);
        return true;
      }
    } catch {
      // Fallback
    }

    const itens = this.carregarLocal();
    const filtrados = itens.filter((it) => it.id !== id);
    this.salvarLocal(filtrados);
    return filtrados.length < itens.length;
  }

  substituirTodos(dados: T[]): void {
    this.salvarLocal(dados);
  }

  limpar(): void {
    this.salvarLocal([]);
  }
}

// Instâncias dos Repositórios ZERADOS conectadas aos endpoints REST do backend MySQL
const repoUsuarios = new HybridRepository<Usuario>(STORAGE_KEYS.USUARIOS, initialUsuarios, '/api/usuarios');
const repoProdutos = new HybridRepository<ProdutoQuimico>(STORAGE_KEYS.PRODUTOS, initialProdutos, '/api/produtos');
const repoFornecedores = new HybridRepository<Fornecedor>(STORAGE_KEYS.FORNECEDORES, initialFornecedores, '/api/fornecedores');
const repoSolicitacoes = new HybridRepository<SolicitacaoLaboratorio>(STORAGE_KEYS.SOLICITACOES, initialSolicitacoes, '/api/solicitacoes');
const repoCompras = new HybridRepository<CompraItem>(STORAGE_KEYS.COMPRAS, initialCompras, '/api/compras');
const repoEstoque = new HybridRepository<EstoqueItem>(STORAGE_KEYS.ESTOQUE, initialEstoque, '/api/estoque');
const repoConsumosAluno = new HybridRepository<RegistroConsumoAluno>(STORAGE_KEYS.CONSUMOS_ALUNO, initialConsumosAluno, '/api/consumos');
const repoOcorrenciasAluno = new HybridRepository<RelatoOcorrenciaAluno>(STORAGE_KEYS.OCORRENCIAS_ALUNO, initialOcorrenciasAluno, '/api/ocorrencias');
const repoAlertas = new HybridRepository<AlertaNotificacao>('materia_reativa_db_alertas', [], '/api/alertas');

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
  }): Promise<{ produto: ProdutoQuimico | null; alerta: AlertaNotificacao }> {
    const agora = new Date();
    const dataStr = agora.toLocaleDateString('pt-BR');
    const horaStr = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    // 1. Localizar produto
    const prods = await repoProdutos.listar();
    const prod = prods.find(
      (p) => p.nome.trim().toLowerCase() === dados.produtoNome.trim().toLowerCase()
    );

    let saldoRestante = 0;
    let prodAtualizado: ProdutoQuimico | null = null;

    if (prod) {
      const novaQtd = Math.max(0, Number(prod.estoqueAtual || 0) - Number(dados.quantidade));
      saldoRestante = novaQtd;
      prodAtualizado = { ...prod, estoqueAtual: novaQtd };
      await repoProdutos.atualizar(prodAtualizado);

      // Também abater do lote físico no Estoque se existir
      const lotes = await repoEstoque.listar();
      const loteDoProduto = lotes.find(
        (l) => l.produto.trim().toLowerCase() === dados.produtoNome.trim().toLowerCase()
      );
      if (loteDoProduto) {
        const novaQtdLote = Math.max(0, Number(loteDoProduto.quantidadeAtual || 0) - Number(dados.quantidade));
        const statusLote = novaQtdLote <= 0 ? 'Esgotado' : novaQtdLote <= loteDoProduto.estoqueMinimo ? 'Estoque baixo' : 'Normal';
        await repoEstoque.atualizar({ ...loteDoProduto, quantidadeAtual: novaQtdLote, status: statusLote });
      }
    }

    // 2. Registrar no histórico de consumos
    const novoConsumo: RegistroConsumoAluno = {
      id: `CSM-${Date.now().toString().slice(-6)}`,
      alunoNome: dados.autorNome,
      turma: dados.turma || (dados.autorPerfil === 'aluno' ? '3º Ano B' : 'Docente'),
      bancada: dados.bancada || 'Bancada 01',
      pratica: dados.pratica || 'Uso em Aula Prática',
      produtoNome: dados.produtoNome,
      quantidadeUsada: Number(dados.quantidade),
      unidade: dados.unidade || prod?.unidade || 'mL',
      data: dataStr,
      hora: horaStr,
      professorOrientador: dados.autorPerfil === 'professor' ? dados.autorNome : 'Prof. Responsável',
      observacoes: dados.observacoes,
      statusVisto: dados.autorPerfil === 'professor' ? 'Visto pelo Professor' : 'Pendente'
    };
    await repoConsumosAluno.criar(novoConsumo);

    // 3. Gerar Alerta de Consumo para Avisos
    const ehCritico = prod ? saldoRestante <= Number(prod.estoqueMinimo) : false;
    const ehEsgotado = prod ? saldoRestante <= 0 : false;

    const novoAlerta: AlertaNotificacao = {
      id: `ALT-${Date.now().toString().slice(-6)}`,
      tipo: ehEsgotado ? 'falta_estoque' : ehCritico ? 'alerta_critico' : 'consumo',
      titulo: ehEsgotado
        ? `🚨 Reagente Esgotado: ${dados.produtoNome}`
        : ehCritico
        ? `⚠️ Estoque Crítico: ${dados.produtoNome}`
        : `Baixa de Estoque: ${dados.produtoNome}`,
      mensagem: `${dados.autorNome} (${dados.autorPerfil === 'aluno' ? 'Aluno' : 'Professor'}) registrou uso de ${dados.quantidade} ${dados.unidade || prod?.unidade || 'un'} em ${dados.pratica || 'Bancada'}. Saldo restante em estoque: ${saldoRestante} ${dados.unidade || prod?.unidade || 'un'}.${ehCritico ? ' Atenção: item abaixo do estoque mínimo operacional!' : ''}`,
      produtoNome: dados.produtoNome,
      quantidadeAlterada: Number(dados.quantidade),
      saldoRestante,
      unidade: dados.unidade || prod?.unidade || 'mL',
      autorNome: dados.autorNome,
      autorPerfil: dados.autorPerfil,
      dataHora: `${dataStr} às ${horaStr}`,
      data: dataStr,
      hora: horaStr,
      lida: false,
      gravidade: ehEsgotado ? 'alta' : ehCritico ? 'alta' : 'media',
      acaoSugerida: ehCritico || ehEsgotado ? 'comprar' : 'ver_estoque'
    };
    await repoAlertas.criar(novoAlerta);

    return { produto: prodAtualizado, alerta: novoAlerta };
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
            mensagem: `MySQL conectado em ${info.host} (${info.database}). ${total} registros sincronizados em tempo real!`
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
