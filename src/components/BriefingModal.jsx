import React, { useState, useEffect } from 'react';
import { X, ArrowRight, Save, Sparkles, Brain, Edit2, Check, RefreshCw, Plus } from 'lucide-react';
import { useStore } from '../store/useStore';

const BriefingModal = ({ isOpen, onClose }) => {
    const { briefing, knowledgeBase, setConfig, setKnowledgeBase } = useStore();
    const [view, setView] = useState('dashboard'); // interview, dashboard
    const [status, setStatus] = useState('idle'); // idle, thinking, showing_analysis
    const [currentQuestion, setCurrentQuestion] = useState("Para começarmos: Qual o nome da sua empresa e o que exatamente vocês fazem?");
    const [currentAnswer, setCurrentAnswer] = useState("");
    const [lastAnalysis, setLastAnalysis] = useState("");
    const [editingId, setEditingId] = useState(null);
    const [tempAnswer, setTempAnswer] = useState("");

    // Start in dashboard view by default
    useEffect(() => {
        if (isOpen) {
            setView('dashboard');
            setStatus('idle');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleNextInterview = async () => {
        if (!currentAnswer.trim()) return;

        setStatus('thinking');
        try {
            const { default: OpenAIService } = await import('../services/openai');

            // 1. Generate strategic analysis for this point
            const analysis = await OpenAIService.analyzeKnowledgePoint(currentQuestion, currentAnswer);
            setLastAnalysis(analysis);

            const newItem = {
                id: Date.now(),
                q: currentQuestion,
                a: currentAnswer,
                analysis
            };

            const currentKB = knowledgeBase || [];
            const newKB = [...currentKB, newItem];
            setKnowledgeBase(newKB);

            // Show analysis before moving on
            setStatus('showing_analysis');
        } catch (e) {
            console.error("AURA: Error in interview step", e);
            setStatus('idle');
        }
    };

    const proceedToNext = async () => {
        setStatus('thinking');
        try {
            const { default: OpenAIService } = await import('../services/openai');
            const nextQ = await OpenAIService.generateNextBriefingQuestion(knowledgeBase);

            if (nextQ.includes("COMPLETE") || knowledgeBase.length >= 10) {
                setStatus('idle');
                setView('dashboard');
                syncBriefingText(knowledgeBase);
            } else {
                setCurrentQuestion(nextQ);
                setCurrentAnswer("");
                setLastAnalysis("");
                setStatus('idle');
            }
        } catch (e) {
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
    const hasRawBriefing = briefing && briefing.length > 0 && safeKB.length === 0;

    return (
        <div className="modal-overlay" onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)', zIndex: 1000, backgroundColor: 'rgba(255,255,255,0.1)' }}>
            <div className="modal-content glass-panel" style={{ width: '95%', maxWidth: '800px', padding: '0', maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 30px 60px rgba(0,0,0,0.15)' }} onClick={e => e.stopPropagation()}>

                <div className="briefing-header" style={{
                    padding: '25px 40px',
                    background: '#FFFFFF',
                    borderBottom: '1px solid rgba(0,0,0,0.05)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                        <div style={{ padding: '12px', background: 'rgba(197, 160, 89, 0.1)', borderRadius: '14px' }}>
                            <Brain size={26} color="var(--accent-primary)" />
                        </div>
                        <div>
                            <h2 style={{ color: '#1d1d1f', margin: 0, fontSize: '20px', fontWeight: 'bold' }}>Cérebro Estratégico AURA</h2>
                            <p style={{ color: '#86868b', margin: 0, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>Treinamento Avançado de Inteligência</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        <button
                            onClick={() => {
                                if (confirm("⚠️ TEM CERTEZA?\n\nIsso apagará todo o conhecimento que a AURA tem sobre sua empresa e reiniciará a entrevista.")) {
                                    useStore.getState().resetBrain();
                                    setStatus('idle');
                                    setView('interview'); // Redundant but safe
                                }
                            }}
                            style={{ background: '#FFF5F5', color: '#ff4d4d', border: '1px solid #FFEBEB', padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
                        >
                            Resetar Cérebro
                        </button>
                        <X size={24} color="#1d1d1f" onClick={onClose} style={{ cursor: 'pointer', opacity: 0.3 }} />
                    </div>
                </div>

                <div className="briefing-body" style={{ padding: '40px', overflowY: 'auto', flex: 1, background: '#FDFDFD' }}>

                    {view === 'interview' ? (
                        <div className="interview-flow" style={{ maxWidth: '650px', margin: '20px auto' }}>
                            <div className="question-area" style={{
                                background: '#FFFFFF',
                                padding: '30px', /* REDUCED: Was 45px */
                                borderRadius: '24px',
                                border: '1px solid rgba(197, 160, 89, 0.2)',
                                boxShadow: '0 10px 30px rgba(197, 160, 89, 0.05)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                                    <Sparkles size={14} color="var(--accent-primary)" />
                                    <span style={{ color: 'var(--accent-primary)', fontWeight: 'bold', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Aura Mentor</span>
                                </div>

                                <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', color: '#1d1d1f', lineHeight: '1.4', fontWeight: 'bold' }}>
                                    {status === 'thinking' ? "Gerando Insight..." : currentQuestion}
                                </h3>

                                {status === 'showing_analysis' ? (
                                    <div style={{ animation: 'fadeIn 0.5s ease' }}>
                                        {/* Show Answer (Read Only) */}
                                        <div style={{ marginBottom: '20px', padding: '20px', background: '#F9F9FA', borderRadius: '16px', border: '1px solid #E5E5E7', fontSize: '15px', color: '#1d1d1f' }}>
                                            {currentAnswer}
                                        </div>

                                        {/* Analysis Box - Clean White/Gray (No Beige) */}
                                        <div style={{
                                            background: '#FFFFFF',
                                            border: '1px solid #E5E5E7',
                                            borderRadius: '20px',
                                            padding: '25px',
                                            marginBottom: '30px',
                                            position: 'relative',
                                            boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                                                <Sparkles size={16} color="var(--accent-primary)" />
                                                <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--accent-primary)', textTransform: 'uppercase' }}>Insight Aura</span>
                                            </div>
                                            <p style={{ margin: 0, fontSize: '14px', color: '#4a4a4c', fontStyle: 'italic', lineHeight: '1.6' }}>
                                                "{lastAnalysis}"
                                            </p>
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <button
                                                onClick={() => setStatus('idle')} // Go back to editing
                                                style={{ background: 'transparent', border: 'none', color: '#86868b', textDecoration: 'underline', cursor: 'pointer', fontSize: '13px' }}
                                            >
                                                Editar minha resposta
                                            </button>

                                            <button
                                                className="btn-primary"
                                                onClick={proceedToNext}
                                                style={{ padding: '15px 45px', borderRadius: '50px', fontWeight: 'bold' }}
                                            >
                                                Próxima Pergunta <ArrowRight size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div style={{ position: 'relative' }}>
                                            <textarea
                                                autoFocus
                                                value={currentAnswer}
                                                onChange={(e) => setCurrentAnswer(e.target.value)}
                                                placeholder="Sua resposta moldará como a IA atende seus clientes..."
                                                style={{
                                                    width: '100%',
                                                    background: '#F9F9FA',
                                                    border: '1px solid #E5E5E7',
                                                    borderRadius: '16px',
                                                    padding: '25px',
                                                    color: '#1d1d1f',
                                                    fontSize: '16px',
                                                    minHeight: '180px',
                                                    lineHeight: '1.6',
                                                    outline: 'none',
                                                    resize: 'none',
                                                    transition: 'border-color 0.2s'
                                                }}
                                                onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'}
                                                onBlur={e => e.target.style.borderColor = '#E5E5E7'}
                                            />
                                            {status === 'thinking' && (
                                                <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.7)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <RefreshCw className="spin" size={32} color="var(--accent-primary)" />
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '30px' }}>
                                            <button
                                                className="btn-primary"
                                                onClick={handleNextInterview}
                                                disabled={!currentAnswer.trim() || status === 'thinking'}
                                                style={{ padding: '15px 45px', borderRadius: '50px', fontWeight: 'bold' }}
                                            >
                                                {status === 'thinking' ? "Analisando..." : "Confirmar Visão"} <ArrowRight size={18} />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="knowledge-dashboard" style={{ maxWidth: '750px', margin: '0 auto' }}>
                            {/* IF NO STRUCTURED DATA, BUT RAW BRIEFING EXISTS */}
                            {safeKB.length === 0 && hasRawBriefing && (
                                <div style={{ marginBottom: '30px', padding: '20px', background: '#FFF9E6', border: '1px solid #FFE4A3', borderRadius: '16px' }}>
                                    <h4 style={{ margin: '0 0 10px 0', color: '#977A23' }}>Conhecimento Bruto Detectado</h4>
                                    <p style={{ margin: 0, fontSize: '13px', color: '#977A23', opacity: 0.8 }}>
                                        Você possui dados de briefing inseridos manualmente. Eles estão ativos, mas não visualizáveis em cards estruturados.
                                        Para criar uma estrutura organizada, inicie a entrevista abaixo.
                                    </p>
                                </div>
                            )}

                            {/* MANAGER PHONE SETTING - NEW LOCATION */}
                            <div className="manager-phone-settings" style={{
                                marginBottom: '30px',
                                padding: '24px',
                                background: '#FFFFFF',
                                border: '1px solid rgba(197, 160, 89, 0.3)',
                                borderRadius: '20px',
                                boxShadow: '0 4px 15px rgba(0,0,0,0.03)'
                            }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#1d1d1f', fontWeight: '800', fontSize: '15px', marginBottom: '8px' }}>
                                    <RefreshCw size={18} color="var(--accent-primary)" /> Telefone do Gestor (AURA Loop)
                                </label>
                                <p style={{ margin: '0 0 15px 0', fontSize: '12px', color: '#86868b' }}>
                                    Defina o WhatsApp para onde a AURA enviará dúvidas táticas quando não souber responder um cliente.
                                </p>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="text"
                                        value={useStore.getState().managerPhone}
                                        onChange={e => setConfig({ managerPhone: e.target.value })}
                                        placeholder="Ex: 5511999999999"
                                        style={{
                                            width: '100%',
                                            padding: '12px 15px',
                                            background: '#F9F9FA',
                                            border: '1px solid #E5E5E7',
                                            borderRadius: '12px',
                                            fontSize: '14px',
                                            color: '#1d1d1f',
                                            outline: 'none'
                                        }}
                                    />
                                </div>
                            </div>

                            {safeKB.length === 0 && !hasRawBriefing ? (
                                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                                    <div style={{ background: '#F9F9FA', display: 'inline-flex', padding: '20px', borderRadius: '50%', marginBottom: '20px' }}>
                                        <Brain size={40} color="#E5E5E7" />
                                    </div>
                                    <h3 style={{ color: '#1d1d1f', marginBottom: '10px' }}>Cérebro Não Estruturado</h3>
                                    <p style={{ color: '#86868b', maxWidth: '400px', margin: '0 auto 30px auto', lineHeight: '1.5' }}>
                                        A Aura ainda não possui um mapa mental estruturado do seu negócio.
                                        Inicie a entrevista para criar regras claras de atendimento.
                                    </p>
                                    <button onClick={() => setView('interview')} className="btn-primary" style={{ padding: '15px 40px', borderRadius: '50px', fontWeight: 'bold' }}>
                                        Iniciar Entrevista Guiada <ArrowRight size={16} />
                                    </button>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                                    {safeKB.map((point) => (
                                        <div key={point.id} className="knowledge-card" style={{
                                            padding: '30px',
                                            background: '#FFFFFF',
                                            border: '1px solid #E5E5E7',
                                            borderRadius: '24px',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                                        }}>
                                            {/* QUESTION - BOLD AS REQUESTED */}
                                            <div style={{ color: '#1d1d1f', fontSize: '16px', fontWeight: '800', marginBottom: '12px', lineHeight: '1.4' }}>
                                                {point.q}
                                            </div>

                                            {/* ANSWER */}
                                            <div style={{ position: 'relative', marginBottom: '20px' }}>
                                                {editingId === point.id ? (
                                                    <textarea
                                                        autoFocus
                                                        value={tempAnswer}
                                                        onChange={e => setTempAnswer(e.target.value)}
                                                        style={{ width: '100%', background: '#F9F9FA', border: '1px solid var(--accent-primary)', borderRadius: '12px', padding: '15px', color: '#1d1d1f', outline: 'none' }}
                                                    />
                                                ) : (
                                                    <div style={{ color: '#4a4a4c', fontSize: '14px', lineHeight: '1.6' }}>{point.a}</div>
                                                )}

                                                <div style={{ position: 'absolute', top: 0, right: 0 }}>
                                                    {editingId === point.id ? (
                                                        <div style={{ display: 'flex', gap: '10px' }}>
                                                            <button onClick={() => handleUpdatePoint(point.id)} style={{ color: '#C5A059', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px' }}>SALVAR</button>
                                                            <button onClick={() => setEditingId(null)} style={{ color: '#86868b', border: 'none', background: 'none', cursor: 'pointer', fontSize: '11px' }}>CANCELAR</button>
                                                        </div>
                                                    ) : (
                                                        <Edit2 size={14} color="#86868b" style={{ cursor: 'pointer' }} onClick={() => { setEditingId(point.id); setTempAnswer(point.a); }} />
                                                    )}
                                                </div>
                                            </div>

                                            {/* AI ANALYSIS - INTEGRATED AFTER RESPONSE AS REQUESTED */}
                                            {point.analysis && (
                                                <div style={{
                                                    marginTop: '15px',
                                                    padding: '18px',
                                                    background: '#F9F9FA', /* CHANGED: Clean Gray */
                                                    border: '1px solid #E5E5E7', /* CHANGED: Clean Border */
                                                    borderRadius: '16px',
                                                    display: 'flex',
                                                    gap: '12px'
                                                }}>
                                                    <Sparkles size={16} color="var(--accent-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                                                    <div>
                                                        <span style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--accent-primary)', textTransform: 'uppercase', marginBottom: '5px' }}>Insight Estratégico Aura</span>
                                                        <p style={{ margin: 0, fontSize: '13px', color: '#6d6d6f', lineHeight: '1.5', fontStyle: 'italic' }}>
                                                            {point.analysis}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    {/* Action to add more or restart */}
                                    <div style={{
                                        marginTop: '30px',
                                        padding: '20px',
                                        borderRadius: '20px',
                                        background: '#F9F9FA',
                                        border: '1px solid #E5E5E7',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '15px'
                                    }}>
                                        <p style={{ margin: 0, fontSize: '13px', color: '#86868b' }}>Deseja expandir o conhecimento da Aura?</p>
                                        <button onClick={() => setView('interview')} className="btn-secondary" style={{ borderRadius: '50px', padding: '10px 30px', fontSize: '12px' }}>
                                            <Plus size={14} style={{ marginRight: '5px' }} /> Continuar Entrevista
                                        </button>
                                    </div>

                                    <div style={{ textAlign: 'center', marginTop: '10px' }}>
                                        <button onClick={onClose} className="btn-primary" style={{ padding: '15px 60px', borderRadius: '50px' }}>
                                            Finalizar e Salvar
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
