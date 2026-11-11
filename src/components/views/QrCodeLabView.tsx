import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import {
  QrCode,
  ScanLine,
  Camera,
  CameraOff,
  Upload,
  Printer,
  Download,
  Search,
  CheckCircle2,
  AlertTriangle,
  FlaskConical,
  Package,
  Layers,
  Sparkles,
  ExternalLink,
  RefreshCw,
  X,
  ShieldAlert,
  ArrowRight,
  Eye,
  FileText
} from 'lucide-react';
import { ProdutoQuimico } from '../../types';

interface QrCodeLabViewProps {
  produtos: ProdutoQuimico[];
  onIrParaProduto: (produtoId: string) => void;
  onIrParaEstoque?: (produtoNome: string) => void;
}

export const QrCodeLabView: React.FC<QrCodeLabViewProps> = ({
  produtos,
  onIrParaProduto,
  onIrParaEstoque
}) => {
  const [abaAtiva, setAbaAtiva] = useState<'scanner' | 'gerador' | 'lote'>('scanner');
  const [toast, setToast] = useState<string | null>(null);

  // Estados do Scanner
  const [cameraAtiva, setCameraAtiva] = useState(false);
  const [erroCamera, setErroCamera] = useState<string | null>(null);
  const [produtoEncontrado, setProdutoEncontrado] = useState<ProdutoQuimico | null>(null);
  const [codigoLidoRaw, setCodigoLidoRaw] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Estados do Gerador
  const [produtoSelecionadoId, setProdutoSelecionadoId] = useState<string>(produtos[0]?.id || '');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [buscaGerador, setBuscaGerador] = useState('');
  const [tamanhoEtiqueta, setTamanhoEtiqueta] = useState<'padrao' | 'pequeno' | 'grande'>('padrao');

  // Estados do Lote
  const [todosQrCodes, setTodosQrCodes] = useState<Record<string, string>>({});
  const [gerandoLote, setGerandoLote] = useState(false);

  const produtoSelecionado = produtos.find((p) => p.id === produtoSelecionadoId) || produtos[0];

  const mostrarToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Gerar QR Code do produto selecionado
  useEffect(() => {
    if (produtoSelecionado) {
      const payload = JSON.stringify({
        app: 'MATERIA_REATIVA',
        id: produtoSelecionado.id,
        nome: produtoSelecionado.nome,
        cas: produtoSelecionado.cas
      });

      QRCode.toDataURL(payload, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'H'
      })
        .then((url) => setQrCodeDataUrl(url))
        .catch((err) => console.error('Erro gerando QR Code:', err));
    }
  }, [produtoSelecionado]);

  // Gerar QR Codes para lote
  const gerarLoteCompleto = async () => {
    setGerandoLote(true);
    const mapa: Record<string, string> = {};
    for (const prod of produtos) {
      try {
        const payload = JSON.stringify({
          app: 'MATERIA_REATIVA',
          id: prod.id,
          nome: prod.nome,
          cas: prod.cas
        });
        const url = await QRCode.toDataURL(payload, {
          width: 200,
          margin: 1,
          color: { dark: '#000000', light: '#ffffff' }
        });
        mapa[prod.id] = url;
      } catch (err) {
        console.error(err);
      }
    }
    setTodosQrCodes(mapa);
    setGerandoLote(false);
    mostrarToast('Etiquetas de todos os reagentes geradas com sucesso!');
  };

  // Processar texto do QR Code lido e localizar produto
  const processarCodigoLido = (rawText: string) => {
    setCodigoLidoRaw(rawText);

    let idEncontrado = '';
    let casEncontrado = '';
    let nomeEncontrado = '';

    try {
      const parsed = JSON.parse(rawText);
      idEncontrado = parsed.id || '';
      casEncontrado = parsed.cas || '';
      nomeEncontrado = parsed.nome || '';
    } catch {
      // Texto simples como PRD-01 ou MATERIA_REATIVA:PRD-01
      if (rawText.includes('PRD-') || rawText.includes('EST-')) {
        const match = rawText.match(/(PRD-\d+|EST-\d+)/i);
        if (match) idEncontrado = match[0].toUpperCase();
      } else {
        nomeEncontrado = rawText;
      }
    }

    // Buscar na lista de produtos
    const prod = produtos.find(
      (p) =>
        (idEncontrado && p.id.toLowerCase() === idEncontrado.toLowerCase()) ||
        (casEncontrado && p.cas === casEncontrado) ||
        (nomeEncontrado && p.nome.toLowerCase().includes(nomeEncontrado.toLowerCase()))
    );

    if (prod) {
      setProdutoEncontrado(prod);
      mostrarToast(`✅ Reagente detectado: ${prod.nome}!`);
      // Parar câmera temporariamente para visualizar o resultado
      pararCamera();
    } else {
      mostrarToast(`⚠️ Código lido: "${rawText}", mas não consta no inventário atual.`);
    }
  };

  // Scanner por Câmera em Tempo Real
  const iniciarCamera = async () => {
    setErroCamera(null);
    setProdutoEncontrado(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.play();
        setCameraAtiva(true);
        requestAnimationFrame(tickScan);
      }
    } catch (err: any) {
      console.error('Erro acessando câmera:', err);
      setErroCamera(
        'Não foi possível acessar a câmera do dispositivo. Verifique as permissões do navegador ou utilize o leitor de imagem/simulador de teste abaixo.'
      );
      setCameraAtiva(false);
    }
  };

  const pararCamera = () => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
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

  const tickScan = () => {
    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert'
          });

          if (code && code.data) {
            processarCodigoLido(code.data);
            return;
          }
        }
      }
    }
    animationFrameId.current = requestAnimationFrame(tickScan);
  };

  useEffect(() => {
    return () => {
      pararCamera();
    };
  }, []);

  // Leitura via Upload de Imagem
  const handleUploadImagem = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data) {
            processarCodigoLido(code.data);
          } else {
            mostrarToast('Nenhum código QR legível foi encontrado nesta imagem.');
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Simulação rápida para testes
  const simularLeitura = (prod: ProdutoQuimico) => {
    const payload = JSON.stringify({
      app: 'MATERIA_REATIVA',
      id: prod.id,
      nome: prod.nome,
      cas: prod.cas
    });
    processarCodigoLido(payload);
  };

  const baixarQrCodePng = () => {
    if (!qrCodeDataUrl) return;
    const a = document.createElement('a');
    a.href = qrCodeDataUrl;
    a.download = `QR_${produtoSelecionado.nome.replace(/\s+/g, '_')}_${produtoSelecionado.cas}.png`;
    a.click();
    mostrarToast('Download do QR Code iniciado!');
  };

  const imprimirEtiqueta = () => {
    if (!produtoSelecionado) return;
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
          <title>Etiqueta Reagente - ${produtoSelecionado.nome}</title>
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
            <div class="reagent-name">${produtoSelecionado.nome}</div>
            <div class="reagent-meta">CAS: ${produtoSelecionado.cas} ${produtoSelecionado.formulaQuimica ? `• ${produtoSelecionado.formulaQuimica}` : ''}</div>
            <div class="qr-wrap">
              ${qrCodeDataUrl ? `<img src="${qrCodeDataUrl}" alt="QR Code" />` : ''}
            </div>
            <div class="info-grid">
              <div class="info-item"><span>Estoque Atual</span><strong>${produtoSelecionado.estoqueAtual} ${produtoSelecionado.unidade}</strong></div>
              <div class="info-item"><span>Estoque Mínimo</span><strong>${produtoSelecionado.estoqueMinimo} ${produtoSelecionado.unidade}</strong></div>
              <div class="info-item"><span>Classificação</span><strong>${produtoSelecionado.classificacao}</strong></div>
              <div class="info-item"><span>Localização</span><strong>${produtoSelecionado.localizacao || 'Armário Principal'}</strong></div>
            </div>
            <div class="footer-tag">HOMOLOGADO NO BANCO DE DADOS • GESTÃO ESCOLAR</div>
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

  const produtosFiltradosGerador = produtos.filter(
    (p) =>
      p.nome.toLowerCase().includes(buscaGerador.toLowerCase()) ||
      p.cas.toLowerCase().includes(buscaGerador.toLowerCase()) ||
      (p.formulaQuimica && p.formulaQuimica.toLowerCase().includes(buscaGerador.toLowerCase()))
  );

  return (
    <div className="space-y-5 relative">
      {/* Toast Feedback */}
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
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
              <QrCode className="w-3.5 h-3.5" />
              Exclusivo Docente / Coordenação
            </span>
            <span className="text-xs text-zinc-400">•</span>
            <span className="text-xs text-zinc-500 font-medium">
              Rastreamento & Identificação de Reagentes de Laboratório
            </span>
          </div>
          <h2 className="text-lg font-bold text-zinc-900 mt-1">
            Central de QR Codes de Frascos & Leitor de Bancada
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Gere etiquetas padronizadas ABNT/GHS com QR Code e escaneie frascos com a câmera ou leitor para ir direto ao produto.
          </p>
        </div>

        {/* Abas */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-100 rounded-xl border border-zinc-200 self-start md:self-auto">
          <button
            type="button"
            onClick={() => {
              setAbaAtiva('scanner');
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
              abaAtiva === 'scanner'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60'
            }`}
          >
            <ScanLine className="w-3.5 h-3.5 text-blue-500" />
            <span>Escanear Frasco</span>
          </button>

          <button
            type="button"
            onClick={() => {
              pararCamera();
              setAbaAtiva('gerador');
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
              abaAtiva === 'gerador'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60'
            }`}
          >
            <QrCode className="w-3.5 h-3.5 text-indigo-500" />
            <span>Gerar Etiqueta</span>
          </button>

          <button
            type="button"
            onClick={() => {
              pararCamera();
              setAbaAtiva('lote');
              if (Object.keys(todosQrCodes).length === 0) {
                gerarLoteCompleto();
              }
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
              abaAtiva === 'lote'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60'
            }`}
          >
            <Printer className="w-3.5 h-3.5 text-zinc-500" />
            <span>Impressão em Lote</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ABA 1: SCANNER / LEITOR DE QR CODE                                        */}
      {/* ========================================================================= */}
      {abaAtiva === 'scanner' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Lado Esquerdo: Janela da Câmera / Visor de Leitura */}
          <div className="lg:col-span-7 bg-white rounded-xl p-5 shadow-xs border border-zinc-200/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                    <ScanLine className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900">Leitor Óptico de Reagente</h3>
                    <p className="text-[11px] text-zinc-500">Aponte a câmera para o QR Code do frasco</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {cameraAtiva ? (
                    <button
                      type="button"
                      onClick={pararCamera}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold border border-rose-200 transition cursor-pointer"
                    >
                      <CameraOff className="w-3.5 h-3.5" />
                      <span>Desligar Câmera</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={iniciarCamera}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#2F80ED] hover:bg-blue-600 text-white text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Ligar Câmera</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Área do Visor da Câmera com Mira */}
              <div className="relative w-full aspect-video sm:aspect-4/3 max-h-[380px] bg-zinc-950 rounded-xl overflow-hidden flex items-center justify-center border border-zinc-800 shadow-inner">
                {/* Elemento de Vídeo */}
                <video
                  ref={videoRef}
                  className={`w-full h-full object-cover ${cameraAtiva ? 'block' : 'hidden'}`}
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Overlay de Mira quando a câmera está ativa */}
                {cameraAtiva && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                    <div className="relative w-48 h-48 sm:w-56 sm:h-56 border-2 border-blue-400/80 rounded-2xl shadow-2xl flex items-center justify-center">
                      <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl-lg" />
                      <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr-lg" />
                      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl-lg" />
                      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br-lg" />

                      {/* Linha laser de escaneamento animada */}
                      <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent shadow-[0_0_12px_rgba(59,130,246,0.9)] animate-pulse" />
                    </div>
                    <span className="text-[11px] font-medium text-white/90 bg-black/60 px-3 py-1 rounded-full mt-3 backdrop-blur-xs">
                      Alinhe o QR Code do frasco dentro da mira
                    </span>
                  </div>
                )}

                {/* Mensagem quando câmera está desligada */}
                {!cameraAtiva && (
                  <div className="text-center p-6 space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-500 flex items-center justify-center mx-auto shadow-md">
                      <QrCode className="w-7 h-7" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-zinc-200">Câmera de Leitura em Espera</h4>
                      <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1">
                        Clique em <strong>"Ligar Câmera"</strong> para escanear etiquetas de frascos ao vivo, ou faça upload de uma foto da etiqueta.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={iniciarCamera}
                        className="px-4 py-2 rounded-lg bg-[#2F80ED] hover:bg-blue-600 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                      >
                        Ligar Câmera Agora
                      </button>

                      <label className="px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition cursor-pointer border border-zinc-700 flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Carregar Foto da Etiqueta</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleUploadImagem}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Erro de Câmera */}
              {erroCamera && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p>{erroCamera}</p>
                </div>
              )}
            </div>

            {/* Simulação Rápida para Testar em Qualquer Dispositivo */}
            <div className="mt-4 pt-3 border-t border-zinc-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-2">
                Simulação Rápida de Bancada (Clique para testar o scanner sem câmera):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {produtos.slice(0, 5).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => simularLeitura(p)}
                    className="px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-blue-50 hover:text-blue-700 text-zinc-700 text-[11px] font-medium border border-zinc-200 transition cursor-pointer"
                  >
                    🏷️ {p.nome}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Lado Direito: Resultado da Leitura e Ação Direta */}
          <div className="lg:col-span-5 space-y-4">
            {produtoEncontrado ? (
              <div className="bg-white rounded-xl p-5 shadow-xs border-2 border-emerald-500 space-y-4 animate-in fade-in zoom-in-95">
                {/* Header de Sucesso */}
                <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                        Reagente Identificado
                      </span>
                      <h4 className="text-sm font-bold text-zinc-900 leading-tight">
                        {produtoEncontrado.nome}
                      </h4>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded border border-blue-100">
                    {produtoEncontrado.id}
                  </span>
                </div>

                {/* Detalhes Químicos e de Estoque */}
                <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-2 text-xs">
                  {produtoEncontrado.formulaQuimica && (
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Fórmula Molecular:</span>
                      <span className="font-mono font-bold text-blue-700 text-sm">
                        {produtoEncontrado.formulaQuimica}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Número CAS:</span>
                    <span className="font-mono text-zinc-800 font-semibold">{produtoEncontrado.cas}</span>
                  </div>

                  {produtoEncontrado.massaMolar && (
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Massa Molar:</span>
                      <span className="text-zinc-800">{produtoEncontrado.massaMolar}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Classificação GHS:</span>
                    <span className="font-bold text-zinc-900 bg-amber-100 text-amber-900 px-2 py-0.5 rounded text-[10px]">
                      {produtoEncontrado.classePerigo}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Saldo Atual no Estoque:</span>
                    <strong className="text-zinc-900 text-sm">
                      {produtoEncontrado.estoqueAtual} {produtoEncontrado.unidade}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Local de Armazenamento:</span>
                    <span className="text-zinc-700 font-medium">
                      {produtoEncontrado.localizacao || 'Armário Geral'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Validade do Lote:</span>
                    <span className="text-zinc-700 font-mono">{produtoEncontrado.validade}</span>
                  </div>
                </div>

                {/* Ações Diretas Obrigatórias */}
                <div className="space-y-2 pt-1">
                  {/* BOTÃO PRINCIPAL: IR PARA O RESPECTIVO PRODUTO */}
                  <button
                    type="button"
                    onClick={() => onIrParaProduto(produtoEncontrado.id)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#2F80ED] hover:bg-blue-600 active:scale-[0.99] text-white text-xs font-bold shadow-md shadow-blue-500/20 transition cursor-pointer"
                  >
                    <span>Ir para este Produto no Catálogo</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  {onIrParaEstoque && (
                    <button
                      type="button"
                      onClick={() => onIrParaEstoque(produtoEncontrado.nome)}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-semibold transition cursor-pointer"
                    >
                      <Package className="w-3.5 h-3.5 text-zinc-600" />
                      <span>Ver Saldo e Lotes no Estoque</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setProdutoSelecionadoId(produtoEncontrado.id);
                      setAbaAtiva('gerador');
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition cursor-pointer border border-indigo-200"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Ver / Imprimir Etiqueta deste Frasco</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setProdutoEncontrado(null);
                      setCodigoLidoRaw(null);
                      iniciarCamera();
                    }}
                    className="w-full py-1.5 text-center text-xs text-zinc-500 hover:text-zinc-800 transition cursor-pointer"
                  >
                    Escanear Outro Frasco
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl p-5 shadow-xs border border-zinc-200/80 space-y-4">
                <div className="flex items-center gap-2 text-zinc-900 font-bold text-xs pb-2 border-b border-zinc-100">
                  <ShieldAlert className="w-4 h-4 text-blue-600" />
                  <span>Como Funciona o Rastreamento por QR Code</span>
                </div>
                <div className="space-y-3 text-xs text-zinc-600 leading-relaxed">
                  <div className="p-3 rounded-lg bg-blue-50/60 border border-blue-100">
                    <strong className="text-blue-950 block mb-0.5">1. Leitura Instantânea de Bancada:</strong>
                    Ao apontar a câmera ou carregar a imagem do QR Code de qualquer frasco, o sistema decodifica o código unívoco do produto.
                  </div>

                  <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-100">
                    <strong className="text-zinc-900 block mb-0.5">2. Navegação Automática:</strong>
                    Você pode clicar em <strong>"Ir para este Produto no Catálogo"</strong> para abrir a ficha completa, visualizar a FISPQ, verificar notas fiscais ou editar o cadastro.
                  </div>

                  <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-100">
                    <strong className="text-zinc-900 block mb-0.5">3. Segurança Química ABNT:</strong>
                    As etiquetas geradas no sistema contêm pictograma de perigo GHS, fórmula química, validade e CAS para conformidade com a Polícia Federal e Exército.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: GERADOR DE ETIQUETAS INDIVIDUAIS COM QR CODE                       */}
      {/* ========================================================================= */}
      {abaAtiva === 'gerador' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Seletor de Reagente */}
          <div className="lg:col-span-5 bg-white rounded-xl p-5 shadow-xs border border-zinc-200/80 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider text-zinc-500">
                  Selecione o Reagente
                </h3>
                <span className="text-[11px] text-zinc-400">{produtos.length} cadastrados</span>
              </div>

              {/* Busca */}
              <div className="relative">
                <input
                  type="text"
                  value={buscaGerador}
                  onChange={(e) => setBuscaGerador(e.target.value)}
                  placeholder="Pesquisar por nome, fórmula ou CAS..."
                  className="w-full h-9 pl-9 pr-3 text-xs bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:border-blue-500"
                />
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>

              {/* Lista Selecionável */}
              <div className="space-y-1.5 overflow-y-auto max-h-[360px] pr-1">
                {produtosFiltradosGerador.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setProdutoSelecionadoId(p.id)}
                    className={`w-full p-2.5 rounded-lg text-left transition flex items-center justify-between cursor-pointer ${
                      produtoSelecionado.id === p.id
                        ? 'bg-blue-50 border-2 border-blue-500 text-blue-950 font-bold shadow-xs'
                        : 'bg-zinc-50/70 border border-zinc-100 hover:bg-zinc-100 text-zinc-700'
                    }`}
                  >
                    <div>
                      <strong className="block text-xs leading-tight">{p.nome}</strong>
                      <span className="text-[10px] font-mono text-zinc-500">
                        {p.formulaQuimica && `${p.formulaQuimica} · `}CAS: {p.cas}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-blue-600 bg-white px-2 py-0.5 rounded border border-zinc-200">
                      {p.id}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Opções de Impressão */}
            <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-xs">
              <span className="text-zinc-500 text-[11px]">Tamanho da Etiqueta:</span>
              <div className="flex gap-1">
                {(['pequeno', 'padrao', 'grande'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTamanhoEtiqueta(t)}
                    className={`px-2.5 py-1 rounded text-[10px] font-semibold uppercase transition cursor-pointer ${
                      tamanhoEtiqueta === t
                        ? 'bg-zinc-900 text-white'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Pré-visualização da Etiqueta Real de Frasco (Estilo ABNT / GHS) */}
          <div className="lg:col-span-7 bg-white rounded-xl p-6 shadow-xs border border-zinc-200/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">
                    Etiqueta Química de Frasco — Modelo Oficial
                  </h3>
                  <p className="text-[11px] text-zinc-500">
                    Identificação para recipientes primários e frascos de reagentes
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={baixarQrCodePng}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold transition cursor-pointer"
                    title="Baixar imagem isolada do QR Code"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Baixar QR</span>
                  </button>

                  <button
                    type="button"
                    onClick={imprimirEtiqueta}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#2F80ED] hover:bg-blue-600 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                    title="Imprimir esta etiqueta"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Imprimir Etiqueta</span>
                  </button>
                </div>
              </div>

              {/* CARD DA ETIQUETA COM IDENTIDADE INSTITUCIONAL */}
              <div className="bg-zinc-100 p-4 rounded-xl flex items-center justify-center">
                <div
                  className={`bg-white border-2 border-black rounded-lg p-4 shadow-md text-zinc-900 font-sans transition-all ${
                    tamanhoEtiqueta === 'pequeno'
                      ? 'max-w-[340px]'
                      : tamanhoEtiqueta === 'grande'
                      ? 'max-w-[460px]'
                      : 'max-w-[400px]'
                  } w-full`}
                >
                  {/* Cabeçalho da Etiqueta */}
                  <div className="border-b-2 border-black pb-1.5 mb-2.5 flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-mono uppercase tracking-widest font-black text-zinc-800 block">
                        LABORATÓRIO DE QUÍMICA • ESCOLA ESTADUAL
                      </span>
                      <span className="text-[8px] text-zinc-500 uppercase font-semibold">
                        SISTEMA MATÉRIA REATIVA • REG. SIPROQUIM 2
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-bold bg-black text-white px-2 py-0.5 rounded">
                      {produtoSelecionado.id}
                    </span>
                  </div>

                  {/* Conteúdo Central */}
                  <div className="grid grid-cols-12 gap-3 items-center">
                    {/* Dados Químicos */}
                    <div className="col-span-7 space-y-1.5 text-left">
                      <h4 className="text-base font-black leading-tight tracking-tight uppercase text-black">
                        {produtoSelecionado.nome}
                      </h4>

                      {produtoSelecionado.formulaQuimica && (
                        <div className="font-mono text-xs font-bold text-blue-700 bg-blue-50/80 px-2 py-0.5 rounded inline-block border border-blue-200">
                          {produtoSelecionado.formulaQuimica}
                        </div>
                      )}

                      <div className="text-[10px] text-zinc-700 space-y-0.5 font-medium">
                        <p>
                          <strong>CAS:</strong> <span className="font-mono">{produtoSelecionado.cas}</span>
                        </p>
                        {produtoSelecionado.massaMolar && (
                          <p>
                            <strong>Massa:</strong> {produtoSelecionado.massaMolar}
                          </p>
                        )}
                        {produtoSelecionado.pureza && (
                          <p>
                            <strong>Pureza:</strong> {produtoSelecionado.pureza}
                          </p>
                        )}
                        <p>
                          <strong>Validade:</strong> {produtoSelecionado.validade}
                        </p>
                        <p className="truncate">
                          <strong>Local:</strong> {produtoSelecionado.localizacao || 'Armário de Reagentes'}
                        </p>
                      </div>

                      {/* Tag GHS de Alerta */}
                      <div className="pt-1">
                        <span className="inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase bg-black text-white">
                          ⚠️ {produtoSelecionado.classePerigo}
                        </span>
                      </div>
                    </div>

                    {/* QR Code Grande e Escaneável */}
                    <div className="col-span-5 flex flex-col items-center justify-center p-1 bg-white border border-zinc-200 rounded">
                      {qrCodeDataUrl ? (
                        <img
                          src={qrCodeDataUrl}
                          alt={`QR Code ${produtoSelecionado.nome}`}
                          className="w-28 h-28 object-contain"
                        />
                      ) : (
                        <div className="w-28 h-28 bg-zinc-100 flex items-center justify-center text-zinc-400 text-xs">
                          Gerando...
                        </div>
                      )}
                      <span className="text-[8px] font-mono text-zinc-400 mt-1 uppercase text-center">
                        Escaneie para detalhes
                      </span>
                    </div>
                  </div>

                  {/* Rodapé da Etiqueta */}
                  <div className="border-t border-zinc-300 mt-2.5 pt-1.5 flex items-center justify-between text-[8px] text-zinc-500 font-mono">
                    <span>Resp. Técnica: Coordenação do Laboratório</span>
                    <span>Uso Interno Institucional</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Ação de ir para o produto direto do gerador */}
            <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between">
              <span className="text-xs text-zinc-500">
                Deseja consultar a ficha técnica completa deste reagente?
              </span>
              <button
                type="button"
                onClick={() => onIrParaProduto(produtoSelecionado.id)}
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-semibold"
              >
                <span>Abrir Ficha no Catálogo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 3: IMPRESSÃO EM LOTE (TODOS OS REAGENTES)                              */}
      {/* ========================================================================= */}
      {abaAtiva === 'lote' && (
        <div className="bg-white rounded-xl p-6 shadow-xs border border-zinc-200/80 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-100">
            <div>
              <h3 className="text-sm font-bold text-zinc-900">
                Folha de Etiquetas para Impressão em Lote
              </h3>
              <p className="text-xs text-zinc-500">
                Gere e imprima folhas adesivas com os QR Codes de todos os frascos do laboratório ({produtos.length} itens)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={gerarLoteCompleto}
                disabled={gerandoLote}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold transition cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${gerandoLote ? 'animate-spin' : ''}`} />
                <span>Atualizar Lote</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#2F80ED] hover:bg-blue-600 text-white text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir Folha Completa</span>
              </button>
            </div>
          </div>

          {/* Grid de Etiquetas Compactas Prontas para Impressão */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {produtos.map((p) => {
              const qr = todosQrCodes[p.id];
              return (
                <div
                  key={p.id}
                  className="p-3 bg-white border border-zinc-300 rounded-lg shadow-2xs flex items-center justify-between gap-3 text-left"
                >
                  <div className="space-y-1 overflow-hidden">
                    <span className="text-[9px] font-mono font-bold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded">
                      {p.id}
                    </span>
                    <h5 className="text-xs font-bold text-zinc-900 truncate">{p.nome}</h5>
                    {p.formulaQuimica && (
                      <span className="text-[10px] font-mono text-zinc-600 block">{p.formulaQuimica}</span>
                    )}
                    <p className="text-[9px] text-zinc-500">
                      CAS: {p.cas} · Val: {p.validade}
                    </p>
                    <span className="inline-block text-[8px] font-semibold bg-zinc-100 text-zinc-800 px-1.5 rounded truncate max-w-[170px]">
                      {p.classePerigo}
                    </span>
                  </div>

                  <div className="flex-shrink-0 text-center">
                    {qr ? (
                      <img src={qr} alt={p.nome} className="w-20 h-20 object-contain mx-auto" />
                    ) : (
                      <div className="w-20 h-20 bg-zinc-50 flex items-center justify-center text-[10px] text-zinc-400">
                        Carregando...
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => onIrParaProduto(p.id)}
                      className="text-[9px] text-blue-600 hover:underline block mt-0.5"
                    >
                      Ver detalhes
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
