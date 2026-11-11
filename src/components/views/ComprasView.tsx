import React, { useState } from 'react';
import { CompraItem, Fornecedor } from '../../types';
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  FileSpreadsheet,
  Search,
  Plus,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Trash2,
  Edit2,
  Truck,
  Package
} from 'lucide-react';

interface ComprasViewProps {
  compras: CompraItem[];
  fornecedores: Fornecedor[];
  produtosDisponiveis: string[];
  onAddCompra: (c: CompraItem) => void;
  onUpdateCompra?: (c: CompraItem) => void;
  onUpdateCompraStatus: (id: string, status: 'Cotação' | 'Aguardando aprovação' | 'Pedido realizado' | 'Recebido') => void;
  onDeleteCompra: (id: string) => void;
  produtoPreSelecionado?: string;
}

export const ComprasView: React.FC<ComprasViewProps> = ({
  compras,
  fornecedores,
  produtosDisponiveis,
  onAddCompra,
  onUpdateCompra,
  onUpdateCompraStatus,
  onDeleteCompra,
  produtoPreSelecionado
}) => {
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<
    'Todos' | 'Cotação' | 'Aguardando aprovação' | 'Pedido realizado' | 'Recebido'
  >('Todos');
  const [pagina, setPagina] = useState(1);
  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [modalVisualizar, setModalVisualizar] = useState<CompraItem | null>(null);
  const [modalEditar, setModalEditar] = useState<CompraItem | null>(null);
  const [compraParaExcluir, setCompraParaExcluir] = useState<CompraItem | null>(null);
  const [compraParaReceber, setCompraParaReceber] = useState<CompraItem | null>(null);

  // Estados para seleção ou criação de Fornecedor e Produto na Compra
  const [fornecedorSelecionado, setFornecedorSelecionado] = useState<string>('');
  const [fornecedorManual, setFornecedorManual] = useState<boolean>(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState<string>('');
  const [produtoManual, setProdutoManual] = useState<boolean>(false);

  React.useEffect(() => {
    if (modalNovoAberto) {
      if (fornecedores.length > 0) {
        setFornecedorSelecionado(fornecedores[0].razaoSocial);
        setFornecedorManual(false);
      } else {
        setFornecedorManual(true);
      }

      if (produtoPreSelecionado) {
        setProdutoSelecionado(produtoPreSelecionado);
        setProdutoManual(false);
      } else if (produtosDisponiveis.length > 0) {
        setProdutoSelecionado(produtosDisponiveis[0]);
        setProdutoManual(false);
      } else {
        setProdutoManual(true);
      }
    }
  }, [modalNovoAberto, fornecedores, produtosDisponiveis, produtoPreSelecionado]);

  React.useEffect(() => {
    if (produtoPreSelecionado) {
      setModalNovoAberto(true);
    }
  }, [produtoPreSelecionado]);

  const comprasFiltradas = compras.filter((c) => {
    const matchBusca =
      c.id.toLowerCase().includes(busca.toLowerCase()) ||
      c.produto.toLowerCase().includes(busca.toLowerCase()) ||
      c.fornecedor.toLowerCase().includes(busca.toLowerCase());

    let matchStatus = true;
    if (filtroStatus !== 'Todos') {
      matchStatus = c.status === filtroStatus;
    }

    return matchBusca && matchStatus;
  });

  const totalPedidos = compras.length;
  const aguardando = compras.filter((c) => c.status === 'Aguardando aprovação').length;
  const emCotacao = compras.filter((c) => c.status === 'Cotação').length;
  const concluidos = compras.filter((c) => c.status === 'Recebido').length;

  const itensPorPagina = 8;
  const totalPaginas = Math.ceil(comprasFiltradas.length / itensPorPagina) || 1;
  const exibidas = comprasFiltradas.slice((pagina - 1) * itensPorPagina, pagina * itensPorPagina);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Recebido':
        return 'bg-emerald-50 text-emerald-700 border-emerald-300';
      case 'Pedido realizado':
        return 'bg-purple-50 text-purple-700 border-purple-300';
      case 'Aguardando aprovação':
        return 'bg-amber-50 text-amber-700 border-amber-300';
      case 'Cotação':
      default:
        return 'bg-blue-50 text-blue-700 border-blue-300';
    }
  };

  return (
    <div className="space-y-4">
      {/* 4 CARDS DE MÉTRICAS - AZUL PREDOMINANTE COM DETALHES DE CORES DIFERENTES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 sm:gap-6">
        {/* Card 1: Total de pedidos - Detalhe Ciano */}
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
              <h3 className="text-sm sm:text-base font-bold text-white/95">Total Pedidos</h3>
            </div>
            <div className="text-3xl sm:text-4xl font-black text-white tracking-tight font-mono leading-none">
              {totalPedidos}
            </div>
            <p className="text-xs text-sky-100 font-medium">Processados este ano</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-sky-400/20 text-white border border-sky-300/30 flex items-center justify-center flex-shrink-0 shadow-inner">
            <ShoppingBag className="w-8 h-8 stroke-[1.6]" />
          </div>
        </div>

        {/* Card 2: Aguardando aprovação - Detalhe Violeta */}
        <div
          onClick={() => setFiltroStatus('Aguardando aprovação')}
          className="bg-gradient-to-br from-[#2B7FFF] to-[#1E6BDB] text-white rounded-3xl p-6 sm:p-7 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-out cursor-pointer flex items-center justify-between min-h-[135px] border border-blue-400/30"
        >
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-300" />
              <h3 className="text-sm sm:text-base font-bold text-white/95">Em Aprovação</h3>
            </div>
            <div className="text-3xl sm:text-4xl font-black text-white tracking-tight font-mono leading-none">
              {aguardando}
            </div>
            <p className="text-xs text-purple-100 font-medium">Reitoria / Finanças</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-purple-400/25 text-purple-100 border border-purple-300/40 flex items-center justify-center flex-shrink-0 shadow-inner">
            <Clock className="w-8 h-8 stroke-[1.6]" />
          </div>
        </div>

        {/* Card 3: Em cotação - Detalhe Âmbar */}
        <div
          onClick={() => setFiltroStatus('Cotação')}
          className="bg-gradient-to-br from-[#2B7FFF] to-[#1E6BDB] text-white rounded-3xl p-6 sm:p-7 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-out cursor-pointer flex items-center justify-between min-h-[135px] border border-blue-400/30"
        >
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-300" />
              <h3 className="text-sm sm:text-base font-bold text-white/95">Em Cotação</h3>
            </div>
            <div className="text-3xl sm:text-4xl font-black text-white tracking-tight font-mono leading-none">
              {emCotacao}
            </div>
            <p className="text-xs text-amber-100 font-medium">Comparando propostas</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-amber-400/25 text-amber-100 border border-amber-300/40 flex items-center justify-center flex-shrink-0 shadow-inner">
            <TrendingUp className="w-8 h-8 stroke-[1.6]" />
          </div>
        </div>

        {/* Card 4: Concluídos - Detalhe Esmeralda */}
        <div
          onClick={() => setFiltroStatus('Recebido')}
          className="bg-gradient-to-br from-[#2B7FFF] to-[#1E6BDB] text-white rounded-3xl p-6 sm:p-7 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-out cursor-pointer flex items-center justify-between min-h-[135px] border border-blue-400/30"
        >
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-300" />
              <h3 className="text-sm sm:text-base font-bold text-white/95">Concluídos</h3>
            </div>
            <div className="text-3xl sm:text-4xl font-black text-white tracking-tight font-mono leading-none">
              {concluidos}
            </div>
            <p className="text-xs text-emerald-100 font-medium">Materiais entregues</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-emerald-400/25 text-emerald-100 border border-emerald-300/40 flex items-center justify-center flex-shrink-0 shadow-inner">
            <CheckCircle2 className="w-8 h-8 stroke-[1.6]" />
          </div>
        </div>
      </div>

      {/* BLOCO PRINCIPAL: GESTÃO DE COMPRAS */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-zinc-200/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="text-base font-bold text-zinc-900">Gestão de Compras e Cotações</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Acompanhe pedidos, cotações e aquisições de reagentes</p>
          </div>
          <button
            onClick={() => setModalNovoAberto(true)}
            className="flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 rounded-xl bg-[#2F80ED] hover:bg-blue-600 active:scale-95 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 transition cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Compra</span>
          </button>
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
              placeholder="Pesquisar pedido ou produto..."
              className="w-full h-10 pl-3.5 pr-9 text-xs sm:text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-[#2F80ED] focus:bg-white transition"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          </div>

          <div className="flex items-center gap-1.5 bg-zinc-100/90 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto flex-wrap">
            {(['Todos', 'Cotação', 'Aguardando aprovação', 'Pedido realizado', 'Recebido'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setFiltroStatus(st)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  filtroStatus === st ? 'bg-white text-zinc-900 shadow-2xs font-bold' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* LISTA EM CARDS PARA DISPOSITIVOS MÓVEIS (SMARTPHONES < 768px) */}
        <div className="block md:hidden space-y-3">
          {exibidas.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-400 bg-zinc-50 rounded-xl p-4 border border-dashed border-zinc-200">
              Nenhum pedido de compra localizado com os filtros selecionados.
            </div>
          ) : (
            exibidas.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-xl p-3.5 border border-zinc-200 shadow-2xs space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-[10px] text-zinc-400 block">{item.id}</span>
                    <h3 className="font-bold text-zinc-900 text-xs leading-tight">{item.produto}</h3>
                    <span className="text-[11px] text-zinc-500 block mt-0.5 truncate max-w-[200px]">{item.fornecedor}</span>
                  </div>
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-semibold border flex-shrink-0 ${getStatusBadge(
                      item.status
                    )}`}
                  >
                    {item.status}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] bg-zinc-50 p-2 rounded-lg border border-zinc-100">
                  <div>
                    <span className="text-zinc-400 text-[10px] block">Quantidade:</span>
                    <strong className="text-zinc-800">{item.quantidade}</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-zinc-400 text-[10px] block">Valor Total:</span>
                    <strong className="text-[#2F80ED] font-bold">R$ {item.valor.toFixed(2).replace('.', ',')}</strong>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-zinc-100 gap-1.5 flex-wrap">
                  <span className="font-mono text-[10px] text-zinc-400">{item.data}</span>
                  <div className="flex items-center gap-1">
                    {item.status === 'Cotação' && (
                      <button
                        type="button"
                        onClick={() => onUpdateCompraStatus(item.id, 'Aguardando aprovação')}
                        className="px-2 py-0.5 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-[10px] border border-amber-200 transition cursor-pointer"
                        title="Enviar para aprovação da reitoria/coordenação"
                      >
                        Pedir Aprovação
                      </button>
                    )}
                    {item.status === 'Aguardando aprovação' && (
                      <button
                        type="button"
                        onClick={() => onUpdateCompraStatus(item.id, 'Pedido realizado')}
                        className="px-2 py-0.5 rounded-md bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-[10px] border border-purple-200 transition cursor-pointer"
                        title="Aprovar e realizar pedido junto ao fornecedor"
                      >
                        Aprovar Pedido
                      </button>
                    )}
                    {item.status === 'Pedido realizado' && (
                      <button
                        type="button"
                        onClick={() => setCompraParaReceber(item)}
                        className="px-2.5 py-0.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] shadow-2xs transition cursor-pointer"
                        title="Dar entrada física no estoque do laboratório"
                      >
                        ✓ Receber no Lab
                      </button>
                    )}
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
                      onClick={() => setModalEditar(item)}
                      className="p-1.5 rounded-lg text-amber-600 bg-amber-50 hover:bg-amber-100 transition cursor-pointer"
                      title="Editar Pedido"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCompraParaExcluir(item)}
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

        {/* Tabela de Compras no Desktop / Tablet (>= 768px) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold border-b border-zinc-100">
                <th className="pb-2.5 pl-1">CÓDIGO</th>
                <th className="pb-2.5">PRODUTO</th>
                <th className="pb-2.5">QUANTIDADE</th>
                <th className="pb-2.5">FORNECEDOR</th>
                <th className="pb-2.5">VALOR TOTAL</th>
                <th className="pb-2.5">DATA</th>
                <th className="pb-2.5">STATUS</th>
                <th className="pb-2.5 text-center pr-1">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {exibidas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-zinc-400">
                    Nenhum pedido de compra localizado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                exibidas.map((item) => (
                  <tr key={item.id} className="hover:bg-blue-50/20 transition group">
                    <td className="py-3.5 sm:py-4 pl-2 font-semibold text-zinc-900 text-xs">
                      {item.id}
                    </td>
                    <td className="py-3.5 sm:py-4 text-zinc-900 font-semibold text-xs">
                      {item.produto}
                    </td>
                    <td className="py-3.5 sm:py-4 text-zinc-600 text-xs">
                      {item.quantidade}
                    </td>
                    <td className="py-3.5 sm:py-4 text-zinc-600 text-xs max-w-[180px] truncate" title={item.fornecedor}>
                      {item.fornecedor}
                    </td>
                    <td className="py-3.5 sm:py-4 font-bold text-zinc-900 text-xs font-mono">
                      R$ {item.valor.toFixed(2).replace('.', ',')}
                    </td>
                    <td className="py-3.5 sm:py-4 font-mono text-zinc-500 text-xs">
                      {item.data}
                    </td>
                    <td className="py-3.5 sm:py-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-semibold border ${getStatusBadge(item.status)}`}>
                          {item.status}
                        </span>
                        {item.status === 'Cotação' && (
                          <button
                            type="button"
                            onClick={() => onUpdateCompraStatus(item.id, 'Aguardando aprovação')}
                            className="text-[10px] px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold border border-amber-200 transition cursor-pointer"
                            title="Avançar: Solicitar Aprovação"
                          >
                            + Aprovar
                          </button>
                        )}
                        {item.status === 'Aguardando aprovação' && (
                          <button
                            type="button"
                            onClick={() => onUpdateCompraStatus(item.id, 'Pedido realizado')}
                            className="text-[10px] px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold border border-purple-200 transition cursor-pointer"
                            title="Avançar: Realizar Pedido"
                          >
                            + Encomendar
                          </button>
                        )}
                        {item.status === 'Pedido realizado' && (
                          <button
                            type="button"
                            onClick={() => setCompraParaReceber(item)}
                            className="text-[10px] px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition cursor-pointer shadow-2xs"
                            title="Registrar recebimento e dar entrada física no estoque"
                          >
                            ✓ Receber no Lab
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 sm:py-4 pr-2 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setModalVisualizar(item)}
                          className="p-2 rounded-xl text-zinc-400 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer border border-zinc-200"
                          title="Ver detalhes da compra"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setModalEditar(item)}
                          className="p-2 rounded-xl text-zinc-400 hover:text-amber-600 hover:bg-amber-50 transition cursor-pointer border border-zinc-200"
                          title="Editar pedido de compra"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setCompraParaExcluir(item)}
                          className="p-2 rounded-xl text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer border border-zinc-200"
                          title="Cancelar pedido de compra"
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
        <div className="flex items-center justify-center gap-1 mt-5 pt-3 border-t border-zinc-100">
          <button
            onClick={() => setPagina((p) => Math.max(1, p - 1))}
            disabled={pagina === 1}
            className="p-1 rounded-md border border-zinc-200 text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 transition"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          {[1, 2, 3].map((num) => (
            <button
              key={num}
              onClick={() => setPagina(num)}
              className={`w-7 h-7 rounded-md text-xs font-semibold transition ${
                pagina === num ? 'bg-[#2F80ED] text-white' : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              {num}
            </button>
          ))}
          <button
            onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
            disabled={pagina === totalPaginas}
            className="p-1 rounded-md border border-zinc-200 text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 transition"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* MODAL NOVA COMPRA */}
      {modalNovoAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-3.5 bg-zinc-900 text-white flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider">Novo Pedido de Compra</h3>
              <button onClick={() => setModalNovoAberto(false)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                const produtoFinal = produtoManual
                  ? (form.get('produtoManual') as string)
                  : (form.get('produto') as string) || (form.get('produtoManual') as string);
                const fornecedorFinal = fornecedorManual
                  ? (form.get('fornecedorManual') as string)
                  : (form.get('fornecedor') as string) || (form.get('fornecedorManual') as string);

                const nova: CompraItem = {
                  id: `COM-${Date.now().toString().slice(-5)}`,
                  produto: (produtoFinal || 'Reagente Químico').trim(),
                  quantidade: ((form.get('quantidade') as string) || '').trim(),
                  fornecedor: (fornecedorFinal || 'Fornecedor Homologado').trim(),
                  valor: Number(form.get('valor')) || 0,
                  data: new Date().toLocaleDateString('pt-BR'),
                  status: (form.get('status') as any) || 'Cotação'
                };
                onAddCompra(nova);
                setModalNovoAberto(false);
              }}
              className="p-5 space-y-3.5 text-xs"
            >
              <div className="space-y-3">
                {/* PRODUTO */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-zinc-700 font-bold text-xs flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-[#2B7FFF]" />
                      <span>Reagente / Item Solicitado</span>
                    </label>
                    {produtosDisponiveis.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setProdutoManual(!produtoManual)}
                        className="text-[10px] text-blue-600 hover:underline font-semibold cursor-pointer"
                      >
                        {produtoManual ? 'Selecionar da lista' : '+ Digitar outro nome'}
                      </button>
                    )}
                  </div>
                  {produtosDisponiveis.length > 0 && !produtoManual ? (
                    <select
                      name="produto"
                      value={produtoSelecionado}
                      onChange={(e) => {
                        if (e.target.value === '__OUTRO__') {
                          setProdutoManual(true);
                        } else {
                          setProdutoSelecionado(e.target.value);
                        }
                      }}
                      required
                      className="w-full h-8.5 px-2.5 border border-zinc-300 rounded-lg text-xs bg-white text-zinc-900 focus:border-[#2B7FFF] focus:outline-none"
                    >
                      {produtosDisponiveis.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                      <option value="__OUTRO__">+ Digitar outro reagente...</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      name="produtoManual"
                      required
                      defaultValue={produtoPreSelecionado || ''}
                      placeholder="Ex: Acetona P.A., Ácido Sulfúrico 98%, Álcool Etílico..."
                      className="w-full h-8.5 px-2.5 border border-zinc-300 rounded-lg text-xs text-zinc-900 focus:border-[#2B7FFF] focus:outline-none"
                    />
                  )}
                </div>

                {/* QUANTIDADE E VALOR */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-zinc-600 mb-1 font-bold">Quantidade</label>
                    <input
                      type="text"
                      name="quantidade"
                      required
                      placeholder="Ex: 5 L ou 2 kg"
                      className="w-full h-8.5 px-2.5 border border-zinc-300 rounded-lg text-xs focus:border-[#2B7FFF] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-600 mb-1 font-bold">Valor Estimado (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="valor"
                      required
                      placeholder="Ex: 350.00"
                      className="w-full h-8.5 px-2.5 border border-zinc-300 rounded-lg text-xs focus:border-[#2B7FFF] focus:outline-none"
                    />
                  </div>
                </div>

                {/* FORNECEDOR CADASTRADO */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-zinc-700 font-bold text-xs flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-[#2B7FFF]" />
                      <span>Fornecedor Selecionado</span>
                    </label>
                    {fornecedores.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setFornecedorManual(!fornecedorManual)}
                        className="text-[10px] text-blue-600 hover:underline font-semibold cursor-pointer"
                      >
                        {fornecedorManual ? 'Selecionar da lista de fornecedores' : '+ Digitar novo fornecedor'}
                      </button>
                    )}
                  </div>
                  {fornecedores.length > 0 && !fornecedorManual ? (
                    <div className="space-y-1">
                      <select
                        name="fornecedor"
                        value={fornecedorSelecionado}
                        onChange={(e) => {
                          if (e.target.value === '__NOVO__') {
                            setFornecedorManual(true);
                          } else {
                            setFornecedorSelecionado(e.target.value);
                          }
                        }}
                        required
                        className="w-full h-8.5 px-2.5 border border-zinc-300 rounded-lg text-xs bg-white text-zinc-900 focus:border-[#2B7FFF] focus:outline-none font-medium"
                      >
                        {fornecedores.map((f) => (
                          <option key={f.id} value={f.razaoSocial}>
                            {f.razaoSocial} {f.cnpj ? `— CNPJ: ${f.cnpj}` : ''} ({f.status})
                          </option>
                        ))}
                        <option value="__NOVO__">+ Inserir / Digitar outro fornecedor...</option>
                      </select>
                      <span className="text-[10px] text-zinc-400 block">
                        Lista de fornecedores cadastrados ({fornecedores.length} empresas disponíveis)
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <input
                        type="text"
                        name="fornecedorManual"
                        required
                        placeholder="Digite o nome do fornecedor ou distribuidora..."
                        className="w-full h-8.5 px-2.5 border border-zinc-300 rounded-lg text-xs text-zinc-900 focus:border-[#2B7FFF] focus:outline-none"
                      />
                      {fornecedores.length === 0 && (
                        <p className="text-[10px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                          Nenhum fornecedor cadastrado ainda. O nome digitado será vinculado a este pedido de compra. Você também pode homologar fornecedores completos na aba <strong>Fornecedores</strong>.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* STATUS INICIAL */}
                <div>
                  <label className="block text-zinc-600 mb-1 font-bold">Status Inicial</label>
                  <select
                    name="status"
                    className="w-full h-8.5 px-2.5 border border-zinc-300 rounded-lg text-xs bg-white focus:border-[#2B7FFF] focus:outline-none"
                  >
                    <option value="Cotação">Cotação</option>
                    <option value="Aguardando aprovação">Aguardando aprovação</option>
                    <option value="Pedido realizado">Pedido realizado</option>
                    <option value="Recebido">Recebido</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalNovoAberto(false)}
                  className="px-3.5 py-1.5 text-xs text-zinc-600 hover:bg-zinc-100 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#2B7FFF] hover:bg-blue-600 text-white text-xs font-semibold cursor-pointer shadow-2xs"
                >
                  Criar Pedido de Compra
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR COMPRA */}
      {modalEditar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-3.5 bg-zinc-900 text-white flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider">Editar Pedido de Compra: {modalEditar.id}</h3>
              <button onClick={() => setModalEditar(null)} className="text-zinc-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                const atualizado: CompraItem = {
                  ...modalEditar,
                  produto: form.get('produto') as string,
                  quantidade: form.get('quantidade') as string,
                  fornecedor: form.get('fornecedor') as string,
                  valor: Number(form.get('valor')) || 0,
                  status: (form.get('status') as any) || modalEditar.status
                };
                if (onUpdateCompra) {
                  onUpdateCompra(atualizado);
                } else {
                  onUpdateCompraStatus(modalEditar.id, atualizado.status);
                }
                setModalEditar(null);
              }}
              className="p-5 space-y-3 text-xs"
            >
              <div className="space-y-2.5">
                <div>
                  <label className="block text-zinc-600 mb-1 font-bold">Reagente / Item Solicitado</label>
                  <input
                    type="text"
                    name="produto"
                    defaultValue={modalEditar.produto}
                    required
                    className="w-full h-8 px-2.5 border border-zinc-300 rounded-lg text-xs focus:border-[#2F80ED] focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-zinc-600 mb-1 font-bold">Quantidade</label>
                    <input
                      type="text"
                      name="quantidade"
                      defaultValue={modalEditar.quantidade}
                      required
                      className="w-full h-8 px-2.5 border border-zinc-300 rounded-lg text-xs focus:border-[#2F80ED] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-600 mb-1 font-bold">Valor Total (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="valor"
                      defaultValue={modalEditar.valor}
                      required
                      className="w-full h-8 px-2.5 border border-zinc-300 rounded-lg text-xs focus:border-[#2F80ED] focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-zinc-600 mb-1 font-bold">Fornecedor</label>
                  {fornecedores.length > 0 ? (
                    <select
                      name="fornecedor"
                      defaultValue={modalEditar.fornecedor}
                      required
                      className="w-full h-8 px-2 border border-zinc-300 rounded-lg text-xs bg-white focus:border-[#2F80ED] focus:outline-none"
                    >
                      {fornecedores.map((f) => (
                        <option key={f.id} value={f.razaoSocial}>
                          {f.razaoSocial} {f.cnpj ? `— CNPJ: ${f.cnpj}` : ''} ({f.status})
                        </option>
                      ))}
                      {!fornecedores.some((f) => f.razaoSocial === modalEditar.fornecedor) && (
                        <option value={modalEditar.fornecedor}>{modalEditar.fornecedor}</option>
                      )}
                    </select>
                  ) : (
                    <input
                      type="text"
                      name="fornecedor"
                      defaultValue={modalEditar.fornecedor}
                      required
                      className="w-full h-8 px-2.5 border border-zinc-300 rounded-lg text-xs focus:border-[#2F80ED] focus:outline-none"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-zinc-600 mb-1 font-bold">Status do Pedido</label>
                  <select
                    name="status"
                    defaultValue={modalEditar.status}
                    className="w-full h-8 px-2 border border-zinc-300 rounded-lg text-xs bg-white focus:border-[#2F80ED] focus:outline-none"
                  >
                    <option value="Cotação">Cotação</option>
                    <option value="Aguardando aprovação">Aguardando aprovação</option>
                    <option value="Pedido realizado">Pedido realizado</option>
                    <option value="Recebido">Recebido</option>
                  </select>
                </div>
              </div>
              <div className="pt-3 border-t border-zinc-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalEditar(null)}
                  className="px-3.5 py-1.5 text-xs text-zinc-600 hover:bg-zinc-100 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#2F80ED] hover:bg-blue-600 text-white text-xs font-semibold cursor-pointer"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL VISUALIZAR COMPRA */}
      {modalVisualizar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 bg-zinc-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-blue-400">{modalVisualizar.id}</span>
                <h3 className="text-sm font-bold">Ordem de Compra: {modalVisualizar.produto}</h3>
              </div>
              <button onClick={() => setModalVisualizar(null)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-100 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Produto Químico:</span>
                  <strong className="text-zinc-900">{modalVisualizar.produto}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Fornecedor:</span>
                  <span className="text-zinc-800">{modalVisualizar.fornecedor}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Volume Comprado:</span>
                  <span>{modalVisualizar.quantidade}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Valor Total:</span>
                  <strong className="text-[#2F80ED] text-sm">
                    R$ {modalVisualizar.valor.toFixed(2).replace('.', ',')}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Data do Pedido:</span>
                  <span>{modalVisualizar.data}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-100 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Atualizar Etapa:</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['Cotação', 'Aguardando aprovação', 'Pedido realizado', 'Recebido'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => {
                        onUpdateCompraStatus(modalVisualizar.id, st);
                        setModalVisualizar({ ...modalVisualizar, status: st });
                      }}
                      className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition ${
                        modalVisualizar.status === st
                          ? 'bg-[#2F80ED] text-white border-[#2F80ED]'
                          : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border-zinc-200'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-between items-center">
                <button
                  onClick={() => {
                    setCompraParaExcluir(modalVisualizar);
                  }}
                  className="text-rose-600 hover:underline text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Cancelar Pedido</span>
                </button>
                <button
                  onClick={() => setModalVisualizar(null)}
                  className="px-4 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-xs font-semibold"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Modal de Confirmação de Cancelamento de Pedido */}
      {compraParaExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-zinc-200 p-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900">Cancelar Ordem de Compra</h3>
                <p className="text-xs text-zinc-500">Esta ação cancelará o pedido no sistema.</p>
              </div>
            </div>

            <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 mb-4 text-xs space-y-1">
              <p className="font-semibold text-zinc-800">
                <span className="text-blue-600 font-mono">{compraParaExcluir.id}</span> · {compraParaExcluir.produto}
              </p>
              <div className="flex justify-between text-zinc-500 font-mono text-[11px]">
                <span>Qtd: {compraParaExcluir.quantidade}</span>
                <span>Total: R$ {compraParaExcluir.valor.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setCompraParaExcluir(null)}
                className="px-3.5 py-2 rounded-lg text-xs text-zinc-600 hover:bg-zinc-100 font-medium transition cursor-pointer"
              >
                Voltar
              </button>
              <button
                onClick={() => {
                  onDeleteCompra(compraParaExcluir.id);
                  if (modalVisualizar?.id === compraParaExcluir.id) setModalVisualizar(null);
                  setCompraParaExcluir(null);
                }}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer"
              >
                Sim, Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Recebimento no Laboratório */}
      {compraParaReceber && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-zinc-200 p-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-emerald-600 mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900">Receber Pedido no Lab</h3>
                <p className="text-xs text-zinc-500">Confirmar entrega e atualizar inventário.</p>
              </div>
            </div>

            <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 mb-3 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-zinc-500">Reagente:</span>
                <strong className="text-zinc-900">{compraParaReceber.produto}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Volume Comprado:</span>
                <strong className="text-emerald-700 font-mono">{compraParaReceber.quantidade}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Fornecedor:</span>
                <span className="text-zinc-700">{compraParaReceber.fornecedor}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Valor Pago:</span>
                <span className="font-mono text-zinc-800">R$ {compraParaReceber.valor.toFixed(2).replace('.', ',')}</span>
              </div>
            </div>

            <p className="text-[11px] text-zinc-500 mb-4 leading-relaxed bg-blue-50/70 p-2.5 rounded-lg border border-blue-200 text-blue-900">
              💡 <strong>Ação Automática:</strong> Ao confirmar, o saldo do reagente será adicionado ao estoque do laboratório e uma notificação de reposição será registrada no mural de avisos.
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setCompraParaReceber(null)}
                className="px-3.5 py-2 rounded-lg text-xs text-zinc-600 hover:bg-zinc-100 font-medium transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onUpdateCompraStatus(compraParaReceber.id, 'Recebido');
                  if (modalVisualizar?.id === compraParaReceber.id) {
                    setModalVisualizar({ ...modalVisualizar, status: 'Recebido' });
                  }
                  setCompraParaReceber(null);
                }}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer"
              >
                Confirmar Entrada no Estoque
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
