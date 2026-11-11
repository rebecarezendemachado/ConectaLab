import React, { useState } from 'react';
import { EstoqueItem, ProdutoQuimico } from '../../types';
import {
  Boxes,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
  Plus,
  ArrowDownUp,
  Eye,
  Edit2,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  MapPin,
  Calendar,
  Sparkles,
  Layers
} from 'lucide-react';

interface EstoqueViewProps {
  estoque: EstoqueItem[];
  produtosQuimicos?: ProdutoQuimico[];
  onAddEstoque?: (novo: EstoqueItem) => void;
  onUpdateEstoque?: (atualizado: EstoqueItem) => void;
  onDeleteEstoque?: (id: string) => void;
  onUpdateQuantidade: (id: string, novaQtd: number) => void;
  onAddMovimentacao: (id: string, tipo: 'entrada' | 'saida', qtd: number, motivo: string) => void;
}

export const EstoqueView: React.FC<EstoqueViewProps> = ({
  estoque,
  produtosQuimicos = [],
  onAddEstoque,
  onUpdateEstoque,
  onDeleteEstoque,
  onUpdateQuantidade,
  onAddMovimentacao
}) => {
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'Todos' | 'Normal' | 'Baixo' | 'Esgotado'>('Todos');
  const [pagina, setPagina] = useState(1);

  // Modais de Controle
  const [modalNovo, setModalNovo] = useState(false);
  const [modalEditar, setModalEditar] = useState<EstoqueItem | null>(null);
  const [modalVisualizar, setModalVisualizar] = useState<EstoqueItem | null>(null);
  const [modalMovimento, setModalMovimento] = useState<EstoqueItem | null>(null);
  const [itemParaExcluir, setItemParaExcluir] = useState<EstoqueItem | null>(null);

  // Estados do Modal de Movimentação
  const [tipoMovimento, setTipoMovimento] = useState<'entrada' | 'saida'>('entrada');
  const [qtdMovimento, setQtdMovimento] = useState<string>('1.0');
  const [motivoMovimento, setMotivoMovimento] = useState<string>('');

  // Formulário de Novo/Edição de Lote no Estoque
  const [formLote, setFormLote] = useState({
    produto: '',
    cas: '',
    quantidadeAtual: 1,
    unidade: 'L',
    estoqueMinimo: 1,
    validade: '',
    lote: '',
    localizacao: 'Armário Geral A-01',
    fornecedor: ''
  });

  const abrirModalCriar = () => {
    const padraoNome = produtosQuimicos.length > 0 ? produtosQuimicos[0].nome : '';
    const padraoCas = produtosQuimicos.length > 0 ? produtosQuimicos[0].cas : '';
    const padraoUnidade = produtosQuimicos.length > 0 ? produtosQuimicos[0].unidade : 'L';
    setFormLote({
      produto: padraoNome,
      cas: padraoCas,
      quantidadeAtual: 5,
      unidade: padraoUnidade,
      estoqueMinimo: 2,
      validade: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 7),
      lote: `LT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      localizacao: 'Armário A-01 (Prateleira 2)',
      fornecedor: 'Labsynth Produtos Químicos'
    });
    setModalNovo(true);
  };

  const abrirModalEditar = (item: EstoqueItem) => {
    setModalEditar(item);
    setFormLote({
      produto: item.produto,
      cas: item.cas,
      quantidadeAtual: item.quantidadeAtual,
      unidade: item.unidade,
      estoqueMinimo: item.estoqueMinimo,
      validade: item.validade,
      lote: item.lote,
      localizacao: item.localizacao || 'Armário Principal',
      fornecedor: item.fornecedor || 'Distribuidor Homologado'
    });
  };

  const handleSalvarNovo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formLote.produto.trim()) return;

    const qtd = Number(formLote.quantidadeAtual) || 0;
    const min = Number(formLote.estoqueMinimo) || 0;
    const status = qtd <= 0 ? 'Esgotado' : qtd <= min ? 'Estoque baixo' : 'Normal';

    const novoItem: EstoqueItem = {
      id: `EST-${Date.now().toString().slice(-5)}`,
      produto: formLote.produto,
      cas: formLote.cas || 'N/A',
      quantidadeAtual: qtd,
      unidade: formLote.unidade,
      estoqueMinimo: min,
      validade: formLote.validade || '12/2027',
      status,
      lote: formLote.lote || `LT-${Math.floor(1000 + Math.random() * 9000)}`,
      localizacao: formLote.localizacao,
      fornecedor: formLote.fornecedor
    };

    if (onAddEstoque) {
      onAddEstoque(novoItem);
    }
    setModalNovo(false);
  };

  const handleSalvarEdicao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalEditar) return;

    const qtd = Number(formLote.quantidadeAtual) || 0;
    const min = Number(formLote.estoqueMinimo) || 0;
    const status = qtd <= 0 ? 'Esgotado' : qtd <= min ? 'Estoque baixo' : 'Normal';

    const atualizado: EstoqueItem = {
      ...modalEditar,
      produto: formLote.produto,
      cas: formLote.cas,
      quantidadeAtual: qtd,
      unidade: formLote.unidade,
      estoqueMinimo: min,
      validade: formLote.validade,
      status,
      lote: formLote.lote,
      localizacao: formLote.localizacao,
      fornecedor: formLote.fornecedor
    };

    if (onUpdateEstoque) {
      onUpdateEstoque(atualizado);
    }
    setModalEditar(null);
  };

  const handleExcluir = (id: string, nome: string) => {
    const item = estoque.find((it) => it.id === id);
    if (item) {
      setItemParaExcluir(item);
    } else if (onDeleteEstoque) {
      onDeleteEstoque(id);
    }
  };

  const estoqueFiltrado = estoque.filter((item) => {
    const matchBusca =
      item.produto.toLowerCase().includes(busca.toLowerCase()) ||
      item.cas.toLowerCase().includes(busca.toLowerCase()) ||
      item.lote.toLowerCase().includes(busca.toLowerCase()) ||
      (item.localizacao && item.localizacao.toLowerCase().includes(busca.toLowerCase()));

    let matchStatus = true;
    if (filtroStatus === 'Normal') matchStatus = item.status === 'Normal';
    else if (filtroStatus === 'Baixo') matchStatus = item.status === 'Estoque baixo';
    else if (filtroStatus === 'Esgotado') matchStatus = item.status === 'Esgotado';

    return matchBusca && matchStatus;
  });

  const totalItens = estoque.length;
  const normais = estoque.filter((i) => i.status === 'Normal').length;
  const baixos = estoque.filter((i) => i.status === 'Estoque baixo').length;
  const esgotados = estoque.filter((i) => i.status === 'Esgotado').length;

  const itensPorPagina = 8;
  const totalPaginas = Math.ceil(estoqueFiltrado.length / itensPorPagina) || 1;
  const exibidos = estoqueFiltrado.slice((pagina - 1) * itensPorPagina, pagina * itensPorPagina);

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'Normal':
        return 'bg-emerald-50 text-emerald-700 border-emerald-300';
      case 'Estoque baixo':
        return 'bg-amber-50 text-amber-700 border-amber-300';
      case 'Esgotado':
        return 'bg-rose-50 text-rose-700 border-rose-300';
      default:
        return 'bg-zinc-100 text-zinc-700';
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* 4 CARDS DE MÉTRICAS - AZUL PREDOMINANTE COM DETALHES DE CORES DIFERENTES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
        {/* Card 1: Total de Itens - Detalhe Ciano */}
        <div
          onClick={() => {
            setFiltroStatus('todos');
            setBusca('');
          }}
          className="bg-gradient-to-br from-[#2B7FFF] to-[#1E6BDB] text-white rounded-3xl p-6 sm:p-7 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-out cursor-pointer flex items-center justify-between min-h-[135px] border border-blue-400/30"
        >
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-300 animate-pulse" />
              <h3 className="text-sm sm:text-base font-bold text-white/95">Total de Lotes</h3>
            </div>
            <div className="text-3xl sm:text-4xl font-black text-white tracking-tight font-mono leading-none">
              {totalItens}
            </div>
            <p className="text-xs text-sky-100 font-medium">Lotes no inventário</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-sky-400/20 text-white border border-sky-300/30 flex items-center justify-center flex-shrink-0 shadow-inner">
            <Boxes className="w-8 h-8 stroke-[1.6]" />
          </div>
        </div>

        {/* Card 2: Estoque Normal - Detalhe Esmeralda */}
        <div
          onClick={() => setFiltroStatus('Normal')}
          className="bg-gradient-to-br from-[#2B7FFF] to-[#1E6BDB] text-white rounded-3xl p-6 sm:p-7 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-out cursor-pointer flex items-center justify-between min-h-[135px] border border-blue-400/30"
        >
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-300" />
              <h3 className="text-sm sm:text-base font-bold text-white/95">Estoque Regular</h3>
            </div>
            <div className="text-3xl sm:text-4xl font-black text-white tracking-tight font-mono leading-none">
              {normais}
            </div>
            <p className="text-xs text-emerald-100 font-medium">Volume dentro da meta</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-emerald-400/25 text-emerald-100 border border-emerald-300/40 flex items-center justify-center flex-shrink-0 shadow-inner">
            <CheckCircle2 className="w-8 h-8 stroke-[1.6]" />
          </div>
        </div>

        {/* Card 3: Estoque Baixo - Detalhe Âmbar */}
        <div
          onClick={() => setFiltroStatus('Estoque baixo')}
          className="bg-gradient-to-br from-[#2B7FFF] to-[#1E6BDB] text-white rounded-3xl p-6 sm:p-7 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-out cursor-pointer flex items-center justify-between min-h-[135px] border border-blue-400/30"
        >
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-300 animate-pulse" />
              <h3 className="text-sm sm:text-base font-bold text-white/95">Estoque Baixo</h3>
            </div>
            <div className="text-3xl sm:text-4xl font-black text-white tracking-tight font-mono leading-none">
              {baixos}
            </div>
            <p className="text-xs text-amber-100 font-medium">Requer reposição</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-amber-400/25 text-amber-100 border border-amber-300/40 flex items-center justify-center flex-shrink-0 shadow-inner">
            <AlertTriangle className="w-8 h-8 stroke-[1.6]" />
          </div>
        </div>

        {/* Card 4: Esgotados - Detalhe Rose / Vermelho */}
        <div
          onClick={() => setFiltroStatus('Esgotado')}
          className="bg-gradient-to-br from-[#2B7FFF] to-[#1E6BDB] text-white rounded-3xl p-6 sm:p-7 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-out cursor-pointer flex items-center justify-between min-h-[135px] border border-blue-400/30"
        >
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-300 animate-pulse" />
              <h3 className="text-sm sm:text-base font-bold text-white/95">Esgotados</h3>
            </div>
            <div className="text-3xl sm:text-4xl font-black text-white tracking-tight font-mono leading-none">
              {esgotados}
            </div>
            <p className="text-xs text-rose-100 font-medium">Reposição imediata</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-rose-400/25 text-rose-100 border border-rose-300/40 flex items-center justify-center flex-shrink-0 shadow-inner">
            <XCircle className="w-8 h-8 stroke-[1.6]" />
          </div>
        </div>
      </div>

      {/* BLOCO PRINCIPAL: CONTROLE DE ESTOQUE COM CRUD COMPLETO */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-zinc-200/80 transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <span>Controle de Estoque e Almoxarifado</span>
              <span className="text-xs font-bold px-2.5 py-0.5 bg-blue-50 text-[#2F80ED] rounded-full border border-blue-200">
                Almoxarifado
              </span>
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Acompanhe os níveis de estoque, validades, armários de segurança e movimentações em tempo real
            </p>
          </div>
          <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
            <button
              onClick={abrirModalCriar}
              className="flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 rounded-xl bg-[#2F80ED] hover:bg-blue-600 active:scale-95 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Lote / Item</span>
            </button>
            <button
              onClick={() => {
                if (estoque.length > 0) {
                  setModalMovimento(estoque[0]);
                }
              }}
              className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 active:scale-95 text-zinc-800 text-xs sm:text-sm font-semibold shadow-xs transition-all cursor-pointer border border-zinc-200"
            >
              <ArrowDownUp className="w-4 h-4 text-[#2F80ED]" />
              <span>Registrar Movimento</span>
            </button>
          </div>
        </div>

        {/* Filtros e Busca Espaçosa */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 mb-5">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value);
                setPagina(1);
              }}
              placeholder="Pesquisar produto, CAS ou lote..."
              className="w-full h-10 pl-3.5 pr-9 text-xs sm:text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-[#2F80ED] focus:bg-white transition-all"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          </div>

          <div className="flex items-center gap-1.5 bg-zinc-100/90 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto">
            {(['Todos', 'Normal', 'Baixo', 'Esgotado'] as const).map((st) => (
              <button
                key={st}
                onClick={() => {
                  setFiltroStatus(st);
                  setPagina(1);
                }}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  filtroStatus === st
                    ? 'bg-white text-zinc-900 shadow-2xs font-bold'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* LISTA EM CARDS PARA DISPOSITIVOS MÓVEIS (SMARTPHONES < 768px) */}
        <div className="block md:hidden space-y-3">
          {exibidos.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-400 bg-zinc-50 rounded-xl p-4 border border-dashed border-zinc-200">
              Nenhum reagente localizado com os critérios informados.
            </div>
          ) : (
            exibidos.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-xl p-3.5 border border-zinc-200 shadow-2xs space-y-3"
              >
                {/* Cabeçalho do Card */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3
                      className="font-bold text-zinc-900 text-xs hover:text-[#2F80ED] cursor-pointer leading-tight truncate"
                      onClick={() => setModalVisualizar(item)}
                    >
                      {item.produto}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[11px]">
                      <span className="font-mono text-zinc-500">{item.cas}</span>
                      <span className="text-zinc-300">·</span>
                      <span className="font-mono text-zinc-500">{item.lote}</span>
                    </div>
                  </div>
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-semibold flex-shrink-0 border ${getStatusBadge(
                      item.status
                    )}`}
                  >
                    {item.status}
                  </span>
                </div>

                {/* Métricas do Lote */}
                <div className="grid grid-cols-2 gap-2 text-[11px] bg-zinc-50/80 p-2.5 rounded-lg border border-zinc-100">
                  <div>
                    <span className="text-zinc-400 block text-[10px]">Saldo Físico:</span>
                    <strong className={`font-semibold ${item.quantidadeAtual <= item.estoqueMinimo ? 'text-amber-600' : 'text-zinc-800'}`}>
                      {item.quantidadeAtual} {item.unidade}
                    </strong>
                  </div>
                  <div>
                    <span className="text-zinc-400 block text-[10px]">Estoque Mínimo:</span>
                    <span className="text-zinc-600">{item.estoqueMinimo} {item.unidade}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block text-[10px]">Validade:</span>
                    <span className="font-mono text-zinc-600 text-[10px]">{item.validade}</span>
                  </div>
                  {item.localizacao && (
                    <div>
                      <span className="text-zinc-400 block text-[10px]">Localização:</span>
                      <span className="text-zinc-600 text-[10px] truncate block">{item.localizacao}</span>
                    </div>
                  )}
                </div>

                {/* Ações Mobile */}
                <div className="flex items-center justify-between pt-1 border-t border-zinc-100 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setModalMovimento(item)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-[#2F80ED] text-[11px] font-semibold border border-blue-200/80 active:bg-blue-100 cursor-pointer"
                  >
                    <ArrowDownUp className="w-3 h-3" />
                    <span>Ajustar Saldo</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setModalVisualizar(item)}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-blue-600 bg-zinc-100 hover:bg-zinc-200 transition cursor-pointer"
                      title="Ver Detalhes"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => abrirModalEditar(item)}
                      className="p-1.5 rounded-lg text-amber-600 bg-amber-50 hover:bg-amber-100 transition cursor-pointer"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setItemParaExcluir(item)}
                      className="p-1.5 rounded-lg text-rose-600 bg-rose-50 hover:bg-rose-100 transition cursor-pointer"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Tabela de Estoque no Desktop / Tablet (>= 768px) */}
        <div className="hidden md:block overflow-x-auto rounded-lg border border-zinc-100">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold bg-zinc-50/80 border-b border-zinc-100">
                <th className="py-2.5 pl-3">PRODUTO</th>
                <th className="py-2.5">CAS / LOTE</th>
                <th className="py-2.5">QUANTIDADE ATUAL</th>
                <th className="py-2.5">ESTOQUE MÍNIMO</th>
                <th className="py-2.5">VALIDADE</th>
                <th className="py-2.5">STATUS</th>
                <th className="py-2.5 text-center pr-3">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {exibidos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-xs text-zinc-400">
                    Nenhum reagente localizado com os critérios informados.
                  </td>
                </tr>
              ) : (
                exibidos.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-blue-50/25 transition-colors group"
                  >
                    <td className="py-3.5 sm:py-4 pl-3 font-semibold text-zinc-800 text-xs">
                      <div className="flex flex-col">
                        <span className="text-zinc-900 font-bold hover:text-[#2F80ED] transition cursor-pointer leading-tight text-xs sm:text-sm" onClick={() => setModalVisualizar(item)}>
                          {item.produto}
                        </span>
                        {item.formulaQuimica && (
                          <span className="font-mono text-xs text-blue-600 font-medium tracking-wide">
                            {item.formulaQuimica}
                          </span>
                        )}
                        {item.localizacao && (
                          <span className="text-[11px] text-zinc-400 flex items-center gap-1 font-normal mt-0.5">
                            <MapPin className="w-3 h-3 text-zinc-400" />
                            {item.localizacao}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 sm:py-4 font-mono text-xs text-zinc-600">
                      <div>{item.cas}</div>
                      <div className="text-[11px] text-zinc-400">{item.lote}</div>
                    </td>
                    <td className="py-3.5 sm:py-4 font-bold text-zinc-800 text-xs font-mono">
                      <span className={item.quantidadeAtual <= item.estoqueMinimo ? 'text-amber-600 font-bold' : ''}>
                        {item.quantidadeAtual} {item.unidade}
                      </span>
                    </td>
                    <td className="py-3.5 sm:py-4 text-zinc-500 text-xs font-mono">
                      {item.estoqueMinimo} {item.unidade}
                    </td>
                    <td className="py-3.5 sm:py-4 font-mono text-zinc-600 text-xs">
                      {item.validade}
                    </td>
                    <td className="py-3.5 sm:py-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-semibold border ${getStatusBadge(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3.5 sm:py-4 pr-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Botão Ajustar / Movimentar */}
                        <button
                          onClick={() => setModalMovimento(item)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#2F80ED] text-xs font-bold transition cursor-pointer active:scale-95 border border-blue-200"
                          title="Ajustar saldo (Entrada/Saída)"
                        >
                          <ArrowDownUp className="w-3.5 h-3.5" />
                          <span>Ajustar</span>
                        </button>

                        {/* Botão Visualizar Detalhes */}
                        <button
                          onClick={() => setModalVisualizar(item)}
                          className="p-2 rounded-xl text-zinc-400 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer border border-zinc-200"
                          title="Ver detalhes do lote"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Botão Editar Item */}
                        <button
                          onClick={() => abrirModalEditar(item)}
                          className="p-2 rounded-xl text-zinc-400 hover:text-amber-600 hover:bg-amber-50 transition cursor-pointer border border-zinc-200"
                          title="Editar informações do lote"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {/* Botão Excluir Item */}
                        <button
                          onClick={() => handleExcluir(item.id, item.produto)}
                          className="p-2 rounded-xl text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer border border-zinc-200"
                          title="Excluir item do estoque"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        <div className="flex items-center justify-center gap-1 mt-4 pt-3 border-t border-zinc-100">
          <button
            onClick={() => setPagina((p) => Math.max(1, p - 1))}
            disabled={pagina === 1}
            className="p-1.5 rounded-md border border-zinc-200 text-zinc-600 hover:bg-zinc-50 disabled:opacity-30 transition cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((num) => (
            <button
              key={num}
              onClick={() => setPagina(num)}
              className={`w-7 h-7 rounded-md text-xs font-semibold transition cursor-pointer ${
                pagina === num ? 'bg-[#2F80ED] text-white shadow-xs' : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              {num}
            </button>
          ))}
          <button
            onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
            disabled={pagina === totalPaginas}
            className="p-1.5 rounded-md border border-zinc-200 text-zinc-600 hover:bg-zinc-50 disabled:opacity-30 transition cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. MODAL CRIAR NOVO LOTE / REAGENTE NO ESTOQUE                             */}
      {/* ========================================================================= */}
      {modalNovo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden animate-in zoom-in-95 max-h-[92vh] flex flex-col">
            <div className="px-4 sm:px-5 py-3.5 bg-zinc-900 text-white flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <Boxes className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider">Novo Lote no Estoque</h3>
              </div>
              <button
                onClick={() => setModalNovo(false)}
                className="text-zinc-400 hover:text-white transition cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSalvarNovo} className="p-4 sm:p-5 space-y-3.5 text-xs overflow-y-auto flex-1">
              <div>
                <label className="block text-zinc-700 font-semibold mb-1">Reagente Químico</label>
                {produtosQuimicos.length > 0 ? (
                  <select
                    value={formLote.produto}
                    onChange={(e) => {
                      const sel = produtosQuimicos.find((p) => p.nome === e.target.value);
                      setFormLote({
                        ...formLote,
                        produto: e.target.value,
                        cas: sel ? sel.cas : formLote.cas,
                        unidade: sel ? sel.unidade : formLote.unidade
                      });
                    }}
                    className="w-full h-9 px-3 border border-zinc-300 rounded-lg text-xs bg-white focus:border-[#2F80ED] focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    required
                  >
                    {produtosQuimicos.map((p) => (
                      <option key={p.id} value={p.nome}>
                        {p.nome} ({p.cas})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    placeholder="Ex: Nitrato de Prata P.A."
                    value={formLote.produto}
                    onChange={(e) => setFormLote({ ...formLote, produto: e.target.value })}
                    className="w-full h-9 px-3 border border-zinc-300 rounded-lg text-xs focus:border-[#2F80ED] focus:outline-none"
                  />
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-700 font-semibold mb-1">Número do CAS</label>
                  <input
                    type="text"
                    placeholder="Ex: 7761-88-8"
                    value={formLote.cas}
                    onChange={(e) => setFormLote({ ...formLote, cas: e.target.value })}
                    className="w-full h-9 px-3 border border-zinc-300 rounded-lg text-xs focus:border-[#2F80ED] focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-zinc-700 font-semibold mb-1">Código do Lote</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: LT-2024-992"
                    value={formLote.lote}
                    onChange={(e) => setFormLote({ ...formLote, lote: e.target.value })}
                    className="w-full h-9 px-3 border border-zinc-300 rounded-lg text-xs focus:border-[#2F80ED] focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-zinc-700 font-semibold mb-1">Saldo Atual</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formLote.quantidadeAtual}
                    onChange={(e) => setFormLote({ ...formLote, quantidadeAtual: parseFloat(e.target.value) || 0 })}
                    className="w-full h-9 px-3 border border-zinc-300 rounded-lg text-xs focus:border-[#2F80ED] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-zinc-700 font-semibold mb-1">Mínimo Seguro</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formLote.estoqueMinimo}
                    onChange={(e) => setFormLote({ ...formLote, estoqueMinimo: parseFloat(e.target.value) || 0 })}
                    className="w-full h-9 px-3 border border-zinc-300 rounded-lg text-xs focus:border-[#2F80ED] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-zinc-700 font-semibold mb-1">Unidade</label>
                  <select
                    value={formLote.unidade}
                    onChange={(e) => setFormLote({ ...formLote, unidade: e.target.value })}
                    className="w-full h-9 px-2 border border-zinc-300 rounded-lg text-xs bg-white focus:border-[#2F80ED] focus:outline-none"
                  >
                    <option value="L">Litros (L)</option>
                    <option value="mL">Mililitros (mL)</option>
                    <option value="kg">Quilos (kg)</option>
                    <option value="g">Gramas (g)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-700 font-semibold mb-1">Data de Validade</label>
                  <input
                    type="text"
                    placeholder="Ex: 11/2027 ou MM/AAAA"
                    value={formLote.validade}
                    onChange={(e) => setFormLote({ ...formLote, validade: e.target.value })}
                    className="w-full h-9 px-3 border border-zinc-300 rounded-lg text-xs focus:border-[#2F80ED] focus:outline-none font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-zinc-700 font-semibold mb-1">Local de Armazenamento</label>
                  <input
                    type="text"
                    placeholder="Ex: Armário Corta-fogo 01"
                    value={formLote.localizacao}
                    onChange={(e) => setFormLote({ ...formLote, localizacao: e.target.value })}
                    className="w-full h-9 px-3 border border-zinc-300 rounded-lg text-xs focus:border-[#2F80ED] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-700 font-semibold mb-1">Fornecedor / Distribuidor</label>
                <input
                  type="text"
                  placeholder="Ex: Labsynth Produtos Químicos"
                  value={formLote.fornecedor}
                  onChange={(e) => setFormLote({ ...formLote, fornecedor: e.target.value })}
                  className="w-full h-9 px-3 border border-zinc-300 rounded-lg text-xs focus:border-[#2F80ED] focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-zinc-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalNovo(false)}
                  className="px-4 py-2 rounded-lg text-zinc-600 hover:bg-zinc-100 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#2F80ED] hover:bg-blue-600 text-white font-semibold shadow-xs transition active:scale-95 cursor-pointer"
                >
                  Cadastrar no Estoque
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MODAL EDITAR LOTE / REGISTRO DE ESTOQUE                                 */}
      {/* ========================================================================= */}
      {modalEditar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden animate-in zoom-in-95 max-h-[92vh] flex flex-col">
            <div className="px-4 sm:px-5 py-3.5 bg-zinc-900 text-white flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2 truncate mr-2">
                <Edit2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <h3 className="text-xs font-bold uppercase tracking-wider truncate">Editar Item do Estoque</h3>
              </div>
              <button
                onClick={() => setModalEditar(null)}
                className="text-zinc-400 hover:text-white transition cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSalvarEdicao} className="p-4 sm:p-5 space-y-3.5 text-xs overflow-y-auto flex-1">
              <div>
                <label className="block text-zinc-700 font-semibold mb-1">Nome do Produto</label>
                <input
                  type="text"
                  required
                  value={formLote.produto}
                  onChange={(e) => setFormLote({ ...formLote, produto: e.target.value })}
                  className="w-full h-9 px-3 border border-zinc-300 rounded-lg text-xs focus:border-[#2F80ED] focus:outline-none font-semibold text-zinc-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-700 font-semibold mb-1">CAS</label>
                  <input
                    type="text"
                    value={formLote.cas}
                    onChange={(e) => setFormLote({ ...formLote, cas: e.target.value })}
                    className="w-full h-9 px-3 border border-zinc-300 rounded-lg text-xs focus:border-[#2F80ED] focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-zinc-700 font-semibold mb-1">Código do Lote</label>
                  <input
                    type="text"
                    value={formLote.lote}
                    onChange={(e) => setFormLote({ ...formLote, lote: e.target.value })}
                    className="w-full h-9 px-3 border border-zinc-300 rounded-lg text-xs focus:border-[#2F80ED] focus:outline-none font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-zinc-700 font-semibold mb-1">Saldo Atual</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formLote.quantidadeAtual}
                    onChange={(e) => setFormLote({ ...formLote, quantidadeAtual: parseFloat(e.target.value) || 0 })}
                    className="w-full h-9 px-3 border border-zinc-300 rounded-lg text-xs focus:border-[#2F80ED] focus:outline-none font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-zinc-700 font-semibold mb-1">Mínimo Seguro</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formLote.estoqueMinimo}
                    onChange={(e) => setFormLote({ ...formLote, estoqueMinimo: parseFloat(e.target.value) || 0 })}
                    className="w-full h-9 px-3 border border-zinc-300 rounded-lg text-xs focus:border-[#2F80ED] focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-zinc-700 font-semibold mb-1">Unidade</label>
                  <select
                    value={formLote.unidade}
                    onChange={(e) => setFormLote({ ...formLote, unidade: e.target.value })}
                    className="w-full h-9 px-2 border border-zinc-300 rounded-lg text-xs bg-white focus:border-[#2F80ED] focus:outline-none"
                  >
                    <option value="L">Litros (L)</option>
                    <option value="mL">Mililitros (mL)</option>
                    <option value="kg">Quilos (kg)</option>
                    <option value="g">Gramas (g)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-700 font-semibold mb-1">Validade</label>
                  <input
                    type="text"
                    value={formLote.validade}
                    onChange={(e) => setFormLote({ ...formLote, validade: e.target.value })}
                    className="w-full h-9 px-3 border border-zinc-300 rounded-lg text-xs focus:border-[#2F80ED] focus:outline-none font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-zinc-700 font-semibold mb-1">Localização</label>
                  <input
                    type="text"
                    value={formLote.localizacao}
                    onChange={(e) => setFormLote({ ...formLote, localizacao: e.target.value })}
                    className="w-full h-9 px-3 border border-zinc-300 rounded-lg text-xs focus:border-[#2F80ED] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-700 font-semibold mb-1">Fornecedor</label>
                <input
                  type="text"
                  value={formLote.fornecedor}
                  onChange={(e) => setFormLote({ ...formLote, fornecedor: e.target.value })}
                  className="w-full h-9 px-3 border border-zinc-300 rounded-lg text-xs focus:border-[#2F80ED] focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-zinc-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => handleExcluir(modalEditar.id, modalEditar.produto)}
                  className="text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1 cursor-pointer self-start sm:self-auto"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir Lote</span>
                </button>
                <div className="flex gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setModalEditar(null)}
                    className="px-4 py-2 rounded-lg text-zinc-600 hover:bg-zinc-100 transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-[#2F80ED] hover:bg-blue-600 text-white font-semibold shadow-xs transition active:scale-95 cursor-pointer"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MODAL VISUALIZAR DETALHES DO LOTE NO ESTOQUE                           */}
      {/* ========================================================================= */}
      {modalVisualizar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden animate-in zoom-in-95 max-h-[92vh] flex flex-col">
            <div className="px-4 sm:px-5 py-3.5 bg-zinc-900 text-white flex items-center justify-between flex-shrink-0">
              <div className="min-w-0 mr-2">
                <span className="text-[10px] text-blue-400 font-mono block">{modalVisualizar.cas}</span>
                <h3 className="text-sm font-bold truncate">{modalVisualizar.produto}</h3>
              </div>
              <button
                onClick={() => setModalVisualizar(null)}
                className="text-zinc-400 hover:text-white transition cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-3.5 text-xs overflow-y-auto flex-1">
              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-100 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">Saldo Atual em Estoque:</span>
                  <strong className="text-base font-bold text-zinc-900">
                    {modalVisualizar.quantidadeAtual} {modalVisualizar.unidade}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Mínimo de Segurança:</span>
                  <span className="font-semibold text-zinc-700">
                    {modalVisualizar.estoqueMinimo} {modalVisualizar.unidade}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Identificação do Lote:</span>
                  <span className="font-mono text-zinc-800 font-semibold">{modalVisualizar.lote}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Data de Vencimento:</span>
                  <span className="font-mono text-zinc-800">{modalVisualizar.validade}</span>
                </div>
                {modalVisualizar.localizacao && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Posição no Almoxarifado:</span>
                    <span className="text-zinc-800">{modalVisualizar.localizacao}</span>
                  </div>
                )}
                {modalVisualizar.fornecedor && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Fornecedor Homologado:</span>
                    <span className="text-zinc-800">{modalVisualizar.fornecedor}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-zinc-200/60 flex justify-between items-center">
                  <span className="text-zinc-500">Situação Operacional:</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadge(modalVisualizar.status)}`}>
                    {modalVisualizar.status}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex justify-between items-center border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => {
                    const item = modalVisualizar;
                    setModalVisualizar(null);
                    abrirModalEditar(item);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Editar</span>
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const item = modalVisualizar;
                      setModalVisualizar(null);
                      setModalMovimento(item);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#2F80ED] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <ArrowDownUp className="w-3.5 h-3.5" />
                    <span>Movimentar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalVisualizar(null)}
                    className="px-3.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold transition cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MODAL AJUSTAR / MOVIMENTAR SALDO (ENTRADA / SAÍDA)                     */}
      {/* ========================================================================= */}
      {modalMovimento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden animate-in zoom-in-95 max-h-[92vh] flex flex-col">
            <div className="px-4 sm:px-5 py-3.5 bg-zinc-900 text-white flex items-center justify-between flex-shrink-0">
              <div className="min-w-0 mr-2">
                <span className="text-[10px] text-blue-400 font-mono block">{modalMovimento.cas}</span>
                <h3 className="text-xs font-bold uppercase tracking-wider truncate">{modalMovimento.produto}</h3>
              </div>
              <button
                onClick={() => setModalMovimento(null)}
                className="text-zinc-400 hover:text-white transition cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 sm:p-5 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="flex justify-between items-center bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                <span className="text-zinc-500 font-medium">Saldo Atual no Almoxarifado:</span>
                <span className="text-base font-bold text-zinc-900">
                  {modalMovimento.quantidadeAtual} {modalMovimento.unidade}
                </span>
              </div>

              {/* Seletor Entrada / Saída */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTipoMovimento('entrada')}
                  className={`py-2 rounded-xl flex items-center justify-center gap-1.5 font-semibold transition cursor-pointer ${
                    tipoMovimento === 'entrada'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>Entrada (+)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTipoMovimento('saida')}
                  className={`py-2 rounded-xl flex items-center justify-center gap-1.5 font-semibold transition cursor-pointer ${
                    tipoMovimento === 'saida'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  <TrendingDown className="w-4 h-4" />
                  <span>Saída (-)</span>
                </button>
              </div>

              <div>
                <label className="block text-zinc-600 mb-1 font-medium">
                  Quantidade a movimentar ({modalMovimento.unidade})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={qtdMovimento}
                  onChange={(e) => setQtdMovimento(e.target.value)}
                  className="w-full h-9 px-3 border border-zinc-300 rounded-lg text-xs focus:border-[#2F80ED] focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-600 mb-1 font-medium">
                  Justificativa / Aula Prática / Nota Fiscal
                </label>
                <input
                  type="text"
                  placeholder="Ex: Aula de Química Orgânica - Turma 3B"
                  value={motivoMovimento}
                  onChange={(e) => setMotivoMovimento(e.target.value)}
                  className="w-full h-9 px-3 border border-zinc-300 rounded-lg text-xs focus:border-[#2F80ED] focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 border-t border-zinc-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalMovimento(null)}
                  className="px-4 py-2 rounded-lg text-xs text-zinc-600 hover:bg-zinc-100 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const delta = Number(qtdMovimento) || 0;
                    if (delta <= 0) return;
                    let novoTotal =
                      tipoMovimento === 'entrada'
                        ? modalMovimento.quantidadeAtual + delta
                        : Math.max(0, modalMovimento.quantidadeAtual - delta);
                    onUpdateQuantidade(modalMovimento.id, Number(novoTotal.toFixed(2)));
                    onAddMovimentacao(modalMovimento.id, tipoMovimento, delta, motivoMovimento);
                    setModalMovimento(null);
                  }}
                  className="px-4 py-2 rounded-lg bg-[#2F80ED] hover:bg-blue-600 text-white text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer"
                >
                  Confirmar Movimentação
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Modal de Confirmação de Exclusão de Lote */}
      {itemParaExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-zinc-200 p-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900">Excluir Lote do Estoque</h3>
                <p className="text-xs text-zinc-500">Esta ação removerá o lote do controle físico.</p>
              </div>
            </div>

            <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 mb-4 text-xs space-y-1">
              <p className="font-semibold text-zinc-800">{itemParaExcluir.produto}</p>
              <div className="flex justify-between text-zinc-500 font-mono text-[11px]">
                <span>Lote: {itemParaExcluir.lote}</span>
                <span>Saldo: {itemParaExcluir.quantidadeAtual} {itemParaExcluir.unidade}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setItemParaExcluir(null)}
                className="px-3.5 py-2 rounded-lg text-xs text-zinc-600 hover:bg-zinc-100 font-medium transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (onDeleteEstoque) onDeleteEstoque(itemParaExcluir.id);
                  if (modalVisualizar?.id === itemParaExcluir.id) setModalVisualizar(null);
                  if (modalEditar?.id === itemParaExcluir.id) setModalEditar(null);
                  if (modalMovimento?.id === itemParaExcluir.id) setModalMovimento(null);
                  setItemParaExcluir(null);
                }}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer"
              >
                Sim, Excluir Lote
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
