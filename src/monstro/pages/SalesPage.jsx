import React from 'react';
import { NeonButton } from '../components/NeonButton';
import { BackgroundGrid } from '../components/BackgroundGrid';
import { Calculator } from '../components/Calculator';
import { ChatWidget } from '../components/ChatWidget';
import { ProductComparison } from '../components/ProductComparison';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { Check, Bot, Zap, BarChart3, Users } from 'lucide-react';

const FeatureCard = ({ icon: Icon, title, description }) => (
    <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 group">
        <div className="w-12 h-12 bg-monstro-primary/10 rounded-xl flex items-center justify-center text-monstro-primary mb-4 group-hover:bg-monstro-primary group-hover:text-white transition-colors">
            <Icon size={24} strokeWidth={2.5} />
        </div>
        <h3 className="font-bold text-lg mb-2 text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
    </div>
);

const SalesPage = () => {
    const scrollToOffers = () => {
        const section = document.getElementById('ofertas');
        if (section) section.scrollIntoView({ behavior: 'smooth' });
    }

    return (
        <ErrorBoundary>
            <div className="monstro-container min-h-screen bg-white text-gray-900 relative font-sans overflow-x-hidden">
                <BackgroundGrid />

                <div className="relative z-10 flex flex-col min-h-screen">
                    {/* Navigation */}
                    <nav className="flex justify-between items-center p-6 max-w-7xl mx-auto w-full animate-fade-in bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
                        <div className="text-2xl font-black tracking-tighter text-black flex items-center gap-2">
                            <span className="w-3 h-3 bg-monstro-primary rounded-full"></span>
                            O <span className="text-monstro-primary">MONSTRO</span>
                        </div>
                        <div className="flex gap-4">
                            <NeonButton variant="secondary" className="hidden sm:flex text-xs px-6 py-2 !font-bold">
                                LOGIN
                            </NeonButton>
                            <NeonButton variant="primary" className="text-xs px-6 py-2 !font-bold shadow-lg shadow-monstro-primary/20" onClick={scrollToOffers}>
                                COMEÇAR AGORA
                            </NeonButton>
                        </div>
                    </nav>

                    {/* Hero Section */}
                    <section className="flex-1 flex flex-col items-center justify-center p-4 relative text-center py-24 lg:py-32">
                        <div className="max-w-5xl mx-auto space-y-8 animate-fade-in z-20 flex flex-col items-center">

                            <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-green-50 text-green-700 text-xs font-bold tracking-[0.2em] uppercase border border-green-100">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                A Revolução para Afiliados
                            </div>

                            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.95] font-display text-black">
                                SUA MÁQUINA DE <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-monstro-primary to-green-600">
                                    VENDAS AUTOMÁTICA
                                </span>
                            </h1>

                            <p className="text-lg md:text-xl text-gray-600 max-w-2xl font-medium leading-relaxed">
                                O sistema definitivo para afiliados de nicho black/emagrecimento.
                                <strong className="text-black block mt-2">Funis, Diagnósticos e Recuperação de Vendas em um só lugar.</strong>
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md sm:max-w-none justify-center mt-8">
                                <NeonButton variant="primary" onClick={scrollToOffers} className="w-full sm:w-auto min-w-[240px] shadow-xl shadow-monstro-primary/20 text-lg py-5">
                                    ATIVAR MEU SISTEMA
                                </NeonButton>
                            </div>

                            <p className="text-xs text-gray-400 font-semibold tracking-widest uppercase mt-4">
                                Instalação em 60 segundos • Sem mensalidades abusivas
                            </p>
                        </div>
                    </section>

                    {/* Feature Grid */}
                    <section className="py-20 px-4">
                        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <FeatureCard
                                icon={Bot}
                                title="Atendimento Híbrido"
                                description="IA que detecta intenção de compra e transfere para humanos apenas quando necessário."
                            />
                            <FeatureCard
                                icon={Zap}
                                title="Páginas de Alta Conversão"
                                description="Templates validados de Quiz, VSL e Texto que carregam instantaneamente."
                            />
                            <FeatureCard
                                icon={BarChart3}
                                title="Diagnóstico Viral"
                                description="Engaje leads com calculadoras de IMC e Metas que aumentam o desejo de compra."
                            />
                            <FeatureCard
                                icon={Users}
                                title="Gestão de Produtos"
                                description="Painel simples para gerenciar ofertas, upsells e order bumps."
                            />
                        </div>
                    </section>

                    {/* ROI Simulator Section */}
                    <section className="py-24 px-4 bg-gray-50 border-y border-gray-100 relative overflow-hidden">
                        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16 relative z-10">
                            <div className="flex-1 space-y-8 text-left">
                                <h2 className="text-4xl md:text-5xl font-black text-black leading-tight">
                                    PARE DE <br />
                                    <span className="text-red-500">PERDER DINHEIRO</span>
                                </h2>
                                <p className="text-lg text-gray-600 leading-relaxed">
                                    A maioria dos afiliados perde 60% das vendas no checkout.
                                    O <strong>MONSTRO</strong> recupera esses leads com diagnósticos personalizados e automação.
                                </p>

                                <div className="space-y-6">
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-bold text-lg shrink-0">1</div>
                                        <div>
                                            <h4 className="font-bold text-lg">Captura Inteligente</h4>
                                            <p className="text-sm text-gray-500">O lead engaja com o diagnóstico antes de ver o preço.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-bold text-lg shrink-0">2</div>
                                        <div>
                                            <h4 className="font-bold text-lg">Oferta Irresistível</h4>
                                            <p className="text-sm text-gray-500">Apresentamos o produto como a "solução única" para o diagnóstico dele.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 w-full flex justify-center">
                                <div className="w-full max-w-lg shadow-2xl shadow-gray-200 rounded-3xl bg-white relative">
                                    <div className="absolute -top-6 -right-6 w-24 h-24 bg-monstro-primary rounded-full opacity-20 blur-3xl animate-pulse"></div>
                                    <Calculator />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Offers */}
                    <section id="ofertas" className="py-24 px-4 bg-black text-white relative">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-gray-900 to-black opacity-80"></div>
                        <div className="relative z-10 text-center max-w-4xl mx-auto mb-16 space-y-4">
                            <h2 className="text-4xl md:text-6xl font-black text-white">ESCOLHA SUA VERSÃO</h2>
                            <p className="text-gray-400 text-xl max-w-2xl mx-auto">
                                De afiliados iniciantes a grandes produtores. Temos a estrutura robusta que você precisa.
                            </p>
                        </div>

                        <ProductComparison />
                    </section>

                    {/* Footer */}
                    <footer className="py-12 bg-white text-center border-t border-gray-100">
                        <div className="flex items-center justify-center gap-2 mb-4 opacity-50">
                            <div className="w-2 h-2 bg-monstro-primary rounded-full"></div>
                            <span className="font-bold tracking-widest uppercase text-xs">O Monstro System</span>
                        </div>
                        <p className="text-gray-400 text-sm font-medium">
                            © 2026 Todos os direitos reservados.
                        </p>
                    </footer>

                    <ChatWidget />
                </div>
            </div>
        </ErrorBoundary>
    );
};

export default SalesPage;
