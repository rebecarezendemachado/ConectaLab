/* Esquema mínimo (SQLite) espelhando as tabelas existentes que as rotas usam, e rotas "antigas" de teste. */
import type { Db } from '../db.ts';
export async function criarEsquemaLegado(db: Db) {
  const sql = [
    `CREATE TABLE usuarios (id VARCHAR(36) PRIMARY KEY, nome VARCHAR(150) NOT NULL, email VARCHAR(150) UNIQUE NOT NULL, senha_hash VARCHAR(255) NOT NULL,
       tipo_perfil VARCHAR(20) NOT NULL CHECK (tipo_perfil IN ('aluno','professor','administrador')), matricula VARCHAR(50), turma VARCHAR(50), bancada_padrao VARCHAR(50),
       departamento VARCHAR(100), ativo BOOLEAN DEFAULT 1, criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP, atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE produtos_quimicos (id VARCHAR(50) PRIMARY KEY, nome VARCHAR(200) NOT NULL, cas_number VARCHAR(50) DEFAULT '', formula_quimica VARCHAR(100), estoque_atual DECIMAL(10,3) NOT NULL DEFAULT 0,
       estoque_minimo DECIMAL(10,3) NOT NULL DEFAULT 0, unidade VARCHAR(10) NOT NULL DEFAULT 'L', fornecedor_principal VARCHAR(150), criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP, atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE estoque_lotes (id VARCHAR(50) PRIMARY KEY, produto_id VARCHAR(50) NOT NULL, produto_nome VARCHAR(200) NOT NULL, cas_number VARCHAR(50) NOT NULL DEFAULT '', formula_quimica VARCHAR(100),
       quantidade_atual DECIMAL(10,3) NOT NULL DEFAULT 0, unidade VARCHAR(10) NOT NULL DEFAULT 'L', estoque_minimo DECIMAL(10,3) NOT NULL DEFAULT 0, validade VARCHAR(20) NOT NULL DEFAULT '-',
       status_estoque VARCHAR(30) NOT NULL DEFAULT 'Normal' CHECK (status_estoque IN ('Normal', 'Estoque baixo', 'Esgotado')), lote VARCHAR(50) NOT NULL DEFAULT 'L1', localizacao VARCHAR(150), fornecedor VARCHAR(150),
       criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP, atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (produto_id) REFERENCES produtos_quimicos(id) ON DELETE CASCADE)`,
    `CREATE TABLE fornecedores (id VARCHAR(50) PRIMARY KEY, razao_social VARCHAR(200))`,
    `CREATE TABLE compras_pedidos (id VARCHAR(50) PRIMARY KEY, produto_nome VARCHAR(200) NOT NULL, quantidade VARCHAR(50) NOT NULL DEFAULT '1', fornecedor_nome VARCHAR(200) NOT NULL DEFAULT '', valor_total DECIMAL(10,2) NOT NULL DEFAULT 0, data_pedido DATE, status VARCHAR(30) NOT NULL, nota_fiscal_numero VARCHAR(100), previsao_entrega DATE, atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE solicitacoes_laboratorio (id VARCHAR(50) PRIMARY KEY, solicitante VARCHAR(150) NOT NULL, disciplina VARCHAR(150), turma VARCHAR(50), produto_resumo VARCHAR(255) NOT NULL, quantidade VARCHAR(50) NOT NULL, orgao_departamento VARCHAR(100) DEFAULT 'Departamento de Química', data_solicitacao DATE NOT NULL, status VARCHAR(30) NOT NULL CHECK (status IN ('Em análise', 'Aprovada', 'Pendência', 'Reprovada')), observacao TEXT, itens_json TEXT, criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP, atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE consumos_aluno (id VARCHAR(50) PRIMARY KEY, aluno_nome VARCHAR(150) NOT NULL, turma VARCHAR(50) NOT NULL, bancada VARCHAR(50) NOT NULL, pratica VARCHAR(200) NOT NULL,
       produto_nome VARCHAR(200) NOT NULL, quantidade_usada DECIMAL(10,3) NOT NULL, unidade VARCHAR(10) NOT NULL, data_registro DATE NOT NULL, hora_registro TIME NOT NULL,
       professor_orientador VARCHAR(150) NOT NULL, observacoes TEXT, status_visto VARCHAR(30) NOT NULL DEFAULT 'Pendente', criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE ocorrencias_aluno (id VARCHAR(50) PRIMARY KEY, aluno_nome VARCHAR(150) NOT NULL, turma VARCHAR(50) NOT NULL, bancada VARCHAR(50), tipo_ocorrencia VARCHAR(100),
       reagente_envolvido VARCHAR(200), gravidade VARCHAR(20), descricao TEXT, primeiros_socorros_adotados TEXT, data_ocorrencia DATE, hora_ocorrencia TIME, status_atendimento VARCHAR(30))`,
  ];
  for (const s of sql) await db.run(s);
}

/** Rotas "antigas" simplificadas (mesmo contrato: POST grava ou atualiza pelo id). */
export function registrarLegadoDeTeste(app: any, db: Db) {
  const crud = (rota: string, tabela: string, colunas: string[], paraCamel?: (r: any) => any) => {
    app.get(`/api/${rota}`, async (_q: any, res: any) => res.json((await db.all(`SELECT * FROM ${tabela}`)).map(paraCamel || ((r: any) => r))));
    app.post(`/api/${rota}`, async (req: any, res: any) => {
      const b = req.body, existe = await db.get(`SELECT 1 AS x FROM ${tabela} WHERE id = ?`, [b.id]);
      if (existe) await db.run(`UPDATE ${tabela} SET ${colunas.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`, [...colunas.map((c) => b[c]), b.id]);
      else await db.run(`INSERT INTO ${tabela} (id, ${colunas.join(', ')}) VALUES (?, ${colunas.map(() => '?').join(', ')})`, [b.id, ...colunas.map((c) => b[c])]);
      res.status(201).json(b);
    });
    app.delete(`/api/${rota}/:id`, async (req: any, res: any) => { await db.run(`DELETE FROM ${tabela} WHERE id = ?`, [req.params.id]); res.json({ ok: true }); });
  };
  const upsert = async (tabela: string, id: string, valores: Record<string, any>) => {
    const cols = Object.keys(valores), existe = await db.get(`SELECT 1 AS x FROM ${tabela} WHERE id = ?`, [id]);
    if (existe) await db.run(`UPDATE ${tabela} SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`, [...cols.map((c) => valores[c]), id]);
    else await db.run(`INSERT INTO ${tabela} (id, ${cols.join(', ')}) VALUES (?, ${cols.map(() => '?').join(', ')})`, [id, ...cols.map((c) => valores[c])]);
  };
  app.get('/api/produtos', async (_q: any, res: any) => res.json((await db.all<any>('SELECT * FROM produtos_quimicos')).map((r) => ({ id: r.id, nome: r.nome, estoqueAtual: Number(r.estoque_atual), estoqueMinimo: Number(r.estoque_minimo), unidade: r.unidade, fornecedorPrincipal: r.fornecedor_principal ?? '' }))));
  app.post('/api/produtos', async (req: any, res: any) => {
    const b = req.body; await upsert('produtos_quimicos', b.id, { nome: b.nome, estoque_atual: b.estoqueAtual ?? b.estoque_atual ?? 0, estoque_minimo: b.estoqueMinimo ?? b.estoque_minimo ?? 0, unidade: b.unidade || 'L', fornecedor_principal: b.fornecedorPrincipal ?? null });
    res.status(201).json(b);
  });
  app.delete('/api/produtos/:id', async (req: any, res: any) => { await db.run('DELETE FROM produtos_quimicos WHERE id = ?', [req.params.id]); res.json({ ok: true }); });
  crud('fornecedores', 'fornecedores', ['razao_social']);
  app.post('/api/ocorrencias', async (req: any, res: any) => {
    const b = req.body;
    await db.run('INSERT INTO ocorrencias_aluno (id, aluno_nome, turma, bancada, tipo_ocorrencia, descricao) VALUES (?, ?, ?, ?, ?, ?)', [b.id, b.alunoNome, b.turma, 'B1', 'Outro', b.descricao]);
    res.status(201).json(b);
  });
}
