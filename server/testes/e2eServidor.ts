/* Servidor de teste ponta a ponta: serve o sistema compilado + a API real (rotas centrais) sobre SQLite. NÃO é usado em produção. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { criarApp } from './miniExpress.ts';
import { criarEsquemaLegado } from './esquema.ts';
import { criarDbSqlite } from '../db.ts';
import { registrarRotasCentrais, prepararBanco, cabecalhosSeguranca } from '../index.ts';

const RAIZ = path.resolve(import.meta.dirname, '../..');
const PORTA = Number(process.env.PORTA || 8900);
const TIPOS: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };

const db = await criarDbSqlite();
await criarEsquemaLegado(db);
for (const t of ['produtos_quimicos', 'estoque_lotes', 'fornecedores', 'compras_pedidos', 'solicitacoes_laboratorio', 'consumos_aluno', 'ocorrencias_aluno']) await db.run(`ALTER TABLE ${t} ADD COLUMN doc TEXT`);
const app = criarApp();
registrarRotasCentrais(app, db, { producao: false });

/* Rotas "antigas" de teste: guardam o objeto inteiro (camelCase, como o front envia) e espelham as colunas que as rotas novas usam. */
const espelhos: Record<string, (b: any) => Record<string, any>> = {
  produtos_quimicos: (b) => ({ nome: b.nome, estoque_atual: Number(b.estoqueAtual ?? 0), estoque_minimo: Number(b.estoqueMinimo ?? 0), unidade: b.unidade || 'L' }),
  estoque_lotes: (b) => ({ produto_nome: b.produto || '', quantidade_atual: Number(b.quantidadeAtual ?? 0), estoque_minimo: Number(b.estoqueMinimo ?? 0) }),
  fornecedores: () => ({ razao_social: null }), compras_pedidos: (b) => ({ produto: b.produto ?? null, status: b.status ?? null }), solicitacoes_laboratorio: (b) => ({ produto: b.produto ?? null, status: b.status ?? null }),
};
const montar = (rota: string, tabela: string) => {
  app.get(`/api/${rota}`, async (_q: any, res: any) => {
    const rows = await db.all<any>(`SELECT * FROM ${tabela}`);
    res.json(rows.map((r) => {
      const d = r.doc ? JSON.parse(r.doc) : { id: r.id };
      if (tabela === 'produtos_quimicos') d.estoqueAtual = Number(r.estoque_atual);
      if (tabela === 'estoque_lotes') { d.quantidadeAtual = Number(r.quantidade_atual); d.status = r.status_estoque; }
      return d;
    }));
  });
  app.post(`/api/${rota}`, async (req: any, res: any) => {
    const b = req.body, esp = espelhos[tabela](b), cols = Object.keys(esp);
    const existe = await db.get(`SELECT 1 AS x FROM ${tabela} WHERE id = ?`, [b.id]);
    if (existe) await db.run(`UPDATE ${tabela} SET doc = ?${cols.map((c) => `, ${c} = ?`).join('')} WHERE id = ?`, [JSON.stringify(b), ...cols.map((c) => esp[c]), b.id]);
    else await db.run(`INSERT INTO ${tabela} (id, doc${cols.map((c) => ', ' + c).join('')}) VALUES (?, ?${cols.map(() => ', ?').join('')})`, [b.id, JSON.stringify(b), ...cols.map((c) => esp[c])]);
    res.status(201).json(b);
  });
  app.delete(`/api/${rota}/:id`, async (req: any, res: any) => { await db.run(`DELETE FROM ${tabela} WHERE id = ?`, [req.params.id]); res.json({ ok: true }); });
};
montar('produtos', 'produtos_quimicos'); montar('fornecedores', 'fornecedores'); // estoque, compras e solicitações usam as rotas reais
app.get('/api/status', async (_q: any, res: any) => res.json({ status: 'conectado', provedor: 'MySQL', host: null, database: null }));

/* dados iniciais (via API, como a administradora faria) */
await prepararBanco(db, { ADMIN_EMAIL: 'katia@escola.com', ADMIN_INITIAL_PASSWORD: 'Lab#Seguro2026', ADMIN_NOME: 'Kátia' });
const adm = async (m: string, u: string, c?: any) => app.requisitar({ metodo: m, url: u, corpo: c, headers: { host: 'x' } });
const login = await app.requisitar({ metodo: 'POST', url: '/api/auth/login', corpo: { email: 'katia@escola.com', senha: 'Lab#Seguro2026', perfil: 'professor' }, headers: { host: 'x' } });
const cookie = String(login.headers['set-cookie']).split(';')[0];
const A = (m: string, u: string, c?: any) => app.requisitar({ metodo: m, url: u, corpo: c, headers: { host: 'x', cookie } });
void adm;
const ana = (await A('POST', '/api/usuarios', { nome: 'Prof Ana', email: 'ana@escola.com', senha: 'ana-senha-1', tipoPerfil: 'professor' })).corpo;
const bruno = (await A('POST', '/api/usuarios', { nome: 'Prof Bruno', email: 'bruno@escola.com', senha: 'bruno-senha-1', tipoPerfil: 'professor' })).corpo;
await A('POST', '/api/turmas', { nome: '3º Química A', professorIds: [ana.id] });
await A('POST', '/api/turmas', { nome: '3º Química B', professorIds: [bruno.id] });
await A('POST', '/api/usuarios', { nome: 'Aluno Alfa', email: 'alfa@escola.com', senha: 'alfa-senha-1', tipoPerfil: 'aluno', turma: '3º Química A', matricula: 'A1' });
await A('POST', '/api/usuarios', { nome: 'Aluno Beta', email: 'beta@escola.com', senha: 'beta-senha-1', tipoPerfil: 'aluno', turma: '3º Química B', matricula: 'B1' });
await A('POST', '/api/produtos', { id: 'P1', nome: 'Acetona', casNumber: '67-64-1', classePerigo: 'Líquido Inflamável Cat. 2', corPerigo: 'amarelo', situacao: 'Controlado', estoqueAtual: 10, estoqueMinimo: 2, unidade: 'L', formulaQuimica: 'C3H6O', pureza: '99%' });

const aplicarCabecalhos = cabecalhosSeguranca(process.env.CSP === '1'); // CSP=1 liga a política de produção
const servidor = http.createServer(async (req, res) => {
  aplicarCabecalhos(req, res, () => undefined);
  const url = new URL(req.url || '/', 'http://x');
  if (url.pathname.startsWith('/__teste/')) {
    if (url.pathname === '/__teste/expirar') { await db.run('DELETE FROM sessoes'); return void res.end('ok'); }
    if (url.pathname === '/__teste/consulta') { const rows = await db.all(String(url.searchParams.get('sql'))); res.setHeader('Content-Type', 'application/json'); return void res.end(JSON.stringify(rows)); }
  }
  if (url.pathname.startsWith('/api/')) {
    const partes: Buffer[] = []; for await (const p of req) partes.push(p as Buffer);
    let corpo: any; const txt = Buffer.concat(partes).toString();
    if (txt) { try { corpo = JSON.parse(txt); } catch { res.statusCode = 400; return void res.end('{"error":"JSON inválido"}'); } }
    const headers: Record<string, string> = {}; for (const [k, v] of Object.entries(req.headers)) headers[k] = String(v);
    const r = await app.requisitar({ metodo: req.method || 'GET', url: req.url || '/', headers, corpo, ip: req.socket.remoteAddress || '' });
    res.statusCode = r.status;
    for (const [k, v] of Object.entries(r.headers)) res.setHeader(k, v as any);
    res.setHeader('Content-Type', 'application/json'); return void res.end(r.corpo === undefined ? '' : JSON.stringify(r.corpo));
  }
  let arq = path.join(RAIZ, url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname));
  if (!arq.startsWith(RAIZ) || !fs.existsSync(arq) || fs.statSync(arq).isDirectory()) { res.statusCode = 404; return void res.end('nao encontrado'); }
  res.setHeader('Content-Type', TIPOS[path.extname(arq)] || 'application/octet-stream'); fs.createReadStream(arq).pipe(res);
});
servidor.listen(PORTA, '127.0.0.1', () => console.log('PRONTO ' + PORTA));
