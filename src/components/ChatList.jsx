import React, { useState } from 'react';
import { Search, RefreshCw, Menu } from 'lucide-react';
import { useStore } from '../store/useStore';
import WhatsAppService from '../services/whatsapp';
import { useArchivedChats } from '../hooks/useArchivedChats';
import { getChatDisplayName, getChatJid, getChatTimestampMs } from '../utils/chatList';
import ChatListItem from './ChatListItem';

const ChatList = ({ onOpenMenu }) => {
    const { chats, setChats, activeChat, setActiveChat, isConnected } = useStore();
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const archivedChatIds = useArchivedChats();

    const loadData = async () => {
        if (loading) return;
        setLoading(true);
        try {
            const data = await WhatsAppService.fetchChats();
            if (data) setChats(data);
        } catch (e) {
            console.error("AURA ChatList Error:", e);
        }
        setLoading(false);
    };

    const filtered = (Array.isArray(chats) ? chats : [])
        .filter(c => {
            const jid = getChatJid(c);
            // Exclude archived chats from main list
            if (archivedChatIds.includes(jid)) return false;

            const jidStr = String(jid || "").toLowerCase();
            const name = String(getChatDisplayName(c) || "").toLowerCase();
            const term = String(searchTerm || "").toLowerCase().trim();
            return name.includes(term) || jidStr.includes(term);
        })
        .sort((a, b) => getChatTimestampMs(b) - getChatTimestampMs(a));

    return (
        <div className="chat-list-container glass-panel">
            <div className="list-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <button className="mobile-menu-btn" onClick={onOpenMenu} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'none' }}>
                        <Menu size={24} color="#1d1d1f" />
                    </button>
                    <h2>Mensagens</h2>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    {!isConnected && <span style={{ fontSize: '10px', color: '#ff4444' }}>Offline</span>}
                    <RefreshCw
                        size={18}
                        className={loading ? 'spin' : 'btn-refresh'}
                        onClick={loadData}
                        style={{ cursor: 'pointer' }}
                    />
                </div>
            </div>

            <div className="search-bar">
                <Search size={16} />
                <input
                    type="text"
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="chats scrollable">
                {filtered.map(chat => {
                    return (
                        <ChatListItem
                            key={String(getChatJid(chat))}
                            chat={chat}
                            activeChatId={activeChat?.id}
                            onSelect={setActiveChat}
                            includeAudioTranscription
                        />
                    );
                })}

                {filtered.length === 0 && !loading && (
                    <div className="empty-state" style={{ padding: '20px', textAlign: 'center', opacity: 0.5 }}>
                        <p>{searchTerm ? 'Nenhum contato encontrado.' : 'Nenhuma conversa carregada.'}</p>
                        {searchTerm.length > 5 && !searchTerm.includes('@') && (
                            <button
                                className="btn-force"
                                style={{ marginTop: '10px' }}
                                onClick={() => setActiveChat({ id: `${searchTerm.replace(/\D/g, '')}@s.whatsapp.net`, name: 'Busca Direta' })}
                            >
                                Buscar número: {searchTerm.replace(/\D/g, '')}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatList;
