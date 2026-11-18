import { test, before, describe } from 'node:test';
import assert from 'node:assert/strict';
import { criarApp, criarCliente } from './miniExpress.ts';
import { criarEsquemaLegado, registrarLegadoDeTeste } from './esquema.ts';
import { criarDbSqlite } from '../db.ts';
import { registrarRotasCentrais, prepararBanco } from '../index.ts';
import { _resetarLimitesParaTeste, agoraUtc, verificarSenha } from '../seguranca.ts';

const SENHA_ADM = 'Lab#Seguro2026';
let db: any, app: any;
const aparelho = (ip = '10.0.0.1') => criarCliente(app, ip);
const entrar = async (c: any, email: string, senha: string, perfil?: string) => c.post('/api/auth/login', { email, senha, perfil });

let kat: any, profA: any, profB: any, alunoA: any, alunoB: any, turmaA: string, turmaB: string;

before(async () => {
  db = await criarDbSqlite();
  await criarEsquemaLegado(db);
  app = criarApp();
  registrarRotasCentrais(app, db, { producao: false });
  registrarLegadoDeTeste(app, db);
  const log = await prepararBanco(db, { ADMIN_EMAIL: 'katia@escola.com', ADMIN_INITIAL_PASSWORD: SENHA_ADM, ADMIN_NOME: 'Kátia' });
  assert.ok(log.some((l) => l.includes('administradora criada')));

  kat = aparelho('10.1.0.1');
  assert.equal((await entrar(kat, 'katia@escola.com', SENHA_ADM, 'professor')).status, 200);
  // turmas e professores criados pela administradora
  const pa = (await kat.post('/api/usuarios', { nome: 'Prof Ana', email: 'ana@escola.com', senha: 'ana-senha-1', tipoPerfil: 'professor', departamento: 'Química' })).corpo;
  const pb = (await kat.post('/api/usuarios', { nome: 'Prof Bruno', email: 'bruno@escola.com', senha: 'bruno-senha-1', tipoPerfil: 'professor' })).corpo;
  const ta = (await kat.post('/api/turmas', { nome: '3º Química A', professorIds: [pa.id] })).corpo;
  const tb = (await kat.post('/api/turmas', { nome: '3º Química B', professorIds: [pb.id] })).corpo;
  turmaA = ta.id; turmaB = tb.id;
  await kat.post('/api/usuarios', { nome: 'Aluno Alfa', email: 'alfa@escola.com', senha: 'alfa-senha-1', tipoPerfil: 'aluno', turma: '3º Química A', matricula: 'A1', cpf: '111.222.333-44' });
  await kat.post('/api/usuarios', { nome: 'Aluno Beta', email: 'beta@escola.com', senha: 'beta-senha-1', tipoPerfil: 'aluno', turma: '3º Química B', matricula: 'B1' });
  profA = aparelho('10.1.0.2'); profB = aparelho('10.1.0.3'); alunoA = aparelho('10.1.0.4'); alunoB = aparelho('10.1.0.5');
  await entrar(profA, 'ana@escola.com', 'ana-senha-1', 'professor');
  await entrar(profB, 'bruno@escola.com', 'bruno-senha-1', 'professor');
  await entrar(alunoA, 'alfa@escola.com', 'alfa-senha-1', 'aluno');
  await entrar(alunoB, 'beta@escola.com', 'beta-senha-1', 'aluno');
  await db.run("INSERT INTO produtos_quimicos (id, nome, estoque_atual, estoque_minimo, unidade) VALUES ('P1', 'Acetona', 10, 2, 'L')");
  await db.run("INSERT INTO estoque_lotes (id, produto_id, produto_nome, quantidade_atual, estoque_minimo) VALUES ('E1', 'P1', 'Acetona', 10, 2)");
});

describe('1. Autenticação e sessão', () => {
  test('sem login, nenhuma rota da API responde dados (401)', async () => {
    const anon = aparelho('10.2.0.1');
    for (const u of ['/api/produtos', '/api/usuarios', '/api/estoque', '/api/alertas', '/api/turmas', '/api/auditoria', '/api/consumos'])
      assert.equal((await anon.get(u)).status, 401, u);
    assert.equal((await anon.post('/api/produtos', { id: 'X', nome: 'x' })).status, 401);
  });
  test('senhas guardadas com hash scrypt, nunca em texto puro', async () => {
    const rows = await db.all('SELECT email, senha_hash FROM usuarios');
    assert.ok(rows.length >= 5);
    for (const r of rows) assert.ok(r.senha_hash.startsWith('scrypt$'), r.email);
  });
  test('login errado: mensagem genérica (não revela se o e-mail existe) e limite de tentativas', async () => {
    _resetarLimitesParaTeste();
    const c = aparelho('10.2.0.2');
    const a = await entrar(c, 'ana@escola.com', 'errada'), b = await entrar(c, 'naoexiste@x.com', 'errada');
    assert.equal(a.status, 401); assert.equal(b.status, 401); assert.equal(a.corpo.error, b.corpo.error);
    for (let i = 0; i < 4; i++) await entrar(c, 'ana@escola.com', 'errada');
    const bloq = await entrar(c, 'ana@escola.com', 'ana-senha-1');
    assert.equal(bloq.status, 429, 'após 5 falhas até a senha certa fica bloqueada');
    assert.ok(bloq.headers['retry-after']);
    _resetarLimitesParaTeste();
  });
  test('cookie de sessão é HttpOnly e SameSite; /me devolve o usuário sem senha', async () => {
    const r = await entrar(aparelho('10.2.0.3'), 'ana@escola.com', 'ana-senha-1', 'professor');
    assert.equal(r.status, 200);
    assert.match(r.setCookie!, /HttpOnly/); assert.match(r.setCookie!, /SameSite=Lax/);
    assert.equal(JSON.stringify(r.corpo).includes('senha'), false);
    const me = await profA.get('/api/auth/me');
    assert.equal(me.corpo.usuario.email, 'ana@escola.com');
  });
  test('perfil errado na porta de entrada é recusado', async () => {
    assert.equal((await entrar(aparelho('10.2.0.4'), 'alfa@escola.com', 'alfa-senha-1', 'professor')).status, 403);
    assert.equal((await entrar(aparelho('10.2.0.5'), 'ana@escola.com', 'ana-senha-1', 'aluno')).status, 403);
  });
  test('logout invalida a sessão no servidor; cookie adulterado não entra', async () => {
    const c = aparelho('10.2.0.6'); await entrar(c, 'ana@escola.com', 'ana-senha-1', 'professor');
    const guardado = c.cookie;
    assert.equal((await c.get('/api/produtos')).status, 200);
    await c.post('/api/auth/logout');
    c.cookie = guardado; // reaproveitar o cookie antigo
    assert.equal((await c.get('/api/produtos')).status, 401);
    c.cookie = 'mr_sessao=' + 'a'.repeat(43);
    assert.equal((await c.get('/api/produtos')).status, 401);
  });
  test('sessão expirada no banco deixa de valer', async () => {
    const c = aparelho('10.2.0.7'); await entrar(c, 'beta@escola.com', 'beta-senha-1', 'aluno');
    assert.equal((await c.get('/api/auth/me')).status, 200);
    await db.run('UPDATE sessoes SET expira_em = ? WHERE ip = ?', ['2000-01-01 00:00:00', '10.2.0.7']);
    assert.equal((await c.get('/api/auth/me')).status, 401);
  });
  test('proteção CSRF: alteração vinda de outro site é bloqueada', async () => {
    const r = await kat.post('/api/produtos', { id: 'PX', nome: 'X' }, { origin: 'https://site-malicioso.com' });
    assert.equal(r.status, 403);
    const ok = await kat.post('/api/produtos', { id: 'PX', nome: 'X', estoque_atual: 1, estoque_minimo: 0, unidade: 'L' }, { origin: 'http://app.local' });
    assert.equal(ok.status, 201);
    await kat.del('/api/produtos/PX');
  });
  test('desativar a conta derruba as sessões imediatamente', async () => {
    const c = aparelho('10.2.0.8');
    const novo = (await kat.post('/api/usuarios', { nome: 'Temp', email: 'temp@escola.com', senha: 'temp-senha-1', tipoPerfil: 'aluno', turma: '3º Química A' })).corpo;
    await entrar(c, 'temp@escola.com', 'temp-senha-1', 'aluno');
    assert.equal((await c.get('/api/auth/me')).status, 200);
    await kat.post('/api/usuarios', { id: novo.id, nome: 'Temp', email: 'temp@escola.com', tipoPerfil: 'aluno', turma: '3º Química A', status: 'inativo' });
    assert.equal((await c.get('/api/auth/me')).status, 401);
    assert.equal((await entrar(aparelho('10.2.0.9'), 'temp@escola.com', 'temp-senha-1', 'aluno')).status, 403);
    await kat.del(`/api/usuarios/${novo.id}`);
  });
  test('troca de senha derruba as OUTRAS sessões e exige a senha atual correta', async () => {
    const um = aparelho('10.2.0.10'), dois = aparelho('10.2.0.11');
    await kat.post('/api/usuarios', { nome: 'Dois', email: 'dois@escola.com', senha: 'dois-senha-1', tipoPerfil: 'aluno', turma: '3º Química A' });
    await entrar(um, 'dois@escola.com', 'dois-senha-1', 'aluno'); await entrar(dois, 'dois@escola.com', 'dois-senha-1', 'aluno');
    assert.equal((await um.post('/api/auth/trocar-senha', { senhaAtual: 'errada', novaSenha: 'nova-senha-9' })).status, 403);
    assert.equal((await um.post('/api/auth/trocar-senha', { senhaAtual: 'dois-senha-1', novaSenha: 'nova-senha-9' })).status, 200);
    assert.equal((await um.get('/api/auth/me')).status, 200);
    assert.equal((await dois.get('/api/auth/me')).status, 401);
  });
});

describe('2. Cadastro público (acesso imediato)', () => {
  test('aluno se cadastra apenas em turma ativa com professor e entra direto', async () => {
    const c = aparelho('10.3.0.1');
    const r = await c.post('/api/auth/registrar', { nome: 'Novo Aluno', email: 'novo@escola.com', senha: 'novo-senha-1', tipoPerfil: 'aluno', turma: '3º Química A' });
    assert.equal(r.status, 201);
    assert.equal((await c.get('/api/auth/me')).corpo.usuario.tipoPerfil, 'aluno');
    // Turma não é criada automaticamente: o aluno só entra em uma sala já organizada pela administradora.
    const semTurma = await aparelho('10.3.0.5').post('/api/auth/registrar', { nome: 'Sem Sala', email: 'semsala@escola.com', senha: 'semsala-senha-1', tipoPerfil: 'aluno', turma: '1º Info' });
    assert.equal(semTurma.status, 422);
    assert.equal(await db.get("SELECT id FROM turmas WHERE nome = '1º Info'"), undefined);
  });
  test('professor que se cadastra entra imediatamente como ativo (sem aprovação manual)', async () => {
    const c = aparelho('10.3.0.2');
    const r = await c.post('/api/auth/registrar', { nome: 'Prof Novo', email: 'profnovo@escola.com', senha: 'profnovo-1', tipoPerfil: 'professor' });
    assert.equal(r.status, 201);
    assert.equal(r.corpo.usuario.tipoPerfil, 'professor');
    assert.equal(r.corpo.usuario.status, 'ativo');
    assert.equal((await entrar(c, 'profnovo@escola.com', 'profnovo-1', 'professor')).status, 200);
  });
  test('ninguém vira administrador por cadastro livre; e-mail duplicado e senha fraca são recusados', async () => {
    const c = aparelho('10.3.0.3');
    await c.post('/api/auth/registrar', { nome: 'Hacker', email: 'hacker@x.com', senha: 'hacker-senha-1', tipoPerfil: 'administrador', turma: '3º Química A' });
    assert.equal((await db.get("SELECT tipo_perfil FROM usuarios WHERE email = 'hacker@x.com'")).tipo_perfil, 'aluno');
    assert.equal((await c.post('/api/auth/registrar', { nome: 'Dup', email: 'ana@escola.com', senha: 'dup-senha-1', turma: '3º Química A' })).status, 409);
    assert.equal((await c.post('/api/auth/registrar', { nome: 'Fraco', email: 'fraco@x.com', senha: '123456', turma: '3º Química A' })).status, 400);
  });
  test('senha antiga em texto puro (legado) é convertida e o login continua funcionando', async () => {
    await db.run("INSERT INTO usuarios (id, nome, email, senha_hash, tipo_perfil, turma) VALUES ('LEG1', 'Legado', 'legado@escola.com', 'senhaantiga9', 'aluno', '3º Química A')");
    const log = await prepararBanco(db, {});
    assert.ok(log.some((l) => l.includes('protegida')));
    assert.ok((await db.get("SELECT senha_hash FROM usuarios WHERE id = 'LEG1'")).senha_hash.startsWith('scrypt$'));
    assert.equal((await entrar(aparelho('10.3.0.4'), 'legado@escola.com', 'senhaantiga9', 'aluno')).status, 200);
  });
});

describe('3. Permissões por perfil (verificadas no servidor)', () => {
  test('aluno: consulta produtos, mas não cadastra/edita/exclui nem mexe em estoque', async () => {
    assert.equal((await alunoA.get('/api/produtos')).status, 200);
    assert.equal((await alunoA.post('/api/produtos', { id: 'PZ', nome: 'Z' })).status, 403);
    assert.equal((await alunoA.post('/api/produtos', { id: 'P1', nome: 'Acetona', estoque_atual: 999 })).status, 403);
    assert.equal((await alunoA.post('/api/estoque', { id: 'E1', quantidade_atual: 999 })).status, 403);
    assert.equal((await alunoA.del('/api/produtos/P1')).status, 403);
    assert.equal(Number((await db.get("SELECT estoque_atual AS q FROM produtos_quimicos WHERE id='P1'")).q), 10);
  });
  test('aluno: sem acesso a fornecedores, compras, solicitações, auditoria e gestão de usuários', async () => {
    for (const u of ['/api/fornecedores', '/api/compras', '/api/solicitacoes', '/api/auditoria']) assert.equal((await alunoA.get(u)).status, 403, u);
    assert.equal((await alunoA.post('/api/usuarios', { nome: 'X', email: 'x@x.com', senha: 'abcdef1', tipoPerfil: 'aluno', turma: 'T' })).status, 403);
    assert.equal((await alunoA.post('/api/turmas', { nome: 'Nova' })).status, 403);
  });
  test('professor consulta o catálogo e dá baixa, mas não cadastra, edita nem exclui produtos/estoque', async () => {
    assert.equal((await profA.post('/api/produtos', { id: 'P2', nome: 'Etanol', estoque_atual: 5, estoque_minimo: 1, unidade: 'L' })).status, 403);
    assert.equal((await profA.post('/api/estoque', { id: 'E2', produto: 'Etanol', quantidadeAtual: 5, estoqueMinimo: 1, unidade: 'L' })).status, 403);
    assert.equal((await profA.post('/api/produtos', { id: 'P1', nome: 'Acetona', estoque_atual: 999, estoque_minimo: 2, unidade: 'L' })).status, 403);
    assert.equal((await profA.del('/api/produtos/P1')).status, 403);
    assert.equal(Number((await db.get("SELECT estoque_atual AS q FROM produtos_quimicos WHERE id='P1'")).q), 10, 'o professor não altera o saldo pelo catálogo');
    assert.equal((await profA.get('/api/produtos')).status, 200);
    assert.equal((await profA.post('/api/fornecedores', { id: 'F1', razao_social: 'ACME' })).status, 403);
    assert.equal((await profA.get('/api/fornecedores')).status, 403, 'professor não vê fornecedores');
    assert.equal((await profA.get('/api/auditoria')).status, 403);

    // A baixa de estoque continua permitida ao professor, mas só pela operação atômica.
    assert.equal((await kat.post('/api/produtos', { id: 'PP', nome: 'Reagente Baixa', estoque_atual: 2, estoque_minimo: 1, unidade: 'L' })).status, 201);
    const baixa = await profA.post('/api/operacoes/consumo', { produtoNome: 'Reagente Baixa', quantidade: 1, turma: '3º Química A' });
    assert.equal(baixa.status, 201);
    assert.equal(Number((await db.get("SELECT estoque_atual AS q FROM produtos_quimicos WHERE id='PP'")).q), 1);
    await kat.del('/api/produtos/PP');
  });
  test('professor NÃO administra compras: não cria, não edita, não exclui (só a Kátia)', async () => {
    assert.equal((await profA.post('/api/compras', { id: 'C1', produto: 'Acetona', quantidade: '1', status: 'Recebido', fornecedor: 'X', valor: 5 })).status, 403);
    assert.equal((await alunoA.get('/api/compras')).status, 403);
    assert.equal((await kat.post('/api/compras', { id: 'C1', produto: 'Acetona', quantidade: '1', status: 'Pedido realizado', fornecedor: 'ACME Química', valor: 1234.5 })).status, 201);
    assert.equal((await profA.post('/api/compras', { id: 'C1', produto: 'Acetona', quantidade: '1', status: 'Recebido' })).status, 403);
    assert.equal((await profA.del('/api/compras/C1')).status, 403);
    assert.equal((await db.get("SELECT status FROM compras_pedidos WHERE id='C1'")).status, 'Pedido realizado');
  });
  test('professor consulta compras só no nível operacional: sem fornecedor, valores nem nota fiscal', async () => {
    const dele = (await profA.get('/api/compras')).corpo.find((c: any) => c.id === 'C1');
    assert.equal(dele.produto, 'Acetona'); assert.equal(dele.status, 'Pedido realizado');
    assert.equal(dele.fornecedor, ''); assert.equal(dele.valor, 0);
    const dela = (await kat.get('/api/compras')).corpo.find((c: any) => c.id === 'C1');
    assert.equal(dela.fornecedor, 'ACME Química'); assert.equal(dela.valor, 1234.5);
    assert.equal(JSON.stringify((await profA.get('/api/compras')).corpo).includes('1234'), false);
  });
  test('professor solicita material (solicitação) mas não aprova', async () => {
    assert.equal((await profA.post('/api/solicitacoes', { id: 'S1', produto: 'Acetona', quantidade: '2 L', status: 'Aprovada', solicitante: 'Outra Pessoa' })).status, 201);
    assert.equal((await db.get("SELECT status, solicitante FROM solicitacoes_laboratorio WHERE id='S1'")).status, 'Em análise', 'professor não se auto-aprova');
    assert.equal((await db.get("SELECT solicitante FROM solicitacoes_laboratorio WHERE id='S1'")).solicitante, 'Prof Ana', 'o nome vem da sessão');
    assert.equal((await profA.post('/api/solicitacoes', { id: 'S1', produto: 'Acetona', quantidade: '2 L', status: 'Aprovada' })).status, 403);
    assert.equal((await db.get("SELECT status FROM solicitacoes_laboratorio WHERE id='S1'")).status, 'Em análise');
    assert.equal((await kat.post('/api/solicitacoes', { id: 'S1', produto: 'Acetona', quantidade: '2 L', status: 'Aprovada' })).status, 200);
  });
  test('fornecedor de produto/estoque fica oculto para professor e aluno e NÃO é apagado quando o professor edita', async () => {
    await kat.post('/api/produtos', { id: 'P3', nome: 'Éter', estoqueAtual: 4, estoqueMinimo: 1, unidade: 'L', fornecedorPrincipal: 'Casa Química' });
    await kat.post('/api/estoque', { id: 'E3', produto: 'Éter', quantidadeAtual: 4, estoqueMinimo: 1, fornecedor: 'Casa Química' });
    for (const c of [profA, alunoA]) {
      assert.equal((await c.get('/api/produtos')).corpo.find((p: any) => p.id === 'P3').fornecedorPrincipal, '');
      assert.equal((await c.get('/api/estoque')).corpo.find((e: any) => e.id === 'E3').fornecedor, '');
    }
    // o professor edita a quantidade sem ver o fornecedor
    assert.equal((await profA.post('/api/produtos', { id: 'P3', nome: 'Éter', estoqueAtual: 3, estoqueMinimo: 1, unidade: 'L', fornecedorPrincipal: '' })).status, 201);
    assert.equal((await profA.post('/api/estoque', { id: 'E3', produto: 'Éter', quantidadeAtual: 3, estoqueMinimo: 1, fornecedor: '' })).status, 200);
    assert.equal((await db.get("SELECT fornecedor_principal AS f, estoque_atual AS q FROM produtos_quimicos WHERE id='P3'")).f, 'Casa Química');
    assert.equal((await db.get("SELECT fornecedor AS f FROM estoque_lotes WHERE id='E3'")).f, 'Casa Química');
    assert.equal(Number((await db.get("SELECT estoque_atual AS q FROM produtos_quimicos WHERE id='P3'")).q), 3, 'a quantidade foi atualizada');
    assert.equal((await kat.get('/api/produtos')).corpo.find((p: any) => p.id === 'P3').fornecedorPrincipal, 'Casa Química');
    await kat.del('/api/produtos/P3');
  });
  test('administradora (Kátia): acesso global, inclusive exclusão e auditoria', async () => {
    assert.equal((await kat.post('/api/fornecedores', { id: 'F1', razao_social: 'ACME' })).status, 201);
    assert.equal((await kat.del('/api/produtos/P2')).status, 200);
    const aud = await kat.get('/api/auditoria?limite=200');
    assert.equal(aud.status, 200); assert.ok(aud.corpo.length > 5);
  });
  test('acesso negado fica registrado na auditoria', async () => {
    const aud = (await kat.get('/api/auditoria?limite=500')).corpo;
    assert.ok(aud.some((a: any) => a.acao === 'acesso_negado' && a.usuarioNome === 'Aluno Alfa'));
  });
  test('trilha de auditoria registra autor, ação e entidade das alterações', async () => {
    const aud = (await kat.get('/api/auditoria?entidade=produtos&limite=100')).corpo;
    const criou = aud.find((a: any) => a.acao === 'salvar' && a.entidadeId === 'P2');
    assert.ok(criou); assert.equal(criou.usuarioNome, 'Prof Ana'); assert.equal(criou.papel, 'professor');
    assert.ok(aud.some((a: any) => a.acao === 'excluir' && a.usuarioNome === 'Kátia'));
  });
  test('aluno não consegue virar administrador editando o próprio perfil', async () => {
    const me = (await alunoA.get('/api/auth/me')).corpo.usuario;
    const r = await alunoA.post('/api/usuarios', { id: me.id, nome: 'Aluno Alfa', email: 'alfa@escola.com', tipoPerfil: 'administrador', status: 'ativo', telefone: '9999' });
    assert.equal(r.status, 200);
    const u = await db.get('SELECT tipo_perfil FROM usuarios WHERE id = ?', [me.id]);
    assert.equal(u.tipo_perfil, 'aluno');
    assert.equal((await alunoA.get('/api/auditoria')).status, 403);
  });
  test('aluno não consegue alterar o cadastro de OUTRO usuário', async () => {
    const b = await db.get("SELECT id FROM usuarios WHERE email = 'beta@escola.com'");
    assert.equal((await alunoA.post('/api/usuarios', { id: b.id, nome: 'Invadido', email: 'beta@escola.com', tipoPerfil: 'aluno', turma: '3º Química A' })).status, 403);
    assert.equal((await db.get('SELECT nome FROM usuarios WHERE id = ?', [b.id])).nome, 'Aluno Beta');
  });
});

describe('4. Quem vê quem (escopo por turma)', () => {
  const emails = (lista: any[]) => lista.map((u) => u.email).sort();
  test('aluno vê somente a si mesmo', async () => {
    const l = (await alunoA.get('/api/usuarios')).corpo;
    assert.deepEqual(emails(l), ['alfa@escola.com']);
  });
  test('professor vê só alunos das SUAS turmas (e a equipe docente)', async () => {
    const a = emails((await profA.get('/api/usuarios')).corpo), b = emails((await profB.get('/api/usuarios')).corpo);
    assert.ok(a.includes('alfa@escola.com') && !a.includes('beta@escola.com'));
    assert.ok(b.includes('beta@escola.com') && !b.includes('alfa@escola.com'));
  });
  test('administradora vê todos; nenhum retorno expõe senha/hash; CPF só para o dono e a administradora', async () => {
    const todos = (await kat.get('/api/usuarios')).corpo;
    assert.ok(todos.length >= 8);
    assert.equal(JSON.stringify(todos).includes('senha'), false);
    assert.equal(todos.find((u: any) => u.email === 'alfa@escola.com').cpf, '111.222.333-44');
    const paraProf = (await profA.get('/api/usuarios')).corpo.find((u: any) => u.email === 'alfa@escola.com');
    assert.equal(paraProf.cpf, undefined);
  });
  test('professor cadastra aluno só nas suas turmas; não cria professor nem aluno em turma alheia', async () => {
    assert.equal((await profA.post('/api/usuarios', { nome: 'Aluno Gama', email: 'gama@escola.com', senha: 'gama-senha-1', tipoPerfil: 'aluno', turma: '3º Química A' })).status, 201);
    assert.equal((await profA.post('/api/usuarios', { nome: 'Fora', email: 'fora@escola.com', senha: 'fora-senha-1', tipoPerfil: 'aluno', turma: '3º Química B' })).status, 403);
    assert.equal((await profA.post('/api/usuarios', { nome: 'P', email: 'p@escola.com', senha: 'p-senha-123', tipoPerfil: 'professor' })).status, 403);
    const criado = (await kat.get('/api/usuarios')).corpo.find((u: any) => u.email === 'gama@escola.com');
    assert.equal(criado.criadoPorNome, 'Prof Ana', 'identifica quem realizou o cadastro');
  });
  test('turmas: cada perfil vê só o que pode; aluno não vê a lista de colegas', async () => {
    const adm = (await kat.get('/api/turmas')).corpo, pa = (await profA.get('/api/turmas')).corpo, al = (await alunoA.get('/api/turmas')).corpo;
    assert.ok(adm.length >= 3);
    assert.deepEqual(pa.map((t: any) => t.nome), ['3º Química A']);
    assert.deepEqual(al.map((t: any) => t.nome), ['3º Química A']);
    assert.equal(al[0].alunos, undefined); assert.ok(al[0].totalAlunos >= 2);
    assert.ok(pa[0].alunos.length >= 2); assert.deepEqual(pa[0].professores.map((p: any) => p.nome), ['Prof Ana']);
  });
  test('turmas: professor não cria/exclui turma e não mexe em turma alheia; turma com alunos não é excluída', async () => {
    assert.equal((await profA.post('/api/turmas', { nome: 'Pirata' })).status, 403);
    assert.equal((await profA.del(`/api/turmas/${turmaA}`)).status, 403);
    const b = await db.get("SELECT id FROM usuarios WHERE email = 'beta@escola.com'");
    assert.equal((await profA.post(`/api/turmas/${turmaB}/alunos`, { alunoIds: [b.id] })).status, 403);
    assert.equal((await kat.del(`/api/turmas/${turmaA}`)).status, 409);
  });
});

describe('5. Dados compartilhados entre aparelhos', () => {
  test('produto cadastrado no computador aparece no celular de outro professor; edição e exclusão também', async () => {
    const pc = aparelho('10.5.0.1'), celular = aparelho('10.5.0.2');
    await entrar(pc, 'ana@escola.com', 'ana-senha-1', 'professor'); await entrar(celular, 'bruno@escola.com', 'bruno-senha-1', 'professor');
    assert.equal((await pc.post('/api/produtos', { id: 'PSYNC', nome: 'Ácido Teste', estoque_atual: 7, estoque_minimo: 1, unidade: 'L' })).status, 201);
    let lista = (await celular.get('/api/produtos')).corpo;
    assert.equal(lista.find((p: any) => p.id === 'PSYNC').nome, 'Ácido Teste');
    await pc.post('/api/produtos', { id: 'PSYNC', nome: 'Ácido Teste v2', estoque_atual: 6, estoque_minimo: 1, unidade: 'L' });
    assert.equal((await celular.get('/api/produtos')).corpo.find((p: any) => p.id === 'PSYNC').nome, 'Ácido Teste v2');
    await kat.del('/api/produtos/PSYNC');
    assert.equal((await celular.get('/api/produtos')).corpo.find((p: any) => p.id === 'PSYNC'), undefined);
  });
  test('persistência: sair e entrar de novo mantém os dados', async () => {
    const c = aparelho('10.5.0.3'); await entrar(c, 'ana@escola.com', 'ana-senha-1', 'professor');
    await c.post('/api/auth/logout');
    const c2 = aparelho('10.5.0.4'); await entrar(c2, 'ana@escola.com', 'ana-senha-1', 'professor');
    assert.ok((await c2.get('/api/produtos')).corpo.some((p: any) => p.id === 'P1'));
  });
});

describe('6. Baixa de estoque atômica e alertas', () => {
  test('dois aparelhos consumindo AO MESMO TEMPO não perdem baixas (10 − 3 − 4 = 3)', async () => {
    const [r1, r2] = await Promise.all([
      alunoA.post('/api/operacoes/consumo', { produtoNome: 'Acetona', quantidade: 3, pratica: 'Aula 1' }),
      alunoB.post('/api/operacoes/consumo', { produtoNome: 'Acetona', quantidade: 4, pratica: 'Aula 2' }),
    ]);
    assert.equal(r1.status, 201); assert.equal(r2.status, 201);
    assert.equal(Number((await db.get("SELECT estoque_atual AS q FROM produtos_quimicos WHERE id='P1'")).q), 3);
    const lote = await db.get("SELECT quantidade_atual AS q, status_estoque AS s FROM estoque_lotes WHERE id='E1'");
    assert.equal(Number(lote.q), 3); assert.equal(lote.s, 'Normal'); // 3 está acima do mínimo (2)
  });
  test('o consumo mostra a quantidade real e o autor vem da sessão (não do cliente)', async () => {
    const r = await alunoA.post('/api/operacoes/consumo', { produtoNome: 'acetona', quantidade: 1, autorNome: 'Kátia', autorPerfil: 'professor' });
    assert.equal(r.corpo.alerta.autorNome, 'Aluno Alfa'); assert.equal(r.corpo.alerta.autorPerfil, 'aluno');
    assert.equal(Number(r.corpo.produto.estoqueAtual), 2);
    assert.equal((await db.get("SELECT status_estoque AS s FROM estoque_lotes WHERE id='E1'")).s, 'Estoque baixo'); // saldo 2 = mínimo
  });
  test('estoque no mínimo gera alerta crítico; zerar gera "esgotado"; nunca fica negativo', async () => {
    const r = await alunoA.post('/api/operacoes/consumo', { produtoNome: 'Acetona', quantidade: 50 });
    assert.equal(r.corpo.alerta.tipo, 'falta_estoque'); assert.equal(Number(r.corpo.produto.estoqueAtual), 0);
    assert.equal((await db.get("SELECT status_estoque AS s FROM estoque_lotes WHERE id='E1'")).s, 'Esgotado');
  });
  test('quantidades inválidas (zero, negativa, texto) são recusadas', async () => {
    for (const q of [0, -5, 'abc', null]) assert.equal((await alunoA.post('/api/operacoes/consumo', { produtoNome: 'Acetona', quantidade: q })).status, 400);
    assert.equal((await alunoA.post('/api/operacoes/consumo', { quantidade: 1 })).status, 400);
  });
  test('alerta de aluno chega só ao professor da turma dele e à administradora', async () => {
    await alunoA.post('/api/operacoes/consumo', { produtoNome: 'Etanol', quantidade: 1 }); // produto inexistente: gera aviso 'consumo'
    const doA = (await profA.get('/api/alertas')).corpo, doB = (await profB.get('/api/alertas')).corpo, adm = (await kat.get('/api/alertas')).corpo;
    const titulo = (l: any[]) => l.filter((a) => a.titulo.includes('Etanol')).length;
    assert.equal(titulo(doA), 1, 'professor da turma recebe'); assert.equal(titulo(doB), 0, 'professor de outra turma NÃO recebe');
    assert.equal(titulo(adm), 1, 'administradora recebe');
    assert.equal((await alunoA.get('/api/alertas')).corpo.length, 0, 'aluno não recebe notificações');
  });
  test('alerta de estoque crítico vai a toda a gestão; marcar como lido vale só para quem marcou', async () => {
    const dosDois = [(await profA.get('/api/alertas')).corpo, (await profB.get('/api/alertas')).corpo];
    for (const l of dosDois) assert.ok(l.some((a: any) => a.tipo === 'falta_estoque'));
    const alvo = dosDois[0].find((a: any) => a.tipo === 'falta_estoque');
    await profA.post('/api/alertas', { id: alvo.id, lida: true });
    assert.equal((await profA.get('/api/alertas')).corpo.find((a: any) => a.id === alvo.id).lida, true);
    assert.equal((await profB.get('/api/alertas')).corpo.find((a: any) => a.id === alvo.id).lida, false);
  });
  test('o aluno não consegue forjar autoria de alertas', async () => {
    const r = await alunoA.post('/api/alertas', { titulo: 'Aviso', mensagem: 'acabou', autorNome: 'Kátia', autorPerfil: 'professor', tipo: 'falta_estoque' });
    assert.equal(r.status, 201); assert.equal(r.corpo.autorNome, 'Aluno Alfa'); assert.equal(r.corpo.autorPerfil, 'aluno');
  });
  test('consumos: aluno vê só os próprios; professor só os da sua turma; administradora vê todos', async () => {
    const a = (await alunoA.get('/api/consumos')).corpo, b = (await alunoB.get('/api/consumos')).corpo;
    assert.ok(a.length >= 3 && a.every((c: any) => c.alunoNome === 'Aluno Alfa'));
    assert.ok(b.length === 1 && b[0].alunoNome === 'Aluno Beta');
    const pa = (await profA.get('/api/consumos')).corpo, pb = (await profB.get('/api/consumos')).corpo;
    assert.ok(pa.every((c: any) => c.turma === '3º Química A')); assert.ok(pb.every((c: any) => c.turma === '3º Química B'));
    assert.ok((await kat.get('/api/consumos')).corpo.length >= 4);
  });
  test('ocorrência registrada por aluno: nome/turma vêm da sessão e só ele (e sua gestão) enxergam', async () => {
    const r = await alunoA.post('/api/ocorrencias', { id: 'OC1', alunoNome: 'Outra Pessoa', turma: 'Qualquer', descricao: 'vidro quebrado' });
    assert.equal(r.status, 201);
    const row = await db.get("SELECT aluno_nome, turma, usuario_id FROM ocorrencias_aluno WHERE id='OC1'");
    assert.equal(row.aluno_nome, 'Aluno Alfa'); assert.equal(row.turma, '3º Química A'); assert.ok(row.usuario_id);
    assert.equal((await alunoB.get('/api/ocorrencias')).corpo.length, 0);
    assert.equal((await alunoA.get('/api/ocorrencias')).corpo.length, 1);
    assert.equal((await profB.get('/api/ocorrencias')).corpo.length, 0);
    assert.equal((await profA.get('/api/ocorrencias')).corpo.length, 1);
  });
  test('aluno não consegue sobrescrever ocorrência de outro aluno pelo mesmo id', async () => {
    assert.equal((await alunoB.post('/api/ocorrencias', { id: 'OC1', descricao: 'adulterada' })).status, 403);
    assert.equal((await db.get("SELECT descricao FROM ocorrencias_aluno WHERE id='OC1'")).descricao, 'vidro quebrado');
  });
});

describe('7. Fluxo de compras (só a Kátia) e recebimento', () => {
  const trans = (c: any, id: string, corpo: any) => c.post(`/api/compras/${id}/transicao`, corpo);
  const estoque = async (nome: string) => Number((await db.get('SELECT estoque_atual AS q FROM produtos_quimicos WHERE nome = ?', [nome])).q);
  const levarAtePedido = async (id: string) => {
    for (const [para, extra] of [['aprovada', { valorAprovado: 900 }], ['em_cotacao', { valorCotado: 850 }], ['aguardando_fornecedor', {}], ['pedido_emitido', { fornecedorNome: 'ACME Química', valorPedido: 870, condicoesPagamento: '30 dias' }], ['aguardando_recebimento', {}]] as any[])
      assert.equal((await trans(kat, id, { para, ...extra })).status, 200, para);
  };
  before(async () => {
    await db.run("INSERT INTO produtos_quimicos (id, nome, estoque_atual, estoque_minimo, unidade) VALUES ('P5', 'Tolueno', 2, 1, 'L')");
    await db.run("INSERT INTO estoque_lotes (id, produto_id, produto_nome, quantidade_atual, estoque_minimo) VALUES ('E5', 'P5', 'Tolueno', 2, 1)");
    await kat.post('/api/compras', { id: 'W1', produto: 'Tolueno', quantidade: '20 L', status: 'Aguardando aprovação' });
  });
  test('professor e aluno não mudam etapas, não recebem e não veem o histórico', async () => {
    for (const c of [profA, alunoA]) {
      assert.equal((await trans(c, 'W1', { para: 'aprovada' })).status, 403);
      assert.equal((await c.post('/api/compras/W1/recebimento', { receberTudo: true })).status, 403);
      assert.equal((await c.get('/api/compras/W1/historico')).status, 403);
    }
  });
  test('não é possível pular etapas nem cancelar sem motivo', async () => {
    assert.equal((await trans(kat, 'W1', { para: 'pedido_emitido' })).status, 409);
    assert.equal((await trans(kat, 'W1', { para: 'etapa_inventada' })).status, 400);
    assert.equal((await kat.post('/api/compras/W1/recebimento', { quantidadeRecebida: 5 })).status, 409, 'sem pedido emitido não há o que receber');
    assert.equal((await trans(kat, 'W1', { para: 'cancelada' })).status, 400);
  });
  test('percorre as etapas até o pedido: número único, valores separados e status antigo coerente', async () => {
    await levarAtePedido('W1');
    const c = await db.get("SELECT * FROM compras_pedidos WHERE id = 'W1'");
    assert.match(c.numero_pedido, /^PED-\d{4}-0001$/);
    assert.equal(Number(c.valor_aprovado), 900); assert.equal(Number(c.valor_cotado), 850); assert.equal(Number(c.valor_total), 870);
    assert.equal(c.valor_pago, null, 'nada foi pago ainda: cotado/aprovado/pedido não viram despesa');
    assert.equal(c.fluxo_status, 'aguardando_recebimento'); assert.equal(c.status, 'Pedido realizado');
  });
  test('emitir pedido exige fornecedor e valor', async () => {
    await kat.post('/api/compras', { id: 'W9', produto: 'Tolueno', quantidade: '1', status: 'Cotação' });
    assert.equal((await trans(kat, 'W9', { para: 'aguardando_fornecedor' })).status, 200);
    assert.equal((await trans(kat, 'W9', { para: 'pedido_emitido' })).status, 400);
    assert.equal((await trans(kat, 'W9', { para: 'pedido_emitido', fornecedorNome: 'X' })).status, 400);
    assert.equal((await trans(kat, 'W9', { para: 'pedido_emitido', fornecedorNome: 'X', valorPedido: 10 })).status, 200);
    assert.match((await db.get("SELECT numero_pedido AS n FROM compras_pedidos WHERE id='W9'")).n, /-0002$/, 'o número segue a sequência');
  });
  test('REGRA DO ESTOQUE: pediu 20, chegaram 15 → entram 15 e ficam 5 pendentes', async () => {
    assert.equal(await estoque('Tolueno'), 2);
    const r = await kat.post('/api/compras/W1/recebimento', { quantidadeRecebida: 15 });
    assert.equal(r.status, 200); assert.equal(r.corpo.entradaEstoque, 15); assert.equal(r.corpo.pendente, 5); assert.equal(r.corpo.etapa, 'recebimento_parcial');
    assert.equal(await estoque('Tolueno'), 17);
    assert.equal(Number((await db.get("SELECT quantidade_atual AS q FROM estoque_lotes WHERE id='E5'")).q), 17);
    assert.equal((await db.get("SELECT status FROM compras_pedidos WHERE id='W1'")).status, 'Pedido realizado', 'ainda não está "Recebido"');
    const avisos = (await profA.get('/api/alertas')).corpo.filter((x: any) => x.titulo.includes('Recebimento Parcial'));
    assert.equal(avisos.length, 1, 'professor recebe o aviso de reposição');
    assert.equal(JSON.stringify(avisos).includes('ACME'), false, 'o aviso não expõe o fornecedor');
    assert.equal((await alunoA.get('/api/alertas')).corpo.filter((x: any) => x.titulo.includes('Recebimento')).length, 0, 'aluno não recebe');
  });
  test('não aceita receber mais do que o pedido; quantidades inválidas são recusadas', async () => {
    assert.equal((await kat.post('/api/compras/W1/recebimento', { quantidadeRecebida: 6 })).status, 409);
    assert.equal((await kat.post('/api/compras/W1/recebimento', { quantidadeRecebida: 0 })).status, 400);
    assert.equal((await kat.post('/api/compras/W1/recebimento', { quantidadeRecebida: 3, quantidadeDanificada: 4 })).status, 400);
    assert.equal(await estoque('Tolueno'), 17, 'nada mudou nas tentativas recusadas');
  });
  test('produto danificado NÃO entra no estoque e continua pendente de reposição', async () => {
    const r = await kat.post('/api/compras/W1/recebimento', { quantidadeRecebida: 5, quantidadeDanificada: 1, divergencia: '1 frasco quebrado' });
    assert.equal(r.corpo.entradaEstoque, 4); assert.equal(r.corpo.pendente, 1); assert.equal(await estoque('Tolueno'), 21);
  });
  test('último recebimento conclui: "Recebida e conferida" e status antigo "Recebido"', async () => {
    const r = await kat.post('/api/compras/W1/recebimento', { quantidadeRecebida: 1 });
    assert.equal(r.corpo.etapa, 'recebida_conferida'); assert.equal(r.corpo.pendente, 0); assert.equal(await estoque('Tolueno'), 22);
    assert.equal((await db.get("SELECT status FROM compras_pedidos WHERE id='W1'")).status, 'Recebido');
    assert.equal((await kat.post('/api/compras/W1/recebimento', { quantidadeRecebida: 1 })).status, 409, 'compra concluída não recebe de novo');
  });
  test('dois recebimentos SIMULTÂNEOS não passam do pedido (um deles é recusado)', async () => {
    await kat.post('/api/compras', { id: 'W3', produto: 'Tolueno', quantidade: '20', status: 'Cotação' });
    await trans(kat, 'W3', { para: 'aguardando_fornecedor' }); await trans(kat, 'W3', { para: 'pedido_emitido', fornecedorNome: 'ACME', valorPedido: 50 });
    const antes = await estoque('Tolueno');
    const [a, b] = await Promise.all([kat.post('/api/compras/W3/recebimento', { quantidadeRecebida: 15 }), kat.post('/api/compras/W3/recebimento', { quantidadeRecebida: 15 })]);
    assert.deepEqual([a.status, b.status].sort(), [200, 409]);
    assert.equal(await estoque('Tolueno'), antes + 15);
  });
  test('produto não cadastrado: recebimento recusado e nada é gravado pela metade', async () => {
    await kat.post('/api/compras', { id: 'W4', produto: 'Substância Inexistente', quantidade: '10', status: 'Cotação' });
    await trans(kat, 'W4', { para: 'aguardando_fornecedor' }); await trans(kat, 'W4', { para: 'pedido_emitido', fornecedorNome: 'ACME', valorPedido: 50 });
    assert.equal((await kat.post('/api/compras/W4/recebimento', { receberTudo: true })).status, 422);
    assert.equal(Number((await db.get("SELECT COUNT(*) AS c FROM compras_recebimentos WHERE compra_id='W4'")).c), 0);
    assert.equal(Number((await db.get("SELECT quantidade_recebida AS q FROM compras_pedidos WHERE id='W4'")).q), 0);
  });
  test('"receber tudo" (botão atual da tela) recebe só o que falta e dá entrada de uma vez', async () => {
    await kat.post('/api/compras', { id: 'W5', produto: 'Tolueno', quantidade: '10 L', status: 'Pedido realizado' }); // compra antiga, sem etapas gravadas
    const antes = await estoque('Tolueno');
    const r = await kat.post('/api/compras/W5/recebimento', { receberTudo: true });
    assert.equal(r.status, 200); assert.equal(r.corpo.entradaEstoque, 10); assert.equal(await estoque('Tolueno'), antes + 10); assert.equal(r.corpo.etapa, 'recebida_conferida');
  });
  test('edição genérica não consegue desfazer o status de uma compra que está no fluxo', async () => {
    assert.equal((await kat.post('/api/compras', { id: 'W1', produto: 'Tolueno', quantidade: '20 L', status: 'Cotação' })).status, 200);
    assert.equal((await db.get("SELECT status FROM compras_pedidos WHERE id='W1'")).status, 'Recebido');
  });
  test('cancelamento exige motivo, é definitivo e não mexe no estoque', async () => {
    await kat.post('/api/compras', { id: 'W6', produto: 'Tolueno', quantidade: '5', status: 'Aguardando aprovação' });
    const antes = await estoque('Tolueno');
    assert.equal((await trans(kat, 'W6', { para: 'cancelada', motivo: 'Orçamento da área reduzido' })).status, 200);
    assert.equal((await trans(kat, 'W6', { para: 'aprovada' })).status, 409);
    assert.equal(await estoque('Tolueno'), antes);
  });
  test('pagamento só depois do pedido; valor pago fica separado do cotado/aprovado/pedido', async () => {
    assert.equal((await kat.post('/api/compras/W6/pagamento', { valor: 10 })).status, 409);
    assert.equal((await kat.post('/api/compras/W1/pagamento', { valor: 870 })).status, 200);
    const c = await db.get("SELECT valor_aprovado AS a, valor_cotado AS c, valor_total AS t, valor_pago AS p FROM compras_pedidos WHERE id='W1'");
    assert.deepEqual([Number(c.a), Number(c.c), Number(c.t), Number(c.p)], [900, 850, 870, 870]);
  });
  test('histórico auditável: cada ação com responsável, etapa anterior/nova e recebimentos', async () => {
    const h = (await kat.get('/api/compras/W1/historico')).corpo;
    assert.ok(h.historico.length >= 9); assert.ok(h.historico.every((x: any) => x.responsavel === 'Kátia'));
    assert.ok(h.historico.some((x: any) => x.acao === 'recebimento' && x.para === 'recebimento_parcial'));
    assert.equal(h.recebimentos.length, 3); assert.equal(h.recebimentos[1].divergencia, '1 frasco quebrado');
    assert.ok((await kat.get('/api/auditoria?entidade=compras&limite=200')).corpo.some((a: any) => a.acao === 'recebimento'));
  });
});
