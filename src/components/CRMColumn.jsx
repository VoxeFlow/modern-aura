import React from 'react';
import CRMCard from './CRMCard';

const CRMColumn = ({ tag, chats }) => {
    return (
        <div className="crm-column" style={{ borderTop: `3px solid ${tag.color}` }}>
            <div className="column-header">
                <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-main)' }}>
                    {tag.icon} {tag.name}
                </span>
                <span className="count" style={{
                    background: tag.color,
                    color: '#fff',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '600'
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
