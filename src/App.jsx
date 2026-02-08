import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatList from './components/ChatList';
import ChatArea from './components/ChatArea';
import ConfigModal from './components/ConfigModal';
import ConnectModal from './components/ConnectModal';
import BriefingModal from './components/BriefingModal';
import HistoryView from './components/HistoryView';
import CRMView from './components/CRMView'; // Added CRMView import
import { useStore } from './store/useStore';
import WhatsAppService from './services/whatsapp';

const App = () => {
  const { isConnected, setIsConnected, currentView, briefing, setChats } = useStore();
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isConnectOpen, setIsConnectOpen] = useState(false);
  const [isBriefingOpen, setIsBriefingOpen] = useState(false);

  useEffect(() => {
    // Check if briefing is empty and trigger onboarding
    if (!briefing || briefing.trim() === '') {
      setTimeout(() => setIsBriefingOpen(true), 1500);
    }
  }, [briefing]);

  useEffect(() => {
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
  }, [setIsConnected, setChats]);

  return (
    <div className="app-container">
      <Sidebar
        onOpenConfig={() => setIsConfigOpen(true)}
        onOpenConnect={() => setIsConnectOpen(true)}
        onOpenBriefing={() => setIsBriefingOpen(true)}
      />
      {currentView === 'history' ? <HistoryView /> : currentView === 'crm' ? null : <ChatList />}
      <main className="main-content">
        {currentView === 'dashboard' ? <ChatArea /> :
          currentView === 'crm' ? <CRMView /> :
            currentView === 'history' ? <ChatArea isArchived={true} /> : (
              <div className="history-placeholder glass-panel" style={{ flex: 1, margin: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <h2 style={{ color: 'white', opacity: 0.5 }}>Selecione uma conversa arquivada</h2>
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
