// =============================================================================
// MATÉRIA REATIVA - DEFINIÇÕES DE REPOSITÓRIO E ACESSO A DADOS (DAL)
// =============================================================================

import {
  ProdutoQuimico,
  Fornecedor,
  SolicitacaoLaboratorio,
  CompraItem,
  EstoqueItem,
  RegistroConsumoAluno,
  RelatoOcorrenciaAluno,
  Usuario
} from '../../types';

export interface IRepository<T extends { id: string }> {
  listar(): Promise<T[]>;
  obterPorId(id: string): Promise<T | null>;
  criar(item: T): Promise<T>;
  atualizar(item: T): Promise<T>;
  deletar(id: string): Promise<boolean>;
}

export interface DatabaseBackup {
  versao: string;
  dataGeracao: string;
  origem: string;
  usuarios?: Usuario[];
  produtos: ProdutoQuimico[];
  fornecedores: Fornecedor[];
  solicitacoes: SolicitacaoLaboratorio[];
  compras: CompraItem[];
  estoque: EstoqueItem[];
  consumosAluno: RegistroConsumoAluno[];
  ocorrenciasAluno: RelatoOcorrenciaAluno[];
}

export type DatabaseProviderType = 'local_storage' | 'rest_api' | 'mysql' | 'cloud_sql_postgres' | 'firebase';

export interface DatabaseDetailedStats {
  totalGeral: number;
  produtos: number;
  alunos: number;
  professores: number;
  fornecedores: number;
  estoque: number;
  solicitacoes: number;
  compras: number;
  consumosAluno: number;
  ocorrenciasAluno: number;
}

export interface DatabaseConnectionStatus {
  provedor: DatabaseProviderType;
  status: 'conectado' | 'local_persistido' | 'erro';
  itensArmazenados: number;
  stats: DatabaseDetailedStats;
  ultimaSincronizacao: string;
  mensagem: string;
}
