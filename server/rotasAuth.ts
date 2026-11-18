/* Rotas de autenticação, usuários e turmas. */
import { randomBytes } from 'node:crypto';
import type { Db } from './db.ts';
import * as seg from './seguranca.ts';
import { turmasDoProfessor } from './politica.ts';
import { ipDe, novoId, tratar, auditar, paraCamelUsuario } from './comum.ts';

const COLUNAS_USUARIO = `u.id, u.nome, u.email, u.tipo_perfil, u.matricula, u.turma, u.turma_id, u.bancada_padrao, u.departamento, u.ativo, u.status,
  u.criado_em, u.perfil_extra, c.nome AS criado_por_nome`;
const SELECT_USUARIO = `SELECT ${COLUNAS_USUARIO} FROM usuarios u LEFT JOIN usuarios c ON c.id = u.criado_por`;
const SENHA_FALSA = 'scrypt$32768$8$1$AAAAAAAAAAAAAAAAAAAAAA==$' + 'A'.repeat(86) + '==';

async function acharOuCriarTurma(db: Db, nome: string, autorId: string | null): Promise<{ id: string; nome: string }> {
  const existente = await db.get<any>('SELECT id, nome FROM turmas WHERE LOWER(nome) = LOWER(?)', [nome]);
  if (existente) return existente;
  const id = novoId('TRM');
  await db.run('INSERT INTO turmas (id, nome, ativa, criado_em, criado_por) VALUES (?, ?, 1, ?, ?)', [id, nome, seg.agoraUtc(), autorId]);
  return { id, nome };
}

export function registrarRotasAuth(app: any, db: Db, opc: { producao: boolean }) {
  const seguro = opc.producao;

  app.get('/api/auth/turmas', tratar(async (_req, res) => {
    const rows = await db.all<any>(`SELECT t.id, t.nome, t.ano_letivo
      FROM turmas t WHERE t.ativa = 1
        AND EXISTS (SELECT 1 FROM turma_professores tp JOIN usuarios u ON u.id = tp.professor_id
          WHERE tp.turma_id = t.id AND u.tipo_perfil IN ('professor','administrador') AND COALESCE(u.status, 'ativo') = 'ativo')
      ORDER BY t.nome`);
    res.json(rows.map((t) => ({ id: t.id, nome: t.nome, anoLetivo: t.ano_letivo ?? '' })));
  }));

  // Permite que a tela inicial diferencie "senha incorreta" de primeiro acesso.
  // Não expõe e-mail, senha ou qualquer dado da conta.
  app.get('/api/auth/admin-status', tratar(async (_req, res) => {
    const admin = await db.get<any>("SELECT id FROM usuarios WHERE tipo_perfil = 'administrador' LIMIT 1");
    const marcador = await db.get<any>("SELECT id FROM admin_unico WHERE id = 'principal'");
    res.json({ configurada: !!admin || !!marcador });
  }));

  /* ---------------------------------- LOGIN ---------------------------------- */
  app.post('/api/auth/login', tratar(async (req, res) => {
    const email = seg.emailValido(req.body?.email);
    const senha = typeof req.body?.senha === 'string' ? req.body.senha : '';
    const perfil = req.body?.perfil === 'aluno' ? 'aluno' : req.body?.perfil === 'professor' ? 'professor' : null;
    const ip = ipDe(req);
    if (!email || !senha || senha.length > 128) return res.status(400).json({ error: 'Informe e-mail e senha válidos.' });

    const chave = `${ip}|${email}`;
    const lim = seg.limiteLogin(chave, 5), limIp = seg.limiteLogin(`ip|${ip}`, 40);
    if (lim.bloqueado || limIp.bloqueado) {
      res.setHeader('Retry-After', String(Math.max(lim.esperaSeg, limIp.esperaSeg)));
      return res.status(429).json({ error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' });
    }

    const u = await db.get<any>('SELECT id, nome, email, senha_hash, tipo_perfil, status, ativo FROM usuarios WHERE LOWER(email) = ?', [email]);
    // sempre executa uma verificação de senha, para não revelar (pelo tempo) se o e-mail existe
    const conf = await seg.verificarSenha(senha, u?.senha_hash || SENHA_FALSA);
    if (!u || !conf.ok) {
      seg.registrarFalhaLogin(chave); seg.registrarFalhaLogin(`ip|${ip}`);
      await auditar(db, req, 'login_falha', 'sessao', null, { email });
      return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
    }
    // Compatibilidade: libera cadastros antigos que ficaram pendentes (aprovação manual desativada)
    if ((u.status ?? 'ativo') === 'pendente' && u.tipo_perfil !== 'administrador') {
      await db.run("UPDATE usuarios SET status = 'ativo', ativo = 1, atualizado_em = ? WHERE id = ?", [seg.agoraUtc(), u.id]);
      u.status = 'ativo'; u.ativo = 1;
    }
    if ((u.status ?? 'ativo') !== 'ativo' || Number(u.ativo ?? 1) === 0) return res.status(403).json({ error: 'Esta conta está desativada. Procure a administradora.' });

    const papel = u.tipo_perfil;
    if (perfil === 'aluno' && papel !== 'aluno') return res.status(403).json({ error: 'Acesso restrito: esta conta pertence a um Professor. Para acessá-la, volte para o início e escolha "Sou Professor".' });
    if (perfil === 'professor' && papel === 'aluno') return res.status(403).json({ error: 'Acesso restrito: esta conta pertence a um Aluno. Para acessá-la, volte para o início e escolha "Sou Aluno".' });

    seg.zerarFalhasLogin(chave);
    if (conf.rehash) await db.run('UPDATE usuarios SET senha_hash = ? WHERE id = ?', [await seg.hashSenha(senha), u.id]);
    await db.run('UPDATE usuarios SET ultimo_login = ? WHERE id = ?', [seg.agoraUtc(), u.id]);
    const { token, maxAgeMs } = await seg.criarSessao(db, u.id, req.body?.lembrar === true, ip, req.headers?.['user-agent'] || '');
    res.setHeader('Set-Cookie', seg.cookieSessao(token, maxAgeMs, seguro));
    req.usuario = { id: u.id, nome: u.nome, papel };
    await auditar(db, req, 'login', 'sessao', u.id);
    const completo = await db.get<any>(`${SELECT_USUARIO} WHERE u.id = ?`, [u.id]);
    res.json({ usuario: paraCamelUsuario(completo, { id: u.id, papel }) });
  }));

  app.post('/api/auth/logout', tratar(async (req, res) => {
    const token = seg.lerCookies(req.headers?.cookie)[seg.NOME_COOKIE];
    if (req.usuario) await auditar(db, req, 'logout', 'sessao', req.usuario.id);
    await seg.encerrarSessao(db, token);
    res.setHeader('Set-Cookie', seg.cookieLimpo(seguro));
    res.json({ ok: true });
  }));

  app.get('/api/auth/me', tratar(async (req, res) => {
    if (!req.usuario) return res.status(401).json({ error: 'Sessão ausente ou expirada.' });
    const r = await db.get<any>(`${SELECT_USUARIO} WHERE u.id = ?`, [req.usuario.id]);
    res.json({ usuario: paraCamelUsuario(r, req.usuario) });
  }));

  /* ------------------------------ AUTO-CADASTRO ------------------------------ */
  app.post('/api/auth/registrar', tratar(async (req, res) => {
    const ip = ipDe(req);
    const lim = seg.limiteLogin(`reg|${ip}`, 15);
    if (lim.bloqueado) return res.status(429).json({ error: 'Muitos cadastros deste dispositivo. Tente mais tarde.' });
    seg.registrarFalhaLogin(`reg|${ip}`);

    const nome = seg.texto(req.body?.nome, 150), email = seg.emailValido(req.body?.email);
    const tipo = req.body?.tipoPerfil === 'professor' ? 'professor' : 'aluno'; // nunca "administrador" por cadastro livre
    const primeiroAcessoAdmin = req.body?.primeiroAcessoAdmin === true;
    if (primeiroAcessoAdmin) {
      // A criação inicial é permitida só no computador onde o servidor está instalado.
      // Em hospedagem, use ADMIN_EMAIL + ADMIN_INITIAL_PASSWORD no ambiente do servidor.
      const remoto = String(req.socket?.remoteAddress || '').replace(/^::ffff:/, '');
      if (seguro || !['127.0.0.1', '::1'].includes(remoto)) {
        return res.status(403).json({ error: 'Por segurança, configure o primeiro acesso no computador onde o sistema está instalado. Em uma hospedagem, peça ao responsável para configurar o acesso administrativo.' });
      }
      if (tipo !== 'professor') return res.status(400).json({ error: 'O primeiro acesso administrativo deve ser criado pelo formulário da Kátia.' });
      const emailConfigurado = seg.emailValido(process.env.ADMIN_EMAIL);
      if (emailConfigurado && email !== emailConfigurado) return res.status(403).json({ error: 'Use o e-mail administrativo configurado neste servidor.' });
      if (await db.get("SELECT id FROM usuarios WHERE tipo_perfil = 'administrador' LIMIT 1") || await db.get("SELECT id FROM admin_unico WHERE id = 'principal'")) {
        return res.status(409).json({ error: 'A primeira conta administrativa já foi configurada. Entre com o e-mail e a senha da Kátia.' });
      }
    }
    const erroSenha = seg.validarSenha(req.body?.senha);
    if (!nome || !email) return res.status(400).json({ error: 'Informe nome e e-mail válidos.' });
    if (erroSenha) return res.status(400).json({ error: erroSenha });
    const turmaNome = seg.texto(req.body?.turma, 50);
    if (tipo === 'aluno' && !turmaNome) return res.status(400).json({ error: 'Informe a sua turma.' });
    if (await db.get('SELECT id FROM usuarios WHERE LOWER(email) = ?', [email])) return res.status(409).json({ error: 'Já existe uma conta com este e-mail.' });

    const id = novoId('USR');
    const turma = tipo === 'aluno' && turmaNome
      ? await db.get<any>(`SELECT t.id, t.nome FROM turmas t WHERE LOWER(t.nome) = LOWER(?) AND t.ativa = 1
          AND EXISTS (SELECT 1 FROM turma_professores tp JOIN usuarios u ON u.id = tp.professor_id
            WHERE tp.turma_id = t.id AND u.tipo_perfil IN ('professor','administrador') AND COALESCE(u.status, 'ativo') = 'ativo')`, [turmaNome])
      : null;
    if (tipo === 'aluno' && !turma) return res.status(422).json({ error: 'Selecione uma turma ativa com professor responsável. Se ela não aparece, peça à administradora para organizá-la.' });
    // Cadastros comuns nunca ganham poder administrativo. Apenas o formulário de
    // primeiro acesso, local e de uso único, pode criar a conta da Kátia.
    let semAdmin = primeiroAcessoAdmin;
    let papel: 'administrador' | 'professor' | 'aluno' = semAdmin ? 'administrador' : tipo;
    let status: 'ativo' | 'pendente' | 'inativo' = 'ativo'; // cadastros liberados: acesso imediato, sem aprovação manual
    const erroSenhaAdmin = primeiroAcessoAdmin ? seg.validarSenha(req.body?.senha, 10) : null;
    if (erroSenhaAdmin) return res.status(400).json({ error: erroSenhaAdmin });
    const hashSenha = await seg.hashSenha(req.body.senha);
    const inserirUsuario = (destino: Db, perfil: 'administrador' | 'professor' | 'aluno', situacao: string) => destino.run(
      `INSERT INTO usuarios (id, nome, email, senha_hash, tipo_perfil, matricula, turma, turma_id, departamento, ativo, status, criado_em, atualizado_em)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
      [id, nome, email, hashSenha, perfil, seg.texto(req.body?.matricula, 50), turma?.nome ?? null, turma?.id ?? null,
       seg.texto(req.body?.departamento, 100), situacao, seg.agoraUtc(), seg.agoraUtc()],
    );
    if (semAdmin) {
      try {
        await db.transaction(async (tx) => {
          if (await tx.get("SELECT id FROM usuarios WHERE tipo_perfil = 'administrador' LIMIT 1")) throw new Error('ADMIN_JA_CONFIGURADO');
          await tx.run('INSERT INTO admin_unico (id, usuario_id, criado_em) VALUES (?, ?, ?)', ['principal', id, seg.agoraUtc()]);
          await inserirUsuario(tx, 'administrador', 'ativo');
        });
      } catch (erro) {
        const reserva = await db.get('SELECT id FROM admin_unico WHERE id = ?', ['principal']);
        const administradora = await db.get("SELECT id FROM usuarios WHERE tipo_perfil = 'administrador' LIMIT 1");
        if (!reserva && !administradora) throw erro;
        if (primeiroAcessoAdmin) return res.status(409).json({ error: 'A primeira conta administrativa já foi configurada. Entre com o e-mail e a senha da Kátia.' });
        // Uma tentativa concorrente de cadastro comum continua como professora ativa.
        semAdmin = false; papel = 'professor'; status = 'ativo';
        await inserirUsuario(db, papel, status);
      }
    } else {
      await inserirUsuario(db, papel, status);
    }
    req.usuario = { id, nome, papel };
    await auditar(db, req, 'auto_cadastro', 'usuarios', id, { tipo: papel, status, primeiraAdministradora: semAdmin });
    const { token, maxAgeMs } = await seg.criarSessao(db, id, false, ip, req.headers?.['user-agent'] || '');
    res.setHeader('Set-Cookie', seg.cookieSessao(token, maxAgeMs, seguro));
    const completo = await db.get<any>(`${SELECT_USUARIO} WHERE u.id = ?`, [id]);
    res.status(201).json({ usuario: paraCamelUsuario(completo, { id, papel }) });
  }));

  /* Recuperação da conta administrativa: somente por loopback, no computador
     que hospeda o servidor. Preserva todos os demais registros do banco. */
  app.post('/api/auth/recuperar-admin', tratar(async (req, res) => {
    const remoto = String(req.socket?.remoteAddress || '').replace(/^::ffff:/, '');
    if (seguro || !['127.0.0.1', '::1'].includes(remoto)) {
      return res.status(403).json({ error: 'A recuperação da Kátia só pode ser feita no computador onde o servidor está instalado.' });
    }
    const nome = seg.texto(req.body?.nome, 150);
    const email = seg.emailValido(req.body?.email);
    const senha = req.body?.senha;
    if (!nome || !email) return res.status(400).json({ error: 'Informe nome e e-mail válidos.' });
    const erroSenha = seg.validarSenha(senha, 10);
    if (erroSenha) return res.status(400).json({ error: erroSenha });

    const senhaHash = await seg.hashSenha(senha);
    let id = '';
    try {
      await db.transaction(async (tx) => {
        const admin = await tx.get<any>(`SELECT u.id FROM usuarios u
          LEFT JOIN admin_unico a ON a.usuario_id = u.id
          WHERE u.tipo_perfil = 'administrador'
          ORDER BY CASE WHEN a.id = 'principal' THEN 0 ELSE 1 END, u.criado_em
          LIMIT 1`);
        // Se não há administradora, mas o e-mail informado já foi cadastrado
        // como professor (por uma tentativa anterior de primeiro acesso), recupera
        // essa mesma identidade em vez de criar uma conta duplicada.
        const contaDoEmail = !admin
          ? await tx.get<any>('SELECT id FROM usuarios WHERE LOWER(email) = ?', [email])
          : null;
        id = admin?.id || contaDoEmail?.id || novoId('USR');
        const emailEmUso = await tx.get<any>('SELECT id FROM usuarios WHERE LOWER(email) = ? AND id <> ?', [email, id]);
        if (emailEmUso) throw Object.assign(new Error('Este e-mail já pertence a outra conta. Informe um e-mail diferente.'), { status: 409 });

        if (admin || contaDoEmail) {
          await tx.run(`UPDATE usuarios SET nome = ?, email = ?, senha_hash = ?, tipo_perfil = 'administrador',
            departamento = COALESCE(departamento, 'Administração'),
            ativo = 1, status = 'ativo', atualizado_em = ?, deve_trocar_senha = 0 WHERE id = ?`,
          [nome, email, senhaHash, seg.agoraUtc(), id]);
        } else {
          await tx.run(`INSERT INTO usuarios (id, nome, email, senha_hash, tipo_perfil, departamento, ativo, status, criado_em, atualizado_em)
            VALUES (?, ?, ?, ?, 'administrador', 'Administração', 1, 'ativo', ?, ?)`,
          [id, nome, email, senhaHash, seg.agoraUtc(), seg.agoraUtc()]);
        }

        const marcador = await tx.get<any>("SELECT id FROM admin_unico WHERE id = 'principal'");
        if (marcador) await tx.run("UPDATE admin_unico SET usuario_id = ?, criado_em = ? WHERE id = 'principal'", [id, seg.agoraUtc()]);
        else await tx.run('INSERT INTO admin_unico (id, usuario_id, criado_em) VALUES (?, ?, ?)', ['principal', id, seg.agoraUtc()]);
        await tx.run('DELETE FROM sessoes WHERE usuario_id = ?', [id]);
      });
    } catch (erro: any) {
      if (erro?.status === 409) return res.status(409).json({ error: erro.message });
      throw erro;
    }

    req.usuario = { id, nome, papel: 'administrador' };
    await auditar(db, req, 'recuperar_acesso', 'usuarios', id);
    const { token, maxAgeMs } = await seg.criarSessao(db, id, false, remoto, req.headers?.['user-agent'] || '');
    res.setHeader('Set-Cookie', seg.cookieSessao(token, maxAgeMs, false));
    const completo = await db.get<any>(`${SELECT_USUARIO} WHERE u.id = ?`, [id]);
    res.json({ usuario: paraCamelUsuario(completo, { id, papel: 'administrador' }) });
  }));

  app.post('/api/auth/trocar-senha', tratar(async (req, res) => {
    if (!req.usuario) return res.status(401).json({ error: 'Faça login novamente.' });
    const erro = seg.validarSenha(req.body?.novaSenha);
    if (erro) return res.status(400).json({ error: erro });
    const u = await db.get<any>('SELECT senha_hash FROM usuarios WHERE id = ?', [req.usuario.id]);
    if (req.body?.senhaAtual !== undefined) {
      const c = await seg.verificarSenha(String(req.body.senhaAtual), u?.senha_hash || '');
      if (!c.ok) return res.status(403).json({ error: 'A senha atual não confere.' });
    }
    await db.run('UPDATE usuarios SET senha_hash = ?, deve_trocar_senha = 0, atualizado_em = ? WHERE id = ?', [await seg.hashSenha(req.body.novaSenha), seg.agoraUtc(), req.usuario.id]);
    await seg.encerrarTodasSessoes(db, req.usuario.id, req.usuario.sessaoId); // derruba as outras sessões
    await auditar(db, req, 'troca_senha', 'usuarios', req.usuario.id);
    res.json({ ok: true });
  }));

  /* --------------------------------- USUÁRIOS --------------------------------- */
  app.get('/api/usuarios', tratar(async (req, res) => {
    const eu = req.usuario;
    let rows: any[];
    if (eu.papel === 'administrador') {
      rows = await db.all(`${SELECT_USUARIO} ORDER BY u.criado_em DESC`);
    } else if (eu.papel === 'professor') {
      const { nomes } = await turmasDoProfessor(db, eu.id);
      const marcas = nomes.map(() => '?').join(',');
      rows = await db.all(
        `${SELECT_USUARIO} WHERE u.id = ? OR u.tipo_perfil IN ('professor','administrador')
           ${nomes.length ? `OR (u.tipo_perfil = 'aluno' AND LOWER(u.turma) IN (${marcas}))` : ''} ORDER BY u.criado_em DESC`,
        [eu.id, ...nomes.map((n) => n.toLowerCase())],
      );
      rows = rows.filter((r) => (r.status ?? 'ativo') === 'ativo' || r.id === eu.id);
    } else {
      rows = await db.all(`${SELECT_USUARIO} WHERE u.id = ?`, [eu.id]);
    }
    res.json(rows.map((r) => paraCamelUsuario(r, eu)));
  }));

  app.post('/api/usuarios', tratar(async (req, res) => {
    const eu = req.usuario, b = req.body || {};
    const id: string | null = typeof b.id === 'string' && /^[A-Za-z0-9_-]{1,36}$/.test(b.id) ? b.id : null;
    const atual = id ? await db.get<any>('SELECT * FROM usuarios WHERE id = ?', [id]) : undefined;

    /* --- usuário editando o PRÓPRIO perfil (qualquer papel): só campos pessoais --- */
    if (atual && atual.id === eu.id && eu.papel !== 'administrador') {
      let extra: any = {}; try { extra = atual.perfil_extra ? JSON.parse(atual.perfil_extra) : {}; } catch { /* */ }
      for (const k of ['cargo', 'telefone', 'cpf']) if (typeof b[k] === 'string') extra[k] = b[k].trim().slice(0, 40);
      const nome = seg.texto(b.nome, 150) ?? atual.nome;
      await db.run('UPDATE usuarios SET nome = ?, perfil_extra = ?, atualizado_em = ? WHERE id = ?', [nome, JSON.stringify(extra), seg.agoraUtc(), eu.id]);
      if (typeof b.senha === 'string' && b.senha && b.senha !== atual.senha_hash) {
        const erro = seg.validarSenha(b.senha);
        if (erro) return res.status(400).json({ error: erro });
        await db.run('UPDATE usuarios SET senha_hash = ?, deve_trocar_senha = 0 WHERE id = ?', [await seg.hashSenha(b.senha), eu.id]);
        await seg.encerrarTodasSessoes(db, eu.id, eu.sessaoId);
      }
      await auditar(db, req, 'editar_perfil', 'usuarios', eu.id);
      const r = await db.get<any>(`${SELECT_USUARIO} WHERE u.id = ?`, [eu.id]);
      return res.json(paraCamelUsuario(r, eu));
    }
    if (eu.papel === 'aluno') return res.status(403).json({ error: 'Sem permissão para gerenciar usuários.' });

    /* --- criação/edição de OUTROS usuários: administradora, ou professor (somente alunos das suas turmas) --- */
    const nome = seg.texto(b.nome, 150), email = seg.emailValido(b.email);
    const tipo = ['aluno', 'professor', 'administrador'].includes(b.tipoPerfil) ? b.tipoPerfil : null;
    if (!nome || !email || !tipo) return res.status(400).json({ error: 'Informe nome, e-mail e perfil válidos.' });
    if (tipo === 'administrador' && (!atual || atual.id !== eu.id)) return res.status(403).json({ error: 'A conta administrativa única é configurada pelo primeiro acesso da Kátia.' });
    if (eu.papel === 'professor') {
      if (tipo !== 'aluno') return res.status(403).json({ error: 'Professores só podem cadastrar alunos.' });
      const { nomes } = await turmasDoProfessor(db, eu.id);
      if (!b.turma || !nomes.some((n) => n.toLowerCase() === String(b.turma).trim().toLowerCase())) return res.status(403).json({ error: 'Você só pode cadastrar alunos nas suas turmas.' });
      if (atual && (atual.tipo_perfil !== 'aluno')) return res.status(403).json({ error: 'Sem permissão para editar este usuário.' });
    }
    const dono = await db.get<any>('SELECT id FROM usuarios WHERE LOWER(email) = ?', [email]);
    if (dono && dono.id !== id) return res.status(409).json({ error: 'Já existe uma conta com este e-mail.' });

    const turmaNome = seg.texto(b.turma, 50);
    const turma = tipo === 'aluno' && turmaNome ? await acharOuCriarTurma(db, turmaNome, eu.id) : null;
    const extra: any = {};
    for (const k of ['cargo', 'telefone', 'cpf']) if (typeof b[k] === 'string') extra[k] = b[k].trim().slice(0, 40);

    if (atual) {
      if (atual.id === eu.id && tipo !== 'administrador') return res.status(400).json({ error: 'Você não pode rebaixar o seu próprio acesso.' });
      let senhaSql = '', par: any[] = [];
      if (typeof b.senha === 'string' && b.senha) {
        const erro = seg.validarSenha(b.senha); if (erro) return res.status(400).json({ error: erro });
        senhaSql = ', senha_hash = ?'; par = [await seg.hashSenha(b.senha)];
      }
      const status = ['ativo', 'pendente', 'inativo'].includes(b.status) && eu.papel === 'administrador' ? b.status : atual.status ?? 'ativo';
      if (atual.id === eu.id && tipo === 'administrador' && status !== 'ativo') return res.status(400).json({ error: 'A conta da administradora conectada não pode ser desativada por ela mesma.' });
      await db.run(
        `UPDATE usuarios SET nome = ?, email = ?, tipo_perfil = ?, matricula = ?, turma = ?, turma_id = ?, departamento = ?, perfil_extra = ?, status = ?, atualizado_em = ?${senhaSql} WHERE id = ?`,
        [nome, email, tipo, seg.texto(b.matricula, 50), turma?.nome ?? null, turma?.id ?? null, seg.texto(b.departamento, 100), JSON.stringify(extra), status, seg.agoraUtc(), ...par, atual.id],
      );
      if (status !== 'ativo') await seg.encerrarTodasSessoes(db, atual.id);
      await auditar(db, req, 'editar', 'usuarios', atual.id, { nome, tipo, status });
      const r = await db.get<any>(`${SELECT_USUARIO} WHERE u.id = ?`, [atual.id]);
      return res.json(paraCamelUsuario(r, eu));
    }
    const erroSenha = seg.validarSenha(b.senha);
    if (erroSenha) return res.status(400).json({ error: erroSenha });
    const novo = id || novoId('USR');
    await db.run(
      `INSERT INTO usuarios (id, nome, email, senha_hash, tipo_perfil, matricula, turma, turma_id, departamento, perfil_extra, ativo, status, criado_por, criado_em, atualizado_em)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'ativo', ?, ?, ?)`,
      [novo, nome, email, await seg.hashSenha(b.senha), tipo, seg.texto(b.matricula, 50), turma?.nome ?? null, turma?.id ?? null, seg.texto(b.departamento, 100), JSON.stringify(extra), eu.id, seg.agoraUtc(), seg.agoraUtc()],
    );
    await auditar(db, req, 'criar', 'usuarios', novo, { nome, tipo });
    const r = await db.get<any>(`${SELECT_USUARIO} WHERE u.id = ?`, [novo]);
    res.status(201).json(paraCamelUsuario(r, eu));
  }));

  app.delete('/api/usuarios/:id', tratar(async (req, res) => {
    const id = String(req.params.id);
    if (id === req.usuario.id) return res.status(400).json({ error: 'Você não pode excluir a própria conta.' });
    const alvo = await db.get<any>('SELECT id, nome, tipo_perfil FROM usuarios WHERE id = ?', [id]);
    if (!alvo) return res.status(404).json({ error: 'Usuário não encontrado.' });
    await seg.encerrarTodasSessoes(db, id);
    await db.run('DELETE FROM turma_professores WHERE professor_id = ?', [id]);
    await db.run('DELETE FROM alerta_destinatarios WHERE usuario_id = ?', [id]);
    await db.run('DELETE FROM usuarios WHERE id = ?', [id]);
    await auditar(db, req, 'excluir', 'usuarios', id, { nome: alvo.nome, tipo: alvo.tipo_perfil });
    res.json({ ok: true });
  }));

  /* ---------------------------------- TURMAS ---------------------------------- */
  const montarTurmas = async (eu: any) => {
    let turmas: any[];
    if (eu.papel === 'administrador') turmas = await db.all('SELECT * FROM turmas ORDER BY nome');
    else if (eu.papel === 'professor') turmas = await db.all('SELECT t.* FROM turmas t JOIN turma_professores tp ON tp.turma_id = t.id WHERE tp.professor_id = ? ORDER BY t.nome', [eu.id]);
    else turmas = await db.all('SELECT * FROM turmas WHERE LOWER(nome) = LOWER(?)', [eu.turma ?? '']);
    const saida = [];
    for (const t of turmas) {
      const profs = await db.all<any>('SELECT u.id, u.nome FROM usuarios u JOIN turma_professores tp ON tp.professor_id = u.id WHERE tp.turma_id = ? ORDER BY u.nome', [t.id]);
      const alunos = await db.all<any>("SELECT id, nome, matricula, email, status FROM usuarios WHERE tipo_perfil = 'aluno' AND LOWER(turma) = LOWER(?) ORDER BY nome", [t.nome]);
      saida.push({
        id: t.id, nome: t.nome, descricao: t.descricao ?? '', anoLetivo: t.ano_letivo ?? '', ativa: !!Number(t.ativa), criadoEm: String(t.criado_em),
        professores: profs, totalAlunos: alunos.length,
        alunos: eu.papel === 'aluno' ? undefined : alunos.map((a) => ({ id: a.id, nome: a.nome, matricula: a.matricula ?? '', status: a.status ?? 'ativo' })), // aluno não vê a lista de colegas
      });
    }
    return saida;
  };
  app.get('/api/turmas', tratar(async (req, res) => res.json(await montarTurmas(req.usuario))));

  app.post('/api/turmas', tratar(async (req, res) => {
    const b = req.body || {}, nome = seg.texto(b.nome, 100);
    if (!nome) return res.status(400).json({ error: 'Informe o nome da turma.' });
    const id: string = typeof b.id === 'string' && /^[A-Za-z0-9_-]{1,36}$/.test(b.id) ? b.id : novoId('TRM');
    const dupla = await db.get<any>('SELECT id FROM turmas WHERE LOWER(nome) = LOWER(?)', [nome]);
    if (dupla && dupla.id !== id) return res.status(409).json({ error: 'Já existe uma turma com este nome.' });
    const existe = await db.get<any>('SELECT id, nome FROM turmas WHERE id = ?', [id]);
    const professorIds: string[] = Array.isArray(b.professorIds)
      ? [...new Set<string>((b.professorIds as unknown[]).map((p) => String(p)))]
      : [];
    if (!existe && professorIds.length === 0) return res.status(400).json({ error: 'Selecione ao menos um professor responsável pela turma.' });
    await db.transaction(async (tx) => {
      if (existe) {
        await tx.run('UPDATE turmas SET nome = ?, descricao = ?, ano_letivo = ?, ativa = ? WHERE id = ?', [nome, seg.texto(b.descricao, 255), seg.texto(b.anoLetivo, 10), b.ativa === false ? 0 : 1, id]);
        if (existe.nome !== nome) await tx.run("UPDATE usuarios SET turma = ? WHERE turma_id = ?", [nome, id]);
      } else {
        await tx.run('INSERT INTO turmas (id, nome, descricao, ano_letivo, ativa, criado_em, criado_por) VALUES (?, ?, ?, ?, ?, ?, ?)', [id, nome, seg.texto(b.descricao, 255), seg.texto(b.anoLetivo, 10), b.ativa === false ? 0 : 1, seg.agoraUtc(), req.usuario.id]);
      }
      if (Array.isArray(b.professorIds)) {
        await tx.run('DELETE FROM turma_professores WHERE turma_id = ?', [id]);
        for (const pid of professorIds) {
          const p = await tx.get<any>("SELECT id FROM usuarios WHERE id = ? AND tipo_perfil IN ('professor','administrador')", [pid]);
          if (p) await tx.run('INSERT INTO turma_professores (turma_id, professor_id) VALUES (?, ?)', [id, pid]);
        }
      }
    });
    await auditar(db, req, existe ? 'editar' : 'criar', 'turmas', id, { nome });
    const todas = await montarTurmas(req.usuario);
    res.status(existe ? 200 : 201).json(todas.find((t) => t.id === id));
  }));

  app.delete('/api/turmas/:id', tratar(async (req, res) => {
    const id = String(req.params.id);
    const t = await db.get<any>('SELECT nome FROM turmas WHERE id = ?', [id]);
    if (!t) return res.status(404).json({ error: 'Turma não encontrada.' });
    const n = await db.get<any>("SELECT COUNT(*) AS c FROM usuarios WHERE tipo_perfil = 'aluno' AND LOWER(turma) = LOWER(?)", [t.nome]);
    if (Number(n?.c) > 0) return res.status(409).json({ error: 'A turma ainda tem alunos vinculados. Mova-os antes de excluir.' });
    await db.run('DELETE FROM turma_professores WHERE turma_id = ?', [id]);
    await db.run('DELETE FROM turmas WHERE id = ?', [id]);
    await auditar(db, req, 'excluir', 'turmas', id, { nome: t.nome });
    res.json({ ok: true });
  }));

  /** Vincula alunos a uma turma (administradora, ou professor responsável por ela). */
  app.post('/api/turmas/:id/alunos', tratar(async (req, res) => {
    const eu = req.usuario, id = String(req.params.id);
    const t = await db.get<any>('SELECT id, nome FROM turmas WHERE id = ?', [id]);
    if (!t) return res.status(404).json({ error: 'Turma não encontrada.' });
    const souProfessorDaTurma = async () => {
      if (eu.papel !== 'professor') return true;
      const { ids } = await turmasDoProfessor(db, eu.id);
      return ids.includes(id);
    };
    if (!(await souProfessorDaTurma())) return res.status(403).json({ error: 'Você não é responsável por esta turma.' });
    const alunoIds: string[] = Array.isArray(req.body?.alunoIds) ? req.body.alunoIds.map(String).slice(0, 200) : [];
    let movidos = 0, recusados = 0;
    for (const a of alunoIds) {
      const aluno = await db.get<any>("SELECT id, turma, turma_id FROM usuarios WHERE id = ? AND tipo_perfil = 'aluno'", [a]);
      if (!aluno) { recusados++; continue; }
      // O professor só movimenta alunos livres ou já pertencentes às suas turmas.
      if (eu.papel === 'professor' && aluno.turma_id && aluno.turma_id !== id) {
        const { ids } = await turmasDoProfessor(db, eu.id);
        if (!ids.includes(String(aluno.turma_id))) { recusados++; continue; }
      }
      movidos += (await db.run('UPDATE usuarios SET turma = ?, turma_id = ? WHERE id = ? AND tipo_perfil = ?', [t.nome, id, a, 'aluno'])).changes;
    }
    if (recusados > 0 && movidos === 0) return res.status(403).json({ error: 'Nenhum aluno pôde ser vinculado: verifique se ele pertence a uma turma sob sua responsabilidade.' });
    await auditar(db, req, 'vincular_alunos', 'turmas', id, { movidos, recusados });
    res.json({ movidos, recusados });
  }));

  /** Remove um aluno da turma (ele fica sem turma até ser vinculado a outra). */
  app.delete('/api/turmas/:id/alunos/:alunoId', tratar(async (req, res) => {
    const eu = req.usuario, id = String(req.params.id), alunoId = String(req.params.alunoId);
    const t = await db.get<any>('SELECT id, nome FROM turmas WHERE id = ?', [id]);
    if (!t) return res.status(404).json({ error: 'Turma não encontrada.' });
    if (eu.papel === 'professor') {
      const { ids } = await turmasDoProfessor(db, eu.id);
      if (!ids.includes(id)) return res.status(403).json({ error: 'Você não é responsável por esta turma.' });
    }
    const aluno = await db.get<any>("SELECT id, turma_id FROM usuarios WHERE id = ? AND tipo_perfil = 'aluno'", [alunoId]);
    if (!aluno) return res.status(404).json({ error: 'Aluno não encontrado.' });
    if (aluno.turma_id && aluno.turma_id !== id) return res.status(409).json({ error: 'Este aluno não pertence a esta turma.' });
    await db.run('UPDATE usuarios SET turma = NULL, turma_id = NULL, atualizado_em = ? WHERE id = ?', [seg.agoraUtc(), alunoId]);
    await auditar(db, req, 'remover_aluno', 'turmas', id, { alunoId });
    res.json({ ok: true, alunoId });
  }));
}

/** Reassocia registros legados pela turma textual e mantém os casos sem responsável visíveis à Kátia. */
export async function reconciliarVinculosDeTurma(db: Db): Promise<number> {
  const alunos = await db.all<any>("SELECT id, turma FROM usuarios WHERE tipo_perfil = 'aluno' AND turma IS NOT NULL AND TRIM(turma) <> ''");
  let atualizados = 0;
  for (const aluno of alunos) {
    const nome = String(aluno.turma).trim().slice(0, 100);
    let turma = await db.get<any>('SELECT id FROM turmas WHERE LOWER(nome) = LOWER(?)', [nome]);
    if (!turma) {
      const id = novoId('TRM');
      await db.run('INSERT INTO turmas (id, nome, ativa, criado_em, criado_por) VALUES (?, ?, 1, ?, NULL)', [id, nome, seg.agoraUtc()]);
      turma = { id };
    }
    atualizados += (await db.run('UPDATE usuarios SET turma_id = ? WHERE id = ? AND (turma_id IS NULL OR turma_id <> ?)', [turma.id, aluno.id, turma.id])).changes;
  }
  return atualizados;
}

/* --------------------------- inicialização no boot --------------------------- */
export async function bootstrapAdministradora(db: Db, env: Record<string, string | undefined>): Promise<string> {
  const email = seg.emailValido(env.ADMIN_EMAIL), senha = env.ADMIN_INITIAL_PASSWORD || '';
  const ja = await db.get<any>("SELECT id, email FROM usuarios WHERE tipo_perfil = 'administrador' LIMIT 1");
  if (ja) {
    if (email && String(ja.email).toLowerCase() === email && senha.length >= 10 && !seg.validarSenha(senha, 10)) {
      await db.run('UPDATE usuarios SET senha_hash = ?, deve_trocar_senha = 0, atualizado_em = ? WHERE id = ?', [await seg.hashSenha(senha), seg.agoraUtc(), ja.id]);
      await seg.encerrarTodasSessoes(db, ja.id);
      return 'senha da administradora redefinida pela configuração protegida do servidor';
    }
    return 'já existe administradora';
  }
  if (!email || senha.length < 10 || seg.validarSenha(senha, 10)) return 'ADMIN_EMAIL / ADMIN_INITIAL_PASSWORD (mín. 10 caracteres) não definidos: nenhuma administradora criada';
  const dono = await db.get<any>('SELECT id FROM usuarios WHERE LOWER(email) = ?', [email]);
  if (dono) { await db.run("UPDATE usuarios SET tipo_perfil = 'administrador', status = 'ativo', ativo = 1 WHERE id = ?", [dono.id]); return 'conta existente promovida a administradora'; }
  await db.run(
    `INSERT INTO usuarios (id, nome, email, senha_hash, tipo_perfil, departamento, ativo, status, criado_em, atualizado_em) VALUES (?, ?, ?, ?, 'administrador', 'Administração', 1, 'ativo', ?, ?)`,
    [novoId('USR'), env.ADMIN_NOME || 'Kátia', email, await seg.hashSenha(senha), seg.agoraUtc(), seg.agoraUtc()],
  );
  return 'administradora criada';
}

/** Regrava com hash as senhas que versões antigas guardaram em texto puro. Roda a cada boot, sem efeito se já estiver tudo protegido. */
export async function protegerSenhasLegadas(db: Db): Promise<number> {
  const rows = await db.all<any>("SELECT id, senha_hash FROM usuarios WHERE senha_hash IS NOT NULL AND senha_hash <> '' AND senha_hash NOT LIKE 'scrypt$%'");
  for (const r of rows) await db.run('UPDATE usuarios SET senha_hash = ? WHERE id = ?', [await seg.hashSenha(r.senha_hash), r.id]);
  return rows.length;
}

/** Ativa cadastros antigos que ficaram pendentes (aprovação manual desativada). */
export async function ativarCadastrosPendentes(db: Db): Promise<number> {
  const r = await db.run("UPDATE usuarios SET status = 'ativo', ativo = 1, atualizado_em = ? WHERE status = 'pendente' AND tipo_perfil <> 'administrador'", [seg.agoraUtc()]);
  return r.changes;
}
void randomBytes;
