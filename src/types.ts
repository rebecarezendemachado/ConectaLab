export interface ProdutoQuimico {
  id: string;
  nome: string;
  cas: string;
  formulaQuimica?: string;
  massaMolar?: string;
  pureza?: string;
  classePerigo: string;
  corPerigo: 'amarelo' | 'vermelho' | 'verde' | 'laranja';
  fispqUrl?: string;
  notaFiscal?: string;
  situacao: 'Controlado' | 'Não controlado';
  estoqueAtual: number;
  estoqueMinimo: number;
  unidade: 'L' | 'mL' | 'kg' | 'g';
  validade: string;
  localizacao?: string;
  fornecedorPrincipal?: string;
}

export interface Fornecedor {
  id: string;
  razaoSocial: string;
  cnpj: string;
  contato: string;
  endereco: string;
  email: string;
  responsavel: string;
  status: 'Ativo' | 'Inativo';
  produtosFornecidos?: string[];
}

export interface SolicitacaoLaboratorio {
  id: string;
  solicitante: string;
  produto: string;
  quantidade: string;
  orgao: string;
  data: string;
  status: 'Em análise' | 'Aprovada' | 'Pendência' | 'Reprovada';
  observacao?: string;
}

export interface CompraItem {
  id: string;
  produto: string;
  quantidade: string;
  fornecedor: string;
  valor: number;
  data: string;
  status: 'Cotação' | 'Aguardando aprovação' | 'Pedido realizado' | 'Recebido';
}

export interface EstoqueItem {
  id: string;
  produto: string;
  cas: string;
  formulaQuimica?: string;
  quantidadeAtual: number;
  unidade: string;
  estoqueMinimo: number;
  validade: string;
  status: 'Normal' | 'Estoque baixo' | 'Esgotado';
  lote: string;
  localizacao?: string;
  fornecedor?: string;
}

export interface RegistroConsumoAluno {
  id: string;
  alunoNome: string;
  turma: string;
  bancada: string;
  pratica: string;
  produtoNome: string;
  quantidadeUsada: number;
  unidade: string;
  data: string;
  hora: string;
  professorOrientador: string;
  observacoes?: string;
  statusVisto: 'Pendente' | 'Visto pelo Professor';
}

export interface RelatoOcorrenciaAluno {
  id: string;
  alunoNome: string;
  turma: string;
  bancada: string;
  tipoOcorrencia: 'Quebra de vidraria' | 'Derramamento de reagente' | 'Contato cutâneo/ocular' | 'Inalação de vapores' | 'Queimadura' | 'Outro';
  reagenteEnvolvido?: string;
  gravidade: 'Leve (sem lesão)' | 'Moderada (lava-olhos/EPI)' | 'Grave (necessitou socorro médico)';
  descricao: string;
  primeirosSocorrosAdotados: string;
  data: string;
  hora: string;
  status: 'Notificado' | 'Em atendimento' | 'Concluído';
}

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  senha: string;
  tipoPerfil: 'aluno' | 'professor';
  matricula?: string;
  turma?: string;
  departamento?: string;
  cargo?: string;
  telefone?: string;
  cpf?: string;
  criadoEm: string;
}

export interface AlertaNotificacao {
  id: string;
  tipo: 'consumo' | 'falta_estoque' | 'alerta_critico' | 'alteracao' | 'sistema';
  titulo: string;
  mensagem: string;
  produtoNome?: string;
  quantidadeAlterada?: number;
  saldoRestante?: number;
  unidade?: string;
  autorNome: string;
  autorPerfil: 'aluno' | 'professor';
  dataHora: string;
  data: string;
  hora: string;
  lida: boolean;
  gravidade: 'alta' | 'media' | 'baixa';
  acaoSugerida?: 'comprar' | 'ver_estoque' | 'ver_consumo';
}

