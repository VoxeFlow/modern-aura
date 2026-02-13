import React, { useState } from 'react';
import { Search, RefreshCw, Menu } from 'lucide-react';
import { useStore } from '../store/useStore';
import WhatsAppService from '../services/whatsapp';
import { useArchivedChats } from '../hooks/useArchivedChats';
import { getChatDisplayName, getChatJid, getChatTimestampMs } from '../utils/chatList';
import ChatListItem from './ChatListItem';
import { isScopedInstanceName, loadConversationSummaries, loadLeadTagMap, persistChatsSnapshot } from '../services/tenantData';

const ChatList = ({ onOpenMenu }) => {
    const { chats, setChats, activeChat, setActiveChat, isConnected, whatsappChannels, setWhatsAppChannelStatus, switchWhatsAppChannel, tenantId, tenantSlug, setChatTags } = useStore();
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [channelFilter, setChannelFilter] = useState('all');
    const archivedChatIds = useArchivedChats();

    const loadData = async () => {
        if (loading) return;
        setLoading(true);
        try {
            if (tenantId) {
                try {
                    const summaries = await loadConversationSummaries(tenantId);
                    if (Array.isArray(summaries)) {
                        setChats(summaries);
                    }
                    const leadMap = await loadLeadTagMap(tenantId);
                    setChatTags(leadMap);
                } catch (error) {
                    console.error('AURA tenant inbox refresh error:', error);
                }
            }

            const channels = Array.isArray(whatsappChannels) ? whatsappChannels : [];
            const connectedChannels = channels.filter((channel) => {
                const instance = String(channel.instanceName || '').trim();
                if (!instance) return false;
                return isScopedInstanceName(tenantSlug, instance);
            });
            if (connectedChannels.length === 0) {
                if (!tenantId) setChats([]);
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
            if (openRows.length === 0) {
                if (!tenantId) setChats([]);
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

            const merged = chatsByChannel.flat().sort((a, b) => getChatTimestampMs(b) - getChatTimestampMs(a));
            setChats(merged);
            if (tenantId) {
                persistChatsSnapshot({ tenantId, chats: merged }).catch((error) => {
                    console.error('AURA tenant persist snapshot error:', error);
                });
            }
        } catch (e) {
            console.error("AURA ChatList Error:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectChat = (chat) => {
        if (chat?.channelId) {
            switchWhatsAppChannel(chat.channelId);
        }
        setActiveChat(chat);
    };

    const filtered = (Array.isArray(chats) ? chats : [])
        .filter(c => {
            const jid = getChatJid(c);
            // Exclude archived chats from main list
            if (archivedChatIds.includes(jid)) return false;

            if (channelFilter !== 'all' && c?.channelId !== channelFilter) return false;

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

            <div style={{ display: 'flex', gap: 8, padding: '0 16px 10px', overflowX: 'auto' }}>
                <button
                    type="button"
                    onClick={() => setChannelFilter('all')}
                    style={{
                        height: 30,
                        borderRadius: 999,
                        border: channelFilter === 'all' ? '1px solid #c5a059' : '1px solid #d9dbe1',
                        background: channelFilter === 'all' ? '#f8f1e4' : '#fff',
                        color: channelFilter === 'all' ? '#8a6d3a' : '#5d6169',
                        fontSize: 12,
                        fontWeight: 600,
                        padding: '0 12px',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                    }}
                >
                    Todas
                </button>

                {(Array.isArray(whatsappChannels) ? whatsappChannels : []).map((channel) => (
                    <button
                        key={channel.id}
                        type="button"
                        onClick={() => setChannelFilter(channel.id)}
                        style={{
                            height: 30,
                            borderRadius: 999,
                            border: channelFilter === channel.id ? '1px solid #c5a059' : '1px solid #d9dbe1',
                            background: channelFilter === channel.id ? '#f8f1e4' : '#fff',
                            color: channelFilter === channel.id ? '#8a6d3a' : '#5d6169',
                            fontSize: 12,
                            fontWeight: 600,
                            padding: '0 12px',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {channel.label}
                    </button>
                ))}
            </div>

            <div className="chats scrollable">
                {filtered.map(chat => {
                    return (
                        <ChatListItem
                            key={String(chat?.chatKey || getChatJid(chat))}
                            chat={chat}
                            activeChatId={activeChat?.chatKey || activeChat?.id}
                            onSelect={handleSelectChat}
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
