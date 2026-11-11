import React, { useState } from 'react';
import { Fornecedor } from '../../types';
import {
  Truck,
  Building2,
  FileCheck2,
  XCircle,
  Search,
  Plus,
  Eye,
  Edit2,
  Trash2,
  X,
  Phone,
  Mail,
  MapPin,
  ChevronLeft,
  ChevronRight,
  CheckCircle2
} from 'lucide-react';

interface FornecedoresViewProps {
  fornecedores: Fornecedor[];
  onAddFornecedor: (f: Fornecedor) => void;
  onUpdateFornecedor: (f: Fornecedor) => void;
  onDeleteFornecedor: (id: string) => void;
}

export const FornecedoresView: React.FC<FornecedoresViewProps> = ({
  fornecedores,
  onAddFornecedor,
  onUpdateFornecedor,
  onDeleteFornecedor
}) => {
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'Ativos' | 'Inativos'>('todos');
  const [pagina, setPagina] = useState(1);

  // Modais
  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [modalEditar, setModalEditar] = useState<Fornecedor | null>(null);
  const [modalVisualizar, setModalVisualizar] = useState<Fornecedor | null>(null);
  const [fornecedorParaExcluir, setFornecedorParaExcluir] = useState<Fornecedor | null>(null);

  const fornecedoresFiltrados = fornecedores.filter((f) => {
    const matchBusca =
      f.razaoSocial.toLowerCase().includes(busca.toLowerCase()) ||
      f.cnpj.includes(busca) ||
      f.responsavel.toLowerCase().includes(busca.toLowerCase()) ||
      f.email.toLowerCase().includes(busca.toLowerCase());
    const matchStatus =
      filtroStatus === 'todos' ||
      (filtroStatus === 'Ativos' && f.status === 'Ativo') ||
      (filtroStatus === 'Inativos' && f.status === 'Inativo');
    return matchBusca && matchStatus;
  });

  const totalAtivos = fornecedores.filter((f) => f.status === 'Ativo').length;
  const totalInativos = fornecedores.filter((f) => f.status === 'Inativo').length;

  const itensPorPagina = 9;
  const totalPaginas = Math.ceil(fornecedoresFiltrados.length / itensPorPagina) || 1;
  const fornecedoresExibidos = fornecedoresFiltrados.slice(
    (pagina - 1) * itensPorPagina,
    pagina * itensPorPagina
  );

  const totalFornecedores = fornecedores.length;
  const ativos = fornecedores.filter((f) => f.status === 'Ativo').length;
  const comProdutos = fornecedores.filter((f) => f.produtosFornecidos && f.produtosFornecidos.length > 0).length;
  const inativos = fornecedores.filter((f) => f.status === 'Inativo').length;

  return (
    <div className="space-y-4">
      {/* 4 CARDS DE MÉTRICAS - AZUL PREDOMINANTE COM DETALHES DE CORES DIFERENTES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 sm:gap-6">
        {/* Card 1: Total de fornecedores - Detalhe Ciano */}
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
              <h3 className="text-sm sm:text-base font-bold text-white/95">Total Fornecedores</h3>
            </div>
            <div className="text-3xl sm:text-4xl font-black text-white tracking-tight font-mono leading-none">
              {totalFornecedores}
            </div>
            <p className="text-xs text-sky-100 font-medium">Empresas homologadas</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-sky-400/20 text-white border border-sky-300/30 flex items-center justify-center flex-shrink-0 shadow-inner">
            <Truck className="w-8 h-8 stroke-[1.6]" />
          </div>
        </div>

        {/* Card 2: Fornecedores Ativos - Detalhe Esmeralda */}
        <div
          onClick={() => setFiltroStatus('Ativos')}
          className="bg-gradient-to-br from-[#2B7FFF] to-[#1E6BDB] text-white rounded-3xl p-6 sm:p-7 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-out cursor-pointer flex items-center justify-between min-h-[135px] border border-blue-400/30"
        >
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-300" />
              <h3 className="text-sm sm:text-base font-bold text-white/95">Fornecedores Ativos</h3>
            </div>
            <div className="text-3xl sm:text-4xl font-black text-white tracking-tight font-mono leading-none">
              {ativos}
            </div>
            <p className="text-xs text-emerald-100 font-medium">Em operação regular</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-emerald-400/25 text-emerald-100 border border-emerald-300/40 flex items-center justify-center flex-shrink-0 shadow-inner">
            <CheckCircle2 className="w-8 h-8 stroke-[1.6]" />
          </div>
        </div>

        {/* Card 3: Cotações - Detalhe Âmbar */}
        <div
          onClick={() => setFiltroStatus('todos')}
          className="bg-gradient-to-br from-[#2B7FFF] to-[#1E6BDB] text-white rounded-3xl p-6 sm:p-7 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-out cursor-pointer flex items-center justify-between min-h-[135px] border border-blue-400/30"
        >
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-300" />
              <h3 className="text-sm sm:text-base font-bold text-white/95">Cotações</h3>
            </div>
            <div className="text-3xl sm:text-4xl font-black text-white tracking-tight font-mono leading-none">
              {comProdutos}
            </div>
            <p className="text-xs text-amber-100 font-medium">Propostas ativas</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-amber-400/25 text-amber-100 border border-amber-300/40 flex items-center justify-center flex-shrink-0 shadow-inner">
            <FileCheck2 className="w-8 h-8 stroke-[1.6]" />
          </div>
        </div>

        {/* Card 4: Fornecedores Inativos - Detalhe Violeta */}
        <div
          onClick={() => setFiltroStatus('Inativos')}
          className="bg-gradient-to-br from-[#2B7FFF] to-[#1E6BDB] text-white rounded-3xl p-6 sm:p-7 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-out cursor-pointer flex items-center justify-between min-h-[135px] border border-blue-400/30"
        >
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-300" />
              <h3 className="text-sm sm:text-base font-bold text-white/95">Inativos</h3>
            </div>
            <div className="text-3xl sm:text-4xl font-black text-white tracking-tight font-mono leading-none">
              {inativos}
            </div>
            <p className="text-xs text-purple-100 font-medium">Cadastro pendente</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-purple-400/25 text-purple-100 border border-purple-300/40 flex items-center justify-center flex-shrink-0 shadow-inner">
            <Building2 className="w-8 h-8 stroke-[1.6]" />
          </div>
        </div>
      </div>

      {/* BLOCO PRINCIPAL: LISTA DE FORNECEDORES */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-zinc-200/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="text-base font-bold text-zinc-900">Lista de Fornecedores Homologados</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Consulte e gerencie distribuidores credenciados para compra de reagentes</p>
          </div>
          <button
            onClick={() => setModalNovoAberto(true)}
            className="flex items-center justify-center gap-2 px-6 sm:px-7 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs sm:text-sm font-bold shadow-lg shadow-blue-500/25 transition cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4.5 h-4.5 stroke-[2.2]" />
            <span>Cadastrar Fornecedor</span>
          </button>
        </div>

        {/* Filtros e Busca Espaçosa e Intuitiva */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="relative w-full sm:w-96">
            <input
              type="text"
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value);
                setPagina(1);
              }}
              placeholder="Pesquisar por nome, CNPJ, responsável..."
              className="w-full h-11 sm:h-12 pl-4 pr-10 text-xs sm:text-sm bg-zinc-50 border border-zinc-200/90 rounded-2xl focus:outline-none focus:border-blue-500 focus:bg-white transition placeholder:text-zinc-400"
            />
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-zinc-400" />
          </div>

          <div className="flex items-center gap-1.5 bg-zinc-100/90 p-1.5 rounded-2xl text-xs font-semibold self-start sm:self-auto">
            <button
              onClick={() => setFiltroStatus('todos')}
              className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                filtroStatus === 'todos' ? 'bg-white text-zinc-900 shadow-xs font-bold' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Todos ({totalFornecedores})
            </button>
            <button
              onClick={() => setFiltroStatus('Ativos')}
              className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                filtroStatus === 'Ativos' ? 'bg-white text-emerald-700 shadow-xs font-bold' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Ativos ({ativos})
            </button>
            <button
              onClick={() => setFiltroStatus('Inativos')}
              className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                filtroStatus === 'Inativos' ? 'bg-white text-violet-700 shadow-xs font-bold' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Inativos ({inativos})
            </button>
          </div>
        </div>

        {/* LISTA EM CARDS PARA DISPOSITIVOS MÓVEIS (SMARTPHONES < 768px) */}
        <div className="block md:hidden space-y-3">
          {fornecedoresExibidos.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-500 bg-zinc-50 rounded-xl p-4 border border-dashed border-zinc-200">
              <Building2 className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <p className="font-semibold text-zinc-800">
                {fornecedores.length === 0
                  ? 'Nenhum fornecedor homologado cadastrado'
                  : 'Nenhum fornecedor localizado'}
              </p>
              <p className="text-[11px] text-zinc-400 mt-1">
                {fornecedores.length === 0
                  ? 'Cadastre distribuidores no botão "+ Novo Fornecedor".'
                  : 'Tente alterar a pesquisa ou o filtro.'}
              </p>
            </div>
          ) : (
            fornecedoresExibidos.map((forn) => (
              <div
                key={forn.id}
                className="bg-white rounded-xl p-3.5 border border-zinc-200 shadow-2xs space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-bold text-zinc-900 text-xs leading-tight">{forn.razaoSocial}</h3>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[11px]">
                      <span className="font-mono text-zinc-500">{forn.cnpj}</span>
                      <span className="text-zinc-300">·</span>
                      <span className="text-zinc-600 font-medium">{forn.responsavel}</span>
                    </div>
                  </div>
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-semibold border flex-shrink-0 ${
                      forn.status === 'Ativo'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                    }`}
                  >
                    {forn.status}
                  </span>
                </div>

                <div className="space-y-1 text-[11px] bg-zinc-50 p-2.5 rounded-lg border border-zinc-100">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400 text-[10px]">Contato:</span>
                    <strong className="text-zinc-800">{forn.contato}</strong>
                  </div>
                  {forn.email && (
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400 text-[10px]">E-mail:</span>
                      <a href={`mailto:${forn.email}`} className="text-[#2F80ED] truncate max-w-[200px] underline">
                        {forn.email}
                      </a>
                    </div>
                  )}
                  {forn.endereco && (
                    <div className="text-zinc-500 text-[10px] truncate pt-0.5">
                      {forn.endereco}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-1 pt-1 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={() => setModalVisualizar(forn)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-100 text-zinc-700 hover:text-blue-600 hover:bg-blue-50 text-[10px] font-semibold transition cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Detalhes</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalEditar(forn)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 text-[10px] font-semibold transition cursor-pointer border border-amber-200"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFornecedorParaExcluir(forn)}
                    className="p-1.5 rounded-lg text-rose-600 bg-rose-50 hover:bg-rose-100 transition cursor-pointer"
                    title="Excluir"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* TABELA DE FORNECEDORES PARA DESKTOP (>= 768px) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold border-b border-zinc-100">
                <th className="pb-2.5 pl-1">FORNECEDORES</th>
                <th className="pb-2.5">CNPJ</th>
                <th className="pb-2.5">CONTATO</th>
                <th className="pb-2.5">ENDEREÇO</th>
                <th className="pb-2.5">E-MAIL</th>
                <th className="pb-2.5">RESPONSÁVEL</th>
                <th className="pb-2.5 text-center pr-1">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {fornecedoresExibidos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-zinc-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <span className="font-semibold text-zinc-800">
                        {fornecedores.length === 0
                          ? 'Nenhum fornecedor homologado cadastrado ainda'
                          : 'Nenhum fornecedor localizado com os termos informados'}
                      </span>
                      <p className="text-[11px] text-zinc-400 max-w-sm">
                        {fornecedores.length === 0
                          ? 'Cadastre empresas e distribuidores homologados clicando no botão "Cadastrar Fornecedor" acima.'
                          : 'Verifique a digitação ou remova filtros de busca.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                fornecedoresExibidos.map((forn) => (
                  <tr key={forn.id} className="hover:bg-blue-50/20 transition group">
                    <td className="py-3.5 sm:py-4 pl-2 font-semibold text-zinc-900 text-xs max-w-[170px] leading-tight">
                      {forn.razaoSocial}
                    </td>
                    <td className="py-3.5 sm:py-4 font-mono text-zinc-500 text-xs whitespace-nowrap">
                      {forn.cnpj}
                    </td>
                    <td className="py-3.5 sm:py-4 text-zinc-600 text-xs whitespace-nowrap">
                      {forn.contato}
                    </td>
                    <td className="py-3.5 sm:py-4 text-zinc-500 text-xs max-w-[200px] truncate" title={forn.endereco}>
                      {forn.endereco}
                    </td>
                    <td className="py-3.5 sm:py-4 text-[#2F80ED] underline text-xs max-w-[150px] truncate">
                      <a href={`mailto:${forn.email}`}>{forn.email}</a>
                    </td>
                    <td className="py-3.5 sm:py-4 text-zinc-800 font-medium text-xs">
                      {forn.responsavel}
                    </td>
                    <td className="py-3.5 sm:py-4 pr-2 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setModalVisualizar(forn)}
                          className="p-2 rounded-xl text-zinc-400 hover:text-blue-600 hover:bg-blue-50 transition border border-zinc-200 cursor-pointer"
                          title="Ver detalhes"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setModalEditar(forn)}
                          className="p-2 rounded-xl text-zinc-400 hover:text-amber-600 hover:bg-amber-50 transition border border-zinc-200 cursor-pointer"
                          title="Editar fornecedor"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setFornecedorParaExcluir(forn)}
                          className="p-2 rounded-xl text-zinc-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer border border-zinc-200"
                          title="Excluir fornecedor"
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

      {/* MODAL CADASTRAR FORNECEDOR */}
      {modalNovoAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-3.5 bg-zinc-900 text-white flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider">Novo Fornecedor de Reagentes</h3>
              <button onClick={() => setModalNovoAberto(false)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                const novo: Fornecedor = {
                  id: `FORN-${Date.now().toString().slice(-4)}`,
                  razaoSocial: form.get('razaoSocial') as string,
                  cnpj: form.get('cnpj') as string,
                  contato: form.get('contato') as string,
                  endereco: form.get('endereco') as string,
                  email: form.get('email') as string,
                  responsavel: form.get('responsavel') as string,
                  status: (form.get('status') as any) || 'Ativo'
                };
                onAddFornecedor(novo);
                setModalNovoAberto(false);
              }}
              className="p-5 space-y-3 text-xs"
            >
              <div className="space-y-2.5">
                <div>
                  <label className="block text-zinc-600 mb-1 font-medium">Razão Social / Nome Fantasia</label>
                  <input
                    type="text"
                    name="razaoSocial"
                    required
                    placeholder="Ex: LabTech Reagentes e Equipamentos Ltda"
                    className="w-full h-8 px-2.5 border border-zinc-300 rounded-lg text-xs focus:border-[#2F80ED] focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-zinc-600 mb-1 font-medium">CNPJ</label>
                    <input
                      type="text"
                      name="cnpj"
                      required
                      placeholder="00.000.000/0001-00"
                      className="w-full h-8 px-2.5 border border-zinc-300 rounded-lg text-xs font-mono focus:border-[#2F80ED] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-600 mb-1 font-medium">Telefone / Contato</label>
                    <input
                      type="text"
                      name="contato"
                      required
                      placeholder="(11) 98765-4321"
                      className="w-full h-8 px-2.5 border border-zinc-300 rounded-lg text-xs focus:border-[#2F80ED] focus:outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-zinc-600 mb-1 font-medium">E-mail Comercial</label>
                    <input
                      type="email"
                      name="email"
                      required
                      placeholder="vendas@empresa.com.br"
                      className="w-full h-8 px-2.5 border border-zinc-300 rounded-lg text-xs focus:border-[#2F80ED] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-600 mb-1 font-medium">Responsável / Vendedor</label>
                    <input
                      type="text"
                      name="responsavel"
                      required
                      placeholder="Nome do contato"
                      className="w-full h-8 px-2.5 border border-zinc-300 rounded-lg text-xs focus:border-[#2F80ED] focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-zinc-600 mb-1 font-medium">Endereço Completo</label>
                  <input
                    type="text"
                    name="endereco"
                    required
                    placeholder="Rua, número, bairro, cidade - UF, CEP"
                    className="w-full h-8 px-2.5 border border-zinc-300 rounded-lg text-xs focus:border-[#2F80ED] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-zinc-600 mb-1 font-medium">Situação Cadastral</label>
                  <select
                    name="status"
                    className="w-full h-8 px-2 border border-zinc-300 rounded-lg text-xs bg-white"
                  >
                    <option value="Ativo">Ativo (Habilitado para cotações)</option>
                    <option value="Inativo">Inativo</option>
                  </select>
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
                  Salvar Fornecedor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR FORNECEDOR */}
      {modalEditar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-3.5 bg-zinc-900 text-white flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider">Editar Fornecedor</h3>
              <button onClick={() => setModalEditar(null)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                const atualizado: Fornecedor = {
                  ...modalEditar,
                  razaoSocial: form.get('razaoSocial') as string,
                  cnpj: form.get('cnpj') as string,
                  contato: form.get('contato') as string,
                  endereco: form.get('endereco') as string,
                  email: form.get('email') as string,
                  responsavel: form.get('responsavel') as string,
                  status: (form.get('status') as any) || 'Ativo'
                };
                onUpdateFornecedor(atualizado);
                setModalEditar(null);
              }}
              className="p-5 space-y-3 text-xs"
            >
              <div className="space-y-2.5">
                <div>
                  <label className="block text-zinc-600 mb-1 font-medium">Razão Social</label>
                  <input
                    type="text"
                    name="razaoSocial"
                    defaultValue={modalEditar.razaoSocial}
                    required
                    className="w-full h-8 px-2.5 border border-zinc-300 rounded-lg text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-zinc-600 mb-1 font-medium">CNPJ</label>
                    <input
                      type="text"
                      name="cnpj"
                      defaultValue={modalEditar.cnpj}
                      required
                      className="w-full h-8 px-2.5 border border-zinc-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-600 mb-1 font-medium">Telefone</label>
                    <input
                      type="text"
                      name="contato"
                      defaultValue={modalEditar.contato}
                      required
                      className="w-full h-8 px-2.5 border border-zinc-300 rounded-lg text-xs"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-zinc-600 mb-1 font-medium">E-mail</label>
                    <input
                      type="email"
                      name="email"
                      defaultValue={modalEditar.email}
                      required
                      className="w-full h-8 px-2.5 border border-zinc-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-600 mb-1 font-medium">Responsável</label>
                    <input
                      type="text"
                      name="responsavel"
                      defaultValue={modalEditar.responsavel}
                      required
                      className="w-full h-8 px-2.5 border border-zinc-300 rounded-lg text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-zinc-600 mb-1 font-medium">Endereço</label>
                  <input
                    type="text"
                    name="endereco"
                    defaultValue={modalEditar.endereco}
                    required
                    className="w-full h-8 px-2.5 border border-zinc-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-zinc-600 mb-1 font-medium">Status</label>
                  <select
                    name="status"
                    defaultValue={modalEditar.status}
                    className="w-full h-8 px-2 border border-zinc-300 rounded-lg text-xs bg-white"
                  >
                    <option value="Ativo">Ativo</option>
                    <option value="Inativo">Inativo</option>
                  </select>
                </div>
              </div>
              <div className="pt-3 border-t border-zinc-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalEditar(null)}
                  className="px-3.5 py-1.5 text-xs text-zinc-600 hover:bg-zinc-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#2F80ED] hover:bg-blue-600 text-white text-xs font-semibold"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL VISUALIZAR FORNECEDOR */}
      {modalVisualizar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 bg-zinc-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-blue-400">{modalVisualizar.cnpj}</span>
                <h3 className="text-sm font-bold">{modalVisualizar.razaoSocial}</h3>
              </div>
              <button onClick={() => setModalVisualizar(null)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-100 space-y-2">
                <div className="flex items-center gap-2 text-zinc-700">
                  <Phone className="w-3.5 h-3.5 text-blue-600" />
                  <span>{modalVisualizar.contato}</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-700">
                  <Mail className="w-3.5 h-3.5 text-blue-600" />
                  <a href={`mailto:${modalVisualizar.email}`} className="text-[#2F80ED] underline">
                    {modalVisualizar.email}
                  </a>
                </div>
                <div className="flex items-start gap-2 text-zinc-700">
                  <MapPin className="w-3.5 h-3.5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span>{modalVisualizar.endereco}</span>
                </div>
                <div className="pt-1 border-t border-zinc-200/60 flex justify-between">
                  <span className="text-zinc-500">Contato Responsável:</span>
                  <strong className="text-zinc-900">{modalVisualizar.responsavel}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Status Cadastral:</span>
                  <span className={`font-semibold ${modalVisualizar.status === 'Ativo' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {modalVisualizar.status}
                  </span>
                </div>
              </div>
              <div className="text-right">
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
      {/* Modal de Confirmação de Exclusão de Fornecedor */}
      {fornecedorParaExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-zinc-200 p-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900">Excluir Fornecedor</h3>
                <p className="text-xs text-zinc-500">Esta ação removerá a empresa cadastrada.</p>
              </div>
            </div>

            <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 mb-4 text-xs space-y-1">
              <p className="font-semibold text-zinc-800">{fornecedorParaExcluir.razaoSocial}</p>
              <p className="text-zinc-500 font-mono text-[11px]">CNPJ: {fornecedorParaExcluir.cnpj}</p>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setFornecedorParaExcluir(null)}
                className="px-3.5 py-2 rounded-lg text-xs text-zinc-600 hover:bg-zinc-100 font-medium transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onDeleteFornecedor(fornecedorParaExcluir.id);
                  if (modalVisualizar?.id === fornecedorParaExcluir.id) setModalVisualizar(null);
                  setFornecedorParaExcluir(null);
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
