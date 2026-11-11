import {
  ProdutoQuimico,
  Fornecedor,
  SolicitacaoLaboratorio,
  CompraItem,
  EstoqueItem,
  RegistroConsumoAluno,
  RelatoOcorrenciaAluno,
  Usuario
} from '../types';

// =============================================================================
// SISTEMA TOTALMENTE ZERADO - BANCO DE DADOS EM BRANCO
// Toda informação deve ser criada do zero pelo usuário (produtos, usuários, etc.)
// =============================================================================

export const initialProdutos: ProdutoQuimico[] = [];
export const initialFornecedores: Fornecedor[] = [];
export const initialSolicitacoes: SolicitacaoLaboratorio[] = [];
export const initialCompras: CompraItem[] = [];
export const initialEstoque: EstoqueItem[] = [];
export const initialConsumosAluno: RegistroConsumoAluno[] = [];
export const initialOcorrenciasAluno: RelatoOcorrenciaAluno[] = [];
export const initialUsuarios: Usuario[] = [];
