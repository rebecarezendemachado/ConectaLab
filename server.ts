import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// =============================================================================
// POOL DE CONEXÃO MYSQL COM AUTO-RECONEXÃO E TRATAMENTO DE ERROS
// =============================================================================
let pool: mysql.Pool | null = null;
let mysqlStatus: {
  connected: boolean;
  error: string | null;
  host: string | null;
  database: string | null;
  lastChecked: string;
} = {
  connected: false,
  error: 'Conexão ainda não inicializada',
  host: null,
  database: null,
  lastChecked: new Date().toISOString()
};

function getMySQLConfig(): mysql.PoolOptions | null {
  const databaseUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;

  if (databaseUrl && (databaseUrl.startsWith('mysql://') || databaseUrl.startsWith('mysql2://'))) {
    try {
      const url = new URL(databaseUrl.replace(/^mysql2:\/\//, 'mysql://'));
      return {
        host: url.hostname,
        port: url.port ? parseInt(url.port, 10) : 3306,
        user: decodeURIComponent(url.username || 'root'),
        password: decodeURIComponent(url.password || ''),
        database: url.pathname.replace(/^\//, '') || 'materia_reativa_lab',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        ssl: process.env.MYSQL_SSL === 'true' ? { rejectUnauthorized: false } : undefined
      };
    } catch (e: any) {
      console.error('[MySQL Config] Erro ao parsear DATABASE_URL:', e.message);
    }
  }

  // Parâmetros individuais
  const host = process.env.MYSQL_HOST || process.env.DB_HOST;
  const user = process.env.MYSQL_USER || process.env.DB_USER;
  const password = process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD || '';
  const database = process.env.MYSQL_DATABASE || process.env.DB_NAME || 'materia_reativa_lab';
  const port = process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT, 10) : 3306;

  if (host && user) {
    return {
      host,
      port,
      user,
      password,
      database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      ssl: process.env.MYSQL_SSL === 'true' ? { rejectUnauthorized: false } : undefined
    };
  }

  return null;
}

// Inicializar tabelas DDL automaticamente no MySQL
async function initMySQLTables(p: mysql.Pool) {
  try {
    const schemaPath = path.resolve(__dirname, 'src/db/schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
      // Divide por comandos separados por ';' ignorando comentários
      const queries = schemaSql
        .split(';')
        .map(q => q.trim())
        .filter(q => q.length > 0 && !q.startsWith('--') && !q.startsWith('CREATE DATABASE') && !q.startsWith('USE'));

      for (const query of queries) {
        if (query.trim()) {
          try {
            await p.query(query);
          } catch (err: any) {
            // Ignora se tabela ou índice já existir
            if (!err.message?.includes('already exists') && !err.message?.includes('Duplicate')) {
              console.warn('[MySQL Init Table Warning]:', err.message);
            }
          }
        }
      }
      console.log('[MySQL] Tabelas do banco de dados verificadas/inicializadas com sucesso!');
    }
  } catch (err: any) {
    console.error('[MySQL Init Schema Error]:', err.message);
  }
}

async function connectToMySQL(): Promise<boolean> {
  const config = getMySQLConfig();
  if (!config) {
    mysqlStatus = {
      connected: false,
      error: 'Variáveis de ambiente do MySQL não configuradas (defina MYSQL_HOST ou DATABASE_URL no .env)',
      host: null,
      database: null,
      lastChecked: new Date().toISOString()
    };
    return false;
  }

  try {
    if (pool) {
      await pool.end().catch(() => {});
    }

    pool = mysql.createPool(config);
    // Testa ping na conexão
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();

    mysqlStatus = {
      connected: true,
      error: null,
      host: config.host || 'localhost',
      database: (config.database as string) || 'materia_reativa_lab',
      lastChecked: new Date().toISOString()
    };

    console.log(`[MySQL] Conectado com sucesso ao MySQL em ${config.host}:${config.port}/${config.database}`);

    // Cria/valida as tabelas automaticamente
    await initMySQLTables(pool);
    return true;
  } catch (err: any) {
    console.warn('[MySQL] Não foi possível conectar ao MySQL:', err.message);
    mysqlStatus = {
      connected: false,
      error: err.message,
      host: config.host || null,
      database: (config.database as string) || null,
      lastChecked: new Date().toISOString()
    };
    pool = null;
    return false;
  }
}

// Inicia tentativa de conexão assíncrona
connectToMySQL();

// =============================================================================
// ROTAS DE API DO BACKEND (/api/*)
// =============================================================================

// 1. Status do Banco de Dados
app.get('/api/status', async (_req: Request, res: Response) => {
  // Se ainda não conectado, tenta reconectar uma vez
  if (!mysqlStatus.connected) {
    await connectToMySQL();
  }

  res.json({
    status: mysqlStatus.connected ? 'conectado' : 'desconectado',
    provedor: 'MySQL',
    host: mysqlStatus.host,
    database: mysqlStatus.database,
    erro: mysqlStatus.error,
    ultimaVerificacao: mysqlStatus.lastChecked,
    instrucoes: !mysqlStatus.connected
      ? 'Para conectar ao MySQL em tempo real, configure as credenciais no arquivo .env (ex: MYSQL_HOST=localhost, MYSQL_USER=root, MYSQL_PASSWORD=sua_senha, MYSQL_DATABASE=materia_reativa_lab).'
      : 'Banco de dados MySQL conectado e sincronizado em tempo real.'
  });
});

// 2. Forçar Inicialização de Tabelas
app.post('/api/init-db', async (_req: Request, res: Response) => {
  if (!pool) {
    const ok = await connectToMySQL();
    if (!ok || !pool) {
      return res.status(503).json({ error: 'MySQL não está conectado.', detalhes: mysqlStatus.error });
    }
  }

  try {
    await initMySQLTables(pool);
    res.json({ success: true, message: 'Tabelas do MySQL inicializadas com sucesso com base no schema.sql!' });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao inicializar tabelas', detalhes: err.message });
  }
});

// 3. USUÁRIOS
app.get('/api/usuarios', async (_req: Request, res: Response) => {
  if (!pool) return res.status(503).json({ error: 'MySQL desconectado' });
  try {
    const [rows]: any = await pool.query(
      'SELECT id, nome, email, tipo_perfil as tipoPerfil, matricula, turma, bancada_padrao as bancadaPadrao, departamento, ativo, criado_em as criadoEm FROM usuarios ORDER BY criado_em DESC'
    );
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/usuarios', async (req: Request, res: Response) => {
  if (!pool) return res.status(503).json({ error: 'MySQL desconectado' });
  try {
    const { id, nome, email, senha, tipoPerfil, matricula, turma, departamento } = req.body;
    await pool.query(
      `INSERT INTO usuarios (id, nome, email, senha_hash, tipo_perfil, matricula, turma, departamento)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE nome = VALUES(nome), tipo_perfil = VALUES(tipo_perfil)`,
      [id || `USR-${Date.now()}`, nome, email, senha || '', tipoPerfil, matricula || null, turma || null, departamento || null]
    );
    res.status(201).json({ id, nome, email, tipoPerfil, matricula, turma, departamento });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. PRODUTOS QUÍMICOS
app.get('/api/produtos', async (_req: Request, res: Response) => {
  if (!pool) return res.status(503).json({ error: 'MySQL desconectado' });
  try {
    const [rows]: any = await pool.query(`
      SELECT 
        id, 
        nome, 
        cas_number as cas, 
        formula_quimica as formulaQuimica, 
        massa_molar as massaMolar, 
        pureza, 
        classe_perigo as classePerigo, 
        cor_perigo as corPerigo, 
        situacao_legal as situacao, 
        CAST(estoque_atual AS DOUBLE) as estoqueAtual, 
        CAST(estoque_minimo AS DOUBLE) as estoqueMinimo, 
        unidade, 
        validade_lote as validade, 
        localizacao, 
        fornecedor_principal as fornecedorPrincipal,
        fispq_url as fispqUrl,
        nota_fiscal_url as notaFiscalUrl,
        observacoes
      FROM produtos_quimicos 
      ORDER BY nome ASC
    `);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/produtos', async (req: Request, res: Response) => {
  if (!pool) return res.status(503).json({ error: 'MySQL desconectado' });
  try {
    const p = req.body;
    await pool.query(
      `INSERT INTO produtos_quimicos 
        (id, nome, cas_number, formula_quimica, massa_molar, pureza, classe_perigo, cor_perigo, situacao_legal, estoque_atual, estoque_minimo, unidade, validade_lote, localizacao, fornecedor_principal, observacoes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
        nome = VALUES(nome),
        cas_number = VALUES(cas_number),
        formula_quimica = VALUES(formula_quimica),
        classe_perigo = VALUES(classe_perigo),
        cor_perigo = VALUES(cor_perigo),
        situacao_legal = VALUES(situacao_legal),
        estoque_atual = VALUES(estoque_atual),
        estoque_minimo = VALUES(estoque_minimo),
        unidade = VALUES(unidade),
        validade_lote = VALUES(validade_lote),
        localizacao = VALUES(localizacao),
        fornecedor_principal = VALUES(fornecedor_principal)`,
      [
        p.id,
        p.nome,
        p.cas,
        p.formulaQuimica || '',
        p.massaMolar || '',
        p.pureza || '',
        p.classePerigo || 'Geral',
        p.corPerigo || 'amarelo',
        p.situacao || 'Não controlado',
        p.estoqueAtual || 0,
        p.estoqueMinimo || 0,
        p.unidade || 'g',
        p.validade || '',
        p.localizacao || '',
        p.fornecedorPrincipal || '',
        p.observacoes || ''
      ]
    );

    // Também cria ou atualiza item de estoque correspondente
    await pool.query(
      `INSERT INTO estoque_lotes 
        (id, produto_id, produto_nome, cas_number, formula_quimica, quantidade_atual, unidade, estoque_minimo, validade, status_estoque, lote, localizacao, fornecedor)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
        quantidade_atual = VALUES(quantidade_atual),
        estoque_minimo = VALUES(estoque_minimo),
        status_estoque = VALUES(status_estoque)`,
      [
        `EST-${p.id}`,
        p.id,
        p.nome,
        p.cas,
        p.formulaQuimica || '',
        p.estoqueAtual || 0,
        p.unidade || 'g',
        p.estoqueMinimo || 0,
        p.validade || '',
        (p.estoqueAtual || 0) <= 0 ? 'Esgotado' : (p.estoqueAtual || 0) <= (p.estoqueMinimo || 0) ? 'Estoque baixo' : 'Normal',
        `LOT-${p.id}`,
        p.localizacao || '',
        p.fornecedorPrincipal || ''
      ]
    ).catch(() => {});

    res.status(201).json(p);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/produtos/:id', async (req: Request, res: Response) => {
  if (!pool) return res.status(503).json({ error: 'MySQL desconectado' });
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM estoque_lotes WHERE produto_id = ?', [id]).catch(() => {});
    await pool.query('DELETE FROM produtos_quimicos WHERE id = ?', [id]);
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. FORNECEDORES
app.get('/api/fornecedores', async (_req: Request, res: Response) => {
  if (!pool) return res.status(503).json({ error: 'MySQL desconectado' });
  try {
    const [rows]: any = await pool.query(`
      SELECT 
        id, 
        razao_social as razaoSocial, 
        cnpj, 
        contato, 
        endereco, 
        email, 
        responsavel, 
        status, 
        produtos_fornecidos as produtosFornecidos
      FROM fornecedores 
      ORDER BY razao_social ASC
    `);
    const formatted = rows.map((r: any) => {
      let produtos: string[] = [];
      try {
        if (r.produtosFornecidos) {
          produtos = typeof r.produtosFornecidos === 'string' ? JSON.parse(r.produtosFornecidos) : r.produtosFornecidos;
        }
      } catch {
        produtos = [r.produtosFornecidos];
      }
      return { ...r, produtosFornecidos: produtos };
    });
    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/fornecedores', async (req: Request, res: Response) => {
  if (!pool) return res.status(503).json({ error: 'MySQL desconectado' });
  try {
    const f = req.body;
    const produtosJson = JSON.stringify(f.produtosFornecidos || []);
    await pool.query(
      `INSERT INTO fornecedores (id, razao_social, cnpj, contato, endereco, email, responsavel, status, produtos_fornecidos)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
        razao_social = VALUES(razao_social),
        cnpj = VALUES(cnpj),
        contato = VALUES(contato),
        endereco = VALUES(endereco),
        email = VALUES(email),
        responsavel = VALUES(responsavel),
        status = VALUES(status),
        produtos_fornecidos = VALUES(produtos_fornecidos)`,
      [f.id, f.razaoSocial, f.cnpj, f.contato || '', f.endereco || '', f.email || '', f.responsavel || '', f.status || 'Ativo', produtosJson]
    );
    res.status(201).json(f);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/fornecedores/:id', async (req: Request, res: Response) => {
  if (!pool) return res.status(503).json({ error: 'MySQL desconectado' });
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM fornecedores WHERE id = ?', [id]);
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. ESTOQUE
app.get('/api/estoque', async (_req: Request, res: Response) => {
  if (!pool) return res.status(503).json({ error: 'MySQL desconectado' });
  try {
    const [rows]: any = await pool.query(`
      SELECT 
        id, 
        produto_id as produtoId, 
        produto_nome as produtoNome, 
        cas_number as cas, 
        formula_quimica as formulaQuimica, 
        CAST(quantidade_atual AS DOUBLE) as quantidadeAtual, 
        unidade, 
        CAST(estoque_minimo AS DOUBLE) as estoqueMinimo, 
        validade, 
        status_estoque as statusEstoque, 
        lote, 
        localizacao, 
        fornecedor 
      FROM estoque_lotes 
      ORDER BY produto_nome ASC
    `);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/estoque', async (req: Request, res: Response) => {
  if (!pool) return res.status(503).json({ error: 'MySQL desconectado' });
  try {
    const e = req.body;
    await pool.query(
      `INSERT INTO estoque_lotes 
        (id, produto_id, produto_nome, cas_number, formula_quimica, quantidade_atual, unidade, estoque_minimo, validade, status_estoque, lote, localizacao, fornecedor)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
        quantidade_atual = VALUES(quantidade_atual),
        status_estoque = VALUES(status_estoque),
        validade = VALUES(validade),
        localizacao = VALUES(localizacao)`,
      [
        e.id,
        e.produtoId || e.id,
        e.produtoNome,
        e.cas || '',
        e.formulaQuimica || '',
        e.quantidadeAtual || 0,
        e.unidade || 'g',
        e.estoqueMinimo || 0,
        e.validade || '',
        e.statusEstoque || 'Normal',
        e.lote || 'LOT-01',
        e.localizacao || '',
        e.fornecedor || ''
      ]
    );
    res.status(201).json(e);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. CONSUMOS DE ALUNO
app.get('/api/consumos', async (_req: Request, res: Response) => {
  if (!pool) return res.status(503).json({ error: 'MySQL desconectado' });
  try {
    const [rows]: any = await pool.query(`
      SELECT 
        id, 
        aluno_nome as alunoNome, 
        turma, 
        bancada, 
        pratica, 
        produto_nome as produtoNome, 
        CAST(quantidade_usada AS DOUBLE) as quantidadeUsada, 
        unidade, 
        DATE_FORMAT(data_registro, '%Y-%m-%d') as data, 
        hora_registro as hora, 
        professor_orientador as professorOrientador, 
        observacoes, 
        status_visto as statusVisto
      FROM consumos_aluno 
      ORDER BY data_registro DESC, hora_registro DESC
    `);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/consumos', async (req: Request, res: Response) => {
  if (!pool) return res.status(503).json({ error: 'MySQL desconectado' });
  try {
    const c = req.body;
    await pool.query(
      `INSERT INTO consumos_aluno 
        (id, aluno_nome, turma, bancada, pratica, produto_nome, quantidade_usada, unidade, data_registro, hora_registro, professor_orientador, observacoes, status_visto)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        c.id,
        c.alunoNome,
        c.turma,
        c.bancada,
        c.pratica,
        c.produtoNome,
        c.quantidadeUsada,
        c.unidade,
        c.data,
        c.hora || '10:00:00',
        c.professorOrientador,
        c.observacoes || '',
        c.statusVisto || 'Pendente'
      ]
    );

    // Abate automaticamente do estoque se o produto existir
    await pool.query(
      `UPDATE produtos_quimicos 
       SET estoque_atual = GREATEST(0, estoque_atual - ?) 
       WHERE nome = ? OR id = ?`,
      [c.quantidadeUsada, c.produtoNome, c.produtoId || '']
    ).catch(() => {});

    res.status(201).json(c);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. OCORRÊNCIAS DE ALUNO
app.get('/api/ocorrencias', async (_req: Request, res: Response) => {
  if (!pool) return res.status(503).json({ error: 'MySQL desconectado' });
  try {
    const [rows]: any = await pool.query(`
      SELECT 
        id, 
        aluno_nome as alunoNome, 
        turma, 
        bancada, 
        tipo_ocorrencia as tipoOcorrencia, 
        reagente_envolvido as reagenteEnvolvido, 
        gravidade, 
        descricao, 
        primeiros_socorros_adotados as primeirosSocorrosAdotados, 
        DATE_FORMAT(data_ocorrencia, '%Y-%m-%d') as data, 
        hora_ocorrencia as hora, 
        status_atendimento as status
      FROM ocorrencias_aluno 
      ORDER BY data_ocorrencia DESC, hora_ocorrencia DESC
    `);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ocorrencias', async (req: Request, res: Response) => {
  if (!pool) return res.status(503).json({ error: 'MySQL desconectado' });
  try {
    const o = req.body;
    await pool.query(
      `INSERT INTO ocorrencias_aluno 
        (id, aluno_nome, turma, bancada, tipo_ocorrencia, reagente_envolvido, gravidade, descricao, primeiros_socorros_adotados, data_ocorrencia, hora_ocorrencia, status_atendimento)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        o.id,
        o.alunoNome,
        o.turma,
        o.bancada,
        o.tipoOcorrencia,
        o.reagenteEnvolvido || '',
        o.gravidade,
        o.descricao,
        o.primeirosSocorrosAdotados,
        o.data,
        o.hora || '10:00:00',
        o.status || 'Notificado'
      ]
    );
    res.status(201).json(o);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 9. SOLICITAÇÕES
app.get('/api/solicitacoes', async (_req: Request, res: Response) => {
  if (!pool) return res.status(503).json({ error: 'MySQL desconectado' });
  try {
    const [rows]: any = await pool.query(`
      SELECT 
        id, 
        solicitante, 
        disciplina, 
        turma, 
        produto_resumo as produtoResumo, 
        quantidade, 
        orgao_departamento as orgao, 
        DATE_FORMAT(data_solicitacao, '%Y-%m-%d') as data, 
        status, 
        observacao
      FROM solicitacoes_laboratorio 
      ORDER BY data_solicitacao DESC
    `);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/solicitacoes', async (req: Request, res: Response) => {
  if (!pool) return res.status(503).json({ error: 'MySQL desconectado' });
  try {
    const s = req.body;
    await pool.query(
      `INSERT INTO solicitacoes_laboratorio 
        (id, solicitante, disciplina, turma, produto_resumo, quantidade, orgao_departamento, data_solicitacao, status, observacao)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [s.id, s.solicitante, s.disciplina || '', s.turma || '', s.produtoResumo, s.quantidade, s.orgao || 'Departamento de Química', s.data, s.status || 'Em análise', s.observacao || '']
    );
    res.status(201).json(s);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 10. COMPRAS
app.get('/api/compras', async (_req: Request, res: Response) => {
  if (!pool) return res.status(503).json({ error: 'MySQL desconectado' });
  try {
    const [rows]: any = await pool.query(`
      SELECT 
        id, 
        produto_nome as produtoNome, 
        quantidade, 
        fornecedor_nome as fornecedorNome, 
        CAST(valor_total AS DOUBLE) as valorTotal, 
        DATE_FORMAT(data_pedido, '%Y-%m-%d') as dataPedido, 
        status, 
        nota_fiscal_numero as notaFiscal, 
        DATE_FORMAT(previsao_entrega, '%Y-%m-%d') as previsaoEntrega
      FROM compras_pedidos 
      ORDER BY data_pedido DESC
    `);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/compras', async (req: Request, res: Response) => {
  if (!pool) return res.status(503).json({ error: 'MySQL desconectado' });
  try {
    const c = req.body;
    await pool.query(
      `INSERT INTO compras_pedidos 
        (id, produto_nome, quantidade, fornecedor_nome, valor_total, data_pedido, status, nota_fiscal_numero, previsao_entrega)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [c.id, c.produtoNome, c.quantidade, c.fornecedorNome, c.valorTotal || 0, c.dataPedido, c.status || 'Cotação', c.notaFiscal || '', c.previsaoEntrega || null]
    );
    res.status(201).json(c);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// REDIRECIONAMENTOS DE COMPATIBILIDADE PARA O SPA REACT
// =============================================================================
app.get(['/login.html', '/login'], (_req, res) => res.redirect('/#login'));
app.get(['/dashboard.html', '/dashboard'], (_req, res) => res.redirect('/#dashboard'));
app.get(['/produtos.html', '/produtos'], (_req, res) => res.redirect('/#produtos'));
app.get(['/estoque.html', '/estoque'], (_req, res) => res.redirect('/#estoque'));
app.get(['/compras.html', '/compras'], (_req, res) => res.redirect('/#compras'));
app.get(['/solicitacoes.html', '/solicitacoes'], (_req, res) => res.redirect('/#solicitacoes'));
app.get(['/fornecedores.html', '/fornecedores'], (_req, res) => res.redirect('/#fornecedores'));
app.get(['/alertas.html', '/alertas'], (_req, res) => res.redirect('/#alertas'));
app.get(['/relatorios.html', '/relatorios'], (_req, res) => res.redirect('/#relatorios'));
app.get(['/cadastro.html', '/cadastro'], (_req, res) => res.redirect('/#cadastro'));
app.get(['/esqueceu.html', '/esqueceu'], (_req, res) => res.redirect('/#esqueceu'));
app.get(['/aluno.html', '/professor.html'], (_req, res) => res.redirect('/#login'));

// =============================================================================
// INTEGRAÇÃO COM VITE PARA DESENVOLVIMENTO FULL-STACK
// =============================================================================
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Matéria Reativa] Servidor Full-Stack rodando na porta ${PORT}`);
  });
}

start();
