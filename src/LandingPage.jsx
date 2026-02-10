import React, { useState } from 'react';
import { Check, Zap, Brain, TrendingUp, Users, Shield, ArrowRight } from 'lucide-react';
import logoLight from '../assets/logo-light.png';
import logoDark from '../assets/logo-dark.png';
import { useStore } from '../store/useStore';
import './LandingPage.css';

const LandingPage = ({ onGetStarted }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        company: '',
        plan: 'pro'
    });



    const features = [
        {
            icon: <Brain size={32} />,
            title: 'Co-Piloto Inteligente',
            description: 'A IA analisa a conversa e sugere a resposta perfeita. Você edita e envia.'
        },
        {
            icon: <TrendingUp size={32} />,
            title: 'Pipeline de Vendas',
            description: 'Organize pacientes por etapa: Agendamento, Avaliação e Fechamento.'
        },
        {
            icon: <Users size={32} />,
            title: 'Histórico e Contexto',
            description: 'A IA lembra de tudo o que foi conversado para não perder detalhes.'
        },
        {
            icon: <Zap size={32} />,
            title: 'Agilidade no Atendimento',
            description: 'Sua secretária responde 10x mais rápido com sugestões prontas.'
        },
        {
            icon: <Shield size={32} />,
            title: 'Controle Total',
            description: 'Nada é enviado sem sua aprovação. A tecnologia serve você.'
        }
    ];

    const plans = [
        {
            id: 'starter',
            name: 'Starter',
            price: 'R$ 197',
            period: '/mês',
            features: [
                '1 número WhatsApp',
                'IA GPT-4o (Igual ao Pro)',
                'CRM Completo',
                'Limitado a 500 msgs/mês',
                'Suporte por email'
            ],
            recommended: false,
            link: 'https://pay.hotmart.com/placeholder-starter'
        },
        {
            id: 'pro',
            name: 'Pro',
            price: 'R$ 397',
            period: '/mês',
            features: [
                '3 números WhatsApp',
                'IA GPT-4o (Igual ao Starter)',
                'CRM Completo',
                'Mensagens e Leads ILIMITADOS',
                'Suporte Prioritário'
            ],
            recommended: true,
            link: 'https://pay.hotmart.com/placeholder-pro'
        }
    ];

    const handlePlanSelect = (plan) => {
        if (plan.action === 'contact') {
            window.open('https://wa.me/5511999999999?text=Interesse no Plano Enterprise', '_blank');
        } else {
            setFormData({ ...formData, plan: plan.id });
            document.getElementById('register')?.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('Form submitted:', formData);

        // REAL CRM INTEGRATION
        // 1. Create Lead in Aura Store
        useStore.getState().addLead(formData);

        // 2. Auto-Login (Demo Mode)
        const token = btoa(`authenticated:${Date.now()}`);
        localStorage.setItem('auth_token', token);

        // 3. Redirect to CRM
        onGetStarted(); // This switches view to 'dashboard' or 'crm' depending on App.jsx logic

        // Force switch to CRM view to see the lead
        useStore.getState().switchView('crm');
    };

    return (
        <div className="landing-page">
            {/* BACKGROUND ANIMATION */}
            <div className="neural-bg">
                <div className="grid-overlay"></div>
            </div>

            {/* Top Bar */}
            <div className="landing-top-bar">
                <div className="top-bar-logo">
                    <img src={logoLight} alt="AURA" style={{ height: '24px' }} />
                </div>
                <button className="btn-login" onClick={onGetStarted}>
                    Já sou Cliente
                </button>
            </div>

            {/* Hero Section */}
            <section className="hero">
                <div className="hero-content">
                    <p className="hero-glow-text">SISTEMA DE CO-PILOTO PARA DENTISTAS v12.0</p>

                    <h2 className="hero-title">
                        A Inteligência que<br />
                        <span className="highlight">Potencializa sua Secretária</span>
                    </h2>

                    <p className="hero-subtitle">
                        Não é um robô que fala sozinho. É um <strong>Super-Cérebro</strong> que sugere as melhores respostas para sua equipe fechar mais tratamentos.
                    </p>

                    <button className="cta-button" onClick={() => document.getElementById('register')?.scrollIntoView({ behavior: 'smooth' })}>
                        <Zap size={24} /> Testar o Co-Piloto
                    </button>
                </div>

                {/* INTERACTIVE DEMO ("The Machine") */}
                <div className="demo-container">
                    <div className="demo-chat">
                        <div className="msg user" style={{ animationDelay: '0.5s' }}>Boa tarde, gostaria de saber o valor do Invisalign.</div>
                        <div className="msg aura" style={{ animationDelay: '2.5s' }}>
                            Oi! O Invisalign varia conforme a complexidade, mas é o investimento certo para quem busca estética e conforto. 💎 Quer agendar uma avaliação para simularmos seu sorriso?
                        </div>
                    </div>
                    <div className="analysis-panel">
                        <div className="analysis-item">
                            <label>INTENÇÃO DETECTADA</label>
                            <div>FINANCEIRO (ALTA)</div>
                        </div>
                        <div className="analysis-item">
                            <label>ESTRATÉGIA</label>
                            <div>Valorização + Agendamento</div>
                        </div>
                        <div className="analysis-item">
                            <label>PROBABILIDADE VENDA</label>
                            <div style={{ color: '#00ff88' }}>87.5%</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="features">
                <h3 className="section-title">Por que AURA?</h3>
                <div className="features-grid">
                    {features.map((feature, idx) => (
                        <div key={idx} className="feature-card">
                            <div className="feature-icon">{feature.icon}</div>
                            <h4>{feature.title}</h4>
                            <p>{feature.description}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Pricing Section */}
            <section className="pricing">
                <h3 className="section-title">Escolha seu Plano</h3>
                <div className="pricing-grid">
                    {plans.map((plan, idx) => (
                        <div key={idx} className={`pricing-card ${plan.recommended ? 'recommended' : ''}`}>
                            {plan.recommended && <div className="badge">Mais Popular</div>}
                            <h4>{plan.name}</h4>
                            <div className="price">
                                <span className="price-value">{plan.price}</span>
                                <span className="price-period">{plan.period}</span>
                            </div>
                            <ul className="features-list">
                                {plan.features.map((f, i) => (
                                    <li key={i}><Check size={18} /> {f}</li>
                                ))}
                            </ul>
                            <button
                                className={plan.recommended ? 'btn-gold' : 'btn-outline'}
                                onClick={() => handlePlanSelect(plan)}
                            >
                                {plan.action === 'contact' ? 'Falar com Consultor' : `Assinar ${plan.name}`}
                            </button>
                        </div>
                    ))}
                </div>
            </section>

            {/* Registration Form */}
            <section id="register" className="registration">
                <div className="registration-container">
                    <h3 className="section-title">Comece Agora Gratuitamente</h3>
                    <p className="registration-subtitle">7 dias de teste grátis. Cancele quando quiser.</p>

                    <form onSubmit={handleSubmit} className="registration-form">
                        <div className="form-group">
                            <label>Nome Completo</label>
                            <input
                                type="text"
                                placeholder="Seu nome"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Email</label>
                            <input
                                type="email"
                                placeholder="seu@email.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Empresa</label>
                            <input
                                type="text"
                                placeholder="Nome da sua empresa"
                                value={formData.company}
                                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Plano Desejado</label>
                            <select
                                value={formData.plan}
                                onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                            >
                                <option value="starter">Starter - R$ 197/mês</option>
                                <option value="pro">Pro - R$ 497/mês</option>
                                <option value="enterprise">Enterprise - Personalizado</option>
                            </select>
                        </div>

                        <button type="submit" className="btn-submit">
                            Iniciar Teste Gratuito <ArrowRight size={20} />
                        </button>

                        <p className="form-note">
                            Ao cadastrar, você concorda com nossos Termos de Uso
                        </p>
                    </form>
                </div>
            </section>

            {/* Footer */}
            <footer className="footer">
                <div className="footer-content">
                    <div className="footer-logo">
                        <img src={logoLight} alt="AURA" style={{ height: '32px', marginBottom: '10px' }} />
                    </div>
                    <div className="footer-links">
                        <a href="#features">Recursos</a>
                        <a href="#pricing">Preços</a>
                        <a href="#contact">Contato</a>
                        <a href="#privacy">Privacidade</a>
                    </div>
                </div>
                <div className="footer-bottom">
                    <p>© 2026 AURA. Todos os direitos reservados.</p>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
