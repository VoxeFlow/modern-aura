import React, { useState } from 'react';
import { X, ArrowRight, ArrowLeft, Save, Sparkles, Brain } from 'lucide-react';
import { useStore } from '../store/useStore';

const BriefingModal = ({ isOpen, onClose }) => {
    const { briefing, setConfig } = useStore();
    const [step, setStep] = useState(0);
    const [answers, setAnswers] = useState({
        business: '',
        competence: '',
        audience: '',
        payments: '',
        rules: '',
        tone: ''
    });

    if (!isOpen) return null;

    const steps = [
        {
            title: "Identidade & Segmento",
            q: "Qual o nome da empresa e o segmento de atuação?",
            key: "business",
            placeholder: "Ex: Clínica Sorriso (Odontologia), Advocacia Silva (Direito Civil), Loja Tech (E-commerce de Gadgets)..."
        },
        {
            title: "Proposta de Valor (WOW)",
            q: "Quais são os 3 principais diferenciais que fazem o cliente dizer 'UAU'?",
            key: "competence",
            placeholder: "Ex: Atendimento em 15min, tecnologia exclusiva X, garantia de 5 anos, orçamento sem compromisso..."
        },
        {
            title: "Iscas de Conversão",
            q: "Quais perguntas curtas o Aura deve fazer para sondar o interesse do cliente?",
            key: "audience",
            placeholder: "Ex: 'Você já teve alguma experiência com isso?', 'O que mais te incomoda hoje?', 'Já tentou resolver de outra forma?'"
        },
        {
            title: "Política Comercial",
            q: "Como lidamos com Preços, Descontos e Pagamentos?",
            key: "payments",
            placeholder: "Ex: Não damos preço fixo por Whats, mas temos parcelamento em 24x e desconto de 10% no Pix."
        },
        {
            title: "Regras de Fechamento",
            q: "Quais as regras inegociáveis para converter o lead?",
            key: "rules",
            placeholder: "Ex: Nunca deixar o cliente sem pergunta no final. Sempre convidar para uma visita presencial ou call."
        }
    ];

    const handleNext = () => {
        if (step < steps.length - 1) setStep(step + 1);
        else handleFinish();
    };

    const handleFinish = () => {
        // Construct a highly structured Knowledge Base object for the AI
        const finalBriefing = `
[SEGMENTO]: ${answers.business}
[DIFERENCIAIS]: ${answers.competence}
[ISCAS_CONVERSAO]: ${answers.audience}
[FINANCEIRO]: ${answers.payments}
[DIRETRIZES]: ${answers.rules}
        `.trim();

        setConfig({ briefing: finalBriefing });
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="modal-content glass-panel" style={{ width: '90%', maxWidth: '650px', padding: '0', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                <div className="briefing-header" style={{
                    padding: '30px',
                    background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                    borderBottom: '1px solid var(--glass-border)',
                    borderTopLeftRadius: '20px', // FIX: Match container radius
                    borderTopRightRadius: '20px' // FIX: Match container radius
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <div style={{ padding: '10px', background: 'rgba(255,255,255,0.2)', borderRadius: '12px' }}>
                                <Brain size={32} color="white" />
                            </div>
                            <div>
                                <h2 style={{ color: 'white', margin: 0 }}>Briefing Estratégico AI</h2>
                                <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0, fontSize: '13px' }}>Construindo a inteligência do seu negócio</p>
                            </div>
                        </div>
                        <X size={24} color="white" onClick={onClose} style={{ cursor: 'pointer' }} />
                    </div>
                </div>

                <div className="briefing-body" style={{ padding: '40px' }}>
                    <div className="step-indicator" style={{ display: 'flex', gap: '8px', marginBottom: '30px' }}>
                        {steps.map((_, i) => (
                            <div key={i} style={{
                                flex: 1,
                                height: '4px',
                                borderRadius: '2px',
                                background: step >= i ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)',
                                transition: 'all 0.3s'
                            }} />
                        ))}
                    </div>

                    <div className="question-area" style={{ minHeight: '200px' }}>
                        <span style={{ color: 'var(--accent-primary)', fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            Passo {step + 1} de {steps.length}: {steps[step].title}
                        </span>
                        <h3 style={{ margin: '15px 0 25px 0', fontSize: '22px', lineHeight: '1.4' }}>{steps[step].q}</h3>

                        <textarea
                            value={answers[steps[step].key]}
                            onChange={(e) => setAnswers({ ...answers, [steps[step].key]: e.target.value })}
                            placeholder={steps[step].placeholder}
                            style={{
                                width: '100%',
                                background: '#ffffff',
                                border: '1px solid rgba(0, 0, 0, 0.1)',
                                borderRadius: '12px',
                                padding: '20px',
                                color: 'var(--text-main)', // Changed from white to dark
                                fontSize: '16px',
                                minHeight: '120px',
                                outline: 'none',
                                resize: 'none'
                            }}
                        />
                    </div>

                    <div className="briefing-footer" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px', gap: '15px' }}>
                        <button
                            className="btn-secondary"
                            onClick={() => setStep(step - 1)}
                            disabled={step === 0}
                            style={{ padding: '12px 25px', borderRadius: '10px' }}
                        >
                            <ArrowLeft size={18} /> Anterior
                        </button>

                        <button
                            className="btn-primary"
                            onClick={handleNext}
                            style={{ padding: '12px 30px', borderRadius: '10px' }}
                        >
                            {step === steps.length - 1 ? (
                                <>Geral Inteligência <Save size={18} /></>
                            ) : (
                                <>Próximo Passo <ArrowRight size={18} /></>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BriefingModal;
