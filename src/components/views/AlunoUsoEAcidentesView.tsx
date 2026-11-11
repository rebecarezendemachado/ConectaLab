import React, { useState } from 'react';
import {
  FileText,
  AlertOctagon,
  Plus,
  Send,
  Clock,
  User,
  FlaskConical,
  ShieldAlert,
  CheckCircle2,
  Check,
  AlertTriangle,
  Info,
  Calendar,
  Layers,
  Sparkles,
  Search,
  Eye,
  X
} from 'lucide-react';
import { ProdutoQuimico, RegistroConsumoAluno, RelatoOcorrenciaAluno } from '../../types';

interface AlunoUsoEAcidentesViewProps {
  produtos: ProdutoQuimico[];
  consumos: RegistroConsumoAluno[];
  ocorrencias: RelatoOcorrenciaAluno[];
  onAddConsumo: (novo: RegistroConsumoAluno) => void;
  onAddOcorrencia: (novo: RelatoOcorrenciaAluno) => void;
  onMarcarVistoConsumo?: (id: string) => void;
  onAtualizarStatusOcorrencia?: (id: string, status: 'Notificado' | 'Em atendimento' | 'Concluído') => void;
  isAluno: boolean;
}

export const AlunoUsoEAcidentesView: React.FC<AlunoUsoEAcidentesViewProps> = ({
  produtos,
  consumos,
  ocorrencias,
  onAddConsumo,
  onAddOcorrencia,
  onMarcarVistoConsumo,
  onAtualizarStatusOcorrencia,
  isAluno
}) => {
  const [abaAtiva, setAbaAtiva] = useState<'consumo' | 'acidente' | 'historico'>('consumo');
  const [toast, setToast] = useState<string | null>(null);

  // Estados do formulário de consumo
  const [produtoSelecionado, setProdutoSelecionado] = useState(produtos[0]?.nome || '');
  const [quantidade, setQuantidade] = useState<string>('');
  const [unidade, setUnidade] = useState<'mL' | 'g' | 'L' | 'gotas'>('mL');
  const [pratica, setPratica] = useState('');
  const [bancada, setBancada] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [alunoNome, setAlunoNome] = useState('');
  const [turma, setTurma] = useState('');

  // Estados do formulário de acidente
  const [tipoOcorrencia, setTipoOcorrencia] = useState<RelatoOcorrenciaAluno['tipoOcorrencia']>('Quebra de vidraria');
  const [reagenteOcorrencia, setReagenteOcorrencia] = useState('');
  const [gravidade, setGravidade] = useState<RelatoOcorrenciaAluno['gravidade']>('Leve (sem lesão)');
  const [descricaoOcorrencia, setDescricaoOcorrencia] = useState('');
  const [primeirosSocorros, setPrimeirosSocorros] = useState('');
  const [houveFerimento, setHouveFerimento] = useState(false);

  // Filtros de busca no histórico
  const [buscaHistorico, setBuscaHistorico] = useState('');
  const [detalheItem, setDetalheItem] = useState<RegistroConsumoAluno | RelatoOcorrenciaAluno | null>(null);

  const mostrarToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleSubmeterConsumo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!produtoSelecionado || !quantidade || Number(quantidade) <= 0) {
      mostrarToast('Informe o reagente e uma quantidade válida.');
      return;
    }

    const agora = new Date();
    const dataFormatada = agora.toLocaleDateString('pt-BR');
    const horaFormatada = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const novoConsumo: RegistroConsumoAluno = {
      id: `CSM-${Date.now().toString().slice(-6)}`,
      alunoNome: alunoNome || 'Aluno(a)',
      turma: turma || 'Turma Geral',
      bancada: bancada || 'Bancada Geral',
      pratica: pratica || 'Prática de Bancada',
      produtoNome: produtoSelecionado,
      quantidadeUsada: Number(quantidade),
      unidade,
      data: dataFormatada,
      hora: horaFormatada,
      professorOrientador: 'Docente Responsável',
      observacoes: observacoes.trim() || undefined,
      statusVisto: 'Pendente'
    };

    onAddConsumo(novoConsumo);
    setQuantidade('');
    setObservacoes('');
    mostrarToast('✅ Registro de consumo enviado com sucesso ao laboratório!');
    setAbaAtiva('historico');
  };

  const handleSubmeterOcorrencia = (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricaoOcorrencia.trim()) {
      mostrarToast('Por favor, descreva detalhadamente o ocorrido.');
      return;
    }

    const agora = new Date();
    const dataFormatada = agora.toLocaleDateString('pt-BR');
    const horaFormatada = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const novaOcorrencia: RelatoOcorrenciaAluno = {
      id: `OCO-${Date.now().toString().slice(-6)}`,
      alunoNome: alunoNome || 'Aluno da Bancada',
      turma: turma || '3º Ano B',
      bancada: bancada || 'Bancada 04',
      tipoOcorrencia,
      reagenteEnvolvido: reagenteOcorrencia || undefined,
      gravidade,
      descricao: descricaoOcorrencia,
      primeirosSocorrosAdotados: primeirosSocorros || (houveFerimento ? 'Atendimento no lava-olhos / primeiros socorros' : 'Área isolada e limpa conforme normas.'),
      data: dataFormatada,
      hora: horaFormatada,
      status: 'Notificado'
    };

    onAddOcorrencia(novaOcorrencia);
    setDescricaoOcorrencia('');
    setPrimeirosSocorros('');
    setReagenteOcorrencia('');
    mostrarToast('🚨 Relato de acidente/incidente enviado! O professor foi notificado.');
    setAbaAtiva('historico');
  };

  const consumosFiltrados = consumos.filter((c) =>
    c.produtoNome.toLowerCase().includes(buscaHistorico.toLowerCase()) ||
    c.alunoNome.toLowerCase().includes(buscaHistorico.toLowerCase()) ||
    c.pratica.toLowerCase().includes(buscaHistorico.toLowerCase())
  );

  const ocorrenciasFiltradas = ocorrencias.filter((o) =>
    o.tipoOcorrencia.toLowerCase().includes(buscaHistorico.toLowerCase()) ||
    o.alunoNome.toLowerCase().includes(buscaHistorico.toLowerCase()) ||
    o.descricao.toLowerCase().includes(buscaHistorico.toLowerCase())
  );

  return (
    <div className="space-y-5 relative">
      {/* Toast de Feedback */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 bg-zinc-900 text-white text-xs font-semibold rounded-xl shadow-2xl border border-zinc-700 animate-in fade-in slide-in-from-top-4">
          <Sparkles className="w-4 h-4 text-blue-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Cabeçalho do Módulo */}
      <div className="bg-white rounded-xl p-5 shadow-xs border border-zinc-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
              {isAluno ? 'Bancada do Estudante' : 'Controle de Bancada Docente'}
            </span>
            <span className="text-xs text-zinc-400">•</span>
            <span className="text-xs text-zinc-500 font-medium">
              {isAluno ? 'Registros de Aulas Práticas & Ocorrências' : 'Supervisão de Consumo & Incidentes dos Alunos'}
            </span>
          </div>
          <h2 className="text-lg font-bold text-zinc-900 mt-1">
            {isAluno ? 'Registro de Uso & Comunicação de Acidentes' : 'Relatos de Consumo e Incidentes dos Alunos'}
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {isAluno
              ? 'Mantenha o inventário atualizado informando os reagentes utilizados e relate qualquer incidente para auxílio imediato.'
              : 'Acompanhe as quantidades utilizadas pelos estudantes nas bancadas e os incidentes relatados em tempo real.'}
          </p>
        </div>

        {/* Abas Superiores */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-100 rounded-xl border border-zinc-200 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setAbaAtiva('consumo')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
              abaAtiva === 'consumo'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60'
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5 text-blue-500" />
            <span>Registrar Uso</span>
          </button>

          <button
            type="button"
            onClick={() => setAbaAtiva('acidente')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
              abaAtiva === 'acidente'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-zinc-600 hover:text-rose-700 hover:bg-rose-50'
            }`}
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>Relatar Incidente</span>
          </button>

          <button
            type="button"
            onClick={() => setAbaAtiva('historico')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
              abaAtiva === 'historico'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-zinc-500" />
            <span>Histórico ({consumos.length + ocorrencias.length})</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ABA 1: FORMULÁRIO DE REGISTRO DE USO DE REAGENTES                         */}
      {/* ========================================================================= */}
      {abaAtiva === 'consumo' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Formulário Principal */}
          <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-xs border border-zinc-200/80">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
                  <FlaskConical className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">Formulário de Consumo na Bancada</h3>
                  <p className="text-[11px] text-zinc-500">Registre a quantidade exata utilizada na aula de hoje</p>
                </div>
              </div>
              <span className="text-[11px] font-medium text-zinc-400 bg-zinc-50 px-2.5 py-1 rounded-md border border-zinc-200">
                {bancada}
              </span>
            </div>

            <form onSubmit={handleSubmeterConsumo} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Seleção do Reagente */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="block text-xs font-semibold text-zinc-700">
                    Reagente Químico Utilizado <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={produtoSelecionado}
                    onChange={(e) => setProdutoSelecionado(e.target.value)}
                    required
                    className="w-full h-10 px-3 text-xs text-zinc-800 bg-zinc-50/50 rounded-lg border border-zinc-300 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                  >
                    {produtos.map((p) => (
                      <option key={p.id} value={p.nome}>
                        {p.nome} {p.formulaQuimica ? `(${p.formulaQuimica})` : ''} — {p.classePerigo}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantidade */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-zinc-700">
                    Quantidade Utilizada <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      required
                      value={quantidade}
                      onChange={(e) => setQuantidade(e.target.value)}
                      placeholder="Ex: 25"
                      className="flex-1 h-10 px-3 text-xs text-zinc-800 bg-white rounded-lg border border-zinc-300 focus:outline-none focus:border-blue-500 transition"
                    />
                    <select
                      value={unidade}
                      onChange={(e) => setUnidade(e.target.value as any)}
                      className="w-24 h-10 px-2 text-xs text-zinc-800 bg-zinc-50 rounded-lg border border-zinc-300 focus:outline-none focus:border-blue-500 font-medium"
                    >
                      <option value="mL">mL</option>
                      <option value="L">L</option>
                      <option value="g">g</option>
                      <option value="gotas">gotas</option>
                    </select>
                  </div>
                </div>

                {/* Experimento / Prática */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-zinc-700">
                    Experimento / Aula Prática
                  </label>
                  <input
                    type="text"
                    value={pratica}
                    onChange={(e) => setPratica(e.target.value)}
                    placeholder="Ex: Titulação Ácido-Base"
                    className="w-full h-10 px-3 text-xs text-zinc-800 bg-white rounded-lg border border-zinc-300 focus:outline-none focus:border-blue-500 transition"
                  />
                </div>

                {/* Bancada / Capela */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-zinc-700">
                    Bancada ou Local do Experimento
                  </label>
                  <input
                    type="text"
                    value={bancada}
                    onChange={(e) => setBancada(e.target.value)}
                    placeholder="Ex: Bancada 04 / Capela 01"
                    className="w-full h-10 px-3 text-xs text-zinc-800 bg-white rounded-lg border border-zinc-300 focus:outline-none focus:border-blue-500 transition"
                  />
                </div>

                {/* Aluno e Turma */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-zinc-700">
                    Nome do Aluno / Responsável
                  </label>
                  <input
                    type="text"
                    value={alunoNome}
                    onChange={(e) => setAlunoNome(e.target.value)}
                    className="w-full h-10 px-3 text-xs text-zinc-800 bg-white rounded-lg border border-zinc-300 focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
              </div>

              {/* Observações */}
              <div className="space-y-1 pt-1">
                <label className="block text-xs font-semibold text-zinc-700">
                  Observações Técnicas / Destino do Resíduo (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Ex: Resíduo neutralizado com bicarbonato e descartado no frasco de resíduos aquosos nº 03..."
                  className="w-full p-3 text-xs text-zinc-800 bg-white rounded-lg border border-zinc-300 focus:outline-none focus:border-blue-500 transition resize-none"
                />
              </div>

              {/* Botão de Envio */}
              <div className="pt-2 flex items-center justify-between">
                <span className="text-[11px] text-zinc-500 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-blue-500" />
                  Os dados são sincronizados com o estoque do laboratório.
                </span>

                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#2F80ED] hover:bg-[#256fd0] text-white text-xs font-semibold shadow-sm transition active:scale-[0.98] cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Enviar Registro de Uso</span>
                </button>
              </div>
            </form>
          </div>

          {/* Painel Lateral: Instruções e Últimos Registros */}
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50/40 rounded-xl p-5 border border-blue-200/80 text-xs">
              <div className="flex items-center gap-2 font-bold text-blue-900 mb-2">
                <ShieldAlert className="w-4 h-4 text-blue-600" />
                <span>Boas Práticas de Bancada</span>
              </div>
              <ul className="space-y-2 text-zinc-600 text-[11px] leading-relaxed">
                <li className="flex items-start gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1 flex-shrink-0" />
                  <span>Nunca devolva reagente que sobrou para o frasco original.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1 flex-shrink-0" />
                  <span>Substâncias voláteis ou tóxicas devem ser manuseadas sob capela de exaustão.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1 flex-shrink-0" />
                  <span>Rotule sempre os béqueres e frascos intermediários com nome e data.</span>
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-xl p-5 shadow-xs border border-zinc-200/80">
              <h4 className="text-xs font-bold text-zinc-900 mb-3 flex items-center justify-between">
                <span>Últimos Usos Registrados</span>
                <button
                  type="button"
                  onClick={() => setAbaAtiva('historico')}
                  className="text-[10px] text-blue-600 hover:underline font-normal"
                >
                  Ver todos
                </button>
              </h4>
              <div className="space-y-2.5">
                {consumos.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-100 flex items-center justify-between text-xs"
                  >
                    <div>
                      <strong className="block text-zinc-800 text-[11px] leading-tight truncate max-w-[150px]">
                        {item.produtoNome}
                      </strong>
                      <span className="text-[10px] text-zinc-500">
                        {item.quantidadeUsada} {item.unidade} • {item.alunoNome}
                      </span>
                    </div>
                    <span
                      className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border ${
                        item.statusVisto === 'Visto pelo Professor'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {item.statusVisto}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: FORMULÁRIO DE RELATO DE INCIDENTES / ACIDENTES (SOS)                */}
      {/* ========================================================================= */}
      {abaAtiva === 'acidente' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-xs border border-red-200">
            <div className="flex items-center justify-between pb-4 border-b border-rose-100 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600 border border-rose-200">
                  <AlertOctagon className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-rose-950 flex items-center gap-2">
                    <span>Comunicação Imediata de Incidente / Acidente</span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-800 uppercase tracking-wider">
                      Urgência
                    </span>
                  </h3>
                  <p className="text-[11px] text-rose-700/80">
                    Notifique o professor ou técnico imediatamente para suporte e registro institucional
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmeterOcorrencia} className="space-y-4">
              {/* Tipo de Ocorrência */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-zinc-800">
                  Natureza do Incidente <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(
                    [
                      'Quebra de vidraria',
                      'Derramamento de reagente',
                      'Contato cutâneo/ocular',
                      'Inalação de vapores',
                      'Queimadura',
                      'Outro'
                    ] as RelatoOcorrenciaAluno['tipoOcorrencia'][]
                  ).map((tipo) => (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => setTipoOcorrencia(tipo)}
                      className={`p-2 rounded-lg text-xs font-medium border text-left transition ${
                        tipoOcorrencia === tipo
                          ? 'bg-rose-50 border-rose-400 text-rose-900 font-bold shadow-xs'
                          : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                      }`}
                    >
                      {tipo}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Reagente Envolvido */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-zinc-700">
                    Reagente ou Material Envolvido
                  </label>
                  <input
                    type="text"
                    value={reagenteOcorrencia}
                    onChange={(e) => setReagenteOcorrencia(e.target.value)}
                    placeholder="Ex: Ácido Sulfúrico 98% / Béquer 250mL"
                    className="w-full h-10 px-3 text-xs text-zinc-800 bg-white rounded-lg border border-zinc-300 focus:outline-none focus:border-rose-500 transition"
                  />
                </div>

                {/* Grau de Gravidade */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-zinc-700">
                    Gravidade Estimada <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={gravidade}
                    onChange={(e) => setGravidade(e.target.value as any)}
                    className="w-full h-10 px-3 text-xs text-zinc-800 bg-zinc-50 rounded-lg border border-zinc-300 focus:outline-none focus:border-rose-500 font-semibold"
                  >
                    <option value="Leve (sem lesão)">Leve (sem lesão ou dano físico)</option>
                    <option value="Moderada (lava-olhos/EPI)">Moderada (uso de lava-olhos/EPI necessário)</option>
                    <option value="Grave (necessitou socorro médico)">Grave (necessitou ou requer socorro médico imediato)</option>
                  </select>
                </div>
              </div>

              {/* Descrição detalhada */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-zinc-700">
                  Como aconteceu o acidente? <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={descricaoOcorrencia}
                  onChange={(e) => setDescricaoOcorrencia(e.target.value)}
                  placeholder="Descreva exatamente o que ocorreu (ex: o tubo de ensaio trincou na chama, derramando cerca de 5mL sobre a bancada próxima à pia...)"
                  className="w-full p-3 text-xs text-zinc-800 bg-white rounded-lg border border-zinc-300 focus:outline-none focus:border-rose-500 transition resize-none"
                />
              </div>

              {/* Primeiros Socorros adotados */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-zinc-700">
                  Medidas e Primeiros Socorros Adotados Imediatamente
                </label>
                <input
                  type="text"
                  value={primeirosSocorros}
                  onChange={(e) => setPrimeirosSocorros(e.target.value)}
                  placeholder="Ex: Lavado em água corrente abundante por 15 minutos / bancada neutralizada..."
                  className="w-full h-10 px-3 text-xs text-zinc-800 bg-white rounded-lg border border-zinc-300 focus:outline-none focus:border-rose-500 transition"
                />
              </div>

              {/* Houve ferimento */}
              <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span className="text-xs font-semibold text-rose-950">
                    Alguém sofreu ferimento, queimadura ou contato direto?
                  </span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={houveFerimento}
                    onChange={(e) => setHouveFerimento(e.target.checked)}
                    className="w-4 h-4 rounded border-rose-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-rose-900">{houveFerimento ? 'SIM' : 'NÃO'}</span>
                </label>
              </div>

              {/* Botão de Envio de Ocorrência */}
              <div className="pt-2 flex items-center justify-between">
                <span className="text-[11px] text-zinc-500">
                  Em caso de emergência, chame o professor em voz alta imediatamente!
                </span>

                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition active:scale-[0.98] cursor-pointer"
                >
                  <AlertOctagon className="w-4 h-4" />
                  <span>Enviar Relato de Ocorrência</span>
                </button>
              </div>
            </form>
          </div>

          {/* Protocolos de Emergência Imediata */}
          <div className="space-y-4">
            <div className="bg-rose-950 text-white rounded-xl p-5 border border-rose-800 shadow-md">
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-300 mb-2 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>Primeiros Socorros Imediatos</span>
              </h4>
              <div className="space-y-3 text-[11px] text-rose-100/90 leading-relaxed">
                <div>
                  <strong className="block text-white">Contato com Pele ou Olhos:</strong>
                  Lavar imediatamente no lava-olhos ou chuveiro de emergência por no mínimo 15 minutos ininterruptos.
                </div>
                <div>
                  <strong className="block text-white">Queimadura Térmica:</strong>
                  Colocar a área sob água fria corrente. Nunca aplicar pasta de dente ou substâncias caseiras.
                </div>
                <div>
                  <strong className="block text-white">Quebra de Vidros:</strong>
                  Não pegue os cacos com as mãos desprotegidas. Use vassourinha e pá plástica. Descarte na caixa amarela de vidros.
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-xs border border-zinc-200 text-xs space-y-2">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                Contatos do Laboratório
              </span>
              <p className="font-semibold text-zinc-800">Técnico Responsável: Ramal 204</p>
              <p className="font-semibold text-zinc-800">Docente do Laboratório: Ramal 218</p>
              <p className="text-rose-600 font-bold">SAMU: 192 • Bombeiros: 193</p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 3: HISTÓRICO DE CONSUMOS E OCORRÊNCIAS                                 */}
      {/* ========================================================================= */}
      {abaAtiva === 'historico' && (
        <div className="space-y-5">
          {/* Barra de Busca no Histórico */}
          <div className="bg-white rounded-xl p-4 shadow-xs border border-zinc-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                value={buscaHistorico}
                onChange={(e) => setBuscaHistorico(e.target.value)}
                placeholder="Buscar por reagente, aluno ou tipo..."
                className="w-full h-9 pl-9 pr-3 text-xs bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:border-blue-500"
              />
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>

            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span>Total de Usos: <strong className="text-zinc-800">{consumos.length}</strong></span>
              <span>•</span>
              <span>Total de Incidentes: <strong className="text-rose-600">{ocorrencias.length}</strong></span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Lista 1: Usos de Reagentes */}
            <div className="bg-white rounded-xl p-5 shadow-xs border border-zinc-200/80 flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100 mb-3">
                <h3 className="text-xs font-bold text-zinc-900 flex items-center gap-2">
                  <FlaskConical className="w-4 h-4 text-blue-500" />
                  <span>Consumos de Bancada Enviados</span>
                </h3>
                <span className="text-[10px] text-zinc-400">{consumosFiltrados.length} registros</span>
              </div>

              <div className="space-y-2.5 overflow-y-auto max-h-[480px] pr-1">
                {consumosFiltrados.length === 0 ? (
                  <p className="text-xs text-zinc-400 py-6 text-center">Nenhum registro de consumo localizado.</p>
                ) : (
                  consumosFiltrados.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-lg border border-zinc-100 hover:border-blue-200 bg-zinc-50/50 hover:bg-blue-50/20 transition space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-blue-600">{item.id}</span>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                              item.statusVisto === 'Visto pelo Professor'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {item.statusVisto}
                          </span>
                          {!isAluno && item.statusVisto === 'Pendente' && onMarcarVistoConsumo && (
                            <button
                              type="button"
                              onClick={() => {
                                onMarcarVistoConsumo(item.id);
                                mostrarToast(`Consumo ${item.id} validado pelo docente!`);
                              }}
                              className="px-2 py-0.5 rounded text-[9px] font-semibold bg-blue-600 text-white hover:bg-blue-700 transition"
                            >
                              Dar Visto
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <strong className="text-xs text-zinc-900">{item.produtoNome}</strong>
                        <span className="text-xs font-mono font-bold text-zinc-800 bg-white px-2 py-0.5 rounded border border-zinc-200">
                          {item.quantidadeUsada} {item.unidade}
                        </span>
                      </div>

                      <div className="text-[11px] text-zinc-500 flex items-center justify-between">
                        <span>Aluno: {item.alunoNome} ({item.bancada})</span>
                        <span>{item.data} às {item.hora}</span>
                      </div>

                      {item.observacoes && (
                        <p className="text-[10px] text-zinc-600 bg-white p-2 rounded border border-zinc-100 italic">
                          "{item.observacoes}"
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Lista 2: Relatos de Incidentes / Acidentes */}
            <div className="bg-white rounded-xl p-5 shadow-xs border border-zinc-200/80 flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100 mb-3">
                <h3 className="text-xs font-bold text-zinc-900 flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4 text-rose-500" />
                  <span>Ocorrências & Incidentes Reportados</span>
                </h3>
                <span className="text-[10px] text-rose-600 font-semibold">{ocorrenciasFiltradas.length} relatos</span>
              </div>

              <div className="space-y-2.5 overflow-y-auto max-h-[480px] pr-1">
                {ocorrenciasFiltradas.length === 0 ? (
                  <p className="text-xs text-zinc-400 py-6 text-center">Nenhum incidente ou acidente reportado.</p>
                ) : (
                  ocorrenciasFiltradas.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-lg border border-rose-100 hover:border-rose-300 bg-rose-50/20 hover:bg-rose-50/40 transition space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold text-rose-600">{item.id}</span>
                          <span className="text-[10px] font-bold text-zinc-800">{item.tipoOcorrencia}</span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                            item.gravidade.includes('Grave')
                              ? 'bg-rose-100 text-rose-800 border-rose-300'
                              : item.gravidade.includes('Moderada')
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : 'bg-zinc-100 text-zinc-700 border-zinc-200'
                          }`}
                        >
                          {item.gravidade}
                        </span>
                      </div>

                      <p className="text-xs text-zinc-700 leading-snug">
                        {item.descricao}
                      </p>

                      <div className="text-[10px] text-zinc-500 flex items-center justify-between pt-1 border-t border-rose-100/60">
                        <span>Aluno: {item.alunoNome} • {item.bancada}</span>
                        <span>{item.data} às {item.hora}</span>
                      </div>

                      {item.primeirosSocorrosAdotados && (
                        <div className="text-[10px] text-emerald-800 bg-emerald-50/80 p-1.5 rounded border border-emerald-200">
                          <strong>Socorros:</strong> {item.primeirosSocorrosAdotados}
                        </div>
                      )}

                      {!isAluno && onAtualizarStatusOcorrencia && (
                        <div className="flex items-center justify-end gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => onAtualizarStatusOcorrencia(item.id, 'Concluído')}
                            className="px-2 py-0.5 rounded text-[9px] font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition"
                          >
                            Marcar como Concluído
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
