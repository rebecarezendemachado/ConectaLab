/* Alertas, baixa de estoque atômica, leituras com escopo e auditoria. */
import type { Db } from './db.ts';
import * as seg from './seguranca.ts';
import { turmasDoProfessor } from './politica.ts';
import { novoId, tratar, auditar, numeroPositivo } from './comum.ts';

const TIPOS = ['consumo', 'falta_estoque', 'alerta_critico', 'alteracao', 'sistema'];
const GRAV = ['alta', 'media', 'baixa'];
const ACOES = ['comprar', 'ver_estoque', 'ver_consumo'];
const fusoBR = { timeZone: 'America/Sao_Paulo' } as const;

/** Quem deve receber o alerta: nunca "todo mundo". */
async function destinatarios(db: Db, autor: { id: string; papel: string; turma: string | null }, tipo: string): Promise<string[]> {
  const ids = new Set<string>();
  const admins = await db.all<any>("SELECT id FROM usuarios WHERE tipo_perfil = 'administrador' AND COALESCE(status,'ativo') = 'ativo'");
  admins.forEach((a) => ids.add(a.id));
  if (tipo === 'falta_estoque' || tipo === 'alerta_critico' || (autor.papel === 'administrador' && tipo === 'alteracao')) {
    // (reposição recebida pela administradora também interessa aos professores: há material novo)
    // alertas de estoque interessam a toda a gestão do laboratório
    const profs = await db.all<any>("SELECT id FROM usuarios WHERE tipo_perfil = 'professor' AND COALESCE(status,'ativo') = 'ativo'");
    profs.forEach((p) => ids.add(p.id));
  } else if (autor.papel === 'aluno' && autor.turma) {
    // avisos de um aluno vão só para os professores responsáveis pela turma dele
    const profs = await db.all<any>(
      'SELECT tp.professor_id AS id FROM turma_professores tp JOIN turmas t ON t.id = tp.turma_id WHERE LOWER(t.nome) = LOWER(?)', [autor.turma]);
    profs.forEach((p) => ids.add(p.id));
  }
  if (autor.papel !== 'aluno') ids.add(autor.id); // quem não é aluno enxerga o que gerou
  return [...ids];
}

export async function inserirAlerta(db: Db, conteudo: any, autor: { id: string; nome: string; papel: string; turma: string | null; turmaId?: string | null }) {
  await db.run('INSERT INTO alertas (id, autor_id, autor_nome, autor_perfil, turma_id, criado_em, conteudo) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [conteudo.id, autor.id, autor.nome, autor.papel === 'aluno' ? 'aluno' : 'professor', autor.turmaId ?? null, seg.agoraUtc(), JSON.stringify(conteudo)]);
  for (const uid of await destinatarios(db, autor, conteudo.tipo)) {
    await db.run('INSERT INTO alerta_destinatarios (alerta_id, usuario_id, lido) VALUES (?, ?, 0)', [conteudo.id, uid]);
  }
}

export function limparConteudoAlerta(b: any, eu: any) {
  const agora = new Date();
  const data = seg.texto(b.data, 20) ?? agora.toLocaleDateString('pt-BR', fusoBR);
  const hora = seg.texto(b.hora, 10) ?? agora.toLocaleTimeString('pt-BR', { ...fusoBR, hour: '2-digit', minute: '2-digit' });
  const num = (v: any) => (v === undefined || v === null || v === '' || !Number.isFinite(Number(v)) ? undefined : Number(v));
  return {
    id: typeof b.id === 'string' && /^[A-Za-z0-9_-]{1,50}$/.test(b.id) ? b.id : novoId('ALT'),
    tipo: TIPOS.includes(b.tipo) ? b.tipo : 'sistema',
    titulo: seg.texto(b.titulo, 200) ?? 'Aviso',
    mensagem: (typeof b.mensagem === 'string' ? b.mensagem : '').slice(0, 2000),
    produtoNome: seg.texto(b.produtoNome, 200) ?? undefined,
    quantidadeAlterada: num(b.quantidadeAlterada), saldoRestante: num(b.saldoRestante),
    unidade: seg.texto(b.unidade, 10) ?? undefined,
    autorNome: eu.nome, autorPerfil: eu.papel === 'aluno' ? 'aluno' : 'professor', // sempre vindos da sessão, nunca do cliente
    dataHora: seg.texto(b.dataHora, 40) ?? `${data} às ${hora}`, data, hora, lida: false,
    gravidade: GRAV.includes(b.gravidade) ? b.gravidade : 'media',
    acaoSugerida: ACOES.includes(b.acaoSugerida) ? b.acaoSugerida : undefined,
  };
}

export function registrarRotasOperacoes(app: any, db: Db) {
  /* ---------------------------------- ALERTAS ---------------------------------- */
  app.get('/api/alertas', tratar(async (req, res) => {
    const eu = req.usuario;
    const rows = eu.papel === 'administrador'
      ? await db.all<any>('SELECT a.conteudo, d.lido FROM alertas a LEFT JOIN alerta_destinatarios d ON d.alerta_id = a.id AND d.usuario_id = ? ORDER BY a.criado_em DESC LIMIT 500', [eu.id])
      : await db.all<any>('SELECT a.conteudo, d.lido FROM alertas a JOIN alerta_destinatarios d ON d.alerta_id = a.id WHERE d.usuario_id = ? ORDER BY a.criado_em DESC LIMIT 500', [eu.id]);
    res.json(rows.map((r) => ({ ...JSON.parse(r.conteudo), lida: !!Number(r.lido ?? 0) })));
  }));

  // As dispensas dos avisos automáticos ficam no servidor e são específicas por pessoa.
  app.get('/api/alertas/descartados', tratar(async (req, res) => {
    const rows = await db.all<any>('SELECT alerta_id FROM alertas_descartados WHERE usuario_id = ?', [req.usuario.id]);
    res.json(rows.map((r) => String(r.alerta_id)));
  }));

  app.post('/api/alertas/:id/dispensar', tratar(async (req, res) => {
    const eu = req.usuario;
    const id = String(req.params.id);
    if (eu.papel === 'aluno') return res.status(403).json({ error: 'Somente professores e a administração podem dispensar estes avisos.' });
    if (!id.startsWith('ALT-LIVE-REG-') || id.length > 50 || !/^[A-Za-z0-9_-]+$/.test(id)) {
      return res.status(400).json({ error: 'Este aviso não pode ser dispensado por esta operação.' });
    }
    const existente = await db.get<any>('SELECT alerta_id FROM alertas_descartados WHERE usuario_id = ? AND alerta_id = ?', [eu.id, id]);
    if (existente) {
      await db.run('UPDATE alertas_descartados SET descartado_em = ? WHERE usuario_id = ? AND alerta_id = ?', [seg.agoraUtc(), eu.id, id]);
    } else {
      await db.run('INSERT INTO alertas_descartados (usuario_id, alerta_id, descartado_em) VALUES (?, ?, ?)', [eu.id, id, seg.agoraUtc()]);
    }
    res.json({ ok: true, id });
  }));

  app.post('/api/alertas', tratar(async (req, res) => {
    const eu = req.usuario, b = req.body || {};
    const existente = typeof b.id === 'string' ? await db.get<any>('SELECT id, conteudo FROM alertas WHERE id = ?', [b.id]) : undefined;
    if (existente) {
      // atualizar = apenas marcar como lido/não lido PARA O PRÓPRIO USUÁRIO
      const lido = b.lida === false ? 0 : 1;
      const destinatario = await db.get<any>('SELECT alerta_id FROM alerta_destinatarios WHERE alerta_id = ? AND usuario_id = ?', [existente.id, eu.id]);
      if (destinatario) {
        await db.run('UPDATE alerta_destinatarios SET lido = ?, lido_em = ? WHERE alerta_id = ? AND usuario_id = ?', [lido, lido ? seg.agoraUtc() : null, existente.id, eu.id]);
      } else {
        await db.run('INSERT INTO alerta_destinatarios (alerta_id, usuario_id, lido, lido_em) VALUES (?, ?, ?, ?)', [existente.id, eu.id, lido, lido ? seg.agoraUtc() : null]);
      }
      return res.json({ ...JSON.parse(existente.conteudo), lida: !!lido });
    }
    const conteudo = limparConteudoAlerta(b, eu);
    await db.transaction((tx) => inserirAlerta(tx, conteudo, eu));
    await auditar(db, req, 'criar', 'alertas', conteudo.id, { tipo: conteudo.tipo, titulo: conteudo.titulo });
    res.status(201).json(conteudo);
  }));

  app.delete('/api/alertas/:id', tratar(async (req, res) => {
    const id = String(req.params.id);
    await db.run('DELETE FROM alerta_destinatarios WHERE alerta_id = ?', [id]);
    const r = await db.run('DELETE FROM alertas WHERE id = ?', [id]);
    await auditar(db, req, 'excluir', 'alertas', id);
    res.json({ ok: r.changes > 0 });
  }));

  /* ------------------- BAIXA DE ESTOQUE ATÔMICA (consumo) -------------------
     Antes, o NAVEGADOR lia o estoque, subtraía e gravava de volta: dois aparelhos
     ao mesmo tempo sobrescreviam um ao outro. Agora o servidor faz tudo numa só
     transação, e o aluno só consegue baixar estoque por aqui (registrado e auditado). */
  app.post('/api/operacoes/consumo', tratar(async (req, res) => {
    const eu = req.usuario, b = req.body || {};
    const nomeProd = seg.texto(b.produtoNome, 200), qtd = numeroPositivo(b.quantidade);
    if (!nomeProd) return res.status(400).json({ error: 'Informe o produto.' });
    if (qtd === null) return res.status(400).json({ error: 'Informe uma quantidade válida (maior que zero).' });
    let turmaRegistro = '';
    let alunoRegistro: { id: string; nome: string } = { id: eu.id, nome: eu.nome };
    let turmaIdRegistro: string | null = eu.turmaId ?? null;
    if (eu.papel === 'aluno') {
      turmaRegistro = seg.texto(eu.turma, 50) ?? '';
      if (!turmaRegistro) return res.status(422).json({ error: 'Sua conta ainda não está vinculada a uma turma. Peça à Kátia para organizar seu acesso.' });
    } else {
      // Professor(a) ou administradora podem registrar a atividade em nome de um aluno.
      const alunoId = seg.texto(b.alunoId, 36);
      if (alunoId) {
        const aluno = await db.get<any>("SELECT id, nome, turma, turma_id FROM usuarios WHERE id = ? AND tipo_perfil = 'aluno'", [alunoId]);
        if (!aluno) return res.status(404).json({ error: 'Aluno não encontrado.' });
        if (eu.papel === 'professor') {
          const { ids } = await turmasDoProfessor(db, eu.id);
          if (!aluno.turma_id || !ids.includes(String(aluno.turma_id))) {
            return res.status(403).json({ error: 'Este aluno não pertence às suas turmas.' });
          }
        }
        alunoRegistro = { id: aluno.id, nome: aluno.nome };
        turmaIdRegistro = aluno.turma_id ?? null;
        turmaRegistro = seg.texto(aluno.turma, 50) ?? '';
        if (!turmaRegistro && aluno.turma_id) {
          const t = await db.get<any>('SELECT nome FROM turmas WHERE id = ?', [aluno.turma_id]);
          turmaRegistro = t?.nome ?? '';
        }
      } else if (eu.papel === 'professor') {
        const { nomes } = await turmasDoProfessor(db, eu.id);
        const solicitada = seg.texto(b.turma, 50) ?? (nomes.length === 1 ? nomes[0] : '');
        if (!solicitada || !nomes.some((n) => n.toLowerCase() === solicitada.toLowerCase())) return res.status(403).json({ error: 'Selecione uma das suas turmas antes de registrar o consumo.' });
        turmaRegistro = solicitada;
      } else {
        turmaRegistro = seg.texto(b.turma, 50) ?? 'Administração';
      }
    }

    const resultado = await db.transaction(async (tx) => {
      const prod = await tx.get<any>('SELECT id, nome, estoque_atual, estoque_minimo, unidade FROM produtos_quimicos WHERE LOWER(nome) = LOWER(?)', [nomeProd]);
      let saldo = 0, produtoDto: any = null;
      if (prod) {
        await tx.run('UPDATE produtos_quimicos SET estoque_atual = CASE WHEN estoque_atual - ? < 0 THEN 0 ELSE estoque_atual - ? END, atualizado_em = ? WHERE id = ?', [qtd, qtd, seg.agoraUtc(), prod.id]);
        const novo = await tx.get<any>('SELECT estoque_atual FROM produtos_quimicos WHERE id = ?', [prod.id]);
        saldo = Number(novo.estoque_atual);
        produtoDto = { id: prod.id, nome: prod.nome, estoqueAtual: saldo, estoqueMinimo: Number(prod.estoque_minimo), unidade: prod.unidade };
        const lote = await tx.get<any>('SELECT id, estoque_minimo FROM estoque_lotes WHERE LOWER(produto_nome) = LOWER(?) LIMIT 1', [nomeProd]);
        if (lote) {
          await tx.run('UPDATE estoque_lotes SET quantidade_atual = CASE WHEN quantidade_atual - ? < 0 THEN 0 ELSE quantidade_atual - ? END, atualizado_em = ? WHERE id = ?', [qtd, qtd, seg.agoraUtc(), lote.id]);
          const l2 = await tx.get<any>('SELECT quantidade_atual FROM estoque_lotes WHERE id = ?', [lote.id]);
          const q = Number(l2.quantidade_atual), status = q <= 0 ? 'Esgotado' : q <= Number(lote.estoque_minimo) ? 'Estoque baixo' : 'Normal';
          await tx.run('UPDATE estoque_lotes SET status_estoque = ? WHERE id = ?', [status, lote.id]);
        }
      }
      const agora = new Date();
      const dataBR = agora.toLocaleDateString('pt-BR', fusoBR), horaBR = agora.toLocaleTimeString('pt-BR', { ...fusoBR, hour: '2-digit', minute: '2-digit' });
      const ehAluno = eu.papel === 'aluno';
      let orientador = ehAluno ? 'Prof. Responsável' : eu.nome;
      if (ehAluno && eu.turma) {
        const p = await tx.get<any>('SELECT u.nome FROM usuarios u JOIN turma_professores tp ON tp.professor_id = u.id JOIN turmas t ON t.id = tp.turma_id WHERE LOWER(t.nome) = LOWER(?) ORDER BY u.nome LIMIT 1', [eu.turma]);
        if (p) orientador = p.nome;
      }
      const unidade = seg.texto(b.unidade, 10) ?? prod?.unidade ?? 'mL';
      const consumoId = novoId('CSM');
      await tx.run(
        `INSERT INTO consumos_aluno (id, aluno_nome, turma, bancada, pratica, produto_nome, quantidade_usada, unidade, data_registro, hora_registro, professor_orientador, observacoes, status_visto, usuario_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [consumoId, alunoRegistro.nome, turmaRegistro, seg.texto(b.bancada, 50) ?? 'Bancada 01', seg.texto(b.pratica, 200) ?? 'Uso em Aula Prática', nomeProd, qtd, unidade,
         agora.toISOString().slice(0, 10), agora.toISOString().slice(11, 19), orientador, seg.texto(b.observacoes, 1000), ehAluno ? 'Pendente' : 'Visto pelo Professor', alunoRegistro.id],
      );
      const critico = !!prod && saldo <= Number(prod.estoque_minimo), esgotado = !!prod && saldo <= 0;
      const papelTxt = ehAluno ? 'Aluno' : 'Professor';
      const paraQuem = alunoRegistro.id !== eu.id ? ` para ${alunoRegistro.nome}` : '';
      const conteudo = limparConteudoAlerta({
        tipo: esgotado ? 'falta_estoque' : critico ? 'alerta_critico' : 'consumo',
        titulo: esgotado ? `🚨 Reagente Esgotado: ${nomeProd}` : critico ? `⚠️ Estoque Crítico: ${nomeProd}` : `Baixa de Estoque: ${nomeProd}`,
        mensagem: `${eu.nome} (${papelTxt}) registrou${paraQuem} uso de ${qtd} ${unidade} de ${nomeProd}.${prod ? ` Saldo restante em estoque: ${saldo} ${unidade}.` : ''}${esgotado ? ' Atenção: item esgotado.' : critico ? ' Atenção: item em nível crítico.' : ''}`,
        produtoNome: nomeProd, quantidadeAlterada: qtd, saldoRestante: saldo, unidade, data: dataBR, hora: horaBR, dataHora: `${dataBR} às ${horaBR}`,
        gravidade: critico || esgotado ? 'alta' : 'media', acaoSugerida: critico || esgotado ? 'comprar' : 'ver_estoque',
      }, eu);
      await inserirAlerta(tx, conteudo, alunoRegistro.id !== eu.id ? { ...eu, turma: turmaRegistro, turmaId: turmaIdRegistro } : eu);
      return { produto: produtoDto, alerta: conteudo, consumoId, saldo };
    });
    await auditar(db, req, 'baixa_estoque', 'estoque', resultado.consumoId, { produto: nomeProd, quantidade: qtd, saldo: resultado.saldo });
    res.status(201).json({ produto: resultado.produto, alerta: resultado.alerta });
  }));

  /* ------------------ CONSUMOS e OCORRÊNCIAS com escopo por perfil ------------------ */
  const escopo = async (eu: any, colTurma: string): Promise<{ sql: string; par: any[] }> => {
    if (eu.papel === 'administrador') return { sql: '', par: [] };
    if (eu.papel === 'aluno') return { sql: 'WHERE usuario_id = ?', par: [eu.id] };
    const { nomes } = await turmasDoProfessor(db, eu.id);
    if (!nomes.length) return { sql: 'WHERE usuario_id = ?', par: [eu.id] };
    return { sql: `WHERE usuario_id = ? OR LOWER(${colTurma}) IN (${nomes.map(() => '?').join(',')})`, par: [eu.id, ...nomes.map((n) => n.toLowerCase())] };
  };

  app.get('/api/consumos', tratar(async (req, res) => {
    const { sql, par } = await escopo(req.usuario, 'turma');
    const rows = await db.all<any>(
      `SELECT id, aluno_nome, turma, bancada, pratica, produto_nome, quantidade_usada, unidade, CAST(data_registro AS CHAR) AS data_registro,
              CAST(hora_registro AS CHAR) AS hora_registro, professor_orientador, observacoes, status_visto, usuario_id
         FROM consumos_aluno ${sql} ORDER BY data_registro DESC, hora_registro DESC`, par);
    res.json(rows.map((r) => ({ id: r.id, alunoNome: r.aluno_nome, turma: r.turma, bancada: r.bancada, pratica: r.pratica, produtoNome: r.produto_nome,
      quantidadeUsada: Number(r.quantidade_usada), unidade: r.unidade, data: String(r.data_registro).slice(0, 10), hora: String(r.hora_registro).slice(0, 8),
      professorOrientador: r.professor_orientador, observacoes: r.observacoes ?? undefined, statusVisto: r.status_visto })));
  }));

  app.get('/api/ocorrencias', tratar(async (req, res) => {
    const { sql, par } = await escopo(req.usuario, 'turma');
    const rows = await db.all<any>(
      `SELECT id, aluno_nome, turma, bancada, tipo_ocorrencia, reagente_envolvido, gravidade, descricao, primeiros_socorros_adotados,
              CAST(data_ocorrencia AS CHAR) AS data_ocorrencia, CAST(hora_ocorrencia AS CHAR) AS hora_ocorrencia, status_atendimento
         FROM ocorrencias_aluno ${sql} ORDER BY data_ocorrencia DESC, hora_ocorrencia DESC`, par);
    res.json(rows.map((r) => ({ id: r.id, alunoNome: r.aluno_nome, turma: r.turma, bancada: r.bancada, tipoOcorrencia: r.tipo_ocorrencia,
      reagenteEnvolvido: r.reagente_envolvido, gravidade: r.gravidade, descricao: r.descricao, primeirosSocorrosAdotados: r.primeiros_socorros_adotados,
      data: String(r.data_ocorrencia).slice(0, 10), hora: String(r.hora_ocorrencia).slice(0, 8), status: r.status_atendimento })));
  }));

  /* -------------------------------- AUDITORIA -------------------------------- */
  app.get('/api/auditoria', tratar(async (req, res) => {
    const q = req.query || {}, onde: string[] = [], par: any[] = [];
    if (typeof q.entidade === 'string') { onde.push('entidade = ?'); par.push(q.entidade); }
    if (typeof q.usuarioId === 'string') { onde.push('usuario_id = ?'); par.push(q.usuarioId); }
    if (typeof q.desde === 'string' && /^\d{4}-\d{2}-\d{2}/.test(q.desde)) { onde.push('data_hora >= ?'); par.push(q.desde.slice(0, 10) + ' 00:00:00'); }
    const limite = Math.min(500, Math.max(1, parseInt(String(q.limite ?? '100'), 10) || 100));
    const rows = await db.all<any>(`SELECT id, data_hora, usuario_id, usuario_nome, papel, acao, entidade, entidade_id, detalhes FROM auditoria ${onde.length ? 'WHERE ' + onde.join(' AND ') : ''} ORDER BY data_hora DESC LIMIT ${limite}`, par);
    res.json(rows.map((r) => ({ id: r.id, dataHora: String(r.data_hora), usuarioId: r.usuario_id, usuarioNome: r.usuario_nome, papel: r.papel, acao: r.acao, entidade: r.entidade, entidadeId: r.entidade_id, detalhes: r.detalhes ? safeJson(r.detalhes) : null })));
  }));
}
const safeJson = (s: string) => { try { return JSON.parse(s); } catch { return s; } };
