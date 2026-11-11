import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import {
  QrCode,
  Scan,
  Printer,
  Download,
  Copy,
  Check,
  Search,
  AlertTriangle,
  Flame,
  ShieldAlert,
  FlaskConical,
  Camera,
  CameraOff,
  Upload,
  RefreshCw,
  PlusCircle,
  Clock,
  Sparkles,
  MapPin,
  Package,
  FileText,
  X,
  ArrowRight,
  CheckCircle2,
  Tag,
  Edit2,
  Trash2,
  MinusCircle,
  SwitchCamera
} from 'lucide-react';
import { ProdutoQuimico } from '../../types';

export interface QRCodeViewProps {
  produtos: ProdutoQuimico[];
  onNavigateToProdutos: (produtoId?: string) => void;
  onNavigateToEstoque?: () => void;
  produtoInicialId?: string;
  isAluno?: boolean;
  onAddProduto?: (novo: ProdutoQuimico) => Promise<void>;
  onUpdateProduto?: (atualizado: ProdutoQuimico) => Promise<void>;
  onDeleteProduto?: (id: string) => Promise<void>;
  onRegistrarConsumo?: (dados: {
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
  usuarioLogadoNome?: string;
}

export const QRCodeView: React.FC<QRCodeViewProps> = ({
  produtos,
  onNavigateToProdutos,
  onNavigateToEstoque,
  produtoInicialId,
  isAluno = false,
  onAddProduto,
  onUpdateProduto,
  onDeleteProduto,
  onRegistrarConsumo,
  usuarioLogadoNome
}) => {
  // Aba ativa: 'scanner' (padrão com câmera proeminente) | 'gerador' | 'lote'
  const [abaAtiva, setAbaAtiva] = useState<'gerador' | 'scanner' | 'lote'>('scanner');

  useEffect(() => {
    if (isAluno && abaAtiva !== 'scanner') {
      setAbaAtiva('scanner');
    }
  }, [isAluno, abaAtiva]);

  // Modo do Gerador: 'catalogo' (selecionar do catálogo) | 'novo' (criar etiqueta avulsa/personalizada)
  const [modoGerador, setModoGerador] = useState<'catalogo' | 'novo'>(() => {
    return produtos.length > 0 ? 'catalogo' : 'novo';
  });

  // Produto selecionado do catálogo
  const [produtoSelecionado, setProdutoSelecionado] = useState<ProdutoQuimico | null>(() => {
    if (produtoInicialId) {
      const found = produtos.find((p) => p.id === produtoInicialId);
      if (found) return found;
    }
    return produtos.length > 0 ? produtos[0] : null;
  });

  // Campos do Gerador Personalizado / Novo Reagente (Sistema 100% Zerado)
  const [nomeCustom, setNomeCustom] = useState('');
  const [casCustom, setCasCustom] = useState('');
  const [formulaCustom, setFormulaCustom] = useState('');
  const [purezaCustom, setPurezaCustom] = useState('');
  const [loteCustom, setLoteCustom] = useState('');
  const [volumeCustom, setVolumeCustom] = useState('');
  const [localizacaoCustom, setLocalizacaoCustom] = useState('');
  const [validadeCustom, setValidadeCustom] = useState('');
  const [classePerigoCustom, setClassePerigoCustom] = useState('Geral');
  const [corPerigoCustom, setCorPerigoCustom] = useState<'vermelho' | 'amarelo' | 'laranja' | 'verde'>('verde');
  const [situacaoCustom, setSituacaoCustom] = useState<'Controlado' | 'Liberado'>('Liberado');

  const [buscaProduto, setBuscaProduto] = useState('');
  const [tamanhoEtiqueta, setTamanhoEtiqueta] = useState<'pequena' | 'media' | 'grande'>('media');
  const [incluirAvisoEpi, setIncluirAvisoEpi] = useState(true);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copiado, setCopiado] = useState(false);
  const [salvandoNoCatalogo, setSalvandoNoCatalogo] = useState(false);

  // Estados do Scanner
  const [cameraAtiva, setCameraAtiva] = useState(false);
  const [cameraErro, setCameraErro] = useState<string | null>(null);
  const [cameraFacingMode, setCameraFacingMode] = useState<'environment' | 'user'>('environment');
  const [resultadoLeitura, setResultadoLeitura] = useState<{
    textoBruto: string;
    produtoEncontrado: ProdutoQuimico | null;
    timestamp: string;
  } | null>(null);
  const [historicoLeituras, setHistoricoLeituras] = useState<Array<{
    id: string;
    produtoNome: string;
    cas: string;
    hora: string;
    produto: ProdutoQuimico;
  }>>([]);
  const [codigoManual, setCodigoManual] = useState('');

  // Estados de Impressão em Lote
  const [produtosLoteSelecionados, setProdutosLoteSelecionados] = useState<string[]>(() => {
    return produtos.slice(0, 6).map((p) => p.id);
  });
  const [qrCodesLote, setQrCodesLote] = useState<{ [id: string]: string }>({});

  // Refs de vídeo, canvas e arquivo para scanner
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Modais de Baixa / Consumo e Toast (100% Zerado)
  const [modalConsumo, setModalConsumo] = useState<ProdutoQuimico | null>(null);
  const [consumoQtd, setConsumoQtd] = useState<string>('');
  const [consumoPratica, setConsumoPratica] = useState<string>('');
  const [consumoTurma, setConsumoTurma] = useState<string>('');
  const [consumoBancada, setConsumoBancada] = useState<string>('');
  const [consumoObs, setConsumoObs] = useState<string>('');
  const [salvandoConsumo, setSalvandoConsumo] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const mostrarToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Se a lista de produtos mudar e não houver selecionado, seleciona o primeiro
  useEffect(() => {
    if (produtos.length > 0 && !produtoSelecionado) {
      setProdutoSelecionado(produtos[0]);
    }
  }, [produtos, produtoSelecionado]);

  // Se receber produtoInicialId do exterior
  useEffect(() => {
    if (produtoInicialId) {
      const found = produtos.find((p) => p.id === produtoInicialId);
      if (found) {
        setProdutoSelecionado(found);
        setModoGerador('catalogo');
        setAbaAtiva('gerador');
      }
    }
  }, [produtoInicialId, produtos]);

  // Dados ativos que compõem a etiqueta exibida no Gerador
  const dadosAtivos = React.useMemo(() => {
    if (modoGerador === 'catalogo' && produtoSelecionado) {
      return {
        id: produtoSelecionado.id,
        nome: produtoSelecionado.nome,
        cas: produtoSelecionado.cas,
        formula: produtoSelecionado.formulaQuimica || '—',
        pureza: produtoSelecionado.pureza || 'P.A.',
        lote: `LT-${produtoSelecionado.id.slice(-4)}`,
        volume: `${produtoSelecionado.estoqueAtual} ${produtoSelecionado.unidade}`,
        localizacao: produtoSelecionado.localizacao || 'Armário de Reagentes',
        validade: produtoSelecionado.validade,
        classe: produtoSelecionado.classePerigo || 'Geral',
        cor: produtoSelecionado.corPerigo,
        situacao: produtoSelecionado.situacao,
        ehCatalogo: true
      };
    }
    return {
      id: `CUSTOM-${Date.now().toString().slice(-6)}`,
      nome: nomeCustom.trim() || 'Substância Química',
      cas: casCustom.trim() || '—',
      formula: formulaCustom.trim() || '—',
      pureza: purezaCustom.trim() || 'P.A.',
      lote: loteCustom.trim() || 'LT-01',
      volume: volumeCustom.trim() || '500 mL',
      localizacao: localizacaoCustom.trim() || 'Armário Lab',
      validade: validadeCustom.trim() || '12/2026',
      classe: classePerigoCustom,
      cor: corPerigoCustom,
      situacao: situacaoCustom,
      ehCatalogo: false
    };
  }, [
    modoGerador,
    produtoSelecionado,
    nomeCustom,
    casCustom,
    formulaCustom,
    purezaCustom,
    loteCustom,
    volumeCustom,
    localizacaoCustom,
    validadeCustom,
    classePerigoCustom,
    corPerigoCustom,
    situacaoCustom
  ]);

  // GERAÇÃO EM TEMPO REAL DO QR CODE
  useEffect(() => {
    const payload = JSON.stringify({
      prefix: 'MATERIA_REATIVA',
      id: dadosAtivos.id,
      nome: dadosAtivos.nome,
      cas: dadosAtivos.cas,
      formula: dadosAtivos.formula,
      lote: dadosAtivos.lote,
      validade: dadosAtivos.validade,
      local: dadosAtivos.localizacao,
      classe: dadosAtivos.classe,
      situacao: dadosAtivos.situacao
    });

    QRCode.toDataURL(payload, {
      width: 480,
      margin: 1.5,
      color: {
        dark: '#09090b',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'H'
    })
      .then((url) => setQrCodeDataUrl(url))
      .catch((err) => console.error('Erro ao gerar QR Code:', err));
  }, [dadosAtivos]);

  // Geração de QR Codes do Lote
  useEffect(() => {
    if (abaAtiva !== 'lote' || produtos.length === 0) return;
    const novosQrs: { [id: string]: string } = {};
    const promises = produtos
      .filter((p) => produtosLoteSelecionados.includes(p.id))
      .map(async (prod) => {
        const payload = JSON.stringify({
          prefix: 'MATERIA_REATIVA',
          id: prod.id,
          nome: prod.nome,
          cas: prod.cas,
          local: prod.localizacao || 'Laboratório',
          situacao: prod.situacao
        });
        const url = await QRCode.toDataURL(payload, {
          width: 320,
          margin: 1,
          errorCorrectionLevel: 'M'
        });
        novosQrs[prod.id] = url;
      });

    Promise.all(promises).then(() => {
      setQrCodesLote(novosQrs);
    });
  }, [abaAtiva, produtosLoteSelecionados, produtos]);

  // Função utilitária para tocar som suave de scanner
  const tocarBipScanner = () => {
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(950, ctx.currentTime);
      osc.frequency.setValueAtTime(1400, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    } catch {
      // Falha de áudio silenciosa
    }
  };

  // Processar código lido
  const processarCodigoLido = (rawCode: string) => {
    tocarBipScanner();

    let produtoEncontrado: ProdutoQuimico | null = null;

    try {
      if (rawCode.trim().startsWith('{')) {
        const parsed = JSON.parse(rawCode);
        if (parsed.id) {
          produtoEncontrado = produtos.find((p) => p.id === parsed.id) || null;
        }
        if (!produtoEncontrado && parsed.cas) {
          produtoEncontrado = produtos.find((p) => p.cas === parsed.cas) || null;
        }
        if (!produtoEncontrado && parsed.nome) {
          produtoEncontrado =
            produtos.find((p) => p.nome.toLowerCase() === parsed.nome.toLowerCase()) || null;
        }
      }
    } catch {
      // Não é JSON
    }

    if (!produtoEncontrado) {
      produtoEncontrado =
        produtos.find(
          (p) =>
            p.id.toLowerCase() === rawCode.trim().toLowerCase() ||
            p.cas === rawCode.trim() ||
            p.nome.toLowerCase().includes(rawCode.trim().toLowerCase())
        ) || null;
    }

    const novoResultado = {
      textoBruto: rawCode,
      produtoEncontrado,
      timestamp: new Date().toLocaleTimeString('pt-BR')
    };

    setResultadoLeitura(novoResultado);

    if (produtoEncontrado) {
      setHistoricoLeituras((prev) => [
        {
          id: `${Date.now()}`,
          produtoNome: produtoEncontrado!.nome,
          cas: produtoEncontrado!.cas,
          hora: new Date().toLocaleTimeString('pt-BR'),
          produto: produtoEncontrado!
        },
        ...prev.filter((h) => h.produto.id !== produtoEncontrado!.id).slice(0, 5)
      ]);
    }

    if (cameraAtiva) {
      pararCamera();
    }
  };

  // Loop do scanner
  const escanearFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const decode = (jsQR as unknown as { default?: typeof jsQR }).default || jsQR;
        const code = decode(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert'
        });

        if (code && code.data) {
          processarCodigoLido(code.data);
          return;
        }
      }
    }

    animationFrameRef.current = requestAnimationFrame(escanearFrame);
  };

  // Iniciar Câmera
  const iniciarCamera = async (targetMode?: 'environment' | 'user') => {
    setCameraErro(null);
    const mode = targetMode || cameraFacingMode;
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Câmera não suportada neste navegador.');
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }
      setCameraFacingMode(mode);
      setCameraAtiva(true);
      animationFrameRef.current = requestAnimationFrame(escanearFrame);
    } catch {
      setCameraErro('Não foi possível acessar a câmera do computador ou celular. Você pode carregar uma foto do QR code abaixo.');
      setCameraAtiva(false);
    }
  };

  const pararCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraAtiva(false);
  };

  const alternarCamera = () => {
    const proximo = cameraFacingMode === 'environment' ? 'user' : 'environment';
    setCameraFacingMode(proximo);
    if (cameraAtiva) {
      pararCamera();
      setTimeout(() => iniciarCamera(proximo), 250);
    }
  };

  // Upload de Imagem para Leitura
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const decode = (jsQR as unknown as { default?: typeof jsQR }).default || jsQR;
        const code = decode(imageData.data, imageData.width, imageData.height);

        if (code && code.data) {
          processarCodigoLido(code.data);
          mostrarToast('QR Code identificado com sucesso na foto!');
        } else {
          mostrarToast('Nenhum QR Code nítido foi detectado nesta imagem.');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Salvar o reagente gerado diretamente no catálogo e estoque
  const handleSalvarNoCatalogo = async () => {
    if (!onAddProduto) {
      mostrarToast('Ação não disponível no momento.');
      return;
    }

    setSalvandoNoCatalogo(true);
    try {
      const qtdParsed = parseFloat(dadosAtivos.volume.replace(/[^0-9.,]/g, '').replace(',', '.')) || 500;
      const unidadeParsed: 'L' | 'mL' | 'kg' | 'g' = dadosAtivos.volume.toLowerCase().includes('kg')
        ? 'kg'
        : dadosAtivos.volume.toLowerCase().includes('g')
        ? 'g'
        : dadosAtivos.volume.toLowerCase().includes('ml')
        ? 'mL'
        : 'L';

      const novo: ProdutoQuimico = {
        id: `PRD-${Date.now().toString().slice(-6)}`,
        nome: dadosAtivos.nome,
        cas: dadosAtivos.cas,
        formulaQuimica: dadosAtivos.formula !== '—' ? dadosAtivos.formula : undefined,
        pureza: dadosAtivos.pureza,
        classePerigo: dadosAtivos.classe,
        corPerigo: dadosAtivos.cor,
        situacao: dadosAtivos.situacao === 'Controlado' ? 'Controlado' : 'Não controlado',
        estoqueAtual: qtdParsed,
        estoqueMinimo: Math.max(1, Math.round(qtdParsed * 0.2)),
        unidade: unidadeParsed,
        validade: dadosAtivos.validade,
        localizacao: dadosAtivos.localizacao
      };

      await onAddProduto(novo);
      setProdutoSelecionado(novo);
      setModoGerador('catalogo');
      mostrarToast(`Reagente "${novo.nome}" cadastrado com sucesso no inventário e estoque!`);
    } catch {
      mostrarToast('Falha ao salvar produto no inventário.');
    } finally {
      setSalvandoNoCatalogo(false);
    }
  };

  // Baixar PNG do QR Code
  const handleBaixarQrCode = () => {
    if (!qrCodeDataUrl) return;
    const a = document.createElement('a');
    a.href = qrCodeDataUrl;
    const cleanName = dadosAtivos.nome.toLowerCase().replace(/[^a-z0-9]/g, '_');
    a.download = `qrcode_${cleanName}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    mostrarToast('Download do QR Code em alta resolução iniciado!');
  };

  // Copiar Dados
  const handleCopiarDados = () => {
    const texto = `[MATÉRIA REATIVA]
Reagente: ${dadosAtivos.nome}
Fórmula: ${dadosAtivos.formula}
CAS: ${dadosAtivos.cas}
Pureza: ${dadosAtivos.pureza}
Lote: ${dadosAtivos.lote}
Localização: ${dadosAtivos.localizacao}
Validade: ${dadosAtivos.validade}
Classe: ${dadosAtivos.classe}
ID do Sistema: ${dadosAtivos.id}`;

    navigator.clipboard.writeText(texto);
    setCopiado(true);
    mostrarToast('Dados da etiqueta copiados para a área de transferência!');
    setTimeout(() => setCopiado(false), 2500);
  };

  // Imprimir Etiqueta Atual com Formatação Profissional em Janela de Impressão Isolada
  const handleImprimirEtiqueta = () => {
    const printWin = window.open('', '_blank');
    if (!printWin) {
      window.print();
      return;
    }
    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <title>Etiqueta Reagente - ${dadosAtivos.nome}</title>
          <style>
            @page { size: auto; margin: 8mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 20px; color: #111; background: #fff; display: flex; justify-content: center; }
            .label-box { width: 340px; border: 2.5px solid #000; border-radius: 12px; padding: 16px; background: #fff; box-sizing: border-box; }
            .top-bar { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 10px; }
            .brand { font-size: 13px; font-weight: 900; letter-spacing: 1.5px; }
            .badge { font-size: 9px; font-weight: bold; background: #000; color: #fff; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; }
            .reagent-name { font-size: 18px; font-weight: 900; line-height: 1.2; margin-bottom: 4px; color: #000; }
            .reagent-meta { font-family: monospace; font-size: 12px; font-weight: 700; color: #333; margin-bottom: 12px; }
            .qr-wrap { text-align: center; margin: 10px 0; }
            .qr-wrap img { width: 170px; height: 170px; display: inline-block; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 11px; border-top: 1.5px solid #000; padding-top: 8px; margin-top: 8px; }
            .info-item span { display: block; font-size: 9px; text-transform: uppercase; color: #666; font-weight: bold; }
            .info-item strong { font-size: 11px; color: #000; }
            .footer-tag { font-size: 9px; text-align: center; margin-top: 10px; font-family: monospace; color: #444; border-top: 1px dashed #999; padding-top: 6px; }
          </style>
        </head>
        <body>
          <div class="label-box">
            <div class="top-bar">
              <span class="brand">MATÉRIA REATIVA</span>
              <span class="badge">LABORATÓRIO</span>
            </div>
            <div class="reagent-name">${dadosAtivos.nome}</div>
            <div class="reagent-meta">CAS: ${dadosAtivos.cas} ${dadosAtivos.formula ? `• ${dadosAtivos.formula}` : ''}</div>
            <div class="qr-wrap">
              ${qrCodeDataUrl ? `<img src="${qrCodeDataUrl}" alt="QR Code" />` : ''}
            </div>
            <div class="info-grid">
              <div class="info-item"><span>Lote</span><strong>${dadosAtivos.lote || 'LAB-01'}</strong></div>
              <div class="info-item"><span>Validade</span><strong>${dadosAtivos.validade || 'Indeterminada'}</strong></div>
              <div class="info-item"><span>Pureza</span><strong>${dadosAtivos.pureza || 'P.A. 99%'}</strong></div>
              <div class="info-item"><span>Armazenamento</span><strong>${dadosAtivos.localizacao || 'Armário Principal'}</strong></div>
            </div>
            <div class="footer-tag">REGISTRO DIGITAL AUTENTICADO • SISTEMA ESCOLAR</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;
    printWin.document.open();
    printWin.document.write(html);
    printWin.document.close();
  };

  // Confirmar Baixa / Consumo
  const handleConfirmarConsumo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalConsumo) return;
    const qtdNum = Number(consumoQtd);
    if (isNaN(qtdNum) || qtdNum <= 0) {
      mostrarToast('Informe uma quantidade válida para a baixa.');
      return;
    }

    setSalvandoConsumo(true);
    try {
      if (onRegistrarConsumo) {
        await onRegistrarConsumo({
          produtoNome: modalConsumo.nome,
          quantidade: qtdNum,
          unidade: modalConsumo.unidade,
          autorNome: usuarioLogadoNome || 'Docente Responsável',
          autorPerfil: isAluno ? 'aluno' : 'professor',
          turma: consumoTurma,
          bancada: consumoBancada,
          pratica: consumoPratica,
          observacoes: consumoObs
        });
      }

      mostrarToast(`Baixa de ${qtdNum} ${modalConsumo.unidade} registrada para ${modalConsumo.nome}!`);
      setModalConsumo(null);
    } catch {
      mostrarToast('Falha ao processar registro de baixa no estoque.');
    } finally {
      setSalvandoConsumo(false);
    }
  };

  // Produtos filtrados na busca do catálogo
  const produtosFiltrados = produtos.filter((p) => {
    const q = buscaProduto.toLowerCase().trim();
    if (!q) return true;
    return (
      p.nome.toLowerCase().includes(q) ||
      p.cas.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q) ||
      (p.formulaQuimica && p.formulaQuimica.toLowerCase().includes(q))
    );
  });

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-12 font-sans antialiased text-zinc-800">
      {/* Toast de Notificação */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-zinc-900 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 border border-zinc-700 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* CABEÇALHO PRINCIPAL LIMPO, ESPAÇADO E CENTRALIZADO */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200/90 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-2xs">
              <QrCode className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight">
              {isAluno ? 'Leitor de QR Code de Bancada' : 'Gestão de QR Code & Scanner'}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 max-w-2xl">
            {isAluno
              ? 'Aponte a câmera para o QR Code do frasco para consultar a ficha de segurança e registrar o seu consumo na aula prática.'
              : 'Utilize o scanner com câmera para identificar frascos e registrar retiradas, ou acesse as ferramentas de etiquetas.'}
          </p>
        </div>

        {/* NAVEGAÇÃO DE ABAS */}
        {!isAluno ? (
          <div className="flex items-center bg-zinc-100/90 p-1.5 rounded-xl border border-zinc-200 self-stretch sm:self-auto">
            <button
              type="button"
              onClick={() => setAbaAtiva('scanner')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                abaAtiva === 'scanner'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Camera className="w-4 h-4 text-emerald-600" />
              <span>Câmera & Scanner</span>
            </button>

            <button
              type="button"
              onClick={() => {
                pararCamera();
                setAbaAtiva('gerador');
              }}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                abaAtiva === 'gerador'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Tag className="w-4 h-4 text-blue-600" />
              <span>Gerador de Etiquetas</span>
            </button>

            <button
              type="button"
              onClick={() => {
                pararCamera();
                setAbaAtiva('lote');
              }}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                abaAtiva === 'lote'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Printer className="w-4 h-4 text-purple-600" />
              <span>Impressão em Lote</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            <Scan className="w-4 h-4 text-emerald-600" />
            <span>Leitor de Bancada Ativo</span>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* ABA 1: GERADOR DE ETIQUETAS E QR CODE (FUNCIONA COM 0 OU MAIS PRODUTOS)   */}
      {/* ========================================================================= */}
      {abaAtiva === 'gerador' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* COLUNA ESQUERDA: CONFIGURAÇÃO DO REAGENTE E CAMPOS (5 colunas) */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-white rounded-3xl p-6 border border-zinc-200/90 shadow-xs space-y-5">
              {/* Seletor de Modo: Do Catálogo ou Novo / Personalizado */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-zinc-700 block uppercase tracking-wider">
                  Origem dos Dados da Etiqueta:
                </span>
                <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-100 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setModoGerador('novo')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                      modoGerador === 'novo'
                        ? 'bg-white text-zinc-900 shadow-xs'
                        : 'text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-blue-600" />
                    <span>Novo / Personalizado</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (produtos.length === 0) {
                        mostrarToast('Nenhum reagente cadastrado ainda. Use o formulário personalizado ao lado.');
                        return;
                      }
                      setModoGerador('catalogo');
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                      modoGerador === 'catalogo'
                        ? 'bg-white text-zinc-900 shadow-xs'
                        : produtos.length === 0
                        ? 'text-zinc-400 opacity-60 cursor-not-allowed'
                        : 'text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    <FlaskConical className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Do Catálogo ({produtos.length})</span>
                  </button>
                </div>
              </div>

              {/* MODO CATÁLOGO: Seleção de Reagente Existente */}
              {modoGerador === 'catalogo' && produtos.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-zinc-100">
                  <div className="relative">
                    <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={buscaProduto}
                      onChange={(e) => setBuscaProduto(e.target.value)}
                      placeholder="Pesquisar por nome, fórmula ou CAS..."
                      className="w-full pl-10 pr-3.5 py-2 text-xs border border-zinc-200 rounded-xl bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 text-xs">
                    {produtosFiltrados.map((p) => {
                      const isSelected = produtoSelecionado?.id === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setProdutoSelecionado(p)}
                          className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition cursor-pointer ${
                            isSelected
                              ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-500/20 text-blue-950 font-medium'
                              : 'bg-white border-zinc-100 hover:border-zinc-300 hover:bg-zinc-50 text-zinc-700'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <strong className="block truncate text-xs font-bold text-zinc-900">
                              {p.nome}
                            </strong>
                            <div className="flex items-center gap-2 text-[10px] text-zinc-500 mt-0.5">
                              <span>CAS: {p.cas}</span>
                              {p.formulaQuimica && <span>• {p.formulaQuimica}</span>}
                            </div>
                          </div>
                          <span className="font-mono text-[10px] text-zinc-500 font-bold bg-white px-2 py-0.5 rounded border border-zinc-200">
                            {p.estoqueAtual} {p.unidade}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* MODO PERSONALIZADO: Formulário Dinâmico com Atualização em Tempo Real */}
              {modoGerador === 'novo' && (
                <div className="space-y-3 pt-2 border-t border-zinc-100">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                      Nome do Reagente / Solução:
                    </label>
                    <input
                      type="text"
                      value={nomeCustom}
                      onChange={(e) => setNomeCustom(e.target.value)}
                      placeholder="Ex: Ácido Clorídrico 37% P.A."
                      className="w-full px-3.5 py-2 text-xs border border-zinc-200 rounded-xl bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                        Fórmula Química:
                      </label>
                      <input
                        type="text"
                        value={formulaCustom}
                        onChange={(e) => setFormulaCustom(e.target.value)}
                        placeholder="Ex: HCl"
                        className="w-full px-3.5 py-2 text-xs border border-zinc-200 rounded-xl bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                        Número CAS:
                      </label>
                      <input
                        type="text"
                        value={casCustom}
                        onChange={(e) => setCasCustom(e.target.value)}
                        placeholder="Ex: 7647-01-0"
                        className="w-full px-3.5 py-2 text-xs border border-zinc-200 rounded-xl bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                        Lote / Frasco:
                      </label>
                      <input
                        type="text"
                        value={loteCustom}
                        onChange={(e) => setLoteCustom(e.target.value)}
                        placeholder="Ex: LT-2025-01"
                        className="w-full px-3.5 py-2 text-xs border border-zinc-200 rounded-xl bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                        Volume / Qtd:
                      </label>
                      <input
                        type="text"
                        value={volumeCustom}
                        onChange={(e) => setVolumeCustom(e.target.value)}
                        placeholder="Ex: 500 mL ou 1 L"
                        className="w-full px-3.5 py-2 text-xs border border-zinc-200 rounded-xl bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                        Localização / Armário:
                      </label>
                      <input
                        type="text"
                        value={localizacaoCustom}
                        onChange={(e) => setLocalizacaoCustom(e.target.value)}
                        placeholder="Ex: Armário Corrosivos"
                        className="w-full px-3.5 py-2 text-xs border border-zinc-200 rounded-xl bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                        Validade / Preparo:
                      </label>
                      <input
                        type="text"
                        value={validadeCustom}
                        onChange={(e) => setValidadeCustom(e.target.value)}
                        placeholder="Ex: 12/2026"
                        className="w-full px-3.5 py-2 text-xs border border-zinc-200 rounded-xl bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                        Classe de Risco GHS:
                      </label>
                      <select
                        value={classePerigoCustom}
                        onChange={(e) => setClassePerigoCustom(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-xl bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      >
                        <option value="Corrosivos">Corrosivos</option>
                        <option value="Líquidos Inflamáveis">Líquidos Inflamáveis</option>
                        <option value="Tóxicos Agudos">Tóxicos Agudos</option>
                        <option value="Oxidantes">Oxidantes</option>
                        <option value="Irritantes">Irritantes / Nocivo</option>
                        <option value="Não Perigoso">Uso Geral / Baixo Risco</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                        Cor de Destaque:
                      </label>
                      <select
                        value={corPerigoCustom}
                        onChange={(e) => setCorPerigoCustom(e.target.value as any)}
                        className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-xl bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      >
                        <option value="vermelho">Vermelho (Perigo / Inflamável)</option>
                        <option value="laranja">Laranja (Alerta / Corrosivo)</option>
                        <option value="amarelo">Amarelo (Atenção / Reativo)</option>
                        <option value="verde">Verde (Seguro / Uso Geral)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Opções de Impressão */}
              <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-xs">
                <span className="font-bold text-zinc-700">Tamanho da Etiqueta:</span>
                <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl text-[11px]">
                  {(['pequena', 'media', 'grande'] as const).map((tam) => (
                    <button
                      key={tam}
                      type="button"
                      onClick={() => setTamanhoEtiqueta(tam)}
                      className={`px-2.5 py-1 rounded-lg capitalize font-semibold transition cursor-pointer ${
                        tamanhoEtiqueta === tam
                          ? 'bg-white text-zinc-900 shadow-xs'
                          : 'text-zinc-500 hover:text-zinc-800'
                      }`}
                    >
                      {tam}
                    </button>
                  ))}
                </div>
              </div>

              {/* Botão para Salvar Reagente no Catálogo/Estoque */}
              {modoGerador === 'novo' && !isAluno && (
                <button
                  type="button"
                  onClick={handleSalvarNoCatalogo}
                  disabled={salvandoNoCatalogo}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition shadow-md active:scale-98 cursor-pointer disabled:opacity-50"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>{salvandoNoCatalogo ? 'Salvando...' : 'Salvar este Reagente no Catálogo & Estoque'}</span>
                </button>
              )}
            </div>
          </div>

          {/* COLUNA DIREITA: PRÉ-VISUALIZAÇÃO DA ETIQUETA E AÇÕES DE EXPORTAÇÃO (7 colunas) */}
          <div className="lg:col-span-7 space-y-5">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200/90 shadow-xs space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-zinc-900">
                    Pré-visualização da Etiqueta Laboratorial (GHS)
                  </h3>
                </div>
                <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  Pronto para Impressão
                </span>
              </div>

              {/* ETIQUETA FÍSICA ESTILIZADA (Com regras de impressão @media print) */}
              <div
                id="etiqueta-para-impressao"
                className={`mx-auto bg-white border-2 border-zinc-900 rounded-2xl p-5 shadow-md flex flex-col justify-between transition-all ${
                  tamanhoEtiqueta === 'pequena'
                    ? 'max-w-[340px] text-[10px]'
                    : tamanhoEtiqueta === 'grande'
                    ? 'max-w-[520px] text-xs'
                    : 'max-w-[440px] text-[11px]'
                }`}
              >
                {/* Faixa Superior de Perigo */}
                <div
                  className={`w-full py-1 px-3 rounded-lg text-white font-black uppercase tracking-wider flex items-center justify-between mb-3 ${
                    dadosAtivos.cor === 'vermelho'
                      ? 'bg-rose-600'
                      : dadosAtivos.cor === 'laranja'
                      ? 'bg-orange-600'
                      : dadosAtivos.cor === 'amarelo'
                      ? 'bg-amber-600'
                      : 'bg-emerald-600'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5" />
                    <span>{dadosAtivos.classe}</span>
                  </div>
                  <span className="text-[9px] tracking-normal font-mono opacity-90">
                    SISTEMA MATÉRIA REATIVA
                  </span>
                </div>

                {/* Corpo Principal da Etiqueta: Informações + QR Code */}
                <div className="flex items-center justify-between gap-4">
                  {/* Dados Químicos */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <h2 className="text-base sm:text-lg font-black text-zinc-950 leading-tight truncate">
                      {dadosAtivos.nome}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2 text-zinc-700 font-mono font-bold">
                      <span className="bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                        {dadosAtivos.formula}
                      </span>
                      <span>CAS: {dadosAtivos.cas}</span>
                    </div>

                    <div className="pt-1 space-y-0.5 text-zinc-600 font-medium">
                      <div>
                        <strong>Pureza:</strong> {dadosAtivos.pureza}
                      </div>
                      <div>
                        <strong>Lote / Frasco:</strong> {dadosAtivos.lote} • {dadosAtivos.volume}
                      </div>
                      <div>
                        <strong>Local:</strong> {dadosAtivos.localizacao}
                      </div>
                      <div>
                        <strong>Validade:</strong> {dadosAtivos.validade}
                      </div>
                    </div>
                  </div>

                  {/* Imagem do QR Code em Alta Resolução */}
                  <div className="flex-shrink-0 flex flex-col items-center">
                    <div className="w-28 h-28 sm:w-32 sm:h-32 bg-white p-1 rounded-xl border border-zinc-300 shadow-2xs flex items-center justify-center">
                      {qrCodeDataUrl ? (
                        <img
                          src={qrCodeDataUrl}
                          alt={`QR Code para ${dadosAtivos.nome}`}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="animate-pulse text-zinc-300">Carregando QR...</div>
                      )}
                    </div>
                    <span className="text-[9px] font-mono text-zinc-500 font-bold mt-1">
                      {dadosAtivos.id}
                    </span>
                  </div>
                </div>

                {/* Rodapé de Segurança e EPIs Obrigatórios */}
                {incluirAvisoEpi && (
                  <div className="mt-3 pt-2.5 border-t border-zinc-200 flex items-center justify-between text-[9px] text-zinc-600">
                    <div className="flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                      <span>Uso obrigatório de EPIs: Luvas de nitrila, óculos e capela de exaustão.</span>
                    </div>
                    <span className="font-bold text-zinc-800">FISPQ</span>
                  </div>
                )}
              </div>

              {/* BOTÕES DE AÇÃO: BAIXAR, COPIAR, IMPRIMIR */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleBaixarQrCode}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-zinc-900 hover:bg-black text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-98"
                >
                  <Download className="w-4 h-4 text-blue-400" />
                  <span>Baixar QR Code (PNG)</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopiarDados}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold transition border border-zinc-200 cursor-pointer active:scale-98"
                >
                  {copiado ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-zinc-600" />}
                  <span>{copiado ? 'Copiado!' : 'Copiar Dados'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleImprimirEtiqueta}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-98"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir Etiqueta</span>
                </button>
              </div>

              {/* Informações Auxiliares */}
              <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 text-xs text-zinc-500 flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>Compatibilidade Universal:</strong> O QR Code gerado segue o padrão UTF-8 e pode ser lido por qualquer smartphone, pistola leitora de código de barras 2D ou pelo leitor integrado na aba <em>"Leitor & Scanner"</em>.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: LEITOR & SCANNER (CÂMERA WEB + FOTO + MANUAL)                       */}
      {/* ========================================================================= */}
      {abaAtiva === 'scanner' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LADO ESQUERDO: CÂMERA E CONTROLES (7 colunas) */}
          <div className="lg:col-span-7 space-y-5">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200/90 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                <div className="flex items-center gap-2">
                  <Scan className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-bold text-zinc-900">Leitor Ótico com Câmera</h3>
                </div>
                {cameraAtiva && (
                  <span className="flex items-center gap-1.5 text-xs text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    Câmera Escaneando
                  </span>
                )}
              </div>

              {/* VISUALIZADOR DE VÍDEO / SCANNER */}
              <div className="relative w-full aspect-video sm:h-80 bg-zinc-950 rounded-3xl overflow-hidden flex items-center justify-center border-2 border-zinc-800">
                <video
                  ref={videoRef}
                  className={`w-full h-full object-cover ${cameraAtiva ? 'block' : 'hidden'}`}
                  playsInline
                  muted
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Retículo do Scanner */}
                {cameraAtiva && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-48 h-48 border-2 border-emerald-400/80 rounded-2xl relative animate-pulse">
                      <div className="absolute top-0 left-0 w-5 h-5 border-t-4 border-l-4 border-emerald-400 -mt-1 -ml-1 rounded-tl" />
                      <div className="absolute top-0 right-0 w-5 h-5 border-t-4 border-r-4 border-emerald-400 -mt-1 -mr-1 rounded-tr" />
                      <div className="absolute bottom-0 left-0 w-5 h-5 border-b-4 border-l-4 border-emerald-400 -mb-1 -ml-1 rounded-bl" />
                      <div className="absolute bottom-0 right-0 w-5 h-5 border-b-4 border-r-4 border-emerald-400 -mb-1 -mr-1 rounded-br" />
                    </div>
                  </div>
                )}

                {/* Estado Desligado */}
                {!cameraAtiva && (
                  <div className="text-center p-6 space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-700 text-zinc-400 flex items-center justify-center mx-auto">
                      <Camera className="w-7 h-7" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Câmera em Espera</p>
                      <p className="text-xs text-zinc-400 mt-1 max-w-sm">
                        Clique em <strong>"Ativar Câmera"</strong> para ler etiquetas de reagentes ou selecione uma foto salva no seu computador.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Mensagem de Erro da Câmera (se houver) */}
              {cameraErro && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <span>{cameraErro}</span>
                </div>
              )}

              {/* Botões de Controle da Câmera com toque espaçoso e tecnológico */}
              <div className="flex flex-wrap items-center justify-between gap-3.5 pt-2">
                <div className="flex items-center gap-2.5">
                  {!cameraAtiva ? (
                    <button
                      type="button"
                      onClick={() => iniciarCamera()}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs sm:text-sm font-bold transition shadow-xs cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Ativar Câmera</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={pararCamera}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-98 text-white text-xs sm:text-sm font-bold transition shadow-xs cursor-pointer"
                    >
                      <CameraOff className="w-4 h-4" />
                      <span>Desativar Câmera</span>
                    </button>
                  )}

                  {cameraAtiva && (
                    <button
                      type="button"
                      onClick={alternarCamera}
                      className="p-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition cursor-pointer"
                      title="Alternar entre câmera frontal e traseira"
                    >
                      <SwitchCamera className="w-4.5 h-4.5" />
                    </button>
                  )}
                </div>

                {/* Upload de Foto de QR Code */}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 active:scale-98 text-zinc-800 text-xs sm:text-sm font-bold transition border border-zinc-200 cursor-pointer"
                  >
                    <Upload className="w-4 h-4 text-blue-600" />
                    <span>Carregar Foto do QR</span>
                  </button>
                </div>
              </div>

              {/* Opção Alternativa: Digitação Manual de Código / CAS */}
              <div className="pt-4 border-t border-zinc-100 space-y-2">
                <label className="block text-xs font-bold text-zinc-700">
                  Ou digite o Código, CAS ou Nome do Reagente:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={codigoManual}
                    onChange={(e) => setCodigoManual(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && codigoManual.trim()) {
                        processarCodigoLido(codigoManual.trim());
                        setCodigoManual('');
                      }
                    }}
                    placeholder="Ex: 7647-01-0 ou PRD-001..."
                    className="flex-1 px-3.5 py-2 text-xs border border-zinc-200 rounded-xl bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (codigoManual.trim()) {
                        processarCodigoLido(codigoManual.trim());
                        setCodigoManual('');
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition cursor-pointer"
                  >
                    Buscar
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* LADO DIREITO: RESULTADO DA LEITURA & AÇÕES DE CONSUMO (5 colunas) */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200/90 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                <h3 className="text-sm font-bold text-zinc-900">Resultado do Escaneamento</h3>
                {resultadoLeitura && (
                  <span className="text-[11px] font-mono text-zinc-400">
                    Lido às {resultadoLeitura.timestamp}
                  </span>
                )}
              </div>

              {resultadoLeitura ? (
                <div className="space-y-4">
                  {resultadoLeitura.produtoEncontrado ? (
                    /* REAGENTE LOCALIZADO NO INVENTÁRIO */
                    <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                            Reagente Identificado
                          </span>
                          <h4 className="text-base font-black text-emerald-950 mt-1">
                            {resultadoLeitura.produtoEncontrado.nome}
                          </h4>
                          <span className="text-xs text-emerald-700 font-mono">
                            CAS: {resultadoLeitura.produtoEncontrado.cas}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-emerald-600 block">Estoque Atual:</span>
                          <span className="text-sm font-black font-mono text-emerald-900">
                            {resultadoLeitura.produtoEncontrado.estoqueAtual}{' '}
                            {resultadoLeitura.produtoEncontrado.unidade}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-700 pt-2 border-t border-emerald-200/60">
                        <div>
                          <strong>Local:</strong> {resultadoLeitura.produtoEncontrado.localizacao || 'Laboratório'}
                        </div>
                        <div>
                          <strong>Validade:</strong> {resultadoLeitura.produtoEncontrado.validade}
                        </div>
                        <div>
                          <strong>Classe:</strong> {resultadoLeitura.produtoEncontrado.classePerigo}
                        </div>
                        <div>
                          <strong>Situação:</strong> {resultadoLeitura.produtoEncontrado.situacao}
                        </div>
                      </div>

                      {/* Botões de Ação para o Reagente Lido */}
                      <div className="pt-2 flex flex-col gap-2.5">
                        <button
                          type="button"
                          onClick={() => setModalConsumo(resultadoLeitura.produtoEncontrado)}
                          className="w-full flex items-center justify-center gap-2 py-3 px-5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-xs sm:text-sm font-bold transition shadow-xs cursor-pointer"
                        >
                          <MinusCircle className="w-4 h-4" />
                          <span>Dar Baixa / Registrar Consumo</span>
                        </button>

                        {!isAluno && (
                          <button
                            type="button"
                            onClick={() => {
                              setProdutoSelecionado(resultadoLeitura.produtoEncontrado);
                              setModoGerador('catalogo');
                              setAbaAtiva('gerador');
                            }}
                            className="w-full flex items-center justify-center gap-2 py-2.5 px-5 bg-white hover:bg-zinc-50 active:scale-98 text-zinc-700 rounded-xl text-xs sm:text-sm font-semibold border border-zinc-200 transition cursor-pointer"
                          >
                            <Printer className="w-4 h-4 text-blue-600" />
                            <span>Gerar Nova Etiqueta deste Reagente</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* CÓDIGO EXTERNO OU NÃO CADASTRADO */
                    <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-3">
                      <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span>Código Lido (Não cadastrado no inventário local)</span>
                      </div>
                      <div className="p-3 bg-white rounded-xl border border-amber-200 font-mono text-xs text-zinc-800 break-all">
                        {resultadoLeitura.textoBruto}
                      </div>
                      {!isAluno && (
                        <button
                          type="button"
                          onClick={() => {
                            setNomeCustom(resultadoLeitura.textoBruto);
                            setModoGerador('novo');
                            setAbaAtiva('gerador');
                          }}
                          className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>Cadastrar Reagente com estes Dados</span>
                        </button>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setResultadoLeitura(null)}
                    className="w-full py-2 text-xs font-semibold text-zinc-500 hover:text-zinc-800 text-center cursor-pointer"
                  >
                    Limpar Leitura
                  </button>
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-zinc-400 space-y-2">
                  <Scan className="w-8 h-8 text-zinc-300 mx-auto" />
                  <p className="font-semibold text-zinc-600">Aguardando leitura de QR Code</p>
                  <p className="text-[11px] text-zinc-400 max-w-xs mx-auto">
                    Aponte a câmera para um frasco rotulado ou envie uma imagem para ver os detalhes químicos em tempo real.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 3: IMPRESSÃO EM LOTE (A4 PARA FRASCOS)                                */}
      {/* ========================================================================= */}
      {abaAtiva === 'lote' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200/90 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-zinc-100 gap-3">
            <div>
              <h3 className="text-base font-bold text-zinc-900">
                Impressão de Etiquetas em Folha A4
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Selecione os reagentes que deseja imprimir na folha de adesivos.
              </p>
            </div>

            {produtos.length > 0 && (
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-98 self-start sm:self-auto"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Folha A4 ({produtosLoteSelecionados.length} etiquetas)</span>
              </button>
            )}
          </div>

          {produtos.length === 0 ? (
            <div className="py-16 text-center space-y-3 bg-zinc-50/50 rounded-2xl border border-dashed border-zinc-200 p-6">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto border border-purple-100">
                <Tag className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-zinc-800">
                Nenhum reagente cadastrado no catálogo ainda
              </p>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                Para imprimir em lote, crie seus reagentes pelo Gerador de Etiquetas ou cadastre novos itens no inventário.
              </p>
              <button
                type="button"
                onClick={() => setAbaAtiva('gerador')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Ir para o Gerador de Etiquetas</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {produtos.map((p) => {
                const isSelected = produtosLoteSelecionados.includes(p.id);
                const qrUrl = qrCodesLote[p.id];
                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      if (isSelected) {
                        setProdutosLoteSelecionados((prev) => prev.filter((id) => id !== p.id));
                      } else {
                        setProdutosLoteSelecionados((prev) => [...prev, p.id]);
                      }
                    }}
                    className={`p-4 rounded-2xl border-2 transition cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-purple-50/40 border-purple-400 ring-2 ring-purple-500/10'
                        : 'bg-white border-zinc-200 hover:border-zinc-300 opacity-60'
                    }`}
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="rounded border-zinc-300 text-purple-600"
                        />
                        <strong className="text-xs font-bold text-zinc-900 truncate block">
                          {p.nome}
                        </strong>
                      </div>
                      <p className="text-[10px] text-zinc-500 font-mono">
                        CAS: {p.cas} • {p.estoqueAtual} {p.unidade}
                      </p>
                    </div>

                    <div className="w-16 h-16 bg-white p-1 rounded-lg border border-zinc-200 flex-shrink-0 flex items-center justify-center">
                      {qrUrl ? (
                        <img src={qrUrl} alt={p.nome} className="w-full h-full object-contain" />
                      ) : (
                        <QrCode className="w-8 h-8 text-zinc-300" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE BAIXA / REGISTRO DE CONSUMO RÁPIDO                               */}
      {/* ========================================================================= */}
      {modalConsumo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 bg-zinc-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-emerald-400 font-bold">
                  {modalConsumo.id}
                </span>
                <h3 className="text-sm font-bold">Registrar Baixa de Reagente</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalConsumo(null)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmarConsumo} className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-1">
                <span className="text-[10px] uppercase font-bold text-zinc-400">Reagente Selecionado:</span>
                <strong className="text-zinc-900 block text-sm">{modalConsumo.nome}</strong>
                <span className="text-zinc-500 text-[11px]">
                  Estoque Atual: <strong>{modalConsumo.estoqueAtual} {modalConsumo.unidade}</strong>
                </span>
              </div>

              <div>
                <label className="block text-zinc-700 font-bold mb-1">
                  Quantidade Utilizada ({modalConsumo.unidade}):
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={consumoQtd}
                  onChange={(e) => setConsumoQtd(e.target.value)}
                  className="w-full px-3.5 py-2 border border-zinc-300 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-700 font-bold mb-1">Turma / Aula:</label>
                  <input
                    type="text"
                    value={consumoTurma}
                    onChange={(e) => setConsumoTurma(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-700 font-bold mb-1">Bancada:</label>
                  <input
                    type="text"
                    value={consumoBancada}
                    onChange={(e) => setConsumoBancada(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-700 font-bold mb-1">Título da Prática:</label>
                <input
                  type="text"
                  value={consumoPratica}
                  onChange={(e) => setConsumoPratica(e.target.value)}
                  className="w-full px-3.5 py-2 border border-zinc-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalConsumo(null)}
                  className="px-4 py-2 text-zinc-600 hover:bg-zinc-100 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoConsumo}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {salvandoConsumo ? 'Processando...' : 'Confirmar Baixa no Estoque'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
