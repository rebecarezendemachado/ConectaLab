import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Users,
  GraduationCap,
  ShieldCheck,
  Plus,
  Search,
  FlaskConical,
  AlertTriangle,
  ArrowRight,
  X,
  UserRoundCheck,
  CircleAlert,
  Trash2,
  ClipboardList
} from 'lucide-react';
import { dataService } from '../../services/db/dataService';
import { ProdutoQuimico, RelatoOcorrenciaAluno, RegistroConsumoAluno, TurmaSala, Usuario } from '../../types';

interface Props {
  isAdmin: boolean;
  usuarios: Usuario[];
  produtos: ProdutoQuimico[];
}

export const TurmasView: React.FC<Props> = ({ isAdmin, usuarios, produtos }) => {
  const [turmas, setTurmas] = useState<TurmaSala[]>([]);
  const [consumos, setConsumos] = useState<RegistroConsumoAluno[]>([]);
  const [ocorrencias, setOcorrencias] = useState<RelatoOcorrenciaAluno[]>([]);
  const [selecionada, setSelecionada] = useState<string>('');
  const [busca, setBusca] = useState('');
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [aba, setAba] = useState<'alunos' | 'atividades' | 'ocorrencias'>('alunos');

  // Modal de turma
  const [modal, setModal] = useState(false);
  const [turmaEditada, setTurmaEditada] = useState<TurmaSala | null>(null);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [anoLetivo, setAnoLetivo] = useState(String(new Date().getFullYear()));
  const [professorIds, setProfessorIds] = useState<string[]>([]);

  // Vínculo de alunos
  const [alunoParaVincular, setAlunoParaVincular] = useState('');

  // Modal de atividade
  const [modalAtividade, setModalAtividade] = useState(false);
  const [atividade, setAtividade] = useState({ alunoId: '', produtoNome: '', quantidade: '', unidade: 'mL', pratica: '', bancada: 'Bancada 01', observacoes: '' });

  const carregar = async () => {
    const [ts, cs, os] = await Promise.all([dataService.listarTurmas(), dataService.consumosAluno.listar(), dataService.ocorrenciasAluno.listar()]);
    setTurmas(ts);
    setConsumos(cs);
    setOcorrencias(os);
    if (!selecionada && ts.length) setSelecionada(ts[0].id);
  };

  useEffect(() => {
    void carregar().catch((e) => setErro(e.message || 'Não foi possível carregar as turmas.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const turma = turmas.find((t) => t.id === selecionada) || null;
  const alunos = useMemo(
    () => (turma?.alunos || []).filter((a) => `${a.nome} ${a.matricula}`.toLowerCase().includes(busca.toLowerCase())),
    [turma, busca]
  );
  const consumosTurma = consumos.filter((c) => (c.turma || '').toLowerCase() === (turma?.nome || '').toLowerCase());
  const ocorrenciasTurma = ocorrencias.filter((o) => (o.turma || '').toLowerCase() === (turma?.nome || '').toLowerCase());

  // A administradora vê todos os alunos; o professor vê os alunos livres e os das suas turmas.
  const alunosForaDaTurma = useMemo(() => {
    if (!turma) return [];
    const nomesDasMinhasTurmas = new Set(turmas.map((t) => t.nome.toLowerCase()));
    return usuarios.filter((u) => {
      if (u.tipoPerfil !== 'aluno') return false;
      if ((u.turma || '').toLowerCase() === turma.nome.toLowerCase()) return false;
      if (isAdmin) return true;
      return !u.turma || nomesDasMinhasTurmas.has((u.turma || '').toLowerCase());
    });
  }, [usuarios, turma, turmas, isAdmin]);

  const estudantesSemSala = isAdmin
    ? usuarios.filter((u) => u.tipoPerfil === 'aluno' && !turmas.some((t) => t.nome.toLowerCase() === (u.turma || '').toLowerCase()))
    : [];

  // A administradora também pode ser responsável pela turma.
  const docentes = usuarios.filter(
    (u) => ['professor', 'administrador'].includes(u.tipoPerfil) && (u.status || 'ativo') === 'ativo'
  );

  const abrirNova = () => {
    setTurmaEditada(null);
    setNome('');
    setDescricao('');
    setAnoLetivo(String(new Date().getFullYear()));
    setProfessorIds([]);
    setErro('');
    setModal(true);
  };

  const abrirEdicao = () => {
    if (!turma) return;
    setTurmaEditada(turma);
    setNome(turma.nome);
    setDescricao(turma.descricao || '');
    setAnoLetivo(turma.anoLetivo || '');
    setProfessorIds(turma.professores.map((p) => p.id));
    setErro('');
    setModal(true);
  };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    if (!nome.trim()) return;
    if (!turmaEditada && professorIds.length === 0) {
      setErro('Selecione ao menos um professor responsável pela turma.');
      return;
    }
    setSalvando(true);
    try {
      const salvo = await dataService.salvarTurma({
        id: turmaEditada?.id,
        nome: nome.trim(),
        descricao,
        anoLetivo,
        ativa: turmaEditada?.ativa ?? true,
        professorIds
      });
      setSelecionada(salvo.id);
      setModal(false);
      await carregar();
    } catch (e: any) {
      setErro(e.message || 'Não foi possível salvar a turma.');
    } finally {
      setSalvando(false);
    }
  };

  const vincular = async (alunoId: string) => {
    if (!turma || !alunoId) return;
    setErro('');
    setAviso('');
    try {
      const r = await dataService.vincularAlunosTurma(turma.id, [alunoId]);
      if (r.movidos === 0) setErro('O aluno não pôde ser vinculado a esta turma. Verifique as permissões.');
      else setAviso('Aluno vinculado à turma.');
      setAlunoParaVincular('');
      await carregar();
    } catch (e: any) {
      setErro(e.message || 'Não foi possível vincular o aluno.');
    }
  };

  const removerAluno = async (alunoId: string, alunoNome: string) => {
    if (!turma) return;
    if (!window.confirm(`Remover ${alunoNome} desta turma? O aluno ficará sem turma até ser vinculado novamente.`)) return;
    setErro('');
    setAviso('');
    try {
      await dataService.removerAlunoTurma(turma.id, alunoId);
      setAviso('Aluno removido da turma.');
      await carregar();
    } catch (e: any) {
      setErro(e.message || 'Não foi possível remover o aluno.');
    }
  };

  const abrirAtividade = () => {
    if (!turma) return;
    const primeiroAluno = turma.alunos?.[0]?.id || '';
    const primeiroProduto = produtos[0];
    setAtividade({
      alunoId: primeiroAluno,
      produtoNome: primeiroProduto?.nome || '',
      quantidade: '',
      unidade: primeiroProduto?.unidade || 'mL',
      pratica: '',
      bancada: 'Bancada 01',
      observacoes: ''
    });
    setErro('');
    setModalAtividade(true);
  };

  const registrarAtividade = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    const qtd = Number(atividade.quantidade);
    if (!turma) return;
    if (!atividade.alunoId) {
      setErro('Selecione o aluno que utilizou o produto.');
      return;
    }
    if (!atividade.produtoNome) {
      setErro('Selecione o produto utilizado.');
      return;
    }
    if (!Number.isFinite(qtd) || qtd <= 0) {
      setErro('Informe a quantidade utilizada (maior que zero).');
      return;
    }
    setSalvando(true);
    try {
      await dataService.registrarConsumoEAbater({
        produtoNome: atividade.produtoNome,
        quantidade: qtd,
        unidade: atividade.unidade,
        turma: turma.nome,
        autorNome: '',
        autorPerfil: 'professor',
        alunoId: atividade.alunoId,
        pratica: atividade.pratica,
        bancada: atividade.bancada,
        observacoes: atividade.observacoes
      });
      setModalAtividade(false);
      setAviso('Atividade registrada e estoque atualizado.');
      await carregar();
    } catch (e: any) {
      setErro(e.message || 'Não foi possível registrar a atividade.');
    } finally {
      setSalvando(false);
    }
  };

  const turmaSemProfessor = !!turma && turma.professores.length === 0;

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-zinc-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <BookOpen className="w-3.5 h-3.5" />
            Organização acadêmica
          </div>
          <h2 className="text-xl font-bold text-zinc-900 mt-2">Turmas e salas de laboratório</h2>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">Cada aluno fica ligado a uma turma e aos professores responsáveis.</p>
        </div>
        {isAdmin && (
          <button onClick={abrirNova} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#2F80ED] hover:bg-blue-600 text-white text-xs font-bold shadow-sm">
            <Plus className="w-4 h-4" />
            Criar turma
          </button>
        )}
      </div>

      {erro && <div role="alert" className="rounded-xl bg-rose-50 text-rose-700 border border-rose-200 px-4 py-3 text-xs">{erro}</div>}
      {aviso && <div className="rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-3 text-xs">{aviso}</div>}

      {turmas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-zinc-300 p-8 text-center">
          <Users className="w-8 h-8 mx-auto text-zinc-300" />
          <p className="text-sm font-semibold text-zinc-700 mt-3">Nenhuma turma vinculada</p>
          <p className="text-xs text-zinc-500 mt-1">
            {isAdmin
              ? 'Crie as salas e associe os professores responsáveis para que os alunos possam se cadastrar.'
              : 'Peça à administradora para vincular suas turmas.'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {turmas.map((t, i) => (
              <button
                key={t.id}
                onClick={() => {
                  setSelecionada(t.id);
                  setBusca('');
                  setAba('alunos');
                  setAviso('');
                  setErro('');
                }}
                className={`text-left rounded-2xl p-4 border shadow-xs transition ${
                  selecionada === t.id ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-200' : 'bg-white border-zinc-200 hover:border-blue-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${i % 2 ? 'bg-violet-50 text-violet-600' : 'bg-blue-50 text-blue-600'}`}>
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <span className={`px-2 py-1 rounded-full text-[10px] font-semibold border ${t.ativa ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-zinc-100 text-zinc-500 border-zinc-200'}`}>
                    {t.ativa ? 'Ativa' : 'Inativa'}
                  </span>
                </div>
                <h3 className="font-bold text-zinc-900 mt-3">{t.nome}</h3>
                <p className="text-[11px] text-zinc-500 mt-1 line-clamp-1">
                  {t.descricao || 'Turma de laboratório'}
                  {t.anoLetivo ? ` • ${t.anoLetivo}` : ''}
                </p>
                <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-zinc-100 text-[11px]">
                  <span className="text-zinc-600 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {t.totalAlunos} alunos
                  </span>
                  <span className="text-zinc-500 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {t.professores.length} docente{t.professores.length === 1 ? '' : 's'}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {turma && (
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-zinc-900">{turma.nome}</h3>
                    {turmaSemProfessor && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200">
                        <CircleAlert className="w-3 h-3" />
                        Sem professor vinculado
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Responsáveis: {turma.professores.map((p) => p.nome).join(', ') || 'a definir'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {turma.alunos && turma.alunos.length > 0 && (
                    <button
                      onClick={abrirAtividade}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700"
                    >
                      <ClipboardList className="w-3.5 h-3.5" />
                      Registrar atividade
                    </button>
                  )}
                  {isAdmin && (
                    <button onClick={abrirEdicao} className="px-3 py-2 rounded-lg text-xs font-semibold border border-zinc-200 hover:bg-zinc-50">
                      Editar turma e responsáveis
                    </button>
                  )}
                </div>
              </div>

              <div className="px-4 sm:px-5 pt-4 flex flex-wrap gap-2 border-b border-zinc-100">
                {([
                  ['alunos', 'Alunos', turma.totalAlunos],
                  ['atividades', 'Atividades', consumosTurma.length],
                  ['ocorrencias', 'Ocorrências', ocorrenciasTurma.length]
                ] as const).map(([id, label, count]) => (
                  <button
                    key={id}
                    onClick={() => setAba(id)}
                    className={`px-3 py-2 text-xs font-semibold border-b-2 ${aba === id ? 'text-blue-700 border-blue-600' : 'text-zinc-500 border-transparent hover:text-zinc-800'}`}
                  >
                    {label} <span className="ml-1 text-[10px] text-zinc-400">{count}</span>
                  </button>
                ))}
              </div>

              <div className="p-4 sm:p-5">
                {aba === 'alunos' && (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
                      <div className="relative max-w-sm w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                        <input
                          value={busca}
                          onChange={(e) => setBusca(e.target.value)}
                          placeholder="Buscar aluno por nome ou matrícula"
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-xs outline-none focus:border-blue-400"
                        />
                      </div>
                      {alunosForaDaTurma.length > 0 && (
                        <div className="flex items-center gap-2">
                          <select
                            value={alunoParaVincular}
                            onChange={(e) => setAlunoParaVincular(e.target.value)}
                            className="px-3 py-2.5 rounded-xl border border-zinc-200 text-xs bg-white max-w-[240px]"
                          >
                            <option value="">Adicionar aluno...</option>
                            {alunosForaDaTurma.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.nome}
                                {a.turma ? ` (${a.turma})` : ''}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => void vincular(alunoParaVincular)}
                            disabled={!alunoParaVincular}
                            className="inline-flex items-center gap-1 px-3 py-2.5 rounded-xl bg-[#2F80ED] text-white text-xs font-semibold disabled:opacity-40"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                            Vincular
                          </button>
                        </div>
                      )}
                    </div>

                    {alunos.length ? (
                      <div className="divide-y divide-zinc-100">
                        {alunos.map((al) => (
                          <div key={al.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3">
                            <div>
                              <p className="text-xs font-semibold text-zinc-800">{al.nome}</p>
                              <p className="text-[10px] text-zinc-500 mt-0.5">Matrícula: {al.matricula || 'não informada'} • {al.status}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-semibold">
                                <UserRoundCheck className="w-3.5 h-3.5" />
                                Vinculado à turma
                              </span>
                              <button
                                type="button"
                                onClick={() => void removerAluno(al.id, al.nome)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100"
                                title="Remover este aluno da turma"
                              >
                                <Trash2 className="w-3 h-3" />
                                Remover
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="py-8 text-center text-xs text-zinc-400">Ainda não há alunos nesta turma.</p>
                    )}
                  </>
                )}

                {aba === 'atividades' && (
                  <div className="space-y-2">
                    {consumosTurma.length ? (
                      consumosTurma.slice(0, 30).map((c) => (
                        <div key={c.id} className="flex items-start gap-3 p-3 rounded-xl bg-zinc-50 border border-zinc-100">
                          <FlaskConical className="w-4 h-4 text-blue-500 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-zinc-800">
                              {c.alunoNome} registrou {c.quantidadeUsada} {c.unidade} de {c.produtoNome}
                            </p>
                            <p className="text-[10px] text-zinc-500 mt-1">
                              {c.pratica || 'Prática não informada'} • {c.data} • {c.statusVisto}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="py-8 text-center text-xs text-zinc-400">Nenhuma atividade registrada para esta turma.</p>
                    )}
                  </div>
                )}

                {aba === 'ocorrencias' && (
                  <div className="space-y-2">
                    {ocorrenciasTurma.length ? (
                      ocorrenciasTurma.slice(0, 30).map((o) => (
                        <div key={o.id} className="flex items-start gap-3 p-3 rounded-xl bg-amber-50/70 border border-amber-100">
                          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-zinc-800">{o.tipoOcorrencia} • {o.alunoNome}</p>
                            <p className="text-[10px] text-zinc-600 mt-1">{o.descricao}</p>
                            <p className="text-[10px] text-zinc-500 mt-1">{o.data} • {o.status}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="py-8 text-center text-xs text-zinc-400">Nenhuma ocorrência registrada para esta turma.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {isAdmin && estudantesSemSala.length > 0 && (
        <section className="bg-white rounded-2xl border border-amber-200 shadow-xs p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <CircleAlert className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-bold text-zinc-900">Alunos aguardando vínculo ({estudantesSemSala.length})</h3>
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">
            Associe cada aluno a uma turma. O professor responsável terá acesso às atividades e ocorrências dessa sala.
          </p>
          <div className="divide-y divide-zinc-100 mt-3">
            {estudantesSemSala.map((al) => (
              <div key={al.id} className="flex flex-col sm:flex-row sm:items-center gap-2 py-3">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-zinc-800">{al.nome}</p>
                  <p className="text-[10px] text-zinc-500">{al.email}</p>
                </div>
                <select
                  value={alunoParaVincular === al.id ? (turmas[0]?.id || '') : ''}
                  onChange={(e) => {
                    setAlunoParaVincular(al.id);
                    if (e.target.value) void vincular(al.id);
                  }}
                  className="px-3 py-2 rounded-lg border border-zinc-200 text-xs bg-white"
                >
                  <option value="">Escolher turma</option>
                  {turmas.map((t) => (
                    <option key={t.id} value={t.id}>{t.nome}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </section>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm p-3 flex items-center justify-center">
          <form onSubmit={salvar} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-zinc-900">{turmaEditada ? 'Editar turma' : 'Criar turma'}</h3>
                <p className="text-xs text-zinc-500 mt-1">Defina os professores que acompanham a sala.</p>
              </div>
              <button type="button" onClick={() => setModal(false)} className="p-2 rounded-lg hover:bg-zinc-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            {erro && <p role="alert" className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2">{erro}</p>}

            <label className="block text-xs font-semibold text-zinc-700">
              Nome da turma
              <input
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="mt-1 w-full px-3 py-2.5 border border-zinc-200 rounded-xl text-sm"
                placeholder="Ex.: Química Aplicada • 2º B"
              />
            </label>
            <label className="block text-xs font-semibold text-zinc-700">
              Descrição
              <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} className="mt-1 w-full px-3 py-2.5 border border-zinc-200 rounded-xl text-sm" rows={2} />
            </label>
            <label className="block text-xs font-semibold text-zinc-700">
              Ano letivo
              <input value={anoLetivo} onChange={(e) => setAnoLetivo(e.target.value)} className="mt-1 w-full px-3 py-2.5 border border-zinc-200 rounded-xl text-sm" />
            </label>

            <div>
              <p className="text-xs font-semibold text-zinc-700 mb-2">Professores responsáveis *</p>
              <div className="max-h-44 overflow-auto rounded-xl border border-zinc-200 divide-y divide-zinc-100">
                {docentes.length ? (
                  docentes.map((d) => (
                    <label key={d.id} className="flex items-center gap-2 p-3 text-xs text-zinc-700">
                      <input
                        type="checkbox"
                        checked={professorIds.includes(d.id)}
                        onChange={(e) => setProfessorIds((ids) => (e.target.checked ? [...ids, d.id] : ids.filter((id) => id !== d.id)))}
                      />
                      <span className="flex-1">{d.nome}</span>
                      <span className="text-[10px] text-zinc-400">{d.tipoPerfil === 'administrador' ? 'Administradora' : 'Professor(a)'}</span>
                    </label>
                  ))
                ) : (
                  <p className="p-3 text-xs text-zinc-400">Cadastre um professor para poder criar a turma.</p>
                )}
              </div>
              {professorIds.length === 0 && <p className="text-[10px] text-amber-700 mt-1">Selecione ao menos um responsável.</p>}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModal(false)} className="px-4 py-2 rounded-xl text-xs font-semibold border border-zinc-200">
                Cancelar
              </button>
              <button type="submit" disabled={salvando} className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#2F80ED] hover:bg-blue-600 disabled:opacity-50">
                {salvando ? 'Salvando...' : 'Salvar turma'}
              </button>
            </div>
          </form>
        </div>
      )}

      {modalAtividade && turma && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm p-3 flex items-center justify-center">
          <form onSubmit={registrarAtividade} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-zinc-900">Registrar atividade</h3>
                <p className="text-xs text-zinc-500 mt-1">{turma.nome} • o estoque será abatido automaticamente.</p>
              </div>
              <button type="button" onClick={() => setModalAtividade(false)} className="p-2 rounded-lg hover:bg-zinc-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            {erro && <p role="alert" className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2">{erro}</p>}

            <label className="block text-xs font-semibold text-zinc-700">
              Aluno
              <select
                required
                value={atividade.alunoId}
                onChange={(e) => setAtividade((a) => ({ ...a, alunoId: e.target.value }))}
                className="mt-1 w-full px-3 py-2.5 border border-zinc-200 rounded-xl text-sm bg-white"
              >
                <option value="">Selecione o aluno</option>
                {(turma.alunos || []).map((a) => (
                  <option key={a.id} value={a.id}>{a.nome}</option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block text-xs font-semibold text-zinc-700">
                Produto
                <select
                  required
                  value={atividade.produtoNome}
                  onChange={(e) => {
                    const p = produtos.find((x) => x.nome === e.target.value);
                    setAtividade((a) => ({ ...a, produtoNome: e.target.value, unidade: p?.unidade || a.unidade }));
                  }}
                  className="mt-1 w-full px-3 py-2.5 border border-zinc-200 rounded-xl text-sm bg-white"
                >
                  <option value="">Selecione o produto</option>
                  {produtos.map((p) => (
                    <option key={p.id} value={p.nome}>{p.nome}</option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-semibold text-zinc-700">
                Quantidade utilizada
                <div className="mt-1 flex gap-2">
                  <input
                    required
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={atividade.quantidade}
                    onChange={(e) => setAtividade((a) => ({ ...a, quantidade: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-zinc-200 rounded-xl text-sm"
                    placeholder="0"
                  />
                  <select
                    value={atividade.unidade}
                    onChange={(e) => setAtividade((a) => ({ ...a, unidade: e.target.value }))}
                    className="px-3 py-2.5 border border-zinc-200 rounded-xl text-sm bg-white"
                  >
                    {['mL', 'L', 'g', 'kg'].map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block text-xs font-semibold text-zinc-700">
                Prática / aula
                <input
                  value={atividade.pratica}
                  onChange={(e) => setAtividade((a) => ({ ...a, pratica: e.target.value }))}
                  className="mt-1 w-full px-3 py-2.5 border border-zinc-200 rounded-xl text-sm"
                  placeholder="Ex.: Titulação ácido-base"
                />
              </label>
              <label className="block text-xs font-semibold text-zinc-700">
                Bancada
                <input
                  value={atividade.bancada}
                  onChange={(e) => setAtividade((a) => ({ ...a, bancada: e.target.value }))}
                  className="mt-1 w-full px-3 py-2.5 border border-zinc-200 rounded-xl text-sm"
                />
              </label>
            </div>

            <label className="block text-xs font-semibold text-zinc-700">
              Observações
              <textarea
                value={atividade.observacoes}
                onChange={(e) => setAtividade((a) => ({ ...a, observacoes: e.target.value }))}
                className="mt-1 w-full px-3 py-2.5 border border-zinc-200 rounded-xl text-sm"
                rows={2}
              />
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModalAtividade(false)} className="px-4 py-2 rounded-xl text-xs font-semibold border border-zinc-200">
                Cancelar
              </button>
              <button type="submit" disabled={salvando} className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50">
                {salvando ? 'Registrando...' : 'Registrar e dar baixa'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
