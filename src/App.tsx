import React, { useState, useEffect, useRef } from 'react';
import './materia-reativa.css';
import fundoImg from './assets/fundo.png';
import { Logo } from './components/Logo';
import { LoginScreen } from './screens/LoginScreen';
import { CadastroScreen } from './screens/CadastroScreen';
import { EsqueceuSenhaScreen } from './screens/EsqueceuSenhaScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { dataService } from './services/db/dataService';

export type ScreenType = 'index' | 'login' | 'cadastro' | 'esqueceu-senha' | 'dashboard';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('index');
  const [adminEntry, setAdminEntry] = useState(false);
  const [cadastroAdminSetup, setCadastroAdminSetup] = useState(false);
  const [dashboardMenu, setDashboardMenu] = useState<string>('Dashboard');
  const [userProfile, setUserProfile] = useState<'aluno' | 'professor'>(() => {
    const emCache = dataService.obterSessao();
    if (emCache) return emCache.tipoPerfil === 'aluno' ? 'aluno' : 'professor';
    return localStorage.getItem('materia_reativa_ultimo_perfil') === 'professor' ? 'professor' : 'aluno';
  });
  // A sessão é validada no SERVIDOR (cookie). 'verificando' evita piscar a tela de login ao recarregar.
  const [sessao, setSessao] = useState<'verificando' | 'ok' | 'nenhuma'>('verificando');
  const telaRef = useRef<ScreenType>('index');

  // Sincronização com hash da URL para navegação direta caso necessário
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '').toLowerCase();
      if (hash === 'alertas') {
        setCurrentScreen('dashboard');
        setDashboardMenu('Alertas');
      } else if (hash === 'relatorios') {
        setCurrentScreen('dashboard');
        setDashboardMenu('Relatórios');
      } else if (hash === 'produtos') {
        setCurrentScreen('dashboard');
        setDashboardMenu('Produtos');
      } else if (hash === 'qrcode' || hash === 'qr') {
        setCurrentScreen('dashboard');
        setDashboardMenu('QR Code & Scanner');
      } else if (hash === 'compras') {
        setCurrentScreen('dashboard');
        setDashboardMenu('Compras');
      } else if (hash === 'estoque') {
        setCurrentScreen('dashboard');
        setDashboardMenu('Estoque');
      } else if (hash === 'solicitacoes') {
        setCurrentScreen('dashboard');
        setDashboardMenu('Solicitações');
      } else if (hash === 'fornecedores') {
        setCurrentScreen('dashboard');
        setDashboardMenu('Fornecedores');
      } else if (hash === 'turmas' || hash === 'salas') {
        setCurrentScreen('dashboard');
        setDashboardMenu('Turmas');
      } else if (hash === 'usuarios' || hash === 'pessoas') {
        setCurrentScreen('dashboard');
        setDashboardMenu('Usuários');
      } else if (hash === 'perfil' || hash === 'meu-perfil') {
        setCurrentScreen('dashboard');
        setDashboardMenu('Meu Perfil');
      } else if (hash === 'detalhes') {
        setCurrentScreen('dashboard');
        setDashboardMenu('Detalhes');
      } else if (hash === 'mandar-alerta') {
        setCurrentScreen('dashboard');
        setDashboardMenu('Mandar alerta');
      } else if (hash === 'login') {
        setAdminEntry(false);
        setCurrentScreen('login');
      } else if (hash === 'admin' || hash === 'administradora') {
        setAdminEntry(true);
        setCurrentScreen('login');
      } else if (hash === 'cadastro') {
        setAdminEntry(false);
        setCadastroAdminSetup(false);
        setCurrentScreen('cadastro');
      } else if (hash === 'esqueceu' || hash === 'esqueceu-senha') {
        setCurrentScreen('esqueceu-senha');
      } else if (hash === 'dashboard') {
        setCurrentScreen('dashboard');
        setDashboardMenu('Dashboard');
      } else if (hash === 'index' || hash === 'inicio') {
        setCurrentScreen('index');
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  useEffect(() => {
    telaRef.current = currentScreen;
  }, [currentScreen]);

  const ROTAS_PUBLICAS = ['login', 'admin', 'administradora', 'cadastro', 'esqueceu', 'esqueceu-senha', 'index', 'inicio', ''];
  const guardarRotaPendente = () => {
    const rota = window.location.hash.replace('#', '').toLowerCase();
    if (!ROTAS_PUBLICAS.includes(rota)) sessionStorage.setItem('mr_rota_pendente', rota);
  };

  // Ao abrir ou recarregar a página (F5) no painel: confere a sessão no servidor.
  // Se for válida, a pessoa continua na MESMA tela; se não, pede login e depois volta para ela.
  useEffect(() => {
    if (currentScreen !== 'dashboard' || sessao === 'ok') return;
    let ativo = true;
    setSessao('verificando');
    dataService.validarSessao().then((usuario) => {
      if (!ativo) return;
      if (usuario) {
        const perfil = usuario.tipoPerfil === 'aluno' ? 'aluno' : 'professor';
        localStorage.setItem('materia_reativa_ultimo_perfil', perfil);
        setUserProfile(perfil);
        setSessao('ok');
      } else {
        guardarRotaPendente();
        setSessao('nenhuma');
      }
    });
    return () => {
      ativo = false;
    };
  }, [currentScreen]);

  // Sessão vencida durante o uso (o servidor respondeu 401): volta ao login e depois retorna à mesma tela
  useEffect(() => {
    const aoExpirar = () => {
      if (telaRef.current !== 'dashboard') return;
      guardarRotaPendente();
      setSessao('nenhuma');
      window.dispatchEvent(new CustomEvent('mr:erro-api', { detail: 'Sua sessão expirou. Faça login novamente.' }));
    };
    window.addEventListener('mr:sessao-expirada', aoExpirar);
    return () => window.removeEventListener('mr:sessao-expirada', aoExpirar);
  }, []);

  const concluirLogin = () => {
    const logado = dataService.obterSessao();
    if (logado) {
      const perfil = logado.tipoPerfil === 'aluno' ? 'aluno' : 'professor';
      localStorage.setItem('materia_reativa_ultimo_perfil', perfil);
      setUserProfile(perfil);
    }
    setSessao('ok');
    const pendente = sessionStorage.getItem('mr_rota_pendente');
    if (pendente) {
      sessionStorage.removeItem('mr_rota_pendente');
      window.history.replaceState(null, '', `#${pendente}`);
      window.dispatchEvent(new HashChangeEvent('hashchange')); // reaproveita o mapeamento de rotas acima
    }
  };

  const aoNavegar = (tela: ScreenType) => {
    if (tela === 'dashboard' && sessao !== 'ok') concluirLogin();
    if (tela === 'index') { setSessao('nenhuma'); setAdminEntry(false); }
    if (tela !== 'cadastro') setCadastroAdminSetup(false);
    setCurrentScreen(tela);
  };

  const handleSelectProfile = (perfil: 'aluno' | 'professor') => {
    setUserProfile(perfil);
    // Verifica se já existe uma sessão ativa de usuário real no banco
    const sessaoAtiva = dataService.obterSessao();
    if (sessaoAtiva && (sessaoAtiva.tipoPerfil === 'aluno' ? 'aluno' : 'professor') === perfil) {
      setCurrentScreen('dashboard');
      setDashboardMenu('Dashboard');
      return;
    }
    // Não havendo sessão ativa, direciona para login obrigatório
    setCurrentScreen('login');
  };

  const handleOpenLogin = (perfil: 'aluno' | 'professor') => {
    setAdminEntry(false);
    setCadastroAdminSetup(false);
    setUserProfile(perfil);
    setCurrentScreen('login');
  };

  const handleOpenAdminLogin = () => {
    setCadastroAdminSetup(false);
    setUserProfile('professor');
    setAdminEntry(true);
    setCurrentScreen('login');
  };

  const handleOpenAdminSetup = () => {
    setAdminEntry(false);
    setCadastroAdminSetup(true);
    setUserProfile('professor');
    setCurrentScreen('cadastro');
  };

  // Painel sem sessão confirmada: aguarda a verificação ou pede login (voltando a esta tela depois)
  if (currentScreen === 'dashboard' && sessao !== 'ok') {
    if (sessao === 'verificando') {
      return (
        <div className="w-full min-h-screen bg-black" role="status" aria-live="polite">
          <span className="mra11y-sr">Carregando...</span>
        </div>
      );
    }
    return <LoginScreen userType={userProfile} onNavigate={aoNavegar} onToggleUserType={setUserProfile} adminEntry={adminEntry} onStartAdminSetup={handleOpenAdminSetup} />;
  }

  // Se estiver na tela de login
  if (currentScreen === 'login') {
    return (
      <LoginScreen
        userType={userProfile}
        onNavigate={aoNavegar}
        onToggleUserType={setUserProfile}
        adminEntry={adminEntry}
        onStartAdminSetup={handleOpenAdminSetup}
      />
    );
  }

  // Se estiver na tela de cadastro
  if (currentScreen === 'cadastro') {
    return <CadastroScreen onNavigate={aoNavegar} onSetPerfil={setUserProfile} adminSetup={cadastroAdminSetup} />;
  }

  // Se estiver na tela de esqueceu senha
  if (currentScreen === 'esqueceu-senha') {
    return <EsqueceuSenhaScreen onNavigate={setCurrentScreen} />;
  }

  // Se estiver na tela de dashboard
  if (currentScreen === 'dashboard') {
    return (
      <DashboardScreen
        onNavigate={aoNavegar}
        initialMenu={dashboardMenu}
        userProfile={userProfile}
        onToggleProfile={setUserProfile}
      />
    );
  }

  // TELA INICIAL (Escolha de Perfil: Aluno / Professor fiel ao Figma)
  return (
    <main className="tela-acesso-main">
      <section className="tela-acesso" aria-labelledby="titulo-acesso">
        {/* Imagem de fundo */}
        <img
          className="imagem-fundo"
          src={fundoImg}
          onError={(e) => {
            const target = e.currentTarget;
            if (!target.dataset.triedPublic) {
              target.dataset.triedPublic = 'true';
              target.src = '/img/fundo.png';
            }
          }}
          alt="Fundo com estrutura molecular de DNA azul brilhante"
          aria-hidden="true"
        />

        {/* Conteúdo de acesso */}
        <article className="painel-acesso">
          <header className="cabecalho-acesso">
            {/* Logo fiel ao Figma */}
            <div className="logo" style={{ cursor: 'pointer', maxWidth: '210px', margin: '0 auto' }}>
              <Logo width="100%" variant="light" />
            </div>

            {/* Texto de boas-vindas */}
            <div className="informacao-acesso">
              <h1 id="titulo-acesso">Acesso</h1>
              <p>Escolha seu perfil. Kátia, use o acesso administrativo.</p>
            </div>

            {/* Perfis com entrada direta com 1 clique */}
            <nav className="navegacao-perfis" aria-label="Escolha um perfil">
              <button
                type="button"
                className="botao-perfil"
                onClick={() => handleSelectProfile('aluno')}
                id="btn-aluno"
                title="Entrar diretamente como Aluno"
              >
                <span>Aluno</span>
                <span className="seta" aria-hidden="true">&rarr;</span>
              </button>

              <button
                type="button"
                className="botao-perfil"
                onClick={() => handleSelectProfile('professor')}
                id="btn-professor"
                title="Entrar diretamente como Professor(a)"
              >
                <span>Professor(a)</span>
                <span className="seta" aria-hidden="true">&rarr;</span>
              </button>

              <button
                type="button"
                className="botao-perfil botao-perfil-admin"
                onClick={handleOpenAdminLogin}
                id="btn-administradora"
                title="Abrir o login específico da administradora"
              >
                <span className="flex flex-col items-start gap-0.5"><strong>Administradora · Kátia</strong><small>Acesso de gestão</small></span>
                <span className="seta" aria-hidden="true">&rarr;</span>
              </button>
            </nav>
          </header>
        </article>
      </section>
    </main>
  );
}
