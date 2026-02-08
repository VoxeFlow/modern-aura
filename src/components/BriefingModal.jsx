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
            title: "O Negócio",
            q: "Qual o nome da sua empresa e o que exatamente vocês fazem de melhor?",
            key: "business",
            placeholder: "Ex: Clínica Inova, especialistas em Implantes e Reabilitação Oral..."
        },
        {
            title: "Diferenciais",
            q: "Por que um cliente deve escolher você e não a concorrência? O que te torna único?",
            key: "competence",
            placeholder: "Ex: Não somos franquia, atendimento com especialistas do início ao fim, tecnologia guiada..."
        },
        {
            title: "Público & Tom",
            q: "Quem é seu cliente ideal e como o Aura deve falar com ele? (Profissional, amigável, autoritário?)",
            key: "audience",
            placeholder: "Ex: Pessoas acima de 40 anos buscando qualidade. Tom deve ser profissional e autoritário tecnicamente."
        },
        {
            title: "Formas de Pagamento",
            q: "Quais as facilidades de pagamento que podemos usar como 'isca' ou fechamento?",
            key: "payments",
            placeholder: "Ex: Parcelamento em até 24x sem juros, entrada de 1k + boletos, aceitamos todos os cartões."
        },
        {
            title: "Regras de Ouro",
            q: "Quais as regras inegociáveis? (Ex: Nunca dar preço por WhatsApp, sempre focar na avaliação)",
            key: "rules",
            placeholder: "Ex: Nunca passar valores exatos. Sempre redirecionar para avaliação clínica explicando que cada caso é único."
        }
    ];

    const handleNext = () => {
        if (step < steps.length - 1) setStep(step + 1);
        else handleFinish();
    };

    const handleFinish = () => {
        // Construct the final briefing string based on the high-conversion patterns
        const finalBriefing = `
Nome/Área: ${answers.business}
Diferenciais: ${answers.competence}
Público/Tom: ${answers.audience}
Pagamentos: ${answers.payments}
REGRAS DE OURO: ${answers.rules}
        `.trim();

        setConfig({ briefing: finalBriefing });
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content glass-panel" style={{ width: '650px', padding: '0' }} onClick={e => e.stopPropagation()}>
                <div className="briefing-header" style={{
                    padding: '30px',
                    background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                    borderBottom: '1px solid var(--glass-border)'
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
