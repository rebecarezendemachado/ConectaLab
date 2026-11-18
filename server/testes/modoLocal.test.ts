import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { criarApp, criarCliente } from './miniExpress.ts';
import { iniciarModoLocal } from '../modoLocal.ts';

const entrar = (c: any, email: string, senha: string, perfil: string) => c.post('/api/auth/login', { email, senha, perfil });
const contagem = async (db: any, t: string) => Number((await db.get(`SELECT COUNT(*) AS c FROM ${t}`))?.c);

describe('Banco zerado: primeiro acesso administrativo e cadastros guiados', async () => {
  const app = criarApp();
  const { db } = await iniciarModoLocal(app, { producao: false, arquivo: ':memory:', env: {} });
  const kat = criarCliente(app, '127.0.0.1'), prof = criarCliente(app, '10.9.0.2'), aluno = criarCliente(app, '10.9.0.3');

  test('começa totalmente vazio (sem contas, produtos, fornecedores nem turmas)', async () => {
    for (const t of ['usuarios', 'produtos_quimicos', 'estoque_lotes', 'fornecedores', 'turmas']) assert.equal(await contagem(db, t), 0, t);
  });
  test('a Kátia configura o primeiro acesso somente pelo formulário administrativo local', async () => {
    const r = await kat.post('/api/auth/registrar', { nome: 'Kátia', email: 'katia@escola.com', senha: 'minha-senha-segura', tipoPerfil: 'professor', departamento: 'Química', primeiroAcessoAdmin: true });
    assert.equal(r.status, 201); assert.equal(r.corpo.usuario.tipoPerfil, 'administrador'); assert.equal(r.corpo.usuario.status, 'ativo');
    const l = await entrar(criarCliente(app, '10.9.0.9'), 'katia@escola.com', 'minha-senha-segura', 'professor');
    assert.equal(l.status, 200); assert.equal(l.corpo.usuario.tipoPerfil, 'administrador');
    assert.equal((await criarCliente(app, '10.9.0.10').post('/api/auth/registrar', { nome: 'Tentativa Admin', email: 'admin-remoto@escola.com', senha: 'minha-senha-segura', tipoPerfil: 'professor', primeiroAcessoAdmin: true })).status, 403);
  });
  test('o 2º professor que se cadastra entra imediatamente como ativo (sem aprovação manual)', async () => {
    const r = await prof.post('/api/auth/registrar', { nome: 'Prof Ana', email: 'ana@escola.com', senha: 'ana-senha-1', tipoPerfil: 'professor' });
    assert.equal(r.status, 201);
    assert.equal(r.corpo.usuario.tipoPerfil, 'professor');
    assert.equal(r.corpo.usuario.status, 'ativo');
    assert.equal((await entrar(criarCliente(app, '10.9.0.8'), 'ana@escola.com', 'ana-senha-1', 'professor')).status, 200);
    const criado = (await kat.post('/api/turmas', { nome: '3º Química A', professorIds: [r.corpo.usuario.id] }));
    assert.equal(criado.status, 201);
    assert.equal(await contagem(db, 'usuarios'), 2);
    assert.equal(Number((await db.get<any>("SELECT COUNT(*) AS c FROM usuarios WHERE tipo_perfil = 'administrador'"))?.c), 1);
  });
  test('aluno se cadastra e entra direto, sem ser administrador', async () => {
    const r = await aluno.post('/api/auth/registrar', { nome: 'Aluno Alfa', email: 'alfa@escola.com', senha: 'alfa-senha-1', tipoPerfil: 'aluno', turma: '3º Química A' });
    assert.equal(r.status, 201); assert.equal(r.corpo.usuario.tipoPerfil, 'aluno');
    assert.equal((await aluno.get('/api/auth/me')).corpo.usuario.tipoPerfil, 'aluno');
    const semTurma = await criarCliente(app, '10.9.0.11').post('/api/auth/registrar', { nome: 'Sem Turma', email: 'sem-turma@escola.com', senha: 'sem-turma-1', tipoPerfil: 'aluno', turma: 'Inexistente' });
    assert.equal(semTurma.status, 422);
  });
  test('a professora já cadastrada permanece ativa e acessível', async () => {
    const lista = (await kat.get('/api/usuarios')).corpo, ana = lista.find((u: any) => u.email === 'ana@escola.com');
    assert.equal(ana.status, 'ativo');
    assert.equal((await entrar(criarCliente(app, '10.9.0.7'), 'ana@escola.com', 'ana-senha-1', 'professor')).status, 200);
  });
  test('tudo que a Kátia cria é gravado no banco: produto novo aparece para os 3 perfis', async () => {
    assert.equal((await kat.post('/api/produtos', { id: 'P1', nome: 'Acetona', cas: '67-64-1', estoqueAtual: 10, estoqueMinimo: 2, unidade: 'L', fornecedorPrincipal: 'Forn X' })).status, 201);
    assert.equal(await contagem(db, 'produtos_quimicos'), 1);
    const profLogada = criarCliente(app, '10.9.0.6'); await entrar(profLogada, 'ana@escola.com', 'ana-senha-1', 'professor');
    const alunoLogado = criarCliente(app, '10.9.0.5'); await entrar(alunoLogado, 'alfa@escola.com', 'alfa-senha-1', 'aluno');
    const k = (await kat.get('/api/produtos')).corpo, p = (await profLogada.get('/api/produtos')).corpo, a = (await alunoLogado.get('/api/produtos')).corpo;
    assert.equal(k.length, 1); assert.equal(p.length, 1); assert.equal(a.length, 1);
    assert.equal(k[0].fornecedorPrincipal, 'Forn X'); assert.equal(p[0].fornecedorPrincipal, '');
  });
  test('permissões: aluno não cadastra produto nem vê compras/fornecedores; professor não vê fornecedores', async () => {
    const alunoLogado = criarCliente(app, '10.9.0.4'); await entrar(alunoLogado, 'alfa@escola.com', 'alfa-senha-1', 'aluno');
    const profLogada = criarCliente(app, '10.9.0.12'); await entrar(profLogada, 'ana@escola.com', 'ana-senha-1', 'professor');
    assert.equal((await alunoLogado.post('/api/produtos', { id: 'X', nome: 'X', cas: '1', estoqueAtual: 1, estoqueMinimo: 1, unidade: 'g' })).status, 403);
    assert.equal((await alunoLogado.get('/api/compras')).status, 403);
    assert.equal((await alunoLogado.get('/api/fornecedores')).status, 403);
    assert.equal((await profLogada.get('/api/fornecedores')).status, 403);
    assert.equal((await kat.get('/api/fornecedores')).status, 200);
  });
  test('recuperação local da Kátia redefine o acesso sem apagar os outros dados', async () => {
    const remoto = await criarCliente(app, '10.9.0.13').post('/api/auth/recuperar-admin', {
      nome: 'Kátia', email: 'katia-nova@escola.com', senha: 'nova-senha-admin-99'
    });
    assert.equal(remoto.status, 403);

    const r = await kat.post('/api/auth/recuperar-admin', {
      nome: 'Kátia', email: 'katia-nova@escola.com', senha: 'nova-senha-admin-99'
    });
    assert.equal(r.status, 200);
    assert.equal(r.corpo.usuario.tipoPerfil, 'administrador');
    assert.equal((await kat.get('/api/auth/me')).corpo.usuario.email, 'katia-nova@escola.com');
    assert.equal((await entrar(criarCliente(app, '10.9.0.14'), 'katia@escola.com', 'minha-senha-segura', 'professor')).status, 401);
    assert.equal((await entrar(criarCliente(app, '10.9.0.15'), 'katia-nova@escola.com', 'nova-senha-admin-99', 'professor')).status, 200);
    assert.equal(await contagem(db, 'usuarios'), 3, 'a recuperação preservou as demais contas');
  });
  test('recusa rodar em produção', async () => {
    await assert.rejects(() => iniciarModoLocal(criarApp(), { producao: true, arquivo: ':memory:' }));
  });
});

describe('Persistência e configuração', () => {
  test('os dados ficam no arquivo: ao reiniciar, a conta continua lá e nada é recriado', async () => {
    const arq = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mr-')), 'x.json');
    const a1 = criarApp(); await iniciarModoLocal(a1, { producao: false, arquivo: arq, env: {} });
    assert.equal((await criarCliente(a1, '127.0.0.1').post('/api/auth/registrar', { nome: 'Kátia', email: 'k@e.com', senha: 'senha-forte-10', tipoPerfil: 'professor', primeiroAcessoAdmin: true })).status, 201);
    const a2 = criarApp(); const r2 = await iniciarModoLocal(a2, { producao: false, arquivo: arq, env: {} });
    assert.equal(await contagem(r2.db, 'usuarios'), 1);
    assert.equal((await entrar(criarCliente(a2, '10.8.0.2'), 'k@e.com', 'senha-forte-10', 'professor')).status, 200);
  });
  test('se ADMIN_EMAIL/ADMIN_INITIAL_PASSWORD estiverem no .env, a administradora já nasce com eles', async () => {
    const a = criarApp();
    const r = await iniciarModoLocal(a, { producao: false, arquivo: ':memory:', env: { ADMIN_EMAIL: 'diretora@escola.com', ADMIN_INITIAL_PASSWORD: 'SenhaForte#2026', ADMIN_NOME: 'Kátia' } });
    assert.equal(await contagem(r.db, 'usuarios'), 1);
    assert.equal((await entrar(criarCliente(a, '10.8.1.1'), 'diretora@escola.com', 'SenhaForte#2026', 'professor')).status, 200);
    // com administradora já existente, o professor que se cadastra não vira administrador, mas entra ativo
    const p = await criarCliente(a, '10.8.1.2').post('/api/auth/registrar', { nome: 'P', email: 'p@e.com', senha: 'senha-forte-2', tipoPerfil: 'professor' });
    assert.equal(p.status, 201);
    assert.equal(p.corpo.usuario.tipoPerfil, 'professor');
    assert.equal(p.corpo.usuario.status, 'ativo');
  });
});

describe('Recuperação de primeiro acesso com e-mail já cadastrado', async () => {
  test('converte a conta pré-existente da Kátia em administradora sem duplicar usuário', async () => {
    const app = criarApp();
    const { db } = await iniciarModoLocal(app, { producao: false, arquivo: ':memory:', env: {} });
    const local = criarCliente(app, '127.0.0.1');
    const cadastro = await local.post('/api/auth/registrar', {
      nome: 'Kátia', email: 'katia@escola.com', senha: 'senha-anterior-123', tipoPerfil: 'professor'
    });
    assert.equal(cadastro.status, 201);
    const antes = await contagem(db, 'usuarios');

    const recuperacao = await local.post('/api/auth/recuperar-admin', {
      nome: 'Kátia', email: 'katia@escola.com', senha: 'nova-senha-admin-123'
    });
    assert.equal(recuperacao.status, 200);
    assert.equal(recuperacao.corpo.usuario.tipoPerfil, 'administrador');
    assert.equal(await contagem(db, 'usuarios'), antes, 'não deve criar uma segunda conta');
    assert.equal((await entrar(criarCliente(app, '10.7.0.1'), 'katia@escola.com', 'nova-senha-admin-123', 'professor')).status, 200);
    assert.equal(await contagem(db, 'usuarios'), 1);
  });
});

