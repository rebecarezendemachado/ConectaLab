import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  ShoppingCart,
  Bell,
  FlaskConical,
  Clock,
  User,
  Filter,
  CheckCheck
} from 'lucide-react';
import { ProdutoQuimico, EstoqueItem, AlertaNotificacao, RegistroConsumoAluno } from '../../types';

interface AlertasViewProps {
  produtos?: ProdutoQuimico[];
  estoque?: EstoqueItem[];
  alertas?: AlertaNotificacao[];
  consumos?: RegistroConsumoAluno[];
  onNavigateToCompras?: (produtoNome?: string) => void;
  onMarcarLido?: (id: string) => void;
  isAluno?: boolean;
}

export const AlertasView: React.FC<AlertasViewProps> = ({
  produtos = [],
  estoque = [],
  alertas = [],
  consumos = [],
  onNavigateToCompras,
  onMarcarLido,
  isAluno = false
}) => {
  const [filtroAba, setFiltroAba] = useState<'todos' | 'consumos' | 'criticos' | 'alteracoes'>('todos');
  const [descartados, setDescartados] = useState<string[]>([]);

  // Mesclar alertas persistidos no banco com alertas dinâmicos de estoque
  const todosAlertas = useMemo<AlertaNotificacao[]>(() => {
    const mapa = new Map<string, AlertaNotificacao>();

    // 1. Alertas persistidos no banco
    alertas.forEach((a) => {
      if (!descartados.includes(a.id)) {
        mapa.set(a.id, a);
      }
    });

    // 2. Alertas dinâmicos baseados no inventário atual
    produtos.forEach((p) => {
      const idCrit = `ALT-LIVE-CRIT-${p.id}`;
      const idBaixo = `ALT-LIVE-BAIXO-${p.id}`;

      if (p.estoqueAtual <= 0 && !descartados.includes(idCrit)) {
        mapa.set(idCrit, {
          id: idCrit,
          tipo: 'falta_estoque',
          titulo: `🚨 Reagente Esgotado: ${p.nome}`,
          mensagem: `O estoque físico de ${p.nome} está zerado (0 ${p.unidade}). Necessária compra urgente de reposição para que as aulas práticas não sejam interrompidas.`,
          produtoNome: p.nome,
          saldoRestante: 0,
          unidade: p.unidade,
          autorNome: 'Monitor de Estoque',
          autorPerfil: 'professor',
          dataHora: 'Agora • Estoque Zero',
          data: new Date().toLocaleDateString('pt-BR'),
          hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          lida: false,
          gravidade: 'alta',
          acaoSugerida: 'comprar'
        });
      } else if (p.estoqueAtual <= p.estoqueMinimo && !descartados.includes(idBaixo)) {
        mapa.set(idBaixo, {
          id: idBaixo,
          tipo: 'alerta_critico',
          titulo: `⚠️ Estoque Baixo: ${p.nome}`,
          mensagem: `O volume atual de ${p.nome} (${p.estoqueAtual} ${p.unidade}) atingiu o limite operacional mínimo de segurança (${p.estoqueMinimo} ${p.unidade}). Inicie uma cotação com os fornecedores.`,
          produtoNome: p.nome,
          saldoRestante: p.estoqueAtual,
          unidade: p.unidade,
          autorNome: 'Monitor de Estoque',
          autorPerfil: 'professor',
          dataHora: 'Agora • Nível Mínimo',
          data: new Date().toLocaleDateString('pt-BR'),
          hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          lida: false,
          gravidade: 'alta',
          acaoSugerida: 'comprar'
        });
      }

      if (p.situacao === 'Controlado' && !descartados.includes(`ALT-LIVE-REG-${p.id}`)) {
        mapa.set(`ALT-LIVE-REG-${p.id}`, {
          id: `ALT-LIVE-REG-${p.id}`,
          tipo: 'alteracao',
          titulo: `Escrituração Obrigatória PF / SIPROQUIM: ${p.nome}`,
          mensagem: `Reagente controlado pela Polícia Federal (CAS ${p.cas}). Qualquer retirada ou alteração de lote deve constar no relatório mensal de prestação de contas.`,
          produtoNome: p.nome,
          saldoRestante: p.estoqueAtual,
          unidade: p.unidade,
          autorNome: 'Controle de Órgãos',
          autorPerfil: 'professor',
          dataHora: 'Prazo Mensal Ativo',
          data: new Date().toLocaleDateString('pt-BR'),
          hora: '08:00',
          lida: false,
          gravidade: 'media'
        });
      }
    });

    return Array.from(mapa.values());
  }, [alertas, produtos, descartados]);

  // Contagens para os cards de métricas
  const totalAlertas = todosAlertas.length;
  const totalCriticos = todosAlertas.filter((a) => a.tipo === 'falta_estoque' || a.tipo === 'alerta_critico').length;
  const totalConsumos = todosAlertas.filter((a) => a.tipo === 'consumo').length;
  const totalAlteracoes = todosAlertas.filter((a) => a.tipo === 'alteracao').length;

  // Filtragem pelas abas
  const alertasFiltrados = useMemo(() => {
    if (filtroAba === 'consumos') {
      return todosAlertas.filter((a) => a.tipo === 'consumo');
    }
    if (filtroAba === 'criticos') {
      return todosAlertas.filter((a) => a.tipo === 'falta_estoque' || a.tipo === 'alerta_critico');
    }
    if (filtroAba === 'alteracoes') {
      return todosAlertas.filter((a) => a.tipo === 'alteracao');
    }
    return todosAlertas;
  }, [todosAlertas, filtroAba]);

  const resolverAlerta = (id: string) => {
    setDescartados((prev) => [...prev, id]);
    if (onMarcarLido) {
      onMarcarLido(id);
    }
  };

  const limparTodosAlertas = () => {
    setDescartados(todosAlertas.map((a) => a.id));
  };

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 4 CARDS DE MÉTRICAS DINÂMICAS QUADRADOS, ESPAÇADOS E TECNOLÓGICOS          */}
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* 4 CARDS DE MÉTRICAS ROYAL BLUE COM DETALHES COLORIDOS                     */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 sm:gap-6">
        {/* Card 1: Total de Avisos */}
        <div
          onClick={() => setFiltroAba('todos')}
          className="bg-gradient-to-br from-[#2B7FFF] to-[#1E6BDB] text-white rounded-3xl p-6 sm:p-7 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-out cursor-pointer flex items-center justify-between min-h-[135px] border border-blue-400/30 group"
        >
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-300 animate-pulse" />
              <h3 className="text-sm sm:text-base font-bold text-white/95">Total de avisos</h3>
            </div>
            <div className="text-3xl sm:text-4xl font-black text-white tracking-tight font-mono leading-none">
              {totalAlertas}
            </div>
            <p className="text-xs text-sky-100 font-medium">Visão geral do sistema</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-sky-400/20 text-white border border-sky-300/30 flex items-center justify-center flex-shrink-0 shadow-inner group-hover:scale-105 transition-transform duration-200">
            <Bell className="w-8 h-8 stroke-[1.6]" />
          </div>
        </div>

        {/* Card 2: Falta de Estoque & Críticos */}
        <div
          onClick={() => setFiltroAba('criticos')}
          className="bg-gradient-to-br from-[#2B7FFF] to-[#1E6BDB] text-white rounded-3xl p-6 sm:p-7 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-out cursor-pointer flex items-center justify-between min-h-[135px] border border-blue-400/30 group"
        >
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-300" />
              <h3 className="text-sm sm:text-base font-bold text-white/95">Falta de estoque</h3>
            </div>
            <div className="text-3xl sm:text-4xl font-black text-white tracking-tight font-mono leading-none">
              {totalCriticos}
            </div>
            <p className="text-xs text-rose-100 font-medium">Necessitam reposição</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-rose-400/25 text-rose-100 border border-rose-300/40 flex items-center justify-center flex-shrink-0 shadow-inner group-hover:scale-105 transition-transform duration-200">
            <AlertTriangle className="w-8 h-8 stroke-[1.6]" />
          </div>
        </div>

        {/* Card 3: Baixas & Consumos */}
        <div
          onClick={() => setFiltroAba('consumos')}
          className="bg-gradient-to-br from-[#2B7FFF] to-[#1E6BDB] text-white rounded-3xl p-6 sm:p-7 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-out cursor-pointer flex items-center justify-between min-h-[135px] border border-blue-400/30 group"
        >
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-300" />
              <h3 className="text-sm sm:text-base font-bold text-white/95">Baixas registradas</h3>
            </div>
            <div className="text-3xl sm:text-4xl font-black text-white tracking-tight font-mono leading-none">
              {totalConsumos}
            </div>
            <p className="text-xs text-emerald-100 font-medium">Uso em bancadas e aulas</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-emerald-400/25 text-emerald-100 border border-emerald-300/40 flex items-center justify-center flex-shrink-0 shadow-inner group-hover:scale-105 transition-transform duration-200">
            <FlaskConical className="w-8 h-8 stroke-[1.6]" />
          </div>
        </div>

        {/* Card 4: Alterações & Legal */}
        <div
          onClick={() => setFiltroAba('alteracoes')}
          className="bg-gradient-to-br from-[#2B7FFF] to-[#1E6BDB] text-white rounded-3xl p-6 sm:p-7 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-out cursor-pointer flex items-center justify-between min-h-[135px] border border-blue-400/30 group"
        >
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-300" />
              <h3 className="text-sm sm:text-base font-bold text-white/95">Alterações no estoque</h3>
            </div>
            <div className="text-3xl sm:text-4xl font-black text-white tracking-tight font-mono leading-none">
              {totalAlteracoes}
            </div>
            <p className="text-xs text-purple-100 font-medium">Auditoria e controle</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-purple-400/25 text-purple-100 border border-purple-300/40 flex items-center justify-center flex-shrink-0 shadow-inner group-hover:scale-105 transition-transform duration-200">
            <ShieldAlert className="w-8 h-8 stroke-[1.6]" />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BLOCO CENTRAL: FEED DE AVISOS E ALERTAS OPERACIONAIS                      */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-xs border border-zinc-200/80 space-y-5">
        {/* Topo do Bloco com Título e Filtro de Abas */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-zinc-100">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-zinc-900">Mural de Avisos & Controle de Estoque</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                {alertasFiltrados.length} itens
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              {isAluno
                ? 'Acompanhe as atualizações de estoque, retiradas de bancada e orientações de segurança.'
                : 'Monitore as quantidades consumidas por alunos, níveis críticos de estoque e inicie compras com fornecedores com um clique.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Abas de Filtragem */}
            <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl text-xs">
              <button
                onClick={() => setFiltroAba('todos')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  filtroAba === 'todos' ? 'bg-white text-zinc-900 shadow-2xs' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Todos ({totalAlertas})
              </button>
              <button
                onClick={() => setFiltroAba('criticos')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  filtroAba === 'criticos' ? 'bg-white text-rose-700 shadow-2xs' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Falta de Estoque ({totalCriticos})
              </button>
              <button
                onClick={() => setFiltroAba('consumos')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  filtroAba === 'consumos' ? 'bg-white text-amber-700 shadow-2xs' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Baixas & Uso ({totalConsumos})
              </button>
              <button
                onClick={() => setFiltroAba('alteracoes')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  filtroAba === 'alteracoes' ? 'bg-white text-purple-700 shadow-2xs' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Alterações ({totalAlteracoes})
              </button>
            </div>

            {!isAluno && todosAlertas.length > 0 && (
              <button
                onClick={limparTodosAlertas}
                className="px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-medium transition cursor-pointer flex items-center gap-1"
                title="Limpar avisos visualizados nesta sessão"
              >
                <CheckCheck className="w-3.5 h-3.5 text-zinc-500" />
                <span className="hidden sm:inline">Dispensar Todos</span>
              </button>
            )}
          </div>
        </div>

        {/* Lista de Alertas / Estado Vazio */}
        {alertasFiltrados.length === 0 ? (
          <div className="py-14 flex flex-col items-center justify-center text-center space-y-3 bg-zinc-50/50 rounded-2xl border border-dashed border-zinc-200 p-6">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200 shadow-2xs">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-800">Nenhum aviso ou alerta pendente</h3>
              <p className="text-xs text-zinc-500 max-w-md mt-1 leading-relaxed">
                {produtos.length === 0
                  ? 'O sistema está zerado. À medida que novos reagentes forem cadastrados, consumidos nas bancadas ou chegarem ao estoque mínimo, notificações detalhadas aparecerão aqui automaticamente.'
                  : 'Todos os produtos e estoques do laboratório estão em níveis normais de operação e em conformidade.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5">
            {alertasFiltrados.map((alerta) => {
              const isEsgotado = alerta.tipo === 'falta_estoque';
              const isCritico = alerta.tipo === 'alerta_critico';
              const isConsumo = alerta.tipo === 'consumo';
              const isAlteracao = alerta.tipo === 'alteracao';

              return (
                <div
                  key={alerta.id}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isEsgotado
                      ? 'bg-rose-50/70 border-rose-300 shadow-xs'
                      : isCritico
                      ? 'bg-amber-50/70 border-amber-300 shadow-xs'
                      : isConsumo
                      ? 'bg-blue-50/60 border-blue-200'
                      : 'bg-purple-50/60 border-purple-200'
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        isEsgotado
                          ? 'bg-rose-100 text-rose-700 border border-rose-200'
                          : isCritico
                          ? 'bg-amber-100 text-amber-700 border border-amber-200'
                          : isConsumo
                          ? 'bg-blue-100 text-blue-700 border border-blue-200'
                          : 'bg-purple-100 text-purple-700 border border-purple-200'
                      }`}
                    >
                      {isEsgotado || isCritico ? (
                        <AlertTriangle className="w-5 h-5" />
                      ) : isConsumo ? (
                        <FlaskConical className="w-5 h-5" />
                      ) : (
                        <ShieldAlert className="w-5 h-5" />
                      )}
                    </div>

                    <div className="space-y-1.5 min-w-0 flex-1">
                      {/* Metadados: Categoria, Data/Hora e Autor */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full border ${
                            isEsgotado
                              ? 'bg-rose-200 text-rose-900 border-rose-300'
                              : isCritico
                              ? 'bg-amber-200 text-amber-900 border-amber-300'
                              : isConsumo
                              ? 'bg-blue-200 text-blue-900 border-blue-300'
                              : 'bg-purple-200 text-purple-900 border-purple-300'
                          }`}
                        >
                          {isEsgotado
                            ? 'ESTOQUE ESGOTADO'
                            : isCritico
                            ? 'ESTOQUE BAIXO'
                            : isConsumo
                            ? 'BAIXA DE REAGENTE'
                            : 'ALTERAÇÃO NO INVENTÁRIO'}
                        </span>

                        <span className="text-[11px] text-zinc-500 flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-zinc-400" />
                          <span>{alerta.dataHora || `${alerta.data} às ${alerta.hora}`}</span>
                        </span>

                        {alerta.autorNome && (
                          <span className="text-[11px] text-zinc-600 flex items-center gap-1 bg-white/80 px-2 py-0.5 rounded-md border border-zinc-200/80">
                            <User className="w-3 h-3 text-zinc-400" />
                            <span>
                              <strong>{alerta.autorNome}</strong> ({alerta.autorPerfil === 'aluno' ? 'Aluno' : 'Professor'})
                            </span>
                          </span>
                        )}
                      </div>

                      {/* Título e Mensagem Detalhada */}
                      <h4 className="text-xs sm:text-sm font-bold text-zinc-900 leading-snug">
                        {alerta.titulo}
                      </h4>

                      <p className="text-xs text-zinc-700 leading-relaxed font-normal">
                        {alerta.mensagem}
                      </p>

                      {/* Chips de Saldo e Quantidade */}
                      <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px]">
                        {alerta.quantidadeAlterada !== undefined && (
                          <span className="px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-800 font-semibold border border-zinc-200">
                            Quantidade Retirada: <strong className="text-rose-600 font-mono">-{alerta.quantidadeAlterada} {alerta.unidade}</strong>
                          </span>
                        )}
                        {alerta.saldoRestante !== undefined && (
                          <span className={`px-2.5 py-1 rounded-lg font-semibold border ${
                            alerta.saldoRestante <= 0
                              ? 'bg-rose-100 text-rose-800 border-rose-300'
                              : alerta.saldoRestante <= 2
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          }`}>
                            Saldo Atual em Estoque: <strong className="font-mono">{alerta.saldoRestante} {alerta.unidade}</strong>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Ações do Alerta - Apenas Professores e Gestores */}
                  {!isAluno && (
                    <div className="flex items-center gap-2 self-end md:self-center flex-shrink-0 pt-2 md:pt-0">
                      {/* Botão de Iniciar Compra se o item estiver baixo, esgotado ou sugerido */}
                      {(isEsgotado || isCritico || alerta.acaoSugerida === 'comprar') && onNavigateToCompras && (
                        <button
                          onClick={() => onNavigateToCompras(alerta.produtoNome)}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2F80ED] hover:bg-blue-600 active:scale-95 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition cursor-pointer"
                          title="Iniciar pedido de compra diretamente com fornecedores para repor este reagente"
                        >
                          <ShoppingCart className="w-4 h-4" />
                          <span>Iniciar Compra com Fornecedor</span>
                        </button>
                      )}

                      <button
                        onClick={() => resolverAlerta(alerta.id)}
                        className="px-3.5 py-2 rounded-xl bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs font-semibold shadow-2xs transition active:scale-95 cursor-pointer"
                      >
                        Dispensar
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
