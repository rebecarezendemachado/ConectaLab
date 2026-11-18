/* ============================================================================
   MODO LOCAL — banco de demonstração SEM MySQL (os dados ficam salvos entre reinícios).
   - Usa SQLite em memória para responder a todo o SQL existente.
   - Persiste um instantâneo JSON em ./dados-locais/materia-reativa.json (escrita atômica).
   - Roda as MESMAS rotas, permissões e regras do sistema real (login, perfis, turmas...).
   - Começa completamente vazio: nenhuma conta, produto, fornecedor, documento ou turma
     é criada automaticamente. Tudo é cadastrado pela própria interface.
   Nunca é ativado em produção (NODE_ENV=production).
   ============================================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { criarDbJson, criarDbSqlite } from './db.ts';
import type { Db, DbJson } from './db.ts';
import { registrarRotasCentrais, prepararBanco } from './index.ts';
import { migrar } from './migracoes.ts';
import { criarEsquemaLegado } from './testes/esquema.ts';
import * as seg from './seguranca.ts';
import { novoId, tratar } from './comum.ts';

const TABELAS_COM_DOC = ['produtos_quimicos', 'estoque_lotes', 'fornecedores', 'compras_pedidos', 'solicitacoes_laboratorio', 'consumos_aluno', 'ocorrencias_aluno'];

export interface OpcoesModoLocal {
  producao: boolean;
  origensPermitidas?: string[];
  env?: Record<string, string | undefined>;
  /** arquivo do instantâneo JSON (padrão: ./dados-locais/materia-reativa.json). Use ':memory:' em testes. */
  arquivo?: string;
  /** Permite usar o banco JSON mesmo em produ��ǜo (ex.: hospedagem sem MySQL, com disco persistente). */
  permitirProducao?: boolean;
}

export async function iniciarModoLocal(app: any, opc: OpcoesModoLocal): Promise<{ db: Db; arquivo: string; log: string[] }> {
  if (opc.producao && !opc.permitirProducao) throw new Error('O modo local n\u00e3o pode ser usado em produ\u00e7\u00e3o sem permitirProducao.');
  const env = opc.env || process.env;
  const arquivo = opc.arquivo ?? path.resolve(process.cwd(), 'dados-locais', 'materia-reativa.json');
  const persistente = arquivo !== ':memory:';
  if (persistente) fs.mkdirSync(path.dirname(arquivo), { recursive: true });

  const db: Db | DbJson = persistente ? await criarDbJson(arquivo) : await criarDbSqlite(':memory:');
  const jaTem = await db.get("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'usuarios'");
  if (!jaTem) {
    await criarEsquemaLegado(db);
    for (const t of TABELAS_COM_DOC) {
      if (!(await db.hasColumn(t, 'doc'))) await db.run(`ALTER TABLE ${t} ADD COLUMN doc TEXT`);
    }
  }

  // Cria todas as tabelas/colunas novas ANTES de restaurar o JSON, para que nenhum
  // registro histórico seja descartado por falta de estrutura.
  await migrar(db);
  if ('hidratar' in db) await (db as DbJson).hidratar();

  registrarRotasCentrais(app, db, { producao: false, origensPermitidas: opc.origensPermitidas });
  registrarRotasLegadasLocais(app, db, arquivo);

  // Se ADMIN_EMAIL / ADMIN_INITIAL_PASSWORD estiverem preenchidos no .env, a administradora é criada com eles;
  // no modo local, o formulário guiado pode configurar a conta uma vez, apenas pelo próprio computador.
  const log = await prepararBanco(db, env);
  return { db, arquivo, log };
}

/* ------------------------------ rotas "antigas" em SQLite ------------------------------ */
function registrarRotasLegadasLocais(app: any, db: Db, arquivo: string) {
  /* o front envia o objeto inteiro (camelCase): guardamos em "doc" e espelhamos as colunas que as rotas novas leem */
  const espelhos: Record<string, (b: any) => Record<string, any>> = {
    produtos_quimicos: (b) => ({ nome: b.nome, estoque_atual: Number(b.estoqueAtual ?? 0), estoque_minimo: Number(b.estoqueMinimo ?? 0), unidade: b.unidade || 'L',
      cas_number: b.cas ?? b.casNumber ?? '', formula_quimica: b.formulaQuimica ?? null, fornecedor_principal: b.fornecedorPrincipal ?? null }),
    fornecedores: (b) => ({ razao_social: b.razaoSocial ?? null }),
  };
  const montar = (rota: string, tabela: string) => {
    app.get(`/api/${rota}`, tratar(async (_req, res) => {
      const rows = await db.all<any>(`SELECT * FROM ${tabela}`);
      res.json(rows.map((r) => {
        const d = r.doc ? JSON.parse(r.doc) : { id: r.id, nome: r.nome };
        if (tabela === 'produtos_quimicos') d.estoqueAtual = Number(r.estoque_atual); // o estoque pode mudar por baixa de consumo
        return d;
      }));
    }));
    app.post(`/api/${rota}`, tratar(async (req, res) => {
      const b = req.body || {};
      if (!b.id || typeof b.id !== 'string') return res.status(400).json({ error: 'Registro sem identificador.' });
      const esp = espelhos[tabela](b), cols = Object.keys(esp);
      const existe = await db.get(`SELECT 1 AS x FROM ${tabela} WHERE id = ?`, [b.id]);
      if (existe) await db.run(`UPDATE ${tabela} SET doc = ?${cols.map((c) => `, ${c} = ?`).join('')} WHERE id = ?`, [JSON.stringify(b), ...cols.map((c) => esp[c]), b.id]);
      else await db.run(`INSERT INTO ${tabela} (id, doc${cols.map((c) => ', ' + c).join('')}) VALUES (?, ?${cols.map(() => ', ?').join('')})`, [b.id, JSON.stringify(b), ...cols.map((c) => esp[c])]);
      res.status(201).json(b);
    }));
    app.delete(`/api/${rota}/:id`, tratar(async (req, res) => {
      if (tabela === 'produtos_quimicos') await db.run('DELETE FROM estoque_lotes WHERE produto_id = ?', [String(req.params.id)]);
      await db.run(`DELETE FROM ${tabela} WHERE id = ?`, [String(req.params.id)]);
      res.json({ success: true, id: req.params.id });
    }));
  };
  montar('produtos', 'produtos_quimicos');
  montar('fornecedores', 'fornecedores');

  app.post('/api/ocorrencias', tratar(async (req, res) => {
    const o = req.body || {}, id = typeof o.id === 'string' && o.id ? o.id : novoId('OCO');
    await db.run(
      `INSERT INTO ocorrencias_aluno (id, aluno_nome, turma, bancada, tipo_ocorrencia, reagente_envolvido, gravidade, descricao, primeiros_socorros_adotados, data_ocorrencia, hora_ocorrencia, status_atendimento, usuario_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, o.alunoNome ?? req.usuario?.nome ?? '', o.turma ?? req.usuario?.turma ?? '', o.bancada ?? '', o.tipoOcorrencia ?? 'Outro', o.reagenteEnvolvido ?? '', o.gravidade ?? 'Leve',
        o.descricao ?? '', o.primeirosSocorrosAdotados ?? '', o.data ?? seg.agoraUtc().slice(0, 10), o.hora ?? '10:00:00', o.status ?? 'Notificado', req.usuario?.id ?? null],
    );
    res.status(201).json({ ...o, id });
  }));

  app.get('/api/status', (_req: any, res: any) => res.json({
    status: 'conectado', provedor: 'Banco local JSON (demonstração)', host: null, database: null, erro: null,
    ultimaVerificacao: new Date().toISOString(), instrucoes: `Modo demonstração: os dados ficam no arquivo ${arquivo === ':memory:' ? 'em memória (teste)' : arquivo}.`,
  }));
  app.post('/api/init-db', (_req: any, res: any) => res.json({ success: true, message: 'Modo local: banco já inicializado.' }));
}

export function bannerModoLocal(arquivo: string, url: string): string {
  return [
    '', '=====================================================================================',
    ' MODO LOCAL (demonstração, sem MySQL) — banco ZERADO e persistente em JSON:', ' ' + arquivo,
    '=====================================================================================',
    ` Abra ${url} e clique em "Administradora · Kátia":`,
    '   1) No computador do servidor, clique em "Configurar primeiro acesso da Kátia" e crie uma senha que só ela conheça.',
    '   2) Cadastre as turmas em "Turmas" e associe os professores responsáveis.',
    '   3) Alunos e professores podem se cadastrar e acessar imediatamente (sem aprovação manual).',
    ' Para apagar tudo e recomeçar: pare o servidor e apague a pasta dados-locais.',
    '=====================================================================================', '',
  ].join('\n');
}
