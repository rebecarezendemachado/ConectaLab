/* Guardas globais da API: autenticação, autorização e trilha de auditoria.
   Protegem TAMBÉM as rotas antigas do server.ts, sem alterar o código delas. */
import type { Db } from './db.ts';
import * as seg from './seguranca.ts';
import { pode, classificarRota } from './politica.ts';
import { auditar } from './comum.ts';

const TABELAS: Record<string, string> = {
  produtos: 'produtos_quimicos', estoque: 'estoque_lotes', fornecedores: 'fornecedores', solicitacoes: 'solicitacoes_laboratorio',
  compras: 'compras_pedidos', consumos: 'consumos_aluno', ocorrencias: 'ocorrencias_aluno',
};
const ROTAS_PUBLICAS = new Set([
  'POST /api/auth/login',
  'POST /api/auth/registrar',
  'POST /api/auth/recuperar-admin',
  'GET /api/auth/admin-status',
  'GET /api/auth/turmas'
]);
const COM_AUDITORIA_GENERICA = new Set(['produtos', 'estoque', 'fornecedores', 'solicitacoes', 'compras', 'consumos', 'ocorrencias']);

/* Dados financeiros e comerciais: só a administradora enxerga. Professores e alunos recebem esses campos
   vazios/zerados (zero evita "NaN" nas telas que somam valores). */
const CAMPOS_TEXTO_RESTRITOS = ['fornecedorPrincipal', 'fornecedor', 'fornecedorNome', 'notaFiscal', 'notaFiscalUrl', 'condicoesPagamento'];
const CAMPOS_VALOR_RESTRITOS = ['valor', 'valorTotal', 'valorUnitario', 'precoUnitario', 'valorEstimado', 'valorCotado', 'valorAprovado', 'valorPago'];
const RECURSOS_COM_DADOS_RESTRITOS = new Set(['produtos', 'estoque', 'compras', 'solicitacoes']);
export function redigirRestrito(dado: any): any {
  if (Array.isArray(dado)) return dado.map(redigirRestrito);
  if (dado && typeof dado === 'object') {
    const copia: any = { ...dado };
    for (const k of CAMPOS_TEXTO_RESTRITOS) if (k in copia) copia[k] = '';
    for (const k of CAMPOS_VALOR_RESTRITOS) if (k in copia) copia[k] = 0;
    return copia;
  }
  return dado;
}
const COLUNA_FORNECEDOR: Record<string, { tabela: string; coluna: string; campo: string }> = {
  produtos: { tabela: 'produtos_quimicos', coluna: 'fornecedor_principal', campo: 'fornecedorPrincipal' },
  estoque: { tabela: 'estoque_lotes', coluna: 'fornecedor', campo: 'fornecedor' },
};

export function registrarGuardas(app: any, db: Db) {
  app.use('/api', async (req: any, res: any, next: any) => {
    try {
      const caminho = String(req.originalUrl || req.url || '').split('?')[0].replace(/\/+$/, '');
      const metodo = String(req.method).toUpperCase();
      const token = seg.lerCookies(req.headers?.cookie)[seg.NOME_COOKIE];
      req.usuario = await seg.obterSessao(db, token);

      if (ROTAS_PUBLICAS.has(`${metodo} ${caminho}`)) return next();
      if (!req.usuario) return res.status(401).json({ error: 'Sessão ausente ou expirada. Faça login novamente.' });

      // rotas de autenticação e a operação de consumo fazem a própria verificação fina
      if (caminho.startsWith('/api/auth/') || caminho.startsWith('/api/operacoes/')) return next();

      const cls = classificarRota(metodo, caminho);
      if (cls && cls.recurso !== 'usuarios' && !/^\/api\/turmas\/[^/]+\/alunos(?:\/[^/]+)?$/.test(caminho)) {
        let acao = cls.acao;
        const id = req.body?.id;
        // as rotas antigas gravam "criar ou atualizar" na mesma chamada: id já existente = edição
        if (acao === 'criar' && TABELAS[cls.recurso] && typeof id === 'string' && id) {
          const existe = await db.get(`SELECT 1 AS x FROM ${TABELAS[cls.recurso]} WHERE id = ?`, [id]);
          if (existe) acao = 'editar';
        }
        if (!pode(req.usuario.papel, cls.recurso, acao)) {
          await auditar(db, req, 'acesso_negado', cls.recurso, null, { metodo, caminho, acao });
          return res.status(403).json({ error: 'Você não tem permissão para realizar esta operação.' });
        }
        // dados financeiros/comerciais não saem do servidor para quem não é administradora
        const restrito = req.usuario.papel !== 'administrador' && RECURSOS_COM_DADOS_RESTRITOS.has(cls.recurso);
        if (restrito && metodo === 'GET') {
          const original = res.json.bind(res);
          res.json = (corpo: any) => original(redigirRestrito(corpo));
        }
        // compra que já entrou no fluxo de etapas: o status só muda pelas ações do fluxo (histórico e estoque dependem disso)
        if (cls.recurso === 'compras' && metodo === 'POST' && typeof id === 'string' && id && req.body) {
          const atual = await db.get<any>('SELECT status, fluxo_status FROM compras_pedidos WHERE id = ?', [id]);
          if (atual?.fluxo_status) req.body.status = atual.status;
        }
        // ao editar sem ver o fornecedor, o valor guardado NÃO pode ser apagado
        if (restrito && metodo === 'POST' && COLUNA_FORNECEDOR[cls.recurso] && typeof id === 'string' && id && req.body) {
          const c = COLUNA_FORNECEDOR[cls.recurso];
          const atual = await db.get<any>(`SELECT ${c.coluna} AS v FROM ${c.tabela} WHERE id = ?`, [id]);
          req.body[c.campo] = atual?.v ?? '';
        }
        // o aluno não pode se passar por outro ao registrar ocorrência
        if (cls.recurso === 'ocorrencias' && metodo === 'POST' && req.usuario.papel === 'aluno' && req.body) {
          req.body.alunoNome = req.usuario.nome;
          if (req.usuario.turma) req.body.turma = req.usuario.turma;
        }
        if (metodo !== 'GET' && COM_AUDITORIA_GENERICA.has(cls.recurso)) interceptarResposta(db, req, res, cls.recurso, metodo, id);
      }
      next();
    } catch (e: any) {
      if (String(e?.message || '').includes('MySQL desconectado')) return res.status(503).json({ error: 'Banco de dados indisponível no momento.' });
      console.error('[API] erro no guarda:', e?.message || e);
      res.status(500).json({ error: 'Erro interno.' });
    }
  });
}

/** Antes de responder: carimba o autor do registro; depois: grava a trilha de auditoria. */
function interceptarResposta(db: Db, req: any, res: any, recurso: string, metodo: string, id: unknown) {
  const original = res.json.bind(res);
  res.json = (corpo: any) => {
    const sucesso = res.statusCode >= 200 && res.statusCode < 300;
    const reg = (typeof corpo?.id === 'string' ? corpo.id : typeof id === 'string' ? id : null) as string | null;
    const depois = async () => {
      if (!sucesso) return;
      if (reg && (recurso === 'consumos' || recurso === 'ocorrencias') && metodo !== 'DELETE') {
        await db.run(`UPDATE ${TABELAS[recurso]} SET usuario_id = ? WHERE id = ? AND usuario_id IS NULL`, [req.usuario.id, reg]).catch(() => undefined);
      }
      await auditar(db, req, metodo === 'DELETE' ? 'excluir' : 'salvar', recurso, reg, metodo === 'DELETE' ? undefined : req.body);
    };
    depois().finally(() => original(corpo));
    return res;
  };
}
