import React, { useState, useEffect } from 'react';
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
  const [dashboardMenu, setDashboardMenu] = useState<string>('Dashboard');
  const [userProfile, setUserProfile] = useState<'aluno' | 'professor'>('aluno');

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
      } else if (hash === 'usuarios' || hash === 'pessoas') {
        setCurrentScreen('dashboard');
        setDashboardMenu('Usuários');
      } else if (hash === 'perfil' || hash === 'meu-perfil') {
        setCurrentScreen('dashboard');
        setDashboardMenu('Meu Perfil');
      } else if (hash === 'login') {
        setCurrentScreen('login');
      } else if (hash === 'cadastro') {
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

  const handleSelectProfile = (perfil: 'aluno' | 'professor') => {
    setUserProfile(perfil);
    // Verifica se já existe uma sessão ativa de usuário real no banco
    const sessaoAtiva = dataService.obterSessao();
    if (sessaoAtiva && sessaoAtiva.tipoPerfil === perfil) {
      setCurrentScreen('dashboard');
      setDashboardMenu('Dashboard');
      return;
    }
    // Não havendo sessão ativa, direciona para login obrigatório
    setCurrentScreen('login');
  };

  const handleOpenLogin = (perfil: 'aluno' | 'professor') => {
    setUserProfile(perfil);
    setCurrentScreen('login');
  };

  // Se estiver na tela de login
  if (currentScreen === 'login') {
    return (
      <LoginScreen
        userType={userProfile}
        onNavigate={setCurrentScreen}
        onToggleUserType={setUserProfile}
      />
    );
  }

  // Se estiver na tela de cadastro
  if (currentScreen === 'cadastro') {
    return <CadastroScreen onNavigate={setCurrentScreen} onSetPerfil={setUserProfile} />;
  }

  // Se estiver na tela de esqueceu senha
  if (currentScreen === 'esqueceu-senha') {
    return <EsqueceuSenhaScreen onNavigate={setCurrentScreen} />;
  }

  // Se estiver na tela de dashboard
  if (currentScreen === 'dashboard') {
    return (
      <DashboardScreen
        onNavigate={setCurrentScreen}
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
              <p>Escolha abaixo um perfil para acessar.</p>
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
            </nav>
          </header>
        </article>
      </section>
    </main>
  );
}
