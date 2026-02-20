import React, { useEffect } from 'react';
import { useStore } from '../../../store/useStore';
import WhatsAppService from '../../../services/whatsapp';
import { CleanChatList } from '../components/CleanChatList';
import { CleanChatWindow } from '../components/CleanChatWindow';
import { QRCodeConnect } from '../components/QRCodeConnect';

const AutomationView = ({ user }) => {
    const {
        isConnected, setIsConnected,
        setChats, activeChat, setActiveChat,
        instanceName, whatsappChannels,
        setConfig // We might need this to set the instance name if missing
    } = useStore();

    // Auto-set instance name for clients if missing
    useEffect(() => {
        if (!instanceName && user?.email && user?.role === 'client') {
            const autoInstance = `monstro-${user.email.split('@')[0].replace(/[^a-z0-9]/gi, '')}`;
            // We need to set this in the store so other components can use it
            setConfig({ instanceName: autoInstance });
        }
    }, [instanceName, user, setConfig]);

    // Init Connection Check
    useEffect(() => {
        let mounted = true;
        const check = async () => {
            if (!instanceName) return;
            const status = await WhatsAppService.checkConnection(instanceName);

            if (mounted) {
                // Only act if we have a definitive status
                if (status === 'open') {
                    if (!isConnected) setIsConnected(true);

                    // Register Instance for Webhook (idempotent-ish)
                    try {
                        await fetch('/api/instances', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-User-Email': user?.email
                            },
                            body: JSON.stringify({ instanceName: instanceName })
                        });
                    } catch (e) {
                        // Silent fail on background register
                    }

                    const chats = await WhatsAppService.fetchChats(instanceName);
                    if (mounted && chats) setChats(chats);
                } else if (status === 'close' || status === 'disconnected') {
                    // Only disconnect if explicitly closed. Ignore 'connecting'.
                    if (isConnected) setIsConnected(false);
                }
            }
        };

        check(); // Initial check
        const interval = setInterval(check, 10000);
        return () => {
            mounted = false;
            clearInterval(interval);
        };
    }, [instanceName, setIsConnected, setChats]);

    // If not connected, show QR Code Connect Screen (Client Flow)
    if (!isConnected) {
        return (
            <div className="w-full h-full bg-white rounded-3xl overflow-hidden">
                <QRCodeConnect user={user} />
            </div>
        );
    }

    // If connected, show Chat Interface
    return (
        <div className="bg-white border border-gray-100 rounded-3xl shadow-sm h-[calc(100vh-140px)] flex overflow-hidden">
            {/* Chat List Sidebar */}
            <div className={`${activeChat ? 'hidden md:flex' : 'flex'} w-full md:w-80 border-r border-gray-100 flex-col bg-gray-50/50`}>
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white">
                    <h3 className="font-bold text-gray-700">Conversas</h3>
                    <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></span>
                        <span className="text-xs font-medium text-gray-400">{isConnected ? 'Online' : 'Offline'}</span>
                    </div>
                </div>
                <CleanChatList />
            </div>

            {/* Chat Area */}
            <div className={`${!activeChat ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-white relative`}>
                {activeChat ? (
                    <CleanChatWindow />
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-300">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                            <svg className="w-8 h-8 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                        </div>
                        <p className="font-medium text-sm">Selecione uma conversa para iniciar o atendimento</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AutomationView;
