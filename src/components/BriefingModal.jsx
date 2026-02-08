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

                <div className="briefing-header" style={{
                    padding: '25px 40px',
                    background: 'linear-gradient(to right, #111, #000)',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                        <div style={{ padding: '12px', background: 'rgba(197, 160, 89, 0.1)', borderRadius: '14px', border: '1px solid rgba(197, 160, 89, 0.2)' }}>
                            <Brain size={26} color="var(--accent-primary)" />
                        </div>
                        <div>
                            <h2 style={{ color: 'white', margin: 0, fontSize: '18px', fontWeight: 'bold', letterSpacing: '0.5px' }}>Hub de Conhecimento Estratégico</h2>
                            <p style={{ color: 'rgba(255,255,255,0.3)', margin: 0, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>Treinamento Avançado IA Aura</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        <button
                            onClick={() => { if (confirm("Deseja apagar o conhecimento atual e começar uma nova entrevista?")) { setKnowledgeBase([]); setView('interview'); } }}
                            style={{ background: 'rgba(248, 113, 113, 0.05)', color: '#f87171', border: '1px solid rgba(248, 113, 113, 0.15)', padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', fontSize: '11px', fontWeight: '600' }}
                        >
                            Reiniciar Cérebro
                        </button>
                        <X size={24} color="white" onClick={onClose} style={{ cursor: 'pointer', opacity: 0.3 }} onMouseEnter={e => e.target.style.opacity = 1} onMouseLeave={e => e.target.style.opacity = 0.3} />
                    </div>
                </div>

                <div className="briefing-body" style={{ padding: '40px', overflowY: 'auto', flex: 1, background: '#080808' }}>

                    {view === 'interview' ? (
                        <div className="interview-flow" style={{ maxWidth: '700px', margin: '20px auto' }}>
                            <div className="question-area" style={{
                                background: 'linear-gradient(165deg, rgba(197, 160, 89, 0.04), rgba(0,0,0,0.4))',
                                padding: '50px',
                                borderRadius: '32px',
                                border: '1px solid rgba(197, 160, 89, 0.1)',
                                boxShadow: '0 30px 60px rgba(0,0,0,0.5)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '25px' }}>
                                    <div style={{ background: 'var(--accent-primary)', height: '2px', width: '30px' }}></div>
                                    <span style={{ color: 'var(--accent-primary)', fontWeight: '800', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '3px' }}>Aura Mentor</span>
                                </div>
                                <h3 style={{ margin: '0 0 40px 0', fontSize: '28px', color: 'white', lineHeight: '1.3', fontWeight: '800', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                                    {status === 'thinking' ? "Gerando Insight Estratégico..." : currentQuestion}
                                </h3>
                                <div style={{ position: 'relative' }}>
                                    <textarea
                                        autoFocus
                                        value={currentAnswer}
                                        onChange={(e) => setCurrentAnswer(e.target.value)}
                                        placeholder="Digite sua visão aqui..."
                                        style={{
                                            width: '100%',
                                            background: 'rgba(0,0,0,0.6)',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            borderRadius: '20px',
                                            padding: '30px',
                                            color: 'white',
                                            fontSize: '17px',
                                            minHeight: '220px',
                                            lineHeight: '1.6',
                                            outline: 'none',
                                            resize: 'none',
                                            transition: 'border-color 0.3s'
                                        }}
                                        onFocus={e => e.target.style.borderColor = 'rgba(197, 160, 89, 0.5)'}
                                        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                                    />
                                    {status === 'thinking' && (
                                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                                            <RefreshCw className="spin" size={32} color="var(--accent-primary)" />
                                        </div>
                                    )}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '40px' }}>
                                    <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '11px', fontWeight: 'bold' }}>PRESSIONE ENTER PARA ENVIAR</span>
                                    <button
                                        className="btn-primary"
                                        onClick={handleNextInterview}
                                        disabled={!currentAnswer.trim() || status === 'thinking'}
                                        style={{
                                            padding: '18px 50px',
                                            borderRadius: '100px',
                                            fontWeight: '800',
                                            fontSize: '15px',
                                            boxShadow: '0 10px 30px rgba(197, 160, 89, 0.4)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px'
                                        }}
                                    >
                                        {status === 'thinking' ? "Aura Analisando..." : "Confirmar Visão"} <ArrowRight size={20} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="knowledge-dashboard" style={{ maxWidth: '800px', margin: '0 auto' }}>
                            {safeKB.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '100px 20px', background: 'rgba(255,255,255,0.01)', borderRadius: '30px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                                    <div style={{ background: 'rgba(197, 160, 89, 0.1)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 25px' }}>
                                        <Brain size={40} color="var(--accent-primary)" style={{ opacity: 0.5 }} />
                                    </div>
                                    <h3 style={{ color: 'white', fontSize: '22px', marginBottom: '10px' }}>Cérebro Vazio</h3>
                                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', maxWidth: '300px', margin: '0 auto 30px' }}>Ensine à Aura como seu negócio funciona para que ela possa vender por você.</p>
                                    <button onClick={() => setView('interview')} className="btn-primary" style={{ padding: '15px 40px', borderRadius: '50px', fontWeight: 'bold' }}>Começar Treinamento</button>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                                    {safeKB.map((point) => (
                                        <div key={point.id} className="knowledge-card glass-panel" style={{ padding: '0', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', overflow: 'hidden' }}>
                                            {/* TOP SECTION: QUESTION */}
                                            <div style={{ padding: '30px 35px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-primary)' }}></div>
                                                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Estratégia</span>
                                                </div>
                                                <div style={{ color: 'white', fontSize: '18px', fontWeight: 'bold', lineHeight: '1.4' }}>{point.q}</div>
                                            </div>

                                            {/* MIDDLE SECTION: ANSWER */}
                                            <div style={{ padding: '30px 35px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold', textTransform: 'uppercase' }}>Seu Posicionamento</div>
                                                    {editingId === point.id ? (
                                                        <div style={{ display: 'flex', gap: '15px' }}>
                                                            <button onClick={() => handleUpdatePoint(point.id)} style={{ background: 'none', border: 'none', color: '#4ade80', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>SALVAR</button>
                                                            <button onClick={() => setEditingId(null)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>CANCELAR</button>
                                                        </div>
                                                    ) : (
                                                        <button onClick={() => { setEditingId(point.id); setTempAnswer(point.a); }} style={{ background: 'rgba(197, 160, 89, 0.1)', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold', padding: '6px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(197, 160, 89, 0.2)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(197, 160, 89, 0.1)'}>
                                                            <Edit2 size={12} /> EDITAR
                                                        </button>
                                                    )}
                                                </div>
                                                {editingId === point.id ? (
                                                    <textarea
                                                        autoFocus
                                                        value={tempAnswer}
                                                        onChange={e => setTempAnswer(e.target.value)}
                                                        style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--accent-primary)', borderRadius: '12px', color: 'white', padding: '15px', fontSize: '14px', outline: 'none', resize: 'vertical', minHeight: '80px', lineHeight: '1.6' }}
                                                    />
                                                ) : (
                                                    <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>{point.a}</div>
                                                )}
                                            </div>

                                            {/* BOTTOM SECTION: AI INSIGHT */}
                                            {point.analysis ? (
                                                <div style={{ padding: '25px 35px', background: 'rgba(197, 160, 89, 0.04)', borderTop: '1px solid rgba(197, 160, 89, 0.1)', position: 'relative' }}>
                                                    <div style={{ position: 'absolute', top: '0', left: '35px', width: '20px', height: '2px', background: 'var(--accent-primary)' }}></div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                                                        <Sparkles size={14} color="var(--accent-primary)" />
                                                        <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Insight da Inteligência</span>
                                                    </div>
                                                    <p style={{ margin: 0, fontSize: '13px', color: 'rgba(224, 192, 128, 0.7)', fontStyle: 'italic', lineHeight: '1.7' }}>"{point.analysis}"</p>
                                                </div>
                                            ) : (
                                                <div style={{ padding: '20px 35px', textAlign: 'center', opacity: 0.3 }}>
                                                    <span style={{ fontSize: '10px', textTransform: 'uppercase' }}>Aguardando nova análise...</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    <div style={{ textAlign: 'center', margin: '40px 0 60px' }}>
                                        <button onClick={onClose} className="btn-primary" style={{ padding: '18px 100px', borderRadius: '50px', background: 'var(--accent-primary)', color: 'black', fontWeight: 'bold', fontSize: '15px', boxShadow: '0 15px 30px rgba(197, 160, 89, 0.3)' }}>
                                            Finalizar e Treinar Aura
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BriefingModal;
