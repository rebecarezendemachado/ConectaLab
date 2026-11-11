import React, { useState, useEffect, useMemo } from 'react';
import { Logo } from '../components/Logo';
import {
  Home,
  FlaskConical,
  Truck,
  FileText,
  ShoppingCart,
  Package,
  BarChart3,
  AlertTriangle,
  MoreVertical,
  LogOut,
  Bell,
  Search,
  CheckCircle2,
  XCircle,
  Menu,
  X,
  Plus,
  User,
  Activity,
  Thermometer,
  ShieldCheck,
  Layers,
  Sparkles,
  ArrowRight,
  Command,
  Send,
  BookOpen,
  GraduationCap,
  ShieldAlert,
  AlertOctagon,
  Clock,
  QrCode,
  Database,
  PieChart,
  RefreshCw,
  Copy,
  Terminal,
  ExternalLink,
  LayoutDashboard,
  Info,
  Boxes,
  Check,
  Users,
  KeyRound
} from 'lucide-react';
import {
  ProdutoQuimico,
  Fornecedor,
  SolicitacaoLaboratorio,
  CompraItem,
  EstoqueItem,
  RegistroConsumoAluno,
  RelatoOcorrenciaAluno,
  Usuario,
  AlertaNotificacao
} from '../types';
import {
  initialProdutos,
  initialFornecedores,
  initialSolicitacoes,
  initialCompras,
  initialEstoque,
  initialConsumosAluno,
  initialOcorrenciasAluno
} from '../data/initialData';
import { dataService } from '../services/db/dataService';
import { ProdutosView } from '../components/views/ProdutosView';
import { QRCodeView } from '../components/views/QRCodeView';
import { BancoDadosView } from '../components/views/BancoDadosView';
import { FornecedoresView } from '../components/views/FornecedoresView';
import { SolicitacoesView } from '../components/views/SolicitacoesView';
import { ComprasView } from '../components/views/ComprasView';
import { EstoqueView } from '../components/views/EstoqueView';
import { RelatoriosView } from '../components/views/RelatoriosView';
import { AlertasView } from '../components/views/AlertasView';
import { AlunoUsoEAcidentesView } from '../components/views/AlunoUsoEAcidentesView';
import { DetalhesLabView } from '../components/views/DetalhesLabView';
import { UsuariosView } from '../components/views/UsuariosView';
import { PerfilView } from '../components/views/PerfilView';
import { MandarAlertaView } from '../components/views/MandarAlertaView';

interface DashboardScreenProps {
  onNavigate: (screen: 'index' | 'login' | 'cadastro' | 'esqueceu-senha' | 'dashboard') => void;
  initialMenu?: string;
  userProfile?: 'aluno' | 'professor';
  onToggleProfile?: (novoPerfil: 'aluno' | 'professor') => void;
}

interface SolicitacaoItem {
  id: string;
  professor: string;
  disciplina: string;
  data: string;
  itens: string[];
  turma: string;
  status: 'Aprovada' | 'Reprovada' | 'Pendente';
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  onNavigate,
  initialMenu,
  userProfile = 'aluno',
  onToggleProfile
}) => {
  const [usuarioSessao, setUsuarioSessao] = useState<Usuario | null>(() => {
    const sess = dataService.obterSessao();
    if (userProfile === 'aluno' && sess?.tipoPerfil === 'professor') {
      return null;
    }
    return sess;
  });

  const [perfilAtual, setPerfilAtual] = useState<'aluno' | 'professor'>(() => {
    if (userProfile) return userProfile;
    const sess = dataService.obterSessao();
    if (sess?.tipoPerfil) return sess.tipoPerfil;
    return 'aluno';
  });

  const isContaAluno = perfilAtual === 'aluno' || usuarioSessao?.tipoPerfil === 'aluno';

  useEffect(() => {
    if (userProfile) {
      setPerfilAtual(userProfile);
      const sess = dataService.obterSessao();
      if (sess && sess.tipoPerfil === userProfile) {
        setUsuarioSessao(sess);
      } else if (sess && sess.tipoPerfil !== userProfile) {
        setUsuarioSessao(null);
      }
    } else {
      const sess = dataService.obterSessao();
      if (sess?.tipoPerfil) {
        setPerfilAtual(sess.tipoPerfil);
        setUsuarioSessao(sess);
      }
    }
  }, [userProfile]);

  const [menuAtivo, setMenuAtivo] = useState(initialMenu || 'Dashboard');

  const handleMudarPerfil = (novo: 'aluno' | 'professor') => {
    // Aluno autenticado ou em perfil de aluno NÃO pode se autopromover para professor
    if ((isContaAluno || perfilAtual === 'aluno') && novo === 'professor') {
      return;
    }
    setPerfilAtual(novo);
    if (onToggleProfile) {
      onToggleProfile(novo);
    }
    if (novo === 'aluno' && !['Dashboard', 'Produtos', 'Mandar alerta', 'QR Code & Scanner', 'Detalhes', 'Meu Perfil'].includes(menuAtivo)) {
      setMenuAtivo('Dashboard');
    }
  };

  // Garante que o aluno NUNCA tenha visão nem acesso a telas restritas de coordenação
  useEffect(() => {
    if (perfilAtual === 'aluno' && !['Dashboard', 'Produtos', 'Mandar alerta', 'QR Code & Scanner', 'Detalhes', 'Meu Perfil'].includes(menuAtivo)) {
      setMenuAtivo('Dashboard');
    }
  }, [perfilAtual, menuAtivo]);

  // Exige autenticação de conta real cadastrada no banco de dados
  useEffect(() => {
    const sess = dataService.obterSessao();
    if (!sess) {
      onNavigate('login');
    }
  }, [onNavigate]);

  React.useEffect(() => {
    if (initialMenu) {
      setMenuAtivo(initialMenu);
    }
  }, [initialMenu]);
  const [menuUsuarioAberto, setMenuUsuarioAberto] = useState(false);
  const [sidebarMobileAberta, setSidebarMobileAberta] = useState(false);
  const [pontoSelecionado, setPontoSelecionado] = useState<{ mes: string; valor: string } | null>(null);
  const [categoriaHover, setCategoriaHover] = useState<string | null>(null);
  const [buscaSolicitacao, setBuscaSolicitacao] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'Todos' | 'Aprovada' | 'Pendente' | 'Reprovada'>('Todos');
  const [solicitacaoModal, setSolicitacaoModal] = useState<SolicitacaoLaboratorio | null>(null);
  const [notificacoesAbertas, setNotificacoesAbertas] = useState(false);
  const [novaSolicitacaoAberta, setNovaSolicitacaoAberta] = useState(false);
  const [spotlightAberto, setSpotlightAberto] = useState(false);
  const [buscaSpotlight, setBuscaSpotlight] = useState('');

  // Atalho de teclado global Ctrl+K / Cmd+K para abrir Spotlight
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSpotlightAberto((prev) => !prev);
      } else if (e.key === 'Escape' && spotlightAberto) {
        setSpotlightAberto(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [spotlightAberto]);

  // Estados Globais Funcionais para todos os Módulos do Sistema
  const [produtosQuimicos, setProdutosQuimicos] = useState<ProdutoQuimico[]>(initialProdutos);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>(initialFornecedores);
  const [solicitacoesLab, setSolicitacoesLab] = useState<SolicitacaoLaboratorio[]>(initialSolicitacoes);
  const [compras, setCompras] = useState<CompraItem[]>(initialCompras);
  const [estoque, setEstoque] = useState<EstoqueItem[]>(initialEstoque);
  const [consumosAluno, setConsumosAluno] = useState<RegistroConsumoAluno[]>(initialConsumosAluno);
  const [ocorrenciasAluno, setOcorrenciasAluno] = useState<RelatoOcorrenciaAluno[]>(initialOcorrenciasAluno);
  const [alertas, setAlertas] = useState<AlertaNotificacao[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [filtroUsuarioPreSelecionado, setFiltroUsuarioPreSelecionado] = useState<'todos' | 'aluno' | 'professor'>('todos');
  const [compraPreSelecionada, setCompraPreSelecionada] = useState<string | undefined>();
  const [produtoParaQRCodeId, setProdutoParaQRCodeId] = useState<string | undefined>();
  const [produtoFocoId, setProdutoFocoId] = useState<string | undefined>();

  // Estado da Conexão em Tempo Real com MySQL
  const [modalMySQLAberto, setModalMySQLAberto] = useState(false);
  const [mysqlInfo, setMysqlInfo] = useState<{
    status: 'conectado' | 'desconectado';
    host: string | null;
    database: string | null;
    erro: string | null;
    instrucoes?: string;
  }>({
    status: 'desconectado',
    host: null,
    database: null,
    erro: null
  });
  const [checandoMySQL, setChecandoMySQL] = useState(false);
  const [criandoTabelas, setCriandoTabelas] = useState(false);
  const [msgTabelas, setMsgTabelas] = useState<string | null>(null);
  const [copiadoEnv, setCopiadoEnv] = useState(false);

  const verificarMySQL = async () => {
    setChecandoMySQL(true);
    setMsgTabelas(null);
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const data = await res.json();
        setMysqlInfo(data);
      }
    } catch {
      setMysqlInfo({ status: 'desconectado', host: null, database: null, erro: 'API offline ou indisponível' });
    } finally {
      setChecandoMySQL(false);
    }
  };

  const inicializarTabelasNoMySQL = async () => {
    setCriandoTabelas(true);
    setMsgTabelas(null);
    try {
      const res = await fetch('/api/init-db', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setMsgTabelas('✅ Tabelas criadas / atualizadas com sucesso no MySQL!');
        await recarregarDados();
        await verificarMySQL();
      } else {
        setMsgTabelas(`⚠️ ${data.detalhes || data.error || 'Erro ao inicializar tabelas'}`);
      }
    } catch (e: any) {
      setMsgTabelas(`⚠️ Erro de conexão com servidor: ${e.message}`);
    } finally {
      setCriandoTabelas(false);
    }
  };

  // Sincronização inicial com o repositório persistido (DAL)
  const recarregarDados = async () => {
    try {
      const [prods, forns, sols, cmps, est, cons, ocors, alrts, usrs] = await Promise.all([
        dataService.produtos.listar(),
        dataService.fornecedores.listar(),
        dataService.solicitacoes.listar(),
        dataService.compras.listar(),
        dataService.estoque.listar(),
        dataService.consumosAluno.listar(),
        dataService.ocorrenciasAluno.listar(),
        dataService.alertas.listar(),
        dataService.usuarios.listar()
      ]);
      setProdutosQuimicos(prods);
      setFornecedores(forns);
      setSolicitacoesLab(sols);
      setCompras(cmps);
      setEstoque(est);
      setConsumosAluno(cons);
      setOcorrenciasAluno(ocors);
      setAlertas(alrts);
      setUsuarios(usrs);
      setUsuarioSessao(dataService.obterSessao());
    } catch (e) {
      console.warn('Erro ao carregar dados do repositório:', e);
    }
  };

  useEffect(() => {
    recarregarDados();
    verificarMySQL();
  }, []);

  const handleAddConsumoAluno = async (novo: RegistroConsumoAluno) => {
    await dataService.registrarConsumoEAbater({
      produtoNome: novo.produtoNome,
      quantidade: novo.quantidadeUsada,
      unidade: novo.unidade,
      autorNome: novo.alunoNome,
      autorPerfil: perfilAtual,
      turma: novo.turma,
      bancada: novo.bancada,
      pratica: novo.pratica,
      observacoes: novo.observacoes
    });
    await recarregarDados();
  };

  const handleRegistrarConsumoEAbater = async (dados: {
    produtoNome: string;
    quantidade: number;
    unidade?: string;
    autorNome: string;
    autorPerfil: 'aluno' | 'professor';
    turma?: string;
    bancada?: string;
    pratica?: string;
    observacoes?: string;
  }) => {
    const res = await dataService.registrarConsumoEAbater(dados);
    await recarregarDados();
    return res;
  };

  const handleAddOcorrenciaAluno = (novo: RelatoOcorrenciaAluno) => {
    setOcorrenciasAluno((prev) => [novo, ...prev]);
    dataService.ocorrenciasAluno.criar(novo);
  };

  const handleMarcarVistoConsumo = (id: string) => {
    setConsumosAluno((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const atualizado = { ...c, statusVisto: 'Visto pelo Professor' as const };
          dataService.consumosAluno.atualizar(atualizado);
          return atualizado;
        }
        return c;
      })
    );
  };

  const handleAtualizarStatusOcorrencia = (
    id: string,
    status: 'Notificado' | 'Em atendimento' | 'Concluído'
  ) => {
    setOcorrenciasAluno((prev) =>
      prev.map((o) => {
        if (o.id === id) {
          const atualizado = { ...o, status };
          dataService.ocorrenciasAluno.atualizar(atualizado);
          return atualizado;
        }
        return o;
      })
    );
  };

  // Manipuladores de CRUD de Produtos
  const handleAddProduto = async (novo: ProdutoQuimico) => {
    setProdutosQuimicos((prev) => [novo, ...prev]);
    await dataService.produtos.criar(novo);
    // Adicionar automaticamente ao estoque também
    const novoEstoque: EstoqueItem = {
      id: `EST-${novo.id}`,
      produto: novo.nome,
      cas: novo.cas,
      quantidadeAtual: novo.estoqueAtual,
      unidade: novo.unidade,
      estoqueMinimo: novo.estoqueMinimo,
      validade: novo.validade,
      status: novo.estoqueAtual <= 0 ? 'Esgotado' : novo.estoqueAtual <= novo.estoqueMinimo ? 'Estoque baixo' : 'Normal',
      lote: `LT-${Date.now().toString().slice(-6)}`
    };
    setEstoque((prev) => [novoEstoque, ...prev]);
    await dataService.estoque.criar(novoEstoque);

    // Criar alerta no mural de avisos
    const agora = new Date();
    await dataService.alertas.criar({
      id: `ALT-CAD-${Date.now().toString().slice(-6)}`,
      tipo: 'alteracao',
      titulo: `Novo Reagente Cadastrado: ${novo.nome}`,
      mensagem: `${usuarioSessao?.nome || (perfilAtual === 'professor' ? 'Docente Responsável' : 'Usuário')} cadastrou ${novo.nome} (CAS ${novo.cas}) com estoque inicial de ${novo.estoqueAtual} ${novo.unidade}.`,
      produtoNome: novo.nome,
      saldoRestante: novo.estoqueAtual,
      unidade: novo.unidade,
      autorNome: usuarioSessao?.nome || 'Docente Responsável',
      autorPerfil: perfilAtual,
      dataHora: `${agora.toLocaleDateString('pt-BR')} às ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
      data: agora.toLocaleDateString('pt-BR'),
      hora: agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      lida: false,
      gravidade: 'baixa'
    });
    await recarregarDados();
  };

  const handleUpdateProduto = async (atualizado: ProdutoQuimico) => {
    const anterior = produtosQuimicos.find((p) => p.id === atualizado.id);
    setProdutosQuimicos((prev) =>
      prev.map((p) => (p.id === atualizado.id ? atualizado : p))
    );
    await dataService.produtos.atualizar(atualizado);

    // Se estoque foi modificado, sincronizar lote no estoque físico
    const lotes = await dataService.estoque.listar();
    const loteProd = lotes.find((l) => l.produto.trim().toLowerCase() === atualizado.nome.trim().toLowerCase());
    if (loteProd) {
      const statusLote = atualizado.estoqueAtual <= 0 ? 'Esgotado' : atualizado.estoqueAtual <= atualizado.estoqueMinimo ? 'Estoque baixo' : 'Normal';
      await dataService.estoque.atualizar({
        ...loteProd,
        quantidadeAtual: atualizado.estoqueAtual,
        estoqueMinimo: atualizado.estoqueMinimo,
        status: statusLote
      });
    }

    // Criar alerta no feed de avisos informando a alteração
    const estoqueAlterado = anterior && anterior.estoqueAtual !== atualizado.estoqueAtual;
    const ehCritico = atualizado.estoqueAtual <= atualizado.estoqueMinimo;
    const ehEsgotado = atualizado.estoqueAtual <= 0;

    const agora = new Date();
    const dataStr = agora.toLocaleDateString('pt-BR');
    const horaStr = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const alerta: AlertaNotificacao = {
      id: `ALT-EDT-${Date.now().toString().slice(-6)}`,
      tipo: ehEsgotado ? 'falta_estoque' : ehCritico ? 'alerta_critico' : 'alteracao',
      titulo: ehEsgotado
        ? `🚨 Reagente Esgotado: ${atualizado.nome}`
        : ehCritico
        ? `⚠️ Alerta de Estoque Baixo: ${atualizado.nome}`
        : `Atualização de Cadastro: ${atualizado.nome}`,
      mensagem: estoqueAlterado
        ? `Estoque ajustado de ${anterior?.estoqueAtual} ${anterior?.unidade} para ${atualizado.estoqueAtual} ${atualizado.unidade} pelo ${perfilAtual === 'professor' ? 'Professor' : 'Usuário'}.${ehCritico ? ' Atenção: Nível abaixo do mínimo operacional!' : ''}`
        : `Parâmetros e especificações do reagente ${atualizado.nome} foram atualizados no inventário.`,
      produtoNome: atualizado.nome,
      quantidadeAlterada: estoqueAlterado ? atualizado.estoqueAtual : undefined,
      saldoRestante: atualizado.estoqueAtual,
      unidade: atualizado.unidade,
      autorNome: usuarioSessao?.nome || (perfilAtual === 'professor' ? 'Docente Responsável' : 'Estudante'),
      autorPerfil: perfilAtual,
      dataHora: `${dataStr} às ${horaStr}`,
      data: dataStr,
      hora: horaStr,
      lida: false,
      gravidade: ehEsgotado ? 'alta' : ehCritico ? 'alta' : 'baixa',
      acaoSugerida: ehCritico || ehEsgotado ? 'comprar' : undefined
    };
    await dataService.alertas.criar(alerta);
    await recarregarDados();
  };

  const handleDeleteProduto = async (id: string) => {
    const prod = produtosQuimicos.find((p) => p.id === id);
    setProdutosQuimicos((prev) => prev.filter((p) => p.id !== id));
    await dataService.produtos.deletar(id);
    if (prod) {
      const agora = new Date();
      await dataService.alertas.criar({
        id: `ALT-DEL-${Date.now().toString().slice(-6)}`,
        tipo: 'alteracao',
        titulo: `Reagente Excluído do Inventário: ${prod.nome}`,
        mensagem: `O reagente químico ${prod.nome} (CAS ${prod.cas}) foi excluído do catálogo pelo ${perfilAtual === 'professor' ? 'Professor' : 'Administrador'}.`,
        produtoNome: prod.nome,
        autorNome: usuarioSessao?.nome || 'Docente Responsável',
        autorPerfil: perfilAtual,
        dataHora: `${agora.toLocaleDateString('pt-BR')} às ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
        data: agora.toLocaleDateString('pt-BR'),
        hora: agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        lida: false,
        gravidade: 'media'
      });
    }
    await recarregarDados();
  };

  // Manipuladores de CRUD de Fornecedores
  const handleAddFornecedor = (novo: Fornecedor) => {
    setFornecedores((prev) => [novo, ...prev]);
    dataService.fornecedores.criar(novo);
  };

  const handleUpdateFornecedor = (atualizado: Fornecedor) => {
    setFornecedores((prev) =>
      prev.map((f) => (f.id === atualizado.id ? atualizado : f))
    );
    dataService.fornecedores.atualizar(atualizado);
  };

  const handleDeleteFornecedor = (id: string) => {
    setFornecedores((prev) => prev.filter((f) => f.id !== id));
    dataService.fornecedores.deletar(id);
  };

  // Manipuladores de Solicitações
  const handleAddSolicitacao = (nova: SolicitacaoLaboratorio) => {
    setSolicitacoesLab((prev) => [nova, ...prev]);
    dataService.solicitacoes.criar(nova);
  };

  const handleUpdateSolicitacaoStatus = (
    id: string,
    status: 'Em análise' | 'Aprovada' | 'Pendência' | 'Reprovada'
  ) => {
    setSolicitacoesLab((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const atualizado = { ...s, status };
          dataService.solicitacoes.atualizar(atualizado);
          return atualizado;
        }
        return s;
      })
    );
  };

  // Manipuladores de Compras com Integração Real no Estoque do Laboratório
  const processarEntradaEstoqueCompra = async (compra: CompraItem) => {
    const agora = new Date();
    // Extrai número da quantidade (ex: "5 L" -> 5, "500 mL" -> 500, "2 kg" -> 2)
    const numeroQtd = parseFloat(compra.quantidade.replace(/[^0-9.,]/g, '').replace(',', '.')) || 1;

    // 1. Atualizar Reagente no Inventário
    const prods = await dataService.produtos.listar();
    const prod = prods.find((p) => p.nome.trim().toLowerCase() === compra.produto.trim().toLowerCase());
    if (prod) {
      const novoEstoque = Number(prod.estoqueAtual || 0) + numeroQtd;
      const prodAtualizado = { ...prod, estoqueAtual: novoEstoque };
      await dataService.produtos.atualizar(prodAtualizado);
    }

    // 2. Atualizar ou Criar Lote no Estoque Físico
    const lotes = await dataService.estoque.listar();
    const loteExistente = lotes.find((l) => l.produto.trim().toLowerCase() === compra.produto.trim().toLowerCase());
    if (loteExistente) {
      const novaQtdLote = Number(loteExistente.quantidadeAtual || 0) + numeroQtd;
      await dataService.estoque.atualizar({
        ...loteExistente,
        quantidadeAtual: novaQtdLote,
        status: novaQtdLote <= 0 ? 'Esgotado' : novaQtdLote <= loteExistente.estoqueMinimo ? 'Estoque baixo' : 'Normal'
      });
    } else if (prod) {
      await dataService.estoque.criar({
        id: `EST-${Date.now().toString().slice(-6)}`,
        produto: prod.nome,
        cas: prod.cas,
        quantidadeAtual: numeroQtd,
        unidade: prod.unidade,
        estoqueMinimo: prod.estoqueMinimo,
        validade: prod.validade,
        status: 'Normal',
        lote: `LT-${agora.getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
        fornecedor: compra.fornecedor
      });
    }

    // 3. Criar Alerta no Mural de Avisos do Sistema
    await dataService.alertas.criar({
      id: `ALT-REC-${Date.now().toString().slice(-6)}`,
      tipo: 'alteracao',
      titulo: `📦 Pedido Recebido no Lab: ${compra.produto}`,
      mensagem: `O pedido ${compra.id} de ${compra.quantidade} (${compra.fornecedor}) foi recebido com sucesso no laboratório. Saldo adicionado ao estoque físico!`,
      produtoNome: compra.produto,
      quantidadeAlterada: numeroQtd,
      autorNome: usuarioSessao?.nome || 'Docente Responsável',
      autorPerfil: perfilAtual,
      dataHora: `${agora.toLocaleDateString('pt-BR')} às ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
      data: agora.toLocaleDateString('pt-BR'),
      hora: agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      lida: false,
      gravidade: 'baixa'
    });
  };

  const handleAddCompra = async (nova: CompraItem) => {
    setCompras((prev) => [nova, ...prev]);
    await dataService.compras.criar(nova);
    const agora = new Date();
    await dataService.alertas.criar({
      id: `ALT-COM-${Date.now().toString().slice(-6)}`,
      tipo: 'alteracao',
      titulo: `Novo Pedido de Compra: ${nova.produto}`,
      mensagem: `Pedido ${nova.id} de ${nova.quantidade} com ${nova.fornecedor} (Total: R$ ${nova.valor.toFixed(2)}) cadastrado com status "${nova.status}".`,
      produtoNome: nova.produto,
      autorNome: usuarioSessao?.nome || 'Docente Responsável',
      autorPerfil: perfilAtual,
      dataHora: `${agora.toLocaleDateString('pt-BR')} às ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
      data: agora.toLocaleDateString('pt-BR'),
      hora: agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      lida: false,
      gravidade: 'baixa'
    });
    if (nova.status === 'Recebido') {
      await processarEntradaEstoqueCompra(nova);
    }
    await recarregarDados();
  };

  const handleUpdateCompra = async (atualizada: CompraItem) => {
    const anterior = compras.find((c) => c.id === atualizada.id);
    setCompras((prev) =>
      prev.map((c) => (c.id === atualizada.id ? atualizada : c))
    );
    await dataService.compras.atualizar(atualizada);

    // Se mudou para Recebido nesta atualização, abastecer estoque
    if (anterior && anterior.status !== 'Recebido' && atualizada.status === 'Recebido') {
      await processarEntradaEstoqueCompra(atualizada);
    }
    await recarregarDados();
  };

  const handleUpdateCompraStatus = async (
    id: string,
    status: 'Cotação' | 'Aguardando aprovação' | 'Pedido realizado' | 'Recebido'
  ) => {
    const compra = compras.find((c) => c.id === id);
    if (!compra) return;

    const anteriorStatus = compra.status;
    const atualizado = { ...compra, status };

    setCompras((prev) =>
      prev.map((c) => (c.id === id ? atualizado : c))
    );
    await dataService.compras.atualizar(atualizado);

    if (anteriorStatus !== 'Recebido' && status === 'Recebido') {
      await processarEntradaEstoqueCompra(atualizado);
    }
    await recarregarDados();
  };

  const handleDeleteCompra = async (id: string) => {
    const compra = compras.find((c) => c.id === id);
    setCompras((prev) => prev.filter((c) => c.id !== id));
    await dataService.compras.deletar(id);
    if (compra) {
      const agora = new Date();
      await dataService.alertas.criar({
        id: `ALT-DCOM-${Date.now().toString().slice(-6)}`,
        tipo: 'alteracao',
        titulo: `Ordem de Compra Cancelada: ${compra.produto}`,
        mensagem: `O pedido de compra ${compra.id} (${compra.quantidade} de ${compra.produto}) foi cancelado no sistema.`,
        produtoNome: compra.produto,
        autorNome: usuarioSessao?.nome || 'Docente Responsável',
        autorPerfil: perfilAtual,
        dataHora: `${agora.toLocaleDateString('pt-BR')} às ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
        data: agora.toLocaleDateString('pt-BR'),
        hora: agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        lida: false,
        gravidade: 'baixa'
      });
    }
    await recarregarDados();
  };

  // Manipuladores de Estoque
  const handleAddEstoque = (novo: EstoqueItem) => {
    setEstoque((prev) => [novo, ...prev]);
    dataService.estoque.criar(novo);
  };

  const handleUpdateEstoque = (atualizado: EstoqueItem) => {
    setEstoque((prev) =>
      prev.map((item) => (item.id === atualizado.id ? atualizado : item))
    );
    dataService.estoque.atualizar(atualizado);
  };

  const handleDeleteEstoque = (id: string) => {
    setEstoque((prev) => prev.filter((item) => item.id !== id));
    dataService.estoque.deletar(id);
  };

  const handleUpdateEstoqueQtd = (id: string, novaQtd: number) => {
    setEstoque((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const status =
            novaQtd <= 0
              ? 'Esgotado'
              : novaQtd <= item.estoqueMinimo
              ? 'Estoque baixo'
              : 'Normal';
          const atualizado = { ...item, quantidadeAtual: novaQtd, status };
          dataService.estoque.atualizar(atualizado);
          return atualizado;
        }
        return item;
      })
    );
  };

  const handleAddMovimentacao = (id: string, tipo: 'entrada' | 'saida', qtd: number, motivo: string) => {
    console.log(`Movimentação registrada para ${id}: ${tipo} de ${qtd} (${motivo})`);
  };

  const handleDeleteSolicitacao = (id: string) => {
    setSolicitacoesLab((prev) => prev.filter((s) => s.id !== id));
  };

  // Manipuladores de Gestão de Usuários e Senhas
  const handleAddUsuario = async (novo: Usuario) => {
    await dataService.usuarios.criar(novo);
    const agora = new Date();
    await dataService.alertas.criar({
      id: `ALT-USR-${Date.now().toString().slice(-6)}`,
      tipo: 'alteracao',
      titulo: `Novo ${novo.tipoPerfil === 'aluno' ? 'Aluno' : 'Professor'} Cadastrado: ${novo.nome}`,
      mensagem: `${novo.nome} foi cadastrado no sistema com perfil de ${novo.tipoPerfil === 'aluno' ? `Aluno (${novo.turma || 'Turma Geral'})` : 'Professor(a)'}.`,
      autorNome: usuarioSessao?.nome || 'Docente Responsável',
      autorPerfil: perfilAtual,
      dataHora: `${agora.toLocaleDateString('pt-BR')} às ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
      data: agora.toLocaleDateString('pt-BR'),
      hora: agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      lida: false,
      gravidade: 'baixa'
    });
    await recarregarDados();
  };

  const handleUpdateUsuario = async (atualizado: Usuario) => {
    const anterior = usuarios.find((u) => u.id === atualizado.id);
    await dataService.usuarios.atualizar(atualizado);
    const senhaAlterada = anterior && anterior.senha !== atualizado.senha;
    if (senhaAlterada) {
      const agora = new Date();
      await dataService.alertas.criar({
        id: `ALT-PW-${Date.now().toString().slice(-6)}`,
        tipo: 'alteracao',
        titulo: `Senha Redefinida: ${atualizado.nome}`,
        mensagem: `A senha de acesso do(a) ${atualizado.tipoPerfil === 'aluno' ? 'aluno(a)' : 'professor(a)'} ${atualizado.nome} foi redefinida pelo docente gestor.`,
        autorNome: usuarioSessao?.nome || 'Docente Responsável',
        autorPerfil: perfilAtual,
        dataHora: `${agora.toLocaleDateString('pt-BR')} às ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
        data: agora.toLocaleDateString('pt-BR'),
        hora: agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        lida: false,
        gravidade: 'baixa'
      });
    }
    await recarregarDados();
  };

  const handleDeleteUsuario = async (id: string) => {
    const usr = usuarios.find((u) => u.id === id);
    await dataService.usuarios.deletar(id);
    if (usr) {
      const agora = new Date();
      await dataService.alertas.criar({
        id: `ALT-DUSR-${Date.now().toString().slice(-6)}`,
        tipo: 'alteracao',
        titulo: `Usuário Removido: ${usr.nome}`,
        mensagem: `A conta de acesso de ${usr.nome} (${usr.email}) foi removida do sistema do laboratório.`,
        autorNome: usuarioSessao?.nome || 'Docente Responsável',
        autorPerfil: perfilAtual,
        dataHora: `${agora.toLocaleDateString('pt-BR')} às ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
        data: agora.toLocaleDateString('pt-BR'),
        hora: agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        lida: false,
        gravidade: 'baixa'
      });
    }
    await recarregarDados();
  };

  const nomesProdutosDisponiveis = produtosQuimicos.map((p) => p.nome);



  // Estados de Configuração dos Gráficos Dinâmicos do Dashboard
  const [metricaGrafico, setMetricaGrafico] = useState<'compras' | 'consumos'>('compras');
  const [modoDistribuicao, setModoDistribuicao] = useState<'estoque' | 'classe' | 'regulamentacao'>('estoque');

  // Atualização dos dados do usuário logado no perfil
  const handleUpdateUsuarioLogado = async (atualizado: Usuario) => {
    setUsuarioSessao(atualizado);
    dataService.salvarSessao(atualizado);
    setUsuarios((prev) => prev.map((u) => (u.id === atualizado.id ? atualizado : u)));
    await dataService.usuarios.atualizar(atualizado);
  };

  const menuItemsAluno: { name: string; icon: any; badge?: string }[] = [
    { name: 'Dashboard', icon: Home },
    { name: 'Produtos', icon: FlaskConical },
    { name: 'QR Code & Scanner', icon: QrCode },
    { name: 'Mandar alerta', icon: AlertTriangle },
    { name: 'Detalhes', icon: Info }
  ];

  const menuItemsProfessor = [
    { name: 'Dashboard', icon: Home },
    { name: 'Produtos', icon: FlaskConical },
    { name: 'QR Code & Scanner', icon: QrCode },
    { name: 'Fornecedores', icon: Truck },
    { name: 'Solicitações', icon: FileText },
    { name: 'Compras', icon: ShoppingCart },
    { name: 'Estoque', icon: Package },
    { name: 'Relatórios', icon: BarChart3 },
    {
      name: 'Alertas',
      icon: AlertTriangle,
      badge: alertas.length > 0 ? `${alertas.length}` : undefined
    },
    {
      name: 'Usuários',
      icon: Users,
      badge: usuarios.length > 0 ? `${usuarios.length}` : undefined
    },
    { name: 'Meu Perfil', icon: User },
    { name: 'Detalhes', icon: BookOpen }
  ];

  const menuItems = perfilAtual === 'aluno' ? menuItemsAluno : menuItemsProfessor;

  // CÁLCULO 100% DINÂMICO E FUNCIONAL DO GRÁFICO TEMPORAL (COMPRAS OU CONSUMOS)
  const nomesMeses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  const dadosGraficoMensal = useMemo(() => {
    const valoresCompras = Array(12).fill(0);
    const contagemCompras = Array(12).fill(0);
    const valoresConsumos = Array(12).fill(0);
    const contagemConsumos = Array(12).fill(0);

    // Processa compras reais cadastradas
    compras.forEach((c) => {
      if (!c.data) return;
      const partes = c.data.split('/');
      if (partes.length === 3) {
        const mesIdx = parseInt(partes[1], 10) - 1;
        if (mesIdx >= 0 && mesIdx < 12) {
          valoresCompras[mesIdx] += Number(c.valor) || 0;
          contagemCompras[mesIdx] += 1;
        }
      }
    });

    // Processa consumos e baixas reais registrados pelos alunos/professores
    consumosAluno.forEach((c) => {
      if (!c.data) return;
      const partes = c.data.split('/');
      if (partes.length === 3) {
        const mesIdx = parseInt(partes[1], 10) - 1;
        if (mesIdx >= 0 && mesIdx < 12) {
          valoresConsumos[mesIdx] += Number(c.quantidadeUsada) || 0;
          contagemConsumos[mesIdx] += 1;
        }
      }
    });

    const ehCompras = metricaGrafico === 'compras';
    const valoresAtivos = ehCompras ? valoresCompras : valoresConsumos;
    const contagensAtivas = ehCompras ? contagemCompras : contagemConsumos;

    const maxBruto = Math.max(...valoresAtivos);
    const maxVal = maxBruto <= 0 ? (ehCompras ? 5000 : 20) : maxBruto * 1.25;

    // Ticks para o eixo Y calibrados proporcionalmente
    const ticks = [
      { label: ehCompras ? `R$ ${(maxVal).toFixed(0)}` : `${(maxVal).toFixed(0)} un`, y: 25 },
      { label: ehCompras ? `R$ ${(maxVal * 0.75).toFixed(0)}` : `${(maxVal * 0.75).toFixed(0)} un`, y: 55 },
      { label: ehCompras ? `R$ ${(maxVal * 0.5).toFixed(0)}` : `${(maxVal * 0.5).toFixed(0)} un`, y: 85 },
      { label: ehCompras ? `R$ ${(maxVal * 0.25).toFixed(0)}` : `${(maxVal * 0.25).toFixed(0)} un`, y: 115 },
      { label: '0', y: 140 }
    ];

    const pontos = nomesMeses.map((mes, i) => {
      const val = valoresAtivos[i];
      const qtd = contagensAtivas[i];
      const x = 50 + i * 39;
      // Normalização: y vai de 140 (base) até 25 (topo)
      const y = 140 - (val / maxVal) * 115;
      const valorFull = ehCompras
        ? `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${qtd} ${qtd === 1 ? 'pedido' : 'pedidos'})`
        : `${val.toLocaleString('pt-BR')} ${val === 1 ? 'unidade' : 'unidades'} (${qtd} ${qtd === 1 ? 'baixa' : 'baixas'})`;

      return { mes, val, qtd, valorFull, x, y };
    });

    const pathLine = pontos.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const pathArea = `${pathLine} L ${pontos[pontos.length - 1].x} 140 L ${pontos[0].x} 140 Z`;

    return {
      pontos,
      pathLine,
      pathArea,
      ticks,
      maxVal,
      totalAtivo: valoresAtivos.reduce((a, b) => a + b, 0),
      totalOperacoes: contagensAtivas.reduce((a, b) => a + b, 0)
    };
  }, [compras, consumosAluno, metricaGrafico]);

  // CÁLCULO DINÂMICO DO GRÁFICO ACADÊMICO DE CONSUMO DE BANCADA (EXCLUSIVO DO ALUNO - ZERO R$, ZERO COMPRAS)
  const [pontoAlunoSelecionado, setPontoAlunoSelecionado] = useState<{ mes: string; valor: string } | null>(null);

  const dadosGraficoAluno = useMemo(() => {
    const contagemConsumos = Array(12).fill(0);
    const qtdConsumos = Array(12).fill(0);

    consumosAluno.forEach((c) => {
      if (!c.data) return;
      const partes = c.data.split('/');
      if (partes.length === 3) {
        const mesIdx = parseInt(partes[1], 10) - 1;
        if (mesIdx >= 0 && mesIdx < 12) {
          contagemConsumos[mesIdx] += 1;
          qtdConsumos[mesIdx] += Number(c.quantidadeUsada) || 0;
        }
      }
    });

    const maxBruto = Math.max(...contagemConsumos);
    const maxVal = maxBruto <= 0 ? 10 : maxBruto * 1.35;

    const ticks = [
      { label: `${Math.round(maxVal)} reg`, y: 25 },
      { label: `${Math.round(maxVal * 0.75)} reg`, y: 55 },
      { label: `${Math.round(maxVal * 0.5)} reg`, y: 85 },
      { label: `${Math.round(maxVal * 0.25)} reg`, y: 115 },
      { label: '0', y: 140 }
    ];

    const pontos = nomesMeses.map((mes, i) => {
      const qtd = contagemConsumos[i];
      const vol = qtdConsumos[i];
      const x = 50 + i * 39;
      const y = 140 - (qtd / maxVal) * 115;
      const valorFull = `${qtd} ${qtd === 1 ? 'uso de bancada' : 'usos de bancada'} (${vol} unidades/mL)`;

      return { mes, qtd, vol, valorFull, x, y };
    });

    const pathLine = pontos.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const pathArea = `${pathLine} L ${pontos[pontos.length - 1].x} 140 L ${pontos[0].x} 140 Z`;

    return {
      pontos,
      pathLine,
      pathArea,
      ticks,
      totalRegistros: contagemConsumos.reduce((a, b) => a + b, 0),
      totalVolume: qtdConsumos.reduce((a, b) => a + b, 0)
    };
  }, [consumosAluno]);

  // CÁLCULO 100% DINÂMICO E REATIVO DA DISTRIBUIÇÃO DE REAGENTES
  const dadosDistribuicao = useMemo(() => {
    const total = produtosQuimicos.length;
    if (total === 0) return { total: 0, fatias: [] };

    if (modoDistribuicao === 'estoque') {
      // Reativo a baixas, compras e consumos!
      const normal = produtosQuimicos.filter((p) => Number(p.estoqueAtual) > Number(p.estoqueMinimo)).length;
      const baixo = produtosQuimicos.filter((p) => Number(p.estoqueAtual) > 0 && Number(p.estoqueAtual) <= Number(p.estoqueMinimo)).length;
      const esgotado = produtosQuimicos.filter((p) => Number(p.estoqueAtual) <= 0).length;

      const pNormal = Math.round((normal / total) * 100);
      const pBaixo = Math.round((baixo / total) * 100);
      const pEsgotado = Math.max(0, 100 - pNormal - pBaixo);

      return {
        total,
        fatias: [
          { label: 'Estoque Normal', cor: '#10b981', count: normal, pct: pNormal },
          { label: 'Estoque Baixo', cor: '#f59e0b', count: baixo, pct: pBaixo },
          { label: 'Esgotado / Em Falta', cor: '#ef4444', count: esgotado, pct: pEsgotado }
        ].filter((f) => f.count > 0 || total > 0)
      };
    }

    if (modoDistribuicao === 'classe') {
      const mapaClasses: { [chave: string]: number } = {};
      produtosQuimicos.forEach((p) => {
        const cls = p.classePerigo ? p.classePerigo.trim() : 'Geral';
        mapaClasses[cls] = (mapaClasses[cls] || 0) + 1;
      });

      const paleta = ['#2f80ed', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];
      const chaves = Object.keys(mapaClasses);

      return {
        total,
        fatias: chaves.map((chave, idx) => ({
          label: chave,
          cor: paleta[idx % paleta.length],
          count: mapaClasses[chave],
          pct: Math.round((mapaClasses[chave] / total) * 100)
        }))
      };
    }

    // modoDistribuicao === 'regulamentacao'
    const controlados = produtosQuimicos.filter((p) => p.situacao === 'Controlado').length;
    const livres = total - controlados;
    const pCtrl = Math.round((controlados / total) * 100);

    return {
      total,
      fatias: [
        { label: 'Controlados (PF / Exército)', cor: '#2f80ed', count: controlados, pct: pCtrl },
        { label: 'Uso Livre / Não Controlados', cor: '#10b981', count: livres, pct: 100 - pCtrl }
      ]
    };
  }, [produtosQuimicos, modoDistribuicao]);

  const mudarStatusSolicitacao = async (id: string, novoStatus: 'Em análise' | 'Aprovada' | 'Pendência' | 'Reprovada') => {
    await handleUpdateSolicitacaoStatus(id, novoStatus);
    if (solicitacaoModal && solicitacaoModal.id === id) {
      setSolicitacaoModal({ ...solicitacaoModal, status: novoStatus });
    }
  };

  const solicitacoesFiltradas = solicitacoesLab.filter((s) => {
    const matchBusca =
      s.id.toLowerCase().includes(buscaSolicitacao.toLowerCase()) ||
      s.solicitante.toLowerCase().includes(buscaSolicitacao.toLowerCase()) ||
      s.produto.toLowerCase().includes(buscaSolicitacao.toLowerCase());
    const matchStatus = filtroStatus === 'Todos' || s.status === filtroStatus;
    return matchBusca && matchStatus;
  });

  return (
    <div className="w-full min-h-screen flex bg-[#F0F3F9] text-zinc-800 font-sans antialiased overflow-x-hidden">
      {/* ========================================================================= */}
      {/* 1. SIDEBAR LATERAL ESCURA DO FIGMA (w-56 para proporção harmoniosa)       */}
      {/* ========================================================================= */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-60 xl:w-64 bg-black flex flex-col justify-between transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          sidebarMobileAberta ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Logo Matéria Reativa com largura proporcional */}
          <div className="p-4 pb-3 flex items-center justify-between border-b border-zinc-900">
            <div
              className="w-full cursor-pointer transition hover:opacity-90 flex items-center justify-center py-1"
              onClick={() => onNavigate('index')}
              title="Voltar para a escolha de perfil"
            >
              <Logo width={150} variant="light" className="mx-auto" />
            </div>
            <button
              onClick={() => setSidebarMobileAberta(false)}
              className="lg:hidden text-zinc-400 hover:text-white p-1 rounded-md"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Itens de navegação com espaçamento confortável */}
          <nav className="mt-4 px-3 space-y-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isSelected = menuAtivo === item.name;
              return (
                <button
                  key={item.name}
                  onClick={() => {
                    setMenuAtivo(item.name);
                    setSidebarMobileAberta(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-[13px] font-semibold transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? 'bg-zinc-800 text-white shadow-xs'
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/80'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${isSelected ? 'text-[#2F80ED]' : 'text-zinc-400'}`} />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Perfil no rodapé da Sidebar dinâmico baseado na conta cadastrada */}
        {(() => {
          const nomeUsuario = usuarioSessao?.nome || (perfilAtual === 'aluno' ? 'Aluno' : 'Professor(a)');
          const infoComplementar = usuarioSessao?.turma || usuarioSessao?.departamento || (perfilAtual === 'aluno' ? 'Estudante de Laboratório' : 'Docente / Coordenação');
          const iniciaisUsuario = (nomeUsuario.split(' ').filter(Boolean).map(p => p[0]).slice(0, 2).join('') || 'US').toUpperCase();
          const avatarUrl = usuarioSessao?.id
            ? localStorage.getItem(`materia_reativa_avatar_${usuarioSessao.id}`)
            : usuarioSessao?.email
            ? localStorage.getItem(`materia_reativa_avatar_${usuarioSessao.email.trim().toLowerCase()}`)
            : null;

          return (
            <div className="p-3 border-t border-zinc-900 relative bg-black">
              <div
                onClick={() => setMenuUsuarioAberto(!menuUsuarioAberto)}
                className="flex items-center justify-between p-1.5 rounded-lg hover:bg-zinc-900 cursor-pointer transition select-none"
              >
                <div className="flex items-center gap-2.5">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={nomeUsuario}
                      className="w-8 h-8 rounded-full object-cover ring-1 ring-white/20 flex-shrink-0"
                    />
                  ) : (
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ring-1 ring-white/20 flex-shrink-0 ${
                        perfilAtual === 'aluno'
                          ? 'bg-gradient-to-br from-blue-500 to-cyan-500'
                          : 'bg-gradient-to-br from-indigo-500 to-purple-600'
                      }`}
                    >
                      <span>{iniciaisUsuario}</span>
                    </div>
                  )}
                  <div className="text-left overflow-hidden">
                    <p className="text-xs font-semibold text-white leading-tight truncate">
                      {nomeUsuario}
                    </p>
                    <span className="text-[10px] text-zinc-400 block truncate">
                      {infoComplementar}
                    </span>
                  </div>
                </div>
                <MoreVertical className="w-4 h-4 text-zinc-400 hover:text-white transition flex-shrink-0" />
              </div>

              {menuUsuarioAberto && (
                <div className="absolute bottom-14 left-2 right-2 bg-zinc-900 border border-zinc-800 rounded-xl p-1.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 space-y-0.5">
                  <button
                    onClick={() => {
                      setMenuAtivo('Meu Perfil');
                      setMenuUsuarioAberto(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-blue-300 hover:bg-zinc-800 rounded-lg transition cursor-pointer"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Ver Meu Perfil</span>
                  </button>
                  <button
                    onClick={() => {
                      dataService.encerrarSessao();
                      onNavigate('index');
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-rose-400 hover:bg-zinc-800 rounded-lg transition cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sair da conta</span>
                  </button>
                </div>
              )}
            </div>
          );
        })()}
      </aside>

      {sidebarMobileAberta && (
        <div
          onClick={() => setSidebarMobileAberta(false)}
          className="fixed inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-xs"
        />
      )}

      {/* ========================================================================= */}
      {/* 2. ÁREA PRINCIPAL COM PROPORÇÕES REFINADAS E CONFORTÁVEIS                 */}
      {/* ========================================================================= */}
      <main className="flex-1 min-w-0 flex flex-col max-h-screen overflow-y-auto">
        {/* Barra superior de cabeçalho */}
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-zinc-200/80 px-6 sm:px-8 lg:px-10 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarMobileAberta(true)}
              className="lg:hidden p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-zinc-900 leading-tight">
                  {menuAtivo === 'Dashboard' ? 'Painel de Controle' : menuAtivo}
                </h1>
                {/* Indicador de Perfil: Aluno tem indicador fixo sem botão alternador */}
                {perfilAtual === 'aluno' ? (
                  <div
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border bg-blue-50 border-blue-200 text-blue-700 shadow-2xs select-none"
                    title="Acesso de Estudante: visualização puramente acadêmica e bancada"
                  >
                    <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
                    <span>Perfil Aluno &bull; Acesso Acadêmico</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border bg-indigo-50 border-indigo-200 text-indigo-700 shadow-2xs select-none">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Docente / Gestor (Acesso Total)</span>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-zinc-500 hidden sm:block">
                {perfilAtual === 'aluno'
                  ? 'Laboratório de Química • Visão Acadêmica de Bancada (Limitada)'
                  : 'Laboratório de Química • Escola Estadual (Gestão Completa de Todos os Módulos)'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Barra de busca global com atalho ⌘K no Desktop */}
            <div className="relative hidden lg:block">
              <button
                type="button"
                onClick={() => setSpotlightAberto(true)}
                className="w-52 xl:w-64 h-10 pl-9 pr-3 text-xs sm:text-sm bg-zinc-100/90 hover:bg-zinc-200/70 rounded-xl border border-zinc-200/80 text-left text-zinc-500 flex items-center justify-between transition cursor-pointer group"
                title="Abrir busca global do sistema (Ctrl+K)"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Search className="w-4 h-4 text-zinc-400 group-hover:text-zinc-600 flex-shrink-0" />
                  <span className="truncate">Buscar no sistema...</span>
                </div>
                <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-mono text-zinc-400 bg-white border border-zinc-200 rounded-md shadow-2xs">
                  ⌘K
                </kbd>
              </button>
            </div>

            {/* Botão de busca compacto para Mobile e Tablet */}
            <button
              type="button"
              onClick={() => setSpotlightAberto(true)}
              className="lg:hidden p-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-600 transition cursor-pointer flex items-center justify-center"
              title="Buscar no sistema (Spotlight)"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Sino de Notificações (exclusivo do Professor) */}
            {perfilAtual !== 'aluno' && (
            <div className="relative">
              <button
                onClick={() => setNotificacoesAbertas(!notificacoesAbertas)}
                className="p-2.5 rounded-xl hover:bg-zinc-100 text-zinc-600 relative transition cursor-pointer"
                title="Notificações e Avisos de Estoque"
              >
                <Bell className="w-4.5 h-4.5" />
                {alertas.length > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                )}
              </button>

              {notificacoesAbertas && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-zinc-200 p-4 z-50 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-100 text-xs font-bold text-zinc-800">
                    <span className="flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-blue-600" />
                      <span>Notificações & Avisos ({alertas.length})</span>
                    </span>
                    <button
                      onClick={() => {
                        setMenuAtivo('Alertas');
                        setNotificacoesAbertas(false);
                      }}
                      className="text-[11px] text-blue-600 hover:underline font-semibold cursor-pointer"
                    >
                      Ver todos &rarr;
                    </button>
                  </div>
                  <div className="py-2 text-[11px] text-zinc-600 space-y-2 max-h-64 overflow-y-auto">
                    {alertas.length === 0 ? (
                      <p className="text-zinc-400 italic text-center py-4">Nenhum aviso pendente no momento.</p>
                    ) : (
                      alertas.slice(0, 4).map((alt) => (
                        <div
                          key={alt.id}
                          onClick={() => {
                            setMenuAtivo('Alertas');
                            setNotificacoesAbertas(false);
                          }}
                          className="cursor-pointer hover:bg-zinc-50 p-2.5 rounded-xl border border-zinc-100 transition space-y-0.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-zinc-900 text-[11px] truncate">{alt.titulo}</span>
                            <span className="text-[9px] text-zinc-400 font-mono flex-shrink-0">{alt.hora || 'Hoje'}</span>
                          </div>
                          <p className="text-[10px] text-zinc-500 line-clamp-2 leading-relaxed">{alt.mensagem}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            )}

            {perfilAtual === 'aluno' ? (
              <button
                onClick={() => setMenuAtivo('Mandar alerta')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2B7FFF] hover:bg-blue-600 active:scale-95 text-white text-xs sm:text-sm font-semibold shadow-xs transition cursor-pointer"
                title="Avisar professor quando um reagente estiver baixo"
              >
                <AlertTriangle className="w-4 h-4" />
                <span className="hidden sm:inline">Mandar Alerta</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setNovaSolicitacaoAberta(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2F80ED] hover:bg-blue-600 active:scale-95 text-white text-xs sm:text-sm font-semibold shadow-xs transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Nova Solicitação</span>
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Conteúdo com espaçamento e proporção centralizados para telas largas, laptops e mobile */}
        <div className="w-full max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-8 space-y-6 pb-28 lg:pb-16">
          {/* DASHBOARD LIMITADO PARA ALUNO */}
          {menuAtivo === 'Dashboard' && perfilAtual === 'aluno' && (
            <div className="space-y-6">
              {/* Top Banner: Azul Royal Sólido com Capelo em linha branca fiel ao Figma (image_1e71776b.png) */}
              <div className="bg-[#2B7FFF] text-white rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
                <div className="max-w-xl z-10">
                  <span className="text-xs font-semibold text-white/90 block mb-1.5 tracking-wide">
                    Área do aluno
                  </span>
                  <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                    Olá, {usuarioSessao?.nome?.split(' ')[0] || (perfilAtual === 'aluno' ? 'Aluno(a)' : 'Professor(a)')}!
                  </h1>
                  <p className="text-xs sm:text-sm text-white/90 mt-2.5 leading-relaxed font-normal">
                    Aqui você pode consultar os produtos, registrar seu consumo e avisar o professor quando algo precisar de reposição.
                  </p>
                </div>
                <div className="self-end md:self-center z-10 opacity-95 pr-2">
                  <GraduationCap className="w-20 h-20 sm:w-24 sm:h-24 text-white stroke-[1.4]" />
                </div>
              </div>

              {/* 3 Cards Integrados e Espaçados de Acesso Rápido e Métricas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
                {/* Card 1: Produtos & Reagentes */}
                <div className="bg-white rounded-3xl p-6 sm:p-7 border border-zinc-200/80 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between min-h-[220px]">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center">
                        <FlaskConical className="w-6 h-6 stroke-[1.5]" />
                      </div>
                      <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                        {produtosQuimicos.length} disponíveis
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-zinc-900">Catálogo de Produtos</h3>
                    <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
                      Consulte as fórmulas químicas, fichas de segurança (FISPQ) e localização dos frascos no armário.
                    </p>
                  </div>
                  <div className="pt-5 mt-4 border-t border-zinc-100 flex items-center justify-between">
                    <span className="text-[11px] text-zinc-400 font-mono">Bancada &bull; Consulta</span>
                    <button
                      type="button"
                      onClick={() => setMenuAtivo('Produtos')}
                      className="px-4 py-2 rounded-xl bg-[#2B7FFF] hover:bg-blue-600 active:scale-98 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                    >
                      Ver Produtos &rarr;
                    </button>
                  </div>
                </div>

                {/* Card 2: Leitor de QR Code */}
                <div className="bg-white rounded-3xl p-6 sm:p-7 border border-zinc-200/80 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between min-h-[220px]">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
                        <QrCode className="w-6 h-6 stroke-[1.5]" />
                      </div>
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                        {consumosAluno.length} retiradas
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-zinc-900">Leitor de QR Code</h3>
                    <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
                      Aponte a câmera para a etiqueta do frasco para consultar a ficha técnica e registrar o seu consumo na aula prática.
                    </p>
                  </div>
                  <div className="pt-5 mt-4 border-t border-zinc-100 flex items-center justify-between">
                    <span className="text-[11px] text-zinc-400 font-mono">Câmera &bull; Scanner</span>
                    <button
                      type="button"
                      onClick={() => setMenuAtivo('QR Code & Scanner')}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                    >
                      Abrir Leitor &rarr;
                    </button>
                  </div>
                </div>

                {/* Card 3: Mandar Alerta */}
                <div className="bg-white rounded-3xl p-6 sm:p-7 border border-zinc-200/80 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between min-h-[220px]">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6 stroke-[1.5]" />
                      </div>
                      <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                        {produtosQuimicos.filter((p) => p.estoqueAtual <= p.estoqueMinimo).length} em baixa
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-zinc-900">Mandar Alerta ao Professor</h3>
                    <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
                      Avise o professor quando um reagente estiver acabando, sofrer derramamento ou precisar de reposição imediata.
                    </p>
                  </div>
                  <div className="pt-5 mt-4 border-t border-zinc-100 flex items-center justify-between">
                    <span className="text-[11px] text-zinc-400 font-mono">Aviso Direto</span>
                    <button
                      type="button"
                      onClick={() => setMenuAtivo('Mandar alerta')}
                      className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-98 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                    >
                      Enviar Alerta &rarr;
                    </button>
                  </div>
                </div>
              </div>

              {/* Seção de Atividades Recentes de Bancada */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900">Minhas Atividades Recentes de Bancada</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">Histórico das suas retiradas e registros de consumo em aula prática</p>
                  </div>
                  {consumosAluno.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setMenuAtivo('Meu Perfil')}
                      className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                    >
                      Ver histórico completo &rarr;
                    </button>
                  )}
                </div>

                {consumosAluno.length === 0 ? (
                  <div className="text-center py-8 px-4 rounded-2xl bg-zinc-50 border border-dashed border-zinc-200 space-y-2">
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-zinc-700">Nenhum consumo registrado ainda</p>
                    <p className="text-[11px] text-zinc-400 max-w-sm mx-auto">
                      Durante as aulas de laboratório, use o Leitor de QR Code ou o Catálogo de Produtos para registrar as quantidades utilizadas.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-[11px] text-zinc-400 border-b border-zinc-100 font-medium">
                          <th className="pb-2">Reagente</th>
                          <th className="pb-2">Quantidade</th>
                          <th className="pb-2">Prática / Bancada</th>
                          <th className="pb-2">Data e Hora</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-50">
                        {consumosAluno.slice(0, 5).map((c, idx) => (
                          <tr key={idx} className="hover:bg-zinc-50">
                            <td className="py-2.5 font-bold text-zinc-900">{c.produtoNome}</td>
                            <td className="py-2.5 font-mono text-blue-600 font-semibold">{c.quantidade} {c.unidade || ''}</td>
                            <td className="py-2.5 text-zinc-600">{c.pratica || c.bancada || 'Aula Prática'}</td>
                            <td className="py-2.5 text-zinc-400 font-mono text-[11px]">{c.dataHora}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* DASHBOARD COMPLETO PARA PROFESSOR */}
          {menuAtivo === 'Dashboard' && perfilAtual === 'professor' && (
            <>
              {/* ================================================================= */}
              {/* 1. TOPO: 4 CARDS DE MÉTRICAS COM ALTURA E PROPORÇÃO CONFORTÁVEIS  */}
              {/* ================================================================= */}
              {/* ================================================================= */}
              {/* 1. TOPO: 4 CARDS DE MÉTRICAS ROYAL BLUE FIÉIS AO FIGMA           */}
              {/* ================================================================= */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
                {/* Card 1: Produtos - Azul Predominante com Detalhe Ciano */}
                <div
                  onClick={() => setMenuAtivo('Produtos')}
                  className="bg-gradient-to-br from-[#2B7FFF] to-[#1E6BDB] text-white rounded-3xl p-6 sm:p-7 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-out cursor-pointer flex items-center justify-between min-h-[135px] border border-blue-400/30"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-sky-300 animate-pulse" />
                      <h3 className="text-sm sm:text-base font-bold text-white/95">Produtos</h3>
                    </div>
                    <div className="text-3xl sm:text-4xl font-black text-white tracking-tight font-mono leading-none">
                      {produtosQuimicos.length}
                    </div>
                    <p className="text-xs text-sky-100 font-medium">Catálogo cadastrado</p>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-sky-400/20 text-white border border-sky-300/30 flex items-center justify-center flex-shrink-0 shadow-inner">
                    <FlaskConical className="w-8 h-8 stroke-[1.6]" />
                  </div>
                </div>

                {/* Card 2: Solicitações - Azul Predominante com Detalhe Violeta */}
                <div
                  onClick={() => setMenuAtivo('Solicitações')}
                  className="bg-gradient-to-br from-[#2B7FFF] to-[#1E6BDB] text-white rounded-3xl p-6 sm:p-7 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-out cursor-pointer flex items-center justify-between min-h-[135px] border border-blue-400/30"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-300" />
                      <h3 className="text-sm sm:text-base font-bold text-white/95">Solicitações</h3>
                    </div>
                    <div className="text-3xl sm:text-4xl font-black text-white tracking-tight font-mono leading-none">
                      {solicitacoesLab.filter((s) => s.status === 'Em análise' || s.status === 'Pendência').length}
                    </div>
                    <p className="text-xs text-purple-100 font-medium">Práticas pendentes</p>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-purple-400/25 text-purple-100 border border-purple-300/40 flex items-center justify-center flex-shrink-0 shadow-inner">
                    <FileText className="w-8 h-8 stroke-[1.6]" />
                  </div>
                </div>

                {/* Card 3: Compras - Azul Predominante com Detalhe Esmeralda */}
                <div
                  onClick={() => setMenuAtivo('Compras')}
                  className="bg-gradient-to-br from-[#2B7FFF] to-[#1E6BDB] text-white rounded-3xl p-6 sm:p-7 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-out cursor-pointer flex items-center justify-between min-h-[135px] border border-blue-400/30"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-300" />
                      <h3 className="text-sm sm:text-base font-bold text-white/95">Compras</h3>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-white tracking-tight font-mono leading-none truncate max-w-[180px]">
                      R$ {compras.reduce((acc, c) => acc + (Number(c.valor) || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </div>
                    <p className="text-xs text-emerald-100 font-medium">Total do mês</p>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-emerald-400/25 text-emerald-100 border border-emerald-300/40 flex items-center justify-center flex-shrink-0 shadow-inner">
                    <ShoppingCart className="w-8 h-8 stroke-[1.6]" />
                  </div>
                </div>

                {/* Card 4: Estoque Baixo - Azul Predominante com Detalhe Âmbar / Atenção */}
                <div
                  onClick={() => setMenuAtivo('Alertas')}
                  className="bg-gradient-to-br from-[#2B7FFF] to-[#1E6BDB] text-white rounded-3xl p-6 sm:p-7 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-out cursor-pointer flex items-center justify-between min-h-[135px] border border-blue-400/30"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-300 animate-pulse" />
                      <h3 className="text-sm sm:text-base font-bold text-white/95">Estoque baixo</h3>
                    </div>
                    <div className="text-3xl sm:text-4xl font-black text-white tracking-tight font-mono leading-none">
                      {estoque.filter((e) => e.status === 'Estoque baixo' || e.status === 'Esgotado').length || produtosQuimicos.filter(p => p.estoqueAtual <= p.estoqueMinimo).length}
                    </div>
                    <p className="text-xs text-amber-100 font-medium">Requer reposição</p>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-amber-400/25 text-amber-100 border border-amber-300/40 flex items-center justify-center flex-shrink-0 shadow-inner">
                    <AlertTriangle className="w-8 h-8 stroke-[1.6]" />
                  </div>
                </div>
              </div>

              {/* ================================================================= */}
              {/* 2. LINHA DO MEIO: DOIS GRÁFICOS COM ALTURAS ALINHADAS E PROPORÇÃO */}
              {/* ================================================================= */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                {/* Gráfico 1: Movimentação Temporal (Compras ou Consumos) */}
                <div className="lg:col-span-7 xl:col-span-8 bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-zinc-200/80 flex flex-col justify-between">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-base font-bold text-zinc-900">
                          {metricaGrafico === 'compras' ? 'Evolução de Compras do Laboratório' : 'Consumo de Reagentes em Bancada'}
                        </h3>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-600 font-semibold">
                          Ano {new Date().getFullYear()}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-1">
                        {pontoSelecionado
                          ? `${pontoSelecionado.mes}: ${pontoSelecionado.valor}`
                          : metricaGrafico === 'compras'
                          ? `Total acumulado: R$ ${dadosGraficoMensal.totalAtivo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${dadosGraficoMensal.totalOperacoes} pedidos)`
                          : `Total consumido: ${dadosGraficoMensal.totalAtivo.toLocaleString('pt-BR')} unidades (${dadosGraficoMensal.totalOperacoes} baixas)`}
                      </p>
                    </div>

                    {/* Alternador de Métrica Dinâmico */}
                    <div className="flex items-center gap-1.5 bg-zinc-100/90 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setMetricaGrafico('compras')}
                        className={`px-3.5 py-1.5 rounded-lg transition cursor-pointer ${
                          metricaGrafico === 'compras'
                            ? 'bg-white text-zinc-900 font-bold shadow-2xs'
                            : 'text-zinc-500 hover:text-zinc-800'
                        }`}
                      >
                        Compras (R$)
                      </button>
                      <button
                        type="button"
                        onClick={() => setMetricaGrafico('consumos')}
                        className={`px-3.5 py-1.5 rounded-lg transition cursor-pointer ${
                          metricaGrafico === 'consumos'
                            ? 'bg-white text-zinc-900 font-bold shadow-2xs'
                            : 'text-zinc-500 hover:text-zinc-800'
                        }`}
                      >
                        Baixas / Consumo
                      </button>
                    </div>
                  </div>

                  {dadosGraficoMensal.totalOperacoes === 0 && (metricaGrafico === 'compras' ? compras.length === 0 : consumosAluno.length === 0) ? (
                    <div className="w-full h-38 flex flex-col items-center justify-center text-center space-y-2 bg-zinc-50/50 rounded-xl border border-dashed border-zinc-200 p-4">
                      <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                        {metricaGrafico === 'compras' ? <ShoppingCart className="w-4 h-4" /> : <FlaskConical className="w-4 h-4" />}
                      </div>
                      <span className="text-xs font-semibold text-zinc-800">
                        {metricaGrafico === 'compras' ? 'Nenhum pedido de compra registrado' : 'Nenhuma baixa de reagente registrada'}
                      </span>
                      <p className="text-[11px] text-zinc-400 max-w-sm">
                        {metricaGrafico === 'compras'
                          ? 'Cadastre novos pedidos no menu Compras para visualizar a curva de investimentos em reagentes.'
                          : 'Conforme alunos ou professores registram consumo de reagentes, a curva mensal se atualizará automaticamente.'}
                      </p>
                    </div>
                  ) : (
                    <div className="w-full overflow-x-auto">
                      <div className="min-w-[480px]">
                        <svg viewBox="0 0 540 160" className="w-full h-38">
                          {/* Linhas de Grade e Eixo Y Dinâmico */}
                          {dadosGraficoMensal.ticks.map((line, idx) => (
                            <g key={idx}>
                              <text x="2" y={line.y + 3.5} fill="#9CA3AF" fontSize="8.5" fontFamily="sans-serif">
                                {line.label}
                              </text>
                              <line
                                x1="45"
                                y1={line.y}
                                x2="520"
                                y2={line.y}
                                stroke="#F3F4F6"
                                strokeWidth="1"
                              />
                            </g>
                          ))}
                          <defs>
                            <linearGradient id="graficoDinamicoGradiente" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={metricaGrafico === 'compras' ? '#2F80ED' : '#10B981'} stopOpacity="0.25" />
                              <stop offset="100%" stopColor={metricaGrafico === 'compras' ? '#2F80ED' : '#10B981'} stopOpacity="0.0" />
                            </linearGradient>
                          </defs>

                          {/* Área preenchida dinâmica */}
                          <path
                            d={dadosGraficoMensal.pathArea}
                            fill="url(#graficoDinamicoGradiente)"
                          />

                          {/* Linha traçada dinâmica */}
                          <path
                            d={dadosGraficoMensal.pathLine}
                            fill="none"
                            stroke={metricaGrafico === 'compras' ? '#2F80ED' : '#10B981'}
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />

                          {/* Pontos clicáveis dinâmicos */}
                          {dadosGraficoMensal.pontos.map((p, i) => (
                            <circle
                              key={i}
                              cx={p.x}
                              cy={p.y}
                              r={pontoSelecionado?.mes === p.mes ? '5.5' : '3.5'}
                              fill={metricaGrafico === 'compras' ? '#2F80ED' : '#10B981'}
                              stroke="#FFFFFF"
                              strokeWidth="1.8"
                              className="cursor-pointer hover:r-5 transition-all"
                              onMouseEnter={() => setPontoSelecionado({ mes: p.mes, valor: p.valorFull })}
                              onMouseLeave={() => setPontoSelecionado(null)}
                            />
                          ))}
                        </svg>

                        {/* Rótulos dos Meses */}
                        <div className="flex justify-between pl-11 pr-5 text-[10px] text-zinc-400 font-medium">
                          {dadosGraficoMensal.pontos.map((m) => (
                            <span
                              key={m.mes}
                              className={`cursor-pointer hover:text-blue-600 transition ${
                                pontoSelecionado?.mes === m.mes ? 'text-blue-600 font-bold' : ''
                              }`}
                              onClick={() => setPontoSelecionado({ mes: m.mes, valor: m.valorFull })}
                            >
                              {m.mes}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Gráfico 2: Distribuição de Reagentes 100% Funcional e Reativo */}
                <div className="lg:col-span-5 xl:col-span-4 bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-zinc-200/80 flex flex-col justify-between">
                  <div className="flex flex-col gap-2 mb-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-zinc-900">Distribuição de Reagentes</h3>
                      <span className="text-xs text-zinc-400 font-mono">{produtosQuimicos.length} reagentes</span>
                    </div>

                    {/* Alternador de Modo de Distribuição com botões confortáveis */}
                    <div className="flex items-center gap-1.5 bg-zinc-100/90 p-1 rounded-xl text-xs font-semibold self-start">
                      <button
                        type="button"
                        onClick={() => setModoDistribuicao('estoque')}
                        className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                          modoDistribuicao === 'estoque'
                            ? 'bg-white text-zinc-900 font-bold shadow-2xs'
                            : 'text-zinc-500 hover:text-zinc-800'
                        }`}
                        title="Distribuição em tempo real por nível de estoque (muda conforme consumo e baixa!)"
                      >
                        Nível de Estoque
                      </button>
                      <button
                        type="button"
                        onClick={() => setModoDistribuicao('classe')}
                        className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                          modoDistribuicao === 'classe'
                            ? 'bg-white text-zinc-900 font-bold shadow-2xs'
                            : 'text-zinc-500 hover:text-zinc-800'
                        }`}
                        title="Distribuição por famílias e classes químicas"
                      >
                        Classes
                      </button>
                      <button
                        type="button"
                        onClick={() => setModoDistribuicao('regulamentacao')}
                        className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                          modoDistribuicao === 'regulamentacao'
                            ? 'bg-white text-zinc-900 font-bold shadow-2xs'
                            : 'text-zinc-500 hover:text-zinc-800'
                        }`}
                        title="Distribuição por produtos controlados pela PF"
                      >
                        Polícia Federal
                      </button>
                    </div>
                  </div>

                  {produtosQuimicos.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-2 bg-zinc-50/50 rounded-xl border border-dashed border-zinc-200 my-2">
                      <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                        <PieChart className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-semibold text-zinc-800">
                        Nenhum reagente cadastrado
                      </span>
                      <p className="text-[11px] text-zinc-400 max-w-[210px]">
                        A distribuição percentual será calculada automaticamente conforme novos reagentes forem inseridos e consumidos.
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-4 py-2 flex-1">
                      {/* Donut SVG Dinâmico com Circunferência Exata */}
                      <div className="relative w-32 h-32 flex-shrink-0">
                        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                          {(() => {
                            const circ = 226.195; // 2 * pi * 36
                            let acumDash = 0;
                            return dadosDistribuicao.fatias.map((fatia, idx) => {
                              const dash = (fatia.pct / 100) * circ;
                              const offset = acumDash;
                              acumDash += dash;
                              return (
                                <circle
                                  key={idx}
                                  cx="50"
                                  cy="50"
                                  r="36"
                                  fill="transparent"
                                  stroke={fatia.cor}
                                  strokeWidth="15"
                                  strokeDasharray={`${dash} ${circ}`}
                                  strokeDashoffset={`-${offset}`}
                                  className="hover:opacity-85 transition-all duration-300"
                                />
                              );
                            });
                          })()}
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-base font-black text-zinc-900 leading-none">
                            {produtosQuimicos.length}
                          </span>
                          <span className="text-[9px] text-zinc-400 uppercase tracking-wider font-semibold mt-0.5">
                            Itens
                          </span>
                        </div>
                      </div>

                      {/* Legenda Dinâmica com Contagem e Porcentagem Real */}
                      <div className="space-y-1.5 text-[11px] text-zinc-600 font-medium flex-1 max-h-36 overflow-y-auto pr-1">
                        {dadosDistribuicao.fatias.map((fatia, idx) => (
                          <div key={idx} className="flex items-center justify-between gap-1 text-[10.5px]">
                            <div className="flex items-center gap-1.5 truncate">
                              <span
                                className="w-2.5 h-2.5 rounded-xs flex-shrink-0"
                                style={{ backgroundColor: fatia.cor }}
                              />
                              <span className="truncate" title={fatia.label}>{fatia.label}</span>
                            </div>
                            <span className="font-mono text-zinc-500 font-bold flex-shrink-0">
                              {fatia.count} ({fatia.pct}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="text-right text-[10px] text-zinc-400 pt-1 border-t border-zinc-100 flex items-center justify-between">
                    <span>
                      {modoDistribuicao === 'estoque'
                        ? 'Atualiza em tempo real a cada baixa/consumo'
                        : modoDistribuicao === 'classe'
                        ? 'Agrupamento por família química'
                        : 'Conformidade com Siproquim'}
                    </span>
                    <span className="font-semibold text-zinc-600">100% Sincronizado</span>
                  </div>
                </div>
              </div>

              {/* ================================================================= */}
              {/* 3. PARTE INFERIOR: SOLICITAÇÕES E GESTÃO DE PESSOAS / ACESSOS     */}
              {/* ================================================================= */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Coluna 1: Tabela de Últimas Solicitações (7 colunas) */}
                <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-zinc-200/80">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-base font-bold text-zinc-900">Últimas Solicitações</h3>
                      <p className="text-xs text-zinc-500 mt-0.5">Pedidos de reagentes para aulas e pesquisas</p>
                    </div>
                    <select
                      value={filtroStatus}
                      onChange={(e) => setFiltroStatus(e.target.value as any)}
                      className="text-xs bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 text-zinc-700 focus:outline-none focus:border-[#2F80ED] cursor-pointer"
                    >
                      <option value="Todos">Todas</option>
                      <option value="Aprovada">Aprovadas</option>
                      <option value="Pendente">Pendentes</option>
                      <option value="Reprovada">Reprovadas</option>
                    </select>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="text-[11px] text-zinc-400 border-b border-zinc-100 font-medium">
                          <th className="pb-3 pl-1">Código</th>
                          <th className="pb-3">Solicitante</th>
                          <th className="pb-3 text-right pr-1">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-50 text-xs">
                        {solicitacoesFiltradas.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="py-10 text-center text-xs text-zinc-400">
                              {solicitacoesLab.length === 0
                                ? 'Nenhuma solicitação de laboratório cadastrada ainda.'
                                : 'Nenhuma solicitação com o filtro selecionado.'}
                            </td>
                          </tr>
                        ) : (
                          solicitacoesFiltradas.map((s, index) => {
                            let corBadge = 'bg-amber-50 text-amber-700 border-amber-200';
                            if (s.status === 'Aprovada') {
                              corBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                            } else if (s.status === 'Reprovada') {
                              corBadge = 'bg-rose-50 text-rose-700 border-rose-200';
                            }

                            return (
                              <tr
                                key={index}
                                onClick={() => setSolicitacaoModal(s)}
                                className="hover:bg-blue-50/30 transition cursor-pointer"
                              >
                                <td className="py-3.5 pl-1 font-semibold text-[#2F80ED]">{s.id}</td>
                                <td className="py-3.5 text-zinc-800 font-medium">{s.solicitante}</td>
                                <td className="py-3.5 text-right pr-1">
                                  <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-semibold border ${corBadge}`}>
                                    {s.status}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Coluna 2: Pessoas & Usuários Cadastrados (5 colunas) */}
                <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-zinc-200/80 space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-[#2F80ED]" />
                        <span>Pessoas & Acessos do Lab</span>
                      </h3>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        {usuarios.length} {usuarios.length === 1 ? 'conta cadastrada' : 'contas cadastradas'} no sistema
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFiltroUsuarioPreSelecionado('todos');
                        setMenuAtivo('Usuários');
                      }}
                      className="text-[11px] text-blue-600 font-semibold hover:underline cursor-pointer"
                    >
                      Ver todos &rarr;
                    </button>
                  </div>

                  {/* 2 Cards Clicáveis: Alunos Cadastrados e Professores Cadastrados com Redirecionamento Direto */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5">
                    {/* Card Alunos Cadastrados */}
                    <div
                      onClick={() => {
                        setFiltroUsuarioPreSelecionado('aluno');
                        setMenuAtivo('Usuários');
                      }}
                      className="p-3.5 rounded-xl bg-gradient-to-br from-indigo-50/70 to-blue-50/40 border border-indigo-200/80 hover:border-indigo-400 hover:shadow-md transition cursor-pointer group flex items-center justify-between"
                      title="Clique para ver os alunos cadastrados e turmas"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center border border-indigo-200 group-hover:scale-105 transition-transform flex-shrink-0">
                          <GraduationCap className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-black text-indigo-950 font-mono">
                              {usuarios.filter((u) => u.tipoPerfil === 'aluno').length}
                            </span>
                            <span className="text-xs font-bold text-indigo-900">
                              Alunos Cadastrados
                            </span>
                          </div>
                          <span className="text-[11px] text-indigo-700/80 block">
                            Acessos e turmas de laboratório
                          </span>
                        </div>
                      </div>
                      <span className="text-indigo-600 font-bold group-hover:translate-x-1 transition-transform text-sm">
                        &rarr;
                      </span>
                    </div>

                    {/* Card Professores Cadastrados */}
                    <div
                      onClick={() => {
                        setFiltroUsuarioPreSelecionado('professor');
                        setMenuAtivo('Usuários');
                      }}
                      className="p-3.5 rounded-xl bg-gradient-to-br from-purple-50/70 to-indigo-50/40 border border-purple-200/80 hover:border-purple-400 hover:shadow-md transition cursor-pointer group flex items-center justify-between"
                      title="Clique para ver os professores cadastrados e permissões"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center border border-purple-200 group-hover:scale-105 transition-transform flex-shrink-0">
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-black text-purple-950 font-mono">
                              {usuarios.filter((u) => u.tipoPerfil === 'professor').length}
                            </span>
                            <span className="text-xs font-bold text-purple-900">
                              Professores Cadastrados
                            </span>
                          </div>
                          <span className="text-[11px] text-purple-700/80 block">
                            Gestão pedagógica e regulação
                          </span>
                        </div>
                      </div>
                      <span className="text-purple-600 font-bold group-hover:translate-x-1 transition-transform text-sm">
                        &rarr;
                      </span>
                    </div>
                  </div>

                  {/* Dica / Auxílio rápido com senhas */}
                  <div className="p-3 bg-amber-50/70 border border-amber-200/70 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
                    <KeyRound className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="leading-relaxed">
                      <strong>Esqueceu a senha?</strong> Você pode visualizar a senha cadastrada de qualquer estudante ou gerar uma nova senha com 1 clique na aba <strong>Usuários</strong>.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ================================================================= */}
          {/* ================================================================= */}
          {/* MÓDULOS OPERACIONAIS COMPLETOS E FIÉIS AO FIGMA                   */}
          {/* ================================================================= */}
          {/* Módulo Mandar Alerta (Fiel ao Figma image_763d03f8.png) */}
          {menuAtivo === 'Mandar alerta' && (
            <MandarAlertaView
              produtos={produtosQuimicos}
              onEnviarAlerta={async (dados) => {
                const agora = new Date();
                const dataStr = agora.toLocaleDateString('pt-BR');
                const horaStr = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                await dataService.alertas.criar({
                  id: `ALT-ALU-${Date.now().toString().slice(-6)}`,
                  tipo: 'falta_estoque',
                  titulo: `Aviso de Aluno: ${dados.produtoNome}`,
                  mensagem: `Motivo: ${dados.motivo}. ${dados.mensagem ? `Mensagem: ${dados.mensagem}` : ''}`,
                  produtoNome: dados.produtoNome,
                  autorNome: dados.autorNome,
                  autorPerfil: dados.autorPerfil,
                  dataHora: `${dataStr} às ${horaStr}`,
                  data: dataStr,
                  hora: horaStr,
                  lida: false,
                  gravidade: 'alta'
                });
                await recarregarDados();
              }}
              usuarioNome={usuarioSessao?.nome || (perfilAtual === 'aluno' ? 'Aluno(a)' : 'Docente')}
              isAluno={perfilAtual === 'aluno'}
            />
          )}

          {menuAtivo === 'Produtos' && (
            <ProdutosView
              produtos={produtosQuimicos}
              onAddProduto={handleAddProduto}
              onUpdateProduto={handleUpdateProduto}
              onDeleteProduto={handleDeleteProduto}
              isAluno={perfilAtual === 'aluno'}
              onRegistrarUso={(nome) => {
                setMenuAtivo('Uso & Acidentes');
              }}
              onGerarQRCode={(prod) => {
                setProdutoParaQRCodeId(prod.id);
                setMenuAtivo('QR Code & Scanner');
              }}
              produtoFocoId={produtoFocoId}
              onRegistrarConsumoEAbater={handleRegistrarConsumoEAbater}
              usuarioSessaoNome={usuarioSessao?.nome}
            />
          )}

          {/* Módulo de QR Code & Scanner (Acessível por Aluno e Professor) */}
          {menuAtivo === 'QR Code & Scanner' && (
            <QRCodeView
              produtos={produtosQuimicos}
              produtoInicialId={produtoParaQRCodeId}
              onNavigateToProdutos={(produtoId) => {
                if (produtoId) {
                  setProdutoFocoId(produtoId);
                }
                setMenuAtivo('Produtos');
              }}
              onNavigateToEstoque={() => setMenuAtivo('Estoque')}
              onAddProduto={handleAddProduto}
              onUpdateProduto={handleUpdateProduto}
              onDeleteProduto={handleDeleteProduto}
              onRegistrarConsumo={handleRegistrarConsumoEAbater}
              usuarioLogadoNome={usuarioSessao?.nome}
              isAluno={perfilAtual === 'aluno'}
            />
          )}

          {/* Módulo de Uso e Acidentes (Acessível por Aluno e Professor) */}
          {menuAtivo === 'Uso & Acidentes' && (
            <AlunoUsoEAcidentesView
              produtos={produtosQuimicos}
              consumos={consumosAluno}
              ocorrencias={ocorrenciasAluno}
              onAddConsumo={handleAddConsumoAluno}
              onAddOcorrencia={handleAddOcorrenciaAluno}
              onMarcarVistoConsumo={handleMarcarVistoConsumo}
              onAtualizarStatusOcorrencia={handleAtualizarStatusOcorrencia}
              isAluno={perfilAtual === 'aluno'}
            />
          )}

          {/* Módulo de Detalhes (Acessível por Aluno e Professor) */}
          {menuAtivo === 'Detalhes' && <DetalhesLabView />}

          {/* Módulos de Gestão (Exclusivos do Professor) */}
          {menuAtivo === 'Fornecedores' && perfilAtual === 'professor' && (
            <FornecedoresView
              fornecedores={fornecedores}
              onAddFornecedor={handleAddFornecedor}
              onUpdateFornecedor={handleUpdateFornecedor}
              onDeleteFornecedor={handleDeleteFornecedor}
            />
          )}

          {menuAtivo === 'Solicitações' && perfilAtual === 'professor' && (
            <SolicitacoesView
              solicitacoes={solicitacoesLab}
              onAddSolicitacao={handleAddSolicitacao}
              onUpdateSolicitacaoStatus={handleUpdateSolicitacaoStatus}
              onDeleteSolicitacao={handleDeleteSolicitacao}
              produtosDisponiveis={nomesProdutosDisponiveis}
            />
          )}

          {menuAtivo === 'Compras' && perfilAtual === 'professor' && (
            <ComprasView
              compras={compras}
              fornecedores={fornecedores}
              produtosDisponiveis={nomesProdutosDisponiveis}
              onAddCompra={handleAddCompra}
              onUpdateCompra={handleUpdateCompra}
              onUpdateCompraStatus={handleUpdateCompraStatus}
              onDeleteCompra={handleDeleteCompra}
              produtoPreSelecionado={compraPreSelecionada}
            />
          )}

          {menuAtivo === 'Estoque' && perfilAtual === 'professor' && (
            <EstoqueView
              estoque={estoque}
              produtosQuimicos={produtosQuimicos}
              onAddEstoque={handleAddEstoque}
              onUpdateEstoque={handleUpdateEstoque}
              onDeleteEstoque={handleDeleteEstoque}
              onUpdateQuantidade={handleUpdateEstoqueQtd}
              onAddMovimentacao={handleAddMovimentacao}
            />
          )}

          {menuAtivo === 'Relatórios' && perfilAtual === 'professor' && (
            <RelatoriosView
              produtos={produtosQuimicos}
              compras={compras}
              consumosAluno={consumosAluno}
              solicitacoes={solicitacoesLab}
              estoque={estoque}
            />
          )}

          {/* Módulo de Alertas & Notificações de Estoque (Acessível por Aluno e Professor) */}
          {menuAtivo === 'Alertas' && perfilAtual !== 'aluno' && (
            <AlertasView
              produtos={produtosQuimicos}
              estoque={estoque}
              alertas={alertas}
              consumos={consumosAluno}
              onNavigateToCompras={(prodNome) => {
                if (perfilAtual === 'aluno') {
                  return;
                }
                setCompraPreSelecionada(prodNome);
                setMenuAtivo('Compras');
              }}
              onMarcarLido={async (id) => {
                const al = alertas.find((a) => a.id === id);
                if (al) {
                  await dataService.alertas.atualizar({ ...al, lida: true });
                  await recarregarDados();
                }
              }}
              isAluno={perfilAtual === 'aluno'}
            />
          )}

          {/* Módulo de Gestão de Usuários, Pessoas e Senhas (Exclusivo do Professor) */}
          {menuAtivo === 'Usuários' && perfilAtual === 'professor' && (
            <UsuariosView
              usuarios={usuarios}
              onAddUsuario={handleAddUsuario}
              onUpdateUsuario={handleUpdateUsuario}
              onDeleteUsuario={handleDeleteUsuario}
              filtroInicial={filtroUsuarioPreSelecionado}
              usuarioLogadoId={usuarioSessao?.id}
            />
          )}

          {/* Módulo de Banco de Dados & Backup (Exclusivo do Professor) */}
          {menuAtivo === 'Banco de Dados' && perfilAtual === 'professor' && (
            <BancoDadosView
              onDataReset={recarregarDados}
              onDataReload={recarregarDados}
              onNavigateToUsuarios={(filtro) => {
                setFiltroUsuarioPreSelecionado(filtro || 'todos');
                setMenuAtivo('Usuários');
              }}
            />
          )}

          {/* Módulo Dedicado de Meu Perfil (Acessível por Aluno e Professor) */}
          {menuAtivo === 'Meu Perfil' && (
            <PerfilView
              usuario={usuarioSessao}
              perfilAtual={perfilAtual}
              consumosAluno={consumosAluno}
              ocorrenciasAluno={ocorrenciasAluno}
              produtos={produtosQuimicos}
              onAtualizarUsuario={handleUpdateUsuarioLogado}
              onNavigateToTab={(tab) => setMenuAtivo(tab)}
            />
          )}

        </div>

        {/* ========================================================================= */}
        {/* BARRA DE NAVEGAÇÃO INFERIOR PARA DISPOSITIVOS MÓVEIS (SMARTPHONES/TABLETS) */}
        {/* ========================================================================= */}
        <nav
          aria-label="Navegação móvel inferior"
          className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-zinc-200/90 shadow-lg px-2 py-1.5 flex items-center justify-around text-[10px] font-medium text-zinc-500 pb-[max(0.375rem,env(safe-area-inset-bottom))]"
        >
          {perfilAtual === 'aluno' ? (
            <>
              <button
                type="button"
                onClick={() => setMenuAtivo('Dashboard')}
                className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg transition cursor-pointer ${
                  menuAtivo === 'Dashboard' ? 'text-[#2F80ED] font-bold' : 'hover:text-zinc-800'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Painel</span>
              </button>
              <button
                type="button"
                onClick={() => setMenuAtivo('Produtos')}
                className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg transition cursor-pointer ${
                  menuAtivo === 'Produtos' ? 'text-[#2F80ED] font-bold' : 'hover:text-zinc-800'
                }`}
              >
                <FlaskConical className="w-4 h-4" />
                <span>Reagentes</span>
              </button>
              <button
                type="button"
                onClick={() => setMenuAtivo('Mandar alerta')}
                className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg transition cursor-pointer ${
                  menuAtivo === 'Mandar alerta' ? 'text-[#2B7FFF] font-bold' : 'hover:text-zinc-800'
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Alerta</span>
              </button>
              <button
                type="button"
                onClick={() => setMenuAtivo('Detalhes')}
                className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg transition cursor-pointer ${
                  menuAtivo === 'Detalhes' ? 'text-[#2F80ED] font-bold' : 'hover:text-zinc-800'
                }`}
              >
                <Info className="w-4 h-4" />
                <span>Normas</span>
              </button>
              <button
                type="button"
                onClick={() => setSidebarMobileAberta(true)}
                className="flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg hover:text-zinc-800 transition cursor-pointer"
              >
                <Menu className="w-4 h-4" />
                <span>Menu</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setMenuAtivo('Dashboard')}
                className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg transition cursor-pointer ${
                  menuAtivo === 'Dashboard' ? 'text-[#2F80ED] font-bold' : 'hover:text-zinc-800'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Painel</span>
              </button>
              <button
                type="button"
                onClick={() => setMenuAtivo('Produtos')}
                className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg transition cursor-pointer ${
                  menuAtivo === 'Produtos' ? 'text-[#2F80ED] font-bold' : 'hover:text-zinc-800'
                }`}
              >
                <FlaskConical className="w-4 h-4" />
                <span>Reagentes</span>
              </button>
              <button
                type="button"
                onClick={() => setMenuAtivo('Estoque')}
                className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg transition cursor-pointer ${
                  menuAtivo === 'Estoque' ? 'text-[#2F80ED] font-bold' : 'hover:text-zinc-800'
                }`}
              >
                <Boxes className="w-4 h-4" />
                <span>Estoque</span>
              </button>
              <button
                type="button"
                onClick={() => setMenuAtivo('Solicitações')}
                className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg transition cursor-pointer ${
                  menuAtivo === 'Solicitações' ? 'text-[#2F80ED] font-bold' : 'hover:text-zinc-800'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Solicitações</span>
              </button>
              <button
                type="button"
                onClick={() => setSidebarMobileAberta(true)}
                className="flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg hover:text-zinc-800 transition cursor-pointer"
              >
                <Menu className="w-4 h-4" />
                <span>Mais</span>
              </button>
            </>
          )}
        </nav>
      </main>

      {/* Modal de Detalhes da Solicitação */}
      {solicitacaoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 bg-zinc-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-blue-400 font-bold">{solicitacaoModal.id}</span>
                <h3 className="text-sm font-bold">Solicitação de Laboratório</h3>
              </div>
              <button onClick={() => setSolicitacaoModal(null)} className="text-zinc-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3 pb-3 border-b border-zinc-100">
                <div>
                  <span className="text-zinc-400 block text-[10px] font-semibold uppercase tracking-wider">Solicitante:</span>
                  <strong className="text-zinc-900 text-xs">{solicitacaoModal.solicitante}</strong>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[10px] font-semibold uppercase tracking-wider">Data:</span>
                  <strong className="text-zinc-900 text-xs">{solicitacaoModal.data}</strong>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[10px] font-semibold uppercase tracking-wider">Reagente / Item:</span>
                  <span className="text-zinc-800 font-medium">{solicitacaoModal.produto}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[10px] font-semibold uppercase tracking-wider">Quantidade:</span>
                  <span className="text-zinc-800 font-mono font-bold">{solicitacaoModal.quantidade}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-zinc-400 block text-[10px] font-semibold uppercase tracking-wider">Órgão / Destino:</span>
                  <span className="text-zinc-700">{solicitacaoModal.orgao}</span>
                </div>
              </div>

              {solicitacaoModal.observacao && (
                <div>
                  <p className="font-semibold text-zinc-700 mb-1 text-[11px]">Observações / Justificativa:</p>
                  <p className="bg-zinc-50 p-2.5 rounded-xl border border-zinc-100 text-[11px] text-zinc-600 leading-relaxed">
                    {solicitacaoModal.observacao}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <span className="text-zinc-500 font-medium">Status atual:</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-blue-50 text-blue-700 border-blue-200">
                  {solicitacaoModal.status}
                </span>
              </div>
            </div>

            <div className="px-5 py-3.5 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between">
              <button
                onClick={() => setSolicitacaoModal(null)}
                className="px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-200 rounded-lg transition cursor-pointer"
              >
                Fechar
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => mudarStatusSolicitacao(solicitacaoModal.id, 'Reprovada')}
                  className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 text-xs font-semibold hover:bg-rose-100 border border-rose-200 transition cursor-pointer"
                >
                  Reprovar
                </button>
                <button
                  onClick={() => mudarStatusSolicitacao(solicitacaoModal.id, 'Pendência')}
                  className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-xs font-semibold hover:bg-amber-100 border border-amber-200 transition cursor-pointer"
                >
                  Pendência
                </button>
                <button
                  onClick={() => mudarStatusSolicitacao(solicitacaoModal.id, 'Aprovada')}
                  className="px-3.5 py-1.5 rounded-lg bg-[#2F80ED] text-white text-xs font-semibold hover:bg-blue-600 shadow-xs transition cursor-pointer"
                >
                  Aprovar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nova Solicitação */}
      {novaSolicitacaoAberta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-3.5 bg-zinc-900 text-white flex items-center justify-between">
              <h3 className="text-xs font-bold">Nova Solicitação de Reagentes</h3>
              <button onClick={() => setNovaSolicitacaoAberta(false)} className="text-zinc-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const agora = new Date();
                const novaSol: SolicitacaoLaboratorio = {
                  id: `SOL-${agora.getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
                  solicitante: (formData.get('solicitante') as string) || usuarioSessao?.nome || 'Docente Responsável',
                  produto: (formData.get('produto') as string) || 'Reagentes Diversos',
                  quantidade: (formData.get('quantidade') as string) || '1 un',
                  orgao: (formData.get('orgao') as string) || 'Laboratório Geral',
                  data: agora.toLocaleDateString('pt-BR'),
                  status: 'Em análise',
                  observacao: (formData.get('observacao') as string) || ''
                };
                await handleAddSolicitacao(novaSol);
                setNovaSolicitacaoAberta(false);
              }}
              className="p-5 space-y-3 text-xs"
            >
              <div>
                <label className="block text-zinc-700 font-semibold mb-1">Solicitante (Professor / Pesquisador)</label>
                <input
                  type="text"
                  name="solicitante"
                  defaultValue={usuarioSessao?.nome || ''}
                  placeholder="Nome do docente solicitante"
                  required
                  className="w-full h-9 px-3 border border-zinc-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-zinc-700 font-semibold mb-1">Reagente / Produto Químico</label>
                <input
                  type="text"
                  name="produto"
                  placeholder="Ex: Ácido Clorídrico 37% P.A."
                  required
                  className="w-full h-9 px-3 border border-zinc-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-700 font-semibold mb-1">Quantidade</label>
                  <input
                    type="text"
                    name="quantidade"
                    placeholder="Ex: 500 mL ou 2 frascos"
                    required
                    className="w-full h-9 px-3 border border-zinc-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-700 font-semibold mb-1">Destino / Órgão</label>
                  <input
                    type="text"
                    name="orgao"
                    defaultValue="Laboratório de Química"
                    required
                    className="w-full h-9 px-3 border border-zinc-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-zinc-700 font-semibold mb-1">Finalidade / Observações</label>
                <textarea
                  name="observacao"
                  rows={2}
                  placeholder="Ex: Aula prática de Titulação Ácido-Base da Turma 3º B"
                  className="w-full p-2.5 border border-zinc-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setNovaSolicitacaoAberta(false)}
                  className="px-3.5 py-2 text-xs text-zinc-600 hover:bg-zinc-100 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#2F80ED] text-white text-xs font-semibold hover:bg-blue-600 shadow-xs transition cursor-pointer"
                >
                  Criar Solicitação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* MODAL SPOTLIGHT SEARCH / COMMAND PALETTE (CTRL+K)                         */}
      {/* ========================================================================= */}
      {spotlightAberto && (
        <div
          onClick={() => setSpotlightAberto(false)}
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-xs p-4 pt-16 sm:pt-24"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden animate-in fade-in zoom-in-95 flex flex-col max-h-[80vh]"
          >
            {/* Campo de Busca Spotlight */}
            <div className="flex items-center px-4 py-3.5 border-b border-zinc-200 gap-3 bg-zinc-50/70">
              <Search className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <input
                autoFocus
                type="text"
                value={buscaSpotlight}
                onChange={(e) => setBuscaSpotlight(e.target.value)}
                placeholder="Pesquise reagentes, CAS, lotes ou fornecedores..."
                className="w-full bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
              />
              {buscaSpotlight && (
                <button
                  onClick={() => setBuscaSpotlight('')}
                  className="p-1 rounded-md text-zinc-400 hover:text-zinc-600 text-xs"
                >
                  Limpar
                </button>
              )}
              <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono text-zinc-400 bg-white border border-zinc-200 rounded">
                ESC
              </kbd>
            </div>

            {/* Resultados em Lista Segmentada */}
            <div className="p-3 overflow-y-auto space-y-3 flex-1 text-xs">
              {/* Se não digitou nada, mostra atalhos de navegação direta */}
              {!buscaSpotlight.trim() && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider px-2 block mb-1.5">
                    Navegação Rápida
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {menuItems.map((it) => {
                      const Icon = it.icon;
                      return (
                        <button
                          key={it.name}
                          onClick={() => {
                            setMenuAtivo(it.name);
                            setSpotlightAberto(false);
                          }}
                          className="flex items-center justify-between p-2.5 rounded-xl hover:bg-blue-50/50 hover:text-blue-700 text-zinc-700 transition text-left cursor-pointer group"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-zinc-100 group-hover:bg-blue-100 text-zinc-600 group-hover:text-blue-600 flex items-center justify-center transition">
                              <Icon className="w-4 h-4" />
                            </div>
                            <span className="font-semibold">{it.name}</span>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-zinc-300 group-hover:text-blue-600 transition" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Se digitou algo, filtra em tempo real todos os módulos */}
              {buscaSpotlight.trim() && (
                <>
                  {/* Reagentes Químicos */}
                  {produtosQuimicos.filter(
                    (p) =>
                      p.nome.toLowerCase().includes(buscaSpotlight.toLowerCase()) ||
                      p.cas.toLowerCase().includes(buscaSpotlight.toLowerCase()) ||
                      (p.formulaQuimica && p.formulaQuimica.toLowerCase().includes(buscaSpotlight.toLowerCase()))
                  ).length > 0 && (
                    <div>
                      <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider px-2 block mb-1">
                        Reagentes Químicos (Catálogo)
                      </span>
                      <div className="space-y-1">
                        {produtosQuimicos
                          .filter(
                            (p) =>
                              p.nome.toLowerCase().includes(buscaSpotlight.toLowerCase()) ||
                              p.cas.toLowerCase().includes(buscaSpotlight.toLowerCase()) ||
                              (p.formulaQuimica && p.formulaQuimica.toLowerCase().includes(buscaSpotlight.toLowerCase()))
                          )
                          .slice(0, 4)
                          .map((prod) => (
                            <button
                              key={prod.id}
                              onClick={() => {
                                setMenuAtivo('Produtos');
                                setSpotlightAberto(false);
                              }}
                              className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-blue-50/60 transition text-left cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                <FlaskConical className="w-4 h-4 text-blue-600" />
                                <div>
                                  <strong className="text-zinc-900 block">{prod.nome}</strong>
                                  <span className="text-zinc-500 font-mono text-[10px]">
                                    CAS: {prod.cas} {prod.formulaQuimica && `· ${prod.formulaQuimica}`}
                                  </span>
                                </div>
                              </div>
                              <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                {prod.estoqueAtual} {prod.unidade}
                              </span>
                            </button>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Lotes do Estoque (Exclusivo Docente) */}
                  {perfilAtual === 'professor' &&
                    estoque.filter(
                      (e) =>
                        e.produto.toLowerCase().includes(buscaSpotlight.toLowerCase()) ||
                        e.lote.toLowerCase().includes(buscaSpotlight.toLowerCase())
                    ).length > 0 && (
                      <div>
                        <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider px-2 block mb-1">
                          Lotes no Estoque Físico
                        </span>
                        <div className="space-y-1">
                          {estoque
                            .filter(
                              (e) =>
                                e.produto.toLowerCase().includes(buscaSpotlight.toLowerCase()) ||
                                e.lote.toLowerCase().includes(buscaSpotlight.toLowerCase())
                            )
                            .slice(0, 3)
                            .map((item) => (
                              <button
                                key={item.id}
                                onClick={() => {
                                  setMenuAtivo('Estoque');
                                  setSpotlightAberto(false);
                                }}
                                className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-emerald-50/60 transition text-left cursor-pointer"
                              >
                                <div className="flex items-center gap-2">
                                  <Package className="w-4 h-4 text-emerald-600" />
                                  <div>
                                    <strong className="text-zinc-900 block">{item.produto}</strong>
                                    <span className="text-zinc-500 font-mono text-[10px]">
                                      Lote: {item.lote} · Val: {item.validade}
                                    </span>
                                  </div>
                                </div>
                                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                  Saldo: {item.quantidadeAtual} {item.unidade}
                                </span>
                              </button>
                            ))}
                        </div>
                      </div>
                    )}

                  {/* Fornecedores (Exclusivo Docente) */}
                  {perfilAtual === 'professor' &&
                    fornecedores.filter(
                      (f) =>
                        f.razaoSocial.toLowerCase().includes(buscaSpotlight.toLowerCase()) ||
                        f.cnpj.includes(buscaSpotlight)
                    ).length > 0 && (
                      <div>
                        <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider px-2 block mb-1">
                          Fornecedores Homologados
                        </span>
                        <div className="space-y-1">
                          {fornecedores
                            .filter(
                              (f) =>
                                f.razaoSocial.toLowerCase().includes(buscaSpotlight.toLowerCase()) ||
                                f.cnpj.includes(buscaSpotlight)
                            )
                            .slice(0, 2)
                            .map((forn) => (
                              <button
                                key={forn.id}
                                onClick={() => {
                                  setMenuAtivo('Fornecedores');
                                  setSpotlightAberto(false);
                                }}
                                className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-purple-50/60 transition text-left cursor-pointer"
                              >
                                <div className="flex items-center gap-2">
                                  <Truck className="w-4 h-4 text-purple-600" />
                                  <div>
                                    <strong className="text-zinc-900 block">{forn.razaoSocial}</strong>
                                    <span className="text-zinc-500 font-mono text-[10px]">CNPJ: {forn.cnpj}</span>
                                  </div>
                                </div>
                                <span className="text-[10px] text-zinc-500">{forn.contato}</span>
                              </button>
                            ))}
                        </div>
                      </div>
                    )}

                  {/* Pessoas e Usuários Cadastrados (Exclusivo Professor) */}
                  {perfilAtual === 'professor' &&
                    usuarios.filter(
                      (u) =>
                        u.nome.toLowerCase().includes(buscaSpotlight.toLowerCase()) ||
                        u.email.toLowerCase().includes(buscaSpotlight.toLowerCase()) ||
                        (u.turma && u.turma.toLowerCase().includes(buscaSpotlight.toLowerCase()))
                    ).length > 0 && (
                      <div>
                        <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider px-2 block mb-1">
                          Pessoas Cadastradas (Usuários & Alunos)
                        </span>
                        <div className="space-y-1">
                          {usuarios
                            .filter(
                              (u) =>
                                u.nome.toLowerCase().includes(buscaSpotlight.toLowerCase()) ||
                                u.email.toLowerCase().includes(buscaSpotlight.toLowerCase()) ||
                                (u.turma && u.turma.toLowerCase().includes(buscaSpotlight.toLowerCase()))
                            )
                            .slice(0, 3)
                            .map((usr) => (
                              <button
                                key={usr.id}
                                onClick={() => {
                                  setFiltroUsuarioPreSelecionado(usr.tipoPerfil);
                                  setMenuAtivo('Usuários');
                                  setSpotlightAberto(false);
                                }}
                                className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-blue-50/60 transition text-left cursor-pointer"
                              >
                                <div className="flex items-center gap-2">
                                  <Users className="w-4 h-4 text-blue-600" />
                                  <div>
                                    <strong className="text-zinc-900 block">{usr.nome}</strong>
                                    <span className="text-zinc-500 font-mono text-[10px]">{usr.email}</span>
                                  </div>
                                </div>
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                                  usr.tipoPerfil === 'aluno'
                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                    : 'bg-purple-50 text-purple-700 border-purple-200'
                                }`}>
                                  {usr.tipoPerfil === 'aluno' ? `Aluno (${usr.turma || 'Geral'})` : 'Professor'}
                                </span>
                              </button>
                            ))}
                        </div>
                      </div>
                    )}

                  {/* Sem resultados */}
                  {produtosQuimicos.filter((p) => p.nome.toLowerCase().includes(buscaSpotlight.toLowerCase())).length === 0 &&
                    estoque.filter((e) => e.produto.toLowerCase().includes(buscaSpotlight.toLowerCase())).length === 0 &&
                    fornecedores.filter((f) => f.razaoSocial.toLowerCase().includes(buscaSpotlight.toLowerCase())).length === 0 && (
                      <div className="py-8 text-center text-zinc-400">
                        <p>Nenhum resultado para "{buscaSpotlight}".</p>
                        <p className="text-[11px] mt-1 text-zinc-500">Tente buscar pelo nome do reagente, fórmula ou número CAS.</p>
                      </div>
                    )}
                </>
              )}
            </div>

            {/* Rodapé do Spotlight */}
            <div className="px-4 py-2 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between text-[11px] text-zinc-400">
              <span>Use <strong>Enter</strong> para selecionar ou <strong>Esc</strong> para sair</span>
              <span className="font-semibold text-zinc-600">Matéria Reativa OS</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE STATUS E CONFIGURAÇÃO DO MYSQL EM TEMPO REAL                     */}
      {/* ========================================================================= */}
      {modalMySQLAberto && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Cabeçalho */}
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/70 flex-shrink-0">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className={`w-8 sm:w-9 h-8 sm:h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  mysqlInfo.status === 'conectado' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  <Database className="w-4 sm:w-5 h-4 sm:h-5" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-zinc-900 leading-tight">Integração com Banco MySQL</h3>
                  <p className="text-[11px] sm:text-xs text-zinc-500 hidden sm:block">Conexão direta, persistente e em tempo real com o backend</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalMySQLAberto(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo com rolagem se necessário */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 text-xs text-zinc-700 leading-relaxed flex-1">
              {/* Card de Status da Conexão */}
              <div className={`p-3.5 sm:p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 ${
                mysqlInfo.status === 'conectado'
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50/70 border-amber-200 text-amber-900'
              }`}>
                <div>
                  <div className="flex items-center gap-2 font-bold text-xs sm:text-sm mb-1">
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      mysqlInfo.status === 'conectado' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                    }`} />
                    <span>{mysqlInfo.status === 'conectado' ? 'MySQL Conectado em Tempo Real' : 'Aguardando Conexão com o MySQL'}</span>
                  </div>
                  <p className="text-[11px] sm:text-xs">
                    {mysqlInfo.status === 'conectado'
                      ? `Conectado ao host "${mysqlInfo.host}" no banco "${mysqlInfo.database}". Qualquer inserção ou exclusão é sincronizada diretamente.`
                      : 'O backend Node.js (Express + mysql2) está pronto e ativo. No momento, o frontend está utilizando persistência local até que as credenciais do MySQL sejam inseridas.'}
                  </p>
                  {mysqlInfo.erro && mysqlInfo.status !== 'conectado' && (
                    <p className="mt-2 text-[11px] font-mono bg-amber-100/80 p-2 rounded border border-amber-200/80 text-amber-800 break-all">
                      Info: {mysqlInfo.erro}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={verificarMySQL}
                  disabled={checandoMySQL}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-800 font-semibold shadow-2xs text-xs flex-shrink-0 cursor-pointer disabled:opacity-50 self-end sm:self-auto"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-zinc-500 ${checandoMySQL ? 'animate-spin' : ''}`} />
                  <span>{checandoMySQL ? 'Testando...' : 'Testar Conexão'}</span>
                </button>
              </div>

              {/* Botão de Inicializar Tabelas */}
              <div className="bg-zinc-50 border border-zinc-200 p-3.5 sm:p-4 rounded-xl space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
                  <div>
                    <h4 className="font-bold text-zinc-900 text-xs">Estrutura DDL Automática</h4>
                    <p className="text-[11px] text-zinc-500">
                      Executa automaticamente o script <code className="bg-zinc-200 px-1 py-0.5 rounded font-mono">schema.sql</code> para criar as 10 tabelas no seu banco.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={inicializarTabelasNoMySQL}
                    disabled={criandoTabelas}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#2F80ED] hover:bg-blue-600 text-white font-semibold text-xs shadow-xs transition cursor-pointer disabled:opacity-50"
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    <span>{criandoTabelas ? 'Criando tabelas...' : 'Inicializar Tabelas'}</span>
                  </button>
                </div>
                {msgTabelas && (
                  <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-[11px]">
                    {msgTabelas}
                  </div>
                )}
              </div>

              {/* Passo a Passo Prático */}
              <div>
                <h4 className="font-bold text-zinc-900 text-sm mb-3">Passo a Passo Rápido para Ligar o MySQL:</h4>
                <ol className="list-decimal list-inside space-y-2.5 text-xs text-zinc-600">
                  <li>
                    <strong className="text-zinc-900">Crie o banco de dados no seu MySQL:</strong>
                    <div className="mt-1 font-mono text-[11px] bg-zinc-900 text-zinc-100 p-2.5 rounded-lg">
                      CREATE DATABASE materia_reativa_lab CHARACTER SET utf8mb4;
                    </div>
                  </li>
                  <li>
                    <strong className="text-zinc-900">Configure o arquivo <span className="font-mono bg-zinc-100 px-1 py-0.5 rounded">.env</span> com seus dados:</strong>
                    <div className="relative mt-1">
                      <pre className="font-mono text-[11px] bg-zinc-900 text-emerald-400 p-3 rounded-lg overflow-x-auto">
{`MYSQL_HOST="localhost"
MYSQL_PORT="3306"
MYSQL_DATABASE="materia_reativa_lab"
MYSQL_USER="root"
MYSQL_PASSWORD="sua_senha_aqui"

# Ou via URL completa:
# DATABASE_URL="mysql://root:senha@localhost:3306/materia_reativa_lab"`}
                      </pre>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(`MYSQL_HOST="localhost"\nMYSQL_PORT="3306"\nMYSQL_DATABASE="materia_reativa_lab"\nMYSQL_USER="root"\nMYSQL_PASSWORD=""`);
                          setCopiadoEnv(true);
                          setTimeout(() => setCopiadoEnv(false), 2000);
                        }}
                        className="absolute top-2 right-2 px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] flex items-center gap-1 cursor-pointer"
                      >
                        {copiadoEnv ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiadoEnv ? 'Copiado!' : 'Copiar'}</span>
                      </button>
                    </div>
                  </li>
                  <li>
                    <strong className="text-zinc-900">Clique em "Testar Conexão" acima:</strong>
                    <p className="mt-0.5">Assim que o servidor detectar a conexão, o badge ficará verde e todos os cadastros de produtos, contas e estoques serão gravados diretamente no MySQL!</p>
                  </li>
                </ol>
              </div>
            </div>

            {/* Rodapé do Modal */}
            <div className="px-6 py-3 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between text-xs">
              <span className="text-zinc-500 font-mono text-[11px]">Backend: Node.js Express + mysql2 v3</span>
              <button
                type="button"
                onClick={() => setModalMySQLAberto(false)}
                className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white font-medium cursor-pointer transition"
              >
                Entendi / Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
