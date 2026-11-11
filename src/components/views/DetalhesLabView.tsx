import React, { useState } from 'react';
import {
  ShieldAlert,
  Flame,
  PhoneCall,
  MapPin,
  BookOpen,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  FileCheck,
  Building,
  GraduationCap,
  Clock,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { dataService } from '../../services/db/dataService';

export const DetalhesLabView: React.FC = () => {
  const [secaoAtiva, setSecaoAtiva] = useState<'regras' | 'descarte' | 'emergencia' | 'turma'>('regras');

  return (
    <div className="space-y-5">
      {/* Cabeçalho do Módulo */}
      <div className="bg-white rounded-xl p-5 shadow-xs border border-zinc-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
              Manual Acadêmico do Laboratório
            </span>
            <span className="text-xs text-zinc-400">•</span>
            <span className="text-xs text-zinc-500 font-medium">Normas, Descarte, Telefones e Segurança</span>
          </div>
          <h2 className="text-lg font-bold text-zinc-900 mt-1">
            Detalhes do Laboratório & Protocolos de Segurança
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Consulte as normas obrigatórias de permanência, classificação para descarte de reagentes e canais de emergência.
          </p>
        </div>

        {/* Abas */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-100 rounded-xl border border-zinc-200 self-start md:self-auto overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => setSecaoAtiva('regras')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
              secaoAtiva === 'regras'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Regras do Lab</span>
          </button>

          <button
            type="button"
            onClick={() => setSecaoAtiva('descarte')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
              secaoAtiva === 'descarte'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Descarte de Resíduos</span>
          </button>

          <button
            type="button"
            onClick={() => setSecaoAtiva('emergencia')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
              secaoAtiva === 'emergencia'
                ? 'bg-white text-rose-600 shadow-xs'
                : 'text-zinc-600 hover:text-rose-700 hover:bg-rose-50'
            }`}
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Emergência</span>
          </button>

          <button
            type="button"
            onClick={() => setSecaoAtiva('turma')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
              secaoAtiva === 'turma'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Minha Turma</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SEÇÃO 1: REGRAS E NORMAS DE CONDUTA                                       */}
      {/* ========================================================================= */}
      {secaoAtiva === 'regras' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Card 1: EPIs Obrigatórios */}
          <div className="bg-white rounded-xl p-5 shadow-xs border border-zinc-200/80 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3 border border-blue-100">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-zinc-900 mb-1">EPIs Obrigatórios em Bancada</h3>
              <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
                Nenhum estudante pode adentrar ou permanecer no laboratório sem a paramentação completa exigida.
              </p>
              <ul className="space-y-2 text-xs text-zinc-700">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span><strong>Jaleco Branco 100% Algodão:</strong> Manga longa e abotoado.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span><strong>Óculos de Ampla Visão:</strong> Proteção frontal e lateral.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span><strong>Calçado Fechado:</strong> Couro ou material impermeável.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span><strong>Luvas Nitrílicas:</strong> Indicadas para manuseio químico.</span>
                </li>
              </ul>
            </div>
            <div className="mt-4 pt-3 border-t border-zinc-100 text-[10px] text-zinc-400">
              Norma Regulamentadora NR-32 / CCT Laboratórios
            </div>
          </div>

          {/* Card 2: Condutas Proibidas */}
          <div className="bg-white rounded-xl p-5 shadow-xs border border-zinc-200/80 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center mb-3 border border-rose-100">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-zinc-900 mb-1">Condutas Estritamente Proibidas</h3>
              <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
                Ações que acarretam suspensão imediata da prática e aplicação das sanções disciplinares da instituição.
              </p>
              <ul className="space-y-2 text-xs text-zinc-700">
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500 mt-1 flex-shrink-0" />
                  <span>Proibido ingerir qualquer alimento, líquidos ou mascar chicletes.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500 mt-1 flex-shrink-0" />
                  <span>Nunca pipetar com a boca (uso restrito de pêras de sucção ou pipetadores).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500 mt-1 flex-shrink-0" />
                  <span>Nunca inalar vapores diretamente do frasco (faça abanamento suave).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500 mt-1 flex-shrink-0" />
                  <span>Proibido uso de bermudas, saias curtas, sapatos abertos ou lentes de contato.</span>
                </li>
              </ul>
            </div>
            <div className="mt-4 pt-3 border-t border-zinc-100 text-[10px] text-rose-600 font-semibold">
              Risco Grave de Contaminação e Acidente
            </div>
          </div>

          {/* Card 3: Boas Práticas Operacionais */}
          <div className="bg-white rounded-xl p-5 shadow-xs border border-zinc-200/80 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 border border-emerald-100">
                <FileCheck className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-zinc-900 mb-1">Boas Práticas Operacionais</h3>
              <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
                Mantenha a bancada limpa, organizada e rotule todas as soluções intermediárias.
              </p>
              <ul className="space-y-2 text-xs text-zinc-700">
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1 flex-shrink-0" />
                  <span>Ao misturar ácido e água: <strong>SEMPRE adicione o ácido sobre a água</strong> lentamente!</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1 flex-shrink-0" />
                  <span>Trabalhos com desprendimento de vapores tóxicos devem ser feitos na Capela.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1 flex-shrink-0" />
                  <span>Limpe qualquer respingo na bancada imediatamente conforme o protocolo.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1 flex-shrink-0" />
                  <span>Lave as mãos com água e sabão neutro ao término de cada aula prática.</span>
                </li>
              </ul>
            </div>
            <div className="mt-4 pt-3 border-t border-zinc-100 text-[10px] text-zinc-400">
              Protocolo Institucional de Biossegurança
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SEÇÃO 2: GUIA DE DESCARTE DE RESÍDUOS                                     */}
      {/* ========================================================================= */}
      {secaoAtiva === 'descarte' && (
        <div className="space-y-4">
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div className="text-xs text-amber-900">
              <strong>Atenção ao Ralo da Pia:</strong> É estritamente proibido descartar solventes orgânicos, ácidos concentrados, bases fortes ou metais pesados na pia comum. Utilize os bombonas sinalizadas!
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Bombona 1: Ácidos e Bases Neutralizados */}
            <div className="bg-white rounded-xl p-4 shadow-xs border border-zinc-200/80">
              <span className="w-8 h-8 rounded-lg bg-yellow-100 text-yellow-800 flex items-center justify-center font-bold text-xs mb-3">
                01
              </span>
              <h4 className="text-xs font-bold text-zinc-900">Resíduos Aquosos (Ácidos/Bases)</h4>
              <p className="text-[11px] text-zinc-500 mt-1">
                Frasco identificado na bancada de lavagem. Devem ser pré-neutralizados com bicarbonato de sódio antes do descarte.
              </p>
              <div className="mt-3 text-[10px] font-semibold text-yellow-700 bg-yellow-50 px-2 py-1 rounded">
                Frasco Amarelo • pH neutro (6 a 8)
              </div>
            </div>

            {/* Bombona 2: Solventes Não Halogenados */}
            <div className="bg-white rounded-xl p-4 shadow-xs border border-zinc-200/80">
              <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs mb-3">
                02
              </span>
              <h4 className="text-xs font-bold text-zinc-900">Solventes Não-Halogenados</h4>
              <p className="text-[11px] text-zinc-500 mt-1">
                Etanol, Acetona, Isopropanol, Xileno, Éter. Frascos mantidos obrigatoriamente dentro da capela de exaustão.
              </p>
              <div className="mt-3 text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded">
                Bombona Azul • Inflamáveis
              </div>
            </div>

            {/* Bombona 3: Metais Pesados */}
            <div className="bg-white rounded-xl p-4 shadow-xs border border-zinc-200/80">
              <span className="w-8 h-8 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-xs mb-3">
                03
              </span>
              <h4 className="text-xs font-bold text-zinc-900">Metais Pesados e Tóxicos</h4>
              <p className="text-[11px] text-zinc-500 mt-1">
                Soluções contendo Prata (Ag), Cobre (Cu), Chumbo (Pb), Cromo (Cr). Tratamento prévio para precipitação.
              </p>
              <div className="mt-3 text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-1 rounded">
                Bombona Roxa • Resíduos Especiais
              </div>
            </div>

            {/* Bombona 4: Cacos e Perfurocortantes */}
            <div className="bg-white rounded-xl p-4 shadow-xs border border-zinc-200/80">
              <span className="w-8 h-8 rounded-lg bg-rose-100 text-rose-800 flex items-center justify-center font-bold text-xs mb-3">
                04
              </span>
              <h4 className="text-xs font-bold text-zinc-900">Vidraria Quebrada</h4>
              <p className="text-[11px] text-zinc-500 mt-1">
                Tubos de ensaio, béqueres, pipetas e lâminas partidas. NUNCA coloque em sacos de lixo plástico comum.
              </p>
              <div className="mt-3 text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-1 rounded">
                Caixa Rígida Amarela • Perfurocortantes
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SEÇÃO 3: CONTATOS DE EMERGÊNCIA & PONTOS DE APOIO                         */}
      {/* ========================================================================= */}
      {secaoAtiva === 'emergencia' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Ramais Internos */}
          <div className="bg-white rounded-xl p-5 shadow-xs border border-zinc-200/80">
            <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-blue-500" />
              <span>Canais Internos do Laboratório</span>
            </h3>

            <div className="space-y-3">
              <div className="p-3 bg-zinc-50 rounded-lg flex items-center justify-between">
                <div>
                  <strong className="text-xs text-zinc-900 block">Coordenação Docente</strong>
                  <span className="text-[11px] text-zinc-500">Coordenação do Laboratório de Química</span>
                </div>
                <span className="text-xs font-mono font-bold text-blue-600 bg-white px-2.5 py-1 rounded border border-zinc-200">
                  Ramal 218
                </span>
              </div>

              <div className="p-3 bg-zinc-50 rounded-lg flex items-center justify-between">
                <div>
                  <strong className="text-xs text-zinc-900 block">Técnico de Laboratório (Plantão)</strong>
                  <span className="text-[11px] text-zinc-500">Apoio técnico, reagentes e vidrarias</span>
                </div>
                <span className="text-xs font-mono font-bold text-blue-600 bg-white px-2.5 py-1 rounded border border-zinc-200">
                  Ramal 204
                </span>
              </div>

              <div className="p-3 bg-zinc-50 rounded-lg flex items-center justify-between">
                <div>
                  <strong className="text-xs text-zinc-900 block">Enfermaria / Ambulatório Escolar</strong>
                  <span className="text-[11px] text-zinc-500">Primeiros socorros e avaliação médica</span>
                </div>
                <span className="text-xs font-mono font-bold text-blue-600 bg-white px-2.5 py-1 rounded border border-zinc-200">
                  Ramal 105
                </span>
              </div>

              <div className="p-3 bg-zinc-50 rounded-lg flex items-center justify-between">
                <div>
                  <strong className="text-xs text-zinc-900 block">Segurança Patrimonial & Brigada</strong>
                  <span className="text-[11px] text-zinc-500">Acionamento de evacuação e extintores</span>
                </div>
                <span className="text-xs font-mono font-bold text-blue-600 bg-white px-2.5 py-1 rounded border border-zinc-200">
                  Ramal 190
                </span>
              </div>
            </div>
          </div>

          {/* Telefones Públicos de Emergência */}
          <div className="bg-rose-950 text-white rounded-xl p-5 border border-rose-900 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-rose-300 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Socorro Externo Imediato</span>
              </h3>

              <div className="space-y-3">
                <div className="p-3 bg-rose-900/60 rounded-lg border border-rose-800/80 flex items-center justify-between">
                  <div>
                    <strong className="text-sm font-bold text-white block">SAMU (Ambulância)</strong>
                    <span className="text-[11px] text-rose-200">Atendimento móvel de urgência</span>
                  </div>
                  <span className="text-lg font-mono font-bold text-amber-300 bg-black/40 px-3 py-1 rounded border border-rose-700">
                    192
                  </span>
                </div>

                <div className="p-3 bg-rose-900/60 rounded-lg border border-rose-800/80 flex items-center justify-between">
                  <div>
                    <strong className="text-sm font-bold text-white block">Corpo de Bombeiros</strong>
                    <span className="text-[11px] text-rose-200">Incêndios, vazamentos tóxicos e resgate</span>
                  </div>
                  <span className="text-lg font-mono font-bold text-amber-300 bg-black/40 px-3 py-1 rounded border border-rose-700">
                    193
                  </span>
                </div>

                <div className="p-3 bg-rose-900/60 rounded-lg border border-rose-800/80 flex items-center justify-between">
                  <div>
                    <strong className="text-sm font-bold text-white block">Disque-Intoxicação (ANVISA)</strong>
                    <span className="text-[11px] text-rose-200">Orientação toxicológica com médicos especialistas</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-300 bg-black/40 px-2 py-1 rounded border border-rose-700">
                    0800 722 6001
                  </span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-rose-300/80 mt-4 pt-3 border-t border-rose-800/60">
              * Ao ligar para os serviços de emergência, informe: o endereço da escola, o laboratório exato e o nome químico da substância envolvida.
            </p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SEÇÃO 4: DETALHES DA TURMA E HORÁRIOS                                     */}
      {/* ========================================================================= */}
      {secaoAtiva === 'turma' && (() => {
        const sessao = dataService.obterSessao();
        const nomeEstudante = sessao?.nome || 'Estudante Conectado';
        const matriculaEstudante = sessao?.matricula || sessao?.id || 'Acadêmico';
        const turmaEstudante = sessao?.turma || 'Turma Regular';

        return (
          <div className="bg-white rounded-xl p-6 shadow-xs border border-zinc-200/80">
            <div className="flex items-center gap-3 pb-4 border-b border-zinc-100 mb-5">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900">Sessão Prática Atual do Estudante</h3>
                <p className="text-[11px] text-zinc-500">Informações vinculadas à sua matrícula acadêmica cadastrada</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-100">
                <span className="text-zinc-400 block text-[10px]">Estudante:</span>
                <strong className="text-zinc-900">{nomeEstudante} ({matriculaEstudante})</strong>
              </div>

              <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-100">
                <span className="text-zinc-400 block text-[10px]">Turma:</span>
                <strong className="text-zinc-900">{turmaEstudante}</strong>
              </div>

              <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-100">
                <span className="text-zinc-400 block text-[10px]">Disciplina:</span>
                <strong className="text-zinc-900">Química Orgânica & Experimental</strong>
              </div>

              <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-100">
                <span className="text-zinc-400 block text-[10px]">Docente Responsável:</span>
                <strong className="text-zinc-900">Docente Titular (CRQ Ativo)</strong>
              </div>

              <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-100">
                <span className="text-zinc-400 block text-[10px]">Bancada Atribuída:</span>
                <strong className="text-zinc-900">Bancada Operacional</strong>
              </div>

              <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-100">
                <span className="text-zinc-400 block text-[10px]">Horário Semanal:</span>
                <strong className="text-zinc-900">Aulas Práticas Conforme Grade</strong>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
