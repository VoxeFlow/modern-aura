import React from 'react';
import { NeonButton } from './NeonButton';
import { Check, X } from 'lucide-react';
import { useMonstroStore } from '../store/monstroStore';

export const ProductComparison = () => {
    // Hardcoded for SaaS Pivot
    const products = [
        {
            id: 'starter',
            name: 'Affiliate Starter',
            price: '97',
            features: ['1 Domínio', 'Até 5.000 Leads', 'Diagnóstico Básico (IMC)', 'Templates de Quiz', 'Painel Simplificado'],
            notFeatures: ['Automação de WhatsApp', 'Recuperação de Checkout', 'Suporte Prioritário'],
            highlight: false,
            link: '/signup?plan=starter'
        },
        {
            id: 'pro',
            name: 'Producer Machine',
            price: '297',
            features: ['Domínios Ilimitados', 'Leads Ilimitados', 'Diagnóstico Avançado', 'Integração WhatsApp Bot', 'Recuperação de Vendas', 'Funil de Alta Conversão'],
            notFeatures: [],
            highlight: true,
            link: '/signup?plan=pro'
        },
        {
            id: 'enterprise',
            name: 'Black Operation',
            price: '997',
            features: ['Tudo do Pro', 'Instalação White-Label', 'Mentoria de Tráfego', 'Servidor Dedicado', 'API Aberta'],
            notFeatures: [],
            highlight: false,
            link: '/signup?plan=enterprise'
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto px-4 mt-8">
            {products.map((product) => (
                <div
                    key={product.id}
                    className={`relative flex flex-col p-8 rounded-3xl transition-all duration-300 ${product.highlight
                        ? 'bg-white text-gray-900 scale-105 shadow-2xl z-10 border-4 border-monstro-primary'
                        : 'bg-gray-900 text-white border border-gray-800 hover:border-gray-700'
                        }`}
                >
                    {product.highlight && (
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-monstro-primary text-white font-black text-xs py-2 px-6 rounded-full uppercase tracking-widest shadow-lg">
                            Melhor Custo-Benefício
                        </div>
                    )}

                    <div className="text-center mb-8 pt-4">
                        <h3 className={`text-xl font-bold uppercase tracking-wider mb-2 ${product.highlight ? 'text-gray-900' : 'text-gray-400'}`}>
                            {product.name}
                        </h3>
                        <div className="flex items-center justify-center gap-1">
                            <span className="text-sm opacity-60 mb-4">R$</span>
                            <span className={`text-5xl font-black tracking-tight ${product.highlight ? 'text-gray-900' : 'text-white'}`}>
                                {product.price}
                            </span>
                        </div>
                        <p className="text-xs uppercase tracking-widest mt-2 opacity-60">Mensal</p>
                    </div>

                    <ul className="space-y-4 mb-8 text-sm flex-1">
                        {product.features.map((feat, i) => (
                            <li key={`f-${i}`} className="flex items-start gap-3">
                                <div className={`mt-0.5 ${product.highlight ? "text-monstro-primary-dim" : "text-monstro-primary"}`}>
                                    <Check size={18} strokeWidth={3} />
                                </div>
                                <span className={product.highlight ? 'text-gray-600' : 'text-gray-300'}>{feat}</span>
                            </li>
                        ))}
                        {product.notFeatures?.map((feat, i) => (
                            <li key={`nf-${i}`} className="flex items-start gap-3 opacity-40">
                                <X size={18} className="text-red-500 mt-0.5" />
                                <span className={product.highlight ? 'text-gray-400' : 'text-gray-500'}>{feat}</span>
                            </li>
                        ))}
                    </ul>

                    <NeonButton
                        variant={product.highlight ? "primary" : "secondary"}
                        className={`w-full text-sm ${!product.highlight && 'border-gray-600 text-white hover:border-white bg-transparent'}`}
                        onClick={() => window.location.href = product.link}
                    >
                        {product.id === 'pro' ? 'GARANTIR ACESSO' : 'COMEÇAR'}
                    </NeonButton>
                </div>
            ))}
        </div>
    );
};
