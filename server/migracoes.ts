/* ============================================================================
   Migrações idempotentes (podem rodar a cada inicialização, sem perder dados).
   Só ADICIONAM: tabelas novas e colunas novas. Nada existente é apagado.
   ============================================================================ */
import type { Db } from './db.ts';

type Stmt = string | { mysql: string; sqlite: string };

// DATETIME guarda sempre UTC no formato 'YYYY-MM-DD HH:MM:SS' (sem conversão de fuso do MySQL)
const TABELAS: Stmt[] = [
  `CREATE TABLE IF NOT EXISTS sessoes (
     id VARCHAR(64) PRIMARY KEY,
     usuario_id VARCHAR(36) NOT NULL,
     criado_em DATETIME NOT NULL,
     expira_em DATETIME NOT NULL,
     limite_absoluto DATETIME NOT NULL,
     ultimo_uso DATETIME NOT NULL,
     ip VARCHAR(64),
     agente VARCHAR(255)
   )`,
  `CREATE TABLE IF NOT EXISTS auditoria (
     id VARCHAR(36) PRIMARY KEY,
     data_hora DATETIME NOT NULL,
     usuario_id VARCHAR(36),
     usuario_nome VARCHAR(150),
     papel VARCHAR(20),
     acao VARCHAR(30) NOT NULL,
     entidade VARCHAR(50) NOT NULL,
     entidade_id VARCHAR(64),
     detalhes TEXT,
     ip VARCHAR(64)
   )`,
  `CREATE TABLE IF NOT EXISTS turmas (
     id VARCHAR(36) PRIMARY KEY,
     nome VARCHAR(100) NOT NULL UNIQUE,
     descricao VARCHAR(255),
     ano_letivo VARCHAR(10),
     ativa BOOLEAN NOT NULL DEFAULT 1,
     criado_em DATETIME NOT NULL,
     criado_por VARCHAR(36)
   )`,
  `CREATE TABLE IF NOT EXISTS turma_professores (
     turma_id VARCHAR(36) NOT NULL,
     professor_id VARCHAR(36) NOT NULL,
     PRIMARY KEY (turma_id, professor_id)
   )`,
  `CREATE TABLE IF NOT EXISTS alertas (
     id VARCHAR(50) PRIMARY KEY,
     autor_id VARCHAR(36),
     autor_nome VARCHAR(150),
     autor_perfil VARCHAR(20),
     turma_id VARCHAR(36),
     criado_em DATETIME NOT NULL,
     conteudo TEXT NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS compras_historico (
     id VARCHAR(36) PRIMARY KEY,
     compra_id VARCHAR(50) NOT NULL,
     data_hora DATETIME NOT NULL,
     usuario_id VARCHAR(36),
     usuario_nome VARCHAR(150),
     acao VARCHAR(40) NOT NULL,
     de_status VARCHAR(30),
     para_status VARCHAR(30),
     detalhes TEXT
   )`,
  `CREATE TABLE IF NOT EXISTS compras_recebimentos (
     id VARCHAR(36) PRIMARY KEY,
     compra_id VARCHAR(50) NOT NULL,
     data_hora DATETIME NOT NULL,
     conferente_id VARCHAR(36),
     conferente_nome VARCHAR(150),
     quantidade_recebida DECIMAL(12,3) NOT NULL,
     quantidade_danificada DECIMAL(12,3) NOT NULL DEFAULT 0,
     divergencia TEXT,
     observacao TEXT
   )`,
  { mysql: `CREATE TABLE IF NOT EXISTS documentos_arquivo (
     id VARCHAR(36) PRIMARY KEY,
     grupo_versao VARCHAR(36) NOT NULL,
     versao INT NOT NULL DEFAULT 1,
     titulo VARCHAR(200) NOT NULL,
     categoria VARCHAR(40) NOT NULL,
     nome_arquivo VARCHAR(255) NOT NULL,
     mime_type VARCHAR(100) NOT NULL,
     tamanho_bytes INT NOT NULL,
     conteudo LONGBLOB NOT NULL,
     produto_id VARCHAR(50),
     compra_id VARCHAR(50),
     criado_por VARCHAR(36),
     criado_por_nome VARCHAR(150),
     criado_em DATETIME NOT NULL,
     ativo BOOLEAN NOT NULL DEFAULT 1
   )`, sqlite: `CREATE TABLE IF NOT EXISTS documentos_arquivo (
     id VARCHAR(36) PRIMARY KEY,
     grupo_versao VARCHAR(36) NOT NULL,
     versao INT NOT NULL DEFAULT 1,
     titulo VARCHAR(200) NOT NULL,
     categoria VARCHAR(40) NOT NULL,
     nome_arquivo VARCHAR(255) NOT NULL,
     mime_type VARCHAR(100) NOT NULL,
     tamanho_bytes INTEGER NOT NULL,
     conteudo BLOB NOT NULL,
     produto_id VARCHAR(50),
     compra_id VARCHAR(50),
     criado_por VARCHAR(36),
     criado_por_nome VARCHAR(150),
     criado_em DATETIME NOT NULL,
     ativo INTEGER NOT NULL DEFAULT 1
   )` },
  `CREATE TABLE IF NOT EXISTS compras_cotacoes (
     id VARCHAR(36) PRIMARY KEY,
     compra_id VARCHAR(50) NOT NULL,
     fornecedor_nome VARCHAR(200) NOT NULL,
     cnpj VARCHAR(30),
     valor_total DECIMAL(12,2) NOT NULL,
     prazo_entrega VARCHAR(100),
     validade_proposta DATE,
     observacao TEXT,
     criado_por VARCHAR(36),
     criado_por_nome VARCHAR(150),
     criado_em DATETIME NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS alerta_destinatarios (
     alerta_id VARCHAR(50) NOT NULL,
     usuario_id VARCHAR(36) NOT NULL,
     lido BOOLEAN NOT NULL DEFAULT 0,
     lido_em DATETIME,
     PRIMARY KEY (alerta_id, usuario_id)
   )`,
  `CREATE TABLE IF NOT EXISTS alertas_descartados (
     usuario_id VARCHAR(36) NOT NULL,
     alerta_id VARCHAR(50) NOT NULL,
     descartado_em DATETIME NOT NULL,
     PRIMARY KEY (usuario_id, alerta_id)
   )`,
  `CREATE TABLE IF NOT EXISTS admin_unico (
     id VARCHAR(20) PRIMARY KEY,
     usuario_id VARCHAR(36) NOT NULL UNIQUE,
     criado_em DATETIME NOT NULL
   )`,
];

// colunas novas em tabelas que já existem (adicionadas só se ainda não existirem)
const COLUNAS: Array<{ tabela: string; coluna: string; def: string }> = [
  { tabela: 'fornecedores', coluna: 'cnpj', def: "VARCHAR(25) NOT NULL DEFAULT ''" },
  { tabela: 'fornecedores', coluna: 'contato', def: 'VARCHAR(100)' },
  { tabela: 'fornecedores', coluna: 'endereco', def: 'TEXT' },
  { tabela: 'fornecedores', coluna: 'email', def: 'VARCHAR(150)' },
  { tabela: 'fornecedores', coluna: 'responsavel', def: 'VARCHAR(100)' },
  { tabela: 'fornecedores', coluna: 'status', def: "VARCHAR(30) NOT NULL DEFAULT 'A validar'" },
  { tabela: 'fornecedores', coluna: 'produtos_fornecidos', def: 'TEXT' },
  { tabela: 'fornecedores', coluna: 'origem', def: 'VARCHAR(255)' },
  { tabela: 'usuarios', coluna: 'status', def: "VARCHAR(20) NOT NULL DEFAULT 'ativo'" },
  { tabela: 'usuarios', coluna: 'turma_id', def: 'VARCHAR(36)' },
  { tabela: 'usuarios', coluna: 'criado_por', def: 'VARCHAR(36)' },
  { tabela: 'usuarios', coluna: 'perfil_extra', def: 'TEXT' },
  { tabela: 'usuarios', coluna: 'ultimo_login', def: 'DATETIME' },
  { tabela: 'usuarios', coluna: 'deve_trocar_senha', def: 'BOOLEAN NOT NULL DEFAULT 0' },
  { tabela: 'compras_pedidos', coluna: 'fluxo_status', def: 'VARCHAR(30)' },
  { tabela: 'compras_pedidos', coluna: 'solicitante_id', def: 'VARCHAR(36)' },
  { tabela: 'compras_pedidos', coluna: 'solicitante_nome', def: 'VARCHAR(150)' },
  { tabela: 'compras_pedidos', coluna: 'justificativa', def: 'TEXT' },
  { tabela: 'compras_pedidos', coluna: 'quantidade_numero', def: 'DECIMAL(12,3)' },
  { tabela: 'compras_pedidos', coluna: 'unidade', def: 'VARCHAR(10)' },
  { tabela: 'compras_pedidos', coluna: 'quantidade_recebida', def: 'DECIMAL(12,3) NOT NULL DEFAULT 0' },
  { tabela: 'compras_pedidos', coluna: 'valor_estimado', def: 'DECIMAL(10,2)' },
  { tabela: 'compras_pedidos', coluna: 'valor_cotado', def: 'DECIMAL(10,2)' },
  { tabela: 'compras_pedidos', coluna: 'valor_aprovado', def: 'DECIMAL(10,2)' },
  { tabela: 'compras_pedidos', coluna: 'valor_pago', def: 'DECIMAL(10,2)' },
  { tabela: 'compras_pedidos', coluna: 'condicoes_pagamento', def: 'VARCHAR(200)' },
  { tabela: 'compras_pedidos', coluna: 'local_entrega', def: 'VARCHAR(200)' },
  { tabela: 'compras_pedidos', coluna: 'numero_pedido', def: 'VARCHAR(30)' },
  { tabela: 'produtos_quimicos', coluna: 'fispq_url', def: 'VARCHAR(255)' },
  { tabela: 'produtos_quimicos', coluna: 'nota_fiscal_url', def: 'VARCHAR(255)' },
  { tabela: 'produtos_quimicos', coluna: 'massa_molar', def: 'VARCHAR(50)' },
  { tabela: 'produtos_quimicos', coluna: 'pureza', def: 'VARCHAR(50)' },
  { tabela: 'produtos_quimicos', coluna: 'classe_perigo', def: "VARCHAR(150) NOT NULL DEFAULT 'Geral'" },
  { tabela: 'produtos_quimicos', coluna: 'cor_perigo', def: "VARCHAR(20) NOT NULL DEFAULT 'amarelo'" },
  { tabela: 'produtos_quimicos', coluna: 'situacao_legal', def: "VARCHAR(30) NOT NULL DEFAULT 'Não controlado'" },
  { tabela: 'produtos_quimicos', coluna: 'validade_lote', def: "VARCHAR(20) NOT NULL DEFAULT '-'" },
  { tabela: 'produtos_quimicos', coluna: 'localizacao', def: 'VARCHAR(150)' },
  { tabela: 'produtos_quimicos', coluna: 'observacoes', def: 'TEXT' },
  { tabela: 'consumos_aluno', coluna: 'usuario_id', def: 'VARCHAR(36)' },
  { tabela: 'ocorrencias_aluno', coluna: 'usuario_id', def: 'VARCHAR(36)' },
];

export async function migrar(db: Db): Promise<void> {
  for (const s of TABELAS) {
    const sql = typeof s === 'string' ? s : s[db.dialect];
    await db.run(sql);
  }
  for (const c of COLUNAS) {
    // a tabela pode não existir ainda no SQLite de teste; só altera se existir
    try {
      if (!(await db.hasColumn(c.tabela, c.coluna))) {
        // hasColumn devolve false também quando a tabela não existe; o ALTER falha e é ignorado
        await db.run(`ALTER TABLE ${c.tabela} ADD COLUMN ${c.coluna} ${c.def}`);
      }
    } catch {
      /* tabela ainda não criada: será migrada na próxima inicialização */
    }
  }
  // índices (criados com tratamento de erro: "já existe" não é falha)
  const indices = [
    'CREATE INDEX idx_sessoes_usuario ON sessoes(usuario_id)',
    'CREATE INDEX idx_auditoria_data ON auditoria(data_hora)',
    'CREATE INDEX idx_auditoria_entidade ON auditoria(entidade, entidade_id)',
    'CREATE INDEX idx_alertas_criado ON alertas(criado_em)',
    'CREATE INDEX idx_alerta_dest_usuario ON alerta_destinatarios(usuario_id)',
    'CREATE INDEX idx_compras_hist ON compras_historico(compra_id, data_hora)',
    'CREATE INDEX idx_compras_receb ON compras_recebimentos(compra_id)',
    'CREATE INDEX idx_documentos_produto ON documentos_arquivo(produto_id, categoria, criado_em)',
    'CREATE INDEX idx_documentos_compra ON documentos_arquivo(compra_id, categoria, criado_em)',
    'CREATE INDEX idx_cotacoes_compra ON compras_cotacoes(compra_id, valor_total)',
  ];
  for (const i of indices) {
    try { await db.run(i); } catch { /* já existe */ }
  }
}
