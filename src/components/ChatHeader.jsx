import React from 'react';
import { ChevronLeft, Pencil, Wand2, Archive, Tag } from 'lucide-react';
import { formatJid } from '../utils/formatter';
import { useStore } from '../store/useStore';

const ChatHeader = ({
    activeChat,
    chatTags,
    tags,
    isArchived,
    onBack,
    onOpenAnalysis,
    onTag,
    onArchive,
    onUnarchive,
}) => {
    const activeChannel = useStore((state) => state.getActiveWhatsAppChannel());
    const displayJid = activeChat?.chatJid || activeChat?.sendTargetJid || activeChat?.remoteJid || activeChat?.jid || activeChat?.id;
    const channelLabel = activeChat?.channelLabel || activeChannel?.label;
    return (
        <header className="chat-header glass-panel">
            <div className="active-info" style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                        className="mobile-back-btn"
                        onClick={onBack}
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'none', marginRight: '5px' }}
                    >
                        <ChevronLeft size={24} color="var(--accent-primary)" />
                    </button>
                    <h3 style={{ margin: 0 }}>
                        {activeChat.name && activeChat.name !== formatJid(displayJid) ? activeChat.name : formatJid(displayJid)}
                    </h3>
                    {chatTags[activeChat.id] && (() => {
                        const tag = tags.find((item) => item.id === chatTags[activeChat.id]);
                        if (!tag) return null;
                        return (
                            <span
                                style={{
                                    fontSize: '11px',
                                    background: `${tag.color}33`,
                                    color: tag.color,
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    border: `1px solid ${tag.color}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontWeight: '600',
                                }}
                            >
                                {tag.icon} {tag.name}
                            </span>
                        );
                    })()}
                    {channelLabel && (
                        <span
                            style={{
                                fontSize: '11px',
                                background: 'rgba(29,32,38,0.07)',
                                color: '#4a4a4c',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                border: '1px solid rgba(0,0,0,0.12)',
                                fontWeight: 600,
                            }}
                        >
                            Canal: {channelLabel}
                        </span>
                    )}


                </div>
            </div>
            <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <button
                    className="mobile-analysis-btn"
                    onClick={onOpenAnalysis}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', display: 'none', cursor: 'pointer', padding: '5px' }}
                >
                    <Wand2 size={22} />
                </button>
                {isArchived ? (
                    <button
                        className="icon-btn"
                        title="Desarquivar"
                        onClick={onUnarchive}
                        style={{ background: 'none', border: 'none', color: 'var(--success)', cursor: 'pointer' }}
                    >
                        <Archive size={20} />
                    </button>
                ) : (
                    <>
                        <button
                            className="icon-btn"
                            title="Etiquetar"
                            onClick={onTag}
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                        >
                            <Tag size={20} />
                        </button>
                        <button
                            className="icon-btn"
                            title="Arquivar"
                            onClick={onArchive}
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                        >
                            <Archive size={20} />
                        </button>
                    </>
                )}
            </div>
        </header>
    );
};

export default ChatHeader;
