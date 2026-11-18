import { Buffer } from 'node:buffer';
import type { Db } from './db.ts';
import * as seg from './seguranca.ts';
import { auditar, novoId, tratar } from './comum.ts';
import { etapaDe } from './rotasCompras.ts';

const MAX_ARQUIVO = 8 * 1024 * 1024;
const MIME_EXT: Record<string, string> = {
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/xml': '.xml', 'text/xml': '.xml',
  'image/png': '.png', 'image/jpeg': '.jpg',
};
const CATEGORIAS = new Set(['FDS', 'Modelo demonstrativo', 'Nota Fiscal', 'DANFE', 'Comprovante', 'Solicitação de Compra', 'Requisição', 'DFD', 'ETP', 'Termo de Referência', 'Mapa de Riscos', 'Mapa Comparativo', 'Outro']);
const texto = (v: unknown, max: number) => typeof v === 'string' ? v.trim().replace(/[\u0000-\u001f]/g, ' ').slice(0, max) : '';
const numero = (v: unknown) => { const n = typeof v === 'string' ? Number(v.replace(',', '.')) : Number(v); return Number.isFinite(n) && n > 0 && n <= 1e9 ? Math.round(n * 100) / 100 : null; };

function metadado(r: any) {
  return {
    id: r.id, grupoVersao: r.grupo_versao, versao: Number(r.versao), titulo: r.titulo, categoria: r.categoria,
    nomeArquivo: r.nome_arquivo, mimeType: r.mime_type, tamanhoBytes: Number(r.tamanho_bytes),
    produtoId: r.produto_id ?? undefined, produtoNome: r.produto_nome ?? undefined, compraId: r.compra_id ?? undefined,
    criadoPorNome: r.criado_por_nome ?? undefined, criadoEm: String(r.criado_em ?? ''), url: `/api/documentos/${encodeURIComponent(r.id)}/arquivo`,
  };
}

export function registrarRotasDocumentos(app: any, db: Db) {
  const apenasAdmin = (req: any, res: any) => {
    if (req.usuario?.papel !== 'administrador') { res.status(403).json({ error: 'Somente a Kátia pode gerenciar documentos e dados fiscais.' }); return false; }
    return true;
  };

  app.get('/api/documentos', tratar(async (req, res) => {
    const filtro = req.usuario.papel === 'administrador' ? '' : "WHERE d.categoria = 'FDS'";
    const rows = await db.all<any>(`SELECT d.id, d.grupo_versao, d.versao, d.titulo, d.categoria, d.nome_arquivo, d.mime_type, d.tamanho_bytes,
      d.produto_id, p.nome AS produto_nome, d.compra_id, d.criado_por_nome, d.criado_em
      FROM documentos_arquivo d LEFT JOIN produtos_quimicos p ON p.id = d.produto_id ${filtro}
      ${filtro ? 'AND' : 'WHERE'} d.ativo = 1 ORDER BY d.criado_em DESC, d.versao DESC`);
    res.json(rows.map(metadado));
  }));

  app.get('/api/documentos/:id/arquivo', tratar(async (req, res) => {
    const d = await db.get<any>('SELECT categoria, nome_arquivo, mime_type, conteudo FROM documentos_arquivo WHERE id = ? AND ativo = 1', [String(req.params.id)]);
    if (!d) return res.status(404).json({ error: 'Documento não encontrado.' });
    if (req.usuario.papel !== 'administrador' && d.categoria !== 'FDS') return res.status(403).json({ error: 'Este documento é restrito à administradora.' });
    const nome = String(d.nome_arquivo || 'documento').replace(/[\r\n"\\]/g, '_');
    res.setHeader('Content-Type', d.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(nome)}`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(d.conteudo);
  }));

  app.post('/api/documentos', tratar(async (req, res) => {
    if (!apenasAdmin(req, res)) return;
    const b = req.body || {}, categoria = texto(b.categoria, 40), titulo = texto(b.titulo, 200);
    const nomeArquivo = texto(b.nomeArquivo, 255).replace(/[\\/\r\n]/g, '_');
    const mimeType = String(b.mimeType || '').toLowerCase().split(';')[0].trim();
    if (!titulo || !CATEGORIAS.has(categoria)) return res.status(400).json({ error: 'Informe um título e uma categoria válida.' });
    const ext = MIME_EXT[mimeType];
    if (!ext || !nomeArquivo.toLowerCase().endsWith(ext)) return res.status(415).json({ error: 'Use PDF, DOCX, XML, PNG ou JPG.' });
    if (categoria === 'FDS' && mimeType !== 'application/pdf') return res.status(415).json({ error: 'A FDS oficial deve ser anexada em PDF.' });
    if (categoria === 'FDS' && !b.produtoId) return res.status(400).json({ error: 'Vincule a FDS a um produto.' });
    if (['Nota Fiscal', 'DANFE', 'Comprovante'].includes(categoria) && !b.compraId && !b.produtoId) return res.status(400).json({ error: 'Vincule o documento fiscal a um pedido ou produto.' });
    if (b.produtoId && !await db.get('SELECT id FROM produtos_quimicos WHERE id = ?', [String(b.produtoId)])) return res.status(404).json({ error: 'Produto não encontrado.' });
    if (b.compraId && !await db.get('SELECT id FROM compras_pedidos WHERE id = ?', [String(b.compraId)])) return res.status(404).json({ error: 'Pedido de compra não encontrado.' });

    let base64 = typeof b.conteudoBase64 === 'string' ? b.conteudoBase64 : '';
    const dataUri = base64.match(/^data:[^,]*;base64,(.*)$/s);
    if (dataUri) base64 = dataUri[1];
    if (!base64 || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64) || base64.length % 4 === 1) return res.status(400).json({ error: 'O arquivo enviado está vazio ou inválido.' });
    const conteudo = Buffer.from(base64, 'base64');
    if (!conteudo.length || conteudo.length > MAX_ARQUIVO) return res.status(413).json({ error: 'O arquivo deve ter até 8 MB.' });

    let grupo = '', versao = 1;
    if (b.documentoOrigemId) {
      const origem = await db.get<any>('SELECT grupo_versao FROM documentos_arquivo WHERE id = ? AND ativo = 1', [String(b.documentoOrigemId)]);
      if (!origem) return res.status(404).json({ error: 'Documento-base da versão não encontrado.' });
      grupo = origem.grupo_versao;
    } else if (categoria === 'FDS' && b.produtoId) {
      const anterior = await db.get<any>("SELECT grupo_versao FROM documentos_arquivo WHERE produto_id = ? AND categoria = 'FDS' AND ativo = 1 ORDER BY versao DESC, criado_em DESC LIMIT 1", [String(b.produtoId)]);
      if (anterior) grupo = anterior.grupo_versao;
    }
    if (grupo) {
      const maximo = await db.get<any>('SELECT MAX(versao) AS v FROM documentos_arquivo WHERE grupo_versao = ? AND ativo = 1', [grupo]);
      versao = Number(maximo?.v || 0) + 1;
    } else grupo = novoId('DOC').slice(0, 36);
    const id = novoId('DOC').slice(0, 36), criadoEm = seg.agoraUtc();
    await db.transaction(async (tx) => {
      await tx.run(`INSERT INTO documentos_arquivo (id, grupo_versao, versao, titulo, categoria, nome_arquivo, mime_type, tamanho_bytes, conteudo,
        produto_id, compra_id, criado_por, criado_por_nome, criado_em, ativo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [id, grupo, versao, titulo, categoria, nomeArquivo, mimeType, conteudo.length, conteudo, b.produtoId ? String(b.produtoId) : null,
        b.compraId ? String(b.compraId) : null, req.usuario.id, req.usuario.nome, criadoEm]);
      if (categoria === 'FDS' && b.produtoId) await tx.run('UPDATE produtos_quimicos SET fispq_url = ? WHERE id = ?', [`/api/documentos/${id}/arquivo`, String(b.produtoId)]);
      if (['Nota Fiscal', 'DANFE'].includes(categoria) && b.produtoId) await tx.run('UPDATE produtos_quimicos SET nota_fiscal_url = ? WHERE id = ?', [`/api/documentos/${id}/arquivo`, String(b.produtoId)]);
    });
    await auditar(db, req, 'documento_enviado', 'documentos', id, { categoria, titulo, produtoId: b.produtoId, compraId: b.compraId, versao });
    const row = await db.get<any>(`SELECT d.id, d.grupo_versao, d.versao, d.titulo, d.categoria, d.nome_arquivo, d.mime_type, d.tamanho_bytes,
      d.produto_id, p.nome AS produto_nome, d.compra_id, d.criado_por_nome, d.criado_em FROM documentos_arquivo d
      LEFT JOIN produtos_quimicos p ON p.id = d.produto_id WHERE d.id = ?`, [id]);
    res.status(201).json(metadado(row));
  }));

  app.delete('/api/documentos/:id', tratar(async (req, res) => {
    if (!apenasAdmin(req, res)) return;
    const id = String(req.params.id), d = await db.get<any>('SELECT * FROM documentos_arquivo WHERE id = ? AND ativo = 1', [id]);
    if (!d) return res.status(404).json({ error: 'Documento não encontrado.' });
    await db.run('UPDATE documentos_arquivo SET ativo = 0 WHERE id = ?', [id]);
    if (d.categoria === 'FDS' && d.produto_id) {
      const anterior = await db.get<any>("SELECT id FROM documentos_arquivo WHERE produto_id = ? AND categoria = 'FDS' AND ativo = 1 ORDER BY versao DESC, criado_em DESC LIMIT 1", [d.produto_id]);
      await db.run('UPDATE produtos_quimicos SET fispq_url = ? WHERE id = ?', [anterior ? `/api/documentos/${anterior.id}/arquivo` : '', d.produto_id]);
    }
    await auditar(db, req, 'documento_desativado', 'documentos', id, { categoria: d.categoria, titulo: d.titulo });
    res.json({ ok: true });
  }));

  app.get('/api/compras/:id/cotacoes', tratar(async (req, res) => {
    if (!apenasAdmin(req, res)) return;
    const rows = await db.all<any>('SELECT * FROM compras_cotacoes WHERE compra_id = ? ORDER BY valor_total ASC, criado_em ASC', [String(req.params.id)]);
    res.json(rows.map((r) => ({ id: r.id, compraId: r.compra_id, fornecedorNome: r.fornecedor_nome, cnpj: r.cnpj ?? undefined, valorTotal: Number(r.valor_total),
      prazoEntrega: r.prazo_entrega ?? undefined, validadeProposta: r.validade_proposta ? String(r.validade_proposta).slice(0, 10) : undefined,
      observacao: r.observacao ?? undefined, criadoPorNome: r.criado_por_nome ?? undefined, criadoEm: String(r.criado_em ?? '') })));
  }));

  app.post('/api/compras/:id/cotacoes', tratar(async (req, res) => {
    if (!apenasAdmin(req, res)) return;
    const compraId = String(req.params.id), compra = await db.get<any>('SELECT * FROM compras_pedidos WHERE id = ?', [compraId]);
    if (!compra) return res.status(404).json({ error: 'Pedido de compra não encontrado.' });
    if (!['em_cotacao', 'aguardando_fornecedor'].includes(etapaDe(compra))) return res.status(409).json({ error: 'Abra ou retome a etapa de cotação antes de registrar propostas.' });
    const nome = texto(req.body?.fornecedorNome, 200), valor = numero(req.body?.valorTotal);
    if (!nome || valor === null) return res.status(400).json({ error: 'Informe fornecedor e valor de cotação válidos.' });
    const id = typeof req.body?.id === 'string' && /^[A-Za-z0-9_-]{1,36}$/.test(req.body.id) ? req.body.id : novoId('COT').slice(0, 36);
    await db.run(`INSERT INTO compras_cotacoes (id, compra_id, fornecedor_nome, cnpj, valor_total, prazo_entrega, validade_proposta, observacao, criado_por, criado_por_nome, criado_em)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [id, compraId, nome, texto(req.body?.cnpj, 30) || null, valor, texto(req.body?.prazoEntrega, 100) || null,
      /^\d{4}-\d{2}-\d{2}$/.test(String(req.body?.validadeProposta || '')) ? req.body.validadeProposta : null,
      texto(req.body?.observacao, 1000) || null, req.usuario.id, req.usuario.nome, seg.agoraUtc()]);
    await auditar(db, req, 'compra_cotacao', 'compras', compraId, { id, fornecedor: nome, valor });
    res.status(201).json({ id, compraId, fornecedorNome: nome, cnpj: texto(req.body?.cnpj, 30), valorTotal: valor,
      prazoEntrega: texto(req.body?.prazoEntrega, 100), validadeProposta: req.body?.validadeProposta || '', observacao: texto(req.body?.observacao, 1000),
      criadoPorNome: req.usuario.nome, criadoEm: seg.agoraUtc() });
  }));
}
