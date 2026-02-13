import React, { useState } from 'react';
import { Search, Archive } from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatJid } from '../utils/formatter';
import { getArchivedChats } from '../utils/chatStorage';

const HistoryView = () => {
    const { chats, setActiveChat, activeChat } = useStore();
    const [searchTerm, setSearchTerm] = useState('');

    // Get archived chat IDs (tenant-scoped storage)
    const archivedChatIds = getArchivedChats();

    // Filter chats to show only archived ones
    const archivedChats = (Array.isArray(chats) ? chats : [])
        .filter(c => {
            const jid = c.remoteJid || c.jid || c.id;
            return archivedChatIds.includes(jid);
        })
        .filter(c => {
            if (!searchTerm) return true;
            const jidStr = String(c.remoteJid || c.jid || c.id || "").toLowerCase();
            const name = String(c.name || c.pushName || c.verifiedName || "").toLowerCase();
            const term = searchTerm.toLowerCase().trim();
            return name.includes(term) || jidStr.includes(term);
        })
        .sort((a, b) => {
            const tsA = a.lastMessage?.messageTimestamp || a.messageTimestamp || 0;
            const tsB = b.lastMessage?.messageTimestamp || b.messageTimestamp || 0;
            return (tsB * 1000) - (tsA * 1000);
        });

    return (
        <div className="chat-list-container glass-panel">
            <div className="list-header">
                <h2>Histórico</h2>
                <Archive size={20} style={{ color: 'var(--accent-primary)' }} />
            </div>

            <div className="search-bar">
                <Search size={16} />
                <input
                    type="text"
                    placeholder="Buscar no histórico..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="chats scrollable">
                {archivedChats.length === 0 ? (
                    <div className="empty-state" style={{ padding: '40px 20px', textAlign: 'center', opacity: 0.5 }}>
                        <Archive size={48} style={{ margin: '0 auto 15px', opacity: 0.3 }} />
                        <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                            {searchTerm ? 'Nenhum chat arquivado encontrado.' : 'Nenhum chat arquivado ainda.'}
                        </p>
                        <p style={{ fontSize: '12px', marginTop: '10px', color: 'var(--text-muted)' }}>
                            Use o botão de arquivar nas conversas para movê-las para cá.
                        </p>
                    </div>
                ) : (
                    archivedChats.map(chat => {
                        const jid = chat.remoteJid || chat.jid || chat.id;
                        const msg = chat.lastMessage?.message || chat.message || {};

                        let name = [
                            chat.name,
                            chat.pushName,
                            chat.verifiedName,
                            chat.lastMessage?.pushName,
                        ].find(n => n && n !== 'Você' && !n.includes('@lid'));

                        let photo = chat.profilePicUrl || chat.profilePictureUrl || chat.profile || chat.avatar;
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

                                            if (msg.audioMessage) return "🎵 Áudio";
                                            if (msg.imageMessage) return "📸 Imagem";
                                            if (msg.videoMessage) return "🎥 Vídeo";
                                            if (msg.documentMessage) return "📄 Documento";

                                            return formatJid(jid);
                                        })()}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default HistoryView;
