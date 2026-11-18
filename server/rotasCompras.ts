/* ============================================================================
   Fluxo de compras (somente a administradora). Estende a tabela compras_pedidos
   que já existe; não cria um sistema de compras paralelo.
   Etapas: rascunho → aguardando_aprovacao → aprovada → em_cotacao → aguardando_fornecedor →
           pedido_emitido → aguardando_recebimento → recebimento_parcial → recebida_conferida | cancelada
   ============================================================================ */
import type { Db } from './db.ts';
import * as seg from './seguranca.ts';
import { novoId, tratar, auditar } from './comum.ts';
import { inserirAlerta, limparConteudoAlerta } from './rotasOperacoes.ts';

export const ETAPAS = ['rascunho', 'aguardando_aprovacao', 'aprovada', 'em_cotacao', 'aguardando_fornecedor', 'pedido_emitido', 'aguardando_recebimento', 'recebimento_parcial', 'recebida_conferida', 'cancelada'] as const;
export type Etapa = (typeof ETAPAS)[number];
export const ROTULOS: Record<Etapa, string> = {
  rascunho: 'Rascunho', aguardando_aprovacao: 'Aguardando aprovação', aprovada: 'Aprovada', em_cotacao: 'Em cotação', aguardando_fornecedor: 'Aguardando fornecedor',
  pedido_emitido: 'Pedido emitido', aguardando_recebimento: 'Aguardando recebimento', recebimento_parcial: 'Recebimento parcial', recebida_conferida: 'Recebida e conferida', cancelada: 'Cancelada',
};
const TRANSICOES: Record<Etapa, Etapa[]> = {
  rascunho: ['aguardando_aprovacao', 'cancelada'],
  aguardando_aprovacao: ['aprovada', 'rascunho', 'cancelada'],
  aprovada: ['em_cotacao', 'cancelada'],
  em_cotacao: ['aguardando_fornecedor', 'cancelada'],
  aguardando_fornecedor: ['pedido_emitido', 'em_cotacao', 'cancelada'],
  pedido_emitido: ['aguardando_recebimento', 'cancelada'],
  aguardando_recebimento: ['cancelada'],       // o recebimento (parcial/total) move a etapa sozinho
  recebimento_parcial: ['cancelada'],
  recebida_conferida: [],
  cancelada: [],
};
/** O campo "status" antigo só aceita 4 valores (restrição do banco): resumo usado pelas telas atuais. */
const STATUS_LEGADO: Record<Etapa, string> = {
  rascunho: 'Aguardando aprovação', aguardando_aprovacao: 'Aguardando aprovação', aprovada: 'Aguardando aprovação',
  em_cotacao: 'Cotação', aguardando_fornecedor: 'Cotação',
  pedido_emitido: 'Pedido realizado', aguardando_recebimento: 'Pedido realizado', recebimento_parcial: 'Pedido realizado',
  recebida_conferida: 'Recebido', cancelada: 'Cotação',
};
const DE_LEGADO: Record<string, Etapa> = { 'Cotação': 'em_cotacao', 'Aguardando aprovação': 'aguardando_aprovacao', 'Pedido realizado': 'aguardando_recebimento', Recebido: 'recebida_conferida' };

export const etapaDe = (r: any): Etapa => (ETAPAS as readonly string[]).includes(r.fluxo_status) ? r.fluxo_status : DE_LEGADO[r.status] ?? 'aguardando_aprovacao';
/** Quantidade numérica: usa a coluna nova ou extrai do texto antigo ("10 L" → 10). */
export function quantidadeNumerica(r: any): number | null {
  if (r.quantidade_numero !== null && r.quantidade_numero !== undefined && Number.isFinite(Number(r.quantidade_numero)) && Number(r.quantidade_numero) > 0) return Number(r.quantidade_numero);
  const m = String(r.quantidade ?? '').replace(',', '.').match(/\d+(\.\d+)?/);
  const n = m ? Number(m[0]) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}
const dinheiro = (v: unknown): number | null => { const n = typeof v === 'string' ? Number(v.replace(',', '.')) : Number(v); return Number.isFinite(n) && n >= 0 && n <= 1e9 ? Math.round(n * 100) / 100 : null; };
const arred = (n: number) => Math.round(n * 1000) / 1000;

async function registrarHistorico(db: Db, req: any, compraId: string, acao: string, de: string | null, para: string | null, detalhes?: unknown) {
  await db.run('INSERT INTO compras_historico (id, compra_id, data_hora, usuario_id, usuario_nome, acao, de_status, para_status, detalhes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [novoId('HST').slice(0, 36), compraId, seg.agoraUtc(), req.usuario.id, req.usuario.nome, acao, de, para, detalhes === undefined ? null : JSON.stringify(detalhes).slice(0, 2000)]);
}

export function registrarRotasCompras(app: any, db: Db) {
  const soAdmin = (req: any, res: any) => { if (req.usuario?.papel !== 'administrador') { res.status(403).json({ error: 'Somente a administradora gerencia as compras.' }); return false; } return true; };

  /* ----------------------------- mudar de etapa ----------------------------- */
  app.post('/api/compras/:id/transicao', tratar(async (req, res) => {
    if (!soAdmin(req, res)) return;
    const id = String(req.params.id), b = req.body || {};
    const c = await db.get<any>('SELECT * FROM compras_pedidos WHERE id = ?', [id]);
    if (!c) return res.status(404).json({ error: 'Compra não encontrada.' });
    const de = etapaDe(c), para = b.para as Etapa;
    if (!(ETAPAS as readonly string[]).includes(para)) return res.status(400).json({ error: 'Etapa inválida.' });
    if (!TRANSICOES[de].includes(para)) return res.status(409).json({ error: `Não é possível ir de "${ROTULOS[de]}" para "${ROTULOS[para]}".` });

    const sets: string[] = ['fluxo_status = ?', 'status = ?', 'atualizado_em = ?'], par: any[] = [para, STATUS_LEGADO[para], seg.agoraUtc()];
    const detalhes: any = {};
    const guardarValor = (campo: string, v: unknown, rotulo: string): string | null => { if (v === undefined || v === null || v === '') return null; const n = dinheiro(v); if (n === null) return `${rotulo} inválido.`; sets.push(`${campo} = ?`); par.push(n); detalhes[campo] = n; return null; };
    let erro: string | null = null;
    if (para === 'cancelada') {
      const motivo = seg.texto(b.motivo, 500); if (!motivo) return res.status(400).json({ error: 'Informe o motivo do cancelamento.' });
      detalhes.motivo = motivo;
    }
    if (para === 'aprovada') erro = guardarValor('valor_aprovado', b.valorAprovado, 'Valor aprovado');
    if (!erro && para === 'aguardando_fornecedor') erro = guardarValor('valor_cotado', b.valorCotado, 'Valor cotado');
    if (!erro && para === 'em_cotacao') erro = guardarValor('valor_cotado', b.valorCotado, 'Valor cotado');
    if (!erro && para === 'aguardando_aprovacao') erro = guardarValor('valor_estimado', b.valorEstimado, 'Valor estimado');
    if (erro) return res.status(400).json({ error: erro });

    if (para === 'pedido_emitido') {
      const fornecedor = seg.texto(b.fornecedorNome, 200) ?? seg.texto(c.fornecedor_nome, 200);
      if (!fornecedor || fornecedor === '-') return res.status(400).json({ error: 'Informe o fornecedor para emitir o pedido.' });
      const valor = dinheiro(b.valorPedido ?? c.valor_total);
      if (valor === null || valor <= 0) return res.status(400).json({ error: 'Informe o valor do pedido (maior que zero).' });
      const ano = new Date().getFullYear();
      const n = await db.get<any>("SELECT COUNT(*) AS q FROM compras_pedidos WHERE numero_pedido LIKE ?", [`PED-${ano}-%`]);
      const numero = `PED-${ano}-${String(Number(n?.q ?? 0) + 1).padStart(4, '0')}`;
      sets.push('fornecedor_nome = ?', 'valor_total = ?', 'numero_pedido = ?'); par.push(fornecedor, valor, numero);
      for (const [campo, chave, max] of [['condicoes_pagamento', 'condicoesPagamento', 200], ['local_entrega', 'localEntrega', 200]] as const) {
        const t = seg.texto(b[chave], max); if (t) { sets.push(`${campo} = ?`); par.push(t); }
      }
      if (typeof b.previsaoEntrega === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(b.previsaoEntrega)) { sets.push('previsao_entrega = ?'); par.push(b.previsaoEntrega); }
      Object.assign(detalhes, { fornecedor, valorPedido: valor, numeroPedido: numero });
    }
    await db.transaction(async (tx) => {
      await tx.run(`UPDATE compras_pedidos SET ${sets.join(', ')} WHERE id = ?`, [...par, id]);
      await registrarHistorico(tx, req, id, para === 'cancelada' ? 'cancelar' : 'mudar_etapa', de, para, detalhes);
    });
    await auditar(db, req, 'compra_' + (para === 'cancelada' ? 'cancelada' : 'etapa'), 'compras', id, { de, para });
    const r = await db.get<any>('SELECT * FROM compras_pedidos WHERE id = ?', [id]);
    res.json({ id, etapa: para, rotulo: ROTULOS[para], numeroPedido: r?.numero_pedido ?? null });
  }));

  /* -------- recebimento e conferência: ÚNICO caminho que dá entrada no estoque -------- */
  app.post('/api/compras/:id/recebimento', tratar(async (req, res) => {
    if (!soAdmin(req, res)) return;
    const id = String(req.params.id), b = req.body || {};
    const resultado = await db.transaction(async (tx) => {
      // trava a linha da compra enquanto confere (evita dois recebimentos simultâneos passarem do pedido)
      const c = await tx.get<any>('SELECT * FROM compras_pedidos WHERE id = ?' + (tx.dialect === 'mysql' ? ' FOR UPDATE' : ''), [id]);
      if (!c) return { http: 404, erro: 'Compra não encontrada.' };
      const de = etapaDe(c);
      if (!['pedido_emitido', 'aguardando_recebimento', 'recebimento_parcial'].includes(de)) return { http: 409, erro: `Esta compra está em "${ROTULOS[de]}": só é possível receber depois de emitir o pedido.` };
      const esperada = quantidadeNumerica(c);
      if (esperada === null) return { http: 422, erro: 'Não foi possível identificar a quantidade pedida. Corrija a quantidade da compra.' };
      const jaAceita = Number(c.quantidade_recebida ?? 0);
      const pendenteAntes = arred(esperada - jaAceita);
      const receberTudo = b.receberTudo === true;
      const recebida = receberTudo ? pendenteAntes : Number(typeof b.quantidadeRecebida === 'string' ? b.quantidadeRecebida.replace(',', '.') : b.quantidadeRecebida);
      const danificada = receberTudo ? 0 : Number(typeof b.quantidadeDanificada === 'string' ? b.quantidadeDanificada.replace(',', '.') : (b.quantidadeDanificada ?? 0));
      if (!Number.isFinite(recebida) || recebida <= 0) return { http: 400, erro: 'Informe a quantidade recebida (maior que zero).' };
      if (!Number.isFinite(danificada) || danificada < 0 || danificada > recebida) return { http: 400, erro: 'A quantidade danificada não pode ser negativa nem maior que a recebida.' };
      const aceita = arred(recebida - danificada);  // só o que chegou em bom estado e foi conferido entra no estoque
      if (arred(jaAceita + aceita) > esperada) return { http: 409, erro: `A quantidade ultrapassa o pedido (faltam ${pendenteAntes}). Registre a divergência ou ajuste o pedido.` };

      const nomeProduto = String(c.produto_nome);
      const prod = await tx.get<any>('SELECT id FROM produtos_quimicos WHERE LOWER(nome) = LOWER(?)', [nomeProduto]);
      if (!prod && aceita > 0) return { http: 422, erro: `O produto "${nomeProduto}" não está cadastrado. Cadastre-o antes de dar entrada no estoque.` };
      if (aceita > 0) {
        await tx.run('UPDATE produtos_quimicos SET estoque_atual = estoque_atual + ?, atualizado_em = ? WHERE id = ?', [aceita, seg.agoraUtc(), prod.id]);
        const lote = await tx.get<any>('SELECT id, estoque_minimo FROM estoque_lotes WHERE LOWER(produto_nome) = LOWER(?) LIMIT 1', [nomeProduto]);
        if (lote) {
          await tx.run('UPDATE estoque_lotes SET quantidade_atual = quantidade_atual + ?, atualizado_em = ? WHERE id = ?', [aceita, seg.agoraUtc(), lote.id]);
          const l2 = await tx.get<any>('SELECT quantidade_atual FROM estoque_lotes WHERE id = ?', [lote.id]);
          const q = Number(l2.quantidade_atual);
          await tx.run('UPDATE estoque_lotes SET status_estoque = ? WHERE id = ?', [q <= 0 ? 'Esgotado' : q <= Number(lote.estoque_minimo) ? 'Estoque baixo' : 'Normal', lote.id]);
        }
      }
      const totalAceita = arred(jaAceita + aceita), pendente = arred(esperada - totalAceita);
      const para: Etapa = pendente <= 0 ? 'recebida_conferida' : 'recebimento_parcial';
      await tx.run('INSERT INTO compras_recebimentos (id, compra_id, data_hora, conferente_id, conferente_nome, quantidade_recebida, quantidade_danificada, divergencia, observacao) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [novoId('RCB').slice(0, 36), id, seg.agoraUtc(), req.usuario.id, req.usuario.nome, recebida, danificada, seg.texto(b.divergencia, 1000), seg.texto(b.observacao, 1000)]);
      await tx.run('UPDATE compras_pedidos SET quantidade_numero = ?, quantidade_recebida = ?, fluxo_status = ?, status = ?, atualizado_em = ? WHERE id = ?', [esperada, totalAceita, para, STATUS_LEGADO[para], seg.agoraUtc(), id]);
      await registrarHistorico(tx, req, id, 'recebimento', de, para, { recebida, danificada, entradaEstoque: aceita, pendente, divergencia: seg.texto(b.divergencia, 300) });
      if (aceita > 0) {
        // aviso de reposição no mural (sem fornecedor nem valores: professores também recebem)
        const aviso = limparConteudoAlerta({
          tipo: 'alteracao', titulo: `${para === 'recebida_conferida' ? '📦 Pedido Recebido no Lab' : '📦 Recebimento Parcial'}: ${nomeProduto}`,
          mensagem: `Pedido ${c.numero_pedido || id}: entraram ${aceita} de ${nomeProduto} no estoque.${pendente > 0 ? ` Ainda faltam ${pendente}.` : ' Pedido conferido por completo.'}`,
          produtoNome: nomeProduto, quantidadeAlterada: aceita, gravidade: 'baixa', acaoSugerida: 'ver_estoque',
        }, req.usuario);
        await inserirAlerta(tx, aviso, { id: req.usuario.id, nome: req.usuario.nome, papel: 'administrador', turma: null });
      }
      return { http: 200, corpo: { id, etapa: para, rotulo: ROTULOS[para], quantidadePedida: esperada, quantidadeRecebidaTotal: totalAceita, pendente, entradaEstoque: aceita, danificada } };
    });
    if ('erro' in resultado) return res.status(resultado.http).json({ error: resultado.erro });
    await auditar(db, req, 'recebimento', 'compras', id, resultado.corpo);
    res.json(resultado.corpo);
  }));

  /* ------------------------------ pagamento / histórico ------------------------------ */
  app.post('/api/compras/:id/pagamento', tratar(async (req, res) => {
    if (!soAdmin(req, res)) return;
    const id = String(req.params.id), valor = dinheiro(req.body?.valor);
    const c = await db.get<any>('SELECT * FROM compras_pedidos WHERE id = ?', [id]);
    if (!c) return res.status(404).json({ error: 'Compra não encontrada.' });
    if (valor === null || valor <= 0) return res.status(400).json({ error: 'Informe o valor pago (maior que zero).' });
    const etapa = etapaDe(c);
    if (!['pedido_emitido', 'aguardando_recebimento', 'recebimento_parcial', 'recebida_conferida'].includes(etapa)) return res.status(409).json({ error: 'O pagamento só pode ser registrado depois da emissão do pedido.' });
    await db.transaction(async (tx) => {
      await tx.run('UPDATE compras_pedidos SET valor_pago = ?, atualizado_em = ? WHERE id = ?', [valor, seg.agoraUtc(), id]);
      await registrarHistorico(tx, req, id, 'pagamento', etapa, etapa, { valorPago: valor });
    });
    await auditar(db, req, 'compra_pagamento', 'compras', id, { valor });
    res.json({ id, valorPago: valor });
  }));

  app.get('/api/compras/:id/historico', tratar(async (req, res) => {
    if (!soAdmin(req, res)) return;
    const id = String(req.params.id);
    const hist = await db.all<any>('SELECT data_hora, usuario_nome, acao, de_status, para_status, detalhes FROM compras_historico WHERE compra_id = ? ORDER BY data_hora, id', [id]);
    const rec = await db.all<any>('SELECT data_hora, conferente_nome, quantidade_recebida, quantidade_danificada, divergencia, observacao FROM compras_recebimentos WHERE compra_id = ? ORDER BY data_hora', [id]);
    const parse = (s: string | null) => { try { return s ? JSON.parse(s) : null; } catch { return null; } };
    res.json({
      historico: hist.map((h) => ({ dataHora: String(h.data_hora), responsavel: h.usuario_nome, acao: h.acao, de: h.de_status, para: h.para_status, detalhes: parse(h.detalhes) })),
      recebimentos: rec.map((r) => ({ dataHora: String(r.data_hora), conferente: r.conferente_nome, recebida: Number(r.quantidade_recebida), danificada: Number(r.quantidade_danificada), divergencia: r.divergencia, observacao: r.observacao })),
    });
  }));
}
