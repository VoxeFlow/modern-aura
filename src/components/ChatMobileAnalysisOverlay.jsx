import React from 'react';
import { Bot, Wand2 } from 'lucide-react';

const ChatMobileAnalysisOverlay = ({ isOpen, onClose, analysisData, handleAnalyze }) => {
    if (!isOpen) return null;

    return (
        <div className="sidebar-overlay open" onClick={onClose} style={{ zIndex: 2000 }}>
            <div
                className="glass-panel"
                style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    width: '100%',
                    maxHeight: '80vh',
                    borderTopLeftRadius: '25px',
                    borderTopRightRadius: '25px',
                    padding: '30px 20px',
                    overflowY: 'auto',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div
                    style={{ width: '40px', height: '5px', background: '#ccc', borderRadius: '5px', margin: '0 auto 20px auto' }}
                    onClick={onClose}
                />
                <h2 style={{ marginBottom: '20px', fontSize: '20px', textAlign: 'center' }}>Análise Estratégica</h2>

                {analysisData.level ? (
                    <div className="analysis-content">
                        <div style={{ marginBottom: '15px', background: 'rgba(0,0,0,0.03)', padding: '15px', borderRadius: '12px' }}>
                            <h4 style={{ color: 'var(--accent-primary)', fontSize: '11px', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>Nível de Consciência</h4>
                            <p style={{ fontSize: '15px', lineHeight: '1.4' }}>{analysisData.level}</p>
                        </div>
                        <div style={{ marginBottom: '15px', background: 'rgba(0,0,0,0.03)', padding: '15px', borderRadius: '12px' }}>
                            <h4 style={{ color: 'var(--accent-primary)', fontSize: '11px', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>Intenção do Lead</h4>
                            <p style={{ fontSize: '15px', lineHeight: '1.4' }}>{analysisData.intent}</p>
                        </div>
                        <div style={{ background: 'rgba(0,0,0,0.03)', padding: '15px', borderRadius: '12px' }}>
                            <h4 style={{ color: 'var(--accent-primary)', fontSize: '11px', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>Estratégia Recomendada</h4>
                            <p style={{ fontSize: '15px', lineHeight: '1.4' }}>{analysisData.strategy}</p>
                        </div>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '40px 0', opacity: 0.5 }}>
                        <Bot size={40} style={{ marginBottom: '10px' }} />
                        <p>Nenhuma análise disponível.<br />Clique em "Analisar Conversa" abaixo.</p>
                    </div>
                )}

                <button
                    className="btn-primary v3-btn"
                    onClick={() => {
                        handleAnalyze();
                        onClose();
                    }}
                    style={{ width: '100%', marginTop: '30px', height: '54px', borderRadius: '16px', fontWeight: 'bold' }}
                >
                    <Wand2 size={20} /> Analisar agora
                </button>
            </div>
        </div>
    );
};

export default ChatMobileAnalysisOverlay;
