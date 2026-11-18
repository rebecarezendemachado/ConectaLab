/* ============================================================================
   Estoque, compras e solicitações no FORMATO QUE A TELA JÁ USA.
   O servidor antigo gravava/lia nomes diferentes (produtoNome, fornecedorNome, valorTotal,
   produtoResumo...), então essas telas só funcionavam por causa da cópia local do navegador.
   Estas rotas substituem as antigas para essas três entidades, com validação e SQL testável.
   ============================================================================ */
import type { Db } from './db.ts';
import * as seg from './seguranca.ts';
import { novoId, tratar, auditar } from './comum.ts';
import { etapaDe, ROTULOS } from './rotasCompras.ts';
import { turmasDoProfessor } from './politica.ts';
import { inserirAlerta, limparConteudoAlerta } from './rotasOperacoes.ts';

const STATUS_COMPRA = ['Cotação', 'Aguardando aprovação', 'Pedido realizado', 'Recebido'];
const STATUS_SOLICITACAO = ['Em análise', 'Aprovada', 'Pendência', 'Reprovada'];

/** Aceita "2026-03-10" ou "10/03/2026" e devolve AAAA-MM-DD (ou null). */
export function paraIso(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
  const m = t.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}
const hojeIso = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
const numero = (v: unknown, padrao = 0): number | null => {
  if (v === undefined || v === null || v === '') return padrao;
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : Number(v);
  return Number.isFinite(n) && n >= 0 && n <= 1e9 ? n : null;
};
const id50 = (v: unknown, prefixo: string): string => (typeof v === 'string' && /^[A-Za-z0-9_.-]{1,50}$/.test(v) ? v : novoId(prefixo));

export function registrarRotasDados(app: any, db: Db) {
  /* Atividades e ocorrências pertencem a alunos e turmas. A Kátia tem visão global;
     cada docente recebe somente os registros de suas turmas; aluno vê os próprios. */
  const linhasDaPessoa = async (recurso: 'consumos' | 'ocorrencias', usuario: any) => {
    const tabela = recurso === 'consumos' ? 'consumos_aluno' : 'ocorrencias_aluno';
    const colData = recurso === 'consumos' ? 'data_registro' : 'data_ocorrencia';
    const colHora = recurso === 'consumos' ? 'hora_registro' : 'hora_ocorrencia';
    let filtro = '', params: any[] = [];
    if (usuario.papel === 'aluno') {
      filtro = " WHERE usuario_id = ? OR (usuario_id IS NULL AND LOWER(aluno_nome) = LOWER(?) AND LOWER(COALESCE(turma, '')) = LOWER(COALESCE(?, '')))";
      params = [usuario.id, usuario.nome, usuario.turma ?? ''];
    } else if (usuario.papel === 'professor') {
      const { nomes } = await turmasDoProfessor(db, usuario.id);
      if (!nomes.length) return [];
      filtro = ` WHERE LOWER(turma) IN (${nomes.map(() => '?').join(',')})`;
      params = nomes.map((n) => n.toLowerCase());
    }
    return db.all<any>(`SELECT * FROM ${tabela}${filtro} ORDER BY ${colData} DESC, ${colHora} DESC`, params);
  };
  app.get('/api/consumos', tratar(async (req, res) => {
    const rows = await linhasDaPessoa('consumos', req.usuario);
    res.json(rows.map((r) => ({ id: r.id, alunoNome: r.aluno_nome, turma: r.turma ?? '', bancada: r.bancada ?? '', pratica: r.pratica ?? '', produtoNome: r.produto_nome,
      quantidadeUsada: Number(r.quantidade_usada ?? 0), unidade: r.unidade, data: String(r.data_registro ?? '').slice(0, 10), hora: String(r.hora_registro ?? '').slice(0, 8),
      professorOrientador: r.professor_orientador ?? '', observacoes: r.observacoes ?? '', statusVisto: r.status_visto ?? 'Pendente' })));
  }));
  app.get('/api/ocorrencias', tratar(async (req, res) => {
    const rows = await linhasDaPessoa('ocorrencias', req.usuario);
    res.json(rows.map((r) => ({ id: r.id, alunoNome: r.aluno_nome, turma: r.turma ?? '', bancada: r.bancada ?? '', tipoOcorrencia: r.tipo_ocorrencia,
      reagenteEnvolvido: r.reagente_envolvido ?? '', gravidade: r.gravidade, descricao: r.descricao, primeirosSocorrosAdotados: r.primeiros_socorros_adotados,
      data: String(r.data_ocorrencia ?? '').slice(0, 10), hora: String(r.hora_ocorrencia ?? '').slice(0, 8), status: r.status_atendimento ?? 'Notificado' })));
  }));
  app.post('/api/consumos', tratar(async (req, res) => {
    const id = String(req.body?.id ?? ''), atual = id ? await db.get<any>('SELECT * FROM consumos_aluno WHERE id = ?', [id]) : undefined;
    if (!atual) return res.status(405).json({ error: 'Os consumos são registrados pelo fluxo seguro de bancada.' });
    const { nomes } = req.usuario.papel === 'professor' ? await turmasDoProfessor(db, req.usuario.id) : { nomes: [] };
    if (req.usuario.papel !== 'administrador' && !(req.usuario.papel === 'professor' && nomes.some((n) => n.toLowerCase() === String(atual.turma ?? '').toLowerCase()))) return res.status(403).json({ error: 'Você só pode revisar consumos das suas turmas.' });
    const status = req.body?.statusVisto === 'Visto pelo Professor' ? 'Visto pelo Professor' : 'Pendente';
    await db.run('UPDATE consumos_aluno SET status_visto = ? WHERE id = ?', [status, id]);
    res.json({ ...req.body, id, statusVisto: status });
  }));
  app.post('/api/ocorrencias', tratar(async (req, res) => {
    const b = req.body || {}, solicitado = typeof b.id === 'string' ? b.id : '';
    const atual = solicitado ? await db.get<any>('SELECT * FROM ocorrencias_aluno WHERE id = ?', [solicitado]) : undefined;
    if (atual) {
      const { nomes } = req.usuario.papel === 'professor' ? await turmasDoProfessor(db, req.usuario.id) : { nomes: [] };
      if (req.usuario.papel !== 'administrador' && !(req.usuario.papel === 'professor' && nomes.some((n) => n.toLowerCase() === String(atual.turma ?? '').toLowerCase()))) return res.status(403).json({ error: 'Você só pode acompanhar ocorrências das suas turmas.' });
      const status = ['Notificado', 'Em atendimento', 'Concluído'].includes(b.status) ? b.status : atual.status_atendimento;
      await db.run('UPDATE ocorrencias_aluno SET status_atendimento = ? WHERE id = ?', [status, solicitado]);
      return res.json({ ...b, id: solicitado, status });
    }

    const eu = req.usuario;
    let turmaNome = seg.texto(b.turma, 50);
    if (eu.papel === 'aluno') {
      turmaNome = seg.texto(eu.turma, 50);
      if (!turmaNome) return res.status(422).json({ error: 'Sua conta ainda não está vinculada a uma turma. Peça à Kátia para organizar seu acesso.' });
    } else if (eu.papel === 'professor') {
      const { nomes } = await turmasDoProfessor(db, eu.id);
      if (!nomes.length) return res.status(403).json({ error: 'Você ainda não tem uma turma vinculada. Peça à Kátia para organizar sua sala.' });
      turmaNome = turmaNome || (nomes.length === 1 ? nomes[0] : null);
      if (!turmaNome || !nomes.some((n) => n.toLowerCase() === turmaNome!.toLowerCase())) return res.status(403).json({ error: 'Selecione uma das suas turmas para registrar a ocorrência.' });
    }
    if (!turmaNome) return res.status(400).json({ error: 'Selecione a turma relacionada à ocorrência.' });
    const turmaExiste = await db.get<any>('SELECT id FROM turmas WHERE LOWER(nome) = LOWER(?)', [turmaNome]);
    if (!turmaExiste) return res.status(422).json({ error: 'A turma informada não está cadastrada.' });
    const id = id50(solicitado, 'OCO'), agora = new Date(), data = agora.toISOString().slice(0, 10), hora = agora.toISOString().slice(11, 19);
    const tipo = ['Quebra de vidraria', 'Derramamento de reagente', 'Contato cutâneo/ocular', 'Inalação de vapores', 'Queimadura', 'Outro'].includes(b.tipoOcorrencia) ? b.tipoOcorrencia : 'Outro';
    const gravidade = ['Leve (sem lesão)', 'Moderada (lava-olhos/EPI)', 'Grave (necessitou socorro médico)'].includes(b.gravidade) ? b.gravidade : 'Leve (sem lesão)';
    const alunoNome = eu.papel === 'aluno' ? eu.nome : seg.texto(b.alunoNome, 150) ?? eu.nome;
    await db.run(`INSERT INTO ocorrencias_aluno (id, aluno_nome, turma, bancada, tipo_ocorrencia, reagente_envolvido, gravidade, descricao, primeiros_socorros_adotados, data_ocorrencia, hora_ocorrencia, status_atendimento, usuario_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Notificado', ?)`,
      [id, alunoNome, turmaNome, seg.texto(b.bancada, 50) ?? '', tipo, seg.texto(b.reagenteEnvolvido, 200), gravidade, seg.texto(b.descricao, 3000) ?? 'Ocorrência sem descrição.', seg.texto(b.primeirosSocorrosAdotados, 2000) ?? '', data, hora, eu.id]);
    const alerta = limparConteudoAlerta({ tipo: 'sistema', titulo: `Ocorrência registrada · ${tipo}`,
      mensagem: `${alunoNome} registrou uma ocorrência na turma ${turmaNome}. Gravidade informada: ${gravidade}.`,
      data, hora, gravidade: gravidade.startsWith('Grave') ? 'alta' : gravidade.startsWith('Moderada') ? 'media' : 'baixa', acaoSugerida: 'ver_consumo' }, eu);
    await inserirAlerta(db, alerta, { id: eu.id, nome: eu.nome, papel: eu.papel, turma: turmaNome, turmaId: turmaExiste.id });
    await auditar(db, req, 'registrar_ocorrencia', 'ocorrencias', id, { turma: turmaNome, gravidade, tipo });
    res.status(201).json({ id, alunoNome, turma: turmaNome, bancada: seg.texto(b.bancada, 50) ?? '', tipoOcorrencia: tipo,
      reagenteEnvolvido: seg.texto(b.reagenteEnvolvido, 200) ?? '', gravidade, descricao: seg.texto(b.descricao, 3000) ?? '',
      primeirosSocorrosAdotados: seg.texto(b.primeirosSocorrosAdotados, 2000) ?? '', data, hora, status: 'Notificado' });
  }));

  /* Produtos: mantém os campos de FDS e de nota fiscal no banco central. */
  const paraProduto = (r: any) => ({ id: r.id, nome: r.nome, cas: r.cas_number ?? '', formulaQuimica: r.formula_quimica ?? '', massaMolar: r.massa_molar ?? '',
    pureza: r.pureza ?? '', classePerigo: r.classe_perigo ?? 'Geral', corPerigo: r.cor_perigo ?? 'amarelo', situacao: r.situacao_legal ?? 'Não controlado',
    estoqueAtual: Number(r.estoque_atual ?? 0), estoqueMinimo: Number(r.estoque_minimo ?? 0), unidade: r.unidade ?? 'g', validade: r.validade_lote ?? '',
    localizacao: r.localizacao ?? '', fornecedorPrincipal: r.fornecedor_principal ?? '', fispqUrl: r.fispq_url ?? '', notaFiscalUrl: r.nota_fiscal_url ?? '' });
  app.get('/api/produtos', tratar(async (_req, res) => {
    const rows = await db.all<any>('SELECT * FROM produtos_quimicos ORDER BY nome ASC');
    res.json(rows.map(paraProduto));
  }));
  app.post('/api/produtos', tratar(async (req, res) => {
    const b = req.body || {}, id = id50(b.id, 'PRD'), nome = seg.texto(b.nome, 200), cas = seg.texto(b.cas, 50) ?? '';
    if (!nome || !cas) return res.status(400).json({ error: 'Informe nome e número CAS do produto.' });
    const atual = await db.get<any>('SELECT * FROM produtos_quimicos WHERE id = ?', [id]);
    const quantidade = numero(b.estoqueAtual), minimo = numero(b.estoqueMinimo);
    if (quantidade === null || minimo === null) return res.status(400).json({ error: 'Estoque e mínimo devem ser números iguais ou maiores que zero.' });
    const unidade = ['L', 'mL', 'kg', 'g'].includes(b.unidade) ? b.unidade : 'g';
    const cor = ['amarelo', 'vermelho', 'verde', 'laranja'].includes(b.corPerigo) ? b.corPerigo : 'amarelo';
    const situacao = b.situacao === 'Controlado' ? 'Controlado' : 'Não controlado';
    const papelAdmin = req.usuario.papel === 'administrador';
    const fds = papelAdmin && typeof b.fispqUrl === 'string' ? b.fispqUrl.slice(0, 255) : atual?.fispq_url ?? '';
    const nota = papelAdmin && typeof b.notaFiscalUrl === 'string' ? b.notaFiscalUrl.slice(0, 255) : atual?.nota_fiscal_url ?? '';
    const campos = [nome, cas, seg.texto(b.formulaQuimica, 100), seg.texto(b.massaMolar, 50), seg.texto(b.pureza, 50), seg.texto(b.classePerigo, 150) ?? 'Geral', cor, situacao,
      quantidade, minimo, unidade, seg.texto(b.validade, 20) ?? '-', seg.texto(b.localizacao, 150), atual?.fornecedor_principal ?? seg.texto(b.fornecedorPrincipal, 150), fds, nota, seg.texto(b.observacoes, 1000)];
    if (atual) await db.run(`UPDATE produtos_quimicos SET nome=?, cas_number=?, formula_quimica=?, massa_molar=?, pureza=?, classe_perigo=?, cor_perigo=?, situacao_legal=?, estoque_atual=?, estoque_minimo=?, unidade=?, validade_lote=?, localizacao=?, fornecedor_principal=?, fispq_url=?, nota_fiscal_url=?, observacoes=?, atualizado_em=? WHERE id=?`, [...campos, seg.agoraUtc(), id]);
    else await db.run(`INSERT INTO produtos_quimicos (nome, cas_number, formula_quimica, massa_molar, pureza, classe_perigo, cor_perigo, situacao_legal, estoque_atual, estoque_minimo, unidade, validade_lote, localizacao, fornecedor_principal, fispq_url, nota_fiscal_url, observacoes, id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [...campos, id]);
    const salvo = await db.get<any>('SELECT * FROM produtos_quimicos WHERE id = ?', [id]);
    res.status(atual ? 200 : 201).json(paraProduto(salvo));
  }));
  app.delete('/api/produtos/:id', tratar(async (req, res) => {
    await db.run('DELETE FROM estoque_lotes WHERE produto_id = ?', [String(req.params.id)]);
    const r = await db.run('DELETE FROM produtos_quimicos WHERE id = ?', [String(req.params.id)]);
    res.json({ ok: r.changes > 0 });
  }));

  /* Fornecedores importados são mantidos como "A validar" até a conferência da Kátia. */
  const paraFornecedor = (r: any) => {
    let produtos: string[] = []; try { produtos = r.produtos_fornecidos ? JSON.parse(r.produtos_fornecidos) : []; } catch { produtos = []; }
    return { id: r.id, razaoSocial: r.razao_social, cnpj: r.cnpj ?? '', contato: r.contato ?? '', endereco: r.endereco ?? '', email: r.email ?? '',
      responsavel: r.responsavel ?? '', status: r.status ?? 'A validar', produtosFornecidos: produtos, origem: r.origem ?? '' };
  };
  app.get('/api/fornecedores', tratar(async (_req, res) => res.json((await db.all<any>('SELECT * FROM fornecedores ORDER BY razao_social')).map(paraFornecedor))));
  app.post('/api/fornecedores', tratar(async (req, res) => {
    const b = req.body || {}, id = id50(b.id, 'FOR');
    const nome = seg.texto(b.razaoSocial, 200), cnpj = seg.texto(b.cnpj, 25);
    if (!nome || !cnpj) return res.status(400).json({ error: 'Informe razão social e CNPJ.' });
    const status = ['Ativo', 'Inativo', 'A validar'].includes(b.status) ? b.status : 'A validar';
    const valores = [nome, cnpj, seg.texto(b.contato, 100), seg.texto(b.endereco, 500), seg.texto(b.email, 150), seg.texto(b.responsavel, 100), status,
      JSON.stringify(Array.isArray(b.produtosFornecidos) ? b.produtosFornecidos.slice(0, 100) : []), seg.texto(b.origem, 255)];
    const existe = await db.get<any>('SELECT id FROM fornecedores WHERE id = ?', [id]);
    if (existe) await db.run('UPDATE fornecedores SET razao_social=?, cnpj=?, contato=?, endereco=?, email=?, responsavel=?, status=?, produtos_fornecidos=?, origem=? WHERE id=?', [...valores, id]);
    else await db.run('INSERT INTO fornecedores (razao_social, cnpj, contato, endereco, email, responsavel, status, produtos_fornecidos, origem, id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [...valores, id]);
    res.status(existe ? 200 : 201).json(paraFornecedor(await db.get<any>('SELECT * FROM fornecedores WHERE id = ?', [id])));
  }));
  app.delete('/api/fornecedores/:id', tratar(async (req, res) => {
    const r = await db.run('DELETE FROM fornecedores WHERE id = ?', [String(req.params.id)]);
    res.json({ ok: r.changes > 0 });
  }));

  /* --------------------------------- ESTOQUE --------------------------------- */
  const paraEstoque = (r: any) => ({
    id: r.id, produtoId: r.produto_id, produto: r.produto_nome, cas: r.cas_number ?? '', formulaQuimica: r.formula_quimica ?? undefined,
    quantidadeAtual: Number(r.quantidade_atual), unidade: r.unidade, estoqueMinimo: Number(r.estoque_minimo), validade: r.validade ?? '',
    status: r.status_estoque, lote: r.lote ?? '', localizacao: r.localizacao ?? '', fornecedor: r.fornecedor ?? '',
  });
  app.get('/api/estoque', tratar(async (_req, res) => {
    res.json((await db.all<any>('SELECT * FROM estoque_lotes ORDER BY produto_nome, lote')).map(paraEstoque));
  }));
  app.post('/api/estoque', tratar(async (req, res) => {
    const b = req.body || {}, id = id50(b.id, 'EST');
    const nome = seg.texto(b.produto ?? b.produtoNome, 200), qtd = numero(b.quantidadeAtual), min = numero(b.estoqueMinimo);
    if (!nome) return res.status(400).json({ error: 'Informe o produto do lote.' });
    if (qtd === null || min === null) return res.status(400).json({ error: 'Quantidade e estoque mínimo devem ser números válidos (zero ou mais).' });
    const prod = await db.get<any>('SELECT id, cas_number, formula_quimica, unidade FROM produtos_quimicos WHERE LOWER(nome) = LOWER(?)', [nome]);
    if (!prod) return res.status(422).json({ error: `O produto "${nome}" não está cadastrado. Cadastre-o em Produtos antes de criar o lote.` });
    const status = qtd <= 0 ? 'Esgotado' : qtd <= min ? 'Estoque baixo' : 'Normal'; // calculado aqui: o cliente não decide o status
    const existente = await db.get<any>('SELECT id FROM estoque_lotes WHERE id = ?', [id]);
    const campos = [prod.id, nome, seg.texto(b.cas, 50) ?? prod.cas_number ?? '', seg.texto(b.formulaQuimica, 100) ?? prod.formula_quimica, qtd, seg.texto(b.unidade, 10) ?? prod.unidade ?? 'L', min, seg.texto(b.validade, 20) ?? '-', status, seg.texto(b.lote, 50) ?? id, seg.texto(b.localizacao, 150), typeof b.fornecedor === 'string' ? b.fornecedor.slice(0, 150) : null];
    if (existente) {
      await db.run('UPDATE estoque_lotes SET produto_id = ?, produto_nome = ?, cas_number = ?, formula_quimica = ?, quantidade_atual = ?, unidade = ?, estoque_minimo = ?, validade = ?, status_estoque = ?, lote = ?, localizacao = ?, fornecedor = ?, atualizado_em = ? WHERE id = ?', [...campos, seg.agoraUtc(), id]);
    } else {
      await db.run('INSERT INTO estoque_lotes (produto_id, produto_nome, cas_number, formula_quimica, quantidade_atual, unidade, estoque_minimo, validade, status_estoque, lote, localizacao, fornecedor, id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [...campos, id]);
    }
    const r = await db.get<any>('SELECT * FROM estoque_lotes WHERE id = ?', [id]);
    res.status(existente ? 200 : 201).json(paraEstoque(r));
  }));
  app.delete('/api/estoque/:id', tratar(async (req, res) => {
    const r = await db.run('DELETE FROM estoque_lotes WHERE id = ?', [String(req.params.id)]);
    res.json({ ok: r.changes > 0 });
  }));

  /* --------------------------------- COMPRAS --------------------------------- */
  const paraCompra = (r: any) => ({
    id: r.id, produto: r.produto_nome, quantidade: r.quantidade, fornecedor: r.fornecedor_nome ?? '', valor: Number(r.valor_total ?? 0),
    data: String(r.data_pedido ?? '').slice(0, 10), status: r.status, notaFiscal: r.nota_fiscal_numero ?? '', previsaoEntrega: r.previsao_entrega ? String(r.previsao_entrega).slice(0, 10) : '',
    // campos do fluxo de etapas
    etapa: etapaDe(r), etapaRotulo: ROTULOS[etapaDe(r)], numeroPedido: r.numero_pedido ?? '', quantidadeRecebida: Number(r.quantidade_recebida ?? 0),
    justificativa: r.justificativa ?? '', solicitante: r.solicitante_nome ?? '', condicoesPagamento: r.condicoes_pagamento ?? '', localEntrega: r.local_entrega ?? '',
    valorEstimado: Number(r.valor_estimado ?? 0), valorCotado: Number(r.valor_cotado ?? 0), valorAprovado: Number(r.valor_aprovado ?? 0), valorPago: Number(r.valor_pago ?? 0),
  });
  app.get('/api/compras', tratar(async (_req, res) => {
    res.json((await db.all<any>('SELECT * FROM compras_pedidos ORDER BY data_pedido DESC, id DESC')).map(paraCompra));
  }));
  app.post('/api/compras', tratar(async (req, res) => {
    const b = req.body || {}, id = id50(b.id, 'CMP');
    const produto = seg.texto(b.produto ?? b.produtoNome, 200), qtd = seg.texto(String(b.quantidade ?? ''), 50), valor = numero(b.valor ?? b.valorTotal);
    const jaExiste = await db.get<any>('SELECT 1 AS x FROM compras_pedidos WHERE id = ?', [id]);
    if (!jaExiste && (!produto || !qtd)) return res.status(400).json({ error: 'Informe produto e quantidade.' });
    if (valor === null) return res.status(400).json({ error: 'Valor inválido.' });
    const fornecedor = seg.texto(b.fornecedor ?? b.fornecedorNome, 200) ?? '-';
    const data = paraIso(b.data ?? b.dataPedido) ?? hojeIso(), previsao = paraIso(b.previsaoEntrega);
    const status = STATUS_COMPRA.includes(b.status) ? b.status : 'Cotação';
    const existente = await db.get<any>('SELECT id, fluxo_status FROM compras_pedidos WHERE id = ?', [id]);
    if (existente) {
      // atualização parcial: só muda o que veio no corpo (editar uma coisa não zera as outras)
      const sets = ['atualizado_em = ?'], par: any[] = [seg.agoraUtc()];
      const tem = (...ks: string[]) => ks.some((k) => b[k] !== undefined);
      if (tem('produto', 'produtoNome')) { sets.push('produto_nome = ?'); par.push(produto); }
      if (tem('quantidade')) { sets.push('quantidade = ?'); par.push(qtd); }
      if (tem('fornecedor', 'fornecedorNome')) { sets.push('fornecedor_nome = ?'); par.push(fornecedor); }
      if (tem('valor', 'valorTotal')) { sets.push('valor_total = ?'); par.push(valor); }
      if (tem('valorEstimado')) { const estimado = numero(b.valorEstimado); if (estimado !== null) { sets.push('valor_estimado = ?'); par.push(estimado); } }
      if (tem('unidade')) { sets.push('unidade = ?'); par.push(seg.texto(b.unidade, 10)); }
      if (tem('quantidadeNumero')) { const q = numero(b.quantidadeNumero); if (q !== null) sets.push('quantidade_numero = ?'), par.push(q); }
      if (tem('justificativa')) { sets.push('justificativa = ?'); par.push(seg.texto(b.justificativa, 1000)); }
      if (tem('data', 'dataPedido')) { sets.push('data_pedido = ?'); par.push(data); }
      if (tem('notaFiscal')) { sets.push('nota_fiscal_numero = ?'); par.push(seg.texto(b.notaFiscal, 100)); }
      if (tem('previsaoEntrega')) { sets.push('previsao_entrega = ?'); par.push(previsao); }
      // quem já está no fluxo de etapas só muda de status pelas ações do fluxo
      if (!existente.fluxo_status && tem('status')) { sets.push('status = ?'); par.push(status); }
      await db.run(`UPDATE compras_pedidos SET ${sets.join(', ')} WHERE id = ?`, [...par, id]);
    } else {
      const nQtd = String(b.quantidade ?? '').replace(',', '.').match(/\d+(?:\.\d+)?/);
      const qtdNum = numero(b.quantidadeNumero ?? (nQtd ? Number(nQtd[0]) : undefined));
      const unidade = seg.texto(b.unidade, 10) ?? String(b.quantidade ?? '').match(/\b(L|mL|kg|g)\b/i)?.[0] ?? null;
      const etapaInicial = status === 'Aguardando aprovação' ? 'aguardando_aprovacao' : status === 'Pedido realizado' ? 'aguardando_recebimento' : status === 'Recebido' ? 'recebida_conferida' : 'em_cotacao';
      const estimado = numero(b.valorEstimado, valor) ?? valor;
      await db.run(
        'INSERT INTO compras_pedidos (id, produto_nome, quantidade, fornecedor_nome, valor_total, data_pedido, status, nota_fiscal_numero, previsao_entrega, solicitante_id, solicitante_nome, justificativa, quantidade_numero, unidade, valor_estimado, fluxo_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, produto, qtd, fornecedor, valor, data, status, seg.texto(b.notaFiscal, 100), previsao, req.usuario.id, req.usuario.nome, seg.texto(b.justificativa, 1000), qtdNum, unidade, estimado, etapaInicial],
      );
    }
    res.status(existente ? 200 : 201).json(paraCompra(await db.get<any>('SELECT * FROM compras_pedidos WHERE id = ?', [id])));
  }));
  app.delete('/api/compras/:id', tratar(async (req, res) => {
    const id = String(req.params.id);
    const rec = await db.get<any>('SELECT COUNT(*) AS c FROM compras_recebimentos WHERE compra_id = ?', [id]);
    if (Number(rec?.c) > 0) return res.status(409).json({ error: 'Esta compra já teve recebimento registrado. Cancele-a pelo fluxo (o histórico é preservado).' });
    const r = await db.run('DELETE FROM compras_pedidos WHERE id = ?', [id]);
    res.json({ ok: r.changes > 0 });
  }));

  /* ------------------------------- SOLICITAÇÕES ------------------------------- */
  const paraSolicitacao = (r: any) => ({
    id: r.id, solicitante: r.solicitante, produto: r.produto_resumo, quantidade: r.quantidade, orgao: r.orgao_departamento ?? '',
    data: String(r.data_solicitacao ?? '').slice(0, 10), status: r.status, observacao: r.observacao ?? undefined,
  });
  app.get('/api/solicitacoes', tratar(async (_req, res) => {
    res.json((await db.all<any>('SELECT * FROM solicitacoes_laboratorio ORDER BY data_solicitacao DESC, id DESC')).map(paraSolicitacao));
  }));
  app.post('/api/solicitacoes', tratar(async (req, res) => {
    const eu = req.usuario, b = req.body || {}, id = id50(b.id, 'SOL');
    const produto = seg.texto(b.produto ?? b.produtoResumo, 255), qtd = seg.texto(String(b.quantidade ?? ''), 50);
    if (!produto || !qtd) return res.status(400).json({ error: 'Informe produto e quantidade.' });
    const existente = await db.get<any>('SELECT id FROM solicitacoes_laboratorio WHERE id = ?', [id]);
    const ehAdmin = eu.papel === 'administrador';
    // o professor só abre solicitações em seu próprio nome e sempre "Em análise"; aprovar é da administradora
    const solicitante = ehAdmin ? seg.texto(b.solicitante, 150) ?? eu.nome : eu.nome;
    const status = ehAdmin && STATUS_SOLICITACAO.includes(b.status) ? b.status : 'Em análise';
    const orgao = seg.texto(b.orgao, 100) ?? 'Departamento de Química', data = paraIso(b.data) ?? hojeIso();
    if (existente) {
      await db.run('UPDATE solicitacoes_laboratorio SET solicitante = ?, produto_resumo = ?, quantidade = ?, orgao_departamento = ?, data_solicitacao = ?, status = ?, observacao = ?, atualizado_em = ? WHERE id = ?',
        [solicitante, produto, qtd, orgao, data, status, seg.texto(b.observacao, 2000), seg.agoraUtc(), id]);
    } else {
      await db.run('INSERT INTO solicitacoes_laboratorio (id, solicitante, turma, produto_resumo, quantidade, orgao_departamento, data_solicitacao, status, observacao) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, solicitante, eu.turma ?? null, produto, qtd, orgao, data, status, seg.texto(b.observacao, 2000)]);
    }
    res.status(existente ? 200 : 201).json(paraSolicitacao(await db.get<any>('SELECT * FROM solicitacoes_laboratorio WHERE id = ?', [id])));
  }));
  app.delete('/api/solicitacoes/:id', tratar(async (req, res) => {
    const r = await db.run('DELETE FROM solicitacoes_laboratorio WHERE id = ?', [String(req.params.id)]);
    res.json({ ok: r.changes > 0 });
  }));
}
