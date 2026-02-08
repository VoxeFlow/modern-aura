import React, { useState, useEffect } from 'react';
import { X, ArrowRight, Save, Sparkles, Brain, Edit2, Check, RefreshCw, Plus } from 'lucide-react';
import { useStore } from '../store/useStore';

const BriefingModal = ({ isOpen, onClose }) => {
    const { briefing, knowledgeBase, setConfig, setKnowledgeBase } = useStore();
    const [view, setView] = useState('dashboard'); // interview, dashboard
    const [status, setStatus] = useState('idle');
    const [currentQuestion, setCurrentQuestion] = useState("Para começarmos: Qual o nome da sua empresa e o que exatamente vocês fazem?");
    const [currentAnswer, setCurrentAnswer] = useState("");
    const [editingId, setEditingId] = useState(null);
    const [tempAnswer, setTempAnswer] = useState("");

    // Initialize view based on data presence
    useEffect(() => {
        if (isOpen) {
            if (!knowledgeBase || knowledgeBase.length === 0) {
                setView('interview');
            } else {
                setView('dashboard');
            }
        }
    }, [isOpen, knowledgeBase]);

    if (!isOpen) return null;

    const handleNextInterview = async () => {
        if (!currentAnswer.trim()) return;

        setStatus('thinking');
        try {
            const { default: OpenAIService } = await import('../services/openai');

            // 1. Generate strategic analysis for this point
            const analysis = await OpenAIService.analyzeKnowledgePoint(currentQuestion, currentAnswer);

            const newItem = {
                id: Date.now(),
                q: currentQuestion,
                a: currentAnswer,
                analysis
            };

            const currentKB = knowledgeBase || [];
            const newKB = [...currentKB, newItem];
            setKnowledgeBase(newKB);
            setCurrentAnswer("");

            // 2. Decide next question
            const nextQ = await OpenAIService.generateNextBriefingQuestion(newKB);

            if (nextQ.includes("COMPLETE") || newKB.length >= 10) {
                setStatus('idle');
                setView('dashboard');
                syncBriefingText(newKB);
            } else {
                setCurrentQuestion(nextQ);
                setStatus('idle');
            }
        } catch (e) {
            console.error("AURA: Error in interview step", e);
            setStatus('idle');
        }
    };

    const syncBriefingText = (kb) => {
        const currentKB = kb || [];
        const text = currentKB.map(h => `[P]: ${h.q}\n[R]: ${h.a}`).join('\n\n');
        setConfig({ briefing: text });
    };

    const handleUpdatePoint = async (id) => {
        const currentKB = knowledgeBase || [];
        const point = currentKB.find(k => k.id === id);
        if (!point) return;

        setStatus('thinking');
        try {
            const { default: OpenAIService } = await import('../services/openai');
            const analysis = await OpenAIService.analyzeKnowledgePoint(point.q, tempAnswer);

            const newKB = currentKB.map(item =>
                item.id === id ? { ...item, a: tempAnswer, analysis } : item
            );

            setKnowledgeBase(newKB);
            syncBriefingText(newKB);
            setEditingId(null);
            setStatus('idle');
        } catch (e) {
            setStatus('idle');
        }
    };

    const safeKB = knowledgeBase || [];

    return (
        <div className="modal-overlay" onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', zIndex: 1000 }}>
            <div className="modal-content glass-panel" style={{ width: '95%', maxWidth: '800px', padding: '0', maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="briefing-header" style={{
                    padding: '25px 35px',
                    background: 'linear-gradient(135deg, #1a1a1a, #000000)',
                    borderBottom: '1px solid var(--glass-border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ padding: '10px', background: 'rgba(197, 160, 89, 0.2)', borderRadius: '12px', border: '1px solid rgba(197, 160, 89, 0.3)' }}>
                            <Brain size={30} color="var(--accent-primary)" />
                        </div>
                        <div>
                            <h2 style={{ color: 'white', margin: 0, fontSize: '20px' }}>Dashboard de Inteligência Aura</h2>
                            <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0, fontSize: '12px' }}>Gestão estratégica do conhecimento do seu negócio</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        {view === 'dashboard' && (
                            <button
                                onClick={() => setView('interview')}
                                style={{ background: 'rgba(197, 160, 89, 0.1)', color: 'var(--accent-primary)', border: '1px solid var(--accent-primary)', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}
                            >
                                <Plus size={16} /> Alimentar IA
                            </button>
                        )}
                        <X size={24} color="rgba(255,255,255,0.5)" onClick={onClose} style={{ cursor: 'pointer' }} />
                    </div>
                </div>

                {/* Content Area */}
                <div className="briefing-body" style={{ padding: '35px', overflowY: 'auto', flex: 1, background: 'rgba(255,255,255,0.02)' }}>

                    {view === 'interview' ? (
                        <div className="interview-flow">
                            <div className="question-area" style={{ minHeight: '200px' }}>
                                <span style={{ color: 'var(--accent-primary)', fontWeight: 'bold', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '2px', display: 'block', marginBottom: '10px' }}>
                                    Entrevista Aura • Inteligência Adaptativa
                                </span>
                                <h3 style={{ margin: '0 0 30px 0', fontSize: '22px', color: 'white', lineHeight: '1.4' }}>
                                    {status === 'thinking' ? "Aura está processando..." : currentQuestion}
                                </h3>

                                <textarea
                                    autoFocus
                                    value={currentAnswer}
                                    onChange={(e) => setCurrentAnswer(e.target.value)}
                                    placeholder="Explique com detalhes para que a IA aprenda..."
                                    disabled={status === 'thinking'}
                                    style={{
                                        width: '100%',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid var(--glass-border)',
                                        borderRadius: '16px',
                                        padding: '20px',
                                        color: 'white',
                                        fontSize: '16px',
                                        minHeight: '150px',
                                        outline: 'none',
                                        resize: 'none',
                                        opacity: status === 'thinking' ? 0.5 : 1,
                                        transition: 'all 0.3s'
                                    }}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '30px', gap: '15px' }}>
                                {safeKB.length > 0 && (
                                    <button className="btn-secondary" onClick={() => setView('dashboard')} style={{ padding: '12px 25px' }}>Ir para o Dashboard</button>
                                )}
                                <button
                                    className="btn-primary"
                                    onClick={handleNextInterview}
                                    disabled={!currentAnswer.trim() || status === 'thinking'}
                                    style={{ padding: '12px 40px', background: 'var(--accent-primary)', color: 'black', fontWeight: 'bold' }}
                                >
                                    {status === 'thinking' ? <RefreshCw className="spin" size={20} /> : 'Próxima Passo'} <ArrowRight size={18} />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="knowledge-dashboard">
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
                                {safeKB.map((point) => (
                                    <div key={point.id} className="knowledge-card glass-panel" style={{ padding: '20px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: '15px', position: 'relative', transition: 'transform 0.2s' }}>
                                        <div style={{ marginBottom: '15px' }}>
                                            <label style={{ fontSize: '10px', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>Questão Estratégica</label>
                                            <p style={{ margin: '5px 0 0', color: 'rgba(255,255,255,0.9)', fontSize: '14px', fontWeight: '600' }}>{point.q}</p>
                                        </div>

                                        <div style={{ marginBottom: '20px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Resposta do Negócio</label>
                                                {editingId === point.id ? (
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <Check size={16} color="#4ade80" style={{ cursor: 'pointer' }} onClick={() => handleUpdatePoint(point.id)} />
                                                        <X size={16} color="#f87171" style={{ cursor: 'pointer' }} onClick={() => setEditingId(null)} />
                                                    </div>
                                                ) : (
                                                    <Edit2 size={14} color="rgba(255,255,255,0.3)" style={{ cursor: 'pointer' }} onClick={() => {
                                                        setEditingId(point.id);
                                                        setTempAnswer(point.a);
                                                    }} />
                                                )}
                                            </div>

                                            {editingId === point.id ? (
                                                <textarea
                                                    autoFocus
                                                    value={tempAnswer}
                                                    onChange={e => setTempAnswer(e.target.value)}
                                                    style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--accent-primary)', borderRadius: '8px', color: 'white', padding: '10px', marginTop: '5px', fontSize: '13px', minHeight: '80px', resize: 'none' }}
                                                />
                                            ) : (
                                                <p style={{ margin: '5px 0 0', color: 'rgba(255,255,255,0.7)', fontSize: '13px', whiteSpace: 'pre-wrap' }}>{point.a}</p>
                                            )}
                                        </div>

                                        {point.analysis && (
                                            <div style={{ padding: '12px', background: 'rgba(197, 160, 89, 0.05)', borderRadius: '10px', borderLeft: '3px solid var(--accent-primary)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                                                    <Sparkles size={12} color="var(--accent-primary)" />
                                                    <span style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--accent-primary)' }}>ANÁLISE DA IA</span>
                                                </div>
                                                <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontStyle: 'italic', lineHeight: '1.4' }}>{point.analysis}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'center' }}>
                                <button onClick={onClose} className="btn-primary" style={{ padding: '15px 60px', borderRadius: '12px', fontSize: '14px', background: 'linear-gradient(to right, #c5a059, #8a6d3a)', color: 'white' }}>
                                    Salvar e Aplicar Conhecimento
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default BriefingModal;
