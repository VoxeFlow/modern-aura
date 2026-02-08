import React, { useState } from 'react';
import { Check, Zap, Brain, TrendingUp, Users, Shield, ArrowRight } from 'lucide-react';
import './LandingPage.css';

const LandingPage = ({ onGetStarted }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        company: '',
        plan: 'pro'
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('Form submitted:', formData);
        // TODO: Integrate with backend/payment
        // For now, navigate to login screen
        alert(`Cadastro iniciado para ${formData.name}! Redirecionando para login...`);
        setTimeout(() => onGetStarted(), 1500);
    };

    const features = [
        {
            icon: <Brain size={32} />,
            title: 'IA Estratégica',
            description: 'Sugestões inteligentes de respostas que convertem leads em vendas'
        },
        {
            icon: <TrendingUp size={32} />,
            title: 'CRM Automático',
            description: 'Pipeline visual que organiza seus clientes automaticamente'
        },
        {
            icon: <Users size={32} />,
            title: 'Histórico Completo',
            description: 'Todas as conversas salvas e pesquisáveis em segundos'
        },
        {
            icon: <Zap size={32} />,
            title: 'Respostas Rápidas',
            description: 'Reduza tempo de resposta em 70% com IA'
        },
        {
            icon: <Shield size={32} />,
            title: 'Segurança Total',
            description: 'Autenticação protegida e dados criptografados'
        }
    ];

    const plans = [
        {
            name: 'Starter',
            price: 'R$ 197',
            period: '/mês',
            features: [
                '1 número WhatsApp',
                'IA com 500 sugestões/mês',
                'CRM básico',
                'Histórico 30 dias',
                'Suporte por email'
            ],
            recommended: false
        },
        {
            name: 'Pro',
            price: 'R$ 497',
            period: '/mês',
            features: [
                '3 números WhatsApp',
                'IA com 3.000 sugestões/mês',
                'CRM completo + automações',
                'Histórico ilimitado',
                'Suporte prioritário',
                'Relatórios avançados'
            ],
            recommended: true
        },
        {
            name: 'Enterprise',
            price: 'Personalizado',
            period: '',
            features: [
                'Números ilimitados',
                'IA ilimitada',
                'Integrações customizadas',
                'API dedicada',
                'Account Manager',
                'SLA garantido'
            ],
            recommended: false
        }
    ];

    return (
        <div className="landing-page">
            {/* Top Bar with Login Button */}
            <div className="landing-top-bar">
                <div className="top-bar-logo">AURA</div>
                <button className="btn-already-client" onClick={onGetStarted}>
                    Já sou Cliente →
                </button>
            </div>

            {/* Hero Section */}
            <section className="hero">
                <div className="hero-content">
                    <div className="logo-hero">
                        <div className="logo-icon">
                            <svg width="60" height="60" viewBox="0 0 24 24" fill="none">
                                <rect x="3" y="3" width="7" height="7" rx="1" fill="currentColor" opacity="0.9" />
                                <rect x="3" y="13" width="7" height="7" rx="1" fill="currentColor" opacity="0.7" />
                                <rect x="13" y="3" width="7" height="7" rx="1" fill="currentColor" opacity="0.7" />
                                <rect x="13" y="13" width="7" height="7" rx="1" fill="currentColor" opacity="0.5" />
                            </svg>
                        </div>
                        <h1>AURA</h1>
                    </div>

                    <h2 className="hero-title">
                        Transforme WhatsApp em<br />
                        <span className="highlight">Máquina de Vendas com IA</span>
                    </h2>

                    <p className="hero-subtitle">
                        Sistema completo de vendas com Inteligência Artificial.<br />
                        Sugestões estratégicas, CRM automático e histórico inteligente.
                    </p>

                    <button className="cta-primary" onClick={() => document.getElementById('register')?.scrollIntoView({ behavior: 'smooth' })}>
                        Começar Agora <ArrowRight size={20} />
                    </button>

                    <p className="hero-trust">✓ Sem cartão de crédito • ✓ Teste grátis 7 dias</p>
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
                                onClick={() => {
                                    setFormData({ ...formData, plan: plan.name.toLowerCase() });
                                    document.getElementById('register')?.scrollIntoView({ behavior: 'smooth' });
                                }}
                            >
                                Escolher {plan.name}
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
                        <h4>AURA</h4>
                        <p>Business Copilot</p>
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
