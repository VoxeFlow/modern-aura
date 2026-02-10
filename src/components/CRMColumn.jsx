import React from 'react';
import CRMCard from './CRMCard';

const CRMColumn = ({ tag, chats }) => {
    return (
        <div className="crm-column" style={{
            background: 'white',
            borderRadius: '20px',
            padding: '20px',
            minWidth: '300px',
            border: '1px solid rgba(0,0,0,0.05)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: '15px'
        }}>
            <div className="column-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px' }}>
                <span style={{ fontSize: '14px', fontWeight: '800', color: '#1d1d1f', display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: tag.color }}></div>
                    <input
                        type="text"
                        defaultValue={tag.name}
                        onBlur={(e) => {
                            if (e.target.value !== tag.name) {
                                // Assuming we'll pass an update function or use store directly
                                const { useStore } = require('../store/useStore');
                                useStore.getState().updateCRMColumn(tag.id, { name: e.target.value });
                            }
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') e.target.blur();
                        }}
                        style={{
                            border: 'none',
                            background: 'transparent',
                            fontSize: '14px',
                            fontWeight: '800',
                            color: '#1d1d1f',
                            outline: 'none',
                            width: '100%',
                            cursor: 'text'
                        }}
                    />
                </span>
                <span className="count" style={{
                    background: 'rgba(0,0,0,0.03)',
                    color: '#86868b',
                    padding: '4px 12px',
                    borderRadius: '100px',
                    fontSize: '11px',
                    fontWeight: 'bold'
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
