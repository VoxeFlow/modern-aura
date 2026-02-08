import React, { useState } from 'react';
import { X, ArrowRight, Save, Sparkles, Brain } from 'lucide-react';
import { useStore } from '../store/useStore';

const BriefingModal = ({ isOpen, onClose }) => {
    const { briefing, setConfig } = useStore();
    const [status, setStatus] = useState('idle'); // idle, asking, thinking, finished
    const [currentQuestion, setCurrentQuestion] = useState("Para começarmos: Qual o nome da sua empresa e o que exatamente vocês fazem?");
    const [currentAnswer, setCurrentAnswer] = useState("");
    const [history, setHistory] = useState([]); // Array of { q, a }
    const [isSaving, setIsSaving] = useState(false);

    if (!isOpen) return null;

    const handleNext = async () => {
        if (!currentAnswer.trim()) return;

        const newHistory = [...history, { q: currentQuestion, a: currentAnswer }];
        setHistory(newHistory);
        setCurrentAnswer("");
        setStatus('thinking');

        try {
            const { default: OpenAIService } = await import('../services/openai');
            const nextQ = await OpenAIService.generateNextBriefingQuestion(newHistory);

            if (nextQ.includes("COMPLETE") || newHistory.length >= 10) {
                setStatus('finished');
            } else {
                setCurrentQuestion(nextQ);
                setStatus('idle');
            }
        } catch (e) {
            console.error("AURA: Erro ao gerar próxima pergunta", e);
            setStatus('finished');
        }
    };

    const handleFinish = () => {
        setIsSaving(true);
        // Map history to a structured string that AI can parse easily
        const knowledgeBase = history.map(h => `PERGUNTA: ${h.q}\nRESPOSTA: ${h.a}`).join('\n\n');

        setConfig({ briefing: knowledgeBase });
        setIsSaving(false);
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="modal-content glass-panel" style={{ width: '90%', maxWidth: '650px', padding: '0', maxHeight: '90vh', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                <div className="briefing-header" style={{
                    padding: '30px',
                    background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                    borderBottom: '1px solid var(--glass-border)',
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <div style={{ padding: '10px', background: 'rgba(255,255,255,0.2)', borderRadius: '12px' }}>
                                <Brain size={32} color="white" />
                            </div>
                            <div>
                                <h2 style={{ color: 'white', margin: 0 }}>Arquiteto de IA Aura</h2>
                                <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0, fontSize: '13px' }}>Construindo o cérebro personalizado do seu negócio</p>
                            </div>
                        </div>
                        <X size={24} color="white" onClick={onClose} style={{ cursor: 'pointer' }} />
                    </div>
                </div>

                <div className="briefing-body" style={{ padding: '40px' }}>

                    {status === 'finished' ? (
                        <div style={{ textAlign: 'center', padding: '20px' }}>
                            <div style={{ width: '80px', height: '80px', background: 'rgba(197, 160, 89, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                                <Sparkles size={40} color="var(--accent-primary)" />
                            </div>
                            <h3 style={{ fontSize: '24px', marginBottom: '10px' }}>Inteligência Mapeada!</h3>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>
                                Já tenho detalhes suficientes para transformar seu atendimento em uma máquina de vendas.
                                Explore as respostas sugeridas e veja a mágica acontecer.
                            </p>
                            <button className="btn-primary" onClick={handleFinish} style={{ width: '100%', padding: '15px' }}>
                                Começar Agora <ArrowRight size={18} />
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="question-area" style={{ minHeight: '180px' }}>
                                <span style={{ color: 'var(--accent-primary)', fontWeight: 'bold', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '2px' }}>
                                    Entrevista em andamento • {history.length + 1}ª Pergunta
                                </span>
                                <h3 style={{ margin: '15px 0 25px 0', fontSize: '20px', lineHeight: '1.4' }}>
                                    {status === 'thinking' ? "Processando informações..." : currentQuestion}
                                </h3>

                                <textarea
                                    autoFocus
                                    value={currentAnswer}
                                    onChange={(e) => setCurrentAnswer(e.target.value)}
                                    placeholder="Responda aqui com detalhes..."
                                    disabled={status === 'thinking'}
                                    style={{
                                        width: '100%',
                                        background: '#ffffff',
                                        border: '1px solid rgba(0, 0, 0, 0.1)',
                                        borderRadius: '16px',
                                        padding: '20px',
                                        color: 'var(--text-main)',
                                        fontSize: '16px',
                                        minHeight: '130px',
                                        outline: 'none',
                                        resize: 'none',
                                        opacity: status === 'thinking' ? 0.5 : 1,
                                        transition: 'all 0.3s'
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleNext();
                                        }
                                    }}
                                />
                                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>Pressione Enter para enviar • Shift+Enter para nova linha</p>
                            </div>

                            <div className="briefing-footer" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '30px', gap: '15px' }}>
                                {history.length > 2 && (
                                    <button
                                        className="btn-secondary"
                                        onClick={() => setStatus('finished')}
                                        style={{ padding: '12px 20px', fontSize: '13px' }}
                                    >
                                        Finalizar com o que já sei
                                    </button>
                                )}
                                <button
                                    className="btn-primary"
                                    onClick={handleNext}
                                    disabled={!currentAnswer.trim() || status === 'thinking'}
                                    style={{ padding: '12px 30px' }}
                                >
                                    {status === 'thinking' ? 'Analisando...' : 'Próxima'} <ArrowRight size={18} />
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BriefingModal;
