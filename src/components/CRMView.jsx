import React from 'react';
import { useStore } from '../store/useStore';
import CRMColumn from './CRMColumn';

const CRMView = () => {
    const { tags, chats, chatTags, setTag, isConnected } = useStore();

    const safeChats = Array.isArray(chats) ? chats : [];
    const leadsInSession = safeChats.filter((chat) => {
        const jid = chat?.crmKey || chat?.chatKey || chat?.id || chat?.remoteJid || chat?.jid;
        return Boolean(jid && chatTags[jid]);
    });

    // Calculate stats
    const totalLeads = leadsInSession.length;
    const closedTagId = tags.find((tag) => String(tag?.name || '').toLowerCase() === 'fechado')?.id || 'fechado';
    const fechadosCount = leadsInSession.filter((chat) => {
        const jid = chat?.crmKey || chat?.chatKey || chat?.id || chat?.remoteJid || chat?.jid;
        return chatTags[jid] === closedTagId;
    }).length;
    const conversionRate = totalLeads > 0 ? Math.round((fechadosCount / totalLeads) * 100) : 0;

    return (
        <div className="crm-container" style={{ background: '#FDFDFD', height: '100%', padding: '30px', display: 'flex', flexDirection: 'column' }}>
            <div className="crm-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '35px' }}>
                <div>
                    <h2 style={{ margin: 0, color: '#1d1d1f', fontSize: '24px', fontWeight: 'bold' }}>Pipeline de Vendas</h2>
                    <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#86868b' }}>
                        Acompanhe o funil de conversão e gerencie seus leads
                    </p>
                </div>
                <div className="crm-stats" style={{ display: 'flex', gap: '20px' }}>
                    <div className="stat-card" style={{ background: 'white', padding: '15px 25px', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 10px rgba(0,0,0,0.03)', textAlign: 'right' }}>
                        <div style={{ fontSize: '11px', color: '#86868b', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '5px' }}>Total de Leads</div>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1d1d1f' }}>{totalLeads}</div>
                    </div>
                    <div className="stat-card" style={{ background: 'white', padding: '15px 25px', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 10px rgba(0,0,0,0.03)', textAlign: 'right' }}>
                        <div style={{ fontSize: '11px', color: '#86868b', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '5px' }}>Conversão</div>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--accent-primary)' }}>{conversionRate}%</div>
                    </div>
                </div>
            </div>

            {!isConnected && (
                <div style={{ marginBottom: '14px', padding: '10px 14px', borderRadius: '12px', background: '#FFF8E8', border: '1px solid #F1D9A5', color: '#8A6D3A', fontSize: '13px', fontWeight: 600 }}>
                    WhatsApp desconectado: o CRM exibe apenas os leads carregados nesta sessão.
                </div>
            )}

            <div className="crm-board">
                <div className="crm-board-track">
                    {tags.map(tag => {
                        const tagChats = chats.filter(c => {
                            const jid = c?.crmKey || c?.chatKey || c?.id || c?.remoteJid || c?.jid;
                            return chatTags[jid] === tag.id;
                        });

                        return (
                            <CRMColumn
                                key={tag.id}
                                tag={tag}
                                chats={tagChats}
                                onDropChat={(chatId) => setTag(chatId, tag.id)}
                            />
                        );
                    })}

                    {/* ADD COLUMN BUTTON */}
                    <button
                        onClick={() => useStore.getState().addCRMColumn("Nova Etapa")}
                        style={{
                            minWidth: '300px',
                            height: '60px',
                            borderRadius: '20px',
                            border: '2px dashed #E5E5E7',
                            background: 'transparent',
                            color: '#86868b',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.color = 'var(--accent-primary)'; }}
                        onMouseOut={e => { e.currentTarget.style.borderColor = '#E5E5E7'; e.currentTarget.style.color = '#86868b'; }}
                    >
                        + Adicionar Etapa
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CRMView;
