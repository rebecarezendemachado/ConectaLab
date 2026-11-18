// =============================================================================
// MATÉRIA REATIVA - ROTAS E CONTROLADORES DE BACKEND REST API
// MODELO PRONTO PARA SER ACOPLADO EM EXPRESS / NODE.JS / CLOUD RUN
// =============================================================================

/**
 * Exemplo de integração com Express e PostgreSQL (pg / pg-pool):
 * 
 * import express from 'express';
 * import { Pool } from 'pg';
 * 
 * const router = express.Router();
 * const pool = new Pool({
 *   connectionString: process.env.DATABASE_URL || 'postgres://user:pass@localhost:5432/materia_reativa'
 * });
 * 
 * // 1. PRODUTOS QUÍMICOS
 * router.get('/api/produtos', async (req, res) => {
 *   try {
 *     const result = await pool.query('SELECT * FROM produtos_quimicos ORDER BY nome ASC');
 *     res.json(result.rows);
 *   } catch (err) {
 *     res.status(500).json({ error: 'Erro ao buscar produtos', details: err });
 *   }
 * });
 * 
 * router.post('/api/produtos', async (req, res) => {
 *   const { id, nome, cas, formulaQuimica, classePerigo, corPerigo, situacao, estoqueAtual, unidade, validade } = req.body;
 *   try {
 *     const query = `
 *       INSERT INTO produtos_quimicos (id, nome, cas_number, formula_quimica, classe_perigo, cor_perigo, situacao_legal, estoque_atual, unidade, validade_lote)
 *       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
 *       RETURNING *;
 *     `;
 *     const values = [id, nome, cas, formulaQuimica, classePerigo, corPerigo, situacao, estoqueAtual, unidade, validade];
 *     const result = await pool.query(query, values);
 *     res.status(201).json(result.rows[0]);
 *   } catch (err) {
 *     res.status(500).json({ error: 'Erro ao criar produto', details: err });
 *   }
 * });
 * 
 * // 2. CONSUMOS DE ALUNO NA BANCADA
 * router.get('/api/consumos', async (req, res) => {
 *   try {
 *     const result = await pool.query('SELECT * FROM consumos_aluno ORDER BY data_registro DESC, hora_registro DESC');
 *     res.json(result.rows);
 *   } catch (err) {
 *     res.status(500).json({ error: 'Erro ao buscar consumos', details: err });
 *   }
 * });
 * 
 * router.post('/api/consumos', async (req, res) => {
 *   const { id, alunoNome, turma, bancada, pratica, produtoNome, quantidadeUsada, unidade, data, hora, professorOrientador } = req.body;
 *   try {
 *     const query = `
 *       INSERT INTO consumos_aluno (id, aluno_nome, turma, bancada, pratica, produto_nome, quantidade_usada, unidade, data_registro, hora_registro, professor_orientador)
 *       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
 *       RETURNING *;
 *     `;
 *     const values = [id, alunoNome, turma, bancada, pratica, produtoNome, quantidadeUsada, unidade, data, hora, professorOrientador];
 *     const result = await pool.query(query, values);
 *     res.status(201).json(result.rows[0]);
 *   } catch (err) {
 *     res.status(500).json({ error: 'Erro ao registrar consumo', details: err });
 *   }
 * });
 * 
 * // 3. OCORRÊNCIAS / ACIDENTES
 * router.post('/api/ocorrencias', async (req, res) => {
 *   const { id, alunoNome, turma, bancada, tipoOcorrencia, reagenteEnvolvido, gravidade, descricao, primeirosSocorrosAdotados, data, hora } = req.body;
 *   try {
 *     const query = `
 *       INSERT INTO ocorrencias_aluno (id, aluno_nome, turma, bancada, tipo_ocorrencia, reagente_envolvido, gravidade, descricao, primeiros_socorros_adotados, data_ocorrencia, hora_ocorrencia)
 *       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
 *       RETURNING *;
 *     `;
 *     const values = [id, alunoNome, turma, bancada, tipoOcorrencia, reagenteEnvolvido, gravidade, descricao, primeirosSocorrosAdotados, data, hora];
 *     const result = await pool.query(query, values);
 *     res.status(201).json(result.rows[0]);
 *   } catch (err) {
 *     res.status(500).json({ error: 'Erro ao registrar ocorrência', details: err });
 *   }
 * });
 */

export const API_ENDPOINTS_DOCS = {
  produtos: '/api/produtos',
  fornecedores: '/api/fornecedores',
  solicitacoes: '/api/solicitacoes',
  compras: '/api/compras',
  estoque: '/api/estoque',
  consumosAluno: '/api/consumos',
  ocorrenciasAluno: '/api/ocorrencias'
};
