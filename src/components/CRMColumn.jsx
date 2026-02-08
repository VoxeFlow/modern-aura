import React from 'react';
import CRMCard from './CRMCard';

const CRMColumn = ({ tag, chats }) => {
    return (
        <div className="crm-column glass-panel" style={{
            background: 'rgba(255,255,255,0.015)',
            border: '1px solid rgba(255,255,255,0.04)',
            borderTop: `4px solid ${tag.color}`,
            borderRadius: '24px',
            minHeight: '600px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
        }}>
            <div className="column-header" style={{ padding: '20px 25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: '800', color: 'white', display: 'flex', alignItems: 'center', gap: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <span style={{ color: tag.color, textShadow: `0 0 10px ${tag.color}44` }}>{tag.icon}</span> {tag.name}
                </span>
                <span className="count" style={{
                    background: 'rgba(255,255,255,0.05)',
                    color: tag.color,
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '800',
                    border: `1px solid ${tag.color}33`
                }}>
                    {chats.length}
                </span>
            </div>

            <div className="column-body scrollable">
                {chats.length === 0 ? (
                    <div style={{
                        padding: '40px 20px',
                        textAlign: 'center',
                        color: 'var(--text-muted)',
                        fontSize: '13px'
                    }}>
                        Nenhum lead neste estágio
                    </div>
                ) : (
                    chats.map(chat => {
                        const jid = chat.remoteJid || chat.jid || chat.id;
                        return (
                            <CRMCard
                                key={jid}
                                chat={chat}
                                tag={tag}
                            />
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default CRMColumn;
