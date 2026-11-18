/* ============================================================================
   Camada de acesso ao banco (adaptador).
   - Produção: MySQL (mysql2/promise), o mesmo pool que o server.ts já usa.
   - Testes: SQLite (node:sqlite), apenas para validar a lógica sem MySQL.
   - Modo local (demonstração): SQLite em memória + instantâneo JSON em disco.
   Todo SQL novo usa "?" e um subconjunto compatível com os dois bancos.
   ============================================================================ */
import fs from 'node:fs';
import path from 'node:path';

export interface Db {
  dialect: 'mysql' | 'sqlite';
  all<T = any>(sql: string, params?: any[]): Promise<T[]>;
  get<T = any>(sql: string, params?: any[]): Promise<T | undefined>;
  run(sql: string, params?: any[]): Promise<{ changes: number }>;
  transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T>;
  hasColumn(table: string, column: string): Promise<boolean>;
}

/** Banco local com instantâneo JSON: mesmas consultas SQL, dados sobrevivem ao reinício. */
export interface DbJson extends Db {
  /** Lê o arquivo JSON (se existir) e preenche o banco em memória. Chamar após criar o esquema. */
  hidratar(): Promise<void>;
  /** Grava imediatamente o instantâneo atual (normalmente automático a cada escrita). */
  salvar(): Promise<void>;
}

/** Converte qualquer valor para algo que o driver aceita (undefined -> null). */
const limpar = (params: any[] = []) => params.map((p) => (p === undefined ? null : p));

function daConexao(conn: any, dialect: 'mysql'): Db {
  const self: Db = {
    dialect,
    async all(sql, params) {
      const [rows] = await conn.query(sql, limpar(params));
      return rows as any[];
    },
    async get(sql, params) {
      const [rows] = await conn.query(sql, limpar(params));
      return (rows as any[])[0];
    },
    async run(sql, params) {
      const [r] = await conn.query(sql, limpar(params));
      return { changes: Number((r as any)?.affectedRows ?? 0) };
    },
    async transaction() {
      throw new Error('Transação aninhada não suportada');
    },
    async hasColumn(table, column) {
      const r = await self.get<{ c: number }>(
        'SELECT COUNT(*) AS c FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?',
        [table, column],
      );
      return Number(r?.c ?? 0) > 0;
    },
  };
  return self;
}

/** Recebe uma função porque o server.ts pode recriar o pool ao reconectar. */
export function criarDbMysql(obterPool: () => any): Db {
  const pool = {
    query: (...a: any[]) => { const p = obterPool(); if (!p) throw new Error('MySQL desconectado'); return p.query(...a); },
    getConnection: () => { const p = obterPool(); if (!p) throw new Error('MySQL desconectado'); return p.getConnection(); },
  };
  const base = daConexao(pool, 'mysql');
  return {
    ...base,
    async transaction(fn) {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const resultado = await fn(daConexao(conn, 'mysql'));
        await conn.commit();
        return resultado;
      } catch (e) {
        try { await conn.rollback(); } catch { /* ignora */ }
        throw e;
      } finally {
        conn.release();
      }
    },
  };
}

/* ------------------------------- SQLite base ------------------------------- */
interface BaseSqlite {
  db: Db;
  /** Conexão bruta: usada só pelo instantâneo JSON (PRAGMA, lista de tabelas). */
  bd: any;
}

async function abrirSqlite(arquivo: string): Promise<BaseSqlite> {
  // @ts-ignore - módulo experimental do Node 22+
  const { DatabaseSync } = await import('node:sqlite');
  const bd = new DatabaseSync(arquivo);
  bd.exec('PRAGMA foreign_keys = ON');
  let fila: Promise<unknown> = Promise.resolve(); // serializa transações (uma conexão só)
  const self: Db = {
    dialect: 'sqlite',
    async all(sql, params) { return bd.prepare(sql).all(...limpar(params)) as any[]; },
    async get(sql, params) { return bd.prepare(sql).get(...limpar(params)) as any; },
    async run(sql, params) { const r = bd.prepare(sql).run(...limpar(params)); return { changes: Number(r.changes) }; },
    async transaction(fn) {
      const exec = async () => {
        bd.exec('BEGIN');
        try {
          const r = await fn(self);
          bd.exec('COMMIT');
          return r;
        } catch (e) {
          bd.exec('ROLLBACK');
          throw e;
        }
      };
      const p = fila.then(exec, exec);
      fila = p.catch(() => undefined);
      return p;
    },
    async hasColumn(table, column) {
      const cols = bd.prepare(`PRAGMA table_info(${table})`).all() as any[];
      return cols.some((c) => c.name === column);
    },
  };
  return { db: self, bd };
}

/** SQLite em memória ou arquivo — usado SOMENTE nos testes automatizados. */
export async function criarDbSqlite(arquivo = ':memory:'): Promise<Db> {
  return (await abrirSqlite(arquivo)).db;
}

/* --------------------------- JSON (modo demonstração) ---------------------------
   O banco em memória responde a todo o SQL existente. A cada escrita, um retrato
   completo das tabelas é gravado num único arquivo JSON (escrita atômica), de modo
   que reiniciar o servidor devolve exatamente o mesmo estado.

   Formato:
     { "schema": "materia-reativa/json-db", "versao": 1, "geradoEm": "...",
       "tabelas": { "usuarios": [ { ... } ], ... } }
   Valores BLOB viram { "$blob": "<base64>" }. Senhas continuam com hash scrypt. */
const FORMATO_JSON = 'materia-reativa/json-db';
const VERSAO_JSON = 1;

const ehBlob = (v: any): v is Uint8Array =>
  v instanceof Uint8Array || (typeof Buffer !== 'undefined' && Buffer.isBuffer(v));

const paraJson = (v: any): any => (ehBlob(v) ? { $blob: Buffer.from(v).toString('base64') } : v);
const deJson = (v: any): any => {
  if (v && typeof v === 'object' && !Array.isArray(v) && typeof v.$blob === 'string') {
    return Buffer.from(v.$blob, 'base64');
  }
  return v;
};

const escaparIdentificador = (nome: string) => `"${String(nome).replace(/"/g, '""')}"`;

export async function criarDbJson(arquivo: string): Promise<DbJson> {
  const { db: base, bd } = await abrirSqlite(':memory:');
  const destino = path.resolve(arquivo);
  fs.mkdirSync(path.dirname(destino), { recursive: true });

  let pronto = false; // só grava depois que o esquema existe e o JSON foi hidratado
  let transacaoAberta = 0;
  let filaSalvar: Promise<void> = Promise.resolve();

  const listarTabelas = (): string[] => {
    const rows = bd.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all() as any[];
    return rows.map((r) => String(r.name));
  };

  const instantaneo = (): any => {
    const tabelas: Record<string, any[]> = {};
    for (const tabela of listarTabelas()) {
      const linhas = bd.prepare(`SELECT * FROM ${escaparIdentificador(tabela)}`).all() as any[];
      tabelas[tabela] = linhas.map((linha) => {
        const copia: Record<string, any> = {};
        for (const [coluna, valor] of Object.entries(linha)) copia[coluna] = paraJson(valor);
        return copia;
      });
    }
    return { schema: FORMATO_JSON, versao: VERSAO_JSON, geradoEm: new Date().toISOString(), tabelas };
  };

  const gravar = async () => {
    const conteudo = JSON.stringify(instantaneo(), null, 2);
    const temporario = `${destino}.${process.pid}.tmp`;
    await fs.promises.writeFile(temporario, conteudo, 'utf8');
    try {
      await fs.promises.rename(temporario, destino); // troca atômica: nunca deixa JSON pela metade
    } catch (erro: any) {
      // No Windows, antivírus/indexadores podem manter o destino aberto e fazer
      // rename retornar EPERM. Fallback substitui o arquivo mantendo-o legível.
      if (process.platform !== 'win32' || !['EPERM', 'EACCES', 'EEXIST'].includes(erro?.code)) throw erro;
      await fs.promises.copyFile(temporario, destino);
      await fs.promises.unlink(temporario);
    }
  };

  const salvar = (): Promise<void> => {
    if (!pronto) return Promise.resolve();
    const p = filaSalvar.then(gravar, gravar);
    filaSalvar = p.catch(() => undefined);
    return p;
  };

  const db: DbJson = {
    dialect: 'sqlite',
    all: (sql, params) => base.all(sql, params),
    get: (sql, params) => base.get(sql, params),
    async run(sql, params) {
      const r = await base.run(sql, params);
      if (pronto && transacaoAberta === 0) await salvar();
      return r;
    },
    async transaction(fn) {
      transacaoAberta += 1;
      try {
        const r = await base.transaction((tx) => fn(tx));
        return r;
      } finally {
        transacaoAberta -= 1;
        if (pronto && transacaoAberta === 0) await salvar();
      }
    },
    hasColumn: (table, column) => base.hasColumn(table, column),
    async hidratar() {
      let dados: any = null;
      try {
        if (fs.existsSync(destino)) dados = JSON.parse(await fs.promises.readFile(destino, 'utf8'));
      } catch (e: any) {
        // Um JSON corrompido não pode impedir o sistema de abrir: preserva o arquivo e começa vazio.
        console.warn(`[Modo local] Não foi possível ler ${destino}: ${e?.message || e}. O arquivo foi preservado e o banco iniciou vazio.`);
        try { await fs.promises.rename(destino, `${destino}.corrompido-${Date.now()}`); } catch { /* ignora */ }
      }

      const tabelas: Record<string, any[]> = dados?.tabelas && typeof dados.tabelas === 'object' ? dados.tabelas : {};
      bd.exec('PRAGMA foreign_keys = OFF');
      bd.exec('BEGIN');
      try {
        for (const tabela of listarTabelas()) {
          const linhas = Array.isArray(tabelas[tabela]) ? tabelas[tabela] : [];
          if (!linhas.length) continue;
          const colunas = (bd.prepare(`PRAGMA table_info(${escaparIdentificador(tabela)})`).all() as any[]).map((c) => String(c.name));
          for (const linha of linhas) {
            const usadas = colunas.filter((c) => Object.prototype.hasOwnProperty.call(linha, c));
            if (!usadas.length) continue;
            const sql = `INSERT INTO ${escaparIdentificador(tabela)} (${usadas.map(escaparIdentificador).join(', ')}) VALUES (${usadas.map(() => '?').join(', ')})`;
            bd.prepare(sql).run(...usadas.map((c) => deJson(linha[c])));
          }
        }
        bd.exec('COMMIT');
      } catch (e) {
        bd.exec('ROLLBACK');
        throw e;
      } finally {
        bd.exec('PRAGMA foreign_keys = ON');
      }

      pronto = true;
      await salvar(); // cria o arquivo já vazio no primeiro uso e normaliza o formato
    },
    salvar: async () => { if (pronto) await salvar(); },
  };
  return db;
}
