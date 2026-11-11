import React, { useState } from 'react';
import { ProdutoQuimico } from '../../types';
import {
  FlaskConical,
  AlertTriangle,
  FileText,
  Search,
  Plus,
  Eye,
  Edit2,
  Trash2,
  X,
  Download,
  CheckCircle2,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  QrCode,
  MinusCircle,
  Scale,
  ShieldCheck
} from 'lucide-react';

interface ProdutosViewProps {
  produtos: ProdutoQuimico[];
  onAddProduto: (p: ProdutoQuimico) => void;
  onUpdateProduto: (p: ProdutoQuimico) => void;
  onDeleteProduto: (id: string) => void;
  isAluno?: boolean;
  onRegistrarUso?: (produtoNome: string) => void;
  onGerarQRCode?: (produto: ProdutoQuimico) => void;
  produtoFocoId?: string;
  onRegistrarConsumoEAbater?: (dados: {
    produtoNome: string;
    quantidade: number;
    unidade?: string;
    autorNome: string;
    autorPerfil: 'aluno' | 'professor';
    turma?: string;
    bancada?: string;
    pratica?: string;
    observacoes?: string;
  }) => Promise<any>;
  usuarioSessaoNome?: string;
}

export const ProdutosView: React.FC<ProdutosViewProps> = ({
  produtos,
  onAddProduto,
  onUpdateProduto,
  onDeleteProduto,
  isAluno = false,
  onRegistrarUso,
  onGerarQRCode,
  produtoFocoId,
  onRegistrarConsumoEAbater,
  usuarioSessaoNome
}) => {
  const [busca, setBusca] = useState('');
  const [filtroSituacao, setFiltroSituacao] = useState<'todos' | 'Controlados' | 'Não controlados'>('todos');
  const [pagina, setPagina] = useState(1);
  const [toast, setToast] = useState<string | null>(null);

  const mostrarToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Modais
  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [modalEditar, setModalEditar] = useState<ProdutoQuimico | null>(null);
  const [modalVisualizar, setModalVisualizar] = useState<ProdutoQuimico | null>(null);
  const [modalPdf, setModalPdf] = useState<{ tipo: 'FISPQ' | 'Nota Fiscal'; produto: ProdutoQuimico } | null>(null);
  const [produtoParaExcluir, setProdutoParaExcluir] = useState<ProdutoQuimico | null>(null);

  // Modal de Consumo / Baixa de Reagente
  const [modalConsumo, setModalConsumo] = useState<ProdutoQuimico | null>(null);
  const [consumoQtd, setConsumoQtd] = useState('');
  const [consumoAutor, setConsumoAutor] = useState(usuarioSessaoNome || '');
  const [consumoBancada, setConsumoBancada] = useState('Bancada 01');
  const [consumoPratica, setConsumoPratica] = useState('');
  const [consumoObs, setConsumoObs] = useState('');
  const [salvandoConsumo, setSalvandoConsumo] = useState(false);

  // Filtragem
  const produtosFiltrados = produtos.filter((p) => {
    const matchBusca =
      p.nome.toLowerCase().includes(busca.toLowerCase()) ||
      p.cas.toLowerCase().includes(busca.toLowerCase()) ||
      p.classePerigo.toLowerCase().includes(busca.toLowerCase());
    const matchSituacao =
      filtroSituacao === 'todos' ||
      (filtroSituacao === 'Controlados' && p.situacao === 'Controlado') ||
      (filtroSituacao === 'Não controlados' && p.situacao === 'Não controlado');
    return matchBusca && matchSituacao;
  });

  const totalControlados = produtos.filter((p) => p.situacao === 'Controlado').length;
  const totalNaoControlados = produtos.filter((p) => p.situacao === 'Não controlado').length;
  const totalAtencao = produtos.filter((p) => p.estoqueAtual <= p.estoqueMinimo).length;

  const itensPorPagina = 9;
  const totalPaginas = Math.ceil(produtosFiltrados.length / itensPorPagina) || 1;
  const produtosExibidos = produtosFiltrados.slice((pagina - 1) * itensPorPagina, pagina * itensPorPagina);

  const getClassePerigoStyle = (classe: string) => {
    const lower = (classe || '').toLowerCase();
    if (lower.includes('corrosivo')) {
      return 'bg-rose-50 text-rose-700 border border-rose-300 font-bold';
    }
    if (lower.includes('inflamável') || lower.includes('inflamavel')) {
      return 'bg-amber-50 text-amber-800 border border-amber-300 font-bold';
    }
    if (lower.includes('não classificado') || lower.includes('não perigoso') || lower.includes('livre')) {
      return 'bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold';
    }
    if (lower.includes('toxicidade') || lower.includes('tóxico') || lower.includes('veneno')) {
      return 'bg-purple-50 text-purple-800 border border-purple-300 font-bold';
    }
    return 'bg-sky-50 text-sky-800 border border-sky-300 font-bold';
  };

  const totalProdutos = produtos.length;
  const controlados = produtos.filter((p) => p.situacao === 'Controlado').length;
  const naoControlados = produtos.filter((p) => p.situacao === 'Não controlado').length;
  const atencao = produtos.filter((p) => p.estoqueAtual <= p.estoqueMinimo).length;



  if (isAluno) {
    return (
      <div className="space-y-6 relative pb-16 font-sans">
        {/* Toast Feedback */}
        {toast && (
          <div className="fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 bg-zinc-900 text-white text-xs font-semibold rounded-xl shadow-2xl border border-zinc-700 animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toast}</span>
          </div>
        )}

        {/* Topo do Aluno: Search Procurar Produto + Filtros Todos, Controlado, Não controlado fiel ao Figma (image_7394029c.png e image_411ec1a0.png) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-3 pt-1">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            {/* Input Procurar Produto com Lupa no Canto Direito */}
            <div className="relative w-full sm:w-72">
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Procurar produto"
                className="w-full h-10 pl-4 pr-10 rounded-lg border border-zinc-300 bg-white text-xs text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-[#2B7FFF] focus:ring-1 focus:ring-[#2B7FFF] shadow-2xs transition"
              />
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
            </div>

            {/* Botões de Filtro de Situação */}
            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setFiltroSituacao('todos')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  filtroSituacao === 'todos'
                    ? 'bg-[#DCE8FF] text-[#1E40AF] border border-blue-200 shadow-2xs'
                    : 'bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-50'
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setFiltroSituacao('Controlados')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  filtroSituacao === 'Controlados'
                    ? 'bg-[#DCE8FF] text-[#1E40AF] border border-blue-200 shadow-2xs'
                    : 'bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-50'
                }`}
              >
                Controlado
              </button>
              <button
                type="button"
                onClick={() => setFiltroSituacao('Não controlados')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  filtroSituacao === 'Não controlados'
                    ? 'bg-[#DCE8FF] text-[#1E40AF] border border-blue-200 shadow-2xs'
                    : 'bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-50'
                }`}
              >
                Não controlado
              </button>
            </div>
          </div>
        </div>

        {/* Grid de 3 Colunas de Cards de Produtos Idêntico ao Figma (image_7394029c.png e image_411ec1a0.png) */}
        {produtosFiltrados.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 border border-zinc-200 text-center space-y-4 max-w-xl mx-auto shadow-sm my-6">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#2B7FFF] flex items-center justify-center mx-auto">
              <FlaskConical className="w-7 h-7 stroke-[1.5]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900">
                {produtos.length === 0
                  ? 'Nenhum reagente cadastrado no laboratório'
                  : 'Nenhum produto encontrado com o filtro selecionado'}
              </h3>
              <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto leading-relaxed">
                {produtos.length === 0
                  ? 'Aguardando o professor ou a coordenação cadastrar reagentes no inventário do laboratório.'
                  : 'Tente alterar a pesquisa ou selecione a opção "Todos".'}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {produtosFiltrados.map((prod) => (
              <div
                key={prod.id}
                className="bg-white rounded-2xl p-6 border border-zinc-100 shadow-sm flex flex-col justify-between min-h-[220px] hover:shadow-md transition"
              >
                <div>
                  {/* Topo do Card: Ícone de Erlenmeyer em Linha Preta + Nome do Produto */}
                  <div className="flex items-center gap-3">
                    <FlaskConical className="w-6 h-6 text-zinc-900 stroke-[1.4]" />
                    <h3 className="font-bold text-zinc-950 text-base">{prod.nome}</h3>
                  </div>

                  {/* Quantidade em Destaque e Rótulos */}
                  <div className="mt-4">
                    <div className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight font-sans">
                      {prod.estoqueAtual} {prod.unidade}
                    </div>
                    <span className="text-xs text-zinc-500 block mt-0.5">
                      Quantidade disponível
                    </span>
                    <span className="text-xs text-zinc-700 block mt-3 font-medium">
                      {prod.situacao}
                    </span>
                  </div>

                  {/* Badge de Disponibilidade */}
                  <div className="mt-2.5">
                    <span
                      className={`inline-block px-3 py-0.5 rounded-md text-xs font-semibold text-white ${
                        prod.estoqueAtual > 0 ? 'bg-[#22C55E]' : 'bg-rose-500'
                      }`}
                    >
                      {prod.estoqueAtual > 0 ? 'Disponível' : 'Esgotado'}
                    </span>
                  </div>
                </div>

                {/* Linha Inferior com Botões: Detalhes, Registrar gasto e QR Code */}
                <div className="flex items-center gap-2.5 mt-6 pt-1">
                  <button
                    type="button"
                    onClick={() => setModalVisualizar(prod)}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-[#2B7FFF] hover:bg-blue-600 active:scale-98 text-white text-xs sm:text-sm font-bold transition text-center cursor-pointer min-h-[42px] shadow-xs"
                  >
                    Detalhes
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setModalConsumo(prod);
                      setConsumoQtd('');
                      setConsumoPratica('');
                      setConsumoObs('');
                    }}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-[#2B7FFF] hover:bg-blue-600 active:scale-98 text-white text-xs sm:text-sm font-bold transition text-center cursor-pointer min-h-[42px] shadow-xs"
                  >
                    Registrar gasto
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (onGerarQRCode) {
                        onGerarQRCode(prod);
                      }
                    }}
                    className="p-2.5 rounded-xl border border-zinc-300 hover:bg-zinc-100 text-zinc-900 transition flex items-center justify-center cursor-pointer active:scale-95 flex-shrink-0 min-h-[42px] min-w-[42px]"
                    title="Gerar / Ler QR Code deste produto"
                  >
                    <QrCode className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* MODAL: VISUALIZAR DETALHES COMPLETOS (FISPQ & ESPECIFICAÇÕES) */}
        {modalVisualizar && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden animate-in fade-in zoom-in-95 max-h-[92vh] flex flex-col">
              <div className="px-4 sm:px-5 py-3.5 bg-zinc-900 text-white flex items-center justify-between flex-shrink-0">
                <div className="min-w-0 mr-2">
                  <span className="text-[10px] font-mono text-blue-400 block">{modalVisualizar.cas}</span>
                  <h3 className="text-sm font-bold truncate">{modalVisualizar.nome}</h3>
                </div>
                <button onClick={() => setModalVisualizar(null)} className="text-zinc-400 hover:text-white p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 sm:p-5 space-y-3 text-xs overflow-y-auto flex-1">
                <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-100 space-y-1.5">
                  {modalVisualizar.formulaQuimica && (
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Fórmula Molecular:</span>
                      <span className="font-mono font-bold text-blue-600">{modalVisualizar.formulaQuimica}</span>
                    </div>
                  )}
                  {modalVisualizar.massaMolar && (
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Massa Molar:</span>
                      <span className="font-medium text-zinc-700">{modalVisualizar.massaMolar}</span>
                    </div>
                  )}
                  {modalVisualizar.pureza && (
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Grau de Pureza:</span>
                      <span className="font-medium text-zinc-700">{modalVisualizar.pureza}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Classificação GHS:</span>
                    <span className="font-semibold text-zinc-800">{modalVisualizar.classePerigo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Controle Legal:</span>
                    <span className={`font-semibold ${modalVisualizar.situacao === 'Controlado' ? 'text-blue-600' : 'text-purple-600'}`}>
                      {modalVisualizar.situacao}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Estoque no Laboratório:</span>
                    <strong className="text-zinc-900">{modalVisualizar.estoqueAtual} {modalVisualizar.unidade}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Validade Atual:</span>
                    <span>{modalVisualizar.validade}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Armazenamento:</span>
                    <span>{modalVisualizar.localizacao || 'Armário Central de Reagentes'}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setModalVisualizar(null);
                      setModalPdf({ tipo: 'FISPQ', produto: modalVisualizar });
                    }}
                    className="flex-1 py-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Visualizar FISPQ</span>
                  </button>
                  {onGerarQRCode && (
                    <button
                      onClick={() => {
                        const p = modalVisualizar;
                        setModalVisualizar(null);
                        onGerarQRCode(p);
                      }}
                      className="flex-1 py-2.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer border border-purple-200"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Gerar QR Code</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: REGISTRAR CONSUMO / BAIXA DE REAGENTE */}
        {modalConsumo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-zinc-200 overflow-hidden animate-in fade-in zoom-in-95 max-h-[92vh] flex flex-col">
              <div className="p-4 sm:p-5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50 flex-shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200 shadow-2xs">
                    <FlaskConical className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900">Registrar Consumo de Reagente</h3>
                    <p className="text-[11px] text-zinc-500">Abate automático do estoque com registro para o professor</p>
                  </div>
                </div>
                <button
                  onClick={() => setModalConsumo(null)}
                  className="text-zinc-400 hover:text-zinc-600 p-1.5 rounded-lg hover:bg-zinc-100 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const qtd = parseFloat(consumoQtd);
                  if (isNaN(qtd) || qtd <= 0) {
                    mostrarToast('Informe uma quantidade válida.');
                    return;
                  }
                  setSalvandoConsumo(true);
                  try {
                    if (onRegistrarConsumoEAbater) {
                      await onRegistrarConsumoEAbater({
                        produtoNome: modalConsumo.nome,
                        quantidade: qtd,
                        unidade: modalConsumo.unidade,
                        autorNome: consumoAutor || (isAluno ? 'Aluno(a)' : 'Docente'),
                        autorPerfil: isAluno ? 'aluno' : 'professor',
                        bancada: consumoBancada,
                        pratica: consumoPratica || 'Uso em Bancada',
                        observacoes: consumoObs
                      });
                    }
                    mostrarToast(`Consumo de ${qtd} ${modalConsumo.unidade} registrado! Estoque atualizado.`);
                    setModalConsumo(null);
                  } catch (err: any) {
                    mostrarToast(`Erro ao registrar: ${err?.message || 'Falha no banco'}`);
                  } finally {
                    setSalvandoConsumo(false);
                  }
                }}
                className="p-5 space-y-4 text-xs overflow-y-auto flex-1"
              >
                <div className="bg-zinc-50 p-3.5 rounded-xl border border-zinc-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-800 text-sm">{modalConsumo.nome}</span>
                    <span className="font-mono text-xs text-blue-600 font-semibold">{modalConsumo.cas}</span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-600 text-xs">
                    <span>Estoque Atual no Lab:</span>
                    <strong className="font-mono text-zinc-900 text-xs">{modalConsumo.estoqueAtual} {modalConsumo.unidade}</strong>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-zinc-700 font-semibold">Quantidade Utilizada ({modalConsumo.unidade}):</label>
                  <input
                    type="number"
                    step="any"
                    required
                    min="0.001"
                    value={consumoQtd}
                    onChange={(e) => setConsumoQtd(e.target.value)}
                    placeholder={`Ex: 50 ${modalConsumo.unidade}`}
                    className="w-full h-10 px-3 border border-zinc-300 rounded-xl text-sm focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-zinc-700 font-semibold">Prática / Aula / Experimento:</label>
                  <input
                    type="text"
                    value={consumoPratica}
                    onChange={(e) => setConsumoPratica(e.target.value)}
                    placeholder="Ex: Titulação Ácido-Base, Síntese Orgânica..."
                    className="w-full h-10 px-3 border border-zinc-300 rounded-xl text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-zinc-700 font-semibold">Observações (opcional):</label>
                  <textarea
                    rows={2}
                    value={consumoObs}
                    onChange={(e) => setConsumoObs(e.target.value)}
                    placeholder="Informações adicionais sobre o consumo..."
                    className="w-full p-2.5 border border-zinc-300 rounded-xl text-xs focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setModalConsumo(null)}
                    className="px-4 py-2 rounded-xl text-zinc-600 hover:bg-zinc-100 font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={salvandoConsumo}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition shadow-xs disabled:opacity-50"
                  >
                    {salvandoConsumo ? 'Salvando...' : 'Confirmar Consumo'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: VISUALIZADOR DE PDF / FISPQ */}
        {modalPdf && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-zinc-300 overflow-hidden animate-in fade-in zoom-in-95 max-h-[92vh] flex flex-col">
              <div className="p-4 bg-zinc-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider">
                    {modalPdf.tipo} - {modalPdf.produto.nome}
                  </h3>
                </div>
                <button onClick={() => setModalPdf(null)} className="text-zinc-400 hover:text-white p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto space-y-4 text-xs text-zinc-700 flex-1 font-serif bg-zinc-50/50">
                <div className="border border-zinc-200 bg-white p-6 rounded-xl shadow-xs space-y-3">
                  <div className="border-b pb-3 flex justify-between items-start">
                    <div>
                      <h2 className="text-base font-bold text-zinc-900">FICHA DE INFORMAÇÕES DE SEGURANÇA (FISPQ)</h2>
                      <p className="text-[11px] text-zinc-500">Conforme Norma ABNT-NBR 14725-4</p>
                    </div>
                    <span className="text-[10px] font-mono bg-zinc-100 px-2 py-1 rounded">CAS {modalPdf.produto.cas}</span>
                  </div>
                  <div>
                    <strong className="block text-zinc-900 text-xs mb-1">1. IDENTIFICAÇÃO DO PRODUTO:</strong>
                    <p>Nome Comercial: {modalPdf.produto.nome}</p>
                    <p>Fórmula Molecular: {modalPdf.produto.formulaQuimica || 'Não informada'}</p>
                    <p>Classe de Perigo: {modalPdf.produto.classePerigo}</p>
                  </div>
                  <div>
                    <strong className="block text-zinc-900 text-xs mb-1">2. MEDIDAS DE PRIMEIROS SOCORROS:</strong>
                    <p>Inalação: Remover a vítima para local arejado. Procurar assistência médica.</p>
                    <p>Contato com a pele: Lavar imediatamente com água corrente abundante por 15 minutos.</p>
                    <p>Contato com os olhos: Lavar no lava-olhos de emergência do laboratório.</p>
                  </div>
                  <div>
                    <strong className="block text-zinc-900 text-xs mb-1">3. MANUSEIO E ARMAZENAMENTO:</strong>
                    <p>Armazenamento: {modalPdf.produto.localizacao || 'Prateleira adequada com contenção de bacias'}.</p>
                  </div>
                </div>
              </div>
              <div className="p-3 bg-zinc-100 border-t flex justify-end">
                <button
                  type="button"
                  onClick={() => setModalPdf(null)}
                  className="px-4 py-1.5 rounded-lg bg-zinc-800 text-white text-xs font-semibold hover:bg-zinc-700"
                >
                  Fechar Visualizador
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="space-y-4 relative">
      {/* Toast Feedback */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 bg-zinc-900 text-white text-xs font-semibold rounded-xl shadow-2xl border border-zinc-700 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}
      {/* 4 CARDS DE MÉTRICAS ROYAL BLUE COM DETALHES COLORIDOS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 sm:gap-6">
        {/* Card 1: Total de produtos */}
        <div
          onClick={() => {
            setFiltroSituacao('todos');
            setBusca('');
          }}
          className="bg-gradient-to-br from-[#2B7FFF] to-[#1E6BDB] text-white rounded-3xl p-6 sm:p-7 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-out cursor-pointer flex items-center justify-between min-h-[135px] border border-blue-400/30 group"
        >
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-300 animate-pulse" />
              <h3 className="text-sm sm:text-base font-bold text-white/95">Total de produtos</h3>
            </div>
            <div className="text-3xl sm:text-4xl font-black text-white tracking-tight font-mono leading-none">
              {totalProdutos}
            </div>
            <p className="text-xs text-sky-100 font-medium">Reagentes cadastrados</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-sky-400/20 text-white border border-sky-300/30 flex items-center justify-center flex-shrink-0 shadow-inner group-hover:scale-105 transition-transform duration-200">
            <FlaskConical className="w-8 h-8 stroke-[1.6]" />
          </div>
        </div>

        {/* Card 2: Produção controlada */}
        <div
          onClick={() => setFiltroSituacao('Controlados')}
          className="bg-gradient-to-br from-[#2B7FFF] to-[#1E6BDB] text-white rounded-3xl p-6 sm:p-7 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-out cursor-pointer flex items-center justify-between min-h-[135px] border border-blue-400/30 group"
        >
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-300" />
              <h3 className="text-sm sm:text-base font-bold text-white/95">Produção controlada</h3>
            </div>
            <div className="text-3xl sm:text-4xl font-black text-white tracking-tight font-mono leading-none">
              {controlados}
            </div>
            <p className="text-xs text-purple-100 font-medium">PF / Exército</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-purple-400/25 text-purple-100 border border-purple-300/40 flex items-center justify-center flex-shrink-0 shadow-inner group-hover:scale-105 transition-transform duration-200">
            <ShieldCheck className="w-8 h-8 stroke-[1.6]" />
          </div>
        </div>

        {/* Card 3: Não controlados */}
        <div
          onClick={() => setFiltroSituacao('Não controlados')}
          className="bg-gradient-to-br from-[#2B7FFF] to-[#1E6BDB] text-white rounded-3xl p-6 sm:p-7 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-out cursor-pointer flex items-center justify-between min-h-[135px] border border-blue-400/30 group"
        >
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-300" />
              <h3 className="text-sm sm:text-base font-bold text-white/95">Não controlados</h3>
            </div>
            <div className="text-3xl sm:text-4xl font-black text-white tracking-tight font-mono leading-none">
              {naoControlados}
            </div>
            <p className="text-xs text-emerald-100 font-medium">Livre manuseio</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-emerald-400/25 text-emerald-100 border border-emerald-300/40 flex items-center justify-center flex-shrink-0 shadow-inner group-hover:scale-105 transition-transform duration-200">
            <CheckCircle2 className="w-8 h-8 stroke-[1.6]" />
          </div>
        </div>

        {/* Card 4: Atenção */}
        <div
          onClick={() => {
            setBusca('');
            setPagina(1);
          }}
          className="bg-gradient-to-br from-[#2B7FFF] to-[#1E6BDB] text-white rounded-3xl p-6 sm:p-7 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-out cursor-pointer flex items-center justify-between min-h-[135px] border border-blue-400/30 group"
        >
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-300" />
              <h3 className="text-sm sm:text-base font-bold text-white/95">Atenção</h3>
            </div>
            <div className="text-3xl sm:text-4xl font-black text-white tracking-tight font-mono leading-none">
              {atencao}
            </div>
            <p className="text-xs text-amber-100 font-medium">Estoque baixo</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-amber-400/25 text-amber-100 border border-amber-300/40 flex items-center justify-center flex-shrink-0 shadow-inner group-hover:scale-105 transition-transform duration-200">
            <AlertTriangle className="w-8 h-8 stroke-[1.6]" />
          </div>
        </div>
      </div>

      {/* BLOCO PRINCIPAL: CATÁLOGO DE PRODUTOS */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-zinc-200/80">
        {/* Cabeçalho do Bloco */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="text-base font-bold text-zinc-900">Catálogo de Produtos Químicos</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Consulte, cadastre e gerencie reagentes e fichas de segurança</p>
          </div>
          {!isAluno && (
            <button
              onClick={() => setModalNovoAberto(true)}
              className="flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 rounded-xl bg-[#2F80ED] hover:bg-blue-600 active:scale-95 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 transition cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Produto</span>
            </button>
          )}
        </div>

        {/* Barra de Filtros e Busca Espaçosa */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 mb-5">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value);
                setPagina(1);
              }}
              placeholder="Pesquisar produto ou CAS..."
              className="w-full h-10 pl-3.5 pr-9 text-xs sm:text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-[#2F80ED] focus:bg-white transition"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          </div>

          <div className="flex items-center gap-1.5 bg-zinc-100/90 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto">
            <button
              onClick={() => setFiltroSituacao('todos')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                filtroSituacao === 'todos' ? 'bg-white text-zinc-900 shadow-2xs font-bold' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Todos ({totalProdutos})
            </button>
            <button
              onClick={() => setFiltroSituacao('Controlados')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                filtroSituacao === 'Controlados' ? 'bg-white text-blue-700 shadow-2xs font-bold' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Controlados ({totalControlados})
            </button>
            <button
              onClick={() => setFiltroSituacao('Não controlados')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                filtroSituacao === 'Não controlados' ? 'bg-white text-zinc-900 shadow-2xs font-bold' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Não controlados ({totalNaoControlados})
            </button>
          </div>
        </div>

        {/* LISTA EM CARDS PARA DISPOSITIVOS MÓVEIS (SMARTPHONES < 768px) */}
        <div className="block md:hidden space-y-3">
          {produtosExibidos.length === 0 ? (
            <div className="py-10 text-center text-xs text-zinc-500 bg-zinc-50/50 rounded-xl p-4 border border-dashed border-zinc-200">
              <FlaskConical className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <p className="font-semibold text-zinc-800">
                {produtos.length === 0
                  ? 'Nenhum reagente cadastrado ainda'
                  : 'Nenhum reagente com os filtros informados'}
              </p>
              <p className="text-[11px] text-zinc-400 mt-1">
                {produtos.length === 0
                  ? (!isAluno ? 'Cadastre reagentes pelo botão "+ Novo Produto" acima.' : 'Aguardando liberação de reagentes pelo professor.')
                  : 'Tente alterar a pesquisa ou a situação legal.'}
              </p>
            </div>
          ) : (
            produtosExibidos.map((prod) => (
              <div
                key={prod.id}
                className={`bg-white rounded-xl p-3.5 border transition shadow-2xs space-y-3 ${
                  prod.id === produtoFocoId
                    ? 'border-emerald-400 bg-emerald-50/40 ring-1 ring-emerald-300'
                    : 'border-zinc-200/90'
                }`}
              >
                {/* Topo do Card: Nome e Situação */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-bold text-zinc-900 text-xs leading-snug">
                      {prod.nome}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[11px]">
                      <span className="font-mono text-zinc-500">{prod.cas}</span>
                      {prod.formulaQuimica && (
                        <>
                          <span className="text-zinc-300">·</span>
                          <span className="font-mono text-blue-600 font-semibold">{prod.formulaQuimica}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-semibold flex-shrink-0 ${getClassePerigoStyle(
                      prod.classePerigo
                    )}`}
                  >
                    {prod.classePerigo}
                  </span>
                </div>

                {/* Métricas do produto no card */}
                <div className="grid grid-cols-2 gap-2 text-[11px] bg-zinc-50/80 p-2.5 rounded-lg border border-zinc-100">
                  <div>
                    <span className="text-zinc-400 block text-[10px]">Estoque Atual:</span>
                    <strong className={`font-semibold ${prod.estoqueAtual <= prod.estoqueMinimo ? 'text-amber-600' : 'text-zinc-800'}`}>
                      {prod.estoqueAtual} {prod.unidade}
                    </strong>
                  </div>
                  <div>
                    <span className="text-zinc-400 block text-[10px]">Estoque Mínimo:</span>
                    <span className="text-zinc-600">{prod.estoqueMinimo} {prod.unidade}</span>
                  </div>
                  {prod.localizacao && (
                    <div className="col-span-2 text-zinc-500 text-[10px] truncate">
                      Local: <strong>{prod.localizacao}</strong>
                    </div>
                  )}
                </div>

                {/* Ações Mobile com toque confortável */}
                <div className="flex items-center justify-between pt-1 border-t border-zinc-100 gap-1.5 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setModalPdf({ tipo: 'FISPQ', produto: prod })}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-semibold border border-blue-200/80 active:bg-blue-100 cursor-pointer"
                    >
                      <FileText className="w-3 h-3" />
                      <span>FISPQ</span>
                    </button>
                    {!isAluno && (
                      <button
                        type="button"
                        onClick={() => setModalPdf({ tipo: 'Nota Fiscal', produto: prod })}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-100 text-zinc-700 text-[10px] font-semibold border border-zinc-200 active:bg-zinc-200 cursor-pointer"
                      >
                        <FileText className="w-3 h-3" />
                        <span>NF</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setModalVisualizar(prod)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-100 text-zinc-700 text-[10px] font-semibold border border-zinc-200 active:bg-zinc-200 cursor-pointer"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Ficha</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setModalConsumo(prod);
                        setConsumoQtd('');
                        setConsumoPratica('');
                        setConsumoObs('');
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/80 text-[10px] font-semibold active:bg-emerald-200 cursor-pointer"
                      title="Registrar consumo ou baixa no estoque deste reagente"
                    >
                      <MinusCircle className="w-3 h-3 text-emerald-600" />
                      <span>Baixa</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    {!isAluno && (
                      <>
                        {onGerarQRCode && (
                          <button
                            type="button"
                            onClick={() => onGerarQRCode(prod)}
                            className="p-1.5 rounded-lg text-purple-600 bg-purple-50 hover:bg-purple-100 transition cursor-pointer"
                            title="QR Code"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setModalEditar(prod)}
                          className="p-1.5 rounded-lg text-amber-600 bg-amber-50 hover:bg-amber-100 transition cursor-pointer"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setProdutoParaExcluir(prod)}
                          className="p-1.5 rounded-lg text-rose-600 bg-rose-50 hover:bg-rose-100 transition cursor-pointer"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Tabela de Produtos Química no Desktop / Tablet (>= 768px) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-zinc-400 font-bold border-b border-zinc-200/80 pb-3">
                <th className="pb-3 pl-2">PRODUTO</th>
                <th className="pb-3">CAS</th>
                <th className="pb-3">CLASSE DE PERIGO</th>
                <th className="pb-3">ESTOQUE ATUAL</th>
                <th className="pb-3 text-center">FISPQ</th>
                <th className="pb-3 text-center">NOTA FISCAL</th>
                <th className="pb-3">SITUAÇÃO LEGAL</th>
                <th className="pb-3 text-center pr-2">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {produtosExibidos.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-zinc-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                        <FlaskConical className="w-5 h-5" />
                      </div>
                      <span className="font-semibold text-zinc-800">
                        {produtos.length === 0
                          ? 'Nenhum reagente químico cadastrado no laboratório ainda'
                          : 'Nenhum reagente encontrado com os filtros atuais'}
                      </span>
                      <p className="text-[11px] text-zinc-400 max-w-sm">
                        {produtos.length === 0
                          ? (!isAluno
                              ? 'Clique no botão "+ Novo Produto" acima para cadastrar o primeiro reagente do laboratório.'
                              : 'O laboratório ainda não possui reagentes liberados pelo professor.')
                          : 'Tente alterar os termos da busca ou os filtros de situação legal.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                produtosExibidos.map((prod) => (
                  <tr
                    key={prod.id}
                    className={`transition-all duration-200 group ${
                      prod.id === produtoFocoId
                        ? 'bg-emerald-50/70 ring-2 ring-emerald-400 font-medium'
                        : 'hover:bg-blue-50/30'
                    }`}
                  >
                    {/* Nome do Produto */}
                    <td className="py-4 pl-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-zinc-900 text-xs sm:text-sm leading-tight">
                          {prod.nome}
                        </span>
                        {prod.id === produtoFocoId && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Escaneado via QR
                          </span>
                        )}
                      </div>
                      {prod.formulaQuimica && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-[11px] text-blue-600 font-bold tracking-wide">
                            {prod.formulaQuimica}
                          </span>
                          {prod.pureza && (
                            <>
                              <span className="text-zinc-300 text-[10px]">·</span>
                              <span className="text-zinc-500 text-[11px] font-medium">{prod.pureza}</span>
                            </>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Número CAS */}
                    <td className="py-4 font-mono text-zinc-500 text-xs font-medium">
                      {prod.cas}
                    </td>

                    {/* Classe de Perigo (Badge Colorido com Borda) */}
                    <td className="py-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-[11px] font-bold shadow-2xs ${getClassePerigoStyle(prod.classePerigo)}`}>
                        {prod.classePerigo}
                      </span>
                    </td>

                    {/* Estoque Atual com Indicador Visual */}
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                            prod.estoqueAtual <= 0
                              ? 'bg-rose-500'
                              : prod.estoqueAtual <= prod.estoqueMinimo
                              ? 'bg-amber-500 animate-pulse'
                              : 'bg-emerald-500'
                          }`}
                        />
                        <div>
                          <span className={`font-mono text-xs sm:text-sm font-bold ${
                            prod.estoqueAtual <= prod.estoqueMinimo ? 'text-amber-700' : 'text-zinc-900'
                          }`}>
                            {prod.estoqueAtual} {prod.unidade}
                          </span>
                          <span className="text-[10px] text-zinc-400 block font-normal leading-none mt-0.5">
                            Mínimo: {prod.estoqueMinimo} {prod.unidade}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* FISPQ (Botão PDF) */}
                    <td className="py-4 text-center">
                      <button
                        onClick={() => setModalPdf({ tipo: 'FISPQ', produto: prod })}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200/80 transition cursor-pointer shadow-2xs active:scale-95"
                        title="Abrir FISPQ em PDF"
                      >
                        <FileText className="w-3.5 h-3.5 text-blue-600" />
                        <span>FISPQ</span>
                      </button>
                    </td>

                    {/* Nota Fiscal */}
                    <td className="py-4 text-center">
                      <button
                        onClick={() => setModalPdf({ tipo: 'Nota Fiscal', produto: prod })}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold border border-zinc-200 transition cursor-pointer shadow-2xs active:scale-95"
                        title="Abrir Nota Fiscal em PDF"
                      >
                        <FileText className="w-3.5 h-3.5 text-zinc-500" />
                        <span>NF</span>
                      </button>
                    </td>

                    {/* Situação com Detalhes Diferenciados */}
                    <td className="py-4">
                      {prod.situacao === 'Controlado' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200 shadow-2xs">
                          <span className="w-2 h-2 rounded-full bg-blue-600" />
                          Controlado (PF/EB)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                          <span className="w-2 h-2 rounded-full bg-emerald-600" />
                          Não controlado
                        </span>
                      )}
                    </td>

                    {/* Ações com Ícones e Cores de Destaque */}
                    <td className="py-4 pr-2 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Baixa / Consumo Rápido */}
                        <button
                          type="button"
                          onClick={() => {
                            setModalConsumo(prod);
                            setConsumoQtd('');
                            setConsumoPratica('');
                            setConsumoObs('');
                          }}
                          className="p-2 rounded-xl text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition cursor-pointer shadow-2xs active:scale-95"
                          title="Registrar consumo ou baixa deste reagente"
                        >
                          <MinusCircle className="w-4 h-4" />
                        </button>

                        {/* Gerar QR Code */}
                        {onGerarQRCode && (
                          <button
                            type="button"
                            onClick={() => onGerarQRCode(prod)}
                            className="p-2 rounded-xl text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition cursor-pointer shadow-2xs active:scale-95"
                            title="Gerar Etiqueta & QR Code do Reagente"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>
                        )}

                        {/* Ver Detalhes */}
                        <button
                          type="button"
                          onClick={() => setModalVisualizar(prod)}
                          className="p-2 rounded-xl text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition cursor-pointer shadow-2xs active:scale-95"
                          title="Ver detalhes de segurança e especificações"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Editar & Excluir apenas para professor */}
                        {!isAluno && (
                          <>
                            <button
                              type="button"
                              onClick={() => setModalEditar(prod)}
                              className="p-2 rounded-xl text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition cursor-pointer shadow-2xs active:scale-95"
                              title="Editar reagente"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setProdutoParaExcluir(prod)}
                              className="p-2 rounded-xl text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition cursor-pointer shadow-2xs active:scale-95"
                              title="Excluir reagente"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação fiel ao Figma */}
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

      {/* MODAL: NOVO PRODUTO */}
      {!isAluno && modalNovoAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden animate-in fade-in zoom-in-95 max-h-[92vh] flex flex-col">
            <div className="px-4 sm:px-5 py-3.5 bg-zinc-900 text-white flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-[#2F80ED]" />
                <h3 className="text-xs font-bold uppercase tracking-wider">Cadastrar Novo Produto Químico</h3>
              </div>
              <button onClick={() => setModalNovoAberto(false)} className="text-zinc-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                const novoProduto: ProdutoQuimico = {
                  id: `PRD-${Date.now().toString().slice(-4)}`,
                  nome: (form.get('nome') as string).toUpperCase(),
                  cas: form.get('cas') as string,
                  classePerigo: form.get('classePerigo') as string,
                  corPerigo: 'amarelo',
                  situacao: (form.get('situacao') as any) || 'Não controlado',
                  estoqueAtual: Number(form.get('estoqueAtual')) || 0,
                  estoqueMinimo: Number(form.get('estoqueMinimo')) || 1,
                  unidade: (form.get('unidade') as any) || 'L',
                  validade: (form.get('validade') as string) || '12/2027',
                  localizacao: form.get('localizacao') as string,
                  fornecedorPrincipal: form.get('fornecedor') as string
                };
                onAddProduto(novoProduto);
                setModalNovoAberto(false);
              }}
              className="p-5 sm:p-6 space-y-4 text-xs sm:text-sm overflow-y-auto flex-1"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-zinc-700 mb-1.5 font-bold">Nome do Produto Químico *</label>
                  <input
                    type="text"
                    name="nome"
                    required
                    placeholder="Ex: ÁCIDO CLORÍDRICO 37% P.A."
                    className="w-full h-10 px-3.5 border border-zinc-300 rounded-xl text-xs sm:text-sm focus:border-[#2F80ED] focus:ring-2 focus:ring-blue-100 focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-zinc-700 mb-1.5 font-bold">Número CAS *</label>
                  <input
                    type="text"
                    name="cas"
                    required
                    placeholder="Ex: 7647-01-0"
                    className="w-full h-10 px-3.5 border border-zinc-300 rounded-xl text-xs sm:text-sm font-mono focus:border-[#2F80ED] focus:ring-2 focus:ring-blue-100 focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-zinc-700 mb-1.5 font-bold">Situação Legal *</label>
                  <select
                    name="situacao"
                    className="w-full h-10 px-3 border border-zinc-300 rounded-xl text-xs sm:text-sm focus:border-[#2F80ED] focus:ring-2 focus:ring-blue-100 focus:outline-none bg-white transition"
                  >
                    <option value="Controlado">Controlado (PF / Exército)</option>
                    <option value="Não controlado">Não controlado</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-zinc-700 mb-1.5 font-bold">Classe de Perigo (GHS) *</label>
                  <input
                    type="text"
                    name="classePerigo"
                    required
                    defaultValue="Líquido Inflamável Cat. 2"
                    className="w-full h-10 px-3.5 border border-zinc-300 rounded-xl text-xs sm:text-sm focus:border-[#2F80ED] focus:ring-2 focus:ring-blue-100 focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-zinc-700 mb-1.5 font-bold">Estoque Inicial</label>
                  <input
                    type="number"
                    step="0.1"
                    name="estoqueAtual"
                    required
                    defaultValue="1.0"
                    className="w-full h-10 px-3.5 border border-zinc-300 rounded-xl text-xs sm:text-sm focus:border-[#2F80ED] focus:ring-2 focus:ring-blue-100 focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-zinc-700 mb-1.5 font-bold">Unidade de Medida</label>
                  <select
                    name="unidade"
                    className="w-full h-10 px-3 border border-zinc-300 rounded-xl text-xs sm:text-sm focus:border-[#2F80ED] focus:ring-2 focus:ring-blue-100 focus:outline-none bg-white transition"
                  >
                    <option value="L">Litros (L)</option>
                    <option value="mL">Mililitros (mL)</option>
                    <option value="kg">Quilogramas (kg)</option>
                    <option value="g">Gramas (g)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-700 mb-1.5 font-bold">Estoque Mínimo</label>
                  <input
                    type="number"
                    step="0.1"
                    name="estoqueMinimo"
                    required
                    defaultValue="1.0"
                    className="w-full h-10 px-3.5 border border-zinc-300 rounded-xl text-xs sm:text-sm focus:border-[#2F80ED] focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-zinc-700 mb-1.5 font-bold">Validade</label>
                  <input
                    type="text"
                    name="validade"
                    required
                    placeholder="Ex: 08/2028"
                    className="w-full h-10 px-3.5 border border-zinc-300 rounded-xl text-xs sm:text-sm focus:border-[#2F80ED] focus:outline-none transition"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-zinc-700 mb-1.5 font-bold">Localização no Laboratório</label>
                  <input
                    type="text"
                    name="localizacao"
                    placeholder="Ex: Armário de Inflamáveis 01 (Prateleira 2)"
                    className="w-full h-10 px-3.5 border border-zinc-300 rounded-xl text-xs sm:text-sm focus:border-[#2F80ED] focus:outline-none transition"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalNovoAberto(false)}
                  className="px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100 rounded-xl border border-zinc-200 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#2F80ED] hover:bg-blue-600 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  Cadastrar Reagente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR PRODUTO */}
      {!isAluno && modalEditar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden animate-in fade-in zoom-in-95 max-h-[92vh] flex flex-col">
            <div className="px-4 sm:px-5 py-3.5 bg-zinc-900 text-white flex items-center justify-between flex-shrink-0">
              <h3 className="text-xs font-bold uppercase tracking-wider truncate mr-2">Editar Reagente: {modalEditar.nome}</h3>
              <button onClick={() => setModalEditar(null)} className="text-zinc-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                const atualizado: ProdutoQuimico = {
                  ...modalEditar,
                  nome: (form.get('nome') as string).toUpperCase(),
                  cas: form.get('cas') as string,
                  formulaQuimica: (form.get('formulaQuimica') as string) || modalEditar.formulaQuimica,
                  pureza: (form.get('pureza') as string) || modalEditar.pureza,
                  massaMolar: (form.get('massaMolar') as string) || modalEditar.massaMolar,
                  classePerigo: form.get('classePerigo') as string,
                  situacao: (form.get('situacao') as any) || 'Não controlado',
                  estoqueAtual: Number(form.get('estoqueAtual')) || 0,
                  unidade: (form.get('unidade') as string) || modalEditar.unidade,
                  estoqueMinimo: Number(form.get('estoqueMinimo')) || 1,
                  validade: form.get('validade') as string,
                  localizacao: form.get('localizacao') as string,
                  fornecedorPrincipal: form.get('fornecedorPrincipal') as string
                };
                onUpdateProduto(atualizado);
                mostrarToast(`Reagente "${atualizado.nome}" atualizado com sucesso!`);
                setModalEditar(null);
              }}
              className="p-4 sm:p-5 space-y-3 text-xs overflow-y-auto flex-1"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-zinc-600 mb-1 font-bold">Nome do Produto *</label>
                  <input
                    type="text"
                    name="nome"
                    defaultValue={modalEditar.nome}
                    required
                    className="w-full h-8 px-2.5 border border-zinc-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-zinc-600 mb-1 font-bold">CAS *</label>
                  <input
                    type="text"
                    name="cas"
                    defaultValue={modalEditar.cas}
                    required
                    className="w-full h-8 px-2.5 border border-zinc-300 rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-zinc-600 mb-1 font-bold">Situação Legal *</label>
                  <select
                    name="situacao"
                    defaultValue={modalEditar.situacao}
                    className="w-full h-8 px-2 border border-zinc-300 rounded-lg text-xs bg-white"
                  >
                    <option value="Controlado">Controlado (PF / Exército)</option>
                    <option value="Não controlado">Não controlado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-600 mb-1 font-bold">Fórmula Química</label>
                  <input
                    type="text"
                    name="formulaQuimica"
                    defaultValue={modalEditar.formulaQuimica}
                    placeholder="Ex: HCl, H2SO4"
                    className="w-full h-8 px-2.5 border border-zinc-300 rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-zinc-600 mb-1 font-bold">Grau de Pureza</label>
                  <input
                    type="text"
                    name="pureza"
                    defaultValue={modalEditar.pureza}
                    placeholder="Ex: 37% P.A., 99.8%"
                    className="w-full h-8 px-2.5 border border-zinc-300 rounded-lg text-xs"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-zinc-600 mb-1 font-bold">Classe de Perigo (GHS) *</label>
                  <input
                    type="text"
                    name="classePerigo"
                    defaultValue={modalEditar.classePerigo}
                    required
                    className="w-full h-8 px-2.5 border border-zinc-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-zinc-600 mb-1 font-bold">Estoque Atual *</label>
                  <input
                    type="number"
                    step="0.01"
                    name="estoqueAtual"
                    defaultValue={modalEditar.estoqueAtual}
                    required
                    className="w-full h-8 px-2.5 border border-zinc-300 rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-zinc-600 mb-1 font-bold">Unidade de Medida</label>
                  <select
                    name="unidade"
                    defaultValue={modalEditar.unidade}
                    className="w-full h-8 px-2 border border-zinc-300 rounded-lg text-xs bg-white"
                  >
                    <option value="L">Litros (L)</option>
                    <option value="mL">Mililitros (mL)</option>
                    <option value="kg">Quilogramas (kg)</option>
                    <option value="g">Gramas (g)</option>
                    <option value="frascos">Frascos</option>
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-600 mb-1 font-bold">Estoque Mínimo *</label>
                  <input
                    type="number"
                    step="0.01"
                    name="estoqueMinimo"
                    defaultValue={modalEditar.estoqueMinimo}
                    required
                    className="w-full h-8 px-2.5 border border-zinc-300 rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-zinc-600 mb-1 font-bold">Validade</label>
                  <input
                    type="text"
                    name="validade"
                    defaultValue={modalEditar.validade}
                    placeholder="Ex: 12/2027"
                    className="w-full h-8 px-2.5 border border-zinc-300 rounded-lg text-xs"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-zinc-600 mb-1 font-bold">Localização no Laboratório</label>
                  <input
                    type="text"
                    name="localizacao"
                    defaultValue={modalEditar.localizacao}
                    placeholder="Ex: Armário de Corrosivos 02"
                    className="w-full h-8 px-2.5 border border-zinc-300 rounded-lg text-xs"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-zinc-600 mb-1 font-bold">Fornecedor Principal</label>
                  <input
                    type="text"
                    name="fornecedorPrincipal"
                    defaultValue={modalEditar.fornecedorPrincipal}
                    placeholder="Ex: Merck, Synth, Vetec"
                    className="w-full h-8 px-2.5 border border-zinc-300 rounded-lg text-xs"
                  />
                </div>
              </div>
              <div className="pt-3 border-t border-zinc-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalEditar(null)}
                  className="px-3.5 py-1.5 text-xs text-zinc-600 hover:bg-zinc-100 rounded-lg transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#2F80ED] hover:bg-blue-600 active:scale-95 text-white text-xs font-bold transition cursor-pointer"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VISUALIZAR DETALHES COMPLETOS */}
      {modalVisualizar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden animate-in fade-in zoom-in-95 max-h-[92vh] flex flex-col">
            <div className="px-4 sm:px-5 py-3.5 bg-zinc-900 text-white flex items-center justify-between flex-shrink-0">
              <div className="min-w-0 mr-2">
                <span className="text-[10px] font-mono text-blue-400 block">{modalVisualizar.cas}</span>
                <h3 className="text-sm font-bold truncate">{modalVisualizar.nome}</h3>
              </div>
              <button onClick={() => setModalVisualizar(null)} className="text-zinc-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 sm:p-5 space-y-3 text-xs overflow-y-auto flex-1">
              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-100 space-y-1.5">
                {modalVisualizar.formulaQuimica && (
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Fórmula Molecular:</span>
                    <span className="font-mono font-bold text-blue-600">{modalVisualizar.formulaQuimica}</span>
                  </div>
                )}
                {modalVisualizar.massaMolar && (
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Massa Molar:</span>
                    <span className="font-medium text-zinc-700">{modalVisualizar.massaMolar}</span>
                  </div>
                )}
                {modalVisualizar.pureza && (
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Grau de Pureza:</span>
                    <span className="font-medium text-zinc-700">{modalVisualizar.pureza}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-zinc-400">Classificação GHS:</span>
                  <span className="font-semibold text-zinc-800">{modalVisualizar.classePerigo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Controle Legal:</span>
                  <span className={`font-semibold ${modalVisualizar.situacao === 'Controlado' ? 'text-blue-600' : 'text-purple-600'}`}>
                    {modalVisualizar.situacao}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Estoque no Laboratório:</span>
                  <strong className="text-zinc-900">{modalVisualizar.estoqueAtual} {modalVisualizar.unidade}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Validade Atual:</span>
                  <span>{modalVisualizar.validade}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Armazenamento:</span>
                  <span>{modalVisualizar.localizacao || 'Armário Central de Reagentes'}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setModalVisualizar(null);
                    setModalPdf({ tipo: 'FISPQ', produto: modalVisualizar });
                  }}
                  className="flex-1 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Visualizar FISPQ</span>
                </button>

                {!isAluno ? (
                  <>
                    {onGerarQRCode && (
                      <button
                        onClick={() => {
                          const p = modalVisualizar;
                          setModalVisualizar(null);
                          onGerarQRCode(p);
                        }}
                        className="flex-1 py-2 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer border border-purple-200"
                        title="Gerar Etiqueta & QR Code deste reagente"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>Gerar QR Code</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setModalVisualizar(null);
                        setModalPdf({ tipo: 'Nota Fiscal', produto: modalVisualizar });
                      }}
                      className="flex-1 py-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Nota Fiscal</span>
                    </button>
                  </>
                ) : (
                  onRegistrarUso && (
                    <button
                      onClick={() => {
                        const nome = modalVisualizar.nome;
                        setModalVisualizar(null);
                        onRegistrarUso(nome);
                      }}
                      className="flex-1 py-2 rounded-lg bg-[#2F80ED] hover:bg-[#256fd0] text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                    >
                      <FlaskConical className="w-3.5 h-3.5" />
                      <span>Registrar Uso</span>
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VISUALIZADOR DE PDF / FISPQ / NOTA FISCAL */}
      {modalPdf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden animate-in fade-in zoom-in-95 max-h-[92vh] flex flex-col">
            <div className="px-4 sm:px-5 py-3.5 bg-zinc-900 text-white flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0 mr-2">
                <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <h3 className="text-xs font-bold uppercase tracking-wider truncate">
                  {modalPdf.tipo} • {modalPdf.produto.nome}
                </h3>
              </div>
              <button onClick={() => setModalPdf(null)} className="text-zinc-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="border border-dashed border-zinc-300 rounded-xl p-6 text-center bg-zinc-50 space-y-2">
                <FileText className="w-10 h-10 text-[#2F80ED] mx-auto" />
                <h4 className="text-sm font-bold text-zinc-800">
                  Documento Oficial: {modalPdf.tipo} - {modalPdf.produto.nome}
                </h4>
                <p className="text-zinc-500 text-[11px] max-w-sm mx-auto">
                  {modalPdf.tipo === 'FISPQ'
                    ? `Ficha de Informações de Segurança de Produtos Químicos de acordo com a norma ABNT NBR 14725 e CAS ${modalPdf.produto.cas}.`
                    : `Nota Fiscal Eletrônica (Danfe) emitida pelo fornecedor principal ${modalPdf.produto.fornecedorPrincipal || 'Fornecedor Cadastrado'}.`}
                </p>
                <div className="pt-2">
                  <span className="inline-block px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-200">
                    Arquivo Certificado Digitalmente • PDF
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setModalPdf(null)}
                  className="px-4 py-2 rounded-lg text-xs text-zinc-600 hover:bg-zinc-100"
                >
                  Fechar
                </button>
                <button
                  onClick={() => {
                    mostrarToast(`Download do arquivo ${modalPdf.tipo} de ${modalPdf.produto.nome} concluído.`);
                    setModalPdf(null);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#2F80ED] hover:bg-blue-600 text-white text-xs font-semibold shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar Arquivo PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {produtoParaExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-zinc-200 p-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900">Remover Reagente</h3>
                <p className="text-xs text-zinc-500">Esta ação excluirá o item do catálogo.</p>
              </div>
            </div>

            <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 mb-4 text-xs space-y-1">
              <p className="font-semibold text-zinc-800">{produtoParaExcluir.nome}</p>
              <p className="text-zinc-500 font-mono text-[11px]">CAS: {produtoParaExcluir.cas}</p>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setProdutoParaExcluir(null)}
                className="px-3.5 py-2 rounded-lg text-xs text-zinc-600 hover:bg-zinc-100 font-medium transition"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onDeleteProduto(produtoParaExcluir.id);
                  mostrarToast(`Reagente "${produtoParaExcluir.nome}" removido do catálogo.`);
                  setProdutoParaExcluir(null);
                }}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs transition active:scale-95"
              >
                Sim, Remover
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR CONSUMO / BAIXA DE REAGENTE */}
      {modalConsumo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-zinc-200 overflow-hidden animate-in fade-in zoom-in-95 max-h-[92vh] flex flex-col">
            <div className="p-4 sm:p-5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200 shadow-2xs">
                  <FlaskConical className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">Registrar Consumo / Baixa de Reagente</h3>
                  <p className="text-[11px] text-zinc-500">Abate automático do estoque físico com disparo de avisos</p>
                </div>
              </div>
              <button
                onClick={() => setModalConsumo(null)}
                className="text-zinc-400 hover:text-zinc-600 p-1.5 rounded-lg hover:bg-zinc-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const qtd = parseFloat(consumoQtd);
                if (isNaN(qtd) || qtd <= 0) {
                  mostrarToast('Informe uma quantidade válida.');
                  return;
                }
                setSalvandoConsumo(true);
                try {
                  if (onRegistrarConsumoEAbater) {
                    await onRegistrarConsumoEAbater({
                      produtoNome: modalConsumo.nome,
                      quantidade: qtd,
                      unidade: modalConsumo.unidade,
                      autorNome: consumoAutor || (isAluno ? 'Aluno de Bancada' : 'Docente'),
                      autorPerfil: isAluno ? 'aluno' : 'professor',
                      bancada: consumoBancada,
                      pratica: consumoPratica || 'Uso em Bancada',
                      observacoes: consumoObs
                    });
                  }
                  mostrarToast(`Consumo de ${qtd} ${modalConsumo.unidade} registrado! Estoque atualizado e notificação enviada.`);
                  setModalConsumo(null);
                } catch (err: any) {
                  mostrarToast(`Erro ao registrar: ${err?.message || 'Falha no banco'}`);
                } finally {
                  setSalvandoConsumo(false);
                }
              }}
              className="p-5 space-y-4 text-xs overflow-y-auto flex-1"
            >
              {/* Painel com Informações do Reagente */}
              <div className="bg-zinc-50 p-3.5 rounded-xl border border-zinc-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-900 text-sm">{modalConsumo.nome}</span>
                  <span className="font-mono text-[11px] text-zinc-500">CAS: {modalConsumo.cas}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-200/60 text-[11px]">
                  <div>
                    <span className="text-zinc-400 block text-[10px]">Estoque Atual:</span>
                    <strong className="text-zinc-800 text-xs font-mono">{modalConsumo.estoqueAtual} {modalConsumo.unidade}</strong>
                  </div>
                  <div>
                    <span className="text-zinc-400 block text-[10px]">Estoque Mínimo de Segurança:</span>
                    <span className="text-zinc-600 text-xs font-mono">{modalConsumo.estoqueMinimo} {modalConsumo.unidade}</span>
                  </div>
                </div>
              </div>

              {/* Quantidade a abater */}
              <div>
                <label className="block text-zinc-700 font-bold mb-1">
                  Quantidade Utilizada ({modalConsumo.unidade}) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={consumoQtd}
                  onChange={(e) => setConsumoQtd(e.target.value)}
                  placeholder={`Ex: 0.5 ou 2 (${modalConsumo.unidade})`}
                  className="w-full h-10 px-3.5 border border-zinc-300 rounded-xl text-sm font-mono focus:border-[#2F80ED] focus:ring-2 focus:ring-blue-100 focus:outline-none transition"
                />
              </div>

              {/* Cálculo e Alertas em Tempo Real */}
              {consumoQtd && !isNaN(parseFloat(consumoQtd)) && (
                <div className={`p-3 rounded-xl border text-[11px] space-y-1.5 transition ${
                  Math.max(0, Number(modalConsumo.estoqueAtual) - parseFloat(consumoQtd)) <= 0
                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                    : Math.max(0, Number(modalConsumo.estoqueAtual) - parseFloat(consumoQtd)) <= Number(modalConsumo.estoqueMinimo)
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}>
                  <div className="flex items-center justify-between font-bold">
                    <span>Saldo em estoque após este uso:</span>
                    <span className="font-mono text-sm">
                      {Math.max(0, Number(modalConsumo.estoqueAtual) - parseFloat(consumoQtd)).toFixed(2)} {modalConsumo.unidade}
                    </span>
                  </div>
                  {Math.max(0, Number(modalConsumo.estoqueAtual) - parseFloat(consumoQtd)) <= 0 ? (
                    <p className="text-[10.5px] text-rose-700 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-rose-600" />
                      <span>🚨 ATENÇÃO: Esta retirada irá ESGOTAR completamente o estoque deste reagente! Um aviso prioritário será disparado para a Central de Avisos para que o professor inicie uma compra imediata.</span>
                    </p>
                  ) : Math.max(0, Number(modalConsumo.estoqueAtual) - parseFloat(consumoQtd)) <= Number(modalConsumo.estoqueMinimo) ? (
                    <p className="text-[10.5px] text-amber-700 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-amber-600" />
                      <span>⚠️ ATENÇÃO: O saldo ficará abaixo do estoque mínimo operacional ({modalConsumo.estoqueMinimo} {modalConsumo.unidade}). A Central de Avisos notificará o professor para realizar novo pedido com fornecedores.</span>
                    </p>
                  ) : (
                    <p className="text-[10.5px] text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 text-emerald-600" />
                      <span>Estoque permanecerá em nível seguro após este consumo.</span>
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-700 font-bold mb-1">Responsável pelo Uso *</label>
                  <input
                    type="text"
                    required
                    value={consumoAutor}
                    onChange={(e) => setConsumoAutor(e.target.value)}
                    placeholder="Nome do aluno ou professor"
                    className="w-full h-9 px-3 border border-zinc-300 rounded-lg text-xs focus:border-[#2F80ED] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-zinc-700 font-bold mb-1">Bancada / Laboratório</label>
                  <input
                    type="text"
                    value={consumoBancada}
                    onChange={(e) => setConsumoBancada(e.target.value)}
                    placeholder="Ex: Bancada 02, Capela 01"
                    className="w-full h-9 px-3 border border-zinc-300 rounded-lg text-xs focus:border-[#2F80ED] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-700 font-bold mb-1">Finalidade / Aula Prática</label>
                <input
                  type="text"
                  value={consumoPratica}
                  onChange={(e) => setConsumoPratica(e.target.value)}
                  placeholder="Ex: Titulação ácido-base, Cromatografia, Síntese orgânica"
                  className="w-full h-9 px-3 border border-zinc-300 rounded-lg text-xs focus:border-[#2F80ED] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-700 font-bold mb-1">Observações (Opcional)</label>
                <textarea
                  value={consumoObs}
                  onChange={(e) => setConsumoObs(e.target.value)}
                  rows={2}
                  placeholder="Alguma observação relevante sobre o frasco, lote ou descarte..."
                  className="w-full p-2.5 border border-zinc-300 rounded-lg text-xs focus:border-[#2F80ED] focus:outline-none resize-none"
                />
              </div>

              <div className="pt-3 border-t border-zinc-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setModalConsumo(null)}
                  className="px-4 py-2 text-xs text-zinc-600 hover:bg-zinc-100 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoConsumo}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold shadow-md transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{salvandoConsumo ? 'Registrando...' : 'Confirmar Retirada & Abater Estoque'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
