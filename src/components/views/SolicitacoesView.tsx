import React, { useState } from 'react';
import { SolicitacaoLaboratorio } from '../../types';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  Plus,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Building,
  Check,
  Trash2
} from 'lucide-react';

interface SolicitacoesViewProps {
  solicitacoes: SolicitacaoLaboratorio[];
  onAddSolicitacao: (s: SolicitacaoLaboratorio) => void;
  onUpdateSolicitacaoStatus: (id: string, status: 'Em análise' | 'Aprovada' | 'Pendência' | 'Reprovada') => void;
  onDeleteSolicitacao?: (id: string) => void;
  produtosDisponiveis: string[];
}

export const SolicitacoesView: React.FC<SolicitacoesViewProps> = ({
  solicitacoes,
  onAddSolicitacao,
  onUpdateSolicitacaoStatus,
  onDeleteSolicitacao,
  produtosDisponiveis
}) => {
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'Todos' | 'Em análise' | 'Aprovadas' | 'Pendências' | 'Reprovadas'>('Todos');
  const [pagina, setPagina] = useState(1);
  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [modalVisualizar, setModalVisualizar] = useState<SolicitacaoLaboratorio | null>(null);
  const [solicitacaoParaExcluir, setSolicitacaoParaExcluir] = useState<SolicitacaoLaboratorio | null>(null);

  const solicitacoesFiltradas = solicitacoes.filter((s) => {
    const matchBusca =
      s.id.toLowerCase().includes(busca.toLowerCase()) ||
      s.solicitante.toLowerCase().includes(busca.toLowerCase()) ||
      s.produto.toLowerCase().includes(busca.toLowerCase()) ||
      s.orgao.toLowerCase().includes(busca.toLowerCase());

    let matchStatus = true;
    if (filtroStatus === 'Em análise') matchStatus = s.status === 'Em análise';
    else if (filtroStatus === 'Aprovadas') matchStatus = s.status === 'Aprovada';
    else if (filtroStatus === 'Pendências') matchStatus = s.status === 'Pendência';
    else if (filtroStatus === 'Reprovadas') matchStatus = s.status === 'Reprovada';

    return matchBusca && matchStatus;
  });

  const total = solicitacoes.length;
  const emAnalise = solicitacoes.filter((s) => s.status === 'Em análise').length;
  const aprovadas = solicitacoes.filter((s) => s.status === 'Aprovada').length;
  const pendencias = solicitacoes.filter((s) => s.status === 'Pendência').length;

  const itensPorPagina = 8;
  const totalPaginas = Math.ceil(solicitacoesFiltradas.length / itensPorPagina) || 1;
  const exibidas = solicitacoesFiltradas.slice((pagina - 1) * itensPorPagina, pagina * itensPorPagina);

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'Aprovada':
        return 'bg-[#70e000]/25 text-[#1b7a00] border-[#38b000]/40';
      case 'Em análise':
        return 'bg-[#2F80ED]/20 text-[#1d4ed8] border-[#2F80ED]/40';
      case 'Pendência':
        return 'bg-[#ffde59]/50 text-[#b45309] border-[#eab308]/60';
      case 'Reprovada':
        return 'bg-[#ff8fa3]/30 text-[#e11d48] border-[#f43f5e]/40';
      default:
        return 'bg-zinc-100 text-zinc-700';
    }
  };

  return (
    <div className="space-y-4">
      {/* 4 CARDS DE MÉTRICAS ROYAL BLUE FIÉIS AO FIGMA */}
      {/* 4 CARDS DE MÉTRICAS ROYAL BLUE COM DETALHES COLORIDOS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 sm:gap-6">
        {/* Card 1: Total de solicitações */}
        <div
          onClick={() => {
            setFiltroStatus('Todos');
            setBusca('');
          }}
          className="bg-gradient-to-br from-[#2B7FFF] to-[#1E6BDB] text-white rounded-3xl p-6 sm:p-7 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-out cursor-pointer flex items-center justify-between min-h-[135px] border border-blue-400/30 group"
        >
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-300 animate-pulse" />
              <h3 className="text-sm sm:text-base font-bold text-white/95">Total Solicitações</h3>
            </div>
            <div className="text-3xl sm:text-4xl font-black text-white tracking-tight font-mono leading-none">
              {total}
            </div>
            <p className="text-xs text-sky-100 font-medium">Exercício corrente</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-sky-400/20 text-white border border-sky-300/30 flex items-center justify-center flex-shrink-0 shadow-inner group-hover:scale-105 transition-transform duration-200">
            <FileText className="w-8 h-8 stroke-[1.6]" />
          </div>
        </div>

        {/* Card 2: Em análise */}
        <div
          onClick={() => setFiltroStatus('Em análise')}
          className="bg-gradient-to-br from-[#2B7FFF] to-[#1E6BDB] text-white rounded-3xl p-6 sm:p-7 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-out cursor-pointer flex items-center justify-between min-h-[135px] border border-blue-400/30 group"
        >
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-300" />
              <h3 className="text-sm sm:text-base font-bold text-white/95">Em análise</h3>
            </div>
            <div className="text-3xl sm:text-4xl font-black text-white tracking-tight font-mono leading-none">
              {emAnalise}
            </div>
            <p className="text-xs text-purple-100 font-medium">Aguardando parecer</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-purple-400/25 text-purple-100 border border-purple-300/40 flex items-center justify-center flex-shrink-0 shadow-inner group-hover:scale-105 transition-transform duration-200">
            <Clock className="w-8 h-8 stroke-[1.6]" />
          </div>
        </div>

        {/* Card 3: Aprovadas */}
        <div
          onClick={() => setFiltroStatus('Aprovadas')}
          className="bg-gradient-to-br from-[#2B7FFF] to-[#1E6BDB] text-white rounded-3xl p-6 sm:p-7 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-out cursor-pointer flex items-center justify-between min-h-[135px] border border-blue-400/30 group"
        >
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-300" />
              <h3 className="text-sm sm:text-base font-bold text-white/95">Aprovadas</h3>
            </div>
            <div className="text-3xl sm:text-4xl font-black text-white tracking-tight font-mono leading-none">
              {aprovadas}
            </div>
            <p className="text-xs text-emerald-100 font-medium">Liberadas para uso</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-emerald-400/25 text-emerald-100 border border-emerald-300/40 flex items-center justify-center flex-shrink-0 shadow-inner group-hover:scale-105 transition-transform duration-200">
            <CheckCircle2 className="w-8 h-8 stroke-[1.6]" />
          </div>
        </div>

        {/* Card 4: Com pendência */}
        <div
          onClick={() => setFiltroStatus('Pendências')}
          className="bg-gradient-to-br from-[#2B7FFF] to-[#1E6BDB] text-white rounded-3xl p-6 sm:p-7 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-out cursor-pointer flex items-center justify-between min-h-[135px] border border-blue-400/30 group"
        >
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-300" />
              <h3 className="text-sm sm:text-base font-bold text-white/95">Com pendência</h3>
            </div>
            <div className="text-3xl sm:text-4xl font-black text-white tracking-tight font-mono leading-none">
              {pendencias}
            </div>
            <p className="text-xs text-amber-100 font-medium">Revisão necessária</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-amber-400/25 text-amber-100 border border-amber-300/40 flex items-center justify-center flex-shrink-0 shadow-inner group-hover:scale-105 transition-transform duration-200">
            <AlertCircle className="w-8 h-8 stroke-[1.6]" />
          </div>
        </div>
      </div>

      {/* FLUXO DE APROVAÇÃO (FIGMA) */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-zinc-200/70">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-zinc-900">Fluxo de Aprovação</h3>
          <p className="text-[11px] text-zinc-500">Acompanhe as etapas de uma solicitação</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Etapa 1 */}
          <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#2F80ED] text-white flex items-center justify-center font-bold text-xs shadow-xs">
              <Check className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-semibold text-[#2F80ED] block">Solicitação</span>
              <span className="text-[11px] text-zinc-500">Registrada</span>
            </div>
          </div>

          {/* Etapa 2 */}
          <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#2F80ED] text-white flex items-center justify-center font-bold text-xs shadow-xs">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-semibold text-[#2F80ED] block">Análise</span>
              <span className="text-[11px] text-zinc-500">Documentação</span>
            </div>
          </div>

          {/* Etapa 3 */}
          <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#2F80ED] text-white flex items-center justify-center font-bold text-xs shadow-xs">
              <Building className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-semibold text-[#2F80ED] block">Órgão responsável</span>
              <span className="text-[11px] text-zinc-500">Em análise</span>
            </div>
          </div>

          {/* Etapa 4 */}
          <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#2F80ED] text-white flex items-center justify-center font-bold text-xs shadow-xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-semibold text-[#2F80ED] block">Aprovação</span>
              <span className="text-[11px] text-zinc-500">Liberada</span>
            </div>
          </div>
        </div>
      </div>

      {/* BLOCO PRINCIPAL: SOLICITAÇÕES RECENTES */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-zinc-200/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="text-base font-bold text-zinc-900">Solicitações Recentes de Laboratório</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Acompanhe o andamento dos pedidos de reagentes para aulas e pesquisas</p>
          </div>
          <button
            onClick={() => setModalNovoAberto(true)}
            className="flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 rounded-xl bg-[#2F80ED] hover:bg-blue-600 active:scale-95 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 transition cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Solicitação</span>
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
              placeholder="Pesquisar solicitação..."
              className="w-full h-10 pl-3.5 pr-9 text-xs sm:text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-[#2F80ED] focus:bg-white transition"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          </div>

          <div className="flex items-center gap-1.5 bg-zinc-100/90 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto flex-wrap">
            {(['Todos', 'Em análise', 'Aprovadas', 'Pendências', 'Reprovadas'] as const).map((st) => (
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
              Nenhuma solicitação encontrada para os filtros selecionados.
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
                    <span className="text-[11px] text-zinc-500 block mt-0.5">
                      Por: <strong className="text-zinc-700">{item.solicitante}</strong>
                    </span>
                  </div>
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-semibold border flex-shrink-0 ${getStatusBadge(
                      item.status
                    )}`}
                  >
                    {item.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] bg-zinc-50 p-2.5 rounded-lg border border-zinc-100">
                  <div>
                    <span className="text-zinc-400 text-[10px] block">Quantidade:</span>
                    <strong className="text-zinc-800">{item.quantidade}</strong>
                  </div>
                  <div>
                    <span className="text-zinc-400 text-[10px] block">Órgão:</span>
                    <span className="text-zinc-700 truncate block">{item.orgao}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-zinc-100 gap-1.5">
                  <span className="font-mono text-[10px] text-zinc-400">{item.data}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setModalVisualizar(item)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-100 text-zinc-700 hover:text-blue-600 hover:bg-blue-50 text-[10px] font-semibold transition cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Detalhes</span>
                    </button>
                    {onDeleteSolicitacao && (
                      <button
                        type="button"
                        onClick={() => setSolicitacaoParaExcluir(item)}
                        className="p-1.5 rounded-lg text-rose-600 bg-rose-50 hover:bg-rose-100 transition cursor-pointer"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* TABELA DE SOLICITAÇÕES PARA DESKTOP (>= 768px) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold border-b border-zinc-100">
                <th className="pb-2.5 pl-1">CÓDIGO</th>
                <th className="pb-2.5">SOLICITANTE</th>
                <th className="pb-2.5">PRODUTO</th>
                <th className="pb-2.5">QUANTIDADE</th>
                <th className="pb-2.5">ÓRGÃO</th>
                <th className="pb-2.5">DATA</th>
                <th className="pb-2.5">STATUS</th>
                <th className="pb-2.5 text-center pr-1">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {exibidas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-zinc-400">
                    Nenhuma solicitação encontrada para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                exibidas.map((item) => (
                  <tr key={item.id} className="hover:bg-blue-50/20 transition group">
                    <td className="py-3.5 sm:py-4 pl-2 font-semibold text-zinc-900 text-xs">
                      {item.id}
                    </td>
                    <td className="py-3.5 sm:py-4 text-zinc-800 font-medium text-xs">
                      {item.solicitante}
                    </td>
                    <td className="py-3.5 sm:py-4 text-zinc-900 font-semibold text-xs">
                      {item.produto}
                    </td>
                    <td className="py-3.5 sm:py-4 text-zinc-600 text-xs font-mono">
                      {item.quantidade}
                    </td>
                    <td className="py-3.5 sm:py-4 text-zinc-600 text-xs">
                      {item.orgao}
                    </td>
                    <td className="py-3.5 sm:py-4 font-mono text-zinc-500 text-xs">
                      {item.data}
                    </td>
                    <td className="py-3.5 sm:py-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-semibold border ${getStatusBadge(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3.5 sm:py-4 pr-2 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setModalVisualizar(item)}
                          className="p-2 rounded-xl text-zinc-400 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer border border-zinc-200"
                          title="Ver e gerenciar solicitação"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {onDeleteSolicitacao && (
                          <button
                            onClick={() => setSolicitacaoParaExcluir(item)}
                            className="p-2 rounded-xl text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer border border-zinc-200"
                            title="Excluir solicitação"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
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

      {/* MODAL NOVA SOLICITAÇÃO */}
      {modalNovoAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-3.5 bg-zinc-900 text-white flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider">Registrar Solicitação de Reagente</h3>
              <button onClick={() => setModalNovoAberto(false)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                const nova: SolicitacaoLaboratorio = {
                  id: `SOL-00${solicitacoes.length + 3}`,
                  solicitante: form.get('solicitante') as string,
                  produto: form.get('produto') as string,
                  quantidade: form.get('quantidade') as string,
                  orgao: form.get('orgao') as string,
                  data: new Date().toLocaleDateString('pt-BR'),
                  status: 'Em análise',
                  observacao: form.get('observacao') as string
                };
                onAddSolicitacao(nova);
                setModalNovoAberto(false);
              }}
              className="p-5 space-y-3 text-xs"
            >
              <div className="space-y-2.5">
                <div>
                  <label className="block text-zinc-600 mb-1 font-medium">Nome do Solicitante (Docente)</label>
                  <input
                    type="text"
                    name="solicitante"
                    required
                    placeholder="Nome do docente ou solicitante"
                    className="w-full h-8 px-2.5 border border-zinc-300 rounded-lg text-xs focus:border-[#2F80ED] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-zinc-600 mb-1 font-medium">Reagente ou Material</label>
                  {produtosDisponiveis.length > 0 ? (
                    <select
                      name="produto"
                      required
                      className="w-full h-8 px-2 border border-zinc-300 rounded-lg text-xs bg-white focus:border-[#2F80ED] focus:outline-none"
                    >
                      {produtosDisponiveis.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      name="produto"
                      required
                      placeholder="Ex: Acetona, Ácido Sulfúrico, Nitrato..."
                      className="w-full h-8 px-2.5 border border-zinc-300 rounded-lg text-xs focus:border-[#2F80ED] focus:outline-none"
                    />
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-zinc-600 mb-1 font-medium">Quantidade Solicitada</label>
                    <input
                      type="text"
                      name="quantidade"
                      required
                      placeholder="Ex: 2 L ou 500 g"
                      className="w-full h-8 px-2.5 border border-zinc-300 rounded-lg text-xs focus:border-[#2F80ED] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-600 mb-1 font-medium">Órgão Regulador / Destino</label>
                    <select
                      name="orgao"
                      className="w-full h-8 px-2 border border-zinc-300 rounded-lg text-xs bg-white focus:border-[#2F80ED] focus:outline-none"
                    >
                      <option value="Polícia Federal">Polícia Federal</option>
                      <option value="Batalhão">Batalhão (Exército)</option>
                      <option value="Órgão responsável">Órgão responsável interno</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-zinc-600 mb-1 font-medium">Justificativa Pedagógica</label>
                  <textarea
                    name="observacao"
                    rows={2}
                    placeholder="Descreva o experimento prático e plano de segurança..."
                    className="w-full p-2 border border-zinc-300 rounded-lg text-xs focus:border-[#2F80ED] focus:outline-none"
                  />
                </div>
              </div>
              <div className="pt-3 border-t border-zinc-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalNovoAberto(false)}
                  className="px-3.5 py-1.5 text-xs text-zinc-600 hover:bg-zinc-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#2F80ED] hover:bg-blue-600 text-white text-xs font-semibold"
                >
                  Submeter Solicitação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL VISUALIZAR E APROVAR/REPROVAR */}
      {modalVisualizar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 bg-zinc-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-blue-400">{modalVisualizar.id}</span>
                <h3 className="text-sm font-bold">Gerenciamento de Solicitação</h3>
              </div>
              <button onClick={() => setModalVisualizar(null)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-100 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Solicitante:</span>
                  <strong className="text-zinc-900">{modalVisualizar.solicitante}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Item Requisitado:</span>
                  <strong className="text-blue-600">{modalVisualizar.produto}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Volume:</span>
                  <span>{modalVisualizar.quantidade}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Órgão Regulador:</span>
                  <span>{modalVisualizar.orgao}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Data de Submissão:</span>
                  <span>{modalVisualizar.data}</span>
                </div>
                <div className="pt-1.5 border-t border-zinc-200/60 flex justify-between items-center">
                  <span className="text-zinc-400">Status Atual:</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadge(modalVisualizar.status)}`}>
                    {modalVisualizar.status}
                  </span>
                </div>
              </div>

              {modalVisualizar.observacao && (
                <div className="bg-blue-50/50 p-2.5 rounded-lg border border-blue-100 text-[11px] text-zinc-700">
                  <p className="font-semibold text-blue-900">Justificativa da Aula:</p>
                  <p>{modalVisualizar.observacao}</p>
                </div>
              )}

              <div className="pt-2 border-t border-zinc-100 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Alterar Status:</span>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    onClick={() => {
                      onUpdateSolicitacaoStatus(modalVisualizar.id, 'Reprovada');
                      setModalVisualizar(null);
                    }}
                    className="py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition cursor-pointer"
                  >
                    Reprovar
                  </button>
                  <button
                    onClick={() => {
                      onUpdateSolicitacaoStatus(modalVisualizar.id, 'Pendência');
                      setModalVisualizar(null);
                    }}
                    className="py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold transition cursor-pointer"
                  >
                    Pendência
                  </button>
                  <button
                    onClick={() => {
                      onUpdateSolicitacaoStatus(modalVisualizar.id, 'Aprovada');
                      setModalVisualizar(null);
                    }}
                    className="py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold transition cursor-pointer"
                  >
                    Aprovar
                  </button>
                </div>
              </div>

              <div className="pt-2 flex justify-between items-center border-t border-zinc-100">
                {onDeleteSolicitacao && (
                  <button
                    type="button"
                    onClick={() => {
                      setSolicitacaoParaExcluir(modalVisualizar);
                    }}
                    className="text-rose-600 hover:text-rose-700 hover:underline text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir Solicitação</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setModalVisualizar(null)}
                  className="px-4 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold ml-auto transition cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Modal de Confirmação de Exclusão de Solicitação */}
      {solicitacaoParaExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-zinc-200 p-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900">Excluir Solicitação</h3>
                <p className="text-xs text-zinc-500">Esta ação cancelará a requisição.</p>
              </div>
            </div>

            <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 mb-4 text-xs space-y-1">
              <p className="font-semibold text-zinc-800">
                <span className="text-blue-600 font-mono">{solicitacaoParaExcluir.id}</span> · {solicitacaoParaExcluir.solicitante}
              </p>
              <p className="text-zinc-500">{solicitacaoParaExcluir.produto} ({solicitacaoParaExcluir.quantidade})</p>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setSolicitacaoParaExcluir(null)}
                className="px-3.5 py-2 rounded-lg text-xs text-zinc-600 hover:bg-zinc-100 font-medium transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (onDeleteSolicitacao) onDeleteSolicitacao(solicitacaoParaExcluir.id);
                  if (modalVisualizar?.id === solicitacaoParaExcluir.id) setModalVisualizar(null);
                  setSolicitacaoParaExcluir(null);
                }}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
