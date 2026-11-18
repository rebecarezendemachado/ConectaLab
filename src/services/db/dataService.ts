// =============================================================================
// MATÉRIA REATIVA - CAMADA DE DADOS (Firebase / Firestore)
// Versão adaptada para funcionar sem servidor próprio (GitHub Pages + Firebase)
// =============================================================================

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import type {
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
  CompraCotacao,
} from '../../types';
import type { DatabaseBackup, DatabaseConnectionStatus, DatabaseDetailedStats, IRepository } from './types';

const STORAGE_VERSION_KEY = 'materia_reativa_db_firebase_v1';

const STORAGE_KEYS = {
  SESSAO_USUARIO: 'materia_reativa_sessao_ativa',
  ULTIMA_SINCRONIZACAO: 'materia_reativa_db_sync_time',
};

try {
  const versao = localStorage.getItem(STORAGE_VERSION_KEY);
  if (!versao) {
    // limpa chaves antigas de cache local que não fazem sentido no modo Firebase
    ['materia_reativa_db_usuarios','materia_reativa_db_produtos','materia_reativa_db_fornecedores','materia_reativa_db_solicitacoes','materia_reativa_db_compras','materia_reativa_db_estoque','materia_reativa_db_consumos_aluno','materia_reativa_db_ocorrencias_aluno'].forEach(k => localStorage.removeItem(k));
    localStorage.setItem(STORAGE_VERSION_KEY, '1.0');
  }
} catch { /* ignore */ }

export class ErroApi extends Error {
  status: number;
  constructor(mensagem: string, status: number) {
    super(mensagem);
    this.name = 'ErroApi';
    this.status = status;
  }
}

const avisarErro = (mensagem: string) => {
  try { window.dispatchEvent(new CustomEvent('mr:erro-api', { detail: mensagem })); } catch { /* */ }
};

function marcarSync() {
  try { localStorage.setItem(STORAGE_KEYS.ULTIMA_SINCRONIZACAO, new Date().toISOString()); } catch { /* */ }
}

function semSenha(u: any): Usuario {
  if (!u) return u;
  const { senha, senhaHash, ...rest } = u;
  return { ...rest, senha: '' } as Usuario;
}

function limparUndefined<T extends Record<string, any>>(obj: T): T {
  const out: any = Array.isArray(obj) ? [] : {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
      out[k] = limparUndefined(v as any);
    } else {
      out[k] = v;
    }
  }
  return out;
}

class RepositorioFirestore<T extends { id: string }> implements IRepository<T> {
  private colName: string;
  constructor(colName: string) { this.colName = colName; }
  private colRef() { return collection(db, this.colName); }

  async listar(): Promise<T[]> {
    try {
      const snap = await getDocs(this.colRef());
      const items = snap.docs.map(d => ({ ...(d.data() as any), id: d.id } as T));
      marcarSync();
      return items;
    } catch (e: any) {
      console.warn(`[Firestore] erro ao listar ${this.colName}:`, e?.message || e);
      if (String(e?.code || '').includes('permission-denied')) return [];
      avisarErro('Não foi possível carregar dados. Verifique sua conexão e permissões.');
      return [];
    }
  }

  async obterPorId(id: string): Promise<T | null> {
    try {
      const snap = await getDoc(doc(db, this.colName, id));
      return snap.exists() ? ({ ...(snap.data() as any), id: snap.id } as T) : null;
    } catch { return null; }
  }

  async criar(item: T): Promise<T> {
    const id = item.id || doc(this.colRef()).id;
    const data = limparUndefined({ ...item, id });
    await setDoc(doc(db, this.colName, id), data, { merge: true });
    marcarSync();
    return data as T;
  }

  async atualizar(item: T): Promise<T> {
    return this.criar(item);
  }

  async deletar(id: string): Promise<boolean> {
    try {
      await deleteDoc(doc(db, this.colName, id));
      marcarSync();
      return true;
    } catch (e: any) {
      avisarErro('Não foi possível excluir o registro.');
      throw e;
    }
  }
}

// coleções
const repoUsuarios = new RepositorioFirestore<Usuario>('usuarios');
const repoProdutos = new RepositorioFirestore<ProdutoQuimico>('produtos_quimicos');
const repoFornecedores = new RepositorioFirestore<Fornecedor>('fornecedores');
const repoSolicitacoes = new RepositorioFirestore<SolicitacaoLaboratorio>('solicitacoes_laboratorio');
const repoCompras = new RepositorioFirestore<CompraItem>('compras_pedidos');
const repoEstoque = new RepositorioFirestore<EstoqueItem>('estoque_lotes');
const repoConsumosAluno = new RepositorioFirestore<RegistroConsumoAluno>('consumos_aluno');
const repoOcorrenciasAluno = new RepositorioFirestore<RelatoOcorrenciaAluno>('ocorrencias_aluno');
const repoAlertas = new RepositorioFirestore<AlertaNotificacao>('alertas');
const repoTurmas = new RepositorioFirestore<TurmaSala>('turmas');
const repoDocumentos = new RepositorioFirestore<DocumentoArquivo>('documentos_arquivo');
const repoCotacoes = new RepositorioFirestore<CompraCotacao>('compras_cotacoes');

let perfilCache: Usuario | null = null;
let authResolvido = false;
let resolvers: Array<(u: Usuario | null) => void> = [];

function salvarSessaoLocal(usuario: Usuario | null) {
  perfilCache = usuario ? semSenha(usuario) : null;
  try {
    if (perfilCache) localStorage.setItem(STORAGE_KEYS.SESSAO_USUARIO, JSON.stringify(perfilCache));
    else localStorage.removeItem(STORAGE_KEYS.SESSAO_USUARIO);
  } catch { /* */ }
}

async function carregarPerfil(uid: string, email?: string | null): Promise<Usuario | null> {
  try {
    const byId = await getDoc(doc(db, 'usuarios', uid));
    if (byId.exists()) return semSenha({ ...(byId.data() as any), id: byId.id });
  } catch { /* */ }
  if (email) {
    try {
      const q = query(collection(db, 'usuarios'), where('email', '==', email.toLowerCase()));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const d = snap.docs[0];
        return semSenha({ ...(d.data() as any), id: d.id });
      }
    } catch { /* */ }
  }
  return null;
}

onAuthStateChanged(auth, async (fbUser) => {
  if (fbUser) {
    const perfil = await carregarPerfil(fbUser.uid, fbUser.email);
    if (perfil) salvarSessaoLocal(perfil);
    else {
      // usuário autenticado mas sem perfil no Firestore (pode acontecer em migração)
      salvarSessaoLocal(null);
    }
  } else {
    salvarSessaoLocal(null);
  }
  authResolvido = true;
  const pending = resolvers.splice(0);
  pending.forEach(r => r(perfilCache));
  if (!fbUser) {
    try { window.dispatchEvent(new CustomEvent('mr:sessao-expirada')); } catch { /* */ }
  }
});

function aguardarAuth(): Promise<Usuario | null> {
  if (authResolvido) return Promise.resolve(perfilCache || dataService.obterSessao());
  return new Promise((resolve) => {
    resolvers.push(resolve);
    setTimeout(() => resolve(perfilCache || dataService.obterSessao()), 4000);
  });
}

function gerarId(prefixo: string) {
  return `${prefixo}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

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

  async listarAlertasDinamicosDescartados(): Promise<string[]> { return []; },
  async dispensarAlertaDinamico(_id: string): Promise<void> { /* sem servidor */ },

  async registrarConsumoEAbater(dados: {
    produtoNome: string; quantidade: number; unidade?: string; autorNome: string; autorPerfil: 'aluno' | 'professor';
    turma?: string; bancada?: string; pratica?: string; observacoes?: string; alunoId?: string;
  }): Promise<{ produto: ProdutoQuimico | null; alerta: AlertaNotificacao }> {
    const produtos = await repoProdutos.listar();
    const produto = produtos.find(p => (p.nome || '').toLowerCase() === (dados.produtoNome || '').toLowerCase()) || null;
    let saldo = 0;
    if (produto) {
      saldo = Math.max(0, Number(produto.estoqueAtual || 0) - Number(dados.quantidade || 0));
      await repoProdutos.atualizar({ ...produto, estoqueAtual: saldo } as any);
    }
    const consumo: any = {
      id: gerarId('CON'), alunoNome: dados.autorNome, turma: dados.turma || '', bancada: dados.bancada || '',
      pratica: dados.pratica || 'Consumo', produtoNome: dados.produtoNome, quantidadeUsada: dados.quantidade,
      unidade: dados.unidade || produto?.unidade || 'un', data: new Date().toISOString().slice(0,10),
      hora: new Date().toTimeString().slice(0,8), professorOrientador: '', observacoes: dados.observacoes || '', statusVisto: 'Pendente'
    };
    await repoConsumosAluno.criar(consumo);
    const alerta: AlertaNotificacao = {
      id: gerarId('ALT'), tipo: saldo <= 0 ? 'falta_estoque' : 'consumo', titulo: saldo <= 0 ? 'Estoque esgotado' : 'Consumo registrado',
      mensagem: `${dados.autorNome} registrou consumo de ${dados.quantidade} ${dados.unidade || ''} de ${dados.produtoNome}. Saldo: ${saldo}.`,
      produtoNome: dados.produtoNome, quantidadeAlterada: dados.quantidade, saldoRestante: saldo, unidade: dados.unidade || produto?.unidade,
      autorNome: dados.autorNome, autorPerfil: dados.autorPerfil, dataHora: new Date().toISOString(),
      data: new Date().toISOString().slice(0,10), hora: new Date().toTimeString().slice(0,8), lida: false,
      gravidade: saldo <= 0 ? 'alta' : 'media', acaoSugerida: saldo <= (produto?.estoqueMinimo || 0) ? 'comprar' : 'ver_estoque'
    };
    try { await repoAlertas.criar(alerta as any); } catch { /* */ }
    return { produto: produto ? ({ ...produto, estoqueAtual: saldo } as any) : null, alerta };
  },

  obterSessao(): Usuario | null {
    if (perfilCache) return perfilCache;
    try { const raw = localStorage.getItem(STORAGE_KEYS.SESSAO_USUARIO); return raw ? semSenha(JSON.parse(raw)) : null; } catch { return null; }
  },
  salvarSessao(usuario: Usuario): void { salvarSessaoLocal(usuario); },
  encerrarSessao(): void { salvarSessaoLocal(null); },

  async entrar(email: string, senha: string, perfil: 'aluno' | 'professor', _lembrar = false): Promise<Usuario> {
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), senha);
      let usuario = await carregarPerfil(cred.user.uid, cred.user.email);
      if (!usuario) throw new ErroApi('Perfil de usuário não encontrado. Complete o cadastro.', 404);
      // valida perfil solicitado (admin entra pelo fluxo de admin/professor)
      if (perfil === 'aluno' && usuario.tipoPerfil !== 'aluno') throw new ErroApi('Esta conta não é de aluno. Selecione o perfil correto.', 403);
      if (perfil === 'professor' && usuario.tipoPerfil === 'aluno') throw new ErroApi('Esta conta é de aluno. Selecione o perfil correto.', 403);
      if (usuario.status && usuario.status === 'inativo') throw new ErroApi('Conta inativa. Procure a administradora.', 403);
      salvarSessaoLocal(usuario);
      return usuario;
    } catch (e: any) {
      if (e instanceof ErroApi) throw e;
      const code = e?.code || '';
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') throw new ErroApi('E-mail ou senha incorretos.', 401);
      if (code === 'auth/too-many-requests') throw new ErroApi('Muitas tentativas. Tente novamente mais tarde.', 429);
      if (code === 'auth/invalid-email') throw new ErroApi('E-mail inválido.', 400);
      throw new ErroApi(e?.message || 'Erro ao entrar.', 500);
    }
  },

  async entrarComoAdministradora(email: string, senha: string, lembrar = false): Promise<Usuario> {
    const usuario = await this.entrar(email, senha, 'professor', lembrar);
    if (usuario.tipoPerfil === 'administrador') return usuario;
    await this.sair();
    throw new ErroApi('Esta conta não tem acesso administrativo. Use o e-mail e a senha da administradora.', 403);
  },

  async turmasPublicas(): Promise<{ id: string; nome: string; anoLetivo: string }[]> {
    try {
      const turmas = await repoTurmas.listar();
      return turmas
        .filter(t => (t as any).ativa !== false && Array.isArray((t as any).professores) && (t as any).professores.length > 0)
        .map(t => ({ id: t.id, nome: t.nome, anoLetivo: (t as any).anoLetivo || '' }));
    } catch { return []; }
  },

  async statusAdministradora(): Promise<{ configurada: boolean }> {
    try {
      const q = query(collection(db, 'usuarios'), where('tipoPerfil', '==', 'administrador'));
      const snap = await getDocs(q);
      return { configurada: !snap.empty };
    } catch { return { configurada: false }; }
  },

  async listarTurmas(): Promise<TurmaSala[]> { return repoTurmas.listar(); },
  async salvarTurma(turma: Partial<TurmaSala> & { nome: string; professorIds?: string[] }): Promise<TurmaSala> {
    const id = (turma as any).id || gerarId('TUR');
    const professores = (turma as any).professores || [];
    const data: any = { ...turma, id, nome: turma.nome, ativa: turma.ativa !== false, totalAlunos: turma.totalAlunos || 0, professores };
    await repoTurmas.criar(data);
    return data as TurmaSala;
  },
  async excluirTurma(id: string): Promise<void> { await repoTurmas.deletar(id); },
  async vincularAlunosTurma(id: string, alunoIds: string[]): Promise<{ movidos: number }> {
    const turma = await repoTurmas.obterPorId(id);
    if (!turma) throw new ErroApi('Turma não encontrada.', 404);
    let movidos = 0;
    for (const alunoId of alunoIds) {
      try { await repoUsuarios.atualizar({ id: alunoId, turma: turma.nome } as any); movidos++; } catch { /* */ }
    }
    return { movidos };
  },
  async removerAlunoTurma(_id: string, alunoId: string): Promise<void> {
    try { await repoUsuarios.atualizar({ id: alunoId, turma: '' } as any); } catch { /* */ }
  },

  async listarDocumentos(): Promise<DocumentoArquivo[]> { return repoDocumentos.listar(); },
  async enviarDocumento(dados: { titulo: string; categoria: string; nomeArquivo: string; mimeType: string; conteudoBase64: string; produtoId?: string; compraId?: string; documentoOrigemId?: string; }): Promise<DocumentoArquivo> {
    const id = gerarId('DOC');
    const docItem: any = {
      id, grupoVersao: dados.documentoOrigemId || id, versao: 1, titulo: dados.titulo, categoria: dados.categoria,
      nomeArquivo: dados.nomeArquivo, mimeType: dados.mimeType, tamanhoBytes: Math.ceil((dados.conteudoBase64?.length || 0) * 0.75),
      produtoId: dados.produtoId || '', compraId: dados.compraId || '', criadoPorNome: this.obterSessao()?.nome || '',
      criadoEm: new Date().toISOString(), conteudoBase64: dados.conteudoBase64 || '', url: ''
    };
    await repoDocumentos.criar(docItem);
    return docItem as DocumentoArquivo;
  },
  async excluirDocumento(id: string): Promise<void> { await repoDocumentos.deletar(id); },
  urlDocumento(id: string): string { return `#documento/${encodeURIComponent(id)}`; },

  async transicionarCompra(id: string, para: string, _dados: Record<string, unknown> = {}): Promise<any> {
    const compra = await repoCompras.obterPorId(id);
    if (!compra) throw new ErroApi('Compra não encontrada.', 404);
    const atualizada = { ...compra, status: para, etapa: para } as any;
    await repoCompras.atualizar(atualizada);
    return atualizada;
  },
  async receberCompraParcial(id: string, dados: { quantidadeRecebida: number; quantidadeDanificada?: number; divergencia?: string; observacao?: string }): Promise<any> {
    const compra = await repoCompras.obterPorId(id);
    if (!compra) throw new ErroApi('Compra não encontrada.', 404);
    const atualizada = { ...compra, status: 'Recebido', etapa: 'Recebido', quantidadeRecebida: dados.quantidadeRecebida } as any;
    await repoCompras.atualizar(atualizada);
    return { etapa: 'Recebido', entradaEstoque: dados.quantidadeRecebida, pendente: 0 };
  },
  async listarCotacoes(compraId: string): Promise<CompraCotacao[]> {
    const all = await repoCotacoes.listar();
    return all.filter(c => (c as any).compraId === compraId);
  },
  async salvarCotacao(compraId: string, dados: Partial<CompraCotacao> & { fornecedorNome: string; valorTotal: number }): Promise<CompraCotacao> {
    const id = (dados as any).id || gerarId('COT');
    const item: any = { ...dados, id, compraId, criadoEm: new Date().toISOString(), criadoPorNome: this.obterSessao()?.nome || '' };
    await repoCotacoes.criar(item);
    return item;
  },
  async historicoCompra(compraId: string): Promise<{ historico: any[]; recebimentos: any[] }> {
    const compra = await repoCompras.obterPorId(compraId);
    return { historico: compra ? [{ etapa: (compra as any).etapa || compra.status, data: (compra as any).data || '' }] : [], recebimentos: [] };
  },
  async registrarPagamentoCompra(compraId: string, valor: number): Promise<void> {
    const compra = await repoCompras.obterPorId(compraId);
    if (compra) await repoCompras.atualizar({ ...compra, valorPago: valor } as any);
  },

  async registrar(dados: { nome: string; email: string; senha: string; tipoPerfil: 'aluno' | 'professor'; primeiroAcessoAdmin?: boolean; turma?: string; matricula?: string; departamento?: string; }): Promise<{ usuario?: Usuario; pendente?: boolean; mensagem?: string }> {
    const email = dados.email.trim().toLowerCase();
    try {
      // configuração inicial da administradora: permitida apenas se ainda não existe admin
      if (dados.primeiroAcessoAdmin) {
        const st = await this.statusAdministradora();
        if (st.configurada) throw new ErroApi('A administradora já está configurada.', 400);
      }
      const cred = await createUserWithEmailAndPassword(auth, email, dados.senha);
      try { await updateProfile(cred.user, { displayName: dados.nome }); } catch { /* */ }
      const tipoPerfil = dados.primeiroAcessoAdmin ? 'administrador' : dados.tipoPerfil;
      const usuario: Usuario = semSenha({
        id: cred.user.uid,
        nome: dados.nome.trim(),
        email,
        senha: '',
        tipoPerfil,
        matricula: dados.matricula || '',
        turma: dados.turma || '',
        departamento: dados.departamento || (tipoPerfil === 'administrador' ? 'Administração' : ''),
        criadoEm: new Date().toISOString(),
      } as any);
      await setDoc(doc(db, 'usuarios', cred.user.uid), limparUndefined({ ...usuario, uid: cred.user.uid }));
      salvarSessaoLocal(usuario);
      return { usuario, mensagem: 'Cadastro realizado com sucesso.' };
    } catch (e: any) {
      if (e instanceof ErroApi) throw e;
      const code = e?.code || '';
      if (code === 'auth/email-already-in-use') throw new ErroApi('Este e-mail já está cadastrado. Faça login ou use outro e-mail.', 400);
      if (code === 'auth/weak-password') throw new ErroApi('A senha é muito fraca. Use pelo menos 6 caracteres.', 400);
      if (code === 'auth/invalid-email') throw new ErroApi('E-mail inválido.', 400);
      throw new ErroApi(e?.message || 'Erro ao cadastrar.', 500);
    }
  },

  async recuperarAcessoAdministradora(dados: { nome: string; email: string; senha: string; }): Promise<Usuario> {
    // Sem backend próprio, a recuperação de senha da administradora deve ser feita
    // pelo fluxo de redefinição de senha do Firebase Auth ou pelo console.
    // Aqui suportamos o caso de "primeiro acesso" (criar admin se não existir).
    const st = await this.statusAdministradora();
    if (!st.configurada) {
      const r = await this.registrar({ nome: dados.nome, email: dados.email, senha: dados.senha, tipoPerfil: 'professor', primeiroAcessoAdmin: true });
      if (r.usuario) return r.usuario;
    }
    throw new ErroApi('A administradora já está configurada. Para redefinir a senha, use "Esqueceu sua senha?" ou o Firebase Authentication.', 400);
  },

  async receberCompra(compraId: string): Promise<{ etapa: string; entradaEstoque: number; pendente: number }> {
    return this.receberCompraParcial(compraId, { quantidadeRecebida: 0 });
  },

  async sair(): Promise<void> {
    try { await signOut(auth); } catch { /* */ }
    salvarSessaoLocal(null);
  },

  async validarSessao(): Promise<Usuario | null> {
    const u = await aguardarAuth();
    if (u) return u;
    if (auth.currentUser) {
      const perfil = await carregarPerfil(auth.currentUser.uid, auth.currentUser.email);
      if (perfil) { salvarSessaoLocal(perfil); return perfil; }
    }
    return this.obterSessao();
  },

  async obterStatus(): Promise<DatabaseConnectionStatus> {
    const [u, p, f, s, c, e, ca, oa] = await Promise.all([
      repoUsuarios.listar(), repoProdutos.listar(), repoFornecedores.listar(), repoSolicitacoes.listar(),
      repoCompras.listar(), repoEstoque.listar(), repoConsumosAluno.listar(), repoOcorrenciasAluno.listar()
    ]);
    const alunosCount = u.filter(usr => usr.tipoPerfil === 'aluno').length;
    const professoresCount = u.filter(usr => usr.tipoPerfil === 'professor' || usr.tipoPerfil === 'administrador').length;
    const total = u.length + p.length + f.length + s.length + c.length + e.length + ca.length + oa.length;
    const syncTime = localStorage.getItem(STORAGE_KEYS.ULTIMA_SINCRONIZACAO) || new Date().toISOString();
    const detailedStats: DatabaseDetailedStats = {
      totalGeral: total, produtos: p.length, alunos: alunosCount, professores: professoresCount,
      fornecedores: f.length, estoque: e.length, solicitacoes: s.length, compras: c.length,
      consumosAluno: ca.length, ocorrenciasAluno: oa.length
    };
    return {
      provedor: 'firebase', status: 'conectado', itensArmazenados: total, stats: detailedStats,
      ultimaSincronizacao: new Date(syncTime).toLocaleTimeString('pt-BR'),
      mensagem: `Firebase/Firestore conectado. ${total} registros sincronizados na nuvem.`
    };
  },

  async inicializarTabelasMySQL(): Promise<{ success: boolean; message: string }> {
    return { success: true, message: 'Usando Firebase/Firestore (não é necessário inicializar tabelas MySQL).' };
  },

  async exportarBackupJSON(): Promise<DatabaseBackup> {
    const [usuarios, produtos, fornecedores, solicitacoes, compras, estoque, consumosAluno, ocorrenciasAluno] = await Promise.all([
      repoUsuarios.listar(), repoProdutos.listar(), repoFornecedores.listar(), repoSolicitacoes.listar(),
      repoCompras.listar(), repoEstoque.listar(), repoConsumosAluno.listar(), repoOcorrenciasAluno.listar()
    ]);
    return { versao: '2.0.0', dataGeracao: new Date().toISOString(), origem: 'Matéria Reativa - Firebase', usuarios, produtos, fornecedores, solicitacoes, compras, estoque, consumosAluno, ocorrenciasAluno };
  },

  async zerarBaseDeDados(): Promise<void> {
    const cols = ['usuarios','produtos_quimicos','fornecedores','solicitacoes_laboratorio','compras_pedidos','estoque_lotes','consumos_aluno','ocorrencias_aluno','alertas','turmas','documentos_arquivo','compras_cotacoes'];
    for (const c of cols) {
      try {
        const snap = await getDocs(collection(db, c));
        const batch = writeBatch(db);
        snap.docs.forEach(d => batch.delete(d.ref));
        if (!snap.empty) await batch.commit();
      } catch { /* */ }
    }
    await this.sair();
  },

  async restaurarBackup(backup: DatabaseBackup): Promise<boolean> {
    const upsert = async (col: string, items: any[] | undefined) => {
      if (!Array.isArray(items)) return;
      for (const item of items) { if (item?.id) await setDoc(doc(db, col, item.id), limparUndefined(item), { merge: true }); }
    };
    await upsert('usuarios', backup.usuarios as any);
    await upsert('produtos_quimicos', backup.produtos as any);
    await upsert('fornecedores', backup.fornecedores as any);
    await upsert('solicitacoes_laboratorio', backup.solicitacoes as any);
    await upsert('compras_pedidos', backup.compras as any);
    await upsert('estoque_lotes', backup.estoque as any);
    await upsert('consumos_aluno', backup.consumosAluno as any);
    await upsert('ocorrencias_aluno', backup.ocorrenciasAluno as any);
    return true;
  },

  async gerarDumpSQL(): Promise<string> {
    return '-- Exportação SQL não disponível no modo Firebase. Use exportarBackupJSON().';
  }
};
