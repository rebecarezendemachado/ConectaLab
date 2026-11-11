-- =============================================================================
-- MATÉRIA REATIVA - SISTEMA DE GESTÃO QUÍMICA & LABORATÓRIO ACADÊMICO
-- SCRIPT DDL: ESTRUTURA DO BANCO DE DADOS RELACIONAL (POSTGRESQL / MYSQL / SQLITE)
-- =============================================================================

-- Criação do Banco de Dados (opcional para MySQL / PostgreSQL)
-- CREATE DATABASE IF NOT EXISTS materia_reativa_lab CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE materia_reativa_lab;

-- 1. TABELA DE USUÁRIOS E PERFIS
CREATE TABLE IF NOT EXISTS usuarios (
    id VARCHAR(36) PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    tipo_perfil VARCHAR(20) NOT NULL CHECK (tipo_perfil IN ('aluno', 'professor', 'administrador')),
    matricula VARCHAR(50),
    turma VARCHAR(50),
    bancada_padrao VARCHAR(50),
    departamento VARCHAR(100),
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABELA DE PRODUTOS QUÍMICOS E REAGENTES
CREATE TABLE IF NOT EXISTS produtos_quimicos (
    id VARCHAR(50) PRIMARY KEY,                    -- Ex: 'PRD-01', 'PRD-0102'
    nome VARCHAR(200) NOT NULL,                    -- Ex: 'ACETONA', 'ÁCIDO CLORÍDRICO 37%'
    cas_number VARCHAR(50) NOT NULL,               -- Ex: '67-64-1'
    formula_quimica VARCHAR(100),                  -- Ex: 'CH3COCH3'
    massa_molar VARCHAR(50),                       -- Ex: '58.08 g/mol'
    pureza VARCHAR(50),                            -- Ex: '99.5% P.A.'
    classe_perigo VARCHAR(150) NOT NULL,           -- Classificação GHS / ONU
    cor_perigo VARCHAR(20) NOT NULL CHECK (cor_perigo IN ('amarelo', 'vermelho', 'verde', 'laranja')),
    situacao_legal VARCHAR(50) NOT NULL CHECK (situacao_legal IN ('Controlado', 'Não controlado')),
    estoque_atual DECIMAL(10,3) NOT NULL DEFAULT 0.000,
    estoque_minimo DECIMAL(10,3) NOT NULL DEFAULT 0.000,
    unidade VARCHAR(10) NOT NULL CHECK (unidade IN ('L', 'mL', 'kg', 'g')),
    validade_lote VARCHAR(20) NOT NULL,            -- Formato: 'MM/AAAA'
    localizacao VARCHAR(150),                      -- Ex: 'Armário de Inflamáveis 01'
    fornecedor_principal VARCHAR(150),
    fispq_url VARCHAR(255),
    nota_fiscal_url VARCHAR(255),
    observacoes TEXT,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_produtos_cas ON produtos_quimicos(cas_number);
CREATE INDEX IF NOT EXISTS idx_produtos_nome ON produtos_quimicos(nome);
CREATE INDEX IF NOT EXISTS idx_produtos_situacao ON produtos_quimicos(situacao_legal);

-- 3. TABELA DE FORNECEDORES HOMOLOGADOS
CREATE TABLE IF NOT EXISTS fornecedores (
    id VARCHAR(50) PRIMARY KEY,                    -- Ex: 'FOR-01'
    razao_social VARCHAR(200) NOT NULL,
    cnpj VARCHAR(25) UNIQUE NOT NULL,
    contato VARCHAR(100),
    endereco TEXT,
    email VARCHAR(150),
    responsavel VARCHAR(100),
    status VARCHAR(20) NOT NULL CHECK (status IN ('Ativo', 'Inativo')),
    produtos_fornecidos TEXT,                      -- Lista em formato JSON ou texto
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. TABELA DE ITENS DE ESTOQUE E LOTES
CREATE TABLE IF NOT EXISTS estoque_lotes (
    id VARCHAR(50) PRIMARY KEY,                    -- Ex: 'EST-PRD-01'
    produto_id VARCHAR(50) NOT NULL,
    produto_nome VARCHAR(200) NOT NULL,
    cas_number VARCHAR(50) NOT NULL,
    formula_quimica VARCHAR(100),
    quantidade_atual DECIMAL(10,3) NOT NULL DEFAULT 0.000,
    unidade VARCHAR(10) NOT NULL,
    estoque_minimo DECIMAL(10,3) NOT NULL DEFAULT 0.000,
    validade VARCHAR(20) NOT NULL,
    status_estoque VARCHAR(30) NOT NULL CHECK (status_estoque IN ('Normal', 'Estoque baixo', 'Esgotado')),
    lote VARCHAR(50) NOT NULL,
    localizacao VARCHAR(150),
    fornecedor VARCHAR(150),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (produto_id) REFERENCES produtos_quimicos(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_estoque_lote ON estoque_lotes(lote);
CREATE INDEX IF NOT EXISTS idx_estoque_status ON estoque_lotes(status_estoque);

-- 5. TABELA DE MOVIMENTAÇÕES DE ESTOQUE (LOG DE ENTRADAS / SAÍDAS)
CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
    id VARCHAR(50) PRIMARY KEY,
    produto_id VARCHAR(50) NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('entrada', 'saida', 'ajuste_inventario')),
    quantidade DECIMAL(10,3) NOT NULL,
    unidade VARCHAR(10) NOT NULL,
    motivo VARCHAR(255) NOT NULL,
    responsavel_usuario_id VARCHAR(36),
    responsavel_nome VARCHAR(150),
    data_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    observacoes TEXT,
    FOREIGN KEY (produto_id) REFERENCES produtos_quimicos(id) ON DELETE RESTRICT
);

-- 6. TABELA DE SOLICITAÇÕES DE MATERIAIS PARA AULAS PRÁTICAS
CREATE TABLE IF NOT EXISTS solicitacoes_laboratorio (
    id VARCHAR(50) PRIMARY KEY,                    -- Ex: 'SOL-2024-001'
    solicitante VARCHAR(150) NOT NULL,
    disciplina VARCHAR(150),
    turma VARCHAR(50),
    produto_resumo VARCHAR(255) NOT NULL,
    quantidade VARCHAR(50) NOT NULL,
    orgao_departamento VARCHAR(100) DEFAULT 'Departamento de Química',
    data_solicitacao DATE NOT NULL,
    status VARCHAR(30) NOT NULL CHECK (status IN ('Em análise', 'Aprovada', 'Pendência', 'Reprovada')),
    observacao TEXT,
    itens_json TEXT,                               -- Array JSON com lista detalhada de reagentes e vidrarias
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. TABELA DE ORDENS DE COMPRA DE REAGENTES
CREATE TABLE IF NOT EXISTS compras_pedidos (
    id VARCHAR(50) PRIMARY KEY,                    -- Ex: 'CMP-2024-001'
    produto_nome VARCHAR(200) NOT NULL,
    quantidade VARCHAR(50) NOT NULL,
    fornecedor_nome VARCHAR(200) NOT NULL,
    valor_total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    data_pedido DATE NOT NULL,
    status VARCHAR(30) NOT NULL CHECK (status IN ('Cotação', 'Aguardando aprovação', 'Pedido realizado', 'Recebido')),
    nota_fiscal_numero VARCHAR(100),
    previsao_entrega DATE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. TABELA DE REGISTROS DE CONSUMO DE ALUNOS NA BANCADA
CREATE TABLE IF NOT EXISTS consumos_aluno (
    id VARCHAR(50) PRIMARY KEY,                    -- Ex: 'CSM-2024-001'
    aluno_nome VARCHAR(150) NOT NULL,
    turma VARCHAR(50) NOT NULL,
    bancada VARCHAR(50) NOT NULL,
    pratica VARCHAR(200) NOT NULL,                 -- Nome da aula prática
    produto_nome VARCHAR(200) NOT NULL,
    quantidade_usada DECIMAL(10,3) NOT NULL,
    unidade VARCHAR(10) NOT NULL,
    data_registro DATE NOT NULL,
    hora_registro TIME NOT NULL,
    professor_orientador VARCHAR(150) NOT NULL,
    observacoes TEXT,
    status_visto VARCHAR(30) NOT NULL DEFAULT 'Pendente' CHECK (status_visto IN ('Pendente', 'Visto pelo Professor')),
    visto_em TIMESTAMP,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_consumos_aluno_turma ON consumos_aluno(turma, bancada);
CREATE INDEX IF NOT EXISTS idx_consumos_aluno_status ON consumos_aluno(status_visto);

-- 9. TABELA DE RELATOS DE OCORRÊNCIAS E ACIDENTES EM LABORATÓRIO
CREATE TABLE IF NOT EXISTS ocorrencias_aluno (
    id VARCHAR(50) PRIMARY KEY,                    -- Ex: 'ACD-2024-001'
    aluno_nome VARCHAR(150) NOT NULL,
    turma VARCHAR(50) NOT NULL,
    bancada VARCHAR(50) NOT NULL,
    tipo_ocorrencia VARCHAR(100) NOT NULL CHECK (
        tipo_ocorrencia IN (
            'Quebra de vidraria',
            'Derramamento de reagente',
            'Contato cutâneo/ocular',
            'Inalação de vapores',
            'Queimadura',
            'Outro'
        )
    ),
    reagente_envolvido VARCHAR(200),
    gravidade VARCHAR(50) NOT NULL CHECK (
        gravidade IN (
            'Leve (sem lesão)',
            'Moderada (lava-olhos/EPI)',
            'Grave (necessitou socorro médico)'
        )
    ),
    descricao TEXT NOT NULL,
    primeiros_socorros_adotados TEXT NOT NULL,
    data_ocorrencia DATE NOT NULL,
    hora_ocorrencia TIME NOT NULL,
    status_atendimento VARCHAR(30) NOT NULL DEFAULT 'Notificado' CHECK (status_atendimento IN ('Notificado', 'Em atendimento', 'Concluído')),
    concluido_em TIMESTAMP,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ocorrencias_gravidade ON ocorrencias_aluno(gravidade);
CREATE INDEX IF NOT EXISTS idx_ocorrencias_status ON ocorrencias_aluno(status_atendimento);
