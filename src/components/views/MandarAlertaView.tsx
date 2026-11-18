import React, { useState } from 'react';
import { ProdutoQuimico } from '../../types';
import {
  AlertTriangle,
  Send,
  Search,
  CheckCircle2,
  Clock,
  ShieldAlert,
  FlaskConical,
  MessageSquare
} from 'lucide-react';

interface MandarAlertaViewProps {
  produtos: ProdutoQuimico[];
  onEnviarAlerta: (alerta: {
    produtoNome: string;
    motivo: string;
    mensagem: string;
    autorNome: string;
    autorPerfil: 'aluno' | 'professor';
  }) => Promise<void>;
  usuarioNome?: string;
  isAluno?: boolean;
}

export const MandarAlertaView: React.FC<MandarAlertaViewProps> = ({
  produtos,
  onEnviarAlerta,
  usuarioNome = 'Aluno(a)',
  isAluno = true
}) => {
  const [produto, setProduto] = useState('');
  const [motivo, setMotivo] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [buscaHeader, setBuscaHeader] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const mostrarToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!produto.trim()) {
      mostrarToast('Por favor, informe o produto envolvido.');
      return;
    }
    if (!motivo.trim()) {
      mostrarToast('Por favor, informe o motivo do alerta.');
      return;
    }

    setEnviando(true);
    try {
      await onEnviarAlerta({
        produtoNome: produto.trim(),
        motivo: motivo.trim(),
        mensagem: mensagem.trim(),
        autorNome: usuarioNome,
        autorPerfil: isAluno ? 'aluno' : 'professor'
      });

      mostrarToast('Alerta enviado com sucesso ao professor responsável!');
      setProduto('');
      setMotivo('');
      setMensagem('');
    } catch {
      mostrarToast('Falha ao enviar alerta. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 font-sans text-zinc-900 pb-12 antialiased">
      {/* Toast de Confirmação */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-zinc-900 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 border border-zinc-700 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Topo: Título e Barra de Busca igual ao Figma */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight">
            Mandar alerta
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">
            Envie um aviso diretamente para o professor responsável pelo laboratório.
          </p>
        </div>

        {/* Campo Procurar Produto do Topo Direito fiel ao Figma */}
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={buscaHeader}
            onChange={(e) => setBuscaHeader(e.target.value)}
            placeholder="Procurar produto"
            className="w-full h-10 pl-4 pr-10 rounded-lg border border-zinc-300 bg-white text-xs text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-[#2B7FFF] focus:ring-1 focus:ring-[#2B7FFF] transition shadow-2xs"
          />
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
        </div>
      </div>

      {/* Card Principal "Avisar professor" idêntico ao Figma (image_763d03f8.png) */}
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-zinc-200/80 shadow-xs space-y-6">
        <div>
          <h2 className="text-lg font-bold text-zinc-950">Avisar professor</h2>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1 leading-relaxed max-w-2xl">
            Se você perceber que um produto acabou ou está com quantidade muito baixa, envie um alerta para que o professor saiba que pode ser necessário comprar mais.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Campo Produto */}
          <div className="space-y-1.5">
            <label className="block text-sm font-bold text-zinc-900">
              Produto
            </label>
            <div className="relative">
              <input
                type="text"
                list="lista-produtos-sugestoes"
                required
                value={produto}
                onChange={(e) => setProduto(e.target.value)}
                placeholder="Nome ou código do reagente..."
                className="w-full h-12 px-4 rounded-xl border border-zinc-300 text-sm text-zinc-900 focus:outline-none focus:border-[#2B7FFF] focus:ring-1 focus:ring-[#2B7FFF] transition"
              />
              <datalist id="lista-produtos-sugestoes">
                {produtos.map((p) => (
                  <option key={p.id} value={p.nome}>
                    {p.nome} (Estoque: {p.estoqueAtual} {p.unidade})
                  </option>
                ))}
              </datalist>
            </div>
          </div>

          {/* Campo Motivo */}
          <div className="space-y-1.5">
            <label className="block text-sm font-bold text-zinc-900">
              Motivo
            </label>
            <input
              type="text"
              required
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex: Acabou na bancada, frasco quebrado ou pouca quantidade..."
              className="w-full h-12 px-4 rounded-xl border border-zinc-300 text-sm text-zinc-900 focus:outline-none focus:border-[#2B7FFF] focus:ring-1 focus:ring-[#2B7FFF] transition"
            />
          </div>

          {/* Campo Mensagem */}
          <div className="space-y-1.5">
            <label className="block text-sm font-bold text-zinc-900">
              Mensagem
            </label>
            <textarea
              rows={4}
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              placeholder="Detalhes adicionais sobre a necessidade de reposição ou estado do reagente..."
              className="w-full p-4 rounded-xl border border-zinc-300 text-sm text-zinc-900 focus:outline-none focus:border-[#2B7FFF] focus:ring-1 focus:ring-[#2B7FFF] transition resize-none"
            />
          </div>

          {/* Botão Enviar com estilo proporcional e moderno */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={enviando}
              className="inline-flex items-center justify-center px-7 py-2.5 rounded-lg bg-[#2B7FFF] hover:bg-blue-600 active:scale-98 text-white text-sm font-semibold shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              {enviando ? 'Enviando...' : 'Enviar Alerta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
