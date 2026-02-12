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
import { useStore } from './store/useStore';
import WhatsAppService from './services/whatsapp';
import { useKnowledgeLoop } from './hooks/useKnowledgeLoop';
import { isSupabaseEnabled, supabase } from './services/supabase';

const App = () => {
  useKnowledgeLoop(); // AURA v11: Dynamic Knowledge Loop
  const {
    setIsConnected,
    currentView,
    setChats,
    activeChat,
    setActiveChat,
    setSubscriptionPlan,
    hasFeature,
    switchView,
    getActiveWhatsAppChannel,
    setConfig,
    updateWhatsAppChannel,
    whatsappChannels,
    setWhatsAppChannelStatus,
  } = useStore();
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isConnectOpen, setIsConnectOpen] = useState(false);
  const [isBriefingOpen, setIsBriefingOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // AUTH: Check if user is authenticated
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  // AUTH: Check Supabase session (preferred) or local legacy token fallback.
  useEffect(() => {
    let mounted = true;

    const checkLegacyToken = () => {
      const token = localStorage.getItem('auth_token');
      if (!token) return false;

      try {
        const decoded = atob(token);
        const parsed = JSON.parse(decoded);
        const validType = parsed?.type === 'authenticated';
        const notExpired = typeof parsed?.expiresAt === 'number' && parsed.expiresAt > Date.now();

        if (validType && notExpired) return true;
        localStorage.removeItem('auth_token');
        return false;
      } catch {
        localStorage.removeItem('auth_token');
        return false;
      }
    };

    const checkAuth = async () => {
      let authed = false;
      if (isSupabaseEnabled) {
        const { data } = await supabase.auth.getSession();
        authed = Boolean(data?.session);
      }
      if (!authed) authed = checkLegacyToken();
      if (mounted) {
        setIsAuthenticated(authed);
        setAuthReady(true);
      }
    };

    checkAuth();

    const authListener = isSupabaseEnabled
      ? supabase.auth.onAuthStateChange((_event, session) => {
        if (!mounted) return;
        if (session) {
          setIsAuthenticated(true);
          setAuthReady(true);
        } else {
          const legacyAuthed = checkLegacyToken();
          setIsAuthenticated(legacyAuthed);
          setAuthReady(true);
        }
      })
      : null;

    const onStorage = () => checkAuth();
    window.addEventListener('storage', onStorage);

    return () => {
      mounted = false;
      window.removeEventListener('storage', onStorage);
      authListener?.data?.subscription?.unsubscribe?.();
    };
  }, []);

  // LEAD PROCESSING: Check for pending leads from Landing Page
  useEffect(() => {
    if (isAuthenticated) {
      const storedPlan = localStorage.getItem('aura_subscription_plan');
      if (storedPlan) {
        setSubscriptionPlan(storedPlan);
      }

      const pendingLead = localStorage.getItem('aura_pending_lead');
      if (pendingLead) {
        try {
          const leadData = JSON.parse(pendingLead);
          console.log('AURA: Processing pending lead', leadData);
          if (leadData?.plan) {
            setSubscriptionPlan(leadData.plan);
            localStorage.setItem('aura_subscription_plan', leadData.plan);
          }
          useStore.getState().addLead(leadData);
          if (hasFeature('crm_basic')) {
            switchView('crm'); // Go to CRM to see the new lead
          }
          localStorage.removeItem('aura_pending_lead');
        } catch (e) {
          console.error('AURA: Failed to process pending lead', e);
        }
      }
    }
  }, [isAuthenticated, hasFeature, setSubscriptionPlan, switchView]);

  // PLAN GUARD: Lite has no CRM
  useEffect(() => {
    if (currentView === 'crm' && !hasFeature('crm_basic')) {
      switchView('dashboard');
    }
  }, [currentView, hasFeature, switchView]);

  // CHANNEL SYNC: keep instanceName aligned with selected channel after hydration/login.
  useEffect(() => {
    const activeChannel = getActiveWhatsAppChannel();
    if (activeChannel) {
      if (String(activeChannel.instanceName || '').toLowerCase() === 'voxeflow') {
        updateWhatsAppChannel(activeChannel.id, { instanceName: '' });
        setConfig({ instanceName: '' });
        return;
      }
    }
    if (activeChannel?.instanceName) {
      setConfig({ instanceName: activeChannel.instanceName });
    }
  }, [getActiveWhatsAppChannel, setConfig, updateWhatsAppChannel]);

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
      const channels = Array.isArray(whatsappChannels) ? whatsappChannels : [];
      const connectedChannels = channels.filter((channel) => String(channel.instanceName || '').trim());

      if (connectedChannels.length === 0) {
        setIsConnected(false);
        setChats([]);
        return;
      }

      const statusRows = await Promise.all(
        connectedChannels.map(async (channel) => {
          const connectionState = await WhatsAppService.checkConnection(channel.instanceName);
          setWhatsAppChannelStatus(channel.id, connectionState);
          return { channel, connectionState };
        })
      );

      const openRows = statusRows.filter((row) => row.connectionState === 'open');
      setIsConnected(openRows.length > 0);

      if (openRows.length === 0) {
        setChats([]);
        return;
      }

      const chatsByChannel = await Promise.all(
        openRows.map(({ channel }) =>
          WhatsAppService.fetchChats(channel.instanceName, {
            channelId: channel.id,
            channelLabel: channel.label,
          })
        )
      );

      const merged = chatsByChannel.flat().sort((a, b) => {
        const tsA = a?.lastMessage?.messageTimestamp || a?.messageTimestamp || a?.conversationTimestamp || 0;
        const tsB = b?.lastMessage?.messageTimestamp || b?.messageTimestamp || b?.conversationTimestamp || 0;
        return tsB - tsA;
      });

      setChats(merged);
    };
    checkConn();
    const itv = setInterval(checkConn, 30000);
    return () => clearInterval(itv);
  }, [setIsConnected, setChats, isAuthenticated, whatsappChannels, setWhatsAppChannelStatus]);

  // AUTH: Handle logout
  const handleLogout = async () => {
    if (isSupabaseEnabled) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem('auth_token');
    localStorage.removeItem('aura_master_mode');
    setIsAuthenticated(false);
  };

  // AUTH: /app should always show login when unauthenticated
  if (!authReady) {
    return null;
  }

  if (!isAuthenticated) {
    return <LoginScreen onLogin={() => setIsAuthenticated(true)} />;
  }

  // MAIN APP: User is authenticated
  return (
    <div className={`app-container ${currentView === 'crm' ? 'crm-mode' : ''}`}>
      <Sidebar
        onOpenConfig={() => setIsConfigOpen(true)}
        onOpenConnect={() => setIsConnectOpen(true)}
        onOpenBriefing={() => setIsBriefingOpen(true)}
        onLogout={handleLogout}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* CENTRAL COLUMN: Selective rendering based on view */}
      {currentView === 'history' && <HistoryView />}
      {currentView === 'dashboard' && <ChatList onOpenMenu={() => setIsMobileMenuOpen(true)} />}
      {/* CRM view is full-width, middle column is purposely excluded */}

      <main className={`main-content ${activeChat ? 'mobile-chat-open' : 'mobile-chat-closed'}`}>
        {currentView === 'crm' ? (
          <CRMView />
        ) : activeChat ? (
          <ChatArea isArchived={currentView === 'history'} onBack={() => setActiveChat(null)} />
        ) : (
          <div className="history-placeholder glass-panel" style={{ flex: 1, margin: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <h2 style={{ color: '#86868b', opacity: 0.5 }}>
              {currentView === 'history' ? 'Selecione uma conversa arquivada' : 'Selecione uma conversa para iniciar'}
            </h2>
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
