import React from 'react';
import { useStore } from '../store/useStore';
import CRMColumn from './CRMColumn';

const CRMView = () => {
    const { tags, chats, chatTags } = useStore();

    // Calculate stats
    const totalLeads = Object.keys(chatTags).length;
    const fechadosCount = Object.values(chatTags).filter(t => t === 'fechado').length;
    const conversionRate = totalLeads > 0 ? Math.round((fechadosCount / totalLeads) * 100) : 0;

    return (
        <div className="crm-container">
            <div className="crm-header">
                <div>
                    <h2 style={{ margin: 0, color: 'var(--text-main)' }}>Pipeline de Vendas</h2>
                    <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: 'var(--text-muted)' }}>
                        Gerencie seus leads e acompanhe o funil de conversão
                    </p>
                </div>
                <div className="crm-stats">
                    <div className="stat-item">
                        <span className="stat-label">Total de Leads</span>
                        <span className="stat-value">{totalLeads}</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">Taxa de Conversão</span>
                        <span className="stat-value" style={{ color: 'var(--accent-primary)' }}>{conversionRate}%</span>
                    </div>
                </div>
            </div>

            <div className="crm-board">
                {tags.map(tag => {
                    const tagChats = chats.filter(c => {
                        const jid = c.remoteJid || c.jid || c.id;
                        return chatTags[jid] === tag.id;
                    });

                    return (
                        <CRMColumn
                            key={tag.id}
                            tag={tag}
                            chats={tagChats}
                        />
                    );
                })}
            </div>
        </div>
    );
};

export default CRMView;
