import React, { useMemo, useState } from 'react';
import {
    ArrowRight,
    Bot,
    Brain,
    CalendarCheck,
    Check,
    CheckCircle2,
    CircuitBoard,
    Clock3,
    Database,
    Gauge,
    Globe,
    MessageSquareText,
    Shield,
    Sparkles,
    TrendingUp,
    Users,
    Workflow,
    Zap,
} from 'lucide-react';
import logoDark from '../assets/logo-dark.png';
import './LandingPage.css';

const AUTH_TTL_MS = 12 * 60 * 60 * 1000;

const features = [
    {
        icon: <Brain size={24} />,
        title: 'IA Comercial com Contexto de Negócio',
        description: 'A AURA entende histórico, perfil e objetivo de cada lead para sugerir respostas mais eficazes.',
    },
    {
        icon: <Workflow size={24} />,
        title: 'Pipeline em Tempo Real',
        description: 'Visualize etapas por oportunidade e mantenha o time operando com prioridade clara.',
    },
    {
        icon: <MessageSquareText size={24} />,
        title: 'Atendimento Assistido por IA',
        description: 'Sua equipe responde com velocidade e consistência sem perder controle humano do envio.',
    },
    {
        icon: <Gauge size={24} />,
        title: 'Métricas de Conversão',
        description: 'Acompanhe SLA de resposta, avanço de funil e taxa de fechamento por período.',
    },
    {
        icon: <Shield size={24} />,
        title: 'Operação Segura',
        description: 'Sessões protegidas, boas práticas de acesso e estrutura preparada para escalar.',
    },
    {
        icon: <Sparkles size={24} />,
        title: 'Briefing Inteligente',
        description: 'Transforme conhecimento do seu negócio em argumento comercial reaproveitável.',
    },
];

const steps = [
    {
        icon: <Bot size={20} />,
        title: 'Mapeie seu posicionamento',
        description: 'Defina diferenciais, objeções frequentes e prioridades comerciais.',
    },
    {
        icon: <Users size={20} />,
        title: 'Conecte seu time e canais',
        description: 'Centralize conversas e mantenha padrão de atendimento entre colaboradores.',
    },
    {
        icon: <CalendarCheck size={20} />,
        title: 'Execute o funil com disciplina',
        description: 'Cada lead recebe próxima ação: qualificar, avançar, propor ou fechar.',
    },
    {
        icon: <TrendingUp size={20} />,
        title: 'Otimize continuamente',
        description: 'Use dados da operação para ajustar discurso e aumentar previsibilidade.',
    },
];

const stack = [
    { icon: <CircuitBoard size={18} />, label: 'Motor de IA GPT-4o' },
    { icon: <MessageSquareText size={18} />, label: 'Integração Omnichannel' },
    { icon: <Database size={18} />, label: 'CRM de Pipeline' },
    { icon: <Clock3 size={18} />, label: 'Automação de Follow-up' },
    { icon: <Globe size={18} />, label: 'Deploy Cloudflare' },
    { icon: <Shield size={18} />, label: 'Camada de Segurança' },
];

const segments = ['Saúde', 'Jurídico', 'Educação', 'Imobiliário', 'Consultoria', 'Serviços B2B', 'Estética', 'Tecnologia'];

const plans = [
    {
        id: 'lite',
        name: 'Lite',
        price: 'R$ 79',
        period: '/mês',
        description: 'Entrada acessível para começar com IA no atendimento.',
        features: ['1 WhatsApp', 'Sugestão com IA', 'Sem CRM e sem varinha mágica', 'Limite mensal de mensagens com IA', 'Suporte por email'],
        recommended: false,
    },
    {
        id: 'pro',
        name: 'Pro',
        price: 'R$ 179',
        period: '/mês',
        description: 'Plano principal para operação comercial com processo.',
        features: ['1 WhatsApp', 'IA + varinha mágica', 'CRM básico', 'Limite maior de mensagens com IA', 'Suporte prioritário'],
        recommended: false,
    },
    {
        id: 'scale',
        name: 'Scale',
        price: 'R$ 349',
        period: '/mês',
        description: 'Para equipes que querem escala real com múltiplos canais.',
        features: ['Até 3 WhatsApps', 'Múltiplos usuários', 'Funil completo + relatórios', 'Limite alto/prioritário de IA', 'Suporte avançado'],
        recommended: true,
    },
];

const faqs = [
    {
        q: 'A AURA funciona apenas para um nicho?',
        a: 'Não. A plataforma é adaptável para diferentes segmentos que dependem de atendimento e conversão por conversa.',
    },
    {
        q: 'A IA envia mensagens sem aprovação?',
        a: 'Não. A IA recomenda, o time valida e decide o envio para manter controle total da comunicação.',
    },
    {
        q: 'Em quanto tempo consigo ver resultado?',
        a: 'Normalmente na primeira semana já há ganho em velocidade de resposta e organização do funil.',
    },
];

const LandingPage = ({ onGetStarted }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        company: '',
        plan: 'pro',
    });

    const ctaLabel = useMemo(() => {
        if (formData.plan === 'lite') return 'Iniciar Lite';
        if (formData.plan === 'scale') return 'Iniciar Scale';
        return 'Iniciar Pro';
    }, [formData.plan]);

    const handlePlanSelect = (plan) => {
        setFormData((prev) => ({ ...prev, plan: plan.id }));
        document.getElementById('register')?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        localStorage.setItem('aura_pending_lead', JSON.stringify(formData));
        localStorage.setItem('aura_subscription_plan', formData.plan);

        const token = btoa(
            JSON.stringify({
                type: 'authenticated',
                issuedAt: Date.now(),
                expiresAt: Date.now() + AUTH_TTL_MS,
            }),
        );

        localStorage.setItem('auth_token', token);
        onGetStarted();
    };

    return (
        <div className="landing-page">
            <div className="bg-grid" />
            <div className="bg-orb orb-a" />
            <div className="bg-orb orb-b" />
            <div className="bg-orb orb-c" />

            <header className="landing-top-bar">
                <div className="top-bar-inner">
                    <div className="top-bar-logo">
                        <img src={logoDark} alt="AURA" className="brand-logo" />
                    </div>

                    <button className="btn-login" onClick={onGetStarted}>
                        Entrar no Sistema
                    </button>
                </div>
            </header>

            <section className="hero">
                <div className="hero-copy">
                    <span className="badge-new">VERSÃO 12.0 | IA COMERCIAL</span>
                    <h1 className="hero-title">
                        O Sistema que transforma
                        <span className="highlight"> Conversas em Receita</span>
                    </h1>
                    <p className="hero-subtitle">
                        AURA unifica IA, CRM e operação comercial para equipes que vendem por atendimento.
                        Funciona para saúde, jurídico, educação e qualquer negócio orientado a relacionamento.
                    </p>

                    <div className="hero-metrics">
                        <div>
                            <strong>+38%</strong>
                            <span>avanço de funil</span>
                        </div>
                        <div>
                            <strong>4x</strong>
                            <span>resposta mais rápida</span>
                        </div>
                        <div>
                            <strong>24/7</strong>
                            <span>inteligência ativa</span>
                        </div>
                    </div>

                    <div className="cta-group">
                        <button className="cta-button primary" onClick={() => document.getElementById('register')?.scrollIntoView({ behavior: 'smooth' })}>
                            Solicitar Acesso <ArrowRight size={18} />
                        </button>
                        <button className="cta-button secondary" onClick={() => window.open('https://wa.me/5511999999999?text=Quero%20ver%20uma%20demo%20da%20AURA', '_blank')}>
                            Ver Demonstração
                        </button>
                    </div>
                </div>

                <div className="hero-visual">
                    <div className="command-card">
                        <div className="card-head">
                            <span className="dot" />
                            <span className="dot" />
                            <span className="dot" />
                            <strong>AURA Command Center</strong>
                        </div>

                        <div className="chat-flow">
                            <div className="bubble client">Lead: Quero entender os planos e como funciona na prática.</div>
                            <div className="bubble aura">AURA: Posso te mostrar a opção mais aderente ao seu cenário. Você quer priorizar velocidade ou previsibilidade?</div>
                        </div>

                        <div className="signal-grid">
                            <div className="signal">
                                <label>INTENÇÃO</label>
                                <strong>ALTA</strong>
                            </div>
                            <div className="signal">
                                <label>PIPELINE</label>
                                <strong>PROPOSTA</strong>
                            </div>
                            <div className="signal">
                                <label>PRÓXIMA AÇÃO</label>
                                <strong>FECHAMENTO</strong>
                            </div>
                        </div>
                    </div>

                    <div className="floating-pill pill-a"><Zap size={14} /> IA ativa</div>
                    <div className="floating-pill pill-b"><Users size={14} /> Equipe sincronizada</div>
                    <div className="floating-pill pill-c"><CheckCircle2 size={14} /> Funil rastreado</div>
                </div>
            </section>

            <section className="segment-ticker" aria-label="Segmentos">
                <div className="ticker-track">
                    {[...segments, ...segments].map((item, idx) => (
                        <span key={`${item}-${idx}`} className="ticker-item">{item}</span>
                    ))}
                </div>
            </section>

            <section id="features" className="features">
                <h2 className="section-title">Arquitetura Comercial para Negócios de Serviço</h2>
                <p className="section-subtitle">
                    Produto feito para rotina real de operação: visual, rápido e orientado a conversão.
                </p>
                <div className="features-grid">
                    {features.map((feature, index) => (
                        <article key={feature.title} className="feature-card" style={{ animationDelay: `${index * 80}ms` }}>
                            <div className="feature-icon">{feature.icon}</div>
                            <h3>{feature.title}</h3>
                            <p>{feature.description}</p>
                        </article>
                    ))}
                </div>
            </section>

            <section className="how-it-works">
                <h2 className="section-title">Implementação em 4 Etapas</h2>
                <div className="steps-grid">
                    {steps.map((step, index) => (
                        <article key={step.title} className="step-card" style={{ animationDelay: `${index * 90}ms` }}>
                            <div className="step-index">0{index + 1}</div>
                            <div className="step-icon">{step.icon}</div>
                            <h3>{step.title}</h3>
                            <p>{step.description}</p>
                        </article>
                    ))}
                </div>
            </section>

            <section className="tech-stack">
                <h2 className="section-title">Infraestrutura de Tecnologia</h2>
                <div className="stack-grid">
                    {stack.map((item) => (
                        <div key={item.label} className="stack-chip">
                            {item.icon}
                            <span>{item.label}</span>
                        </div>
                    ))}
                </div>
            </section>

            <section id="pricing" className="pricing">
                <h2 className="section-title">Planos de Entrada, Escala e Upgrade Natural</h2>
                <div className="pricing-grid">
                    {plans.map((plan, idx) => (
                        <article key={plan.id} className={`pricing-card ${plan.recommended ? 'recommended' : ''}`} style={{ animationDelay: `${idx * 90}ms` }}>
                            {plan.recommended && <div className="badge">Melhor custo-benefício</div>}
                            <h3>{plan.name}</h3>
                            <p className="plan-description">{plan.description}</p>
                            <div className="price">
                                <span className="price-value">{plan.price}</span>
                                {plan.period && <span className="price-period">{plan.period}</span>}
                            </div>
                            <ul className="features-list">
                                {plan.features.map((item) => (
                                    <li key={item}>
                                        <Check size={16} /> {item}
                                    </li>
                                ))}
                            </ul>
                            <button className={plan.recommended ? 'btn-gold' : 'btn-outline'} onClick={() => handlePlanSelect(plan)}>
                                {`Escolher ${plan.name}`}
                            </button>
                        </article>
                    ))}
                </div>
            </section>

            <section id="register" className="registration">
                <div className="registration-container">
                    <h2 className="section-title">Ative Sua Operação com AURA</h2>
                    <p className="registration-subtitle">Preencha os dados e receba acesso ao ambiente de demonstração.</p>

                    <form onSubmit={handleSubmit} className="registration-form">
                        <div className="form-group">
                            <label htmlFor="name">Nome Completo</label>
                            <input
                                id="name"
                                type="text"
                                placeholder="Seu nome"
                                value={formData.name}
                                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="email">Email</label>
                            <input
                                id="email"
                                type="email"
                                placeholder="voce@empresa.com"
                                value={formData.email}
                                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="company">Empresa</label>
                            <input
                                id="company"
                                type="text"
                                placeholder="Nome da sua empresa"
                                value={formData.company}
                                onChange={(e) => setFormData((prev) => ({ ...prev, company: e.target.value }))}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="plan">Plano Desejado</label>
                            <select
                                id="plan"
                                value={formData.plan}
                                onChange={(e) => setFormData((prev) => ({ ...prev, plan: e.target.value }))}
                            >
                                <option value="lite">Lite - R$ 79/mês</option>
                                <option value="pro">Pro - R$ 179/mês</option>
                                <option value="scale">Scale - R$ 349/mês</option>
                            </select>
                        </div>

                        <button type="submit" className="btn-submit">
                            {ctaLabel} <ArrowRight size={18} />
                        </button>

                        <p className="form-note">Ao continuar, você concorda com os termos e política de privacidade.</p>
                    </form>
                </div>
            </section>

            <section className="faq">
                <h2 className="section-title">Perguntas Frequentes</h2>
                <div className="faq-grid">
                    {faqs.map((item, idx) => (
                        <article key={item.q} className="faq-card" style={{ animationDelay: `${idx * 100}ms` }}>
                            <h3>{item.q}</h3>
                            <p>{item.a}</p>
                        </article>
                    ))}
                </div>
            </section>

            <footer className="footer" id="contact">
                <div className="footer-content">
                    <div className="footer-brand">
                        <img src={logoDark} alt="AURA" className="footer-logo-img" />
                        <p>Plataforma de inteligência comercial para negócios que crescem com atendimento consultivo.</p>
                    </div>
                    <div className="footer-links">
                        <a href="#features">Recursos</a>
                        <a href="#pricing">Planos</a>
                        <a href="#register">Solicitar acesso</a>
                        <a href="https://wa.me/5511999999999">Contato</a>
                    </div>
                </div>
                <div className="footer-bottom">© 2026 AURA. Sistema inteligente para equipes comerciais.</div>
            </footer>
        </div>
    );
};

export default LandingPage;
