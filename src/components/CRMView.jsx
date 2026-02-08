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
        <div className="crm-container" style={{ background: 'linear-gradient(145deg, #0F0F11, #050505)', padding: '40px', minHeight: '100%' }}>
            <div className="crm-header" style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '25px' }}>
                <div>
                    <h2 style={{ margin: 0, color: 'white', fontSize: '28px', fontWeight: '800', letterSpacing: '-0.5px' }}>Pipeline de Vendas</h2>
                    <p style={{ margin: '8px 0 0 0', fontSize: '15px', color: 'rgba(255,255,255,0.4)', fontWeight: '500' }}>
                        Acompanhamento inteligente de leads em tempo real
                    </p>
                </div>
                <div className="crm-stats" style={{ display: 'flex', gap: '30px' }}>
                    <div className="stat-item" style={{ textAlign: 'right' }}>
                        <span className="stat-label" style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>Total de Leads</span>
                        <span className="stat-value" style={{ fontSize: '24px', fontWeight: '700', color: 'white' }}>{totalLeads}</span>
                    </div>
                    <div className="stat-item" style={{ textAlign: 'right' }}>
                        <span className="stat-label" style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>Taxa de Conversão</span>
                        <span className="stat-value" style={{ fontSize: '24px', fontWeight: '700', color: 'var(--accent-primary)', textShadow: '0 0 15px rgba(197, 160, 89, 0.3)' }}>{conversionRate}%</span>
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
