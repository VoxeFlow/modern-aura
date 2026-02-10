import React, { useState } from 'react';
import { Search, RefreshCw, Menu } from 'lucide-react';
import { useStore } from '../store/useStore';
import WhatsAppService from '../services/whatsapp';
import { formatJid } from '../utils/formatter';

const ChatList = ({ onOpenMenu }) => {
    const { chats, setChats, activeChat, setActiveChat, isConnected } = useStore();
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

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

    const getTimestamp = (c) => {
        const ts = c.lastMessage?.messageTimestamp || c.messageTimestamp || c.conversationTimestamp || 0;
        return ts * 1000;
    };

    // Filter out archived chats
    const archivedChats = JSON.parse(localStorage.getItem('archived_chats') || '[]');

    const filtered = (Array.isArray(chats) ? chats : [])
        .filter(c => {
            const jid = c.remoteJid || c.jid || c.id;
            // Exclude archived chats from main list
            if (archivedChats.includes(jid)) return false;

            const jidStr = String(jid || "").toLowerCase();
            const name = String(c.name || c.pushName || c.verifiedName || "").toLowerCase();
            const term = String(searchTerm || "").toLowerCase().trim();
            return name.includes(term) || jidStr.includes(term);
        })
        .sort((a, b) => getTimestamp(b) - getTimestamp(a));

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
                    const jid = chat.remoteJid || chat.jid || chat.id;
                    const msg = chat.lastMessage?.message || chat.message || {};

                    // Trusts the name already resolved by the service layer
                    const name = chat.name || formatJid(jid);
                    const photo = chat.profilePicUrl || chat.profilePictureUrl || chat.profile || chat.avatar;
                    const hasName = name && name !== String(jid).split('@')[0];

                    return (
                        <div
                            key={String(jid)}
                            className={`chat-item ${activeChat?.id === jid ? 'active' : ''}`}
                            onClick={() => setActiveChat({ id: jid, name: name || formatJid(jid) })}
                        >
                            <div className="avatar">
                                {photo ? (
                                    <img src={photo} alt={name || 'Avatar'} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                ) : (
                                    (name || '#')[0]?.toUpperCase()
                                )}
                            </div>
                            <div className="info">
                                <div className="chat-main-header" style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
                                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', textAlign: 'left' }}>
                                        {hasName ? name : formatJid(jid)}
                                    </h4>
                                    {hasName && !jid.includes('@lid') && (
                                        <span style={{ fontSize: '11px', opacity: 0.6, fontWeight: '400', textAlign: 'left' }}>
                                            {formatJid(jid)}
                                        </span>
                                    )}
                                </div>
                                <p className="chat-preview">
                                    {(() => {
                                        const content = msg.conversation ||
                                            msg.extendedTextMessage?.text ||
                                            msg.imageMessage?.caption ||
                                            chat.lastMessage?.content || "";

                                        if (content) return content.length > 35 ? content.substring(0, 35) + "..." : content;

                                        if (msg.audioMessage) {
                                            const trans = msg.audioMessage?.contextInfo?.transcription || msg.audioMessage?.transcription;
                                            return trans ? `🎵 ${trans}` : "🎵 Áudio";
                                        }
                                        if (msg.imageMessage) return "📸 Imagem";
                                        if (msg.videoMessage) return "🎥 Vídeo";
                                        if (msg.documentMessage) return "📄 Documento";
                                        if (msg.stickerMessage) return "✨ Figurinha";

                                        return formatJid(jid);
                                    })()}
                                </p>
                            </div>
                        </div>
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
