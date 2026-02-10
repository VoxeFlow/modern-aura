import React, { useState } from 'react';
import { MessageCircle, Brain } from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatJid } from '../utils/formatter';
import OpenAIService from '../services/openai';

const CRMCard = ({ chat, tag }) => {
    const { setActiveChat, chatNextSteps, setNextSteps, messages } = useStore();
    const [analyzing, setAnalyzing] = useState(false);

    const jid = chat.remoteJid || chat.jid || chat.id;
    const msg = chat.lastMessage?.message || chat.message || {};

    let name = [
        chat.name,
        chat.pushName,
        chat.verifiedName,
        chat.lastMessage?.pushName,
    ].find(n => n && n !== 'Você' && !n.includes('@lid'));

    const patientName = name || formatJid(jid);

    // Get last message preview
    const lastMessage = (() => {
        const content = msg.conversation ||
            msg.extendedTextMessage?.text ||
            msg.imageMessage?.caption || "";

        if (content) return content.length > 60 ? content.substring(0, 60) + "..." : content;
        if (msg.audioMessage) return "🎵 Áudio";
        if (msg.imageMessage) return "📸 Imagem";
        return "Sem mensagens recentes";
    })();

    // Time ago calculation
    const getTimeAgo = () => {
        const ts = chat.lastMessage?.messageTimestamp || chat.messageTimestamp || 0;
        const now = Date.now();
        const diff = now - (ts * 1000);

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 60) return `${minutes}m atrás`;
        if (hours < 24) return `${hours}h atrás`;
        return `${days}d atrás`;
    };

    const nextSteps = chatNextSteps[jid];

    const handleAnalyze = async (e) => {
        e.stopPropagation();
        setAnalyzing(true);

        try {
            // Format chat history for AI
            const chatHistory = messages
                .map(m => {
                    const isFromMe = m.key?.fromMe;
                    const text = m.message?.conversation ||
                        m.message?.extendedTextMessage?.text ||
                        '[Mídia]';
                    return `${isFromMe ? 'Clínica' : patientName}: ${text}`;
                })
                .join('\n');

            const result = await OpenAIService.analyzeNextSteps(
                chatHistory || 'Conversa ainda não carregada',
                patientName,
                tag.name
            );

            setNextSteps(jid, result);
        } catch (error) {
            console.error('Error analyzing next steps:', error);
        } finally {
            setAnalyzing(false);
        }
    };

    const handleOpenChat = () => {
        setActiveChat({ id: jid, name: patientName });
        useStore.getState().setCurrentView('dashboard');
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'high': return '#ef4444';
            case 'medium': return '#f59e0b';
            case 'low': return '#10b981';
            default: return '#6b7280';
        }
    };

    const getPriorityLabel = (priority) => {
        switch (priority) {
            case 'high': return '🔴 Alta';
            case 'medium': return '🟡 Média';
            case 'low': return '🟢 Baixa';
            default: return 'Normal';
        }
    };

    return (
        <div className="crm-card" onClick={handleOpenChat}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: 'var(--text-main)' }}>
                    {patientName}
                </h4>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {getTimeAgo()}
                </span>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 10px 0', lineHeight: '1.4' }}>
                {lastMessage}
            </p>

            {nextSteps && (
                <div className="next-steps" style={{
                    background: '#f8fafc',
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '10px',
                    fontSize: '12px',
                    border: '1px solid #e2e8f0'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontWeight: '800', color: '#1d1d1f', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.5px' }}>
                            ANÁLISE AURA
                        </span>
                        {/* TEMPERATURE BADGE */}
                        {nextSteps.temperature && (
                            <span style={{
                                fontSize: '10px',
                                fontWeight: 'bold',
                                padding: '2px 8px',
                                borderRadius: '10px',
                                background: nextSteps.temperature === 'quente' ? '#fee2e2' : (nextSteps.temperature === 'frio' ? '#e2e8f0' : '#fef3c7'),
                                color: nextSteps.temperature === 'quente' ? '#ef4444' : (nextSteps.temperature === 'frio' ? '#64748b' : '#d97706')
                            }}>
                                {nextSteps.temperature === 'quente' ? '🔥 QUENTE' : (nextSteps.temperature === 'frio' ? '❄️ FRIO' : '🌡️ MORNO')}
                            </span>
                        )}
                    </div>

                    {/* SUMMARY */}
                    {nextSteps.summary && (
                        <div style={{ marginBottom: '8px', fontStyle: 'italic', color: '#475569', lineHeight: '1.4' }}>
                            "{nextSteps.summary}"
                        </div>
                    )}

                    <h5 style={{ margin: '8px 0 4px 0', fontSize: '10px', fontWeight: 'bold', color: '#64748b' }}>
                        SUGESTÃO:
                    </h5>
                    <ul style={{ margin: '0', paddingLeft: '15px', color: '#334155' }}>
                        {nextSteps.steps?.map((step, i) => (
                            <li key={i} style={{ marginBottom: '3px', lineHeight: '1.4' }}>{step}</li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="card-actions" style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button
                    onClick={handleOpenChat}
                    style={{
                        flex: 1,
                        padding: '8px',
                        background: 'var(--accent-primary)',
                        color: '#000',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px'
                    }}
                >
                    <MessageCircle size={14} />
                    Abrir
                </button>
                <button
                    onClick={handleAnalyze}
                    disabled={analyzing}
                    style={{
                        flex: 1,
                        padding: '8px',
                        background: analyzing ? '#e5e7eb' : '#3b82f6',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: analyzing ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        opacity: analyzing ? 0.6 : 1
                    }}
                >
                    <Brain size={14} />
                    {analyzing ? 'Analisando...' : 'Analisar'}
                </button>
            </div>
        </div>
    );
};

export default CRMCard;
