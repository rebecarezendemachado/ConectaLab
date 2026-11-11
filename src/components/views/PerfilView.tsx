import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Search,
  CheckCircle2,
  LogOut,
  Camera,
  Check,
  Eye,
  EyeOff
} from 'lucide-react';
import { Usuario, RegistroConsumoAluno, RelatoOcorrenciaAluno, ProdutoQuimico } from '../../types';
import { dataService } from '../../services/db/dataService';

interface PerfilViewProps {
  usuario: Usuario | null;
  perfilAtual: 'aluno' | 'professor';
  consumosAluno: RegistroConsumoAluno[];
  ocorrenciasAluno: RelatoOcorrenciaAluno[];
  produtos: ProdutoQuimico[];
  onAtualizarUsuario: (usuarioAtualizado: Usuario) => void;
  onNavigateToTab?: (tab: string) => void;
  onLogout?: () => void;
}

export const PerfilView: React.FC<PerfilViewProps> = ({
  usuario,
  perfilAtual,
  onAtualizarUsuario,
  onLogout
}) => {
  // Dados Pessoais do usuário logado (totalmente zerado/dinâmico)
  const [nome, setNome] = useState(usuario?.nome || '');
  const [email, setEmail] = useState(usuario?.email || '');
  const [cargo, setCargo] = useState(usuario?.cargo || (perfilAtual === 'aluno' ? 'Aluno(a)' : 'Professor(a) / Coordenador(a)'));
  const [telefone, setTelefone] = useState(usuario?.telefone || '');
  const [cpf, setCpf] = useState(usuario?.cpf || '');
  const [senha, setSenha] = useState(usuario?.senha || '');
  const [mostrarSenha, setMostrarSenha] = useState(false);

  const getStorageKey = () => {
    if (usuario?.id) return `materia_reativa_avatar_${usuario.id}`;
    if (usuario?.email) return `materia_reativa_avatar_${usuario.email.trim().toLowerCase()}`;
    return null;
  };

  const [fotoUrl, setFotoUrl] = useState<string | null>(() => {
    try {
      // Remover chaves globais legadas para evitar vazamento entre contas
      localStorage.removeItem('materia_reativa_avatar_url');
      localStorage.removeItem('materia_reativa_avatar_aluno');
      localStorage.removeItem('materia_reativa_avatar_professor');
      const key = usuario?.id 
        ? `materia_reativa_avatar_${usuario.id}` 
        : usuario?.email 
        ? `materia_reativa_avatar_${usuario.email.trim().toLowerCase()}` 
        : null;
      return key ? localStorage.getItem(key) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      const key = getStorageKey();
      setFotoUrl(key ? localStorage.getItem(key) : null);
    } catch {
      setFotoUrl(null);
    }
  }, [usuario?.id, usuario?.email]);

  const [buscaHeader, setBuscaHeader] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const mostrarToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSalvar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuario) {
      mostrarToast('Perfil atualizado com sucesso!');
      return;
    }

    const atualizado: Usuario = {
      ...usuario,
      nome: nome.trim(),
      email: email.trim(),
      cargo: cargo.trim(),
      telefone: telefone.trim(),
      cpf: cpf.trim(),
      senha: senha.trim()
    };

    onAtualizarUsuario(atualizado);
    dataService.salvarSessao(atualizado);
    mostrarToast('Informações pessoais salvas com sucesso!');
  };

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      setFotoUrl(url);
      try {
        const key = getStorageKey();
        if (key) {
          localStorage.setItem(key, url);
        }
        localStorage.removeItem('materia_reativa_avatar_url');
      } catch {}
      mostrarToast('Foto de perfil atualizada com sucesso!');
    };
    reader.readAsDataURL(file);
  };

  // Formatação de data e hora de acesso em tempo real
  const ultimoAcessoStr = `${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 font-sans text-zinc-900 pb-16 antialiased relative">
      {/* Toast de Confirmação */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-zinc-900 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 border border-zinc-700 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Topo com Barra de Busca idêntica ao Figma (image_ec8ff254.png) */}
      <div className="flex justify-end">
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={buscaHeader}
            onChange={(e) => setBuscaHeader(e.target.value)}
            placeholder="Procurar produto"
            className="w-full h-10 pl-4 pr-10 rounded-full border border-zinc-300 bg-white text-xs text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-[#2B7FFF] focus:ring-1 focus:ring-[#2B7FFF] transition shadow-2xs"
          />
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
        </div>
      </div>

      {/* Grid com as duas colunas fiéis ao Figma (image_ec8ff254.png) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* COLUNA ESQUERDA: Avatar, Alterar Foto e Último Acesso (4 colunas) */}
        <div className="lg:col-span-4 space-y-6 flex flex-col items-center">
          <h2 className="text-xl font-bold text-zinc-900 self-start">Meu Perfil</h2>

          {/* Círculo do Avatar com contorno azul suave */}
          <div className="relative">
            <div className="w-48 h-48 rounded-full border-2 border-blue-400 bg-white shadow-2xs flex items-center justify-center overflow-hidden">
              {fotoUrl ? (
                <img src={fotoUrl} alt={nome} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 bg-zinc-50">
                  <User className="w-24 h-24 stroke-[1.2] text-[#475569]" />
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFotoChange}
              className="hidden"
            />
          </div>

          {/* Botão Alterar Foto estilo Pílula Branca do Figma */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-2 rounded-full bg-white hover:bg-zinc-50 text-[#2B7FFF] text-xs font-bold border border-zinc-200 shadow-2xs transition active:scale-95 cursor-pointer"
          >
            Alterar foto
          </button>

          {/* Card Último Acesso */}
          <div className="w-full bg-white rounded-2xl p-4 border border-zinc-200/80 text-center shadow-2xs space-y-1">
            <span className="text-xs font-bold text-zinc-900 block">Ultimo Acesso</span>
            <span className="text-xs font-medium text-zinc-600 block">{ultimoAcessoStr}</span>
          </div>
        </div>

        {/* COLUNA DIREITA: Formulário Informações Pessoais (8 colunas) */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200/80 shadow-xs space-y-5">
            <h2 className="text-lg font-bold text-zinc-950 pb-2">Informações pessoais</h2>

            <form onSubmit={handleSalvar} className="space-y-4 text-xs">
              {/* Nome Completo */}
              <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2">
                <label className="sm:col-span-4 font-bold text-zinc-800 text-sm">
                  Nome Completo
                </label>
                <div className="sm:col-span-8">
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Seu nome completo"
                    required
                    className="w-full h-11 px-3.5 rounded-xl border border-zinc-300 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-[#2B7FFF] focus:ring-1 focus:ring-[#2B7FFF] transition"
                  />
                </div>
              </div>

              {/* E-mail */}
              <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2">
                <label className="sm:col-span-4 font-bold text-zinc-800 text-sm">
                  E-mail
                </label>
                <div className="sm:col-span-8">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@exemplo.com"
                    required
                    className="w-full h-11 px-3.5 rounded-xl border border-zinc-300 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-[#2B7FFF] focus:ring-1 focus:ring-[#2B7FFF] transition"
                  />
                </div>
              </div>

              {/* Cargo */}
              <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2">
                <label className="sm:col-span-4 font-bold text-zinc-800 text-sm">
                  Cargo
                </label>
                <div className="sm:col-span-8">
                  <input
                    type="text"
                    value={cargo}
                    onChange={(e) => setCargo(e.target.value)}
                    placeholder="Ex: Aluno(a) de Química, Docente Responsável"
                    className="w-full h-11 px-3.5 rounded-xl border border-zinc-300 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-[#2B7FFF] focus:ring-1 focus:ring-[#2B7FFF] transition"
                  />
                </div>
              </div>

              {/* Telefone */}
              <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2">
                <label className="sm:col-span-4 font-bold text-zinc-800 text-sm">
                  Telefone
                </label>
                <div className="sm:col-span-8">
                  <input
                    type="text"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="w-full h-11 px-3.5 rounded-xl border border-zinc-300 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-[#2B7FFF] focus:ring-1 focus:ring-[#2B7FFF] transition"
                  />
                </div>
              </div>

              {/* CPF */}
              <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2">
                <label className="sm:col-span-4 font-bold text-zinc-800 text-sm">
                  CPF
                </label>
                <div className="sm:col-span-8">
                  <input
                    type="text"
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full h-11 px-3.5 rounded-xl border border-zinc-300 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-[#2B7FFF] focus:ring-1 focus:ring-[#2B7FFF] transition font-mono"
                  />
                </div>
              </div>

              {/* Senha com alternador */}
              <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2">
                <label className="sm:col-span-4 font-bold text-zinc-800 text-sm">
                  Senha
                </label>
                <div className="sm:col-span-8 relative">
                  <input
                    type={mostrarSenha ? 'text' : 'password'}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="Sua senha de acesso"
                    className="w-full h-11 px-3.5 pr-10 rounded-xl border border-zinc-300 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-[#2B7FFF] focus:ring-1 focus:ring-[#2B7FFF] transition font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition p-1 cursor-pointer"
                  >
                    {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-3 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-[#2B7FFF] hover:bg-blue-600 text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-98"
                >
                  Salvar Informações
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Botão Flutuante Sair no Canto Inferior Direito fiel ao Figma (image_ec8ff254.png) */}
      <div className="flex justify-end pt-6">
        <button
          type="button"
          onClick={() => {
            if (onLogout) {
              onLogout();
            } else {
              dataService.encerrarSessao();
              window.location.reload();
            }
          }}
          className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-white hover:bg-zinc-100 text-zinc-900 font-bold text-sm border border-zinc-300 shadow-md transition active:scale-95 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Sair</span>
        </button>
      </div>
    </div>
  );
};
