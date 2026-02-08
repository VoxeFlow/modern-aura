import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatList from './components/ChatList';
import ChatArea from './components/ChatArea';
import ConfigModal from './components/ConfigModal';
import ConnectModal from './components/ConnectModal';
import BriefingModal from './components/BriefingModal';
import HistoryView from './components/HistoryView';
import CRMView from './components/CRMView';
import LoginScreen from './components/LoginScreen';
import LandingPage from './pages/LandingPage'; // SALES LANDING PAGE
import { useStore } from './store/useStore';
import WhatsAppService from './services/whatsapp';

const App = () => {
  const { isConnected, setIsConnected, currentView, briefing, setChats } = useStore();
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isConnectOpen, setIsConnectOpen] = useState(false);
  const [isBriefingOpen, setIsBriefingOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // AUTH: Check if user is authenticated
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // LANDING: Track if user clicked "Já sou Cliente" to show login
  const [showLogin, setShowLogin] = useState(false);

  // AUTH: Check localStorage for authentication token
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setIsAuthenticated(false);
        return;
      }

      try {
        // Simple validation: Decode token and check prefix
        const decoded = atob(token);
        if (decoded.startsWith('authenticated:')) {
          setIsAuthenticated(true);
        } else {
          console.warn('AURA: Invalid token format, logging out');
          localStorage.removeItem('auth_token');
          setIsAuthenticated(false);
        }
      } catch (e) {
        console.error('AURA: Token validation error', e);
        localStorage.removeItem('auth_token');
        setIsAuthenticated(false);
      }
    };

    checkAuth();
    // Also listen for storage changes (multi-tab logout support)
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, []);

  // Handle external modal triggers (from Hub/Settings)
  useEffect(() => {
    const handleOpenBriefing = () => setIsBriefingOpen(true);
    const handleOpenConnect = () => setIsConnectOpen(true);

    window.addEventListener('open-briefing', handleOpenBriefing);
    window.addEventListener('open-connect', handleOpenConnect);

    return () => {
      window.removeEventListener('open-briefing', handleOpenBriefing);
      window.removeEventListener('open-connect', handleOpenConnect);
    };
  }, []);


  // Check WhatsApp connection status (only when authenticated)
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkConn = async () => {
      const status = await WhatsAppService.checkConnection();
      const open = status === 'open';
      setIsConnected(open);
      if (open) {
        const data = await WhatsAppService.fetchChats();
        if (data && data.length > 0) setChats(data);
      }
    };
    checkConn();
    const itv = setInterval(checkConn, 30000);
    return () => clearInterval(itv);
  }, [setIsConnected, setChats, isAuthenticated]);

  // AUTH: Handle logout
  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    setIsAuthenticated(false);
    setShowLogin(false); // Return to landing page
  };

  // LANDING: If not authenticated and user hasn't clicked "Já sou Cliente", show landing page
  if (!isAuthenticated && !showLogin) {
    console.log('AURA: Rendering Landing Page');
    return <LandingPage onGetStarted={() => setShowLogin(true)} />;
  }

  // AUTH: If not authenticated but user wants to login, show login screen
  if (!isAuthenticated && showLogin) {
    console.log('AURA: Rendering Login Screen');
    return <LoginScreen onLogin={() => setIsAuthenticated(true)} />;
  }

  // MAIN APP: User is authenticated
  return (
    <div className="app-container">
      <Sidebar
        onOpenConfig={() => setIsConfigOpen(true)}
        onOpenConnect={() => setIsConnectOpen(true)}
        onOpenBriefing={() => setIsBriefingOpen(true)}
        onLogout={handleLogout}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
      {currentView === 'history' ? <HistoryView /> : currentView === 'crm' ? null : <ChatList onOpenMenu={() => setIsMobileMenuOpen(true)} />}
      <main className={`main-content ${activeChat ? 'mobile-chat-open' : 'mobile-chat-closed'}`}>
        {currentView === 'dashboard' ? <ChatArea /> :
          currentView === 'crm' ? <CRMView /> :
            currentView === 'history' ? <ChatArea isArchived={true} /> : (
              <div className="history-placeholder glass-panel" style={{ flex: 1, margin: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <h2 style={{ color: '#86868b', opacity: 0.5 }}>Selecione uma conversa arquivada</h2>
              </div>
            )}
      </main>
      <ConfigModal isOpen={isConfigOpen} onClose={() => setIsConfigOpen(false)} />
      <ConnectModal isOpen={isConnectOpen} onClose={() => setIsConnectOpen(false)} />
      <BriefingModal isOpen={isBriefingOpen} onClose={() => setIsBriefingOpen(false)} />
    </div>
  );
};

export default App;
